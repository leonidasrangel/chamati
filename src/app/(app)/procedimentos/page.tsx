"use client";

import { BookOpen, ClipboardList, Copy, Ellipsis, ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ChecklistEditor } from "@/components/procedures/checklist-editor";
import { KnowledgeBase } from "@/components/procedures/knowledge-base";
import { CategoryBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownContent, DropdownItem, DropdownMenu, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { EmptyState, PageHeader, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/misc";
import { useLookups, useStore } from "@/lib/store";
import type { Checklist } from "@/lib/types";
import { cn, timeAgo, uid } from "@/lib/utils";

export default function ProceduresPage() {
  return (
    <Suspense>
      <ProceduresContent />
    </Suspense>
  );
}

function ProceduresContent() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get("tab") === "docs" ? "docs" : "checklists";
  const { db, deleteChecklist, saveChecklist } = useStore();
  const { user } = useLookups();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Checklist | undefined>();
  const [highlight, setHighlight] = useState<string | null>(null);

  const setTab = (t: string) => router.replace(`/procedimentos?tab=${t}`, { scroll: false });

  // Destaca o checklist vindo da busca global
  useEffect(() => {
    const id = params.get("checklist");
    if (!id) return;
    setHighlight(id);
    document.getElementById(`chk-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = setTimeout(() => setHighlight(null), 2000);
    return () => clearTimeout(t);
  }, [params]);

  const usage = (id: string) => db.ticketChecklists.filter((tc) => tc.checklistId === id);

  const openEditor = (c?: Checklist) => {
    setEditing(c);
    setEditorOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Procedimentos & Checklists"
        description="Modelos reutilizáveis e documentação técnica do setor."
        actions={
          tab === "checklists" ? (
            <Button onClick={() => openEditor()}>
              <Plus /> Novo checklist
            </Button>
          ) : undefined
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="checklists">
            <ListChecks /> Checklists <span className="tabular-nums text-zinc-400">{db.checklists.length}</span>
          </TabsTrigger>
          <TabsTrigger value="docs">
            <BookOpen /> Base de conhecimento <span className="tabular-nums text-zinc-400">{db.procedures.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checklists">
          {db.checklists.length === 0 ? (
            <Card>
              <EmptyState
                icon={<ClipboardList />}
                title="Nenhum modelo de checklist"
                description="Crie modelos como “Checklist Pós-Formatação Windows” para vincular às demandas."
                action={
                  <Button onClick={() => openEditor()}>
                    <Plus /> Novo checklist
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {db.checklists.map((c) => {
                const uses = usage(c.id);
                const active = uses.filter((u) => u.items.some((i) => !i.done)).length;
                return (
                  <Card
                    key={c.id}
                    id={`chk-${c.id}`}
                    className={cn("flex flex-col transition-shadow", highlight === c.id && "ring-2 ring-blue-500")}
                  >
                    <div className="flex items-start gap-3 px-5 pt-4">
                      <span className="mt-0.5 rounded-lg bg-zinc-100 p-2 text-zinc-500">
                        <ListChecks className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <button onClick={() => openEditor(c)} className="text-left text-sm font-semibold text-zinc-900 hover:underline">
                          {c.title}
                        </button>
                        <p className="mt-0.5 line-clamp-2 text-[13px] text-zinc-500">{c.description || "Sem descrição."}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownTrigger asChild>
                          <button className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label={`Ações de ${c.title}`}>
                            <Ellipsis className="size-4" />
                          </button>
                        </DropdownTrigger>
                        <DropdownContent>
                          <DropdownItem onSelect={() => openEditor(c)}>
                            <Pencil /> Editar
                          </DropdownItem>
                          <DropdownItem
                            onSelect={() =>
                              saveChecklist({
                                title: `${c.title} (cópia)`,
                                description: c.description,
                                category: c.category,
                                items: c.items.map((i) => ({ ...i, id: uid("ci") })),
                              })
                            }
                          >
                            <Copy /> Duplicar
                          </DropdownItem>
                          <DropdownSeparator />
                          <DropdownItem
                            danger
                            onSelect={() =>
                              confirm(`Excluir o modelo "${c.title}"? Checklists já vinculados às demandas serão mantidos.`) && deleteChecklist(c.id)
                            }
                          >
                            <Trash2 /> Excluir
                          </DropdownItem>
                        </DropdownContent>
                      </DropdownMenu>
                    </div>

                    <ol className="mx-5 mb-4 mt-3 space-y-1 border-l border-zinc-200 pl-3 text-[13px] text-zinc-600">
                      {c.items.slice(0, 4).map((i) => (
                        <li key={i.id} className="truncate">
                          {i.label}
                        </li>
                      ))}
                      {c.items.length > 4 && <li className="text-xs text-zinc-400">+ {c.items.length - 4} itens</li>}
                    </ol>

                    <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500">
                      {c.category && <CategoryBadge category={c.category} />}
                      <span>{c.items.length} itens</span>
                      <span aria-hidden>·</span>
                      <span>
                        {uses.length} {uses.length === 1 ? "uso" : "usos"}
                        {active > 0 && ` (${active} em execução)`}
                      </span>
                      <span className="ml-auto" title={user(c.createdById)?.name}>
                        {timeAgo(c.updatedAt)}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="docs">
          <KnowledgeBase
            initialDocId={params.get("doc")}
            onSelectDoc={(id) => router.replace(`/procedimentos?tab=docs${id ? `&doc=${id}` : ""}`, { scroll: false })}
          />
        </TabsContent>
      </Tabs>

      <ChecklistEditor open={editorOpen} onOpenChange={setEditorOpen} checklist={editing} />
    </>
  );
}
