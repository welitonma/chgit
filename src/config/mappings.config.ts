// Este arquivo contém utilitários e mapeamentos usados pela integração
// entre os chamados e o GitHub. Ajuste os valores/implementações conforme
// as regras reais do ambiente.

export const INTEGRATION_CONFIG = {
  chamados: {
    apiUrl: process.env.CHAMADOS_API_URL,
  },
};

export const GITHUB_PROJECT_V2 = {
  id: 'PVT_kwDOCWdUyM4AbmxD',
  fields: {
    status: 'PVTSSF_lADOCWdUyM4AbmxDzgRyBk0',
    dataInicio: 'PVTF_lADOCWdUyM4AbmxDzgRyBmI',
    dataFinal: 'PVTF_lADOCWdUyM4AbmxDzgRyBmM',
    prioridade: 'PVTSSF_lADOCWdUyM4AbmxDzgRyBl8',
    tamanho: 'PVTSSF_lADOCWdUyM4AbmxDzgRyBmA',
    cliente: 'PVTSSF_lADOCWdUyM4AbmxDzg47We8',
    sistema: 'PVTSSF_lADOCWdUyM4AbmxDzg47XJY',
    linkChamado: 'PVTF_lADOCWdUyM4AbmxDzg47XPE',
    iteracao: 'PVTIF_lADOCWdUyM4AbmxDzg47XbE',
  },
};

export const GITHUB_FIELD_IDS = {
  status: {
    backlog: 'f75ad846',
    todo: 'd00fc43a',
    inProgress: '47fc9ee4',
    inReview: 'df73e18b',
    done: '98236657',
  },
  prioridade: {
    critico: '79628723',
    alto: '0a877460',
    medio: 'da944a9c',
    baixo: 'dbae16c3',
  },
  tamanho: {
    xs: '6c6483d2',
    s: 'f784b110',
    m: '7515a9f1',
    l: '817d0097',
    xl: 'db339eb2',
  },
  cliente: {
    pms: '65699211',
    pmv: '03e9c1ca',
    pmvv: '5b81eb83',
    pma: 'f7a353cf',
    pmc: '0e3a5508',
    pmviana: '89c8a49e',
    pmcolatina: '3fe36df1',
    pml: 'f9056e91',
    tcm: '69b8aaa4',
    bnb: 'dc86db19',
    pirai: 'ca5c28eb',
    todos: '1c318ca2',
  },
  sistema: {
    contrato: '8b944cc7',
    obras: '0fd4b667',
    convenios: '19e51d8d',
    social: '2e4363e7',
    captacao: '900beeee',
    dadosAbertos: 'e90d5f66',
    foco: 'eb0282ab',
    indicador: 'cd5c8199',
    repasses: '97129202',
    solicitacao: '5d7d0f18',
    transparencia: '13da978a',
    portalGestao: 'c0b3bd11',
    pac: '7d00c290',
    executa: '187687b4',
    chamado: '1bf45825',
    mapeamento: '741d1b93',
    eduCentralWeb: 'b61a6cc7',
    outros: '275bebbd',
  },
};

export const STATUS_OPTIONS = {
  backlog: GITHUB_FIELD_IDS.status.backlog,
  todo: GITHUB_FIELD_IDS.status.todo,
  inProgress: GITHUB_FIELD_IDS.status.inProgress,
  inReview: GITHUB_FIELD_IDS.status.inReview,
  done: GITHUB_FIELD_IDS.status.done,
};

export const TAMANHO_OPTIONS = {
  xs: GITHUB_FIELD_IDS.tamanho.xs,
  s: GITHUB_FIELD_IDS.tamanho.s,
  m: GITHUB_FIELD_IDS.tamanho.m,
  l: GITHUB_FIELD_IDS.tamanho.l,
  xl: GITHUB_FIELD_IDS.tamanho.xl,
};

export function mapSituacaoToStatus(situacao: number): string {
  switch (situacao) {
    case 1:
      return STATUS_OPTIONS.backlog;
    case 2:
      return STATUS_OPTIONS.inProgress;
    case 3:
      return STATUS_OPTIONS.done;
    default:
      return STATUS_OPTIONS.todo;
  }
}

export function mapNivelCriticoToPrioridade(nivel: number): string {
  switch (nivel) {
    case 1:
      return GITHUB_FIELD_IDS.prioridade.critico;
    case 2:
      return GITHUB_FIELD_IDS.prioridade.alto;
    case 3:
      return GITHUB_FIELD_IDS.prioridade.medio;
    case 4:
      return GITHUB_FIELD_IDS.prioridade.baixo;
    default:
      return GITHUB_FIELD_IDS.prioridade.medio;
  }
}

export function mapNivelCriticoToTamanho(nivel: number): string {
  switch (nivel) {
    case 1:
      return TAMANHO_OPTIONS.l;
    case 2:
      return TAMANHO_OPTIONS.m;
    case 3:
      return TAMANHO_OPTIONS.s;
    case 4:
      return TAMANHO_OPTIONS.xs;
    default:
      return TAMANHO_OPTIONS.m;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getRepoByProduto(_produtoId: number): string {
  return 'agenda';
}

const SISTEMA_BY_PRODUTO_ID: Record<number, string> = {
  // Ex.: 10: GITHUB_FIELD_IDS.sistema.portalGestao,
};

export function getSistemaByProduto(produtoId: number): string {
  return SISTEMA_BY_PRODUTO_ID[produtoId] || GITHUB_FIELD_IDS.sistema.outros;
}

const SISTEMA_BY_NOME: Record<string, string> = {
  contrato: GITHUB_FIELD_IDS.sistema.contrato,
  contratoweb: GITHUB_FIELD_IDS.sistema.contrato,
  'contrato web': GITHUB_FIELD_IDS.sistema.contrato,
  obras: GITHUB_FIELD_IDS.sistema.obras,
  obrasweb: GITHUB_FIELD_IDS.sistema.obras,
  'obras web': GITHUB_FIELD_IDS.sistema.obras,
  convênios: GITHUB_FIELD_IDS.sistema.convenios,
  convenios: GITHUB_FIELD_IDS.sistema.convenios,
  conveniosweb: GITHUB_FIELD_IDS.sistema.convenios,
  social: GITHUB_FIELD_IDS.sistema.social,
  socialweb: GITHUB_FIELD_IDS.sistema.social,
  captação: GITHUB_FIELD_IDS.sistema.captacao,
  captacao: GITHUB_FIELD_IDS.sistema.captacao,
  captacaoweb: GITHUB_FIELD_IDS.sistema.captacao,
  foco: GITHUB_FIELD_IDS.sistema.foco,
  indicador: GITHUB_FIELD_IDS.sistema.indicador,
  repasses: GITHUB_FIELD_IDS.sistema.repasses,
  solicitação: GITHUB_FIELD_IDS.sistema.solicitacao,
  solicitacao: GITHUB_FIELD_IDS.sistema.solicitacao,
  solicitacaoweb: GITHUB_FIELD_IDS.sistema.solicitacao,
  transparência: GITHUB_FIELD_IDS.sistema.transparencia,
  transparencia: GITHUB_FIELD_IDS.sistema.transparencia,
  transparenciaweb: GITHUB_FIELD_IDS.sistema.transparencia,
  'portal gestão': GITHUB_FIELD_IDS.sistema.portalGestao,
  'portal gestao': GITHUB_FIELD_IDS.sistema.portalGestao,
  portalgestao: GITHUB_FIELD_IDS.sistema.portalGestao,
  portalgestaoweb: GITHUB_FIELD_IDS.sistema.portalGestao,
  pac: GITHUB_FIELD_IDS.sistema.pac,
  pacweb: GITHUB_FIELD_IDS.sistema.pac,
  executa: GITHUB_FIELD_IDS.sistema.executa,
  executaweb: GITHUB_FIELD_IDS.sistema.executa,
  chamado: GITHUB_FIELD_IDS.sistema.chamado,
  chamadoweb: GITHUB_FIELD_IDS.sistema.chamado,
  mapeamento: GITHUB_FIELD_IDS.sistema.mapeamento,
  mapeamentoweb: GITHUB_FIELD_IDS.sistema.mapeamento,
  educentralweb: GITHUB_FIELD_IDS.sistema.eduCentralWeb,
  'edu central web': GITHUB_FIELD_IDS.sistema.eduCentralWeb,
  focoweb: GITHUB_FIELD_IDS.sistema.foco,
  indicadorweb: GITHUB_FIELD_IDS.sistema.indicador,
  repassesweb: GITHUB_FIELD_IDS.sistema.repasses,
  dadosabertos: GITHUB_FIELD_IDS.sistema.dadosAbertos,
  dadosabertosweb: GITHUB_FIELD_IDS.sistema.dadosAbertos,
  'dados abertos': GITHUB_FIELD_IDS.sistema.dadosAbertos,
};

export function getSistemaByNome(produtoNome: string): string {
  const chave = produtoNome.trim().toLowerCase();
  return SISTEMA_BY_NOME[chave] || GITHUB_FIELD_IDS.sistema.outros;
}

const CLIENTE_OPTION_BY_ID: Record<number, string> = {
  10617: GITHUB_FIELD_IDS.cliente.pmvv,
};

export function getClienteById(clienteId: number): string {
  return CLIENTE_OPTION_BY_ID[clienteId] || GITHUB_FIELD_IDS.cliente.todos;
}

const CLIENTE_BY_EMPRESA_NOME: Record<string, string> = {
  PMS: GITHUB_FIELD_IDS.cliente.pms,
  PMV: GITHUB_FIELD_IDS.cliente.pmv,
  PMVV: GITHUB_FIELD_IDS.cliente.pmvv,
  PMA: GITHUB_FIELD_IDS.cliente.pma,
  PMC: GITHUB_FIELD_IDS.cliente.pmc,
  PMVIANA: GITHUB_FIELD_IDS.cliente.pmviana,
  PMCOLATINA: GITHUB_FIELD_IDS.cliente.pmcolatina,
  PML: GITHUB_FIELD_IDS.cliente.pml,
  TCM: GITHUB_FIELD_IDS.cliente.tcm,
  BNB: GITHUB_FIELD_IDS.cliente.bnb,
  PIRAI: GITHUB_FIELD_IDS.cliente.pirai,
  PIRAÍ: GITHUB_FIELD_IDS.cliente.pirai,
  TODOS: GITHUB_FIELD_IDS.cliente.todos,
};

export function getClienteByEmpresaNome(empresaNome: string): string {
  const chave = empresaNome.trim().toUpperCase();
  if (CLIENTE_BY_EMPRESA_NOME[chave]) return CLIENTE_BY_EMPRESA_NOME[chave];
  const partes = chave.split(' - ');
  if (partes.length > 1) {
    const sigla = partes[partes.length - 1].trim();
    if (CLIENTE_BY_EMPRESA_NOME[sigla]) return CLIENTE_BY_EMPRESA_NOME[sigla];
  }
  return GITHUB_FIELD_IDS.cliente.todos;
}

export function getAssigneesByTecnico(
  tecnicoId: number | null,
): string[] | undefined {
  if (tecnicoId == null) return undefined;

  const GITHUB_LOGIN_BY_TECNICO_ID: Record<number, string[]> = {
    // 1: ['usuario-github-1'],
    // 2: ['usuario-github-2'],
    // 3: ['weslley-miranda'],
  };

  return GITHUB_LOGIN_BY_TECNICO_ID[tecnicoId];
}

export function getLabelsBySituacao(situacao: number): string[] {
  switch (situacao) {
    case 1:
      return ['novo'];
    case 2:
      return ['em andamento'];
    case 3:
      return ['resolvido'];
    default:
      return [];
  }
}
