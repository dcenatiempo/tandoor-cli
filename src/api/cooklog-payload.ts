import { enrichCookLogsWithRecipeNames, type CookLogWithRecipeName } from './cooklog';
import type { CookLog } from './types';

export interface CookLogListRecipePayload {
  id: number;
  name: string;
}

export interface CookLogListPayload {
  id: number;
  recipe: CookLogListRecipePayload;
  rating: number;
  comment: string;
  servings: number;
  date: string;
}

export function cookLogToListPayload(
  log: CookLog,
  recipeName: string,
): CookLogListPayload {
  return {
    id: log.id,
    recipe: {
      id: log.recipe,
      name: recipeName,
    },
    rating: log.rating ?? 0,
    comment: log.comment ?? '',
    servings: log.servings,
    date: log.created_at.split('T')[0],
  };
}

export function cookLogsToListPayload(
  entries: CookLogWithRecipeName[],
): CookLogListPayload[] {
  return entries.map((entry) => cookLogToListPayload(entry, entry.recipe_name));
}

/** Fetches recipe names then maps to slim list JSON. */
export async function cookLogsToListPayloadWithEnrichment(
  logs: CookLog[],
): Promise<CookLogListPayload[]> {
  if (logs.length === 0) {
    return [];
  }
  const enriched = await enrichCookLogsWithRecipeNames(logs);
  return cookLogsToListPayload(enriched);
}
