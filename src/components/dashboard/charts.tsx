"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type BarDatum = { key: string; label: string; sublabel?: string; value: number; detail?: string; href?: string };

/**
 * Barras horizontais de série única (uma só cor → sem legenda; o título do card nomeia a série).
 * Barra de 12px, ponta arredondada de 4px e base reta; valor na ponta; tooltip no hover/foco.
 */
export function BarList({ data, emptyLabel = "Sem dados" }: { data: BarDatum[]; emptyLabel?: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));

  if (data.every((d) => d.value === 0)) return <p className="py-8 text-center text-sm text-zinc-500">{emptyLabel}</p>;

  return (
    <ul className="space-y-1" role="list">
      {data.map((d) => {
        const pct = (d.value / max) * 100;
        const content = (
          <>
            <span className="w-28 shrink-0 truncate text-[13px] text-zinc-600 sm:w-36" title={d.sublabel ?? d.label}>
              {d.label}
            </span>
            <span className="relative flex h-6 flex-1 items-center">
              <span
                className="h-3 rounded-r-[4px] bg-viz-1 transition-[width] duration-300"
                style={{ width: d.value ? `max(${pct}%, 3px)` : 0 }}
              />
              <span className="ml-2 text-[13px] font-medium tabular-nums text-zinc-900">{d.value}</span>
              {hover === d.key && (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-0 z-10 mb-1 whitespace-nowrap rounded-md bg-graphite-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
                  style={{ left: `min(${pct}%, calc(100% - 10rem))` }}
                >
                  <span className="font-medium">{d.sublabel ?? d.label}</span>
                  <span className="block text-zinc-300">{d.detail ?? `${d.value}`}</span>
                </span>
              )}
            </span>
          </>
        );
        const cls = cn("flex items-center gap-3 rounded-md px-1.5 py-0.5 outline-none", hover === d.key && "bg-zinc-50");
        const handlers = {
          onMouseEnter: () => setHover(d.key),
          onMouseLeave: () => setHover(null),
          onFocus: () => setHover(d.key),
          onBlur: () => setHover(null),
        };
        return (
          <li key={d.key}>
            {d.href ? (
              <Link href={d.href} className={cls} {...handlers} aria-label={`${d.sublabel ?? d.label}: ${d.value}`}>
                {content}
              </Link>
            ) : (
              <div className={cls} tabIndex={0} {...handlers} aria-label={`${d.sublabel ?? d.label}: ${d.value}`}>
                {content}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export type Segment = { key: string; label: string; value: number; color: string; href?: string };

/** Barra segmentada fina (8px) — uma composição dividida em partes, com legenda rotulada. */
export function SegmentedBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div>
      <div
        className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full"
        role="img"
        aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(", ")}
      >
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <span
              key={s.key}
              className={cn("h-full transition-opacity first:rounded-l-full last:rounded-r-full", hover && hover !== s.key && "opacity-40")}
              style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
              onMouseEnter={() => setHover(s.key)}
              onMouseLeave={() => setHover(null)}
              title={`${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`}
            />
          ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
        {segments.map((s) => {
          const inner = (
            <>
              <span className="size-2 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
              <span className="truncate text-zinc-600">{s.label}</span>
              <span className="ml-auto font-medium tabular-nums text-zinc-900">{s.value}</span>
            </>
          );
          const cls = cn("flex items-center gap-2 rounded px-1 py-0.5 text-[13px]", hover === s.key && "bg-zinc-50");
          return (
            <li key={s.key} onMouseEnter={() => setHover(s.key)} onMouseLeave={() => setHover(null)}>
              {s.href ? (
                <Link href={s.href} className={cn(cls, "hover:bg-zinc-50")}>
                  {inner}
                </Link>
              ) : (
                <span className={cls}>{inner}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  href,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  href?: string;
  tone?: "default" | "critical";
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-zinc-500">{label}</p>
        {icon && (
          <span className={cn("[&_svg]:size-4", tone === "critical" ? "text-red-500" : "text-zinc-400")}>{icon}</span>
        )}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </>
  );
  const cls = "block rounded-xl border border-zinc-200 bg-white p-4 shadow-xs transition-colors";
  return href ? (
    <Link href={href} className={cn(cls, "hover:border-zinc-300 hover:bg-zinc-50/50")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
