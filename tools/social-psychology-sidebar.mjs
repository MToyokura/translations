import { readdirSync, readFileSync } from "node:fs";

export function socialPsychologySidebar() {
  const directory = "src/content/docs/social-psychology";
  const files = readdirSync(directory).filter((file) => file.endsWith(".md"));
  const pages = files.map((file) => {
    const source = readFileSync(`${directory}/${file}`, "utf8");
    const title = source.match(/^title:\s*["'](.+?)["']$/m)?.[1] ?? file.replace(".md", "");
    const order = Number(source.match(/^  order:\s*(\d+)$/m)?.[1] ?? Number.MAX_SAFE_INTEGER);
    const slug = `social-psychology/${file.replace(".md", "")}`;
    const match = file.match(/^(\d+)(?:-(\d+))?-/);
    return { file, title, slug, order, chapter: match?.[1], section: match?.[2] };
  });

  const chapters = pages
    .filter((page) => page.chapter && !page.section)
    .sort((a, b) => a.file.localeCompare(b.file, undefined, { numeric: true }));
  const items = chapters.map((chapter) => ({
    label: chapter.title,
    collapsed: true,
    items: [
      { label: chapter.title, slug: chapter.slug },
      ...pages
        .filter((page) => page.chapter === chapter.chapter && page.section)
        .sort((a, b) => a.file.localeCompare(b.file, undefined, { numeric: true }))
        .map(({ title, slug }) => ({ label: title, slug })),
    ],
  }));

  const other = pages
    .filter((page) => !page.chapter)
    .sort((a, b) => a.order - b.order || a.file.localeCompare(b.file))
    .map(({ title, slug }) => ({ label: title, slug }));
  const backMatterFiles = new Set(["about-the-authors.md", "glossary.md", "versioning-history.md"]);
  const backMatter = other.filter((item) =>
    [...backMatterFiles].some((file) => item.slug.endsWith(`/${file.replace(".md", "")}`)),
  );
  const frontMatter = other.filter((item) => !backMatter.includes(item));
  return [
    { label: "目次と前付", collapsed: true, items: frontMatter },
    ...items,
    { label: "後付", collapsed: true, items: backMatter },
  ];
}
