"use client";

import { Bell, ChevronDown, LogOut, Menu, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, RoleBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import {
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { useStore } from "@/lib/store";
import { cn, timeAgo } from "@/lib/utils";
import { GlobalSearch } from "./global-search";

export function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white/90 px-4 backdrop-blur lg:px-6">
      <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={onOpenMenu} aria-label="Abrir menu">
        <Menu />
      </Button>
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-1">
        <Notifications />
        <ProfileMenu />
      </div>
    </header>
  );
}

function Notifications() {
  const { db, currentUser, markNotificationRead, markAllNotificationsRead } = useStore();
  const router = useRouter();
  const mine = db.notifications.filter((n) => n.userId === currentUser?.id).slice(0, 8);
  const unread = mine.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative" aria-label={`Notificações (${unread} não lidas)`}>
          <Bell />
          {unread > 0 && (
            <span className="absolute right-1 top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold leading-4 text-white">
              {unread}
            </span>
          )}
        </Button>
      </DropdownTrigger>
      <DropdownContent className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2.5">
          <p className="text-sm font-semibold">Notificações</p>
          {unread > 0 && (
            <button onClick={markAllNotificationsRead} className="text-xs font-medium text-blue-700 hover:underline">
              Marcar todas como lidas
            </button>
          )}
        </div>
        <div className="scroll-thin max-h-96 overflow-y-auto p-1">
          {mine.length === 0 && <p className="px-3 py-8 text-center text-sm text-zinc-500">Nenhuma notificação.</p>}
          {mine.map((n) => (
            <DropdownItem
              key={n.id}
              className="items-start gap-3 py-2"
              onSelect={() => {
                markNotificationRead(n.id);
                if (n.ticketId) router.push(`/chamados/${n.ticketId}`);
              }}
            >
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-blue-600")} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className={cn("block text-[13px] leading-5", n.read ? "text-zinc-600" : "text-zinc-900")}>{n.message}</span>
                <span className="block text-xs text-zinc-400">{timeAgo(n.createdAt)}</span>
              </span>
            </DropdownItem>
          ))}
        </div>
      </DropdownContent>
    </DropdownMenu>
  );
}

function ProfileMenu() {
  const { currentUser, logout } = useStore();
  const router = useRouter();
  if (!currentUser) return null;

  return (
    <DropdownMenu>
      <DropdownTrigger asChild>
        <button className="flex items-center gap-2 rounded-md py-1 pl-1 pr-1.5 hover:bg-zinc-100" aria-label="Menu do perfil">
          <Avatar name={currentUser.name} />
          <span className="hidden text-left leading-tight md:block">
            <span className="block text-[13px] font-medium text-zinc-900">{currentUser.name}</span>
            <span className="block text-[11px] text-zinc-500">{currentUser.email}</span>
          </span>
          <ChevronDown className="hidden size-4 text-zinc-400 md:block" />
        </button>
      </DropdownTrigger>
      <DropdownContent className="w-60">
        <DropdownLabel className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-900">{currentUser.name}</span>
          <RoleBadge role={currentUser.role} />
        </DropdownLabel>
        <DropdownSeparator />
        {currentUser.role === "ADMIN" && (
          <DropdownItem onSelect={() => router.push(`/usuarios?q=${encodeURIComponent(currentUser.name)}`)}>
            <UserRound /> Meu cadastro
          </DropdownItem>
        )}
        {currentUser.role === "ADMIN" && <DropdownSeparator />}
        <DropdownItem
          danger
          onSelect={async () => {
            await logout();
            router.replace("/login");
          }}
        >
          <LogOut /> Sair
        </DropdownItem>
      </DropdownContent>
    </DropdownMenu>
  );
}
