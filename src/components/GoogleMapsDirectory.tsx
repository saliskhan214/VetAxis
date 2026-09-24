// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  InfoWindow, 
  useMap,
  useMapsLibrary
} from '@vis.gl/react-google-maps';
import { 
  MapPin, 
  Navigation, 
  Search, 
  Phone, 
  Star, 
  ExternalLink, 
  Compass, 
  Layers, 
  Crosshair, 
  X, 
  Building2, 
  Stethoscope, 
  Activity, 
  Maximize2, 
  Minimize2,
  List,
  Filter
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { ExploreService } from '../lib/storage';
import { 
  GOOGLE_MAPS_API_KEY, 
  hasGoogleMapsKey,
  DEFAULT_MAP_ID, 
  MAPS_ATTRIBUTION_IDS, 
  DEFAULT_CENTER, 
  MAJOR_CITIES,
  getDirectionsUrl,
  calculateHaversineDistanceKm
} from '../lib/googleMaps';

interface MapItem {
  id: string;
  name: string;
  role: UserRole | 'farm';
  city: string;
  address?: string;
  phone?: string;
  rating?: number;
  reviewsCount?: number;
  specialty?: string;
  avatar?: string;
  lat: number;
  lng: number;
  rawProfile?: UserProfile;
}

// Approximate city center coordinates for fallback coordinate assignment
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  islamabad: { lat: 33.6844, lng: 73.0479 },
  rawalpindi: { lat: 33.5651, lng: 73.0169 },
  lahore: { lat: 31.5204, lng: 74.3587 },
  karachi: { lat: 24.8607, lng: 67.0011 },
  peshawar: { lat: 34.0151, lng: 71.5249 },
  faisalabad: { lat: 31.4504, lng: 73.1350 },
  multan: { lat: 30.1575, lng: 71.5249 },
  quetta: { lat: 30.1798, lng: 66.9750 },
  sialkot: { lat: 32.4945, lng: 74.5229 },
  gujranwala: { lat: 32.1877, lng: 74.1945 },
  hyderabad: { lat: 25.3960, lng: 68.3578 }
};

interface GoogleMapsDirectoryProps {
  currentUser?: UserProfile;
  onSelectProfile?: (profile: UserProfile) => void;
  onClose?: () => void;
  initialRoleFilter?: 'all' | 'clinic' | 'doctor' | 'farm';
  initialCity?: string;
}

function InnerMapComponent({
  items,
  selectedItem,
  onSelectItem,
  userLocation,
  centerCoord,
  zoomLevel
}: {
  items: MapItem[];
  selectedItem: MapItem | null;
  onSelectItem: (item: MapItem | null) => void;
  userLocation: { lat: number; lng: number } | null;
  centerCoord: { lat: number; lng: number };
  zoomLevel: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (map && centerCoord) {
      map.panTo(centerCoord);
    }
  }, [map, centerCoord]);

  useEffect(() => {
    if (map && zoomLevel) {
      map.setZoom(zoomLevel);
    }
  }, [map, zoomLevel]);

  return (
    <Map
      defaultCenter={centerCoord}
      defaultZoom={zoomLevel}
      mapId={DEFAULT_MAP_ID}
      internalUsageAttributionIds={[...MAPS_ATTRIBUTION_IDS]}
      gestureHandling="greedy"
      disableDefaultUI={false}
      style={{ width: '100%', height: '100%' }}
    >
      {/* User GPS Location Marker */}
      {userLocation && (
        <AdvancedMarker position={userLocation}>
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-7 w-7 rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white shadow-md" />
          </div>
        </AdvancedMarker>
      )}

      {/* Directory Markers */}
      {items.map((item) => {
        const isSelected = selectedItem?.id === item.id;
        const isClinic = item.role === 'clinic';
        const isDoctor = item.role === 'doctor';
        
        const pinBg = isClinic ? '#059669' : isDoctor ? '#2563eb' : '#d97706';
        const pinBorder = isClinic ? '#065f46' : isDoctor ? '#1d4ed8' : '#b45309';

        return (
          <AdvancedMarker
            key={item.id}
            position={{ lat: item.lat, lng: item.lng }}
            onClick={() => onSelectItem(item)}
            zIndex={isSelected ? 100 : 1}
          >
            <div className="cursor-pointer transition-transform hover:scale-110">
              <Pin
                background={pinBg}
                glyphColor="#ffffff"
                borderColor={pinBorder}
                scale={isSelected ? 1.3 : 1.0}
              />
            </div>
          </AdvancedMarker>
        );
      })}

      {/* Interactive InfoWindow for Selected Item */}
      {selectedItem && (
        <InfoWindow
          position={{ lat: selectedItem.lat, lng: selectedItem.lng }}
          onCloseClick={() => onSelectItem(null)}
          pixelOffset={[0, -38]}
        >
          <div className="p-2 max-w-xs text-stone-900 space-y-2">
            <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-2">
              <div>
                <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                  selectedItem.role === 'clinic' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : selectedItem.role === 'doctor'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedItem.role === 'clinic' ? '🏥 Clinic' : selectedItem.role === 'doctor' ? '🩺 Vet Doctor' : '🐄 Livestock Farm'}
                </span>
                <h4 className="text-sm font-black text-stone-900 mt-1 leading-snug">
                  {selectedItem.name}
                </h4>
                {selectedItem.specialty && (
                  <p className="text-[11px] text-stone-500 font-semibold">{selectedItem.specialty}</p>
                )}
              </div>
            </div>

            <div className="text-[11px] text-stone-600 space-y-1">
              <div className="flex items-center gap-1 text-stone-700">
                <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className="truncate">{selectedItem.address || selectedItem.city}</span>
              </div>
              {selectedItem.rating !== undefined && selectedItem.rating > 0 && (
                <div className="flex items-center gap-1 font-bold text-amber-600">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{selectedItem.rating.toFixed(1)}</span>
                  <span className="text-stone-400 font-normal">({selectedItem.reviewsCount || 1} reviews)</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center gap-2">
              <a
                href={getDirectionsUrl(selectedItem.lat, selectedItem.lng, selectedItem.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors"
              >
                <Navigation className="w-3 h-3" />
                <span>Directions</span>
              </a>
              {selectedItem.phone && (
                <a
                  href={`tel:${selectedItem.phone}`}
                  className="py-1.5 px-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                  title="Call clinic"
                >
                  <Phone className="w-3 h-3 text-stone-600" />
                  <span>Call</span>
                </a>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </Map>
  );
}

export function GoogleMapsDirectory({
  currentUser,
  onSelectProfile,
  onClose,
  initialRoleFilter = 'all',
  initialCity
}: GoogleMapsDirectoryProps) {
  const [items, setItems] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'clinic' | 'doctor' | 'farm'>(initialRoleFilter);
  const [selectedCity, setSelectedCity] = useState<string>(initialCity || 'all');
  const [selectedItem, setSelectedItem] = useState<MapItem | null>(null);
  const [centerCoord, setCenterCoord] = useState<{ lat: number; lng: number }>(DEFAULT_CENTER);
  const [zoomLevel, setZoomLevel] = useState<number>(11);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'full'>('split');

  // Load profiles and construct map items
  useEffect(() => {
    let isMounted = true;

    async function loadDirectory() {
      try {
        setLoading(true);
        const [clinics, doctors] = await Promise.all([
          ExploreService.fetchProfessionals('clinic').catch(() => []),
          ExploreService.fetchProfessionals('doctor').catch(() => [])
        ]);

        if (!isMounted) return;

        const allProfiles = [...clinics, ...doctors];
        const mappedItems: MapItem[] = [];

        // Counter to generate slight random offset so multiple clinics in same city without exact GPS don't overlap completely
        let fallbackIndex = 0;

        allProfiles.forEach((p) => {
          let lat: number | undefined = p.location?.lat;
          let lng: number | undefined = p.location?.lng;

          // If profile has no explicit coordinates, fallback to city center coordinates
          if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
            const cityKey = (p.city || 'islamabad').toLowerCase().trim();
            const cityCoord = CITY_COORDINATES[cityKey] || DEFAULT_CENTER;
            // Add a small jitter ~200-500 meters so pins spread naturally around city center
            const angle = (fallbackIndex * 137.5 * Math.PI) / 180;
            const radius = 0.008 + (fallbackIndex % 5) * 0.004;
            lat = cityCoord.lat + radius * Math.cos(angle);
            lng = cityCoord.lng + radius * Math.sin(angle);
            fallbackIndex++;
          }

          mappedItems.push({
            id: p.uid,
            name: p.name || 'Veterinary Facility',
            role: p.role,
            city: p.city || 'Pakistan',
            address: p.address,
            phone: p.phone,
            rating: p.rating || 5.0,
            reviewsCount: p.reviewsCount || 1,
            specialty: p.specialty || (p.role === 'clinic' ? 'Hospital & Emergency Care' : 'General Practitioner'),
            avatar: p.photoURL,
            lat,
            lng,
            rawProfile: p
          });
        });

        setItems(mappedItems);

        // If initial city was provided, set map center
        if (initialCity) {
          const cityCoord = CITY_COORDINATES[initialCity.toLowerCase()];
          if (cityCoord) {
            setCenterCoord(cityCoord);
            setZoomLevel(12);
          }
        }
      } catch (err) {
        console.error('Failed to load Google Maps directory:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDirectory();

    return () => {
      isMounted = false;
    };
  }, [initialCity]);

  // Request user's current GPS location
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        const userPos = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setUserLocation(userPos);
        setCenterCoord(userPos);
        setZoomLevel(14);
      },
      (err) => {
        setLocatingUser(false);
        console.warn('Geolocation failed or permission denied:', err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Role filter
      if (roleFilter !== 'all') {
        if (roleFilter === 'clinic' && item.role !== 'clinic') return false;
        if (roleFilter === 'doctor' && item.role !== 'doctor') return false;
      }

      // City filter
      if (selectedCity !== 'all') {
        if (!item.city.toLowerCase().includes(selectedCity.toLowerCase())) {
          return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchCity = item.city.toLowerCase().includes(query);
        const matchSpecialty = item.specialty?.toLowerCase().includes(query);
        const matchAddress = item.address?.toLowerCase().includes(query);
        if (!matchName && !matchCity && !matchSpecialty && !matchAddress) {
          return false;
        }
      }

      return true;
    });
  }, [items, roleFilter, selectedCity, searchTerm]);

  // Sort by distance if user location is available
  const sortedItems = useMemo(() => {
    if (!userLocation) return filteredItems;
    return [...filteredItems].sort((a, b) => {
      const distA = calculateHaversineDistanceKm(userLocation.lat, userLocation.lng, a.lat, a.lng);
      const distB = calculateHaversineDistanceKm(userLocation.lat, userLocation.lng, b.lat, b.lng);
      return distA - distB;
    });
  }, [filteredItems, userLocation]);

  const handleCitySelect = (cityName: string, lat: number, lng: number, zoom: number) => {
    setSelectedCity(cityName.toLowerCase());
    setCenterCoord({ lat, lng });
    setZoomLevel(zoom);
  };

  const handleMarkerSelect = useCallback((item: MapItem | null) => {
    setSelectedItem(item);
    if (item) {
      setCenterCoord({ lat: item.lat, lng: item.lng });
    }
  }, []);

  return (
    <div className="bg-[#fcf9f2] rounded-3xl border border-[#e3dec9] shadow-lg overflow-hidden flex flex-col h-[750px] relative">
      {/* Top Header / Control Bar */}
      <div className="bg-white border-b border-[#e3dec9] p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shrink-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                  Google Maps Vet Directory
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Live
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium">
                Find veterinary clinics, animal hospitals, and emergency doctors across Pakistan
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-2 rounded-xl text-stone-400 hover:text-stone-800 hover:bg-stone-100"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search clinic, doctor, or city..."
              className="w-full bg-stone-50 border border-stone-200 text-xs py-2 pl-8 pr-3 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 text-stone-800"
            />
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* GPS Locate Me Button */}
          <button
            onClick={handleLocateMe}
            disabled={locatingUser}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
              userLocation
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
            }`}
            title="Locate my position via GPS"
          >
            <Crosshair className={`w-3.5 h-3.5 ${locatingUser ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">{userLocation ? 'Located' : 'Near Me'}</span>
          </button>

          {/* Layout Toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'split' ? 'full' : 'split')}
            className="p-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer shrink-0 hidden md:flex"
            title={viewMode === 'split' ? 'Fullscreen Map' : 'Split View'}
          >
            {viewMode === 'split' ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="hidden md:flex p-2 rounded-xl text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Quick Cities Bar */}
      <div className="bg-[#f8f5ed] border-b border-[#e3dec9] px-4 py-2.5 flex items-center justify-between gap-3 overflow-x-auto text-xs shrink-0 z-10">
        {/* Role Filters */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              roleFilter === 'all'
                ? 'bg-stone-800 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setRoleFilter('clinic')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
              roleFilter === 'clinic'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <span>🏥</span>
            <span>Clinics ({items.filter(i => i.role === 'clinic').length})</span>
          </button>
          <button
            onClick={() => setRoleFilter('doctor')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
              roleFilter === 'doctor'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <span>🩺</span>
            <span>Doctors ({items.filter(i => i.role === 'doctor').length})</span>
          </button>
        </div>

        {/* Quick City Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] uppercase font-black tracking-wider text-stone-400 mr-1 hidden lg:inline">
            Cities:
          </span>
          <button
            onClick={() => setSelectedCity('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
              selectedCity === 'all' ? 'bg-amber-600 text-white' : 'bg-white/80 hover:bg-white text-stone-600 border border-stone-200'
            }`}
          >
            All Cities
          </button>
          {MAJOR_CITIES.map((c) => (
            <button
              key={c.name}
              onClick={() => handleCitySelect(c.name, c.lat, c.lng, c.zoom)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                selectedCity === c.name.toLowerCase()
                  ? 'bg-amber-600 text-white'
                  : 'bg-white/80 hover:bg-white text-stone-600 border border-stone-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area: Split List + Map */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Directory List (Desktop / Split Mode) */}
        {viewMode === 'split' && (
          <div className="w-full md:w-84 lg:w-96 border-r border-[#e3dec9] bg-white flex flex-col overflow-hidden shrink-0 z-10 shadow-xs">
            <div className="p-3 bg-[#fcf9f2] border-b border-[#e3dec9] flex items-center justify-between text-xs font-bold text-stone-600">
              <span>{sortedItems.length} locations found</span>
              {userLocation && (
                <span className="text-[10px] text-blue-600 font-extrabold flex items-center gap-1">
                  <Crosshair className="w-3 h-3" /> Sorted by distance
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#f4f1e9] p-2 space-y-2">
              {sortedItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-400 space-y-2">
                  <MapPin className="w-8 h-8 mx-auto text-stone-300" />
                  <p className="font-bold text-stone-600">No clinics or doctors match your filter</p>
                  <p>Try switching to "All Cities" or changing your keyword search.</p>
                </div>
              ) : (
                sortedItems.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  const distanceKm = userLocation 
                    ? calculateHaversineDistanceKm(userLocation.lat, userLocation.lng, item.lat, item.lng)
                    : null;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleMarkerSelect(item)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-emerald-50/80 border-emerald-300 shadow-xs ring-1 ring-emerald-400'
                          : 'bg-white hover:bg-[#fcf9f2] border-stone-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                              item.role === 'clinic'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.role === 'doctor'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {item.role === 'clinic' ? 'Clinic' : item.role === 'doctor' ? 'Doctor' : 'Farm'}
                            </span>
                            <span className="text-[10px] text-stone-400 font-medium truncate">
                              {item.city}
                            </span>
                          </div>

                          <h4 className="text-xs font-black text-stone-900 truncate">
                            {item.name}
                          </h4>

                          {item.specialty && (
                            <p className="text-[10px] text-stone-500 truncate mt-0.5">
                              {item.specialty}
                            </p>
                          )}
                        </div>

                        {distanceKm !== null && (
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                              {distanceKm} km
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-stone-500 pt-2 border-t border-stone-100/80">
                        <div className="flex items-center gap-1 text-amber-600 font-bold">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{item.rating?.toFixed(1) || '5.0'}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={getDirectionsUrl(item.lat, item.lng, item.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 hover:underline"
                          >
                            <Navigation className="w-3 h-3" />
                            Directions
                          </a>

                          {item.rawProfile && onSelectProfile && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectProfile(item.rawProfile!);
                              }}
                              className="text-[10px] font-bold text-stone-700 hover:text-stone-900 hover:underline"
                            >
                              Profile →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Right Side / Full Width: Interactive Google Map or Graceful Directory Card */}
        <div className="flex-1 h-full w-full relative">
          {hasGoogleMapsKey() ? (
            <>
              <APIProvider apiKey={GOOGLE_MAPS_API_KEY} version="weekly">
                <InnerMapComponent
                  items={sortedItems}
                  selectedItem={selectedItem}
                  onSelectItem={handleMarkerSelect}
                  userLocation={userLocation}
                  centerCoord={centerCoord}
                  zoomLevel={zoomLevel}
                />
              </APIProvider>

              {/* Floating Map Legend */}
              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs border border-stone-200 rounded-2xl p-2.5 shadow-md text-[10px] font-bold text-stone-700 space-y-1.5 z-10 hidden sm:block pointer-events-none">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span>Veterinary Clinic</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span>Veterinary Doctor</span>
                </div>
                {userLocation && (
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                    <span>Your Location</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-[#fbf9f4] p-6 flex flex-col justify-between overflow-y-auto">
              <div className="max-w-2xl mx-auto w-full space-y-6 pt-4">
                {selectedItem ? (
                  <div className="bg-white border-2 border-[#5a5a40] rounded-3xl p-6 shadow-md space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2 ${
                          selectedItem.role === 'clinic' 
                            ? 'bg-emerald-150 text-emerald-950 border border-emerald-300' 
                            : 'bg-blue-150 text-blue-950 border border-blue-300'
                        }`}>
                          {selectedItem.role === 'clinic' ? '🏥 Veterinary Clinic' : '👨‍⚕️ Veterinary Doctor'}
                        </span>
                        <h2 className="text-2xl font-black font-serif text-stone-900">
                          {selectedItem.name}
                        </h2>
                        {selectedItem.specialty && (
                          <p className="text-sm font-semibold text-[#5a5a40] mt-0.5">
                            {selectedItem.specialty}
                          </p>
                        )}
                      </div>

                      {selectedItem.rating && (
                        <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-2xl shrink-0">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                          <span className="font-bold text-sm text-amber-900">{selectedItem.rating.toFixed(1)}</span>
                          <span className="text-xs text-amber-700">({selectedItem.reviewsCount || 1})</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-stone-700 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-stone-900">{selectedItem.city}</p>
                          <p className="text-stone-500 text-[11px]">{selectedItem.address || 'Address registered on file'}</p>
                        </div>
                      </div>

                      {selectedItem.phone && (
                        <div className="flex items-center gap-2.5">
                          <Phone className="w-4 h-4 text-emerald-700 shrink-0" />
                          <div>
                            <p className="font-bold text-stone-900">Contact</p>
                            <a href={`tel:${selectedItem.phone}`} className="text-emerald-700 hover:underline font-mono text-[11px]">
                              {selectedItem.phone}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <a
                        href={getDirectionsUrl(selectedItem.lat, selectedItem.lng, selectedItem.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4a5d4e] hover:bg-[#3d4d40] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Navigate in Google Maps ↗</span>
                      </a>

                      {selectedItem.rawProfile && (
                        <button
                          type="button"
                          onClick={() => onSelectProfile(selectedItem.rawProfile!)}
                          className="px-5 py-2.5 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-bold rounded-xl transition-all"
                        >
                          View Full Profile
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-[#e3dec9] rounded-3xl p-8 text-center space-y-4 shadow-sm">
                    <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-[#5a5a40]">
                      <MapPin className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold font-serif text-stone-900">
                        Select a Clinic or Doctor from the Directory
                      </h3>
                      <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
                        Browse verified veterinary professionals across Pakistan. Click any listing to get instant contact information and Google Maps turn-by-turn navigation.
                      </p>
                    </div>

                    {/* Quick City Filters */}
                    <div className="pt-2 flex flex-wrap justify-center gap-2">
                      {MAJOR_CITIES.map((city) => (
                        <button
                          key={city.name}
                          type="button"
                          onClick={() => {
                            setSelectedCity(city.name);
                            const match = sortedItems.find((i) => i.city.toLowerCase().includes(city.name.toLowerCase()));
                            if (match) setSelectedItem(match);
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                            selectedCity === city.name
                              ? 'bg-[#5a5a40] text-white border-[#5a5a40]'
                              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {city.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center pt-4">
                <p className="text-[11px] text-stone-400">
                  Tip: Direct navigation links work automatically. Set <code className="font-mono text-stone-600 bg-stone-100 px-1 py-0.5 rounded">VITE_GOOGLE_MAPS_API_KEY</code> in environment settings to enable live embedded satellite tiles.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
