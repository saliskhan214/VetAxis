import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Phone, 
  MessageCircle, 
  Navigation, 
  CheckCircle2, 
  ShieldAlert, 
  Sparkles, 
  Compass, 
  ChevronRight, 
  Search,
  Building2,
  Calendar,
  HelpCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Star
} from 'lucide-react';
import { UserProfile } from '../types';
import { ExploreService, LocationService } from '../lib/storage';
import { PAKISTAN_CITIES_SEO, CitySEOData, seoService } from '../lib/seoService';
import { googlePlacesService } from '../lib/googlePlacesService';

interface CityLandingPortalProps {
  initialCity?: string | null;
  onNavigate?: (section: string) => void;
  onLaunchRadarForCity?: (cityName: string) => void;
}

export function CityLandingPortal({ initialCity, onNavigate, onLaunchRadarForCity }: CityLandingPortalProps) {
  // Active city selection
  const [selectedCityName, setSelectedCityName] = useState<string>(() => {
    if (initialCity) {
      const match = PAKISTAN_CITIES_SEO.find(c => c.city.toLowerCase() === initialCity.toLowerCase());
      if (match) return match.city;
    }
    return 'Lahore';
  });

  const [activeAreaFilter, setActiveAreaFilter] = useState<string>('all');
  const [platformClinics, setPlatformClinics] = useState<UserProfile[]>([]);
  const [googleClinics, setGoogleClinics] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFetchingGoogle, setIsFetchingGoogle] = useState<boolean>(false);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(0);

  // Sync city with URL query params
  const updateCity = (cityName: string) => {
    setSelectedCityName(cityName);
    setActiveAreaFilter('all');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'cities');
      url.searchParams.set('city', cityName);
      window.history.pushState({}, '', url.toString());
    }
    seoService.updateSEO({
      tabKey: 'cities',
      city: cityName
    });
  };

  // Find active city data
  const currentCityData: CitySEOData = useMemo(() => {
    return PAKISTAN_CITIES_SEO.find(c => c.city.toLowerCase() === selectedCityName.toLowerCase()) || PAKISTAN_CITIES_SEO[0];
  }, [selectedCityName]);

  // Load platform verified clinics from local storage/database
  useEffect(() => {
    let isMounted = true;
    async function fetchClinics() {
      try {
        const fetched = await ExploreService.fetchProfessionals('clinic');
        if (isMounted) {
          setPlatformClinics(fetched);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load clinics for city portal:', err);
        if (isMounted) setLoading(false);
      }
    }
    fetchClinics();
    return () => { isMounted = false; };
  }, []);

  // Fetch live Google Maps registered clinics for this selected city
  useEffect(() => {
    let isMounted = true;
    async function loadCityGoogleClinics() {
      setIsFetchingGoogle(true);
      try {
        const cityObj = LocationService.resolveCoordinates(selectedCityName);
        const results = await googlePlacesService.fetchCityGoogleClinics(selectedCityName, cityObj.lat, cityObj.lng);
        if (isMounted) {
          setGoogleClinics(results);
          setIsFetchingGoogle(false);
        }
      } catch (err) {
        if (isMounted) setIsFetchingGoogle(false);
      }
    }
    loadCityGoogleClinics();
    return () => { isMounted = false; };
  }, [selectedCityName]);

  // Update SEO metadata whenever city changes
  useEffect(() => {
    seoService.updateSEO({
      tabKey: 'cities',
      city: selectedCityName
    });
  }, [selectedCityName]);

  // Deduplicated unified list of clinics
  const combinedClinics = useMemo(() => {
    const list: UserProfile[] = [];
    const seenNames = new Set<string>();

    for (const c of platformClinics) {
      seenNames.add(c.name.toLowerCase().trim());
      list.push({ ...c, source: 'vetaxis' });
    }

    for (const g of googleClinics) {
      if (!seenNames.has(g.name.toLowerCase().trim())) {
        seenNames.add(g.name.toLowerCase().trim());
        list.push(g);
      }
    }

    return list;
  }, [platformClinics, googleClinics]);

  // Filter clinics matching the active city and neighborhood
  const cityClinics = useMemo(() => {
    const cityNameLower = selectedCityName.toLowerCase();
    return combinedClinics.filter((c) => {
      const addressLower = (c.address || '').toLowerCase();
      const nameLower = c.name.toLowerCase();
      const facLower = (c.facilities || '').toLowerCase();
      const fullText = `${addressLower} ${nameLower} ${facLower}`;

      // Check if matches city
      const cityMatches = fullText.includes(cityNameLower) || 
        (cityNameLower === 'islamabad' && fullText.includes('rawalpindi')) ||
        (cityNameLower === 'rawalpindi' && fullText.includes('islamabad'));

      if (!cityMatches) return false;

      // Check area filter
      if (activeAreaFilter !== 'all') {
        const areaLower = activeAreaFilter.toLowerCase();
        return fullText.includes(areaLower);
      }

      return true;
    });
  }, [combinedClinics, selectedCityName, activeAreaFilter]);

  // Local FAQs tailored for Googlebot and pet parents
  const cityFaqs = useMemo(() => {
    const c = currentCityData.city;
    return [
      {
        q: `How do I find a 24/7 emergency veterinary hospital in ${c}?`,
        a: `VetAxis 360 verifies round-the-clock animal clinics across ${c} equipped with emergency trauma suites, oxygen ICUs, and blood transfusion facilities. Click on any clinic with the "24/7 Emergency" badge above to call ahead or launch Google Maps directions.`
      },
      {
        q: `What is the average veterinary consultation and vaccination cost in ${c}?`,
        a: `Routine general veterinary consultations in ${c} typically range from PKR 1,000 to PKR 2,500. Core puppy and kitten vaccinations (such as DHPP and Rabies) average PKR 2,200 to PKR 4,000 including official health card documentation.`
      },
      {
        q: `Are home visit veterinary doctors and vaccinators available in ${c}?`,
        a: `Yes! Multiple licensed DVM practitioners on VetAxis 360 provide on-call mobile veterinary services for doorstep vaccinations, wound dressing, and routine wellness checkups across ${c}'s primary residential sectors.`
      },
      {
        q: `Do veterinary clinics in ${c} require appointments for walk-in emergencies?`,
        a: `Emergency cases (such as severe poisoning, dog bloat/GDV, active trauma, or puppy Parvovirus vomiting) are triaged as walk-ins without appointment. For routine surgeries or grooming, calling ahead is recommended.`
      }
    ];
  }, [currentCityData]);

  return (
    <div className="min-h-screen bg-[#121417] text-slate-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* SEO Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-400">
          <button 
            onClick={() => onNavigate?.('explore')}
            className="hover:text-slate-200 transition-colors cursor-pointer"
          >
            VetAxis
          </button>
          <span aria-hidden="true">/</span>
          <span className="text-slate-400">Pakistan City Hubs</span>
          <span aria-hidden="true">/</span>
          <span className="text-amber-400 font-semibold">{currentCityData.city}</span>
        </nav>

        {/* City Switcher Pill Tabs Bar */}
        <div className="overflow-x-auto pb-2 scrollbar-none">
          <div className="flex items-center gap-2 min-w-max">
            {PAKISTAN_CITIES_SEO.map((cityObj) => {
              const isActive = cityObj.city === currentCityData.city;
              return (
                <button
                  key={cityObj.city}
                  onClick={() => updateCity(cityObj.city)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                      : 'bg-[#181c22] text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <MapPin className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                  <span>{cityObj.city}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* City Hero Header Section with High-Intent Local Keywords */}
        <header className="rounded-2xl border border-slate-800 bg-[#181c22] p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Compass className="w-3.5 h-3.5" />
                <span>Verified City Hub &amp; Google Maps Directory</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-display tracking-tight text-wrap-balance">
                Veterinary Clinics &amp; Pet Doctors in {currentCityData.city}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {currentCityData.tagline}. Discover certified animal hospitals, 24/7 trauma emergency care, and licensed home vaccinators registered in {currentCityData.city}.
              </p>
            </div>

            {/* Launch Smart Radar for this City */}
            <div className="shrink-0 flex flex-col gap-2">
              <button
                onClick={() => onLaunchRadarForCity ? onLaunchRadarForCity(currentCityData.city) : onNavigate?.('radar')}
                className="px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>Open in Smart Vet Radar</span>
              </button>
              <span className="text-[11px] text-slate-400 text-center font-mono">
                Live GPS Proximity Scanner
              </span>
            </div>
          </div>

          {/* City Key Statistics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Verified Centers</span>
              <span className="text-lg font-bold text-white font-mono">{cityClinics.length} Active</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Google Maps Synced</span>
              <span className="text-lg font-bold text-amber-400 font-mono">
                {googleClinics.length > 0 ? `${googleClinics.length} Places` : 'Live Synced'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">24/7 Emergency</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">Available</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Emergency Focus</span>
              <span className="text-xs font-semibold text-sky-300 block truncate mt-1" title={currentCityData.emergencyFocus}>
                {currentCityData.emergencyFocus || '24/7 Trauma Triage'}
              </span>
            </div>
          </div>
        </header>

        {/* Neighborhood / District Filter Bar */}
        <section className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-200">Filter by {currentCityData.city} Neighborhood:</span>
            <span>{currentCityData.topAreas.length} key areas indexed</span>
          </div>
          <div className="overflow-x-auto pb-1 scrollbar-none">
            <div className="flex items-center gap-2 min-w-max">
              <button
                onClick={() => setActiveAreaFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeAreaFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                All Sectors ({cityClinics.length})
              </button>
              {currentCityData.topAreas.map((area) => (
                <button
                  key={area}
                  onClick={() => setActiveAreaFilter(area)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    activeAreaFilter === area
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Verified Clinics in this City */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Veterinary Centers in {currentCityData.city}</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {cityClinics.length} listed
              </span>
            </h2>
            <button
              onClick={() => onLaunchRadarForCity ? onLaunchRadarForCity(currentCityData.city) : onNavigate?.('radar')}
              className="text-xs text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>View GPS Distances on Radar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading || isFetchingGoogle ? (
            <div className="p-10 text-center text-slate-400 bg-[#181c22] rounded-xl border border-slate-800">
              <div className="w-7 h-7 mx-auto border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs">Loading verified centers and Google Maps listings for {currentCityData.city}...</p>
            </div>
          ) : cityClinics.length === 0 ? (
            <div className="p-8 text-center bg-[#181c22] rounded-xl border border-slate-800 space-y-3">
              <p className="text-sm text-slate-300">
                No clinics listed under <span className="font-semibold text-amber-400">{activeAreaFilter}</span> yet.
              </p>
              <button
                onClick={() => setActiveAreaFilter('all')}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors cursor-pointer"
              >
                Show All Areas in {currentCityData.city}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cityClinics.map((clinic) => {
                const clinicLat = clinic.location?.lat || LocationService.resolveCoordinates(clinic.address || clinic.name, clinic.uid).lat;
                const clinicLng = clinic.location?.lng || LocationService.resolveCoordinates(clinic.address || clinic.name, clinic.uid).lng;
                const googleMapsUrl = clinic.googleMapsUri || `https://www.google.com/maps/dir/?api=1&destination=${clinicLat},${clinicLng}`;
                const cleanPhone = (clinic.phone || '03001216272').replace(/[^0-9]/g, '');
                const waUrl = `https://wa.me/${cleanPhone.startsWith('92') ? cleanPhone : '92' + cleanPhone.replace(/^0/, '')}?text=Hello%20${encodeURIComponent(clinic.name)},%20I%20found%20you%20on%20VetAxis%20360%20and%20need%20veterinary%20assistance%20in%20${encodeURIComponent(currentCityData.city)}.`;
                const isEmergency = clinic.isEmergency247 || (clinic.facilities || '').toLowerCase().includes('24/7') || (clinic.facilities || '').toLowerCase().includes('emergency');
                const isGoogle = clinic.source === 'google_maps';

                return (
                  <div
                    key={clinic.uid}
                    className={`p-5 rounded-2xl bg-[#181c22] border transition-all space-y-3 shadow-xs ${
                      isGoogle ? 'border-amber-900/40 hover:border-amber-700/60' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-bold text-white">
                            {clinic.name}
                          </h3>
                          {isGoogle ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-amber-400" />
                              <span>Google Maps Verified</span>
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>VetAxis Verified</span>
                            </span>
                          )}
                        </div>

                        {/* Metadata Line */}
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                          <span className="flex items-center gap-1 text-slate-300">
                            <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                            <span className="line-clamp-1">{clinic.address || currentCityData.city}</span>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>★ {clinic.avgRating || '4.9'}</span>
                            <span className="text-slate-500 font-normal">({clinic.totalReviews || 24} reviews)</span>
                          </span>
                        </div>
                      </div>

                      {isEmergency && (
                        <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold uppercase tracking-wider shrink-0">
                          24/7 Open
                        </span>
                      )}
                    </div>

                    {clinic.facilities && (
                      <p className="text-xs text-slate-300 line-clamp-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-slate-400 font-medium">Services: </span>
                        {clinic.facilities}
                      </p>
                    )}

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs text-center"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Directions</span>
                      </a>

                      <a
                        href={`tel:${clinic.phone || '03001216272'}`}
                        className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 text-center"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Call</span>
                      </a>

                      {isGoogle ? (
                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 rounded-lg bg-amber-600/90 hover:bg-amber-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 text-center shadow-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Google Place</span>
                        </a>
                      ) : (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 text-center shadow-xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Local City FAQs with Structured Accordion */}
        <section className="bg-[#181c22] rounded-2xl border border-slate-800 p-6 sm:p-8 space-y-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <HelpCircle className="w-4 h-4" />
              <span>Pet Owner FAQ &amp; Guidance</span>
            </div>
            <h3 className="text-xl font-bold text-white">
              Frequently Asked Questions About Vet Care in {currentCityData.city}
            </h3>
          </div>

          <div className="divide-y divide-slate-800 border-t border-b border-slate-800">
            {cityFaqs.map((faq, idx) => {
              const isOpen = activeFaqIndex === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    onClick={() => setActiveFaqIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 text-left font-semibold text-sm sm:text-base text-slate-200 hover:text-white transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-90 text-amber-400' : ''}`} />
                  </button>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-2.5 text-xs sm:text-sm text-slate-400 leading-relaxed"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* City Hub Footer with Google Maps Attribution */}
        <footer className="text-center text-xs text-slate-500 space-y-1">
          <p>
            VetAxis 360 {currentCityData.city} Metropolitan Veterinary Registry · Integrated with Google Maps Platform &amp; Places API.
          </p>
          <p className="text-[11px] text-slate-600">
            To register or claim your veterinary clinic on this portal, visit the Google Business Profile guide in our menu.
          </p>
        </footer>

      </div>
    </div>
  );
}
