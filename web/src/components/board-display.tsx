"use client";

import { useMemo, memo, useState, useEffect, useRef, useCallback } from "react";
import { ALL_COLOR_CODES, BOARD_COLORS } from "@/lib/board-colors";

const ROWS = 6;
const COLS = 22;

// All displayable board characters (codes 0-71)
const BOARD_CHARS = [
  ' ',  // 0 - Space
  // A-Z (1-26)
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  // Numbers 1-9 (27-35), 0 (36)
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
  // Special characters (37-62)
  '!', '@', '#', '$', '(', ')', '-', '&', '=', ';', ':',
  "'", '"', '%', ',', '.', '/', '?', '°',
  // Color tiles (63-71) - represented as color codes
  '63', '64', '65', '66', '67', '68', '69', '70', '71'
];

// Backward compatibility alias
const FIESTABOARD_CHARS = BOARD_CHARS;

// Check if a character is a color tile
const isColorTile = (char: string) => {
  return ['63', '64', '65', '66', '67', '68', '69', '70', '71'].includes(char);
};

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
    
    // Convert to uppercase since board only supports uppercase letters
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
    sm: "w-[14px] h-[18px]", // Small previews stay fixed size
    md: "w-[14px] h-[20px] sm:w-[20px] sm:h-[28px] md:w-[24px] md:h-[34px] lg:w-[28px] lg:h-[40px]", // Responsive
    lg: "w-[18px] h-[26px] sm:w-[24px] sm:h-[34px] md:w-[28px] md:h-[40px] lg:w-[32px] lg:h-[46px]", // Responsive
  };
  
  const textSizeClasses = {
    sm: "text-[7px]", // Small previews stay fixed size
    md: "text-[7px] sm:text-[10px] md:text-[13px] lg:text-[16px]", // Responsive
    lg: "text-[10px] sm:text-[13px] md:text-[16px] lg:text-[20px]", // Responsive
  };
  
  // White board inverts character text colors
  const isWhiteBoard = boardType === "white";
  
  if (token.type === "color") {
    const bgColor = ALL_COLOR_CODES[token.code] || BOARD_COLORS.black;
    
    // Responsive margin classes using CSS custom properties
    // For sm size: fixed margins (no responsive needed)
    // For md size: responsive margins matching tile size progression (20px → 28px → 34px → 40px)
    // For lg size: responsive margins matching tile size progression (26px → 34px → 40px → 46px)
    const marginClasses = size === "sm"
      ? "[--color-margin-top:3px] [--color-margin-bottom:4px] [--color-margin-h:1px]"
      : size === "md"
      ? "[--color-margin-top:3px] sm:[--color-margin-top:4px] md:[--color-margin-top:5px] lg:[--color-margin-top:6px] [--color-margin-bottom:4px] sm:[--color-margin-bottom:6px] md:[--color-margin-bottom:7px] lg:[--color-margin-bottom:8px] [--color-margin-h:1px] sm:[--color-margin-h:2px]"
      : "[--color-margin-top:4px] sm:[--color-margin-top:5px] md:[--color-margin-top:6px] lg:[--color-margin-top:8px] [--color-margin-bottom:5px] sm:[--color-margin-bottom:7px] md:[--color-margin-bottom:8px] lg:[--color-margin-bottom:10px] [--color-margin-h:2px] md:[--color-margin-h:3px]";
    
    return (
      <div className={`${sizeClasses[size]} ${marginClasses} flex items-center justify-center`}>
        <div 
          className={`relative rounded-[3px] overflow-hidden`}
          style={{ 
            marginTop: "var(--color-margin-top)",
            marginBottom: "var(--color-margin-bottom)",
            marginLeft: "var(--color-margin-h)",
            marginRight: "var(--color-margin-h)",
            width: "calc(100% - (var(--color-margin-h) * 2))",
            height: "calc(100% - (var(--color-margin-top) + var(--color-margin-bottom)))",
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

// Flip tile for loading state - mimics physical board flip animation
function FlipTile({ 
  rowIdx, 
  colIdx, 
  size = "md", 
  boardType = "black"
}: { 
  rowIdx: number;
  colIdx: number;
  size?: "sm" | "md" | "lg"; 
  boardType?: "black" | "white";
}) {
  const sizeClasses = {
    sm: "w-[14px] h-[18px]", // Small previews stay fixed size
    md: "w-[14px] h-[20px] sm:w-[20px] sm:h-[28px] md:w-[24px] md:h-[34px] lg:w-[28px] lg:h-[40px]", // Responsive
    lg: "w-[18px] h-[26px] sm:w-[24px] sm:h-[34px] md:w-[28px] md:h-[40px] lg:w-[32px] lg:h-[46px]", // Responsive
  };
  
  const textSizeClasses = {
    sm: "text-[7px]", // Small previews stay fixed size
    md: "text-[7px] sm:text-[10px] md:text-[13px] lg:text-[16px]", // Responsive
    lg: "text-[10px] sm:text-[13px] md:text-[16px] lg:text-[20px]", // Responsive
  };
  
  // Generate truly random values using a better hash function
  // Uses multiple prime numbers to break up sequential patterns
  const hash = (rowIdx * 2654435761 + colIdx * 2246822519) ^ (rowIdx * colIdx * 3266489917);
  const randomValue = Math.abs(hash) / 4294967296; // Normalize to 0-1
  
  // Random animation duration between 105-210ms for very fast cycling (30% faster)
  const animationDuration = 105 + Math.floor(randomValue * 105);
  
  // Random negative delay to start at random point in cycle
  const delay = -Math.floor(randomValue * animationDuration);
  
  // Random starting character index
  const hash2 = (rowIdx * 3266489917 + colIdx * 2654435761) ^ (rowIdx + colIdx);
  const startCharIndex = Math.abs(hash2) % BOARD_CHARS.length;
  
  // Cycle through characters - synced with flip animation
  const [charIndex, setCharIndex] = useState(startCharIndex);
  
  // Update character at 50% of animation (when flap is at 90 degrees and edge-on)
  useEffect(() => {
    // Calculate when the first flip will reach 50% (90 degrees)
    const initialDelay = Math.abs(delay) + animationDuration / 2;
    
    let interval: NodeJS.Timeout;
    
    // Set initial timer for first character change
    const initialTimer = setTimeout(() => {
      setCharIndex((prev) => (prev + 1) % BOARD_CHARS.length);
      
      // Then set up recurring interval for subsequent changes
      interval = setInterval(() => {
        setCharIndex((prev) => (prev + 1) % BOARD_CHARS.length);
      }, animationDuration);
    }, initialDelay);
    
    return () => {
      clearTimeout(initialTimer);
      if (interval) clearInterval(interval);
    };
  }, [animationDuration, delay]);
  
  const currentChar = BOARD_CHARS[charIndex];
  const nextChar = BOARD_CHARS[(charIndex + 1) % BOARD_CHARS.length];
  
  const isWhiteBoard = boardType === "white";
  const tileBg = isWhiteBoard ? "#fafafa" : "#0d0d0d";
  const textColor = isWhiteBoard ? "#0d0d0d" : "#f0f0e8";
  
  // Enhanced 3D shadows for flip tile effect
  const boxShadow = isWhiteBoard
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
    <>
      <style>{`
        @keyframes flapRotate {
          0% {
            transform: rotateX(0deg);
          }
          100% {
            transform: rotateX(180deg);
          }
        }
        
        @keyframes flapFade {
          0% {
            opacity: 1;
          }
          40% {
            opacity: 1;
          }
          45% {
            opacity: 0;
          }
          100% {
            opacity: 0;
          }
        }
        
        @keyframes flapShadow {
          0% {
            opacity: 0;
          }
          25% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.8;
          }
          75% {
            opacity: 0.3;
          }
          100% {
            opacity: 0;
          }
        }
        
        @keyframes flapShadowLight {
          0% {
            opacity: 0;
          }
          25% {
            opacity: 0.05;
          }
          50% {
            opacity: 0.15;
          }
          75% {
            opacity: 0.05;
          }
          100% {
            opacity: 0;
          }
        }
        
        @keyframes castShadow {
          0% {
            opacity: 0;
          }
          50% {
            opacity: 0.4;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
      <div 
        className={`relative ${sizeClasses[size]} rounded-[3px] overflow-hidden`}
        style={{ 
          backgroundColor: tileBg,
          boxShadow,
          perspective: '800px',
          // Ensure nothing bleeds through
          isolation: 'isolate'
        }}
      >
        {/* Background layer - shows next character (revealed as flap rotates) */}
        <div 
          className="absolute inset-0 flex flex-col"
          style={{ zIndex: 1 }}
        >
          {/* Top half of next character */}
          <div 
            className="relative flex-1 flex items-end justify-center overflow-hidden"
            style={{ 
              backgroundColor: isColorTile(nextChar) ? ALL_COLOR_CODES[nextChar] || tileBg : tileBg,
              marginLeft: isColorTile(nextChar) ? '-4px' : 0,
              marginRight: isColorTile(nextChar) ? '-4px' : 0
            }}
          >
            {!isColorTile(nextChar) && (
              <span 
                className={`${textSizeClasses[size]} font-mono font-semibold select-none leading-none`}
                style={{ 
                  color: textColor,
                  transform: 'translateY(50%)'
                }}
              >
                {nextChar}
              </span>
            )}
            
            {/* Shadow cast by flipping flap above */}
            <div 
              className="absolute inset-0 bg-black pointer-events-none"
              style={{
                animation: `castShadow ${animationDuration}ms linear infinite`,
                animationDelay: `${delay}ms`
              }}
            />
          </div>
          
          {/* Bottom half of next character */}
          <div 
            className="flex-1 flex items-start justify-center overflow-hidden"
            style={{ 
              backgroundColor: isColorTile(nextChar) ? ALL_COLOR_CODES[nextChar] || tileBg : tileBg,
              marginLeft: isColorTile(nextChar) ? '-4px' : 0,
              marginRight: isColorTile(nextChar) ? '-4px' : 0
            }}
          >
            {!isColorTile(nextChar) && (
              <span 
                className={`${textSizeClasses[size]} font-mono font-semibold select-none leading-none`}
                style={{ 
                  color: textColor,
                  transform: 'translateY(-50%)'
                }}
              >
                {nextChar}
              </span>
            )}
          </div>
        </div>
        
        {/* Current character bottom half - static layer */}
        <div 
          className="absolute bottom-0 flex items-start justify-center overflow-hidden"
          style={{ 
            left: isColorTile(currentChar) ? '-4px' : 0,
            right: isColorTile(currentChar) ? '-4px' : 0,
            height: '50%',
            backgroundColor: isColorTile(currentChar) ? ALL_COLOR_CODES[currentChar] || tileBg : tileBg,
            zIndex: 2
          }}
        >
          {!isColorTile(currentChar) && (
            <span 
              className={`${textSizeClasses[size]} font-mono font-semibold select-none leading-none`}
              style={{ 
                color: textColor,
                transform: 'translateY(-50%)'
              }}
            >
              {currentChar}
            </span>
          )}
        </div>
        
        {/* Rotating flap - top half with current character that flips away */}
        <div 
          className="absolute top-0 left-0 right-0"
          style={{ 
            height: '50%',
            transformStyle: 'preserve-3d',
            transformOrigin: 'bottom center',
            animation: `flapRotate ${animationDuration}ms ease-in-out infinite`,
            animationDelay: `${delay}ms`,
            zIndex: 3,
            willChange: 'transform'
          }}
        >
          {/* Front face of flap - shows current character */}
          <div 
            className="absolute flex items-end justify-center overflow-hidden"
            style={{ 
              top: 0,
              left: isColorTile(currentChar) ? '-4px' : 0,
              right: isColorTile(currentChar) ? '-4px' : 0,
              bottom: 0,
              backgroundColor: isColorTile(currentChar) ? ALL_COLOR_CODES[currentChar] || tileBg : tileBg,
              transformStyle: 'preserve-3d',
              backfaceVisibility: 'hidden',
              boxShadow: isWhiteBoard
                ? '0 3px 6px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.15)'
                : '0 4px 8px rgba(0,0,0,0.7), 0 2px 4px rgba(0,0,0,0.5)',
              opacity: 1
            }}
          >
            {!isColorTile(currentChar) && (
              <>
                {/* Subtle gradient for 3D depth */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: isWhiteBoard 
                      ? 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(0,0,0,0.05) 100%)'
                      : 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.3) 100%)'
                  }}
                />
                
                <span 
                  className={`${textSizeClasses[size]} font-mono font-semibold select-none leading-none relative z-10`}
                  style={{ 
                    color: textColor,
                    transform: 'translateY(50%)'
                  }}
                >
                  {currentChar}
                </span>
              </>
            )}
          </div>
          
          {/* Back face of flap (matches tile background, fully covers what's behind) */}
          <div 
            className="absolute"
            style={{ 
              top: 0,
              left: '-4px',
              right: '-4px',
              bottom: 0,
              backgroundColor: tileBg,
              transformStyle: 'preserve-3d',
              backfaceVisibility: 'hidden',
              transform: 'rotateX(180deg)',
              boxShadow: isWhiteBoard
                ? 'inset 0 2px 4px rgba(0,0,0,0.2)'
                : 'inset 0 2px 4px rgba(0,0,0,0.8)',
              opacity: 1,
              zIndex: 10
            }}
          />
          
          {/* Shadow overlay during flip for extra depth */}
          <div 
            className="absolute inset-0 bg-black pointer-events-none"
            style={{
              animation: isWhiteBoard 
                ? `flapShadowLight ${animationDuration}ms ease-in-out infinite`
                : `flapShadow ${animationDuration}ms ease-in-out infinite`,
              animationDelay: `${delay}ms`,
              zIndex: 20
            }}
          />
        </div>
        
        {/* Center split line with slight elevation */}
        <div 
          className={`absolute top-1/2 left-0 right-0 h-[2px] ${isWhiteBoard ? 'bg-black/30' : 'bg-black/60'}`}
          style={{ 
            zIndex: 10,
            boxShadow: isWhiteBoard 
              ? '0 1px 2px rgba(0,0,0,0.1)' 
              : '0 1px 3px rgba(0,0,0,0.5)',
            transform: 'translateY(-1px)'
          }} 
        />
      </div>
    </>
  );
}

interface BoardDisplayProps {
  message: string | null;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  boardType?: "black" | "white";
}

// Backward compatibility alias
interface FiestaboardDisplayProps extends BoardDisplayProps {}

export const BoardDisplay = memo(function BoardDisplay({ message, isLoading = false, size = "md", className = "", boardType = "black" }: BoardDisplayProps) {
  // Memoize grid calculation to avoid recalculating on every render
  const grid = useMemo(() => {
    console.log('[BoardDisplay] message:', message, 'type:', typeof message, 'isLoading:', isLoading);
    // Handle null (loading state) vs empty string (blank grid)
    const result = message !== null ? messageToGrid(message) : null;
    console.log('[BoardDisplay] grid created:', result !== null, 'grid rows:', result?.length);
    return result;
  }, [message]);
  
  // Increased padding for more pronounced bezel - more vertical space to match real board
  const paddingClasses = {
    sm: "px-3 py-4", // Small previews stay fixed size
    md: "px-2 py-3 sm:px-4 sm:py-6 md:px-5 md:py-8 lg:px-6 lg:py-10", // Responsive
    lg: "px-3 py-4 sm:px-5 sm:py-7 md:px-6 md:py-9 lg:px-8 lg:py-12", // Responsive
  };
  
  // Increased gap for more visible borders between tiles
  const gapClasses = {
    sm: "gap-[3px]", // Small previews stay fixed size
    md: "gap-[2px] sm:gap-[4px] md:gap-[5px]", // Responsive
    lg: "gap-[3px] sm:gap-[5px] md:gap-[6px] lg:gap-[7px]", // Responsive
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

  // Calculate minimum width needed - these are now just used for documentation
  // Actual width is determined by responsive CSS classes on tiles
  // Mobile (base): 22*14 + 21*2 + padding ≈ 360px
  // Tablet (sm): 22*20 + 21*4 + padding ≈ 520px
  // Desktop (md+): 22*24+ + 21*5+ + padding ≈ 620px+

  // Adjust border and corner styles based on size
  const borderClasses = size === "sm" 
    ? "rounded-lg border-[3px]" // Small previews stay fixed
    : "rounded-lg sm:rounded-xl border-[3px] sm:border-[4px] lg:border-[5px]"; // md/lg are responsive

  return (
    <div className={`w-full flex justify-center`}>
      <div 
        className={`${borderClasses} ${className} max-w-full`}
        style={{ 
          backgroundColor: bezelBg,
          borderColor,
          boxShadow,
          width: 'fit-content'
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
          <div 
            className={`flex flex-col ${gapClasses[size]}`}
            style={(isLoading || !grid) ? { perspective: '600px' } : undefined}
          >
            {(isLoading || !grid) ? (
              // Loading or no message - show flip animation grid
              Array.from({ length: ROWS }).map((_, rowIdx) => (
                <div key={rowIdx} className={`flex ${gapClasses[size]} justify-center`}>
                  {Array.from({ length: COLS }).map((_, colIdx) => (
                    <FlipTile 
                      key={colIdx} 
                      rowIdx={rowIdx} 
                      colIdx={colIdx} 
                      size={size} 
                      boardType={boardType}
                    />
                  ))}
                </div>
              ))
            ) : (
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
            )}
          </div>
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

// Backward compatibility alias
export const FiestaboardDisplay = BoardDisplay;

