"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface VariablePickerProps {
  onInsert?: (variable: string) => void;
  showColors?: boolean;
  showSymbols?: boolean;
}

export function VariablePicker({
  onInsert,
  showColors = true,
  showSymbols = true,
}: VariablePickerProps) {
  const { data: templateVars, isLoading } = useQuery({
    queryKey: ["template-variables"],
    queryFn: api.getTemplateVariables,
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleInsert = (variable: string) => {
    if (onInsert) {
      onInsert(variable);
    } else {
      handleCopy(variable);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-base">Variables & Helpers</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!templateVars) {
    return null;
  }

  return (
    <Card className="flex flex-col h-full min-h-0">
      <CardHeader className="flex-shrink-0 px-4 sm:px-6">
        <CardTitle className="text-base">Template Variables</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Tap to {onInsert ? "insert" : "copy"} into your template
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col overflow-y-auto px-4 sm:px-6">
        <div className="space-y-6 pr-2 sm:pr-4">
            {/* Variables */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Data Variables</h4>
              <div className="space-y-4">
                {Object.entries(templateVars.variables).map(([category, vars]) => (
                  <div key={category}>
                    <p className="text-xs font-medium text-muted-foreground mb-2 capitalize">
                      {category.replace(/_/g, " ")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {vars.map((variable) => (
                        <Button
                          key={variable}
                          variant="outline"
                          size="sm"
                          className="h-9 sm:h-8 px-3 text-xs font-mono active:bg-accent"
                          onClick={() => handleInsert(`{{${category}.${variable}}}`)}
                        >
                          {variable}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
                
                {/* Colors as variables */}
                {showColors && Object.keys(templateVars.colors).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 capitalize">
                      Colors
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(templateVars.colors).map(([colorName]) => (
                        <Button
                          key={colorName}
                          variant="outline"
                          size="sm"
                          className="h-9 sm:h-8 px-3 text-xs font-mono active:bg-accent"
                          onClick={() => handleInsert(`{${colorName}}`)}
                        >
                          {colorName}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Filters */}
            {templateVars.filters.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Filters</h4>
                <div className="flex flex-wrap gap-2">
                  {templateVars.filters.map((filter) => (
                    <Badge
                      key={filter}
                      variant="secondary"
                      className="cursor-pointer text-xs py-1.5 px-2.5 active:bg-muted"
                      onClick={() => handleCopy(`|${filter}`)}
                    >
                      |{filter}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Example: {"{{weather.temperature|upper}}"}
                </p>
              </div>
            )}

            {/* Colors */}
            {showColors && Object.keys(templateVars.colors).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Colors</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(templateVars.colors).map(([colorName]) => (
                    <Button
                      key={colorName}
                      variant="outline"
                      size="sm"
                      className="h-10 sm:h-9 text-xs justify-start active:bg-accent"
                      onClick={() => handleInsert(`{${colorName}}`)}
                    >
                      <span
                        className="w-4 h-4 sm:w-3 sm:h-3 rounded-sm mr-2"
                        style={{
                          backgroundColor: getColorPreview(colorName),
                        }}
                      />
                      {colorName}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Use: {"{red}TEXT"} or {"{blue}MORE"}
                </p>
              </div>
            )}

        </div>
      </CardContent>
    </Card>
  );
}

// Helper to get color preview (basic approximation)
function getColorPreview(colorName: string): string {
  const colorMap: Record<string, string> = {
    red: "#e74c3c",
    orange: "#e67e22",
    yellow: "#f1c40f",
    green: "#2ecc71",
    blue: "#3498db",
    violet: "#9b59b6",
    white: "#ecf0f1",
    black: "#2c3e50",
  };
  return colorMap[colorName.toLowerCase()] || "#95a5a6";
}

