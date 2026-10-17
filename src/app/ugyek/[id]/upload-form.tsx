'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const MAX_BYTES = 5 * 1024 * 1024;

export function UploadForm({ caseId, firmId }: { caseId: string; firmId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem('file') as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.pdf') && !lower.endsWith('.docx')) {
      setMessage({ ok: false, text: 'Csak PDF és DOCX fájl tölthető fel.' });
      return;
    }
    if (file.size > MAX_BYTES) {
      setMessage({ ok: false, text: 'A fájl legfeljebb 5 MB lehet.' });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const safeName = file.name.normalize('NFD').replace(/[^\w.-]+/g, '_');
      const path = `${firmId}/${caseId}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await createClient()
        .storage.from('documents')
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (error) throw new Error(`Feltöltési hiba: ${error.message}`);

      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, path, filename: file.name }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'A feldolgozás nem sikerült.');

      setMessage({ ok: true, text: `Kész: ${body.passages} bekezdés feldolgozva.` });
      input.value = '';
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Hiba történt.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="font-medium">Dokumentum feltöltése</h3>
      <p className="mt-1 text-xs text-slate-500">PDF vagy DOCX, legfeljebb 5 MB és 30 oldal. Csak kitalált adat!</p>
      <input name="file" type="file" accept=".pdf,.docx" required className="mt-3 block w-full text-xs" />
      <button
        disabled={busy}
        className="mt-3 w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {busy ? 'Feldolgozás…' : 'Feltöltés és feldolgozás'}
      </button>
      {message && <p className={`mt-2 text-xs ${message.ok ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>}
    </form>
  );
}
