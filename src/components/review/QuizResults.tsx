import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WordCard } from "@/components/search/WordCard";
import { cn } from "@/lib/utils";
import type { QuizResult } from "./QuizRunner";

interface QuizResultsProps {
  results: QuizResult[];
  onBack: () => void;
  onRetryMistakes?: (mistakes: QuizResult[]) => void;
  retryLabel?: string;
}

export function QuizResults({
  results,
  onBack,
  onRetryMistakes,
  retryLabel = "Review Mistakes",
}: QuizResultsProps) {
  const [expandedResult, setExpandedResult] = useState<number | null>(null);

  const correct = results.filter((r) => r.isCorrect).length;
  const total = results.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const allCorrect = results.every((r) => r.isCorrect);

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
              onClick={() =>
                setExpandedResult(expandedResult === i ? null : i)
              }
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                r.isCorrect
                  ? "border-success/20 bg-success/5"
                  : "border-destructive/20 bg-destructive/5"
              )}
            >
              <span
                className={cn(
                  "text-lg",
                  r.isCorrect ? "text-success" : "text-destructive"
                )}
              >
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
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 rounded-xl"
        >
          Back
        </Button>
        {onRetryMistakes && (
          <Button
            onClick={() =>
              onRetryMistakes(results.filter((r) => !r.isCorrect))
            }
            disabled={allCorrect}
            className="flex-1 rounded-xl"
          >
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
