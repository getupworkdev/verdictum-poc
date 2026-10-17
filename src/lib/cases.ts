import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { createClient, getProfile } from '@/lib/supabase/server';

export type CaseRow = {
  id: string;
  firm_id: string;
  title: string;
  reference: string;
  facts: Record<string, string>;
};

// Loads a case as the signed-in user. Another firm's case id simply returns no
// row under RLS, so it is a 404 here.
export async function loadCase(id: string) {
  const profile = await getProfile();
  if (!profile) redirect('/belepes');

  const supabase = await createClient();
  const { data } = await supabase
    .from('cases')
    .select('id, firm_id, title, reference, facts')
    .eq('id', id)
    .maybeSingle();
  if (!data) notFound();

  return { profile, supabase, kase: data as CaseRow };
}
