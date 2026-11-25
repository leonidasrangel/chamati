"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FullPageLoader } from "@/components/layout/full-page-loader";
import { isStaff } from "@/lib/constants";
import { useStore } from "@/lib/store";

export default function Home() {
  const { hydrated, currentUser } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (!currentUser) router.replace("/login");
    else router.replace(isStaff(currentUser.role) ? "/dashboard" : "/meus-chamados");
  }, [hydrated, currentUser, router]);

  return <FullPageLoader />;
}
