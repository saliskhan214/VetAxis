// Source: Google Maps Platform Code Assist
import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Search, Compass, RefreshCw } from 'lucide-react';
import { 
  GOOGLE_MAPS_API_KEY, 
  hasGoogleMapsKey, 
  getDirectionsUrl, 
  DEFAULT_MAP_ID, 
  MAPS_ATTRIBUTION_IDS, 
  DEFAULT_CENTER 
} from '../lib/googleMaps';

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
          defaultCenter={markerPosition || DEFAULT_CENTER}
          defaultZoom={markerPosition ? 14 : 11}
          gestureHandling={interactive ? 'greedy' : 'cooperative'}
          disableDefaultUI={!interactive}
          onClick={handleMapClick}
          mapId={DEFAULT_MAP_ID}
          internalUsageAttributionIds={[...MAPS_ATTRIBUTION_IDS]}
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
  if (!hasGoogleMapsKey()) {
    const currentLat = props.lat || DEFAULT_CENTER.lat;
    const currentLng = props.lng || DEFAULT_CENTER.lng;
    const directionsUrl = getDirectionsUrl(currentLat, currentLng, props.placeholderAddress || props.cityName);

    return (
      <div className="w-full space-y-2">
        <div className="relative border border-[#e3dec9] rounded-2xl p-4 bg-stone-50 overflow-hidden shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                <span className="text-xs font-bold text-stone-900 font-serif">
                  {props.placeholderAddress || props.cityName ? `${props.cityName || 'Clinic Location'}` : 'Location Map'}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-mono">
                Coordinates: {currentLat.toFixed(4)}° N, {currentLng.toFixed(4)}° E
              </p>
            </div>
            
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4a5d4e] hover:bg-[#3d4d40] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0"
            >
              <span>Open in Google Maps</span>
              <span className="text-[10px]">↗</span>
            </a>
          </div>

          {props.interactive && props.onLocationSelect && (
            <div className="mt-3 pt-3 border-t border-[#e3dec9]/60 flex flex-wrap items-center gap-2 text-[11px] text-stone-600">
              <span className="font-semibold text-stone-700">Quick coordinates:</span>
              <button
                type="button"
                onClick={() => props.onLocationSelect?.(33.6844, 73.0479, 'Islamabad')}
                className="px-2 py-0.5 rounded-md bg-white border border-[#e3dec9] hover:bg-stone-150 text-[10px] font-bold"
              >
                Islamabad
              </button>
              <button
                type="button"
                onClick={() => props.onLocationSelect?.(31.5204, 74.3587, 'Lahore')}
                className="px-2 py-0.5 rounded-md bg-white border border-[#e3dec9] hover:bg-stone-150 text-[10px] font-bold"
              >
                Lahore
              </button>
              <button
                type="button"
                onClick={() => props.onLocationSelect?.(24.8607, 67.0011, 'Karachi')}
                className="px-2 py-0.5 rounded-md bg-white border border-[#e3dec9] hover:bg-stone-150 text-[10px] font-bold"
              >
                Karachi
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} version="weekly">
      <MapController {...props} />
    </APIProvider>
  );
}
