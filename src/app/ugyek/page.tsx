import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, getProfile } from '@/lib/supabase/server';

export default async function CasesPage() {
  const profile = await getProfile();
  if (!profile) redirect('/belepes');

  const supabase = await createClient();
  const { data: cases } = await supabase
    .from('cases')
    .select('id, title, reference, created_at, documents(count), analyses(count)')
    .order('created_at');

  return (
    <div>
      <h1 className="text-xl font-semibold">Ügyek – {profile.firmName}</h1>
      <p className="mt-1 text-sm text-slate-600">
        Csak a saját iroda ügyei látszanak. A szűrést az adatbázis végzi (Row Level Security), nem az alkalmazás.
      </p>

      <div className="mt-5 grid gap-3">
        {(cases ?? []).map((c) => {
          const docs = (c.documents as unknown as { count: number }[])[0]?.count ?? 0;
          const analyses = (c.analyses as unknown as { count: number }[])[0]?.count ?? 0;
          return (
            <Link
              key={c.id}
              href={`/ugyek/${c.id}`}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-400"
            >
              <div className="text-xs font-medium text-slate-500">{c.reference}</div>
              <div className="mt-0.5 font-medium">{c.title}</div>
              <div className="mt-2 text-xs text-slate-500">
                {docs} dokumentum · {analyses} elemzés
              </div>
            </Link>
          );
        })}
        {cases?.length === 0 && <p className="text-sm text-slate-500">Nincs ügy.</p>}
      </div>
    </div>
  );
}
