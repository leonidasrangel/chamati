"use client";

import { Building2, ClipboardList, Inbox, LayoutDashboard, Ticket, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isStaff } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

export function useNavItems() {
  const { currentUser, db } = useStore();
  if (!currentUser) return [];
  if (!isStaff(currentUser.role)) {
    const mine = db.tickets.filter((t) => t.requesterId === currentUser.id && t.status !== "CONCLUIDO").length;
    return [{ href: "/meus-chamados", label: "Meus chamados", icon: Inbox, count: mine }];
  }
  const open = db.tickets.filter((t) => t.status !== "CONCLUIDO").length;
  return [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/chamados", label: "Chamados / Demandas", icon: Ticket, count: open },
    { href: "/procedimentos", label: "Procedimentos & Checklists", icon: ClipboardList },
    { href: "/departamentos", label: "Departamentos", icon: Building2 },
    { href: "/usuarios", label: "Usuários", icon: Users },
  ];
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = useNavItems();
  const { currentUser, db } = useStore();
  const dept = db.departments.find((d) => d.id === currentUser?.departmentId);

  return (
    <div className="flex h-full flex-col bg-graphite-900 text-zinc-300">
      <div className="flex h-14 items-center border-b border-white/5 px-4">
        <Logo dark />
      </div>

      <nav className="scroll-thin flex-1 overflow-y-auto px-3 py-4" aria-label="Navegação principal">
        <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Menu</p>
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/") ||
              (item.href === "/chamados" && pathname.startsWith("/chamados"));
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
                    active ? "bg-graphite-700 text-white" : "text-zinc-400 hover:bg-graphite-800 hover:text-zinc-100",
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", active ? "text-white" : "text-zinc-500 group-hover:text-zinc-300")} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {!!item.count && (
                    <span
                      className={cn(
                        "rounded px-1.5 py-px text-[11px] tabular-nums",
                        active ? "bg-white/15 text-white" : "bg-white/5 text-zinc-400",
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/5 p-4">
        <p className="truncate text-[13px] font-medium text-zinc-200">{currentUser?.name}</p>
        <p className="truncate text-xs text-zinc-500">{dept ? `${dept.acronym} · ${dept.name}` : "Sem departamento"}</p>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
      <SidebarContent />
    </aside>
  );
}
