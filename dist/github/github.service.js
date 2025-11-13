"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GithubService = void 0;
const common_1 = require("@nestjs/common");
const octokit_1 = require("octokit");
let GithubService = class GithubService {
    octokit;
    constructor() {
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('[GithubService] GITHUB_TOKEN não definido!');
            }
        }
        else {
            if (process.env.NODE_ENV === 'development') {
                console.log(`[GithubService] GITHUB_TOKEN carregado (${token.length} caracteres, termina com: ...${token.slice(-4)})`);
            }
        }
        this.octokit = new octokit_1.Octokit({ auth: token });
    }
    async criarIssue(owner, repo, title, body, projectId) {
        const issue = await this.octokit.request('POST /repos/{owner}/{repo}/issues', {
            owner,
            repo,
            title,
            body,
        });
        const finalProjectId = projectId || process.env.GITHUB_PROJECT_ID;
        if (!finalProjectId) {
            throw new Error('ProjectId não informado e variável GITHUB_PROJECT_ID não definida');
        }
        const contentId = issue.data.node_id;
        await this.octokit.graphql(`
      mutation($projectId:ID!, $contentId:ID!) {
        addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
          item {
            id
          }
        }
      }
      `, {
            projectId: finalProjectId,
            contentId,
        });
        return issue.data;
    }
    async listarProjetosV2(login) {
        const result = await this.octokit.graphql(`
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
      `, { login });
        if (result && typeof result === 'object' && 'user' in result) {
            return result.user.projectsV2.nodes;
        }
        throw new Error('Resposta inesperada da API do GitHub ao listar projetos');
    }
    async detalhesProjetoV2(projectId) {
        const result = await this.octokit.graphql(`
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
      `, { projectId });
        if (result && typeof result === 'object' && 'node' in result) {
            return result.node;
        }
        throw new Error('Resposta inesperada da API do GitHub ao detalhar projeto');
    }
    async getRateLimit() {
        const result = await this.octokit.graphql(`
      query {
        rateLimit {
          limit
          cost
          remaining
          resetAt
          used
        }
      }
  `, {});
        if (result && typeof result === 'object' && 'rateLimit' in result) {
            return result.rateLimit;
        }
        throw new Error('Resposta inesperada da API do GitHub ao consultar rate limit');
    }
};
exports.GithubService = GithubService;
exports.GithubService = GithubService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], GithubService);
//# sourceMappingURL=github.service.js.map