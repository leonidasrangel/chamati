"use server";

/**
 * Server Actions — única porta de escrita no banco.
 * Toda ação: confere a sessão e o perfil, valida a entrada, grava e devolve
 * o recorte atualizado do banco que o usuário pode ver (ActionResult.db).
 */

import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { CATEGORY_ORDER, PRIORITY_ORDER, STATUS_META, STATUS_ORDER, isStaff } from "@/lib/constants";
import type {
  ActionResult,
  ChecklistInput,
  DepartmentInput,
  ProcedureInput,
  TicketInput,
  TicketPatch,
  User,
  UserInput,
  UserRole,
} from "@/lib/types";
import { prisma } from "./db";
import { toUser } from "./mappers";
import { createSession, destroySession, getSessionUser } from "./session";
import { loadPublicSnapshot, loadSnapshot } from "./snapshot";
import { UserError, bool, email as emailField, fail, id, oneOf, optDate, optId, optStr, str } from "./validate";

const STAFF: UserRole[] = ["ADMIN", "TECNICO"];
const ROLES: UserRole[] = ["ADMIN", "TECNICO", "SOLICITANTE"];
const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD = 8;

type Tx = Prisma.TransactionClient;

// ---------------------------------------------------------------------------
// Infra
// ---------------------------------------------------------------------------

function errorResult(e: unknown): { ok: false; error: string } {
  if (e instanceof UserError) return { ok: false, error: e.message };
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return { ok: false, error: "Já existe um registro com esses dados (valor duplicado)." };
    if (e.code === "P2003") return { ok: false, error: "Registro vinculado a outros dados; não pode ser alterado/excluído." };
    if (e.code === "P2025") return { ok: false, error: "Registro não encontrado (pode ter sido excluído)." };
  }
  console.error("[actions]", e);
  return { ok: false, error: "Erro inesperado no servidor. Tente novamente." };
}

async function run<T>(fn: (me: User) => Promise<T>, roles?: UserRole[]): Promise<ActionResult<T>> {
  try {
    const me = await getSessionUser();
    if (!me) return { ok: false, error: "Sua sessão expirou. Entre novamente.", code: "UNAUTHENTICATED" };
    if (roles && !roles.includes(me.role)) return { ok: false, error: "Você não tem permissão para esta ação." };
    const data = await fn(me);
    return { ok: true, db: await loadSnapshot(me), data };
  } catch (e) {
    return errorResult(e);
  }
}

async function notify(tx: Tx, actorId: string, userIds: (string | null | undefined)[], message: string, ticketId?: string) {
  const targets = Array.from(new Set(userIds.filter((u): u is string => !!u && u !== actorId)));
  if (targets.length) await tx.notification.createMany({ data: targets.map((userId) => ({ userId, ticketId, message })) });
}

async function activeStaffIds(tx: Tx) {
  return (await tx.user.findMany({ where: { role: { in: STAFF }, active: true }, select: { id: true } })).map((u) => u.id);
}

async function assertAssignee(tx: Tx, assigneeId: string | null) {
  if (!assigneeId) return;
  const u = await tx.user.findUnique({ where: { id: assigneeId } });
  if (!u || !u.active || !isStaff(u.role)) fail("O responsável deve ser um técnico ou administrador ativo.");
}

// ---------------------------------------------------------------------------
// Autenticação
// ---------------------------------------------------------------------------

// Limite simples de tentativas por e-mail (memória do processo)
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60_000;
// Hash usado quando o e-mail não existe, para o tempo de resposta não revelar contas válidas
let dummyHash: string | undefined;
const getDummyHash = async () => (dummyHash ??= await bcrypt.hash("chamati-dummy-password", BCRYPT_ROUNDS));

export async function loginAction(emailInput: string, password: string): Promise<ActionResult> {
  try {
    const email = typeof emailInput === "string" ? emailInput.trim().toLowerCase() : "";
    const lock = attempts.get(email);
    if (lock && lock.count >= MAX_ATTEMPTS && lock.until > Date.now())
      return { ok: false, error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };

    const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
    const valid = await bcrypt.compare(typeof password === "string" ? password : "", user?.passwordHash ?? (await getDummyHash()));
    if (!user || !valid) {
      const prev = attempts.get(email);
      attempts.set(email, { count: (prev && prev.until > Date.now() ? prev.count : 0) + 1, until: Date.now() + LOCK_MS });
      return { ok: false, error: "E-mail ou senha inválidos." };
    }
    if (!user.active) return { ok: false, error: "Usuário inativo. Procure a equipe de TI." };

    attempts.delete(email);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await createSession(user.id);
    const me = toUser(user);
    return { ok: true, me, db: await loadSnapshot(me) };
  } catch (e) {
    return errorResult(e);
  }
}

/** Qualquer usuário logado troca a própria senha (precisa informar a atual). */
export async function changePasswordAction(currentPassword: string, newPassword: string) {
  return run(async (me) => {
    const next = str(newPassword, "Nova senha", { min: MIN_PASSWORD, max: 128 });
    const row = await prisma.user.findUnique({ where: { id: me.id } });
    if (!row) fail("Usuário não encontrado.");
    const valid = await bcrypt.compare(typeof currentPassword === "string" ? currentPassword : "", row.passwordHash);
    if (!valid) fail("Senha atual incorreta.");
    if (await bcrypt.compare(next, row.passwordHash)) fail("A nova senha deve ser diferente da atual.");
    await prisma.user.update({ where: { id: me.id }, data: { passwordHash: await bcrypt.hash(next, BCRYPT_ROUNDS) } });
  });
}

export async function logoutAction(): Promise<ActionResult> {
  try {
    await destroySession();
    return { ok: true, db: await loadPublicSnapshot() };
  } catch (e) {
    return errorResult(e);
  }
}

/** Recarrega o recorte do banco (usado no foco da janela e em intervalos). */
export async function refreshAction(): Promise<ActionResult> {
  return run(async () => undefined);
}

// ---------------------------------------------------------------------------
// Departamentos (TI)
// ---------------------------------------------------------------------------

export async function saveDepartmentAction(input: DepartmentInput) {
  return run(async () => {
    const data = {
      name: str(input?.name, "Nome", { max: 120 }),
      acronym: str(input?.acronym, "Sigla", { max: 12 }).toUpperCase(),
      managerName: optStr(input?.managerName, "Responsável", 120),
      extension: optStr(input?.extension, "Ramal", 20),
      location: optStr(input?.location, "Localização", 160),
      active: bool(input?.active, "Situação"),
    };
    const dup = await prisma.department.findFirst({
      where: { acronym: { equals: data.acronym, mode: "insensitive" }, ...(input.id ? { NOT: { id: id(input.id) } } : {}) },
    });
    if (dup) fail(`Já existe um departamento com a sigla ${data.acronym}.`);
    if (input.id) await prisma.department.update({ where: { id: id(input.id) }, data });
    else await prisma.department.create({ data });
  }, STAFF);
}

export async function deleteDepartmentAction(departmentId: string) {
  return run(async () => {
    const depId = id(departmentId);
    const [users, tickets] = await Promise.all([
      prisma.user.count({ where: { departmentId: depId } }),
      prisma.ticket.count({ where: { departmentId: depId } }),
    ]);
    if (users || tickets) fail("Departamento possui usuários ou demandas vinculadas. Desative-o em vez de excluir.");
    await prisma.department.delete({ where: { id: depId } });
  }, STAFF);
}

// ---------------------------------------------------------------------------
// Usuários (somente Administrador)
// ---------------------------------------------------------------------------

export async function saveUserAction(input: UserInput) {
  return run(async (me) => {
    const editingId = optId(input?.id);
    const isSelf = editingId === me.id;
    const role = oneOf(input?.role, ROLES, "Perfil");
    const active = bool(input?.active, "Situação");
    const departmentId = optId(input?.departmentId, "Departamento");
    const password = optStr(input?.password, "Senha", 128);

    if (isSelf && role !== me.role) fail("Você não pode alterar o próprio perfil.");
    if (isSelf && !active) fail("Você não pode desativar o próprio usuário.");
    if (role === "SOLICITANTE" && !departmentId) fail("Solicitantes precisam de um departamento.");
    if (departmentId && !(await prisma.department.findUnique({ where: { id: departmentId } }))) fail("Departamento inválido.");
    if (password && password.length < MIN_PASSWORD) fail(`A senha deve ter pelo menos ${MIN_PASSWORD} caracteres.`);
    if (!editingId && !password) fail("Defina uma senha inicial.");

    const data = {
      name: str(input?.name, "Nome", { max: 120 }),
      email: emailField(input?.email),
      role,
      active,
      departmentId,
      phone: optStr(input?.phone, "Telefone", 30),
      ...(password ? { passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) } : {}),
    };
    const dup = await prisma.user.findUnique({ where: { email: data.email } });
    if (dup && dup.id !== editingId) fail("Já existe um usuário com este e-mail.");

    if (editingId) await prisma.user.update({ where: { id: editingId }, data });
    else await prisma.user.create({ data: { ...data, passwordHash: data.passwordHash! } });
  }, ["ADMIN"]);
}

export async function deleteUserAction(userId: string) {
  return run(async (me) => {
    const uid = id(userId);
    if (uid === me.id) fail("Você não pode excluir o próprio usuário.");
    if (await prisma.ticket.count({ where: { requesterId: uid } }))
      fail("Usuário possui demandas abertas em seu nome. Desative-o em vez de excluir.");
    await prisma.user.delete({ where: { id: uid } });
  }, ["ADMIN"]);
}

// ---------------------------------------------------------------------------
// Demandas
// ---------------------------------------------------------------------------

export async function createTicketAction(input: TicketInput & { requesterId?: string }) {
  return run(async (me) => {
    const staff = isStaff(me.role);
    const base = {
      title: str(input?.title, "Título", { max: 200 }),
      description: optStr(input?.description, "Descrição", 10_000) ?? "",
      priority: oneOf(input?.priority, PRIORITY_ORDER, "Prioridade"),
      category: oneOf(input?.category, CATEGORY_ORDER, "Categoria"),
      assetTag: optStr(input?.assetTag, "Patrimônio", 60),
    };

    return prisma.$transaction(async (tx) => {
      let departmentId: string;
      let requesterId = me.id;
      let assigneeId: string | null = null;
      let status: (typeof STATUS_ORDER)[number] = "A_FAZER";
      let dueDate: Date | null = null;

      if (staff) {
        departmentId = id(input?.departmentId, "Departamento");
        if (!(await tx.department.findUnique({ where: { id: departmentId } }))) fail("Departamento inválido.");
        assigneeId = optId(input?.assigneeId, "Responsável");
        await assertAssignee(tx, assigneeId);
        status = input?.status ? oneOf(input.status, STATUS_ORDER, "Status") : "A_FAZER";
        dueDate = optDate(input?.dueDate, "Prazo");
        const reqId = optId(input?.requesterId, "Solicitante");
        if (reqId) {
          const req = await tx.user.findUnique({ where: { id: reqId } });
          if (!req || !req.active) fail("Solicitante inválido.");
          requesterId = reqId;
        }
      } else {
        // Solicitante: departamento é sempre o dele; triagem fica com a TI
        if (!me.departmentId) fail("Seu usuário não está vinculado a um departamento.");
        departmentId = me.departmentId;
      }

      const ticket = await tx.ticket.create({
        data: { ...base, departmentId, requesterId, assigneeId, status, dueDate, closedAt: status === "CONCLUIDO" ? new Date() : null },
      });
      await tx.ticketComment.create({ data: { ticketId: ticket.id, authorId: me.id, kind: "SYSTEM", body: "Demanda aberta." } });

      if (assigneeId) await notify(tx, me.id, [assigneeId], `Você foi definido como responsável pela #${ticket.number}`, ticket.id);
      if (ticket.priority === "CRITICA")
        await notify(tx, me.id, await activeStaffIds(tx), `Nova demanda crítica: #${ticket.number} — ${ticket.title}`, ticket.id);
      else if (!assigneeId) await notify(tx, me.id, await activeStaffIds(tx), `Nova demanda sem responsável: #${ticket.number}`, ticket.id);

      return { id: ticket.id, number: ticket.number };
    });
  });
}

export async function updateTicketAction(ticketId: string, patch: TicketPatch) {
  return run(async (me) => {
    const tid = id(ticketId);
    await prisma.$transaction(async (tx) => {
      const prev = await tx.ticket.findUnique({ where: { id: tid } });
      if (!prev) fail("Demanda não encontrada.");

      const data: Prisma.TicketUncheckedUpdateInput = {};
      if ("title" in patch) data.title = str(patch.title, "Título", { max: 200 });
      if ("description" in patch) data.description = optStr(patch.description, "Descrição", 10_000) ?? "";
      if ("priority" in patch) data.priority = oneOf(patch.priority, PRIORITY_ORDER, "Prioridade");
      if ("category" in patch) data.category = oneOf(patch.category, CATEGORY_ORDER, "Categoria");
      if ("assetTag" in patch) data.assetTag = optStr(patch.assetTag, "Patrimônio", 60);
      if ("dueDate" in patch) data.dueDate = optDate(patch.dueDate, "Prazo");
      if ("waitingReason" in patch) data.waitingReason = optStr(patch.waitingReason, "Motivo da espera", 200);
      if ("departmentId" in patch) {
        const dep = id(patch.departmentId, "Departamento");
        if (!(await tx.department.findUnique({ where: { id: dep } }))) fail("Departamento inválido.");
        data.departmentId = dep;
      }

      const newStatus = "status" in patch ? oneOf(patch.status, STATUS_ORDER, "Status") : prev.status;
      const statusChanged = newStatus !== prev.status;
      if (statusChanged) {
        data.status = newStatus;
        data.closedAt = newStatus === "CONCLUIDO" ? new Date() : null;
        if (newStatus !== "AGUARDANDO") data.waitingReason = null;
      }

      const newAssignee = "assigneeId" in patch ? optId(patch.assigneeId, "Responsável") : prev.assigneeId;
      const assigneeChanged = newAssignee !== prev.assigneeId;
      if (assigneeChanged) {
        await assertAssignee(tx, newAssignee);
        data.assigneeId = newAssignee;
      }

      const updated = await tx.ticket.update({ where: { id: tid }, data });

      if (statusChanged) {
        const label = STATUS_META[newStatus].label;
        await tx.ticketComment.create({
          data: {
            ticketId: tid,
            authorId: me.id,
            kind: "STATUS_CHANGE",
            body: `Status alterado para ${label}${updated.waitingReason ? `: ${updated.waitingReason}` : ""}.`,
          },
        });
        await notify(tx, me.id, [prev.requesterId], `Sua demanda #${prev.number} agora está: ${label}`, tid);
      }
      if (assigneeChanged) {
        const name = newAssignee ? (await tx.user.findUnique({ where: { id: newAssignee } }))?.name : null;
        await tx.ticketComment.create({
          data: { ticketId: tid, authorId: me.id, kind: "ASSIGNMENT", body: name ? `Responsável definido: ${name}.` : "Responsável removido." },
        });
        await notify(tx, me.id, [newAssignee], `Você foi definido como responsável pela #${prev.number}`, tid);
      }
    });
  }, STAFF);
}

export async function deleteTicketAction(ticketId: string) {
  return run(async () => {
    await prisma.ticket.delete({ where: { id: id(ticketId) } });
  }, STAFF);
}

export async function addCommentAction(ticketId: string, body: string, isInternal = false) {
  return run(async (me) => {
    const tid = id(ticketId);
    const text = str(body, "Comentário", { max: 5_000 });
    const staff = isStaff(me.role);
    await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { id: tid } });
      if (!ticket || (!staff && ticket.requesterId !== me.id)) fail("Demanda não encontrada.");
      const internal = staff && isInternal === true;
      await tx.ticketComment.create({ data: { ticketId: tid, authorId: me.id, kind: "COMMENT", body: text, isInternal: internal } });
      await tx.ticket.update({ where: { id: tid }, data: { updatedAt: new Date() } });
      const targets = internal ? [ticket.assigneeId] : [ticket.requesterId, ticket.assigneeId];
      await notify(tx, me.id, targets, `Novo comentário na #${ticket.number}`, tid);
    });
  });
}

// ---------------------------------------------------------------------------
// Checklists (TI)
// ---------------------------------------------------------------------------

export async function saveChecklistAction(input: ChecklistInput) {
  return run(async (me) => {
    const checklistId = optId(input?.id);
    const title = str(input?.title, "Título", { max: 160 });
    const description = optStr(input?.description, "Descrição", 2_000) ?? "";
    const category = input?.category ? oneOf(input.category, CATEGORY_ORDER, "Categoria") : null;
    if (!Array.isArray(input?.items)) fail("Itens inválidos.");
    const items = input.items
      .map((i) => ({ label: optStr(i?.label, "Item", 300), hint: optStr(i?.hint, "Dica", 1_000) }))
      .filter((i): i is { label: string; hint: string | null } => !!i.label);
    if (!items.length) fail("Adicione pelo menos um item ao checklist.");
    if (items.length > 200) fail("Checklist com itens demais (máximo 200).");

    return prisma.$transaction(async (tx) => {
      const saved = checklistId
        ? await tx.checklist.update({ where: { id: checklistId }, data: { title, description, category } })
        : await tx.checklist.create({ data: { title, description, category, createdById: me.id } });
      // Itens do modelo são regravados; instâncias já vinculadas às demandas não mudam
      await tx.checklistItem.deleteMany({ where: { checklistId: saved.id } });
      await tx.checklistItem.createMany({ data: items.map((i, position) => ({ checklistId: saved.id, position, label: i.label, hint: i.hint })) });
      return saved.id;
    });
  }, STAFF);
}

export async function deleteChecklistAction(checklistId: string) {
  return run(async () => {
    await prisma.checklist.delete({ where: { id: id(checklistId) } });
  }, STAFF);
}

export async function attachChecklistAction(ticketId: string, checklistId: string) {
  return run(async (me) => {
    const tid = id(ticketId);
    const cid = id(checklistId);
    await prisma.$transaction(async (tx) => {
      const tpl = await tx.checklist.findUnique({ where: { id: cid }, include: { items: { orderBy: { position: "asc" } } } });
      if (!tpl) fail("Modelo de checklist não encontrado.");
      if (!(await tx.ticket.findUnique({ where: { id: tid } }))) fail("Demanda não encontrada.");
      await tx.ticketChecklist.create({
        data: {
          ticketId: tid,
          checklistId: cid,
          title: tpl.title,
          attachedById: me.id,
          items: { create: tpl.items.map((i) => ({ position: i.position, label: i.label, hint: i.hint })) },
        },
      });
      await tx.ticketComment.create({ data: { ticketId: tid, authorId: me.id, kind: "CHECKLIST", body: `Checklist vinculado: ${tpl.title}.` } });
    });
  }, STAFF);
}

export async function detachChecklistAction(ticketChecklistId: string) {
  return run(async () => {
    await prisma.ticketChecklist.delete({ where: { id: id(ticketChecklistId) } });
  }, STAFF);
}

export async function toggleChecklistItemAction(ticketChecklistId: string, itemId: string) {
  return run(async (me) => {
    const tcId = id(ticketChecklistId);
    const iid = id(itemId);
    await prisma.$transaction(async (tx) => {
      const item = await tx.ticketChecklistItem.findFirst({ where: { id: iid, ticketChecklistId: tcId } });
      if (!item) fail("Item não encontrado.");
      await tx.ticketChecklistItem.update({
        where: { id: iid },
        data: item.done ? { done: false, doneById: null, doneAt: null } : { done: true, doneById: me.id, doneAt: new Date() },
      });
      const pending = await tx.ticketChecklistItem.count({ where: { ticketChecklistId: tcId, done: false } });
      await tx.ticketChecklist.update({ where: { id: tcId }, data: { completedAt: pending === 0 ? new Date() : null } });
    });
  }, STAFF);
}

// ---------------------------------------------------------------------------
// Base de conhecimento (TI)
// ---------------------------------------------------------------------------

export async function saveProcedureAction(input: ProcedureInput) {
  return run(async (me) => {
    const procedureId = optId(input?.id);
    if (!Array.isArray(input?.tags)) fail("Tags inválidas.");
    const data = {
      title: str(input?.title, "Título", { max: 200 }),
      content: typeof input?.content === "string" ? input.content.slice(0, 200_000) : "",
      tags: Array.from(new Set(input.tags.map((t) => optStr(t, "Tag", 40)).filter((t): t is string => !!t))).slice(0, 20),
      pinned: bool(input?.pinned, "Fixado"),
      updatedById: me.id,
    };
    const saved = procedureId
      ? await prisma.procedure.update({ where: { id: procedureId }, data })
      : await prisma.procedure.create({ data: { ...data, authorId: me.id } });
    return saved.id;
  }, STAFF);
}

export async function deleteProcedureAction(procedureId: string) {
  return run(async () => {
    await prisma.procedure.delete({ where: { id: id(procedureId) } });
  }, STAFF);
}

// ---------------------------------------------------------------------------
// Notificações
// ---------------------------------------------------------------------------

export async function markNotificationReadAction(notificationId: string) {
  return run(async (me) => {
    await prisma.notification.updateMany({ where: { id: id(notificationId), userId: me.id, readAt: null }, data: { readAt: new Date() } });
  });
}

export async function markAllNotificationsReadAction() {
  return run(async (me) => {
    await prisma.notification.updateMany({ where: { userId: me.id, readAt: null }, data: { readAt: new Date() } });
  });
}
