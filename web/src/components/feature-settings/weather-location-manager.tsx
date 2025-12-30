import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, X } from "lucide-react";

interface WeatherLocation {
  location: string;
  name: string;
}

interface WeatherLocationManagerProps {
  selectedLocations: WeatherLocation[];
  onLocationsSelected: (locations: WeatherLocation[]) => void;
  maxLocations?: number;
}

export function WeatherLocationManager({
  selectedLocations,
  onLocationsSelected,
  maxLocations = 10,
}: WeatherLocationManagerProps) {
  const [newLocation, setNewLocation] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newLocation.trim()) {
      setError("Location is required");
      return;
    }
    if (!newName.trim()) {
      setError("Name is required");
      return;
    }
    if (selectedLocations.length >= maxLocations) {
      setError(`Maximum ${maxLocations} locations allowed`);
      return;
    }

    const updatedLocations = [
      ...selectedLocations,
      { location: newLocation.trim(), name: newName.trim() },
    ];
    onLocationsSelected(updatedLocations);
    setNewLocation("");
    setNewName("");
    setError(null);
  };

  const handleRemove = (index: number) => {
    const updatedLocations = selectedLocations.filter((_, i) => i !== index);
    onLocationsSelected(updatedLocations);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label className="text-xs font-medium">Add Location</Label>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Location (City or Coordinates)
            </Label>
            <Input
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="San Francisco, CA or 37.7749,-122.4194"
              className="h-9 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Enter a city name or coordinates in lat,lng format
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Display Name
            </Label>
            <Input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="HOME, OFFICE, etc."
              className="h-9 text-sm"
              maxLength={15}
            />
            <p className="text-xs text-muted-foreground">
              Short name for templates (max 15 chars)
            </p>
          </div>
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <Button
            type="button"
            onClick={handleAdd}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>
      </div>

      {selectedLocations.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">
            Selected Locations ({selectedLocations.length}/{maxLocations})
          </Label>
          <div className="space-y-2">
            {selectedLocations.map((loc, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Badge variant="outline" className="text-[10px] font-mono px-1.5 shrink-0">
                    [{index}]
                  </Badge>
                  <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{loc.name}</p>
                    <p className="text-xs text-muted-foreground truncate" title={loc.location}>
                      {loc.location}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(index)}
                  className="ml-2 hover:text-destructive shrink-0"
                  title="Remove location"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Use <code className="bg-muted px-1 rounded">weather.locations.{"{index}"}.temperature</code> in templates (e.g., locations.0, locations.1)
          </p>
        </div>
      )}
    </div>
  );
}

