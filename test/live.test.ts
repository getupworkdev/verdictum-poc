// Optional: runs the isolation and search checks against the deployed
// Supabase project through its public API, signed in as the demo users.
// Skipped unless LIVE_SUPABASE=1 and the keys are in the environment:
//   LIVE_SUPABASE=1 npx vitest run test/live.test.ts  (with .env.local loaded)

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';

const live = process.env.LIVE_SUPABASE === '1';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const password = process.env.NEXT_PUBLIC_DEMO_USER_PASSWORD ?? '';

async function signIn(email: string): Promise<SupabaseClient> {
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

describe.skipIf(!live)('live Supabase: tenant isolation', () => {
  let anna: SupabaseClient;
  let bela: SupabaseClient;
  let caseA: { id: string; firm_id: string };

  beforeAll(async () => {
    anna = await signIn('anna@iroda-a.example.com');
    bela = await signIn('bela@iroda-b.example.com');
    const { data } = await anna.from('cases').select('id, firm_id').eq('reference', 'A-2026/014').single();
    caseA = data!;
  });

  it('each user sees only their own firm’s case', async () => {
    const a = await anna.from('cases').select('reference');
    const b = await bela.from('cases').select('reference');
    expect(a.data?.map((r) => r.reference)).toEqual(['A-2026/014']);
    expect(b.data?.map((r) => r.reference)).toEqual(['B-2026/007']);
  });

  it('firm B cannot read firm A’s case, passages or files by id', async () => {
    expect((await bela.from('cases').select('*').eq('id', caseA.id)).data).toEqual([]);
    expect((await bela.from('passages').select('id').eq('case_id', caseA.id)).data).toEqual([]);
    expect((await bela.storage.from('documents').list(`${caseA.firm_id}/${caseA.id}`)).data).toEqual([]);
    const search = await bela.rpc('search_passages', { p_case_id: caseA.id, p_query: 'szerződés' });
    expect(search.data).toEqual([]);
  });

  it('firm B cannot write into firm A', async () => {
    const { error } = await bela
      .from('analyses')
      .insert({ firm_id: caseA.firm_id, case_id: caseA.id, question: 'x', answer: {}, model: 'x' });
    expect(error?.message).toMatch(/row-level security/);
  });

  it('Hungarian stemming works on the hosted database', async () => {
    const { data } = await anna.rpc('search_passages', { p_case_id: caseA.id, p_query: 'szerződést', p_limit: 20 });
    const texts = (data as { text: string }[]).map((d) => d.text);
    expect(texts.some((t) => t.includes('szerződésben'))).toBe(true);
    expect(texts.some((t) => t.includes('szerződést'))).toBe(true);
  });
});
