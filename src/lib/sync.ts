import { db, type Word, type QuizAttempt } from "./db";

const GIST_TOKEN_KEY = "vocabuild_gist_token";
const GIST_ID_KEY = "vocabuild_gist_id";
const GIST_FILENAME = "vocabuild-data.json";

// --- Token management ---

export function getGistToken(): string | null {
  return localStorage.getItem(GIST_TOKEN_KEY);
}

export function setGistToken(token: string) {
  localStorage.setItem(GIST_TOKEN_KEY, token);
}

export function removeGistToken() {
  localStorage.removeItem(GIST_TOKEN_KEY);
  localStorage.removeItem(GIST_ID_KEY);
}

export function hasGistToken(): boolean {
  return !!getGistToken();
}

function getGistId(): string | null {
  return localStorage.getItem(GIST_ID_KEY);
}

function setGistId(id: string) {
  localStorage.setItem(GIST_ID_KEY, id);
}

// --- Export / Import (offline, no account needed) ---

interface ExportData {
  version: 1;
  exportedAt: string;
  words: Word[];
  quizAttempts: QuizAttempt[];
}

export async function exportData(): Promise<string> {
  const words = await db.words.toArray();
  const quizAttempts = await db.quizAttempts.toArray();
  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    words,
    quizAttempts,
  };
  return JSON.stringify(data, null, 2);
}

export async function importData(json: string): Promise<number> {
  const data: ExportData = JSON.parse(json);
  if (data.version !== 1) throw new Error("Unsupported export version");

  let added = 0;

  for (const word of data.words) {
    const existing = await db.words.where("word").equals(word.word).first();
    if (!existing) {
      // Strip the id so Dexie auto-generates one
      const { id, ...rest } = word;
      // Restore Date objects (JSON serializes them as strings)
      rest.searchedAt = new Date(rest.searchedAt);
      if (rest.lastReviewedAt) rest.lastReviewedAt = new Date(rest.lastReviewedAt);
      await db.words.add(rest as Word);
      added++;
    } else if (existing.id) {
      // Merge: keep the one with more reviews
      const totalExisting = existing.correctCount + existing.incorrectCount;
      const totalIncoming = word.correctCount + word.incorrectCount;
      if (totalIncoming > totalExisting) {
        await db.words.update(existing.id, {
          reviewCount: word.reviewCount,
          correctCount: word.correctCount,
          incorrectCount: word.incorrectCount,
          lastReviewedAt: word.lastReviewedAt ? new Date(word.lastReviewedAt) : existing.lastReviewedAt,
        });
      }
    }
  }

  // Deduplicate quiz attempts by sessionId + word
  const existingAttempts = await db.quizAttempts.toArray();
  const existingKeys = new Set(
    existingAttempts.map((a) => `${a.sessionId}:${a.word}:${a.quizType}`)
  );

  for (const attempt of data.quizAttempts) {
    const key = `${attempt.sessionId}:${attempt.word}:${attempt.quizType}`;
    if (!attempt.sessionId || existingKeys.has(key)) continue;
    const { id, ...rest } = attempt;
    rest.attemptedAt = new Date(rest.attemptedAt);
    await db.quizAttempts.add(rest as QuizAttempt);
  }

  return added;
}

// --- GitHub Gist sync ---

async function gistFetch(path: string, options: RequestInit = {}) {
  const token = getGistToken();
  if (!token) throw new Error("No GitHub token configured");

  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("Invalid GitHub token");
    throw new Error(`GitHub API error: ${res.status}`);
  }

  return res.json();
}

async function findExistingGist(): Promise<string | null> {
  // Search the user's gists for one containing our filename
  try {
    const gists = await gistFetch("/gists?per_page=100");
    for (const gist of gists) {
      if (gist.files?.[GIST_FILENAME]) {
        return gist.id;
      }
    }
  } catch {
    // If listing fails, fall through to create
  }
  return null;
}

async function ensureGist(): Promise<string> {
  // 1. Check locally cached gist ID
  let gistId = getGistId();
  if (gistId) {
    try {
      await gistFetch(`/gists/${gistId}`);
      return gistId;
    } catch {
      // Gist deleted or ID stale, continue
    }
  }

  // 2. Search user's gists for an existing VocaBuild gist
  //    (handles cross-device: localhost created it, vercel doesn't know the ID)
  const found = await findExistingGist();
  if (found) {
    setGistId(found);
    return found;
  }

  // 3. None found — create a new one
  const gist = await gistFetch("/gists", {
    method: "POST",
    body: JSON.stringify({
      description: "VocaBuild sync data",
      public: false,
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify({ version: 1, words: [], quizAttempts: [], syncedAt: new Date().toISOString() }),
        },
      },
    }),
  });

  const newId: string = gist.id;
  setGistId(newId);
  return newId;
}

export async function pushToGist(): Promise<void> {
  const gistId = await ensureGist();
  const json = await exportData();

  await gistFetch(`/gists/${gistId}`, {
    method: "PATCH",
    body: JSON.stringify({
      files: {
        [GIST_FILENAME]: { content: json },
      },
    }),
  });
}

export async function pullFromGist(): Promise<number> {
  const gistId = await ensureGist();
  const gist = await gistFetch(`/gists/${gistId}`);
  const file = gist.files?.[GIST_FILENAME];

  if (!file?.content) return 0;

  return importData(file.content);
}

export async function syncWithGist(): Promise<{ pushed: boolean; pulled: number }> {
  // Pull first (merge remote into local), then push local state
  const pulled = await pullFromGist();
  await pushToGist();
  return { pushed: true, pulled };
}

// --- Silent background sync (fire-and-forget, never throws) ---

export function backgroundPush() {
  if (!hasGistToken()) return;
  pushToGist().catch(() => {});
}

export function backgroundPull(): Promise<number> {
  if (!hasGistToken()) return Promise.resolve(0);
  return pullFromGist().catch(() => 0);
}
