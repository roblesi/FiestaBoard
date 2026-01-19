/**
 * Filter Picker Content - Filter options for toolbar
 */
"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FilterPickerContentProps {
  filters: string[];
  onInsert: (filter: string) => void;
}

export function FilterPickerContent({ filters, onInsert }: FilterPickerContentProps) {
  if (filters.length === 0) {
    return (
      <div className="p-3 text-sm text-muted-foreground">
        No filters available
      </div>
    );
  }

  return (
    <div className="p-2 min-w-[250px]">
      <div className="space-y-2">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => onInsert(`|${filter}`)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm",
              "hover:bg-accent hover:text-accent-foreground transition-colors",
              "flex items-center gap-2"
            )}
          >
            <Badge variant="secondary" className="font-mono text-xs">
              |{filter}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {filter === 'wrap' && 'Wraps long text across multiple lines'}
              {filter === 'pad' && 'Pads text to specified width'}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1">
        <p>Example: {"{{weather.temperature|pad:3}}"}</p>
        <p className="text-[10px]">
          <strong>|wrap</strong>: Wraps long text. Leave empty lines below for text to flow into.
        </p>
      </div>
    </div>
  );
}
