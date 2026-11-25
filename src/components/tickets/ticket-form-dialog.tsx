"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { CATEGORY_META, CATEGORY_ORDER, PRIORITY_META, PRIORITY_ORDER, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { useLookups, useStore } from "@/lib/store";
import type { Ticket, TicketCategory, TicketPriority, TicketStatus } from "@/lib/types";

type FormState = {
  title: string;
  description: string;
  departmentId: string;
  priority: TicketPriority;
  category: TicketCategory;
  assigneeId: string;
  status: TicketStatus;
  assetTag: string;
  dueDate: string;
  requesterId: string;
};

const empty = (departmentId = ""): FormState => ({
  requesterId: "",
  title: "",
  description: "",
  departmentId,
  priority: "MEDIA",
  category: "HARDWARE",
  assigneeId: "",
  status: "A_FAZER",
  assetTag: "",
  dueDate: "",
});

export function TicketFormDialog({
  open,
  onOpenChange,
  ticket,
  defaultStatus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket?: Ticket;
  defaultStatus?: TicketStatus;
}) {
  const { db, createTicket, updateTicket, currentUser } = useStore();
  const { staff } = useLookups();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(empty());

  useEffect(() => {
    if (!open) return;
    if (ticket)
      setForm({
        title: ticket.title,
        description: ticket.description,
        departmentId: ticket.departmentId,
        priority: ticket.priority,
        category: ticket.category,
        assigneeId: ticket.assigneeId ?? "",
        status: ticket.status,
        assetTag: ticket.assetTag ?? "",
        dueDate: ticket.dueDate ?? "",
        requesterId: ticket.requesterId,
      });
    else setForm({ ...empty(), status: defaultStatus ?? "A_FAZER" });
  }, [open, ticket, defaultStatus, currentUser?.departmentId]);

  const set = <K extends keyof FormState>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value as FormState[K] }));

  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      departmentId: form.departmentId,
      priority: form.priority,
      category: form.category,
      assigneeId: form.assigneeId || undefined,
      status: form.status,
      assetTag: form.assetTag.trim() || undefined,
      dueDate: form.dueDate || undefined,
    };
    setSaving(true);
    if (ticket) {
      const res = await updateTicket(ticket.id, payload);
      setSaving(false);
      if (res.ok) onOpenChange(false);
    } else {
      // Solicitante vazio = registrado pelo próprio técnico (ex.: pedido por telefone)
      const res = await createTicket({ ...payload, requesterId: form.requesterId || undefined });
      setSaving(false);
      if (!res.ok) return; // erro exibido no aviso global
      onOpenChange(false);
      router.push(`/chamados/${res.id}`);
    }
  };

  const requesters = db.users.filter((u) => u.departmentId === form.departmentId && u.active && u.id !== currentUser?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={ticket ? `Editar demanda #${ticket.number}` : "Nova demanda"}
        description={ticket ? undefined : "Registre a solicitação e defina o responsável."}
        className="max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="ticket-form" disabled={saving}>
              {saving ? "Salvando…" : ticket ? "Salvar alterações" : "Abrir demanda"}
            </Button>
          </>
        }
      >
        <form id="ticket-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Título" htmlFor="t-title" className="sm:col-span-2">
            <Input id="t-title" required maxLength={200} value={form.title} onChange={set("title")} placeholder="Ex.: Impressora do RH não imprime" />
          </Field>
          <Field label="Descrição" htmlFor="t-desc" className="sm:col-span-2">
            <Textarea id="t-desc" rows={4} value={form.description} onChange={set("description")} placeholder="Detalhe o problema, local, equipamento e contato." />
          </Field>
          <Field label="Departamento solicitante" htmlFor="t-dep">
            <Select
              id="t-dep"
              required
              value={form.departmentId}
              onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value, requesterId: "" }))}
            >
              <option value="" disabled>
                Selecione…
              </option>
              {db.departments
                .filter((d) => d.active || d.id === form.departmentId)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.acronym} — {d.name}
                  </option>
                ))}
            </Select>
          </Field>
          {!ticket && (
            <Field label="Solicitante" htmlFor="t-requester">
              <Select id="t-requester" value={form.requesterId} onChange={set("requesterId")} disabled={!form.departmentId}>
                <option value="">Registrado por mim ({currentUser?.name.split(" ")[0]})</option>
                {requesters.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Técnico responsável" htmlFor="t-assignee">
            <Select id="t-assignee" value={form.assigneeId} onChange={set("assigneeId")}>
              <option value="">Sem responsável</option>
              {staff.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Categoria" htmlFor="t-cat">
            <Select id="t-cat" value={form.category} onChange={set("category")}>
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_META[c].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prioridade" htmlFor="t-pri">
            <Select id="t-pri" value={form.priority} onChange={set("priority")}>
              {PRIORITY_ORDER.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_META[p].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="t-status">
            <Select id="t-status" value={form.status} onChange={set("status")}>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </Select>
          </Field>
          <div className={ticket ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 gap-3 sm:col-span-2 sm:gap-4"}>
            <Field label="Patrimônio" htmlFor="t-asset">
              <Input id="t-asset" value={form.assetTag} onChange={set("assetTag")} placeholder="Opcional" />
            </Field>
            <Field label="Prazo" htmlFor="t-due">
              <Input id="t-due" type="date" value={form.dueDate} onChange={set("dueDate")} />
            </Field>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
