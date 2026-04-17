import { useCallback } from "react";
import { Volume2, BookmarkPlus, BookmarkCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AiInsights } from "./AiInsights";
import { cn } from "@/lib/utils";
import type { Word } from "@/lib/db";

interface WordCardProps {
  word: Word;
  onWordClick?: (word: string) => void;
  isLoading?: boolean;
  compact?: boolean;
  /**
   * When provided, renders a small bookmark toggle in the header that flips
   * `inBank` on/off. Pass the current state separately so the caller controls it.
   */
  onToggleBank?: (next: boolean) => void;
  isInBank?: boolean;
}

export function WordCard({
  word,
  onWordClick,
  isLoading,
  compact,
  onToggleBank,
  isInBank,
}: WordCardProps) {
  const phonetic = word.phonetics.find((p) => p.text)?.text ?? "";
  const audioUrl = word.phonetics.find((p) => p.audio && p.audio.length > 0)?.audio;

  const playAudio = useCallback(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => {});
    } else if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(word.word);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  }, [audioUrl, word.word]);

  const maxDefs = compact ? 2 : 3;

  return (
    <div
      className={cn(
        "space-y-4 rounded-2xl border bg-card shadow-sm transition-opacity",
        compact ? "p-4" : "p-5",
        isLoading && "opacity-60"
      )}
    >
      {/* Header: word + phonetic + audio */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className={cn("font-bold text-foreground", compact ? "text-xl" : "text-2xl")}>
            {word.word}
          </h2>
          {phonetic && (
            <p className="text-sm text-muted-foreground">{phonetic}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onToggleBank && (
            <button
              onClick={() => onToggleBank(!isInBank)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-colors active:scale-95",
                isInBank
                  ? "bg-success/15 text-success hover:bg-success/25"
                  : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
              )}
              aria-label={isInBank ? "Remove from word bank" : "Add to word bank"}
              title={isInBank ? "In your bank" : "Add to bank"}
            >
              {isInBank ? (
                <BookmarkCheck className="h-5 w-5" />
              ) : (
                <BookmarkPlus className="h-5 w-5" />
              )}
            </button>
          )}
          <button
            onClick={playAudio}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20 active:scale-95"
            aria-label="Play pronunciation"
          >
            <Volume2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Meanings */}
      {word.meanings.map((meaning, mi) => (
        <div key={mi} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {meaning.partOfSpeech}
          </p>
          <ol className="list-inside list-decimal space-y-2 text-sm text-foreground">
            {meaning.definitions.slice(0, maxDefs).map((def, di) => (
              <li key={di} className="leading-relaxed">
                <span>{def.definition}</span>
                {def.example && (
                  <p className="mt-0.5 pl-5 text-muted-foreground italic">
                    "{def.example}"
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}

      {/* Usage examples section — collect any extras not shown inline */}
      {!compact && word.allExamples.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Usage</p>
          <div className="space-y-1">
            {word.allExamples.slice(0, 3).map((ex, i) => (
              <p key={i} className="text-sm italic text-muted-foreground">
                "{ex}"
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Synonyms */}
      {word.allSynonyms.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Synonyms</p>
          <div className="flex flex-wrap gap-1.5">
            {word.allSynonyms.slice(0, compact ? 5 : 10).map((syn) => (
              <Badge
                key={syn}
                variant="secondary"
                className={cn(
                  onWordClick && "cursor-pointer transition-colors hover:bg-primary/10 hover:text-primary"
                )}
                onClick={() => onWordClick?.(syn)}
              >
                {syn}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Antonyms */}
      {word.allAntonyms.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Antonyms</p>
          <div className="flex flex-wrap gap-1.5">
            {word.allAntonyms.slice(0, compact ? 5 : 10).map((ant) => (
              <Badge
                key={ant}
                variant="outline"
                className={cn(
                  onWordClick && "cursor-pointer transition-colors hover:bg-destructive/10 hover:text-destructive"
                )}
                onClick={() => onWordClick?.(ant)}
              >
                {ant}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* AI Insights */}
      {!compact && <AiInsights word={word} />}
    </div>
  );
}
