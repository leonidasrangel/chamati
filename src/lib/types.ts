// Tipos de domínio — espelham as tabelas de db/schema.sql (camelCase no front-end)

export type UserRole = "ADMIN" | "TECNICO" | "SOLICITANTE";
export type TicketStatus = "A_FAZER" | "EM_ANDAMENTO" | "AGUARDANDO" | "CONCLUIDO";
export type TicketPriority = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
export type TicketCategory = "REDE" | "HARDWARE" | "IMPRESSORA" | "SOFTWARE" | "FORMATACAO";
export type CommentKind = "COMMENT" | "STATUS_CHANGE" | "ASSIGNMENT" | "CHECKLIST" | "SYSTEM";

export interface Department {
  id: string;
  name: string;
  acronym: string;
  managerName?: string;
  extension?: string;
  location?: string;
  active: boolean;
  createdAt: string;
}

/** Usuário como enviado ao navegador — nunca inclui o hash da senha. */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  phone?: string;
  active: boolean;
  createdAt: string;
}

export interface Ticket {
  id: string;
  number: number;
  title: string;
  description: string;
  departmentId: string;
  requesterId: string;
  assigneeId?: string;
  priority: TicketPriority;
  category: TicketCategory;
  status: TicketStatus;
  waitingReason?: string;
  assetTag?: string;
  dueDate?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId?: string;
  kind: CommentKind;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

/** Modelo de checklist reutilizável */
export interface Checklist {
  id: string;
  title: string;
  description: string;
  category?: TicketCategory;
  items: ChecklistItem[];
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  hint?: string;
}

/** Checklist ativo vinculado a uma demanda (cópia dos itens do modelo) */
export interface TicketChecklist {
  id: string;
  ticketId: string;
  checklistId?: string;
  title: string;
  items: TicketChecklistItem[];
  attachedById?: string;
  createdAt: string;
}

export interface TicketChecklistItem {
  id: string;
  label: string;
  hint?: string;
  done: boolean;
  doneById?: string;
  doneAt?: string;
}

/** Documento da base de conhecimento (Markdown) */
export interface Procedure {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  authorId?: string;
  updatedById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  ticketId?: string;
  message: string;
  read: boolean;
  createdAt: string;
}

/** Recorte do banco que o usuário logado pode ver (montado no servidor). */
export interface DbState {
  departments: Department[];
  users: User[];
  tickets: Ticket[];
  comments: TicketComment[];
  checklists: Checklist[];
  ticketChecklists: TicketChecklist[];
  procedures: Procedure[];
  notifications: Notification[];
}

// ---------------------------------------------------------------------------
// Contratos das Server Actions (src/server/actions.ts)
// ---------------------------------------------------------------------------

export type ActionResult<T = undefined> =
  | { ok: true; db: DbState; me?: User; data?: T }
  | { ok: false; error: string; code?: "UNAUTHENTICATED" };

export interface TicketInput {
  title: string;
  description: string;
  departmentId: string;
  priority: TicketPriority;
  category: TicketCategory;
  assigneeId?: string;
  status?: TicketStatus;
  assetTag?: string;
  dueDate?: string;
}

export type TicketPatch = Partial<
  Pick<Ticket, "title" | "description" | "departmentId" | "priority" | "category" | "status" | "waitingReason" | "assetTag" | "dueDate">
> & { assigneeId?: string | null };

export interface DepartmentInput {
  id?: string;
  name: string;
  acronym: string;
  managerName?: string;
  extension?: string;
  location?: string;
  active: boolean;
}

export interface UserInput {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  phone?: string;
  active: boolean;
  /** Obrigatória ao criar; opcional ao editar (vazio = mantém a atual). */
  password?: string;
}

export interface ChecklistInput {
  id?: string;
  title: string;
  description: string;
  category?: TicketCategory;
  items: { label: string; hint?: string }[];
}

export interface ProcedureInput {
  id?: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
}
