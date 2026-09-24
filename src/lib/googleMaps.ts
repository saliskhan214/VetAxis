// Source: Google Maps Platform Code Assist

export const GOOGLE_MAPS_API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

export const MAPS_ATTRIBUTION_IDS = ['gmp_mcp_codeassist_v1_aistudio'] as const;

export const DEFAULT_MAP_ID = 'DEMO_MAP_ID';

export const DEFAULT_CENTER = {
  lat: 33.6844,
  lng: 73.0479 // Islamabad, Pakistan
};

export const MAJOR_CITIES: { name: string; lat: number; lng: number; zoom: number }[] = [
  { name: 'Islamabad', lat: 33.6844, lng: 73.0479, zoom: 12 },
  { name: 'Rawalpindi', lat: 33.5651, lng: 73.0169, zoom: 12 },
  { name: 'Lahore', lat: 31.5204, lng: 74.3587, zoom: 12 },
  { name: 'Karachi', lat: 24.8607, lng: 67.0011, zoom: 11 },
  { name: 'Peshawar', lat: 34.0151, lng: 71.5249, zoom: 12 },
  { name: 'Faisalabad', lat: 31.4504, lng: 73.1350, zoom: 12 },
  { name: 'Multan', lat: 30.1575, lng: 71.5249, zoom: 12 },
  { name: 'Quetta', lat: 30.1798, lng: 66.9750, zoom: 12 },
  { name: 'Sialkot', lat: 32.4945, lng: 74.5229, zoom: 12 },
  { name: 'Gujranwala', lat: 32.1877, lng: 74.1945, zoom: 12 },
  { name: 'Hyderabad', lat: 25.3960, lng: 68.3578, zoom: 12 }
];

export function hasGoogleMapsKey(): boolean {
  return (
    Boolean(GOOGLE_MAPS_API_KEY) &&
    GOOGLE_MAPS_API_KEY.trim() !== '' &&
    GOOGLE_MAPS_API_KEY !== 'YOUR_API_KEY' &&
    GOOGLE_MAPS_API_KEY !== 'undefined'
  );
}

/**
 * Generates an external Google Maps turn-by-turn navigation URL for the given coordinate
 */
export function getDirectionsUrl(lat: number, lng: number, placeLabel?: string): string {
  const query = placeLabel ? encodeURIComponent(`${placeLabel} (${lat},${lng})`) : `${lat},${lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=&travelmode=driving`;
}

/**
 * Calculate approximate distance in kilometers between two coordinates using Haversine formula
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
