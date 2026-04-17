import { db, type Word, type QuizAttempt } from "./db";
import type { DictionaryApiResponse } from "./api/dictionary";

// ---------------------------------------------------------------------------
// Spaced-repetition helpers
// ---------------------------------------------------------------------------

/**
 * Compute how many days to wait before showing a word again.
 *
 * Loosely inspired by SM-2 but derived entirely from existing Word fields
 * (no schema change needed).
 *
 * Ease factor by accuracy:
 *   ≥ 90% → 2.5×   (well-known, space out fast)
 *   ≥ 75% → 2.0×
 *   ≥ 60% → 1.5×
 *   < 60% → 1 day  (keep hammering)
 *
 * Interval:
 *   n=0 reviews → 0  (always due)
 *   n=1         → 1 day
 *   n=2         → ef days
 *   n≥3         → ef^(n-1) days, capped at 60
 */
export function computeIntervalDays(word: Word): number {
  if (word.reviewCount === 0 || !word.lastReviewedAt) return 0;

  const accuracy =
    word.reviewCount > 0 ? word.correctCount / word.reviewCount : 0;

  let ef: number;
  if (accuracy >= 0.9) ef = 2.5;
  else if (accuracy >= 0.75) ef = 2.0;
  else if (accuracy >= 0.6) ef = 1.5;
  else return 1; // struggling — review daily

  const n = word.reviewCount;
  if (n === 1) return 1;
  if (n === 2) return Math.round(ef);
  return Math.min(60, Math.round(Math.pow(ef, n - 1)));
}

/** The earliest date/time at which this word should next be reviewed. */
export function nextReviewDate(word: Word): Date {
  if (!word.lastReviewedAt) return new Date(0); // never reviewed → always due
  const d = new Date(word.lastReviewedAt);
  d.setDate(d.getDate() + computeIntervalDays(word));
  return d;
}

/** True if the word is currently due (or overdue) for review. */
export function isDueForReview(word: Word): boolean {
  return nextReviewDate(word) <= new Date();
}

function flattenSynonyms(response: DictionaryApiResponse): string[] {
  const synonyms = new Set<string>();
  for (const meaning of response.meanings) {
    for (const s of meaning.synonyms) synonyms.add(s);
    for (const def of meaning.definitions) {
      for (const s of def.synonyms) synonyms.add(s);
    }
  }
  return [...synonyms];
}

function flattenAntonyms(response: DictionaryApiResponse): string[] {
  const antonyms = new Set<string>();
  for (const meaning of response.meanings) {
    for (const a of meaning.antonyms) antonyms.add(a);
    for (const def of meaning.definitions) {
      for (const a of def.antonyms) antonyms.add(a);
    }
  }
  return [...antonyms];
}

function flattenExamples(response: DictionaryApiResponse): string[] {
  const examples: string[] = [];
  for (const meaning of response.meanings) {
    for (const def of meaning.definitions) {
      if (def.example) examples.push(def.example);
    }
  }
  return examples;
}

export interface SaveWordOptions {
  /** Whether this save should place the word in the user's word bank. */
  inBank?: boolean;
  extraSynonyms?: string[];
  extraAntonyms?: string[];
}

export async function saveWord(
  response: DictionaryApiResponse,
  options: SaveWordOptions = {}
): Promise<number> {
  const allSynonyms = flattenSynonyms(response);
  const allAntonyms = flattenAntonyms(response);

  if (options.extraSynonyms) {
    for (const s of options.extraSynonyms) {
      if (!allSynonyms.includes(s)) allSynonyms.push(s);
    }
  }
  if (options.extraAntonyms) {
    for (const a of options.extraAntonyms) {
      if (!allAntonyms.includes(a)) allAntonyms.push(a);
    }
  }

  const firstMeaning = response.meanings[0];
  const primaryDefinition =
    firstMeaning?.definitions[0]?.definition ?? "No definition available";
  const primaryPartOfSpeech = firstMeaning?.partOfSpeech ?? "";

  const existing = await db.words.where("word").equals(response.word).first();

  // Only flip inBank upward when the caller explicitly asks — otherwise preserve.
  const resolvedInBank: 0 | 1 =
    options.inBank === undefined
      ? (existing?.inBank ?? 1)
      : options.inBank
        ? 1
        : existing?.inBank ?? 0;

  const wordData: Omit<Word, "id"> = {
    word: response.word,
    phonetics: response.phonetics,
    meanings: response.meanings,
    sourceUrls: response.sourceUrls ?? [],
    searchedAt: existing?.searchedAt ?? new Date(),
    reviewCount: existing?.reviewCount ?? 0,
    lastReviewedAt: existing?.lastReviewedAt,
    correctCount: existing?.correctCount ?? 0,
    incorrectCount: existing?.incorrectCount ?? 0,
    allSynonyms,
    allAntonyms,
    allExamples: flattenExamples(response),
    primaryDefinition,
    primaryPartOfSpeech,
    aiMnemonic: existing?.aiMnemonic,
    aiSentences: existing?.aiSentences,
    inBank: resolvedInBank,
  };

  if (existing?.id) {
    await db.words.update(existing.id, wordData);
    return existing.id;
  }
  return (await db.words.add(wordData as Word)) as number;
}

/**
 * Flip a word in/out of the user's bank. If adding to the bank and the word's
 * `searchedAt` is stale (older than now), we refresh it so the word shows at
 * the top of the Recent list.
 */
export async function setWordInBank(
  wordId: number,
  inBank: boolean
): Promise<void> {
  const patch: Partial<Word> = { inBank: inBank ? 1 : 0 };
  if (inBank) patch.searchedAt = new Date();
  await db.words.update(wordId, patch);
}

export async function isWordInBank(word: string): Promise<boolean> {
  const row = await db.words.where("word").equalsIgnoreCase(word).first();
  return row?.inBank === 1;
}

export async function getWord(word: string): Promise<Word | undefined> {
  return db.words.where("word").equalsIgnoreCase(word).first();
}

export async function getWordById(id: number): Promise<Word | undefined> {
  return db.words.get(id);
}

export async function getAllWords(
  sortBy: "recent" | "alphabetical" | "needsReview" = "recent"
): Promise<Word[]> {
  const words = await db.words.where("inBank").equals(1).toArray();

  switch (sortBy) {
    case "alphabetical":
      return words.sort((a, b) => a.word.localeCompare(b.word));
    case "needsReview": {
      return words.sort((a, b) => {
        const aAcc =
          a.reviewCount > 0 ? a.correctCount / a.reviewCount : 0;
        const bAcc =
          b.reviewCount > 0 ? b.correctCount / b.reviewCount : 0;
        return aAcc - bAcc;
      });
    }
    case "recent":
    default:
      return words.sort(
        (a, b) => b.searchedAt.getTime() - a.searchedAt.getTime()
      );
  }
}

export async function getWordsForReview(limit: number): Promise<Word[]> {
  const words = await db.words.where("inBank").equals(1).toArray();
  const now = Date.now();

  const scored = words.map((word) => {
    const due = nextReviewDate(word).getTime();
    const msOverdue = now - due; // positive = overdue, negative = not yet due

    // Due words always come first, ordered by how long they've been waiting.
    // Not-yet-due words are ordered by how soon they'll be due (so we can fill
    // a quiz if there aren't enough due words).
    const priority =
      msOverdue >= 0
        ? 1_000_000 + msOverdue // overdue: always before non-due
        : msOverdue; // not due yet: least negative (soonest) first

    return { word, priority };
  });

  scored.sort((a, b) => b.priority - a.priority);
  return scored.slice(0, limit).map((s) => s.word);
}

export async function recordQuizAttempt(
  attempt: Omit<QuizAttempt, "id">
): Promise<void> {
  await db.quizAttempts.add(attempt as QuizAttempt);

  const word = await db.words.get(attempt.wordId);
  if (word?.id) {
    await db.words.update(word.id, {
      reviewCount: word.reviewCount + 1,
      lastReviewedAt: new Date(),
      correctCount: word.correctCount + (attempt.isCorrect ? 1 : 0),
      incorrectCount: word.incorrectCount + (attempt.isCorrect ? 0 : 1),
    });
  }
}

/**
 * Stats for the review tab.
 * - quizzesTaken: distinct quiz sessions (across bank + decks)
 * - accuracy: correct / total answered (all questions ever)
 * - totalWords / reviewedWords / masteredWords: scoped to words in the bank
 */
export async function getQuizStats(): Promise<{
  quizzesTaken: number;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  totalWords: number;
  reviewedWords: number;
  masteredWords: number;
  wordsDue: number;
}> {
  const [allAttempts, bankWords] = await Promise.all([
    db.quizAttempts.toArray(),
    db.words.where("inBank").equals(1).toArray(),
  ]);

  const reviewedWords = bankWords.filter((w) => w.reviewCount > 0).length;
  const masteredWords = bankWords.filter(
    (w) => w.reviewCount >= 5 && w.correctCount / w.reviewCount >= 0.9
  ).length;
  const wordsDue = bankWords.filter(isDueForReview).length;

  // Accuracy and question counts come from the denormalised fields on each Word
  // row. These survive Gist sync, cross-device usage, and resets+restores
  // because they are part of the Word object itself (not a separate table).
  const questionsAnswered = bankWords.reduce((s, w) => s + w.reviewCount, 0);
  const correctAnswers = bankWords.reduce((s, w) => s + w.correctCount, 0);

  // Session count comes from actual quiz attempt records (only counts quizzes
  // taken on this device since last reset — honest and never goes backwards).
  const sessions = new Set(allAttempts.map((a) => a.sessionId));

  return {
    quizzesTaken: sessions.size,
    questionsAnswered,
    correctAnswers,
    accuracy: questionsAnswered > 0 ? correctAnswers / questionsAnswered : 0,
    totalWords: bankWords.length,
    reviewedWords,
    masteredWords,
    wordsDue,
  };
}

/**
 * Daily activity for the contribution chart.
 * Returns a map of "YYYY-MM-DD" → { wordsAdded, questionsAnswered }.
 * Only counts words that made it into the bank.
 */
export async function getDailyActivity(
  days: number = 105 // 15 weeks
): Promise<Map<string, { wordsAdded: number; questionsAnswered: number }>> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  const activity = new Map<
    string,
    { wordsAdded: number; questionsAnswered: number }
  >();

  function toLocalKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    activity.set(toLocalKey(d), { wordsAdded: 0, questionsAnswered: 0 });
  }

  const words = await db.words.where("inBank").equals(1).toArray();
  for (const w of words) {
    const date = new Date(w.searchedAt);
    if (date >= cutoff) {
      const key = toLocalKey(date);
      const entry = activity.get(key);
      if (entry) entry.wordsAdded++;
    }
  }

  const attempts = await db.quizAttempts.toArray();
  for (const a of attempts) {
    const date = new Date(a.attemptedAt);
    if (date >= cutoff) {
      const key = toLocalKey(date);
      const entry = activity.get(key);
      if (entry) entry.questionsAnswered++;
    }
  }

  return activity;
}

export async function searchWords(query: string): Promise<Word[]> {
  if (!query.trim()) return getAllWords();
  const q = query.toLowerCase();
  const words = await db.words.where("inBank").equals(1).toArray();
  return words.filter((w) => w.word.toLowerCase().includes(q));
}

export async function deleteWord(id: number): Promise<void> {
  await db.words.delete(id);
  await db.quizAttempts.where("wordId").equals(id).delete();
}

export async function getWordCount(): Promise<number> {
  return db.words.where("inBank").equals(1).count();
}
