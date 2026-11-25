"use client";

import { LoaderCircle, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { isStaff } from "@/lib/constants";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-accounts";
import { useStore } from "@/lib/store";

/** Atalhos das contas do seed: só em `next dev` (nunca em produção). */
const SHOW_DEMO_ACCOUNTS = process.env.NODE_ENV === "development";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login, currentUser, hydrated } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hydrated || !currentUser) return;
    const next = params.get("next");
    router.replace(next && next.startsWith("/") ? next : isStaff(currentUser.role) ? "/dashboard" : "/meus-chamados");
  }, [hydrated, currentUser, params, router]);

  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await login(email, password);
    if (!res.ok) {
      setError(res.error);
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Entrar" subtitle="Acesse com seu e-mail institucional.">
      <form onSubmit={submit} className="grid gap-4">
        <Field label="E-mail" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@prefeitura.gov.br" />
        </Field>
        <Field label="Senha" htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-700 ring-1 ring-red-200">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <LoaderCircle className="animate-spin" /> : <LogIn />} {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Ainda não tem acesso?{" "}
        <Link href="/cadastro" className="font-medium text-zinc-900 underline-offset-4 hover:underline">
          Criar conta de solicitante
        </Link>
      </p>

      {SHOW_DEMO_ACCOUNTS && (
      <div className="mt-10 rounded-lg border border-dashed border-zinc-300 p-4">
        <p className="text-xs font-medium text-zinc-700">Contas de demonstração</p>
        <p className="mt-0.5 text-xs text-zinc-500">Criadas pelo seed do banco. Visível só em desenvolvimento.</p>
        <div className="mt-3 grid gap-1.5">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => {
                setEmail(a.email);
                setPassword(DEMO_PASSWORD);
                setError("");
              }}
              className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-left text-[13px] hover:bg-zinc-50"
            >
              <span className="font-medium text-zinc-800">{a.label}</span>
              <span className="truncate pl-3 text-xs text-zinc-500">{a.email}</span>
            </button>
          ))}
        </div>
      </div>
      )}
    </AuthShell>
  );
}
