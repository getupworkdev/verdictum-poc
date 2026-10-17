// Supabase Edge Function: text -> 384-dimensional embedding with the built-in
// gte-small model. Called by the Next.js server for passages and questions.
// Demo project built for Verdictum's proposal – sample data only.

type EmbeddingSession = { run(text: string, options: { mean_pool: boolean; normalize: boolean }): Promise<number[]> };
declare const Supabase: { ai: { Session: new (model: string) => EmbeddingSession } };

const session = new Supabase.ai.Session('gte-small');

const MAX_INPUTS = 64;
const MAX_CHARS = 4000;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let input: unknown;
  try {
    ({ input } = await req.json());
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_INPUTS) {
    return Response.json({ error: `input must be 1-${MAX_INPUTS} strings` }, { status: 400 });
  }

  const embeddings: number[][] = [];
  for (const text of input) {
    if (typeof text !== 'string') return Response.json({ error: 'input must be strings' }, { status: 400 });
    embeddings.push(await session.run(text.slice(0, MAX_CHARS), { mean_pool: true, normalize: true }));
  }

  return Response.json({ embeddings });
});
