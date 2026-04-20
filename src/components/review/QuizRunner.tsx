import { useState, useRef, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { WordCard } from "@/components/search/WordCard";
import { recordQuizAttempt, setWordInBank } from "@/lib/db-operations";
import { backgroundPush } from "@/lib/sync";
import { db } from "@/lib/db";
import type { QuizQuestion } from "@/lib/quiz/quiz-engine";
import { cn } from "@/lib/utils";

export interface QuizResult {
  question: QuizQuestion;
  userAnswer: string;
  isCorrect: boolean;
}

interface QuizRunnerProps {
  questions: QuizQuestion[];
  onFinish: (results: QuizResult[]) => void;
  onExit?: () => void;
  title?: string;
}

export function QuizRunner({ questions, onFinish, onExit, title }: QuizRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [isInBank, setIsInBank] = useState(false);
  const sessionIdRef = useRef("");

  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID();
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setResults([]);
  }, [questions]);

  if (questions.length === 0) return null;

  const question = questions[currentIndex];
  const progress = ((currentIndex + (selectedAnswer ? 1 : 0)) / questions.length) * 100;
  const answered = selectedAnswer !== null;

  const handleAnswer = async (answer: string) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(answer);

    const isCorrect = answer === question.correctAnswer;
    if (navigator.vibrate) navigator.vibrate(isCorrect ? 50 : [50, 30, 50]);

    const result: QuizResult = { question, userAnswer: answer, isCorrect };
    setResults((prev) => [...prev, result]);

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
      // Read current bank status for the toggle
      const row = await db.words.get(question.wordId);
      setIsInBank(row?.inBank === 1);
    } else {
      setIsInBank(false);
    }
  };

  const handleToggleBank = async (next: boolean) => {
    if (!question.wordId) return;
    await setWordInBank(question.wordId, next);
    backgroundPush();
    setIsInBank(next);
  };

  const next = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setIsInBank(false);
    } else {
      onFinish(results);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {title ? `${title} · ` : ""}
          {currentIndex + 1} / {questions.length}
        </span>
        <Badge variant="outline" className="text-xs capitalize">
          {question.quizType}
        </Badge>
      </div>
      <Progress value={progress} className="h-1.5" />

      <div className="space-y-4 pt-2">
        {question.isNewWord && (
          <Badge className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Sparkles className="h-3 w-3" />
            New Word
          </Badge>
        )}

        <h2 className="text-lg font-semibold text-foreground">{question.question}</h2>

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
                  showResult && isCorrect && "border-success bg-success/10 text-success",
                  showResult &&
                    isSelected &&
                    !isCorrect &&
                    "border-destructive bg-destructive/10 text-destructive",
                  showResult && !isSelected && !isCorrect && "opacity-50"
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
          <WordCard
            word={question.wordData}
            compact
            onToggleBank={question.wordId > 0 ? handleToggleBank : undefined}
            isInBank={isInBank}
            showBankNudge={selectedAnswer !== question.correctAnswer && !isInBank && question.wordId > 0}
          />
        )}

        <div className="flex gap-2">
          {onExit && (
            <Button variant="outline" onClick={onExit} className="flex-1 rounded-xl">
              Quit
            </Button>
          )}
          {answered && (
            <Button onClick={next} className="flex-[2] rounded-xl">
              {currentIndex < questions.length - 1 ? "Next" : "See Results"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
