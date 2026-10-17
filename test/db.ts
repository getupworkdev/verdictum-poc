// Embedded Postgres (PGlite) loaded with the real migration, plus a minimal
// stand-in for the parts of Supabase the schema relies on: the auth schema,
// auth.uid() and the anon / authenticated / service_role roles. Tests run the
// same SQL that runs in production, as the same database roles.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';

const SUPABASE_SHIM = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
`;

const GRANTS = `
  grant usage on schema public to anon, authenticated, service_role;
  grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
  grant execute on function public.search_passages(uuid, text, vector, int) to authenticated;
  grant execute on function public.current_firm_id() to authenticated;
`;

export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite({ extensions: { vector } });
  await db.exec(SUPABASE_SHIM);
  const migration = await readFile(path.join(process.cwd(), 'supabase/migrations/20261017000001_schema.sql'), 'utf8');
  await db.exec(migration);
  await db.exec(GRANTS);
  return db;
}

export const IDS = {
  firmA: '00000000-0000-4000-8000-00000000000a',
  firmB: '00000000-0000-4000-8000-00000000000b',
  userA: '00000000-0000-4000-8000-0000000000a1',
  userB: '00000000-0000-4000-8000-0000000000b1',
  caseA: '00000000-0000-4000-8000-0000000000ac',
  caseB: '00000000-0000-4000-8000-0000000000bc',
  docA: '00000000-0000-4000-8000-0000000000ad',
  docB: '00000000-0000-4000-8000-0000000000bd',
};

// Three-dimensional toy embeddings are enough to exercise the vector branch;
// the column is 384-dimensional, so pad them.
export function toyEmbedding(values: number[]): string {
  const full = [...values, ...Array(384 - values.length).fill(0)];
  return `[${full.join(',')}]`;
}

export async function seedTwoFirms(db: PGlite): Promise<void> {
  const { firmA, firmB, userA, userB, caseA, caseB, docA, docB } = IDS;
  await db.exec(`
    insert into auth.users (id, email) values
      ('${userA}', 'anna@iroda-a.example.com'),
      ('${userB}', 'bela@iroda-b.example.com');
    insert into public.firms (id, name) values ('${firmA}', 'Iroda A'), ('${firmB}', 'Iroda B');
    insert into public.users (id, firm_id, full_name) values
      ('${userA}', '${firmA}', 'dr. Teszt Anna'),
      ('${userB}', '${firmB}', 'dr. Minta Béla');
    insert into public.cases (id, firm_id, title, reference) values
      ('${caseA}', '${firmA}', 'Kitalált Építő Kft. ügye', 'A-2026/014'),
      ('${caseB}', '${firmB}', 'Tesztelő Zrt. ügye', 'B-2026/007');
    insert into public.documents (id, firm_id, case_id, filename, mime_type) values
      ('${docA}', '${firmA}', '${caseA}', 'szerzodes.pdf', 'application/pdf'),
      ('${docB}', '${firmB}', '${caseB}', 'berlet.pdf', 'application/pdf');
  `);

  const passages: [string, string, string, number, number, string, number[]][] = [
    [firmA, caseA, docA, 1, 1, 'A szerződésben meghatározott fizetési határidő 30 nap.', [1, 0, 0]],
    [firmA, caseA, docA, 1, 2, 'A Vevő a szerződést írásban felmondhatja.', [0.9, 0.1, 0]],
    [firmA, caseA, docA, 2, 1, 'A szállítás helye a Vevő mintavárosi telephelye.', [0, 1, 0]],
    [firmB, caseB, docB, 1, 1, 'A bérleti szerződés határozott időre szól.', [1, 0, 0]],
  ];
  for (const [firm, c, doc, page, para, text, emb] of passages) {
    await db.query(
      `insert into public.passages (firm_id, case_id, document_id, page, para, text, embedding)
       values ($1, $2, $3, $4, $5, $6, $7::vector)`,
      [firm, c, doc, page, para, text, toyEmbedding(emb)],
    );
  }
}

// Runs fn as the signed-in user, exactly like a request carrying their JWT.
export async function asUser<T>(db: PGlite, userId: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; reset request.jwt.claim.sub;`);
  }
}
