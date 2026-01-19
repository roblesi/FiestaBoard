/**
 * Variable Picker Content - Simplified variable list for toolbar dropdown
 */
"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Code2, Home, Bike, TrainFront, Car, TrendingUp, Trophy, Plane } from "lucide-react";

interface VariablePickerContentProps {
  onInsert: (variable: string) => void;
}

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  baywheels: <Bike className="h-3 w-3" />,
  muni: <TrainFront className="h-3 w-3" />,
  traffic: <Car className="h-3 w-3" />,
  weather: null,
  stocks: <TrendingUp className="h-3 w-3" />,
  sports_scores: <Trophy className="h-3 w-3" />,
  nearby_aircraft: <Plane className="h-3 w-3" />,
  home_assistant: <Home className="h-3 w-3" />,
  datetime: null,
};

// Categories that have nested data and should show "View all" link
const COMPLEX_CATEGORIES = ['baywheels', 'muni', 'traffic', 'weather', 'stocks', 'sports_scores', 'nearby_aircraft', 'home_assistant'];

function VariablePill({
  label,
  onInsert,
}: {
  label: string;
  value: string;
  onInsert: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onInsert}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-mono",
        "bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300",
        "hover:bg-indigo-500/25 transition-colors cursor-pointer"
      )}
    >
      {label}
    </button>
  );
}

export function VariablePickerContent({ onInsert }: VariablePickerContentProps) {
  const { data: templateVars, isLoading } = useQuery({
    queryKey: ["template-variables"],
    queryFn: api.getTemplateVariables,
  });

  if (isLoading) {
    return (
      <div className="p-3 min-w-[300px]">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  if (!templateVars?.variables) {
    return (
      <div className="p-3 text-sm text-muted-foreground min-w-[300px]">
        No variables available
      </div>
    );
  }

  // Group variables by category
  const categories = Object.entries(templateVars.variables);

  return (
    <ScrollArea className="h-[400px] w-[350px]">
      <div className="p-2 space-y-3">
        {categories.map(([category, vars]) => {
          const isComplex = COMPLEX_CATEGORIES.includes(category);
          const icon = CATEGORY_ICONS[category];
          
          // Filter out nested variables (those with dots, like "stations.0.field")
          // Keep only top-level variables for the category
          const simpleVars = vars.filter(v => {
            // If variable doesn't have a dot, it's top-level
            if (!v.includes('.')) return true;
            // If it starts with category., check if it's nested (has more dots after)
            if (v.startsWith(category + '.')) {
              const afterCategory = v.slice(category.length + 1);
              // If there's no dot after the category prefix, it's a simple field
              return !afterCategory.includes('.');
            }
            return false;
          });
          const hasNested = vars.length > simpleVars.length;

          return (
            <div key={category} className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {icon}
                <span>{category.replace(/_/g, ' ')}</span>
              </div>
              
              {simpleVars.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {simpleVars.slice(0, 10).map((variable) => {
                    const varValue = `{{${category}.${variable}}}`;
                    return (
                      <VariablePill
                        key={variable}
                        label={variable}
                        value={varValue}
                        onInsert={() => onInsert(varValue)}
                      />
                    );
                  })}
                  {simpleVars.length > 10 && (
                    <span className="text-xs text-muted-foreground self-center">
                      +{simpleVars.length - 10} more
                    </span>
                  )}
                </div>
              )}

            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
