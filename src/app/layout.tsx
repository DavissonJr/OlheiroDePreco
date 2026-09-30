import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/config";
import "./globals.css";

const descricao =
  "Veja quanto você vendeu no Mercado Livre e receba um aviso no Telegram quando um concorrente baixar o preço.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Olheiro de Preço: saiba na hora quando o concorrente baixar o preço",
    template: "%s | Olheiro de Preço",
  },
  description: descricao,
  applicationName: "Olheiro de Preço",
  keywords: ["monitorar preço concorrente", "Mercado Livre", "vendedor", "preço", "painel de vendas", "aviso de preço"],
  appleWebApp: { capable: true, title: "Olheiro", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Olheiro de Preço",
    title: "Olheiro de Preço",
    description: descricao,
  },
  twitter: { card: "summary_large_image", title: "Olheiro de Preço", description: descricao },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1122" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
