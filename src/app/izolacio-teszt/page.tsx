import { redirect } from 'next/navigation';
import { createAdminClient, createClient, getProfile } from '@/lib/supabase/server';

type Check = {
  title: string;
  code: string;
  expected: string;
  result: unknown;
  passed: boolean;
};

export default async function IsolationPage() {
  const profile = await getProfile();
  if (!profile) redirect('/belepes');

  // The admin client is used only to learn another firm's case id, so we can
  // show that knowing the id is not enough. Every check runs as the user.
  const admin = createAdminClient();
  const { data: other } = await admin
    .from('cases')
    .select('id, firm_id, reference, firms(name)')
    .neq('firm_id', profile.firmId)
    .limit(1)
    .maybeSingle();
  const { data: ownCase } = await admin.from('cases').select('id').eq('firm_id', profile.firmId).limit(1).maybeSingle();

  const supabase = await createClient();
  const checks: Check[] = [];

  if (ownCase) {
    const own = await supabase.from('cases').select('id, reference').eq('id', ownCase.id);
    checks.push({
      title: 'Kontroll: saját ügy olvasása',
      code: `supabase.from('cases').select('id, reference').eq('id', '${ownCase.id}')`,
      expected: '1 sor',
      result: own.data,
      passed: own.data?.length === 1,
    });
  }

  if (other) {
    const otherFirmName = (other.firms as unknown as { name: string } | null)?.name ?? 'másik iroda';

    const read = await supabase.from('cases').select('*').eq('id', other.id);
    checks.push({
      title: `Másik iroda ügye (${other.reference}, ${otherFirmName}) – az azonosító ismert`,
      code: `supabase.from('cases').select('*').eq('id', '${other.id}')`,
      expected: '0 sor (RLS kiszűri)',
      result: read.error ? { error: read.error.message } : read.data,
      passed: !read.error && read.data?.length === 0,
    });

    const passages = await supabase.from('passages').select('id, text').eq('case_id', other.id);
    checks.push({
      title: 'Másik iroda dokumentumrészletei',
      code: `supabase.from('passages').select('id, text').eq('case_id', '${other.id}')`,
      expected: '0 sor',
      result: passages.error ? { error: passages.error.message } : passages.data,
      passed: !passages.error && passages.data?.length === 0,
    });

    const search = await supabase.rpc('search_passages', { p_case_id: other.id, p_query: 'szerződés', p_limit: 8 });
    checks.push({
      title: 'Keresés a másik iroda ügyében',
      code: `supabase.rpc('search_passages', { p_case_id: '${other.id}', p_query: 'szerződés' })`,
      expected: '0 találat',
      result: search.error ? { error: search.error.message } : search.data,
      passed: !search.error && (search.data as unknown[]).length === 0,
    });

    const write = await supabase.from('analyses').insert({
      firm_id: other.firm_id,
      case_id: other.id,
      question: 'izolációs teszt',
      answer: {},
      model: 'none',
    });
    checks.push({
      title: 'Írás a másik iroda nevében',
      code: `supabase.from('analyses').insert({ firm_id: '${other.firm_id}', case_id: '${other.id}', ... })`,
      expected: 'elutasítva (row-level security)',
      result: write.error ? { error: write.error.message, code: write.error.code } : 'ELFOGADVA',
      passed: Boolean(write.error),
    });

    const files = await supabase.storage.from('documents').list(`${other.firm_id}/${other.id}`);
    checks.push({
      title: 'A másik iroda feltöltött fájljai (Storage)',
      code: `supabase.storage.from('documents').list('${other.firm_id}/${other.id}')`,
      expected: '0 fájl',
      result: files.error ? { error: files.error.message } : files.data,
      passed: !files.error && files.data?.length === 0,
    });
  }

  const allPassed = checks.length > 0 && checks.every((c) => c.passed);

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold">Izolációs teszt</h1>
      <p className="mt-1 text-sm text-slate-600">
        Bejelentkezve: <strong>{profile.fullName}</strong> ({profile.firmName}). Az alábbi lekérdezések a felhasználó
        saját munkamenetével futnak – pontosan úgy, ahogy az alkalmazás bármely kérése. A szűrést a PostgreSQL Row Level
        Security végzi, ezért egy alkalmazáshiba sem tud másik iroda adatához hozzáférni.
      </p>

      <div
        className={`mt-4 rounded-lg px-4 py-3 text-sm font-medium ${
          allPassed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}
      >
        {allPassed
          ? `Minden ellenőrzés sikeres (${checks.length}/${checks.length}).`
          : 'Legalább egy ellenőrzés sikertelen!'}
      </div>

      <div className="mt-4 space-y-3">
        {checks.map((c) => (
          <div key={c.title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-medium">{c.title}</h2>
              <span
                className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                  c.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {c.passed ? 'OK' : 'HIBA'}
              </span>
            </div>
            <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{c.code}</pre>
            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <div className="font-medium text-slate-500">Elvárt</div>
                <div>{c.expected}</div>
              </div>
              <div>
                <div className="font-medium text-slate-500">Eredmény</div>
                <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(c.result, null, 2)}</pre>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <h2 className="font-medium">A szabály az adatbázisban</h2>
        <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{`create policy cases_own_firm on public.cases
  for all to authenticated
  using (firm_id = public.current_firm_id())
  with check (firm_id = public.current_firm_id());

-- current_firm_id() = select firm_id from public.users where id = auth.uid()`}</pre>
        <p className="mt-2 text-xs text-slate-500">
          Ugyanez a szabály védi a dokumentumokat, bekezdéseket, elemzéseket és tervezeteket, a gyermektáblák pedig
          összetett idegen kulccsal (case_id, firm_id) kötődnek az ügyhöz. Automatikus teszt:{' '}
          <code>test/isolation.test.ts</code>.
        </p>
      </div>
    </div>
  );
}
