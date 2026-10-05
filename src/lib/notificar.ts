// Envio de avisos: Telegram (grátis) e e-mail via Resend (opcional).
import { NOME_APP, urlDoSite } from "./config";

export async function enviarTelegram(chatId: string, texto: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  return res.ok;
}

export async function enviarEmail(para: string, assunto: string, html: string) {
  return enviarEmails([{ para, assunto, html }]);
}

export interface Email {
  para: string;
  assunto: string;
  html: string;
}

// Manda vários e-mails numa chamada só (a Resend aceita até 100 por vez).
// Conta como uma requisição externa, o que importa no limite da Cloudflare.
export async function enviarEmails(lista: Email[]) {
  const chave = process.env.RESEND_API_KEY;
  const remetente = process.env.EMAIL_REMETENTE;
  if (!chave || !remetente || !lista.length) return false;
  let ok = true;
  for (let i = 0; i < lista.length; i += 100) {
    const lote = lista.slice(i, i + 100).map((e) => ({ from: remetente, to: e.para, subject: e.assunto, html: e.html }));
    const res = await fetch(lote.length === 1 ? "https://api.resend.com/emails" : "https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify(lote.length === 1 ? lote[0] : lote),
    });
    if (!res.ok) {
      console.error("Resend recusou o envio", res.status, await res.text());
      ok = false;
    }
  }
  return ok;
}

export function escaparHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Moldura simples dos e-mails (estilos inline, que é o que os leitores de e-mail aceitam).
export function moldeEmail(titulo: string, corpo: string, botao = { texto: `Abrir o ${NOME_APP}`, href: `${urlDoSite()}/painel` }) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f5fa;font-family:Arial,Helvetica,sans-serif;color:#141a33">
<div style="max-width:560px;margin:0 auto;padding:28px 18px">
<p style="font-weight:bold;font-size:15px;color:#2d3277;margin:0 0 18px">${NOME_APP}</p>
<div style="background:#ffffff;border-radius:16px;padding:24px">
<h1 style="font-size:20px;margin:0 0 14px">${titulo}</h1>
${corpo}
<p style="margin:24px 0 0"><a href="${botao.href}" style="display:inline-block;background:#2d3fd3;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px">${botao.texto}</a></p>
</div>
<p style="font-size:12px;color:#6b7190;margin:16px 4px 0">Você recebe este e-mail porque tem uma conta no ${NOME_APP}. Ajuste ou desligue em <a href="${urlDoSite()}/painel/alertas" style="color:#6b7190">Avisos</a>.</p>
</div></body></html>`;
}

// Lista de avisos em HTML (um por linha), usada nos e-mails agrupados.
export function listaAvisosHtml(itens: { titulo: string; mensagem: string }[]) {
  return `<ul style="padding:0;margin:0;list-style:none">${itens
    .map(
      (i) =>
        `<li style="padding:12px 0;border-top:1px solid #e6e8f2"><strong>${escaparHtml(i.titulo)}</strong><br><span style="color:#41476a">${escaparHtml(i.mensagem)}</span></li>`,
    )
    .join("")}</ul>`;
}
