import { db, type Word, type QuizAttempt } from "./db";
import type { DictionaryApiResponse } from "./api/dictionary";

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

export async function saveWord(
  response: DictionaryApiResponse,
  extraSynonyms?: string[],
  extraAntonyms?: string[]
): Promise<number> {
  const allSynonyms = flattenSynonyms(response);
  const allAntonyms = flattenAntonyms(response);

  if (extraSynonyms) {
    for (const s of extraSynonyms) {
      if (!allSynonyms.includes(s)) allSynonyms.push(s);
    }
  }
  if (extraAntonyms) {
    for (const a of extraAntonyms) {
      if (!allAntonyms.includes(a)) allAntonyms.push(a);
    }
  }

  const firstMeaning = response.meanings[0];
  const primaryDefinition =
    firstMeaning?.definitions[0]?.definition ?? "No definition available";
  const primaryPartOfSpeech = firstMeaning?.partOfSpeech ?? "";

  const existing = await db.words.where("word").equals(response.word).first();

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
  };

  if (existing?.id) {
    await db.words.update(existing.id, wordData);
    return existing.id;
  }
  return (await db.words.add(wordData as Word)) as number;
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
  const words = await db.words.toArray();

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
  const words = await db.words.toArray();

  const scored = words.map((word) => {
    const accuracy =
      word.reviewCount === 0
        ? 0
        : word.correctCount / word.reviewCount;
    const daysSinceReview = word.lastReviewedAt
      ? (Date.now() - word.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    const priority = (1 - accuracy) * 50 + Math.min(daysSinceReview, 30) * 2;
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
 * - quizzesTaken: number of distinct quiz sessions (not individual questions)
 * - accuracy: correct answers / total answered questions
 * - masteredWords: words with 5+ reviews and 90%+ accuracy
 */
export async function getQuizStats(): Promise<{
  quizzesTaken: number;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  totalWords: number;
  reviewedWords: number;
  masteredWords: number;
}> {
  const allAttempts = await db.quizAttempts.toArray();
  const questionsAnswered = allAttempts.length;
  const correctAnswers = allAttempts.filter((a) => a.isCorrect).length;

  // Count distinct sessions
  const sessions = new Set(allAttempts.map((a) => a.sessionId));
  const quizzesTaken = sessions.size;

  const words = await db.words.toArray();
  const reviewedWords = words.filter((w) => w.reviewCount > 0).length;
  const masteredWords = words.filter(
    (w) => w.reviewCount >= 5 && w.correctCount / w.reviewCount >= 0.9
  ).length;

  return {
    quizzesTaken,
    questionsAnswered,
    correctAnswers,
    accuracy: questionsAnswered > 0 ? correctAnswers / questionsAnswered : 0,
    totalWords: words.length,
    reviewedWords,
    masteredWords,
  };
}

/**
 * Daily activity for the contribution chart.
 * Returns a map of "YYYY-MM-DD" → { wordsAdded, questionsAnswered }.
 */
export async function getDailyActivity(
  days: number = 105 // 15 weeks
): Promise<Map<string, { wordsAdded: number; questionsAnswered: number }>> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  const activity = new Map<string, { wordsAdded: number; questionsAnswered: number }>();

  // Use local dates (not UTC) so the day boundaries match the user's timezone
  function toLocalKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // Initialize all days
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    activity.set(toLocalKey(d), { wordsAdded: 0, questionsAnswered: 0 });
  }

  // Count words added per day
  const words = await db.words.toArray();
  for (const w of words) {
    const date = new Date(w.searchedAt);
    if (date >= cutoff) {
      const key = toLocalKey(date);
      const entry = activity.get(key);
      if (entry) entry.wordsAdded++;
    }
  }

  // Count quiz answers per day
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
  const words = await db.words.toArray();
  return words.filter((w) => w.word.toLowerCase().includes(q));
}

export async function deleteWord(id: number): Promise<void> {
  await db.words.delete(id);
  await db.quizAttempts.where("wordId").equals(id).delete();
}

export async function getWordCount(): Promise<number> {
  return db.words.count();
}
