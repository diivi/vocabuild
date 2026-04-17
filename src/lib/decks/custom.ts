import { db, type CustomDeckRow } from "@/lib/db";
import type { Deck, DeckMeta } from "./types";

function toMeta(row: CustomDeckRow): DeckMeta {
  return {
    id: row.deckId,
    title: row.title,
    description: row.description,
    category: row.category,
    emoji: row.emoji,
    source: row.source,
    isCustom: true,
    createdAt: row.createdAt,
  };
}

function toDeck(row: CustomDeckRow): Deck {
  return { ...toMeta(row), words: row.words };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * Parse a newline-separated text file into a word list.
 * Supports .txt (one word per line) and .csv (takes the first column).
 */
export function parseWordListText(raw: string): string[] {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    // Grab the first token (so CSVs with "word,definition" still work)
    const first = line.split(/[,\t]/)[0].trim();
    if (!first) continue;
    // Strip simple markdown list markers
    const cleaned = first
      .replace(/^[-*+]\s+/, "")
      .replace(/^\d+\.\s+/, "")
      .replace(/^["']|["']$/g, "")
      .trim()
      .toLowerCase();
    if (!cleaned) continue;
    if (!seen.has(cleaned)) {
      seen.add(cleaned);
      words.push(cleaned);
    }
  }
  return words;
}

export async function getCustomDecks(): Promise<DeckMeta[]> {
  const rows = await db.customDecks.orderBy("createdAt").reverse().toArray();
  return rows.map(toMeta);
}

export async function getCustomDeck(deckId: string): Promise<Deck | null> {
  const row = await db.customDecks.where("deckId").equals(deckId).first();
  return row ? toDeck(row) : null;
}

export interface CreateCustomDeckInput {
  title: string;
  description?: string;
  category?: string;
  emoji?: string;
  words: string[];
}

export async function createCustomDeck(
  input: CreateCustomDeckInput
): Promise<DeckMeta> {
  const slug = slugify(input.title) || "deck";
  const deckId = `custom-${slug}-${Date.now()}`;
  const row: Omit<CustomDeckRow, "id"> = {
    deckId,
    title: input.title.trim() || "Custom Deck",
    description: input.description?.trim() || "",
    category: input.category?.trim() || "Custom",
    emoji: input.emoji?.trim() || "📝",
    words: input.words,
    createdAt: Date.now(),
  };
  await db.customDecks.add(row as CustomDeckRow);
  return toMeta(row as CustomDeckRow);
}

export async function deleteCustomDeck(deckId: string): Promise<void> {
  await db.customDecks.where("deckId").equals(deckId).delete();
  await db.deckProgress.where("deckId").equals(deckId).delete();
}
