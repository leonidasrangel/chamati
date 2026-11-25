"use client";

import { ArrowRight, Ellipsis, ListChecks, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, CategoryBadge, PriorityBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownContent, DropdownItem, DropdownLabel, DropdownMenu, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { Field, Input } from "@/components/ui/form";
import { STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { useLookups, useStore } from "@/lib/store";
import type { Ticket, TicketStatus } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

export function KanbanBoard({
  tickets,
  onEdit,
  onCreate,
}: {
  tickets: Ticket[];
  onEdit: (t: Ticket) => void;
  onCreate: (status: TicketStatus) => void;
}) {
  const { updateTicket } = useStore();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TicketStatus | null>(null);
  const [waiting, setWaiting] = useState<{ ticketId: string; reason: string } | null>(null);

  const move = (ticketId: string, status: TicketStatus) => {
    const t = tickets.find((x) => x.id === ticketId);
    if (!t || t.status === status) return;
    if (status === "AGUARDANDO") setWaiting({ ticketId, reason: "" });
    else updateTicket(ticketId, { status });
  };

  return (
    <>
      <div className="scroll-thin -mx-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0">
        <div className="grid min-w-[1040px] grid-cols-4 gap-4">
          {STATUS_ORDER.map((status) => {
            const col = tickets.filter((t) => t.status === status);
            const meta = STATUS_META[status];
            return (
              <section
                key={status}
                aria-label={meta.label}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverCol(status);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain") || dragId;
                  if (id) move(id, status);
                  setOverCol(null);
                  setDragId(null);
                }}
                className={cn(
                  "flex min-h-[420px] flex-col rounded-xl border border-zinc-200 bg-zinc-100/60 transition-colors",
                  overCol === status && "border-blue-300 bg-blue-50/60",
                )}
              >
                <header className="flex items-center gap-2 px-3 pb-2 pt-3">
                  <span className={cn("size-2 rounded-full", meta.dot)} aria-hidden />
                  <h3 className="text-[13px] font-semibold text-zinc-800">{meta.label}</h3>
                  <span className="rounded bg-white px-1.5 text-xs tabular-nums text-zinc-500 ring-1 ring-zinc-200">{col.length}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="ml-auto size-7 text-zinc-400"
                    onClick={() => onCreate(status)}
                    aria-label={`Nova demanda em ${meta.label}`}
                  >
                    <Plus />
                  </Button>
                </header>
                <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
                  {col.map((t) => (
                    <KanbanCard
                      key={t.id}
                      ticket={t}
                      dragging={dragId === t.id}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", t.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragId(t.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverCol(null);
                      }}
                      onMove={(s) => move(t.id, s)}
                      onEdit={() => onEdit(t)}
                    />
                  ))}
                  {col.length === 0 && (
                    <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-300 px-3 py-8 text-center text-xs text-zinc-400">
                      Arraste demandas para cá
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <Dialog open={!!waiting} onOpenChange={(o) => !o && setWaiting(null)}>
        <DialogContent
          title="Mover para Aguardando"
          description="Informe o que está pendente (peça, retorno do usuário, licença…)."
          footer={
            <>
              <Button variant="outline" onClick={() => setWaiting(null)}>
                Cancelar
              </Button>
              <Button type="submit" form="waiting-form">
                Mover
              </Button>
            </>
          }
        >
          <form
            id="waiting-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!waiting) return;
              updateTicket(waiting.ticketId, { status: "AGUARDANDO", waitingReason: waiting.reason.trim() || undefined });
              setWaiting(null);
            }}
          >
            <Field label="Motivo da espera" htmlFor="waiting-reason">
              <Input
                id="waiting-reason"
                autoFocus
                value={waiting?.reason ?? ""}
                onChange={(e) => setWaiting((w) => (w ? { ...w, reason: e.target.value } : w))}
                placeholder="Ex.: Aguardando chegada do toner"
              />
            </Field>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function KanbanCard({
  ticket: t,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
  onEdit,
}: {
  ticket: Ticket;
  dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onMove: (s: TicketStatus) => void;
  onEdit: () => void;
}) {
  const { db } = useStore();
  const { department, user } = useLookups();
  const assignee = user(t.assigneeId);
  const checklists = db.ticketChecklists.filter((c) => c.ticketId === t.id);
  const total = checklists.reduce((a, c) => a + c.items.length, 0);
  const done = checklists.reduce((a, c) => a + c.items.filter((i) => i.done).length, 0);

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative cursor-grab rounded-lg border border-zinc-200 bg-white p-3 shadow-xs transition hover:border-zinc-300 hover:shadow-sm active:cursor-grabbing",
        dragging && "opacity-40",
        t.priority === "CRITICA" && t.status !== "CONCLUIDO" && "border-l-2 border-l-red-500",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium tabular-nums text-zinc-400">#{t.number}</span>
        <PriorityBadge priority={t.priority} />
        <DropdownMenu>
          <DropdownTrigger asChild>
            <button
              className="relative z-10 ml-auto rounded p-0.5 text-zinc-400 opacity-100 hover:bg-zinc-100 hover:text-zinc-700 sm:opacity-0 sm:group-hover:opacity-100 data-[state=open]:opacity-100"
              aria-label="Ações da demanda"
            >
              <Ellipsis className="size-4" />
            </button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem onSelect={onEdit}>
              <Pencil /> Editar
            </DropdownItem>
            <DropdownSeparator />
            <DropdownLabel>Mover para</DropdownLabel>
            {STATUS_ORDER.filter((s) => s !== t.status).map((s) => (
              <DropdownItem key={s} onSelect={() => onMove(s)}>
                <ArrowRight /> {STATUS_META[s].label}
              </DropdownItem>
            ))}
          </DropdownContent>
        </DropdownMenu>
      </div>

      <Link href={`/chamados/${t.id}`} className="mt-2 block text-[13px] font-medium leading-5 text-zinc-900 after:absolute after:inset-0 hover:underline" draggable={false}>
        <span className="line-clamp-2">{t.title}</span>
      </Link>

      {t.status === "AGUARDANDO" && t.waitingReason && (
        <p className="mt-1.5 line-clamp-2 text-xs text-amber-800">{t.waitingReason}</p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-600">{department(t.departmentId)?.acronym}</span>
        <CategoryBadge category={t.category} />
      </div>

      {total > 0 && (
        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-zinc-500">
          <ListChecks className="size-3.5" />
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-viz-track">
            <div className={cn("h-full rounded-full", done === total ? "bg-emerald-500" : "bg-viz-1")} style={{ width: `${(done / total) * 100}%` }} />
          </div>
          <span className="tabular-nums">
            {done}/{total}
          </span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2.5">
        <span className="text-[11px] text-zinc-400">{timeAgo(t.updatedAt)}</span>
        {assignee ? (
          <span className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            {assignee.name.split(" ")[0]}
            <Avatar name={assignee.name} size="sm" />
          </span>
        ) : (
          <span className="text-[11px] italic text-zinc-400">Sem responsável</span>
        )}
      </div>
    </article>
  );
}
