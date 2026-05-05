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
  const [maxTravelTime, setMaxTravelTime] = useState(15);
  const [travelMode, setTravelMode] = useState('walking');
  const [groupSize, setGroupSize] = useState(1);
  const [environment, setEnvironment] = useState('any');
  const [paidAttractions, setPaidAttractions] = useState(false);
  const markerRefs = useRef({});

  // Load Baguio locations for Hidden Gems section
  useEffect(() => {
    setBaguioLocations(baguioData.locations);
  }, []);

  // Get live locations from database for interactive map (locations 1-5)
  const { locations: liveLocations } = useLiveLocations();
  // Use fallback locations if database locations are empty or not loaded
  const mapLocations = liveLocations && liveLocations.length > 0 
    ? liveLocations.filter(loc => loc.id >= 1 && loc.id <= 5)
    : redirectionFallback.locations;

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
        <div style="
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s ease;
          transform-origin: bottom center;
        "
        onmouseover="this.style.transform='scale(1.25)'"
        onmouseout="this.style.transform='scale(1)'">
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
    <div ref={ref} className="mx-auto mt-10 max-w-[1600px] scroll-mt-8 space-y-6">
      {/* Interactive Map Card */}
      <div className="rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] sm:p-8">
        {/* Map and Settings Layout */}
        <div className="grid grid-cols-1 gap-6 items-stretch lg:grid-cols-[2fr_1fr]">
          {/* Left Column - Map with Header */}
          <div className="flex flex-col gap-4">
            {/* Header - Left Aligned */}
            <div className="flex flex-col gap-2 text-left">
              <h2 className="m-0 text-[10px] font-black uppercase tracking-[4px] text-slate-500">Smart Redirection</h2>
              <h3 className="m-0 text-2xl font-black bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
                Crowd-Aware Redirection
              </h3>
              <p className="m-0 text-sm text-slate-400 font-medium mt-1">Click on any location marker to view details and find alternative routes based on current crowd levels</p>
            </div>

            {/* Leaflet Map */}
            <div className="flex-1 overflow-hidden rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.1)]" style={{ minHeight: '320px' }}>
            <MapContainer
              center={[16.413, 120.604]}
              zoom={15}
              minZoom={13}
              maxZoom={16}
              maxBounds={[
                [16.410, 120.593],
                [16.416, 120.614]
              ]}
              maxBoundsViscosity={1.0}
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
                  ref={(ref) => {
                    if (ref) {
                      markerRefs.current[location.id] = ref;
                    }
                  }}
                >
                  <Popup className="location-popup">
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
          <div className="flex flex-col self-stretch">
            {/* Settings Panel */}
            <div className="h-full rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 p-5 overflow-y-auto flex flex-col">
              <h4 className="text-lg font-black text-white mb-5 tracking-tight">Your Preferences</h4>
              
              {/* Max Travel Time */}
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Max Travel Time</label>
                  <span className="text-sm font-black text-indigo-400">{maxTravelTime} min</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="30" 
                  value={maxTravelTime}
                  onChange={(e) => setMaxTravelTime(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              <div className="border-t border-white/10 my-2.5"></div>

              {/* Travel Mode */}
              <div className="space-y-1.5 mb-3">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Travel Mode</label>
                <select 
                  value={travelMode}
                  onChange={(e) => setTravelMode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-white/10 text-sm text-white font-medium focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                >
                  <option value="walking">Walking</option>
                  <option value="commuting">Commuting</option>
                  <option value="driving">Driving</option>
                </select>
              </div>

              <div className="border-t border-white/10 my-2.5"></div>

              {/* Group Size */}
              <div className="space-y-1.5 mb-3">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Group Size</label>
                <input 
                  type="number" 
                  min="1" 
                  max="50"
                  value={groupSize}
                  onChange={(e) => setGroupSize(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-white/10 text-sm text-white font-medium focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="border-t border-white/10 my-2.5"></div>

              {/* Environment Preference */}
              <div className="space-y-1.5 mb-3">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Environment</label>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      id="indoors" 
                      name="environment"
                      value="indoors"
                      checked={environment === 'indoors'}
                      onChange={(e) => setEnvironment(e.target.value)}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="indoors" className="text-sm text-slate-300 cursor-pointer">Indoors</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      id="outdoors" 
                      name="environment"
                      value="outdoors"
                      checked={environment === 'outdoors'}
                      onChange={(e) => setEnvironment(e.target.value)}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="outdoors" className="text-sm text-slate-300 cursor-pointer">Outdoors</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      id="any" 
                      name="environment"
                      value="any"
                      checked={environment === 'any'}
                      onChange={(e) => setEnvironment(e.target.value)}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="any" className="text-sm text-slate-300 cursor-pointer">Any</label>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 my-2.5"></div>

              {/* Paid Attractions */}
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Include Paid Attractions</label>
                  <input 
                    type="checkbox" 
                    checked={paidAttractions}
                    onChange={(e) => setPaidAttractions(e.target.checked)}
                    className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="border-t border-white/10 my-2.5"></div>

              {/* Redirect Me Now Button */}
              <button 
                onClick={() => console.log({ maxTravelTime, travelMode, groupSize, environment, paidAttractions })}
                className="mt-auto w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black uppercase tracking-widest text-sm transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-purple-500/50"
              >
                Redirect Me Now
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Gems Nearby Section */}
      <div className="rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] sm:p-8">
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
  }

  .leaflet-container {
    background-color: #0f172a;
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
