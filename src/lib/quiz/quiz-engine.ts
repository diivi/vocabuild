import { shuffleArray } from "@/lib/utils";
import { getWordsForReview, getAllWords } from "@/lib/db-operations";
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

export async function generateQuiz(
  type: QuizType | "mixed",
  count: number = 10
): Promise<QuizQuestion[]> {
  const reviewWords = await getWordsForReview(count);
  const allWords = await getAllWords();
  const existingWordStrings = allWords.map((w) => w.word);

  // Add 1-2 new curated words per quiz
  const newWordCount = Math.min(2, Math.max(1, Math.floor(count * 0.2)));
  const curatedPool = getRandomCuratedWords(20, existingWordStrings);
  const newWords = curatedPool.slice(0, newWordCount);

  const questions: QuizQuestion[] = [];
  const types: QuizType[] =
    type === "mixed"
      ? shuffleArray(["meaning", "synonym", "antonym"] as QuizType[])
      : [type];

  // Generate questions from review words
  for (const word of reviewWords) {
    if (questions.length >= count - newWordCount) break;

    const qType = type === "mixed"
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
      const synonymsToExclude = word.allSynonyms;
      const distractors = collectDistractorWords(
        allWords,
        curatedPool,
        [word.word, ...synonymsToExclude],
        "synonym"
      );
      question = generateSynonymQuestion(word, distractors, false);
    } else {
      const antonymsToExclude = word.allAntonyms;
      const distractors = collectDistractorWords(
        allWords,
        curatedPool,
        [word.word, ...antonymsToExclude],
        "antonym"
      );
      question = generateAntonymQuestion(word, distractors, false);
    }

    // Fall back to meaning if synonym/antonym unavailable
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

  // Generate questions from new curated words
  for (const cw of newWords) {
    if (questions.length >= count) break;

    const qType = type === "mixed" ? "meaning" : type;
    let question: QuizQuestion | null = null;

    if (qType === "meaning") {
      const distractors = collectDistractorDefinitions(
        allWords,
        curatedPool,
        cw.word
      );
      question = generateMeaningQuestion(cw, distractors, true);
    } else if (qType === "synonym") {
      const distractors = collectDistractorWords(
        allWords,
        curatedPool,
        [cw.word, ...cw.synonyms],
        "synonym"
      );
      question = generateSynonymQuestion(cw, distractors, true);
    } else {
      const distractors = collectDistractorWords(
        allWords,
        curatedPool,
        [cw.word, ...cw.antonyms],
        "antonym"
      );
      question = generateAntonymQuestion(cw, distractors, true);
    }

    if (!question) {
      const distractors = collectDistractorDefinitions(
        allWords,
        curatedPool,
        cw.word
      );
      question = generateMeaningQuestion(cw, distractors, true);
    }

    if (question) questions.push(question);
  }

  return shuffleArray(questions);
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

    const qType =
      type === "mixed" ? types[questions.length % types.length] : type;

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
