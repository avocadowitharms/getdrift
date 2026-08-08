import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const siteUrl = "https://driftworkspace.app";
export const siteName = "drift";
export const defaultAuthor = {
  name: "Ava Thalheim",
  title: "Independent Software Developer",
  url: "https://avathalheim.dev/"
};

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const blogContentDir = path.join(root, "content", "blog");

export function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeAttr(value = "") {
  return escapeHtml(value).replaceAll("\n", " ");
}

export function escapeXml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "") return "";
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }
  return trimmed.replace(/^['"]|['"]$/g, "");
}

export function parseFrontmatter(source) {
  if (!source.startsWith("---")) {
    return { data: {}, body: source.trim() };
  }

  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: source.trim() };
  }

  const data = {};
  let currentKey = null;

  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;

    const listMatch = line.match(/^\s*-\s+(.*)$/);
    if (listMatch && currentKey) {
      data[currentKey] = Array.isArray(data[currentKey]) ? data[currentKey] : [];
      data[currentKey].push(parseScalar(listMatch[1]));
      continue;
    }

    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (pair) {
      currentKey = pair[1];
      data[currentKey] = parseScalar(pair[2]);
    }
  }

  return { data, body: match[2].trim() };
}

export function calculateReadingTime(markdown) {
  const words = markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<[^>]+>/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

export async function getBlogPosts({ includeDrafts = false } = {}) {
  const files = (await readdir(blogContentDir)).filter((file) => file.endsWith(".md"));
  const posts = await Promise.all(
    files.map(async (file) => {
      const source = await readFile(path.join(blogContentDir, file), "utf8");
      const { data, body } = parseFrontmatter(source);
      const slug = slugify(file.replace(/\.md$/, ""));
      const tags = Array.isArray(data.tags) ? data.tags : [];
      return {
        ...data,
        slug,
        title: data.title || slug,
        description: data.description || "",
        date: data.date || "2026-01-01",
        updated: data.updated || data.date || "2026-01-01",
        author: data.author || defaultAuthor.name,
        authorTitle: data.authorTitle || defaultAuthor.title,
        tags,
        featured: Boolean(data.featured),
        draft: Boolean(data.draft),
        type: data.type || "article",
        body,
        readingTime: calculateReadingTime(body),
        url: `/blog/${slug}/`
      };
    })
  );

  return posts
    .filter((post) => includeDrafts || !post.draft)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function absoluteUrl(urlPath) {
  return new URL(urlPath, siteUrl).href;
}
