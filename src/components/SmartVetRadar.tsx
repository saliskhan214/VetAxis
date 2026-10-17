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
  Clock,
  Radio,
  AlertCircle,
  Map,
  ArrowRight,
  ArrowLeft
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
  
  // Filtering & Proximity controls - default to 50km for generous mobile coverage
  const [maxRadiusKm, setMaxRadiusKm] = useState<number>(50);
  const [sourceFilter, setSourceFilter] = useState<ClinicSourceFilter>('all');
  const [emergencyOnly, setEmergencyOnly] = useState<boolean>(false);
  const [homeVisitOnly, setHomeVisitOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Datasets - pre-populate with base directory clinics so mobile never displays 0 clinics on startup
  const [platformClinics, setPlatformClinics] = useState<UserProfile[]>(() => {
    return ExploreService.getBaseSeedClinics();
  });
  const [googleClinics, setGoogleClinics] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

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

      // 3. Additional fallback search for animal hospital if still 0
      if (liveGoogleClinics.length === 0 && cityLabel) {
        const cleanCity = cityLabel.replace(/^Near\s+/i, '');
        liveGoogleClinics = await googlePlacesService.fetchCityGoogleClinics(`animal hospital in ${cleanCity}`, lat, lng);
      }

      setGoogleClinics(liveGoogleClinics);
    } catch (err) {
      console.warn('Failed to load Google registered clinics:', err);
    } finally {
      setIsFetchingGooglePlaces(false);
    }
  }, []);

  // Mobile-first resilient two-stage Geolocation trigger
  const requestLocation = () => {
    setIsScanning(true);
    setGpsError(null);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation is not supported by your mobile browser. Showing clinics in Islamabad / all Pakistan:');
      setIsScanning(false);
      fallbackToCity('Islamabad');
      return;
    }

    let hasResolved = false;

    const onLocationSuccess = (pos: GeolocationPosition) => {
      if (hasResolved) return;
      hasResolved = true;
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setUserCoords({ lat, lng });
      setIsScanning(false);
      setGpsError(null);

      // Find closest Pakistani city label
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
      const label = minDist < 70 ? `Near ${closestCity}` : `${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E`;
      setUserCityLabel(label);

      // Fetch live Google Maps clinics for this exact GPS fix
      fetchGoogleClinicsForLocation(lat, lng, closestCity);
    };

    // Stage 1: Fast network/cell/Wi-Fi triangulation (~150ms on mobile phones)
    navigator.geolocation.getCurrentPosition(
      onLocationSuccess,
      (networkErr) => {
        console.warn('Network location unavailable, attempting hardware GPS:', networkErr);
        // Stage 2: Hardware GPS with 8s timeout
        navigator.geolocation.getCurrentPosition(
          onLocationSuccess,
          (gpsErr) => {
            if (hasResolved) return;
            hasResolved = true;
            console.warn('GPS hardware location error:', gpsErr);
            setIsScanning(false);
            setGpsError('Could not acquire GPS fix indoors. Select your nearest city below:');
            if (!userCoords) {
              fallbackToCity('Islamabad');
            }
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
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

  // Active searching state: actively scanning GPS, fetching Google Places, or loading initial platform data
  const isActivelySearching = isScanning || (isFetchingGooglePlaces && combinedClinics.length === 0) || (loading && combinedClinics.length === 0);

  // Proximity alternatives beyond user's current search radius (for empty state recommendations)
  const nearestOutsideRadiusClinics = useMemo(() => {
    if (filteredClinics.length > 0) return [];
    return [...calculatedClinics]
      .filter((c) => {
        if (sourceFilter === 'google' && c.source !== 'google_maps') return false;
        if (sourceFilter === 'vetaxis' && c.source === 'google_maps') return false;
        if (emergencyOnly && !c.isEmergency247) return false;
        if (homeVisitOnly && !c.offersHomeVisit) return false;
        return true;
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 6);
  }, [calculatedClinics, filteredClinics.length, sourceFilter, emergencyOnly, homeVisitOnly]);

  const renderClinicCard = (clinic: ClinicWithDistance) => {
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
                <span className="text-slate-500 font-normal">({clinic.totalReviews || 24} reviews)</span>
              </span>
            </div>
          </div>

          {/* Distance Indicator */}
          <div className="text-right shrink-0">
            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-mono font-bold tabular-nums ${
              clinic.distanceKm < 5
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : clinic.distanceKm < 25
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
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
  };

  return (
    <div className="min-h-screen bg-[#121417] text-slate-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header & Breadcrumb with Visible Back Button */}
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button 
              onClick={() => onNavigate?.('explore')} 
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title="Return to Directory"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-sky-400" />
              <span>Back to Directory</span>
            </button>

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

              {/* Rotating scanner beam - speeds up during active search */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: isActivelySearching ? 1.5 : 4, ease: 'linear' }}
                className="absolute inset-0 rounded-full origin-center pointer-events-none"
                style={{
                  background: isActivelySearching
                    ? 'conic-gradient(from 0deg, rgba(56, 189, 248, 0.75) 0deg, rgba(56, 189, 248, 0) 90deg, transparent 360deg)'
                    : 'conic-gradient(from 0deg, rgba(14, 165, 233, 0.4) 0deg, rgba(14, 165, 233, 0) 60deg, transparent 360deg)'
                }}
              />

              {/* Pulsing Sonar Ring when actively searching */}
              {isActivelySearching && (
                <motion.div
                  animate={{ scale: [1, 1.7], opacity: [0.8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
                  className="absolute inset-8 rounded-full border border-sky-400 pointer-events-none shadow-[0_0_15px_rgba(56,189,248,0.4)]"
                />
              )}

              {/* Center User Beacon */}
              <div className="relative z-10 w-4 h-4 rounded-full bg-sky-400 ring-4 ring-sky-500/40 shadow-[0_0_15px_rgba(56,189,248,1)] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>

              {/* Detected Clinic Blips on Radar */}
              {(filteredClinics.length > 0 ? filteredClinics : nearestOutsideRadiusClinics).slice(0, 10).map((c, i) => {
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
                <div className="inline-flex items-center gap-2 text-xs font-mono tracking-wider">
                  <Compass className={`w-3.5 h-3.5 ${isActivelySearching ? 'animate-spin text-amber-400' : 'text-sky-400'}`} style={{ animationDuration: isActivelySearching ? '2.5s' : '8s' }} />
                  <span className={isActivelySearching ? 'text-amber-300 font-semibold animate-pulse' : 'text-sky-400'}>
                    {isScanning 
                      ? 'ACQUIRING HIGH-PRECISION GPS LOCK...' 
                      : isFetchingGooglePlaces 
                        ? 'PINGING GOOGLE MAPS SATELLITE NETWORK...' 
                        : 'GOOGLE MAPS SATELLITE BEACON ACTIVE'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Current Location: <span className="text-sky-300 font-mono">{userCityLabel}</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
                  {userCoords 
                    ? `Coordinates: ${userCoords.lat.toFixed(4)}° N, ${userCoords.lng.toFixed(4)}° E · Found ${filteredClinics.length} clinics within ${maxRadiusKm > 0 ? `${maxRadiusKm} km` : 'search perimeter'} (${googleClinics.length} directly from Google Maps).`
                    : 'Locating nearby veterinary doctors, companion animal ICUs, and vaccine emergency units.'}
                </p>
              </div>

              {/* Location Refresh Trigger */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                <button
                  onClick={requestLocation}
                  disabled={isActivelySearching}
                  className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isActivelySearching ? 'animate-spin' : ''}`} />
                  <span>{isActivelySearching ? 'Scanning Satellite Network...' : 'Rescan GPS Location'}</span>
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
                  { label: '15 km', val: 15 },
                  { label: '30 km', val: 30 },
                  { label: '50 km', val: 50 },
                  { label: '100 km', val: 100 },
                  { label: 'All PK (Nearest)', val: 0 }
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
              <span>Showing <span className="font-mono text-slate-200 font-semibold">{filteredClinics.length}</span> clinics</span>
              <span className="text-slate-600">·</span>
              <span className="text-[11px] text-slate-500">Google Places API Live</span>
            </div>
          </div>
        </section>

        {/* Results List */}
        <section className="space-y-6">
          {/* Subtle Live Syncing Notice when results already exist and background Google Places is updating */}
          {isFetchingGooglePlaces && combinedClinics.length > 0 && !isActivelySearching && (
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-sky-950/40 border border-sky-500/30 text-xs text-sky-200 shadow-sm animate-pulse">
              <div className="flex items-center gap-2.5">
                <RotateCw className="w-4 h-4 animate-spin text-sky-400 shrink-0" />
                <span>Syncing live Google Maps pins and veterinary practices around <strong>{userCityLabel}</strong>...</span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 shrink-0">
                LIVE REFRESH
              </span>
            </div>
          )}

          {isActivelySearching ? (
            /* Visual Loading State: Actively Searching for nearby clinics */
            <div className="space-y-6">
              {/* Animated Sonar Radar Sweeping Banner */}
              <div className="relative overflow-hidden rounded-2xl border border-sky-500/30 bg-gradient-to-r from-sky-950/50 via-[#181c22] to-sky-950/40 p-6 shadow-xl">
                <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-sky-500/10 blur-3xl pointer-events-none animate-pulse" />
                <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10">
                  {/* Sonar Beacon Graphic */}
                  <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                    <span className="absolute inset-0 rounded-full border border-sky-400/30 animate-ping" />
                    <span className="absolute inset-2 rounded-full border border-sky-400/50 animate-pulse" />
                    <div className="w-12 h-12 rounded-full bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.5)]">
                      <Radio className="w-6 h-6 animate-spin text-sky-400" style={{ animationDuration: '4s' }} />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-center sm:text-left flex-1">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                      <span>SEARCHING RADAR RADIUS · {maxRadiusKm > 0 ? `${maxRadiusKm} KM` : 'ALL DISTRICTS'}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white">
                      Scanning for Veterinary Clinics &amp; Emergency Care...
                    </h3>
                    <p className="text-xs text-slate-300">
                      Querying live Google Maps satellite database and certified VetAxis partner hospitals around{' '}
                      <span className="text-sky-300 font-semibold">{userCityLabel}</span>.
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-300 font-mono">
                    <RotateCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                    <span>Pinging Radar</span>
                  </div>
                </div>
              </div>

              {/* Shimmering Skeleton Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-[#181c22] border border-slate-800 space-y-4 shadow-sm animate-pulse"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <div className="h-5 bg-slate-800 rounded-md w-3/4" />
                        <div className="h-3.5 bg-slate-800/60 rounded-md w-1/2" />
                      </div>
                      <div className="h-6 w-20 bg-sky-950/60 border border-sky-800/40 rounded-full" />
                    </div>
                    <div className="space-y-2 pt-1">
                      <div className="h-3.5 bg-slate-800/70 rounded-md w-full" />
                      <div className="h-3.5 bg-slate-800/50 rounded-md w-5/6" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <div className="h-8 bg-slate-800/80 rounded-xl flex-1" />
                      <div className="h-8 bg-slate-800/80 rounded-xl flex-1" />
                      <div className="h-8 w-10 bg-slate-800/80 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredClinics.length === 0 ? (
            /* Empty State: Custom illustration and message if no clinics within search radius */
            <div className="p-8 sm:p-12 text-center bg-[#181c22] rounded-2xl border border-slate-800 space-y-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-500/5 blur-3xl pointer-events-none rounded-full" />

              {/* Custom High-Fidelity Radar Illustration */}
              <div className="relative mx-auto w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center">
                <svg
                  viewBox="0 0 200 200"
                  className="w-full h-full drop-shadow-[0_4px_25px_rgba(56,189,248,0.2)]"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Outer search perimeter ring */}
                  <circle
                    cx="100"
                    cy="100"
                    r="88"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    strokeOpacity="0.3"
                  />
                  {/* Secondary concentric radius */}
                  <circle
                    cx="100"
                    cy="100"
                    r="64"
                    stroke="#38bdf8"
                    strokeWidth="1.2"
                    strokeOpacity="0.35"
                  />
                  {/* Inner core range */}
                  <circle
                    cx="100"
                    cy="100"
                    r="40"
                    stroke="#38bdf8"
                    strokeWidth="1"
                    strokeOpacity="0.45"
                  />
                  {/* Scope crosshairs */}
                  <line x1="12" y1="100" x2="188" y2="100" stroke="#38bdf8" strokeWidth="0.8" strokeOpacity="0.25" />
                  <line x1="100" y1="12" x2="100" y2="188" stroke="#38bdf8" strokeWidth="0.8" strokeOpacity="0.25" />

                  {/* Sweeping radar sector angle */}
                  <path
                    d="M 100 100 L 162 38 A 88 88 0 0 0 100 12 Z"
                    fill="url(#radarSweepGrad)"
                    fillOpacity="0.35"
                  />

                  {/* Center Radar Scanner Dish & Antenna */}
                  <circle cx="100" cy="100" r="18" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  <circle cx="100" cy="100" r="8" fill="#38bdf8" />
                  <circle cx="100" cy="100" r="3" fill="#ffffff" />

                  {/* Emitted signal waves */}
                  <path
                    d="M 125 80 A 35 35 0 0 1 135 110"
                    stroke="#fbbf24"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeOpacity="0.85"
                  />
                  <path
                    d="M 137 70 A 50 50 0 0 1 150 115"
                    stroke="#fbbf24"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeOpacity="0.5"
                  />

                  {/* Subtle Pet Silhouette inside scope */}
                  <path
                    d="M 68 64 C 69 62 72 62 73 64 C 74 66 72 68 70 68 C 68 68 67 66 68 64 Z
                       M 77 60 C 78 58 81 58 82 60 C 83 62 81 64 79 64 C 77 64 76 62 77 60 Z
                       M 86 64 C 87 62 90 62 91 64 C 92 66 90 68 88 68 C 86 68 85 66 86 64 Z
                       M 74 72 C 72 70 85 70 83 72 C 81 77 76 77 74 72 Z"
                    fill="#38bdf8"
                    fillOpacity="0.5"
                  />

                  {/* Zero Pings Alert Icon Badge */}
                  <g transform="translate(142, 142)">
                    <circle cx="14" cy="14" r="14" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
                    <text x="14" y="19" textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="bold">!</text>
                  </g>

                  <defs>
                    <radialGradient id="radarSweepGrad" cx="100" cy="100" r="88" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
                      <stop offset="70%" stopColor="#0ea5e9" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                </svg>
              </div>

              {/* Empty State Message */}
              <div className="space-y-2 max-w-lg mx-auto">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>0 CLINICS WITHIN {maxRadiusKm > 0 ? `${maxRadiusKm} KM` : 'SEARCH PERIMETER'}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  No Clinics Found Near {userCityLabel}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  No registered veterinary practices or emergency animal hospitals were located within your current{' '}
                  <span className="text-amber-300 font-semibold">{maxRadiusKm > 0 ? `${maxRadiusKm} km radius` : 'selected filters'}</span>.
                  Expand your scanning perimeter or select a neighboring city to view certified clinics.
                </p>

                {/* Active filter reminder if filters are restricting */}
                {(emergencyOnly || homeVisitOnly || searchQuery || sourceFilter !== 'all') && (
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-400">
                    <span className="text-slate-500 font-medium">Active filters:</span>
                    {emergencyOnly && <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">24/7 Emergency</span>}
                    {homeVisitOnly && <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">Home Visit</span>}
                    {sourceFilter !== 'all' && <span className="bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded">{sourceFilter.toUpperCase()}</span>}
                    {searchQuery && <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded">"{searchQuery}"</span>}
                  </div>
                )}
              </div>

              {/* Recovery Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setMaxRadiusKm(100);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Expand Radius to 100 km</span>
                </button>
                <button
                  onClick={() => {
                    setMaxRadiusKm(0);
                    setSourceFilter('all');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all border border-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <Map className="w-3.5 h-3.5 text-sky-400" />
                  <span>Scan All Pakistan Clinics</span>
                </button>
                {(emergencyOnly || homeVisitOnly || searchQuery || sourceFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setEmergencyOnly(false);
                      setHomeVisitOnly(false);
                      setSearchQuery('');
                      setSourceFilter('all');
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors border border-slate-800 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              {/* Quick City Switcher inside empty state */}
              <div className="pt-4 border-t border-slate-800/80 max-w-xl mx-auto">
                <span className="text-xs text-slate-400 block mb-2.5">Or jump directly to a major veterinary hub:</span>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi', 'Peshawar', 'Faisalabad', 'Multan', 'Quetta', 'Gujranwala', 'Sialkot'].map((city) => (
                    <button
                      key={city}
                      onClick={() => fallbackToCity(city)}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-800/80 text-slate-300 hover:bg-sky-600 hover:text-white transition-all cursor-pointer border border-slate-700/60"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nearest Clinics Outside Radius Recommendations (Guaranteeing mobile users always have access) */}
              {nearestOutsideRadiusClinics.length > 0 && (
                <div className="mt-8 pt-8 border-t border-slate-800 text-left max-w-5xl mx-auto space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 mb-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>CLOSEST AVAILABLE FACILITIES ACROSS PAKISTAN</span>
                      </div>
                      <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 font-display">
                        <span>Nearest Emergency Hospitals &amp; Clinics (Starting at {nearestOutsideRadiusClinics[0].distanceKm} km away)</span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        While no clinics were found within your {maxRadiusKm > 0 ? `${maxRadiusKm} km circle` : 'selected filters'}, here are the certified clinics closest to your device coordinates:
                      </p>
                    </div>

                    <button
                      onClick={() => setMaxRadiusKm(0)}
                      className="px-3.5 py-2 rounded-xl bg-sky-600/30 hover:bg-sky-600 text-sky-200 hover:text-white border border-sky-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Scan All ({calculatedClinics.length})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {nearestOutsideRadiusClinics.map((clinic) => renderClinicCard(clinic))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredClinics.map((clinic) => renderClinicCard(clinic))}
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
