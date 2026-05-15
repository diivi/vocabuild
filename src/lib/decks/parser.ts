import type { Deck, DeckMeta, DeckDifficulty, DeckKind, PhraseEntry } from "./types";

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n?/;

/**
 * Parse a minimal YAML-ish frontmatter block — only key: value lines are supported.
 * Values may optionally be surrounded by single or double quotes.
 */
function parseFrontmatter(src: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of src.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function isDifficulty(v: string | undefined): v is DeckDifficulty {
  return v === "beginner" || v === "intermediate" || v === "advanced";
}

function isKind(v: string | undefined): v is DeckKind {
  return v === "words" || v === "phrases";
}

/** Split a phrase deck line on `::` (with optional surrounding spaces). */
function splitPhraseLine(line: string): [string, string, string?] | null {
  const parts = line.split(/\s*::\s*/);
  if (parts.length < 2) return null;
  const text = parts[0].trim();
  const definition = parts[1].trim();
  if (!text || !definition) return null;
  const example = parts[2]?.trim() || undefined;
  return [text, definition, example];
}

/**
 * Parse a deck markdown file: YAML frontmatter + one word per line in the body.
 * Lines beginning with `#`, `>`, `-`, or `*` are treated as markdown structure and skipped.
 */
export function parseDeckMarkdown(
  markdown: string,
  fallback: Partial<DeckMeta> = {}
): Deck {
  const match = markdown.match(FRONTMATTER_RE);
  const fm = match ? parseFrontmatter(match[1]) : {};
  const body = match ? markdown.slice(match[0].length) : markdown;

  const kind: DeckKind = isKind(fm.kind)
    ? fm.kind
    : fallback.kind ?? "words";

  const words: string[] = [];
  const entries: PhraseEntry[] = [];
  const seen = new Set<string>();

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#") || line.startsWith(">") || line === "---") continue;

    // Strip common list markers
    const cleaned = line
      .replace(/^[-*+]\s+/, "")
      .replace(/^\d+\.\s+/, "")
      .trim();

    if (!cleaned) continue;
    // Ignore stray frontmatter-style lines, unless this is a phrase deck where
    // `::` is the real delimiter (so "a :: b" is content, not a key: value pair).
    if (kind !== "phrases" && /^[A-Za-z][\w -]*:\s/.test(cleaned)) continue;

    if (kind === "phrases") {
      const parsed = splitPhraseLine(cleaned);
      if (!parsed) continue;
      const [text, definition, example] = parsed;
      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      words.push(key);
      entries.push({ text: key, definition, example });
    } else {
      const word = cleaned.toLowerCase();
      if (!seen.has(word)) {
        seen.add(word);
        words.push(word);
      }
    }
  }

  return {
    id: fm.id || fallback.id || "",
    title: fm.title || fallback.title || "Untitled Deck",
    description: fm.description || fallback.description || "",
    category: fm.category || fallback.category || "General",
    emoji: fm.emoji || fallback.emoji,
    source: fm.source || fallback.source,
    difficulty: isDifficulty(fm.difficulty)
      ? fm.difficulty
      : fallback.difficulty,
    file: fm.file || fallback.file,
    kind,
    words,
    entries: kind === "phrases" ? entries : undefined,
  };
}
