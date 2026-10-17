import Link from 'next/link';
import { loadCase } from '@/lib/cases';
import { CaseTabs } from './tabs';

export default async function CaseLayout({ children, params }: LayoutProps<'/ugyek/[id]'>) {
  const { id } = await params;
  const { kase } = await loadCase(id);

  return (
    <div>
      <Link href="/ugyek" className="text-xs text-slate-500 hover:text-slate-800">
        ← Ügyek
      </Link>
      <div className="mt-1 text-xs font-medium text-slate-500">{kase.reference}</div>
      <h1 className="text-xl font-semibold">{kase.title}</h1>
      <CaseTabs caseId={kase.id} />
      <div className="mt-5">{children}</div>
    </div>
  );
}
