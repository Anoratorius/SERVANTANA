/**
 * Geocoding Service
 * Abstracts geocoding provider for easy configuration between development and production
 *
 * Supported providers:
 * - nominatim: Free OpenStreetMap service (rate-limited, good for development)
 * - google: Google Maps Geocoding API (requires GOOGLE_MAPS_API_KEY)
 * - mapbox: Mapbox Geocoding API (requires MAPBOX_ACCESS_TOKEN)
 */

export interface GeocodingResult {
  city: string;
  country: string;
  state?: string;
  postalCode?: string;
  formattedAddress?: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

type GeocodingProvider = "nominatim" | "google" | "mapbox";

const PROVIDER: GeocodingProvider =
  (process.env.GEOCODING_PROVIDER as GeocodingProvider) || "nominatim";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

// Rate limiting for Nominatim (1 request per second)
let lastNominatimRequest = 0;
const NOMINATIM_RATE_LIMIT_MS = 1000;

/**
 * Reverse geocode coordinates to get location details
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodingResult | null> {
  switch (PROVIDER) {
    case "google":
      return reverseGeocodeGoogle(latitude, longitude);
    case "mapbox":
      return reverseGeocodeMapbox(latitude, longitude);
    case "nominatim":
    default:
      return reverseGeocodeNominatim(latitude, longitude);
  }
}

/**
 * Forward geocode an address to coordinates
 */
export async function forwardGeocode(
  address: string
): Promise<Coordinates | null> {
  switch (PROVIDER) {
    case "google":
      return forwardGeocodeGoogle(address);
    case "mapbox":
      return forwardGeocodeMapbox(address);
    case "nominatim":
    default:
      return forwardGeocodeNominatim(address);
  }
}

// ==================== Nominatim (OpenStreetMap) ====================

async function reverseGeocodeNominatim(
  latitude: number,
  longitude: number
): Promise<GeocodingResult | null> {
  try {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastNominatimRequest;
    if (timeSinceLastRequest < NOMINATIM_RATE_LIMIT_MS) {
      await new Promise((resolve) =>
        setTimeout(resolve, NOMINATIM_RATE_LIMIT_MS - timeSinceLastRequest)
      );
    }
    lastNominatimRequest = Date.now();

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
      {
        headers: {
          "User-Agent": "Servantana App (https://servantana.com)",
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const address = data.address || {};

    return {
      city:
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.county ||
        "",
      country: address.country || "",
      state: address.state || address.region || "",
      postalCode: address.postcode || "",
      formattedAddress: data.display_name || "",
    };
  } catch (error) {
    console.error("Nominatim reverse geocoding error:", error);
    return null;
  }
}

async function forwardGeocodeNominatim(
  address: string
): Promise<Coordinates | null> {
  try {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastNominatimRequest;
    if (timeSinceLastRequest < NOMINATIM_RATE_LIMIT_MS) {
      await new Promise((resolve) =>
        setTimeout(resolve, NOMINATIM_RATE_LIMIT_MS - timeSinceLastRequest)
      );
    }
    lastNominatimRequest = Date.now();

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          "User-Agent": "Servantana App (https://servantana.com)",
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.length) return null;

    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };
  } catch (error) {
    console.error("Nominatim forward geocoding error:", error);
    return null;
  }
}

// ==================== Google Maps ====================

async function reverseGeocodeGoogle(
  latitude: number,
  longitude: number
): Promise<GeocodingResult | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("GOOGLE_MAPS_API_KEY not set, falling back to Nominatim");
    return reverseGeocodeNominatim(latitude, longitude);
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.status !== "OK" || !data.results.length) return null;

    const result = data.results[0];
    const components = result.address_components || [];

    const getComponent = (type: string) =>
      components.find((c: { types: string[] }) => c.types.includes(type))?.long_name || "";

    return {
      city: getComponent("locality") || getComponent("administrative_area_level_2"),
      country: getComponent("country"),
      state: getComponent("administrative_area_level_1"),
      postalCode: getComponent("postal_code"),
      formattedAddress: result.formatted_address,
    };
  } catch (error) {
    console.error("Google reverse geocoding error:", error);
    return null;
  }
}

async function forwardGeocodeGoogle(
  address: string
): Promise<Coordinates | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("GOOGLE_MAPS_API_KEY not set, falling back to Nominatim");
    return forwardGeocodeNominatim(address);
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.status !== "OK" || !data.results.length) return null;

    const location = data.results[0].geometry.location;
    return {
      latitude: location.lat,
      longitude: location.lng,
    };
  } catch (error) {
    console.error("Google forward geocoding error:", error);
    return null;
  }
}

// ==================== Mapbox ====================

async function reverseGeocodeMapbox(
  latitude: number,
  longitude: number
): Promise<GeocodingResult | null> {
  if (!MAPBOX_ACCESS_TOKEN) {
    console.warn("MAPBOX_ACCESS_TOKEN not set, falling back to Nominatim");
    return reverseGeocodeNominatim(latitude, longitude);
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=place,region,country`
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.features?.length) return null;

    const features = data.features;
    const getFeature = (type: string) =>
      features.find((f: { place_type: string[] }) => f.place_type.includes(type))?.text || "";

    return {
      city: getFeature("place"),
      country: getFeature("country"),
      state: getFeature("region"),
      formattedAddress: features[0]?.place_name || "",
    };
  } catch (error) {
    console.error("Mapbox reverse geocoding error:", error);
    return null;
  }
}

async function forwardGeocodeMapbox(
  address: string
): Promise<Coordinates | null> {
  if (!MAPBOX_ACCESS_TOKEN) {
    console.warn("MAPBOX_ACCESS_TOKEN not set, falling back to Nominatim");
    return forwardGeocodeNominatim(address);
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.features?.length) return null;

    const [longitude, latitude] = data.features[0].center;
    return { latitude, longitude };
  } catch (error) {
    console.error("Mapbox forward geocoding error:", error);
    return null;
  }
}

/**
 * Calculate distance between two coordinates in kilometers using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
