import { NextResponse } from 'next/server';
import { z } from 'zod';
import { allowRequest } from '@/lib/client-ip';
import { serverEmbedder } from '@/lib/embed';
import { ingestParsed } from '@/lib/ingest';
import { MAX_UPLOAD_BYTES, ParseError, mimeFromFilename, parseDocument } from '@/lib/parse';
import { createClient, getProfile } from '@/lib/supabase/server';

export const maxDuration = 60;

const Body = z.object({
  caseId: z.uuid(),
  path: z.string().min(1).max(300),
  filename: z.string().min(1).max(200),
});

// The browser uploads the file straight to Supabase Storage (so the 5 MB limit
// is not capped by the serverless body limit), then calls this route to parse
// it. Everything below runs as the signed-in user, under RLS.
export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: 'Bejelentkezés szükséges.' }, { status: 401 });

  if (!(await allowRequest('upload', 15, 3600))) {
    return NextResponse.json({ error: 'Túl sok feltöltés. Próbáld újra egy óra múlva.' }, { status: 429 });
  }

  const parsedBody = Body.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) return NextResponse.json({ error: 'Hibás kérés.' }, { status: 400 });
  const { caseId, path, filename } = parsedBody.data;

  if (!path.startsWith(`${profile.firmId}/${caseId}/`)) {
    return NextResponse.json({ error: 'Hibás tárolási útvonal.' }, { status: 400 });
  }
  const mimeType = mimeFromFilename(filename);
  if (!mimeType) return NextResponse.json({ error: 'Csak PDF és DOCX fájl tölthető fel.' }, { status: 400 });

  const supabase = await createClient();
  const { data: kase } = await supabase.from('cases').select('id').eq('id', caseId).maybeSingle();
  if (!kase) return NextResponse.json({ error: 'Az ügy nem található.' }, { status: 404 });

  const { data: file, error: downloadError } = await supabase.storage.from('documents').download(path);
  if (downloadError || !file) return NextResponse.json({ error: 'A fájl nem érhető el.' }, { status: 404 });
  if (file.size > MAX_UPLOAD_BYTES) {
    await supabase.storage.from('documents').remove([path]);
    return NextResponse.json({ error: 'A fájl legfeljebb 5 MB lehet.' }, { status: 413 });
  }

  try {
    const parsed = await parseDocument(new Uint8Array(await file.arrayBuffer()), mimeType);
    const result = await ingestParsed(
      supabase,
      { firmId: profile.firmId, caseId, filename, mimeType, storagePath: path, createdBy: profile.id },
      parsed,
      serverEmbedder(),
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof ParseError ? err.message : 'A feldolgozás nem sikerült.';
    if (!(err instanceof ParseError)) console.error(err);
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
