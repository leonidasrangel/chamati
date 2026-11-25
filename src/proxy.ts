import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/server/token";

/**
 * Checagem otimista: sem sessão válida, as áreas internas redirecionam para o login.
 * A autorização de verdade (perfil, dono da demanda) acontece nas Server Actions e
 * no carregamento de dados (src/server).
 */
export async function proxy(request: NextRequest) {
  const userId = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (userId) return NextResponse.next();

  const url = new URL("/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  const res = NextResponse.redirect(url);
  if (request.cookies.has(SESSION_COOKIE)) res.cookies.delete(SESSION_COOKIE); // token vencido/inválido
  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/chamados/:path*", "/procedimentos/:path*", "/departamentos/:path*", "/usuarios/:path*", "/meus-chamados/:path*"],
};
