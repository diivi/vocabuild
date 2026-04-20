import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, PenLine, CheckCircle2 } from "lucide-react";
import { SearchBar } from "@/components/search/SearchBar";
import { WordCard } from "@/components/search/WordCard";
import { DecksSection } from "@/components/decks/DecksSection";
import { useWordLookup } from "@/hooks/useWordLookup";
import { getTodayString, getDailyWord } from "@/lib/db-operations";
import { toast } from "sonner";

interface DailyChallengeState {
  wordName: string;
  quizDone: { score: number; total: number } | null;
  sentenceDone: boolean;
}

export function SearchTab() {
  const { word, isLoading, error, lookup, clear } = useWordLookup();
  const [query, setQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const handledAdd = useRef(false);
  const navigate = useNavigate();
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallengeState | null>(null);

  useEffect(() => {
    async function initDailyChallenge() {
      const dailyWord = await getDailyWord();
      if (!dailyWord) return;
      const today = getTodayString();
      const quizRaw = localStorage.getItem(`vocabuild_daily_quiz_${today}`);
      setDailyChallenge({
        wordName: dailyWord.word,
        quizDone: quizRaw ? JSON.parse(quizRaw) : null,
        sentenceDone: !!localStorage.getItem(`vocabuild_daily_sentence_${today}`),
      });
    }
    initDailyChallenge();
  }, []);

  // Handle ?add=word URL param (used by iOS Shortcut & external links)
  useEffect(() => {
    const addWord = searchParams.get("add");
    if (addWord && !handledAdd.current) {
      handledAdd.current = true;
      const cleaned = addWord.trim().toLowerCase();
      setQuery(cleaned);
      lookup(cleaned).then(() => {
        toast.success(`"${cleaned}" saved to your bank`, { duration: 1500 });
      });
      // Clean up the URL
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, lookup, setSearchParams]);

  const handleSearch = useCallback(
    async (term: string) => {
      setQuery(term);
      await lookup(term);
      toast.success("Word saved to your bank", { duration: 1500 });
    },
    [lookup]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    clear();
  }, [clear]);

  return (
    <div className="space-y-4">
      <div className="pt-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Voca<span className="text-primary">Build</span>
        </h1>
        <p className="text-xs text-muted-foreground">
          Look up any word to build your vocabulary
        </p>
      </div>

      <SearchBar
        value={query}
        onChange={setQuery}
        onSearch={handleSearch}
        onClear={handleClear}
      />

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading && !word && (
        <div className="space-y-3">
          <div className="h-8 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="space-y-2 pt-2">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          </div>
        </div>
      )}

      {word && (
        <WordCard word={word} onWordClick={handleSearch} isLoading={isLoading} />
      )}

      {!word && !isLoading && !error && (
        <>
          {/* Daily challenge strip */}
          {dailyChallenge && (
            <button
              onClick={() => navigate("/review")}
              className="w-full rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/30"
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Today's challenges
              </p>
              <div className="flex gap-3">
                <div className="flex flex-1 items-center gap-2">
                  <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-xs text-foreground">Daily Quiz</span>
                  {dailyChallenge.quizDone ? (
                    <span className="ml-auto flex items-center gap-1 text-xs text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {dailyChallenge.quizDone.score}/{dailyChallenge.quizDone.total}
                    </span>
                  ) : (
                    <span className="ml-auto text-xs text-primary font-medium">Start →</span>
                  )}
                </div>
                <span className="text-border">|</span>
                <div className="flex flex-1 items-center gap-2">
                  <PenLine className="h-4 w-4 shrink-0 text-chart-2" />
                  <span className="text-xs text-foreground truncate">{dailyChallenge.wordName}</span>
                  {dailyChallenge.sentenceDone ? (
                    <span className="ml-auto flex items-center gap-1 text-xs text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <span className="ml-auto text-xs text-chart-2 font-medium">Write →</span>
                  )}
                </div>
              </div>
            </button>
          )}
          <DecksSection />
        </>
      )}
    </div>
  );
}
