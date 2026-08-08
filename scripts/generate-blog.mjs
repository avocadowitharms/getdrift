import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  absoluteUrl,
  defaultAuthor,
  escapeAttr,
  escapeHtml,
  formatDate,
  getBlogPosts,
  root,
  siteName,
  siteUrl,
  slugify
} from "./blog-utils.mjs";

const outputDir = path.join(root, "blog");
const stylePath = "../style.css";
const homeStylePath = "style.css";
const ogImage = `${siteUrl}/assets/drift-project-timeline.png`;

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
      const url = href.endsWith(".md")
        ? `/blog/${slugify(href.replace(/\.md$/, ""))}/index.html`
        : href;
      return `<a href="${escapeAttr(url)}">${label}</a>`;
    });
}

function renderTable(lines) {
  const rows = lines
    .filter((line) => line.trim().startsWith("|"))
    .map((line) =>
      line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => inlineMarkdown(cell.trim()))
    );

  if (rows.length < 2) return "";
  const [head, _separator, ...body] = rows;
  return `<div class="table-scroll"><table>
    <thead><tr>${head.map((cell) => `<th>${cell}</th>`).join("")}</tr></thead>
    <tbody>${body
      .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
      .join("")}</tbody>
  </table></div>`;
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  const headings = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      html.push(`<pre><code class="language-${escapeAttr(lang)}">${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^\|(.+)\|$/.test(line) && i + 1 < lines.length && /^\|[\s:-|]+\|$/.test(lines[i + 1])) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i += 1;
      }
      html.push(renderTable(tableLines));
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      const id = slugify(text);
      if (level > 1) headings.push({ level, text, id });
      html.push(`<h${level} id="${id}">${inlineMarkdown(text)}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      html.push(`<blockquote>${quote.map((item) => `<p>${inlineMarkdown(item)}</p>`).join("")}</blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      html.push(`<ol>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ol>`);
      continue;
    }

    const paragraph = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !lines[i].startsWith("```") &&
      !/^\|(.+)\|$/.test(lines[i])
    ) {
      paragraph.push(lines[i]);
      i += 1;
    }

    if (paragraph.length) {
      html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    } else {
      html.push(`<p>${inlineMarkdown(lines[i])}</p>`);
      i += 1;
    }
  }

  return { html: html.join("\n"), headings };
}

function findRelated(post, posts) {
  return posts
    .filter((candidate) => candidate.slug !== post.slug)
    .map((candidate) => ({
      post: candidate,
      score: candidate.tags.filter((tag) => post.tags.includes(tag)).length
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.post.date) - new Date(a.post.date))
    .slice(0, 3)
    .map((item) => item.post);
}

function layout({ title, description, canonical, stylesheet, assetPrefix = "", body, structuredData, pageClass = "", ogType = "article" }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeAttr(description)}" />
    <meta name="author" content="${escapeAttr(defaultAuthor.name)}" />
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#f8f8f7" />
    <link rel="canonical" href="${escapeAttr(canonical)}" />
    <link rel="icon" href="${assetPrefix}assets/favicon-32x32.png" type="image/png" sizes="32x32" />
    <link rel="apple-touch-icon" href="${assetPrefix}assets/apple-touch-icon.png" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="${siteName}" />
    <meta property="og:url" content="${escapeAttr(canonical)}" />
    <meta property="og:title" content="${escapeAttr(title)}" />
    <meta property="og:description" content="${escapeAttr(description)}" />
    <meta property="og:image" content="${ogImage}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttr(title)}" />
    <meta name="twitter:description" content="${escapeAttr(description)}" />
    <meta name="twitter:image" content="${ogImage}" />
    <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
    <link rel="stylesheet" href="${stylesheet}" />
  </head>
  <body class="${pageClass}">
    ${body}
  </body>
</html>
`;
}

function header(prefix = "../") {
  return `<header class="site-header" aria-label="drift">
  <a class="brand" href="${prefix}index.html" aria-label="drift home">drift</a>
  <nav aria-label="Main navigation">
    <a href="${prefix}index.html#repository">Repository</a>
    <a href="${prefix}index.html#context">Context</a>
    <a href="${prefix}index.html#local-first">Local-first</a>
    <a href="${prefix}blog/index.html">Blog</a>
    <a href="${prefix}index.html#subscribe">Access</a>
  </nav>
</header>`;
}

function footer(prefix = "../") {
  return `<footer class="site-footer">
  <span>&copy; Ava Thalheim</span>
  <a href="https://avathalheim.dev/" target="_blank" rel="noopener noreferrer">avathalheim.dev</a>
  <a href="mailto:avocadowitharms@gmail.com">avocadowitharms@gmail.com</a>
  <nav class="footer-links" aria-label="Support and legal">
    <a href="${prefix}docs/support.html">Support</a>
    <a href="${prefix}docs/privacy-policy.html">Privacy</a>
    <a href="${prefix}docs/terms-of-use.html">Terms</a>
  </nav>
</footer>`;
}

function tagList(tags) {
  return tags.map((tag) => `<span class="blog-tag">${escapeHtml(tag)}</span>`).join("");
}

function articleCard(post) {
  const searchableTags = post.tags.join(" ").toLowerCase();
  const filterTags = `|${post.tags.map((tag) => tag.toLowerCase()).join("|")}|`;
  return `<article class="blog-card" data-title="${escapeAttr(post.title.toLowerCase())}" data-description="${escapeAttr(post.description.toLowerCase())}" data-tags="${escapeAttr(searchableTags)}" data-filter-tags="${escapeAttr(filterTags)}">
  <div class="blog-card-meta">
    <time datetime="${post.date}">${formatDate(post.date)}</time>
    <span>${post.readingTime} min read</span>
    ${post.type === "devlog" ? '<span class="devlog-pill">Development log</span>' : ""}
  </div>
  <h2><a href="${post.slug}/index.html">${escapeHtml(post.title)}</a></h2>
  <p>${escapeHtml(post.description)}</p>
  <div class="blog-tags">${tagList(post.tags)}</div>
</article>`;
}

function blogIndex(posts) {
  const tags = [...new Set(posts.flatMap((post) => post.tags))].sort();
  const featured = posts.find((post) => post.featured) || posts[0];
  const listedPosts = posts.filter((post) => post.slug !== featured?.slug);
  const body = `${header("../")}
<main class="blog-home">
  <section class="blog-hero" aria-labelledby="blog-title">
    <p class="eyebrow">Drift Blog</p>
    <h1 id="blog-title">Repository-first project management, explained by building it.</h1>
    <p>Technical notes, comparisons, and development logs for developers who want project management to live closer to the code.</p>
  </section>
  <section class="blog-controls" aria-label="Article filters">
    <label class="sr-only" for="blog-search">Search articles</label>
    <input id="blog-search" type="search" placeholder="Search articles" autocomplete="off" />
    <span class="sort-note">Newest first</span>
    <div class="tag-filters" aria-label="Filter by tag">
      <button class="tag-filter active" type="button" data-tag="all">All</button>
      ${tags.map((tag) => `<button class="tag-filter" type="button" data-tag="${escapeAttr(tag.toLowerCase())}">${escapeHtml(tag)}</button>`).join("")}
    </div>
  </section>
  ${featured ? `<section class="featured-post" aria-label="Featured article">${articleCard(featured)}</section>` : ""}
  <section class="blog-list" aria-label="Articles">
    ${listedPosts.map(articleCard).join("")}
  </section>
</main>
${footer("../")}
<script>
  const search = document.querySelector("#blog-search");
  const filters = [...document.querySelectorAll("[data-tag]")];
  const cards = [...document.querySelectorAll(".blog-card")];
  let activeTag = "all";

  function applyFilters() {
    const query = search.value.trim().toLowerCase();
    cards.forEach((card) => {
      const haystack = [card.dataset.title, card.dataset.description, card.dataset.tags].join(" ");
      const matchesSearch = !query || haystack.includes(query);
      const matchesTag = activeTag === "all" || card.dataset.filterTags.includes("|" + activeTag + "|");
      card.hidden = !(matchesSearch && matchesTag);
    });
  }

  search.addEventListener("input", applyFilters);
  filters.forEach((button) => {
    button.addEventListener("click", () => {
      activeTag = button.dataset.tag;
      filters.forEach((item) => item.classList.toggle("active", item === button));
      applyFilters();
    });
  });
</script>`;

  return layout({
    title: "Drift Blog - Repository-first project management",
    description: "Technical articles, comparisons, and development logs about repository-first project management for developers.",
    canonical: absoluteUrl("/blog/"),
    stylesheet: stylePath,
    assetPrefix: "../",
    pageClass: "blog-page",
    ogType: "website",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "Drift Blog",
      url: absoluteUrl("/blog/"),
      description: "Repository-first project management writing for developers.",
      author: { "@type": "Person", name: defaultAuthor.name, jobTitle: defaultAuthor.title }
    },
    body
  });
}

function articlePage(post, posts) {
  const { html, headings } = markdownToHtml(post.body);
  const related = findRelated(post, posts);
  const index = posts.findIndex((item) => item.slug === post.slug);
  const previous = posts[index + 1];
  const next = posts[index - 1];
  const canonical = absoluteUrl(post.url);
  const faqHeadings = headings.filter((heading) => heading.level === 3 && heading.text.endsWith("?"));
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": post.type === "devlog" ? "BlogPosting" : "Article",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.updated,
      url: canonical,
      image: ogImage,
      author: { "@type": "Person", name: post.author, jobTitle: post.authorTitle },
      publisher: { "@type": "Organization", name: siteName, url: siteUrl }
    }
  ];

  if (faqHeadings.length) {
    structuredData.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqHeadings.map((heading) => ({
        "@type": "Question",
        name: heading.text,
        acceptedAnswer: {
          "@type": "Answer",
          text: post.description
        }
      }))
    });
  }

  const body = `${header("../../")}
<main class="article-shell">
  <article class="article-page">
    <header class="article-header">
      ${post.type === "devlog" ? '<p class="devlog-pill">Development log</p>' : '<p class="eyebrow">Article</p>'}
      <h1>${escapeHtml(post.title)}</h1>
      <p>${escapeHtml(post.description)}</p>
      <div class="article-meta">
        <span>${escapeHtml(post.author)}</span>
        <span>${escapeHtml(post.authorTitle)}</span>
        <time datetime="${post.date}">${formatDate(post.date)}</time>
        <span>${post.readingTime} min read</span>
      </div>
      <div class="blog-tags">${tagList(post.tags)}</div>
    </header>
    <div class="article-layout">
      <aside class="article-sidebar" aria-label="Article navigation">
        <section class="toc">
          <h2>Contents</h2>
          <ol>
            ${headings.map((heading) => `<li class="toc-level-${heading.level}"><a href="#${heading.id}">${escapeHtml(heading.text)}</a></li>`).join("")}
          </ol>
        </section>
        <section class="author-card" aria-label="Author">
          <h2>${escapeHtml(post.author)}</h2>
          <p>${escapeHtml(post.authorTitle)}</p>
          <a href="${defaultAuthor.url}" target="_blank" rel="noopener noreferrer">Author site</a>
        </section>
      </aside>
      <div class="article-content">
        ${html}
        <section class="suggested-reading">
          <h2>Suggested Reading</h2>
          <p>Follow the repository-first thread through related comparisons, build notes, and workflow decisions.</p>
          <div class="related-grid">${related.map((item) => `<a href="../${item.slug}/index.html"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.description)}</span></a>`).join("")}</div>
        </section>
      </div>
    </div>
    <footer class="article-footer">
      <div class="share-links" aria-label="Share article">
        <span>Share</span>
        <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(canonical)}&text=${encodeURIComponent(post.title)}" target="_blank" rel="noopener noreferrer">X</a>
        <a href="https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(canonical)}" target="_blank" rel="noopener noreferrer">LinkedIn</a>
      </div>
      <nav class="post-nav" aria-label="Previous and next articles">
        ${previous ? `<a href="../${previous.slug}/index.html"><span>Previous</span>${escapeHtml(previous.title)}</a>` : "<span></span>"}
        ${next ? `<a href="../${next.slug}/index.html"><span>Next</span>${escapeHtml(next.title)}</a>` : "<span></span>"}
      </nav>
    </footer>
  </article>
</main>
${footer("../../")}`;

  return layout({
    title: `${post.title} - Drift Blog`,
    description: post.description,
    canonical,
    stylesheet: "../../style.css",
    assetPrefix: "../../",
    pageClass: "blog-page",
    structuredData,
    body
  });
}

const posts = await getBlogPosts();
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "index.html"), blogIndex(posts));

for (const post of posts) {
  const postDir = path.join(outputDir, post.slug);
  await mkdir(postDir, { recursive: true });
  await writeFile(path.join(postDir, "index.html"), articlePage(post, posts));
}

console.log(`Generated ${posts.length} blog posts.`);
