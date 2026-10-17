'use client';

export const DEMO_ACCOUNTS = [
  { label: 'Iroda A – dr. Teszt Anna', email: 'anna@iroda-a.example.com' },
  { label: 'Iroda B – dr. Minta Béla', email: 'bela@iroda-b.example.com' },
];

export function DemoLoginButtons() {
  const password = process.env.NEXT_PUBLIC_DEMO_USER_PASSWORD ?? '';

  function fill(email: string) {
    const form = document.getElementById('login') as HTMLFormElement | null;
    if (!form) return;
    (form.elements.namedItem('email') as HTMLInputElement).value = email;
    (form.elements.namedItem('password') as HTMLInputElement).value = password;
    form.requestSubmit();
  }

  return (
    <div className="mt-4 space-y-2">
      {DEMO_ACCOUNTS.map((a) => (
        <button
          key={a.email}
          type="button"
          onClick={() => fill(a.email)}
          className="flex w-full items-center justify-between rounded border border-slate-300 px-3 py-2 text-left text-sm hover:bg-slate-50"
        >
          <span className="font-medium">{a.label}</span>
          <span className="text-xs text-slate-500">{a.email}</span>
        </button>
      ))}
      <p className="pt-1 text-xs text-slate-500">Egy kattintással belép a kiválasztott fiókba.</p>
    </div>
  );
}
