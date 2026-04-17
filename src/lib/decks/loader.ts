import type { Deck, DeckIndex, DeckMeta } from "./types";
import { parseDeckMarkdown } from "./parser";
import { getCustomDecks, getCustomDeck } from "./custom";

const DECKS_BASE = "/decks";

let indexCache: Promise<DeckMeta[]> | null = null;
const deckCache = new Map<string, Promise<Deck>>();

async function fetchBuiltInIndex(): Promise<DeckMeta[]> {
  const res = await fetch(`${DECKS_BASE}/index.json`, { cache: "force-cache" });
  if (!res.ok) throw new Error("Failed to load deck index");
  const data = (await res.json()) as DeckIndex;
  return data.decks;
}

export async function getBuiltInDecks(): Promise<DeckMeta[]> {
  if (!indexCache) {
    indexCache = fetchBuiltInIndex().catch((err) => {
      indexCache = null;
      throw err;
    });
  }
  return indexCache;
}

export async function getAllDeckMetas(): Promise<DeckMeta[]> {
  const [builtin, custom] = await Promise.all([
    getBuiltInDecks(),
    getCustomDecks(),
  ]);
  return [...builtin, ...custom];
}

export async function loadDeck(id: string): Promise<Deck> {
  if (deckCache.has(id)) return deckCache.get(id)!;

  const promise = (async () => {
    // Try custom decks first
    const custom = await getCustomDeck(id);
    if (custom) return custom;

    const metas = await getBuiltInDecks();
    const meta = metas.find((m) => m.id === id);
    if (!meta || !meta.file) throw new Error(`Deck not found: ${id}`);

    const res = await fetch(`${DECKS_BASE}/${meta.file}`, {
      cache: "force-cache",
    });
    if (!res.ok) throw new Error(`Failed to load deck "${id}"`);
    const text = await res.text();
    return parseDeckMarkdown(text, meta);
  })();

  deckCache.set(id, promise);
  promise.catch(() => deckCache.delete(id));
  return promise;
}

export function invalidateDeckCache(id?: string) {
  if (id) {
    deckCache.delete(id);
  } else {
    deckCache.clear();
  }
  indexCache = null;
}
