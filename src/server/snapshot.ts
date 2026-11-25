import "server-only";
import { isStaff } from "@/lib/constants";
import type { DbState, User } from "@/lib/types";
import { prisma } from "./db";
import {
  toChecklist,
  toComment,
  toDepartment,
  toNotification,
  toProcedure,
  toTicket,
  toTicketChecklist,
  toUser,
} from "./mappers";

/** Estado vazio para visitantes: apenas departamentos ativos (usados no cadastro). */
export async function loadPublicSnapshot(): Promise<DbState> {
  const departments = await prisma.department.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return {
    departments: departments.map(toDepartment),
    users: [],
    tickets: [],
    comments: [],
    checklists: [],
    ticketChecklists: [],
    procedures: [],
    notifications: [],
  };
}

/**
 * Recorte do banco que o usuário pode ver.
 * - TI (Admin/Técnico): tudo.
 * - Solicitante: só as próprias demandas, sem notas internas, sem base de conhecimento
 *   e sem dados de contato de outros usuários.
 */
export async function loadSnapshot(me: User): Promise<DbState> {
  const staff = isStaff(me.role);
  const ticketWhere = staff ? {} : { requesterId: me.id };

  const [departments, tickets, notifications] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.ticket.findMany({ where: ticketWhere, orderBy: { createdAt: "desc" } }),
    prisma.notification.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const ticketIds = tickets.map((t) => t.id);

  const [users, comments, ticketChecklists, checklists, procedures] = await Promise.all([
    staff
      ? prisma.user.findMany({ orderBy: { name: "asc" } })
      : // solicitante vê apenas a si mesmo e a equipe de TI (nome para exibir o responsável)
        prisma.user.findMany({ where: { OR: [{ id: me.id }, { role: { in: ["ADMIN", "TECNICO"] } }] } }),
    prisma.ticketComment.findMany({
      where: { ticketId: { in: ticketIds }, ...(staff ? {} : { isInternal: false }) },
      orderBy: { createdAt: "asc" },
    }),
    prisma.ticketChecklist.findMany({ where: { ticketId: { in: ticketIds } }, include: { items: true }, orderBy: { createdAt: "asc" } }),
    staff
      ? prisma.checklist.findMany({ where: { archived: false }, include: { items: true }, orderBy: { updatedAt: "desc" } })
      : Promise.resolve([]),
    staff ? prisma.procedure.findMany({ orderBy: { updatedAt: "desc" } }) : Promise.resolve([]),
  ]);

  return {
    departments: departments.map(toDepartment),
    users: users.map((u) => {
      const user = toUser(u);
      // Para o solicitante, oculta e-mail/telefone dos outros usuários
      return staff || u.id === me.id ? user : { ...user, email: "", phone: undefined };
    }),
    tickets: tickets.map(toTicket),
    comments: comments.map(toComment),
    checklists: checklists.map(toChecklist),
    ticketChecklists: ticketChecklists.map(toTicketChecklist),
    procedures: procedures.map(toProcedure),
    notifications: notifications.map(toNotification),
  };
}
