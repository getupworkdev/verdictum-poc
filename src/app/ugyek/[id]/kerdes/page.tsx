import { loadCase } from '@/lib/cases';
import type { StoredAnswer } from '@/lib/citations';
import { AskPanel, type AnalysisView } from './ask-panel';

const EXAMPLES = [
  'Mi a vételár fizetési határideje, és mikor járt le?',
  'Milyen jogkövetkezménnyel jár a késedelmes fizetés a szerződésben?',
  'Időben jelezte-e a Vevő a minőségi kifogást?',
  'Van-e a szerződésben választottbírósági kikötés?',
];

export default async function AskPage({ params }: PageProps<'/ugyek/[id]/kerdes'>) {
  const { id } = await params;
  const { supabase, kase } = await loadCase(id);

  const { data } = await supabase
    .from('analyses')
    .select('id, question, answer, model, input_tokens, output_tokens, cost_usd, created_at')
    .eq('case_id', kase.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const history: AnalysisView[] = (data ?? []).map((a) => ({
    id: a.id,
    question: a.question,
    answer: a.answer as StoredAnswer,
    usage: {
      model: a.model,
      inputTokens: a.input_tokens,
      outputTokens: a.output_tokens,
      costUsd: Number(a.cost_usd),
    },
    createdAt: a.created_at,
  }));

  return <AskPanel caseId={kase.id} history={history} examples={EXAMPLES} />;
}
