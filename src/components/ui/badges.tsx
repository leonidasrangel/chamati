import { ArrowDown, ArrowUp, ChevronsUp, Minus } from "lucide-react";
import { CATEGORY_META, PRIORITY_META, ROLE_META, STATUS_META } from "@/lib/constants";
import type { TicketCategory, TicketPriority, TicketStatus, UserRole } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        className,
      )}
      {...props}
    />
  );
}

export function StatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <Badge className={cn(meta.badge, className)}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden />
      {meta.short}
    </Badge>
  );
}

const PRIORITY_ICON = { BAIXA: ArrowDown, MEDIA: Minus, ALTA: ArrowUp, CRITICA: ChevronsUp } as const;

export function PriorityBadge({ priority, className }: { priority: TicketPriority; className?: string }) {
  const meta = PRIORITY_META[priority];
  const Icon = PRIORITY_ICON[priority];
  return (
    <Badge className={cn(meta.className, className)}>
      <Icon className="size-3" aria-hidden />
      {meta.label}
    </Badge>
  );
}

export function CategoryBadge({ category }: { category: TicketCategory }) {
  return <Badge className="bg-white text-zinc-600 ring-zinc-200">{CATEGORY_META[category].label}</Badge>;
}

export function RoleBadge({ role }: { role: UserRole }) {
  const meta = ROLE_META[role];
  return <Badge className={meta.className}>{meta.label}</Badge>;
}

const AVATAR_TONES = ["bg-zinc-200 text-zinc-700", "bg-blue-100 text-blue-800", "bg-emerald-100 text-emerald-800", "bg-amber-100 text-amber-800", "bg-violet-100 text-violet-800"];

export function Avatar({ name, size = "md", className }: { name?: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const tone = name ? AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length] : "bg-zinc-100 text-zinc-400";
  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
        size === "sm" && "size-6 text-[10px]",
        size === "md" && "size-8 text-xs",
        size === "lg" && "size-10 text-sm",
        tone,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
