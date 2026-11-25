/**
 * Carrega os dados de demonstração no banco.
 *   npm run db:seed     → só roda se o banco estiver vazio (sem usuários)
 *   npm run db:reset    → apaga tudo, reaplica as migrações e roda este seed
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { createSeed } from "./seed-data";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

/** Converte as chaves do seed ("dep_ti", "usr_admin"…) em UUIDs estáveis durante a execução. */
const ids = new Map<string, string>();
const uuid = (key: string) => {
  if (!ids.has(key)) ids.set(key, randomUUID());
  return ids.get(key)!;
};
const optUuid = (key?: string) => (key ? uuid(key) : null);
const date = (iso?: string) => (iso ? new Date(iso) : null);

async function main() {
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log(`Banco já possui ${existing} usuário(s); seed ignorado. Use "npm run db:reset" para recriar do zero.`);
    return;
  }

  const s = createSeed();
  const hashes = new Map<string, string>();
  for (const pw of new Set(s.users.map((u) => u.password))) hashes.set(pw, await bcrypt.hash(pw, 10));

  await prisma.$transaction(async (tx) => {
    await tx.department.createMany({
      data: s.departments.map((d) => ({
        id: uuid(d.id),
        name: d.name,
        acronym: d.acronym,
        managerName: d.managerName,
        extension: d.extension,
        location: d.location,
        active: d.active,
        createdAt: new Date(d.createdAt),
      })),
    });

    await tx.user.createMany({
      data: s.users.map((u) => ({
        id: uuid(u.id),
        name: u.name,
        email: u.email.toLowerCase(),
        passwordHash: hashes.get(u.password)!,
        role: u.role,
        departmentId: optUuid(u.departmentId),
        phone: u.phone,
        active: u.active,
        createdAt: new Date(u.createdAt),
      })),
    });

    await tx.ticket.createMany({
      data: s.tickets.map((t) => ({
        id: uuid(t.id),
        number: t.number,
        title: t.title,
        description: t.description,
        departmentId: uuid(t.departmentId),
        requesterId: uuid(t.requesterId),
        assigneeId: optUuid(t.assigneeId),
        priority: t.priority,
        category: t.category,
        status: t.status,
        waitingReason: t.waitingReason,
        assetTag: t.assetTag,
        dueDate: t.dueDate ? new Date(`${t.dueDate}T12:00:00Z`) : null,
        closedAt: date(t.closedAt),
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      })),
    });

    // Próximo número de demanda continua após o maior número do seed
    await tx.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('tickets', 'number'), (SELECT COALESCE(MAX(number), 1000) FROM tickets))`,
    );

    await tx.ticketComment.createMany({
      data: s.comments.map((c) => ({
        id: uuid(c.id),
        ticketId: uuid(c.ticketId),
        authorId: optUuid(c.authorId),
        kind: c.kind,
        body: c.body,
        isInternal: c.isInternal,
        createdAt: new Date(c.createdAt),
      })),
    });

    for (const c of s.checklists) {
      await tx.checklist.create({
        data: {
          id: uuid(c.id),
          title: c.title,
          description: c.description,
          category: c.category,
          createdById: optUuid(c.createdById),
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
          items: { create: c.items.map((i, position) => ({ position, label: i.label, hint: i.hint })) },
        },
      });
    }

    for (const tc of s.ticketChecklists) {
      await tx.ticketChecklist.create({
        data: {
          id: uuid(tc.id),
          ticketId: uuid(tc.ticketId),
          checklistId: optUuid(tc.checklistId),
          title: tc.title,
          attachedById: optUuid(tc.attachedById),
          createdAt: new Date(tc.createdAt),
          items: {
            create: tc.items.map((i, position) => ({
              position,
              label: i.label,
              hint: i.hint,
              done: i.done,
              doneById: optUuid(i.doneById),
              doneAt: date(i.doneAt),
            })),
          },
        },
      });
    }

    await tx.procedure.createMany({
      data: s.procedures.map((p) => ({
        id: uuid(p.id),
        title: p.title,
        content: p.content,
        tags: p.tags,
        pinned: p.pinned,
        authorId: optUuid(p.authorId),
        updatedById: optUuid(p.updatedById),
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      })),
    });

    await tx.notification.createMany({
      data: s.notifications.map((n) => ({
        userId: uuid(n.userId),
        ticketId: optUuid(n.ticketId),
        message: n.message,
        readAt: n.read ? new Date() : null,
        createdAt: new Date(n.createdAt),
      })),
    });
  });

  console.log(
    `Seed concluído: ${s.departments.length} departamentos, ${s.users.length} usuários, ${s.tickets.length} demandas, ` +
      `${s.checklists.length} checklists, ${s.procedures.length} procedimentos.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
