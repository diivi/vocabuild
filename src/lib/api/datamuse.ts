interface DatamuseSuggestion {
  word: string;
  score: number;
}

export async function getAutocompleteSuggestions(
  prefix: string
): Promise<string[]> {
  if (prefix.length < 2) return [];

  const res = await fetch(
    `https://api.datamuse.com/sug?s=${encodeURIComponent(prefix)}&max=8`
  );
  if (!res.ok) return [];

  const data: DatamuseSuggestion[] = await res.json();
  return data.map((d) => d.word);
}

export async function getSynonyms(word: string): Promise<string[]> {
  const res = await fetch(
    `https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=10`
  );
  if (!res.ok) return [];

  const data: DatamuseSuggestion[] = await res.json();
  return data.map((d) => d.word);
}

export async function getAntonyms(word: string): Promise<string[]> {
  const res = await fetch(
    `https://api.datamuse.com/words?rel_ant=${encodeURIComponent(word)}&max=10`
  );
  if (!res.ok) return [];

  const data: DatamuseSuggestion[] = await res.json();
  return data.map((d) => d.word);
}

export async function getRelatedWords(word: string): Promise<string[]> {
  const res = await fetch(
    `https://api.datamuse.com/words?ml=${encodeURIComponent(word)}&max=10`
  );
  if (!res.ok) return [];

  const data: DatamuseSuggestion[] = await res.json();
  return data.map((d) => d.word);
}
