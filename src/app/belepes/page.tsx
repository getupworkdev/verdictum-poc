import { signIn } from './actions';
import { DemoLoginButtons } from './demo-logins';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ hiba?: string }> }) {
  const { hiba } = await searchParams;
  return (
    <div className="mx-auto mt-10 grid max-w-3xl gap-6 md:grid-cols-2">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Bejelentkezés</h1>
        <form action={signIn} id="login" className="mt-4 space-y-3">
          <input
            name="email"
            type="email"
            required
            placeholder="E-mail"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Jelszó"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
          {hiba && <p className="text-sm text-red-600">Hibás e-mail vagy jelszó.</p>}
          <button className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Bejelentkezés
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Demó fiókok</h2>
        <p className="mt-1 text-sm text-slate-600">
          Két kitalált ügyvédi iroda. Egymás ügyeit nem láthatják – ezt az „Izolációs teszt” oldal be is mutatja.
        </p>
        <DemoLoginButtons />
      </div>
    </div>
  );
}
