import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import baguioData from '../../data/baguio_locations.json';
import CSRNet from './CSRNet';

const Redirection = React.forwardRef((props, ref) => {
  const [baguioLocations, setBaguioLocations] = useState([]);
  const [hoveredLocation, setHoveredLocation] = useState(null);
  const markerRefs = useRef({});

  // Load Baguio locations
  useEffect(() => {
    setBaguioLocations(baguioData.locations);
  }, []);

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

  return (
    <div className="mx-auto mt-10 max-w-[1600px] scroll-mt-8 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] sm:p-8" ref={ref}>
      <div className="flex flex-col gap-2 mb-8 text-center">
        <h2 className="m-0 text-[10px] font-black uppercase tracking-[4px] text-slate-500">Intelligent Recommendations</h2>
        <h3 className="m-0 text-3xl font-black bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
          Hidden Gems Nearby
        </h3>
      </div>
      
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_2fr] 2xl:grid-cols-[1.5fr_2fr]">
        {/* Left Side - CSRNET Density Mapping */}
        <CSRNet />

        {/* Right Side - Map and Location Cards */}
        <div className="flex flex-col gap-4">
          {/* Leaflet Map */}
          <div className="h-[250px] overflow-hidden rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] sm:h-[280px] lg:h-[320px]">
            <MapContainer
              center={[16.4065, 120.5930]}
              zoom={14}
              minZoom={13}
              maxZoom={16}
              maxBounds={[
                [16.3600, 120.5400],
                [16.4500, 120.6200]
              ]}
              scrollWheelZoom={false}
              className="h-full w-full"
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {baguioLocations.map((location) => (
                <Marker 
                  key={location.id} 
                  position={[location.coordinates.lat, location.coordinates.lng]}
                  ref={(ref) => {
                    if (ref) {
                      markerRefs.current[location.id] = ref;
                    }
                  }}
                >
                  <Popup>
                      <div className="p-2">
                        <h4 className="mb-2 text-base font-semibold text-slate-800">
                          {location.name}
                        </h4>
                        <p className="mb-2 text-sm capitalize text-slate-500">
                          {location.type}
                        </p>
                        <div className="flex items-center gap-2">
                        <span 
                            className={`rounded px-2.5 py-1 text-xs font-semibold text-white ${
                              location.currentCrowdLevel === 'low'
                                ? 'bg-emerald-500'
                                : location.currentCrowdLevel === 'moderate'
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                            }`}
                        >
                          {location.currentCrowdLevel.toUpperCase()}
                        </span>
                          <span className="text-sm font-medium text-slate-500">
                            {location.detectedPeople} people
                          </span>
                      </div>
                        <div className="mt-2 flex items-center gap-1.5 border-t border-slate-200 pt-2">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-amber-500">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                          <span className="text-sm font-medium text-slate-500">{location.distance} km away</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Scrollable Location Cards */}
            <div className="overflow-hidden">
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
