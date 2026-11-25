"use client";

import { ArrowRight, CircleCheck, Flame, Inbox, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BarList, SegmentedBar, StatTile } from "@/components/dashboard/charts";
import { TicketFormDialog } from "@/components/tickets/ticket-form-dialog";
import { Avatar, PriorityBadge, StatusBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { CATEGORY_META, CATEGORY_ORDER, PRIORITY_META, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { useLookups, useStore } from "@/lib/store";
import type { Ticket } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

const DAY = 24 * 3600_000;

export default function DashboardPage() {
  const { db, currentUser } = useStore();
  const { department, user } = useLookups();
  const [formOpen, setFormOpen] = useState(false);

  const stats = useMemo(() => {
    const open = db.tickets.filter((t) => t.status !== "CONCLUIDO");
    const since30 = Date.now() - 30 * DAY;
    const closed30 = db.tickets.filter((t) => t.closedAt && new Date(t.closedAt).getTime() >= since30);
    const created30 = db.tickets.filter((t) => new Date(t.createdAt).getTime() >= since30);
    const avgHours =
      closed30.length > 0
        ? closed30.reduce((a, t) => a + (new Date(t.closedAt!).getTime() - new Date(t.createdAt).getTime()), 0) / closed30.length / 3600_000
        : 0;
    return {
      open,
      critical: open.filter((t) => t.priority === "CRITICA"),
      unassigned: open.filter((t) => !t.assigneeId),
      mine: open
        .filter((t) => t.assigneeId === currentUser?.id)
        .sort((a, b) => PRIORITY_META[b.priority].weight - PRIORITY_META[a.priority].weight),
      closed30,
      created30,
      avgDays: avgHours / 24,
    };
  }, [db.tickets, currentUser?.id]);

  const byDepartment = db.departments
    .map((d) => {
      const all = db.tickets.filter((t) => t.departmentId === d.id);
      const open = all.filter((t) => t.status !== "CONCLUIDO").length;
      return {
        key: d.id,
        label: d.acronym,
        sublabel: d.name,
        value: open,
        detail: `${open} em aberto · ${all.length} no total`,
        href: `/chamados?department=${d.id}&view=table`,
      };
    })
    .sort((a, b) => b.value - a.value);

  const byCategory = CATEGORY_ORDER.map((c) => {
    const n = stats.created30.filter((t) => t.category === c).length;
    return { key: c, label: CATEGORY_META[c].label, value: n, detail: `${n} abertas nos últimos 30 dias`, href: `/chamados?category=${c}&view=table` };
  }).sort((a, b) => b.value - a.value);

  const segments = STATUS_ORDER.map((s) => ({
    key: s,
    label: STATUS_META[s].short,
    value: db.tickets.filter((t) => t.status === s).length,
    color: STATUS_META[s].fill,
    href: `/chamados?status=${s}&view=table`,
  }));

  const recent = [...db.tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const firstName = currentUser?.name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Olá, ${firstName}`}
        description="Visão geral das demandas de TI de todos os departamentos."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus /> Nova demanda
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Demandas em aberto"
          value={stats.open.length}
          icon={<Inbox />}
          hint={`${segments[0].value} a fazer · ${segments[1].value} em andamento · ${segments[2].value} aguardando`}
          href="/chamados"
        />
        <StatTile
          label="Críticas em aberto"
          value={stats.critical.length}
          icon={<Flame />}
          tone={stats.critical.length ? "critical" : "default"}
          hint={stats.critical.length ? "Requerem atendimento imediato" : "Nenhuma no momento"}
          href="/chamados?priority=CRITICA&view=table"
        />
        <StatTile
          label="Sem responsável"
          value={stats.unassigned.length}
          icon={<UserRound />}
          hint="Aguardando triagem da TI"
          href="/chamados?assignee=none&view=table"
        />
        <StatTile
          label="Concluídas (30 dias)"
          value={stats.closed30.length}
          icon={<CircleCheck />}
          hint={stats.closed30.length ? `Tempo médio de solução: ${stats.avgDays.toFixed(1).replace(".", ",")} dias` : "—"}
          href="/chamados?status=CONCLUIDO&view=table"
        />
      </div>

      <Card className="mt-4">
        <CardBody>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Distribuição por status</h2>
            <span className="text-xs text-zinc-500">{db.tickets.length} demandas no total</span>
          </div>
          <SegmentedBar segments={segments} />
        </CardBody>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Demandas em aberto por departamento" description="Clique em um departamento para filtrar." />
          <CardBody>
            <BarList data={byDepartment} emptyLabel="Nenhuma demanda em aberto" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Demandas abertas por categoria" description="Últimos 30 dias." />
          <CardBody>
            <BarList data={byCategory} emptyLabel="Nenhuma demanda nos últimos 30 dias" />
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Demandas recentes"
            action={
              <Link href="/chamados?view=table" className="inline-flex items-center gap-1 text-[13px] font-medium text-zinc-600 hover:text-zinc-900">
                Ver todas <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          <ul className="divide-y divide-zinc-100">
            {recent.map((t) => (
              <TicketRow key={t.id} ticket={t} meta={`${department(t.departmentId)?.acronym} · ${timeAgo(t.createdAt)}`} assigneeName={user(t.assigneeId)?.name} />
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Atribuídas a mim" description={`${stats.mine.length} em aberto`} />
          {stats.mine.length === 0 ? (
            <EmptyState icon={<CircleCheck />} title="Tudo em dia" description="Nenhuma demanda aberta atribuída a você." className="py-10" />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {stats.mine.slice(0, 6).map((t) => (
                <TicketRow key={t.id} ticket={t} meta={`${department(t.departmentId)?.acronym} · atualizada ${timeAgo(t.updatedAt)}`} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      <TicketFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </>
  );
}

function TicketRow({ ticket: t, meta, assigneeName }: { ticket: Ticket; meta: string; assigneeName?: string }) {
  return (
    <li>
      <Link href={`/chamados/${t.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-zinc-50">
        <span className="w-11 shrink-0 text-xs tabular-nums text-zinc-400">#{t.number}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-zinc-900">{t.title}</span>
          <span className="block truncate text-xs text-zinc-500">{meta}</span>
        </span>
        <span className="hidden sm:inline-flex">
          <PriorityBadge priority={t.priority} />
        </span>
        <StatusBadge status={t.status} />
        {assigneeName !== undefined && <Avatar name={assigneeName} size="sm" className="hidden md:inline-flex" />}
      </Link>
    </li>
  );
}
