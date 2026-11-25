"use client";

import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = Dropdown.Root;
export const DropdownTrigger = Dropdown.Trigger;

export function DropdownContent({
  className,
  align = "end",
  children,
}: {
  className?: string;
  align?: "start" | "center" | "end";
  children: React.ReactNode;
}) {
  return (
    <Dropdown.Portal>
      <Dropdown.Content
        align={align}
        sideOffset={6}
        className={cn(
          "z-50 min-w-44 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg data-[state=open]:animate-in",
          className,
        )}
      >
        {children}
      </Dropdown.Content>
    </Dropdown.Portal>
  );
}

export function DropdownItem({
  className,
  danger,
  ...props
}: React.ComponentProps<typeof Dropdown.Item> & { danger?: boolean }) {
  return (
    <Dropdown.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-700 outline-none data-[highlighted]:bg-zinc-100 data-[highlighted]:text-zinc-900 [&_svg]:size-4 [&_svg]:text-zinc-400",
        danger && "text-red-600 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700 [&_svg]:text-red-500",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownLabel({ className, ...props }: React.ComponentProps<typeof Dropdown.Label>) {
  return <Dropdown.Label className={cn("px-2 py-1.5 text-xs font-medium text-zinc-500", className)} {...props} />;
}

export function DropdownSeparator() {
  return <Dropdown.Separator className="-mx-1 my-1 h-px bg-zinc-100" />;
}
