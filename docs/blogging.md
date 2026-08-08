# Drift Blogging Guide

Drift's blog is generated from Markdown files in `content/blog/`.

## Add a Post

1. Create a Markdown file in `content/blog/`.
2. Use a lowercase, hyphenated filename. The filename becomes the URL slug.
3. Add frontmatter.
4. Run `npm run build`.
5. Preview at `http://localhost:5500/blog/`.

## Frontmatter

```yaml
---
title: Example Post
description: A concise search-friendly description.
date: 2026-06-06
updated: 2026-06-06
author: Ava Thalheim
authorTitle: Independent Software Developer
tags:
  - GitHub
  - Repository First
featured: false
draft: false
---
```

Use `type: devlog` for Development Logs.

## Supported Content

- Headings
- Paragraphs
- Lists
- Tables
- Blockquotes
- Code fences
- Inline links
- Inline code

Link between posts with Markdown filenames:

```md
[Repository-first explainer](repository-first-project-management-explained.md)
```

The generator converts that to the correct blog URL.

## Preview in VS Code

Use one of these options:

- Open `blog-preview.html` from the workspace root.
- Open `blog/index.html` directly.
- Use the VS Code task `Open Drift Blog Preview`.

Do not open the `blog/` folder as a `file://` URL. VS Code's browser preview does not automatically load `blog/index.html` from a directory URL.

You can also run:

```sh
node scripts/build.mjs
node scripts/serve.mjs
```

Then open `http://localhost:5500/blog/`.
