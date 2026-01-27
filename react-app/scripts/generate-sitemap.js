import { existsSync, mkdirSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve, join } from "path";

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Replace with your actual domain
const baseUrl = "https://yourdomain.md";

// List all static SPA routes
const routes = [
  "/",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms-of-use",
  "/source",
  "/disclaimer",
  // Add dynamic product pages if needed (optional MVP)
];

// Build XML sitemap
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (route) => `  <url>
    <loc>${baseUrl}${route}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

// Output folder relative to project root
const distDir = resolve(__dirname, "../dist");
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Write sitemap.xml to dist folder
writeFileSync(join(distDir, "sitemap.xml"), sitemap, "utf8");

console.log("Sitemap generated at dist/sitemap.xml");
