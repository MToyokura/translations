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
  const cleanedLines = inputLines
    .map((line) => convertSectionHeading(line, chapterNumber))
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .filter((line) => !/^\s*_{4,}\s*$/.test(line))
    .filter((line) => !/^\s*―{4,}\s*$/.test(line));

  const output = [];
  for (let index = 0; index < cleanedLines.length; index += 1) {
    const line = cleanedLines[index];
    const nextLine = cleanedLines[index + 1];
    output.push(line);

    if (!line.trim() || !nextLine?.trim()) continue;

    // Markdown では単一改行は同じ段落として扱われるため、
    // 通常の本文行の間に空行を補う。番号付き箇条書きは連続させる。
    const isListItem = /^\s*(?:\d+\.|[-*+])\s+/.test(line);
    const nextIsListItem = /^\s*(?:\d+\.|[-*+])\s+/.test(nextLine);
    if (!(isListItem && nextIsListItem)) output.push('');
  }

  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function parseFootnotes(inputLines) {
  const definitions = new Map();
  let currentNumber = null;

  for (const line of inputLines) {
    const match = line.trim().match(/^\[(\d+)\]\s+(.+)$/);
    if (match) {
      currentNumber = Number(match[1]);
      definitions.set(currentNumber, [match[2].trim()]);
    } else if (currentNumber !== null && line.trim()) {
      definitions.get(currentNumber).push(line.trim());
    }
  }

  return new Map(
    [...definitions].map(([number, definition]) => [number, definition.join(' ')])
  );
}

function addChapterFootnotes(body, chapterLines, footnoteDefinitions) {
  const referencedNumbers = new Set();
  for (const line of chapterLines) {
    for (const match of line.matchAll(/\[(\d+)\]/g)) {
      referencedNumbers.add(Number(match[1]));
    }
  }

  const numbers = [...referencedNumbers].sort((a, b) => a - b);
  if (numbers.length === 0) return body;

  const convertedBody = body.replace(/\[(\d+)\]/g, (_, number) => `[^${number}]`);
  const definitions = numbers
    .filter((number) => footnoteDefinitions.has(number))
    .map((number) => `[^${number}]: ${footnoteDefinitions.get(number)}`)
    .join('\n');

  if (!definitions) return convertedBody;
  return `${convertedBody}\n\n${definitions}`;
}

function yamlString(value) {
  return JSON.stringify(value);
}

function buildAboutBody(inputLines) {
  const content = inputLines
    .filter((line) => !/^\s*_{4,}\s*$/.test(line))
    .map((line) => line.trimEnd());
  const indexOfLine = (pattern) =>
    content.findIndex((line) => pattern.test(line.trim()));

  const authorIndex = content.findIndex((line) =>
    line.includes('博士は、研究者、技術者、起業家')
  );
  const copyrightIndex = indexOfLine(/^原書の著作権表示/);
  const thankYouIndex = indexOfLine(/^読んでくれてありがとう/);
  const dedicationIndex = indexOfLine(/^両親に$/);
  const contentsIndex = indexOfLine(/^目次$/);
  const quoteIndex = indexOfLine(/^私からアイディアを受け取る人は/);

  const title = [
    '# オープン・レボリューション',
    '',
    '## 情報の時代のルールを書き直す',
    '',
    '新しい世界にあって古いルールで競う私たち。',
    '',
    'ルーファス・ポロック',
    '',
    '豊倉幹人・渡辺智暁 訳',
  ].join('\n');

  const author = authorIndex >= 0
    ? `## 著者\n\n${content[authorIndex]}`
    : '';
  const copyright = copyrightIndex >= 0 && thankYouIndex >= 0
    ? `## 出版情報・ライセンス\n\n${content
        .slice(copyrightIndex + 1, thankYouIndex)
        .join('\n')}`
    : '';
  const sharing = thankYouIndex >= 0 && dedicationIndex >= 0
    ? `## 共有・連絡先\n\n${content
        .slice(thankYouIndex, dedicationIndex)
        .join('\n')}`
    : '';
  const dedication = dedicationIndex >= 0
    ? `## 献辞\n\n${content[dedicationIndex]}`
    : '';
  const contents = contentsIndex >= 0 && quoteIndex >= 0
    ? `## 目次\n\n${content.slice(contentsIndex + 1, quoteIndex).join('\n')}`
    : '';
  const quotations = quoteIndex >= 0
    ? `## 本書について\n\n${content.slice(quoteIndex).join('\n')}`
    : '';

  return [title, author, copyright, sharing, dedication, contents, quotations]
    .filter(Boolean)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

const footnoteDefinitions = parseFootnotes(footnotes);

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

const aboutBody = buildAboutBody(preface);

await fs.writeFile(
  path.join(outputDir, '00-about.md'),
  `---\ntitle: ${yamlString('オープン・レボリューションについて')}\nsidebar:\n  order: 0\n---\n\n${aboutBody}\n`,
  'utf8'
);

for (const chapter of chapters) {
  const filename = chapterFilenames[chapter.number];
  const body = addChapterFootnotes(
    cleanBody(chapter.lines, chapter.number),
    chapter.lines,
    footnoteDefinitions
  );
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

console.log(`\n${chapters.length} chapters written to ${outputDir}`);
