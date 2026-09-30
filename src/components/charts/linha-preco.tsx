"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dataCurta, dataHora, reais, reaisCurto } from "@/lib/format";
import type { PontoPreco } from "@/lib/types";

// Histórico em degraus: preço fica igual até mudar, como na vida real.
export function LinhaPreco({ pontos, meuPreco }: { pontos: PontoPreco[]; meuPreco?: number | null }) {
  const dados = pontos.map((p) => ({ t: new Date(p.registrado_em).getTime(), preco: p.preco }));
  const valores = dados.map((d) => d.preco).concat(meuPreco != null ? [meuPreco] : []);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const folga = Math.max(2, (max - min) * 0.25);

  return (
    <div className="h-52 w-full" role="img" aria-label="Histórico de preço do concorrente">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dados} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 4" />
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t: number) => dataCurta(new Date(t).toISOString())}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickCount={4}
          />
          <YAxis
            domain={[Math.floor(min - folga), Math.ceil(max + folga)]}
            tickFormatter={(v: number) => reaisCurto(v)}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-xl bg-ink px-3 py-2 text-sm text-bg">
                  <p className="opacity-70">{dataHora(new Date(payload[0].payload.t).toISOString())}</p>
                  <p className="num font-bold">{reais(payload[0].payload.preco)}</p>
                </div>
              ) : null
            }
          />
          {meuPreco != null && (
            <ReferenceLine
              y={meuPreco}
              stroke="var(--cobalt)"
              strokeDasharray="5 5"
              label={{ value: `Seu preço ${reais(meuPreco)}`, fill: "var(--cobalt)", fontSize: 12, position: "insideTopRight" }}
            />
          )}
          <Line type="stepAfter" dataKey="preco" stroke="var(--tag-line)" strokeWidth={2.5} dot={false} animationDuration={600} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
