"use client";

import { Building2, ClipboardList, FileText, Search, Ticket, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge } from "@/components/ui/badges";
import { isStaff } from "@/lib/constants";
import { useStore } from "@/lib/store";
import type { TicketStatus } from "@/lib/types";
import { cn, normalize } from "@/lib/utils";

type Result = {
  id: string;
  group: string;
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  href: string;
  status?: TicketStatus;
};

export function GlobalSearch() {
  const { db, currentUser } = useStore();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const staff = isStaff(currentUser?.role);

  // Atalho: Ctrl/⌘ + K ou "/"
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea, select, [contenteditable]");
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, []);

  const results = useMemo<Result[]>(() => {
    const q = normalize(query.trim());
    if (q.length < 2) return [];
    const has = (...parts: (string | undefined)[]) => parts.some((p) => p && normalize(p).includes(q));
    const tickets = db.tickets
      .filter((t) => staff || t.requesterId === currentUser?.id)
      .filter((t) => has(t.title, t.description, `#${t.number}`, String(t.number), t.assetTag))
      .slice(0, 6)
      .map<Result>((t) => ({
        id: t.id,
        group: "Demandas",
        icon: Ticket,
        title: `#${t.number} · ${t.title}`,
        subtitle: db.departments.find((d) => d.id === t.departmentId)?.acronym,
        href: `/chamados/${t.id}`,
        status: t.status,
      }));
    if (!staff) return tickets;
    return [
      ...tickets,
      ...db.procedures
        .filter((p) => has(p.title, p.content, ...p.tags))
        .slice(0, 4)
        .map<Result>((p) => ({ id: p.id, group: "Base de conhecimento", icon: FileText, title: p.title, subtitle: p.tags.join(", "), href: `/procedimentos?tab=docs&doc=${p.id}` })),
      ...db.checklists
        .filter((c) => has(c.title, c.description))
        .slice(0, 4)
        .map<Result>((c) => ({ id: c.id, group: "Checklists", icon: ClipboardList, title: c.title, subtitle: `${c.items.length} itens`, href: `/procedimentos?tab=checklists&checklist=${c.id}` })),
      ...db.departments
        .filter((d) => has(d.name, d.acronym))
        .slice(0, 3)
        .map<Result>((d) => ({ id: d.id, group: "Departamentos", icon: Building2, title: d.name, subtitle: d.acronym, href: `/departamentos?q=${encodeURIComponent(d.acronym)}` })),
      ...db.users
        .filter((u) => has(u.name, u.email))
        .slice(0, 3)
        .map<Result>((u) => ({ id: u.id, group: "Usuários", icon: UserRound, title: u.name, subtitle: u.email, href: `/usuarios?q=${encodeURIComponent(u.name)}` })),
    ];
  }, [query, db, staff, currentUser?.id]);

  useEffect(() => setActive(0), [query]);

  const go = (r: Result) => {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    router.push(r.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      go(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  let lastGroup = "";

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={staff ? "Buscar demandas, procedimentos, usuários…" : "Buscar nas minhas demandas…"}
        aria-label="Busca global"
        className="h-9 w-full rounded-md border border-zinc-200 bg-zinc-50 pl-9 pr-14 text-sm placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-blue-500/15"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-zinc-200 bg-white px-1.5 font-sans text-[11px] text-zinc-400 sm:block">
        Ctrl K
      </kbd>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-11 z-50 max-h-[70vh] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-lg animate-in scroll-thin sm:right-auto sm:w-[28rem]">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-zinc-500">Nenhum resultado para “{query}”.</p>
          ) : (
            results.map((r, i) => {
              const header = r.group !== lastGroup;
              lastGroup = r.group;
              const Icon = r.icon;
              return (
                <div key={r.group + r.id}>
                  {header && <p className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">{r.group}</p>}
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left",
                      i === active ? "bg-zinc-100" : "hover:bg-zinc-50",
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-zinc-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-zinc-900">{r.title}</span>
                      {r.subtitle && <span className="block truncate text-xs text-zinc-500">{r.subtitle}</span>}
                    </span>
                    {r.status && <StatusBadge status={r.status} />}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
