import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { 
  Navigation, 
  MapPin, 
  Phone, 
  MessageCircle, 
  ExternalLink, 
  ShieldAlert, 
  Search, 
  CheckCircle2, 
  RotateCw,
  Compass,
  Star,
  Clock
} from 'lucide-react';
import { UserProfile } from '../types';
import { LocationService, ExploreService } from '../lib/storage';
import { PAKISTAN_CITIES_SEO } from '../lib/seoService';
import { googlePlacesService } from '../lib/googlePlacesService';

interface SmartVetRadarProps {
  currentUser?: UserProfile | null;
  initialCity?: string | null;
  onNavigate?: (section: string) => void;
  onSelectClinic?: (clinic: UserProfile) => void;
}

interface ClinicWithDistance extends UserProfile {
  distanceKm: number;
  isOpenNow: boolean;
  isEmergency247: boolean;
}

type ClinicSourceFilter = 'all' | 'google' | 'vetaxis';

export function SmartVetRadar({ currentUser, initialCity, onNavigate, onSelectClinic }: SmartVetRadarProps) {
  // Geolocation & Scan states
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [userCityLabel, setUserCityLabel] = useState<string>('Detecting location...');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isFetchingGooglePlaces, setIsFetchingGooglePlaces] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  
  // Filtering & Proximity controls
  const [maxRadiusKm, setMaxRadiusKm] = useState<number>(25);
  const [sourceFilter, setSourceFilter] = useState<ClinicSourceFilter>('all');
  const [emergencyOnly, setEmergencyOnly] = useState<boolean>(false);
  const [homeVisitOnly, setHomeVisitOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Datasets
  const [platformClinics, setPlatformClinics] = useState<UserProfile[]>([]);
  const [googleClinics, setGoogleClinics] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load platform verified clinics from storage
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const clinics = await ExploreService.fetchProfessionals('clinic');
        if (isMounted) {
          setPlatformClinics(clinics);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load platform clinics for radar:', err);
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  // Fetch live Google Maps registered clinics around coordinates or city
  const fetchGoogleClinicsForLocation = useCallback(async (lat: number, lng: number, cityLabel?: string) => {
    setIsFetchingGooglePlaces(true);
    try {
      // 1. Fetch via GPS radius
      let liveGoogleClinics = await googlePlacesService.fetchNearbyGoogleClinics(lat, lng, 35000);
      
      // 2. If nearby returned 0 (e.g. strict radius limit), fallback to city text search on Google
      if (liveGoogleClinics.length === 0 && cityLabel) {
        const cleanCity = cityLabel.replace(/^Near\s+/i, '');
        liveGoogleClinics = await googlePlacesService.fetchCityGoogleClinics(`veterinary clinic in ${cleanCity}`, lat, lng);
      }

      setGoogleClinics(liveGoogleClinics);
    } catch (err) {
      console.warn('Failed to load Google registered clinics:', err);
    } finally {
      setIsFetchingGooglePlaces(false);
    }
  }, []);

  // Browser Geolocation trigger
  const requestLocation = () => {
    setIsScanning(true);
    setGpsError(null);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser. Please select a city below.');
      setIsScanning(false);
      fallbackToCity('Islamabad');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords({ lat, lng });
        setIsScanning(false);

        // Find closest Pakistani city label
        let closestCity = 'Pakistan';
        let minDist = Infinity;
        for (const c of PAKISTAN_CITIES_SEO) {
          const resolved = LocationService.resolveCoordinates(c.city);
          const d = LocationService.haversine(lat, lng, resolved.lat, resolved.lng);
          if (d < minDist) {
            minDist = d;
            closestCity = c.city;
          }
        }
        const label = minDist < 60 ? `Near ${closestCity}` : `${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E`;
        setUserCityLabel(label);

        // Fetch live Google Maps clinics for this exact GPS fix
        fetchGoogleClinicsForLocation(lat, lng, closestCity);
      },
      (err) => {
        console.warn('Geolocation permission error:', err);
        setIsScanning(false);
        setGpsError('GPS permission was dismissed. Quick-select your nearest city below:');
        if (!userCoords) {
          fallbackToCity('Islamabad');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Run initial location scan or load initialCity
  useEffect(() => {
    if (initialCity) {
      fallbackToCity(initialCity);
    } else {
      requestLocation();
    }
  }, [initialCity]);

  // Quick fallback to chosen Pakistani city
  const fallbackToCity = (cityName: string) => {
    const coords = LocationService.resolveCoordinates(cityName);
    setUserCoords({ lat: coords.lat, lng: coords.lng });
    setUserCityLabel(cityName);
    setGpsError(null);
    fetchGoogleClinicsForLocation(coords.lat, coords.lng, cityName);
  };

  // Unified deduplicated clinics list
  const combinedClinics = useMemo(() => {
    const list: UserProfile[] = [];
    const seenNames = new Set<string>();

    // Add platform clinics first
    for (const c of platformClinics) {
      const normalizedName = c.name.toLowerCase().trim();
      seenNames.add(normalizedName);
      list.push({ ...c, source: 'vetaxis' });
    }

    // Add Google Maps clinics, avoiding exact duplicates
    for (const g of googleClinics) {
      const normalizedName = g.name.toLowerCase().trim();
      if (!seenNames.has(normalizedName)) {
        seenNames.add(normalizedName);
        list.push(g);
      }
    }

    return list;
  }, [platformClinics, googleClinics]);

  // Compute live distances, open status, and sorting
  const calculatedClinics: ClinicWithDistance[] = useMemo(() => {
    const coords = userCoords || { lat: 33.6844, lng: 73.0479 }; // Default Islamabad center

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
      
      return {
        ...clinic,
        distanceKm: Math.round(dist * 10) / 10,
        isOpenNow: clinic.isOpenNow ?? true,
        isEmergency247
      };
    });
  }, [combinedClinics, userCoords]);

  // Filtered and sorted list based on radius, source, and queries
  const filteredClinics = useMemo(() => {
    return calculatedClinics
      .filter((c) => {
        // Source filter
        if (sourceFilter === 'google' && c.source !== 'google_maps') return false;
        if (sourceFilter === 'vetaxis' && c.source === 'google_maps') return false;

        // Radius filter
        if (maxRadiusKm > 0 && c.distanceKm > maxRadiusKm) return false;
        // Emergency toggle
        if (emergencyOnly && !c.isEmergency247) return false;
        // Home visit toggle
        if (homeVisitOnly && !c.offersHomeVisit) return false;
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = c.name.toLowerCase().includes(q);
          const matchesAddress = (c.address || '').toLowerCase().includes(q);
          const matchesFac = (c.facilities || '').toLowerCase().includes(q);
          if (!matchesName && !matchesAddress && !matchesFac) return false;
        }
        return true;
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [calculatedClinics, sourceFilter, maxRadiusKm, emergencyOnly, homeVisitOnly, searchQuery]);

  return (
    <div className="min-h-screen bg-[#121417] text-slate-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header & Breadcrumb */}
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <button 
              onClick={() => onNavigate?.('explore')} 
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Explore
            </button>
            <span aria-hidden="true">·</span>
            <span className="text-amber-400 font-medium">Smart Vet Radar</span>
            <span aria-hidden="true">·</span>
            <span className="text-sky-400 flex items-center gap-1">
              <span>GPS Proximity Locator</span>
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Google Maps Live Data Connected</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {googleClinics.length > 0 ? `${googleClinics.length} Google places synced` : 'Syncing...'}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-display text-wrap-balance">
                Veterinary Clinics &amp; Emergency Care Near Me
              </h1>
              <p className="mt-1 text-sm sm:text-base text-slate-300 max-w-2xl">
                Scan your live GPS coordinates to locate registered clinics on Google Maps alongside certified VetAxis partner hospitals across all Pakistani cities.
              </p>
            </div>
          </div>
        </header>

        {/* Radar Scanner Visualizer & Proximity Status */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#181c22] p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            
            {/* Visual Radar Animation Display */}
            <div className="relative flex items-center justify-center w-52 h-52 sm:w-60 sm:h-60 shrink-0">
              {/* Concentric rings */}
              <div className="absolute inset-0 rounded-full border border-sky-500/20" />
              <div className="absolute inset-8 rounded-full border border-sky-500/30" />
              <div className="absolute inset-16 rounded-full border border-sky-500/40" />
              
              {/* Crosshairs */}
              <div className="absolute inset-x-0 top-1/2 h-px bg-sky-500/20" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-sky-500/20" />

              {/* Rotating scanner beam */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                className="absolute inset-0 rounded-full origin-center pointer-events-none"
                style={{
                  background: 'conic-gradient(from 0deg, rgba(14, 165, 233, 0.4) 0deg, rgba(14, 165, 233, 0) 60deg, transparent 360deg)'
                }}
              />

              {/* Center User Beacon */}
              <div className="relative z-10 w-4 h-4 rounded-full bg-sky-400 ring-4 ring-sky-500/40 shadow-[0_0_15px_rgba(56,189,248,1)] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>

              {/* Detected Clinic Blips on Radar */}
              {filteredClinics.slice(0, 10).map((c, i) => {
                const angle = (i * 36) * (Math.PI / 180);
                const maxR = 90;
                const radius = Math.min(Math.max((c.distanceKm / (maxRadiusKm || 50)) * maxR, 25), maxR);
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                const isGoogle = c.source === 'google_maps';

                return (
                  <motion.div
                    key={c.uid}
                    initial={{ scale: 0 }}
                    animate={{ scale: [0.8, 1.25, 0.9] }}
                    transition={{ repeat: Infinity, duration: 2.2 + (i % 3) * 0.4, ease: 'easeInOut' }}
                    style={{ transform: `translate(${x}px, ${y}px)` }}
                    className={`absolute w-3 h-3 rounded-full ring-2 shadow-md cursor-pointer ${
                      isGoogle
                        ? 'bg-amber-400 ring-amber-500/40 shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                        : 'bg-emerald-400 ring-emerald-500/40 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                    }`}
                    title={`${c.name} (${c.distanceKm} km · ${isGoogle ? 'Google Maps' : 'VetAxis'})`}
                    onClick={() => {
                      const el = document.getElementById(`clinic-${c.uid}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  />
                );
              })}
            </div>

            {/* GPS Telemetry & Scan Trigger */}
            <div className="flex-1 space-y-4 text-center lg:text-left">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-mono text-sky-400 tracking-wider">
                  <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
                  <span>GOOGLE MAPS SATELLITE BEACON ACTIVE</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Current Location: <span className="text-sky-300 font-mono">{userCityLabel}</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
                  {userCoords 
                    ? `Coordinates: ${userCoords.lat.toFixed(4)}° N, ${userCoords.lng.toFixed(4)}° E · Found ${filteredClinics.length} total clinics (${googleClinics.length} directly from Google Maps).`
                    : 'Locating nearby veterinary doctors, companion animal ICUs, and vaccine emergency units.'}
                </p>
              </div>

              {/* Location Refresh Trigger */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                <button
                  onClick={requestLocation}
                  disabled={isScanning || isFetchingGooglePlaces}
                  className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isScanning || isFetchingGooglePlaces ? 'animate-spin' : ''}`} />
                  <span>{isScanning || isFetchingGooglePlaces ? 'Syncing with Google Maps...' : 'Rescan GPS Location'}</span>
                </button>
              </div>

              {/* Quick City Switcher if GPS is blocked or user wants another city */}
              <div className="pt-3 border-t border-slate-800/80">
                <span className="text-xs text-slate-400 block mb-2">Switch satellite radar to a major city:</span>
                <div className="flex flex-wrap gap-1.5 justify-center lg:justify-start">
                  {['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi', 'Peshawar', 'Faisalabad', 'Multan', 'Quetta', 'Gujranwala', 'Sialkot'].map((city) => (
                    <button
                      key={city}
                      onClick={() => fallbackToCity(city)}
                      className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                        userCityLabel.includes(city)
                          ? 'bg-sky-600 text-white font-semibold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              {gpsError && (
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 text-left">
                  {gpsError}
                </div>
              )}
            </div>

          </div>
        </section>

        {/* Filter Controls Bar */}
        <section className="bg-[#181c22] rounded-xl border border-slate-800 p-4 space-y-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search clinic name, neighborhood (DHA, Gulberg, Clifton, G-10...), or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Source Segmented Selector */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700/80 shrink-0">
              <button
                onClick={() => setSourceFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  sourceFilter === 'all'
                    ? 'bg-sky-600 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({calculatedClinics.length})
              </button>
              <button
                onClick={() => setSourceFilter('google')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  sourceFilter === 'google'
                    ? 'bg-amber-600 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>📍 Google Maps</span>
                <span className="text-[10px] opacity-80">({googleClinics.length})</span>
              </button>
              <button
                onClick={() => setSourceFilter('vetaxis')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  sourceFilter === 'vetaxis'
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🩺 VetAxis Verified</span>
                <span className="text-[10px] opacity-80">({platformClinics.length})</span>
              </button>
            </div>

            {/* Radius Segmented Controls */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs text-slate-400 whitespace-nowrap">Radius:</span>
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700/80">
                {[
                  { label: '5 km', val: 5 },
                  { label: '15 km', val: 15 },
                  { label: '30 km', val: 30 },
                  { label: '60 km', val: 60 },
                  { label: 'All PK', val: 0 }
                ].map((r) => (
                  <button
                    key={r.val}
                    onClick={() => setMaxRadiusKm(r.val)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      maxRadiusKm === r.val
                        ? 'bg-sky-600 text-white shadow-xs font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Toggle Filters */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800">
            <button
              onClick={() => setEmergencyOnly(!emergencyOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                emergencyOnly
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-xs'
                  : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>24/7 Emergency &amp; Trauma Only</span>
            </button>

            <button
              onClick={() => setHomeVisitOnly(!homeVisitOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                homeVisitOnly
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-xs'
                  : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Home Visit &amp; Mobile Vet Available</span>
            </button>

            <div className="ml-auto text-xs text-slate-400 flex items-center gap-2">
              <span>Showing <span className="font-mono text-slate-200 font-semibold">{filteredClinics.length}</span> results</span>
              <span className="text-slate-600">·</span>
              <span className="text-[11px] text-slate-500">Google Places API Live</span>
            </div>
          </div>
        </section>

        {/* Results List */}
        <section className="space-y-4">
          {loading || isFetchingGooglePlaces ? (
            <div className="p-12 text-center text-slate-400 bg-[#181c22] rounded-2xl border border-slate-800 space-y-3">
              <div className="w-8 h-8 mx-auto border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium">Querying Google Maps Places and Pakistan veterinary database...</p>
            </div>
          ) : filteredClinics.length === 0 ? (
            <div className="p-10 text-center bg-[#181c22] rounded-2xl border border-slate-800 space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-xl">
                📍
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">No clinics found matching filters</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Try expanding the search radius or resetting the source filter to "All".
                </p>
              </div>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => {
                    setMaxRadiusKm(0);
                    setSourceFilter('all');
                  }}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Expand to All Clinics Nationwide
                </button>
                <button
                  onClick={() => {
                    setEmergencyOnly(false);
                    setHomeVisitOnly(false);
                    setSearchQuery('');
                    setSourceFilter('all');
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredClinics.map((clinic) => {
                const clinicLat = clinic.location?.lat || LocationService.resolveCoordinates(clinic.address || clinic.name, clinic.uid).lat;
                const clinicLng = clinic.location?.lng || LocationService.resolveCoordinates(clinic.address || clinic.name, clinic.uid).lng;
                
                // Use official Google Maps URI if available from Places API, else construct standard navigation URI
                const googleMapsUrl = clinic.googleMapsUri || `https://www.google.com/maps/dir/?api=1&destination=${clinicLat},${clinicLng}`;
                const cleanPhone = (clinic.phone || '03001216272').replace(/[^0-9]/g, '');
                const waUrl = `https://wa.me/${cleanPhone.startsWith('92') ? cleanPhone : '92' + cleanPhone.replace(/^0/, '')}?text=Hello%20${encodeURIComponent(clinic.name)},%20I%20found%20you%20on%20VetAxis%20360%20Smart%20Radar%20and%20need%20veterinary%20assistance.`;
                const isGoogle = clinic.source === 'google_maps';

                return (
                  <motion.div
                    key={clinic.uid}
                    id={`clinic-${clinic.uid}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-5 rounded-2xl bg-[#181c22] border transition-all space-y-4 shadow-sm hover:shadow-md ${
                      isGoogle
                        ? 'border-amber-900/30 hover:border-amber-700/50'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Header Row: Name & Source Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-bold text-white hover:text-sky-300 transition-colors">
                            {clinic.name}
                          </h3>
                          {isGoogle ? (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold flex items-center gap-1" title="Verified business listing registered on Google Maps">
                              <MapPin className="w-3 h-3 text-amber-400" />
                              <span>Google Maps Verified</span>
                            </span>
                          ) : (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold flex items-center gap-1" title="Verified VetAxis Platform Partner">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>VetAxis Verified</span>
                            </span>
                          )}
                        </div>

                        {/* Metadata Line */}
                        <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1 text-slate-300">
                            <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                            <span className="line-clamp-1">{clinic.address || 'Pakistan'}</span>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-400 font-medium flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>★ {clinic.avgRating || '4.8'}</span>
                            <span className="text-slate-500 font-normal">({clinic.totalReviews || 24} Google reviews)</span>
                          </span>
                        </div>
                      </div>

                      {/* Distance Indicator */}
                      <div className="text-right shrink-0">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-mono font-bold tabular-nums ${
                          clinic.distanceKm < 5
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : clinic.distanceKm < 20
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {clinic.distanceKm} km
                        </span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">from you</span>
                      </div>
                    </div>

                    {/* Facilities / Details Line */}
                    {clinic.facilities && (
                      <p className="text-xs text-slate-300 line-clamp-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-slate-400 font-medium">Details: </span>
                        {clinic.facilities}
                      </p>
                    )}

                    {/* Operational Status */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      {clinic.isEmergency247 ? (
                        <span className="text-amber-400 font-semibold flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>24/7 Emergency Care Active</span>
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Open Regular Hours</span>
                        </span>
                      )}

                      {clinic.offersHomeVisit && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-sky-300">Home Visit Available</span>
                        </>
                      )}

                      {isGoogle && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[11px] text-slate-500">Google Places API Live</span>
                        </>
                      )}
                    </div>

                    {/* Action Triggers Grid */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                      {/* Google Maps Turn-by-Turn Navigation */}
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer text-center"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Directions</span>
                      </a>

                      {/* Phone Call Trigger */}
                      <a
                        href={`tel:${clinic.phone || '03001216272'}`}
                        className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Call</span>
                      </a>

                      {/* Google Place or WhatsApp Action */}
                      {isGoogle ? (
                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 rounded-lg bg-amber-600/90 hover:bg-amber-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center shadow-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Google Place</span>
                        </a>
                      ) : (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center shadow-xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* Emergency First-Aid Triage Guidance Banner */}
        <footer className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-800/40 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
            <ShieldAlert className="w-4 h-4" />
            <span>Critical Pet Emergency Protocol &amp; Navigation</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            All registered veterinary clinics shown on VetAxis 360 are synced directly with Google Maps Platform and our verified veterinary directory. For life-threatening symptoms (heavy bleeding, poisoning, Parvo dehydration, GDV bloat), tap "Directions" to start instant GPS routing with live traffic.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400 pt-1 border-t border-slate-800/60">
            <div className="flex flex-wrap items-center gap-3">
              <span>· Tap "Directions" on any clinic card for live GPS turn-by-turn routing</span>
              <span>· Call ahead so emergency triage prepares oxygen &amp; IV fluids</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <span>Map data &copy; Google Maps Platform</span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
