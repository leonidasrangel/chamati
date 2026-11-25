# ChamaTI — Gestão de Demandas de TI e Procedimentos Operacionais

Painel administrativo minimalista para o setor de TI municipal: chamados vindos dos departamentos,
checklists reutilizáveis e base de conhecimento técnica.

**Stack:** Next.js 16 (App Router, Server Actions) · React 19 · Tailwind CSS 4 · Radix UI (estilo shadcn/ui) ·
PostgreSQL · Prisma ORM 7 · sessão em cookie assinado (jose) · senhas com bcrypt.

## Primeira execução

Pré-requisitos: Node.js 20+ e um PostgreSQL acessível (local, Docker ou Supabase).

1. Instale as dependências (também gera o cliente Prisma):
   ```powershell
   npm install
   ```
2. Configure o `.env` (modelo em `.env.example`):
   - `DATABASE_URL` — ex.: `postgresql://postgres:SENHA@localhost:5432/chamati?schema=public`.
     Caracteres especiais na senha precisam ser codificados (`@` → `%40`, `#` → `%23`).
   - `AUTH_SECRET` — segredo aleatório com 32+ caracteres para assinar a sessão.
3. Crie as tabelas (o banco `chamati` é criado se não existir) e carregue os dados de demonstração:
   ```powershell
   npm run db:migrate
   ```
   ```powershell
   npm run db:seed
   ```
4. Rode o sistema e abra http://localhost:3000:
   ```powershell
   npm run dev
   ```

Contas criadas pelo seed (senha `123456`; os atalhos aparecem no login só em desenvolvimento):

| Perfil | E-mail |
|---|---|
| Administrador | admin@chamati.local |
| Técnico de TI | carlos.tecnico@chamati.local |
| Solicitante (RH) | mario.rh@chamati.local |

> Troque essas senhas (ou desative as contas) antes de usar com dados reais.

### Scripts do banco

| Script | O que faz |
|---|---|
| `npm run db:migrate` | Cria/aplica migrações em desenvolvimento (`prisma migrate dev`) |
| `npm run db:deploy` | Aplica migrações pendentes em produção (`prisma migrate deploy`) |
| `npm run db:seed` | Carrega os dados de demonstração (só se não houver usuários) |
| `npm run db:reset` | **Apaga o banco**, reaplica as migrações e roda o seed |
| `npm run db:studio` | Abre o Prisma Studio para navegar nas tabelas |

## Como funciona

```
Navegador (React)                       Servidor (Next.js)                     PostgreSQL
──────────────────                      ──────────────────                     ──────────
src/lib/store.tsx  ── Server Action ──▶ src/server/actions.ts  ── Prisma ──▶  tabelas
   estado da tela  ◀── recorte do banco ─ (sessão + perfil + validação)
```

- **Leitura:** o layout raiz (`src/app/layout.tsx`) lê a sessão e carrega no servidor o recorte do banco
  que o usuário pode ver (`src/server/snapshot.ts`). O Solicitante recebe só as próprias demandas, sem notas
  internas, sem base de conhecimento e sem e-mail/telefone dos outros usuários.
- **Escrita:** toda alteração passa por uma Server Action que confere a sessão e o perfil, valida a entrada
  (`src/server/validate.ts`), grava numa transação e devolve o recorte atualizado.
- **Atualização:** mover cartão, marcar item de checklist e ler notificações aparecem na hora (otimista) e
  são confirmados pelo servidor; os dados são recarregados ao focar a janela e a cada 30 s.
- **Sessão:** cookie `chamati_session` httpOnly, assinado (HS256), válido por 12 h. O usuário é relido do banco
  a cada requisição, então desativar alguém corta o acesso na hora. `src/proxy.ts` redireciona para o login
  quem acessa áreas internas sem sessão.
- **Login:** senhas com bcrypt; bloqueio temporário após 5 tentativas erradas por e-mail (em memória).

### Permissões

| Ação | Admin | Técnico | Solicitante |
|---|:-:|:-:|:-:|
| Abrir demanda | ✓ | ✓ | ✓ (do próprio departamento) |
| Ver demandas | todas | todas | só as suas |
| Editar status, prioridade, responsável; excluir | ✓ | ✓ | — |
| Comentar | ✓ (+ nota interna) | ✓ (+ nota interna) | nas suas |
| Checklists e base de conhecimento | ✓ | ✓ | vê o checklist da própria demanda |
| Departamentos | ✓ | ✓ | — |
| Usuários (criar/editar/excluir) | ✓ | só consulta | — |

## Módulos

| Rota | Perfil | O que faz |
|---|---|---|
| `/login`, `/cadastro` | todos | Autenticação; o cadastro cria contas de **Solicitante** |
| `/dashboard` | TI | Indicadores, distribuição por status, demandas por departamento/categoria, fila pessoal |
| `/chamados` | TI | **Kanban** (arrastar e soltar) ↔ **Tabela** (ordenação, paginação) com filtros por departamento, status, prioridade, categoria, responsável e período |
| `/chamados/[id]` | TI e solicitante dono | Detalhes, alteração rápida de status/prioridade/responsável, **checklist vinculado**, linha do tempo com comentários e notas internas |
| `/procedimentos` | TI | Modelos de **checklist reutilizáveis** e **base de conhecimento** em Markdown |
| `/departamentos` | TI | Cadastro de secretarias/setores |
| `/usuarios` | TI (edição só Admin) | Cadastro de usuários, perfis e departamento |
| `/meus-chamados` | Solicitante | Abrir chamado e acompanhar o andamento |

## Banco de dados

- [`prisma/schema.prisma`](prisma/schema.prisma) — **fonte da verdade**; migrações em `prisma/migrations/`.
- [`db/schema.sql`](db/schema.sql) — DDL equivalente em SQL puro, para referência ou uso direto no Supabase.
- [`prisma/seed.ts`](prisma/seed.ts) + [`prisma/seed-data.ts`](prisma/seed-data.ts) — dados de demonstração.

Tabelas: `departments`, `users`, `tickets`, `ticket_comments`, `checklists` (modelos), `checklist_items`,
`ticket_checklists` (checklist ativo na demanda), `ticket_checklist_items`, `procedures`, `notifications`.

Ao vincular um checklist a uma demanda, os itens do modelo são **copiados**; editar o modelo depois não
altera checklists em execução.

## Produção

1. `DATABASE_URL` do servidor definitivo e um `AUTH_SECRET` novo e exclusivo.
2. `npm run db:deploy` para aplicar as migrações.
3. `npm run build` e `npm start` (atrás de HTTPS — o cookie de sessão é `secure` em produção).
4. O limite de tentativas de login fica em memória: com mais de uma instância do servidor, troque por Redis ou tabela.

## Estrutura

```
src/
  app/
    (app)/            área autenticada (sidebar + header)
    login/ cadastro/
    layout.tsx        carrega sessão + dados iniciais no servidor
  components/         ui/, layout/, tickets/, procedures/, dashboard/
  lib/
    store.tsx         estado do navegador + chamadas às Server Actions
    types.ts          tipos de domínio e contratos das ações
  server/
    actions.ts        Server Actions (escrita)
    snapshot.ts       leitura filtrada por perfil
    session.ts token.ts   sessão em cookie
    db.ts mappers.ts validate.ts
  proxy.ts            redireciona visitantes sem sessão
  generated/prisma/   cliente Prisma (gerado, fora do git)
prisma/
  schema.prisma  migrations/  seed.ts  seed-data.ts
prisma.config.ts
```
