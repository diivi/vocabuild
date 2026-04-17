import type { Deck, DeckMeta, DeckDifficulty } from "./types";

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

  const words: string[] = [];
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
    // Ignore lines that look like "key: value" pairs (stray frontmatter)
    if (/^[A-Za-z][\w -]*:\s/.test(cleaned)) continue;

    const word = cleaned.toLowerCase();
    if (!seen.has(word)) {
      seen.add(word);
      words.push(word);
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
    words,
  };
}
