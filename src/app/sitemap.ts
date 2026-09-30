import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/entrar`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/termos`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacidade`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
