# ChamaTI — Gestão de Demandas de TI e Procedimentos Operacionais

Painel administrativo minimalista para o setor de TI municipal: chamados vindos dos departamentos,
checklists reutilizáveis e base de conhecimento técnica.

**Stack:** Next.js 16 (App Router, Server Actions) · React 19 · Tailwind CSS 4 · Radix UI (estilo shadcn/ui) ·
PostgreSQL · Prisma ORM 7 · sessão em cookie assinado (jose) · senhas com bcrypt.

## Publicar na Render (com banco Neon)

O projeto já vem com o blueprint [`render.yaml`](render.yaml): serviço web Node na região Virginia,
build que aplica as migrações, cria o administrador inicial e compila o app (`npm run build:prod`), e
`AUTH_SECRET` gerado automaticamente. As duas contas abaixo usam login com GitHub.

1. **Banco na Neon** — em [neon.tech](https://neon.tech), entre com o GitHub e crie um projeto na região
   **AWS US East 1 (N. Virginia)** (a mesma do serviço na Render). Em **Connect**, copie duas strings de conexão:
   - com **Connection pooling ligado** (o host tem `-pooler`) → será a `DATABASE_URL`;
   - com **Connection pooling desligado** → será a `DATABASE_URL_UNPOOLED` (usada nas migrações).
2. **Serviço na Render** — em [dashboard.render.com](https://dashboard.render.com), entre com o GitHub,
   clique em **New → Blueprint** e escolha o repositório `chamati`. A Render lê o `render.yaml` e pede:

   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | string da Neon **com** pooling |
   | `DATABASE_URL_UNPOOLED` | string da Neon **sem** pooling |
   | `ADMIN_EMAIL` | e-mail de login do administrador |
   | `ADMIN_NAME` | nome do administrador |
   | `ADMIN_PASSWORD` | senha inicial do administrador (mínimo 8 caracteres) |
3. **Deploy** — clique em **Apply**. O primeiro build cria as tabelas e o administrador; o endereço fica
   como `https://chamati-xxxx.onrender.com`.
4. Entre com o e-mail e a senha do administrador. Depois disso, `ADMIN_PASSWORD` pode ser apagada em
   **Environment** (o administrador só é criado quando o banco ainda não tem nenhum).

No plano gratuito da Render o serviço "dorme" após 15 min sem acessos e leva cerca de 50 s para acordar no
primeiro acesso; o plano pago (Starter) remove essa espera. Cada `git push` na `main` gera um novo deploy.

Contas dos colegas: o cadastro público está desligado. O administrador cria cada pessoa em **Usuários**, escolhe o
perfil (Técnico de TI ou Solicitante) e informa a senha inicial; cada um troca a própria senha em
**menu do perfil → Alterar senha**.

## Rodar localmente

Pré-requisitos: Node.js 20+ e um PostgreSQL acessível.

1. `npm install` (também gera o cliente Prisma).
2. Copie `.env.example` para `.env` e preencha `DATABASE_URL`, `AUTH_SECRET` e os dados do administrador.
   Caracteres especiais na senha do banco precisam ser codificados (`@` → `%40`, `#` → `%23`).
3. Crie as tabelas (o banco é criado se não existir) e o administrador:
   ```powershell
   npm run db:migrate
   ```
   ```powershell
   npm run db:seed
   ```
4. `npm run dev` e abra http://localhost:3000.

### Scripts do banco

| Script | O que faz |
|---|---|
| `npm run db:migrate` | Cria/aplica migrações em desenvolvimento (`prisma migrate dev`) |
| `npm run db:deploy` | Aplica migrações pendentes (`prisma migrate deploy`) |
| `npm run db:seed` | Cria o administrador a partir de `ADMIN_*`, se ainda não houver nenhum |
| `npm run db:reset` | **Apaga o banco**, reaplica as migrações e cria o administrador |
| `npm run db:studio` | Abre o Prisma Studio para navegar nas tabelas |
| `npm run build:prod` | Build de produção: migrações + administrador + build (usado pela Render) |

## Como funciona

```
Navegador (React)                       Servidor (Next.js)                     PostgreSQL
──────────────────                      ──────────────────                     ──────────
src/lib/store.tsx  ── Server Action ──▶ src/server/actions.ts  ── Prisma ──▶  tabelas
   estado da tela  ◀── recorte do banco ─ (sessão + perfil + validação)
```

- **Leitura:** o layout raiz (`src/app/layout.tsx`) lê a sessão e carrega no servidor o recorte do banco
  que o usuário pode ver (`src/server/snapshot.ts`). Visitantes sem sessão não recebem nenhum dado. O Solicitante
  recebe só as próprias demandas, sem notas internas, sem base de conhecimento e sem e-mail/telefone de outros usuários.
- **Escrita:** toda alteração passa por uma Server Action que confere a sessão e o perfil, valida a entrada
  (`src/server/validate.ts`), grava numa transação e devolve o recorte atualizado.
- **Atualização:** mover cartão, marcar item de checklist e ler notificações aparecem na hora (otimista) e
  são confirmados pelo servidor; os dados são recarregados ao focar a janela e a cada 30 s.
- **Sessão:** cookie `chamati_session` httpOnly, assinado (HS256), válido por 12 h. O usuário é relido do banco
  a cada requisição, então desativar ou excluir alguém corta o acesso na hora. `src/proxy.ts` redireciona para o
  login quem acessa áreas internas sem sessão.
- **Senhas:** bcrypt, mínimo de 8 caracteres; bloqueio temporário após 5 tentativas erradas por e-mail
  (em memória — por instância do servidor).

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
| Trocar a própria senha | ✓ | ✓ | ✓ |

## Módulos

| Rota | Perfil | O que faz |
|---|---|---|
| `/login` | todos | Autenticação (contas criadas pelo administrador) |
| `/dashboard` | TI | Indicadores, distribuição por status, demandas por departamento/categoria, fila pessoal |
| `/chamados` | TI | **Kanban** (arrastar e soltar) ↔ **Tabela** (ordenação, paginação) com filtros por departamento, status, prioridade, categoria, responsável e período |
| `/chamados/[id]` | TI e solicitante dono | Detalhes, alteração rápida de status/prioridade/responsável, **checklist vinculado**, linha do tempo com comentários e notas internas |
| `/procedimentos` | TI | Modelos de **checklist reutilizáveis** e **base de conhecimento** em Markdown |
| `/departamentos` | TI | Cadastro de secretarias/setores |
| `/usuarios` | TI (edição só Admin) | Cadastro de usuários, perfis e departamento |
| `/meus-chamados` | Solicitante | Abrir chamado e acompanhar o andamento |

## Banco de dados

- [`prisma/schema.prisma`](prisma/schema.prisma) — **fonte da verdade**; migrações em `prisma/migrations/`.
- [`db/schema.sql`](db/schema.sql) — DDL equivalente em SQL puro, para referência.
- [`prisma/seed.ts`](prisma/seed.ts) — cria o administrador inicial a partir das variáveis `ADMIN_*`.

Tabelas: `departments`, `users`, `tickets`, `ticket_comments`, `checklists` (modelos), `checklist_items`,
`ticket_checklists` (checklist ativo na demanda), `ticket_checklist_items`, `procedures`, `notifications`.

Ao vincular um checklist a uma demanda, os itens do modelo são **copiados**; editar o modelo depois não
altera checklists em execução.

## Estrutura

```
src/
  app/
    (app)/            área autenticada (sidebar + header)
    login/
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
  schema.prisma  migrations/  seed.ts
prisma.config.ts      conexão das migrações (usa DATABASE_URL_UNPOOLED quando existe)
render.yaml           blueprint da Render (serviço, build e variáveis)
```
