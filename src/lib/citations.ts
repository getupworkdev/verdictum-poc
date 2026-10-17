// Server-side check of the citations Claude returns.
//
// Claude's Citations feature returns the answer as text blocks; cited blocks
// carry char_location citations that point into the documents we sent (one
// document per retrieved passage). We never trust the model's own claim: a
// citation is only "igazolt" (verified) if the quoted span exists verbatim in
// the passage we sent, at the offsets given.

export type SourcePassage = {
  id: string;
  documentId: string;
  filename: string;
  page: number;
  para: number;
  text: string;
};

export type RawCitation = {
  type: string;
  cited_text: string;
  document_index: number;
  start_char_index?: number;
  end_char_index?: number;
};

export type RawTextBlock = {
  text: string;
  citations?: RawCitation[] | null;
};

export type CitationStatus = 'igazolt' | 'nem_igazolt';

export type CheckedCitation = {
  passageId: string | null;
  documentId: string | null;
  filename: string | null;
  page: number | null;
  para: number | null;
  citedText: string;
  start: number | null;
  end: number | null;
  status: CitationStatus;
  reason?: string;
};

// igazolt: every citation checks out. nem_igazolt: at least one does not.
// hianyzo: a factual sentence with no supporting passage. semleges: glue text
// such as punctuation or a short connective phrase.
export type BlockStatus = 'igazolt' | 'nem_igazolt' | 'hianyzo' | 'semleges';

export type CheckedBlock = {
  text: string;
  status: BlockStatus;
  citations: CheckedCitation[];
};

const WHITESPACE = /\s+/g;

export function normalize(text: string): string {
  return text.replace(WHITESPACE, ' ').trim();
}

// A block needs evidence when it says something: enough letters to be a claim.
export function isSubstantive(text: string): boolean {
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  return letters >= 20;
}

export function verifyCitation(citation: RawCitation, passages: SourcePassage[]): CheckedCitation {
  const passage = passages[citation.document_index];
  const base = {
    citedText: citation.cited_text,
    start: citation.start_char_index ?? null,
    end: citation.end_char_index ?? null,
  };

  if (!passage) {
    return {
      ...base,
      passageId: null,
      documentId: null,
      filename: null,
      page: null,
      para: null,
      status: 'nem_igazolt',
      reason: 'A hivatkozott dokumentum nem szerepelt a forrásokban.',
    };
  }

  const located = {
    ...base,
    passageId: passage.id,
    documentId: passage.documentId,
    filename: passage.filename,
    page: passage.page,
    para: passage.para,
  };

  const cited = citation.cited_text;
  if (!cited || normalize(cited).length === 0) {
    return { ...located, status: 'nem_igazolt', reason: 'Üres idézet.' };
  }

  const { start_char_index: start, end_char_index: end } = citation;
  if (citation.type === 'char_location' && start != null && end != null) {
    if (passage.text.slice(start, end) === cited) {
      return { ...located, status: 'igazolt' };
    }
  }

  // Offsets can drift by whitespace; accept a verbatim match anywhere in the
  // passage once whitespace is normalised, and report where it really is.
  const haystack = normalize(passage.text);
  const needle = normalize(cited);
  const at = haystack.indexOf(needle);
  if (at >= 0) {
    const exact = passage.text.indexOf(cited);
    return {
      ...located,
      start: exact >= 0 ? exact : null,
      end: exact >= 0 ? exact + cited.length : null,
      status: 'igazolt',
    };
  }

  return {
    ...located,
    status: 'nem_igazolt',
    reason: 'Az idézett szöveg nem található szó szerint a forrásban.',
  };
}

export function verifyAnswer(blocks: RawTextBlock[], passages: SourcePassage[]): CheckedBlock[] {
  return blocks.map((block) => {
    const citations = (block.citations ?? []).map((c) => verifyCitation(c, passages));

    let status: BlockStatus;
    if (citations.length > 0) {
      status = citations.every((c) => c.status === 'igazolt') ? 'igazolt' : 'nem_igazolt';
    } else {
      status = isSubstantive(block.text) ? 'hianyzo' : 'semleges';
    }

    return { text: block.text, status, citations };
  });
}

export type AnswerSummary = {
  verified: number;
  unverified: number;
  missing: number;
};

export function summarize(blocks: CheckedBlock[]): AnswerSummary {
  return {
    verified: blocks.filter((b) => b.status === 'igazolt').length,
    unverified: blocks.filter((b) => b.status === 'nem_igazolt').length,
    missing: blocks.filter((b) => b.status === 'hianyzo').length,
  };
}

// What gets stored in analyses.answer and sent to the browser.
export type StoredAnswer = {
  blocks: CheckedBlock[];
  passages: SourcePassage[];
  noEvidence: boolean;
  refused: boolean;
};
