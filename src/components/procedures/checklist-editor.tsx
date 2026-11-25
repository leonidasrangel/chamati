"use client";

import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/constants";
import { useStore } from "@/lib/store";
import type { Checklist, ChecklistItem, TicketCategory } from "@/lib/types";
import { uid } from "@/lib/utils";

export function ChecklistEditor({
  open,
  onOpenChange,
  checklist,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  checklist?: Checklist;
}) {
  const { saveChecklist } = useStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory | "">("");
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const lastInput = useRef<HTMLInputElement>(null);
  const [focusNew, setFocusNew] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(checklist?.title ?? "");
    setDescription(checklist?.description ?? "");
    setCategory(checklist?.category ?? "");
    setItems(checklist?.items.map((i) => ({ ...i })) ?? [{ id: uid("ci"), label: "" }]);
  }, [open, checklist]);

  useEffect(() => {
    if (focusNew) {
      lastInput.current?.focus();
      setFocusNew(false);
    }
  }, [focusNew, items.length]);

  const update = (id: string, patch: Partial<ChecklistItem>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const move = (idx: number, dir: -1 | 1) =>
    setItems((xs) => {
      const next = [...xs];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return xs;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  const add = () => {
    setItems((xs) => [...xs, { id: uid("ci"), label: "" }]);
    setFocusNew(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = items.filter((i) => i.label.trim()).map((i) => ({ ...i, label: i.label.trim(), hint: i.hint?.trim() || undefined }));
    if (!clean.length) return;
    saveChecklist({ id: checklist?.id, title: title.trim(), description: description.trim(), category: category || undefined, items: clean });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={checklist ? "Editar modelo de checklist" : "Novo modelo de checklist"}
        description="Modelos são copiados ao serem vinculados: editar aqui não altera checklists já em uso."
        className="max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="checklist-form" disabled={!title.trim() || !items.some((i) => i.label.trim())}>
              Salvar modelo
            </Button>
          </>
        }
      >
        <form id="checklist-form" onSubmit={submit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <Field label="Título" htmlFor="c-title">
              <Input id="c-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Checklist Pós-Formatação Windows" />
            </Field>
            <Field label="Categoria sugerida" htmlFor="c-cat">
              <Select id="c-cat" value={category} onChange={(e) => setCategory(e.target.value as TicketCategory | "")}>
                <option value="">Qualquer</option>
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_META[c].label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Descrição" htmlFor="c-desc">
            <Textarea id="c-desc" rows={2} className="min-h-0" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Quando usar este checklist" />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-zinc-700">Itens ({items.filter((i) => i.label.trim()).length})</p>
              <p className="text-xs text-zinc-400">Enter adiciona um novo item</p>
            </div>
            <ol className="space-y-2">
              {items.map((item, idx) => (
                <li key={item.id} className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50/50 p-2">
                  <span className="mt-2 w-5 shrink-0 text-right text-xs tabular-nums text-zinc-400">{idx + 1}.</span>
                  <div className="grid min-w-0 flex-1 gap-1.5">
                    <Input
                      ref={idx === items.length - 1 ? lastInput : undefined}
                      value={item.label}
                      onChange={(e) => update(item.id, { label: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          add();
                        }
                      }}
                      placeholder="Descreva o passo"
                      aria-label={`Item ${idx + 1}`}
                    />
                    <Input
                      value={item.hint ?? ""}
                      onChange={(e) => update(item.id, { hint: e.target.value })}
                      placeholder="Dica ou comando de apoio (opcional)"
                      className="h-8 text-xs"
                      aria-label={`Dica do item ${idx + 1}`}
                    />
                  </div>
                  <div className="flex flex-col">
                    <button type="button" className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 disabled:opacity-30" disabled={idx === 0} onClick={() => move(idx, -1)} aria-label="Mover para cima">
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button type="button" className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 disabled:opacity-30" disabled={idx === items.length - 1} onClick={() => move(idx, 1)} aria-label="Mover para baixo">
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>
                  <button type="button" className="mt-1 rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600" onClick={() => setItems((xs) => xs.filter((x) => x.id !== item.id))} aria-label="Remover item">
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ol>
            <Button variant="outline" size="sm" className="mt-2" onClick={add}>
              <Plus /> Adicionar item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
