export interface DictionaryPhonetic {
  text?: string;
  audio?: string;
}

export interface DictionaryDefinition {
  definition: string;
  example?: string;
  synonyms: string[];
  antonyms: string[];
}

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
  synonyms: string[];
  antonyms: string[];
}

export interface DictionaryApiResponse {
  word: string;
  phonetics: DictionaryPhonetic[];
  meanings: DictionaryMeaning[];
  sourceUrls?: string[];
}

export class WordNotFoundError extends Error {
  constructor(word: string) {
    super(`Word not found: ${word}`);
    this.name = "WordNotFoundError";
  }
}

export async function lookupWord(
  word: string
): Promise<DictionaryApiResponse> {
  const res = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim().toLowerCase())}`
  );

  if (!res.ok) {
    if (res.status === 404) throw new WordNotFoundError(word);
    throw new Error(`Dictionary API error: ${res.status}`);
  }

  const data = await res.json();
  return data[0];
}
