"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, Loader2, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { api, StockSymbol, StockSymbolValidation } from "@/lib/api";

interface StockSymbolInputProps {
  selectedSymbols: string[];
  onSymbolsChange: (symbols: string[]) => void;
  maxSymbols?: number;
}

export function StockSymbolInput({
  selectedSymbols,
  onSymbolsChange,
  maxSymbols = 5,
}: StockSymbolInputProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<StockSymbol[]>([]);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.searchStockSymbols(query.trim(), 10);
        setSuggestions(result.symbols);
        setShowSuggestions(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to search symbols");
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleAddSymbol = useCallback(async (symbol: StockSymbol) => {
    // Check if already selected
    if (selectedSymbols.includes(symbol.symbol)) {
      setError(`${symbol.symbol} is already selected`);
      return;
    }

    // Check if at max
    if (selectedSymbols.length >= maxSymbols) {
      setError(`Maximum ${maxSymbols} symbols allowed`);
      return;
    }

    // Validate symbol before adding
    setValidating(symbol.symbol);
    setError(null);

    try {
      const validation = await api.validateStockSymbol(symbol.symbol);
      
      if (validation.valid) {
        onSymbolsChange([...selectedSymbols, symbol.symbol]);
        setQuery("");
        setSuggestions([]);
        setShowSuggestions(false);
        setError(null);
      } else {
        setError(validation.error || `Invalid symbol: ${symbol.symbol}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to validate symbol");
    } finally {
      setValidating(null);
    }
  }, [selectedSymbols, maxSymbols, onSymbolsChange]);

  const handleRemoveSymbol = (symbol: string) => {
    onSymbolsChange(selectedSymbols.filter(s => s !== symbol));
  };

  const handleManualAdd = async () => {
    const symbol = query.trim().toUpperCase();
    if (!symbol) {
      setError("Please enter a symbol");
      return;
    }

    if (selectedSymbols.includes(symbol)) {
      setError(`${symbol} is already selected`);
      return;
    }

    if (selectedSymbols.length >= maxSymbols) {
      setError(`Maximum ${maxSymbols} symbols allowed`);
      return;
    }

    // Validate before adding
    setValidating(symbol);
    setError(null);

    try {
      const validation = await api.validateStockSymbol(symbol);
      
      if (validation.valid) {
        onSymbolsChange([...selectedSymbols, symbol]);
        setQuery("");
        setSuggestions([]);
        setShowSuggestions(false);
        setError(null);
      } else {
        setError(validation.error || `Invalid symbol: ${symbol}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to validate symbol");
    } finally {
      setValidating(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Selected symbols */}
      {selectedSymbols.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedSymbols.map((symbol) => (
            <Badge
              key={symbol}
              variant="secondary"
              className="flex items-center gap-2 px-3 py-1.5"
            >
              <TrendingUp className="h-3 w-3" />
              <span className="font-mono">{symbol}</span>
              <button
                type="button"
                onClick={() => handleRemoveSymbol(symbol)}
                className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                aria-label={`Remove ${symbol}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for stock symbol (e.g., GOOG, AAPL)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
            }}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            onBlur={() => {
              // Delay to allow click on suggestion
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            className="pl-9 pr-20"
            disabled={selectedSymbols.length >= maxSymbols}
          />
          {loading && (
            <Loader2 className="absolute right-12 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {validating && (
            <Loader2 className="absolute right-12 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleManualAdd}
            disabled={!query.trim() || loading || validating || selectedSymbols.length >= maxSymbols}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-3 text-xs"
          >
            Add
          </Button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.symbol}
                type="button"
                onClick={() => handleAddSymbol(suggestion)}
                disabled={selectedSymbols.includes(suggestion.symbol) || selectedSymbols.length >= maxSymbols}
                className={cn(
                  "w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors",
                  "flex items-center justify-between",
                  (selectedSymbols.includes(suggestion.symbol) || selectedSymbols.length >= maxSymbols) && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono font-semibold">{suggestion.symbol}</span>
                  <span className="text-sm text-muted-foreground">{suggestion.name}</span>
                </div>
                {selectedSymbols.includes(suggestion.symbol) && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Help text */}
      <p className="text-sm text-muted-foreground">
        {selectedSymbols.length >= maxSymbols
          ? `Maximum ${maxSymbols} symbols selected`
          : `Search and select up to ${maxSymbols} stock symbols. Symbols are validated before being added.`}
      </p>
    </div>
  );
}

