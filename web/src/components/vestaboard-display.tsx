"use client";

const ROWS = 6;
const COLS = 22;

// Vestaboard color codes mapping
const COLOR_CODES: Record<string, string> = {
  "63": "#eb4034", // Red
  "64": "#f5a623", // Orange
  "65": "#f8e71c", // Yellow
  "66": "#7ed321", // Green
  "67": "#4a90d9", // Blue
  "68": "#9b59b6", // Violet
  "69": "#ffffff", // White
  "70": "#1a1a1a", // Black (same as tile bg)
  // Named color aliases
  "red": "#eb4034",
  "orange": "#f5a623",
  "yellow": "#f8e71c",
  "green": "#7ed321",
  "blue": "#4a90d9",
  "violet": "#9b59b6",
  "purple": "#9b59b6",
  "white": "#ffffff",
  "black": "#1a1a1a",
};

// Parse a line into tokens (characters and color codes)
type Token = { type: "char"; value: string } | { type: "color"; code: string };

function parseLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  
  while (i < line.length) {
    // Check for color markers: {63}, {red}, {/red}, {/}
    if (line[i] === "{") {
      const closingBrace = line.indexOf("}", i);
      if (closingBrace !== -1) {
        const content = line.substring(i + 1, closingBrace);
        
        // Check if it's an end tag {/...} or {/}
        if (content.startsWith("/")) {
          // Skip end tags - they don't render anything
          i = closingBrace + 1;
          continue;
        }
        
        // Check if it's a valid color code (numeric or named) - case insensitive
        const contentLower = content.toLowerCase();
        // Try exact match first (for numeric codes like "66"), then lowercase (for named colors)
        let colorCode: string | null = null;
        if (COLOR_CODES[content]) {
          colorCode = content;
        } else if (COLOR_CODES[contentLower]) {
          colorCode = contentLower;
        }
        
        if (colorCode) {
          tokens.push({ type: "color", code: colorCode });
          i = closingBrace + 1;
          continue;
        }
        // If not a valid color, fall through to treat { as regular character
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
function CharTile({ token, size = "md" }: { token: Token; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-[12px] h-[16px]",
    md: "w-[18px] h-[24px] sm:w-[22px] sm:h-[30px] md:w-[26px] md:h-[36px]",
    lg: "w-[22px] h-[30px] sm:w-[26px] sm:h-[36px] md:w-[30px] md:h-[42px]",
  };
  
  const textSizeClasses = {
    sm: "text-[8px]",
    md: "text-[11px] sm:text-[14px] md:text-[18px]",
    lg: "text-[14px] sm:text-[18px] md:text-[22px]",
  };
  
  if (token.type === "color") {
    const bgColor = COLOR_CODES[token.code] || "#1a1a1a";
    return (
      <div 
        className={`relative ${sizeClasses[size]} rounded-[2px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3),inset_0_-1px_1px_rgba(255,255,255,0.1)]`}
        style={{ backgroundColor: bgColor }}
      />
    );
  }
  
  return (
    <div className={`relative ${sizeClasses[size]} rounded-[2px] bg-[#1a1a1a] flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.6),inset_0_-1px_1px_rgba(255,255,255,0.05)]`}>
      <span className={`${textSizeClasses[size]} font-mono font-medium text-[#f0f0e8] select-none leading-none`}>
        {token.value}
      </span>
    </div>
  );
}

// Skeleton tile for loading state
function SkeletonTile({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-[12px] h-[16px]",
    md: "w-[18px] h-[24px] sm:w-[22px] sm:h-[30px] md:w-[26px] md:h-[36px]",
    lg: "w-[22px] h-[30px] sm:w-[26px] sm:h-[36px] md:w-[30px] md:h-[42px]",
  };
  
  return (
    <div className={`${sizeClasses[size]} rounded-[2px] bg-[#1a1a1a] animate-pulse`} />
  );
}

interface VestaboardDisplayProps {
  message: string | null;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function VestaboardDisplay({ message, isLoading = false, size = "md", className = "" }: VestaboardDisplayProps) {
  const grid = message ? messageToGrid(message) : null;
  
  const paddingClasses = {
    sm: "p-2",
    md: "p-3 sm:p-4 md:p-5",
    lg: "p-4 sm:p-5 md:p-6",
  };
  
  const gapClasses = {
    sm: "gap-[2px]",
    md: "gap-[3px] sm:gap-[4px]",
    lg: "gap-[3px] sm:gap-[4px] md:gap-[5px]",
  };

  return (
    <div className={`bg-[#0a0a0a] ${paddingClasses[size]} rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] border border-[#2a2a2a] ${className}`}>
      <div className={`flex flex-col ${gapClasses[size]}`}>
        {isLoading ? (
          // Loading skeleton grid
          Array.from({ length: ROWS }).map((_, rowIdx) => (
            <div key={rowIdx} className={`flex ${gapClasses[size]} justify-center`}>
              {Array.from({ length: COLS }).map((_, colIdx) => (
                <SkeletonTile key={colIdx} size={size} />
              ))}
            </div>
          ))
        ) : grid ? (
          // Actual character grid
          grid.map((row, rowIdx) => (
            <div key={rowIdx} className={`flex ${gapClasses[size]} justify-center`}>
              {row.map((token, colIdx) => (
                <CharTile key={colIdx} token={token} size={size} />
              ))}
            </div>
          ))
        ) : (
          // Error/empty state
          <div className="text-center py-8 text-muted-foreground">
            No preview available
          </div>
        )}
      </div>
    </div>
  );
}

