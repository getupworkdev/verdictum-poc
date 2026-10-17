import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { GATE_COOKIE, gateToken } from '@/lib/gate';

async function unlock(formData: FormData) {
  'use server';
  const password = String(formData.get('password') ?? '');
  const expected = process.env.DEMO_PASSWORD;
  if (!expected || password !== expected) redirect('/kapu?hiba=1');

  (await cookies()).set(GATE_COOKIE, await gateToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  });
  redirect('/belepes');
}

export default async function GatePage({ searchParams }: { searchParams: Promise<{ hiba?: string }> }) {
  const { hiba } = await searchParams;
  return (
    <div className="mx-auto mt-16 max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold">Védett demó</h1>
      <p className="mt-1 text-sm text-slate-600">Add meg a demó jelszavát a folytatáshoz.</p>
      <form action={unlock} className="mt-4 space-y-3">
        <input
          type="password"
          name="password"
          required
          autoFocus
          placeholder="Demó jelszó"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
        {hiba && <p className="text-sm text-red-600">Hibás jelszó.</p>}
        <button className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Belépés a demóba
        </button>
      </form>
    </div>
  );
}
