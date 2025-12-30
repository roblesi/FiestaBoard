"use client";

import { useMemo, memo } from "react";
import { ALL_COLOR_CODES, VESTABOARD_COLORS } from "@/lib/vestaboard-colors";

const ROWS = 6;
const COLS = 22;

// Parse a line into tokens (characters and color codes)
type Token = { type: "char"; value: string } | { type: "color"; code: string };

function parseLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  
  while (i < line.length) {
    // Check for single-bracket color markers: {63}, {red}, {/red}, {/}
    // (After template rendering, colors are normalized to single brackets)
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
        if (ALL_COLOR_CODES[content]) {
          colorCode = content;
        } else if (ALL_COLOR_CODES[contentLower]) {
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
    
    // Convert to uppercase since Vestaboard only supports uppercase letters
    tokens.push({ type: "char", value: line[i].toUpperCase() });
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

// Memoized grid row component to prevent row-level re-renders
const GridRow = memo(function GridRow({ 
  row, 
  rowIdx, 
  size, 
  gapClass,
  boardType = "black"
}: { 
  row: Token[]; 
  rowIdx: number; 
  size: "sm" | "md" | "lg"; 
  gapClass: string;
  boardType?: "black" | "white";
}) {
  return (
    <div className={`flex ${gapClass} justify-center`}>
      {row.map((token, colIdx) => (
        <CharTile key={`col-${rowIdx}-${colIdx}`} token={token} size={size} boardType={boardType} />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if row data changes
  if (prevProps.row.length !== nextProps.row.length) return false;
  if (prevProps.size !== nextProps.size) return false;
  if (prevProps.gapClass !== nextProps.gapClass) return false;
  if (prevProps.boardType !== nextProps.boardType) return false;
  
  // Deep compare tokens
  for (let i = 0; i < prevProps.row.length; i++) {
    const prevToken = prevProps.row[i];
    const nextToken = nextProps.row[i];
    if (prevToken.type !== nextToken.type) return false;
    if (prevToken.type === "char" && prevToken.value !== nextToken.value) return false;
    if (prevToken.type === "color" && prevToken.code !== nextToken.code) return false;
  }
  
  return true; // Rows are equal, don't re-render
});

// Individual character tile component - memoized to prevent unnecessary re-renders
const CharTile = memo(function CharTile({ token, size = "md", boardType = "black" }: { token: Token; size?: "sm" | "md" | "lg"; boardType?: "black" | "white" }) {
  const sizeClasses = {
    sm: "w-[14px] h-[18px]",
    md: "w-[20px] h-[28px] sm:w-[24px] sm:h-[34px] md:w-[28px] md:h-[40px]",
    lg: "w-[24px] h-[34px] sm:w-[28px] sm:h-[40px] md:w-[32px] md:h-[46px]",
  };
  
  const textSizeClasses = {
    sm: "text-[7px]",
    md: "text-[10px] sm:text-[13px] md:text-[16px]",
    lg: "text-[13px] sm:text-[16px] md:text-[20px]",
  };
  
  // White board inverts character text colors
  const isWhiteBoard = boardType === "white";
  
  if (token.type === "color") {
    const bgColor = ALL_COLOR_CODES[token.code] || VESTABOARD_COLORS.black;
    
    // Size-responsive margins for color blocks
    const colorMargins = {
      sm: { top: 3, bottom: 4, horizontal: 1 },
      md: { top: 6, bottom: 8, horizontal: 2 },
      lg: { top: 8, bottom: 10, horizontal: 3 },
    };
    
    const margins = colorMargins[size];
    const totalVertical = margins.top + margins.bottom;
    const totalHorizontal = margins.horizontal * 2;
    
    return (
      <div className={`${sizeClasses[size]} flex items-center justify-center`}>
        <div 
          className={`relative rounded-[3px] overflow-hidden`}
          style={{ 
            marginTop: `${margins.top}px`,
            marginBottom: `${margins.bottom}px`,
            marginLeft: `${margins.horizontal}px`,
            marginRight: `${margins.horizontal}px`,
            width: `calc(100% - ${totalHorizontal}px)`,
            height: `calc(100% - ${totalVertical}px)`,
            backgroundColor: bgColor,
            boxShadow: `
              0 2px 4px rgba(0,0,0,0.3),
              inset 0 1px 1px rgba(255,255,255,0.15),
              inset 0 -1px 1px rgba(0,0,0,0.25),
              inset 1px 0 1px rgba(255,255,255,0.1),
              inset -1px 0 1px rgba(0,0,0,0.2)
            `
          }}
        >
          {/* Subtle split flip effect */}
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-black/10" />
        </div>
      </div>
    );
  }
  
  // Character tile styling depends on board type
  const isWhite = isWhiteBoard;
  const tileBg = isWhite ? "#fafafa" : "#0d0d0d";
  const textColor = isWhite ? "#0d0d0d" : "#f0f0e8";
  
  // Enhanced 3D shadows for flip tile effect
  const boxShadow = isWhite
    ? `
      0 2px 4px rgba(0,0,0,0.2),
      inset 0 1px 2px rgba(0,0,0,0.1),
      inset 0 -1px 2px rgba(255,255,255,0.5),
      inset 1px 0 1px rgba(0,0,0,0.08),
      inset -1px 0 1px rgba(255,255,255,0.4)
    `
    : `
      0 2px 4px rgba(0,0,0,0.5),
      inset 0 1px 2px rgba(0,0,0,0.8),
      inset 0 -1px 1px rgba(255,255,255,0.08),
      inset 1px 0 1px rgba(0,0,0,0.5),
      inset -1px 0 1px rgba(255,255,255,0.05)
    `;
  
  return (
    <div 
      className={`relative ${sizeClasses[size]} rounded-[3px] flex items-center justify-center overflow-hidden`}
      style={{ 
        backgroundColor: tileBg,
        boxShadow
      }}
    >
      {/* Subtle split flip effect - horizontal line in middle */}
      <div className={`absolute top-1/2 left-0 right-0 h-[1px] ${isWhite ? 'bg-black/10' : 'bg-black/30'}`} />
      
      {/* Subtle gradient for curvature */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isWhite 
            ? 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(0,0,0,0.05) 100%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)'
        }}
      />
      
      <span 
        className={`${textSizeClasses[size]} font-mono font-semibold select-none leading-none relative z-10`}
        style={{ color: textColor }}
      >
        {token.value}
      </span>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if token, size, or boardType changes
  return prevProps.token.type === nextProps.token.type &&
         (prevProps.token.type === "char" 
           ? prevProps.token.value === nextProps.token.value
           : prevProps.token.code === nextProps.token.code) &&
         prevProps.size === nextProps.size &&
         prevProps.boardType === nextProps.boardType;
});

// Skeleton tile for loading state - memoized
const SkeletonTile = memo(function SkeletonTile({ size = "md", boardType = "black" }: { size?: "sm" | "md" | "lg"; boardType?: "black" | "white" }) {
  const sizeClasses = {
    sm: "w-[14px] h-[18px]",
    md: "w-[20px] h-[28px] sm:w-[24px] sm:h-[34px] md:w-[28px] md:h-[40px]",
    lg: "w-[24px] h-[34px] sm:w-[28px] sm:h-[40px] md:w-[32px] md:h-[46px]",
  };
  
  const tileBg = boardType === "white" ? "bg-[#fafafa]" : "bg-[#0d0d0d]";
  
  return (
    <div className={`${sizeClasses[size]} rounded-[3px] ${tileBg} animate-pulse`} />
  );
});

interface VestaboardDisplayProps {
  message: string | null;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  boardType?: "black" | "white";
}

export const VestaboardDisplay = memo(function VestaboardDisplay({ message, isLoading = false, size = "md", className = "", boardType = "black" }: VestaboardDisplayProps) {
  // Memoize grid calculation to avoid recalculating on every render
  const grid = useMemo(() => {
    return message ? messageToGrid(message) : null;
  }, [message]);
  
  // Increased padding for more pronounced bezel - more vertical space to match real board
  const paddingClasses = {
    sm: "px-3 py-4",
    md: "px-4 py-6 sm:px-5 sm:py-8 md:px-6 md:py-10",
    lg: "px-5 py-7 sm:px-6 sm:py-9 md:px-8 md:py-12",
  };
  
  // Increased gap for more visible borders between tiles
  const gapClasses = {
    sm: "gap-[3px]",
    md: "gap-[4px] sm:gap-[5px]",
    lg: "gap-[5px] sm:gap-[6px] md:gap-[7px]",
  };

  // White board has light bezel and border
  const isWhiteBoard = boardType === "white";
  const bezelBg = isWhiteBoard ? "#f8f8f8" : "#050505";
  const borderColor = isWhiteBoard ? "#d8d8d8" : "#1a1a1a";
  
  // Enhanced shadow for depth
  const boxShadow = isWhiteBoard
    ? `
      0 8px 32px rgba(0,0,0,0.12),
      0 4px 16px rgba(0,0,0,0.08),
      inset 0 1px 2px rgba(255,255,255,0.9),
      inset 0 0 0 1px rgba(255,255,255,0.5)
    `
    : `
      0 8px 32px rgba(0,0,0,0.6),
      0 4px 16px rgba(0,0,0,0.4),
      inset 0 1px 1px rgba(255,255,255,0.08),
      inset 0 0 0 1px rgba(255,255,255,0.03)
    `;

  return (
    <div 
      className={`rounded-xl border-[5px] overflow-hidden ${className}`}
      style={{ 
        backgroundColor: bezelBg,
        borderColor,
        boxShadow
      }}
    >
      {/* Inner bezel border */}
      <div 
        className={`${paddingClasses[size]} relative`}
        style={{
          background: isWhiteBoard
            ? 'linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)'
            : 'linear-gradient(135deg, #0a0a0a 0%, #000000 100%)'
        }}
      >
        <div className={`flex flex-col ${gapClasses[size]}`}>
          {isLoading ? (
            // Loading skeleton grid
            Array.from({ length: ROWS }).map((_, rowIdx) => (
              <div key={rowIdx} className={`flex ${gapClasses[size]} justify-center`}>
                {Array.from({ length: COLS }).map((_, colIdx) => (
                  <SkeletonTile key={colIdx} size={size} boardType={boardType} />
                ))}
              </div>
            ))
          ) : grid ? (
            // Actual character grid - memoize rows to prevent row-level re-renders
            grid.map((row, rowIdx) => (
              <GridRow 
                key={`row-${rowIdx}`} 
                row={row} 
                rowIdx={rowIdx} 
                size={size} 
                gapClass={gapClasses[size]} 
                boardType={boardType}
              />
            ))
          ) : (
            // Error/empty state
            <div className="text-center py-8 text-muted-foreground">
              No preview available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if message, isLoading, size, className, or boardType changes
  return prevProps.message === nextProps.message &&
         prevProps.isLoading === nextProps.isLoading &&
         prevProps.size === nextProps.size &&
         prevProps.className === nextProps.className &&
         prevProps.boardType === nextProps.boardType;
});

