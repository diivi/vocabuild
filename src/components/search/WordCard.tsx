import { useCallback, useState, useEffect } from "react";
import { Volume2, BookmarkPlus, BookmarkCheck, PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AiInsights } from "./AiInsights";
import { cn } from "@/lib/utils";
import type { Word, UserSentence } from "@/lib/db";
import { addUserSentence, getSentencesForWord } from "@/lib/db-operations";

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
  /** Show a nudge popover above the bookmark icon (e.g. after a wrong answer). */
  showBankNudge?: boolean;
}

export function WordCard({
  word,
  onWordClick,
  isLoading,
  compact,
  onToggleBank,
  isInBank,
  showBankNudge,
}: WordCardProps) {
  const phonetic = word.phonetics.find((p) => p.text)?.text ?? "";
  const audioUrl = word.phonetics.find((p) => p.audio && p.audio.length > 0)?.audio;

  const [savedSentences, setSavedSentences] = useState<UserSentence[]>([]);
  const [sentenceInput, setSentenceInput] = useState("");
  const [sentenceStatus, setSentenceStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    if (!compact && word.id) {
      getSentencesForWord(word.id).then(setSavedSentences);
    }
  }, [word.id, compact]);

  const isSentenceValid =
    sentenceInput.trim().length >= word.word.length + 3 &&
    sentenceInput.toLowerCase().includes(word.word.toLowerCase());

  const handleSaveSentence = useCallback(async () => {
    if (!word.id || !isSentenceValid) return;
    setSentenceStatus("saving");
    await addUserSentence({
      wordId: word.id,
      word: word.word,
      sentence: sentenceInput.trim(),
      isDailyChallenge: false,
    });
    const updated = await getSentencesForWord(word.id);
    setSavedSentences(updated);
    setSentenceInput("");
    setSentenceStatus("saved");
    setTimeout(() => setSentenceStatus("idle"), 2000);
  }, [word.id, word.word, sentenceInput, isSentenceValid]);

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
            <div className="relative">
              {showBankNudge && !isInBank && (
                <div className="absolute bottom-full right-0 mb-2 w-max max-w-[180px] rounded-lg bg-foreground px-2.5 py-1.5 text-center text-[11px] leading-snug text-background shadow-lg">
                  Add to your bank to review later
                  <span className="absolute -bottom-1.5 right-3 block h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-foreground" />
                </div>
              )}
              <button
                onClick={() => onToggleBank(!isInBank)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full transition-colors active:scale-95",
                  isInBank
                    ? "bg-success/15 text-success hover:bg-success/25"
                    : showBankNudge
                      ? "animate-pulse bg-primary/15 text-primary hover:bg-primary/25"
                      : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                )}
                aria-label={isInBank ? "Remove from word bank" : "Add to word bank"}
              >
                {isInBank ? (
                  <BookmarkCheck className="h-5 w-5" />
                ) : (
                  <BookmarkPlus className="h-5 w-5" />
                )}
              </button>
            </div>
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

      {/* Use in a sentence */}
      {!compact && word.id && (
        <div className="space-y-2 border-t pt-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <PenLine className="h-3.5 w-3.5" />
            Your sentences
            <span className="text-muted-foreground/50">(optional)</span>
          </p>

          {savedSentences.length > 0 && (
            <div className="space-y-1.5">
              {savedSentences.map((s) => (
                <p key={s.id} className="text-sm text-foreground/80 italic leading-relaxed">
                  "{s.sentence}"
                </p>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <textarea
              value={sentenceInput}
              onChange={(e) => setSentenceInput(e.target.value)}
              placeholder={`Write a sentence using "${word.word}"…`}
              rows={2}
              className="flex-1 resize-none rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <button
              onClick={handleSaveSentence}
              disabled={!isSentenceValid || sentenceStatus === "saving"}
              className={cn(
                "self-end rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                isSentenceValid
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-muted text-muted-foreground/50 cursor-not-allowed",
                sentenceStatus === "saved" && "bg-success text-success-foreground"
              )}
            >
              {sentenceStatus === "saved" ? "Saved!" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
