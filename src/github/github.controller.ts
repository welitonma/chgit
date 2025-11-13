import { Body, Controller, Post, Get, Query, Param } from '@nestjs/common';
import { GithubService } from './github.service';
import { CreateIssueDto } from './dto/create-issue.dto';

@Controller('github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Post('issue')
  async createIssue(@Body() dto: CreateIssueDto): Promise<Record<string, any>> {
    return this.githubService.criarIssue(
      dto.owner,
      dto.repo,
      dto.title,
      dto.body,
      dto.projectId,
    );
  }

  @Get('projects')
  async listarProjetos(@Query('login') login: string): Promise<any> {
    return this.githubService.listarProjetosV2(login);
  }

  @Get('project/:projectId')
  async detalhesProjeto(@Param('projectId') projectId: string): Promise<any> {
    return this.githubService.detalhesProjetoV2(projectId);
  }
  @Get('ratelimit')
  async getRateLimit(): Promise<any> {
    return this.githubService.getRateLimit();
  }
}
