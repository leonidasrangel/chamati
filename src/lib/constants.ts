import type { TicketCategory, TicketPriority, TicketStatus, UserRole } from "./types";

export const STATUS_ORDER: TicketStatus[] = ["A_FAZER", "EM_ANDAMENTO", "AGUARDANDO", "CONCLUIDO"];

export const STATUS_META: Record<
  TicketStatus,
  { label: string; short: string; dot: string; badge: string; fill: string }
> = {
  A_FAZER: {
    label: "A Fazer",
    short: "A fazer",
    dot: "bg-[#e87ba4]",
    badge: "bg-zinc-100 text-zinc-700 ring-zinc-200",
    fill: "#e87ba4",
  },
  EM_ANDAMENTO: {
    label: "Em Andamento",
    short: "Em andamento",
    dot: "bg-[#2a78d6]",
    badge: "bg-blue-50 text-blue-700 ring-blue-200",
    fill: "#2a78d6",
  },
  AGUARDANDO: {
    label: "Aguardando Peça/Usuário",
    short: "Aguardando",
    dot: "bg-[#eda100]",
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    fill: "#eda100",
  },
  CONCLUIDO: {
    label: "Concluído",
    short: "Concluído",
    dot: "bg-[#1baf7a]",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    fill: "#1baf7a",
  },
};

export const PRIORITY_ORDER: TicketPriority[] = ["BAIXA", "MEDIA", "ALTA", "CRITICA"];

export const PRIORITY_META: Record<TicketPriority, { label: string; className: string; weight: number }> = {
  BAIXA: { label: "Baixa", className: "text-zinc-600 bg-zinc-100 ring-zinc-200", weight: 1 },
  MEDIA: { label: "Média", className: "text-blue-700 bg-blue-50 ring-blue-200", weight: 2 },
  ALTA: { label: "Alta", className: "text-orange-700 bg-orange-50 ring-orange-200", weight: 3 },
  CRITICA: { label: "Crítica", className: "text-red-700 bg-red-50 ring-red-200", weight: 4 },
};

export const CATEGORY_ORDER: TicketCategory[] = ["REDE", "HARDWARE", "IMPRESSORA", "SOFTWARE", "FORMATACAO"];

export const CATEGORY_META: Record<TicketCategory, { label: string }> = {
  REDE: { label: "Rede" },
  HARDWARE: { label: "Hardware" },
  IMPRESSORA: { label: "Impressora" },
  SOFTWARE: { label: "Software" },
  FORMATACAO: { label: "Formatação" },
};

export const ROLE_META: Record<UserRole, { label: string; className: string }> = {
  ADMIN: { label: "Administrador", className: "text-zinc-800 bg-zinc-100 ring-zinc-300" },
  TECNICO: { label: "Técnico de TI", className: "text-blue-700 bg-blue-50 ring-blue-200" },
  SOLICITANTE: { label: "Solicitante", className: "text-zinc-600 bg-white ring-zinc-200" },
};

export const isStaff = (role?: UserRole) => role === "ADMIN" || role === "TECNICO";
