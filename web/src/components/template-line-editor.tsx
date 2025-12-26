"use client";

import { useRef, useEffect, useCallback, useState, useLayoutEffect, KeyboardEvent, DragEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VESTABOARD_COLORS } from "@/lib/vestaboard-colors";

// Segment types for parsed template
export type SegmentType = "text" | "variable" | "color";

export interface Segment {
  type: SegmentType;
  value: string; // Raw value: "{{weather.temp}}" or "{{blue}}" or "plain text"
  display: string; // Display text: "weather.temp" or "blue" or "plain text"
}

// Cursor position as character offset in the template string
// Special values: -1 = before all content, Infinity = after all content
type CursorCharPosition = number;

// Color name to CSS color mapping with contrast info - uses Vestaboard's official colors
const COLOR_MAP: Record<string, { bg: string; needsDarkX: boolean }> = {
  red: { bg: VESTABOARD_COLORS.red, needsDarkX: false },
  orange: { bg: VESTABOARD_COLORS.orange, needsDarkX: false },
  yellow: { bg: VESTABOARD_COLORS.yellow, needsDarkX: true },
  green: { bg: VESTABOARD_COLORS.green, needsDarkX: true },
  blue: { bg: VESTABOARD_COLORS.blue, needsDarkX: false },
  violet: { bg: VESTABOARD_COLORS.violet, needsDarkX: false },
  white: { bg: VESTABOARD_COLORS.white, needsDarkX: true },
  black: { bg: VESTABOARD_COLORS.black, needsDarkX: false },
};

// Known color names for parsing
const KNOWN_COLORS = new Set(Object.keys(COLOR_MAP));

/**
 * Parse a template string into segments
 * Handles: {{variable}}, {{color}}, and plain text
 */
export function parseTemplate(template: string): Segment[] {
  const segments: Segment[] = [];
  let remaining = template;

  while (remaining.length > 0) {
    // Try to match a double-bracket token {{...}}
    const doubleMatch = remaining.match(/^\{\{([^}]+)\}\}/);
    if (doubleMatch) {
      const content = doubleMatch[1];
      
      // Check if it's a color
      if (KNOWN_COLORS.has(content.toLowerCase())) {
        segments.push({
          type: "color",
          value: doubleMatch[0],
          display: content.toLowerCase(),
        });
      } else {
        // It's a variable
        segments.push({
          type: "variable",
          value: doubleMatch[0],
          display: content,
        });
      }
      remaining = remaining.slice(doubleMatch[0].length);
      continue;
    }

    // Find the next special token
    const nextToken = remaining.indexOf("{{");

    if (nextToken === -1) {
      // No more tokens, rest is plain text
      if (remaining.length > 0) {
        segments.push({
          type: "text",
          value: remaining,
          display: remaining,
        });
      }
      break;
    } else if (nextToken === 0) {
      // Token is at start but didn't match (shouldn't happen, but handle gracefully)
      segments.push({
        type: "text",
        value: remaining[0],
        display: remaining[0],
      });
      remaining = remaining.slice(1);
    } else {
      // Plain text before next token
      segments.push({
        type: "text",
        value: remaining.slice(0, nextToken),
        display: remaining.slice(0, nextToken),
      });
      remaining = remaining.slice(nextToken);
    }
  }

  return segments;
}

/**
 * Convert segments back to template string
 */
export function segmentsToString(segments: Segment[]): string {
  return segments.map((s) => s.value).join("");
}

interface TemplateBadgeProps {
  segment: Segment;
  onDelete: () => void;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: (e: DragEvent) => void;
  isDragging?: boolean;
}

function TemplateBadge({
  segment,
  onDelete,
  onDragStart,
  onDragEnd,
  isDragging,
}: TemplateBadgeProps) {
  const isColor = segment.type === "color";
  const colorInfo = isColor ? COLOR_MAP[segment.display] : undefined;

  // Color badges: solid color pill with just X (wider to feel like it has content)
  if (isColor && colorInfo) {
    return (
      <span
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        contentEditable={false}
        data-badge="true"
        data-segment-type="color"
        data-segment-value={segment.value}
        style={{ backgroundColor: colorInfo.bg }}
        className={cn(
          "inline-flex items-center justify-end rounded-full w-8 h-5 px-1 cursor-grab select-none",
          "transition-all duration-150 hover:scale-110",
          isDragging && "opacity-50 cursor-grabbing"
        )}
      >
        {/* Hidden text for screen readers */}
        <span className="sr-only">{segment.display} color</span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className={cn(
            "rounded-full p-0.5 transition-colors",
            colorInfo.needsDarkX 
              ? "text-black/70 hover:text-black hover:bg-black/10" 
              : "text-white/80 hover:text-white hover:bg-white/20"
          )}
          tabIndex={-1}
          aria-label={`Remove ${segment.display} color`}
        >
          <X className="w-3 h-3" />
        </button>
      </span>
    );
  }

  // Variable badges: keep existing style
  return (
    <span
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      contentEditable={false}
      data-badge="true"
      data-segment-type="variable"
      data-segment-value={segment.value}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium cursor-grab select-none",
        "border transition-all duration-150",
        "bg-indigo-500/15 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/25",
        isDragging && "opacity-50 cursor-grabbing"
      )}
    >
      <span className="font-mono">{segment.display}</span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
        className="ml-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 -mr-1"
        tabIndex={-1}
        aria-label={`Remove ${segment.display} variable`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// Drop zone component - invisible until drag hover
interface DropZoneProps {
  isActive: boolean;
  position: "before" | "after" | "between";
  onDrop: (e: DragEvent<HTMLSpanElement>) => void;
  onDragOver: (e: DragEvent<HTMLSpanElement>) => void;
  onDragEnter: (e: DragEvent<HTMLSpanElement>) => void;
  onDragLeave: (e: DragEvent<HTMLSpanElement>) => void;
}

function DropZone({ isActive, position, onDrop, onDragOver, onDragEnter, onDragLeave }: DropZoneProps) {
  return (
    <span
      data-dropzone="true"
      data-position={position}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      contentEditable={false}
      className={cn(
        "inline-block align-middle transition-all duration-150 pointer-events-auto",
        isActive
          ? "w-1.5 h-5 bg-sky-400 dark:bg-sky-300 rounded-sm mx-0.5 shadow-[0_0_8px_2px_rgba(56,189,248,0.6)] dark:shadow-[0_0_10px_3px_rgba(125,211,252,0.8)]"
          : "w-0"
      )}
    />
  );
}

interface TemplateLineEditorProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  isActive?: boolean;
  hasWarning?: boolean;
  className?: string;
}

export function TemplateLineEditor({
  value,
  onChange,
  onFocus,
  placeholder,
  isActive,
  hasWarning,
  className,
}: TemplateLineEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const segmentsRef = useRef<Segment[]>([]);
  const dragIndexRef = useRef<number | null>(null);
  const isComposingRef = useRef(false);
  
  // Track cursor position as character offset in template string
  const cursorCharPosRef = useRef<CursorCharPosition | null>(null);
  const shouldRestoreCursorRef = useRef(false);
  
  // Track which drop zone is active during drag
  const [activeDropZone, setActiveDropZone] = useState<number | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  
  // Track which specific cursor anchor has the cursor (for visual feedback)
  // Stores the data-anchor-position value of the active anchor element
  const [activeCursorAnchor, setActiveCursorAnchor] = useState<string | null>(null);

  // Parse value into segments
  const segments = parseTemplate(value);
  segmentsRef.current = segments;

  // Calculate character position in template string from DOM position
  const saveCursorPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!container.contains(range.startContainer)) return;

    const { startContainer, startOffset } = range;
    let charPos = 0;
    let foundCursor = false;

    // Walk through DOM to calculate character position
    const walkNode = (node: Node): boolean => {
      if (foundCursor) return true;

      if (node === startContainer) {
        foundCursor = true;
        if (node.nodeType === Node.TEXT_NODE) {
          // Count real characters (not zero-width spaces) up to cursor
          const text = node.textContent?.slice(0, startOffset) || "";
          charPos += text.replace(/\u200B/g, "").length;
        }
        return true;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        charPos += text.replace(/\u200B/g, "").length;
      } else if (node instanceof HTMLElement) {
        if (node.dataset.badge === "true") {
          // Badge - add its template value length
          const segmentValue = node.dataset.segmentValue || "";
          charPos += segmentValue.length;
        } else if (node.dataset.dropzone === "true") {
          // Skip drop zones
        } else if (node.dataset.cursorAnchor === "true") {
          // Cursor anchor - check if cursor is inside
          for (const child of Array.from(node.childNodes)) {
            if (walkNode(child)) {
              return true;
            }
          }
        } else if (node.dataset.textSegment === "true") {
          // Text segment span - walk its children
          for (const child of Array.from(node.childNodes)) {
            if (walkNode(child)) return true;
          }
        } else {
          // Other elements - walk children
          for (const child of Array.from(node.childNodes)) {
            if (walkNode(child)) return true;
          }
        }
      }
      return false;
    };

    // Walk container children
    for (const child of Array.from(container.childNodes)) {
      if (walkNode(child)) break;
    }

    cursorCharPosRef.current = charPos;
  }, []);

  // Restore cursor position after render using character position
  const restoreCursorPosition = useCallback(() => {
    const container = containerRef.current;
    const targetCharPos = cursorCharPosRef.current;
    if (!container || targetCharPos === null) return;

    const selection = window.getSelection();
    if (!selection) return;

    let charPos = 0;
    let targetNode: Node | null = null;
    let targetOffset = 0;

    // Walk through DOM to find the position
    const findPosition = (node: Node): boolean => {
      if (node instanceof HTMLElement && node.dataset.dropzone === "true") {
        return false;
      }

      if (node instanceof HTMLElement && node.dataset.cursorAnchor === "true") {
        // Cursor anchor - if target is here, position in the text node
        const textNode = node.firstChild;
        if (textNode?.nodeType === Node.TEXT_NODE && charPos === targetCharPos) {
          targetNode = textNode;
          // Position after zero-width space if at start, before if at end
          targetOffset = charPos === 0 ? 1 : 0;
          return true;
        }
        return false;
      }

      if (node instanceof HTMLElement && node.dataset.textSegment === "true") {
        const textNode = node.firstChild;
        if (textNode?.nodeType === Node.TEXT_NODE) {
          const text = textNode.textContent?.replace(/\u200B/g, "") || "";
          if (charPos + text.length >= targetCharPos) {
            targetNode = textNode;
            targetOffset = targetCharPos - charPos;
            // Adjust for any zero-width spaces
            const fullText = textNode.textContent || "";
            let realOffset = 0;
            let actualOffset = 0;
            while (realOffset < targetOffset && actualOffset < fullText.length) {
              if (fullText[actualOffset] !== '\u200B') {
                realOffset++;
              }
              actualOffset++;
            }
            targetOffset = actualOffset;
            return true;
          }
          charPos += text.length;
        }
        return false;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.replace(/\u200B/g, "") || "";
        if (charPos + text.length >= targetCharPos) {
          targetNode = node;
          targetOffset = targetCharPos - charPos;
          // Adjust for any zero-width spaces
          const fullText = node.textContent || "";
          let realOffset = 0;
          let actualOffset = 0;
          while (realOffset < targetOffset && actualOffset < fullText.length) {
            if (fullText[actualOffset] !== '\u200B') {
              realOffset++;
            }
            actualOffset++;
          }
          targetOffset = actualOffset;
          return true;
        }
        charPos += text.length;
      } else if (node instanceof HTMLElement && node.dataset.badge === "true") {
        const segmentValue = node.dataset.segmentValue || "";
        if (charPos + segmentValue.length > targetCharPos) {
          // Target is within this badge - position after it
          const nextSibling = node.nextSibling;
          if (nextSibling instanceof HTMLElement && nextSibling.dataset.cursorAnchor === "true") {
            const textNode = nextSibling.firstChild;
            if (textNode?.nodeType === Node.TEXT_NODE) {
              targetNode = textNode;
              targetOffset = 0;
              return true;
            }
          }
        }
        charPos += segmentValue.length;
      } else if (node instanceof HTMLElement) {
        for (const child of Array.from(node.childNodes)) {
          if (findPosition(child)) return true;
        }
      }
      return false;
    };

    for (const child of Array.from(container.childNodes)) {
      if (findPosition(child)) break;
    }

    // If target position is at/beyond end, find last valid position
    if (!targetNode) {
      // Walk backwards to find last cursor anchor or text node
      const children = Array.from(container.childNodes).reverse();
      for (const child of children) {
        if (child instanceof HTMLElement && child.dataset.cursorAnchor === "true") {
          const textNode = child.firstChild;
          if (textNode?.nodeType === Node.TEXT_NODE) {
            targetNode = textNode;
            targetOffset = textNode.textContent?.length || 0;
            break;
          }
        } else if (child instanceof HTMLElement && child.dataset.textSegment === "true") {
          const textNode = child.firstChild;
          if (textNode?.nodeType === Node.TEXT_NODE) {
            targetNode = textNode;
            targetOffset = textNode.textContent?.length || 0;
            break;
          }
        } else if (child.nodeType === Node.TEXT_NODE) {
          targetNode = child;
          targetOffset = child.textContent?.length || 0;
          break;
        }
      }
    }

    if (targetNode) {
      try {
        const range = document.createRange();
        range.setStart(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0));
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } catch {
        // Ignore errors during cursor restoration
      }
    }
  }, []);

  // Restore cursor after React renders
  useLayoutEffect(() => {
    if (shouldRestoreCursorRef.current && document.activeElement === containerRef.current) {
      restoreCursorPosition();
      shouldRestoreCursorRef.current = false;
    }
  });

  // Track cursor position for visual feedback on selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      const container = containerRef.current;
      if (!container || document.activeElement !== container) {
        setActiveCursorAnchor(null);
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setActiveCursorAnchor(null);
        return;
      }

      const range = selection.getRangeAt(0);
      if (!container.contains(range.startContainer)) {
        setActiveCursorAnchor(null);
        return;
      }

      // Check if cursor is in a cursor anchor
      let node: Node | null = range.startContainer;
      while (node && node !== container) {
        if (node instanceof HTMLElement && node.dataset.cursorAnchor === "true") {
          // Use the anchor's key (stored in data-anchor-key) to identify it
          const anchorKey = node.dataset.anchorKey || null;
          setActiveCursorAnchor(anchorKey);
          return;
        }
        node = node.parentNode;
      }
      setActiveCursorAnchor(null);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  // Handle segment deletion
  const deleteSegment = useCallback(
    (index: number) => {
      saveCursorPosition();
      shouldRestoreCursorRef.current = true;
      const newSegments = [...segmentsRef.current];
      newSegments.splice(index, 1);
      onChange(segmentsToString(newSegments));
    },
    [onChange, saveCursorPosition]
  );

  // Handle keydown for navigation and deletion
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!container) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      
      // Helper to find the parent cursor anchor or text segment if cursor is inside one
      const findParentAnchorOrSegment = (node: Node): HTMLElement | null => {
        let current: Node | null = node;
        while (current && current !== container) {
          if (current instanceof HTMLElement) {
            if (current.dataset.cursorAnchor === "true" || current.dataset.textSegment === "true") {
              return current;
            }
          }
          current = current.parentNode;
        }
        return null;
      };

      // Helper to find the previous editable position (cursor anchor or text segment)
      const findPrevEditablePosition = (fromElement: Node): HTMLElement | null => {
        let current = fromElement.previousSibling;
        while (current) {
          if (current instanceof HTMLElement) {
            if (current.dataset.dropzone === "true") {
              current = current.previousSibling;
              continue;
            }
            if (current.dataset.cursorAnchor === "true" || current.dataset.textSegment === "true") {
              return current;
            }
            if (current.dataset.badge === "true") {
              // Skip badge, continue looking
              current = current.previousSibling;
              continue;
            }
          }
          current = current.previousSibling;
        }
        return null;
      };

      // Helper to find the next editable position (cursor anchor or text segment)
      const findNextEditablePosition = (fromElement: Node): HTMLElement | null => {
        let current = fromElement.nextSibling;
        while (current) {
          if (current instanceof HTMLElement) {
            if (current.dataset.dropzone === "true") {
              current = current.nextSibling;
              continue;
            }
            if (current.dataset.cursorAnchor === "true" || current.dataset.textSegment === "true") {
              return current;
            }
            if (current.dataset.badge === "true") {
              // Skip badge, continue looking
              current = current.nextSibling;
              continue;
            }
          }
          current = current.nextSibling;
        }
        return null;
      };

      // Helper to position cursor in an element
      const positionCursorIn = (element: HTMLElement, atEnd: boolean) => {
        const textNode = element.firstChild;
        if (textNode?.nodeType === Node.TEXT_NODE) {
          const newRange = document.createRange();
          const offset = atEnd ? (textNode.textContent?.length || 0) : 0;
          newRange.setStart(textNode, offset);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      };

      // Handle ArrowLeft - move to previous editable position
      if (e.key === "ArrowLeft" && range.collapsed) {
        const { startContainer, startOffset } = range;
        
        // Check if cursor is at the start of current element (only ZWS or nothing before cursor)
        const textBeforeCursor = startContainer.nodeType === Node.TEXT_NODE 
          ? (startContainer.textContent?.slice(0, startOffset) || "").replace(/\u200B/g, "")
          : "";
        const isAtStart = startOffset === 0 || textBeforeCursor === "";
        
        if (isAtStart) {
          const parentElement = findParentAnchorOrSegment(startContainer);
          if (parentElement) {
            const prevPosition = findPrevEditablePosition(parentElement);
            if (prevPosition) {
              e.preventDefault();
              positionCursorIn(prevPosition, true);
              return;
            }
          }
        }
      }

      // Handle ArrowRight - move to next editable position
      if (e.key === "ArrowRight" && range.collapsed) {
        const { startContainer, startOffset } = range;
        
        // Check if cursor is at the end of current element (only ZWS or nothing after cursor)
        const textAfterCursor = startContainer.nodeType === Node.TEXT_NODE 
          ? (startContainer.textContent?.slice(startOffset) || "").replace(/\u200B/g, "")
          : "";
        const isAtEnd = textAfterCursor === "";
        
        if (isAtEnd) {
          const parentElement = findParentAnchorOrSegment(startContainer);
          if (parentElement) {
            const nextPosition = findNextEditablePosition(parentElement);
            if (nextPosition) {
              e.preventDefault();
              positionCursorIn(nextPosition, false);
              return;
            }
          }
        }
      }

      // Helper to find the previous badge from a position
      const findPrevBadge = (fromElement: Node): HTMLElement | null => {
        let current = fromElement.previousSibling;
        while (current) {
          if (current instanceof HTMLElement) {
            if (current.dataset.dropzone === "true" || current.dataset.cursorAnchor === "true") {
              current = current.previousSibling;
              continue;
            }
            if (current.dataset.badge === "true") {
              return current;
            }
          }
          current = current.previousSibling;
        }
        return null;
      };

      // Helper to find the next badge from a position
      const findNextBadge = (fromElement: Node): HTMLElement | null => {
        let current = fromElement.nextSibling;
        while (current) {
          if (current instanceof HTMLElement) {
            if (current.dataset.dropzone === "true" || current.dataset.cursorAnchor === "true") {
              current = current.nextSibling;
              continue;
            }
            if (current.dataset.badge === "true") {
              return current;
            }
          }
          current = current.nextSibling;
        }
        return null;
      };

      if (e.key === "Backspace" && range.collapsed) {
        const { startContainer, startOffset } = range;
        
        // Check if we're at the start (only zero-width spaces before cursor)
        const textBeforeCursor = startContainer.nodeType === Node.TEXT_NODE 
          ? (startContainer.textContent?.slice(0, startOffset) || "").replace(/\u200B/g, "")
          : "";
        const isAtStart = startOffset === 0 || textBeforeCursor === "";
        
        if (isAtStart) {
          const parentElement = findParentAnchorOrSegment(startContainer);
          if (parentElement) {
            const prevBadge = findPrevBadge(parentElement);
            if (prevBadge) {
              e.preventDefault();
              const segmentValue = prevBadge.dataset.segmentValue;
              const idx = segmentsRef.current.findIndex(s => s.value === segmentValue);
              if (idx !== -1) {
                deleteSegment(idx);
              }
              return;
            }
          }
        }
      }

      if (e.key === "Delete" && range.collapsed) {
        const { startContainer, startOffset } = range;
        
        // Check if we're at the end (only zero-width spaces after cursor)
        const textAfterCursor = startContainer.nodeType === Node.TEXT_NODE 
          ? (startContainer.textContent?.slice(startOffset) || "").replace(/\u200B/g, "")
          : "";
        const isAtEnd = textAfterCursor === "";
        
        if (isAtEnd) {
          const parentElement = findParentAnchorOrSegment(startContainer);
          if (parentElement) {
            const nextBadge = findNextBadge(parentElement);
            if (nextBadge) {
              e.preventDefault();
              const segmentValue = nextBadge.dataset.segmentValue;
              const idx = segmentsRef.current.findIndex(s => s.value === segmentValue);
              if (idx !== -1) {
                deleteSegment(idx);
              }
              return;
            }
          }
        }
      }

      // Prevent Enter from creating new lines
      if (e.key === "Enter") {
        e.preventDefault();
      }
    },
    [deleteSegment]
  );

  // Handle input to extract text from contenteditable
  const handleInput = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (isComposingRef.current) return;

    saveCursorPosition();

    // Reconstruct the value from DOM
    const newSegments: Segment[] = [];
    
    // Check if we have direct text nodes (browser created during typing)
    const hasDirectTextNodes = Array.from(container.childNodes).some(
      n => n.nodeType === Node.TEXT_NODE && n.parentNode === container && (n.textContent?.replace(/\u200B/g, "") || "")
    );
    
    const processNode = (node: Node) => {
      if (node instanceof HTMLElement && node.dataset.dropzone === "true") {
        return; // Skip drop zones
      }
      if (node instanceof HTMLElement && node.dataset.cursorAnchor === "true") {
        // Cursor anchor - check if user typed into it
        const text = node.textContent || "";
        // Strip zero-width spaces and only keep real typed text
        const cleanText = text.replace(/\u200B/g, "");
        if (cleanText) {
          newSegments.push({
            type: "text",
            value: cleanText,
            display: cleanText,
          });
        }
        return;
      }
      if (node instanceof HTMLElement && node.dataset.textSegment === "true") {
        // Text segment span - but skip if we have direct text nodes (those are newer)
        if (hasDirectTextNodes) {
          return; // Skip stale React-rendered spans
        }
        const text = node.textContent || "";
        const cleanText = text.replace(/\u200B/g, "");
        if (cleanText) {
          newSegments.push({
            type: "text",
            value: cleanText,
            display: cleanText,
          });
        }
        return;
      }
      if (node instanceof HTMLElement && node.dataset.badge === "true") {
        // Badge - preserve the original segment
        const segmentValue = node.dataset.segmentValue || "";
        const originalSegment = segmentsRef.current.find(s => s.value === segmentValue);
        if (originalSegment) {
          newSegments.push(originalSegment);
        }
        return;
      }
      if (node.nodeType === Node.TEXT_NODE && node.parentNode === container) {
        // Direct text node (browser created during typing)
        const text = node.textContent || "";
        const cleanText = text.replace(/\u200B/g, "");
        if (cleanText) {
          newSegments.push({
            type: "text",
            value: cleanText,
            display: cleanText,
          });
        }
      }
    };
    
    container.childNodes.forEach(processNode);

    // Merge adjacent text segments to prevent duplication
    const mergedSegments: Segment[] = [];
    for (const segment of newSegments) {
      if (segment.type === "text" && mergedSegments.length > 0) {
        const lastSegment = mergedSegments[mergedSegments.length - 1];
        if (lastSegment.type === "text") {
          // Merge with previous text segment
          lastSegment.value += segment.value;
          lastSegment.display += segment.display;
          continue;
        }
      }
      mergedSegments.push(segment);
    }

    const newValue = segmentsToString(mergedSegments);
    if (newValue !== value) {
      shouldRestoreCursorRef.current = true;
      onChange(newValue);
    }
  }, [value, onChange, saveCursorPosition]);

  // Handle drag start for internal badges
  const handleBadgeDragStart = useCallback((e: DragEvent, index: number) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", segments[index].value);
    e.dataTransfer.setData("application/x-template-badge-index", String(index));
    setIsDraggingOver(true);
  }, [segments]);

  // Handle drag end
  const handleBadgeDragEnd = useCallback(() => {
    dragIndexRef.current = null;
    setActiveDropZone(null);
    setIsDraggingOver(false);
  }, []);

  // Calculate drop position from x coordinate and return segment index and text offset
  const calculateDropPosition = useCallback((clientX: number, clientY: number): { segmentIndex: number; textOffset: number } => {
    const container = containerRef.current;
    if (!container) return { segmentIndex: 0, textOffset: 0 };

    // Use caretRangeFromPoint for more precise positioning within text
    const range = document.caretRangeFromPoint(clientX, clientY);
    if (!range) return { segmentIndex: segments.length, textOffset: 0 };

    const { startContainer, startOffset } = range;
    
    // Count segments up to the drop point
    let segmentIndex = 0;
    let textOffset = 0;
    
    for (const child of Array.from(container.childNodes)) {
      if (child instanceof HTMLElement && child.dataset.dropzone === "true") {
        continue;
      }
      
      if (child === startContainer || child.contains(startContainer)) {
        if (child.nodeType === Node.TEXT_NODE || startContainer.nodeType === Node.TEXT_NODE) {
          textOffset = startOffset;
        }
        return { segmentIndex, textOffset };
      }
      
      if (child.nodeType === Node.TEXT_NODE || 
          (child instanceof HTMLElement && child.dataset.badge === "true")) {
        segmentIndex++;
      }
    }
    
    return { segmentIndex: segments.length, textOffset: 0 };
  }, [segments.length]);

  // Handle drop on a specific zone
  const handleZoneDrop = useCallback((e: DragEvent<HTMLSpanElement>, zoneIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    setActiveDropZone(null);
    setIsDraggingOver(false);

    const internalIndex = e.dataTransfer.getData("application/x-template-badge-index");
    const droppedValue = e.dataTransfer.getData("text/plain");

    if (!droppedValue) return;

    const newSegments = [...segmentsRef.current];

    if (internalIndex !== "") {
      // Internal reorder
      const fromIndex = parseInt(internalIndex, 10);
      const [movedSegment] = newSegments.splice(fromIndex, 1);
      
      // Adjust insert index if needed
      let adjustedInsertIndex = zoneIndex;
      if (fromIndex < zoneIndex) {
        adjustedInsertIndex--;
      }
      
      newSegments.splice(adjustedInsertIndex, 0, movedSegment);
    } else {
      // External drop
      const droppedSegments = parseTemplate(droppedValue);
      newSegments.splice(zoneIndex, 0, ...droppedSegments);
    }

    onChange(segmentsToString(newSegments));
  }, [onChange]);

  // Handle drop on the container (fallback for text areas)
  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setActiveDropZone(null);
    setIsDraggingOver(false);

    const container = containerRef.current;
    if (!container) return;

    const internalIndex = e.dataTransfer.getData("application/x-template-badge-index");
    const droppedValue = e.dataTransfer.getData("text/plain");

    if (!droppedValue) return;

    // Calculate precise drop position
    const { segmentIndex, textOffset } = calculateDropPosition(e.clientX, e.clientY);
    
    const newSegments = [...segmentsRef.current];

    // Check if we're dropping into the middle of a text segment
    const targetSegment = newSegments[segmentIndex];
    if (targetSegment && targetSegment.type === "text" && textOffset > 0 && textOffset < targetSegment.value.length) {
      // Split the text segment
      const beforeText = targetSegment.value.slice(0, textOffset);
      const afterText = targetSegment.value.slice(textOffset);
      
      // Remove the original text segment
      newSegments.splice(segmentIndex, 1);
      
      // Parse and prepare dropped segments
      const droppedSegments = internalIndex !== "" 
        ? [newSegments.splice(parseInt(internalIndex, 10) - (parseInt(internalIndex, 10) > segmentIndex ? 0 : 0), 1)[0]].filter(Boolean)
        : parseTemplate(droppedValue);
      
      // If internal reorder, need to handle differently
      if (internalIndex !== "") {
        const fromIndex = parseInt(internalIndex, 10);
        const movedSegment = segmentsRef.current[fromIndex];
        
        // Rebuild segments array
        const rebuiltSegments: Segment[] = [];
        let insertDone = false;
        
        for (let i = 0; i < segmentsRef.current.length; i++) {
          if (i === fromIndex) {
            continue;
          }
          
          const seg = segmentsRef.current[i];
          
          if (i === segmentIndex && !insertDone) {
            // This is the text segment to split
            if (beforeText) {
              rebuiltSegments.push({ type: "text", value: beforeText, display: beforeText });
            }
            rebuiltSegments.push(movedSegment);
            if (afterText) {
              rebuiltSegments.push({ type: "text", value: afterText, display: afterText });
            }
            insertDone = true;
          } else {
            rebuiltSegments.push(seg);
          }
        }
        
        onChange(segmentsToString(rebuiltSegments));
        return;
      }
      
      // External drop - insert split text and dropped content
      const rebuiltSegments: Segment[] = [];
      for (let i = 0; i < newSegments.length; i++) {
        if (i === segmentIndex) {
          // Insert the split parts with dropped content in between
          if (beforeText) {
            rebuiltSegments.push({ type: "text", value: beforeText, display: beforeText });
          }
          rebuiltSegments.push(...droppedSegments);
          if (afterText) {
            rebuiltSegments.push({ type: "text", value: afterText, display: afterText });
          }
        } else {
          rebuiltSegments.push(newSegments[i]);
        }
      }
      
      // If we didn't process a split (empty newSegments), just insert at position
      if (rebuiltSegments.length === 0) {
        if (beforeText) {
          rebuiltSegments.push({ type: "text", value: beforeText, display: beforeText });
        }
        rebuiltSegments.push(...droppedSegments);
        if (afterText) {
          rebuiltSegments.push({ type: "text", value: afterText, display: afterText });
        }
      }
      
      onChange(segmentsToString(rebuiltSegments));
      return;
    }

    // Standard insertion (not splitting text)
    if (internalIndex !== "") {
      const fromIndex = parseInt(internalIndex, 10);
      const [movedSegment] = newSegments.splice(fromIndex, 1);
      
      let adjustedInsertIndex = segmentIndex;
      if (fromIndex < segmentIndex) {
        adjustedInsertIndex--;
      }
      
      newSegments.splice(adjustedInsertIndex, 0, movedSegment);
    } else {
      const droppedSegments = parseTemplate(droppedValue);
      newSegments.splice(segmentIndex, 0, ...droppedSegments);
    }

    onChange(segmentsToString(newSegments));
  }, [onChange, calculateDropPosition]);

  // Handle drag over
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDraggingOver(true);
  }, []);

  // Handle drag leave on container
  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    // Only set to false if leaving the container entirely
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
      setActiveDropZone(null);
    }
  }, []);

  // Handle zone drag enter/leave
  const handleZoneDragEnter = useCallback((zoneIndex: number) => {
    setActiveDropZone(zoneIndex);
  }, []);

  const handleZoneDragLeave = useCallback(() => {
    // Don't immediately clear - let enter events take precedence
  }, []);

  // Handle composition events (for IME input)
  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
    handleInput();
  }, [handleInput]);

  // Handle paste - strip formatting
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  // Helper to render cursor anchor with visual indicator
  const renderCursorAnchor = (key: string, position: 'start' | 'end' | 'between') => {
    const isActive = activeCursorAnchor === key;
    
    return (
      <span 
        key={key} 
        data-cursor-anchor="true" 
        data-anchor-key={key}
        data-anchor-position={position}
        className={cn(
          "cursor-text relative inline-block min-w-[2px]",
          isActive && "before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-4 before:bg-foreground before:rounded-full before:animate-[pulse_1s_ease-in-out_infinite]"
        )}
      >
        {"\u200B"}
      </span>
    );
  };

  // Build the rendered content with cursor anchors and drop zones
  const renderContent = () => {
    const items: React.ReactNode[] = [];
    
    // Check if first segment is a badge - need cursor anchor before it
    const firstIsBadge = segments.length > 0 && segments[0].type !== "text";
    if (firstIsBadge) {
      // Add cursor anchor at the start so user can position cursor before first badge
      items.push(renderCursorAnchor("cursor-anchor-start", "start"));
    }
    
    // Always add a leading drop zone when dragging (for dropping at the very start)
    if (isDraggingOver && segments.length > 0) {
      items.push(
        <DropZone
          key="dropzone-start"
          isActive={activeDropZone === 0}
          position="before"
          onDrop={(e) => handleZoneDrop(e, 0)}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDragEnter={() => handleZoneDragEnter(0)}
          onDragLeave={handleZoneDragLeave}
        />
      );
    }
    
    segments.forEach((segment, index) => {
      if (segment.type === "text") {
        // Text segments rendered in a span wrapper
        items.push(
          <span key={`text-${index}`} data-text-segment="true" suppressContentEditableWarning>
            {segment.value}
          </span>
        );
        
        // Add drop zone after text segment if dragging
        if (isDraggingOver) {
          items.push(
            <DropZone
              key={`dropzone-after-text-${index}`}
              isActive={activeDropZone === index + 1}
              position="after"
              onDrop={(e) => handleZoneDrop(e, index + 1)}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDragEnter={() => handleZoneDragEnter(index + 1)}
              onDragLeave={handleZoneDragLeave}
            />
          );
        }
      } else {
        // Badge
        items.push(
          <TemplateBadge
            key={`${segment.value}-${index}`}
            segment={segment}
            onDelete={() => deleteSegment(index)}
            onDragStart={(e) => handleBadgeDragStart(e, index)}
            onDragEnd={handleBadgeDragEnd}
            isDragging={dragIndexRef.current === index}
          />
        );
        
        // Check if next segment is also a badge or if this is the last segment
        const nextSegment = segments[index + 1];
        const needsCursorAnchor = !nextSegment || nextSegment.type !== "text";
        
        if (needsCursorAnchor) {
          // Add cursor anchor so user can position cursor between badges or after last badge
          const anchorPosition: 'start' | 'end' | 'between' = !nextSegment ? 'end' : 'between';
          items.push(renderCursorAnchor(`cursor-anchor-${index}`, anchorPosition));
        }
        
        // Add drop zone after badge if dragging (unless next segment is text which handles its own)
        if (isDraggingOver && needsCursorAnchor) {
          items.push(
            <DropZone
              key={`dropzone-after-badge-${index}`}
              isActive={activeDropZone === index + 1}
              position="after"
              onDrop={(e) => handleZoneDrop(e, index + 1)}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDragEnter={() => handleZoneDragEnter(index + 1)}
              onDragLeave={handleZoneDragLeave}
            />
          );
        }
      }
    });
    
    return items;
  };

  return (
    <div
      ref={containerRef}
      role="textbox"
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onFocus={onFocus}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onPaste={handlePaste}
      data-placeholder={placeholder}
      className={cn(
        "w-full min-w-0 min-h-[2.25rem] sm:min-h-[2rem] px-2 sm:px-3 py-1.5 text-sm font-mono rounded-l border-y border-l bg-background transition-colors",
        "flex flex-wrap items-center gap-1",
        "focus:outline-none",
        "[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground",
        isActive && "border-primary ring-1 ring-primary",
        hasWarning && "border-yellow-500",
        className
      )}
    >
      {renderContent()}
    </div>
  );
}
