# Documentação de Persistência — Cloudflare D1
**Sistema:** Ferraz Barber Club  
**Finalidade:** Especificação das tabelas relacionais, índices e instruções operacionais para o Cloudflare D1 (SQLite).

---

## 1. Visão Geral da Arquitetura

O banco de dados relacional Cloudflare D1 foi projetado para substituir o arquivo local `data/database.json`, fornecendo persistência serverless de alta performance integrada ao ecossistema Cloudflare (Workers + Pages).

A camada de negócios (`server/business.ts`) interage com o banco exclusivamente através da interface **`IDataRepository`** (`server/repository.ts`), garantindo total independência do mecanismo de armazenamento.

---

## 2. Estrutura das Tabelas

### `barbers` (Barbeiros Residentes)
- **Finalidade:** Armazena os profissionais residentes da barbearia.
- **Regra de Negócio Estrita:** O salão possui exatamente 2 barbeiros residentes (**Lukinha** e **Maykin**).
- **Campos:**
  - `id` (TEXT PRIMARY KEY): Identificador imutável (`barber_thiago`, `barber_kauan`).
  - `name` (TEXT NOT NULL): Nome de exibição.
  - `nickname` (TEXT): Apelido.
  - `phone` (TEXT): WhatsApp de contato.
  - `active` (INTEGER NOT NULL DEFAULT 1): Status ativo (1) ou inativo (0).
  - `avatarUrl` (TEXT): Foto do profissional.
  - `specialty` (TEXT): Especialidade técnica.
  - `description` (TEXT): Bio resumida.
  - `color` (TEXT NOT NULL): Cor hexadecimal para distinção na agenda visual.
  - `workDays` (TEXT NOT NULL): Array JSON com dias da semana trabalhados (ex.: `[1,2,3,4,5,6]`).
  - `startTime` / `endTime` (TEXT NOT NULL): Horário de início e fim do expediente (HH:mm).
  - `lunchStart` / `lunchEnd` (TEXT NOT NULL): Intervalo de almoço/descanso (HH:mm).
  - `createdAt` / `updatedAt` (TEXT NOT NULL).

### `services` (Catálogo de Serviços)
- **Finalidade:** Tabela de serviços disponíveis para agendamento.
- **Campos:**
  - `id` (TEXT PRIMARY KEY): Identificador do serviço (ex.: `srv_corte_fade`).
  - `name` (TEXT NOT NULL): Nome do serviço.
  - `description` (TEXT): Detalhamento do procedimento.
  - `price` (REAL NOT NULL): Preço atual vigente (R$).
  - `durationMinutes` (INTEGER NOT NULL): Duração real em minutos (usada no cálculo de slots).
  - `active` (INTEGER NOT NULL DEFAULT 1): Visível para agendamento.
  - `featured` (INTEGER NOT NULL DEFAULT 0): Destaque no portal público.
  - `createdAt` / `updatedAt` (TEXT NOT NULL).

### `customers` (Base de Clientes)
- **Finalidade:** Cadastro permanente de clientes com identificação e histórico de visitas.
- **Campos:**
  - `id` (TEXT PRIMARY KEY): Identificador único (`cust_<timestamp>_<hash>`).
  - `name` (TEXT NOT NULL): Nome completo informado.
  - `whatsapp` (TEXT UNIQUE NOT NULL): Número normalizado (apenas dígitos). Garante unicidade e evita duplicidades.
  - `email` (TEXT): E-mail opcional.
  - `birthDate` (TEXT): Data de aniversário (YYYY-MM-DD).
  - `notes` (TEXT): Observações e preferências de corte.
  - `createdAt` / `updatedAt` (TEXT NOT NULL).
- *Observação:* Métricas como `totalVisits`, `totalSpent`, `averageTicket` e status CRM (`ACTIVE`, `RETURN_NEEDED`, `INACTIVE`) são calculadas dinamicamente sob demanda a partir da tabela `appointments`.

### `appointments` (Agendamentos e Histórico Operacional)
- **Finalidade:** Registro de todos os agendamentos (passados, presentes e futuros).
- **Campos:**
  - `id` (TEXT PRIMARY KEY): Identificador único do agendamento (`apt_<timestamp>_<hash>`).
  - `customerId` (TEXT NOT NULL): Referência ao cliente.
  - `customerName` (TEXT NOT NULL): Nome do cliente na data do agendamento.
  - `customerWhatsapp` (TEXT NOT NULL): WhatsApp do cliente na data do agendamento.
  - `serviceId` (TEXT NOT NULL): Serviço agendado.
  - `serviceName` (TEXT NOT NULL): Nome do serviço na data do agendamento.
  - `barberId` (TEXT NOT NULL): Barbeiro designado.
  - `barberName` (TEXT NOT NULL): Nome do barbeiro na data do agendamento.
  - `date` (TEXT NOT NULL): Data operacional em formato `YYYY-MM-DD` (America/Sao_Paulo).
  - `time` (TEXT NOT NULL): Horário operacional em formato `HH:mm` (America/Sao_Paulo).
  - `durationMinutes` (INTEGER NOT NULL): Duração do serviço em minutos.
  - `priceCharged` (REAL NOT NULL): **Preço histórico congelado**. O faturamento nunca é alterado por reajustes futuros no catálogo de serviços.
  - `status` (TEXT NOT NULL): `CONFIRMED` | `IN_PROGRESS` | `COMPLETED` | `NO_SHOW` | `CANCELLED`.
  - `isFitIn` (INTEGER NOT NULL DEFAULT 0): Indicador de encaixe manual administrativo (1 = Sim, 0 = Não).
  - `source` (TEXT DEFAULT 'INTERNAL_APP'): Origem (`PUBLIC_BOOKING`, `INTERNAL_APP`, etc.).
  - `notes` (TEXT): Observações do atendimento.
  - `completedAt` (TEXT): Timestamp de conclusão (quando `status = 'COMPLETED'`).
  - `cancelledAt` (TEXT): Timestamp de cancelamento (quando `status = 'CANCELLED'`).
  - `createdAt` / `updatedAt` (TEXT NOT NULL).

### `blocks` (Bloqueios de Horário, Férias e Folgas)
- **Finalidade:** Restrição de disponibilidade operacional para feriados, manutenções, folgas ou férias.
- **Campos:**
  - `id` (TEXT PRIMARY KEY): Identificador do bloqueio (`block_<timestamp>_<hash>`).
  - `type` (TEXT NOT NULL): `OFF_DAY` | `VACATION` | `TIME_BLOCK` | `SHOP_RECESS`.
  - `barberId` (TEXT): Barbeiro bloqueado (se for `NULL`, aplica-se a toda a barbearia).
  - `startDate` / `endDate` (TEXT NOT NULL): Intervalo de datas (YYYY-MM-DD).
  - `startTime` / `endTime` (TEXT): Intervalo de horário para bloqueios parciais (HH:mm).
  - `reason` (TEXT NOT NULL): Motivo do bloqueio.
  - `createdAt` / `updatedAt` (TEXT NOT NULL).

### `settings` (Configurações Gerais e WhatsApp)
- **Finalidade:** Parâmetros operacionais e mensagens padrão serializados em JSON.
- **Chaves Padrão:**
  - `general`: Horário de abertura/fechamento, dias de funcionamento, prazo de antecedência máxima/mínima e regras de encaixe.
  - `whatsapp_templates`: Textos das mensagens automáticas de confirmação, lembrete, pós-corte e convite de retorno.

### `users` (Perfis de Acesso do Sistema)
- **Finalidade:** Perfis de acesso para autenticação e papéis (`ADMIN` para gerência, `BARBER` para os profissionais).

---

## 3. Índices de Otimização

Os seguintes índices foram criados para garantir alta performance nas consultas em produção:
- `idx_customers_whatsapp`: Busca instantânea de clientes por telefone e prevenção de duplicatas no cadastro rápido.
- `idx_appointments_date`: Filtro rápido da visualização diária da agenda.
- `idx_appointments_barber_date`: Cálculo de disponibilidade de slots e agenda individual do barbeiro.
- `idx_appointments_date_time`: Ordenação cronológica e detecção de sobreposição de horários.
- `idx_appointments_customer`: Carregamento do histórico completo na ficha do cliente no CRM.
- `idx_appointments_status_date`: Agregação financeira instantânea de atendimentos `COMPLETED` para cálculo de faturamento e ticket médio.
- `idx_blocks_barber_date` e `idx_blocks_date_range`: Verificação de bloqueios ativos durante o cálculo de horários livres.

---

## 4. Dados Estruturais vs. Dados Operacionais de Produção

| Tipo de Dado | Tabela | Registros Iniciais | Comportamento no Deploy |
| :--- | :--- | :--- | :--- |
| **Estrutural** | `barbers` | **2** (Lukinha e Maykin) | Carregados no seed inicial |
| **Estrutural** | `services` | **6** (Catálogo oficial) | Carregados no seed inicial |
| **Estrutural** | `settings` | **2** (`general` e `whatsapp_templates`) | Carregados no seed inicial |
| **Estrutural** | `users` | **3** (Gerência + 2 Barbeiros) | Carregados no seed inicial |
| **Operacional** | `customers` | **0** | Gerados exclusivamente pelo uso real |
| **Operacional** | `appointments` | **0** | Gerados exclusivamente pelo uso real |
| **Operacional** | `blocks` | **0** | Gerados exclusivamente pelo uso real |

---

## 5. Como Aplicar as Migrações Futuramente no Cloudflare D1

### Aplicação Completa via Arquivo Consolidado:
```bash
# Execução local no ambiente de desenvolvimento:
npx wrangler d1 execute ferraz-barber-club-db --local --file=./schema.sql

# Execução no banco de produção:
npx wrangler d1 execute ferraz-barber-club-db --remote --file=./schema.sql
```

### Aplicação Incremental via Diretório de Migrations:
```bash
# Aplicar migrations versionadas:
npx wrangler d1 migrations apply ferraz-barber-club-db --local
npx wrangler d1 migrations apply ferraz-barber-club-db --remote
```

---

## 6. Política de Fuso Horário e Integridade de Moeda
1. **Fuso Horário:** As colunas `date` e `time` continuam no horário local oficial (`America/Sao_Paulo`). O backend Workers não deve converter horários de agendamento para UTC para evitar deslocamentos indesejados de dias de atendimento.
2. **Moeda e Preço Congelado:** O campo `priceCharged` é imutável após a criação/conclusão do agendamento, garantindo que o faturamento de meses anteriores nunca seja alterado se o preço de um corte for reajustado no catálogo.

---

## 7. Transações e Concorrência (Requisitos para o Worker Futuro)
No Cloudflare Workers com D1, operações de agendamento concorrentes podem gerar *race conditions* (dois clientes reservando o mesmo barbeiro no mesmo slot simultaneamente).
Quando a camada de Worker for implementada:
1. **Atomicidade no Agendamento:** Utilizar `db.batch([...])` do D1 para transações atômicas de escrita.
2. **Double Booking Guard:** Executar a validação de sobreposição no momento da escrita, ou adicionar constraint condicional ou transação batch atômica antes do commit do agendamento.
3. **Atualização de Cadastro:** A inserção ou associação de cliente com WhatsApp pré-existente deve preservar o histórico e garantir atomicidade.

---

## 8. Cloudflare Worker

### 8.1 Entry Point e Arquitetura
O backend para o Cloudflare Workers foi implementado no arquivo:
- **Entry point:** `/worker.ts`
- **Framework:** [Hono](https://hono.dev/) v4 (micro-framework minimalista, ultrarrápido, compatível nativamente com o padrão Web Fetch API e Cloudflare Workers).
- **Sem Dependências Node:** O Worker não utiliza `fs`, `path`, `database.json`, nem escrita em disco. Opera 100% sobre Streams, Fetch API e bindings de ambiente.

### 8.2 Binding D1
O Worker recebe o banco de dados diretamente através do ambiente:
```typescript
export interface Env {
  DB: D1Database;
  CORS_ORIGIN?: string;
  ENVIRONMENT?: string;
}
```
A injeção do banco no repository é feita por demanda:
```typescript
function getRepo(env: Env): D1DatabaseRepository {
  return new D1DatabaseRepository(env.DB);
}
```

### 8.3 Fluxo da Requisição
```text
HTTP Request
     ↓
worker.ts (Hono router & CORS/Error middlewares)
     ↓
Route Handler
     ↓
business-core.ts (Lógica de validação temporal, slots, conflitos e cálculos)
     ↓
D1DatabaseRepository (Prepared statements, mapeamentos de tipos)
     ↓
env.DB (Cloudflare D1 SQLite Binding)
```

### 8.4 Rotas Implementadas
- **Públicas:**
  - `GET /api/health` — Status e nome da barbearia
  - `GET /api/services` — Catálogo dos 6 serviços oficiais
  - `GET /api/barbers` — Dados dos 2 barbeiros residentes (Lukinha e Maykin)
  - `GET /api/settings` — Configurações e templates de WhatsApp
  - `GET /api/availability` — Slots livres por barbeiro ou "qualquer barbeiro"
  - `POST /api/appointments` — Criação pública de agendamento com validação rigorosa
- **Administrativas:**
  - `GET /api/dashboard` — Métricas operacionais em tempo real
  - `GET /api/financial` — Relatório financeiro por período
  - `GET /api/crm` — Categorização de clientes por status de retorno
  - `GET/POST/PUT/DELETE /api/customers` — Gestão da carteira de clientes
  - `GET/PUT/DELETE /api/appointments` — Gestão e transição de status de agendamentos
  - `GET/POST/DELETE /api/blocks` — Bloqueios parciais, férias e folgas
  - `POST/PUT /api/services` — Gestão do catálogo
  - `POST/PUT /api/barbers` — Gestão dos barbeiros (máx. 2 residentes)
  - `PUT /api/settings` — Atualização de configurações operacionais
  - `GET /api/users` — Perfis de usuários do sistema

### 8.5 Configuração do Wrangler (`wrangler.toml`)
O arquivo `wrangler.toml` está organizado com ambientes explícitos (base/local, preview e produção):
```toml
name = "ferraz-barber-club-worker"
main = "worker.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

# D1 Database Binding (Configuração Base / Local)
[[d1_databases]]
binding = "DB"
database_name = "ferraz-barber-club-db"
database_id = "PLACEHOLDER_D1_DATABASE_ID"
migrations_dir = "migrations"

[vars]
ENVIRONMENT = "development"
CORS_ORIGIN = "*"

# Ambiente de Preview
[env.preview]
name = "ferraz-barber-club-worker-preview"
[env.preview.vars]
ENVIRONMENT = "preview"
CORS_ORIGIN = "*"

[[env.preview.d1_databases]]
binding = "DB"
database_name = "ferraz-barber-club-db-preview"
database_id = "PLACEHOLDER_D1_DATABASE_ID_PREVIEW"
migrations_dir = "migrations"

# Ambiente de Produção
[env.production]
name = "ferraz-barber-club-worker-prod"
[env.production.vars]
ENVIRONMENT = "production"
CORS_ORIGIN = "*"

[[env.production.d1_databases]]
binding = "DB"
database_name = "ferraz-barber-club-db"
database_id = "PLACEHOLDER_D1_DATABASE_ID_PRODUCTION"
migrations_dir = "migrations"
```

### 8.6 Como Testar e Executar o Worker Localmente
1. **Testes automatizados de contrato:**
   ```bash
   npm run test:worker
   ```
2. **Execução local com emulador D1 do Wrangler:**
   ```bash
   # Aplicar migrations no SQLite local isolado (.wrangler/state/v3/d1)
   npm run d1:migrate:local
   # Iniciar Worker localmente
   npm run worker:dev
   ```

### 8.7 Guia para a Próxima Etapa: Provisionamento D1 Remoto e Deploy

#### Passo 1: Criar o banco D1 remoto na Cloudflare
Execute via terminal após autenticar com `npx wrangler login`:
```bash
npx wrangler d1 create ferraz-barber-club-db
```

#### Passo 2: Obter o database_id e configurar no wrangler.toml
A saída do comando acima informará o `database_id` gerado (um UUID no formato `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`):
```text
[[d1_databases]]
binding = "DB"
database_name = "ferraz-barber-club-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
Substitua `PLACEHOLDER_D1_DATABASE_ID` e `PLACEHOLDER_D1_DATABASE_ID_PRODUCTION` no arquivo `/wrangler.toml` com este UUID real.

#### Passo 3: Executar as migrations remotas no D1
Para aplicar a estrutura das tabelas (`0001_initial.sql`) e o seed oficial (`0002_seed.sql`):
```bash
npm run d1:migrate:remote
```

#### Passo 4: Fazer o deploy do Worker
Quando tudo estiver pronto para publicação:
```bash
npm run worker:deploy
# ou para produção:
npx wrangler deploy --env production
```

#### Passo 5: Como Configurar Variáveis de Ambiente
No `wrangler.toml` ou no painel da Cloudflare Workers:
- `ENVIRONMENT`: Define `"development"`, `"preview"` ou `"production"`.
- `CORS_ORIGIN`: Defina o domínio exato do frontend para produção (ex.: `https://ferrazbarberclub.com.br`) ou `*`.

#### Passo 6: Como Conectar o Frontend ao Worker Futuramente
Quando a migração definitiva do cliente for autorizada:
- No frontend (`src/services/api.ts`), a variável de ambiente `VITE_API_URL` apontará para o endpoint do Worker (ex.: `https://ferraz-barber-club-worker.seu-subdominio.workers.dev`).
- O Express poderá então ser desligado sem qualquer alteração na interface do usuário, mantendo 100% da compatibilidade de dados e regras operacionais.


