import { useState, useEffect } from "react";
import { Sparkles, Lightbulb, Link2 } from "lucide-react";
import { hasGeminiKey, generateMnemonic, generateContextSentences, generateWordConnection } from "@/lib/api/gemini";
import { db } from "@/lib/db";
import type { Word } from "@/lib/db";

interface AiInsightsProps {
  word: Word;
}

export function AiInsights({ word }: AiInsightsProps) {
  const [mnemonic, setMnemonic] = useState<string | null>(word.aiMnemonic ?? null);
  const [sentences, setSentences] = useState<string[] | null>(word.aiSentences ?? null);
  const [connection, setConnection] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasGeminiKey()) return;

    const fetchInsights = async () => {
      setLoading(true);

      // Fetch mnemonic if not cached
      if (!word.aiMnemonic) {
        const m = await generateMnemonic(word.word, word.primaryDefinition);
        if (m) {
          setMnemonic(m);
          if (word.id) {
            await db.words.update(word.id, { aiMnemonic: m });
          }
        }
      }

      // Fetch context sentences if not cached
      if (!word.aiSentences) {
        const s = await generateContextSentences(word.word);
        if (s) {
          setSentences(s);
          if (word.id) {
            await db.words.update(word.id, { aiSentences: s });
          }
        }
      }

      // Word connection (always fresh, not cached)
      const allWords = await db.words.orderBy("searchedAt").reverse().limit(10).toArray();
      const previousWords = allWords
        .filter((w) => w.word !== word.word)
        .map((w) => w.word);
      if (previousWords.length > 0) {
        const c = await generateWordConnection(word.word, previousWords);
        setConnection(c);
      }

      setLoading(false);
    };

    fetchInsights();
  }, [word.word]);

  if (!hasGeminiKey()) return null;

  if (loading && !mnemonic && !sentences) {
    return (
      <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          AI generating insights...
        </div>
      </div>
    );
  }

  if (!mnemonic && !sentences && !connection) return null;

  return (
    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        AI Insights
      </div>

      {mnemonic && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Lightbulb className="h-3 w-3" />
            Memory Tip
          </div>
          <p className="text-sm text-muted-foreground">{mnemonic}</p>
        </div>
      )}

      {sentences && sentences.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">Example Sentences</p>
          {sentences.map((s, i) => (
            <p key={i} className="text-sm italic text-muted-foreground">
              "{s}"
            </p>
          ))}
        </div>
      )}

      {connection && (
        <div className="flex items-start gap-1.5">
          <Link2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
          <p className="text-xs text-muted-foreground">{connection}</p>
        </div>
      )}
    </div>
  );
}
