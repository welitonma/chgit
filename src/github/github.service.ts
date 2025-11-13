import { Injectable } from '@nestjs/common';
import { Octokit } from 'octokit';

@Injectable()
export class GithubService {
  private octokit: Octokit;

  constructor() {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[GithubService] GITHUB_TOKEN não definido!');
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[GithubService] GITHUB_TOKEN carregado (${token.length} caracteres, termina com: ...${token.slice(-4)})`,
        );
      }
    }
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * Cria uma issue e adiciona ao Project v2 informado (ou padrão do .env)
   */
  async criarIssue(
    owner: string,
    repo: string,
    title: string,
    body: string,
    projectId?: string,
  ): Promise<Record<string, any>> {
    // Cria a issue
    const issue = await this.octokit.request(
      'POST /repos/{owner}/{repo}/issues',
      {
        owner,
        repo,
        title,
        body,
      },
    );

    // Adiciona a issue ao Project v2
    // Usa o projectId informado ou o padrão do .env
    const finalProjectId = projectId || process.env.GITHUB_PROJECT_ID;
    if (!finalProjectId) {
      throw new Error(
        'ProjectId não informado e variável GITHUB_PROJECT_ID não definida',
      );
    }
    const contentId = issue.data.node_id;

    // Mutation GraphQL para adicionar ao Project v2
    await this.octokit.graphql(
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

    return issue.data;
  }

  async listarProjetosV2(login: string): Promise<any> {
    // Busca todos os projetos v2 do usuário
    const result = await this.octokit.graphql(
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
    if (result && typeof result === 'object' && 'user' in result) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return (result as any).user.projectsV2.nodes;
    }
    throw new Error('Resposta inesperada da API do GitHub ao listar projetos');
  }

  async detalhesProjetoV2(projectId: string): Promise<any> {
    // Busca detalhes do projeto v2, incluindo campos customizados
    const result = await this.octokit.graphql(
      `
      query($projectId: ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
            id
            title
            fields(first: 20) {
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
                # Outros fragments podem ser adicionados conforme necessário
              }
            }
          }
        }
      }
      `,
      { projectId },
    );
    if (result && typeof result === 'object' && 'node' in result) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return (result as any).node;
    }
    throw new Error('Resposta inesperada da API do GitHub ao detalhar projeto');
  }

  async getRateLimit(): Promise<any> {
    const result = await this.octokit.graphql(
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
    if (result && typeof result === 'object' && 'rateLimit' in result) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return (result as any).rateLimit;
    }
    throw new Error(
      'Resposta inesperada da API do GitHub ao consultar rate limit',
    );
  }
}
