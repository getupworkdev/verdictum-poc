import { loadCase } from '@/lib/cases';
import { TEMPLATES, fillTemplate, todayHu } from '@/lib/templates';
import { DraftEditor, type DraftVersion } from './draft-editor';

export default async function DraftsPage({ params }: PageProps<'/ugyek/[id]/tervezetek'>) {
  const { id } = await params;
  const { supabase, kase } = await loadCase(id);

  const facts = { ...kase.facts, datum: todayHu() };
  const templates = TEMPLATES.map((t) => {
    const { text, missing } = fillTemplate(t.body, facts);
    return { key: t.key, title: t.title, description: t.description, filled: text, missing };
  });

  const { data } = await supabase
    .from('drafts')
    .select('id, template_key, version, title, content, created_at')
    .eq('case_id', kase.id)
    .order('version', { ascending: true });

  return <DraftEditor caseId={kase.id} templates={templates} versions={(data ?? []) as DraftVersion[]} facts={facts} />;
}
