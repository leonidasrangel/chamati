"use client";

import { ClipboardList, Link2, ListChecks, Unlink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { Checkbox, EmptyState, ProgressBar } from "@/components/ui/misc";
import { useLookups, useStore } from "@/lib/store";
import type { Ticket } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

export function TicketChecklists({ ticket, readOnly }: { ticket: Ticket; readOnly?: boolean }) {
  const { db, attachChecklist, detachChecklist, toggleChecklistItem } = useStore();
  const { user } = useLookups();
  const attached = db.ticketChecklists.filter((c) => c.ticketId === ticket.id);
  const available = db.checklists.filter((c) => !attached.some((a) => a.checklistId === c.id));
  // Sugere primeiro os modelos da mesma categoria da demanda
  const sorted = [...available].sort((a, b) => Number(b.category === ticket.category) - Number(a.category === ticket.category));
  const [selected, setSelected] = useState("");

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <ListChecks className="size-4 text-zinc-400" /> Checklists da demanda
          </span>
        }
        description={readOnly ? "Etapas executadas pela equipe de TI." : "Vincule um modelo e marque os itens conforme executa."}
      />

      {!readOnly && (
        <div className="flex flex-col gap-2 border-b border-zinc-100 px-5 py-3 sm:flex-row">
          <Select value={selected} onChange={(e) => setSelected(e.target.value)} className="flex-1" aria-label="Modelo de checklist">
            <option value="">Selecione um modelo de checklist…</option>
            {sorted.map((c) => (
              <option key={c.id} value={c.id}>
                {c.category === ticket.category ? "★ " : ""}
                {c.title} ({c.items.length} itens)
              </option>
            ))}
          </Select>
          <Button
            variant="outline"
            disabled={!selected}
            onClick={() => {
              attachChecklist(ticket.id, selected);
              setSelected("");
            }}
          >
            <Link2 /> Vincular
          </Button>
        </div>
      )}

      {attached.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title="Nenhum checklist vinculado"
          description={readOnly ? undefined : "Modelos marcados com ★ são da mesma categoria desta demanda."}
          className="py-8"
        />
      ) : (
        <div className="divide-y divide-zinc-100">
          {attached.map((tc) => {
            const done = tc.items.filter((i) => i.done).length;
            const pct = tc.items.length ? (done / tc.items.length) * 100 : 0;
            return (
              <div key={tc.id} className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900">{tc.title}</p>
                  <span className="text-xs tabular-nums text-zinc-500">
                    {done}/{tc.items.length} · {Math.round(pct)}%
                  </span>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-7 text-zinc-400"
                      aria-label="Desvincular checklist"
                      title="Desvincular checklist"
                      onClick={() => confirm(`Desvincular "${tc.title}"? O progresso marcado será perdido.`) && detachChecklist(tc.id)}
                    >
                      <Unlink />
                    </Button>
                  )}
                </div>
                <ProgressBar value={pct} className="mt-2" />
                <ul className="mt-3 space-y-0.5">
                  {tc.items.map((item) => {
                    const by = user(item.doneById);
                    return (
                      <li key={item.id}>
                        <label
                          className={cn(
                            "flex items-start gap-3 rounded-md px-2 py-1.5",
                            !readOnly && "cursor-pointer hover:bg-zinc-50",
                          )}
                        >
                          <Checkbox
                            className="mt-0.5"
                            checked={item.done}
                            disabled={readOnly}
                            onCheckedChange={() => toggleChecklistItem(tc.id, item.id)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className={cn("block text-[13px] leading-5", item.done ? "text-zinc-400 line-through" : "text-zinc-800")}>
                              {item.label}
                            </span>
                            {item.hint && !item.done && <span className="block text-xs text-zinc-500">{item.hint}</span>}
                            {item.done && item.doneAt && (
                              <span className="block text-[11px] text-zinc-400">
                                {by?.name ?? "—"} · {formatDateTime(item.doneAt)}
                              </span>
                            )}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
