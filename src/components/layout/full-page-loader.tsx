import { LoaderCircle } from "lucide-react";

export function FullPageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-zinc-400">
      <LoaderCircle className="size-5 animate-spin" aria-label="Carregando" />
    </div>
  );
}
