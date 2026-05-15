export type DeckDifficulty = "beginner" | "intermediate" | "advanced";

export type DeckKind = "words" | "phrases";

export interface PhraseEntry {
  /** The phrase / idiom / expression itself (e.g. "bite the bullet") */
  text: string;
  definition: string;
  example?: string;
}

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
  /** "words" (default) means each line is looked up via the dictionary API.
   *  "phrases" means each line carries its own baked-in definition. */
  kind?: DeckKind;
}

export interface Deck extends DeckMeta {
  /** Always populated — phrase text or word for each entry, in order. */
  words: string[];
  /** Populated only when kind === "phrases". Same order as `words`. */
  entries?: PhraseEntry[];
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
