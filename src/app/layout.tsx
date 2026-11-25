import type { Metadata, Viewport } from "next";
import { StoreProvider } from "@/lib/store";
import { getSessionUser } from "@/server/session";
import { loadPublicSnapshot, loadSnapshot } from "@/server/snapshot";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ChamaTI", template: "%s · ChamaTI" },
  description: "Gestão de Demandas de TI e Procedimentos Operacionais",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#18191c",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Sessão e dados iniciais são carregados no servidor a cada requisição
  const user = await getSessionUser();
  const db = user ? await loadSnapshot(user) : await loadPublicSnapshot();

  return (
    <html lang="pt-BR">
      {/* suppressHydrationWarning: extensões do navegador costumam injetar atributos no <body> */}
      <body className="min-h-dvh font-sans" suppressHydrationWarning>
        <StoreProvider initialDb={db} initialUser={user}>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
