import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import type { User } from "@/lib/types";
import { prisma } from "./db";
import { toUser } from "./mappers";
import { SESSION_COOKIE, SESSION_HOURS, signSession, verifySession } from "./token";

export async function createSession(userId: string) {
  const token = await signSession(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Usuário da requisição atual, lido do banco a cada requisição:
 * desativar um usuário encerra o acesso dele imediatamente.
 */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const userId = await verifySession(token);
  if (!userId) return null;
  const row = await prisma.user.findUnique({ where: { id: userId } });
  if (!row || !row.active) return null;
  return toUser(row);
});
