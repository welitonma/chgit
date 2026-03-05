import {
  Body,
  Controller,
  Post,
  Get,
  Query,
  Param,
  Headers,
} from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { GithubService } from './github.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { ChamadoIntegrationService } from '../chamado/chamado-integration.service';

@ApiTags('GitHub')
@Controller('github')
export class GithubController {
  constructor(
    private readonly githubService: GithubService,
    private readonly chamadoIntegrationService: ChamadoIntegrationService,
  ) {}

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
  async listarIssuesRepo(
    @Query('repo') repo: string,
  ): Promise<Record<string, unknown>> {
    const ORG_OWNER = process.env.GITHUB_ORG_OWNER;
    if (!ORG_OWNER) {
      throw new HttpException(
        'A variável de ambiente GITHUB_ORG_OWNER não está definida.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    try {
      const issues = (await this.githubService.listarIssuesRepo(
        ORG_OWNER,
        repo,
      )) as Record<string, unknown>;
      return issues;
    } catch (e: unknown) {
      let message = 'Erro desconhecido';
      let status = HttpStatus.INTERNAL_SERVER_ERROR;
      if (e instanceof Error) {
        message = e.message;
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
  async createIssue(
    @Body() dto: CreateIssueDto,
  ): Promise<Record<string, unknown>> {
    const ORG_OWNER = process.env.GITHUB_ORG_OWNER;
    if (!ORG_OWNER) {
      throw new Error(
        'A variável de ambiente GITHUB_ORG_OWNER não está definida.',
      );
    }
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
  async listarProjetosUsuario(
    @Query('login') login: string,
  ): Promise<Record<string, unknown>> {
    const projetos = (await this.githubService.listarProjetosUsuario(
      login,
    )) as Record<string, unknown>;
    return projetos;
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
  async listarProjetosOrganizacao(
    @Query('login') login: string,
  ): Promise<Record<string, unknown>> {
    const projetos = (await this.githubService.listarProjetosOrganizacao(
      login,
    )) as Record<string, unknown>;
    return projetos;
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Detalhes de um projeto' })
  @ApiParam({ name: 'projectId', description: 'ID global do projeto' })
  @ApiResponse({ status: 200, description: 'Detalhes do projeto' })
  async detalhesProjeto(
    @Param('projectId') projectId: string,
  ): Promise<Record<string, unknown>> {
    const projeto = (await this.githubService.detalhesProjetoV2(
      projectId,
    )) as Record<string, unknown>;
    return projeto;
  }
  @Get('ratelimit')
  @ApiOperation({ summary: 'Consulta o rate limit do token GitHub' })
  @ApiResponse({ status: 200, description: 'Informações de rate limit' })
  async getRateLimit(): Promise<Record<string, unknown>> {
    const rateLimit = (await this.githubService.getRateLimit()) as Record<
      string,
      unknown
    >;
    return rateLimit;
  }

  @Post('issue-from-chamado/:id')
  @ApiOperation({ summary: 'Cria uma issue a partir de um chamado interno' })
  @ApiParam({ name: 'id', description: 'Identificador do chamado no sistema' })
  @ApiResponse({ status: 201, description: 'Issue criada com sucesso' })
  async createFromChamado(
    @Param('id') id: string,
    @Query('tamanho') tamanho?: string,
    @Query('prioridade') prioridade?: string,
    @Query('empresaNome') empresaNome?: string,
    @Query('produtoNome') produtoNome?: string,
    @Query('assuntoDescricao') assuntoDescricao?: string,
    @Headers('authorization') authorization?: string,
  ): Promise<Record<string, unknown>> {
    const chamadoId = parseInt(id, 10);
    if (isNaN(chamadoId)) {
      throw new HttpException('ID de chamado inválido', HttpStatus.BAD_REQUEST);
    }
    const extras: Record<string, unknown> = {};
    if (tamanho) extras.tamanho = tamanho;
    if (prioridade) extras.prioridade = prioridade;
    return this.chamadoIntegrationService.criarIssueDoChamado(
      chamadoId,
      authorization,
      extras,
      empresaNome,
      produtoNome,
      assuntoDescricao,
    );
  }
}
