import "server-only";
import type * as P from "@/generated/prisma/client";
import type {
  Checklist,
  Department,
  Notification,
  Procedure,
  Ticket,
  TicketChecklist,
  TicketComment,
  User,
} from "@/lib/types";

// Converte linhas do Prisma (Date, null) para os tipos do front-end (ISO string, undefined).

const iso = (d: Date) => d.toISOString();
const optIso = (d: Date | null) => (d ? d.toISOString() : undefined);
const opt = <T>(v: T | null) => (v === null ? undefined : v);

export function toUser(u: P.User): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    departmentId: opt(u.departmentId),
    phone: opt(u.phone),
    active: u.active,
    createdAt: iso(u.createdAt),
  };
}

export function toDepartment(d: P.Department): Department {
  return {
    id: d.id,
    name: d.name,
    acronym: d.acronym,
    managerName: opt(d.managerName),
    extension: opt(d.extension),
    location: opt(d.location),
    active: d.active,
    createdAt: iso(d.createdAt),
  };
}

export function toTicket(t: P.Ticket): Ticket {
  return {
    id: t.id,
    number: t.number,
    title: t.title,
    description: t.description,
    departmentId: t.departmentId,
    requesterId: t.requesterId,
    assigneeId: opt(t.assigneeId),
    priority: t.priority,
    category: t.category,
    status: t.status,
    waitingReason: opt(t.waitingReason),
    assetTag: opt(t.assetTag),
    dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : undefined,
    closedAt: optIso(t.closedAt),
    createdAt: iso(t.createdAt),
    updatedAt: iso(t.updatedAt),
  };
}

export function toComment(c: P.TicketComment): TicketComment {
  return {
    id: c.id,
    ticketId: c.ticketId,
    authorId: opt(c.authorId),
    kind: c.kind,
    body: c.body,
    isInternal: c.isInternal,
    createdAt: iso(c.createdAt),
  };
}

export function toChecklist(c: P.Checklist & { items: P.ChecklistItem[] }): Checklist {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    category: opt(c.category),
    createdById: opt(c.createdById),
    createdAt: iso(c.createdAt),
    updatedAt: iso(c.updatedAt),
    items: [...c.items]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ id: i.id, label: i.label, hint: opt(i.hint) })),
  };
}

export function toTicketChecklist(c: P.TicketChecklist & { items: P.TicketChecklistItem[] }): TicketChecklist {
  return {
    id: c.id,
    ticketId: c.ticketId,
    checklistId: opt(c.checklistId),
    title: c.title,
    attachedById: opt(c.attachedById),
    createdAt: iso(c.createdAt),
    items: [...c.items]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        id: i.id,
        label: i.label,
        hint: opt(i.hint),
        done: i.done,
        doneById: opt(i.doneById),
        doneAt: optIso(i.doneAt),
      })),
  };
}

export function toProcedure(p: P.Procedure): Procedure {
  return {
    id: p.id,
    title: p.title,
    content: p.content,
    tags: p.tags,
    pinned: p.pinned,
    authorId: opt(p.authorId),
    updatedById: opt(p.updatedById),
    createdAt: iso(p.createdAt),
    updatedAt: iso(p.updatedAt),
  };
}

export function toNotification(n: P.Notification): Notification {
  return {
    id: n.id,
    userId: n.userId,
    ticketId: opt(n.ticketId),
    message: n.message,
    read: n.readAt !== null,
    createdAt: iso(n.createdAt),
  };
}
