import { useEffect, useState, useCallback } from "react";
import { Layers } from "lucide-react";
import { DeckCard } from "./DeckCard";
import { CreateDeckDialog } from "./CreateDeckDialog";
import {
  getAllDeckMetas,
  loadDeck,
  getStatsForDecks,
  type DeckMeta,
  type DeckStats,
} from "@/lib/decks";

interface EnrichedDeck {
  meta: DeckMeta;
  wordCount: number;
  stats?: DeckStats;
}

export function DecksSection() {
  const [decks, setDecks] = useState<EnrichedDeck[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const metas = await getAllDeckMetas();

      // Load each deck's word list (cheap: just reads the .md file / IDB row).
      const loaded = await Promise.all(
        metas.map(async (meta) => {
          try {
            const deck = await loadDeck(meta.id);
            return { meta, words: deck.words };
          } catch {
            return { meta, words: [] as string[] };
          }
        })
      );

      // Compute stats for all decks in one pass.
      const statsMap = await getStatsForDecks(
        loaded.map((d) => ({ id: d.meta.id, words: d.words }))
      );

      setDecks(
        loaded.map(({ meta, words }) => ({
          meta,
          wordCount: words.length,
          stats: statsMap.get(meta.id),
        }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Layers className="h-4 w-4 text-primary" />
          Decks
        </h2>
      </div>

      {loading && decks.length === 0 ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-muted/50"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <CreateDeckDialog onCreated={refresh} />

          {decks.map(({ meta, wordCount, stats }) => (
            <DeckCard
              key={meta.id}
              deck={meta}
              wordCount={wordCount}
              stats={stats}
            />
          ))}
        </div>
      )}
    </section>
  );
}
