/**
 * Formatting Picker Content - Formatting options for toolbar
 */
"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronsLeftRight } from "lucide-react";

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
    <div className="p-2 min-w-[280px]">
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.syntax}
            type="button"
            onClick={() => onInsert(option.syntax)}
            className={cn(
              "w-full text-left px-3 py-2.5 rounded-md text-sm",
              "hover:bg-accent hover:text-accent-foreground transition-colors",
              "flex flex-col gap-1.5 group"
            )}
          >
            <div className="flex items-center gap-2">
              <ChevronsLeftRight className="w-4 h-4 text-muted-foreground group-hover:text-accent-foreground flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold capitalize">{option.name}</div>
              </div>
              <Badge variant="secondary" className="font-mono text-xs flex-shrink-0">
                {option.syntax}
              </Badge>
            </div>
            {option.description && (
              <div className="text-xs text-muted-foreground pl-6 leading-relaxed">
                {option.description}
              </div>
            )}
          </button>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-border/50 space-y-2">
        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1.5">Example usage:</p>
          <div className="space-y-1.5 pl-2">
            <div>
              <code className="text-[11px] font-mono bg-muted px-2 py-1 rounded block">
                Left{'{'}fill_space{'}'}Right
              </code>
              <p className="text-[10px] mt-1 opacity-75">
                Creates space between &quot;Left&quot; and &quot;Right&quot;
              </p>
            </div>
            <div>
              <code className="text-[11px] font-mono bg-muted px-2 py-1 rounded block">
                A{'{'}fill_space{'}'}B{'{'}fill_space{'}'}C
              </code>
              <p className="text-[10px] mt-1 opacity-75">
                Creates three evenly-spaced columns
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
