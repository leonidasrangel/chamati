-- =============================================================================
-- ChamaTI — Gestão de Demandas de TI e Procedimentos Operacionais
-- Esquema PostgreSQL 14+ (compatível com Supabase)
--
-- REFERÊNCIA: o sistema usa as migrações do Prisma (prisma/migrations), geradas a
-- partir de prisma/schema.prisma. Este arquivo documenta o mesmo modelo em SQL puro
-- (com extras como triggers e a view do dashboard) para quem preferir criar o banco
-- manualmente. Não aplique os dois no mesmo banco.
-- =============================================================================
-- Tabelas principais:
--   departments                → secretarias / setores
--   users                      → técnicos, administradores e solicitantes
--   tickets                    → demandas / chamados
--   ticket_comments            → linha do tempo (comentários e eventos)
--   checklists                 → modelos de checklist reutilizáveis
--   checklist_items            → itens de cada modelo
--   ticket_checklists          → checklist ativo vinculado a uma demanda
--   ticket_checklist_items     → itens marcáveis da instância vinculada
--   procedures                 → base de conhecimento (wiki / bloco de notas)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";     -- e-mail case-insensitive

-- ---------------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------------
CREATE TYPE user_role       AS ENUM ('ADMIN', 'TECNICO', 'SOLICITANTE');
CREATE TYPE ticket_status   AS ENUM ('A_FAZER', 'EM_ANDAMENTO', 'AGUARDANDO', 'CONCLUIDO');
CREATE TYPE ticket_priority AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');
CREATE TYPE ticket_category AS ENUM ('REDE', 'HARDWARE', 'IMPRESSORA', 'SOFTWARE', 'FORMATACAO');
CREATE TYPE comment_kind    AS ENUM ('COMMENT', 'STATUS_CHANGE', 'ASSIGNMENT', 'CHECKLIST', 'SYSTEM');

-- ---------------------------------------------------------------------------
-- Função utilitária: mantém updated_at atualizado
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Departamentos
-- ---------------------------------------------------------------------------
CREATE TABLE departments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         varchar(120) NOT NULL,
  acronym      varchar(12)  NOT NULL,                 -- ex.: RH, FIN, LIC
  manager_name varchar(120),                          -- responsável pelo setor
  extension    varchar(20),                           -- ramal
  location     varchar(160),                          -- prédio / sala
  active       boolean      NOT NULL DEFAULT true,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT departments_acronym_uk UNIQUE (acronym)
);
CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Usuários
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           varchar(120) NOT NULL,
  email          citext       NOT NULL,
  password_hash  text         NOT NULL,               -- bcrypt / argon2
  role           user_role    NOT NULL DEFAULT 'SOLICITANTE',
  department_id  uuid         REFERENCES departments(id) ON DELETE SET NULL,
  phone          varchar(30),
  active         boolean      NOT NULL DEFAULT true,
  last_login_at  timestamptz,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT users_email_uk UNIQUE (email)
);
CREATE INDEX idx_users_department ON users (department_id);
CREATE INDEX idx_users_role       ON users (role);
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Demandas / Chamados
-- ---------------------------------------------------------------------------
CREATE TABLE tickets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number         integer GENERATED ALWAYS AS IDENTITY (START WITH 1001) UNIQUE, -- nº amigável: #1001
  title          varchar(200)    NOT NULL,
  description    text            NOT NULL DEFAULT '',
  department_id  uuid            NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  requester_id   uuid            NOT NULL REFERENCES users(id)       ON DELETE RESTRICT,
  assignee_id    uuid            REFERENCES users(id)                ON DELETE SET NULL,
  priority       ticket_priority NOT NULL DEFAULT 'MEDIA',
  category       ticket_category NOT NULL,
  status         ticket_status   NOT NULL DEFAULT 'A_FAZER',
  waiting_reason varchar(200),                         -- usado quando status = AGUARDANDO
  asset_tag      varchar(60),                          -- patrimônio do equipamento (opcional)
  due_date       date,
  closed_at      timestamptz,
  created_at     timestamptz     NOT NULL DEFAULT now(),
  updated_at     timestamptz     NOT NULL DEFAULT now(),
  CONSTRAINT tickets_closed_chk CHECK (
    (status = 'CONCLUIDO' AND closed_at IS NOT NULL) OR (status <> 'CONCLUIDO')
  )
);
CREATE INDEX idx_tickets_status      ON tickets (status);
CREATE INDEX idx_tickets_department  ON tickets (department_id);
CREATE INDEX idx_tickets_assignee    ON tickets (assignee_id);
CREATE INDEX idx_tickets_requester   ON tickets (requester_id);
CREATE INDEX idx_tickets_created_at  ON tickets (created_at DESC);
CREATE INDEX idx_tickets_filters     ON tickets (department_id, status, priority, created_at DESC);
CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Preenche/limpa closed_at automaticamente conforme o status
CREATE OR REPLACE FUNCTION tickets_set_closed_at() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'CONCLUIDO' AND NEW.closed_at IS NULL THEN
    NEW.closed_at := now();
  ELSIF NEW.status <> 'CONCLUIDO' THEN
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_tickets_closed BEFORE INSERT OR UPDATE OF status ON tickets
  FOR EACH ROW EXECUTE FUNCTION tickets_set_closed_at();

-- ---------------------------------------------------------------------------
-- Linha do tempo da demanda (comentários + eventos automáticos)
-- ---------------------------------------------------------------------------
CREATE TABLE ticket_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   uuid         NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id   uuid         REFERENCES users(id) ON DELETE SET NULL,
  kind        comment_kind NOT NULL DEFAULT 'COMMENT',
  body        text         NOT NULL,
  is_internal boolean      NOT NULL DEFAULT false,     -- nota visível só para a TI
  created_at  timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX idx_ticket_comments_ticket ON ticket_comments (ticket_id, created_at);

-- ---------------------------------------------------------------------------
-- Modelos de checklist reutilizáveis
-- ---------------------------------------------------------------------------
CREATE TABLE checklists (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        varchar(160)    NOT NULL,               -- ex.: "Checklist Pós-Formatação Windows"
  description  text            NOT NULL DEFAULT '',
  category     ticket_category,                        -- sugere o modelo para demandas da mesma categoria
  created_by   uuid            REFERENCES users(id) ON DELETE SET NULL,
  archived     boolean         NOT NULL DEFAULT false,
  created_at   timestamptz     NOT NULL DEFAULT now(),
  updated_at   timestamptz     NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_checklists_updated BEFORE UPDATE ON checklists
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE checklist_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id  uuid         NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  position      integer      NOT NULL,
  label         varchar(300) NOT NULL,
  hint          text,                                  -- dica / comando de apoio
  CONSTRAINT checklist_items_position_uk UNIQUE (checklist_id, position) DEFERRABLE INITIALLY DEFERRED
);

-- ---------------------------------------------------------------------------
-- Checklist ativo vinculado a uma demanda (instância do modelo)
-- Os itens são copiados no momento do vínculo: alterar o modelo depois
-- não altera checklists já em execução.
-- ---------------------------------------------------------------------------
CREATE TABLE ticket_checklists (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     uuid         NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  checklist_id  uuid         REFERENCES checklists(id) ON DELETE SET NULL,  -- modelo de origem
  title         varchar(160) NOT NULL,                                       -- snapshot do título
  attached_by   uuid         REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  completed_at  timestamptz
);
CREATE INDEX idx_ticket_checklists_ticket ON ticket_checklists (ticket_id);

CREATE TABLE ticket_checklist_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_checklist_id uuid        NOT NULL REFERENCES ticket_checklists(id) ON DELETE CASCADE,
  position           integer      NOT NULL,
  label              varchar(300) NOT NULL,
  hint               text,
  done               boolean      NOT NULL DEFAULT false,
  done_by            uuid         REFERENCES users(id) ON DELETE SET NULL,
  done_at            timestamptz,
  note               text
);
CREATE INDEX idx_tci_checklist ON ticket_checklist_items (ticket_checklist_id, position);

-- ---------------------------------------------------------------------------
-- Base de conhecimento (procedimentos em Markdown)
-- ---------------------------------------------------------------------------
CREATE TABLE procedures (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       varchar(200) NOT NULL,
  content     text         NOT NULL DEFAULT '',        -- Markdown
  tags        text[]       NOT NULL DEFAULT '{}',
  pinned      boolean      NOT NULL DEFAULT false,
  author_id   uuid         REFERENCES users(id) ON DELETE SET NULL,
  updated_by  uuid         REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX idx_procedures_tags ON procedures USING gin (tags);
CREATE INDEX idx_procedures_fts  ON procedures
  USING gin (to_tsvector('portuguese', title || ' ' || content));
CREATE TRIGGER trg_procedures_updated BEFORE UPDATE ON procedures
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Notificações
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_id   uuid         REFERENCES tickets(id) ON DELETE CASCADE,
  message     varchar(300) NOT NULL,
  read_at     timestamptz,
  created_at  timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications (user_id, read_at, created_at DESC);

-- ---------------------------------------------------------------------------
-- View de apoio ao dashboard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_tickets_by_department AS
SELECT d.id   AS department_id,
       d.acronym,
       d.name,
       count(t.*) FILTER (WHERE t.status <> 'CONCLUIDO') AS open_count,
       count(t.*) FILTER (WHERE t.status =  'CONCLUIDO') AS closed_count
  FROM departments d
  LEFT JOIN tickets t ON t.department_id = d.id
 GROUP BY d.id, d.acronym, d.name;

-- ---------------------------------------------------------------------------
-- Dados iniciais (opcional)
-- ---------------------------------------------------------------------------
INSERT INTO departments (name, acronym, manager_name, extension, location) VALUES
  ('Tecnologia da Informação', 'TI',  'Coordenação de TI',   '2000', 'Prédio Sede — Sala 12'),
  ('Recursos Humanos',         'RH',  'Diretoria de RH',     '2101', 'Prédio Sede — Sala 03'),
  ('Secretaria de Finanças',   'FIN', 'Secretário de Fin.',  '2201', 'Prédio Sede — 1º andar'),
  ('Licitações e Contratos',   'LIC', 'Comissão de Licit.',  '2301', 'Anexo I'),
  ('Secretaria de Saúde',      'SAU', 'Secretária de Saúde', '3001', 'Centro de Saúde'),
  ('Secretaria de Obras',      'OBR', 'Secretário de Obras', '4001', 'Pátio Municipal'),
  ('Gabinete do Prefeito',     'GAB', 'Chefe de Gabinete',   '1001', 'Prédio Sede — 2º andar');
