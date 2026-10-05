import type { MetadataRoute } from "next";

// Manifesto do PWA: permite instalar o Olheiro no celular
// e, mais tarde, empacotar como app da Play Store (TWA). Veja o README.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Olheiro de Preço",
    short_name: "Olheiro",
    description: "Painel de vendas e aviso de preço dos concorrentes no Mercado Livre.",
    id: "/painel",
    start_url: "/painel",
    scope: "/",
    display: "standalone",
    background_color: "#eef1f7",
    theme_color: "#0d254c",
    lang: "pt-BR",
    categories: ["business", "productivity", "shopping"],
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
