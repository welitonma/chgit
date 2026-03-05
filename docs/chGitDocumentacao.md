# Documentação da API chGit

## 1. Visão Geral da API

- **Nome**: chGit
- **Propósito**: A chGit é uma API REST em NestJS que cria e gerencia issues no GitHub, enriquece essas issues com campos customizados do GitHub Project v2 e gera issues a partir do sistema interno de chamados (`ChamadoWeb`). Ela ainda expõe endpoints auxiliares para consultar projetos GitHub e limites de taxa da API.
- **Base URL (local/padrão)**: `http://localhost:3333`
- **Swagger UI**: `http://localhost:3333/docs`
- **Versão**: `0.0.0`
- **Protocolo**: REST
- **Formato de dados**: JSON
- **Autenticação**:
  - Camada da API: sem middleware/guard global de autenticação.
  - Integração com GitHub: exige credenciais em variáveis de ambiente (`GITHUB_APP_*` e `GITHUB_TOKEN`).
  - `POST /github/issue-from-chamado/:id`: exige header `Authorization` para a API ChamadoWeb quando `NODE_ENV` não é `development`.

---

## 2. Autenticação

### 2.1 Autenticação no GitHub (server-to-server)

A API autentica no GitHub usando um destes modos:

1. **Modo GitHub App** (preferencial quando todos os valores existem):
   - `GITHUB_APP_ID`
   - `GITHUB_APP_INSTALLATION_ID`
   - `GITHUB_APP_PRIVATE_KEY_PATH`
2. **Fallback com token pessoal**:
   - `GITHUB_TOKEN`

### 2.2 Autenticação upstream de ChamadoWeb

Para `POST /github/issue-from-chamado/:id`, se `NODE_ENV !== development`, o serviço espera um header `Authorization` para chamar os endpoints internos de Chamado.

```http
Authorization: Bearer <TOKEN>
```

### 2.3 Comportamento de expiração de token

- Tokens de instalação do GitHub App têm curta duração e são renovados pelo fluxo de autenticação do app.
- A expiração do token pessoal depende da configuração do token no GitHub.
- A expiração do token de Chamado depende da política do sistema upstream.

---

## 3. Endpoints da API

### [GET] /

| Campo                    | Valor                                  |
| ------------------------ | -------------------------------------- |
| Método                   | GET                                    |
| Endpoint                 | `/`                                    |
| Descrição                | Retorna string de status/saúde da API. |
| Autenticação obrigatória | Não                                    |

### Parâmetros da Requisição

Nenhum.

### Resposta — Sucesso

**Status: 200 OK**

```json
"ok!"
```

### Resposta — Erro

| Código HTTP | Significado           | Descrição                   |
| ----------- | --------------------- | --------------------------- |
| 500         | Internal Server Error | Erro inesperado no servidor |

---

### [GET] /github/issues

| Campo                    | Valor                                                        |
| ------------------------ | ------------------------------------------------------------ |
| Método                   | GET                                                          |
| Endpoint                 | `/github/issues`                                             |
| Descrição                | Lista issues de um repositório dentro de `GITHUB_ORG_OWNER`. |
| Autenticação obrigatória | Indireta (credenciais GitHub em env)                         |

### Parâmetros da Requisição

| Nome | Local | Tipo   | Obrigatório | Descrição                     | Exemplo  |
| ---- | ----- | ------ | ----------- | ----------------------------- | -------- |
| repo | query | string | true        | Nome do repositório no GitHub | `agenda` |

### Resposta — Sucesso

**Status: 200 OK**

```json
[
  {
    "id": 123456789,
    "number": 42,
    "title": "Título da issue",
    "state": "open",
    "html_url": "https://github.com/vixcod/agenda/issues/42"
  }
]
```

### Resposta — Erro

| Código HTTP | Significado           | Descrição                                     |
| ----------- | --------------------- | --------------------------------------------- |
| 404         | Not Found             | Repositório não encontrado ou sem permissão   |
| 500         | Internal Server Error | `GITHUB_ORG_OWNER` ausente ou erro inesperado |

---

### [POST] /github/issue

| Campo                    | Valor                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| Método                   | POST                                                                                     |
| Endpoint                 | `/github/issue`                                                                          |
| Descrição                | Cria uma issue no GitHub e opcionalmente adiciona ao Project v2 com campos customizados. |
| Autenticação obrigatória | Indireta (credenciais GitHub em env)                                                     |

### Parâmetros da Requisição

| Nome               | Local | Tipo              | Obrigatório | Descrição                                                       | Exemplo                                  |
| ------------------ | ----- | ----------------- | ----------- | --------------------------------------------------------------- | ---------------------------------------- |
| repo               | body  | string            | true        | Nome do repositório                                             | `agenda`                                 |
| title              | body  | string            | true        | Título da issue                                                 | `Chamado #2/2026`                        |
| body               | body  | string            | true        | Descrição da issue (suporta markdown)                           | `Detalhes da issue...`                   |
| projectId          | body  | string            | false       | ID global do Project v2 (fallback para env `GITHUB_PROJECT_ID`) | `PVT_kwDOCWdUyM4AbmxD`                   |
| assignees          | body  | string[]          | false       | Assignees no GitHub                                             | `["user1"]`                              |
| labels             | body  | string[]          | false       | Labels no GitHub                                                | `["bug"]`                                |
| status             | body  | string            | false       | ID da opção de status no projeto                                | `d00fc43a`                               |
| prioridade         | body  | string            | false       | ID da opção de prioridade no projeto                            | `dbae16c3`                               |
| tamanho            | body  | string            | false       | ID da opção de tamanho no projeto                               | `817d0097`                               |
| dataInicio         | body  | string (data ISO) | false       | Data de início                                                  | `2026-03-04`                             |
| dataFinal          | body  | string (data ISO) | false       | Data de fim                                                     | `2026-03-06`                             |
| milestone          | body  | string            | false       | Milestone numérica em formato string (parse para inteiro)       | `1`                                      |
| reviewers          | body  | string[]          | false       | Metadado (não aplicado diretamente no fluxo atual)              | `["user1"]`                              |
| repository         | body  | string            | false       | Campo de metadado                                               | `repoId`                                 |
| linkedPullRequests | body  | string[]          | false       | Campo de metadado                                               | `["pullRequestId1"]`                     |
| parentIssue        | body  | string            | false       | Campo de metadado                                               | `parentIssueId`                          |
| cliente            | body  | string            | false       | ID da opção de cliente no projeto                               | `1c318ca2`                               |
| sistema            | body  | string            | false       | ID da opção de sistema no projeto                               | `275bebbd`                               |
| linkChamado        | body  | string            | false       | Campo texto no projeto                                          | `http://localhost:3000/#/detalhes/36323` |
| iteracao           | body  | string            | false       | ID de iteração no projeto                                       | `4d5012ea`                               |

### Corpo da Requisição

```json
{
  "repo": "agenda",
  "title": "[Chamado #2/2026] chamado contrato teste.",
  "body": "## Descrição\n\nChamado #2/2026\n\nchamado contrato teste.",
  "status": "d00fc43a",
  "prioridade": "dbae16c3",
  "tamanho": "817d0097",
  "cliente": "1c318ca2",
  "sistema": "275bebbd",
  "linkChamado": "http://localhost:3000/#/detalhes/36323"
}
```

### Resposta — Sucesso

**Status: 201 Created**

```json
{
  "number": 123,
  "node_id": "I_kwDOxxxxxxx",
  "title": "[Chamado #2/2026] chamado contrato teste.",
  "state": "open",
  "html_url": "https://github.com/vixcod/agenda/issues/123"
}
```

### Resposta — Erro

| Código HTTP | Significado           | Descrição                                         |
| ----------- | --------------------- | ------------------------------------------------- |
| 400         | Bad Request           | Payload inválido                                  |
| 401         | Unauthorized          | Credenciais GitHub inválidas                      |
| 404         | Not Found             | Repositório/projeto/opção de campo não encontrado |
| 422         | Unprocessable Entity  | Erros de validação retornados pela API do GitHub  |
| 500         | Internal Server Error | Variáveis de ambiente ausentes ou erro inesperado |

---

### [GET] /github/user-projects

| Campo                    | Valor                                               |
| ------------------------ | --------------------------------------------------- |
| Método                   | GET                                                 |
| Endpoint                 | `/github/user-projects`                             |
| Descrição                | Lista os projetos GitHub Projects v2 de um usuário. |
| Autenticação obrigatória | Indireta (credenciais GitHub em env)                |

### Parâmetros da Requisição

| Nome  | Local | Tipo   | Obrigatório | Descrição      | Exemplo   |
| ----- | ----- | ------ | ----------- | -------------- | --------- |
| login | query | string | true        | Usuário GitHub | `octocat` |

### Resposta — Sucesso

**Status: 200 OK**

```json
[
  {
    "id": "PVT_kwDOxxxx",
    "title": "Roadmap",
    "number": 1,
    "url": "https://github.com/users/octocat/projects/1"
  }
]
```

### Resposta — Erro

| Código HTTP | Significado           | Descrição                   |
| ----------- | --------------------- | --------------------------- |
| 400         | Bad Request           | `login` ausente             |
| 500         | Internal Server Error | Falha na consulta ao GitHub |

---

### [GET] /github/org-projects

| Campo                    | Valor                                                    |
| ------------------------ | -------------------------------------------------------- |
| Método                   | GET                                                      |
| Endpoint                 | `/github/org-projects`                                   |
| Descrição                | Lista os projetos GitHub Projects v2 de uma organização. |
| Autenticação obrigatória | Indireta (credenciais GitHub em env)                     |

### Parâmetros da Requisição

| Nome  | Local | Tipo   | Obrigatório | Descrição          | Exemplo  |
| ----- | ----- | ------ | ----------- | ------------------ | -------- |
| login | query | string | true        | Organização GitHub | `vixcod` |

### Resposta — Sucesso

**Status: 200 OK**

```json
[
  {
    "id": "PVT_kwDOCWdUyM4AbmxD",
    "title": "Agenda",
    "number": 2,
    "url": "https://github.com/orgs/vixcod/projects/2"
  }
]
```

### Resposta — Erro

| Código HTTP | Significado           | Descrição                   |
| ----------- | --------------------- | --------------------------- |
| 400         | Bad Request           | `login` ausente             |
| 500         | Internal Server Error | Falha na consulta ao GitHub |

---

### [GET] /github/project/:projectId

| Campo                    | Valor                                                                      |
| ------------------------ | -------------------------------------------------------------------------- |
| Método                   | GET                                                                        |
| Endpoint                 | `/github/project/:projectId`                                               |
| Descrição                | Retorna detalhes do Project v2, campos, opções e configuração de iteração. |
| Autenticação obrigatória | Indireta (credenciais GitHub em env)                                       |

### Parâmetros da Requisição

| Nome      | Local | Tipo   | Obrigatório | Descrição                    | Exemplo                |
| --------- | ----- | ------ | ----------- | ---------------------------- | ---------------------- |
| projectId | path  | string | true        | Node ID global do Project v2 | `PVT_kwDOCWdUyM4AbmxD` |

### Resposta — Sucesso

**Status: 200 OK**

```json
{
  "id": "PVT_kwDOCWdUyM4AbmxD",
  "title": "Agenda",
  "fields": {
    "nodes": [
      {
        "id": "PVTSSF_xxx",
        "name": "Status",
        "dataType": "SINGLE_SELECT"
      }
    ]
  }
}
```

### Resposta — Erro

| Código HTTP | Significado           | Descrição                          |
| ----------- | --------------------- | ---------------------------------- |
| 400         | Bad Request           | Formato de `projectId` inválido    |
| 404         | Not Found             | Projeto inexistente ou inacessível |
| 500         | Internal Server Error | Resultado inesperado da consulta   |

---

### [GET] /github/ratelimit

| Campo                    | Valor                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| Método                   | GET                                                                                         |
| Endpoint                 | `/github/ratelimit`                                                                         |
| Descrição                | Retorna informações atuais de rate limit da API do GitHub para as credenciais configuradas. |
| Autenticação obrigatória | Indireta (credenciais GitHub em env)                                                        |

### Parâmetros da Requisição

Nenhum.

### Resposta — Sucesso

**Status: 200 OK**

```json
{
  "limit": 5000,
  "cost": 1,
  "remaining": 4998,
  "resetAt": "2026-03-04T23:00:00Z",
  "used": 2
}
```

### Resposta — Erro

| Código HTTP | Significado           | Descrição                        |
| ----------- | --------------------- | -------------------------------- |
| 401         | Unauthorized          | Credenciais GitHub inválidas     |
| 500         | Internal Server Error | Resultado inesperado da consulta |

---

### [POST] /github/issue-from-chamado/:id

| Campo                    | Valor                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Método                   | POST                                                                                                              |
| Endpoint                 | `/github/issue-from-chamado/:id`                                                                                  |
| Descrição                | Cria issue a partir de dados de Chamado interno, com overrides opcionais de campos customizados via query string. |
| Autenticação obrigatória | Depende de `NODE_ENV`; normalmente Sim para API upstream de Chamado (`Authorization`)                             |

### Parâmetros da Requisição

| Nome             | Local  | Tipo    | Obrigatório | Descrição                                                     | Exemplo          |
| ---------------- | ------ | ------- | ----------- | ------------------------------------------------------------- | ---------------- |
| id               | path   | integer | true        | Identificador do Chamado                                      | `36323`          |
| tamanho          | query  | string  | false       | Override do ID de tamanho no projeto                          | `817d0097`       |
| prioridade       | query  | string  | false       | Override do ID de prioridade no projeto                       | `dbae16c3`       |
| empresaNome      | query  | string  | false       | Nome da empresa para mapear cliente                           | `PMVV`           |
| produtoNome      | query  | string  | false       | Nome do produto para mapear sistema                           | `contrato`       |
| assuntoDescricao | query  | string  | false       | Sobrescreve extração de título                                | `Contrato teste` |
| authorization    | header | string  | false\*     | Token upstream de Chamado (\*obrigatório fora de development) | `Bearer abc.def` |

### Corpo da Requisição

Sem body.

### Resposta — Sucesso

**Status: 201 Created**

```json
{
  "number": 124,
  "node_id": "I_kwDOxxxxxy",
  "title": "[Chamado #2/2026] chamado contrato teste.",
  "state": "open",
  "html_url": "https://github.com/vixcod/agenda/issues/124"
}
```

### Resposta — Erro

| Código HTTP | Significado           | Descrição                                          |
| ----------- | --------------------- | -------------------------------------------------- |
| 400         | Bad Request           | ID do chamado inválido                             |
| 401         | Unauthorized          | Token ausente quando exigido por ambiente/upstream |
| 502         | Bad Gateway           | Erro ao ler Chamado ou ao subir anexos             |
| 500         | Internal Server Error | Erro inesperado no servidor                        |

---

## 4. Limite de Taxa

- **Camada chGit**: não há throttling explícito configurado na aplicação.
- **Limite efetivo**: governado pelos limites da API do GitHub para as credenciais em uso.
- **Endpoint relacionado**: `GET /github/ratelimit`.
- **Headers típicos do GitHub** (quando disponíveis no upstream):
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`
- **Comportamento ao exceder**: o GitHub retorna erro de limite de taxa (tipicamente semântica `403` ou `429`, conforme contexto da API).

---

## 5. Versionamento

- **Versão atual**: `0.0.0`

---

## 6. Exemplos de Código

### 6.1 Criar issue (TypeScript / Node.js)

```typescript
const response = await fetch('http://localhost:3333/github/issue', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    repo: 'agenda',
    title: '[Chamado #2/2026] chamado contrato teste.',
    body: '## Descrição\\n\\nChamado #2/2026\\n\\nchamado contrato teste.',
    status: 'd00fc43a',
    prioridade: 'dbae16c3',
    tamanho: '817d0097',
  }),
});

if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}

const data = await response.json();
console.log(data);
```

### 6.2 Criar issue (cURL)

```bash
curl -X POST "http://localhost:3333/github/issue" \\
  -H "Content-Type: application/json" \\
  -d '{
    "repo": "agenda",
    "title": "[Chamado #2/2026] chamado contrato teste.",
    "body": "## Descrição\\\\n\\\\nChamado #2/2026\\\\n\\\\nchamado contrato teste.",
    "status": "d00fc43a",
    "prioridade": "dbae16c3",
    "tamanho": "817d0097"
  }'
```

### 6.3 Criar issue a partir de chamado (TypeScript / Node.js)

```typescript
const response = await fetch(
  'http://localhost:3333/github/issue-from-chamado/36323?prioridade=dbae16c3&tamanho=817d0097',
  {
    method: 'POST',
    headers: {
      Authorization: 'Bearer SEU_TOKEN_CHAMADO',
    },
  },
);

const data = await response.json();
console.log(data);
```

### 6.4 Criar issue a partir de chamado (cURL)

```bash
curl -X POST "http://localhost:3333/github/issue-from-chamado/36323?prioridade=dbae16c3&tamanho=817d0097" \\
  -H "Authorization: Bearer SEU_TOKEN_CHAMADO"
```

### 6.5 Listar issues do repositório (TypeScript / Node.js)

```typescript
const response = await fetch('http://localhost:3333/github/issues?repo=agenda');
const data = await response.json();
console.log(data);
```

### 6.6 Listar issues do repositório (cURL)

```bash
curl "http://localhost:3333/github/issues?repo=agenda"
```

---

## 7. Modelos de Dados / Esquemas

### Modelo: CreateIssueRequest

```typescript
interface CreateIssueRequest {
  repo: string;
  title: string;
  body: string;
  projectId?: string;
  assignees?: string[];
  labels?: string[];
  status?: string;
  prioridade?: string;
  tamanho?: string;
  dataInicio?: string; // data ISO 8601
  dataFinal?: string; // data ISO 8601
  milestone?: string;
  reviewers?: string[];
  repository?: string;
  linkedPullRequests?: string[];
  parentIssue?: string;
  cliente?: string;
  sistema?: string;
  linkChamado?: string;
  iteracao?: string;
}
```

### Modelo: GitHubIssueResponse

```typescript
interface GitHubIssueResponse {
  id: number;
  number: number;
  node_id: string;
  title: string;
  state: 'open' | 'closed';
  html_url: string;
}
```

### Modelo: ProjectNode

```typescript
interface ProjectNode {
  id: string;
  title: string;
  number: number;
  url: string;
}
```

### Modelo: RateLimitResponse

```typescript
interface RateLimitResponse {
  limit: number;
  cost: number;
  remaining: number;
  resetAt: string; // datetime ISO 8601
  used: number;
}
```

### Modelo: StatusResponse

```typescript
type StatusResponse = 'ok!';
```

---

## 8. Histórico de Versões

| Versão | Data       | Mudanças                                                                                                                                 |
| ------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 0.0.0  | 2026-03-04 | Implementação atual documentada: healthcheck, endpoints GitHub de issue/projeto/rate-limit e criação de issue via integração de Chamado. |

---

## Observações

- Campos JSON usam `camelCase`.
- Caminhos de URL usam `kebab-case` quando aplicável.
- Todos os parâmetros opcionais foram documentados acima.
