import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { SearchBar } from "@/components/search/SearchBar";
import { WordCard } from "@/components/search/WordCard";
import { useWordLookup } from "@/hooks/useWordLookup";
import { toast } from "sonner";

export function SearchTab() {
  const { word, isLoading, error, lookup, clear } = useWordLookup();
  const [query, setQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const handledAdd = useRef(false);

  // Handle ?add=word URL param (used by iOS Shortcut & external links)
  useEffect(() => {
    const addWord = searchParams.get("add");
    if (addWord && !handledAdd.current) {
      handledAdd.current = true;
      const cleaned = addWord.trim().toLowerCase();
      setQuery(cleaned);
      lookup(cleaned).then(() => {
        toast.success(`"${cleaned}" saved to your bank`, { duration: 1500 });
      });
      // Clean up the URL
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, lookup, setSearchParams]);

  const handleSearch = useCallback(
    async (term: string) => {
      setQuery(term);
      await lookup(term);
      toast.success("Word saved to your bank", { duration: 1500 });
    },
    [lookup]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    clear();
  }, [clear]);

  return (
    <div className="space-y-4">
      <div className="pt-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Voca<span className="text-primary">Build</span>
        </h1>
        <p className="text-xs text-muted-foreground">
          Look up any word to build your vocabulary
        </p>
      </div>

      <SearchBar
        value={query}
        onChange={setQuery}
        onSearch={handleSearch}
        onClear={handleClear}
      />

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading && !word && (
        <div className="space-y-3">
          <div className="h-8 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="space-y-2 pt-2">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          </div>
        </div>
      )}

      {word && (
        <WordCard word={word} onWordClick={handleSearch} isLoading={isLoading} />
      )}

      {!word && !isLoading && !error && (
        <div className="flex flex-col items-center pt-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <span className="text-3xl">📖</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Search for a word to get started
          </p>
        </div>
      )}
    </div>
  );
}
