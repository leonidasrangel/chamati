import { Check } from "lucide-react";
import { STATUS_META, STATUS_ORDER } from "@/lib/constants";
import type { TicketStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Linha de progresso usada na visão do solicitante */
export function StatusStepper({ status, compact }: { status: TicketStatus; compact?: boolean }) {
  const idx = STATUS_ORDER.indexOf(status);
  return (
    <ol className="flex items-center" aria-label={`Status: ${STATUS_META[status].label}`}>
      {STATUS_ORDER.map((s, i) => {
        const done = i < idx || status === "CONCLUIDO";
        const current = i === idx && status !== "CONCLUIDO";
        return (
          <li key={s} className={cn("flex items-center", i < STATUS_ORDER.length - 1 && "flex-1")}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex items-center justify-center rounded-full border-2 transition-colors",
                  compact ? "size-4" : "size-6",
                  done && "border-emerald-500 bg-emerald-500 text-white",
                  current && "border-blue-600 bg-white",
                  !done && !current && "border-zinc-200 bg-white",
                )}
                aria-current={current ? "step" : undefined}
              >
                {done && <Check className={compact ? "size-2.5" : "size-3.5"} strokeWidth={3} />}
                {current && <span className={cn("rounded-full bg-blue-600", compact ? "size-1.5" : "size-2")} />}
              </span>
              {!compact && (
                <span className={cn("whitespace-nowrap text-[11px]", current ? "font-medium text-zinc-900" : "text-zinc-500")}>
                  {STATUS_META[s].short}
                </span>
              )}
            </div>
            {i < STATUS_ORDER.length - 1 && (
              <span className={cn("mx-1.5 h-0.5 flex-1 rounded-full", i < idx || status === "CONCLUIDO" ? "bg-emerald-500" : "bg-zinc-200", !compact && "-mt-5")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
