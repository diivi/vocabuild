import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeckMeta, DeckStats } from "@/lib/decks";

interface DeckCardProps {
  deck: DeckMeta;
  wordCount?: number;
  stats?: DeckStats;
}

export function DeckCard({ deck, wordCount, stats }: DeckCardProps) {
  const inBank = stats?.inBank ?? 0;
  const mastered = stats?.mastered ?? 0;
  const total = wordCount ?? stats?.total ?? 0;
  const pct = total > 0 ? Math.min(100, Math.round((mastered / total) * 100)) : 0;

  return (
    <Link
      to={`/deck/${encodeURIComponent(deck.id)}`}
      className={cn(
        "group relative flex items-start gap-3 rounded-xl border bg-card p-3 transition-all",
        "hover:border-primary/40 hover:shadow-sm active:scale-[0.98]"
      )}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl">
        {deck.emoji ?? "📘"}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {deck.title}
            </p>
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {deck.description}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>

        <div className="mt-1.5 flex items-center gap-2 text-[10px]">
          <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">
            {deck.category}
          </span>
          {total > 0 && (
            <span className="text-muted-foreground">{total} words</span>
          )}
          {inBank > 0 && (
            <span className="text-muted-foreground">
              · {inBank} in bank
            </span>
          )}
          {mastered > 0 && (
            <span className="text-success">· {pct}% mastered</span>
          )}
          {deck.isCustom && (
            <span className="ml-auto rounded-full bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
              Custom
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
