import fs from 'node:fs/promises';
import path from 'node:path';

const inputFile = process.argv[2] ?? './temp/open_revolution_ja.txt';
const outputDir =
  process.argv[3] ?? './src/content/docs/open-revolution';

const text = await fs.readFile(inputFile, 'utf8');
const lines = text
  .replace(/^\uFEFF/, '')
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n')
  .split('\n');

const chapterHeadingPattern = /^(\d{1,2})\s+(.+?)\s*$/;
const sectionHeadingPattern = /^(\d+(?:\.\d+)+)\s*(.+?)\s*$/;
const chapterEndHeading = /^訳者あとがき\s*$/;
const footnotePattern = /^\[(\d+)\]\s+(.+)$/;

const chapterFilenames = {
  1: '01-prologue-monopolies-of-attention.md',
  2: '02-an-open-world.md',
  3: '03-defining-information-and-openness.md',
  4: '04-patents-and-copyright-as-intellectual-property.md',
  5: '05-face-to-face-with-power.md',
  6: '06-triumph-over-closed-minds-the-internet.md',
  7: '07-music-to-our-ears.md',
  8: '08-how-the-secret-of-life-almost-stayed-secret.md',
  9: '09-meet-jamie-love.md',
  10: '10-openness-the-best-medicine.md',
  11: '11-making-an-open-world.md',
  12: '12-help-us-make-it-happen.md',
  13: '13-coda-the-original-copyfight.md',
  14: '14-acknowledgements.md',
};

function parseChapterHeading(line) {
  const trimmed = line.trim();
  const match = trimmed.match(chapterHeadingPattern);
  if (!match) return null;

  const number = Number(match[1]);
  if (number < 1 || number > 14) return null;

  // 目次の「章タイトル        ページ番号」は除外する。
  if (/\s{2,}\d+\s*$/.test(line)) return null;

  return { number, title: match[2].trim() };
}

function convertSectionHeading(line, chapterNumber) {
  const trimmed = line.trim();
  const match = trimmed.match(sectionHeadingPattern);
  if (!match) return line;

  const sectionNumber = match[1];
  const firstNumber = Number(sectionNumber.split('.')[0]);
  if (firstNumber !== chapterNumber) return line;

  const depth = sectionNumber.split('.').length;
  const headingLevel = Math.min(depth, 6);
  return `${'#'.repeat(headingLevel)} ${sectionNumber} ${match[2].trim()}`;
}

function cleanBody(inputLines, chapterNumber) {
  return inputLines
    .map((line) => convertSectionHeading(line, chapterNumber))
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .filter((line) => !/^\s*_{4,}\s*$/.test(line))
    .filter((line) => !/^\s*―{4,}\s*$/.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function yamlString(value) {
  return JSON.stringify(value);
}

const chapters = [];
const preface = [];
const afterword = [];
const footnotes = [];
let currentChapter = null;
let section = 'preface';

for (const line of lines) {
  if (section === 'afterword') {
    if (footnotePattern.test(line.trim())) section = 'footnotes';
    else afterword.push(line);
    continue;
  }

  if (section === 'footnotes') {
    footnotes.push(line);
    continue;
  }

  const heading = parseChapterHeading(line);
  if (heading) {
    if (currentChapter) chapters.push(currentChapter);
    currentChapter = { ...heading, lines: [] };
    section = 'chapter';
    continue;
  }

  if (chapterEndHeading.test(line.trim())) {
    if (currentChapter) {
      chapters.push(currentChapter);
      currentChapter = null;
    }
    section = 'afterword';
    afterword.push(line);
    continue;
  }

  if (!currentChapter) preface.push(line);
  else currentChapter.lines.push(line);
}

if (currentChapter) chapters.push(currentChapter);

const expectedNumbers = Array.from({ length: 14 }, (_, index) => index + 1);
const chapterNumbers = chapters.map(({ number }) => number);
if (
  chapterNumbers.length !== expectedNumbers.length ||
  chapterNumbers.some((number, index) => number !== expectedNumbers[index])
) {
  throw new Error(
    `章の検出に失敗しました。検出結果: ${chapterNumbers.join(', ')}`
  );
}

await fs.mkdir(outputDir, { recursive: true });

const aboutBody = preface
  .filter((line) => !/^\s*_{4,}\s*$/.test(line))
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

await fs.writeFile(
  path.join(outputDir, '00-about.md'),
  `---\ntitle: ${yamlString('オープン・レボリューションについて')}\nsidebar:\n  order: 0\n---\n\n${aboutBody}\n`,
  'utf8'
);

for (const chapter of chapters) {
  const filename = chapterFilenames[chapter.number];
  const body = cleanBody(chapter.lines, chapter.number);
  const markdown = `---\ntitle: ${yamlString(`${chapter.number} ${chapter.title}`)}\nsidebar:\n  order: ${chapter.number}\n---\n\n${body}\n`;

  await fs.writeFile(path.join(outputDir, filename), markdown, 'utf8');
  console.log(`✓ ${filename} — ${chapter.number} ${chapter.title}`);
}

const afterwordBody = cleanBody(afterword, 0);
if (afterwordBody) {
  await fs.writeFile(
    path.join(outputDir, '15-translators-afterword.md'),
    `---\ntitle: ${yamlString('訳者あとがき')}\nsidebar:\n  order: 15\n---\n\n${afterwordBody}\n`,
    'utf8'
  );
}

const footnoteBody = footnotes
  .map((line) => line.replace(/^\[(\d+)\]\s+(.+)$/, '- **[$1]** $2'))
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();
if (footnoteBody) {
  await fs.writeFile(
    path.join(outputDir, '16-footnotes.md'),
    `---\ntitle: ${yamlString('脚注')}\nsidebar:\n  order: 16\n---\n\n${footnoteBody}\n`,
    'utf8'
  );
}

console.log(`\n${chapters.length} chapters written to ${outputDir}`);
