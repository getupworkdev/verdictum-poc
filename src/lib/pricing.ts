// USD per million tokens. Claude Opus 5.5 list price (Claude API).
export const MODEL = 'claude-opus-5-5';

export const PRICES: Record<string, { input: number; output: number }> = {
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
};

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICES[model] ?? PRICES[MODEL];
  const cost = (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export function formatUsd(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `$${n.toFixed(n < 1 ? 4 : 2)}`;
}

export function formatTokens(value: number | string | null | undefined): string {
  return new Intl.NumberFormat('hu-HU').format(Number(value ?? 0));
}
