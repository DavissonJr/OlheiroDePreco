import type { MetadataRoute } from "next";

// Manifesto do PWA. É ele que permite instalar o Radar no celular
// e empacotar como app da Play Store (TWA). Veja o README.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Radar: vendas e concorrentes",
    short_name: "Radar",
    description: "Painel de vendas e aviso de preço dos concorrentes no Mercado Livre.",
    start_url: "/painel",
    display: "standalone",
    background_color: "#eef1f7",
    theme_color: "#2448f0",
    lang: "pt-BR",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
