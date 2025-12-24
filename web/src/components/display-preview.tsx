"use client";

import { usePreview } from "@/hooks/use-vestaboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Send } from "lucide-react";
import { usePublishPreview } from "@/hooks/use-vestaboard";
import { useConfigOverrides } from "@/hooks/use-config-overrides";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const ROWS = 6;
const COLS = 22;

// Vestaboard color codes mapping
// NOTE: Swapped green/blue to match actual physical Vestaboard display
const COLOR_CODES: Record<string, string> = {
  "63": "#eb4034", // Red
  "64": "#f5a623", // Orange
  "65": "#f8e71c", // Yellow
  "66": "#4a90d9", // Blue (shows as blue on physical board)
  "67": "#7ed321", // Green (shows as green on physical board)
  "68": "#9b59b6", // Violet
  "69": "#ffffff", // White
  "70": "#1a1a1a", // Black (same as tile bg)
};

// Parse a line into tokens (characters and color codes)
type Token = { type: "char"; value: string } | { type: "color"; code: string };

function parseLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  
  while (i < line.length) {
    // Check for color code pattern {XX}
    if (line[i] === "{" && i + 3 < line.length && line[i + 3] === "}") {
      const code = line.substring(i + 1, i + 3);
      if (COLOR_CODES[code]) {
        tokens.push({ type: "color", code });
        i += 4;
        continue;
      }
    }
    // Also handle {X} single digit (shouldn't happen but be safe)
    if (line[i] === "{" && i + 2 < line.length && line[i + 2] === "}") {
      const code = line.substring(i + 1, i + 2);
      if (COLOR_CODES[code]) {
        tokens.push({ type: "color", code });
        i += 3;
        continue;
      }
    }
    
    tokens.push({ type: "char", value: line[i] });
    i++;
  }
  
  return tokens;
}

// Convert message string to 6x22 grid of tokens
function messageToGrid(message: string): Token[][] {
  const lines = message.split("\n");
  const grid: Token[][] = [];

  for (let row = 0; row < ROWS; row++) {
    const line = lines[row] || "";
    const tokens = parseLine(line);
    const rowTokens: Token[] = [];
    
    // Fill to COLS width
    for (let col = 0; col < COLS; col++) {
      if (col < tokens.length) {
        rowTokens.push(tokens[col]);
      } else {
        rowTokens.push({ type: "char", value: " " });
      }
    }
    grid.push(rowTokens);
  }

  return grid;
}

// Individual character tile component
function CharTile({ token }: { token: Token }) {
  if (token.type === "color") {
    const bgColor = COLOR_CODES[token.code] || "#1a1a1a";
    return (
      <div 
        className="relative w-[18px] h-[24px] sm:w-[22px] sm:h-[30px] md:w-[26px] md:h-[36px] rounded-[2px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3),inset_0_-1px_1px_rgba(255,255,255,0.1)]"
        style={{ backgroundColor: bgColor }}
      />
    );
  }
  
  return (
    <div className="relative w-[18px] h-[24px] sm:w-[22px] sm:h-[30px] md:w-[26px] md:h-[36px] rounded-[2px] bg-[#1a1a1a] flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.6),inset_0_-1px_1px_rgba(255,255,255,0.05)]">
      <span className="text-[11px] sm:text-[14px] md:text-[18px] font-mono font-medium text-[#f0f0e8] select-none leading-none">
        {token.value}
      </span>
    </div>
  );
}

// Skeleton tile for loading state
function SkeletonTile() {
  return (
    <div className="w-[18px] h-[24px] sm:w-[22px] sm:h-[30px] md:w-[26px] md:h-[36px] rounded-[2px] bg-[#1a1a1a] animate-pulse" />
  );
}

export function DisplayPreview() {
  const { data, isLoading, refetch, isRefetching } = usePreview();
  const publishMutation = usePublishPreview();
  const { getActiveOverrides } = useConfigOverrides();
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Auto-refresh every 5 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => refetch(), 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  const handlePublish = async () => {
    try {
      // Pass current UI overrides so we publish exactly what's shown in the preview
      const overrides = getActiveOverrides();
      const result = await publishMutation.mutateAsync(overrides);
      toast.success(result.message || "Published to Vestaboard!");
    } catch {
      toast.error("Failed to publish to Vestaboard");
    }
  };

  const grid = data ? messageToGrid(data.message) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Display Preview</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Switch
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
                id="auto-refresh"
              />
              <label htmlFor="auto-refresh" className="text-muted-foreground cursor-pointer">
                Auto-refresh
              </label>
            </div>
          </div>
        </div>
        {data && (
          <p className="text-sm text-muted-foreground">
            Type: <span className="capitalize">{data.display_type.replace(/_/g, " ")}</span>
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vestaboard Frame */}
        <div className="bg-[#0a0a0a] p-3 sm:p-4 md:p-5 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] border border-[#2a2a2a]">
          <div className="flex flex-col gap-[3px] sm:gap-[4px]">
            {isLoading ? (
              // Loading skeleton grid
              Array.from({ length: ROWS }).map((_, rowIdx) => (
                <div key={rowIdx} className="flex gap-[2px] sm:gap-[3px] justify-center">
                  {Array.from({ length: COLS }).map((_, colIdx) => (
                    <SkeletonTile key={colIdx} />
                  ))}
                </div>
              ))
            ) : grid ? (
              // Actual character grid
              grid.map((row, rowIdx) => (
                <div key={rowIdx} className="flex gap-[2px] sm:gap-[3px] justify-center">
                  {row.map((token, colIdx) => (
                    <CharTile key={colIdx} token={token} />
                  ))}
                </div>
              ))
            ) : (
              // Error/empty state
              <div className="text-center py-8 text-muted-foreground">
                Unable to load preview
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={publishMutation.isPending || !data}
          >
            <Send className="h-4 w-4 mr-2" />
            {publishMutation.isPending ? "Publishing..." : "Publish to Board"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

