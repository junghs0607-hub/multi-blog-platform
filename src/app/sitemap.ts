import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const routes = [
    "",
    "/assets",
    "/assets/kr-stock",
    "/assets/us-stock",
    "/assets/etf",
    "/assets/crypto",
    "/assets/real-estate",
    "/assets/funds-bonds",
    "/assets/cash-fx",
    "/assets/gold-commodities",
    "/dividends",
    "/transactions",
    "/portfolio",
    "/watchlist",
    "/alerts",
    "/calendar",
    "/compare",
    "/analytics",
    "/cashflow",
    "/taxes",
    "/accounts",
    "/market",
    "/ai-advisor",
    "/admin",
    "/data-io",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: route === "" ? 1.0 : 0.8,
  }));
}
