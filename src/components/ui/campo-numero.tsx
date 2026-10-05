"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

// Aceita "12,50", "12.50" ou "1.234,56". Vazio vira null.
export function lerNumero(texto: string): number | null {
  const t = texto.trim().replace(/\s|R\$|%/g, "");
  if (!t) return null;
  const normal = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

const mostrar = (v: number | null) => (v == null ? "" : String(v).replace(".", ","));

// Campo de número no jeito brasileiro, com prefixo (R$) ou sufixo (%).
// Avisa a mudança ao sair do campo, pra não salvar a cada tecla.
export function CampoNumero({
  id,
  rotulo,
  valor,
  aoMudar,
  prefixo,
  sufixo,
  dica,
  placeholder,
  desativado,
}: {
  id: string;
  rotulo: string;
  valor: number | null;
  aoMudar: (v: number | null) => void;
  prefixo?: string;
  sufixo?: string;
  dica?: string;
  placeholder?: string;
  desativado?: boolean;
}) {
  const [texto, setTexto] = useState(mostrar(valor));
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setTexto(mostrar(valor)), [valor]);

  function confirmar() {
    const n = lerNumero(texto);
    if (n !== valor) aoMudar(n == null ? null : Math.max(0, n));
  }

  return (
    <div>
      <label htmlFor={id} className="block pb-1.5 text-sm font-semibold">{rotulo}</label>
      <div
        className={clsx(
          "flex h-11 items-center gap-1.5 rounded-xl bg-surface-2 px-3 ring-1 ring-inset ring-line focus-within:ring-2 focus-within:ring-cobalt",
          desativado && "opacity-55",
        )}
      >
        {prefixo && <span className="text-sm text-muted">{prefixo}</span>}
        <input
          id={id}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          inputMode="decimal"
          autoComplete="off"
          disabled={desativado}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none num placeholder:text-muted/60"
        />
        {sufixo && <span className="text-sm text-muted">{sufixo}</span>}
      </div>
      {dica && <p className="mt-1 text-xs text-muted">{dica}</p>}
    </div>
  );
}
