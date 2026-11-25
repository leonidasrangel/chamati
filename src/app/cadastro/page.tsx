"use client";

import { UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { useStore } from "@/lib/store";

export default function RegisterPage() {
  const { db, register, currentUser, hydrated } = useStore();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", departmentId: "", password: "", confirm: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (hydrated && currentUser) router.replace("/");
  }, [hydrated, currentUser, router]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) return setError("A senha deve ter pelo menos 6 caracteres.");
    if (form.password !== form.confirm) return setError("As senhas não conferem.");
    setLoading(true);
    setError("");
    const res = await register({ name: form.name, email: form.email, password: form.password, departmentId: form.departmentId });
    if (!res.ok) {
      setError(res.error);
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Criar conta" subtitle="Cadastro para servidores abrirem e acompanharem chamados.">
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Nome completo" htmlFor="name">
          <Input id="name" required value={form.name} onChange={set("name")} autoComplete="name" />
        </Field>
        <Field label="E-mail institucional" htmlFor="email">
          <Input id="email" type="email" required value={form.email} onChange={set("email")} autoComplete="email" />
        </Field>
        <Field label="Departamento" htmlFor="department">
          <Select id="department" required value={form.departmentId} onChange={set("departmentId")}>
            <option value="" disabled>
              Selecione…
            </option>
            {db.departments
              .filter((d) => d.active)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.acronym} — {d.name}
                </option>
              ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Senha" htmlFor="password">
            <Input id="password" type="password" required value={form.password} onChange={set("password")} autoComplete="new-password" />
          </Field>
          <Field label="Confirmar senha" htmlFor="confirm">
            <Input id="confirm" type="password" required value={form.confirm} onChange={set("confirm")} autoComplete="new-password" />
          </Field>
        </div>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-700 ring-1 ring-red-200">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          <UserPlus /> {loading ? "Criando…" : "Criar conta"}
        </Button>
        <p className="text-xs text-zinc-500">
          Novas contas entram como <strong className="font-medium text-zinc-700">Solicitante</strong>. A TI pode promover
          o perfil em Usuários.
        </p>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-zinc-900 underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
