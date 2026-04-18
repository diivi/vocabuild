import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  ArrowRightLeft,
  Brain,
  Shuffle,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { WordCard } from "@/components/search/WordCard";
import { QuizRunner, type QuizResult } from "@/components/review/QuizRunner";
import { QuizResults } from "@/components/review/QuizResults";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  loadDeck,
  deleteCustomDeck,
  markDeckOpened,
  getDeckStats,
  previewDeckWord,
  prefetchDeckWords,
  type Deck,
  type DeckStats,
} from "@/lib/decks";
import {
  generateQuizFromWordList,
  type QuizQuestion,
  type QuizType,
} from "@/lib/quiz/quiz-engine";
import { getWord, setWordInBank } from "@/lib/db-operations";
import { backgroundPush } from "@/lib/sync";
import { db, type Word } from "@/lib/db";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ViewState = "overview" | "playing" | "results";

const MIN_WORDS_FOR_QUIZ = 4;
const QUIZ_SIZE = 10;
const QUIZ_PREFETCH = 15;

export function DeckPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [stats, setStats] = useState<DeckStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<ViewState>("overview");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);

  // Word preview modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalWord, setModalWord] = useState<Word | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalIsInBank, setModalIsInBank] = useState(false);

  const [quizBuilding, setQuizBuilding] = useState<QuizType | "mixed" | null>(null);
  const [quizProgress, setQuizProgress] = useState({ done: 0, total: 0 });
  const quizAbortRef = useRef<AbortController | null>(null);

  const refreshStats = useCallback(async (d: Deck) => {
    const s = await getDeckStats(d.id, d.words);
    setStats(s);
    return s;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const decoded = decodeURIComponent(id);
        const d = await loadDeck(decoded);
        if (cancelled) return;
        setDeck(d);
        await markDeckOpened(d.id);
        await refreshStats(d);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load deck");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
      quizAbortRef.current?.abort();
    };
  }, [id, refreshStats]);

  const total = deck?.words.length ?? 0;
  const inBankCount = stats?.inBank ?? 0;
  const reviewedCount = stats?.reviewed ?? 0;
  const masteredCount = stats?.mastered ?? 0;
  const masteryPct = total > 0 ? Math.round((masteredCount / total) * 100) : 0;

  // Per-word bank/mastered sets for chip icons
  const [bankSet, setBankSet] = useState<Set<string>>(new Set());

  const rebuildSets = useCallback(async (d: Deck) => {
    const lowered = d.words.map((w) => w.toLowerCase());
    const rows = await db.words.where("word").anyOf(lowered).toArray();
    const bank = new Set<string>();
    for (const r of rows) {
      if (r.inBank === 1) bank.add(r.word.toLowerCase());
    }
    setBankSet(bank);
  }, []);

  useEffect(() => {
    if (deck) rebuildSets(deck);
  }, [deck, rebuildSets, stats]);

  const openWordModal = async (word: string) => {
    const lw = word.toLowerCase();
    setModalWord(null);
    setModalLoading(true);
    setModalOpen(true);
    try {
      const { word: found, status } = await previewDeckWord(lw);
      if (status === "notFound") {
        toast.error(`"${word}" isn't in the dictionary`);
        setModalOpen(false);
      } else if (status === "error") {
        toast.error("Couldn't fetch that word — check your connection");
        setModalOpen(false);
      } else if (found) {
        setModalWord(found);
        setModalIsInBank(found.inBank === 1);
      }
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleBank = async (next: boolean) => {
    if (!modalWord?.id || !deck) return;
    await setWordInBank(modalWord.id, next);
    backgroundPush();
    toast.success(next ? "Added to word bank" : "Removed from word bank");
    const fresh = await getWord(modalWord.word);
    if (fresh) {
      setModalWord(fresh);
      setModalIsInBank(fresh.inBank === 1);
    }
    await refreshStats(deck);
  };

  const handleStartQuiz = async (type: QuizType | "mixed") => {
    if (!deck) return;
    if (deck.words.length < MIN_WORDS_FOR_QUIZ) {
      toast.error(`This deck needs at least ${MIN_WORDS_FOR_QUIZ} words`);
      return;
    }
    const controller = new AbortController();
    quizAbortRef.current = controller;
    setQuizBuilding(type);
    setQuizProgress({ done: 0, total: 0 });
    try {
      const shuffled = [...deck.words].sort(() => Math.random() - 0.5);
      const window = shuffled.slice(0, Math.min(QUIZ_PREFETCH, shuffled.length));
      await prefetchDeckWords(window, {
        signal: controller.signal,
        onProgress: (p) => setQuizProgress({ done: p.processed, total: p.total }),
      });
      if (controller.signal.aborted) return;
      const qs = await generateQuizFromWordList(window, type, QUIZ_SIZE);
      if (qs.length === 0) {
        toast.error("Couldn't build a quiz — try again or pick another deck");
        return;
      }
      setQuestions(qs);
      setQuizResults([]);
      setView("playing");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start quiz");
    } finally {
      setQuizBuilding(null);
      quizAbortRef.current = null;
    }
  };

  const handleQuizFinish = async (results: QuizResult[]) => {
    setQuizResults(results);
    setView("results");
    if (deck) await refreshStats(deck);
  };

  const handleRetryMistakes = (mistakes: QuizResult[]) => {
    if (mistakes.length === 0) return;
    setQuestions(mistakes.map((m) => m.question));
    setQuizResults([]);
    setView("playing");
  };

  const handleDeleteCustomDeck = async () => {
    if (!deck || !deck.isCustom) return;
    if (!confirm(`Delete "${deck.title}"? This cannot be undone.`)) return;
    await deleteCustomDeck(deck.id);
    toast.success("Deck deleted");
    navigate("/home");
  };

  // --- Render ---------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-3 pt-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        <div className="space-y-2 pt-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-muted/60" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !deck) {
    return (
      <div className="pt-10 text-center">
        <p className="text-sm text-muted-foreground">{error ?? "Deck not found"}</p>
        <Button variant="outline" onClick={() => navigate("/home")} className="mt-4 rounded-lg">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back home
        </Button>
      </div>
    );
  }

  if (view === "playing") {
    return (
      <QuizRunner
        questions={questions}
        onFinish={handleQuizFinish}
        onExit={() => setView("overview")}
        title={deck.title}
      />
    );
  }

  if (view === "results") {
    return (
      <QuizResults
        results={quizResults}
        onBack={() => setView("overview")}
        onRetryMistakes={handleRetryMistakes}
      />
    );
  }

  return (
    <>
      {/* Word preview modal — DialogContent zeroed out so WordCard is the only visible frame */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[85vh] overflow-y-auto p-0 gap-0 ring-0 shadow-none rounded-2xl"
        >
          <DialogTitle className="sr-only">Word preview</DialogTitle>
          {modalLoading ? (
            <div className="flex items-center justify-center rounded-2xl bg-card py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : modalWord ? (
            <WordCard
              word={modalWord}
              isInBank={modalIsInBank}
              onToggleBank={handleToggleBank}
              onWordClick={(w) => openWordModal(w)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/home")}
            className="-ml-2 shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{deck.emoji ?? "📘"}</span>
              <h1 className="truncate text-xl font-bold text-foreground">{deck.title}</h1>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{deck.description}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">{deck.category}</Badge>
              <span className="text-[11px] text-muted-foreground">{total} words</span>
              {deck.source && (
                <span className="text-[11px] text-muted-foreground/70">· {deck.source}</span>
              )}
            </div>
          </div>
          {deck.isCustom && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDeleteCustomDeck}
              className="shrink-0 text-muted-foreground hover:text-destructive"
              aria-label="Delete deck"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatTile label="In bank" value={inBankCount} total={total} />
          <StatTile label="Reviewed" value={reviewedCount} total={total} />
          <StatTile label="Mastered" value={`${masteryPct}%`} />
        </div>

        {/* Quiz modes */}
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Study this deck
            </p>
            <span className="text-[11px] text-muted-foreground">
              Definitions fetched as you play
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <QuizModeButton
              icon={BookOpen}
              label="Meanings"
              onClick={() => handleStartQuiz("meaning")}
              disabled={total < MIN_WORDS_FOR_QUIZ || quizBuilding !== null}
              loading={quizBuilding === "meaning"}
            />
            <QuizModeButton
              icon={ArrowRightLeft}
              label="Synonyms"
              onClick={() => handleStartQuiz("synonym")}
              disabled={total < MIN_WORDS_FOR_QUIZ || quizBuilding !== null}
              loading={quizBuilding === "synonym"}
            />
            <QuizModeButton
              icon={Brain}
              label="Antonyms"
              onClick={() => handleStartQuiz("antonym")}
              disabled={total < MIN_WORDS_FOR_QUIZ || quizBuilding !== null}
              loading={quizBuilding === "antonym"}
            />
            <QuizModeButton
              icon={Shuffle}
              label="Mixed"
              onClick={() => handleStartQuiz("mixed")}
              disabled={total < MIN_WORDS_FOR_QUIZ || quizBuilding !== null}
              loading={quizBuilding === "mixed"}
            />
          </div>
          {quizBuilding && (
            <div className="space-y-2 rounded-xl border bg-card p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Preparing quiz…
                </span>
                <button
                  onClick={() => {
                    quizAbortRef.current?.abort();
                    setQuizBuilding(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
              <Progress
                value={quizProgress.total > 0 ? (quizProgress.done / quizProgress.total) * 100 : 0}
                className="h-1"
              />
            </div>
          )}
        </div>

        {/* Word list */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Words ({total})
            <span className="ml-1.5 text-[10px] font-normal normal-case tracking-normal text-muted-foreground/60">
              · tap to preview
            </span>
          </p>
          <div className="divide-y divide-border overflow-hidden rounded-xl border bg-card">
            {deck.words.map((word) => {
              const inBank = bankSet.has(word.toLowerCase());
              return (
                <button
                  key={word}
                  onClick={() => openWordModal(word)}
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-muted/50 active:bg-muted"
                >
                  <span className={cn("font-medium", !inBank && "text-foreground")}>
                    {word}
                  </span>
                  {inBank && (
                    <Badge variant="secondary" className="shrink-0 text-[10px] text-success">
                      in bank
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function StatTile({
  label,
  value,
  total,
}: {
  label: string;
  value: number | string;
  total?: number;
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-foreground">
        {value}
        {total !== undefined && (
          <span className="text-xs font-normal text-muted-foreground"> / {total}</span>
        )}
      </p>
    </div>
  );
}

function QuizModeButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 transition-all",
        "hover:border-primary/40 hover:shadow-sm active:scale-[0.97]",
        disabled && "cursor-not-allowed opacity-50 hover:border-border hover:shadow-none"
      )}
    >
      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      ) : (
        <Icon className="h-6 w-6 text-primary" />
      )}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
