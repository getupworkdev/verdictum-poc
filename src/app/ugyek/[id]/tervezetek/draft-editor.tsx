'use client';

import { diffWords } from 'diff';
import { useState, useTransition } from 'react';
import { saveDraftVersion } from './actions';

export type DraftVersion = {
  id: string;
  template_key: string;
  version: number;
  title: string;
  content: string;
  created_at: string;
};

type TemplateView = { key: string; title: string; description: string; filled: string; missing: string[] };

export function DraftEditor({
  caseId,
  templates,
  versions,
  facts,
}: {
  caseId: string;
  templates: TemplateView[];
  versions: DraftVersion[];
  facts: Record<string, string>;
}) {
  const [templateKey, setTemplateKey] = useState(templates[0].key);
  const template = templates.find((t) => t.key === templateKey)!;
  const own = versions.filter((v) => v.template_key === templateKey);
  const latest = own[own.length - 1];

  const [content, setContent] = useState(latest?.content ?? template.filled);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [left, setLeft] = useState<number | null>(null);
  const [right, setRight] = useState<number | null>(null);

  function switchTemplate(key: string) {
    setTemplateKey(key);
    const t = templates.find((x) => x.key === key)!;
    const mine = versions.filter((v) => v.template_key === key);
    setContent(mine[mine.length - 1]?.content ?? t.filled);
    setLeft(null);
    setRight(null);
    setStatus(null);
  }

  function save() {
    startTransition(async () => {
      const result = await saveDraftVersion({ caseId, templateKey, content });
      setStatus('error' in result && result.error ? result.error : `Elmentve: v${result.version}`);
    });
  }

  const a = own.find((v) => v.version === left);
  const b = own.find((v) => v.version === right);
  const parts = a && b ? diffWords(a.content, b.content) : [];
  const missing = [...new Set([...content.matchAll(/\[\[hiányzik: ([a-z_]+)\]\]/g)].map((m) => m[1]))];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div>
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => switchTemplate(t.key)}
              className={`rounded border px-3 py-1.5 text-sm ${
                t.key === templateKey
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white hover:bg-slate-50'
              }`}
            >
              {t.title}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">{template.description} A helyőrzőket az ügy adatai töltik ki.</p>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
          className="mt-3 h-[480px] w-full rounded-lg border border-slate-300 bg-white p-4 font-mono text-[13px] leading-6"
        />
        {missing.length > 0 && (
          <p className="mt-1 text-xs text-orange-700">
            Hiányzó adat: {missing.join(', ')} – töltsd ki kézzel mentés előtt.
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {pending ? 'Mentés…' : 'Mentés új verzióként'}
          </button>
          <button
            type="button"
            onClick={() => setContent(template.filled)}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            Sablon újratöltése
          </button>
          {status && <span className="text-sm text-slate-600">{status}</span>}
        </div>

        {a && b && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-medium">
              Eltérések: v{a.version} → v{b.version}
            </h3>
            <div className="mt-3 whitespace-pre-wrap font-mono text-[13px] leading-6">
              {parts.map((p, i) => (
                <span
                  key={i}
                  className={
                    p.added ? 'bg-green-100 text-green-900' : p.removed ? 'bg-red-100 text-red-800 line-through' : ''
                  }
                >
                  {p.value}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <h3 className="font-medium">Verziók</h3>
          {own.length === 0 && <p className="mt-2 text-xs text-slate-500">Még nincs mentett verzió.</p>}
          <ul className="mt-2 space-y-2">
            {[...own].reverse().map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setContent(v.content)}
                  className="text-left text-blue-700 hover:underline"
                >
                  v{v.version}
                  <span className="ml-1 text-xs text-slate-500">
                    {new Date(v.created_at).toLocaleString('hu-HU', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </button>
                <a
                  href={`/api/drafts/${v.id}/docx`}
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50"
                >
                  DOCX
                </a>
              </li>
            ))}
          </ul>
          {own.length >= 2 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <div className="text-xs font-medium text-slate-600">Összehasonlítás</div>
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={left ?? ''}
                  onChange={(e) => setLeft(Number(e.target.value) || null)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs"
                >
                  <option value="">régi</option>
                  {own.map((v) => (
                    <option key={v.id} value={v.version}>
                      v{v.version}
                    </option>
                  ))}
                </select>
                <span className="text-xs">→</span>
                <select
                  value={right ?? ''}
                  onChange={(e) => setRight(Number(e.target.value) || null)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs"
                >
                  <option value="">új</option>
                  {own.map((v) => (
                    <option key={v.id} value={v.version}>
                      v{v.version}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs shadow-sm">
          <h3 className="text-sm font-medium">Az ügy adatai</h3>
          <dl className="mt-2 space-y-1">
            {Object.entries(facts).map(([k, v]) => (
              <div key={k}>
                <dt className="font-mono text-slate-400">{k}</dt>
                <dd className="text-slate-700">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>
    </div>
  );
}
