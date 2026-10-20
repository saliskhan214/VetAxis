import { UserProfile } from '../types';

interface PlacesApiResponse {
  success: boolean;
  source?: string;
  cached?: boolean;
  count?: number;
  clinics?: any[];
  error?: string;
}

class GooglePlacesService {
  private clientCache = new Map<string, { data: UserProfile[]; timestamp: number }>();
  private readonly CACHE_TTL_MS = 15 * 60 * 1000; // 15 min client-side cache

  /**
   * Fetch registered veterinary clinics near coordinates from Google Maps Places API
   */
  async fetchNearbyGoogleClinics(
    lat: number,
    lng: number,
    radiusMeters: number = 25000,
    forceFresh: boolean = true
  ): Promise<UserProfile[]> {
    const cacheKey = `nearby_${lat.toFixed(3)}_${lng.toFixed(3)}_${radiusMeters}`;
    if (!forceFresh) {
      const cached = this.clientCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        return cached.data;
      }
    }

    try {
      const url = `/api/places/nearby-vets?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radius=${encodeURIComponent(radiusMeters)}${forceFresh ? '&fresh=1' : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Google Places API returned ${res.status}`);
      }
      const data: PlacesApiResponse = await res.json();
      if (data.success && Array.isArray(data.clinics)) {
        const formatted = this.mapRawToUserProfiles(data.clinics);
        this.clientCache.set(cacheKey, { data: formatted, timestamp: Date.now() });
        return formatted;
      }
      return [];
    } catch (err) {
      console.warn('[GooglePlacesService] fetchNearbyGoogleClinics error:', err);
      return [];
    }
  }

  /**
   * Search registered veterinary clinics in a city or by search term from Google Maps
   */
  async fetchCityGoogleClinics(
    cityOrQuery: string,
    lat?: number,
    lng?: number,
    forceFresh: boolean = true
  ): Promise<UserProfile[]> {
    const trimmed = cityOrQuery.trim();
    if (!trimmed) return [];

    const cacheKey = `search_${trimmed.toLowerCase()}_${lat?.toFixed(2) || '0'}_${lng?.toFixed(2) || '0'}`;
    if (!forceFresh) {
      const cached = this.clientCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        return cached.data;
      }
    }

    try {
      let url = `/api/places/search-vets?query=${encodeURIComponent(trimmed)}${forceFresh ? '&fresh=1' : ''}`;
      if (lat !== undefined && lng !== undefined) {
        url += `&lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Google Places search returned ${res.status}`);
      }
      const data: PlacesApiResponse = await res.json();
      if (data.success && Array.isArray(data.clinics)) {
        const formatted = this.mapRawToUserProfiles(data.clinics);
        this.clientCache.set(cacheKey, { data: formatted, timestamp: Date.now() });
        return formatted;
      }
      return [];
    } catch (err) {
      console.warn('[GooglePlacesService] fetchCityGoogleClinics error:', err);
      return [];
    }
  }

  /**
   * Helper to normalize raw JSON items to typed UserProfile records
   */
  private mapRawToUserProfiles(rawClinics: any[]): UserProfile[] {
    return rawClinics.map((p) => {
      const clinicName = p.fullName || p.clinicName || 'Veterinary Practice';
      const address = p.address || (p.location?.address) || 'Pakistan';
      const city = p.city || 'Pakistan';

      return {
        uid: p.uid || `gmap_${Math.random().toString(36).substring(2, 9)}`,
        name: clinicName,
        email: p.email || 'clinic@vetaxis.pk',
        role: 'clinic',
        facilities: p.bio || `Google Maps Verified Veterinary Clinic offering general animal medical care, diagnostics, and emergency treatment in ${city}.`,
        address: address,
        phone: p.phoneNumber || '',
        createdAt: Date.now(),
        avgRating: p.avgRating || 4.8,
        totalReviews: p.totalReviews || 1,
        location: {
          lat: p.location?.lat || 33.6844,
          lng: p.location?.lng || 73.0479,
          address: address
        },
        googleMapsUri: p.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinicName + ' ' + address)}`,
        isGoogleMapsVerified: true,
        source: 'google_maps',
        isOpenNow: p.isOpenNow ?? true,
        isEmergency247: p.isEmergency247 ?? false,
        city: city
      };
    });
  }
}

export const googlePlacesService = new GooglePlacesService();
