import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Search, MapPin, RefreshCw, Eye, Compass, HelpCircle } from 'lucide-react';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY' && API_KEY.trim() !== '';

interface InteractiveClinicMapProps {
  lat?: number;
  lng?: number;
  onLocationSelect?: (lat: number, lng: number, address?: string) => void;
  interactive?: boolean;
  cityName?: string;
  placeholderAddress?: string;
}

// Inner helper component to utilize maps library hooks
function MapController({
  lat,
  lng,
  onLocationSelect,
  interactive,
  cityName,
  placeholderAddress
}: InteractiveClinicMapProps) {
  const map = useMap();
  const geocodingLib = useMapsLibrary('geocoding');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(null);

  // Initialize marker position from props
  useEffect(() => {
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      setMarkerPosition({ lat, lng });
      if (map) {
        map.panTo({ lat, lng });
      }
    }
  }, [lat, lng, map]);

  // Center map on city name if no coordinate is specified initially
  useEffect(() => {
    if (!lat && !lng && cityName && map && geocodingLib) {
      const geocoder = new geocodingLib.Geocoder();
      geocoder.geocode({ address: `${cityName}, Pakistan` }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const loc = results[0].geometry.location;
          const pos = { lat: loc.lat(), lng: loc.lng() };
          map.setCenter(pos);
          map.setZoom(12);
        }
      });
    }
  }, [cityName, map, geocodingLib, lat, lng]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !map) return;

    if (!geocodingLib) {
      setSearchError('Search is currently unavailable (API key not loaded). Please click/tap directly on the map instead.');
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    const geocoder = new geocodingLib.Geocoder();
    geocoder.geocode({ address: `${searchQuery}, Pakistan` }, (results, status) => {
      setSearchLoading(false);
      if (status === 'OK' && results && results[0]) {
        const loc = results[0].geometry.location;
        const pos = { lat: loc.lat(), lng: loc.lng() };
        
        setMarkerPosition(pos);
        map.setCenter(pos);
        map.setZoom(15);
        
        if (onLocationSelect) {
          onLocationSelect(pos.lat, pos.lng, results[0].formatted_address);
        }
      } else {
        setSearchError('Could not find that location. Please try a different query or click the map directly.');
      }
    });
  };

  const handleMapClick = (e: any) => {
    if (!interactive || !onLocationSelect) return;
    
    // Support various format structures from the react-google-maps click event
    const clickedLat = e.detail?.latLng?.lat ?? e.latLng?.lat?.() ?? e.latLng?.lat;
    const clickedLng = e.detail?.latLng?.lng ?? e.latLng?.lng?.() ?? e.latLng?.lng;
    
    if (clickedLat === undefined || clickedLng === undefined) return;

    const pos = { lat: clickedLat, lng: clickedLng };
    setMarkerPosition(pos);

    if (geocodingLib) {
      try {
        const geocoder = new geocodingLib.Geocoder();
        geocoder.geocode({ location: pos }, (results, status) => {
          let resolvedAddress = undefined;
          if (status === 'OK' && results && results[0]) {
            resolvedAddress = results[0].formatted_address;
          }
          onLocationSelect(clickedLat, clickedLng, resolvedAddress);
        });
        return;
      } catch (err) {
        console.error("Geocoding failed", err);
      }
    }

    // Direct callback without address info if geocoding is unavailable
    onLocationSelect(clickedLat, clickedLng, undefined);
  };

  return (
    <div className="space-y-3">
      {interactive && (
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search address or landmark to pinpoint... (e.g. F-7 Islamabad)"
              className="w-full form-control bg-white text-xs py-2 pl-8 pr-4 border border-[#e3dec9] rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-stone-400" />
          </div>
          <button
            type="submit"
            disabled={searchLoading}
            className="cursor-pointer border border-[#cdc6ad] border-b-[3px] border-b-amber-900 bg-amber-150 hover:bg-amber-200 text-amber-950 font-bold px-4 rounded-xl text-xs flex items-center gap-1 shrink-0"
          >
            {searchLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <span>Search</span>
              </>
            )}
          </button>
        </form>
      )}

      {searchError && (
        <p className="text-[11px] text-red-600 font-bold bg-red-50 p-2 rounded-lg border border-red-100">
          ⚠️ {searchError}
        </p>
      )}

      <div className="relative border border-[#e3dec9] rounded-2xl overflow-hidden shadow-inner bg-stone-100">
        <Map
          defaultCenter={markerPosition || { lat: 33.6844, lng: 73.0479 }}
          defaultZoom={markerPosition ? 14 : 11}
          gestureHandling={interactive ? 'greedy' : 'cooperative'}
          disableDefaultUI={!interactive}
          onClick={handleMapClick}
          mapId="VETAXIS_MAP_ID_360"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: interactive ? '320px' : '240px' }}
        >
          {markerPosition && (
            <AdvancedMarker position={markerPosition}>
              <Pin background="#047857" glyphColor="#ffffff" borderColor="#065f46" scale={1.1} />
            </AdvancedMarker>
          )}
        </Map>

        {interactive && (
          <div className="absolute bottom-3 left-3 bg-stone-900/80 backdrop-blur-md text-white py-1.5 px-3 rounded-lg text-[9px] font-bold pointer-events-none flex items-center gap-1">
            <Compass className="w-3 h-3 text-emerald-400 animate-spin-slow" />
            <span>Interactive: Click anywhere on the map to place the pinpoint marker!</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function InteractiveClinicMap(props: InteractiveClinicMapProps) {
  return (
    <APIProvider apiKey={API_KEY || ''} version="weekly">
      <MapController {...props} />
    </APIProvider>
  );
}
