'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '', label: 'Dokumentumok' },
  { href: '/kereses', label: 'Keresés' },
  { href: '/kerdes', label: 'Kérdés (AI)' },
  { href: '/tervezetek', label: 'Tervezetek' },
  { href: '/koltsegek', label: 'Költségek' },
];

export function CaseTabs({ caseId }: { caseId: string }) {
  const pathname = usePathname();
  const base = `/ugyek/${caseId}`;

  return (
    <nav className="mt-4 flex flex-wrap gap-1 border-b border-slate-200">
      {TABS.map((tab) => {
        const href = base + tab.href;
        const active = pathname === href;
        return (
          <Link
            key={tab.href}
            href={href}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              active
                ? 'border-slate-900 font-medium text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
