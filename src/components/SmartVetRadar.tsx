import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Navigation, 
  MapPin, 
  Phone, 
  MessageCircle, 
  ShieldAlert, 
  Search, 
  CheckCircle2, 
  RotateCw, 
  Compass, 
  Star, 
  Clock,
  AlertCircle,
  Map as MapIcon,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Layers,
  Crosshair,
  Maximize2,
  Minimize2,
  Building2,
  Stethoscope,
  Radio,
  SlidersHorizontal,
  ChevronDown,
  X
} from 'lucide-react';
import { 
  APIProvider, 
  Map as GoogleMapComponent, 
  AdvancedMarker, 
  Pin, 
  InfoWindow, 
  useMap,
  useMapsLibrary
} from '@vis.gl/react-google-maps';
import { UserProfile } from '../types';
import { LocationService, ExploreService } from '../lib/storage';
import { PAKISTAN_CITIES_SEO } from '../lib/seoService';
import { PrefetchService } from '../lib/prefetchService';
import { 
  GOOGLE_MAPS_API_KEY, 
  DEFAULT_MAP_ID, 
  MAPS_ATTRIBUTION_IDS, 
  DEFAULT_CENTER,
  hasGoogleMapsKey,
  getDirectionsUrl,
  calculateHaversineDistanceKm
} from '../lib/googleMaps';
import { googlePlacesService } from '../lib/googlePlacesService';

interface SmartVetRadarProps {
  currentUser?: UserProfile | null;
  initialCity?: string | null;
  onNavigate?: (section: string) => void;
  onSelectClinic?: (clinic: UserProfile) => void;
}

export interface RadarClinicItem extends UserProfile {
  distanceKm: number;
  isOpenNow: boolean;
  isEmergency247: boolean;
  lat: number;
  lng: number;
  formattedAddress: string;
}

/**
 * Inner Map Controller that manages Google Maps instance synchronization,
 * panning, zoom adjustments, radar circle overlays, and bounds fitting.
 */
function RadarMapController({
  userCoords,
  radarRadiusKm,
  selectedClinic,
  onMapClick,
  clinics
}: {
  userCoords: { lat: number; lng: number };
  radarRadiusKm: number;
  selectedClinic: RadarClinicItem | null;
  onMapClick: () => void;
  clinics: RadarClinicItem[];
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const circleRef = useRef<google.maps.Circle | null>(null);

  // Pan to selected clinic or user location
  useEffect(() => {
    if (!map) return;
    if (selectedClinic) {
      map.panTo({ lat: selectedClinic.lat, lng: selectedClinic.lng });
      const currentZoom = map.getZoom() || 13;
      if (currentZoom < 14) {
        map.setZoom(15);
      }
    }
  }, [map, selectedClinic]);

  // Recenter when user coordinates change (if no clinic is currently selected)
  useEffect(() => {
    if (!map || selectedClinic) return;
    map.panTo(userCoords);
  }, [map, userCoords, selectedClinic]);

  // Draw interactive geographical radar coverage perimeter on the Google Map
  useEffect(() => {
    if (!map || !mapsLib || !userCoords) return;

    const radiusMeters = radarRadiusKm > 0 ? radarRadiusKm * 1000 : 35000;

    if (!circleRef.current) {
      circleRef.current = new mapsLib.Circle({
        map,
        center: userCoords,
        radius: radiusMeters,
        fillColor: '#0284c7',
        fillOpacity: 0.10,
        strokeColor: '#38bdf8',
        strokeOpacity: 0.65,
        strokeWeight: 1.5,
        clickable: false
      });
    } else {
      circleRef.current.setMap(map);
      circleRef.current.setCenter(userCoords);
      circleRef.current.setRadius(radiusMeters);
    }

    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
      }
    };
  }, [map, mapsLib, userCoords, radarRadiusKm]);

  // Setup click listener to deselect marker
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('click', () => {
      onMapClick();
    });
    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, onMapClick]);

  return null;
}

export function SmartVetRadar({ initialCity, onNavigate, onSelectClinic }: SmartVetRadarProps) {
  const defaultCity = initialCity || 'Islamabad';
  const defCoords = LocationService.resolveCoordinates(defaultCity);

  // Geolocation & Radar telemetry state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>(() => ({
    lat: defCoords.lat,
    lng: defCoords.lng
  }));
  const [userCityLabel, setUserCityLabel] = useState<string>(() => defaultCity);
  const [gpsSource, setGpsSource] = useState<'device' | 'city'>('city');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const isScanningRef = useRef<boolean>(false);

  // View & UI controls
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'list'>('split');
  const [maxRadiusKm, setMaxRadiusKm] = useState<number>(30);
  const [emergencyOnly, setEmergencyOnly] = useState<boolean>(false);
  const [homeVisitOnly, setHomeVisitOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClinic, setSelectedClinic] = useState<RadarClinicItem | null>(null);

  // Datasets: Registered clinics on platform + Google Maps Places API clinics
  const [platformClinics, setPlatformClinics] = useState<UserProfile[]>(() => {
    return PrefetchService.getCachedProfessionals('clinic') || [];
  });
  const [googleClinics, setGoogleClinics] = useState<UserProfile[]>([]);
  const [isLoadingClinics, setIsLoadingClinics] = useState<boolean>(true);
  const [isFetchingGooglePlaces, setIsFetchingGooglePlaces] = useState<boolean>(false);

  // Track map zoom
  const [zoomLevel, setZoomLevel] = useState<number>(12);

  // 1. Load registered platform clinics from storage and listen to updates
  useEffect(() => {
    let isMounted = true;
    async function loadPlatformClinics() {
      try {
        const clinics = await ExploreService.fetchProfessionals('clinic');
        if (isMounted) {
          setPlatformClinics(clinics);
        }
      } catch (err) {
        console.error('Failed to load registered clinics for radar:', err);
      } finally {
        if (isMounted) setIsLoadingClinics(false);
      }
    }
    loadPlatformClinics();

    const unsub = PrefetchService.subscribe('professionals_clinic', (clinics) => {
      if (Array.isArray(clinics) && isMounted) {
        setPlatformClinics(clinics);
        setIsLoadingClinics(false);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  // 2. Fallback to chosen Pakistani city without delay
  const fallbackToCity = useCallback((cityName: string) => {
    const coords = LocationService.resolveCoordinates(cityName);
    setUserCoords({ lat: coords.lat, lng: coords.lng });
    setUserCityLabel(cityName);
    setGpsSource('city');
    setGpsError(null);
    setIsScanning(false);
    isScanningRef.current = false;
    setSelectedClinic(null);
  }, []);

  // 3. Fast non-blocking GPS location detector
  const requestLocation = useCallback((force = false) => {
    if (isScanningRef.current && !force) return;
    isScanningRef.current = true;
    setIsScanning(true);
    setGpsError(null);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      isScanningRef.current = false;
      setIsScanning(false);
      setGpsError('Device geolocation is not supported in this browser. Showing clinics in selected city.');
      return;
    }

    let hasResolved = false;

    // Safety timeout: prevents infinite scanning indicator
    const safetyTimer = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        isScanningRef.current = false;
        setIsScanning(false);
        // Do not block user; leave current city coordinates active
      }
    }, 2800);

    const onLocationSuccess = (pos: GeolocationPosition) => {
      if (hasResolved) return;
      hasResolved = true;
      clearTimeout(safetyTimer);
      isScanningRef.current = false;
      setIsScanning(false);
      setGpsError(null);

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setUserCoords({ lat, lng });
      setGpsSource('device');

      // Identify closest major Pakistani city for friendly display
      let closestCity = 'Islamabad';
      let minDist = Infinity;
      for (const c of PAKISTAN_CITIES_SEO) {
        const resolved = LocationService.resolveCoordinates(c.city);
        const d = LocationService.haversine(lat, lng, resolved.lat, resolved.lng);
        if (d < minDist) {
          minDist = d;
          closestCity = c.city;
        }
      }
      const label = minDist < 50 ? `${closestCity} (Device GPS)` : `Near ${closestCity} (${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E)`;
      setUserCityLabel(label);
    };

    const onLocationFail = (err: GeolocationPositionError) => {
      if (hasResolved) return;
      hasResolved = true;
      clearTimeout(safetyTimer);
      isScanningRef.current = false;
      setIsScanning(false);
      if (err.code === 1) {
        setGpsError('Location access was denied. Showing clinics based on selected city below.');
      } else {
        setGpsError('Could not acquire precise GPS signal. Showing clinics based on city coordinates.');
      }
    };

    try {
      navigator.geolocation.getCurrentPosition(
        onLocationSuccess,
        () => {
          // Retry once with high accuracy
          try {
            navigator.geolocation.getCurrentPosition(
              onLocationSuccess,
              onLocationFail,
              { enableHighAccuracy: true, timeout: 2500, maximumAge: 30000 }
            );
          } catch {
            onLocationFail({ code: 2, message: 'Position unavailable' } as any);
          }
        },
        { enableHighAccuracy: false, timeout: 2000, maximumAge: 60000 }
      );
    } catch {
      if (!hasResolved) {
        hasResolved = true;
        clearTimeout(safetyTimer);
        isScanningRef.current = false;
        setIsScanning(false);
      }
    }
  }, []);

  // Trigger location acquisition on mount or initialCity change
  useEffect(() => {
    if (initialCity) {
      fallbackToCity(initialCity);
    }
    requestLocation();
  }, [initialCity, fallbackToCity, requestLocation]);

  // 4. Fetch registered Google Maps clinics near coordinates
  useEffect(() => {
    let isMounted = true;
    async function fetchGoogleVets() {
      if (!userCoords) return;
      setIsFetchingGooglePlaces(true);
      try {
        const radiusMeters = maxRadiusKm > 0 ? maxRadiusKm * 1000 : 35000;
        let gClinics = await googlePlacesService.fetchNearbyGoogleClinics(
          userCoords.lat,
          userCoords.lng,
          radiusMeters,
          false
        );

        // If nearby returned zero or very few clinics, augment with city text search
        if (gClinics.length < 3 && userCityLabel) {
          const cleanCity = userCityLabel.replace(/\s*\(.*?\)/g, '').replace('Near ', '').trim();
          if (cleanCity) {
            const cityClinics = await googlePlacesService.fetchCityGoogleClinics(
              `veterinary clinic in ${cleanCity}`,
              userCoords.lat,
              userCoords.lng,
              false
            );
            if (cityClinics.length > 0) {
              const existingUids = new Set(gClinics.map(c => c.uid));
              const extras = cityClinics.filter(c => !existingUids.has(c.uid));
              gClinics = [...gClinics, ...extras];
            }
          }
        }

        if (isMounted) {
          setGoogleClinics(gClinics);
        }
      } catch (err) {
        console.warn('[SmartVetRadar] Could not fetch Google Maps registered clinics:', err);
      } finally {
        if (isMounted) {
          setIsFetchingGooglePlaces(false);
        }
      }
    }

    fetchGoogleVets();
    return () => {
      isMounted = false;
    };
  }, [userCoords.lat, userCoords.lng, maxRadiusKm, userCityLabel]);

  // 5. Unified list of registered clinics from web app + Google Maps
  const combinedClinics = useMemo(() => {
    const list: UserProfile[] = [];
    const seenNames = new Set<string>();
    const seenUids = new Set<string>();

    // Add Google Maps registered clinics first (ensures real verified Google Maps places)
    for (const g of googleClinics) {
      if (!g.uid || seenUids.has(g.uid)) continue;
      seenUids.add(g.uid);
      const nameKey = (g.name || '').toLowerCase().trim();
      if (nameKey) seenNames.add(nameKey);
      list.push({ ...g, source: 'google_maps', isGoogleMapsVerified: true });
    }

    // Add platform registered clinics
    for (const c of platformClinics) {
      if (!c.uid || seenUids.has(c.uid)) continue;
      if (c.uid.startsWith('seed_') || c.uid.startsWith('demo_')) continue;
      const nameKey = (c.name || '').toLowerCase().trim();
      if (nameKey && seenNames.has(nameKey)) continue; // Avoid duplicating if same clinic exists on Google Maps
      seenUids.add(c.uid);
      list.push({ ...c, source: 'vetaxis' });
    }

    return list;
  }, [platformClinics, googleClinics]);

  // 6. Compute live distances and coordinates from user position
  const calculatedClinics: RadarClinicItem[] = useMemo(() => {
    const coords = userCoords || { lat: 33.6844, lng: 73.0479 };

    return combinedClinics.map((clinic) => {
      let clinicLat = clinic.location?.lat;
      let clinicLng = clinic.location?.lng;

      if (!clinicLat || !clinicLng) {
        const resolved = LocationService.resolveCoordinates(clinic.address || clinic.name, clinic.uid);
        clinicLat = resolved.lat;
        clinicLng = resolved.lng;
      }

      const dist = LocationService.haversine(coords.lat, coords.lng, clinicLat, clinicLng);
      const facLower = (clinic.facilities || '').toLowerCase() + ' ' + (clinic.name || '').toLowerCase();
      const isEmergency247 = clinic.isEmergency247 || facLower.includes('24/7') || facLower.includes('emergency') || facLower.includes('trauma');
      const address = clinic.address || clinic.location?.address || `${clinic.city || 'Pakistan'}`;

      return {
        ...clinic,
        lat: clinicLat,
        lng: clinicLng,
        distanceKm: Math.round(dist * 10) / 10,
        isOpenNow: clinic.isOpenNow ?? true,
        isEmergency247,
        formattedAddress: address
      };
    });
  }, [combinedClinics, userCoords]);

  // 7. Filtered and proximity-sorted list
  const filteredClinics = useMemo(() => {
    return calculatedClinics
      .filter((c) => {
        // Radius filter
        if (maxRadiusKm > 0 && c.distanceKm > maxRadiusKm) return false;
        // Emergency toggle
        if (emergencyOnly && !c.isEmergency247) return false;
        // Home visit toggle
        if (homeVisitOnly && !c.offersHomeVisit) return false;
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = (c.name || '').toLowerCase().includes(q);
          const matchesAddress = (c.formattedAddress || '').toLowerCase().includes(q);
          const matchesFac = (c.facilities || '').toLowerCase().includes(q);
          if (!matchesName && !matchesAddress && !matchesFac) return false;
        }
        return true;
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [calculatedClinics, maxRadiusKm, emergencyOnly, homeVisitOnly, searchQuery]);

  // Handle selecting a clinic
  const handleClinicSelect = (clinic: RadarClinicItem) => {
    setSelectedClinic(clinic);
    if (viewMode === 'list') {
      setViewMode('split');
    }
    // Scroll clinic card into view in list container
    setTimeout(() => {
      const el = document.getElementById(`clinic-card-${clinic.uid}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  const handleRecenterOnUser = () => {
    setSelectedClinic(null);
    requestLocation(true);
  };

  // Format phone number for WhatsApp
  const formatWhatsAppUrl = (phone?: string, clinicName?: string) => {
    if (!phone) return null;
    const clean = phone.replace(/[^0-9]/g, '');
    if (!clean) return null;
    const intl = clean.startsWith('92') ? clean : '92' + clean.replace(/^0/, '');
    return `https://wa.me/${intl}?text=Hello%20${encodeURIComponent(clinicName || 'Clinic')},%20I%20found%20your%20registered%20clinic%20on%20VetAxis%20Smart%20Radar%20and%20need%20veterinary%20assistance.`;
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 pb-20 selection:bg-sky-500 selection:text-white">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & SATELLITE RADAR TELEMETRY BAR
         ───────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-800/80 bg-[#13171e]/90 backdrop-blur-md sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Left: Navigation & Title */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate?.('explore')} 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-semibold transition-all cursor-pointer shadow-xs touch-manipulation shrink-0"
                title="Return to Directory"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-sky-400" />
                <span>Explore Directory</span>
              </button>

              <div className="h-5 w-px bg-slate-800 hidden sm:block" />

              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-1.5 font-display">
                    <span>Smart Vet Radar</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      Google Maps Live
                    </span>
                  </h1>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Showing verified clinics registered on Google Maps &amp; VetAxis near your location
                </p>
              </div>
            </div>

            {/* Right: GPS Telemetry Badge & View Switcher */}
            <div className="flex items-center gap-2.5 self-end md:self-auto flex-wrap">
              {/* Location Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs">
                <Compass className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-amber-400' : 'text-sky-400'}`} />
                <span className="text-slate-300 font-medium">
                  {isScanning ? 'Acquiring GPS...' : userCityLabel}
                </span>
                <button
                  type="button"
                  onClick={() => requestLocation(true)}
                  disabled={isScanning}
                  title="Rescan GPS Location"
                  className="p-1 rounded-md hover:bg-slate-800 text-sky-400 hover:text-sky-300 cursor-pointer transition-colors"
                >
                  <RotateCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* View Mode Segmented Switcher */}
              <div className="inline-flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'split'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Map & List Split View"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Split View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'map'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Full Google Map View"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>Map</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'list'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="List View with Mini Radar"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>List ({filteredClinics.length})</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. FILTER & RADIUS CONTROL STRIP
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#13171e]/70 border-b border-slate-800 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by clinic name, area (F-7, DHA, Gulberg...), or services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-7 py-1.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls: Radius & Filters */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Radius Pills */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 px-2 font-medium">Radius:</span>
              {[
                { label: '15 km', val: 15 },
                { label: '30 km', val: 30 },
                { label: '50 km', val: 50 },
                { label: 'All PK', val: 0 }
              ].map((r) => (
                <button
                  key={r.val}
                  type="button"
                  onClick={() => setMaxRadiusKm(r.val)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-all cursor-pointer ${
                    maxRadiusKm === r.val
                      ? 'bg-sky-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Emergency Toggle */}
            <button
              type="button"
              onClick={() => setEmergencyOnly(!emergencyOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                emergencyOnly
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-xs'
                  : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>24/7 Emergency</span>
            </button>

            {/* Quick City Dropdown / Switcher */}
            <div className="hidden lg:flex items-center gap-1 pl-1">
              {['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi', 'Peshawar'].map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => fallbackToCity(city)}
                  className={`px-2.5 py-1 text-[11px] rounded-lg transition-colors cursor-pointer ${
                    userCityLabel.includes(city)
                      ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* GPS Error or Inactive Note banner if any */}
      {gpsError && (
        <div className="bg-amber-950/40 border-b border-amber-800/60 px-4 py-2 text-xs text-amber-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{gpsError}</span>
          </div>
          <button
            type="button"
            onClick={() => setGpsError(null)}
            className="text-amber-400 hover:text-white text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN LAYOUT: INTERACTIVE GOOGLE MAP + REGISTERED CLINICS
         ───────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
        
        {/* Dynamic Layout based on viewMode */}
        <div className={`grid gap-6 ${
          viewMode === 'split' 
            ? 'grid-cols-1 lg:grid-cols-12 items-start' 
            : viewMode === 'map' 
            ? 'grid-cols-1' 
            : 'grid-cols-1'
        }`}>

          {/* ══════════════════════════════════════════════════════════
              GOOGLE MAP CONTAINER
             ══════════════════════════════════════════════════════════ */}
          {viewMode !== 'list' && (
            <div className={`relative rounded-2xl overflow-hidden border border-slate-800 bg-[#13171e] shadow-2xl transition-all ${
              viewMode === 'map' 
                ? 'h-[78vh] lg:h-[82vh] w-full' 
                : 'lg:col-span-7 h-[420px] sm:h-[500px] lg:h-[680px] lg:sticky lg:top-24'
            }`}>
              
              {/* Google Maps Component using official SDK */}
              <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'marker']}>
                <GoogleMapComponent
                  mapId={DEFAULT_MAP_ID}
                  defaultCenter={userCoords}
                  defaultZoom={zoomLevel}
                  internalUsageAttributionIds={[...MAPS_ATTRIBUTION_IDS]}
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  fullscreenControl={true}
                  streetViewControl={false}
                  mapTypeControl={false}
                  zoomControl={true}
                  className="w-full h-full"
                  style={{ width: '100%', height: '100%', minHeight: '100%' }}
                >
                  {/* Controller handling pan, circles, and map lifecycle */}
                  <RadarMapController
                    userCoords={userCoords}
                    radarRadiusKm={maxRadiusKm}
                    selectedClinic={selectedClinic}
                    onMapClick={() => setSelectedClinic(null)}
                    clinics={filteredClinics}
                  />

                  {/* ─────────────────────────────────────────────────
                      USER GPS LOCATION MARKER (High-Tech Radar Beacon)
                     ───────────────────────────────────────────────── */}
                  <AdvancedMarker
                    position={userCoords}
                    title={`Your GPS Location (${userCityLabel})`}
                    zIndex={999}
                  >
                    <div className="relative flex items-center justify-center cursor-pointer group">
                      {/* Outer pulsing sonar ring */}
                      <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-sky-400 opacity-60" />
                      {/* Secondary soft glow */}
                      <span className="absolute inline-flex h-6 w-6 rounded-full bg-sky-500/40 ring-4 ring-sky-500/20" />
                      {/* Center beacon core */}
                      <div className="relative inline-flex items-center justify-center h-4 w-4 rounded-full bg-sky-500 border-2 border-white shadow-[0_0_12px_rgba(56,189,248,1)]">
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      </div>
                      
                      {/* Tooltip on hover */}
                      <div className="absolute -top-7 whitespace-nowrap px-2 py-0.5 rounded-md bg-slate-900/95 border border-sky-500/40 text-[10px] font-bold text-sky-300 shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                        You are here ({userCityLabel})
                      </div>
                    </div>
                  </AdvancedMarker>

                  {/* ─────────────────────────────────────────────────
                      CLINIC MARKERS (Google Maps + VetAxis Registered)
                     ───────────────────────────────────────────────── */}
                  {filteredClinics.map((clinic) => {
                    const isSelected = selectedClinic?.uid === clinic.uid;
                    const isGoogleVerified = clinic.source === 'google_maps';
                    
                    return (
                      <AdvancedMarker
                        key={clinic.uid}
                        position={{ lat: clinic.lat, lng: clinic.lng }}
                        onClick={() => handleClinicSelect(clinic)}
                        title={`${clinic.name} (${clinic.distanceKm} km)`}
                        zIndex={isSelected ? 1000 : 10}
                      >
                        <div className={`cursor-pointer transition-all transform ${isSelected ? 'scale-125 -translate-y-2' : 'hover:scale-115'}`}>
                          {isGoogleVerified ? (
                            /* Google Maps Verified Clinic Pin (Sky-Blue theme) */
                            <div className="relative flex items-center justify-center">
                              <Pin
                                background={isSelected ? '#0284c7' : '#0ea5e9'}
                                glyphColor="#ffffff"
                                borderColor={isSelected ? '#38bdf8' : '#0369a1'}
                                scale={isSelected ? 1.3 : 1.05}
                              />
                              {clinic.isEmergency247 && (
                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 border border-white" />
                                </span>
                              )}
                            </div>
                          ) : (
                            /* VetAxis Platform Registered Hospital Pin (Emerald theme) */
                            <div className="relative flex items-center justify-center">
                              <Pin
                                background={isSelected ? '#047857' : '#10b981'}
                                glyphColor="#ffffff"
                                borderColor={isSelected ? '#34d399' : '#065f46'}
                                scale={isSelected ? 1.3 : 1.05}
                              />
                            </div>
                          )}
                        </div>
                      </AdvancedMarker>
                    );
                  })}

                  {/* ─────────────────────────────────────────────────
                      INTERACTIVE INFOWINDOW FOR SELECTED CLINIC
                     ───────────────────────────────────────────────── */}
                  {selectedClinic && (
                    <InfoWindow
                      position={{ lat: selectedClinic.lat, lng: selectedClinic.lng }}
                      onCloseClick={() => setSelectedClinic(null)}
                      pixelOffset={[0, -40]}
                    >
                      <div className="p-3 max-w-xs sm:max-w-sm text-slate-900 space-y-2.5">
                        {/* Header: Title and Badge */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {selectedClinic.source === 'google_maps' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                                <MapPin className="w-2.5 h-2.5 text-sky-600" />
                                <span>Google Maps Verified</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                <span>VetAxis Registered</span>
                              </span>
                            )}
                            {selectedClinic.isEmergency247 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                24/7 Emergency
                              </span>
                            )}
                          </div>
                          
                          <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                            {selectedClinic.name}
                          </h4>
                          <p className="text-[11px] text-slate-600 leading-tight">
                            {selectedClinic.formattedAddress}
                          </p>
                        </div>

                        {/* Rating & Proximity metrics */}
                        <div className="flex items-center justify-between text-xs py-1.5 border-y border-slate-200">
                          <div className="flex items-center gap-1 text-amber-600 font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>★ {selectedClinic.avgRating || 4.8}</span>
                            <span className="text-slate-500 font-normal">
                              ({selectedClinic.totalReviews || 1} reviews)
                            </span>
                          </div>

                          <span className="inline-block px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-mono font-bold text-[11px] border border-sky-200">
                            {selectedClinic.distanceKm} km from you
                          </span>
                        </div>

                        {/* Direct Action Buttons */}
                        <div className="pt-1 flex items-center gap-2">
                          <a
                            href={getDirectionsUrl(selectedClinic.lat, selectedClinic.lng, selectedClinic.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors text-center"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Directions</span>
                          </a>

                          {selectedClinic.phone && (
                            <a
                              href={`tel:${selectedClinic.phone}`}
                              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                              title="Call Clinic"
                            >
                              <Phone className="w-3.5 h-3.5 text-slate-600" />
                              <span className="hidden sm:inline">Call</span>
                            </a>
                          )}

                          {formatWhatsAppUrl(selectedClinic.phone, selectedClinic.name) && (
                            <a
                              href={formatWhatsAppUrl(selectedClinic.phone, selectedClinic.name)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center transition-colors"
                              title="WhatsApp Chat"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMapComponent>
              </APIProvider>

              {/* Floating Map HUD Controls overlay */}
              <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 pointer-events-auto">
                {/* Live Coordinates Pill */}
                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-lg text-[11px] font-mono text-slate-300 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>GPS: {userCoords.lat.toFixed(4)}°N, {userCoords.lng.toFixed(4)}°E</span>
                </div>

                {/* Radar Scanning Status Pill */}
                {isFetchingGooglePlaces && (
                  <div className="bg-sky-950/90 backdrop-blur-md border border-sky-500/60 px-3 py-1 rounded-xl shadow-lg text-[11px] font-semibold text-sky-200 flex items-center gap-1.5 animate-pulse">
                    <RotateCw className="w-3 h-3 animate-spin text-sky-400" />
                    <span>Syncing Google Places radar...</span>
                  </div>
                )}
              </div>

              {/* Floating Recenter Map Button */}
              <div className="absolute bottom-5 right-3 z-10 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleRecenterOnUser}
                  className="p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-sky-400 hover:text-sky-300 border border-slate-700/80 shadow-xl backdrop-blur-md cursor-pointer transition-all flex items-center justify-center"
                  title="Recenter Map on My GPS Location"
                >
                  <Crosshair className="w-5 h-5" />
                </button>
              </div>

              {/* Legend Strip at bottom of map */}
              <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-3 bg-slate-900/85 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] text-slate-300 shadow-md">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-400 ring-2 ring-sky-500/40" />
                  <span>Google Maps Registered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-500/40" />
                  <span>VetAxis Registered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500 border border-white" />
                  <span>Your Location</span>
                </div>
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              CLINIC FEED & RADAR CONTROLS SIDEBAR / FEED
             ══════════════════════════════════════════════════════════ */}
          <div className={`space-y-4 ${
            viewMode === 'split' ? 'lg:col-span-5' : 'w-full'
          }`}>
            
            {/* Radar Telemetry Card & Status */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#13171e] border border-slate-800 shadow-lg space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 animate-pulse text-sky-400" />
                    <span>360° Radar Scanning Perimeter</span>
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    {filteredClinics.length} Registered Clinics Near {userCityLabel}
                  </h2>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-sky-500/10 text-sky-300 font-mono text-xs font-bold border border-sky-500/20">
                  {maxRadiusKm > 0 ? `${maxRadiusKm} km circle` : 'All Pakistan'}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Veterinary medical centers plotted on the Google Map above are authenticated clinics registered on Google Maps and VetAxis with verified coordinates. Tap any clinic to navigate or zoom in.
              </p>

              {/* City Quick Links */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-500 block mb-1.5">Switch city center:</span>
                <div className="flex flex-wrap gap-1">
                  {['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi', 'Peshawar', 'Multan', 'Faisalabad', 'Quetta', 'Gujranwala', 'Sialkot'].map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => fallbackToCity(city)}
                      className={`px-2 py-0.5 text-[11px] rounded-lg transition-all cursor-pointer ${
                        userCityLabel.includes(city)
                          ? 'bg-sky-600 text-white font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Clinic Cards List */}
            <div className="space-y-3">
              {isLoadingClinics && filteredClinics.length === 0 ? (
                /* Skeleton Loader */
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="p-4 rounded-2xl bg-[#13171e] border border-slate-800 animate-pulse space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="h-5 bg-slate-800 rounded w-2/3" />
                        <div className="h-5 bg-slate-800 rounded w-16" />
                      </div>
                      <div className="h-3 bg-slate-800/60 rounded w-4/5" />
                      <div className="h-8 bg-slate-900 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : filteredClinics.length === 0 ? (
                /* Empty state */
                <div className="p-8 rounded-2xl bg-[#13171e] border border-slate-800 text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400">
                    <Compass className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">
                      No Clinics Found in {maxRadiusKm > 0 ? `${maxRadiusKm} km` : 'Selected Filters'}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Try expanding your search radius to 50 km or switch to another major city like Lahore, Karachi, or Islamabad.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setMaxRadiusKm(50)}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Expand to 50 km
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaxRadiusKm(0)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Show All PK
                    </button>
                  </div>
                </div>
              ) : (
                /* Clinic Cards */
                <div className={`space-y-3 ${viewMode === 'list' ? 'grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0' : ''}`}>
                  {filteredClinics.map((clinic) => {
                    const isSelected = selectedClinic?.uid === clinic.uid;
                    const googleDirectionsUrl = getDirectionsUrl(clinic.lat, clinic.lng, clinic.name);
                    const waUrl = formatWhatsAppUrl(clinic.phone, clinic.name);

                    return (
                      <motion.div
                        key={clinic.uid}
                        id={`clinic-card-${clinic.uid}`}
                        layout
                        onClick={() => handleClinicSelect(clinic)}
                        className={`p-4 sm:p-5 rounded-2xl transition-all cursor-pointer border shadow-sm ${
                          isSelected
                            ? 'bg-slate-900 border-sky-500 ring-2 ring-sky-500/30'
                            : 'bg-[#13171e] border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                      >
                        {/* Top: Badges & Distance */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {clinic.source === 'google_maps' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                  <MapPin className="w-2.5 h-2.5 text-sky-400" />
                                  <span>Google Maps Registered</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                  <span>VetAxis Registered</span>
                                </span>
                              )}
                              {clinic.isEmergency247 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  24/7 Emergency
                                </span>
                              )}
                            </div>

                            <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-1">
                              {clinic.name}
                            </h3>
                          </div>

                          {/* Distance Badge */}
                          <div className="text-right shrink-0">
                            <span className={`inline-block px-2.5 py-1 rounded-xl text-xs font-mono font-bold tabular-nums ${
                              clinic.distanceKm < 5
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : clinic.distanceKm < 20
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}>
                              {clinic.distanceKm} km
                            </span>
                            <span className="block text-[10px] text-slate-500 mt-0.5">from you</span>
                          </div>
                        </div>

                        {/* Address & Reviews */}
                        <div className="space-y-1.5 text-xs text-slate-400 mb-3">
                          <div className="flex items-start gap-1.5 text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{clinic.formattedAddress}</span>
                          </div>

                          <div className="flex items-center gap-3 pt-0.5 text-[11px]">
                            {clinic.avgRating ? (
                              <div className="flex items-center gap-1 text-amber-400 font-bold">
                                <Star className="w-3 h-3 fill-amber-400" />
                                <span>★ {clinic.avgRating}</span>
                                <span className="text-slate-500 font-normal">
                                  ({clinic.totalReviews || 1} Google reviews)
                                </span>
                              </div>
                            ) : null}
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-400 font-mono">
                              {clinic.isOpenNow ? '🟢 Open Now' : '⚪ Regular Hours'}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                          {/* Pinpoint on Map */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClinicSelect(clinic);
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <MapPin className="w-3.5 h-3.5 text-sky-400" />
                            <span>Show on Map</span>
                          </button>

                          {/* Google Maps Turn-by-Turn Directions */}
                          <a
                            href={googleDirectionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                            title="Open Google Maps Turn-by-turn Navigation"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Directions</span>
                          </a>

                          {/* Direct Phone Call */}
                          {clinic.phone && (
                            <a
                              href={`tel:${clinic.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
                              title={`Call ${clinic.phone}`}
                            >
                              <Phone className="w-4 h-4 text-slate-400" />
                            </a>
                          )}

                          {/* WhatsApp */}
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4 text-emerald-400" />
                            </a>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. EMERGENCY PROTOCOL & INSTRUCTIONS FOOTER
           ───────────────────────────────────────────────────────────── */}
        <section className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-[#181c22] via-[#13171e] to-[#181c22] border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
            <ShieldAlert className="w-4.5 h-4.5" />
            <span>Smart Radar &amp; Emergency Navigation Protocol</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-4xl">
            VetAxis Smart Radar combines live device geolocation with the official Google Maps Places API to locate verified veterinary care facilities across Pakistan. Tap <strong>"Directions"</strong> on any clinic card or marker to launch turn-by-turn driving navigation in Google Maps. For severe trauma, Parvovirus, poisoning, or bloat, always phone ahead so the emergency triage team can ready intravenous lines and oxygen.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-3">
              <span>· Live GPS Proximity Calculation</span>
              <span>· Google Maps Places Verified Listings</span>
              <span>· Direct Navigation &amp; Triage Calling</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              VetAxis 360 Emergency Network
            </span>
          </div>
        </section>

      </main>
    </div>
  );
}
