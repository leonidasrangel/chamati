// Assinatura/verificação do token de sessão (sem acesso ao banco — usado também pelo proxy).
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "chamati_session";
export const SESSION_HOURS = 12;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET ausente ou curto demais (mínimo 32 caracteres). Configure o .env.");
  return new TextEncoder().encode(s);
}

export async function signSession(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());
}

/** Valida o token e devolve o id do usuário (ou null). */
export async function verifySession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
