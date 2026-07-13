import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLiveLocations } from '../../../hooks/useLiveLocations';
import redirectionFallback from '../../../data/redirection_fallback_locations.json';
import { 
  Search, 
  MapPin, 
  Plus, 
  Minus, 
  GitBranch, 
  Zap, 
  ChevronDown,
  Activity,
  X
} from 'lucide-react';

const RedirectionMobile = ({ onTabChange }) => {
  const [snapState, setSnapState] = useState('minimized');
  const [maxTravelTime, setMaxTravelTime] = useState(15);
  const [travelMode, setTravelMode] = useState('walking');
  const [priorityWeight, setPriorityWeight] = useState(0.5);
  const [groupSize, setGroupSize] = useState(1);
  const [environment, setEnvironment] = useState('any');
  const [paidAttractions, setPaidAttractions] = useState(false);
  const [placeCategory, setPlaceCategory] = useState('any');
  const [isPlaceCategoryOpen, setIsPlaceCategoryOpen] = useState(false);
  const [isTravelModeOpen, setIsTravelModeOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const [viewMode, setViewMode] = useState('preferences');
  const [topsisResults, setTopsisResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null); // { lat, lng } from GPS
  
  const contentRef = React.useRef(null);
  const variants = {
    minimized: { height: '175px' }, 
    full: { height: '85vh' }
  };

  const handleDragEnd = (event, info) => {
    const threshold = 30; // pixels to trigger state change
    if (info.offset.y < -threshold) {
      if (snapState === 'minimized') setSnapState('full');
    } else if (info.offset.y > threshold) {
      if (snapState === 'full') setSnapState('minimized');
    }
  };

  React.useEffect(() => {
    if (snapState === 'minimized' && contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [snapState]);

  // Request user geolocation on mount
  React.useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log(`[Redirection Mobile] User location acquired: [${latitude}, ${longitude}]`);
          setUserLocation({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.warn('[Redirection Mobile] Geolocation denied or unavailable:', error.message);
          setUserLocation(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      console.warn('[Redirection Mobile] Geolocation API not supported by this browser');
    }
  }, []);
  
  const mapRef = React.useRef(null);
  const markerRefs = React.useRef({});

  const { locations: liveLocations } = useLiveLocations();
  const mapLocations = (liveLocations && liveLocations.length > 0)
    ? liveLocations
    : redirectionFallback.locations;

  const handleGetRecommendations = async () => {
    if (selectedLocationId === null) return;
    
    const selectedLocation = mapLocations.find(loc => loc.id === selectedLocationId);
    if (!selectedLocation) return;

    setIsLoading(true);
    try {
      // Use the user's real GPS coordinates if available, otherwise fall back to the selected marker's coordinates
      const startCoords = userLocation
        ? [userLocation.lat, userLocation.lng]
        : [selectedLocation.lat, selectedLocation.lng];

      const payload = {
        start_location_id: selectedLocationId,
        start_coords: startCoords,
        max_travel_time: maxTravelTime,
        travel_mode: travelMode,
        group_size: groupSize,
        environment: environment,
        place_category: placeCategory,
        paid_attractions: paidAttractions,
        priority_weight: priorityWeight,
      };

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:5001`;
      const response = await fetch(`${API_BASE_URL}/api/redirection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Failed to get recommendations: ${response.status} ${response.statusText}`);

      const data = await response.json();
      setTopsisResults(data.top_3_results || []);
      setViewMode('results');

      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }

      if (snapState === 'minimized') {
        setSnapState('full');
      }

      if (data.top_3_results && data.top_3_results.length > 0 && mapRef.current) {
        const topLocId = data.top_3_results[0].location_id;
        const topLoc = mapLocations.find(loc => loc.id === topLocId);
        if (topLoc) {
          mapRef.current.flyTo([topLoc.lat, topLoc.lng], 16, { animate: true, duration: 0.5 });
          mapRef.current.once('moveend', () => {
            if (markerRefs.current[topLoc.id]) markerRefs.current[topLoc.id].openPopup();
          });
        }
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPreferences = () => {
    setViewMode('preferences');
    setTopsisResults(null);
    if (mapRef.current && mapLocations && mapLocations.length > 0) {
      try {
        const bounds = L.latLngBounds(mapLocations.map(loc => [loc.lat, loc.lng]));
        mapRef.current.fitBounds(bounds, { padding: [30, 30] });
      } catch (e) {
        console.error('Error fitting bounds:', e);
      }
    }
  };

  React.useEffect(() => {
    if (mapRef.current && mapLocations && mapLocations.length > 0) {
      setTimeout(() => {
        try {
          const bounds = L.latLngBounds(mapLocations.map(loc => [loc.lat, loc.lng]));
          mapRef.current.fitBounds(bounds, { padding: [40, 40] });
        } catch (e) {
          console.error('Error fitting bounds:', e);
        }
      }, 300);
    }
  }, [mapLocations.length]);

  const getCrowdStatus = (locationName, peopleCount) => {
    const count = peopleCount || 0;
    const name = (locationName || "").toLowerCase();

    if (name.includes("melvin jones") || name.includes("burnham")) {
      if (count <= 296) return { statusText: "Sparse", color: "green" };
      if (count <= 1037) return { statusText: "Low Crowd", color: "green" };
      if (count <= 2233) return { statusText: "Moderate Crowd", color: "yellow" };
      return { statusText: "High Crowd", color: "red" };
    }
    if (name.includes("night market") || name.includes("market")) {
      if (count <= 40) return { statusText: "Sparse", color: "green" };
      if (count <= 141) return { statusText: "Low Crowd", color: "green" };
      if (count <= 303) return { statusText: "Moderate Crowd", color: "yellow" };
      return { statusText: "High Crowd", color: "red" };
    }
    if (name.includes("cathedral")) {
      if (count <= 92) return { statusText: "Sparse", color: "green" };
      if (count <= 320) return { statusText: "Low Crowd", color: "green" };
      if (count <= 686) return { statusText: "Moderate Crowd", color: "yellow" };
      return { statusText: "High Crowd", color: "red" };
    }
    if (name.includes("wright")) {
      if (count <= 108) return { statusText: "Sparse", color: "green" };
      if (count <= 378) return { statusText: "Low Crowd", color: "green" };
      if (count <= 809) return { statusText: "Moderate Crowd", color: "yellow" };
      return { statusText: "High Crowd", color: "red" };
    }
    if (name.includes("mansion")) {
      if (count <= 26) return { statusText: "Sparse", color: "green" };
      if (count <= 92) return { statusText: "Low Crowd", color: "green" };
      if (count <= 197) return { statusText: "Moderate Crowd", color: "yellow" };
      return { statusText: "High Crowd", color: "red" };
    }

    if (count <= 20) return { statusText: "Sparse", color: "green" };
    if (count <= 50) return { statusText: "Low Crowd", color: "green" };
    if (count <= 120) return { statusText: "Moderate Crowd", color: "yellow" };
    return { statusText: "High Crowd", color: "red" };
  };

  const getCrowdColor = (color) => {
    switch (color?.toLowerCase()) {
      case 'green': return '#10b981';
      case 'yellow': return '#f59e0b';
      case 'red': return '#ef4444';
      default: return '#8b5cf6';
    }
  };

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

  const handleMarkerClick = (location) => {
    setSelectedLocationId(location.id);
    setSearchQuery(location.name);
    if (mapRef.current) {
      mapRef.current.panTo([location.lat, location.lng]);
    }
  };

  const formatAge = (ageMinutes) => {
    if (ageMinutes === undefined || ageMinutes === null) return "Just now";
    const mins = Math.round(ageMinutes);
    if (mins <= 0) return "Just now";
    if (mins === 1) return "1 min ago";
    return `${mins} mins ago`;
  };

  return (
    <div className="fixed inset-0 bg-[#0d111c] overflow-hidden flex flex-col font-sans overscroll-none touch-none">
      <div className="absolute inset-0 z-0 touch-auto">
        <MapContainer
          ref={mapRef}
          center={[16.413, 120.604]}
          zoom={14}
          minZoom={12}
          maxZoom={18}
          zoomControl={false}
          attributionControl={false}
          className="h-full w-full"
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {mapLocations.map((location) => {
            const statusObj = getCrowdStatus(location.name, location.detectedPeople);
            let pillClass = "";
            if (statusObj.color === "green") pillClass = "text-emerald-800 bg-emerald-100/95";
            else if (statusObj.color === "yellow") pillClass = "text-amber-800 bg-amber-100/95";
            else if (statusObj.color === "red") pillClass = "text-red-800 bg-red-100/95";

            return (
              <Marker 
                key={location.id} 
                position={[location.lat, location.lng]}
                icon={createCustomMarker(statusObj.color)}
                eventHandlers={{ click: () => handleMarkerClick(location) }}
                ref={(ref) => { if (ref) markerRefs.current[location.id] = ref; }}
              >
                <Popup className="location-popup">
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-white/10 p-3 min-w-[200px] shadow-2xl">
                    <h4 className="text-sm font-black text-white tracking-tight mb-1">{location.name}</h4>
                    <p className="text-[10px] text-slate-400 capitalize mb-2 font-medium">{location.type}</p>
                    <div className="inline-block mb-2">
                      <span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest ${pillClass}`}>
                        {statusObj.statusText}
                      </span>
                    </div>
                    <div className="space-y-1 border-t border-white/10 pt-2 text-[10px]">
                      <div className="text-slate-300">
                        Estimate: <span className="font-bold text-white">{location.detectedPeople} people</span>
                      </div>
                      <div className="text-slate-400">
                        Updated: <span className="font-semibold text-slate-300">{formatAge(location.crowd_reading_age_minutes)}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="relative z-20 pt-[76px] pb-2 pointer-events-none">
        <div className="mx-4 bg-[#1a1e2d]/90 backdrop-blur-md rounded-full p-1 border border-white/10 flex shadow-lg pointer-events-auto">
          <button 
            onClick={() => onTabChange && onTabChange('live')}
            className="flex-1 py-2 text-xs font-medium text-slate-400 flex items-center justify-center gap-2 rounded-full hover:bg-white/5"
          >
            <Activity size={14} />
            LIVE MONITORING
          </button>
          <button 
            onClick={() => onTabChange && onTabChange('redirection')}
            className="flex-1 py-2 text-xs font-medium text-white bg-white/10 rounded-full flex items-center justify-center gap-2"
          >
            <GitBranch size={14} />
            SMART REDIRECTION
          </button>
        </div>

        <div className="relative m-4 pointer-events-auto">
          <div className="bg-[#1a1e2d]/90 backdrop-blur-md text-slate-300 rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-xl border border-white/10">
            <Search size={18} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Tap to set starting point" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              className="bg-transparent border-none outline-none text-sm w-full placeholder-slate-400 text-white"
            />
            {searchQuery ? (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedLocationId(null);
                  setIsSearchOpen(false);
                }} 
                className="w-8 h-8 shrink-0 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-slate-300" />
              </button>
            ) : (
              <div className="w-8 h-8 shrink-0 rounded-full bg-white/5 flex items-center justify-center">
                <MapPin size={16} className="text-slate-300" />
              </div>
            )}
          </div>

          <AnimatePresence>
            {isSearchOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSearchOpen(false)}></div>
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-[#1a1e2d]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-60 overflow-y-auto"
                >
                  {mapLocations
                    .filter(loc => loc.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((location) => (
                      <button
                        key={location.id}
                        onClick={() => {
                          setSelectedLocationId(location.id);
                          setSearchQuery(location.name);
                          setIsSearchOpen(false);
                          
                          setTimeout(() => {
                            try {
                              const map = mapRef.current;
                              const marker = markerRefs.current && markerRefs.current[location.id];
                              
                              if (map && marker) {
                                map.flyTo([location.lat, location.lng], map.getZoom(), { animate: true, duration: 0.5 });
                                map.once('moveend', () => {
                                  marker.openPopup();
                                });
                              }
                            } catch (error) {
                              console.error("Map interaction error:", error);
                            }
                          }, 50);
                        }}
                        className="w-full px-4 py-3 text-left border-b border-white/5 hover:bg-white/5 transition-colors flex items-center gap-3"
                      >
                        <MapPin size={16} className="text-indigo-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{location.name}</p>
                          <p className="text-[10px] text-slate-400 capitalize truncate">{location.type}</p>
                        </div>
                      </button>
                  ))}
                  {mapLocations.filter(loc => loc.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <div className="p-4 text-center text-slate-400 text-sm">
                      No locations found
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div 
        className={`absolute bottom-[190px] right-4 z-10 flex flex-col bg-[#1a1e2d]/90 rounded-xl border border-white/10 shadow-xl overflow-hidden backdrop-blur-md transition-opacity duration-300 ${
          snapState === 'minimized' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button 
          onClick={() => mapRef.current?.zoomIn()}
          className="p-3 hover:bg-white/5 transition-colors border-b border-white/10"
        >
          <Plus size={20} className="text-white" />
        </button>
        <button 
          onClick={() => mapRef.current?.zoomOut()}
          className="p-3 hover:bg-white/5 transition-colors"
        >
          <Minus size={20} className="text-white" />
        </button>
      </div>

      <motion.div 
        className="absolute bottom-0 left-0 right-0 z-[1500] flex flex-col bg-[#121626] rounded-t-[24px] shadow-[0_-10px_40px_rgba(0,0,0,0.8)] border-t border-white/10 touch-auto pointer-events-auto"
        initial="minimized"
        animate={snapState}
        variants={variants}
        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.05}
        onDragEnd={handleDragEnd}
        dragDirectionLock
      >
        <div className="w-full flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
          <div className="w-14 h-1.5 bg-white/30 rounded-full" />
        </div>

        <div 
          ref={contentRef}
          className={`flex-1 overflow-x-hidden px-6 pb-2 hide-scrollbar ${snapState === 'minimized' ? 'overflow-hidden' : 'overflow-y-auto mb-[80px]'}`}
        >
          <div className="mb-4" onClick={() => setSnapState(snapState === 'minimized' ? 'full' : 'minimized')}>
            <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
              <GitBranch size={20} className="text-indigo-400" />
              Smart Redirection
            </h2>
            <p className="text-sm text-slate-400">
              {snapState === 'minimized' ? 'Swipe up to adjust your constraints.' : 'Adjust your constraints'}
            </p>
          </div>

          <motion.div 
            className="flex flex-col flex-1 relative"
            animate={{ 
              opacity: snapState === 'minimized' ? 0 : 1, 
              pointerEvents: snapState === 'minimized' ? 'none' : 'auto' 
            }}
            transition={{ duration: 0.2 }}
          >
            {viewMode === 'preferences' ? (
              <>
                <div className="space-y-1.5 mb-5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Max Travel Time</label>
                    <span className="text-sm font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{maxTravelTime} min</span>
                  </div>
                  <div className="relative pt-2 pb-1 group">
                    <input 
                      type="range" 
                      min="5" 
                      max="60" 
                      step="5"
                      value={maxTravelTime}
                      onChange={(e) => setMaxTravelTime(Number(e.target.value))}
                      onPointerDownCapture={(e) => { e.stopPropagation(); e.nativeEvent.stopPropagation(); }}
                      onTouchStartCapture={(e) => { e.stopPropagation(); e.nativeEvent.stopPropagation(); }}
                      className="w-full h-2 bg-slate-700/50 rounded-lg appearance-none cursor-pointer focus:outline-none relative z-10 touch-none"
                      style={{
                        background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${((maxTravelTime - 5) / 55) * 100}%, rgba(51, 65, 85, 0.5) ${((maxTravelTime - 5) / 55) * 100}%, rgba(51, 65, 85, 0.5) 100%)`
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 mb-5">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Place Category</label>
                  <div className="relative">
                    <button
                      onClick={() => setIsPlaceCategoryOpen(!isPlaceCategoryOpen)}
                      className="w-full px-4 py-3 rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-white/20 hover:border-indigo-500/50 text-sm text-white font-medium focus:outline-none transition-all duration-300 flex items-center justify-between"
                    >
                      <span className="capitalize">
                        {placeCategory === 'shopping' ? 'Shopping & Retail' : placeCategory === 'nature' ? 'Nature & Outdoors' : placeCategory === 'dining' ? 'Dining & Food' : placeCategory === 'culture' ? 'Museums & Arts' : 'Any Category'}
                      </span>
                      <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isPlaceCategoryOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isPlaceCategoryOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[90]"
                        >
                          {[
                            { value: 'any', label: 'Any Category' },
                            { value: 'shopping', label: 'Shopping & Retail' },
                            { value: 'nature', label: 'Nature & Outdoors' },
                            { value: 'dining', label: 'Dining & Food' },
                            { value: 'culture', label: 'Museums & Arts' }
                          ].map((option) => (
                            <button
                              key={option.value}
                              onClick={() => {
                                setPlaceCategory(option.value);
                                setIsPlaceCategoryOpen(false);
                              }}
                              className={`w-full px-4 py-3 text-sm font-medium text-left transition-all duration-200 flex items-center gap-3 ${
                                placeCategory === option.value
                                  ? 'bg-indigo-500/20 text-indigo-100 border-l-2 border-indigo-400'
                                  : 'text-slate-300 hover:bg-slate-700/50 border-l-2 border-transparent'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="space-y-1.5 mb-5">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Travel Mode</label>
                  <div className="relative">
                    <button
                      onClick={() => setIsTravelModeOpen(!isTravelModeOpen)}
                      className="w-full px-4 py-3 rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-white/20 text-sm text-white font-medium focus:outline-none transition-all duration-300 flex items-center justify-between"
                    >
                      <span className="capitalize">
                        {travelMode === 'walking' ? 'Walking' : travelMode === 'commuting' ? 'Public Transport' : 'Driving'}
                      </span>
                      <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isTravelModeOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isTravelModeOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[90]"
                        >
                          {['Walking', 'Public Transport', 'Driving'].map((option) => {
                            const val = option.toLowerCase().replace(' ', '_');
                            const mappedVal = option === 'Public Transport' ? 'commuting' : val;
                            return (
                              <button
                                key={option}
                                onClick={() => {
                                  setTravelMode(mappedVal);
                                  setIsTravelModeOpen(false);
                                }}
                                className={`w-full px-4 py-3 text-sm font-medium text-left transition-all duration-200 flex items-center gap-3 ${
                                  travelMode === mappedVal
                                    ? 'bg-indigo-500/20 text-indigo-100 border-l-2 border-indigo-400'
                                    : 'text-slate-300 hover:bg-slate-700/50 border-l-2 border-transparent'
                                }`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="space-y-1.5 mb-5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Routing Priority</label>
                    <span className="text-xs font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent tabular-nums">
                      {Math.round(priorityWeight * 100)}% Speed
                      <span className="text-slate-500 font-semibold"> | </span>
                      {Math.round((1 - priorityWeight) * 100)}% Comfort
                    </span>
                  </div>
                  <div className="relative group pt-2 pb-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={Math.round(priorityWeight * 100)}
                      onChange={(e) => setPriorityWeight(Number(e.target.value) / 100)}
                      onPointerDownCapture={(e) => { e.stopPropagation(); e.nativeEvent.stopPropagation(); }}
                      onTouchStartCapture={(e) => { e.stopPropagation(); e.nativeEvent.stopPropagation(); }}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer transition-all duration-300 touch-none"
                      style={{
                        background: `linear-gradient(to right, rgb(79, 70, 229) 0%, rgb(79, 70, 229) ${priorityWeight * 100}%, rgb(55, 65, 81) ${priorityWeight * 100}%, rgb(55, 65, 81) 100%)`
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-start mt-1 px-0.5">
                    <div className="text-left transition-opacity duration-200" style={{ opacity: 0.3 + priorityWeight * 0.7 }}>
                      <p className="text-[10px] font-semibold text-slate-400">Fastest</p>
                    </div>
                    <div className="text-center" style={{ opacity: 1 - Math.abs(priorityWeight - 0.5) * 1.8 }}>
                      <p className="text-[10px] font-semibold text-slate-500">Balanced</p>
                    </div>
                    <div className="text-right transition-opacity duration-200" style={{ opacity: 0.3 + (1 - priorityWeight) * 0.7 }}>
                      <p className="text-[10px] font-semibold text-slate-400">Comfort</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 mb-5">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Group Size</label>
                  <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-white/10 rounded-xl">
                    <button 
                      onClick={() => setGroupSize(Math.max(1, groupSize - 1))}
                      className="w-12 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-300 active:bg-white/20"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="text-lg font-medium text-white">{groupSize} {groupSize === 1 ? 'Person' : 'People'}</span>
                    <button 
                      onClick={() => setGroupSize(Math.min(50, groupSize + 1))}
                      className="w-12 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-300 active:bg-white/20"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                <div className="border-t border-white/10 my-4"></div>

                <div className="space-y-2 mb-5">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Environment</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['indoors', 'outdoors', 'any'].map((env) => (
                      <label key={env} className={`flex items-center justify-center px-2 py-3 rounded-xl cursor-pointer transition-all duration-300 font-medium text-[10px] uppercase tracking-wide ${environment === env ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/50' : 'bg-slate-700/30 border border-white/10 text-slate-300'}`}>
                        <input 
                          type="radio" 
                          name="environment"
                          value={env}
                          checked={environment === env}
                          onChange={(e) => setEnvironment(e.target.value)}
                          className="hidden"
                        />
                        <span>{env}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mb-5">
                  <label className={`flex items-center justify-between px-4 py-4 rounded-xl cursor-pointer transition-all duration-300 ${paidAttractions ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/50' : 'bg-slate-700/30 border border-white/10'}`}>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-300">Include Paid Attractions</span>
                    <div className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${paidAttractions ? 'bg-indigo-500' : 'bg-slate-600'}`}>
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

                <div className="sticky bottom-0 z-20 pt-4 pb-2 mt-0 bg-gradient-to-t from-[#121626] via-[#121626] via-90% to-transparent">
                  <button 
                    onClick={handleGetRecommendations}
                    disabled={!selectedLocationId || isLoading}
                    className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_0_40px_rgba(18,22,38,1)] ${
                      !selectedLocationId || isLoading
                        ? 'bg-slate-800 border border-slate-700 text-slate-400 cursor-not-allowed opacity-95 text-[11px]'
                        : 'bg-indigo-600 border border-indigo-500 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/30'
                    }`}
                  >
                    <Zap size={18} className={!selectedLocationId ? 'fill-slate-600 text-slate-500' : 'fill-white'} />
                    {isLoading ? 'LOADING...' : !selectedLocationId ? 'TAP A LOCATION ON THE MAP TO START' : 'GET RECOMMENDATIONS'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-4 h-full">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-black text-white tracking-tight">
                    {topsisResults && topsisResults.length === 1 ? "Exact Match Found" : "Top Recommendations"}
                  </h4>
                  <button
                    onClick={handleEditPreferences}
                    className="px-3 py-1.5 text-xs font-black uppercase tracking-widest bg-slate-700/50 border border-white/20 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-200 rounded-lg transition-all duration-300"
                  >
                    Edit
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 pb-4 pt-2 -mt-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {topsisResults && topsisResults.length > 0 ? (
                    <>
                      {topsisResults.map((result, index) => {
                      const location = mapLocations.find(loc => loc.id === result.location_id);
                      const isTopResult = index === 0;
                      return (
                        <div
                          key={result.location_id}
                          onClick={() => {
                            if (mapRef.current && location) {
                              mapRef.current.flyTo([location.lat, location.lng], 16, { animate: true });
                              mapRef.current.once('moveend', () => {
                                if (markerRefs.current[location.id]) {
                                  markerRefs.current[location.id].openPopup();
                                }
                              });
                            }
                          }}
                          className={`p-3 rounded-2xl border transition-all duration-300 flex flex-col gap-2 cursor-pointer transform hover:-translate-y-1 hover:shadow-xl hover:z-10 ${
                            isTopResult
                              ? 'bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border-amber-500/50 shadow-lg shadow-amber-500/20 relative overflow-hidden hover:border-amber-400'
                              : 'bg-gradient-to-br from-slate-700/50 to-slate-800/50 border-white/10 hover:border-indigo-500/50 hover:bg-slate-700/80 relative'
                          }`}
                        >
                          {isTopResult && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg">
                              #1 Best Match
                            </div>
                          )}
                          
                          <div className="pr-20">
                            <h5 className={`text-sm font-black ${isTopResult ? 'text-amber-100' : 'text-white'} mb-0.5`}>
                              #{index + 1} {location?.name || result?.name || 'Location'}
                            </h5>
                            <p className="text-[10px] text-slate-400 mb-0">{location?.type || result?.type || 'Unknown'}</p>
                          </div>

                          {result.reason_text && (
                            <div className="flex items-start gap-1.5 mb-1 mt-1.5">
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2.5" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                className={`w-3.5 h-3.5 mt-[1px] shrink-0 ${isTopResult ? 'text-amber-400/90' : 'text-slate-400'}`}
                              >
                                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                                <path d="M5 3v4"/>
                                <path d="M7 5H3"/>
                              </svg>
                              <p className="text-[10px] text-slate-400 italic leading-snug mb-0">
                                {result.reason_text}
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Score</span>
                              <span className="font-black text-indigo-300">{result.topsis_score?.toFixed(2) || 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Distance</span>
                              <span className="font-black text-slate-200">{result.distance?.toFixed(1) || location?.distance} km</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">People</span>
                              <span className="font-black text-slate-200">{location?.detectedPeople || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Level</span>
                              <span className={`font-black uppercase text-[9px] ${
                                (location?.crowdLevel?.toLowerCase() === 'low' || location?.crowdLevel?.toLowerCase() === 'sparse') ? 'text-emerald-400' :
                                location?.crowdLevel?.toLowerCase() === 'moderate' ? 'text-amber-400' :
                                'text-red-400'
                              }`}>
                                {location?.crowdLevel || 'Unknown'}
                              </span>
                            </div>
                          </div>

                          <div className="mt-1 pt-3 border-t border-white/5 flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const lat = result.latitude || location?.lat;
                                const lng = result.longitude || location?.lng;
                                if (lat && lng) {
                                  window.open(`https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank', 'noopener,noreferrer');
                                }
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#33ccff]/10 hover:bg-[#33ccff]/20 border border-[#33ccff]/30 text-[#33ccff] text-[9px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 hover:-translate-y-0.5"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.556 16.59l-5.11-2.95a.89.89 0 0 1-.446-.77V7.11c0-.49.398-.888.89-.888s.89.398.89.889v5.24l4.57 2.64a.89.89 0 0 1 .326 1.218.89.89 0 0 1-1.22.38z"/>
                              </svg>
                              Waze
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const lat = result.latitude || location?.lat;
                                const lng = result.longitude || location?.lng;
                                if (lat && lng) {
                                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`, '_blank', 'noopener,noreferrer');
                                }
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#4285F4]/10 hover:bg-[#4285F4]/20 border border-[#4285F4]/30 text-[#4285F4] text-[9px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 hover:-translate-y-0.5"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0zm-.375 16.634l-5.698-3.29c-.392-.226-.392-.782 0-1.008l5.698-3.29c.392-.226.98.058.98.504v6.58c0 .446-.588.73-.98.504zm6.09-3.518l-5.698 3.29c-.392.226-.98-.058-.98-.504v-6.58c0-.446.588-.73.98-.504l5.698 3.29c.392.226.392.782 0 1.008z"/>
                              </svg>
                              Maps
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {topsisResults.length === 1 && (
                      <button
                        onClick={handleEditPreferences}
                        className="w-full mt-2 px-4 py-3 bg-slate-800/80 border border-slate-700/80 hover:border-indigo-500/50 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all duration-300 text-center"
                      >
                        Adjust preferences to see more alternatives
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-4 py-8">
                    <h5 className="text-lg font-black text-white mb-2">No Matches Found</h5>
                    <p className="text-xs text-slate-400 mb-6 max-w-[200px] mx-auto leading-relaxed">
                      Your current preferences might be too strict for the current crowd conditions.
                    </p>
                    <button
                      onClick={handleEditPreferences}
                      className="px-6 py-3 bg-slate-800/80 border border-slate-700/80 hover:border-indigo-500/50 hover:bg-slate-700 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all duration-300"
                    >
                      Reset Filters
                    </button>
                  </div>
                )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default RedirectionMobile;
