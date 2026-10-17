import mammoth from 'mammoth';
import { getDocumentProxy } from 'unpdf';

// Upload limits (also enforced by the storage bucket for size).
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_PAGES = 30;
export const MAX_PASSAGES = 600;

export const PDF_MIME = 'application/pdf';
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export type ParsedPassage = { page: number; para: number; text: string };
export type ParsedDocument = { pageCount: number; passages: ParsedPassage[] };

export class ParseError extends Error {}

type TextItem = { str: string; transform: number[]; height: number; hasEOL?: boolean };

function cleanParagraph(text: string): string {
  return text
    .replace(/­/g, '')
    .replace(/(\p{L})-\s+(\p{Ll})/gu, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

// Splits one PDF page into paragraphs by looking at the vertical gaps between
// text lines: a gap clearly larger than the usual line spacing starts a new
// paragraph.
export function paragraphsFromItems(items: TextItem[]): string[] {
  const lines: { y: number; height: number; text: string }[] = [];

  for (const item of items) {
    if (!item.str) continue;
    const y = item.transform[5];
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - y) < Math.max(2, item.height * 0.4)) {
      last.text += item.str;
    } else {
      lines.push({ y, height: item.height || 10, text: item.str });
    }
  }

  // Normal line spacing is the smallest gap between lines; a paragraph break is
  // a gap well above it, or well above the font height when every line is its
  // own paragraph (then the smallest gap is already a paragraph gap).
  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) gaps.push(Math.abs(lines[i - 1].y - lines[i].y));
  const positive = gaps.filter((g) => g > 0.5);
  const lineGap = positive.length ? Math.min(...positive) : 0;
  const heights = lines.map((l) => l.height).sort((a, b) => a - b);
  const fontHeight = heights.length ? heights[Math.floor(heights.length / 2)] : 10;
  const threshold = Math.min(lineGap * 1.4, fontHeight * 1.8);

  const paragraphs: string[] = [];
  let current = '';
  lines.forEach((line, i) => {
    const gap = i === 0 ? 0 : Math.abs(lines[i - 1].y - line.y);
    if (i > 0 && lineGap > 0 && gap > threshold) {
      if (current.trim()) paragraphs.push(current);
      current = '';
    }
    current += (current ? ' ' : '') + line.text;
  });
  if (current.trim()) paragraphs.push(current);

  return paragraphs.map(cleanParagraph).filter((p) => p.length > 0);
}

export async function parsePdf(bytes: Uint8Array): Promise<ParsedDocument> {
  let pdf;
  try {
    pdf = await getDocumentProxy(new Uint8Array(bytes));
  } catch {
    throw new ParseError('A PDF nem olvasható.');
  }
  if (pdf.numPages > MAX_PAGES) {
    throw new ParseError(`Legfeljebb ${MAX_PAGES} oldalas dokumentum tölthető fel.`);
  }

  const passages: ParsedPassage[] = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const paragraphs = paragraphsFromItems(content.items as TextItem[]);
    paragraphs.forEach((text, i) => passages.push({ page: pageNo, para: i + 1, text }));
  }

  if (passages.length === 0) {
    throw new ParseError('A PDF nem tartalmaz kinyerhető szöveget (szkennelt dokumentumhoz OCR szükséges).');
  }
  return { pageCount: pdf.numPages, passages };
}

// Word files have no fixed pages, so every paragraph sits on page 1 and the
// paragraph number is the stable reference.
export async function parseDocx(bytes: Uint8Array): Promise<ParsedDocument> {
  let value: string;
  try {
    ({ value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) }));
  } catch {
    throw new ParseError('A DOCX fájl nem olvasható.');
  }

  const passages = value
    .split(/\n\s*\n/)
    .map(cleanParagraph)
    .filter((p) => p.length > 0)
    .map((text, i) => ({ page: 1, para: i + 1, text }));

  if (passages.length === 0) throw new ParseError('A DOCX fájl üres.');
  return { pageCount: 1, passages };
}

export async function parseDocument(bytes: Uint8Array, mimeType: string): Promise<ParsedDocument> {
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new ParseError('A fájl legfeljebb 5 MB lehet.');
  }
  const parsed = mimeType === PDF_MIME ? await parsePdf(bytes) : mimeType === DOCX_MIME ? await parseDocx(bytes) : null;
  if (!parsed) throw new ParseError('Csak PDF és DOCX fájl tölthető fel.');
  if (parsed.passages.length > MAX_PASSAGES) {
    throw new ParseError(`A dokumentum túl hosszú (legfeljebb ${MAX_PASSAGES} bekezdés).`);
  }
  return parsed;
}

export function mimeFromFilename(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return PDF_MIME;
  if (lower.endsWith('.docx')) return DOCX_MIME;
  return null;
}
