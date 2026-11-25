"use client";

import { CircleCheck, Inbox, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StatusStepper } from "@/components/tickets/status-stepper";
import { Avatar, CategoryBadge, StatusBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { EmptyState, PageHeader, Segmented } from "@/components/ui/misc";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/constants";
import { useLookups, useStore } from "@/lib/store";
import type { TicketCategory, TicketPriority } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

const URGENCY: { value: TicketPriority; label: string; hint: string }[] = [
  { value: "BAIXA", label: "Baixa", hint: "Pode esperar alguns dias" },
  { value: "MEDIA", label: "Média", hint: "Atrapalha, mas consigo trabalhar" },
  { value: "ALTA", label: "Alta", hint: "Estou impedido de trabalhar" },
  { value: "CRITICA", label: "Crítica", hint: "Setor inteiro parado" },
];

export default function MyTicketsPage() {
  const { db, currentUser, createTicket } = useStore();
  const { department, user } = useLookups();
  const [filter, setFilter] = useState<"open" | "closed">("open");
  const [form, setForm] = useState({ title: "", description: "", category: "HARDWARE" as TicketCategory, priority: "MEDIA" as TicketPriority, assetTag: "" });
  const [sent, setSent] = useState<number | null>(null);

  const dep = department(currentUser?.departmentId);
  const mine = db.tickets
    .filter((t) => t.requesterId === currentUser?.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const list = mine.filter((t) => (filter === "open" ? t.status !== "CONCLUIDO" : t.status === "CONCLUIDO"));

  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.departmentId) return;
    setSending(true);
    const res = await createTicket({
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      priority: form.priority,
      departmentId: currentUser.departmentId,
      assetTag: form.assetTag.trim() || undefined,
    });
    setSending(false);
    if (!res.ok) return; // o erro aparece no aviso global
    setSent(res.number);
    setFilter("open");
    setForm({ title: "", description: "", category: "HARDWARE", priority: "MEDIA", assetTag: "" });
  };

  return (
    <>
      <PageHeader title="Meus chamados" description={`Abra solicitações para a TI e acompanhe o andamento${dep ? ` · ${dep.name}` : ""}.`} />

      <div className="grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        <Card className="self-start">
          <CardHeader title="Abrir novo chamado" description="Descreva o problema com o máximo de detalhes." />
          <CardBody>
            {!currentUser?.departmentId ? (
              <p className="text-sm text-zinc-500">Seu usuário não está vinculado a um departamento. Procure a equipe de TI.</p>
            ) : (
              <form onSubmit={submit} className="grid gap-4">
                <Field label="O que está acontecendo?" htmlFor="r-title">
                  <Input id="r-title" required maxLength={200} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex.: Computador não liga" />
                </Field>
                <Field label="Detalhes" htmlFor="r-desc" hint="Local, equipamento, mensagem de erro, melhor horário para atendimento.">
                  <Textarea id="r-desc" rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tipo" htmlFor="r-cat">
                    <Select id="r-cat" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as TicketCategory }))}>
                      {CATEGORY_ORDER.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_META[c].label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Patrimônio" htmlFor="r-asset">
                    <Input id="r-asset" value={form.assetTag} onChange={(e) => setForm((f) => ({ ...f, assetTag: e.target.value }))} placeholder="Opcional" />
                  </Field>
                </div>
                <fieldset>
                  <legend className="mb-1.5 text-[13px] font-medium text-zinc-700">Urgência</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {URGENCY.map((u) => (
                      <label
                        key={u.value}
                        className={cn(
                          "cursor-pointer rounded-lg border px-3 py-2 transition-colors",
                          form.priority === u.value ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500" : "border-zinc-200 hover:bg-zinc-50",
                        )}
                      >
                        <input
                          type="radio"
                          name="priority"
                          value={u.value}
                          checked={form.priority === u.value}
                          onChange={() => setForm((f) => ({ ...f, priority: u.value }))}
                          className="sr-only"
                        />
                        <span className="block text-[13px] font-medium text-zinc-900">{u.label}</span>
                        <span className="block text-[11px] leading-4 text-zinc-500">{u.hint}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                {sent && (
                  <p className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800 ring-1 ring-emerald-200" role="status">
                    <CircleCheck className="size-4" /> Chamado #{sent} enviado para a TI.
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={sending}>
                  <Send /> {sending ? "Enviando…" : "Enviar chamado"}
                </Button>
              </form>
            )}
          </CardBody>
        </Card>

        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: "open", label: `Em aberto (${mine.filter((t) => t.status !== "CONCLUIDO").length})` },
                { value: "closed", label: `Concluídos (${mine.filter((t) => t.status === "CONCLUIDO").length})` },
              ]}
            />
          </div>

          {list.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Inbox />}
                title={filter === "open" ? "Nenhum chamado em aberto" : "Nenhum chamado concluído"}
                description={filter === "open" ? "Quando você abrir um chamado, ele aparece aqui com o andamento." : undefined}
              />
            </Card>
          ) : (
            <ul className="grid gap-3">
              {list.map((t) => {
                const assignee = user(t.assigneeId);
                return (
                  <li key={t.id}>
                    <Link href={`/chamados/${t.id}`} className="block rounded-xl border border-zinc-200 bg-white p-4 shadow-xs transition hover:border-zinc-300 hover:shadow-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium tabular-nums text-zinc-400">#{t.number}</span>
                        <StatusBadge status={t.status} />
                        <CategoryBadge category={t.category} />
                        <span className="ml-auto text-xs text-zinc-400">atualizado {timeAgo(t.updatedAt)}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-zinc-900">{t.title}</p>
                      {t.status === "AGUARDANDO" && t.waitingReason && <p className="mt-1 text-xs text-amber-800">Pendência: {t.waitingReason}</p>}
                      <div className="mt-4 grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <StatusStepper status={t.status} compact />
                        <span className="flex items-center gap-2 text-xs text-zinc-500">
                          {assignee ? (
                            <>
                              <Avatar name={assignee.name} size="sm" /> {assignee.name}
                            </>
                          ) : (
                            "Aguardando triagem"
                          )}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
