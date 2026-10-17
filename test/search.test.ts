import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { IDS, asUser, createTestDb, seedTwoFirms, toyEmbedding } from './db';

type Hit = { text: string; page: number; para: number; fts_rank: number | null; vector_similarity: number | null };

describe('hybrid search with Hungarian stemming', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createTestDb();
    await seedTwoFirms(db);
  });

  afterAll(async () => {
    await db.close();
  });

  const search = (query: string, embedding: number[] | null = null) =>
    asUser(
      db,
      IDS.userA,
      async () =>
        (
          await db.query<Hit>(`select * from public.search_passages($1, $2, $3::vector, 8)`, [
            IDS.caseA,
            query,
            embedding ? toyEmbedding(embedding) : null,
          ])
        ).rows,
    );

  it('stems szerződés / szerződésben / szerződést to the same lexeme', async () => {
    const { rows } = await db.query<{ a: string; b: string; c: string }>(`
      select to_tsvector('hungarian', 'szerződés')::text as a,
             to_tsvector('hungarian', 'szerződésben')::text as b,
             to_tsvector('hungarian', 'szerződést')::text as c`);
    expect(rows[0].a).toBe("'szerződés':1");
    expect(rows[0].b).toBe(rows[0].a);
    expect(rows[0].c).toBe(rows[0].a);
  });

  it('finds both inflected forms when searching for the base form', async () => {
    const hits = await search('szerződés');
    const texts = hits.map((h) => h.text);
    expect(texts).toContain('A szerződésben meghatározott fizetési határidő 30 nap.');
    expect(texts).toContain('A Vevő a szerződést írásban felmondhatja.');
    expect(texts).not.toContain('A szállítás helye a Vevő mintavárosi telephelye.');
  });

  it('matches an inflected query against the other forms too', async () => {
    const hits = await search('szerződésben');
    expect(hits.map((h) => `${h.page}/${h.para}`).sort()).toEqual(['1/1', '1/2']);
  });

  it('never returns passages from another case, even with a matching word', async () => {
    const hits = await search('bérleti szerződés határozott');
    expect(hits.some((h) => h.text.includes('bérleti'))).toBe(false);
  });

  it('adds vector neighbours that share no words with the query', async () => {
    const hits = await search('telephely', [0, 1, 0]);
    expect(hits[0].text).toBe('A szállítás helye a Vevő mintavárosi telephelye.');
    expect(hits[0].vector_similarity).toBeCloseTo(1, 5);
  });

  it('ranks passages matching both branches first', async () => {
    const hits = await search('fizetési határidő', [1, 0, 0]);
    expect(hits[0].text).toBe('A szerződésben meghatározott fizetési határidő 30 nap.');
    expect(hits[0].fts_rank).toBeGreaterThan(0);
    expect(hits[0].vector_similarity).toBeGreaterThan(0.9);
  });
});
