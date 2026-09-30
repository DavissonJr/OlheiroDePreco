import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/termos", "/privacidade"], disallow: ["/painel", "/onboarding", "/api", "/auth", "/nova-senha", "/demo"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
