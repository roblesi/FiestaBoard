"use client";

import { useState, useEffect } from "react";
import { Search, MapPin, Navigation, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api, BayWheelsStation } from "@/lib/api";
import { cn } from "@/lib/utils";

interface StationSelection {
  station_id: string;
  name: string;
}

interface BayWheelsStationFinderProps {
  selectedStationIds: string[];
  onStationsSelected: (stations: StationSelection[]) => void;
  maxStations?: number;
}

export function BayWheelsStationFinder({
  selectedStationIds,
  onStationsSelected,
  maxStations = 4,
}: BayWheelsStationFinderProps) {
  const [searchMethod, setSearchMethod] = useState<"address" | "coordinates" | "geolocation">("address");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("2.0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stations, setStations] = useState<BayWheelsStation[]>([]);
  const [selectedStations, setSelectedStations] = useState<Set<string>>(new Set(selectedStationIds));
  const [knownStations, setKnownStations] = useState<Map<string, string>>(new Map()); // station_id -> name mapping

  // Sync selected stations with prop
  useEffect(() => {
    setSelectedStations(new Set(selectedStationIds));
  }, [selectedStationIds]);

  // Fetch station names for already-selected stations if we don't have them
  useEffect(() => {
    const fetchStationNames = async () => {
      const missingIds = selectedStationIds.filter(id => !knownStations.has(id));
      if (missingIds.length > 0) {
        try {
          const allStations = await api.listBayWheelsStations();
          setKnownStations(prev => {
            const newMap = new Map(prev);
            allStations.stations.forEach(station => {
              if (selectedStationIds.includes(station.station_id)) {
                newMap.set(station.station_id, station.name);
              }
            });
            return newMap;
          });
        } catch (err) {
          // Silently fail - we'll just show IDs if names aren't available
          console.debug("Failed to fetch station names:", err);
        }
      }
    };
    fetchStationNames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStationIds]);

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
          const foundStations = await api.findNearbyBayWheelsStations(
            position.coords.latitude,
            position.coords.longitude,
            parseFloat(radius) || 2.0,
            20
          );
          setStations(foundStations.stations);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to find stations");
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
      let foundStations: BayWheelsStation[] = [];

      if (searchMethod === "address") {
        if (!address.trim()) {
          setError("Please enter an address");
          setLoading(false);
          return;
        }
        const result = await api.searchBayWheelsStationsByAddress(
          address,
          parseFloat(radius) || 2.0,
          20
        );
        foundStations = result.stations;
      } else if (searchMethod === "coordinates") {
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        if (isNaN(latNum) || isNaN(lngNum)) {
          setError("Please enter valid coordinates");
          setLoading(false);
          return;
        }
        const result = await api.findNearbyBayWheelsStations(
          latNum,
          lngNum,
          parseFloat(radius) || 2.0,
          20
        );
        foundStations = result.stations;
      }

      setStations(foundStations);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search stations");
    } finally {
      setLoading(false);
    }
  };

  const toggleStation = (station: BayWheelsStation) => {
    const stationId = station.station_id;
    const newSelected = new Set(selectedStations);
    if (newSelected.has(stationId)) {
      newSelected.delete(stationId);
    } else {
      if (newSelected.size >= maxStations) {
        setError(`Maximum ${maxStations} stations allowed`);
        return;
      }
      newSelected.add(stationId);
    }
    setSelectedStations(newSelected);
    
    // Update known stations map
    const newKnownStations = new Map(knownStations);
    stations.forEach(s => {
      if (newSelected.has(s.station_id)) {
        // Prefer name, then address, then ID
        const displayName = s.name || s.address || s.station_id;
        newKnownStations.set(s.station_id, displayName);
      }
    });
    setKnownStations(newKnownStations);
    
    // Pass full station objects (id + name) to parent
    // Use the station object from the current search results if available
    const selectedStationsList = Array.from(newSelected).map(stationId => {
      // First try to get from current search results
      const stationFromResults = stations.find(s => s.station_id === stationId);
      if (stationFromResults) {
        return {
          station_id: stationId,
          name: stationFromResults.name || stationFromResults.address || stationId
        };
      }
      // Fallback to known stations map
      return {
        station_id: stationId,
        name: newKnownStations.get(stationId) || stationId
      };
    });
    onStationsSelected(selectedStationsList);
    setError(null);
  };

  const getStatusColor = (electricBikes?: number) => {
    if (electricBikes === undefined) return "gray";
    if (electricBikes < 2) return "red";
    if (electricBikes > 5) return "green";
    return "yellow";
  };

  const getStatusEmoji = (electricBikes?: number) => {
    if (electricBikes === undefined) return "⚪";
    if (electricBikes < 2) return "🔴";
    if (electricBikes > 5) return "🟢";
    return "🟡";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Find Stations</CardTitle>
          <CardDescription>
            Search for Bay Wheels stations near you. Select up to {maxStations} stations to track.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Method Selection */}
          <div className="flex gap-2">
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

          {/* Radius */}
          {(searchMethod === "address" || searchMethod === "coordinates") && (
            <div className="space-y-2">
              <Label htmlFor="radius">Search Radius (km)</Label>
              <Input
                id="radius"
                type="number"
                step="0.1"
                min="0.5"
                max="10"
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
                  Search Stations
                </>
              )}
            </Button>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Selected Stations Count */}
          {selectedStations.size > 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {selectedStations.size} of {maxStations} stations selected
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Station Results */}
      {stations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Nearby Stations ({stations.length})</CardTitle>
            <CardDescription>
              Click to select/deselect stations. Selected: {selectedStations.size}/{maxStations}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {stations.map((station) => {
                const isSelected = selectedStations.has(station.station_id);
                const statusColor = getStatusColor(station.electric_bikes);
                const statusEmoji = getStatusEmoji(station.electric_bikes);

                return (
                  <div
                    key={station.station_id}
                    className={cn(
                      "p-3 border rounded-lg cursor-pointer transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => toggleStation(station)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{station.name}</span>
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        {station.address && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {station.address}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className={cn("flex items-center gap-1", `text-${statusColor}-600`)}>
                            {statusEmoji} {station.electric_bikes ?? 0} e-bikes
                          </span>
                          <span className="text-muted-foreground">
                            {station.classic_bikes ?? 0} classic
                          </span>
                          <span className="text-muted-foreground">
                            {station.num_bikes_available ?? 0} total
                          </span>
                          {station.distance_km !== undefined && (
                            <span className="text-muted-foreground">
                              {station.distance_km} km away
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

