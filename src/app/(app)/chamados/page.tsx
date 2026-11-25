"use client";

import { Funnel, Plus, Search, SquareKanban, Table2, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { KanbanBoard } from "@/components/tickets/kanban-board";
import { TicketFormDialog } from "@/components/tickets/ticket-form-dialog";
import { TicketTable } from "@/components/tickets/ticket-table";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { EmptyState, PageHeader, Segmented } from "@/components/ui/misc";
import { CATEGORY_META, CATEGORY_ORDER, PRIORITY_META, PRIORITY_ORDER, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { useStore } from "@/lib/store";
import type { Ticket, TicketStatus } from "@/lib/types";
import { normalize } from "@/lib/utils";

type View = "kanban" | "table";
const VIEW_KEY = "chamati:tickets-view";

const emptyFilters = { q: "", department: "", status: "", priority: "", category: "", assignee: "", from: "", to: "" };

export default function TicketsPage() {
  return (
    <Suspense>
      <TicketsContent />
    </Suspense>
  );
}

function TicketsContent() {
  const { db, currentUser, deleteTicket } = useStore();
  const params = useSearchParams();
  const [view, setView] = useState<View>("kanban");
  const [filters, setFilters] = useState(() => ({
    ...emptyFilters,
    status: params.get("status") ?? "",
    priority: params.get("priority") ?? "",
    department: params.get("department") ?? "",
    category: params.get("category") ?? "",
    assignee: params.get("assignee") ?? "",
  }));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Ticket | undefined>();
  const [defaultStatus, setDefaultStatus] = useState<TicketStatus | undefined>();

  useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY) as View | null;
    if (params.get("view") === "table" || params.get("view") === "kanban") setView(params.get("view") as View);
    else if (saved) setView(saved);
  }, [params]);

  const changeView = (v: View) => {
    setView(v);
    localStorage.setItem(VIEW_KEY, v);
  };

  const set = (k: keyof typeof filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilters((f) => ({ ...f, [k]: e.target.value }));

  const filtered = useMemo(() => {
    const q = normalize(filters.q.trim());
    const from = filters.from ? new Date(filters.from + "T00:00:00").getTime() : -Infinity;
    const to = filters.to ? new Date(filters.to + "T23:59:59").getTime() : Infinity;
    return db.tickets.filter((t) => {
      if (q && !normalize(`#${t.number} ${t.title} ${t.description} ${t.assetTag ?? ""}`).includes(q)) return false;
      if (filters.department && t.departmentId !== filters.department) return false;
      if (filters.status && t.status !== filters.status) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.category && t.category !== filters.category) return false;
      if (filters.assignee === "me" && t.assigneeId !== currentUser?.id) return false;
      if (filters.assignee === "none" && t.assigneeId) return false;
      if (filters.assignee && !["me", "none"].includes(filters.assignee) && t.assigneeId !== filters.assignee) return false;
      const created = new Date(t.createdAt).getTime();
      return created >= from && created <= to;
    });
  }, [db.tickets, filters, currentUser?.id]);

  const activeFilters = Object.entries(filters).filter(([, v]) => v).length;

  const openCreate = (status?: TicketStatus) => {
    setEditing(undefined);
    setDefaultStatus(status);
    setFormOpen(true);
  };
  const openEdit = (t: Ticket) => {
    setEditing(t);
    setFormOpen(true);
  };
  const remove = (t: Ticket) => {
    if (confirm(`Excluir a demanda #${t.number}? Esta ação não pode ser desfeita.`)) deleteTicket(t.id);
  };

  return (
    <>
      <PageHeader
        title="Chamados / Demandas"
        description="Acompanhe as solicitações de todos os departamentos."
        actions={
          <>
            <Segmented
              value={view}
              onChange={changeView}
              options={[
                { value: "kanban", label: "Kanban", icon: <SquareKanban /> },
                { value: "table", label: "Tabela", icon: <Table2 /> },
              ]}
            />
            <Button onClick={() => openCreate()}>
              <Plus /> Nova demanda
            </Button>
          </>
        }
      />

      {/* Filtros — uma única linha acima da visualização */}
      <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-3 shadow-xs">
        <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap [&>*]:lg:w-44">
          <div className="relative sm:col-span-2 lg:min-w-64 lg:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input value={filters.q} onChange={set("q")} placeholder="Buscar por nº, título, patrimônio…" className="pl-9" aria-label="Buscar demandas" />
          </div>
          <Select value={filters.department} onChange={set("department")} aria-label="Departamento">
            <option value="">Todos os deptos.</option>
            {db.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.acronym} — {d.name}
              </option>
            ))}
          </Select>
          <Select value={filters.status} onChange={set("status")} aria-label="Status">
            <option value="">Todos os status</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </Select>
          <Select value={filters.priority} onChange={set("priority")} aria-label="Prioridade">
            <option value="">Todas prioridades</option>
            {PRIORITY_ORDER.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_META[p].label}
              </option>
            ))}
          </Select>
          <Select value={filters.category} onChange={set("category")} aria-label="Categoria">
            <option value="">Todas categorias</option>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_META[c].label}
              </option>
            ))}
          </Select>
          <Select value={filters.assignee} onChange={set("assignee")} aria-label="Responsável">
            <option value="">Qualquer responsável</option>
            <option value="me">Atribuídas a mim</option>
            <option value="none">Sem responsável</option>
            {db.users
              .filter((u) => u.role !== "SOLICITANTE")
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </Select>
          <div className="flex items-center gap-1.5 sm:col-span-2 lg:!w-auto">
            <span className="shrink-0 text-xs text-zinc-500">Abertura</span>
            <Input type="date" value={filters.from} onChange={set("from")} aria-label="Aberta a partir de" className="min-w-0 lg:w-36" />
            <span className="text-xs text-zinc-400">até</span>
            <Input type="date" value={filters.to} onChange={set("to")} aria-label="Aberta até" className="min-w-0 lg:w-36" />
          </div>
          <Button variant="ghost" onClick={() => setFilters(emptyFilters)} disabled={!activeFilters} className="text-zinc-500 lg:!w-auto">
            <X /> Limpar
          </Button>
        </div>
        {activeFilters > 0 && (
          <p className="mt-2 flex items-center gap-1.5 px-1 text-xs text-zinc-500">
            <Funnel className="size-3" />
            {filtered.length} de {db.tickets.length} demandas · {activeFilters} {activeFilters === 1 ? "filtro ativo" : "filtros ativos"}
          </p>
        )}
      </div>

      {filtered.length === 0 && activeFilters > 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white">
          <EmptyState
            icon={<Funnel />}
            title="Nenhuma demanda encontrada"
            description="Ajuste ou limpe os filtros para ver mais resultados."
            action={
              <Button variant="outline" onClick={() => setFilters(emptyFilters)}>
                Limpar filtros
              </Button>
            }
          />
        </div>
      ) : view === "kanban" ? (
        <KanbanBoard tickets={filtered} onEdit={openEdit} onCreate={openCreate} />
      ) : (
        <TicketTable tickets={filtered} onEdit={openEdit} onDelete={remove} />
      )}

      <TicketFormDialog open={formOpen} onOpenChange={setFormOpen} ticket={editing} defaultStatus={defaultStatus} />
    </>
  );
}
