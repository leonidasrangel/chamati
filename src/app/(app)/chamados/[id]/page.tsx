"use client";

import { ArrowLeft, Pencil, SearchX, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusStepper } from "@/components/tickets/status-stepper";
import { TicketChecklists } from "@/components/tickets/ticket-checklists";
import { TicketFormDialog } from "@/components/tickets/ticket-form-dialog";
import { TicketTimeline } from "@/components/tickets/ticket-timeline";
import { Avatar, CategoryBadge, PriorityBadge, StatusBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/misc";
import { PRIORITY_META, PRIORITY_ORDER, STATUS_META, STATUS_ORDER, isStaff } from "@/lib/constants";
import { useLookups, useStore } from "@/lib/store";
import type { TicketPriority, TicketStatus } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { db, currentUser, updateTicket, deleteTicket } = useStore();
  const { department, user, staff } = useLookups();
  const [editOpen, setEditOpen] = useState(false);
  const ticket = db.tickets.find((t) => t.id === id);
  const staffView = isStaff(currentUser?.role);
  const [waitingReason, setWaitingReason] = useState(ticket?.waitingReason ?? "");

  useEffect(() => setWaitingReason(ticket?.waitingReason ?? ""), [ticket?.waitingReason]);

  const backHref = staffView ? "/chamados" : "/meus-chamados";

  if (!ticket || (!staffView && ticket.requesterId !== currentUser?.id)) {
    return (
      <Card>
        <EmptyState
          icon={<SearchX />}
          title="Demanda não encontrada"
          description="Ela pode ter sido excluída ou você não tem acesso a ela."
          action={
            <Link href={backHref}>
              <Button variant="outline">Voltar</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  const dep = department(ticket.departmentId);
  const requester = user(ticket.requesterId);
  const assignee = user(ticket.assigneeId);

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="grid grid-cols-[110px_1fr] items-center gap-3 py-2">
      <dt className="text-[13px] text-zinc-500">{label}</dt>
      <dd className="min-w-0 text-[13px] text-zinc-900">{children}</dd>
    </div>
  );

  return (
    <>
      <Link href={backHref} className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> {staffView ? "Chamados" : "Meus chamados"}
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium tabular-nums text-zinc-400">#{ticket.number}</span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <CategoryBadge category={ticket.category} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">{ticket.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Aberta por {requester?.name ?? "—"} ({dep?.acronym}) em {formatDateTime(ticket.createdAt)}
          </p>
        </div>
        {staffView && (
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil /> Editar
            </Button>
            <Button
              variant="outline"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => {
                if (confirm(`Excluir a demanda #${ticket.number}? Esta ação não pode ser desfeita.`)) {
                  deleteTicket(ticket.id);
                  router.replace("/chamados");
                }
              }}
              aria-label="Excluir demanda"
            >
              <Trash2 />
            </Button>
          </div>
        )}
      </div>

      {!staffView && (
        <Card className="mb-6 px-5 py-5">
          <StatusStepper status={ticket.status} />
          {ticket.status === "AGUARDANDO" && ticket.waitingReason && (
            <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-[13px] text-amber-900 ring-1 ring-amber-200">
              Pendência: {ticket.waitingReason}
            </p>
          )}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 content-start gap-6">
          <Card>
            <CardHeader title="Descrição" />
            <CardBody>
              <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                {ticket.description || <span className="italic text-zinc-400">Sem descrição.</span>}
              </p>
            </CardBody>
          </Card>

          {(staffView || db.ticketChecklists.some((c) => c.ticketId === ticket.id)) && (
            <TicketChecklists ticket={ticket} readOnly={!staffView} />
          )}

          <TicketTimeline ticket={ticket} staffView={staffView} />
        </div>

        <aside className="grid content-start gap-6">
          <Card>
            <CardHeader title="Detalhes" />
            <CardBody className="py-2">
              <dl className="divide-y divide-zinc-100">
                {staffView ? (
                  <>
                    <Row label="Status">
                      <Select
                        value={ticket.status}
                        onChange={(e) => updateTicket(ticket.id, { status: e.target.value as TicketStatus })}
                        aria-label="Status"
                      >
                        {STATUS_ORDER.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_META[s].label}
                          </option>
                        ))}
                      </Select>
                    </Row>
                    {ticket.status === "AGUARDANDO" && (
                      <Row label="Aguardando">
                        <Input
                          value={waitingReason}
                          onChange={(e) => setWaitingReason(e.target.value)}
                          onBlur={() =>
                            waitingReason !== (ticket.waitingReason ?? "") &&
                            updateTicket(ticket.id, { waitingReason: waitingReason.trim() || undefined })
                          }
                          placeholder="Peça, retorno do usuário…"
                          aria-label="Motivo da espera"
                        />
                      </Row>
                    )}
                    <Row label="Prioridade">
                      <Select
                        value={ticket.priority}
                        onChange={(e) => updateTicket(ticket.id, { priority: e.target.value as TicketPriority })}
                        aria-label="Prioridade"
                      >
                        {PRIORITY_ORDER.map((p) => (
                          <option key={p} value={p}>
                            {PRIORITY_META[p].label}
                          </option>
                        ))}
                      </Select>
                    </Row>
                    <Row label="Responsável">
                      <Select
                        value={ticket.assigneeId ?? ""}
                        onChange={(e) => updateTicket(ticket.id, { assigneeId: e.target.value || undefined })}
                        aria-label="Técnico responsável"
                      >
                        <option value="">Sem responsável</option>
                        {staff.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </Select>
                    </Row>
                  </>
                ) : (
                  <Row label="Responsável">
                    {assignee ? (
                      <span className="flex items-center gap-2">
                        <Avatar name={assignee.name} size="sm" /> {assignee.name}
                      </span>
                    ) : (
                      <span className="text-zinc-400">Aguardando triagem</span>
                    )}
                  </Row>
                )}
                <Row label="Departamento">
                  <span title={dep?.name}>
                    {dep?.acronym} — {dep?.name}
                  </span>
                </Row>
                <Row label="Solicitante">
                  <span className="flex items-center gap-2">
                    <Avatar name={requester?.name} size="sm" />
                    <span className="truncate">{requester?.name ?? "—"}</span>
                  </span>
                </Row>
                <Row label="Categoria">
                  <CategoryBadge category={ticket.category} />
                </Row>
                {ticket.assetTag && <Row label="Patrimônio">{ticket.assetTag}</Row>}
                {ticket.dueDate && <Row label="Prazo">{formatDate(ticket.dueDate + "T12:00:00")}</Row>}
                <Row label="Atualizada">{formatDateTime(ticket.updatedAt)}</Row>
                {ticket.closedAt && <Row label="Concluída">{formatDateTime(ticket.closedAt)}</Row>}
              </dl>
            </CardBody>
          </Card>

          {staffView && dep && (
            <Card>
              <CardHeader title="Contato do setor" />
              <CardBody className="space-y-1 text-[13px] text-zinc-600">
                <p className="font-medium text-zinc-900">{dep.name}</p>
                {dep.managerName && <p>Responsável: {dep.managerName}</p>}
                {dep.extension && <p>Ramal: {dep.extension}</p>}
                {dep.location && <p>{dep.location}</p>}
                {requester?.email && <p className="truncate">{requester.email}</p>}
              </CardBody>
            </Card>
          )}
        </aside>
      </div>

      {staffView && <TicketFormDialog open={editOpen} onOpenChange={setEditOpen} ticket={ticket} />}
    </>
  );
}
