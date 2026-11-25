"use client";

import { Building2, Ellipsis, MapPin, Pencil, Phone, Plus, Power, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownContent, DropdownItem, DropdownMenu, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { Field, Input } from "@/components/ui/form";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { useStore } from "@/lib/store";
import type { Department } from "@/lib/types";
import { normalize } from "@/lib/utils";

export default function DepartmentsPage() {
  return (
    <Suspense>
      <DepartmentsContent />
    </Suspense>
  );
}

function DepartmentsContent() {
  const { db, saveDepartment, deleteDepartment } = useStore();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | undefined>();

  useEffect(() => setQuery(params.get("q") ?? ""), [params]);

  const rows = useMemo(() => {
    const q = normalize(query.trim());
    return db.departments
      .filter((d) => !q || normalize(`${d.name} ${d.acronym} ${d.managerName ?? ""} ${d.location ?? ""}`).includes(q))
      .map((d) => ({
        ...d,
        users: db.users.filter((u) => u.departmentId === d.id).length,
        open: db.tickets.filter((t) => t.departmentId === d.id && t.status !== "CONCLUIDO").length,
        total: db.tickets.filter((t) => t.departmentId === d.id).length,
      }))
      .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
  }, [db, query]);

  const edit = (d?: Department) => {
    setEditing(d);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Departamentos"
        description="Secretarias e setores que abrem demandas para a TI."
        actions={
          <Button onClick={() => edit()}>
            <Plus /> Novo departamento
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, sigla ou responsável…" className="pl-9" aria-label="Buscar departamentos" />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white">
          <EmptyState icon={<Building2 />} title="Nenhum departamento encontrado" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50/80 text-left text-xs text-zinc-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Departamento</th>
                  <th className="px-4 py-2.5 font-medium">Responsável</th>
                  <th className="px-4 py-2.5 font-medium">Contato</th>
                  <th className="px-4 py-2.5 text-right font-medium">Usuários</th>
                  <th className="px-4 py-2.5 text-right font-medium">Em aberto</th>
                  <th className="px-4 py-2.5 font-medium">Situação</th>
                  <th className="w-10" aria-label="Ações" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 min-w-11 items-center justify-center rounded-md bg-zinc-100 px-2 text-[11px] font-bold text-zinc-700">{d.acronym}</span>
                        <span className="font-medium text-zinc-900">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-zinc-600">{d.managerName || "—"}</td>
                    <td className="px-4 py-3 text-[13px] text-zinc-600">
                      <span className="flex flex-col gap-0.5">
                        {d.extension && (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="size-3 text-zinc-400" /> Ramal {d.extension}
                          </span>
                        )}
                        {d.location && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                            <MapPin className="size-3 text-zinc-400" /> {d.location}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-700">{d.users}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <Link href={`/chamados?department=${d.id}&view=table`} className="text-zinc-900 hover:underline">
                        {d.open}
                      </Link>
                      <span className="text-xs text-zinc-400"> / {d.total}</span>
                    </td>
                    <td className="px-4 py-3">
                      {d.active ? (
                        <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">Ativo</Badge>
                      ) : (
                        <Badge className="bg-zinc-100 text-zinc-500 ring-zinc-200">Inativo</Badge>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <DropdownMenu>
                        <DropdownTrigger asChild>
                          <button className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label={`Ações de ${d.name}`}>
                            <Ellipsis className="size-4" />
                          </button>
                        </DropdownTrigger>
                        <DropdownContent>
                          <DropdownItem onSelect={() => edit(d)}>
                            <Pencil /> Editar
                          </DropdownItem>
                          <DropdownItem
                            onSelect={async () => {
                              const res = await saveDepartment({
                                id: d.id,
                                name: d.name,
                                acronym: d.acronym,
                                managerName: d.managerName,
                                extension: d.extension,
                                location: d.location,
                                active: !d.active,
                              });
                              if (!res.ok) alert(res.error);
                            }}
                          >
                            <Power /> {d.active ? "Desativar" : "Reativar"}
                          </DropdownItem>
                          <DropdownSeparator />
                          <DropdownItem
                            danger
                            onSelect={async () => {
                              if (!confirm(`Excluir o departamento ${d.acronym}?`)) return;
                              const res = await deleteDepartment(d.id);
                              if (!res.ok) alert(res.error);
                            }}
                          >
                            <Trash2 /> Excluir
                          </DropdownItem>
                        </DropdownContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DepartmentDialog open={open} onOpenChange={setOpen} department={editing} />
    </>
  );
}

function DepartmentDialog({ open, onOpenChange, department }: { open: boolean; onOpenChange: (o: boolean) => void; department?: Department }) {
  const { db, saveDepartment } = useStore();
  const [form, setForm] = useState({ name: "", acronym: "", managerName: "", extension: "", location: "", active: true });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm({
      name: department?.name ?? "",
      acronym: department?.acronym ?? "",
      managerName: department?.managerName ?? "",
      extension: department?.extension ?? "",
      location: department?.location ?? "",
      active: department?.active ?? true,
    });
  }, [open, department]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const acronym = form.acronym.trim().toUpperCase();
    if (db.departments.some((d) => d.acronym.toUpperCase() === acronym && d.id !== department?.id))
      return setError(`Já existe um departamento com a sigla ${acronym}.`);
    setSaving(true);
    const res = await saveDepartment({
      id: department?.id,
      name: form.name.trim(),
      acronym,
      managerName: form.managerName.trim() || undefined,
      extension: form.extension.trim() || undefined,
      location: form.location.trim() || undefined,
      active: form.active,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={department ? "Editar departamento" : "Novo departamento"}
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="dep-form" disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </>
        }
      >
        <form id="dep-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <Field label="Nome" htmlFor="d-name">
            <Input id="d-name" required value={form.name} onChange={set("name")} placeholder="Ex.: Secretaria de Educação" />
          </Field>
          <Field label="Sigla" htmlFor="d-acr">
            <Input id="d-acr" required maxLength={12} value={form.acronym} onChange={set("acronym")} placeholder="EDU" className="uppercase" />
          </Field>
          <Field label="Responsável" htmlFor="d-mgr" className="sm:col-span-2">
            <Input id="d-mgr" value={form.managerName} onChange={set("managerName")} placeholder="Chefe do setor" />
          </Field>
          <Field label="Localização" htmlFor="d-loc">
            <Input id="d-loc" value={form.location} onChange={set("location")} placeholder="Prédio / sala" />
          </Field>
          <Field label="Ramal" htmlFor="d-ext">
            <Input id="d-ext" value={form.extension} onChange={set("extension")} />
          </Field>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-700 ring-1 ring-red-200 sm:col-span-2">{error}</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
}
