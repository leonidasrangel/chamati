import { cn } from "@/lib/utils";

export function Logo({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-lg text-[13px] font-bold",
          dark ? "bg-white text-graphite-900" : "bg-graphite-900 text-white",
        )}
        aria-hidden
      >
        TI
      </span>
      <div className="leading-tight">
        <p className={cn("text-sm font-semibold", dark ? "text-white" : "text-zinc-900")}>ChamaTI</p>
        <p className={cn("text-[11px]", dark ? "text-zinc-400" : "text-zinc-500")}>Demandas & Procedimentos</p>
      </div>
    </div>
  );
}
