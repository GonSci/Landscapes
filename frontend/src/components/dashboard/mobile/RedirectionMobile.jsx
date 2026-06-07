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
  Activity
} from 'lucide-react';

const RedirectionMobile = ({ onTabChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [travelTime, setTravelTime] = useState(15);
  const [priority, setPriority] = useState(50);
  const [groupSize, setGroupSize] = useState(1);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  
  const mapRef = React.useRef(null);
  const markerRefs = React.useRef({});

  const { locations: liveLocations } = useLiveLocations();
  const mapLocations = (liveLocations && liveLocations.length > 0)
    ? liveLocations
    : redirectionFallback.locations;

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
    if (mapRef.current) {
      mapRef.current.setView([location.lat, location.lng], 17);
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
      {/* Interactive Map */}
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
          <ZoomControl position="topright" />
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

      {/* Top Navigation Layer (z-20) */}
      <div className="relative z-20 pt-[76px] pb-2 pointer-events-none">
        {/* Persistent Header Segmented Toggle Placeholder */}
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

        {/* Floating Search Bar */}
        <div className="bg-[#1a1e2d]/90 backdrop-blur-md text-slate-300 rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-xl m-4 border border-white/10 pointer-events-auto">
          <Search size={18} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Tap to set starting point" 
            className="bg-transparent border-none outline-none text-sm w-full placeholder-slate-400 text-white"
          />
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
            <MapPin size={16} className="text-slate-300" />
          </div>
        </div>
      </div>

      {/* Expandable Bottom Sheet (z-30) */}
      <motion.div 
        className="bg-[#1a1e2d] rounded-t-3xl border-t border-white/5 w-full absolute bottom-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-30 touch-auto pointer-events-auto"
        animate={{ height: isExpanded ? '85vh' : 'auto' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        {/* Drag Handle & Header (always visible) */}
        <div 
          className="px-6 pt-3 pb-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-4"></div>
          
          <div className="flex items-center gap-3 mb-1">
            <GitBranch size={20} className="text-indigo-400" />
            <h2 className="text-xl font-semibold text-white">Smart Redirection</h2>
          </div>
          
          <p className="text-sm text-slate-400">
            {isExpanded ? 'Adjust your constraints' : 'Swipe up to adjust your constraints and preferences.'}
          </p>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex flex-col gap-6 p-6 overflow-y-auto"
              style={{ maxHeight: 'calc(85vh - 100px)' }}
            >
              {/* MAX TRAVEL TIME */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Max Travel Time</label>
                  <span className="text-sm text-white">{travelTime} min</span>
                </div>
                <div className="relative w-full h-2 bg-slate-800 rounded-full">
                  <div 
                    className="absolute h-full bg-purple-500 rounded-full"
                    style={{ width: `${(travelTime / 60) * 100}%` }}
                  ></div>
                  <input 
                    type="range" 
                    min="5" 
                    max="60" 
                    step="5"
                    value={travelTime}
                    onChange={(e) => setTravelTime(parseInt(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  />
                  <div 
                    className="absolute top-1/2 -mt-2 w-4 h-4 bg-white rounded-full shadow-md pointer-events-none"
                    style={{ left: `calc(${(travelTime / 60) * 100}% - 8px)` }}
                  ></div>
                </div>
              </div>

              {/* PLACE CATEGORY */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Place Category</label>
                <div className="relative">
                  <select className="w-full bg-[#222738] border border-white/5 rounded-xl px-4 py-3 text-white appearance-none outline-none focus:ring-1 focus:ring-indigo-500/50">
                    <option>Any Category</option>
                    <option>Nature & Parks</option>
                    <option>Historical Sites</option>
                    <option>Food & Dining</option>
                    <option>Shopping</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* ROUTING PRIORITY */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Routing Priority</label>
                <div className="text-center text-sm text-white mb-2">
                  {priority}% Speed | {100 - priority}% Comfort
                </div>
                <div className="relative w-full h-2 bg-slate-800 rounded-full mb-6">
                  <div 
                    className="absolute h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                    style={{ width: `${priority}%` }}
                  ></div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  />
                  <div 
                    className="absolute top-1/2 -mt-2 w-4 h-4 bg-white rounded-full shadow-md pointer-events-none"
                    style={{ left: `calc(${priority}% - 8px)` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-2">
                  <div className="w-1/3 text-left leading-tight">Fastest Arrival<br/>Shortest distance</div>
                  <div className="w-1/3 text-center leading-tight">Balanced</div>
                  <div className="w-1/3 text-right leading-tight">Max Comfort<br/>Lowest crowd density</div>
                </div>
              </div>

              {/* GROUP SIZE */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Group Size</label>
                <div className="flex items-center justify-between bg-[#222738] rounded-xl p-2 border border-white/5">
                  <button 
                    onClick={() => setGroupSize(Math.max(1, groupSize - 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-300"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="text-lg font-medium text-white">{groupSize}</span>
                  <button 
                    onClick={() => setGroupSize(Math.min(20, groupSize + 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-300"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              {/* ENVIRONMENT */}
              <div className="space-y-3 mb-24">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Environment</label>
                <div className="relative">
                  <select className="w-full bg-[#222738] border border-white/5 rounded-xl px-4 py-3 text-white appearance-none outline-none focus:ring-1 focus:ring-indigo-500/50">
                    <option>Any Environment</option>
                    <option>Indoor (AC)</option>
                    <option>Outdoor</option>
                    <option>Covered/Shaded</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Fixed Action Button */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#1a1e2d] via-[#1a1e2d] to-transparent pt-12 pointer-events-none"
            >
              <button className="w-full bg-indigo-600/20 border border-indigo-500/50 text-indigo-300 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-600/30 transition-colors pointer-events-auto">
                <Zap size={18} className="fill-indigo-400" />
                GET RECOMMENDATIONS
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default RedirectionMobile;
