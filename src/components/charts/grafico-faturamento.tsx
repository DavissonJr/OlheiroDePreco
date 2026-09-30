"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dataCurta, reais, reaisCurto } from "@/lib/format";

interface Ponto {
  dia: string;
  faturamento: number;
  pedidos: number;
}

function Dica({ active, payload }: { active?: boolean; payload?: { payload: Ponto }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl bg-ink px-3 py-2 text-sm text-bg shadow-lg">
      <p className="opacity-70">{new Date(p.dia + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}</p>
      <p className="num font-bold">{reais(p.faturamento)}</p>
      <p className="num opacity-70">{p.pedidos} {p.pedidos === 1 ? "pedido" : "pedidos"}</p>
    </div>
  );
}

export function GraficoFaturamento({ dados }: { dados: Ponto[] }) {
  const intervalo = dados.length > 40 ? 14 : dados.length > 10 ? 6 : 0;
  return (
    <div className="h-56 w-full sm:h-64" role="img" aria-label="Gráfico de faturamento por dia">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dados} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="preenchimento" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--cobalt)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--cobalt)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 4" />
          <XAxis
            dataKey="dia"
            tickFormatter={(d: string) => dataCurta(d + "T12:00:00")}
            interval={intervalo}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />
          <YAxis
            tickFormatter={(v: number) => reaisCurto(v)}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip content={<Dica />} cursor={{ stroke: "var(--cobalt)", strokeOpacity: 0.35 }} />
          <Area
            type="monotone"
            dataKey="faturamento"
            stroke="var(--cobalt)"
            strokeWidth={2.5}
            fill="url(#preenchimento)"
            animationDuration={700}
            activeDot={{ r: 5, fill: "var(--cobalt)", stroke: "var(--surface)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
