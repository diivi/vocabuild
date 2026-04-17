import { lookupWord, WordNotFoundError } from "@/lib/api/dictionary";
import { getWord, saveWord } from "@/lib/db-operations";
import type { Word } from "@/lib/db";

export type PreviewStatus = "cached" | "fetched" | "notFound" | "error";

export interface PreviewResult {
  word: Word | null;
  status: PreviewStatus;
}

/**
 * Get a word's definition for preview from a deck.
 * - If already in the local DB (bank or previously previewed), returns it as-is.
 * - Otherwise fetches from the dictionary API and saves with `inBank: false`
 *   so it doesn't clutter the user's bank unless they explicitly opt in.
 */
export async function previewDeckWord(term: string): Promise<PreviewResult> {
  const trimmed = term.trim().toLowerCase();
  if (!trimmed) return { word: null, status: "error" };

  const cached = await getWord(trimmed);
  if (cached) return { word: cached, status: "cached" };

  try {
    const response = await lookupWord(trimmed);
    await saveWord(response, { inBank: false });
    const saved = await getWord(trimmed);
    return { word: saved ?? null, status: "fetched" };
  } catch (err) {
    if (err instanceof WordNotFoundError) {
      return { word: null, status: "notFound" };
    }
    return { word: null, status: "error" };
  }
}

export interface PrefetchProgress {
  processed: number;
  total: number;
  found: number;
}

/**
 * Fetch a list of deck words in parallel (respecting a small concurrency cap),
 * caching them with `inBank: false`. Used to warm the cache before a quiz so
 * the user doesn't hit 429s / long waits mid-question.
 */
export async function prefetchDeckWords(
  words: string[],
  options: {
    concurrency?: number;
    signal?: AbortSignal;
    onProgress?: (progress: PrefetchProgress) => void;
  } = {}
): Promise<{ found: string[]; missing: string[] }> {
  const { concurrency = 6, signal, onProgress } = options;
  const normalized = [
    ...new Set(words.map((w) => w.trim().toLowerCase())),
  ].filter(Boolean);

  const found: string[] = [];
  const missing: string[] = [];
  let processed = 0;

  const queue = [...normalized];
  async function worker() {
    while (queue.length > 0) {
      if (signal?.aborted) return;
      const word = queue.shift();
      if (!word) return;
      const result = await previewDeckWord(word);
      if (result.word) found.push(word);
      else missing.push(word);
      processed++;
      onProgress?.({ processed, total: normalized.length, found: found.length });
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, worker)
  );

  return { found, missing };
}
