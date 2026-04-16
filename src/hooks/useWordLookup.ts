import { useState, useCallback } from "react";
import { lookupWord, WordNotFoundError } from "@/lib/api/dictionary";
import { getSynonyms, getAntonyms } from "@/lib/api/datamuse";
import { saveWord, getWord } from "@/lib/db-operations";
import { backgroundPush } from "@/lib/sync";
import type { Word } from "@/lib/db";
import type { DictionaryApiResponse } from "@/lib/api/dictionary";

interface WordLookupState {
  word: Word | null;
  apiResponse: DictionaryApiResponse | null;
  isLoading: boolean;
  error: string | null;
  isFromCache: boolean;
}

export function useWordLookup() {
  const [state, setState] = useState<WordLookupState>({
    word: null,
    apiResponse: null,
    isLoading: false,
    error: null,
    isFromCache: false,
  });

  const lookup = useCallback(async (term: string) => {
    const trimmed = term.trim().toLowerCase();
    if (!trimmed) return;

    setState((s) => ({ ...s, isLoading: true, error: null }));

    // Check local cache first
    const cached = await getWord(trimmed);
    if (cached) {
      setState({
        word: cached,
        apiResponse: null,
        isLoading: false,
        error: null,
        isFromCache: true,
      });
    }

    // Always try to fetch fresh data (updates the cache)
    try {
      const response = await lookupWord(trimmed);

      // Supplement synonyms/antonyms from Datamuse if Dictionary API is sparse
      let extraSynonyms: string[] | undefined;
      let extraAntonyms: string[] | undefined;

      const apiSynonymCount = response.meanings.reduce(
        (count, m) =>
          count +
          m.synonyms.length +
          m.definitions.reduce((c, d) => c + d.synonyms.length, 0),
        0
      );
      const apiAntonymCount = response.meanings.reduce(
        (count, m) =>
          count +
          m.antonyms.length +
          m.definitions.reduce((c, d) => c + d.antonyms.length, 0),
        0
      );

      if (apiSynonymCount < 3 || apiAntonymCount < 1) {
        const [synonyms, antonyms] = await Promise.all([
          apiSynonymCount < 3 ? getSynonyms(trimmed) : Promise.resolve([]),
          apiAntonymCount < 1 ? getAntonyms(trimmed) : Promise.resolve([]),
        ]);
        extraSynonyms = synonyms;
        extraAntonyms = antonyms;
      }

      await saveWord(response, extraSynonyms, extraAntonyms);
      backgroundPush();
      const savedWord = await getWord(trimmed);

      setState({
        word: savedWord ?? null,
        apiResponse: response,
        isLoading: false,
        error: null,
        isFromCache: false,
      });
    } catch (err) {
      if (cached) {
        // We already showed cached data, just stop loading
        setState((s) => ({ ...s, isLoading: false }));
        return;
      }

      if (err instanceof WordNotFoundError) {
        setState({
          word: null,
          apiResponse: null,
          isLoading: false,
          error: `"${trimmed}" was not found. Check the spelling and try again.`,
          isFromCache: false,
        });
      } else {
        setState({
          word: null,
          apiResponse: null,
          isLoading: false,
          error: "Unable to look up word. Check your connection.",
          isFromCache: false,
        });
      }
    }
  }, []);

  const clear = useCallback(() => {
    setState({
      word: null,
      apiResponse: null,
      isLoading: false,
      error: null,
      isFromCache: false,
    });
  }, []);

  return { ...state, lookup, clear };
}
