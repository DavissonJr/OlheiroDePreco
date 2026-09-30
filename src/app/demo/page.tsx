"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MarcaOlheiro } from "@/components/ui/logo";
import { ativarDemo } from "@/lib/demo";

export default function Demo() {
  const router = useRouter();
  useEffect(() => {
    ativarDemo();
    router.replace("/painel");
  }, [router]);
  return (
    <div className="grid min-h-dvh place-items-center">
      <MarcaOlheiro className="size-12 animate-pulse" />
    </div>
  );
}
