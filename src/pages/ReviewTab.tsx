import { useState, useEffect, useRef, useCallback } from "react";
import {
  Brain,
  BookOpen,
  ArrowRightLeft,
  Shuffle,
  Trophy,
  Target,
  Flame,
  Info,
  CheckCircle2,
  Clock,
  CalendarDays,
  PenLine,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { ContributionChart } from "@/components/review/ContributionChart";
import { QuizRunner, type QuizResult } from "@/components/review/QuizRunner";
import { QuizResults } from "@/components/review/QuizResults";
import {
  generateQuiz,
  generateDailyQuiz,
  type QuizType,
  type QuizQuestion,
} from "@/lib/quiz/quiz-engine";
import {
  getQuizStats,
  getWordCount,
  getDailyWord,
  getTodayString,
  addUserSentence,
} from "@/lib/db-operations";
import { cn } from "@/lib/utils";
import type { Word } from "@/lib/db";

type QuizState = "menu" | "playing" | "results";

const DAILY_QUIZ_KEY = (date: string) => `vocabuild_daily_quiz_${date}`;
const DAILY_SENTENCE_KEY = (date: string) => `vocabuild_daily_sentence_${date}`;

export function ReviewTab() {
  const [quizState, setQuizState] = useState<QuizState>("menu");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [stats, setStats] = useState({
    quizzesTaken: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    accuracy: 0,
    totalWords: 0,
    reviewedWords: 0,
    masteredWords: 0,
    wordsDue: 0,
  });
  const [wordCount, setWordCount] = useState(0);

  // Daily quiz state
  const isDailyQuizRef = useRef(false);
  const [dailyQuizResult, setDailyQuizResult] = useState<{ score: number; total: number } | null>(null);

  // Daily word / sentence state
  const [dailyWord, setDailyWord] = useState<Word | null>(null);
  const [dailyWordInput, setDailyWordInput] = useState("");
  const [dailyWordDone, setDailyWordDone] = useState<string | null>(null);
  const [dailySentenceStatus, setDailySentenceStatus] = useState<"idle" | "saving">("idle");

  useEffect(() => {
    loadStats();
    loadDailyState();
  }, []);

  const loadStats = async () => {
    const s = await getQuizStats();
    setStats(s);
    setWordCount(await getWordCount());
  };

  const loadDailyState = async () => {
    const today = getTodayString();

    const quizData = localStorage.getItem(DAILY_QUIZ_KEY(today));
    if (quizData) setDailyQuizResult(JSON.parse(quizData));

    const sentenceData = localStorage.getItem(DAILY_SENTENCE_KEY(today));
    if (sentenceData) setDailyWordDone(sentenceData);

    const word = await getDailyWord();
    setDailyWord(word);
  };

  const startQuiz = async (type: QuizType | "mixed") => {
    const q = await generateQuiz(type, 10);
    if (q.length === 0) return;
    isDailyQuizRef.current = false;
    setQuestions(q);
    setResults([]);
    setQuizState("playing");
  };

  const startDailyQuiz = async () => {
    const q = await generateDailyQuiz();
    if (q.length === 0) return;
    isDailyQuizRef.current = true;
    setQuestions(q);
    setResults([]);
    setQuizState("playing");
  };

  const handleFinish = async (r: QuizResult[]) => {
    setResults(r);
    setQuizState("results");

    if (isDailyQuizRef.current) {
      isDailyQuizRef.current = false;
      const correct = r.filter((res) => res.isCorrect).length;
      const result = { score: correct, total: r.length };
      const today = getTodayString();
      localStorage.setItem(DAILY_QUIZ_KEY(today), JSON.stringify(result));
      setDailyQuizResult(result);
    }

    await loadStats();
  };

  const handleRetryMistakes = (mistakes: QuizResult[]) => {
    if (mistakes.length === 0) return;
    setQuestions(mistakes.map((m) => m.question));
    setResults([]);
    setQuizState("playing");
  };

  const backToMenu = () => {
    isDailyQuizRef.current = false;
    setQuizState("menu");
    loadStats();
  };

  const isDailyWordSentenceValid =
    dailyWord !== null &&
    dailyWordInput.trim().length >= dailyWord.word.length + 3 &&
    dailyWordInput.toLowerCase().includes(dailyWord.word.toLowerCase());

  const submitDailySentence = useCallback(async () => {
    if (!dailyWord || !isDailyWordSentenceValid) return;
    setDailySentenceStatus("saving");
    const sentence = dailyWordInput.trim();
    await addUserSentence({
      wordId: dailyWord.id ?? 0,
      word: dailyWord.word,
      sentence,
      isDailyChallenge: true,
    });
    const today = getTodayString();
    localStorage.setItem(DAILY_SENTENCE_KEY(today), sentence);
    setDailyWordDone(sentence);
    setDailySentenceStatus("idle");
  }, [dailyWord, dailyWordInput, isDailyWordSentenceValid]);

  if (quizState === "playing" && questions.length > 0) {
    return (
      <QuizRunner questions={questions} onFinish={handleFinish} onExit={backToMenu} />
    );
  }

  if (quizState === "results") {
    return (
      <QuizResults
        results={results}
        onBack={backToMenu}
        onRetryMistakes={handleRetryMistakes}
      />
    );
  }

  const canQuiz = wordCount >= 2;
  const allCaughtUp = canQuiz && stats.wordsDue === 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Review</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">Your saved word bank</p>
      </div>

      {/* ── Daily Challenges ── */}
      <div className="space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Today's challenges
          </p>

          {/* Daily Quiz */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <CalendarDays className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Daily Quiz</p>
                  <p className="text-xs text-muted-foreground">
                    {dailyQuizResult
                      ? `${dailyQuizResult.score}/${dailyQuizResult.total} correct`
                      : "5 mixed questions · ~2 min"}
                  </p>
                </div>
              </div>
              {dailyQuizResult ? (
                <div className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Done
                </div>
              ) : (
                <button
                  onClick={startDailyQuiz}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:scale-95"
                >
                  Start
                </button>
              )}
            </div>
          </div>

          {/* Word of the Day */}
          {dailyWord && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-chart-2/10">
                  <PenLine className="h-4.5 w-4.5 text-chart-2" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Word of the Day</p>
                  <p className="text-xs text-muted-foreground">
                    Use <span className="font-medium text-foreground">{dailyWord.word}</span> in a sentence
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70 line-clamp-1">
                    {dailyWord.primaryDefinition}
                  </p>
                </div>
              </div>

              {dailyWordDone ? (
                <div className="rounded-lg bg-success/10 p-3">
                  <p className="text-xs text-success font-medium mb-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Saved for today
                  </p>
                  <p className="text-sm text-foreground/80 italic">"{dailyWordDone}"</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={dailyWordInput}
                    onChange={(e) => setDailyWordInput(e.target.value)}
                    placeholder={`Write a sentence using "${dailyWord.word}"…`}
                    rows={2}
                    className="w-full resize-none rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                  <button
                    onClick={submitDailySentence}
                    disabled={!isDailyWordSentenceValid || dailySentenceStatus === "saving"}
                    className={cn(
                      "w-full rounded-lg py-2 text-xs font-semibold transition-colors",
                      isDailyWordSentenceValid
                        ? "bg-chart-2 text-white hover:opacity-90"
                        : "bg-muted text-muted-foreground/50 cursor-not-allowed"
                    )}
                  >
                    Save sentence
                  </button>
                </div>
              )}
            </div>
          )}
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <p>
          Review quizzes only use words you've{" "}
          <span className="font-medium text-foreground">added to your word bank</span>.
          To study a deck, open it from Home and use{" "}
          <span className="font-medium text-foreground">Study this deck</span>{" "}
          — you can then bookmark individual words you want to keep.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card className="flex flex-col items-center gap-1 p-3">
          <Target className="h-5 w-5 text-primary" />
          <span className="text-lg font-bold">{stats.quizzesTaken}</span>
          <span className="text-[10px] text-muted-foreground">Quizzes</span>
        </Card>
        <Card className="flex flex-col items-center gap-1 p-3">
          <Trophy className="h-5 w-5 text-chart-4" />
          <span className="text-lg font-bold">
            {Math.round(stats.accuracy * 100)}%
          </span>
          <span className="text-[10px] text-muted-foreground">Accuracy</span>
        </Card>
        <Card className="flex flex-col items-center gap-1 p-3">
          <Flame className="h-5 w-5 text-destructive" />
          <span className="text-lg font-bold">{stats.masteredWords}</span>
          <span className="text-[10px] text-muted-foreground">Mastered</span>
        </Card>
      </div>

      <ContributionChart />

      {!canQuiz ? (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <span className="text-3xl">🧠</span>
          </div>
          <h2 className="text-lg font-semibold">Not enough words yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add at least 2 words to your bank to start reviewing
          </p>
        </div>
      ) : (
        <>
          {/* Due / caught-up banner */}
          {allCaughtUp ? (
            <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 p-4">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  You're all caught up!
                </p>
                <p className="text-xs text-muted-foreground">
                  No words are due right now. Come back later or study anyway below.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <Clock className="h-6 w-6 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {stats.wordsDue} word{stats.wordsDue === 1 ? "" : "s"} due for review
                </p>
                <p className="text-xs text-muted-foreground">
                  Words you've recently struggled with or haven't seen in a while.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {allCaughtUp ? "Study anyway" : "Quiz mode"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { type: "meaning" as const, icon: BookOpen, label: "Meanings", color: "text-primary" },
                  { type: "synonym" as const, icon: ArrowRightLeft, label: "Synonyms", color: "text-chart-2" },
                  { type: "antonym" as const, icon: Brain, label: "Antonyms", color: "text-chart-5" },
                  { type: "mixed" as const, icon: Shuffle, label: "Mixed", color: "text-chart-1" },
                ] as const
              ).map(({ type, icon: Icon, label, color }) => (
                <button
                  key={type}
                  onClick={() => startQuiz(type)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border bg-card p-5 transition-all",
                    "hover:border-primary/40 hover:shadow-sm active:scale-[0.97]"
                  )}
                >
                  <Icon className={cn("h-7 w-7", color)} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SRS explanation */}
          <div className="rounded-xl border bg-muted/30 p-3 text-[11px] text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">How scheduling works</p>
            <p>Words are spaced out based on how well you know them:</p>
            <ul className="list-disc space-y-0.5 pl-4">
              <li>Answer correctly → interval roughly doubles each time</li>
              <li>Answer wrong → interval resets to 1 day</li>
              <li>
                Mastered (≥5 reviews, ≥90% accuracy) → reviewed monthly
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
