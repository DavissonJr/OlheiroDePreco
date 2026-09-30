// Sessão de demonstração: quem abre /demo navega no painel com dados de
// exemplo, mesmo com o site em produção. Fica só nesta aba do navegador.
const CHAVE = "olheiro-demo";
const CHAVE_ESTADO = "olheiro-demo-estado";

export function sessaoDemoAtiva() {
  try {
    return sessionStorage.getItem(CHAVE) === "1";
  } catch {
    return false;
  }
}

export function ativarDemo() {
  try {
    sessionStorage.setItem(CHAVE, "1");
  } catch {}
}

export function sairDemo() {
  try {
    sessionStorage.removeItem(CHAVE);
    sessionStorage.removeItem(CHAVE_ESTADO);
  } catch {}
}

// Guarda o que o visitante fez na demonstração, pra sobreviver a um recarregamento.
export function salvarEstadoDemo(estado: unknown) {
  try {
    sessionStorage.setItem(CHAVE_ESTADO, JSON.stringify(estado));
  } catch {}
}

export function lerEstadoDemo<T>(): T | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE_ESTADO);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}

export const hrefConectarML = (demo: boolean) => (demo ? "/onboarding?ml=demo" : "/api/ml/conectar");
