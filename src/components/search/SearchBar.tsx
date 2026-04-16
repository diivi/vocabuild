import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getAutocompleteSuggestions } from "@/lib/api/datamuse";
import { searchWords } from "@/lib/db-operations";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (term: string) => void;
  onClear: () => void;
}

export function SearchBar({ value, onChange, onSearch, onClear }: SearchBarProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const isOnline = useOnlineStatus();
  const debouncedValue = useDebounce(value, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const suppressRef = useRef(false);
  // Tracks whether the user is actively typing vs value set programmatically
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!debouncedValue || debouncedValue.length < 2) {
      setSuggestions([]);
      return;
    }

    // Skip fetching if we just selected a word or value was set programmatically
    if (suppressRef.current || !isTypingRef.current) {
      suppressRef.current = false;
      return;
    }

    const fetchSuggestions = async () => {
      if (isOnline) {
        const results = await getAutocompleteSuggestions(debouncedValue);
        setSuggestions(results);
      } else {
        const cached = await searchWords(debouncedValue);
        setSuggestions(cached.slice(0, 8).map((w) => w.word));
      }
      setShowSuggestions(true);
      setActiveIndex(-1);
    };

    fetchSuggestions();
  }, [debouncedValue, isOnline]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (term: string) => {
    suppressRef.current = true;
    isTypingRef.current = false;
    onChange(term);
    setSuggestions([]);
    setShowSuggestions(false);
    onSearch(term);
    inputRef.current?.blur();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      handleSelect(suggestions[activeIndex]);
    } else if (value.trim()) {
      suppressRef.current = true;
      isTypingRef.current = false;
      setSuggestions([]);
      setShowSuggestions(false);
      onSearch(value.trim());
      inputRef.current?.blur();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              isTypingRef.current = true;
              onChange(e.target.value);
            }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search for a word..."
            className="h-11 rounded-xl pl-10 pr-10 text-base"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                onClear();
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border bg-popover shadow-lg">
          {suggestions.map((suggestion, i) => (
            <button
              key={suggestion}
              onClick={() => handleSelect(suggestion)}
              className={cn(
                "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors",
                i === activeIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
            >
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
