import { stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getBlogPosts, escapeXml, siteUrl } from "./blog-utils.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const staticPages = [
  { file: "index.html", url: "/", changefreq: "weekly", priority: "1.0" },
  { file: "blog/index.html", url: "/blog/", changefreq: "weekly", priority: "0.8" },
  { file: "docs/privacy-policy.html", url: "/docs/privacy-policy.html", changefreq: "yearly", priority: "0.3" },
  { file: "docs/support.html", url: "/docs/support.html", changefreq: "monthly", priority: "0.4" },
  { file: "docs/terms-of-use.html", url: "/docs/terms-of-use.html", changefreq: "yearly", priority: "0.3" }
];

async function lastModified(file) {
  const { mtime } = await stat(path.join(root, file));
  return mtime.toISOString().slice(0, 10);
}

const blogPosts = await getBlogPosts();
const blogPages = blogPosts.map((post) => ({
  file: `blog/${post.slug}/index.html`,
  url: post.url,
  changefreq: post.type === "devlog" ? "monthly" : "weekly",
  priority: post.featured ? "0.8" : "0.6"
}));

const entries = await Promise.all(
  [...staticPages, ...blogPages].map(async (page) => ({
    ...page,
    lastmod: await lastModified(page.file)
  }))
);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (page) => `  <url>
    <loc>${escapeXml(new URL(page.url, siteUrl).href)}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;

await Promise.all([
  writeFile(path.join(root, "sitemap.xml"), sitemap),
  writeFile(path.join(root, "robots.txt"), robots)
]);
