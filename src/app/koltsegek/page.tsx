import { redirect } from 'next/navigation';
import { PriceNote, Stat } from '@/components/costs';
import { formatTokens, formatUsd } from '@/lib/pricing';
import { createClient, getProfile } from '@/lib/supabase/server';

export default async function FirmCostsPage() {
  const profile = await getProfile();
  if (!profile) redirect('/belepes');
  const supabase = await createClient();

  const [{ data: firm }, { data: perCase }, { data: cases }] = await Promise.all([
    supabase.from('firm_costs').select('*').maybeSingle(),
    supabase.from('case_costs').select('*'),
    supabase.from('cases').select('id, title, reference'),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Költségek – {profile.firmName}</h1>
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Elemzések (iroda)" value={String(firm?.analyses ?? 0)} />
        <Stat label="Bemeneti token" value={formatTokens(firm?.input_tokens)} />
        <Stat label="Kimeneti token" value={formatTokens(firm?.output_tokens)} />
        <Stat label="Becsült költség (iroda)" value={formatUsd(firm?.cost_usd)} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Ügy</th>
              <th className="px-4 py-2 text-right font-medium">Elemzések</th>
              <th className="px-4 py-2 text-right font-medium">Token (be/ki)</th>
              <th className="px-4 py-2 text-right font-medium">Költség</th>
            </tr>
          </thead>
          <tbody>
            {(cases ?? []).map((c) => {
              const row = perCase?.find((p) => p.case_id === c.id);
              return (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    <div className="text-xs text-slate-500">{c.reference}</div>
                    {c.title}
                  </td>
                  <td className="px-4 py-2 text-right">{row?.analyses ?? 0}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">
                    {formatTokens(row?.input_tokens)} / {formatTokens(row?.output_tokens)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{formatUsd(row?.cost_usd)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <PriceNote />
    </div>
  );
}
