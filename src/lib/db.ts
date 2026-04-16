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

class VocaBuildDB extends Dexie {
  words!: EntityTable<Word, "id">;
  quizAttempts!: EntityTable<QuizAttempt, "id">;

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
  }
}

export const db = new VocaBuildDB();
