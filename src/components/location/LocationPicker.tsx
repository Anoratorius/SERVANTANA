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

  // Detect if device is mobile (has real GPS hardware)
  const isMobileDevice = (): boolean => {
    if (typeof window === "undefined") return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
  };

  // Get IP-based location (reliable for desktop, fallback for mobile)
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

  // Use real GPS on mobile devices
  const getMobileGPSLocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  };

  const getCurrentLocation = async () => {
    setIsLocating(true);
    setLocationError(null);
    setLocationWarning(null);

    const isMobile = isMobileDevice();

    if (isMobile) {
      // MOBILE: Use real GPS hardware
      const gpsLocation = await getMobileGPSLocation();

      if (gpsLocation) {
        setPosition([gpsLocation.lat, gpsLocation.lng]);
        setMapCenter([gpsLocation.lat, gpsLocation.lng]);
        const { city, country } = await reverseGeocode(gpsLocation.lat, gpsLocation.lng);
        onLocationSelect(gpsLocation.lat, gpsLocation.lng, city, country);
        setIsLocating(false);
        return;
      }

      // GPS failed on mobile - fall back to IP
      const ipLocation = await getIPLocation();
      if (ipLocation) {
        setPosition([ipLocation.lat, ipLocation.lng]);
        setMapCenter([ipLocation.lat, ipLocation.lng]);
        const { city, country } = await reverseGeocode(ipLocation.lat, ipLocation.lng);
        onLocationSelect(ipLocation.lat, ipLocation.lng, city, country);
        setLocationWarning("GPS unavailable. Using approximate IP location. Click on map to adjust.");
        setIsLocating(false);
        return;
      }

      setLocationError("Could not detect location. Please click on the map to set your location.");
      setIsLocating(false);
    } else {
      // DESKTOP: Use IP-based location (more reliable than browser "GPS")
      const ipLocation = await getIPLocation();

      if (ipLocation) {
        setPosition([ipLocation.lat, ipLocation.lng]);
        setMapCenter([ipLocation.lat, ipLocation.lng]);
        const { city, country } = await reverseGeocode(ipLocation.lat, ipLocation.lng);
        onLocationSelect(ipLocation.lat, ipLocation.lng, city, country);
        setLocationWarning("Location detected from IP. Click on map for exact position.");
        setIsLocating(false);
        return;
      }

      setLocationError("Could not detect location. Please click on the map to set your location.");
      setIsLocating(false);
    }
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
