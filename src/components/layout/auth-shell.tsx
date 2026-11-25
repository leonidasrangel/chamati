import { CircleCheck } from "lucide-react";
import { Logo } from "./logo";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-graphite-900 p-10 text-zinc-300 lg:flex">
        <Logo dark />
        <div className="max-w-md">
          <h2 className="text-2xl font-semibold leading-snug tracking-tight text-white">
            Demandas, checklists e procedimentos da TI em um só lugar.
          </h2>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Chamados de todos os departamentos com Kanban e tabela",
              "Checklists reutilizáveis vinculados às demandas",
              "Base de conhecimento para os procedimentos do setor",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-zinc-500">Setor de Tecnologia da Informação</p>
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-blue-500/10 blur-3xl" aria-hidden />
      </aside>

      <main className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <Logo className="mb-8 lg:hidden" />
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">{title}</h1>
          <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
