import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serverEmbedder, toPgVector } from '@/lib/embed';

export type SearchHit = {
  id: string;
  document_id: string;
  filename: string;
  page: number;
  para: number;
  text: string;
  fts_rank: number | null;
  vector_similarity: number | null;
  score: number;
};

// Hybrid search, always scoped to one case. Runs as the signed-in user, so RLS
// applies on top of the case filter inside search_passages().
export async function searchCase(supabase: SupabaseClient, caseId: string, query: string, limit = 8) {
  const [embedding] = await serverEmbedder()([query]);
  const { data, error } = await supabase.rpc('search_passages', {
    p_case_id: caseId,
    p_query: query,
    p_embedding: toPgVector(embedding),
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return { hits: (data ?? []) as SearchHit[], usedVectors: embedding != null };
}
