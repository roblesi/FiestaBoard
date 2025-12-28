"use client";

import { useState, useEffect } from "react";
import { Search, MapPin, Navigation, Loader2, CheckCircle2, AlertCircle, TrainFront, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface MuniStop {
  stop_code: string;
  stop_id: string;
  name: string;
  lat: number | null;
  lon: number | null;
  distance_km?: number;
  routes?: string[];
}

interface StopSelection {
  stop_code: string;
  name: string;
}

interface MuniStopFinderProps {
  selectedStopCodes: string[];
  onStopsSelected: (stops: StopSelection[]) => void;
  maxStops?: number;
}

export function MuniStopFinder({
  selectedStopCodes,
  onStopsSelected,
  maxStops = 20,
}: MuniStopFinderProps) {
  const [searchMethod, setSearchMethod] = useState<"address" | "coordinates" | "geolocation" | "manual">("address");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("0.5");
  const [manualStopCode, setManualStopCode] = useState("");
  const [manualStopName, setManualStopName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stops, setStops] = useState<MuniStop[]>([]);
  const [selectedStops, setSelectedStops] = useState<Set<string>>(new Set(selectedStopCodes));
  const [knownStops, setKnownStops] = useState<Map<string, string>>(new Map()); // stop_code -> name mapping

  // Sync selected stops with prop
  useEffect(() => {
    setSelectedStops(new Set(selectedStopCodes));
  }, [selectedStopCodes]);

  const handleGeolocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const result = await api.findNearbyMuniStops(
            position.coords.latitude,
            position.coords.longitude,
            parseFloat(radius) || 0.5,
            20
          );
          setStops(result.stops);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to find stops");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError(`Geolocation error: ${err.message}`);
        setLoading(false);
      }
    );
  };

  const handleSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      let foundStops: MuniStop[] = [];

      if (searchMethod === "address") {
        if (!address.trim()) {
          setError("Please enter an address");
          setLoading(false);
          return;
        }
        const result = await api.searchMuniStopsByAddress(
          address,
          parseFloat(radius) || 0.5,
          20
        );
        foundStops = result.stops;
      } else if (searchMethod === "coordinates") {
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        if (isNaN(latNum) || isNaN(lngNum)) {
          setError("Please enter valid coordinates");
          setLoading(false);
          return;
        }
        const result = await api.findNearbyMuniStops(
          latNum,
          lngNum,
          parseFloat(radius) || 0.5,
          20
        );
        foundStops = result.stops;
      }

      setStops(foundStops);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search stops");
    } finally {
      setLoading(false);
    }
  };

  const handleAddManualStop = () => {
    if (!manualStopCode.trim()) {
      setError("Please enter a stop code");
      return;
    }

    if (selectedStops.has(manualStopCode.trim())) {
      setError("This stop is already selected");
      return;
    }

    if (selectedStops.size >= maxStops) {
      setError(`Maximum ${maxStops} stops allowed`);
      return;
    }

    const stopCode = manualStopCode.trim();
    const stopName = manualStopName.trim() || stopCode;

    // Add to selected stops
    const newSelected = new Set(selectedStops);
    newSelected.add(stopCode);
    setSelectedStops(newSelected);

    // Update known stops
    const newKnownStops = new Map(knownStops);
    newKnownStops.set(stopCode, stopName);
    setKnownStops(newKnownStops);

    // Pass to parent
    const selectedStopsList = Array.from(newSelected).map(code => ({
      stop_code: code,
      name: newKnownStops.get(code) || code
    }));
    onStopsSelected(selectedStopsList);

    // Clear form
    setManualStopCode("");
    setManualStopName("");
    setError(null);
  };

  const toggleStop = (stop: MuniStop) => {
    const stopCode = stop.stop_code;
    const newSelected = new Set(selectedStops);
    if (newSelected.has(stopCode)) {
      newSelected.delete(stopCode);
    } else {
      if (newSelected.size >= maxStops) {
        setError(`Maximum ${maxStops} stops allowed`);
        return;
      }
      newSelected.add(stopCode);
    }
    setSelectedStops(newSelected);
    
    // Update known stops map
    const newKnownStops = new Map(knownStops);
    stops.forEach(s => {
      if (newSelected.has(s.stop_code)) {
        newKnownStops.set(s.stop_code, s.name);
      }
    });
    setKnownStops(newKnownStops);
    
    // Pass full stop objects (code + name) to parent
    const selectedStopsList = Array.from(newSelected).map(stopCode => {
      // First try to get from current search results
      const stopFromResults = stops.find(s => s.stop_code === stopCode);
      if (stopFromResults) {
        return {
          stop_code: stopCode,
          name: stopFromResults.name
        };
      }
      // Fallback to known stops map
      return {
        stop_code: stopCode,
        name: newKnownStops.get(stopCode) || stopCode
      };
    });
    onStopsSelected(selectedStopsList);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Find Stops</CardTitle>
          <CardDescription>
            Search for Muni stops near you. Select up to {maxStops} stops to track.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Method Selection */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={searchMethod === "address" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchMethod("address")}
            >
              <Search className="h-4 w-4 mr-2" />
              Address
            </Button>
            <Button
              variant={searchMethod === "coordinates" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchMethod("coordinates")}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Coordinates
            </Button>
            <Button
              variant={searchMethod === "geolocation" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSearchMethod("geolocation");
                handleGeolocation();
              }}
            >
              <Navigation className="h-4 w-4 mr-2" />
              Use My Location
            </Button>
            <Button
              variant={searchMethod === "manual" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchMethod("manual")}
            >
              <Hash className="h-4 w-4 mr-2" />
              Manual Code
            </Button>
          </div>

          {/* Search Inputs */}
          {searchMethod === "address" && (
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="e.g., 123 Main St, San Francisco, CA"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
          )}

          {searchMethod === "coordinates" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  placeholder="37.7749"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng">Longitude</Label>
                <Input
                  id="lng"
                  type="number"
                  step="any"
                  placeholder="-122.4194"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                />
              </div>
            </div>
          )}

          {searchMethod === "manual" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manualStopCode">Stop Code</Label>
                <Input
                  id="manualStopCode"
                  placeholder="e.g., 15726"
                  value={manualStopCode}
                  onChange={(e) => setManualStopCode(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  You can find stop codes on signs at the stop or on 511.org
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manualStopName">Stop Name (optional)</Label>
                <Input
                  id="manualStopName"
                  placeholder="e.g., Church & Duboce"
                  value={manualStopName}
                  onChange={(e) => setManualStopName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Optional display name for this stop
                </p>
              </div>
            </div>
          )}

          {/* Radius */}
          {(searchMethod === "address" || searchMethod === "coordinates") && searchMethod !== "manual" && (
            <div className="space-y-2">
              <Label htmlFor="radius">Search Radius (km)</Label>
              <Input
                id="radius"
                type="number"
                step="0.1"
                min="0.1"
                max="5"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
              />
            </div>
          )}

          {/* Search Button */}
          {(searchMethod === "address" || searchMethod === "coordinates") && (
            <Button onClick={handleSearch} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search Stops
                </>
              )}
            </Button>
          )}

          {/* Add Manual Stop Button */}
          {searchMethod === "manual" && (
            <Button 
              onClick={handleAddManualStop} 
              disabled={!manualStopCode.trim() || selectedStops.size >= maxStops}
              className="w-full"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Add Stop
            </Button>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Selected Stops Count */}
          {selectedStops.size > 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {selectedStops.size} of {maxStops} stops selected
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Stop Results */}
      {stops.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Nearby Stops ({stops.length})</CardTitle>
            <CardDescription>
              Click to select/deselect stops. Selected: {selectedStops.size}/{maxStops}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {stops.map((stop) => {
                const isSelected = selectedStops.has(stop.stop_code);

                return (
                  <div
                    key={stop.stop_code}
                    className={cn(
                      "p-3 border rounded-lg cursor-pointer transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => toggleStop(stop)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <TrainFront className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{stop.name}</span>
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Stop Code: {stop.stop_code}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          {stop.routes && stop.routes.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-xs text-muted-foreground">Routes:</span>
                              {stop.routes.map((route) => (
                                <Badge key={route} variant="secondary" className="text-xs">
                                  {route}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {stop.distance_km !== undefined && (
                            <span className="text-muted-foreground text-xs">
                              {stop.distance_km} km away
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div
                          className={cn(
                            "w-3 h-3 rounded-full",
                            isSelected ? "bg-primary" : "bg-muted"
                          )}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

