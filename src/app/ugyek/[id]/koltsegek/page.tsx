import { loadCase } from '@/lib/cases';
import { PriceNote, Stat } from '@/components/costs';
import { formatTokens, formatUsd } from '@/lib/pricing';

export default async function CaseCostsPage({ params }: PageProps<'/ugyek/[id]/koltsegek'>) {
  const { id } = await params;
  const { supabase, kase } = await loadCase(id);

  const [{ data: totals }, { data: rows }] = await Promise.all([
    supabase.from('case_costs').select('*').eq('case_id', kase.id).maybeSingle(),
    supabase
      .from('analyses')
      .select('id, question, model, input_tokens, output_tokens, cost_usd, created_at')
      .eq('case_id', kase.id)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Elemzések" value={String(totals?.analyses ?? 0)} />
        <Stat label="Bemeneti token" value={formatTokens(totals?.input_tokens)} />
        <Stat label="Kimeneti token" value={formatTokens(totals?.output_tokens)} />
        <Stat label="Becsült költség (ügy)" value={formatUsd(totals?.cost_usd)} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Kérdés</th>
              <th className="px-4 py-2 font-medium">Modell</th>
              <th className="px-4 py-2 text-right font-medium">Bemenet</th>
              <th className="px-4 py-2 text-right font-medium">Kimenet</th>
              <th className="px-4 py-2 text-right font-medium">Költség</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{r.question}</td>
                <td className="px-4 py-2 text-xs text-slate-500">{r.model}</td>
                <td className="px-4 py-2 text-right font-mono text-xs">{formatTokens(r.input_tokens)}</td>
                <td className="px-4 py-2 text-right font-mono text-xs">{formatTokens(r.output_tokens)}</td>
                <td className="px-4 py-2 text-right font-mono text-xs">{formatUsd(r.cost_usd)}</td>
              </tr>
            ))}
            {rows?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Még nem volt AI-elemzés ebben az ügyben.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <PriceNote />
    </div>
  );
}
