"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-zinc-300 bg-white shadow-xs transition-colors data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-3" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("inline-flex h-9 items-center rounded-lg bg-zinc-100 p-1", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-zinc-600 transition-colors hover:text-zinc-900 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs [&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}

/** Alternador segmentado simples (ex.: Kanban | Tabela) */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
}) {
  return (
    <div role="radiogroup" className="inline-flex h-9 items-center rounded-lg bg-zinc-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-zinc-600 transition-colors hover:text-zinc-900 [&_svg]:size-3.5",
            value === o.value && "bg-white text-zinc-900 shadow-xs",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      {icon && <div className="mb-3 rounded-full bg-zinc-100 p-3 text-zinc-400 [&_svg]:size-5">{icon}</div>}
      <p className="text-sm font-medium text-zinc-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-zinc-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-viz-track", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-all", pct === 100 ? "bg-emerald-500" : "bg-viz-1")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
