import { useState, useEffect, useRef } from "react";
import { Search, Trash2, ArrowUpDown, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WordCard } from "@/components/search/WordCard";
import { getAllWords, searchWords, deleteWord, getQuizStats, getAllUserSentences } from "@/lib/db-operations";
import { backgroundPull, backgroundPush } from "@/lib/sync";
import { formatRelativeTime, cn } from "@/lib/utils";
import type { Word, UserSentence } from "@/lib/db";

type SortMode = "recent" | "alphabetical" | "needsReview";
type ViewMode = "words" | "sentences";

export function WordBankTab() {
  const [view, setView] = useState<ViewMode>("words");
  const [words, setWords] = useState<Word[]>([]);
  const [sentences, setSentences] = useState<UserSentence[]>([]);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortMode>("recent");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [stats, setStats] = useState({ totalWords: 0, reviewedWords: 0, accuracy: 0 });

  const hasPulled = useRef(false);

  const loadWords = async () => {
    const results = query.trim()
      ? await searchWords(query)
      : await getAllWords(sortBy);
    setWords(results);
    const s = await getQuizStats();
    setStats({ totalWords: s.totalWords, reviewedWords: s.reviewedWords, accuracy: s.accuracy });
  };

  const loadSentences = async () => {
    setSentences(await getAllUserSentences());
  };

  useEffect(() => {
    if (!hasPulled.current) {
      hasPulled.current = true;
      backgroundPull().then((pulled) => {
        if (pulled > 0) loadWords();
      });
    }
  }, []);

  useEffect(() => {
    loadWords();
    loadSentences();
  }, [query, sortBy]);

  const handleDelete = async (id: number) => {
    await deleteWord(id);
    setExpandedId(null);
    loadWords();
    backgroundPush();
  };

  const cycleSortMode = () => {
    const modes: SortMode[] = ["recent", "alphabetical", "needsReview"];
    const idx = modes.indexOf(sortBy);
    setSortBy(modes[(idx + 1) % modes.length]);
  };

  const sortLabel = { recent: "Recent", alphabetical: "A-Z", needsReview: "Needs Review" }[sortBy];

  if (stats.totalWords === 0 && !query) {
    return (
      <div className="flex flex-col items-center pt-24 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <span className="text-3xl">📚</span>
        </div>
        <h2 className="text-lg font-semibold text-foreground">No words yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Search for words to build your collection
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Word Bank</h1>
        {view === "words" ? (
          <Button variant="ghost" size="sm" onClick={cycleSortMode} className="gap-1 text-xs">
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortLabel}
          </Button>
        ) : null}
      </div>

      {/* View toggle */}
      <div className="flex rounded-lg border bg-muted/30 p-1 gap-1">
        <button
          onClick={() => setView("words")}
          className={cn(
            "flex-1 rounded-md py-1.5 text-xs font-medium transition-colors",
            view === "words"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Words ({stats.totalWords})
        </button>
        <button
          onClick={() => setView("sentences")}
          className={cn(
            "flex-1 rounded-md py-1.5 text-xs font-medium transition-colors",
            view === "sentences"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Sentences ({sentences.length})
        </button>
      </div>

      {/* Stats (words view only) */}
      {view === "words" && (
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>{stats.totalWords} words</span>
          <span className="text-border">|</span>
          <span>{stats.reviewedWords} reviewed</span>
          <span className="text-border">|</span>
          <span>{Math.round(stats.accuracy * 100)}% accuracy</span>
        </div>
      )}

      {view === "sentences" ? (
        /* ── Sentence Log ── */
        sentences.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <span className="text-3xl">✍️</span>
            </div>
            <h2 className="text-base font-semibold text-foreground">No sentences yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Write sentences from word cards or the daily challenge
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sentences.map((s) => (
              <div key={s.id} className="rounded-xl border bg-card p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{s.word}</span>
                  {s.isDailyChallenge && (
                    <span className="flex items-center gap-1 rounded-full bg-chart-2/10 px-2 py-0.5 text-[10px] font-medium text-chart-2">
                      <CalendarDays className="h-3 w-3" />
                      daily
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-muted-foreground/60">
                    {formatRelativeTime(s.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 italic">"{s.sentence}"</p>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ── Word List ── */
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter words..."
              className="h-9 rounded-lg pl-9 text-sm"
            />
          </div>

          <div className="space-y-2">
            {words.map((word) => {
              const isExpanded = expandedId === word.id;
              const accuracy =
                word.reviewCount > 0 ? word.correctCount / word.reviewCount : -1;

              if (isExpanded) {
                return (
                  <div
                    key={word.id}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest("button, [role='button'], .badge, textarea")) return;
                      setExpandedId(null);
                    }}
                    className="cursor-pointer"
                  >
                    <WordCard word={word} />
                  </div>
                );
              }

              return (
                <div
                  key={word.id}
                  className="relative flex w-full items-start gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/30"
                >
                  <button
                    onClick={() => setExpandedId(word.id ?? null)}
                    className="flex flex-1 min-w-0 flex-col text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{word.word}</span>
                      <span className="text-xs text-muted-foreground">
                        {word.primaryPartOfSpeech}
                      </span>
                      {accuracy >= 0 && (
                        <span
                          className={cn(
                            "inline-block h-2 w-2 rounded-full",
                            accuracy >= 0.7
                              ? "bg-success"
                              : accuracy >= 0.4
                                ? "bg-chart-4"
                                : "bg-destructive"
                          )}
                        />
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {word.primaryDefinition}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground/60">
                      {formatRelativeTime(word.searchedAt)}
                      {word.reviewCount > 0 && ` · ${word.reviewCount} reviews`}
                    </p>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      word.id && handleDelete(word.id);
                    }}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {words.length === 0 && query && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No words match "{query}"
            </p>
          )}
        </>
      )}
    </div>
  );
}
