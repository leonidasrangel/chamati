"use client";

import { ArrowLeft, Eye, FileText, Pencil, Pin, PinOff, Plus, Save, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form";
import { EmptyState, Segmented } from "@/components/ui/misc";
import { useLookups, useStore } from "@/lib/store";
import type { Procedure } from "@/lib/types";
import { cn, normalize, timeAgo } from "@/lib/utils";
import { Markdown } from "./markdown";

type Draft = { title: string; content: string; tags: string; pinned: boolean };
const toDraft = (p?: Procedure): Draft => ({ title: p?.title ?? "", content: p?.content ?? "", tags: p?.tags.join(", ") ?? "", pinned: p?.pinned ?? false });

export function KnowledgeBase({ initialDocId, onSelectDoc }: { initialDocId?: string | null; onSelectDoc: (id: string | null) => void }) {
  const { db, saveProcedure, deleteProcedure } = useStore();
  const { user } = useLookups();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialDocId ?? null);
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const [draft, setDraft] = useState<Draft>(toDraft());

  const docs = useMemo(() => {
    const q = normalize(query.trim());
    return db.procedures
      .filter((p) => !q || normalize(`${p.title} ${p.content} ${p.tags.join(" ")}`).includes(q))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  }, [db.procedures, query]);

  // No desktop, abre o primeiro documento por padrão
  useEffect(() => {
    if (!selectedId && !creating && docs[0] && window.matchMedia("(min-width: 1024px)").matches) setSelectedId(docs[0].id);
  }, [selectedId, creating, docs]);

  useEffect(() => {
    if (initialDocId) {
      setSelectedId(initialDocId);
      setCreating(false);
    }
  }, [initialDocId]);

  const selected = db.procedures.find((p) => p.id === selectedId);

  useEffect(() => {
    if (creating) return;
    setDraft(toDraft(selected));
    setMode("preview");
    // somente ao trocar de documento (não a cada salvamento)
  }, [selected?.id, creating]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = creating
    ? !!(draft.title || draft.content)
    : !!selected && JSON.stringify(draft) !== JSON.stringify(toDraft(selected));

  const select = (id: string) => {
    if (dirty && !confirm("Descartar alterações não salvas?")) return;
    setCreating(false);
    setSelectedId(id);
    onSelectDoc(id);
  };

  const startNew = () => {
    if (dirty && !confirm("Descartar alterações não salvas?")) return;
    setCreating(true);
    setSelectedId(null);
    setDraft({ title: "", content: "# Novo procedimento\n\n1. Primeiro passo\n2. Segundo passo\n", tags: "", pinned: false });
    setMode("edit");
  };

  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft.title.trim() || saving) return;
    setSaving(true);
    const res = await saveProcedure({
      id: creating ? undefined : selected?.id,
      title: draft.title.trim(),
      content: draft.content,
      tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean),
      pinned: draft.pinned,
    });
    setSaving(false);
    if (!res.ok) return; // erro exibido no aviso global
    setCreating(false);
    setSelectedId(res.id);
    onSelectDoc(res.id);
    setMode("preview");
  };

  // Ctrl+S salva
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "s" && (e.ctrlKey || e.metaKey) && (creating || selected)) {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const showEditor = creating || !!selected;

  return (
    <div className="grid min-h-[560px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* Lista */}
      <div className={cn("flex flex-col border-zinc-200 lg:border-r", showEditor && "hidden lg:flex")}>
        <div className="flex gap-2 border-b border-zinc-100 p-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar documentos…" className="pl-8" aria-label="Buscar documentos" />
          </div>
          <Button size="icon" variant="outline" onClick={startNew} aria-label="Novo documento" title="Novo documento">
            <Plus />
          </Button>
        </div>
        <ul className="scroll-thin flex-1 overflow-y-auto p-1.5">
          {docs.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => select(p.id)}
                className={cn(
                  "w-full rounded-md px-3 py-2.5 text-left transition-colors",
                  p.id === selectedId && !creating ? "bg-zinc-100" : "hover:bg-zinc-50",
                )}
              >
                <span className="flex items-center gap-1.5">
                  {p.pinned && <Pin className="size-3 shrink-0 text-blue-600" aria-label="Fixado" />}
                  <span className="truncate text-[13px] font-medium text-zinc-900">{p.title}</span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-zinc-500">
                  {timeAgo(p.updatedAt)}
                  {p.tags.length > 0 && ` · ${p.tags.join(", ")}`}
                </span>
              </button>
            </li>
          ))}
          {docs.length === 0 && <li className="px-3 py-8 text-center text-sm text-zinc-500">Nenhum documento encontrado.</li>}
        </ul>
      </div>

      {/* Editor / visualização */}
      <div className={cn("flex min-w-0 flex-col", !showEditor && "hidden lg:flex")}>
        {!showEditor ? (
          <EmptyState
            icon={<FileText />}
            title="Selecione um documento"
            description="Ou crie um novo procedimento para a base de conhecimento."
            className="flex-1"
            action={
              <Button onClick={startNew}>
                <Plus /> Novo documento
              </Button>
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-4 py-2.5">
              <Button
                variant="ghost"
                size="icon-sm"
                className="lg:hidden"
                onClick={() => {
                  setCreating(false);
                  setSelectedId(null);
                  onSelectDoc(null);
                }}
                aria-label="Voltar à lista"
              >
                <ArrowLeft />
              </Button>
              <Segmented
                value={mode}
                onChange={setMode}
                options={[
                  { value: "preview", label: "Visualizar", icon: <Eye /> },
                  { value: "edit", label: "Editar", icon: <Pencil /> },
                ]}
              />
              <div className="ml-auto flex items-center gap-1.5">
                {dirty && <span className="mr-1 text-xs text-amber-700">Não salvo</span>}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDraft((d) => ({ ...d, pinned: !d.pinned }))}
                  aria-pressed={draft.pinned}
                  aria-label={draft.pinned ? "Desafixar" : "Fixar no topo"}
                  title={draft.pinned ? "Desafixar" : "Fixar no topo"}
                  className={draft.pinned ? "text-blue-600" : "text-zinc-500"}
                >
                  {draft.pinned ? <PinOff /> : <Pin />}
                </Button>
                {selected && !creating && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-zinc-500 hover:text-red-600"
                    aria-label="Excluir documento"
                    title="Excluir documento"
                    onClick={() => {
                      if (confirm(`Excluir "${selected.title}"?`)) {
                        deleteProcedure(selected.id);
                        setSelectedId(null);
                        onSelectDoc(null);
                      }
                    }}
                  >
                    <Trash2 />
                  </Button>
                )}
                <Button size="sm" onClick={save} disabled={saving || !draft.title.trim() || (!dirty && !creating)}>
                  <Save /> {saving ? "Salvando…" : "Salvar"}
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-8">
              {mode === "edit" ? (
                <div className="grid gap-3">
                  <Input
                    value={draft.title}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    placeholder="Título do documento"
                    className="h-10 text-base font-semibold"
                    aria-label="Título"
                  />
                  <Input
                    value={draft.tags}
                    onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))}
                    placeholder="Tags separadas por vírgula (ex.: rede, impressora)"
                    aria-label="Tags"
                  />
                  <Textarea
                    value={draft.content}
                    onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                    className="min-h-[380px] font-mono text-[13px]"
                    spellCheck={false}
                    aria-label="Conteúdo em Markdown"
                  />
                  <p className="text-xs text-zinc-500">
                    Markdown: <code className="rounded bg-zinc-100 px-1"># Título</code> <code className="rounded bg-zinc-100 px-1">- lista</code>{" "}
                    <code className="rounded bg-zinc-100 px-1">- [ ] tarefa</code> <code className="rounded bg-zinc-100 px-1">**negrito**</code>{" "}
                    <code className="rounded bg-zinc-100 px-1">`código`</code> · Ctrl+S salva
                  </p>
                </div>
              ) : (
                <article>
                  {draft.content.trim() ? <Markdown source={draft.content} /> : <p className="text-sm italic text-zinc-400">Documento vazio.</p>}
                  {selected && !creating && (
                    <p className="mt-8 border-t border-zinc-100 pt-3 text-xs text-zinc-400">
                      Atualizado {timeAgo(selected.updatedAt)} por {user(selected.updatedById)?.name ?? "—"}
                    </p>
                  )}
                </article>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
