import Dexie, { type EntityTable } from "dexie";

export interface Phonetic {
  text?: string;
  audio?: string;
}

export interface Definition {
  definition: string;
  example?: string;
  synonyms: string[];
  antonyms: string[];
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms: string[];
  antonyms: string[];
}

export interface Word {
  id?: number;
  word: string;
  phonetics: Phonetic[];
  meanings: Meaning[];
  sourceUrls: string[];
  searchedAt: Date;
  reviewCount: number;
  lastReviewedAt?: Date;
  correctCount: number;
  incorrectCount: number;
  allSynonyms: string[];
  allAntonyms: string[];
  allExamples: string[];
  primaryDefinition: string;
  primaryPartOfSpeech: string;
  aiMnemonic?: string;
  aiSentences?: string[];
  /**
   * Whether this word belongs to the user's curated "word bank".
   * `false` = previewed (e.g. tapped on a deck) but not explicitly saved;
   * `true` = user-added or searched-for and shown in Word Bank / counted in stats.
   * Stored as 0/1 so Dexie can index it.
   */
  inBank: 0 | 1;
}

export interface QuizAttempt {
  id?: number;
  /** Groups questions from the same quiz session */
  sessionId: string;
  wordId: number;
  word: string;
  quizType: "meaning" | "synonym" | "antonym";
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  attemptedAt: Date;
}

export interface CustomDeckRow {
  id?: number;
  /** Stable deck id (e.g. "custom-<slug>-<timestamp>") */
  deckId: string;
  title: string;
  description: string;
  category: string;
  emoji?: string;
  source?: string;
  words: string[];
  createdAt: number;
}

export interface DeckProgressRow {
  id?: number;
  deckId: string;
  importedWords: string[];
  reviewedWords: string[];
  masteredWords: string[];
  lastOpenedAt: number;
}

export interface UserSentence {
  id?: number;
  wordId: number;
  word: string;
  sentence: string;
  createdAt: Date;
  isDailyChallenge: boolean;
}

class VocaBuildDB extends Dexie {
  words!: EntityTable<Word, "id">;
  quizAttempts!: EntityTable<QuizAttempt, "id">;
  customDecks!: EntityTable<CustomDeckRow, "id">;
  deckProgress!: EntityTable<DeckProgressRow, "id">;
  userSentences!: EntityTable<UserSentence, "id">;

  constructor() {
    super("vocabuild");

    this.version(1).stores({
      words: "++id, &word, searchedAt, lastReviewedAt, reviewCount",
      quizAttempts: "++id, wordId, quizType, attemptedAt",
    });

    // v2: add sessionId, clear stale data from v1
    this.version(2)
      .stores({
        words: "++id, &word, searchedAt, lastReviewedAt, reviewCount",
        quizAttempts: "++id, sessionId, wordId, quizType, attemptedAt",
      })
      .upgrade(async (tx) => {
        // Clear all old quiz attempts (they have no sessionId and are unreliable)
        await tx.table("quizAttempts").clear();
        // Reset review stats on all words
        await tx
          .table("words")
          .toCollection()
          .modify({
            reviewCount: 0,
            correctCount: 0,
            incorrectCount: 0,
            lastReviewedAt: undefined,
          });
      });

    // v3: add deck tables for custom decks and per-deck progress
    this.version(3).stores({
      words: "++id, &word, searchedAt, lastReviewedAt, reviewCount",
      quizAttempts: "++id, sessionId, wordId, quizType, attemptedAt",
      customDecks: "++id, &deckId, createdAt",
      deckProgress: "++id, &deckId, lastOpenedAt",
    });

    // v4: add `inBank` flag so we can preview deck words without cluttering the bank
    this.version(4)
      .stores({
        words: "++id, &word, inBank, searchedAt, lastReviewedAt, reviewCount",
        quizAttempts: "++id, sessionId, wordId, quizType, attemptedAt",
        customDecks: "++id, &deckId, createdAt",
        deckProgress: "++id, &deckId, lastOpenedAt",
      })
      .upgrade(async (tx) => {
        // Everything already in the DB was saved by an explicit user search →
        // mark them all as being in the bank.
        await tx.table("words").toCollection().modify({ inBank: 1 });
      });

    // v5: add userSentences table for "use in a sentence" feature
    this.version(5).stores({
      words: "++id, &word, inBank, searchedAt, lastReviewedAt, reviewCount",
      quizAttempts: "++id, sessionId, wordId, quizType, attemptedAt",
      customDecks: "++id, &deckId, createdAt",
      deckProgress: "++id, &deckId, lastOpenedAt",
      userSentences: "++id, wordId, word, createdAt",
    });
  }
}

export const db = new VocaBuildDB();
