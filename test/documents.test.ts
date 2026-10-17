import { describe, expect, it } from 'vitest';
import { FIRMS } from '../seed/content';
import { buildSample } from '../seed/generate-samples';
import { DOCX_MIME, MAX_UPLOAD_BYTES, PDF_MIME, ParseError, parseDocument } from '../src/lib/parse';
import { fillTemplate, getTemplate, placeholders, TEMPLATES } from '../src/lib/templates';

const allDocs = FIRMS.flatMap((f) => f.cases.flatMap((c) => c.documents));

describe('document parsing', () => {
  it.each(allDocs.map((d) => [d.filename, d] as const))('%s keeps page and paragraph numbers', async (_, doc) => {
    const bytes = await buildSample(doc);
    const parsed = await parseDocument(bytes, doc.kind === 'pdf' ? PDF_MIME : DOCX_MIME);

    const expected = doc.pages.flatMap((paras, p) =>
      paras.map((text, i) => ({ page: doc.kind === 'pdf' ? p + 1 : 1, para: doc.kind === 'pdf' ? i + 1 : 0, text })),
    );
    expect(parsed.passages).toHaveLength(expected.length);
    parsed.passages.forEach((passage, i) => {
      expect(passage.text).toBe(expected[i].text.replace(/\s+/g, ' ').trim());
      expect(passage.page).toBe(expected[i].page);
    });
    expect(parsed.passages.map((p) => p.para)).toEqual(
      parsed.passages.map((p, i, all) => all.slice(0, i + 1).filter((q) => q.page === p.page).length),
    );
  });

  it('rejects files over 5 MB', async () => {
    await expect(parseDocument(new Uint8Array(MAX_UPLOAD_BYTES + 1), PDF_MIME)).rejects.toThrow(ParseError);
  });

  it('rejects other file types', async () => {
    await expect(parseDocument(new Uint8Array(10), 'text/plain')).rejects.toThrow(/PDF és DOCX/);
  });
});

describe('drafting templates', () => {
  it('has the two Hungarian templates', () => {
    expect(TEMPLATES.map((t) => t.key)).toEqual(['fizetesi_felszolitas', 'szerzodesmodositas']);
  });

  it('fills every placeholder of the payment demand from case A facts', () => {
    const facts = { ...FIRMS[0].cases[0].facts, datum: '2026. október 17.' };
    const { text, missing } = fillTemplate(getTemplate('fizetesi_felszolitas')!.body, facts);
    expect(missing).toEqual([]);
    expect(text).toContain('KÉ-2026/118 számú számla 4 850 000 Ft + ÁFA összegű ellenértéke');
    expect(text).not.toMatch(/\{\{|\[\[/);
  });

  it('leaves unknown facts visibly marked', () => {
    const { text, missing } = fillTemplate('Tisztelt {{ugyfel}}! Határidő: {{hatarido}}.', { ugyfel: 'Teszt Kft.' });
    expect(text).toBe('Tisztelt Teszt Kft.! Határidő: [[hiányzik: hatarido]].');
    expect(missing).toEqual(['hatarido']);
  });

  it('lists placeholders once each', () => {
    expect(placeholders('{{a}} {{b}} {{a}}')).toEqual(['a', 'b']);
  });
});
