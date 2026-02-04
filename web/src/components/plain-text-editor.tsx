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
    
    // Split by newlines and truncate to 6 lines if needed
    const lines = newValue.split('\n');
    if (lines.length > 6) {
      // Truncate to 6 lines instead of blocking
      const truncatedValue = lines.slice(0, 6).join('\n');
      onChange(truncatedValue);
      
      // Restore cursor position after truncation
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          // Try to preserve cursor position, but clamp to valid range
          const textareaCursorPos = textarea.selectionStart;
          const newCursorPos = Math.min(textareaCursorPos, truncatedValue.length);
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }
      });
      return;
    }
    
    // For normal changes (within 6 lines), let React handle it normally
    // The browser will maintain cursor position automatically
    onChange(newValue);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Get pasted content from clipboard
    const pastedText = e.clipboardData.getData('text');
    
    if (!pastedText) {
      return; // Let default paste behavior handle it
    }

    // Get current textarea state
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = value;
    
    // Insert pasted text at cursor position
    const newValue = currentValue.slice(0, start) + pastedText + currentValue.slice(end);
    
    // Split by newlines and truncate to 6 lines
    const lines = newValue.split('\n');
    if (lines.length > 6) {
      // Truncate to 6 lines
      const truncatedValue = lines.slice(0, 6).join('\n');
      
      // Prevent default paste and manually set the value
      e.preventDefault();
      onChange(truncatedValue);
      
      // Set cursor position after the pasted content
      setTimeout(() => {
        if (textarea) {
          const newCursorPos = Math.min(start + pastedText.length, truncatedValue.length);
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
    // If within 6 lines, let default paste behavior handle it
  };

  const handleCopy = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Default copy behavior works fine, but we can add custom logic if needed
    // For now, just let it work normally
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const cursorPos = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    
    // Prevent adding more than 6 lines via Enter key
    if (e.key === 'Enter') {
      const currentLines = value.split('\n');
      if (currentLines.length >= 6) {
        e.preventDefault();
        return;
      }
    }
    
    // Handle Backspace at the start of a line - manually delete the newline
    // This ensures it works correctly even with React's controlled component
    if (e.key === 'Backspace' && cursorPos === selectionEnd && cursorPos > 0) {
      // Check if we're at the start of a line (right after a newline)
      const textBeforeCursor = value.slice(0, cursorPos);
      const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
      const isAtLineStart = cursorPos === lastNewlineIndex + 1;
      
      if (isAtLineStart && cursorPos > 0) {
        // We're at the start of a line - manually delete the preceding newline
        e.preventDefault();
        
        // Find the position of the newline to delete
        const newlinePos = lastNewlineIndex;
        
        // Create new value without that newline
        const newValue = value.slice(0, newlinePos) + value.slice(cursorPos);
        
        // Update the value
        onChange(newValue);
        
        // Set cursor position to where the newline was (end of previous line)
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(newlinePos, newlinePos);
          }
        });
        
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
        onPaste={handlePaste}
        onCopy={handleCopy}
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
