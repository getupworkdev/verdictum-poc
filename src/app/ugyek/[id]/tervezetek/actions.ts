'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getTemplate } from '@/lib/templates';
import { createClient, getProfile } from '@/lib/supabase/server';

const Input = z.object({
  caseId: z.uuid(),
  templateKey: z.string(),
  content: z.string().min(1).max(50_000),
});

// Saves a new version. Old versions are never edited (RLS only allows insert).
export async function saveDraftVersion(raw: z.input<typeof Input>) {
  const profile = await getProfile();
  if (!profile) return { error: 'Bejelentkezés szükséges.' };

  const parsed = Input.safeParse(raw);
  if (!parsed.success) return { error: 'Hibás adatok.' };
  const { caseId, templateKey, content } = parsed.data;
  const template = getTemplate(templateKey);
  if (!template) return { error: 'Ismeretlen sablon.' };

  const supabase = await createClient();
  const { data: kase } = await supabase.from('cases').select('id, firm_id').eq('id', caseId).maybeSingle();
  if (!kase) return { error: 'Az ügy nem található.' };

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: last } = await supabase
      .from('drafts')
      .select('version')
      .eq('case_id', caseId)
      .eq('template_key', templateKey)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();
    const version = (last?.version ?? 0) + 1;

    const { error } = await supabase.from('drafts').insert({
      firm_id: kase.firm_id,
      case_id: caseId,
      template_key: templateKey,
      version,
      title: `${template.title} – v${version}`,
      content,
      created_by: profile.id,
    });
    if (!error) {
      revalidatePath(`/ugyek/${caseId}/tervezetek`);
      return { version };
    }
    if (error.code !== '23505') return { error: error.message }; // retry only on a version clash
  }
  return { error: 'A mentés nem sikerült, próbáld újra.' };
}
