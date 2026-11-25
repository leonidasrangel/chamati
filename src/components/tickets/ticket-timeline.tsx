"use client";

import { ArrowRightLeft, ClipboardList, Lock, MessageSquare, Send, UserRound } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/misc";
import { useLookups, useStore } from "@/lib/store";
import type { CommentKind, Ticket } from "@/lib/types";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";

const EVENT_ICON: Record<Exclude<CommentKind, "COMMENT">, React.ElementType> = {
  STATUS_CHANGE: ArrowRightLeft,
  ASSIGNMENT: UserRound,
  CHECKLIST: ClipboardList,
  SYSTEM: MessageSquare,
};

export function TicketTimeline({ ticket, staffView }: { ticket: Ticket; staffView: boolean }) {
  const { db, addComment } = useStore();
  const { user } = useLookups();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);

  const items = db.comments
    .filter((c) => c.ticketId === ticket.id && (staffView || !c.isInternal))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    addComment(ticket.id, body.trim(), staffView && internal);
    setBody("");
    setInternal(false);
  };

  return (
    <Card>
      <CardHeader title="Atualizações" description="Comentários e histórico da demanda." />
      <ol className="px-5 py-4">
        {items.map((c, i) => {
          const author = user(c.authorId);
          const last = i === items.length - 1;
          if (c.kind !== "COMMENT") {
            const Icon = EVENT_ICON[c.kind];
            return (
              <li key={c.id} className="relative flex gap-3 pb-4">
                {!last && <span className="absolute left-[15px] top-8 h-[calc(100%-24px)] w-px bg-zinc-200" aria-hidden />}
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 ring-4 ring-white">
                  <Icon className="size-3.5" />
                </span>
                <p className="pt-1.5 text-[13px] text-zinc-600">
                  <span className="font-medium text-zinc-800">{author?.name ?? "Sistema"}</span> · {c.body}{" "}
                  <time className="text-xs text-zinc-400" title={formatDateTime(c.createdAt)}>
                    {timeAgo(c.createdAt)}
                  </time>
                </p>
              </li>
            );
          }
          return (
            <li key={c.id} className="relative flex gap-3 pb-4">
              {!last && <span className="absolute left-[15px] top-8 h-[calc(100%-24px)] w-px bg-zinc-200" aria-hidden />}
              <Avatar name={author?.name} className="ring-4 ring-white" />
              <div
                className={cn(
                  "min-w-0 flex-1 rounded-lg border px-3 py-2.5",
                  c.isInternal ? "border-amber-200 bg-amber-50/60" : "border-zinc-200 bg-white",
                )}
              >
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
                  <span className="font-medium text-zinc-800">{author?.name ?? "—"}</span>
                  <time title={formatDateTime(c.createdAt)}>{timeAgo(c.createdAt)}</time>
                  {c.isInternal && (
                    <span className="inline-flex items-center gap-1 font-medium text-amber-800">
                      <Lock className="size-3" /> Nota interna
                    </span>
                  )}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-5 text-zinc-800">{c.body}</p>
              </div>
            </li>
          );
        })}
        {items.length === 0 && <li className="py-4 text-center text-sm text-zinc-500">Sem atualizações ainda.</li>}
      </ol>

      <form onSubmit={submit} className="border-t border-zinc-100 px-5 py-4">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={staffView ? "Escreva uma atualização para o solicitante ou uma nota interna…" : "Escreva uma mensagem para a equipe de TI…"}
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(e);
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          {staffView ? (
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-zinc-600">
              <Checkbox checked={internal} onCheckedChange={(v) => setInternal(v === true)} />
              Nota interna (visível só para a TI)
            </label>
          ) : (
            <span className="text-xs text-zinc-400">Ctrl + Enter para enviar</span>
          )}
          <Button type="submit" size="sm" disabled={!body.trim()}>
            <Send /> Enviar
          </Button>
        </div>
      </form>
    </Card>
  );
}
