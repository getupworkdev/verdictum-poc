import { describe, expect, it } from 'vitest';
import { type SourcePassage, summarize, verifyAnswer, verifyCitation } from '../src/lib/citations';

const passages: SourcePassage[] = [
  {
    id: 'p1',
    documentId: 'd1',
    filename: 'szerzodes.pdf',
    page: 1,
    para: 6,
    text: 'A Vevő a vételárat a számla kézhezvételétől számított 30 (harminc) napon belül köteles átutalással megfizetni.',
  },
  {
    id: 'p2',
    documentId: 'd1',
    filename: 'szerzodes.pdf',
    page: 2,
    para: 1,
    text: 'Fizetési késedelem esetén a Vevő a Ptk. 6:155. §-a szerinti késedelmi kamatot köteles megfizetni.',
  },
];

const cite = (document_index: number, cited: string, start?: number, end?: number) => ({
  type: 'char_location',
  cited_text: cited,
  document_index,
  start_char_index: start,
  end_char_index: end,
});

describe('citation verification', () => {
  it('accepts a span that matches the passage at the given offsets', () => {
    const quote = '30 (harminc) napon belül';
    const start = passages[0].text.indexOf(quote);
    const result = verifyCitation(cite(0, quote, start, start + quote.length), passages);
    expect(result.status).toBe('igazolt');
    expect(result).toMatchObject({ page: 1, para: 6, filename: 'szerzodes.pdf', start, end: start + quote.length });
  });

  it('accepts a verbatim span when the offsets are off, and corrects them', () => {
    const quote = 'késedelmi kamatot köteles megfizetni';
    const result = verifyCitation(cite(1, quote, 0, quote.length), passages);
    expect(result.status).toBe('igazolt');
    expect(passages[1].text.slice(result.start!, result.end!)).toBe(quote);
  });

  it('tolerates whitespace differences only', () => {
    const result = verifyCitation(cite(0, 'köteles   átutalással\nmegfizetni', 0, 5), passages);
    expect(result.status).toBe('igazolt');
  });

  it('rejects text that is not in the passage ("Nem igazolt")', () => {
    const result = verifyCitation(cite(0, '60 (hatvan) napon belül', 0, 23), passages);
    expect(result.status).toBe('nem_igazolt');
    expect(result.reason).toMatch(/nem található/);
  });

  it('rejects a paraphrase even if the meaning is the same', () => {
    const result = verifyCitation(cite(0, 'harminc napja van fizetni', 0, 10), passages);
    expect(result.status).toBe('nem_igazolt');
  });

  it('rejects a citation to a document that was never sent', () => {
    const result = verifyCitation(cite(5, '30 (harminc) napon belül', 0, 10), passages);
    expect(result.status).toBe('nem_igazolt');
    expect(result.passageId).toBeNull();
  });

  it('rejects an empty quote', () => {
    expect(verifyCitation(cite(0, '   ', 0, 3), passages).status).toBe('nem_igazolt');
  });

  it('marks blocks by their weakest citation and flags unsupported claims', () => {
    const blocks = verifyAnswer(
      [
        {
          text: 'A fizetési határidő 30 nap.',
          citations: [
            cite(0, '30 (harminc) napon belül', passages[0].text.indexOf('30'), passages[0].text.indexOf('30') + 24),
          ],
        },
        { text: ' ' },
        {
          text: 'Késedelem esetén kamat jár, és a határidő 60 nap.',
          citations: [cite(1, 'késedelmi kamatot', 0, 0), cite(0, '60 (hatvan) napon', 0, 0)],
        },
        { text: 'A Vevő a teljes vételár visszatartására is jogosult minőségi hiba esetén.', citations: [] },
      ],
      passages,
    );

    expect(blocks.map((b) => b.status)).toEqual(['igazolt', 'semleges', 'nem_igazolt', 'hianyzo']);
    expect(summarize(blocks)).toEqual({ verified: 1, unverified: 1, missing: 1 });
  });
});
