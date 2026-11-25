"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FullPageLoader } from "@/components/layout/full-page-loader";
import { Header } from "@/components/layout/header";
import { Sidebar, SidebarContent } from "@/components/layout/sidebar";
import { isStaff } from "@/lib/constants";
import { useStore } from "@/lib/store";

/** Rotas que o Solicitante pode acessar */
const REQUESTER_ROUTES = [/^\/meus-chamados/, /^\/chamados\/[^/]+$/];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { hydrated, currentUser, signedOut } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const staff = isStaff(currentUser?.role);
  const allowed = !!currentUser && (staff || REQUESTER_ROUTES.some((r) => r.test(pathname)));

  useEffect(() => {
    if (!hydrated) return;
    // Sessão expirada volta para a mesma página após o login; "Sair" vai para o login limpo
    if (!currentUser) router.replace(signedOut ? "/login" : `/login?next=${encodeURIComponent(pathname)}`);
    else if (!allowed) router.replace("/meus-chamados");
  }, [hydrated, currentUser, signedOut, allowed, pathname, router]);

  useEffect(() => setMenuOpen(false), [pathname]);

  if (!hydrated || !allowed) return <FullPageLoader />;

  return (
    <div className="min-h-dvh">
      <Sidebar />

      {/* Gaveta da navegação em telas pequenas */}
      <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-zinc-950/40 lg:hidden" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-xl animate-slide-in lg:hidden">
            <DialogPrimitive.Title className="sr-only">Menu de navegação</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Links para as seções do sistema</DialogPrimitive.Description>
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="lg:pl-64">
        <Header onOpenMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
