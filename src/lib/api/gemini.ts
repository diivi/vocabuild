import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_KEY_STORAGE = "vocabuild_gemini_key";

export function getGeminiKey(): string | null {
  return localStorage.getItem(GEMINI_KEY_STORAGE);
}

export function setGeminiKey(key: string) {
  localStorage.setItem(GEMINI_KEY_STORAGE, key);
}

export function removeGeminiKey() {
  localStorage.removeItem(GEMINI_KEY_STORAGE);
}

export function hasGeminiKey(): boolean {
  return !!getGeminiKey();
}

function getModel() {
  const key = getGeminiKey();
  if (!key) return null;
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}

export async function generateMnemonic(
  word: string,
  definition: string
): Promise<string | null> {
  const model = getModel();
  if (!model) return null;

  try {
    const result = await model.generateContent(
      `Create a short, clever memory trick (mnemonic) to remember the word "${word}" which means "${definition}". Keep it under 2 sentences. Be creative and make it memorable. Just give the mnemonic, no prefix like "Mnemonic:" or explanation.`
    );
    return result.response.text().trim();
  } catch {
    return null;
  }
}

export async function generateContextSentences(
  word: string
): Promise<string[] | null> {
  const model = getModel();
  if (!model) return null;

  try {
    const result = await model.generateContent(
      `Write 2 natural, memorable example sentences using the word "${word}" in different contexts. Each sentence should clearly demonstrate the meaning. Return only the sentences, one per line, without numbering or bullets.`
    );
    const text = result.response.text().trim();
    return text
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  } catch {
    return null;
  }
}

export async function suggestRelatedWords(
  searchHistory: string[]
): Promise<string[] | null> {
  const model = getModel();
  if (!model) return null;

  try {
    const recentWords = searchHistory.slice(-10).join(", ");
    const result = await model.generateContent(
      `Based on these vocabulary words the user has been learning: ${recentWords}

Suggest 5 new vocabulary words they should learn next. Pick words that are:
- At a similar or slightly higher difficulty level
- Related in theme or useful in similar contexts
- Common enough to be practical

Return only the 5 words, one per line, without definitions or numbering.`
    );
    const text = result.response.text().trim();
    return text
      .split("\n")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0 && !s.includes(" "));
  } catch {
    return null;
  }
}

export async function generateWordConnection(
  currentWord: string,
  previousWords: string[]
): Promise<string | null> {
  const model = getModel();
  if (!model) return null;

  try {
    const words = previousWords.slice(-5).join(", ");
    const result = await model.generateContent(
      `The user just looked up "${currentWord}". They previously searched: ${words}.

Write a single short "Did you know?" sentence that connects "${currentWord}" to one of their previous words in an interesting or educational way. Keep it conversational and under 30 words. Just give the sentence.`
    );
    return result.response.text().trim();
  } catch {
    return null;
  }
}
