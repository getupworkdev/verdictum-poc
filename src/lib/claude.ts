import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { RawTextBlock, SourcePassage } from '@/lib/citations';
import { MODEL, estimateCostUsd } from '@/lib/pricing';

const SYSTEM = `Magyar jogi asszisztens vagy egy ügyvédi iroda számára.
Kizárólag a megadott dokumentumrészletek alapján válaszolj, magyarul, tömören.
Minden ténybeli állításhoz idézd a forrást. Ha a részletek nem tartalmazzák a választ, mondd ki egyértelműen, hogy a rendelkezésre álló dokumentumokban erre nincs adat, és ne találgass.
Ne adj jogi tanácsot a dokumentumokon túl; a választ ügyvéd ellenőrzi.`;

export type ClaudeAnswer = {
  blocks: RawTextBlock[];
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  refused: boolean;
};

let client: Anthropic | null = null;

function getClient(): Anthropic {
  // The API key is read from ANTHROPIC_API_KEY on the server only.
  client ??= new Anthropic({ maxRetries: 2, timeout: 60_000 });
  return client;
}

export async function askWithCitations(question: string, passages: SourcePassage[]): Promise<ClaudeAnswer> {
  const documents: Anthropic.Beta.BetaRequestDocumentBlock[] = passages.map((p) => ({
    type: 'document',
    source: { type: 'text', media_type: 'text/plain', data: p.text },
    title: `${p.filename} – ${p.page}. oldal, ${p.para}. bekezdés`,
    citations: { enabled: true },
  }));

  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system: SYSTEM,
    messages: [{ role: 'user', content: [...documents, { type: 'text', text: question }] }],
  });

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const refused = response.stop_reason === 'refusal';

  const blocks: RawTextBlock[] = refused
    ? [{ text: 'A modell ezt a kérdést nem válaszolta meg.' }]
    : response.content.flatMap((block) =>
        block.type === 'text'
          ? [
              {
                text: block.text,
                citations: (block.citations ?? []).flatMap((c) =>
                  c.type === 'char_location'
                    ? [
                        {
                          type: c.type,
                          cited_text: c.cited_text,
                          document_index: c.document_index,
                          start_char_index: c.start_char_index,
                          end_char_index: c.end_char_index,
                        },
                      ]
                    : [],
                ),
              },
            ]
          : [],
      );

  return {
    blocks,
    model: response.model,
    inputTokens,
    outputTokens,
    costUsd: estimateCostUsd(response.model, inputTokens, outputTokens),
    refused,
  };
}
