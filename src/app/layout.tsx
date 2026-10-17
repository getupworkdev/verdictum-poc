import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { signOut } from '@/app/belepes/actions';
import { getProfile } from '@/lib/supabase/server';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Verdictum POC',
  description: "Demo project built for Verdictum's proposal – sample data only",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const profile = await getProfile().catch(() => null);

  return (
    <html lang="hu" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">
        <div className="bg-amber-100 px-4 py-2 text-center text-xs text-amber-900">
          <strong>Demo project built for Verdictum&apos;s proposal – sample data only</strong>
          <span className="hidden sm:inline"> · Bemutató projekt, kizárólag kitalált mintaadatokkal.</span>
        </div>

        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/ugyek" className="flex items-baseline gap-2">
              <span className="text-lg font-semibold tracking-tight">Verdictum</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">POC</span>
            </Link>
            {profile && (
              <nav className="flex flex-wrap items-center gap-4 text-sm">
                <Link href="/ugyek" className="text-slate-700 hover:text-slate-950">
                  Ügyek
                </Link>
                <Link href="/koltsegek" className="text-slate-700 hover:text-slate-950">
                  Költségek
                </Link>
                <Link href="/izolacio-teszt" className="text-slate-700 hover:text-slate-950">
                  Izolációs teszt
                </Link>
                <span className="hidden text-slate-400 md:inline">|</span>
                <span className="text-slate-500">
                  {profile.fullName} · <span className="font-medium text-slate-700">{profile.firmName}</span>
                </span>
                <form action={signOut}>
                  <button className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">
                    Kilépés
                  </button>
                </form>
              </nav>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

        <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-slate-400">
          Demo project built for Verdictum&apos;s proposal – sample data only. Minden cég, személy és ügy kitalált.
        </footer>
      </body>
    </html>
  );
}
