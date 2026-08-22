#!/usr/bin/env node

/**
 * Convert a Pressbooks single-file HTML/XHTML export to Astro Starlight Markdown.
 *
 * Runtime dependencies: none. This file uses only Node.js built-ins.
 *
 * Default mode creates one Markdown file per top-level Pressbooks part/chapter.
 * `--mode sections` creates a chapter overview plus one page per numbered section.
 */

// @ts-ignore -- Node built-in; keeping this script self-contained even without @types/node.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
// @ts-ignore -- Node built-in; see note above.
import * as path from 'node:path';
// @ts-ignore -- Node built-in; see note above.
import * as process from 'node:process';

type RootNode = {
  type: 'root';
  children: HtmlNode[];
};

type TextNode = {
  type: 'text';
  value: string;
};

type ElementNode = {
  type: 'element';
  tag: string;
  attrs: Record<string, string>;
  children: HtmlNode[];
};

type HtmlNode = TextNode | ElementNode;
type ParentNode = RootNode | ElementNode;

type Mode = 'chapters' | 'sections';

type Options = {
  input: string;
  outputDir: string;
  routePrefix?: string;
  mode: Mode;
};

type Chapter = {
  index: number;
  title: string;
  slug: string;
  wrapper: ElementNode;
  part: ElementNode;
  sections: ElementNode[];
};

type OutputPage = {
  order: number;
  title: string;
  slug: string;
  chapter: Chapter;
  kind: 'chapter' | 'overview' | 'section';
  section?: ElementNode;
};

type RenderContext = {
  page: OutputPage;
  idToPage: Map<string, OutputPage>;
  referencedIds: Set<string>;
  routePrefix: string;
  headingShift: number;
  inAside: boolean;
};

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

function usage(exitCode = 1): never {
  const text = `Usage:
  node pressbooks-to-starlight.js <book.html> [output-dir] [options]

Options:
  --mode chapters|sections
      chapters (default): one Markdown file per top-level chapter.
      sections: chapter overview pages plus one file per 1.1/1.2-style section.

  --route-prefix /social-psychology
      Starlight URL prefix. If output-dir is under src/content/docs, this is
      inferred automatically.

Defaults:
  output-dir:   src/content/docs/social-psychology
  mode:         chapters
  route-prefix: inferred from output-dir

Examples:
  node pressbooks-to-starlight.js book.html src/content/docs/social-psychology
  node pressbooks-to-starlight.js book.html src/content/docs/social-psychology --mode sections
`;

  (exitCode === 0 ? console.log : console.error)(text);
  process.exit(exitCode);
  throw new Error('unreachable');
}

function parseArgs(argv: string[]): Options {
  const positional: string[] = [];
  let routePrefix: string | undefined;
  let mode: Mode = 'chapters';

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--route-prefix') {
      routePrefix = argv[++i];
      if (!routePrefix) usage();
    } else if (arg.startsWith('--route-prefix=')) {
      routePrefix = arg.slice('--route-prefix='.length);
    } else if (arg === '--mode') {
      const value = argv[++i];
      if (value !== 'chapters' && value !== 'sections') usage();
      mode = value;
    } else if (arg.startsWith('--mode=')) {
      const value = arg.slice('--mode='.length);
      if (value !== 'chapters' && value !== 'sections') usage();
      mode = value;
    } else if (arg === '-h' || arg === '--help') {
      usage(0);
    } else if (arg.startsWith('-')) {
      console.error(`Unknown option: ${arg}`);
      usage();
    } else {
      positional.push(arg);
    }
  }

  if (positional.length < 1 || positional.length > 2) usage();

  return {
    input: positional[0],
    outputDir: positional[1] ?? 'src/content/docs/social-psychology',
    routePrefix,
    mode,
  };
}

// ---------------------------------------------------------------------------
// Minimal HTML/XHTML parser
// ---------------------------------------------------------------------------

/**
 * This is intentionally not a general browser HTML parser. It is a small,
 * forgiving tree builder for Pressbooks' single-file export, which is XHTML-
 * shaped and uses ordinary, balanced content tags.
 */
function parseHtml(source: string): RootNode {
  const root: RootNode = { type: 'root', children: [] };
  const stack: ParentNode[] = [root];
  let i = 0;

  const append = (node: HtmlNode): void => {
    const children = stack[stack.length - 1].children;
    const previous = children[children.length - 1];

    if (node.type === 'text' && previous?.type === 'text') {
      previous.value += node.value;
    } else {
      children.push(node);
    }
  };

  while (i < source.length) {
    const lt = source.indexOf('<', i);

    if (lt < 0) {
      append({ type: 'text', value: source.slice(i) });
      break;
    }

    if (lt > i) {
      append({ type: 'text', value: source.slice(i, lt) });
      i = lt;
    }

    if (source.startsWith('<!--', i)) {
      const end = source.indexOf('-->', i + 4);
      i = end < 0 ? source.length : end + 3;
      continue;
    }

    if (source.startsWith('<![CDATA[', i)) {
      const end = source.indexOf(']]>', i + 9);
      const value = end < 0 ? source.slice(i + 9) : source.slice(i + 9, end);
      append({ type: 'text', value });
      i = end < 0 ? source.length : end + 3;
      continue;
    }

    // XML declarations and doctypes are metadata, not document content.
    if (source.startsWith('<?', i) || /^<!doctype\b/i.test(source.slice(i, i + 16))) {
      const end = source.indexOf('>', i + 2);
      i = end < 0 ? source.length : end + 1;
      continue;
    }

    if (source.startsWith('</', i)) {
      const end = findTagEnd(source, i + 2);
      if (end < 0) break;

      const tag = source.slice(i + 2, end).trim().split(/\s+/, 1)[0]?.toLowerCase();
      if (tag) {
        for (let s = stack.length - 1; s > 0; s--) {
          const node = stack[s];
          if (node.type === 'element' && node.tag === tag) {
            stack.length = s;
            break;
          }
        }
      }

      i = end + 1;
      continue;
    }

    // Treat a literal '<' as text when it clearly is not opening a tag.
    if (!/[A-Za-z!]/.test(source[i + 1] ?? '')) {
      append({ type: 'text', value: '<' });
      i++;
      continue;
    }

    const end = findTagEnd(source, i + 1);
    if (end < 0) {
      append({ type: 'text', value: source.slice(i) });
      break;
    }

    const raw = source.slice(i + 1, end);
    const parsed = parseStartTag(raw);
    if (!parsed) {
      append({ type: 'text', value: source.slice(i, end + 1) });
      i = end + 1;
      continue;
    }

    const element: ElementNode = {
      type: 'element',
      tag: parsed.tag,
      attrs: parsed.attrs,
      children: [],
    };
    append(element);
    i = end + 1;

    if (parsed.selfClosing || VOID_TAGS.has(parsed.tag)) continue;

    // Raw-text elements can contain arbitrary '<' characters. They are not
    // useful for the Markdown output, but consuming them correctly keeps the
    // tree builder synchronized.
    if (parsed.tag === 'script' || parsed.tag === 'style') {
      const closePattern = new RegExp(`</${parsed.tag}\\s*>`, 'ig');
      closePattern.lastIndex = i;
      const match = closePattern.exec(source);
      if (match) {
        element.children.push({ type: 'text', value: source.slice(i, match.index) });
        i = match.index + match[0].length;
      }
      continue;
    }

    stack.push(element);
  }

  return root;
}

function findTagEnd(source: string, start: number): number {
  let quote: string | undefined;

  for (let i = start; i < source.length; i++) {
    const char = source[i];

    if (quote) {
      if (char === quote) quote = undefined;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      return i;
    }
  }

  return -1;
}

function parseStartTag(rawInput: string):
  | { tag: string; attrs: Record<string, string>; selfClosing: boolean }
  | undefined {
  let raw = rawInput.trim();
  if (!raw || raw.startsWith('!')) return undefined;

  let selfClosing = false;
  if (/\/\s*$/.test(raw)) {
    selfClosing = true;
    raw = raw.replace(/\/\s*$/, '').trimEnd();
  }

  const tagMatch = /^([^\s/>]+)/.exec(raw);
  if (!tagMatch) return undefined;

  const tag = tagMatch[1].toLowerCase();
  const attrs: Record<string, string> = {};
  let i = tagMatch[0].length;

  while (i < raw.length) {
    while (i < raw.length && /\s/.test(raw[i])) i++;
    if (i >= raw.length) break;

    const nameStart = i;
    while (i < raw.length && !/[\s=/>]/.test(raw[i])) i++;
    const name = raw.slice(nameStart, i).toLowerCase();
    if (!name) {
      i++;
      continue;
    }

    while (i < raw.length && /\s/.test(raw[i])) i++;

    let value = '';
    if (raw[i] === '=') {
      i++;
      while (i < raw.length && /\s/.test(raw[i])) i++;

      const quote = raw[i];
      if (quote === '"' || quote === "'") {
        i++;
        const valueStart = i;
        while (i < raw.length && raw[i] !== quote) i++;
        value = raw.slice(valueStart, i);
        if (raw[i] === quote) i++;
      } else {
        const valueStart = i;
        while (i < raw.length && !/[\s>]/.test(raw[i])) i++;
        value = raw.slice(valueStart, i);
      }
    }

    attrs[name] = decodeHtmlEntities(value);
  }

  return { tag, attrs, selfClosing };
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (whole, entity: string) => {
    const lower = entity.toLowerCase();

    if (lower.startsWith('#x')) {
      const codePoint = Number.parseInt(lower.slice(2), 16);
      return safeCodePoint(codePoint, whole);
    }

    if (lower.startsWith('#')) {
      const codePoint = Number.parseInt(lower.slice(1), 10);
      return safeCodePoint(codePoint, whole);
    }

    switch (lower) {
      case 'amp': return '&';
      case 'lt': return '<';
      case 'gt': return '>';
      case 'quot': return '"';
      case 'apos': return "'";
      case 'nbsp': return ' ';
      default: return whole;
    }
  });
}

function safeCodePoint(codePoint: number, fallback: string): string {
  if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return fallback;
  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Tree helpers and Pressbooks structure
// ---------------------------------------------------------------------------

function isElement(node: HtmlNode): node is ElementNode {
  return node.type === 'element';
}

function classSet(node: ElementNode): Set<string> {
  return new Set((node.attrs.class ?? '').split(/\s+/).filter(Boolean));
}

function hasClass(node: ElementNode, className: string): boolean {
  return classSet(node).has(className);
}

function directElementChildren(node: ParentNode): ElementNode[] {
  return node.children.filter(isElement);
}

function directChildByClass(node: ParentNode, className: string): ElementNode | undefined {
  return directElementChildren(node).find((child) => hasClass(child, className));
}

function descendants(node: ParentNode, predicate: (node: ElementNode) => boolean): ElementNode[] {
  const result: ElementNode[] = [];

  const visit = (parent: ParentNode): void => {
    for (const child of parent.children) {
      if (!isElement(child)) continue;
      if (predicate(child)) result.push(child);
      visit(child);
    }
  };

  visit(node);
  return result;
}

function firstDescendant(node: ParentNode, predicate: (node: ElementNode) => boolean): ElementNode | undefined {
  for (const child of node.children) {
    if (!isElement(child)) continue;
    if (predicate(child)) return child;
    const nested = firstDescendant(child, predicate);
    if (nested) return nested;
  }
  return undefined;
}

function collectIds(node: ParentNode): string[] {
  const ids: string[] = [];
  if (node.type === 'element' && node.attrs.id) ids.push(node.attrs.id);
  for (const descendant of descendants(node, () => true)) {
    if (descendant.attrs.id) ids.push(descendant.attrs.id);
  }
  return ids;
}

function textContent(node: HtmlNode | ParentNode): string {
  if (node.type === 'text') return decodeHtmlEntities(node.value);
  return node.children.map(textContent).join('');
}

function plainText(node: HtmlNode | ParentNode): string {
  return textContent(node).replace(/\s+/g, ' ').trim();
}

function buildChapters(root: RootNode): Chapter[] {
  const wrappers = descendants(root, (node) => hasClass(node, 'part-wrapper'));
  const chapters: Chapter[] = [];

  for (const wrapper of wrappers) {
    const part = directElementChildren(wrapper).find((child) => hasClass(child, 'part'));
    if (!part) continue;

    const titleNode = firstDescendant(part, (node) => hasClass(node, 'part-title'));
    const index = chapters.length + 1;
    const title = titleNode ? plainText(titleNode) : `Chapter ${index}`;
    const sections = directElementChildren(wrapper).filter(
      (child) => hasClass(child, 'chapter') && hasClass(child, 'standard'),
    );

    chapters.push({
      index,
      title,
      slug: chapterSlug(index, title),
      wrapper,
      part,
      sections,
    });
  }

  return chapters;
}

function buildOutputPages(chapters: Chapter[], mode: Mode): OutputPage[] {
  if (mode === 'chapters') {
    return chapters.map((chapter) => ({
      order: chapter.index,
      title: chapter.title,
      slug: chapter.slug,
      chapter,
      kind: 'chapter',
    }));
  }

  const pages: OutputPage[] = [];
  let order = 1;

  for (const chapter of chapters) {
    pages.push({
      order: order++,
      title: chapter.title,
      slug: chapter.slug,
      chapter,
      kind: 'overview',
    });

    chapter.sections.forEach((section, sectionIndex) => {
      const titleNode = firstDescendant(section, (node) => hasClass(node, 'chapter-title'));
      const title = titleNode ? plainText(titleNode) : `${chapter.index}.${sectionIndex + 1}`;
      const titleWithoutNumber = title.replace(/^\d+(?:\.\d+)+\s*/, '').trim() || title;

      pages.push({
        order: order++,
        title,
        slug: `${String(chapter.index).padStart(2, '0')}-${String(sectionIndex + 1).padStart(2, '0')}-${slugify(titleWithoutNumber)}`,
        chapter,
        kind: 'section',
        section,
      });
    });
  }

  return pages;
}

function buildIdIndex(pages: OutputPage[]): Map<string, OutputPage> {
  const index = new Map<string, OutputPage>();

  for (const page of pages) {
    if (page.kind === 'chapter') {
      for (const id of collectIds(page.chapter.wrapper)) index.set(id, page);
      continue;
    }

    if (page.kind === 'overview') {
      const wrapperId = page.chapter.wrapper.attrs.id;
      if (wrapperId) index.set(wrapperId, page);
      for (const id of collectIds(page.chapter.part)) index.set(id, page);
      continue;
    }

    if (page.section) {
      for (const id of collectIds(page.section)) index.set(id, page);
    }
  }

  return index;
}

function collectReferencedIds(root: RootNode): Set<string> {
  const ids = new Set<string>();

  for (const anchor of descendants(root, (node) => node.tag === 'a' && Boolean(node.attrs.href))) {
    const targetId = hashTarget(anchor.attrs.href);
    if (targetId) ids.add(targetId);
  }

  return ids;
}

function hashTarget(href: string): string | undefined {
  const trimmed = href.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('#') && trimmed.length > 1) {
    return safeDecodeURIComponent(trimmed.slice(1));
  }

  try {
    const url = new URL(trimmed, 'https://opentextbc.ca/socialpsychology/');
    if (url.hash.length > 1) return safeDecodeURIComponent(url.hash.slice(1));
  } catch {
    // Leave malformed URLs unchanged.
  }

  return undefined;
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

function renderPage(page: OutputPage, baseContext: Omit<RenderContext, 'page' | 'headingShift' | 'inAside'>): string {
  const parts: string[] = [];
  const ctx: RenderContext = {
    ...baseContext,
    page,
    headingShift: 0,
    inAside: false,
  };

  if (page.kind === 'chapter' || page.kind === 'overview') {
    const partId = page.chapter.part.attrs.id;
    if (partId) parts.push(namedAnchor(partId));

    const intro = directChildByClass(page.chapter.part, 'part-ugc');
    if (intro) {
      const introCtx = { ...ctx, headingShift: headingShiftFor(intro, 2) };
      parts.push(renderNodesBlock(intro.children, introCtx));
    }
  }

  if (page.kind === 'chapter') {
    for (const section of page.chapter.sections) {
      const sectionId = section.attrs.id;
      const titleNode = firstDescendant(section, (node) => hasClass(node, 'chapter-title'));
      const title = titleNode ? plainText(titleNode) : section.attrs.title ?? 'Untitled section';

      if (sectionId) parts.push(namedAnchor(sectionId));
      parts.push(`## ${escapeMarkdownText(title)}\n\n`);

      const body = directChildByClass(section, 'chapter-ugc');
      if (body) {
        const bodyCtx = { ...ctx, headingShift: headingShiftFor(body, 3) };
        parts.push(renderNodesBlock(body.children, bodyCtx));
      }
    }
  }

  if (page.kind === 'section' && page.section) {
    const sectionId = page.section.attrs.id;
    if (sectionId) parts.push(namedAnchor(sectionId));

    const body = directChildByClass(page.section, 'chapter-ugc');
    if (body) {
      const bodyCtx = { ...ctx, headingShift: headingShiftFor(body, 2) };
      parts.push(renderNodesBlock(body.children, bodyCtx));
    }
  }

  return tidyMarkdown(parts.join('\n'));
}

function headingShiftFor(root: ParentNode, desiredMinimum: number): number {
  const levels = descendants(root, (node) => /^h[1-6]$/.test(node.tag))
    .map((node) => Number(node.tag.slice(1)));

  if (levels.length === 0) return 0;
  return desiredMinimum - Math.min(...levels);
}

function renderNodesBlock(nodes: HtmlNode[], ctx: RenderContext): string {
  return nodes.map((node) => renderNodeBlock(node, ctx)).join('');
}

function renderNodeBlock(node: HtmlNode, ctx: RenderContext): string {
  if (node.type === 'text') {
    const text = escapeMarkdownText(collapseTextWhitespace(decodeHtmlEntities(node.value))).trim();
    return text ? `${text}\n\n` : '';
  }

  if (node.tag === 'script' || node.tag === 'style' || node.tag === 'noscript') return '';
  if (hasClass(node, 'interactive-content__icon')) return '';

  const anchorPrefix = referencedAnchorPrefix(node, ctx);

  if (/^h[1-6]$/.test(node.tag)) {
    const original = Number(node.tag.slice(1));
    const level = Math.max(2, Math.min(6, original + ctx.headingShift));
    const content = renderInlineChildren(node.children, ctx).trim();
    return content ? `${anchorPrefix}${'#'.repeat(level)} ${content}\n\n` : anchorPrefix;
  }

  switch (node.tag) {
    case 'p': {
      const content = renderInlineChildren(node.children, ctx).trim();
      return content ? `${anchorPrefix}${content}\n\n` : anchorPrefix;
    }

    case 'ul':
    case 'ol':
      return `${anchorPrefix}${renderList(node, ctx, 0)}\n\n`;

    case 'table':
      return `${anchorPrefix}${renderTable(node, ctx)}\n\n`;

    case 'blockquote': {
      const inner = tidyMarkdown(renderNodesBlock(node.children, ctx));
      if (!inner) return anchorPrefix;
      const quoted = inner.split('\n').map((line) => (line ? `> ${line}` : '>')).join('\n');
      return `${anchorPrefix}${quoted}\n\n`;
    }

    case 'img':
      return `${anchorPrefix}${renderImage(node)}\n\n`;

    case 'br':
      return '<br />\n\n';

    case 'hr':
      return `${anchorPrefix}---\n\n`;

    case 'div':
      return `${anchorPrefix}${renderDiv(node, ctx)}`;

    case 'span':
    case 'strong':
    case 'b':
    case 'em':
    case 'i': {
      const inline = renderInline(node, ctx).trim();
      return inline ? `${anchorPrefix}${inline}\n\n` : anchorPrefix;
    }

    case 'a': {
      const inline = renderInline(node, ctx).trim();
      return inline ? `${inline}\n\n` : '';
    }

    // Structural table tags are normally handled by renderTable(). If one
    // appears on its own, preserve its contents instead of dropping text.
    case 'thead':
    case 'tbody':
    case 'tr':
    case 'td':
    case 'th':
    case 'caption':
      return `${anchorPrefix}${renderNodesBlock(node.children, ctx)}`;

    default:
      return `${anchorPrefix}${renderNodesBlock(node.children, ctx)}`;
  }
}

function renderDiv(node: ElementNode, ctx: RenderContext): string {
  const classes = classSet(node);

  if (classes.has('textbox--learning-objectives') || classes.has('textbox--key-takeaways') || classes.has('textbox--exercises')) {
    return renderTextboxAside(node, ctx);
  }

  if (classes.has('h5p')) {
    const content = tidyMarkdown(renderNodesBlock(node.children, { ...ctx, inAside: true }));
    if (!content) return '';

    if (ctx.inAside) {
      return `**Interactive activity:**\n\n${content}\n\n`;
    }

    return `:::note[Interactive activity]\n\n${content}\n\n:::\n\n`;
  }

  if (classes.has('wp-caption-text')) {
    const caption = renderInlineChildren(node.children, ctx).trim();
    return caption ? `*${caption}*\n\n` : '';
  }

  return renderNodesBlock(node.children, ctx);
}

function renderTextboxAside(node: ElementNode, ctx: RenderContext): string {
  const classes = classSet(node);
  const type = classes.has('textbox--key-takeaways') ? 'tip' : 'note';
  const fallbackTitle = classes.has('textbox--learning-objectives')
    ? 'Learning Objectives'
    : classes.has('textbox--key-takeaways')
      ? 'Key Takeaways'
      : 'Exercises';

  const header = directChildByClass(node, 'textbox__header');
  const explicitTitleNode = header
    ? firstDescendant(header, (child) => hasClass(child, 'textbox__title'))
    : undefined;
  const title = explicitTitleNode ? plainText(explicitTitleNode) : fallbackTitle;

  const contentNode = directChildByClass(node, 'textbox__content');
  const bodyNodes = contentNode
    ? contentNode.children
    : node.children.filter((child) => child !== header);

  const body = tidyMarkdown(renderNodesBlock(bodyNodes, { ...ctx, inAside: true }));
  return `:::${type}[${escapeAsideTitle(title)}]\n\n${body}\n\n:::\n\n`;
}

function renderInlineChildren(nodes: HtmlNode[], ctx: RenderContext): string {
  return nodes.map((node) => renderInline(node, ctx)).join('');
}

function renderInline(node: HtmlNode, ctx: RenderContext): string {
  if (node.type === 'text') {
    return escapeMarkdownText(collapseTextWhitespace(decodeHtmlEntities(node.value)));
  }

  if (node.tag === 'script' || node.tag === 'style' || node.tag === 'noscript') return '';
  if (hasClass(node, 'interactive-content__icon')) return '';

  const content = renderInlineChildren(node.children, ctx);

  switch (node.tag) {
    case 'strong':
    case 'b':
      return wrapInline(content, '**');

    case 'em':
    case 'i':
      return wrapInline(content, '*');

    case 'a': {
      const id = node.attrs.id;
      const idAnchor = id && ctx.referencedIds.has(id)
        ? `<a id="${escapeHtmlAttribute(id)}"></a>`
        : '';
      const href = node.attrs.href?.trim();
      const label = content.trim() || href || '';
      if (!href) return `${idAnchor}${label}`;
      const rewritten = rewriteHref(href, ctx, node.attrs['data-url']);
      return `${idAnchor}[${label}](${markdownDestination(rewritten)})`;
    }

    case 'img':
      return renderImage(node);

    case 'br':
      return '<br />';

    case 'span':
      return content;

    // Lists/tables inside a paragraph are invalid-ish HTML. Preserve readable
    // content if Pressbooks ever emits one rather than attempting nested block
    // Markdown from an inline context.
    case 'ul':
    case 'ol':
    case 'table':
      return plainText(node);

    default:
      return content;
  }
}


function wrapInline(content: string, marker: string): string {
  if (!content.trim()) return content;
  const leading = /^\s*/.exec(content)?.[0] ?? '';
  const trailing = /\s*$/.exec(content)?.[0] ?? '';
  const core = content.slice(leading.length, content.length - trailing.length);
  return `${leading}${marker}${core}${marker}${trailing}`;
}

function renderImage(node: ElementNode): string {
  const src = node.attrs.src?.trim();
  if (!src) return '';

  const alt = escapeMarkdownAlt(node.attrs.alt ?? '');
  const title = node.attrs.title?.trim();
  const suffix = title ? ` ${JSON.stringify(title)}` : '';
  return `![${alt}](${markdownDestination(src)}${suffix})`;
}

function renderList(list: ElementNode, ctx: RenderContext, depth: number): string {
  const ordered = list.tag === 'ol';
  const items = directElementChildren(list).filter((child) => child.tag === 'li');
  const indent = '  '.repeat(depth);
  const lines: string[] = [];

  items.forEach((item, index) => {
    const nestedLists = directElementChildren(item).filter((child) => child.tag === 'ul' || child.tag === 'ol');
    const mainNodes = item.children.filter(
      (child) => !(isElement(child) && (child.tag === 'ul' || child.tag === 'ol')),
    );

    const main = renderListItemBody(mainNodes, ctx);
    const marker = ordered ? `${index + 1}. ` : '- ';
    const mainLines = (main || '').split('\n');

    lines.push(`${indent}${marker}${mainLines[0] ?? ''}`.trimEnd());
    for (const continuation of mainLines.slice(1)) {
      lines.push(`${indent}  ${continuation}`.trimEnd());
    }

    for (const nested of nestedLists) {
      lines.push(renderList(nested, ctx, depth + 1).trimEnd());
    }
  });

  return lines.join('\n');
}

function renderListItemBody(nodes: HtmlNode[], ctx: RenderContext): string {
  const chunks: string[] = [];

  for (const node of nodes) {
    if (node.type === 'text') {
      chunks.push(renderInline(node, ctx));
      continue;
    }

    if (node.tag === 'p') {
      chunks.push(renderInlineChildren(node.children, ctx));
    } else if (/^h[1-6]$/.test(node.tag)) {
      chunks.push(renderInlineChildren(node.children, ctx));
    } else if (node.tag === 'div') {
      // Most list-contained divs are simple wrappers. Flatten them here so a
      // Starlight aside does not get embedded inside a list marker.
      chunks.push(plainText(node));
    } else {
      chunks.push(renderInline(node, ctx));
    }
  }

  return chunks
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function renderTable(table: ElementNode, ctx: RenderContext): string {
  const hasSpans = descendants(table, (node) =>
    (node.tag === 'td' || node.tag === 'th') && ('rowspan' in node.attrs || 'colspan' in node.attrs),
  ).length > 0;

  const hasHeaderCell = descendants(table, (node) => node.tag === 'th').length > 0;

  if (hasSpans || !hasHeaderCell) {
    return serializeHtml(table, ctx);
  }

  const captionNode = firstDescendant(table, (node) => node.tag === 'caption');
  const caption = captionNode ? plainText(captionNode) : '';
  const rows = descendants(table, (node) => node.tag === 'tr')
    .map((row) => directElementChildren(row).filter((cell) => cell.tag === 'th' || cell.tag === 'td'));

  if (rows.length === 0) return serializeHtml(table, ctx);

  const columnCount = Math.max(...rows.map((row) => row.length));
  if (columnCount === 0) return serializeHtml(table, ctx);

  const normalized = rows.map((row) => {
    const cells = row.map((cell) => renderTableCell(cell, ctx));
    while (cells.length < columnCount) cells.push('');
    return cells;
  });

  const headerIndex = normalized.findIndex((_, rowIndex) =>
    rows[rowIndex].some((cell) => cell.tag === 'th'),
  );

  if (headerIndex < 0) return serializeHtml(table, ctx);

  const header = normalized[headerIndex];
  const body = normalized.filter((_, index) => index !== headerIndex);
  const markdownRows = [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...body.map((row) => `| ${row.join(' | ')} |`),
  ];

  return `${caption ? `*${escapeMarkdownText(caption)}*\n\n` : ''}${markdownRows.join('\n')}`;
}

function renderTableCell(cell: ElementNode, ctx: RenderContext): string {
  const content = cell.children
    .map((child) => {
      if (child.type === 'text') return renderInline(child, ctx);
      if (child.tag === 'p') return renderInlineChildren(child.children, ctx);
      if (child.tag === 'ul' || child.tag === 'ol') return plainText(child);
      return renderInline(child, ctx);
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return content.replace(/\|/g, '\\|');
}

function serializeHtml(node: ElementNode, ctx: RenderContext): string {
  const attrs = Object.entries(node.attrs)
    .map(([name, value]) => {
      const rewritten = name === 'href' ? rewriteHref(value, ctx, node.attrs['data-url']) : value;
      return rewritten === '' ? name : `${name}="${escapeHtmlAttribute(rewritten)}"`;
    })
    .join(' ');

  const start = `<${node.tag}${attrs ? ` ${attrs}` : ''}>`;
  if (VOID_TAGS.has(node.tag)) return start;

  const content = node.children.map((child) => serializeHtmlNode(child, ctx)).join('');
  return `${start}${content}</${node.tag}>`;
}

function serializeHtmlNode(node: HtmlNode, ctx: RenderContext): string {
  if (node.type === 'text') return node.value;
  return serializeHtml(node, ctx);
}

function referencedAnchorPrefix(node: ElementNode, ctx: RenderContext): string {
  const id = node.attrs.id;
  return id && ctx.referencedIds.has(id) ? namedAnchor(id) : '';
}

function namedAnchor(id: string): string {
  return `<a id="${escapeHtmlAttribute(id)}"></a>\n\n`;
}

function rewriteHref(href: string, ctx: RenderContext, fallbackHref?: string): string {
  const trimmed = href.trim();
  let targetId: string | undefined;

  if (trimmed.startsWith('#') && trimmed.length > 1) {
    targetId = safeDecodeURIComponent(trimmed.slice(1));
  } else {
    try {
      const url = new URL(trimmed, 'https://opentextbc.ca/socialpsychology/');
      const isBookUrl = url.hostname === 'opentextbc.ca' && url.pathname.startsWith('/socialpsychology/');
      if (isBookUrl && url.hash.length > 1) {
        const candidate = safeDecodeURIComponent(url.hash.slice(1));
        if (ctx.idToPage.has(candidate)) targetId = candidate;
      }
    } catch {
      return href;
    }
  }

  if (!targetId) return href;
  const targetPage = ctx.idToPage.get(targetId);
  if (!targetPage) return fallbackHref?.trim() || href;

  if (targetPage.slug === ctx.page.slug) return `#${targetId}`;
  return `${routeFor(ctx.routePrefix, targetPage.slug)}#${targetId}`;
}

// ---------------------------------------------------------------------------
// Formatting and paths
// ---------------------------------------------------------------------------

function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function chapterSlug(index: number, title: string): string {
  const withoutNumber = title.replace(/^chapter\s+\d+\.?\s*/i, '').trim();
  return `${String(index).padStart(2, '0')}-${slugify(withoutNumber)}`;
}

function yamlString(value: string): string {
  // JSON strings are valid YAML double-quoted scalars.
  return JSON.stringify(value);
}

function inferRoutePrefix(outputDir: string): string {
  const normalized = path.resolve(outputDir).split(path.sep).join('/');
  const marker = '/src/content/docs';
  const markerIndex = normalized.lastIndexOf(marker);

  if (markerIndex >= 0) {
    const remainder = normalized.slice(markerIndex + marker.length).replace(/^\/+|\/+$/g, '');
    return remainder ? `/${remainder}` : '';
  }

  return '';
}

function normalizeRoutePrefix(prefix: string): string {
  const cleaned = prefix.trim().replace(/^\/+|\/+$/g, '');
  return cleaned ? `/${cleaned}` : '';
}

function routeFor(prefix: string, slug: string): string {
  return `${prefix}/${slug}/`.replace(/\/+/g, '/');
}

function collapseTextWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ');
}

function escapeMarkdownText(value: string): string {
  return value.replace(/([\\`*_\[\]])/g, '\\$1');
}

function escapeMarkdownAlt(value: string): string {
  return value.replace(/([\\\[\]])/g, '\\$1');
}

function markdownDestination(value: string): string {
  // Angle-bracket destinations avoid having to hand-escape URL parentheses.
  return `<${value.replace(/>/g, '%3E').replace(/\s/g, '%20')}>`;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAsideTitle(value: string): string {
  return value.replace(/]/g, '\\]');
}

function tidyMarkdown(markdown: string): string {
  return markdown
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(options.input);
  const outputDir = path.resolve(options.outputDir);
  const routePrefix = normalizeRoutePrefix(options.routePrefix ?? inferRoutePrefix(outputDir));

  const html = await readFile(inputPath, 'utf8');
  const root = parseHtml(html);
  const chapters = buildChapters(root);

  if (chapters.length === 0) {
    throw new Error('No Pressbooks .part-wrapper elements were found in the input HTML.');
  }

  const pages = buildOutputPages(chapters, options.mode);
  const idToPage = buildIdIndex(pages);
  const referencedIds = collectReferencedIds(root);

  await mkdir(outputDir, { recursive: true });

  for (const page of pages) {
    const body = renderPage(page, {
      idToPage,
      referencedIds,
      routePrefix,
    });

    const frontmatter = [
      '---',
      `title: ${yamlString(page.title)}`,
      'sidebar:',
      `  order: ${page.order}`,
      '---',
      '',
    ].join('\n');

    const outputPath = path.join(outputDir, `${page.slug}.md`);
    await writeFile(outputPath, `${frontmatter}${body}\n`, 'utf8');
    console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`);
  }

  console.log(`\nConverted ${pages.length} page${pages.length === 1 ? '' : 's'} from ${chapters.length} chapters.`);
  console.log(`Mode: ${options.mode}`);
  console.log(`Starlight route prefix: ${routePrefix || '/'}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
