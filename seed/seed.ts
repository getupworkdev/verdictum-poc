// Seeds the two fictional demo firms. Idempotent: re-running resets the demo
// users' password and re-creates the sample documents.
// Usage: npx tsx --env-file=.env.local seed/seed.ts

import { createClient } from '@supabase/supabase-js';
import { createEmbedder } from '../src/lib/embed';
import { ingestParsed } from '../src/lib/ingest';
import { DOCX_MIME, PDF_MIME, parseDocument } from '../src/lib/parse';
import { FIRMS } from './content';
import { buildSample } from './generate-samples';

function need(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const url = need('NEXT_PUBLIC_SUPABASE_URL');
const admin = createClient(url, need('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const embedder = createEmbedder(url, need('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
const demoPassword = need('NEXT_PUBLIC_DEMO_USER_PASSWORD');

async function ensureAuthUser(email: string): Promise<string> {
  const { data: list, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  const existing = list.users.find((u) => u.email === email);
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password: demoPassword, email_confirm: true });
    return existing.id;
  }
  const { data, error: createError } = await admin.auth.admin.createUser({
    email,
    password: demoPassword,
    email_confirm: true,
  });
  if (createError || !data.user) throw createError ?? new Error('createUser failed');
  return data.user.id;
}

async function main() {
  for (const firm of FIRMS) {
    let { data: firmRow } = await admin.from('firms').select('id').eq('name', firm.name).maybeSingle();
    if (!firmRow) {
      ({ data: firmRow } = await admin.from('firms').insert({ name: firm.name }).select('id').single());
    }
    const firmId = firmRow!.id as string;

    const userId = await ensureAuthUser(firm.user.email);
    await admin.from('users').upsert({ id: userId, firm_id: firmId, full_name: firm.user.fullName });
    console.log(`${firm.name}: ${firm.user.email}`);

    for (const c of firm.cases) {
      // Start the demo case from a clean slate.
      await admin.from('cases').delete().eq('firm_id', firmId).eq('reference', c.reference);
      const { data: caseRow, error } = await admin
        .from('cases')
        .insert({ firm_id: firmId, title: c.title, reference: c.reference, facts: c.facts })
        .select('id')
        .single();
      if (error || !caseRow) throw error;

      for (const doc of c.documents) {
        const bytes = await buildSample(doc);
        const mimeType = doc.kind === 'pdf' ? PDF_MIME : DOCX_MIME;
        const storagePath = `${firmId}/${caseRow.id}/minta-${doc.filename}`;
        const { error: uploadError } = await admin.storage
          .from('documents')
          .upload(storagePath, bytes, { contentType: mimeType, upsert: true });
        if (uploadError) throw uploadError;

        const parsed = await parseDocument(bytes, mimeType);
        const result = await ingestParsed(
          admin,
          { firmId, caseId: caseRow.id, filename: doc.filename, mimeType, storagePath, createdBy: userId },
          parsed,
          embedder,
        );
        console.log(`  ${c.reference} ${doc.filename}: ${result.passages} passages, ${result.embedded} embedded`);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
