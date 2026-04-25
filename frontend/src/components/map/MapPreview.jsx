import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map } from 'lucide-react';
import philippinesData from '../../data/philippines_locations.json';

const MapPreview = ({ 
  hoveredLocation, 
  selectedLocation,
  onMapClick,
  isInView 
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  // Load Leaflet CSS and JS
  useEffect(() => {
    // Load Leaflet CSS
    const leafletCSS = document.createElement('link');
    leafletCSS.rel = 'stylesheet';
    leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    leafletCSS.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    leafletCSS.crossOrigin = '';
    document.head.appendChild(leafletCSS);

    // Load Leaflet JS
    const leafletJS = document.createElement('script');
    leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    leafletJS.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    leafletJS.crossOrigin = '';
    
    leafletJS.onload = () => {
      setMapLoaded(true);
    };
    
    document.body.appendChild(leafletJS);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Initialize the map
  useEffect(() => {
    if (!mapLoaded || !window.L || mapInstanceRef.current) return;

    // Initialize map centered on Baguio City
    const map = window.L.map(mapRef.current, {
      center: [16.4023, 120.5960],
      zoom: 13,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      tap: false,
      touchZoom: false
    });

    // Add Dark Matter tiles
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Filter to only show Baguio locations
    const baguioLocations = philippinesData.locations.filter(location => 
      location.region === 'Cordillera Administrative Region' || 
      location.name.toLowerCase().includes('baguio')
    );

    // Add markers for Baguio locations only - EXACT same style as PhilippinesMap.jsx
    baguioLocations.forEach((location) => {
      const color = getLocationColor(location.id);
      
      // Create custom icon - identical to PhilippinesMap
      const icon = window.L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background-color: ${color};
            width: 35px;
            height: 35px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            cursor: pointer;
            transition: transform 0.2s;
          "
          onmouseover="this.style.transform='scale(1.2)'"
          onmouseout="this.style.transform='scale(1)'">
            📍
          </div>
        `,
        iconSize: [35, 35],
        iconAnchor: [17.5, 17.5],
      });

      const marker = window.L.marker([location.lat, location.lng], { icon })
        .addTo(map);

      markersRef.current[location.id] = marker;
    });

  }, [mapLoaded]);

  // Handle hover effects
  useEffect(() => {
    if (!mapInstanceRef.current || !hoveredLocation) return;

    const marker = markersRef.current[hoveredLocation];
    if (marker) {
      marker.getElement()?.classList.add('marker-hovered');
    }

    return () => {
      if (marker) {
        marker.getElement()?.classList.remove('marker-hovered');
      }
    };
  }, [hoveredLocation]);


  const getLocationColor = (locationId) => {
    return '#667eea'; // Purple theme color
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative h-fit"
    >
      <div 
        className="sticky top-32 w-full h-screen bg-[#0f172a] rounded-3xl overflow-hidden shadow-2xl border-2 border-white/5 transition-all duration-300 cursor-pointer hover:border-indigo-500/50 hover:shadow-indigo-500/20"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Leaflet Map Container */}
        <div 
          ref={mapRef} 
          className="relative w-full h-full"
          style={{ height: '100%', width: '100%', borderRadius: '12px' }}
        >
          {!mapLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f172a] gap-4">
              <div className="w-12 h-12 border-4 border-white/5 border-t-indigo-500 rounded-full animate-spin"></div>
              <p className="text-slate-500 text-base font-medium">Loading map preview...</p>
            </div>
          )}
        </div>

        {/* Hover Overlay with CTA Button */}
        <AnimatePresence>
          {isHovering && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-gradient-to-br from-indigo-600/92 to-purple-700/92 backdrop-blur-lg flex items-center justify-center z-[1000] cursor-pointer"
              onClick={onMapClick}
            >
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ delay: 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-3.5 px-10 py-5 bg-white text-indigo-600 border-none rounded-2xl text-xl font-bold shadow-2xl transition-all duration-300 hover:bg-blue-50 hover:-translate-y-0.5 hover:shadow-3xl"
              >
                <Map size={24} />
                <span>◇ Show Interactive Map ◇</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Location Info */}
        <AnimatePresence>
          {selectedLocation && !isHovering && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute top-6 left-6 right-6 p-5 bg-white rounded-xl shadow-md z-20"
            >
              <h4 className="text-lg font-bold text-gray-800 mb-1">{selectedLocation.name}</h4>
              <p className="text-sm text-gray-500 m-0">{selectedLocation.region}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Map Button */}
    </motion.div>
  );
};

export default MapPreview;
