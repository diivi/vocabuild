import { shuffleArray } from "@/lib/utils";
import {
  getWordsForReview,
  getAllWords,
  nextReviewDate,
} from "@/lib/db-operations";
import { getRandomCuratedWords, type CuratedWord } from "./curated-words";
import { db, type Word } from "@/lib/db";

export type QuizType = "meaning" | "synonym" | "antonym";

export interface QuizQuestion {
  id: string;
  word: string;
  wordId: number;
  quizType: QuizType;
  question: string;
  correctAnswer: string;
  options: string[];
  isNewWord: boolean;
  /** Full word data for showing a card after answering */
  wordData: Word | null;
}

function curatedToWordData(cw: CuratedWord): Word {
  return {
    word: cw.word,
    phonetics: [],
    meanings: [
      {
        partOfSpeech: cw.partOfSpeech,
        definitions: [{ definition: cw.definition, synonyms: cw.synonyms, antonyms: cw.antonyms }],
        synonyms: cw.synonyms,
        antonyms: cw.antonyms,
      },
    ],
    sourceUrls: [],
    searchedAt: new Date(),
    reviewCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    allSynonyms: cw.synonyms,
    allAntonyms: cw.antonyms,
    allExamples: [],
    primaryDefinition: cw.definition,
    primaryPartOfSpeech: cw.partOfSpeech,
    inBank: 0,
  };
}

function getWordData(target: Word | CuratedWord): Word {
  return "primaryDefinition" in target ? target : curatedToWordData(target);
}

function generateMeaningQuestion(
  target: Word | CuratedWord,
  distractors: string[],
  isNewWord: boolean
): QuizQuestion | null {
  const definition =
    "primaryDefinition" in target
      ? target.primaryDefinition
      : target.definition;

  if (!definition || definition === "No definition available") return null;

  const options = shuffleArray([definition, ...distractors.slice(0, 3)]);

  return {
    id: crypto.randomUUID(),
    word: target.word,
    wordId: "id" in target ? (target.id ?? 0) : 0,
    quizType: "meaning",
    question: `What does "${target.word}" mean?`,
    correctAnswer: definition,
    options,
    isNewWord,
    wordData: getWordData(target),
  };
}

function generateSynonymQuestion(
  target: Word | CuratedWord,
  distractors: string[],
  isNewWord: boolean
): QuizQuestion | null {
  const synonyms =
    "allSynonyms" in target ? target.allSynonyms : target.synonyms;

  if (synonyms.length === 0) return null;

  const correctAnswer = synonyms[Math.floor(Math.random() * synonyms.length)];
  const options = shuffleArray([correctAnswer, ...distractors.slice(0, 3)]);

  return {
    id: crypto.randomUUID(),
    word: target.word,
    wordId: "id" in target ? (target.id ?? 0) : 0,
    quizType: "synonym",
    question: `Which word is a synonym of "${target.word}"?`,
    correctAnswer,
    options,
    isNewWord,
    wordData: getWordData(target),
  };
}

function generateAntonymQuestion(
  target: Word | CuratedWord,
  distractors: string[],
  isNewWord: boolean
): QuizQuestion | null {
  const antonyms =
    "allAntonyms" in target ? target.allAntonyms : target.antonyms;

  if (antonyms.length === 0) return null;

  const correctAnswer = antonyms[Math.floor(Math.random() * antonyms.length)];
  const options = shuffleArray([correctAnswer, ...distractors.slice(0, 3)]);

  return {
    id: crypto.randomUUID(),
    word: target.word,
    wordId: "id" in target ? (target.id ?? 0) : 0,
    quizType: "antonym",
    question: `Which word is an antonym of "${target.word}"?`,
    correctAnswer,
    options,
    isNewWord,
    wordData: getWordData(target),
  };
}

function collectDistractorDefinitions(
  words: Word[],
  curatedPool: CuratedWord[],
  exclude: string
): string[] {
  const defs: string[] = [];
  for (const w of words) {
    if (w.word !== exclude && w.primaryDefinition !== "No definition available") {
      defs.push(w.primaryDefinition);
    }
  }
  for (const c of curatedPool) {
    if (c.word !== exclude) {
      defs.push(c.definition);
    }
  }
  return shuffleArray(defs);
}

function collectDistractorWords(
  words: Word[],
  curatedPool: CuratedWord[],
  exclude: string[],
  type: "synonym" | "antonym"
): string[] {
  const pool: string[] = [];
  for (const w of words) {
    const source = type === "synonym" ? w.allSynonyms : w.allAntonyms;
    for (const s of source) {
      if (!exclude.includes(s)) pool.push(s);
    }
  }
  for (const c of curatedPool) {
    const source = type === "synonym" ? c.synonyms : c.antonyms;
    for (const s of source) {
      if (!exclude.includes(s)) pool.push(s);
    }
  }
  // Deduplicate
  return shuffleArray([...new Set(pool)]);
}

/** Generate a 5-question mixed quiz for the daily challenge.
 *  Always produces 5 questions by filling remaining slots from the curated pool,
 *  so it works even when the user has no bank words yet.
 */
export async function generateDailyQuiz(): Promise<QuizQuestion[]> {
  const TARGET = 5;
  const bankWords = await getWordsForReview(TARGET);
  const allWords = await getAllWords();
  const existingWordStrings = allWords.map((w) => w.word);

  // Fill any remaining slots (up to TARGET) with curated words
  const neededCurated = Math.max(1, TARGET - bankWords.length);
  const curatedPool = getRandomCuratedWords(neededCurated * 4 + 10, existingWordStrings);
  const curatedForQuiz = curatedPool.slice(0, neededCurated);

  const questions: QuizQuestion[] = [];
  const types: QuizType[] = shuffleArray(["meaning", "synonym", "antonym"] as QuizType[]);

  for (const word of bankWords.slice(0, TARGET - curatedForQuiz.length)) {
    const qType =
      word.isPhrase === 1
        ? "meaning"
        : types[questions.length % types.length];
    let question: QuizQuestion | null = null;

    if (qType === "meaning") {
      question = generateMeaningQuestion(word, collectDistractorDefinitions(allWords, curatedPool, word.word), false);
    } else if (qType === "synonym") {
      question = generateSynonymQuestion(word, collectDistractorWords(allWords, curatedPool, [word.word, ...word.allSynonyms], "synonym"), false);
    } else {
      question = generateAntonymQuestion(word, collectDistractorWords(allWords, curatedPool, [word.word, ...word.allAntonyms], "antonym"), false);
    }
    if (!question && qType !== "meaning") {
      question = generateMeaningQuestion(word, collectDistractorDefinitions(allWords, curatedPool, word.word), false);
    }
    if (question) questions.push(question);
  }

  for (const cw of curatedForQuiz) {
    if (questions.length >= TARGET) break;
    const distractors = collectDistractorDefinitions(allWords, curatedPool, cw.word);
    const question = generateMeaningQuestion(cw, distractors, true);
    if (question) questions.push(question);
  }

  return shuffleArray(questions);
}

// ---------------------------------------------------------------------------
// Endless bank quiz session
// ---------------------------------------------------------------------------

export interface BankQuizSession {
  /** Resolve the next question, or null when no more material is available. */
  next(): Promise<QuizQuestion | null>;
}

/**
 * Lazy generator for the endless Review-tab quiz.
 *
 * Loads the bank words + a curated pool once up front, then produces questions
 * on demand. Avoids immediate repeats with a small ring buffer of recently-seen
 * words. When due-for-review words are exhausted, falls back to not-yet-due
 * bank words and occasionally injects a brand-new curated word.
 *
 * Returns null from next() only when there is literally nothing left to ask.
 */
export async function createBankQuizSession(
  type: QuizType | "mixed"
): Promise<BankQuizSession> {
  // Snapshot the bank once — the session is a coherent view, not a live query.
  const allBankWords = await db.words.where("inBank").equals(1).toArray();
  const existingWordStrings = allBankWords.map((w) => w.word);

  // Generous curated pool so we can dip in repeatedly when the bank thins out.
  const curatedPool = getRandomCuratedWords(50, existingWordStrings);
  const newWordPool: CuratedWord[] = [...curatedPool];

  // Split bank into due vs not-due, prioritised by overdueness.
  const now = Date.now();
  const dueScored: { word: Word; priority: number }[] = [];
  const extraScored: { word: Word; priority: number }[] = [];
  for (const word of allBankWords) {
    const dueAt = nextReviewDate(word).getTime();
    const msOverdue = now - dueAt;
    if (msOverdue >= 0) {
      dueScored.push({ word, priority: msOverdue });
    } else {
      extraScored.push({ word, priority: -msOverdue });
    }
  }
  dueScored.sort((a, b) => b.priority - a.priority);
  extraScored.sort((a, b) => a.priority - b.priority);

  let dueQueue: Word[] = dueScored.map((s) => s.word);
  let extraQueue: Word[] = extraScored.map((s) => s.word);

  const RECENT_WINDOW = Math.min(8, Math.max(2, allBankWords.length - 1));
  const recent: string[] = [];

  const rotation: QuizType[] =
    type === "mixed"
      ? shuffleArray(["meaning", "synonym", "antonym"] as QuizType[])
      : [type];
  let answered = 0;

  function noteShown(word: string) {
    recent.push(word);
    if (recent.length > RECENT_WINDOW) recent.shift();
  }

  function pickFromQueue(queue: Word[]): Word | null {
    // Find a word not in the recent ring buffer; if all candidates are recent,
    // accept the first one anyway rather than starving.
    for (let i = 0; i < queue.length; i++) {
      const w = queue[i];
      if (!recent.includes(w.word)) {
        queue.splice(i, 1);
        return w;
      }
    }
    return queue.shift() ?? null;
  }

  function refillDue() {
    // Re-shuffle the original due set so the user keeps cycling through them.
    if (dueScored.length === 0) return;
    dueQueue = shuffleArray(dueScored.map((s) => s.word));
  }

  function refillExtra() {
    if (extraScored.length === 0) return;
    extraQueue = shuffleArray(extraScored.map((s) => s.word));
  }

  function tryBuild(
    target: Word | CuratedWord,
    qType: QuizType,
    isNewWord: boolean
  ): QuizQuestion | null {
    const exclude = target.word;
    if (qType === "meaning") {
      const distractors = collectDistractorDefinitions(
        allBankWords,
        curatedPool,
        exclude
      );
      return generateMeaningQuestion(target, distractors, isNewWord);
    }
    if (qType === "synonym") {
      const ownSyns =
        "allSynonyms" in target ? target.allSynonyms : target.synonyms;
      const distractors = collectDistractorWords(
        allBankWords,
        curatedPool,
        [exclude, ...ownSyns],
        "synonym"
      );
      return generateSynonymQuestion(target, distractors, isNewWord);
    }
    const ownAnts =
      "allAntonyms" in target ? target.allAntonyms : target.antonyms;
    const distractors = collectDistractorWords(
      allBankWords,
      curatedPool,
      [exclude, ...ownAnts],
      "antonym"
    );
    return generateAntonymQuestion(target, distractors, isNewWord);
  }

  function buildForBankWord(word: Word, baseType: QuizType): QuizQuestion | null {
    // Phrases only have meaning-MCQs to draw from.
    if (word.isPhrase === 1) {
      return tryBuild(word, "meaning", false);
    }
    let q = tryBuild(word, baseType, false);
    if (!q && baseType !== "meaning") {
      // Fall back to meaning if synonym/antonym data is missing.
      q = tryBuild(word, "meaning", false);
    }
    return q;
  }

  async function pickNextNewWord(): Promise<QuizQuestion | null> {
    while (newWordPool.length > 0) {
      const cw = newWordPool.shift()!;
      if (recent.includes(cw.word)) continue;
      const q = tryBuild(cw, "meaning", true);
      if (q) {
        noteShown(cw.word);
        return q;
      }
    }
    return null;
  }

  return {
    async next(): Promise<QuizQuestion | null> {
      // Pick a category based on what's available. Inject a brand-new word
      // every ~8th question while the curated pool has fresh material.
      const wantNew =
        newWordPool.length > 0 && answered > 0 && answered % 8 === 0;

      if (wantNew) {
        const q = await pickNextNewWord();
        if (q) {
          answered++;
          return q;
        }
      }

      // Cycle the question-type rotation so mixed quizzes don't all feel alike.
      const qType =
        type === "mixed"
          ? rotation[answered % rotation.length]
          : type;

      // Prefer due → extra → new.
      if (dueQueue.length === 0 && dueScored.length > 0) refillDue();
      let chosen = pickFromQueue(dueQueue);

      if (!chosen) {
        if (extraQueue.length === 0 && extraScored.length > 0) refillExtra();
        chosen = pickFromQueue(extraQueue);
      }

      if (chosen) {
        const q = buildForBankWord(chosen, qType);
        if (q) {
          noteShown(chosen.word);
          answered++;
          return q;
        }
        // If the bank word couldn't form a question, fall through to curated.
      }

      const fallback = await pickNextNewWord();
      if (fallback) {
        answered++;
        return fallback;
      }

      return null;
    },
  };
}

/**
 * Generate a quiz from a specific list of words (typically a deck).
 * Expects the caller to have prefetched definitions so the words exist in the
 * local DB (bank or previewed). Words without an entry are silently skipped.
 */
export async function generateQuizFromWordList(
  wordList: string[],
  type: QuizType | "mixed",
  count: number = 10
): Promise<QuizQuestion[]> {
  const normalized = [...new Set(wordList.map((w) => w.trim().toLowerCase()))];
  if (normalized.length === 0) return [];

  const deckWordRows = await db.words
    .where("word")
    .anyOf(normalized)
    .toArray();
  if (deckWordRows.length === 0) return [];

  // Use every word we know for distractors, plus curated words as a fallback.
  // This keeps quizzes rich even when the user's bank is empty.
  const allWords = await db.words.toArray();
  const curatedPool = getRandomCuratedWords(30, normalized);

  // Prioritise deck words that need review most (low accuracy / stale)
  const scored = deckWordRows.map((word) => {
    const accuracy =
      word.reviewCount === 0 ? 0 : word.correctCount / word.reviewCount;
    const daysSinceReview = word.lastReviewedAt
      ? (Date.now() - word.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;
    return {
      word,
      priority: (1 - accuracy) * 50 + Math.min(daysSinceReview, 30) * 2,
    };
  });
  scored.sort((a, b) => b.priority - a.priority);
  const selected = scored.slice(0, count).map((s) => s.word);

  const questions: QuizQuestion[] = [];
  const types: QuizType[] =
    type === "mixed"
      ? shuffleArray(["meaning", "synonym", "antonym"] as QuizType[])
      : [type];

  for (const word of selected) {
    if (questions.length >= count) break;

    // Phrases (idioms, phrasal verbs, foreign expressions) only get
    // meaning-MCQs — they have no synonyms/antonyms to draw from.
    const qType =
      word.isPhrase === 1
        ? "meaning"
        : type === "mixed"
          ? types[questions.length % types.length]
          : type;

    let question: QuizQuestion | null = null;

    if (qType === "meaning") {
      const distractors = collectDistractorDefinitions(
        allWords,
        curatedPool,
        word.word
      );
      question = generateMeaningQuestion(word, distractors, false);
    } else if (qType === "synonym") {
      const distractors = collectDistractorWords(
        allWords,
        curatedPool,
        [word.word, ...word.allSynonyms],
        "synonym"
      );
      question = generateSynonymQuestion(word, distractors, false);
    } else {
      const distractors = collectDistractorWords(
        allWords,
        curatedPool,
        [word.word, ...word.allAntonyms],
        "antonym"
      );
      question = generateAntonymQuestion(word, distractors, false);
    }

    if (!question && qType !== "meaning") {
      const distractors = collectDistractorDefinitions(
        allWords,
        curatedPool,
        word.word
      );
      question = generateMeaningQuestion(word, distractors, false);
    }

    if (question) questions.push(question);
  }

  return shuffleArray(questions);
}
