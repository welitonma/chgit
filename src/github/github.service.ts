import { Injectable, Logger, Optional } from '@nestjs/common';
import { Octokit } from 'octokit';
import { GithubAppAuthService } from './app-auth/github-app-auth.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubService {
  private octokit: Octokit | null = null;
  private readonly logger = new Logger(GithubService.name);
  private readonly defaultBranchCache = new Map<string, string>();

  constructor(
    @Optional() private readonly githubAppAuthService: GithubAppAuthService,
    private readonly configService: ConfigService,
  ) {}

  private async getOctokit(): Promise<Octokit> {
    const appId = this.configService.get<string>('GITHUB_APP_ID');
    const installationId = this.configService.get<string>(
      'GITHUB_APP_INSTALLATION_ID',
    );
    const privateKeyPath = this.configService.get<string>(
      'GITHUB_APP_PRIVATE_KEY_PATH',
    );
    if (
      appId &&
      installationId &&
      privateKeyPath &&
      this.githubAppAuthService
    ) {
      return this.githubAppAuthService.getOctokit();
    }
    const token = this.configService.get<string>('GITHUB_TOKEN');
    if (!token) {
      throw new Error('GITHUB_TOKEN não definido');
    }
    return new Octokit({ auth: token });
  }

  async criarIssue(dto: {
    owner: string;
    repo: string;
    title: string;
    body: string;
    projectId?: string;
    assignees?: string[];
    labels?: string[];
    status?: string;
    prioridade?: string;
    tamanho?: string;
    dataInicio?: string;
    dataFinal?: string;
    milestone?: string;
    reviewers?: string[];
    repository?: string;
    linkedPullRequests?: string[];
    parentIssue?: string;
    cliente?: string;
    sistema?: string;
    linkChamado?: string;
    iteracao?: string;
  }): Promise<Record<string, unknown>> {
    const octokit = await this.getOctokit();

    const issuePayload: {
      owner: string;
      repo: string;
      title: string;
      body: string;
      assignees?: string[];
      labels?: string[];
      milestone?: number;
    } = {
      owner: dto.owner,
      repo: dto.repo,
      title: dto.title,
      body: dto.body,
    };
    if (dto.assignees) issuePayload.assignees = dto.assignees;
    if (dto.labels) issuePayload.labels = dto.labels;
    if (dto.milestone) {
      const milestoneNumber = parseInt(dto.milestone, 10);
      if (!isNaN(milestoneNumber)) {
        issuePayload.milestone = milestoneNumber;
      }
    }

    let issue: { data: { number: number; node_id: string } };
    try {
      issue = await octokit.request(
        'POST /repos/{owner}/{repo}/issues',
        issuePayload,
      );
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        'response' in error
      ) {
        const apiError = error as {
          status?: number;
          response?: { data?: { message?: string; errors?: unknown[] } };
        };
        this.logger.error(
          `[criarIssue] Erro ao criar issue (${apiError.status}): ${apiError.response?.data?.message}`,
        );
        if (apiError.response?.data?.errors) {
          this.logger.error(
            `[criarIssue] Detalhes: ${JSON.stringify(apiError.response.data.errors)}`,
          );
        }
      }
      throw error;
    }

    const finalProjectId =
      dto.projectId || this.configService.get<string>('GITHUB_PROJECT_ID');
    if (!finalProjectId) {
      return issue.data as Record<string, unknown>;
    }
    const contentId: string = issue.data.node_id;

    try {
      const addResult = await octokit.graphql(
        `
        mutation($projectId:ID!, $contentId:ID!) {
          addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
            item {
              id
            }
          }
        }
        `,
        {
          projectId: finalProjectId,
          contentId,
        },
      );

      const itemId = (
        addResult as {
          addProjectV2ItemById?: { item?: { id?: string } };
        }
      )?.addProjectV2ItemById?.item?.id;

      if (itemId) {
        await this.atualizarCamposCustomizados(
          octokit,

          finalProjectId,
          itemId,
          dto,
        );
      }
    } catch (error: unknown) {
      this.logger.error(
        `[criarIssue] Erro ao adicionar issue ao projeto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      );
      throw error;
    }

    return issue.data as Record<string, unknown>;
  }

  /**
   * Faz upload de um arquivo para o repositório e retorna a URL raw para uso em markdown.
   * Usa o token pessoal (GITHUB_TOKEN) pois o GitHub App pode não ter permissão de Contents write.
   */
  async uploadFileToRepo(
    owner: string,
    repo: string,
    path: string,
    content: Buffer,
    commitMessage: string,
  ): Promise<string> {
    const token = this.configService.get<string>('GITHUB_TOKEN');
    if (!token) {
      throw new Error(
        'GITHUB_TOKEN não definido — necessário para upload de arquivos',
      );
    }
    const octokit = new Octokit({ auth: token });

    let sha: string | undefined;
    try {
      const existing = await octokit.request(
        'GET /repos/{owner}/{repo}/contents/{path}',
        { owner, repo, path },
      );
      sha = (existing.data as { sha?: string }).sha;
    } catch {
      // Não existe, OK
    }

    try {
      await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
        owner,
        repo,
        path,
        message: commitMessage,
        content: content.toString('base64'),
        ...(sha ? { sha } : {}),
      });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        'response' in error
      ) {
        const apiError = error as {
          status?: number;
          response?: { data?: { message?: string } };
        };
        throw new Error(
          `Upload falhou em ${owner}/${repo}/${path} (${apiError.status}): ${apiError.response?.data?.message || 'erro desconhecido'}`,
        );
      }
      throw error;
    }

    const branch = await this.getDefaultBranch(owner, repo, octokit);
    const encodedPath = path
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    return `https://github.com/${owner}/${repo}/blob/${branch}/${encodedPath}?raw=1`;
  }

  private async getDefaultBranch(
    owner: string,
    repo: string,
    octokit: Octokit,
  ): Promise<string> {
    const cacheKey = `${owner}/${repo}`;
    const cached = this.defaultBranchCache.get(cacheKey);
    if (cached) return cached;

    try {
      const repoInfo = await octokit.request('GET /repos/{owner}/{repo}', {
        owner,
        repo,
      });
      const branch = repoInfo.data.default_branch || 'main';
      this.defaultBranchCache.set(cacheKey, branch);
      return branch;
    } catch {
      return 'main';
    }
  }

  private async atualizarCamposCustomizados(
    octokit: Octokit,
    projectId: string,
    itemId: string,
    dto: {
      status?: string;
      prioridade?: string;
      tamanho?: string;
      dataInicio?: string;
      dataFinal?: string;
      cliente?: string;
      sistema?: string;
      linkChamado?: string;
      iteracao?: string;
    },
  ): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const camposParaAtualizar: Array<{
      fieldId: string;
      value:
        | { singleSelectOptionId: string }
        | { date: string }
        | { text: string }
        | { iterationId: string };
      nome: string;
    }> = [];

    if (dto.status) {
      camposParaAtualizar.push({
        fieldId: 'PVTSSF_lADOCWdUyM4AbmxDzgRyBk0',
        value: { singleSelectOptionId: dto.status },
        nome: 'Status',
      });
    }

    if (dto.prioridade) {
      camposParaAtualizar.push({
        fieldId: 'PVTSSF_lADOCWdUyM4AbmxDzgRyBl8',
        value: { singleSelectOptionId: dto.prioridade },
        nome: 'Prioridade',
      });
    }

    if (dto.tamanho) {
      camposParaAtualizar.push({
        fieldId: 'PVTSSF_lADOCWdUyM4AbmxDzgRyBmA',
        value: { singleSelectOptionId: dto.tamanho },
        nome: 'Tamanho',
      });
    }

    if (dto.dataInicio) {
      camposParaAtualizar.push({
        fieldId: 'PVTF_lADOCWdUyM4AbmxDzgRyBmI',
        value: { date: dto.dataInicio },
        nome: 'Data Início',
      });
    }

    if (dto.dataFinal) {
      camposParaAtualizar.push({
        fieldId: 'PVTF_lADOCWdUyM4AbmxDzgRyBmM',
        value: { date: dto.dataFinal },
        nome: 'Data Final',
      });
    }

    if (dto.cliente) {
      camposParaAtualizar.push({
        fieldId: 'PVTSSF_lADOCWdUyM4AbmxDzg47We8',
        value: { singleSelectOptionId: dto.cliente },
        nome: 'Cliente',
      });
    }

    if (dto.sistema) {
      camposParaAtualizar.push({
        fieldId: 'PVTSSF_lADOCWdUyM4AbmxDzg47XJY',
        value: { singleSelectOptionId: dto.sistema },
        nome: 'Sistema',
      });
    }

    if (dto.linkChamado) {
      camposParaAtualizar.push({
        fieldId: 'PVTF_lADOCWdUyM4AbmxDzg47XPE',
        value: { text: dto.linkChamado },
        nome: 'Link do Chamado',
      });
    }

    if (dto.iteracao) {
      camposParaAtualizar.push({
        fieldId: 'PVTIF_lADOCWdUyM4AbmxDzg47XbE',
        value: { iterationId: dto.iteracao },
        nome: 'Iteração',
      });
    }

    for (const campo of camposParaAtualizar) {
      try {
        await octokit.graphql(
          `
          mutation(
          $projectId: ID!,
          $itemId: ID!, $fieldId: ID!,$value: ProjectV2FieldValue!) {
              updateProjectV2ItemFieldValue(
              
              input: {
                
                projectId: $projectId
                itemId: $itemId
                fieldId: $fieldId
                value: $value
              }
            ) {
              projectV2Item {
                id
              }
            }
          }
          `,
          {
            projectId,
            itemId,
            fieldId: campo.fieldId,
            value: campo.value,
          },
        );

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error: unknown) {
        this.logger.error(
          `Erro ao atualizar campo "${campo.nome}" do projeto`,
          error,
        );
        if (error && typeof error === 'object' && 'message' in error) {
          this.logger.error((error as Error).message);
        }
      }
    }
  }

  async listarProjetosUsuario(login: string): Promise<unknown> {
    const octokit = await this.getOctokit();
    type ProjectNode = {
      id: string;
      title: string;
      number: number;
      url: string;
    };
    type UserResult = {
      user?: { projectsV2: { nodes: ProjectNode[] } };
    };
    try {
      const result: UserResult = await octokit.graphql(
        `
        query($login: String!) {
          user(login: $login) {
            projectsV2(first: 20) {
              nodes {
                id
                title
                number
                url
              }
            }
          }
        }
        `,
        { login },
      );
      if (result.user && Array.isArray(result.user.projectsV2.nodes)) {
        return result.user.projectsV2.nodes;
      }
    } catch (err) {
      throw new Error(
        'Erro ao buscar projetos do usuário: ' +
          (err instanceof Error ? err.message : err),
      );
    }
    throw new Error('Nenhum projeto encontrado para o usuário informado.');
  }

  async listarProjetosOrganizacao(login: string): Promise<unknown> {
    const octokit = await this.getOctokit();
    type ProjectNode = {
      id: string;
      title: string;
      number: number;
      url: string;
    };
    type OrgResult = {
      organization?: { projectsV2: { nodes: ProjectNode[] } };
    };
    try {
      const result: OrgResult = await octokit.graphql(
        `
        query($login: String!) {
          organization(login: $login) {
            projectsV2(first: 20) {
              nodes {
                id
                title
                number
                url
              }
            }
          }
        }
        `,
        { login },
      );
      if (
        result.organization &&
        Array.isArray(result.organization.projectsV2.nodes)
      ) {
        return result.organization.projectsV2.nodes;
      }
    } catch (err) {
      throw new Error(
        'Erro ao buscar projetos da organização: ' +
          (err instanceof Error ? err.message : err),
      );
    }
    throw new Error('Nenhum projeto encontrado para a organização informada.');
  }

  async detalhesProjetoV2(projectId: string): Promise<unknown> {
    const octokit = await this.getOctokit();
    const result = await octokit.graphql(
      `
      query($projectId: ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
            id
            title
            fields(first: 50) {
              nodes {
                ... on ProjectV2FieldCommon {
                  id
                  name
                  dataType
                }
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  dataType
                  options {
                    id
                    name
                    description
                    color
                  }
                }
                ... on ProjectV2IterationField {
                  id
                  name
                  dataType
                  configuration {
                    iterations {
                      id
                      title
                      startDate
                      duration
                    }
                  }
                }
                ... on ProjectV2Field {
                  id
                  name
                  dataType
                }
              }
            }
          }
        }
      }
      `,
      { projectId },
    );
    if (
      result &&
      typeof result === 'object' &&
      'node' in result &&
      result.node
    ) {
      return result.node;
    }
    throw new Error('Resposta inesperada da API do GitHub ao detalhar projeto');
  }

  async getRateLimit(): Promise<unknown> {
    const octokit = await this.getOctokit();
    const result = await octokit.graphql(
      `
      query {
        rateLimit {
          limit
          cost
          remaining
          resetAt
          used
        }
      }
  `,
      {},
    );
    if (
      result &&
      typeof result === 'object' &&
      'rateLimit' in result &&
      result.rateLimit
    ) {
      return result.rateLimit;
    }
    throw new Error(
      'Resposta inesperada da API do GitHub ao consultar rate limit',
    );
  }

  async listarIssuesRepo(owner: string, repo: string): Promise<unknown> {
    const octokit = await this.getOctokit();
    const issues = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: 'all',
      per_page: 30,
    });
    return issues.data as unknown;
  }
}
