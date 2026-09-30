import Link from "next/link";
import { Check } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { BotaoLink } from "@/components/ui/botao";
import { Etiqueta } from "@/components/ui/etiqueta";
import { CenaHero } from "@/components/landing/cena-hero";
import { Duvidas } from "@/components/landing/duvidas";
import { PLANOS } from "@/lib/planos";
import { IS_DEMO } from "@/lib/config";

const PASSOS = [
  {
    titulo: "Conecte sua conta do Mercado Livre",
    texto: "Você aprova o acesso no próprio site do Mercado Livre. O Radar nunca vê sua senha.",
  },
  {
    titulo: "Cole o link dos concorrentes",
    texto: "Escolha quais anúncios vigiar e com qual produto seu cada um compete.",
  },
  {
    titulo: "Receba o aviso quando o preço mudar",
    texto: "No Telegram ou por e-mail, com a diferença pro seu preço já calculada.",
  },
];

export default function Inicio() {
  return (
    <div className="overflow-x-clip">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] pb-4 sm:px-8">
        <Link href="/" aria-label="Radar, página inicial">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 text-[15px] font-medium text-muted md:flex" aria-label="Seções">
          <a href="#como-funciona" className="hover:text-ink">Como funciona</a>
          <a href="#precos" className="hover:text-ink">Preços</a>
          <a href="#duvidas" className="hover:text-ink">Dúvidas</a>
        </nav>
        <div className="flex items-center gap-2">
          <BotaoLink href="/entrar" variante="fantasma" tamanho="sm">Entrar</BotaoLink>
          <span className="hidden sm:block">
            <BotaoLink href="/entrar?criar=1" tamanho="sm">Criar conta grátis</BotaoLink>
          </span>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid grid-cols-1 max-w-6xl items-center gap-14 px-5 pt-10 pb-20 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10 lg:pt-16 lg:pb-28">
          <div>
            <h1 className="max-w-[13ch] text-[42px] font-extrabold sm:text-6xl lg:text-[68px]">
              Saiba na hora quando um concorrente baixar o preço.
            </h1>
            <p className="mt-6 max-w-[46ch] text-lg text-muted sm:text-xl">
              Conecte sua conta do Mercado Livre, veja quanto você vendeu e receba um aviso no Telegram
              quando alguém ficar mais barato que você.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <BotaoLink href="/entrar?criar=1" tamanho="lg">Criar conta grátis</BotaoLink>
              {IS_DEMO && (
                <BotaoLink href="/painel" variante="secundario" tamanho="lg">Abrir o painel de demonstração</BotaoLink>
              )}
            </div>
            <p className="mt-4 text-sm text-muted">Grátis pra acompanhar até 3 concorrentes. Não pede cartão.</p>
          </div>
          <CenaHero />
        </section>

        {/* Como funciona: é uma sequência de verdade, por isso numerada */}
        <section id="como-funciona" className="border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
            <h2 className="max-w-[20ch] text-3xl font-bold sm:text-[40px]">Três passos, cinco minutos.</h2>
            <ol className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
              {PASSOS.map((p, i) => (
                <li key={p.titulo} className="border-t-2 border-ink pt-5">
                  <span className="font-display text-5xl font-extrabold text-cobalt num">{i + 1}</span>
                  <h3 className="mt-3 text-xl font-bold">{p.titulo}</h3>
                  <p className="mt-2 max-w-[36ch] text-muted">{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Painel */}
        <section className="mx-auto grid grid-cols-1 max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:py-28">
          <div>
            <h2 className="max-w-[18ch] text-3xl font-bold sm:text-[40px]">Seu faturamento de verdade, já sem as taxas.</h2>
            <ul className="mt-8 space-y-4 text-[17px]">
              {[
                "Quanto entrou hoje, na semana e no mês, comparado com o período anterior",
                "Quanto sobra depois da comissão do Mercado Livre",
                "Quais anúncios mais vendem e quais pararam",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <Check className="mt-1 size-5 shrink-0 text-up" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[26px] bg-surface p-6 ring-1 ring-line sm:p-8" aria-hidden>
            <p className="text-sm text-muted">Faturamento nos últimos 30 dias</p>
            <p className="mt-1 font-display text-4xl font-extrabold num sm:text-5xl">R$ 38.412,70</p>
            <p className="mt-1 text-sm font-semibold text-up num">+18,4% sobre os 30 dias anteriores</p>
            <div className="mt-8 flex h-32 items-end gap-1.5">
              {[34, 42, 38, 51, 47, 58, 44, 62, 55, 68, 61, 72, 66, 80, 74, 86, 79, 92].map((h, i) => (
                <span key={i} className="flex-1 rounded-t-[4px] bg-cobalt" style={{ height: `${h}%`, opacity: 0.35 + (i / 18) * 0.65 }} />
              ))}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-5 text-sm">
              <div>
                <p className="text-muted">Pedidos</p>
                <p className="text-lg font-bold num">412</p>
              </div>
              <div>
                <p className="text-muted">Ticket médio</p>
                <p className="text-lg font-bold num">R$ 93,23</p>
              </div>
              <div>
                <p className="text-muted">Sobra</p>
                <p className="text-lg font-bold num">R$ 32,1 mil</p>
              </div>
            </div>
          </div>
        </section>

        {/* Preços */}
        <section id="precos" className="border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
            <h2 className="text-3xl font-bold sm:text-[40px]">Preços</h2>
            <p className="mt-3 max-w-[52ch] text-lg text-muted">
              Comece de graça. Se um único aviso te fizer ajustar o preço a tempo, o Pro já se pagou.
            </p>
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
              {(["gratis", "pro"] as const).map((id) => {
                const p = PLANOS[id];
                const pro = id === "pro";
                return (
                  <div
                    key={id}
                    className={pro ? "rounded-[26px] bg-bg p-7 ring-2 ring-cobalt sm:p-9" : "rounded-[26px] bg-bg p-7 ring-1 ring-line sm:p-9"}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-2xl font-bold">{p.nome}</h3>
                      {pro ? (
                        <Etiqueta valor={p.preco} tom="rival" tamanho="xl" />
                      ) : (
                        <span className="font-display text-[28px] font-extrabold num">R$ 0</span>
                      )}
                    </div>
                    <p className="mt-1 text-muted">{pro ? "por mês, cancele quando quiser" : "pra sempre"}</p>
                    <ul className="mt-7 space-y-3">
                      {p.recursos.map((r) => (
                        <li key={r} className="flex gap-3">
                          <Check className={pro ? "mt-0.5 size-5 shrink-0 text-cobalt" : "mt-0.5 size-5 shrink-0 text-muted"} aria-hidden />
                          {r}
                        </li>
                      ))}
                    </ul>
                    <BotaoLink
                      href="/entrar?criar=1"
                      variante={pro ? "primario" : "secundario"}
                      className="mt-8 w-full"
                    >
                      {pro ? "Começar com o Pro" : "Criar conta grátis"}
                    </BotaoLink>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Dúvidas */}
        <section id="duvidas" className="mx-auto max-w-3xl px-5 py-20 sm:px-8 lg:py-24">
          <h2 className="mb-8 text-3xl font-bold sm:text-[40px]">Dúvidas frequentes</h2>
          <Duvidas />
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-6 rounded-[26px] bg-cobalt px-7 py-10 text-white sm:px-10 md:flex-row md:items-center">
            <h2 className="max-w-[22ch] text-3xl font-bold sm:text-4xl">Pare de descobrir pela queda nas vendas.</h2>
            <BotaoLink href="/entrar?criar=1" variante="etiqueta" tamanho="lg">Criar conta grátis</BotaoLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo tamanho="sm" />
          <p>O Radar não é afiliado ao Mercado Livre nem ao Mercado Pago.</p>
        </div>
      </footer>
    </div>
  );
}
