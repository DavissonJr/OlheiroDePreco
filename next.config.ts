import type { NextConfig } from "next";

// Cabeçalhos de segurança aplicados em todas as páginas.
const seguranca = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: seguranca },
      // O Android precisa ler este arquivo pra abrir o app sem barra do navegador.
      { source: "/.well-known/assetlinks.json", headers: [{ key: "Content-Type", value: "application/json" }] },
    ];
  },
};

export default nextConfig;
