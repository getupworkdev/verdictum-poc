'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CheckedBlock, CheckedCitation, StoredAnswer } from '@/lib/citations';
import { formatTokens, formatUsd } from '@/lib/pricing';

export type AnalysisView = {
  id: string | null;
  question: string;
  answer: StoredAnswer;
  usage: { model: string; inputTokens: number; outputTokens: number; costUsd: number };
  createdAt?: string;
};

const STATUS_STYLE: Record<CheckedBlock['status'], string> = {
  igazolt: 'decoration-green-500',
  nem_igazolt: 'bg-red-50 text-red-800 decoration-red-500',
  hianyzo: 'bg-orange-50 text-orange-900 decoration-orange-400 decoration-dotted',
  semleges: '',
};

function Badge({ status }: { status: CheckedBlock['status'] }) {
  if (status === 'nem_igazolt')
    return <span className="ml-1 rounded bg-red-600 px-1 text-[10px] font-semibold text-white">Nem igazolt</span>;
  if (status === 'hianyzo')
    return (
      <span className="ml-1 rounded bg-orange-500 px-1 text-[10px] font-semibold text-white">Hiányzó bizonyíték</span>
    );
  return null;
}

export function AskPanel({
  caseId,
  history,
  examples,
}: {
  caseId: string;
  history: AnalysisView[];
  examples: string[];
}) {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<AnalysisView | null>(history[0] ?? null);
  const [selected, setSelected] = useState<CheckedCitation | null>(null);

  async function ask(q: string) {
    setBusy(true);
    setError(null);
    setSelected(null);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, question: q }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Hiba történt.');
      setCurrent({ id: body.id, question: body.question, answer: body.answer, usage: body.usage });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba történt.');
    } finally {
      setBusy(false);
    }
  }

  const passageFor = (c: CheckedCitation) => current?.answer.passages.find((p) => p.id === c.passageId) ?? null;

  // Citation chips are numbered across the whole answer.
  const chipStart = (current?.answer.blocks ?? []).reduce<number[]>(
    (acc, b, i, all) => [...acc, i === 0 ? 1 : acc[i - 1] + all[i - 1].citations.length],
    [],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (question.trim().length >= 3) ask(question.trim());
          }}
          className="flex gap-2"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={500}
            placeholder="Kérdés az ügy dokumentumairól…"
            className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <button
            disabled={busy}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {busy ? 'Elemzés…' : 'Kérdezés'}
          </button>
        </form>
        <div className="mt-2 flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              disabled={busy}
              onClick={() => {
                setQuestion(ex);
                ask(ex);
              }}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
            >
              {ex}
            </button>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {current && (
          <div className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-medium text-slate-500">Kérdés</div>
            <div className="font-medium">{current.question}</div>

            <div className="mt-4 text-xs font-medium text-slate-500">Válasz</div>
            <div className="mt-1 whitespace-pre-wrap text-[15px] leading-7">
              {current.answer.blocks.map((block, i) => (
                <span key={i}>
                  <span
                    className={`${STATUS_STYLE[block.status]} ${block.status !== 'semleges' ? 'underline underline-offset-4' : ''} rounded`}
                  >
                    {block.text}
                  </span>
                  {block.citations.map((c, j) => {
                    const ok = c.status === 'igazolt';
                    return (
                      <button
                        key={j}
                        type="button"
                        onClick={() => setSelected(c)}
                        title={
                          c.filename ? `${c.filename}, ${c.page}. oldal, ${c.para}. bekezdés` : 'Ismeretlen forrás'
                        }
                        className={`cite-chip ${
                          ok
                            ? 'border-green-300 bg-green-50 text-green-800 hover:bg-green-100'
                            : 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                        } ${selected === c ? 'ring-2 ring-slate-900' : ''}`}
                      >
                        {chipStart[i] + j}
                      </button>
                    );
                  })}
                  <Badge status={block.status} />
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-500" />
                igazolt hivatkozás
              </span>
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" />
                Nem igazolt: az idézet nem szerepel szó szerint a forrásban
              </span>
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-orange-400" />
                Hiányzó bizonyíték: állítás forrás nélkül
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {current.usage.model} · {formatTokens(current.usage.inputTokens)} bemeneti +{' '}
              {formatTokens(current.usage.outputTokens)} kimeneti token · becsült költség{' '}
              {formatUsd(current.usage.costUsd)}
            </div>
          </div>
        )}

        {history.length > 1 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-slate-700">Korábbi kérdések</h3>
            <ul className="mt-2 space-y-1">
              {history.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrent(h);
                      setSelected(null);
                    }}
                    className="text-left text-sm text-blue-700 hover:underline"
                  >
                    {h.question}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium">Forrás</h3>
          {!selected && (
            <p className="mt-2 text-sm text-slate-500">Kattints egy hivatkozás számára a pontos forrásrészlethez.</p>
          )}
          {selected && (
            <SourceView
              citation={selected}
              passageText={passageFor(selected)?.text ?? null}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
        {current && current.answer.passages.length > 0 && (
          <details className="mt-3 rounded-lg border border-slate-200 bg-white p-4 text-xs shadow-sm">
            <summary className="cursor-pointer font-medium text-slate-700">
              A modellnek átadott {current.answer.passages.length} részlet
            </summary>
            <ol className="mt-2 list-decimal space-y-2 pl-4 text-slate-600">
              {current.answer.passages.map((p) => (
                <li key={p.id}>
                  <span className="font-medium">
                    {p.filename} · {p.page}/{p.para}
                  </span>{' '}
                  {p.text}
                </li>
              ))}
            </ol>
          </details>
        )}
      </aside>
    </div>
  );
}

function SourceView({
  citation,
  passageText,
  onClose,
}: {
  citation: CheckedCitation;
  passageText: string | null;
  onClose: () => void;
}) {
  const ok = citation.status === 'igazolt';
  const canMark = ok && passageText != null && citation.start != null && citation.end != null;

  return (
    <div className="mt-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{citation.filename ?? 'Ismeretlen dokumentum'}</div>
          {citation.page != null && (
            <div className="text-xs text-slate-500">
              {citation.page}. oldal, {citation.para}. bekezdés
            </div>
          )}
        </div>
        <button type="button" onClick={onClose} className="text-xs text-slate-400 hover:text-slate-700">
          bezár
        </button>
      </div>
      <div
        className={`mt-2 rounded px-2 py-1 text-xs font-semibold ${ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}
      >
        {ok ? 'Igazolt: az idézet szó szerint szerepel a forrásban.' : `Nem igazolt. ${citation.reason ?? ''}`}
      </div>
      {passageText ? (
        <p className="mt-3 leading-relaxed text-slate-700">
          {canMark ? (
            <>
              {passageText.slice(0, citation.start!)}
              <mark className="rounded bg-yellow-200 px-0.5">{passageText.slice(citation.start!, citation.end!)}</mark>
              {passageText.slice(citation.end!)}
            </>
          ) : (
            passageText
          )}
        </p>
      ) : null}
      {!ok && (
        <p className="mt-3 text-xs text-slate-500">
          A modell által idézett szöveg: <span className="italic">„{citation.citedText}”</span>
        </p>
      )}
    </div>
  );
}
