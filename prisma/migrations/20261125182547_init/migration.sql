-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TECNICO', 'SOLICITANTE');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('A_FAZER', 'EM_ANDAMENTO', 'AGUARDANDO', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('REDE', 'HARDWARE', 'IMPRESSORA', 'SOFTWARE', 'FORMATACAO');

-- CreateEnum
CREATE TYPE "CommentKind" AS ENUM ('COMMENT', 'STATUS_CHANGE', 'ASSIGNMENT', 'CHECKLIST', 'SYSTEM');

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "acronym" VARCHAR(12) NOT NULL,
    "manager_name" VARCHAR(120),
    "extension" VARCHAR(20),
    "location" VARCHAR(160),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'SOLICITANTE',
    "department_id" UUID,
    "phone" VARCHAR(30),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "department_id" UUID NOT NULL,
    "requester_id" UUID NOT NULL,
    "assignee_id" UUID,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIA',
    "category" "TicketCategory" NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'A_FAZER',
    "waiting_reason" VARCHAR(200),
    "asset_tag" VARCHAR(60),
    "due_date" DATE,
    "closed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_comments" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "author_id" UUID,
    "kind" "CommentKind" NOT NULL DEFAULT 'COMMENT',
    "body" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklists" (
    "id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" "TicketCategory",
    "created_by" UUID,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" UUID NOT NULL,
    "checklist_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "label" VARCHAR(300) NOT NULL,
    "hint" TEXT,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_checklists" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "checklist_id" UUID,
    "title" VARCHAR(160) NOT NULL,
    "attached_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "ticket_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_checklist_items" (
    "id" UUID NOT NULL,
    "ticket_checklist_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "label" VARCHAR(300) NOT NULL,
    "hint" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "done_by" UUID,
    "done_at" TIMESTAMPTZ,
    "note" TEXT,

    CONSTRAINT "ticket_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedures" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "author_id" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "ticket_id" UUID,
    "message" VARCHAR(300) NOT NULL,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_acronym_key" ON "departments"("acronym");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_department_id_idx" ON "users"("department_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_number_key" ON "tickets"("number");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_department_id_idx" ON "tickets"("department_id");

-- CreateIndex
CREATE INDEX "tickets_assignee_id_idx" ON "tickets"("assignee_id");

-- CreateIndex
CREATE INDEX "tickets_requester_id_idx" ON "tickets"("requester_id");

-- CreateIndex
CREATE INDEX "tickets_created_at_idx" ON "tickets"("created_at" DESC);

-- CreateIndex
CREATE INDEX "tickets_department_id_status_priority_created_at_idx" ON "tickets"("department_id", "status", "priority", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ticket_comments_ticket_id_created_at_idx" ON "ticket_comments"("ticket_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_items_checklist_id_position_key" ON "checklist_items"("checklist_id", "position");

-- CreateIndex
CREATE INDEX "ticket_checklists_ticket_id_idx" ON "ticket_checklists"("ticket_id");

-- CreateIndex
CREATE INDEX "ticket_checklist_items_ticket_checklist_id_position_idx" ON "ticket_checklist_items"("ticket_checklist_id", "position");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_checklists" ADD CONSTRAINT "ticket_checklists_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_checklists" ADD CONSTRAINT "ticket_checklists_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "checklists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_checklists" ADD CONSTRAINT "ticket_checklists_attached_by_fkey" FOREIGN KEY ("attached_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_checklist_items" ADD CONSTRAINT "ticket_checklist_items_ticket_checklist_id_fkey" FOREIGN KEY ("ticket_checklist_id") REFERENCES "ticket_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_checklist_items" ADD CONSTRAINT "ticket_checklist_items_done_by_fkey" FOREIGN KEY ("done_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Numeração amigável das demandas começa em #1001
ALTER SEQUENCE "tickets_number_seq" RESTART WITH 1001;
