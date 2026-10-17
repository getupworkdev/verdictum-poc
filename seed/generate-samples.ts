// Writes the fictional sample documents in seed/content.ts to samples/ as real
// PDF and DOCX files, so the upload pipeline can be demonstrated on them.
// Usage: npx tsx seed/generate-samples.ts

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { PDFDocument, rgb } from 'pdf-lib';
import { FIRMS, type SeedDoc } from './content';

const OUT = path.join(process.cwd(), 'public', 'samples');
const FONTS = path.join(process.cwd(), 'seed', 'fonts');

function wrap(text: string, width: number, measure: (s: string) => number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next) > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function buildPdf(doc: SeedDoc): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(doc.title);
  pdf.setSubject("Demo project built for Verdictum's proposal – sample data only");
  const regular = await pdf.embedFont(await readFile(path.join(FONTS, 'NotoSans-Regular.ttf')), { subset: true });
  const bold = await pdf.embedFont(await readFile(path.join(FONTS, 'NotoSans-Bold.ttf')), { subset: true });

  const size = 11;
  const lineHeight = 15;
  const margin = 60;

  for (const paragraphs of doc.pages) {
    const page = pdf.addPage([595, 842]);
    const width = page.getWidth() - margin * 2;
    let y = page.getHeight() - margin;

    paragraphs.forEach((text, i) => {
      const font = i <= 1 ? bold : regular;
      const color = i === 0 ? rgb(0.7, 0.1, 0.1) : rgb(0, 0, 0);
      for (const line of wrap(text, width, (s) => font.widthOfTextAtSize(s, size))) {
        page.drawText(line, { x: margin, y, size, font, color });
        y -= lineHeight;
      }
      y -= lineHeight; // blank line between paragraphs
    });
  }

  return pdf.save();
}

export async function buildDocx(doc: SeedDoc): Promise<Uint8Array> {
  const children = doc.pages.flat().map(
    (text, i) =>
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text, bold: i <= 1, color: i === 0 ? 'B01A1A' : undefined, font: 'Calibri' })],
      }),
  );
  const file = new Document({
    title: doc.title,
    description: "Demo project built for Verdictum's proposal – sample data only",
    sections: [{ children }],
  });
  return new Uint8Array(await Packer.toBuffer(file));
}

export async function buildSample(doc: SeedDoc): Promise<Uint8Array> {
  return doc.kind === 'pdf' ? buildPdf(doc) : buildDocx(doc);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  for (const firm of FIRMS) {
    for (const c of firm.cases) {
      for (const doc of c.documents) {
        const bytes = await buildSample(doc);
        await writeFile(path.join(OUT, doc.filename), bytes);
        console.log(`public/samples/${doc.filename} (${bytes.byteLength} bytes)`);
      }
    }
  }
}

if (process.argv[1]?.endsWith('generate-samples.ts')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
