import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsDateString } from 'class-validator';

export class CreateIssueDto {
  @ApiProperty({ example: 'chgit', description: 'Nome do repositório' })
  @IsString()
  repo: string;

  @ApiProperty({
    example: 'Título da issue',
    description: 'Título que deseja inserir para a issue',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Descrição da issue',
    description: 'Corpo/descrição da issue',
  })
  @IsString()
  body: string;

  @ApiPropertyOptional({
    example: 'PVT_kwHOAYb3Ps4BH3XF',
    description:
      'ID global do projeto (opcional), necessário utilizar o endpoint /github/projects para listar os projetos e obter o ID. Se não informado, será utilizado o valor da variável de ambiente GITHUB_PROJECT_ID.',
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({
    example: ['usuario1', 'usuario2'],
    description: 'Logins dos responsáveis (assignees) da issue',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignees?: string[];

  @ApiPropertyOptional({
    example: ['bug', 'feature'],
    description: 'Labels da issue',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];

  @ApiPropertyOptional({
    example: 'f75ad846',
    description:
      'ID da opção de Status (SINGLE_SELECT). Opções: f75ad846=Backlog, d00fc43a=To do, 47fc9ee4=In progress, df73e18b=In review, 98236657=Done',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    example: '79628723',
    description:
      'ID da opção de Prioridade (SINGLE_SELECT). Opções: 79628723=crítico, 0a877460=alto, da944a9c=medio, dbae16c3=baixo',
  })
  @IsOptional()
  @IsString()
  prioridade?: string;

  @ApiPropertyOptional({
    example: '6c6483d2',
    description:
      'ID da opção de Tamanho (SINGLE_SELECT). Opções: 6c6483d2=XS, f784b110=S, 7515a9f1=M, 817d0097=L, db339eb2=XL',
  })
  @IsOptional()
  @IsString()
  tamanho?: string;

  @ApiPropertyOptional({
    example: '2025-11-17',
    description: 'Data de início (Data Inicio) - formato ISO',
  })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional({
    example: '2025-11-20',
    description: 'Data de término (Data Final) - formato ISO',
  })
  @IsOptional()
  @IsDateString()
  dataFinal?: string;

  @ApiPropertyOptional({
    example: 'milestone1',
    description: 'Milestone associada',
  })
  @IsOptional()
  @IsString()
  milestone?: string;

  @ApiPropertyOptional({
    example: ['usuario1'],
    description: 'Logins dos revisores (reviewers)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reviewers?: string[];

  @ApiPropertyOptional({
    example: 'repoId',
    description: 'ID do repositório relacionado (Repository)',
  })
  @IsOptional()
  @IsString()
  repository?: string;

  @ApiPropertyOptional({
    example: ['pullRequestId1'],
    description: 'IDs dos pull requests vinculados',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  linkedPullRequests?: string[];

  @ApiPropertyOptional({
    example: 'parentIssueId',
    description: 'ID da issue pai (Parent issue)',
  })
  @IsOptional()
  @IsString()
  parentIssue?: string;

  @ApiPropertyOptional({
    example: '65699211',
    description:
      'ID da opção de Cliente (SINGLE_SELECT). Opções: 65699211=PMS, 03e9c1ca=PMV, 5b81eb83=PMVV, f7a353cf=PMA, 0e3a5508=PMC, 89c8a49e=PMVIANA, 3fe36df1=PMCOLATINA, f9056e91=PML, 69b8aaa4=TCM, dc86db19=BNB, ca5c28eb=PIRAI, 1c318ca2=Todos',
  })
  @IsOptional()
  @IsString()
  cliente?: string;

  @ApiPropertyOptional({
    example: '8b944cc7',
    description:
      'ID da opção de Sistema (SINGLE_SELECT). Opções: 8b944cc7=Contrato, 0fd4b667=Obras, 19e51d8d=Convênios, 2e4363e7=Social, 900beeee=Captação, e90d5f66=DadosAbertos, eb0282ab=Foco, cd5c8199=Indicador, 97129202=Repasses, 5d7d0f18=Solicitacao, 13da978a=Transparencia, c0b3bd11=PortalGestao, 7d00c290=PAC, 187687b4=Executa, 1bf45825=Chamado, 741d1b93=Mapeamento, b61a6cc7=EduCentralWeb, 275bebbd=Outros',
  })
  @IsOptional()
  @IsString()
  sistema?: string;

  @ApiPropertyOptional({
    example: 'https://chamados.exemplo.com/123',
    description: 'Link do Chamado (campo texto livre)',
  })
  @IsOptional()
  @IsString()
  linkChamado?: string;

  @ApiPropertyOptional({
    example: '4d5012ea',
    description: 'ID da iteração (ITERATION)',
  })
  @IsOptional()
  @IsString()
  iteracao?: string;
}
