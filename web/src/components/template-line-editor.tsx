"use client";

import { useRef, useEffect, useCallback, KeyboardEvent, DragEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VESTABOARD_COLORS } from "@/lib/vestaboard-colors";

// Segment types for parsed template
export type SegmentType = "text" | "variable" | "color";

export interface Segment {
  type: SegmentType;
  value: string; // Raw value: "{{weather.temp}}" or "{blue}" or "plain text"
  display: string; // Display text: "weather.temp" or "blue" or "plain text"
}

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
 * Handles: {{variable}}, {color}, and plain text
 */
export function parseTemplate(template: string): Segment[] {
  const segments: Segment[] = [];
  let remaining = template;

  while (remaining.length > 0) {
    // Try to match a variable {{...}}
    const varMatch = remaining.match(/^\{\{([^}]+)\}\}/);
    if (varMatch) {
      segments.push({
        type: "variable",
        value: varMatch[0],
        display: varMatch[1],
      });
      remaining = remaining.slice(varMatch[0].length);
      continue;
    }

    // Try to match a color {colorName}
    const colorMatch = remaining.match(/^\{([a-zA-Z]+)\}/);
    if (colorMatch && KNOWN_COLORS.has(colorMatch[1].toLowerCase())) {
      segments.push({
        type: "color",
        value: colorMatch[0],
        display: colorMatch[1].toLowerCase(),
      });
      remaining = remaining.slice(colorMatch[0].length);
      continue;
    }

    // Find the next special token
    const nextVar = remaining.indexOf("{{");
    const nextColor = remaining.search(/\{([a-zA-Z]+)\}/);
    
    // Check if the color match is actually a known color
    let validNextColor = -1;
    if (nextColor !== -1) {
      const colorCheckMatch = remaining.slice(nextColor).match(/^\{([a-zA-Z]+)\}/);
      if (colorCheckMatch && KNOWN_COLORS.has(colorCheckMatch[1].toLowerCase())) {
        validNextColor = nextColor;
      }
    }

    // Find the earliest next token
    let nextToken = -1;
    if (nextVar !== -1 && validNextColor !== -1) {
      nextToken = Math.min(nextVar, validNextColor);
    } else if (nextVar !== -1) {
      nextToken = nextVar;
    } else if (validNextColor !== -1) {
      nextToken = validNextColor;
    }

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

  // Parse value into segments
  const segments = parseTemplate(value);
  segmentsRef.current = segments;

  // Update the DOM content to match segments
  const syncDom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Don't sync during composition (IME input)
    if (isComposingRef.current) return;

    // Save cursor position relative to text content
    const selection = window.getSelection();
    let cursorOffset = 0;
    let hadFocus = document.activeElement === container;
    
    if (hadFocus && selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      // Calculate cursor offset in terms of the template string
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(container);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      
      // Walk through nodes to calculate position
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        null
      );
      
      let node;
      let pos = 0;
      while ((node = walker.nextNode())) {
        if (node === range.startContainer) {
          cursorOffset = pos + range.startOffset;
          break;
        }
        if (node.nodeType === Node.TEXT_NODE) {
          pos += node.textContent?.length || 0;
        } else if (node instanceof HTMLElement && node.dataset.badge === "true") {
          pos += 1; // Badge counts as 1 character for cursor purposes
        }
      }
      if (!node) {
        cursorOffset = pos;
      }
    }

    // This function is called but we let React handle rendering
    // The cursor restoration happens in the effect below
  }, []);

  // Handle segment deletion
  const deleteSegment = useCallback(
    (index: number) => {
      const newSegments = [...segmentsRef.current];
      newSegments.splice(index, 1);
      onChange(segmentsToString(newSegments));
    },
    [onChange]
  );

  // Handle keydown for backspace/delete behavior
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!container) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      
      if (e.key === "Backspace" && range.collapsed) {
        // Check if cursor is right after a badge
        const { startContainer, startOffset } = range;
        
        // If we're at the start of a text node, check the previous sibling
        if (startOffset === 0 && startContainer.nodeType === Node.TEXT_NODE) {
          let prevNode = startContainer.previousSibling;
          while (prevNode && prevNode.nodeType === Node.TEXT_NODE && prevNode.textContent === "") {
            prevNode = prevNode.previousSibling;
          }
          
          if (prevNode instanceof HTMLElement && prevNode.dataset.badge === "true") {
            e.preventDefault();
            const segmentValue = prevNode.dataset.segmentValue;
            const idx = segmentsRef.current.findIndex(s => s.value === segmentValue);
            if (idx !== -1) {
              deleteSegment(idx);
            }
            return;
          }
        }
        
        // If cursor is inside the container but not in a text node
        if (startContainer === container) {
          const childAtOffset = container.childNodes[startOffset - 1];
          if (childAtOffset instanceof HTMLElement && childAtOffset.dataset.badge === "true") {
            e.preventDefault();
            const segmentValue = childAtOffset.dataset.segmentValue;
            const idx = segmentsRef.current.findIndex(s => s.value === segmentValue);
            if (idx !== -1) {
              deleteSegment(idx);
            }
            return;
          }
        }
      }

      if (e.key === "Delete" && range.collapsed) {
        // Check if cursor is right before a badge
        const { startContainer, startOffset } = range;
        
        if (startContainer.nodeType === Node.TEXT_NODE) {
          const textLength = startContainer.textContent?.length || 0;
          if (startOffset === textLength) {
            let nextNode = startContainer.nextSibling;
            while (nextNode && nextNode.nodeType === Node.TEXT_NODE && nextNode.textContent === "") {
              nextNode = nextNode.nextSibling;
            }
            
            if (nextNode instanceof HTMLElement && nextNode.dataset.badge === "true") {
              e.preventDefault();
              const segmentValue = nextNode.dataset.segmentValue;
              const idx = segmentsRef.current.findIndex(s => s.value === segmentValue);
              if (idx !== -1) {
                deleteSegment(idx);
              }
              return;
            }
          }
        }
        
        if (startContainer === container) {
          const childAtOffset = container.childNodes[startOffset];
          if (childAtOffset instanceof HTMLElement && childAtOffset.dataset.badge === "true") {
            e.preventDefault();
            const segmentValue = childAtOffset.dataset.segmentValue;
            const idx = segmentsRef.current.findIndex(s => s.value === segmentValue);
            if (idx !== -1) {
              deleteSegment(idx);
            }
            return;
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

    // Reconstruct the value from DOM
    const newSegments: Segment[] = [];
    
    container.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        if (text) {
          newSegments.push({
            type: "text",
            value: text,
            display: text,
          });
        }
      } else if (node instanceof HTMLElement && node.dataset.badge === "true") {
        const segmentValue = node.dataset.segmentValue || "";
        const originalSegment = segmentsRef.current.find(s => s.value === segmentValue);
        if (originalSegment) {
          newSegments.push(originalSegment);
        }
      }
    });

    const newValue = segmentsToString(newSegments);
    if (newValue !== value) {
      onChange(newValue);
    }
  }, [value, onChange]);

  // Handle drag start for internal badges
  const handleBadgeDragStart = useCallback((e: DragEvent, index: number) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", segments[index].value);
    e.dataTransfer.setData("application/x-template-badge-index", String(index));
  }, [segments]);

  // Handle drag end
  const handleBadgeDragEnd = useCallback(() => {
    dragIndexRef.current = null;
  }, []);

  // Handle drop on the container
  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    // Get drop position
    const range = document.caretRangeFromPoint(e.clientX, e.clientY);
    if (!range) return;

    // Check if this is an internal reorder or external drop
    const internalIndex = e.dataTransfer.getData("application/x-template-badge-index");
    const droppedValue = e.dataTransfer.getData("text/plain");

    if (!droppedValue) return;

    // Calculate insert position in the segments array
    let insertSegmentIndex = 0;
    let insertTextOffset = 0;
    
    const { startContainer, startOffset } = range;
    
    // Walk through children to find position
    for (let i = 0; i < container.childNodes.length; i++) {
      const child = container.childNodes[i];
      
      if (child === startContainer || child.contains(startContainer)) {
        if (child.nodeType === Node.TEXT_NODE) {
          insertTextOffset = startOffset;
        }
        break;
      }
      
      if (child.nodeType === Node.TEXT_NODE) {
        insertSegmentIndex++;
      } else if (child instanceof HTMLElement && child.dataset.badge === "true") {
        insertSegmentIndex++;
      }
    }

    const newSegments = [...segmentsRef.current];

    // If internal reorder
    if (internalIndex !== "") {
      const fromIndex = parseInt(internalIndex, 10);
      const [movedSegment] = newSegments.splice(fromIndex, 1);
      
      // Adjust insert index if needed
      let adjustedInsertIndex = insertSegmentIndex;
      if (fromIndex < insertSegmentIndex) {
        adjustedInsertIndex--;
      }
      
      newSegments.splice(adjustedInsertIndex, 0, movedSegment);
    } else {
      // External drop - parse the dropped value and insert
      const droppedSegments = parseTemplate(droppedValue);
      newSegments.splice(insertSegmentIndex, 0, ...droppedSegments);
    }

    onChange(segmentsToString(newSegments));
  }, [onChange]);

  // Handle drag over
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
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
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          // Text segments are rendered as plain text nodes
          return segment.value;
        }
        
        return (
          <TemplateBadge
            key={`${segment.value}-${index}`}
            segment={segment}
            onDelete={() => deleteSegment(index)}
            onDragStart={(e) => handleBadgeDragStart(e, index)}
            onDragEnd={handleBadgeDragEnd}
            isDragging={dragIndexRef.current === index}
          />
        );
      })}
    </div>
  );
}

