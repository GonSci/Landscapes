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
    <div className="mx-auto mt-6 max-w-[1600px] scroll-mt-8 rounded-2xl bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.1)] sm:p-4" ref={ref}>
      <h2 className="mb-5 block w-full text-center text-[1.25rem] font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent sm:mb-4 sm:text-[1.375rem] lg:text-[1.625rem]">
        Hidden Gems Nearby
      </h2>
      
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
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
              <div className="flex gap-4 overflow-x-auto pb-2 scroll-smooth">
              {baguioLocations
                .filter(loc => loc.currentCrowdLevel === 'low')
                .map((location) => (
                  <div 
                    key={location.id} 
                      className={`flex-[0_0_220px] overflow-hidden rounded-xl border-2 border-transparent bg-white shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 cursor-pointer sm:flex-[0_0_240px] lg:flex-[0_0_280px] ${hoveredLocation === location.id ? 'translate-y-[-4px] border-[#667eea] shadow-[0_8px_24px_rgba(102,126,234,0.25)]' : ''}`}
                    onMouseEnter={() => handleLocationHover(location.id)}
                    onMouseLeave={handleLocationHoverOut}
                  >
                      <div className="relative h-[130px] overflow-hidden sm:h-[145px]">
                      <img 
                        src={`/assets/featured_images/${location.id}.jpg`} 
                        alt={location.name}
                          className="h-full w-full object-cover transition-transform duration-300"
                        onError={(e) => {
                            e.currentTarget.src = '/assets/images/placeholder.jpg';
                        }}
                      />
                        <div 
                          className="absolute right-3 top-3 rounded-md bg-emerald-500/95 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm"
                      >
                        Low Crowd
                      </div>
                    </div>
                      <div className="p-3 sm:p-3.5">
                        <h4 className="mb-1 text-base font-semibold text-slate-800">
                          {location.name}
                        </h4>
                        <p className="mb-3 line-clamp-2 overflow-hidden text-[0.8125rem] leading-5 text-slate-500">
                          {location.description}
                        </p>
                        <div className="mb-2 flex flex-col gap-1.5 border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-1.5 text-[0.8125rem] text-slate-600">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-[15px] w-[15px] text-[#667eea]">
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                          </svg>
                          <span>{location.detectedPeople} people</span>
                        </div>
                          <div className="flex items-center gap-1.5 text-[0.8125rem] text-slate-600">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-[15px] w-[15px] text-[#667eea]">
                            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                          </svg>
                          <span>~{location.averageWaitTime} min wait</span>
                        </div>
                      </div>
                        <div className="flex items-center gap-1.5 text-[0.8125rem] text-slate-500">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="h-[15px] w-[15px] text-amber-500">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                        <span>Distance: {location.distance} km</span>
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
