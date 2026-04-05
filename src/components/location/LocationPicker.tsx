"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Navigation, AlertTriangle } from "lucide-react";

// Fix Leaflet marker icon issue
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number, city?: string, country?: string) => void;
  height?: string;
}

function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapCenterUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, 15);
    }
  }, [center, map]);

  return null;
}

export default function LocationPicker({
  initialLat,
  initialLng,
  onLocationSelect,
  height = "400px",
}: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationWarning, setLocationWarning] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([52.52, 13.405]); // Berlin default
  const mapRef = useRef<L.Map | null>(null);

  // Get IP-based location for cross-check
  const getIPLocation = async (): Promise<{ lat: number; lng: number; city: string } | null> => {
    try {
      const response = await fetch("https://ipinfo.io/json", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        if (data.loc) {
          const [lat, lng] = data.loc.split(",").map(Number);
          return { lat, lng, city: data.city || "" };
        }
      }
    } catch {
      // IP detection failed
    }
    return null;
  };

  // Calculate distance between two coordinates in km
  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Reverse geocode to get city and country
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "en",
          },
        }
      );
      const data = await response.json();
      const address = data.address || {};
      const city = address.city || address.town || address.village || address.municipality || "";
      const country = address.country || "";
      return { city, country };
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return { city: "", country: "" };
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    setLocationWarning(null); // Clear warning when user manually selects
    setLocationError(null);
    const { city, country } = await reverseGeocode(lat, lng);
    onLocationSelect(lat, lng, city, country);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    setLocationWarning(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const gpsLat = pos.coords.latitude;
        const gpsLng = pos.coords.longitude;

        // Cross-check with IP location
        const ipLocation = await getIPLocation();

        if (ipLocation) {
          const distance = getDistance(gpsLat, gpsLng, ipLocation.lat, ipLocation.lng);
          // If GPS and IP locations differ by more than 500km, show warning
          if (distance > 500) {
            setLocationWarning(
              `GPS shows a location far from your IP location (${ipLocation.city}). ` +
              `If this doesn't look right, click on the map to set your location manually.`
            );
          }
        }

        setPosition([gpsLat, gpsLng]);
        setMapCenter([gpsLat, gpsLng]);
        const { city, country } = await reverseGeocode(gpsLat, gpsLng);
        onLocationSelect(gpsLat, gpsLng, city, country);
        setIsLocating(false);
      },
      async (error) => {
        // GPS failed - try IP-based location as fallback
        const ipLocation = await getIPLocation();
        if (ipLocation) {
          setPosition([ipLocation.lat, ipLocation.lng]);
          setMapCenter([ipLocation.lat, ipLocation.lng]);
          const { city, country } = await reverseGeocode(ipLocation.lat, ipLocation.lng);
          onLocationSelect(ipLocation.lat, ipLocation.lng, city, country);
          setLocationWarning("Using approximate location based on IP. Click on the map to set exact location.");
          setIsLocating(false);
          return;
        }

        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location permission denied. Please click on the map to set your location manually.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information unavailable. Please click on the map.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out. Please click on the map.");
            break;
          default:
            setLocationError("An unknown error occurred. Please click on the map.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Try to get location on mount
  useEffect(() => {
    if (!initialLat || !initialLng) {
      getCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {position ? (
            <span>
              {position[0].toFixed(6)}, {position[1].toFixed(6)}
            </span>
          ) : (
            <span>Click on map or use GPS to set location</span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={getCurrentLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Navigation className="h-4 w-4 mr-2" />
          )}
          Use GPS
        </Button>
      </div>

      {locationError && (
        <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
          {locationError}
        </div>
      )}

      {locationWarning && (
        <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{locationWarning}</span>
        </div>
      )}

      <div className="rounded-lg overflow-hidden border" style={{ height }}>
        <MapContainer
          center={mapCenter}
          zoom={position ? 15 : 5}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
          attributionControl={false}
        >
          <TileLayer
            attribution='© OSM'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onLocationSelect={handleMapClick} />
          <MapCenterUpdater center={position} />
          {position && <Marker position={position} icon={markerIcon} />}
        </MapContainer>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Click anywhere on the map to set your exact location, or use the GPS button
      </p>
    </div>
  );
}
