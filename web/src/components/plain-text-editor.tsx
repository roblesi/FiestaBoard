"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface PlainTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
}

/**
 * Plain text code editor for template editing
 * Provides a simple textarea with code editor styling
 */
export function PlainTextEditor({
  value,
  onChange,
  onFocus,
  placeholder = "Type your template text...",
  className,
}: PlainTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to fit content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 144)}px`; // Minimum 6 lines (~144px)
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // Split by newlines and limit to 6 lines
    const lines = newValue.split('\n');
    if (lines.length > 6) {
      // Prevent adding more than 6 lines
      return;
    }
    
    onChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Prevent adding more than 6 lines
    if (e.key === 'Enter') {
      const currentLines = value.split('\n');
      if (currentLines.length >= 6) {
        e.preventDefault();
        return;
      }
    }
  };

  return (
    <div className={cn("relative", className)}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        placeholder={placeholder}
        className={cn(
          "w-full p-3 rounded-md border bg-background",
          "font-mono text-sm resize-none",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "placeholder:text-muted-foreground",
          "overflow-y-auto"
        )}
        rows={6}
        style={{
          minHeight: '9rem', // 6 lines minimum
          lineHeight: '1.5rem',
        }}
      />
      
      {/* Line counter */}
      <div className="mt-1 text-xs text-muted-foreground">
        {value.split('\n').length} / 6 lines
      </div>
      
      {/* Helper text */}
      <div className="mt-2 text-xs text-muted-foreground space-y-1">
        <p>• Maximum 6 lines (22 characters per line recommended)</p>
        <p>• Use template syntax: {'{{variable}}'}, {'{{red}}'}, {'{{fill_space}}'}</p>
        <p>• Alignment prefixes: {'{left}'}, {'{center}'}, {'{right}'}</p>
        <p>• Wrap prefix: {'{wrap}'}</p>
      </div>
    </div>
  );
}
