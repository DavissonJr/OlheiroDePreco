export function Cabecalho({ titulo, descricao, acoes }: { titulo: string; descricao?: React.ReactNode; acoes?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[32px] font-bold sm:text-[40px]">{titulo}</h1>
        {descricao && <p className="mt-1.5 text-muted">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  );
}
