"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-zinc-950/30 backdrop-blur-[1px] data-[state=open]:animate-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-zinc-200 bg-white shadow-xl data-[state=open]:animate-in",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
          <div>
            <DialogPrimitive.Title className="text-base font-semibold text-zinc-900">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-0.5 text-[13px] text-zinc-500">{description}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close className="-mr-1 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Fechar">
            <X className="size-4" />
          </DialogPrimitive.Close>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3">{footer}</div>}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
