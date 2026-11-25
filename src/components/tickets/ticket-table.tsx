"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Ellipsis, ExternalLink, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Avatar, CategoryBadge, PriorityBadge, StatusBadge } from "@/components/ui/badges";
import { DropdownContent, DropdownItem, DropdownMenu, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { PRIORITY_META, STATUS_ORDER } from "@/lib/constants";
import { useLookups } from "@/lib/store";
import type { Ticket } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type SortKey = "number" | "title" | "department" | "category" | "priority" | "status" | "assignee" | "createdAt";

export function TicketTable({
  tickets,
  onEdit,
  onDelete,
}: {
  tickets: Ticket[];
  onEdit: (t: Ticket) => void;
  onDelete: (t: Ticket) => void;
}) {
  const { department, user } = useLookups();
  const router = useRouter();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "createdAt", dir: -1 });
  const [page, setPage] = useState(0);
  const pageSize = 12;

  const sorted = useMemo(() => {
    const val = (t: Ticket): string | number => {
      switch (sort.key) {
        case "number": return t.number;
        case "title": return t.title.toLowerCase();
        case "department": return department(t.departmentId)?.acronym ?? "";
        case "category": return t.category;
        case "priority": return PRIORITY_META[t.priority].weight;
        case "status": return STATUS_ORDER.indexOf(t.status);
        case "assignee": return user(t.assigneeId)?.name ?? "~";
        case "createdAt": return t.createdAt;
      }
    };
    return [...tickets].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);
  }, [tickets, sort, department, user]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages - 1);
  const rows = sorted.slice(current * pageSize, current * pageSize + pageSize);

  const Th = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => {
    const active = sort.key === k;
    const Icon = !active ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
    return (
      <th scope="col" className={cn("px-3 py-2.5 text-left font-medium", className)} aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
        <button
          className={cn("inline-flex items-center gap-1 hover:text-zinc-900", active && "text-zinc-900")}
          onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((s.dir * -1) as 1 | -1) : 1 }))}
        >
          {children}
          <Icon className={cn("size-3", !active && "text-zinc-300")} />
        </button>
      </th>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50/80 text-xs text-zinc-500">
            <tr>
              <Th k="number" className="w-20">Nº</Th>
              <Th k="title">Título</Th>
              <Th k="department">Depto.</Th>
              <Th k="category">Categoria</Th>
              <Th k="priority">Prioridade</Th>
              <Th k="status">Status</Th>
              <Th k="assignee">Responsável</Th>
              <Th k="createdAt">Abertura</Th>
              <th className="w-10" aria-label="Ações" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((t) => {
              const assignee = user(t.assigneeId);
              return (
                <tr
                  key={t.id}
                  onClick={() => router.push(`/chamados/${t.id}`)}
                  className="cursor-pointer transition-colors hover:bg-zinc-50"
                >
                  <td className="px-3 py-2.5 tabular-nums text-zinc-500">#{t.number}</td>
                  <td className="max-w-[340px] px-3 py-2.5">
                    <Link href={`/chamados/${t.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-zinc-900 hover:underline">
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-600" title={department(t.departmentId)?.name}>
                      {department(t.departmentId)?.acronym}
                    </span>
                  </td>
                  <td className="px-3 py-2.5"><CategoryBadge category={t.category} /></td>
                  <td className="px-3 py-2.5"><PriorityBadge priority={t.priority} /></td>
                  <td className="px-3 py-2.5"><StatusBadge status={t.status} /></td>
                  <td className="px-3 py-2.5">
                    {assignee ? (
                      <span className="flex items-center gap-2 text-[13px] text-zinc-700">
                        <Avatar name={assignee.name} size="sm" />
                        <span className="truncate">{assignee.name}</span>
                      </span>
                    ) : (
                      <span className="text-[13px] italic text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-[13px] text-zinc-500">{formatDate(t.createdAt)}</td>
                  <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownTrigger asChild>
                        <button className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label={`Ações da demanda #${t.number}`}>
                          <Ellipsis className="size-4" />
                        </button>
                      </DropdownTrigger>
                      <DropdownContent>
                        <DropdownItem onSelect={() => router.push(`/chamados/${t.id}`)}>
                          <ExternalLink /> Abrir
                        </DropdownItem>
                        <DropdownItem onSelect={() => onEdit(t)}>
                          <Pencil /> Editar
                        </DropdownItem>
                        <DropdownSeparator />
                        <DropdownItem danger onSelect={() => onDelete(t)}>
                          <Trash2 /> Excluir
                        </DropdownItem>
                      </DropdownContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-2.5 text-xs text-zinc-500">
        <span>
          {sorted.length === 0
            ? "0 demandas"
            : `${current * pageSize + 1}–${Math.min(sorted.length, (current + 1) * pageSize)} de ${sorted.length} demandas`}
        </span>
        <div className="flex items-center gap-1">
          <button className="rounded-md px-2 py-1 hover:bg-zinc-100 disabled:opacity-40" disabled={current === 0} onClick={() => setPage(current - 1)}>
            Anterior
          </button>
          <span className="tabular-nums">
            {current + 1}/{pages}
          </span>
          <button className="rounded-md px-2 py-1 hover:bg-zinc-100 disabled:opacity-40" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
