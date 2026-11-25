import "server-only";

/** Erro de validação/regra de negócio — a mensagem é mostrada ao usuário. */
export class UserError extends Error {}

export function fail(message: string): never {
  throw new UserError(message);
}

export function str(value: unknown, field: string, { max = 200, min = 1 }: { max?: number; min?: number } = {}): string {
  if (typeof value !== "string") fail(`${field} inválido.`);
  const v = value.trim();
  if (v.length < min) fail(min <= 1 ? `${field} é obrigatório.` : `${field} deve ter pelo menos ${min} caracteres.`);
  if (v.length > max) fail(`${field} deve ter no máximo ${max} caracteres.`);
  return v;
}

/** Texto opcional: vazio/null/undefined → null */
export function optStr(value: unknown, field: string, max = 200): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") fail(`${field} inválido.`);
  const v = value.trim();
  if (!v) return null;
  if (v.length > max) fail(`${field} deve ter no máximo ${max} caracteres.`);
  return v;
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) fail(`${field} inválido.`);
  return value as T;
}

export function bool(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") fail(`${field} inválido.`);
  return value;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function id(value: unknown, field = "Identificador"): string {
  if (typeof value !== "string" || !UUID.test(value)) fail(`${field} inválido.`);
  return value;
}

export function optId(value: unknown, field = "Identificador"): string | null {
  if (value === undefined || value === null || value === "") return null;
  return id(value, field);
}

export function email(value: unknown): string {
  const v = str(value, "E-mail", { max: 160 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) fail("E-mail inválido.");
  return v;
}

/** "YYYY-MM-DD" → Date (meio-dia UTC, evita virar o dia por fuso) */
export function optDate(value: unknown, field: string): Date | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(`${field} inválida.`);
  const d = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) fail(`${field} inválida.`);
  return d;
}
