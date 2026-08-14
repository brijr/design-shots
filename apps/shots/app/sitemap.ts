import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://design-shots.com", changeFrequency: "monthly", priority: 1 }];
}
