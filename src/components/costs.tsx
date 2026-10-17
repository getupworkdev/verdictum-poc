import { PRICES } from '@/lib/pricing';

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

export function PriceNote() {
  const p = PRICES['claude-opus-5-5'];
  return (
    <p className="text-xs text-slate-500">
      Becslés a Claude API listaárával (claude-opus-5-5: ${p.input} / 1M bemeneti és ${p.output} / 1M kimeneti token). A
      tényleges számla az Anthropic konzolon látható.
    </p>
  );
}
