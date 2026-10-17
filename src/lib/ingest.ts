import type { SupabaseClient } from '@supabase/supabase-js';
import type { ParsedDocument } from '@/lib/parse';

// Stores a parsed document and its passages. Used by the upload API (as the
// signed-in user, through RLS) and by the seed script.

export type Embedder = (texts: string[]) => Promise<(number[] | null)[]>;

export type IngestInput = {
  firmId: string;
  caseId: string;
  filename: string;
  mimeType: string;
  storagePath: string | null;
  createdBy: string | null;
};

export async function ingestParsed(
  supabase: SupabaseClient,
  input: IngestInput,
  parsed: ParsedDocument,
  embedder: Embedder,
): Promise<{ documentId: string; passages: number; embedded: number }> {
  const { data: doc, error } = await supabase
    .from('documents')
    .insert({
      firm_id: input.firmId,
      case_id: input.caseId,
      filename: input.filename,
      mime_type: input.mimeType,
      storage_path: input.storagePath,
      page_count: parsed.pageCount,
      passage_count: parsed.passages.length,
      created_by: input.createdBy,
    })
    .select('id')
    .single();
  if (error || !doc) throw new Error(`A dokumentum mentése nem sikerült: ${error?.message}`);

  const vectors = await embedder(parsed.passages.map((p) => p.text));
  const rows = parsed.passages.map((p, i) => ({
    firm_id: input.firmId,
    case_id: input.caseId,
    document_id: doc.id,
    page: p.page,
    para: p.para,
    text: p.text,
    embedding: vectors[i] ? `[${vectors[i]!.join(',')}]` : null,
  }));

  const { error: passageError } = await supabase.from('passages').insert(rows);
  if (passageError) {
    await supabase.from('documents').delete().eq('id', doc.id);
    throw new Error(`A bekezdések mentése nem sikerült: ${passageError.message}`);
  }

  return { documentId: doc.id, passages: rows.length, embedded: vectors.filter(Boolean).length };
}
