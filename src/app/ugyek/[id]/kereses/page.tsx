import { loadCase } from '@/lib/cases';
import { allowRequest } from '@/lib/client-ip';
import { searchCase } from '@/lib/search';

function highlight(text: string, query: string) {
  // Visual hint only: mark words sharing the first 5 letters with a query word.
  const stems = query
    .toLowerCase()
    .split(/[^\p{L}\d]+/u)
    .filter((w) => w.length >= 4)
    .map((w) => w.slice(0, 5));
  if (stems.length === 0) return text;
  return text.split(/(\s+)/).map((part, i) => {
    const lower = part.toLowerCase().replace(/[^\p{L}\d]/gu, '');
    return stems.some((s) => lower.startsWith(s)) ? (
      <mark key={i} className="rounded bg-yellow-100 px-0.5">
        {part}
      </mark>
    ) : (
      part
    );
  });
}

export default async function SearchPage({ params, searchParams }: PageProps<'/ugyek/[id]/kereses'>) {
  const { id } = await params;
  const { q } = (await searchParams) as { q?: string };
  const { supabase, kase } = await loadCase(id);
  const query = (q ?? '').trim().slice(0, 200);

  let result: Awaited<ReturnType<typeof searchCase>> | null = null;
  let limited = false;
  if (query) {
    limited = !(await allowRequest('search', 120, 3600));
    if (!limited) result = await searchCase(supabase, kase.id, query, 10);
  }

  return (
    <div className="max-w-3xl">
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="pl. szerződés, fizetési határidő, kötbér"
          className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <button className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Keresés
        </button>
        <span className="group relative self-center">
          <span className="flex h-6 w-6 cursor-help items-center justify-center rounded-full border border-slate-300 text-xs text-slate-500">
            ?
          </span>
          <span className="pointer-events-none absolute right-0 top-8 z-10 hidden w-80 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-lg group-hover:block">
            <strong>Magyar szótövezés.</strong> A teljes szöveges keresés a PostgreSQL <code>hungarian</code> szótárát
            használja, így a <em>szerződés</em>, <em>szerződésben</em> és <em>szerződést</em> alakok ugyanarra a szótőre
            (<code>szerződés</code>) képződnek le: bármelyikre keresve mindhárom megtalálható.
            <br />
            <br />A találatok a szöveges egyezés és a jelentésbeli hasonlóság (pgvector) összevonásából adódnak, és
            mindig csak ebben az ügyben keresünk.
          </span>
        </span>
      </form>

      {limited && <p className="mt-4 text-sm text-red-600">Túl sok keresés. Próbáld újra később.</p>}

      {result && (
        <div className="mt-5 space-y-3">
          <p className="text-xs text-slate-500">
            {result.hits.length} találat ·{' '}
            {result.usedVectors ? 'szöveges + vektoros' : 'csak szöveges (a vektoros keresés most nem érhető el)'}
          </p>
          {result.hits.map((h) => (
            <div key={h.id} className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-medium text-slate-700">
                  {h.filename} · {h.page}. oldal, {h.para}. bekezdés
                </span>
                <span className="font-mono">
                  szöveg {h.fts_rank != null ? h.fts_rank.toFixed(3) : '–'} · vektor{' '}
                  {h.vector_similarity != null ? h.vector_similarity.toFixed(3) : '–'}
                </span>
              </div>
              <p className="mt-2 leading-relaxed">{highlight(h.text, query)}</p>
            </div>
          ))}
          {result.hits.length === 0 && <p className="text-sm text-slate-500">Nincs találat ebben az ügyben.</p>}
        </div>
      )}
    </div>
  );
}
