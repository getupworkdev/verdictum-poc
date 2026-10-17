import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { type SourcePassage, type StoredAnswer, summarize, verifyAnswer } from '@/lib/citations';
import { askWithCitations } from '@/lib/claude';
import { allowRequest } from '@/lib/client-ip';
import { MODEL } from '@/lib/pricing';
import { searchCase } from '@/lib/search';
import { createClient, getProfile } from '@/lib/supabase/server';

export const maxDuration = 60;

const Body = z.object({
  caseId: z.uuid(),
  question: z.string().trim().min(3).max(500),
});

export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: 'Bejelentkezés szükséges.' }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'A kérdés 3–500 karakter lehet.' }, { status: 400 });
  const { caseId, question } = parsed.data;

  // 20 questions per hour per IP: every question costs real tokens.
  if (!(await allowRequest('ask', 20, 3600))) {
    return NextResponse.json(
      { error: 'Óránként legfeljebb 20 kérdés tehető fel. Próbáld újra később.' },
      { status: 429 },
    );
  }

  const supabase = await createClient();
  const { data: kase } = await supabase.from('cases').select('id, firm_id').eq('id', caseId).maybeSingle();
  if (!kase) return NextResponse.json({ error: 'Az ügy nem található.' }, { status: 404 });

  const { hits } = await searchCase(supabase, caseId, question, 8);
  const passages: SourcePassage[] = hits.map((h) => ({
    id: h.id,
    documentId: h.document_id,
    filename: h.filename,
    page: h.page,
    para: h.para,
    text: h.text,
  }));

  let answer: StoredAnswer;
  let usage = { model: MODEL, inputTokens: 0, outputTokens: 0, costUsd: 0 };

  if (passages.length === 0) {
    // Nothing in this case supports an answer: do not ask the model at all.
    answer = {
      blocks: [
        { text: 'Az ügy dokumentumaiban nincs a kérdéshez kapcsolódó részlet.', status: 'hianyzo', citations: [] },
      ],
      passages: [],
      noEvidence: true,
      refused: false,
    };
  } else {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Az AI kulcs nincs beállítva ezen a környezeten.' }, { status: 503 });
    }
    try {
      const result = await askWithCitations(question, passages);
      usage = result;
      answer = {
        blocks: verifyAnswer(result.blocks, passages),
        passages,
        noEvidence: false,
        refused: result.refused,
      };
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) {
        return NextResponse.json({ error: 'Az AI szolgáltatás most túlterhelt. Próbáld újra.' }, { status: 503 });
      }
      if (err instanceof Anthropic.APIError) {
        console.error('Claude API error', err.status, err.message);
        return NextResponse.json({ error: 'Az AI szolgáltatás hibát adott.' }, { status: 502 });
      }
      throw err;
    }
  }

  const { data: saved, error } = await supabase
    .from('analyses')
    .insert({
      firm_id: kase.firm_id,
      case_id: caseId,
      question,
      answer,
      model: usage.model,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      cost_usd: usage.costUsd,
      created_by: profile.id,
    })
    .select('id, created_at')
    .single();
  if (error) console.error('saving analysis failed', error);

  return NextResponse.json({
    id: saved?.id ?? null,
    question,
    answer,
    summary: summarize(answer.blocks),
    usage,
  });
}
