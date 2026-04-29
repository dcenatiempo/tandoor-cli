import { IngredientCreatePayload } from './api/types';

/**
 * Strips trailing slashes from a URL string.
 */
export function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Returns false for empty or whitespace-only strings.
 */
export function isValidName(s: string): boolean {
  return s.trim().length > 0;
}

/**
 * Validates that a string matches the YYYY-MM-DD format.
 */
export function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * Parses an ingredient line in "amount unit food" format.
 * If only two tokens, unit is null.
 */
export function parseIngredientLine(line: string): IngredientCreatePayload {
  const tokens = line.trim().split(/\s+/);
  const amount = parseFloat(tokens[0]) || 0;

  if (tokens.length < 3) {
    // No unit — just amount and food
    const food = tokens.slice(1).join(' ');
    return { food: { name: food }, unit: null, amount };
  }

  const unit = tokens[1];
  const food = tokens.slice(2).join(' ');
  return { food: { name: food }, unit: { name: unit }, amount };
}

/**
 * Caps limit at 100 and prints a warning to stderr if exceeded.
 */
export function capLimit(n: number): number {
  if (n > 100) {
    process.stderr.write(`Warning: --limit capped at 100 (requested ${n})\n`);
    return 100;
  }
  return n;
}
