import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { IDS, asUser, createTestDb, seedTwoFirms, toyEmbedding } from './db';

describe('tenant isolation (RLS by firm_id)', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createTestDb();
    await seedTwoFirms(db);
  });

  afterAll(async () => {
    await db.close();
  });

  it('lets a user read their own firm’s case', async () => {
    const rows = await asUser(
      db,
      IDS.userA,
      async () => (await db.query('select id from public.cases where id = $1', [IDS.caseA])).rows,
    );
    expect(rows).toHaveLength(1);
  });

  it('hides another firm’s case even when its id is known', async () => {
    const rows = await asUser(
      db,
      IDS.userB,
      async () => (await db.query('select id, title from public.cases where id = $1', [IDS.caseA])).rows,
    );
    expect(rows).toEqual([]);
  });

  it('only lists the user’s own firm, cases, documents and passages', async () => {
    const counts = await asUser(db, IDS.userB, async () => {
      const q = async (sql: string) => Number((await db.query<{ n: number }>(sql)).rows[0].n);
      return {
        firms: await q('select count(*)::int as n from public.firms'),
        cases: await q('select count(*)::int as n from public.cases'),
        documents: await q('select count(*)::int as n from public.documents'),
        passages: await q('select count(*)::int as n from public.passages'),
      };
    });
    expect(counts).toEqual({ firms: 1, cases: 1, documents: 1, passages: 1 });
  });

  it('returns nothing from search on another firm’s case', async () => {
    const rows = await asUser(
      db,
      IDS.userB,
      async () =>
        (
          await db.query(`select * from public.search_passages($1, 'szerződés', $2::vector, 8)`, [
            IDS.caseA,
            toyEmbedding([1, 0, 0]),
          ])
        ).rows,
    );
    expect(rows).toEqual([]);
  });

  it('rejects writing into another firm (RLS with check)', async () => {
    await expect(
      asUser(db, IDS.userB, () =>
        db.query(
          `insert into public.analyses (firm_id, case_id, question, answer, model)
           values ($1, $2, 'teszt', '{}', 'x')`,
          [IDS.firmA, IDS.caseA],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('rejects pointing an own-firm row at another firm’s case (composite FK)', async () => {
    await expect(
      asUser(db, IDS.userB, () =>
        db.query(
          `insert into public.analyses (firm_id, case_id, question, answer, model)
           values ($1, $2, 'teszt', '{}', 'x')`,
          [IDS.firmB, IDS.caseA],
        ),
      ),
    ).rejects.toThrow(/foreign key/);
  });

  it('cannot update or delete another firm’s rows', async () => {
    const result = await asUser(db, IDS.userB, async () => {
      const updated = await db.query(`update public.cases set title = 'feltört' where id = $1`, [IDS.caseA]);
      const deleted = await db.query(`delete from public.passages where case_id = $1`, [IDS.caseA]);
      return { updated: updated.affectedRows, deleted: deleted.affectedRows };
    });
    expect(result).toEqual({ updated: 0, deleted: 0 });

    const title = (await db.query<{ title: string }>('select title from public.cases where id = $1', [IDS.caseA]))
      .rows[0].title;
    expect(title).toBe('Kitalált Építő Kft. ügye');
  });

  it('sees nothing at all without a session (anon)', async () => {
    await db.exec('set role anon');
    try {
      await expect(db.query('select * from public.cases')).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec('reset role');
    }
  });

  it('keeps old draft versions immutable', async () => {
    await asUser(db, IDS.userA, () =>
      db.query(
        `insert into public.drafts (firm_id, case_id, template_key, version, title, content)
         values ($1, $2, 'fizetesi_felszolitas', 1, 'v1', 'eredeti')`,
        [IDS.firmA, IDS.caseA],
      ),
    );
    const updated = await asUser(db, IDS.userA, () =>
      db.query(`update public.drafts set content = 'átírva' where case_id = $1`, [IDS.caseA]),
    );
    expect(updated.affectedRows).toBe(0);
  });
});
