"use client";

import { Ellipsis, Lock, Pencil, Plus, Power, Search, Trash2, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Avatar, Badge, RoleBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownContent, DropdownItem, DropdownMenu, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { Field, Input, Select } from "@/components/ui/form";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ROLE_META } from "@/lib/constants";
import { useLookups, useStore } from "@/lib/store";
import type { User, UserRole } from "@/lib/types";
import { formatDate, normalize } from "@/lib/utils";

export default function UsersPage() {
  return (
    <Suspense>
      <UsersContent />
    </Suspense>
  );
}

function UsersContent() {
  const { db, currentUser, saveUser, deleteUser } = useStore();
  const { department } = useLookups();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [role, setRole] = useState("");
  const [dep, setDep] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | undefined>();
  const canEdit = currentUser?.role === "ADMIN";

  useEffect(() => setQuery(params.get("q") ?? ""), [params]);

  const rows = useMemo(() => {
    const q = normalize(query.trim());
    return db.users
      .filter((u) => !q || normalize(`${u.name} ${u.email}`).includes(q))
      .filter((u) => !role || u.role === role)
      .filter((u) => !dep || u.departmentId === dep)
      .map((u) => ({
        ...u,
        assigned: db.tickets.filter((t) => t.assigneeId === u.id && t.status !== "CONCLUIDO").length,
        requested: db.tickets.filter((t) => t.requesterId === u.id).length,
      }))
      .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
  }, [db, query, role, dep]);

  const edit = (u?: User) => {
    setEditing(u);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Equipe de TI e servidores solicitantes."
        actions={
          canEdit ? (
            <Button onClick={() => edit()}>
              <Plus /> Novo usuário
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
              <Lock className="size-3.5" /> Somente administradores podem editar
            </span>
          )
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,320px)_200px_240px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome ou e-mail…" className="pl-9" aria-label="Buscar usuários" />
        </div>
        <Select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Perfil">
          <option value="">Todos os perfis</option>
          {(Object.keys(ROLE_META) as UserRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_META[r].label}
            </option>
          ))}
        </Select>
        <Select value={dep} onChange={(e) => setDep(e.target.value)} aria-label="Departamento">
          <option value="">Todos os departamentos</option>
          {db.departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.acronym} — {d.name}
            </option>
          ))}
        </Select>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white">
          <EmptyState icon={<Users />} title="Nenhum usuário encontrado" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50/80 text-left text-xs text-zinc-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Usuário</th>
                  <th className="px-4 py-2.5 font-medium">Perfil</th>
                  <th className="px-4 py-2.5 font-medium">Departamento</th>
                  <th className="px-4 py-2.5 text-right font-medium">Atribuídas</th>
                  <th className="px-4 py-2.5 text-right font-medium">Abertas por</th>
                  <th className="px-4 py-2.5 font-medium">Desde</th>
                  <th className="px-4 py-2.5 font-medium">Situação</th>
                  {canEdit && <th className="w-10" aria-label="Ações" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-900">
                            {u.name}
                            {u.id === currentUser?.id && <span className="ml-1.5 text-xs font-normal text-zinc-400">(você)</span>}
                          </p>
                          <p className="truncate text-xs text-zinc-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3 text-[13px] text-zinc-600">{department(u.departmentId)?.acronym ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-700">{u.role === "SOLICITANTE" ? "—" : u.assigned}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-700">{u.requested}</td>
                    <td className="px-4 py-3 tabular-nums text-[13px] text-zinc-500">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      {u.active ? (
                        <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">Ativo</Badge>
                      ) : (
                        <Badge className="bg-zinc-100 text-zinc-500 ring-zinc-200">Inativo</Badge>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-2 py-3">
                        <DropdownMenu>
                          <DropdownTrigger asChild>
                            <button className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label={`Ações de ${u.name}`}>
                              <Ellipsis className="size-4" />
                            </button>
                          </DropdownTrigger>
                          <DropdownContent>
                            <DropdownItem onSelect={() => edit(u)}>
                              <Pencil /> Editar
                            </DropdownItem>
                            {u.id !== currentUser?.id && (
                              <DropdownItem
                                onSelect={async () => {
                                  const res = await saveUser({
                                    id: u.id,
                                    name: u.name,
                                    email: u.email,
                                    role: u.role,
                                    departmentId: u.departmentId,
                                    phone: u.phone,
                                    active: !u.active,
                                  });
                                  if (!res.ok) alert(res.error);
                                }}
                              >
                                <Power /> {u.active ? "Desativar" : "Reativar"}
                              </DropdownItem>
                            )}
                            <DropdownSeparator />
                            <DropdownItem
                              danger
                              onSelect={async () => {
                                if (!confirm(`Excluir ${u.name}?`)) return;
                                const res = await deleteUser(u.id);
                                if (!res.ok) alert(res.error);
                              }}
                            >
                              <Trash2 /> Excluir
                            </DropdownItem>
                          </DropdownContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {canEdit && <UserDialog open={open} onOpenChange={setOpen} user={editing} />}
    </>
  );
}

function UserDialog({ open, onOpenChange, user }: { open: boolean; onOpenChange: (o: boolean) => void; user?: User }) {
  const { db, saveUser, currentUser } = useStore();
  const [form, setForm] = useState({ name: "", email: "", role: "SOLICITANTE" as UserRole, departmentId: "", phone: "", password: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm({
      name: user?.name ?? "",
      email: user?.email ?? "",
      role: user?.role ?? "SOLICITANTE",
      departmentId: user?.departmentId ?? "",
      phone: user?.phone ?? "",
      password: "",
    });
  }, [open, user]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user && form.password.length < 8) return setError("Defina uma senha inicial com pelo menos 8 caracteres.");
    if (user && form.password && form.password.length < 8) return setError("A nova senha deve ter pelo menos 8 caracteres.");
    setSaving(true);
    const res = await saveUser({
      id: user?.id,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      role: user?.id === currentUser?.id ? user!.role : form.role,
      departmentId: form.departmentId || undefined,
      phone: form.phone.trim() || undefined,
      password: form.password || undefined, // vazio = mantém a senha atual
      active: user?.active ?? true,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={user ? "Editar usuário" : "Novo usuário"}
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="user-form" disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo" htmlFor="u-name" className="sm:col-span-2">
            <Input id="u-name" required value={form.name} onChange={set("name")} />
          </Field>
          <Field label="E-mail" htmlFor="u-email" className="sm:col-span-2">
            <Input id="u-email" type="email" required value={form.email} onChange={set("email")} />
          </Field>
          <Field label="Perfil" htmlFor="u-role" hint={user?.id === currentUser?.id ? "Você não pode alterar o próprio perfil." : undefined}>
            <Select id="u-role" value={form.role} onChange={set("role")} disabled={user?.id === currentUser?.id}>
              {(Object.keys(ROLE_META) as UserRole[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_META[r].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Departamento" htmlFor="u-dep">
            <Select id="u-dep" value={form.departmentId} onChange={set("departmentId")} required={form.role === "SOLICITANTE"}>
              <option value="">Nenhum</option>
              {db.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.acronym} — {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Telefone / ramal" htmlFor="u-phone">
            <Input id="u-phone" value={form.phone} onChange={set("phone")} />
          </Field>
          <Field label={user ? "Nova senha" : "Senha inicial"} htmlFor="u-pass" hint={user ? "Deixe em branco para manter a atual." : undefined}>
            <Input id="u-pass" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} />
          </Field>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-700 ring-1 ring-red-200 sm:col-span-2">{error}</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
}
