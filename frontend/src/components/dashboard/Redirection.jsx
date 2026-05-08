import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import baguioData from '../../data/baguio_locations.json';
import redirectionFallback from '../../data/redirection_fallback_locations.json';
import CSRNet from './CSRNet';
import { useLiveLocations } from '../../hooks/useLiveLocations';

const Redirection = React.forwardRef((props, ref) => {
  const [baguioLocations, setBaguioLocations] = useState([]);
  const [hoveredLocation, setHoveredLocation] = useState(null);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [maxTravelTime, setMaxTravelTime] = useState(15);
  const [travelMode, setTravelMode] = useState('walking');
  const [groupSize, setGroupSize] = useState(1);
  const [environment, setEnvironment] = useState('any');
  const [paidAttractions, setPaidAttractions] = useState(false);
  const [placeCategory, setPlaceCategory] = useState('any');
  const [isTravelModeOpen, setIsTravelModeOpen] = useState(false);
  const [isPlaceCategoryOpen, setIsPlaceCategoryOpen] = useState(false);
  const markerRefs = useRef({});
  const mapRef = useRef(null);
  const travelModeRef = useRef(null);
  const placeCategoryRef = useRef(null);

  // Load Baguio locations for Hidden Gems section
  useEffect(() => {
    setBaguioLocations(baguioData.locations);
  }, []);

  // Handle clicking outside the travel mode dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (travelModeRef.current && !travelModeRef.current.contains(event.target)) {
        setIsTravelModeOpen(false);
      }
    };

    if (isTravelModeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isTravelModeOpen]);

  // Handle clicking outside the place category dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (placeCategoryRef.current && !placeCategoryRef.current.contains(event.target)) {
        setIsPlaceCategoryOpen(false);
      }
    };

    if (isPlaceCategoryOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isPlaceCategoryOpen]);

  // Get live locations from database for interactive map (locations 1-5)
  const { locations: liveLocations } = useLiveLocations();
  // Use fallback locations if database locations are empty or not loaded
  const mapLocations = liveLocations && liveLocations.length > 0 
    ? liveLocations.filter(loc => loc.id >= 1 && loc.id <= 5)
    : redirectionFallback.locations;

  // Fit map to show all markers on initial load
  useEffect(() => {
    if (mapRef.current && mapLocations && mapLocations.length > 0) {
      setTimeout(() => {
        try {
          const bounds = L.latLngBounds(mapLocations.map(loc => [loc.lat, loc.lng]));
          mapRef.current.fitBounds(bounds, { padding: [30, 30] });
        } catch (e) {
          console.error('Error fitting bounds:', e);
        }
      }, 500);
    }
  }, [mapLocations]);

  // Handle location card hover
  const handleLocationHover = (locationId) => {
    setHoveredLocation(locationId);
    if (locationId && markerRefs.current[locationId]) {
      markerRefs.current[locationId].openPopup();
    }
  };

  // Handle location card hover out
  const handleLocationHoverOut = () => {
    setHoveredLocation(null);
    Object.values(markerRefs.current).forEach(marker => {
      if (marker) marker.closePopup();
    });
  };

  // Handle marker click - zoom in on marker
  const handleMarkerClick = (location) => {
    setSelectedLocationId(location.id);
    if (mapRef.current) {
      // Disable interactions during animation to prevent jitter
      mapRef.current.dragging.disable();
      mapRef.current.scrollWheelZoom.disable();
      
      // Smooth flyTo animation with easing
      mapRef.current.flyTo([location.lat, location.lng], 17, {
        duration: 1.0,
        easeLinearity: 0.25
      });
      
      // Open popup and re-enable interactions after animation completes
      setTimeout(() => {
        if (markerRefs.current[location.id]) {
          markerRefs.current[location.id].openPopup();
        }
        // Re-enable interactions
        mapRef.current.dragging.enable();
        mapRef.current.scrollWheelZoom.enable();
      }, 1000);
    }
  };

  // Handle popup close - zoom back out
  const handlePopupClose = () => {
    setSelectedLocationId(null);
    if (mapRef.current) {
      mapRef.current.flyTo([16.413, 120.604], 15, {
        duration: 0.8
      });
    }
  };

  // Get color based on crowd level
  const getCrowdColor = (crowdLevel) => {
    switch (crowdLevel) {
      case 'low':
        return '#10b981'; // Emerald
      case 'moderate':
        return '#f59e0b'; // Amber
      case 'high':
        return '#ef4444'; // Red
      default:
        return '#8b5cf6'; // Purple fallback
    }
  };

  // Create custom marker icon
  const createCustomMarker = (crowdLevel) => {
    const color = getCrowdColor(crowdLevel);
    return L.divIcon({
      className: 'custom-location-marker',
      html: `
        <div class="marker-inner">
          <svg viewBox="0 0 24 24" width="36" height="36" style="filter: drop-shadow(0px 0px 8px ${color});">
            <path fill="${color}" d="M12 0c-4.198 0-8 3.403-8 7.602 0 4.198 3.469 9.21 8 16.398 4.531-7.188 8-12.2 8-16.398 0-4.199-3.801-7.602-8-7.602zm0 11c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z"/>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36],
    });
  };

  return (
    <div ref={ref} className="mx-auto max-w-[1600px] scroll-mt-8 flex flex-col gap-0">
      {/* Interactive Map Card */}
      <div className="flex-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)] sm:p-5 flex flex-col">
        {/* Map and Settings Layout */}
        <div className="grid grid-cols-1 gap-4 items-stretch flex-1 lg:grid-cols-[2fr_1fr]">
          {/* Left Column - Map with Header */}
          <div className="flex flex-col gap-2">
            {/* Header - Left Aligned */}
            <div className="flex flex-col gap-1 text-left">
              <h2 className="m-0 text-[10px] font-black uppercase tracking-[4px] text-slate-500">Smart Redirection</h2>
              <h3 className="m-0 text-xl font-black bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
                Crowd-Aware Redirection
              </h3>
              <p className="m-0 text-xs text-slate-400 font-medium">Click on any location marker to view details and find alternative routes based on current crowd levels</p>
            </div>

            {/* Leaflet Map */}
            <div className="flex-1 overflow-hidden rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.1)]" style={{ minHeight: 'calc(100vh - 400px)' }}>
            <MapContainer
              ref={mapRef}
              center={[16.413, 120.604]}
              zoom={14}
              minZoom={10}
              maxZoom={18}
              scrollWheelZoom={false}
              zoomControl={false}
              attributionControl={false}
              className="h-full w-full"
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              <ZoomControl position="bottomright" />
              {mapLocations.map((location) => (
                <Marker 
                  key={location.id} 
                  position={[location.lat, location.lng]}
                  icon={createCustomMarker(location.crowdLevel?.toLowerCase() || 'low')}
                  eventHandlers={{
                    click: () => handleMarkerClick(location),
                  }}
                  ref={(ref) => {
                    if (ref) {
                      markerRefs.current[location.id] = ref;
                    }
                  }}
                >
                  <Popup 
                    className="location-popup"
                    eventHandlers={{
                      close: handlePopupClose,
                    }}
                  >
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 p-4 min-w-[240px] shadow-2xl">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <h4 className="text-base font-black text-white tracking-tight">
                          {location.name}
                        </h4>
                      </div>
                      
                      <p className="text-xs text-slate-300 capitalize mb-3 font-medium">
                        {location.type}
                      </p>

                      <div className="inline-block mb-3">
                        <span 
                          className={`rounded-lg px-3 py-1.5 text-xs font-black text-white uppercase tracking-widest ${
                            location.crowdLevel?.toLowerCase() === 'low' || location.crowdLevel?.toLowerCase() === 'sparse'
                              ? 'bg-emerald-500/80 shadow-lg shadow-emerald-500/30'
                              : location.crowdLevel?.toLowerCase() === 'moderate'
                                ? 'bg-amber-500/80 shadow-lg shadow-amber-500/30'
                                : 'bg-red-500/80 shadow-lg shadow-red-500/30'
                          }`}
                        >
                          {location.crowdLevel}
                        </span>
                      </div>

                      <div className="space-y-2.5 border-t border-white/10 pt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">People</span>
                          <span className="text-xs font-black text-white">{location.detectedPeople}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Capacity</span>
                          <span className="text-xs font-black text-white">{location.capacity}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Distance</span>
                          <span className="text-xs font-black text-slate-200">{location.distance} km</span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            </div>
          </div>

          {/* Settings Sidebar - Right Side */}
          <div className="flex flex-col self-stretch" style={{ minHeight: 'calc(100vh - 400px)' }}>
            {/* Settings Panel */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 p-5 overflow-hidden flex flex-col flex-1">
              <h4 className="text-lg font-black text-white mb-4 tracking-tight">Your Preferences</h4>
              
              {/* SECTION: Trip Basics */}
              <div className="mb-3">
                {/* Max Travel Time */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Max Travel Time</label>
                    <span className="text-sm font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{maxTravelTime} min</span>
                  </div>
                  <div className="relative group">
                    <input 
                      type="range" 
                      min="1" 
                      max="30" 
                      value={maxTravelTime}
                      onChange={(e) => setMaxTravelTime(Number(e.target.value))}
                      className="w-full h-2 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/30"
                      style={{
                        background: `linear-gradient(to right, rgb(79, 70, 229) 0%, rgb(79, 70, 229) ${(maxTravelTime / 30) * 100}%, rgb(55, 65, 81) ${(maxTravelTime / 30) * 100}%, rgb(55, 65, 81) 100%)`
                      }}
                    />
                  </div>
                </div>

                {/* Place Category */}
                <div className="space-y-1.5 mb-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Place Category</label>
                  <div className="relative" ref={placeCategoryRef}>
                    <button
                      onClick={() => setIsPlaceCategoryOpen(!isPlaceCategoryOpen)}
                      className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-white/20 hover:border-indigo-500/50 text-sm text-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all duration-300 cursor-pointer backdrop-blur-sm shadow-lg hover:shadow-indigo-500/20 hover:shadow-lg flex items-center justify-between"
                    >
                      <span className="capitalize">
                        {placeCategory === 'shopping' ? 'Shopping & Retail' : placeCategory === 'nature' ? 'Nature & Outdoors' : placeCategory === 'dining' ? 'Dining & Food' : placeCategory === 'culture' ? 'Museums & Arts' : 'Any Category'}
                      </span>
                      <svg 
                        className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isPlaceCategoryOpen ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </button>

                    {isPlaceCategoryOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                        {[
                          { value: 'any', label: 'Any Category' },
                          { value: 'shopping', label: 'Shopping & Retail' },
                          { value: 'nature', label: 'Nature & Outdoors' },
                          { value: 'dining', label: 'Dining & Food' },
                          { value: 'culture', label: 'Museums & Arts' }
                        ].map((option, index) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setPlaceCategory(option.value);
                              setIsPlaceCategoryOpen(false);
                            }}
                            style={{
                              animationDelay: `${index * 30}ms`
                            }}
                            className={`w-full px-4 py-3 text-sm font-medium text-left transition-all duration-200 flex items-center gap-3 group ${
                              placeCategory === option.value
                                ? 'bg-gradient-to-r from-indigo-500/40 to-purple-500/40 text-indigo-100 border-l-2 border-indigo-400'
                                : 'text-slate-300 hover:bg-slate-700/50 border-l-2 border-transparent'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-current opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                            <span>{option.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Travel Mode */}
                <div className="space-y-1.5 mb-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Travel Mode</label>
                  <div className="relative" ref={travelModeRef}>
                    <button
                      onClick={() => setIsTravelModeOpen(!isTravelModeOpen)}
                      className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-white/20 hover:border-indigo-500/50 text-sm text-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all duration-300 cursor-pointer backdrop-blur-sm shadow-lg hover:shadow-indigo-500/20 hover:shadow-lg flex items-center justify-between"
                    >
                      <span className="capitalize">
                        {travelMode === 'walking' ? 'Walking' : travelMode === 'commuting' ? 'Public Transport' : 'Driving'}
                      </span>
                      <svg 
                        className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isTravelModeOpen ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </button>

                    {isTravelModeOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        {['Walking', 'Public Transport', 'Driving'].map((option, index) => (
                          <button
                            key={option}
                            onClick={() => {
                              setTravelMode(option.toLowerCase().replace(' ', '_'));
                              setIsTravelModeOpen(false);
                            }}
                            style={{
                              animationDelay: `${index * 30}ms`
                            }}
                            className={`w-full px-4 py-3 text-sm font-medium text-left transition-all duration-200 flex items-center gap-3 group ${
                              (option === 'Walking' && travelMode === 'walking') ||
                              (option === 'Public Transport' && travelMode === 'commuting') ||
                              (option === 'Driving' && travelMode === 'driving')
                                ? 'bg-gradient-to-r from-indigo-500/40 to-purple-500/40 text-indigo-100 border-l-2 border-indigo-400'
                                : 'text-slate-300 hover:bg-slate-700/50 border-l-2 border-transparent'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-current opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                            <span>{option}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Group Size */}
                <div className="space-y-1.5 mb-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Group Size</label>
                  <div className="relative group">
                    <input 
                      type="number" 
                      min="1" 
                      max="50"
                      value={groupSize}
                      onChange={(e) => setGroupSize(Math.max(1, Math.min(50, Number(e.target.value))))}
                      placeholder={groupSize === 1 ? 'Person' : 'People'}
                      className="group-size-input w-full px-4 pr-16 py-2.5 rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-white/20 hover:border-indigo-500/50 text-sm text-white font-black focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-indigo-500/20 hover:shadow-lg text-center"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 pointer-events-auto z-50">
                      <button
                        onClick={() => setGroupSize(Math.min(50, groupSize + 1))}
                        className="group/btn flex items-center justify-center w-6 h-4.5 rounded-t-md bg-gradient-to-br from-slate-700/50 to-slate-800/50 hover:from-indigo-500/40 hover:to-purple-500/40 border border-white/20 hover:border-indigo-500/50 transition-all duration-200 cursor-pointer shadow-sm active:from-indigo-500/60 active:to-purple-500/60"
                      >
                        <svg className="w-3 h-3 text-slate-300 group-hover/btn:text-indigo-200 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setGroupSize(Math.max(1, groupSize - 1))}
                        className="group/btn flex items-center justify-center w-6 h-4.5 rounded-b-md bg-gradient-to-br from-slate-700/50 to-slate-800/50 hover:from-indigo-500/40 hover:to-purple-500/40 border border-white/20 hover:border-indigo-500/50 transition-all duration-200 cursor-pointer shadow-sm active:from-indigo-500/60 active:to-purple-500/60"
                      >
                        <svg className="w-3 h-3 text-slate-300 group-hover/btn:text-indigo-200 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 my-2.5"></div>

              {/* SECTION: Interests & Amenities */}
              <div className="mb-3">
                {/* Environment Preference */}
                <div className="space-y-2 mb-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Environment</label>
                  <div className="grid grid-cols-3 gap-2">
                    <label className={`flex items-center justify-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-300 font-medium text-xs uppercase tracking-wide ${environment === 'indoors' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/50' : 'bg-slate-700/30 border border-white/10 text-slate-300 hover:border-indigo-500/30 hover:bg-slate-700/50'}`}>
                      <input 
                        type="radio" 
                        id="indoors"
                        name="environment"
                        value="indoors"
                        checked={environment === 'indoors'}
                        onChange={(e) => setEnvironment(e.target.value)}
                        className="w-3 h-3 accent-white cursor-pointer"
                      />
                      <span className="ml-2">Indoors</span>
                    </label>
                    <label className={`flex items-center justify-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-300 font-medium text-xs uppercase tracking-wide ${environment === 'outdoors' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/50' : 'bg-slate-700/30 border border-white/10 text-slate-300 hover:border-indigo-500/30 hover:bg-slate-700/50'}`}>
                      <input 
                        type="radio" 
                        id="outdoors"
                        name="environment"
                        value="outdoors"
                        checked={environment === 'outdoors'}
                        onChange={(e) => setEnvironment(e.target.value)}
                        className="w-3 h-3 accent-white cursor-pointer"
                      />
                      <span className="ml-2">Outdoors</span>
                    </label>
                    <label className={`flex items-center justify-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-300 font-medium text-xs uppercase tracking-wide ${environment === 'any' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/50' : 'bg-slate-700/30 border border-white/10 text-slate-300 hover:border-indigo-500/30 hover:bg-slate-700/50'}`}>
                      <input 
                        type="radio" 
                        id="any"
                        name="environment"
                        value="any"
                        checked={environment === 'any'}
                        onChange={(e) => setEnvironment(e.target.value)}
                        className="w-3 h-3 accent-white cursor-pointer"
                      />
                      <span className="ml-2">Any</span>
                    </label>
                  </div>
                </div>

                <div className="border-t border-white/10 my-2.5"></div>

                {/* Paid Attractions */}
                <div className="space-y-1.5 mb-3">
                  <label className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-300 ${paidAttractions ? 'bg-gradient-to-r from-indigo-500/30 to-purple-500/30 border border-indigo-500/50 shadow-lg shadow-indigo-500/20' : 'bg-slate-700/30 border border-white/10 hover:border-indigo-500/30 hover:bg-slate-700/50'}`}>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-300">Include Paid Attractions</span>
                    <div className={`relative w-12 h-6 rounded-full transition-colors duration-300 shadow-inner ${paidAttractions ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                      <input 
                        type="checkbox" 
                        checked={paidAttractions}
                        onChange={(e) => setPaidAttractions(e.target.checked)}
                        className="absolute opacity-0 w-full h-full cursor-pointer"
                      />
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-md ${paidAttractions ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="border-t border-white/10 my-2.5"></div>

              {/* Get Recommendations Button */}
              <div className="mt-auto relative group">
                {selectedLocationId !== null && (
                  <div className="mb-2.5 px-1">
                    <p className="text-xs text-slate-400 font-medium">Selected Location:</p>
                    <p className="text-sm font-black text-indigo-300 truncate">{mapLocations.find(loc => loc.id === selectedLocationId)?.name || 'Location'}</p>
                  </div>
                )}
                <button 
                  onClick={() => console.log({ maxTravelTime, travelMode, groupSize, environment, paidAttractions, placeCategory })}
                  disabled={selectedLocationId === null}
                  className={`w-full py-3 px-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all duration-300 relative overflow-hidden flex items-center justify-center gap-2 ${
                    selectedLocationId === null
                      ? 'bg-gradient-to-r from-slate-700/50 to-slate-800/50 text-slate-400 cursor-not-allowed border border-white/10 shadow-lg'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg hover:shadow-2xl hover:shadow-purple-500/40 hover:-translate-y-0.5 active:translate-y-0 active:shadow-lg'
                  }`}
                >
                  <div className={`absolute inset-0 transition-opacity duration-300 ${selectedLocationId === null ? 'bg-transparent' : 'bg-white/10 opacity-0 group-hover:opacity-100'}`}></div>
                  <svg className="w-4 h-4 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="relative">Get Recommendations</span>
                </button>

                {selectedLocationId === null && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-slate-900/95 border border-indigo-500/50 rounded-lg shadow-2xl text-xs font-medium text-indigo-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                    <div className="flex items-center gap-2">
                      <span>Click your location on the map to start</span>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900/95 border-r border-b border-indigo-500/50 rotate-45"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Gems Nearby Section */}
      <div className="mt-8 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] sm:p-8">
        <div className="flex flex-col gap-2 mb-8 text-center">
          <h2 className="m-0 text-[10px] font-black uppercase tracking-[4px] text-slate-500">Intelligent Recommendations</h2>
          <h3 className="m-0 text-2xl font-black bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
            Hidden Gems Nearby
          </h3>
        </div>
        
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_2fr] 2xl:grid-cols-[1.5fr_2fr]">
          {/* Left Side - CSRNET Density Mapping */}
          <CSRNet />

          {/* Right Side - Location Cards */}
          <div className="flex flex-col gap-4">
              <div className="flex gap-5 overflow-x-auto pb-4 scroll-smooth custom-scrollbar">
              {baguioLocations
                .filter(loc => loc.currentCrowdLevel === 'low')
                .map((location) => (
                  <div 
                    key={location.id} 
                    className={`flex-[0_0_240px] overflow-hidden rounded-3xl border border-white/5 bg-white/5 backdrop-blur-xl shadow-2xl transition-all duration-500 cursor-pointer sm:flex-[0_0_260px] lg:flex-[0_0_300px] ${hoveredLocation === location.id ? 'translate-y-[-8px] border-[#667eea]/50 bg-white/10' : 'hover:bg-white/[0.07]'}`}
                    onMouseEnter={() => handleLocationHover(location.id)}
                    onMouseLeave={handleLocationHoverOut}
                  >
                    <div className="relative h-[140px] overflow-hidden sm:h-[160px]">
                      <img 
                        src={`/assets/featured_images/${location.id}.jpg`} 
                        alt={location.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        onError={(e) => {
                            e.currentTarget.src = '/assets/images/placeholder.jpg';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-transparent to-transparent opacity-60"></div>
                      <div className="absolute right-4 top-4 rounded-xl bg-emerald-500 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/30 backdrop-blur-md">
                        Safe / Low
                      </div>
                    </div>
                    <div className="p-5">
                      <h4 className="mb-2 text-lg font-black text-white tracking-tight">
                        {location.name}
                      </h4>
                      <p className="mb-4 line-clamp-2 overflow-hidden text-[12px] leading-relaxed text-slate-400">
                        {location.description}
                      </p>
                      
                      <div className="space-y-3 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-slate-500">Live Traffic</span>
                          <span className="text-emerald-400">{location.detectedPeople} People</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-slate-500">Proximity</span>
                          <span className="text-slate-300">{location.distance} KM</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

Redirection.displayName = 'Redirection';

export default Redirection;

const styles = `
  .location-popup .leaflet-popup-content-wrapper {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%) !important;
    color: white !important;
    border-radius: 16px !important;
    padding: 0 !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
  }

  .location-popup .leaflet-popup-content {
    margin: 0 !important;
    line-height: inherit !important;
  }

  .location-popup .leaflet-popup-tip {
    background: #1e293b !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
  }

  .location-popup .leaflet-popup-close-button {
    color: #94a3b8 !important;
    padding: 12px 12px 0 0 !important;
    font-size: 20px !important;
    opacity: 0.8;
  }

  .location-popup .leaflet-popup-close-button:hover {
    color: white !important;
    opacity: 1;
  }

  .custom-location-marker {
    display: flex;
    align-items: center;
    justify-content: center;
    will-change: transform;
    backface-visibility: hidden;
    perspective: 1000px;
  }

  .marker-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    width: 36px;
    height: 36px;
    transform-origin: bottom center;
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    will-change: transform;
    backface-visibility: hidden;
  }

  .custom-location-marker:hover .marker-inner {
    transform: scale(1.2);
  }

  .leaflet-container {
    background-color: #0f172a;
  }

  /* Group Size Input Styling */
  .group-size-input {
    -moz-appearance: textfield;
    background: linear-gradient(135deg, rgba(55, 65, 81, 0.5) 0%, rgba(15, 23, 42, 0.5) 100%) !important;
    color: white !important;
    caret-color: rgb(165, 180, 252);
  }

  .group-size-input::-webkit-outer-spin-button,
  .group-size-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .group-size-input::placeholder {
    color: rgba(148, 163, 184, 0.9);
    font-weight: 500;
  }

  .group-size-input::-moz-placeholder {
    color: rgba(148, 163, 184, 0.9);
    font-weight: 500;
  }

  .group-size-input:hover {
    border-color: rgba(99, 102, 241, 0.5);
  }

  .group-size-input:focus {
    background: linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(139, 92, 246, 0.15) 100%) !important;
  }

  .group-size-input:-webkit-autofill,
  .group-size-input:-webkit-autofill:hover,
  .group-size-input:-webkit-autofill:focus,
  .group-size-input:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 30px rgba(55, 65, 81, 0.5) inset !important;
    -webkit-text-fill-color: white !important;
  }

  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    cursor: pointer;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    background: linear-gradient(135deg, #6366f1, #a855f7);
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 0 10px rgba(99, 102, 241, 0.6), 0 0 20px rgba(168, 85, 247, 0.3);
    transition: all 0.3s ease;
  }

  input[type="range"]::-webkit-slider-thumb:hover {
    width: 20px;
    height: 20px;
    box-shadow: 0 0 15px rgba(99, 102, 241, 1), 0 0 30px rgba(168, 85, 247, 0.5);
    border-color: rgba(99, 102, 241, 0.8);
  }

  input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: linear-gradient(135deg, #6366f1, #a855f7);
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 0 10px rgba(99, 102, 241, 0.6), 0 0 20px rgba(168, 85, 247, 0.3);
    transition: all 0.3s ease;
  }

  input[type="range"]::-moz-range-thumb:hover {
    width: 20px;
    height: 20px;
    box-shadow: 0 0 15px rgba(99, 102, 241, 1), 0 0 30px rgba(168, 85, 247, 0.5);
    border-color: rgba(99, 102, 241, 0.8);
  }

  .leaflet-popup-pane {
    animation: popupZoom 0.4s ease-in-out;
  }

  @keyframes popupZoom {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes slideInFromTop {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-in {
    animation: slideInFromTop 0.2s ease-out;
  }

  .fade-in {
    animation: fadeInDropdown 0.2s ease-out;
  }

  @keyframes fadeInDropdown {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .slide-in-from-top-2 {
    animation: slideInFromTop 0.2s ease-out;
  }

  .leaflet-map-pane {
    transition: all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  button:disabled {
    opacity: 0.6;
  }

  button:disabled:hover {
    transform: none;
  }

  @keyframes pulse-glow {
    0%, 100% {
      border-color: rgba(99, 102, 241, 0.3);
      box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.1);
    }
    50% {
      border-color: rgba(99, 102, 241, 0.6);
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
    }
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
