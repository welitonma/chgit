import { Body, Controller, Post, Get, Query, Param } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { GithubService } from './github.service'; // Forçar atualização de tipagem
import { CreateIssueDto } from './dto/create-issue.dto';

@ApiTags('GitHub')
@Controller('github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Get('issues')
  @ApiOperation({
    summary: 'Lista issues de um repositório (valida permissão do token/App)',
  })
  @ApiQuery({
    name: 'repo',
    required: true,
    description: 'Nome do repositório',
  })
  @ApiResponse({ status: 200, description: 'Lista de issues do repositório' })
  @ApiResponse({
    status: 404,
    description: 'Repositório não encontrado ou sem permissão',
  })
  async listarIssuesRepo(@Query('repo') repo: string): Promise<any> {
    const ORG_OWNER = process.env.GITHUB_ORG_OWNER;
    if (!ORG_OWNER) {
      throw new HttpException(
        'A variável de ambiente GITHUB_ORG_OWNER não está definida.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    try {
      return await this.githubService.listarIssuesRepo(ORG_OWNER, repo);
    } catch (e: unknown) {
      let message = 'Erro desconhecido';
      let status = HttpStatus.INTERNAL_SERVER_ERROR;
      if (e instanceof Error) {
        message = e.message;
        // Verifica se o erro tem a propriedade status (type-safe)
        const errorWithStatus = e as Error & { status?: number };
        if (typeof errorWithStatus.status === 'number') {
          status = errorWithStatus.status;
        }
      }
      throw new HttpException(message, status);
    }
  }

  @Post('issue')
  @ApiOperation({ summary: 'Cria uma issue e adiciona ao Project' })
  @ApiBody({
    type: CreateIssueDto,
    examples: {
      exemploCompleto: {
        summary: 'Exemplo completo de criação de issue',
        value: {
          repo: 'chgit',
          title: 'Título da issue',
          body: 'Descrição detalhada da issue',
          projectId: 'PVT_kwHOAYb3Ps4BH3XF',
          assignees: ['usuario1', 'usuario2'],
          labels: ['bug', 'feature'],
          status: 'f75ad846',
          prioridade: '79628723',
          tamanho: '6c6483d2',
          dataInicio: '2025-11-17',
          dataFinal: '2025-11-20',
          milestone: 'milestone1',
          reviewers: ['usuario1'],
          repository: 'repoId',
          linkedPullRequests: ['pullRequestId1'],
          parentIssue: 'parentIssueId',
          cliente: '65699211',
          sistema: '8b944cc7',
          linkChamado: 'https://chamados.exemplo.com/123',
          iteracao: '4d5012ea',
        },
        description:
          'Exemplo de body com todos os campos possíveis e IDs reais dos campos customizados.',
      },
      exemploMinimo: {
        summary: 'Exemplo mínimo (apenas campos obrigatórios)',
        value: {
          repo: 'chgit',
          title: 'Título simples',
          body: 'Descrição simples',
        },
        description: 'Exemplo mínimo, apenas os campos obrigatórios.',
      },
      exemploCustomizados: {
        summary: 'Exemplo só com campos customizados',
        value: {
          status: 'f75ad846',
          prioridade: '79628723',
          tamanho: '6c6483d2',
          cliente: '65699211',
          sistema: '8b944cc7',
          linkChamado: 'https://chamados.exemplo.com/123',
          iteracao: '4d5012ea',
        },
        description: 'Exemplo apenas com campos customizados do projeto v2.',
      },
      exemploComAssigneesLabels: {
        summary: 'Exemplo com assignees e labels',
        value: {
          repo: 'chgit',
          title: 'Issue com assignees e labels',
          body: 'Descrição',
          assignees: ['usuario1'],
          labels: ['bug'],
        },
        description: 'Exemplo de issue com responsáveis e labels.',
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Issue criada com sucesso' })
  async createIssue(@Body() dto: CreateIssueDto): Promise<Record<string, any>> {
    // Lê o nome da organização do .env
    const ORG_OWNER = process.env.GITHUB_ORG_OWNER;
    if (!ORG_OWNER) {
      throw new Error(
        'A variável de ambiente GITHUB_ORG_OWNER não está definida.',
      );
    }
    // Passa todos os campos do DTO para o service, alinhando com o novo DTO
    return this.githubService.criarIssue({
      owner: ORG_OWNER,
      repo: dto.repo,
      title: dto.title,
      body: dto.body,
      projectId: dto.projectId,
      assignees: dto.assignees,
      labels: dto.labels,
      status: dto.status,
      prioridade: dto.prioridade,
      tamanho: dto.tamanho,
      dataInicio: dto.dataInicio,
      dataFinal: dto.dataFinal,
      milestone: dto.milestone,
      reviewers: dto.reviewers,
      repository: dto.repository,
      linkedPullRequests: dto.linkedPullRequests,
      parentIssue: dto.parentIssue,
      cliente: dto.cliente,
      sistema: dto.sistema,
      linkChamado: dto.linkChamado,
      iteracao: dto.iteracao,
    });
  }

  @Get('user-projects')
  @ApiOperation({
    summary: 'Lista os projetos v2 de um usuário (token pessoal)',
  })
  @ApiQuery({ name: 'login', required: true, description: 'Usuário do GitHub' })
  @ApiResponse({ status: 200, description: 'Lista de projetos do usuário' })
  async listarProjetosUsuario(@Query('login') login: string): Promise<any> {
    return this.githubService.listarProjetosUsuario(login);
  }

  @Get('org-projects')
  @ApiOperation({
    summary: 'Lista os projetos v2 de uma organização (GitHub App)',
  })
  @ApiQuery({
    name: 'login',
    required: true,
    description: 'Organização do GitHub',
  })
  @ApiResponse({ status: 200, description: 'Lista de projetos da organização' })
  async listarProjetosOrganizacao(@Query('login') login: string): Promise<any> {
    return this.githubService.listarProjetosOrganizacao(login);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Detalhes de um projeto' })
  @ApiParam({ name: 'projectId', description: 'ID global do projeto' })
  @ApiResponse({ status: 200, description: 'Detalhes do projeto' })
  async detalhesProjeto(@Param('projectId') projectId: string): Promise<any> {
    return this.githubService.detalhesProjetoV2(projectId);
  }
  @Get('ratelimit')
  @ApiOperation({ summary: 'Consulta o rate limit do token GitHub' })
  @ApiResponse({ status: 200, description: 'Informações de rate limit' })
  async getRateLimit(): Promise<any> {
    return this.githubService.getRateLimit();
  }
}
