// Mini gráfico sem biblioteca: leve pra usar em listas.
export function MiniLinha({ valores, cor = "var(--muted)", className }: { valores: number[]; cor?: string; className?: string }) {
  if (valores.length < 2) return <div className={className} />;
  const l = 100;
  const a = 32;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const faixa = max - min || 1;
  let d = "";
  valores.forEach((v, i) => {
    const x = (i / (valores.length - 1)) * l;
    const y = a - 3 - ((v - min) / faixa) * (a - 6);
    if (i === 0) d += `M${x.toFixed(1)},${y.toFixed(1)}`;
    else {
      const yAnterior = a - 3 - ((valores[i - 1] - min) / faixa) * (a - 6);
      d += ` L${x.toFixed(1)},${yAnterior.toFixed(1)} L${x.toFixed(1)},${y.toFixed(1)}`;
    }
  });
  return (
    <svg viewBox={`0 0 ${l} ${a}`} preserveAspectRatio="none" className={className} aria-hidden>
      <path d={d} fill="none" stroke={cor} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
