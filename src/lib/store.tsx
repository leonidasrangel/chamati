"use client";

/**
 * Estado do navegador sincronizado com o servidor.
 * - O recorte inicial do banco vem do layout raiz (renderizado no servidor).
 * - Cada operação chama uma Server Action (src/server/actions.ts), que grava no
 *   PostgreSQL e devolve o recorte atualizado.
 * - Mudanças rápidas (mover cartão, marcar item) são aplicadas na hora (otimista)
 *   e confirmadas pelo servidor; em caso de erro, os dados são recarregados.
 */

import { X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as api from "@/server/actions";
import { isStaff } from "./constants";
import type {
  ActionResult,
  ChecklistInput,
  DbState,
  DepartmentInput,
  ProcedureInput,
  Ticket,
  TicketInput,
  TicketPatch,
  User,
  UserInput,
} from "./types";

type Result = { ok: true } | { ok: false; error: string };
type ResultWith<T> = ({ ok: true } & T) | { ok: false; error: string };

interface StoreValue {
  hydrated: boolean;
  db: DbState;
  currentUser?: User;
  /** true depois de um "Sair" explícito (distingue de sessão expirada) */
  signedOut: boolean;
  refresh: () => Promise<void>;
  // auth
  login: (email: string, password: string) => Promise<Result>;
  logout: () => Promise<void>;
  register: (data: { name: string; email: string; password: string; departmentId: string }) => Promise<Result>;
  // departments
  saveDepartment: (dep: DepartmentInput) => Promise<Result>;
  deleteDepartment: (id: string) => Promise<Result>;
  // users
  saveUser: (user: UserInput) => Promise<Result>;
  deleteUser: (id: string) => Promise<Result>;
  // tickets
  createTicket: (data: TicketInput & { requesterId?: string }) => Promise<ResultWith<{ id: string; number: number }>>;
  updateTicket: (id: string, patch: Partial<Ticket>) => Promise<Result>;
  deleteTicket: (id: string) => Promise<Result>;
  addComment: (ticketId: string, body: string, isInternal?: boolean) => Promise<Result>;
  // checklists
  saveChecklist: (c: ChecklistInput) => Promise<ResultWith<{ id: string }>>;
  deleteChecklist: (id: string) => Promise<Result>;
  attachChecklist: (ticketId: string, checklistId: string) => Promise<Result>;
  detachChecklist: (ticketChecklistId: string) => Promise<Result>;
  toggleChecklistItem: (ticketChecklistId: string, itemId: string) => Promise<Result>;
  // procedures
  saveProcedure: (p: ProcedureInput) => Promise<ResultWith<{ id: string }>>;
  deleteProcedure: (id: string) => Promise<Result>;
  // notifications
  markNotificationRead: (id: string) => Promise<Result>;
  markAllNotificationsRead: () => Promise<Result>;
}

const StoreContext = createContext<StoreValue | null>(null);

const REFRESH_MS = 30_000;

export function StoreProvider({
  initialDb,
  initialUser,
  children,
}: {
  initialDb: DbState;
  initialUser: User | null;
  children: React.ReactNode;
}) {
  const [db, setDb] = useState<DbState>(initialDb);
  const [currentUser, setCurrentUser] = useState<User | undefined>(initialUser ?? undefined);
  const [toast, setToast] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const seq = useRef(0); // ordem das respostas: ignora respostas mais antigas que a última aplicada
  const applied = useRef(0);
  const inflight = useRef(0);
  const userRef = useRef(currentUser);
  userRef.current = currentUser;

  // O servidor re-renderiza o layout após login/logout (cookie alterado): sincroniza.
  useEffect(() => {
    setDb(initialDb);
    setCurrentUser(initialUser ?? undefined);
  }, [initialDb, initialUser]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  /** Executa uma Server Action e aplica o recorte devolvido. */
  const call = useCallback(async <T,>(fn: () => Promise<ActionResult<T>>, opts?: { optimistic?: (d: DbState) => DbState; silent?: boolean }) => {
    const mySeq = ++seq.current;
    inflight.current++;
    if (opts?.optimistic) setDb(opts.optimistic);
    let res: ActionResult<T>;
    try {
      res = await fn();
    } catch {
      res = { ok: false, error: "Não foi possível falar com o servidor. Verifique a conexão." };
    } finally {
      inflight.current--;
    }
    if (res.ok) {
      if (mySeq >= applied.current) {
        applied.current = mySeq;
        setDb(res.db);
        if (res.me) setCurrentUser(res.me);
      }
    } else {
      if (res.code === "UNAUTHENTICATED") setCurrentUser(undefined);
      if (!opts?.silent) setToast(res.error);
      // desfaz a mudança otimista recarregando do servidor
      if (opts?.optimistic && res.code !== "UNAUTHENTICATED") {
        const fresh = await api.refreshAction().catch(() => null);
        if (fresh?.ok) setDb(fresh.db);
      }
    }
    return res;
  }, []);

  const simple = (res: ActionResult<unknown>): Result => (res.ok ? { ok: true } : { ok: false, error: res.error });

  const refresh = useCallback(async () => {
    if (!userRef.current || inflight.current > 0) return;
    await call(() => api.refreshAction(), { silent: true });
  }, [call]);

  // Mantém os dados atualizados com o trabalho de outros técnicos
  useEffect(() => {
    if (!currentUser) return;
    const onFocus = () => document.visibilityState === "visible" && refresh();
    const timer = setInterval(onFocus, REFRESH_MS);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [currentUser, refresh]);

  const value = useMemo<StoreValue>(
    () => ({
      hydrated: true,
      db,
      currentUser,
      signedOut,
      refresh,

      // ---------------------------------------------------------- auth
      login: async (email, password) => {
        setSignedOut(false);
        return simple(await call(() => api.loginAction(email, password), { silent: true }));
      },
      register: async (data) => {
        setSignedOut(false);
        return simple(await call(() => api.registerAction(data), { silent: true }));
      },
      logout: async () => {
        const res = await api.logoutAction().catch(() => null);
        setSignedOut(true);
        setCurrentUser(undefined);
        if (res?.ok) setDb(res.db);
      },

      // --------------------------------------------------- departments
      saveDepartment: async (dep) => simple(await call(() => api.saveDepartmentAction(dep), { silent: true })),
      deleteDepartment: async (id) => simple(await call(() => api.deleteDepartmentAction(id), { silent: true })),

      // --------------------------------------------------------- users
      saveUser: async (user) => simple(await call(() => api.saveUserAction(user), { silent: true })),
      deleteUser: async (id) => simple(await call(() => api.deleteUserAction(id), { silent: true })),

      // ------------------------------------------------------- tickets
      createTicket: async (data) => {
        const res = await call(() => api.createTicketAction(data));
        return res.ok && res.data ? { ok: true, ...res.data } : { ok: false, error: res.ok ? "Falha ao criar." : res.error };
      },
      updateTicket: async (id, patch) => {
        // undefined explícito = limpar o campo (vira null no servidor)
        const wire = Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, v === undefined ? null : v])) as TicketPatch;
        return simple(
          await call(() => api.updateTicketAction(id, wire), {
            optimistic: (d) => ({
              ...d,
              tickets: d.tickets.map((t) =>
                t.id === id
                  ? {
                      ...t,
                      ...patch,
                      updatedAt: new Date().toISOString(),
                      waitingReason: patch.status && patch.status !== "AGUARDANDO" ? undefined : (patch.waitingReason ?? t.waitingReason),
                    }
                  : t,
              ),
            }),
          }),
        );
      },
      deleteTicket: async (id) =>
        simple(await call(() => api.deleteTicketAction(id), { optimistic: (d) => ({ ...d, tickets: d.tickets.filter((t) => t.id !== id) }) })),
      addComment: async (ticketId, body, isInternal = false) => simple(await call(() => api.addCommentAction(ticketId, body, isInternal))),

      // ---------------------------------------------------- checklists
      saveChecklist: async (c) => {
        const res = await call(() => api.saveChecklistAction(c));
        return res.ok ? { ok: true, id: res.data ?? "" } : { ok: false, error: res.error };
      },
      deleteChecklist: async (id) => simple(await call(() => api.deleteChecklistAction(id))),
      attachChecklist: async (ticketId, checklistId) => simple(await call(() => api.attachChecklistAction(ticketId, checklistId))),
      detachChecklist: async (tcId) =>
        simple(
          await call(() => api.detachChecklistAction(tcId), {
            optimistic: (d) => ({ ...d, ticketChecklists: d.ticketChecklists.filter((x) => x.id !== tcId) }),
          }),
        ),
      toggleChecklistItem: async (tcId, itemId) => {
        const me = userRef.current?.id;
        return simple(
          await call(() => api.toggleChecklistItemAction(tcId, itemId), {
            optimistic: (d) => ({
              ...d,
              ticketChecklists: d.ticketChecklists.map((tc) =>
                tc.id !== tcId
                  ? tc
                  : {
                      ...tc,
                      items: tc.items.map((it) =>
                        it.id !== itemId
                          ? it
                          : it.done
                            ? { ...it, done: false, doneById: undefined, doneAt: undefined }
                            : { ...it, done: true, doneById: me, doneAt: new Date().toISOString() },
                      ),
                    },
              ),
            }),
          }),
        );
      },

      // ---------------------------------------------------- procedures
      saveProcedure: async (p) => {
        const res = await call(() => api.saveProcedureAction(p));
        return res.ok ? { ok: true, id: res.data ?? "" } : { ok: false, error: res.error };
      },
      deleteProcedure: async (id) => simple(await call(() => api.deleteProcedureAction(id))),

      // ------------------------------------------------- notifications
      markNotificationRead: async (id) =>
        simple(
          await call(() => api.markNotificationReadAction(id), {
            silent: true,
            optimistic: (d) => ({ ...d, notifications: d.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }),
          }),
        ),
      markAllNotificationsRead: async () =>
        simple(
          await call(() => api.markAllNotificationsReadAction(), {
            optimistic: (d) => ({ ...d, notifications: d.notifications.map((n) => ({ ...n, read: true })) }),
          }),
        ),
    }),
    [db, currentUser, signedOut, refresh, call],
  );

  return (
    <StoreContext.Provider value={value}>
      {children}
      {toast && (
        <div
          role="alert"
          className="fixed bottom-4 right-4 z-[60] flex max-w-sm items-start gap-3 rounded-lg border border-red-200 bg-white px-4 py-3 text-sm text-zinc-800 shadow-lg animate-in"
        >
          <span className="mt-1 size-2 shrink-0 rounded-full bg-red-500" aria-hidden />
          <span className="flex-1">{toast}</span>
          <button onClick={() => setToast(null)} className="text-zinc-400 hover:text-zinc-700" aria-label="Fechar aviso">
            <X className="size-4" />
          </button>
        </div>
      )}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore deve ser usado dentro de <StoreProvider>");
  return ctx;
}

/** Atalhos de leitura usados por várias telas */
export function useLookups() {
  const { db } = useStore();
  return useMemo(() => {
    const dep = new Map(db.departments.map((d) => [d.id, d]));
    const usr = new Map(db.users.map((u) => [u.id, u]));
    return {
      department: (id?: string) => (id ? dep.get(id) : undefined),
      user: (id?: string) => (id ? usr.get(id) : undefined),
      staff: db.users.filter((u) => isStaff(u.role) && u.active),
    };
  }, [db.departments, db.users]);
}
