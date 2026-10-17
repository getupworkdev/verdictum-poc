import { loadCase } from '@/lib/cases';
import { UploadForm } from './upload-form';

const SAMPLES = [
  'szallitasi-szerzodes-kitalalt.pdf',
  'fizetesi-emlekezteto-kitalalt.docx',
  'valaszlevel-kitalalt.docx',
  'irodaberleti-szerzodes-kitalalt.pdf',
];

export default async function DocumentsPage({ params }: PageProps<'/ugyek/[id]'>) {
  const { id } = await params;
  const { supabase, kase, profile } = await loadCase(id);

  const { data: docs } = await supabase
    .from('documents')
    .select('id, filename, mime_type, page_count, passage_count, created_at, passages(page, para, text)')
    .eq('case_id', kase.id)
    .order('created_at');

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        {(docs ?? []).map((d) => {
          const passages = (d.passages as { page: number; para: number; text: string }[]).sort(
            (a, b) => a.page - b.page || a.para - b.para,
          );
          return (
            <details key={d.id} className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <summary className="cursor-pointer list-none p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{d.filename}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {d.mime_type.includes('pdf') ? `${d.page_count} oldal · ` : ''}
                    {d.passage_count} bekezdés
                  </span>
                </div>
              </summary>
              <ol className="space-y-2 border-t border-slate-100 p-4 text-sm">
                {passages.map((p) => (
                  <li key={`${p.page}-${p.para}`} className="flex gap-3">
                    <span className="w-16 shrink-0 font-mono text-xs text-slate-400">
                      {p.page}/{p.para}
                    </span>
                    <span>{p.text}</span>
                  </li>
                ))}
              </ol>
            </details>
          );
        })}
        {docs?.length === 0 && <p className="text-sm text-slate-500">Még nincs dokumentum.</p>}
        <p className="text-xs text-slate-500">A számok oldal/bekezdés azonosítók – a hivatkozások ezekre mutatnak.</p>
      </div>

      <aside className="space-y-4">
        <UploadForm caseId={kase.id} firmId={profile.firmId} />
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <h3 className="font-medium">Kitalált mintafájlok</h3>
          <p className="mt-1 text-xs text-slate-500">Letölthetők és újra feltölthetők a feldolgozás kipróbálásához.</p>
          <ul className="mt-2 space-y-1">
            {SAMPLES.map((s) => (
              <li key={s}>
                <a href={`/samples/${s}`} className="text-xs text-blue-700 hover:underline" download>
                  {s}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
