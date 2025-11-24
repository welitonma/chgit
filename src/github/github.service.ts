import { Injectable, Logger, Optional } from '@nestjs/common';
import { Octokit } from 'octokit';
import { GithubAppAuthService } from './app-auth/github-app-auth.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubService {
  private octokit: Octokit | null = null;
  private readonly logger = new Logger(GithubService.name);

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
      this.logger.debug('Usando autenticação como GitHub App');
      return this.githubAppAuthService.getOctokit();
    }
    const token = this.configService.get<string>('GITHUB_TOKEN');
    if (!token) {
      this.logger.warn('GITHUB_TOKEN não definido!');
      throw new Error('GITHUB_TOKEN não definido');
    }
    this.logger.debug('Usando autenticação via token pessoal');
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
  }): Promise<Record<string, any>> {
    const octokit = await this.getOctokit();
    this.logger.debug(
      `[criarIssue] Criando issue em ${dto.owner}/${dto.repo}: "${dto.title}"`,
    );

    // Monta o payload da issue com tipagem explícita
    const issuePayload: {
      owner: string;
      repo: string;
      title: string;
      body: string;
      assignees?: string[];
      labels?: string[];
      milestone?: number;
      // reviewers, repository, linked_pull_requests não são suportados diretamente pela API REST de issues
    } = {
      owner: dto.owner,
      repo: dto.repo,
      title: dto.title,
      body: dto.body,
    };
    if (dto.assignees) issuePayload.assignees = dto.assignees;
    if (dto.labels) issuePayload.labels = dto.labels;
    if (dto.milestone) {
      // Milestone deve ser um número, não uma string
      const milestoneNumber = parseInt(dto.milestone, 10);
      if (!isNaN(milestoneNumber)) {
        issuePayload.milestone = milestoneNumber;
        this.logger.debug(
          `[criarIssue] Milestone configurado: ${milestoneNumber}`,
        );
      } else {
        this.logger.warn(
          `[criarIssue] Milestone "${dto.milestone}" não é um número válido. Ignorando.`,
        );
      }
    }
    // Os campos reviewers, repository, linkedPullRequests não são aceitos diretamente na criação da issue REST

    this.logger.debug(
      `[criarIssue] Payload da issue: ${JSON.stringify(issuePayload)}`,
    );

    let issue: { data: { number: number; node_id: string } };
    try {
      issue = await octokit.request(
        'POST /repos/{owner}/{repo}/issues',
        issuePayload,
      );
      this.logger.log(
        `[criarIssue] Issue criada com sucesso: #${issue.data.number}`,
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
      this.logger.warn(
        '[criarIssue] ProjectId não informado. Issue criada mas não adicionada ao projeto.',
      );
      return issue.data as Record<string, any>;
    }
    const contentId: string = issue.data.node_id;
    this.logger.debug(
      `[criarIssue] Adicionando issue ao projeto ${finalProjectId}`,
    );

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
      this.logger.log(
        `[criarIssue] Issue #${issue.data.number} adicionada ao projeto com sucesso`,
      );
      this.logger.debug(
        `[criarIssue] Resposta completa do addProjectV2ItemById: ${JSON.stringify(addResult)}`,
      );

      // Extrai o itemId da resposta
      const itemId = (
        addResult as {
          addProjectV2ItemById?: { item?: { id?: string } };
        }
      )?.addProjectV2ItemById?.item?.id;

      if (!itemId) {
        this.logger.error(
          '[criarIssue] ItemId não retornado ao adicionar issue ao projeto. Não será possível atualizar campos customizados.',
        );
      } else {
        this.logger.debug(`[criarIssue] ItemId obtido: ${itemId}`);
        // Atualizar campos customizados do projeto v2
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

    return issue.data as Record<string, any>;
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
    this.logger.debug(
      `[atualizarCamposCustomizados] Iniciando atualização para projectId: ${projectId}, itemId: ${itemId}`,
    );
    this.logger.debug(
      `[atualizarCamposCustomizados] DTO recebido: ${JSON.stringify(dto)}`,
    );

    // Mapeamento de campos do DTO para IDs de campos do projeto
    const camposParaAtualizar: Array<{
      fieldId: string;
      value:
        | { singleSelectOptionId: string }
        | { date: string }
        | { text: string }
        | { iterationId: string };
      nome: string;
    }> = [];

    // Status
    if (dto.status) {
      camposParaAtualizar.push({
        fieldId: 'PVTSSF_lADOCWdUyM4AbmxDzgcbtiE',
        value: { singleSelectOptionId: dto.status },
        nome: 'Status',
      });
    }

    // Prioridade
    if (dto.prioridade) {
      camposParaAtualizar.push({
        fieldId: 'PVTSSF_lADOCWdUyM4AbmxDzgcbtkg',
        value: { singleSelectOptionId: dto.prioridade },
        nome: 'Prioridade',
      });
    }

    // Tamanho
    if (dto.tamanho) {
      camposParaAtualizar.push({
        fieldId: 'PVTSSF_lADOCWdUyM4AbmxDzgcbtko',
        value: { singleSelectOptionId: dto.tamanho },
        nome: 'Tamanho',
      });
    }

    // Data Início
    if (dto.dataInicio) {
      camposParaAtualizar.push({
        fieldId: 'PVTF_lADOCWdUyM4AbmxDzgcbtkw',
        value: { date: dto.dataInicio },
        nome: 'Data Início',
      });
    }

    // Data Final
    if (dto.dataFinal) {
      camposParaAtualizar.push({
        fieldId: 'PVTF_lADOCWdUyM4AbmxDzgcbtk4',
        value: { date: dto.dataFinal },
        nome: 'Data Final',
      });
    }

    // Cliente
    if (dto.cliente) {
      camposParaAtualizar.push({
        fieldId: 'PVTSSF_lADOCWdUyM4AbmxDzgcbtlA',
        value: { singleSelectOptionId: dto.cliente },
        nome: 'Cliente',
      });
    }

    // Sistema
    if (dto.sistema) {
      camposParaAtualizar.push({
        fieldId: 'PVTSSF_lADOCWdUyM4AbmxDzgcbtlI',
        value: { singleSelectOptionId: dto.sistema },
        nome: 'Sistema',
      });
    }

    // Link Chamado (campo TEXT)
    if (dto.linkChamado) {
      camposParaAtualizar.push({
        fieldId: 'PVTF_lADOCWdUyM4AbmxDzgcbtlQ',
        value: { text: dto.linkChamado },
        nome: 'Link Chamado',
      });
    }

    // Iteração
    if (dto.iteracao) {
      camposParaAtualizar.push({
        fieldId: 'PVTIF_lADOCWdUyM4AbmxDzgcbtlY',
        value: { iterationId: dto.iteracao },
        nome: 'Iteração',
      });
    }

    // Atualiza cada campo
    this.logger.debug(
      `[atualizarCamposCustomizados] Total de campos para atualizar: ${camposParaAtualizar.length}`,
    );

    for (const campo of camposParaAtualizar) {
      try {
        this.logger.debug(
          `[atualizarCamposCustomizados] Tentando atualizar campo "${campo.nome}" (${campo.fieldId}) com valor: ${JSON.stringify(campo.value)}`,
        );

        await octokit.graphql(
          `
          mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
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
        this.logger.log(
          `[atualizarCamposCustomizados] ✅ Campo "${campo.nome}" atualizado com sucesso`,
        );
      } catch (error: unknown) {
        this.logger.error(
          `[atualizarCamposCustomizados] ❌ Erro ao atualizar campo "${campo.nome}": ${error instanceof Error ? error.message : JSON.stringify(error)}`,
        );
        // Continua tentando atualizar os outros campos mesmo se um falhar
      }
    }

    this.logger.log(
      `[atualizarCamposCustomizados] Atualização de campos customizados concluída`,
    );
  }

  async listarProjetosUsuario(login: string): Promise<any> {
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

  async listarProjetosOrganizacao(login: string): Promise<any> {
    const octokit = await this.getOctokit();
    this.logger.debug(
      `[listarProjetosOrganizacao] Buscando projetos para organização: ${login}`,
    );
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
      this.logger.debug(
        `[listarProjetosOrganizacao] Resposta GraphQL: ${JSON.stringify(result)}`,
      );
      if (
        result.organization &&
        Array.isArray(result.organization.projectsV2.nodes)
      ) {
        this.logger.debug(
          `[listarProjetosOrganizacao] Projetos encontrados: ${result.organization.projectsV2.nodes.length}`,
        );
        return result.organization.projectsV2.nodes;
      }
      this.logger.warn(
        '[listarProjetosOrganizacao] Nenhum projeto encontrado no array nodes.',
      );
    } catch (err) {
      this.logger.error(
        `[listarProjetosOrganizacao] Erro ao buscar projetos: ${err instanceof Error ? err.message : err}`,
      );
      throw new Error(
        'Erro ao buscar projetos da organização: ' +
          (err instanceof Error ? err.message : err),
      );
    }
    throw new Error('Nenhum projeto encontrado para a organização informada.');
  }

  async detalhesProjetoV2(projectId: string): Promise<any> {
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

  async getRateLimit(): Promise<any> {
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

  async listarIssuesRepo(owner: string, repo: string): Promise<any> {
    const octokit = await this.getOctokit();
    this.logger.debug(
      `[listarIssuesRepo] Tentando listar issues de ${owner}/${repo}`,
    );
    try {
      const issues = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: 'all',
        per_page: 30,
      });
      this.logger.debug(
        `[listarIssuesRepo] ${issues.data.length} issues encontradas`,
      );
      return issues.data;
    } catch (error: unknown) {
      this.logger.error(
        `Erro ao listar issues de ${owner}/${repo}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      );
      if (error && typeof error === 'object' && 'status' in error) {
        const errorWithStatus = error as {
          status?: number;
          response?: { data?: unknown };
        };
        this.logger.error(
          `Status HTTP: ${errorWithStatus.status}, Response: ${JSON.stringify(errorWithStatus.response?.data)}`,
        );
      }
      throw error;
    }
  }
}
