/**
 * Formatting Picker Content - Formatting options for toolbar
 */
"use client";

import { cn } from "@/lib/utils";

interface FormattingOption {
  name: string;
  syntax: string;
  description?: string;
}

interface FormattingPickerContentProps {
  formatting: Record<string, { syntax: string; description?: string }>;
  onInsert: (syntax: string) => void;
}

export function FormattingPickerContent({ formatting, onInsert }: FormattingPickerContentProps) {
  const options: FormattingOption[] = Object.entries(formatting).map(([name, info]) => ({
    name: name.replace(/_/g, " "),
    syntax: info.syntax,
    description: info.description,
  }));

  if (options.length === 0) {
    return (
      <div className="p-3 text-sm text-muted-foreground">
        No formatting options available
      </div>
    );
  }

  return (
    <div className="p-2 min-w-[200px]">
      <div className="space-y-1">
        {options.map((option) => (
          <button
            key={option.syntax}
            type="button"
            onClick={() => onInsert(option.syntax)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm",
              "hover:bg-accent hover:text-accent-foreground transition-colors",
              "flex items-center justify-between gap-2"
            )}
          >
            <div className="flex-1">
              <div className="font-medium">{option.name}</div>
              {option.description && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {option.description}
                </div>
              )}
            </div>
            <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
              {option.syntax}
            </code>
          </button>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
        <p>Example: {"Left{{fill_space}}Right"}</p>
      </div>
    </div>
  );
}
