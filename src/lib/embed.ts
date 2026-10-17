// Embeddings come from the `embed` Supabase Edge Function (gte-small, 384
// dimensions, runs inside Supabase at no extra cost). Search still works on
// full-text alone if it is unavailable.

const BATCH = 32;

export function createEmbedder(supabaseUrl: string, apiKey: string) {
  return async function embed(texts: string[]): Promise<(number[] | null)[]> {
    const out: (number[] | null)[] = [];
    for (let i = 0; i < texts.length; i += BATCH) {
      const batch = texts.slice(i, i + BATCH);
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/embed`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: batch }),
        });
        if (!res.ok) throw new Error(`embed ${res.status}: ${await res.text()}`);
        const { embeddings } = (await res.json()) as { embeddings: number[][] };
        out.push(...embeddings);
      } catch (err) {
        console.error('Embedding failed, continuing with full-text only', err);
        out.push(...batch.map(() => null));
      }
    }
    return out;
  };
}

export function serverEmbedder() {
  return createEmbedder(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export function toPgVector(values: number[] | null): string | null {
  return values ? `[${values.join(',')}]` : null;
}
