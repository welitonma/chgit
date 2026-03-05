import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { GithubService } from '../github/github.service';
import { ConfigService } from '@nestjs/config';
import {
  mapSituacaoToStatus,
  mapNivelCriticoToPrioridade,
  mapNivelCriticoToTamanho,
  getRepoByProduto,
  getSistemaByProduto,
  getSistemaByNome,
  getClienteById,
  getClienteByEmpresaNome,
  getAssigneesByTecnico,
  getLabelsBySituacao,
  INTEGRATION_CONFIG,
} from '../config/mappings.config';

interface ChamadoData {
  id: number;
  numero: number;
  data: string;
  ultimaAtualizacao: string;
  problema: string;
  nivelCritico: number;
  situacao: number;
  idCHCliente: number;
  idCHProduto: number;
  idCHTecnico: number | null;
  clienteNome?: string;
  setorSigla?: string;
}

interface AcompanhamentoData {
  id: number;
  idCHChamado: number;
  data: string;
  descricao?: string;
  descricaoTecnica?: string;
  situacao?: number;
  tecnicoNome?: string;
  clienteNome?: string;
}

interface ArquivoData {
  id: number;
  nome: string;
  nomeOriginal?: string;
  extensao?: string;
  tamanho?: number;
  data?: string;
  urlBlob?: string;
}

@Injectable()
export class ChamadoIntegrationService {
  private readonly logger = new Logger(ChamadoIntegrationService.name);

  constructor(
    private readonly githubService: GithubService,
    private readonly configService: ConfigService,
  ) {}

  async criarIssueDoChamado(
    chamadoId: number,
    authToken?: string,
    extras?: Partial<Parameters<GithubService['criarIssue']>[0]>,
    empresaNome?: string,
    produtoNome?: string,
    assuntoDescricao?: string,
  ): Promise<Record<string, unknown>> {
    const token =
      authToken || this.configService.get<string>('CHAMADOS_API_TOKEN');
    const isDevelopment =
      this.configService.get<string>('NODE_ENV') === 'development';

    if (!token && !isDevelopment) {
      throw new HttpException('Token não fornecido', HttpStatus.UNAUTHORIZED);
    }

    const chamado = await this.buscarChamado(chamadoId, token);

    const includeAcomps = this.isEnvFlagEnabled(
      'GITHUB_INCLUDE_ACOMPANHAMENTOS',
      false,
    );
    const includeAttachments = this.isAttachmentsEnabled();

    this.logger.log(
      `[criarIssueDoChamado] includeAcomps=${includeAcomps} includeAttachments=${includeAttachments}`,
    );

    let acompanhamentos: AcompanhamentoData[] = [];
    let arquivos: ArquivoData[] = [];

    // if neither feature is needed, skip all network waits
    if (includeAcomps || includeAttachments) {
      [acompanhamentos, arquivos] = await Promise.all([
        includeAcomps ? this.buscarAcompanhamentos(chamadoId, token) : [],
        includeAttachments ? this.buscarArquivos(chamadoId, token) : [],
      ]);
    }

    const issueOwner = this.configService.get<string>('GITHUB_ORG_OWNER')!;
    const issueRepo = getRepoByProduto(chamado.idCHProduto);
    const uploadOwner =
      this.configService.get<string>('GITHUB_UPLOAD_OWNER') || issueOwner;
    const uploadRepo =
      this.configService.get<string>('GITHUB_UPLOAD_REPO') || issueRepo;

    const arquivosComUrl = includeAttachments
      ? await this.uploadAnexosParaRepo(
          arquivos,
          uploadOwner,
          uploadRepo,
          chamado.numero,
          new Date(chamado.data).getFullYear(),
          token,
        )
      : [];

    let issueData = this.mapearChamadoParaIssue(
      chamado,
      empresaNome,
      produtoNome,
      acompanhamentos,
      arquivosComUrl,
      assuntoDescricao,
    );
    if (extras) {
      issueData = { ...issueData, ...extras };
    }
    this.logger.log(
      `[criarIssueDoChamado] issueData: ${JSON.stringify(issueData)}`,
    );

    return this.githubService.criarIssue(issueData);
  }

  private async buscarChamado(
    id: number,
    token?: string,
  ): Promise<ChamadoData> {
    const baseUrl = this.getChamadosApiUrl();
    const url = `${baseUrl}/CHChamado/${id}`;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'tectrilha-sistema': 'ChamadoWebExterno',
    };

    if (token) {
      headers.Authorization = token;
    }

    const res = await fetch(url, {
      headers,
    });

    if (!res.ok) {
      this.logger.error(`Erro ao buscar chamado ${id}: HTTP ${res.status}`);
      throw new HttpException('Erro ao buscar chamado', HttpStatus.BAD_GATEWAY);
    }

    return res.json() as Promise<ChamadoData>;
  }

  private mapearChamadoParaIssue(
    chamado: ChamadoData,
    empresaNome?: string,
    produtoNome?: string,
    acompanhamentos?: AcompanhamentoData[],
    arquivos?: ArquivoData[],
    assuntoDescricao?: string,
  ): Parameters<GithubService['criarIssue']>[0] {
    const bodyLimpo = this.limparHtml(chamado.problema);
    const frontendUrl = this.getFrontendUrl();

    const titulo = assuntoDescricao || this.extrairTitulo(bodyLimpo);

    const cliente = empresaNome
      ? getClienteByEmpresaNome(empresaNome)
      : getClienteById(chamado.idCHCliente);

    this.logger.log(
      `[mapearChamadoParaIssue] empresaNome=${empresaNome}, produtoNome=${produtoNome}`,
    );
    const sistema = produtoNome
      ? getSistemaByNome(produtoNome)
      : getSistemaByProduto(chamado.idCHProduto);

    return {
      owner: this.configService.get<string>('GITHUB_ORG_OWNER')!,
      repo: getRepoByProduto(chamado.idCHProduto),
      title: `[Chamado #${chamado.numero}/${new Date(chamado.data).getFullYear()}] ${titulo}`,
      body: this.formatarBody(
        chamado,
        bodyLimpo,
        empresaNome,
        acompanhamentos,
        arquivos,
      ),

      status: mapSituacaoToStatus(chamado.situacao),
      prioridade: mapNivelCriticoToPrioridade(chamado.nivelCritico),
      tamanho: mapNivelCriticoToTamanho(chamado.nivelCritico),
      cliente,
      sistema,
      linkChamado: `${frontendUrl}/#/detalhes/${chamado.id}`,

      assignees: getAssigneesByTecnico(chamado.idCHTecnico),
      labels: getLabelsBySituacao(chamado.situacao),
    };
  }

  private getChamadosApiUrl(): string {
    const configuredUrl =
      this.configService.get<string>('CHAMADOS_API_URL') ||
      INTEGRATION_CONFIG.chamados.apiUrl ||
      'http://localhost:5000';

    return configuredUrl.replace(/\/+$/, '');
  }

  private limparHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extrairTitulo(body: string): string {
    const primeiraLinha = body.split('\n')[0] || 'Sem título';
    return primeiraLinha.length > 80
      ? primeiraLinha.substring(0, 77) + '...'
      : primeiraLinha;
  }

  private formatarBody(
    chamado: ChamadoData,
    bodyLimpo: string,
    _empresaNome?: string,
    acompanhamentos?: AcompanhamentoData[],
    arquivos?: ArquivoData[],
  ): string {
    const anoChamado = new Date(chamado.data).getFullYear();

    let body = `## Descrição\n\nChamado #${chamado.numero}/${anoChamado}\n\n${bodyLimpo}`;

    if (
      acompanhamentos &&
      acompanhamentos.length > 0 &&
      this.isEnvFlagEnabled('GITHUB_INCLUDE_ACOMPANHAMENTOS', false)
    ) {
      body += `\n\n## Acompanhamentos (${acompanhamentos.length})`;
      for (const acomp of acompanhamentos) {
        const dataAcomp = new Date(acomp.data).toLocaleDateString('pt-BR');
        const autor = acomp.tecnicoNome || acomp.clienteNome || '—';
        const descricao = acomp.descricao
          ? this.limparHtml(acomp.descricao)
          : '';
        const descricaoTecnica = acomp.descricaoTecnica
          ? this.limparHtml(acomp.descricaoTecnica)
          : '';
        const textoAcomp = descricaoTecnica || descricao || '(sem descrição)';
        body += `\n\n> **${dataAcomp}** — _${autor}_  \n> ${textoAcomp}`;
      }
    }

    if (
      arquivos &&
      arquivos.length > 0 &&
      this.isEnvFlagEnabled('GITHUB_INCLUDE_ANEXOS', false)
    ) {
      body += `\n\n## Anexos (${arquivos.length})`;
      for (const arq of arquivos) {
        const nome = arq.nomeOriginal || arq.nome;
        const ext = (arq.extensao || '').toLowerCase();
        if (arq.urlBlob) {
          if (
            ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)
          ) {
            body += `\n\n![${nome}](${arq.urlBlob})`;
          } else {
            body += `\n- [📄 ${nome}](${arq.urlBlob})`;
          }
        } else {
          body += `\n- 📄 ${nome} (${ext})`;
        }
      }
    }

    return body;
  }

  private getFrontendUrl(): string {
    return (
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('CORS_ORIGIN') ||
      'http://localhost:3000'
    );
  }

  /**
   * Faz download dos arquivos do blob e upload para o repositório GitHub.
   * Retorna os arquivos com urlBlob atualizado para a URL do GitHub.
   */
  private async uploadAnexosParaRepo(
    arquivos: ArquivoData[],
    owner: string,
    repo: string,
    numeroChamado: number,
    anoChamado: number,
    token?: string,
  ): Promise<ArquivoData[]> {
    if (!arquivos || arquivos.length === 0) return arquivos;

    const resultado: ArquivoData[] = [];
    const errosUpload: string[] = [];
    const requireUpload = this.isEnvFlagEnabled(
      'GITHUB_REQUIRE_ATTACHMENT_UPLOAD',
      false,
    );
    const baseUrl = this.getChamadosApiUrl();

    for (const arq of arquivos) {
      if (!arq.urlBlob) {
        resultado.push(arq);
        continue;
      }

      try {
        const blobApiUrl = `${baseUrl}/api/BlobStorage/GetBlobFileArray?url=${encodeURIComponent(arq.urlBlob)}`;
        this.logger.log(
          `[uploadAnexos] Baixando via API: ${arq.nomeOriginal || arq.nome}`,
        );

        const headers: Record<string, string> = {
          Accept: 'application/json',
          'tectrilha-sistema': 'ChamadoWebExterno',
        };
        if (token) headers.Authorization = token;

        const response = await fetch(blobApiUrl, { headers });
        if (!response.ok) {
          const erro = `Falha ao baixar ${arq.nomeOriginal || arq.nome}: HTTP ${response.status}`;
          this.logger.warn(`[uploadAnexos] ${erro}`);
          errosUpload.push(erro);
          if (!requireUpload) resultado.push(arq);
          continue;
        }

        const base64Content = await response.text();
        const cleanBase64 = base64Content.replace(/^"|"$/g, '');
        if (!cleanBase64) {
          const erro = `Conteúdo vazio ao baixar ${arq.nomeOriginal || arq.nome}`;
          this.logger.warn(`[uploadAnexos] ${erro}`);
          errosUpload.push(erro);
          if (!requireUpload) resultado.push(arq);
          continue;
        }
        const buffer = Buffer.from(cleanBase64, 'base64');

        const nomeArquivo = (arq.nomeOriginal || arq.nome).replace(
          /[^a-zA-Z0-9._-]/g,
          '_',
        );
        const repoPath = `.github/chamados/${numeroChamado}-${anoChamado}/${nomeArquivo}`;

        const githubUrl = await this.githubService.uploadFileToRepo(
          owner,
          repo,
          repoPath,
          buffer,
          `docs: anexo chamado #${numeroChamado}/${anoChamado} - ${arq.nomeOriginal || arq.nome}`,
        );

        this.logger.log(
          `[uploadAnexos] Upload OK: ${arq.nomeOriginal || arq.nome} → ${githubUrl}`,
        );

        resultado.push({ ...arq, urlBlob: githubUrl });
      } catch (err) {
        const erro = `Erro ao fazer upload de ${arq.nomeOriginal || arq.nome}: ${err}`;
        this.logger.warn(`[uploadAnexos] ${erro}`);
        errosUpload.push(erro);
        if (!requireUpload) resultado.push(arq);
      }
    }

    if (requireUpload && errosUpload.length > 0) {
      throw new HttpException(
        `Falha ao anexar arquivos na issue. Ajuste permissões/credenciais de upload no GitHub (repo: ${owner}/${repo}). Erros: ${errosUpload.join(' | ')}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return resultado;
  }

  private async buscarAcompanhamentos(
    chamadoId: number,
    token?: string,
  ): Promise<AcompanhamentoData[]> {
    try {
      const baseUrl = this.getChamadosApiUrl();
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'tectrilha-sistema': 'ChamadoWebExterno',
      };
      if (token) headers.Authorization = token;

      const filtroUrl = `${baseUrl}/CHAcompanhamento/filtro`;
      const filtroRes = await fetch(filtroUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ idCHChamado: chamadoId }),
      });
      if (!filtroRes.ok) {
        this.logger.warn(
          `Não foi possível filtrar acompanhamentos do chamado ${chamadoId}: HTTP ${filtroRes.status}`,
        );
        return [];
      }
      const ids = (await filtroRes.json()) as number[];
      if (!ids.length) return [];

      const idsQuery = ids.map((id) => `ids=${id}`).join('&');
      const completoUrl = `${baseUrl}/CHAcompanhamento/completo?${idsQuery}`;
      const completoRes = await fetch(completoUrl, { headers });
      if (!completoRes.ok) {
        this.logger.warn(
          `Não foi possível buscar acompanhamentos completos: HTTP ${completoRes.status}`,
        );
        return [];
      }
      return (await completoRes.json()) as AcompanhamentoData[];
    } catch (err) {
      this.logger.warn(`Erro ao buscar acompanhamentos: ${err}`);
      return [];
    }
  }

  private async buscarArquivos(
    chamadoId: number,
    token?: string,
  ): Promise<ArquivoData[]> {
    try {
      const baseUrl = this.getChamadosApiUrl();
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'tectrilha-sistema': 'ChamadoWebExterno',
      };
      if (token) headers.Authorization = token;

      const filtroUrl = `${baseUrl}/CHArquivo/filtro`;
      const filtroRes = await fetch(filtroUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ idCHChamado: chamadoId }),
      });
      if (!filtroRes.ok) {
        this.logger.warn(
          `Não foi possível filtrar anexos do chamado ${chamadoId}: HTTP ${filtroRes.status}`,
        );
        return [];
      }
      const ids = (await filtroRes.json()) as number[];
      if (!ids.length) return [];

      const idsQuery = ids.map((id) => `ids=${id}`).join('&');
      const arquivosUrl = `${baseUrl}/CHArquivo?${idsQuery}`;
      const arquivosRes = await fetch(arquivosUrl, { headers });
      if (!arquivosRes.ok) {
        this.logger.warn(
          `Não foi possível buscar anexos: HTTP ${arquivosRes.status}`,
        );
        return [];
      }
      return (await arquivosRes.json()) as ArquivoData[];
    } catch (err) {
      this.logger.warn(`Erro ao buscar anexos: ${err}`);
      return [];
    }
  }

  private isEnvFlagEnabled(key: string, defaultValue: boolean): boolean {
    const rawValue = this.configService.get<string>(key);

    if (rawValue == null || rawValue === '') {
      return defaultValue;
    }

    const normalizedValue = String(rawValue).trim().toLowerCase();

    if (['false', '0', 'no', 'off'].includes(normalizedValue)) {
      return false;
    }

    if (['true', '1', 'yes', 'on'].includes(normalizedValue)) {
      return true;
    }

    this.logger.warn(
      `[config] Valor inválido para ${key}="${rawValue}". Usando padrão: ${defaultValue}`,
    );

    return defaultValue;
  }

  private isAttachmentsEnabled(): boolean {
    const explicitInclude = this.configService.get<string>(
      'GITHUB_INCLUDE_ANEXOS',
    );

    if (explicitInclude != null && explicitInclude !== '') {
      return this.isEnvFlagEnabled('GITHUB_INCLUDE_ANEXOS', false);
    }

    const legacyUploadFlag = this.configService.get<string>(
      'GITHUB_REQUIRE_ATTACHMENT_UPLOAD',
    );

    if (legacyUploadFlag != null && legacyUploadFlag !== '') {
      const legacyValue = this.isEnvFlagEnabled(
        'GITHUB_REQUIRE_ATTACHMENT_UPLOAD',
        false,
      );
      this.logger.warn(
        '[config] GITHUB_INCLUDE_ANEXOS não definido. Usando GITHUB_REQUIRE_ATTACHMENT_UPLOAD como fallback para incluir anexos.',
      );
      return legacyValue;
    }

    return false;
  }
}
