import { useState, useEffect, useRef } from "react";
import { Brain, BookOpen, ArrowRightLeft, Shuffle, Sparkles, Trophy, Target, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { WordCard } from "@/components/search/WordCard";
import { ContributionChart } from "@/components/review/ContributionChart";
import { generateQuiz, type QuizType, type QuizQuestion } from "@/lib/quiz/quiz-engine";
import { recordQuizAttempt, getQuizStats, getWordCount } from "@/lib/db-operations";
import { cn } from "@/lib/utils";

type QuizState = "menu" | "playing" | "results";

interface QuizResult {
  question: QuizQuestion;
  userAnswer: string;
  isCorrect: boolean;
}

export function ReviewTab() {
  const [quizState, setQuizState] = useState<QuizState>("menu");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [expandedResult, setExpandedResult] = useState<number | null>(null);
  const sessionIdRef = useRef("");
  const [stats, setStats] = useState({
    quizzesTaken: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    accuracy: 0,
    totalWords: 0,
    reviewedWords: 0,
    masteredWords: 0,
  });
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const s = await getQuizStats();
    setStats(s);
    setWordCount(await getWordCount());
  };

  const startQuiz = async (type: QuizType | "mixed") => {
    const q = await generateQuiz(type, 10);
    if (q.length === 0) return;
    sessionIdRef.current = crypto.randomUUID();
    setQuestions(q);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setResults([]);
    setExpandedResult(null);
    setQuizState("playing");
  };

  const handleAnswer = async (answer: string) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(answer);

    const question = questions[currentIndex];
    const isCorrect = answer === question.correctAnswer;

    if (navigator.vibrate) {
      navigator.vibrate(isCorrect ? 50 : [50, 30, 50]);
    }

    const result: QuizResult = { question, userAnswer: answer, isCorrect };
    setResults((prev) => [...prev, result]);

    // Record the attempt with the session ID
    if (question.wordId > 0) {
      await recordQuizAttempt({
        sessionId: sessionIdRef.current,
        wordId: question.wordId,
        word: question.word,
        quizType: question.quizType,
        userAnswer: answer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        attemptedAt: new Date(),
      });
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
    } else {
      setQuizState("results");
      loadStats();
    }
  };

  const backToMenu = () => {
    setQuizState("menu");
    loadStats();
  };

  // --- Playing state ---
  if (quizState === "playing" && questions.length > 0) {
    const question = questions[currentIndex];
    const progress = ((currentIndex + (selectedAnswer ? 1 : 0)) / questions.length) * 100;
    const answered = selectedAnswer !== null;

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {questions.length}
          </span>
          <Badge variant="outline" className="text-xs capitalize">
            {question.quizType}
          </Badge>
        </div>
        <Progress value={progress} className="h-1.5" />

        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            {question.isNewWord && (
              <Badge className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <Sparkles className="h-3 w-3" />
                New Word
              </Badge>
            )}
          </div>

          <h2 className="text-lg font-semibold text-foreground">
            {question.question}
          </h2>

          <div className="space-y-2.5">
            {question.options.map((option, i) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === question.correctAnswer;
              const showResult = answered;

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(option)}
                  disabled={answered}
                  className={cn(
                    "w-full rounded-xl border p-3.5 text-left text-sm transition-all",
                    !showResult &&
                      "hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]",
                    showResult && isCorrect &&
                      "border-success bg-success/10 text-success",
                    showResult && isSelected && !isCorrect &&
                      "border-destructive bg-destructive/10 text-destructive",
                    showResult && !isSelected && !isCorrect &&
                      "opacity-50"
                  )}
                >
                  <span className="mr-2 font-medium text-muted-foreground">
                    {String.fromCharCode(65 + i)})
                  </span>
                  {option}
                </button>
              );
            })}
          </div>

          {answered && question.wordData && (
            <WordCard word={question.wordData} compact />
          )}

          {answered && (
            <Button onClick={nextQuestion} className="w-full rounded-xl">
              {currentIndex < questions.length - 1 ? "Next" : "See Results"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // --- Results state ---
  if (quizState === "results") {
    const correct = results.filter((r) => r.isCorrect).length;
    const total = results.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

    return (
      <div className="space-y-5">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <span className="text-3xl font-bold text-primary">{pct}%</span>
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {correct} / {total} correct
          </h2>
          <p className="text-sm text-muted-foreground">
            {pct >= 80
              ? "Excellent work!"
              : pct >= 60
                ? "Good effort, keep it up!"
                : "Keep practicing, you'll get there!"}
          </p>
        </div>

        <div className="space-y-2">
          {results.map((r, i) => (
            <div key={i}>
              <button
                onClick={() => setExpandedResult(expandedResult === i ? null : i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                  r.isCorrect
                    ? "border-success/20 bg-success/5"
                    : "border-destructive/20 bg-destructive/5"
                )}
              >
                <span className={cn("text-lg", r.isCorrect ? "text-success" : "text-destructive")}>
                  {r.isCorrect ? "✓" : "✗"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{r.question.word}</p>
                  {!r.isCorrect && (
                    <p className="text-xs text-muted-foreground">
                      Correct: {r.question.correctAnswer}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {expandedResult === i ? "▲" : "▼"}
                </span>
              </button>
              {expandedResult === i && r.question.wordData && (
                <div className="mt-2">
                  <WordCard word={r.question.wordData} compact />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={backToMenu} className="flex-1 rounded-xl">
            Back
          </Button>
          <Button
            onClick={() => {
              const incorrectWords = results
                .filter((r) => !r.isCorrect)
                .map((r) => r.question);
              if (incorrectWords.length > 0) {
                sessionIdRef.current = crypto.randomUUID();
                setQuestions(incorrectWords);
                setCurrentIndex(0);
                setSelectedAnswer(null);
                setResults([]);
                setExpandedResult(null);
                setQuizState("playing");
              }
            }}
            disabled={results.every((r) => r.isCorrect)}
            className="flex-1 rounded-xl"
          >
            Review Mistakes
          </Button>
        </div>
      </div>
    );
  }

  // --- Menu state ---
  const canQuiz = wordCount >= 2;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-foreground">Review</h1>

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
            Search at least 2 words to start quizzing
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Choose a quiz mode to test your vocabulary
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => startQuiz("meaning")}
              className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.97]"
            >
              <BookOpen className="h-7 w-7 text-primary" />
              <span className="text-sm font-medium">Meanings</span>
            </button>
            <button
              onClick={() => startQuiz("synonym")}
              className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.97]"
            >
              <ArrowRightLeft className="h-7 w-7 text-chart-2" />
              <span className="text-sm font-medium">Synonyms</span>
            </button>
            <button
              onClick={() => startQuiz("antonym")}
              className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.97]"
            >
              <Brain className="h-7 w-7 text-chart-5" />
              <span className="text-sm font-medium">Antonyms</span>
            </button>
            <button
              onClick={() => startQuiz("mixed")}
              className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.97]"
            >
              <Shuffle className="h-7 w-7 text-chart-1" />
              <span className="text-sm font-medium">Mixed</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
