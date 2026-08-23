#!/usr/bin/env node

import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsRoot = path.join(projectRoot, "src/content/docs/social-psychology");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const asideFileIndex = args.indexOf("--aside-file");
const asideFile = asideFileIndex >= 0 ? args[asideFileIndex + 1] : null;
const tocFileIndex = args.indexOf("--toc-file");
const tocFile = tocFileIndex >= 0 ? args[tocFileIndex + 1] : null;

const bookUrl = "https://opentextbc.ca/socialpsychology/";

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function asideFor(sourceUrl) {
  return `
<aside class="translation-attribution">
  このページは、Rajiv Jhangiani および Hammond Tarry による
  <a href="${escapeHtml(bookUrl)}">Principles of Social Psychology</a>
  を ChatGPT が翻訳したものです。原著の対応ページは
  <a href="${escapeHtml(sourceUrl)}">こちら</a>です。原著は
  <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0 ライセンス</a>
  の下で提供されています。日本語訳も同じライセンスの下で提供されます。
</aside>`;
}

if (asideFile && asideFile.startsWith("--")) {
  console.error(
    "Usage: node scripts/add-social-psychology-aside.mjs [--aside-file path/to/aside.html] [--dry-run]",
  );
  process.exit(1);
}

const customAside = asideFile
  ? (await readFile(path.resolve(projectRoot, asideFile), "utf8")).trim()
  : null;

if (customAside && !/^<aside(?:\s[^>]*)?>[\s\S]*<\/aside>$/.test(customAside)) {
  throw new Error("The aside file must contain one complete <aside>...</aside> block.");
}

async function getSourceLinks() {
  const html = tocFile
    ? await readFile(path.resolve(projectRoot, tocFile), "utf8")
    : await (async () => {
        const response = await fetch(bookUrl);
        if (!response.ok) {
          throw new Error(`Could not fetch the source table of contents: ${response.status} ${response.statusText}`);
        }
        return response.text();
      })();
  const links = new Map();
  const chapterGroups = [];
  const bookParts = [];
  const frontMatter = [];
  const backMatter = [];
  const anchorPattern = /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>/gis;

  for (const match of html.matchAll(anchorPattern)) {
    const url = new URL(match[2], bookUrl);
    if (url.hostname !== "opentextbc.ca" || !url.pathname.startsWith("/socialpsychology/")) {
      continue;
    }

    const pathParts = url.pathname.split("/").filter(Boolean);
    if (pathParts.length < 2) {
      continue;
    }

    url.hash = "";
    url.search = "";
    const slug = decodeURIComponent(pathParts.at(-1));
    links.set(slug, url.href);

    if (url.pathname.includes("/chapter/")) {
      chapterGroups.at(-1)?.push(url.href);
    } else if (url.pathname.includes("/part/")) {
      bookParts.push(url.href);
      chapterGroups.push([]);
    } else if (url.pathname.includes("/front-matter/")) {
      frontMatter.push(url.href);
    } else if (url.pathname.includes("/back-matter/")) {
      backMatter.push(url.href);
    }
  }

  return { links, chapterGroups, parts: bookParts, frontMatter, backMatter };
}

const sourceContents = customAside ? null : await getSourceLinks();

async function findMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findMarkdownFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(entryPath);
    }
  }

  return files;
}

function sourceSlugForFile(file) {
  const name = path.basename(file, ".md");
  return name.replace(/^\d{2}(?:-\d{2})?-/, "");
}

function sourceUrlForFile(file) {
  const name = path.basename(file, ".md");
  const slug = sourceSlugForFile(file);
  const section = name.match(/^(\d{2})-(\d{2})-/);
  const chapter = name.match(/^(\d{2})-/);
  let sourceUrl;

  if (section) {
    const chapterIndex = Number(section[1]) - 1;
    const sectionIndex = Number(section[2]) - 1;
    sourceUrl = sourceContents.chapterGroups[chapterIndex]?.[sectionIndex];
  } else if (chapter) {
    sourceUrl = sourceContents.parts[Number(chapter[1]) - 1];
  } else {
    sourceUrl = sourceContents.links.get(slug);
  }

  // The local names follow the translated title, while these source pages use
  // Pressbooks' original slugs.
  const aliases = {
    "adapting-authors-notes": "about-the-adapted-edition",
    "about-the-authors": "about-the-author",
  };
  if (!sourceUrl && aliases[slug]) {
    sourceUrl = sourceContents.links.get(aliases[slug]);
  }

  // These book-navigation pages are represented by the book home page in the source.
  if (!sourceUrl && ["title", "contents", "copyright-and-license"].includes(slug)) {
    return bookUrl;
  }

  if (!sourceUrl) {
    throw new Error(`No source page found in the book contents for ${path.relative(projectRoot, file)} (slug: ${slug})`);
  }

  return sourceUrl;
}

function insertAfterFrontmatter(content, aside, sourceUrl) {
  const frontmatter = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  const offset = frontmatter ? frontmatter[0].length : 0;
  const before = content.slice(0, offset);
  const after = content.slice(offset);

  const existingAside = after.match(/^\s*<aside(?:\s[^>]*)?>[\s\S]*?<\/aside>/);
  if (existingAside) {
    if (!sourceUrl) {
      return content;
    }

    const updatedAside = existingAside[0].replace(
      /(<a\s+href=")[^"]+("\s*>\s*こちら\s*<\/a>)/,
      `$1${escapeHtml(sourceUrl)}$2`,
    );
    return updatedAside === existingAside[0]
      ? content
      : `${before}${updatedAside}${after.slice(existingAside[0].length)}`;
  }

  return `${before}\n${aside}\n\n${after.replace(/^\n+/, "")}`;
}

for (const file of await findMarkdownFiles(docsRoot)) {
  const content = await readFile(file, "utf8");
  const sourceUrl = customAside ? null : sourceUrlForFile(file);
  const aside = customAside ?? asideFor(sourceUrl);
  const updated = insertAfterFrontmatter(content, aside, sourceUrl);

  if (updated === content) {
    continue;
  }

  const relativePath = path.relative(projectRoot, file);
  console.log(`${dryRun ? "Would update" : "Updating"}: ${relativePath}`);

  if (!dryRun) {
    await writeFile(file, updated, "utf8");
  }
}
