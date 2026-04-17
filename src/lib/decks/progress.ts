import { db } from "@/lib/db";
import type { DeckStats } from "./types";

/**
 * Note: we no longer persist per-deck word lists (imported / reviewed / mastered).
 * Everything is derived from the `words` and `quizAttempts` tables at read time so
 * there's one source of truth. The `deckProgress` table is only used to remember
 * `lastOpenedAt` (for sorting / "recent decks" in the future).
 */

export async function markDeckOpened(deckId: string): Promise<void> {
  const existing = await db.deckProgress.where("deckId").equals(deckId).first();
  if (existing?.id !== undefined) {
    await db.deckProgress.update(existing.id, { lastOpenedAt: Date.now() });
    return;
  }
  await db.deckProgress.add({
    deckId,
    importedWords: [],
    reviewedWords: [],
    masteredWords: [],
    lastOpenedAt: Date.now(),
  });
}

export async function getDeckLastOpened(
  deckId: string
): Promise<number | undefined> {
  const row = await db.deckProgress.where("deckId").equals(deckId).first();
  return row?.lastOpenedAt;
}

function statsFor(
  deckId: string,
  words: string[],
  byWord: Map<string, { inBank: 0 | 1; reviewCount: number; correctCount: number }>,
  lastOpenedAt?: number
): DeckStats {
  let inBank = 0;
  let reviewed = 0;
  let mastered = 0;

  for (const raw of words) {
    const w = raw.toLowerCase();
    const row = byWord.get(w);
    if (!row) continue;
    if (row.inBank === 1) inBank++;
    if (row.reviewCount > 0) reviewed++;
    if (
      row.reviewCount >= 3 &&
      row.correctCount / row.reviewCount >= 0.8
    ) {
      mastered++;
    }
  }

  return {
    deckId,
    total: words.length,
    inBank,
    reviewed,
    mastered,
    lastOpenedAt,
  };
}

export async function getDeckStats(
  deckId: string,
  deckWords: string[]
): Promise<DeckStats> {
  const normalized = deckWords.map((w) => w.toLowerCase());
  const words = await db.words
    .where("word")
    .anyOf(normalized)
    .toArray();
  const byWord = new Map(
    words.map((w) => [w.word.toLowerCase(), w as unknown as {
      inBank: 0 | 1;
      reviewCount: number;
      correctCount: number;
    }])
  );
  const lastOpenedAt = await getDeckLastOpened(deckId);
  return statsFor(deckId, deckWords, byWord, lastOpenedAt);
}

/**
 * Bulk-compute stats for many decks in a single DB round-trip.
 */
export async function getStatsForDecks(
  decks: { id: string; words: string[] }[]
): Promise<Map<string, DeckStats>> {
  const allWords = await db.words.toArray();
  const byWord = new Map(
    allWords.map((w) => [
      w.word.toLowerCase(),
      {
        inBank: w.inBank,
        reviewCount: w.reviewCount,
        correctCount: w.correctCount,
      },
    ])
  );
  const progressRows = await db.deckProgress.toArray();
  const lastOpened = new Map<string, number | undefined>(
    progressRows.map((r) => [r.deckId, r.lastOpenedAt])
  );

  const result = new Map<string, DeckStats>();
  for (const deck of decks) {
    result.set(
      deck.id,
      statsFor(deck.id, deck.words, byWord, lastOpened.get(deck.id))
    );
  }
  return result;
}
