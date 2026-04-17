export type DeckDifficulty = "beginner" | "intermediate" | "advanced";

export interface DeckMeta {
  id: string;
  title: string;
  description: string;
  category: string;
  emoji?: string;
  source?: string;
  difficulty?: DeckDifficulty;
  /** File path inside /decks/ for built-in decks */
  file?: string;
  /** Marks this deck as user-created (stored in IndexedDB) */
  isCustom?: boolean;
  /** Epoch ms a custom deck was created at */
  createdAt?: number;
}

export interface Deck extends DeckMeta {
  words: string[];
}

export interface DeckIndex {
  decks: DeckMeta[];
}

/**
 * Derived per-deck stats computed from the words table at read time.
 * We don't persist these (deck progress is a pure view over Word + QuizAttempts).
 */
export interface DeckStats {
  deckId: string;
  total: number;
  /** Words the user has explicitly added to their bank */
  inBank: number;
  /** Words with at least one review attempt */
  reviewed: number;
  /** Words with 3+ reviews at ≥80% accuracy */
  mastered: number;
  /** Last time user opened this deck */
  lastOpenedAt?: number;
}
