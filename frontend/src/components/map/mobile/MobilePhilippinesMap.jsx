import React, { useEffect, useRef, useState } from 'react';
import { useLiveLocations } from '../../../hooks/useLiveLocations';

const MobilePhilippinesMap = ({ userProfile, focusLocation, isSidebarOpen, onViewLiveFeed }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const featureMarkersRef = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showFeatures, setShowFeatures] = useState(true);

  const { locations } = useLiveLocations();

  // Invalidate map size when sidebar toggles
  useEffect(() => {
    if (mapInstanceRef.current && window.L) {
      let startTime = performance.now();
      let animationFrame;
      
      const animateMap = (currentTime) => {
        if (currentTime - startTime < 350) { // Run for slightly longer than the 300ms CSS transition
          mapInstanceRef.current.invalidateSize({ animate: false });
          animationFrame = requestAnimationFrame(animateMap);
        } else {
          mapInstanceRef.current.invalidateSize({ animate: true });
        }
      };
      
      animationFrame = requestAnimationFrame(animateMap);
      
      return () => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
      };
    }
  }, [isSidebarOpen]);

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
      }
    };
  }, []);

  useEffect(() => {
    if (!mapLoaded || !window.L || mapInstanceRef.current) return;

    // Initialize map centered on Baguio City
    const map = window.L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([16.4023, 120.5960], 13);
    window.L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Add Dark Matter tiles
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      minZoom: 12,
    }).addTo(map);

    // Set max bounds to restrict map to Baguio area
    const baguioBounds = window.L.latLngBounds(
      [16.35, 120.52],  // Southwest coordinates
      [16.45, 120.65]   // Northeast coordinates
    );
    map.setMaxBounds(baguioBounds);
    map.on('drag', function() {
      map.panInsideBounds(baguioBounds, { animate: false });
    });

    // Zoom back out when a popup is closed (e.g. clicking the X)
    map.on('popupclose', () => {
      setTimeout(() => {
        // Only zoom out if there isn't another popup immediately opening
        // We robustly check if ANY of our feature markers still have an open popup
        const isAnyOpen = featureMarkersRef.current.some(m => m.isPopupOpen && m.isPopupOpen());
        if (!isAnyOpen && mapInstanceRef.current && mapInstanceRef.current.getZoom() > 13) {
          mapInstanceRef.current.setView([16.4023, 120.5960], 13, { animate: true });
        }
      }, 50);
    });

    // Handle "View Live Feed" button clicks inside popups
    map.on('popupopen', (e) => {
      const btn = e.popup._contentNode?.querySelector('.live-feed-btn');
      if (btn) {
        btn.onclick = () => {
          const locationId = parseInt(btn.getAttribute('data-location-id'));
          if (onViewLiveFeed) onViewLiveFeed(locationId);
        };
      }
    });

    mapInstanceRef.current = map;

    // Removed: Click handler for map exploration - users can only click on markers

    // Removed standard Baguio location pins as per user request

  }, [mapLoaded]);

  // Focus on a specific location when requested
  useEffect(() => {
    if (focusLocation && mapInstanceRef.current && window.L && featureMarkersRef.current) {
      // Find the marker that matches the location ID (robust) or coordinates (fallback)
      const targetMarker = featureMarkersRef.current.find(
        m => m.options.locationId === focusLocation.id || 
             (m.getLatLng().lat === focusLocation.lat && m.getLatLng().lng === focusLocation.lng)
      );
      
      if (targetMarker) {
        // Zoom into the specific place
        mapInstanceRef.current.setView(targetMarker.getLatLng(), 16, { animate: true });
        // Open the tooltip after a small delay to avoid animation conflict with setView
        setTimeout(() => {
          targetMarker.openPopup();
        }, 150);
      }
    }
  }, [focusLocation]);

  // Add feature markers from database locations
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !locations.length) return;
    
    // Clear existing feature markers
    featureMarkersRef.current.forEach(marker => marker.remove());
    featureMarkersRef.current = [];
    
    // If features are hidden, don't add any markers
    if (!showFeatures) return;
    
    // Add markers for each database location
    locations.forEach((loc) => {
      const bgColor = '#8b5cf6'; // Default Purple
      const label = 'Place';
      
      const featureIcon = window.L.divIcon({
        className: 'feature-marker',
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
          onmouseover="this.style.transform='scale(1.2)'"
          onmouseout="this.style.transform='scale(1)'">
            <svg viewBox="0 0 24 24" width="36" height="36" style="filter: drop-shadow(0px 0px 8px ${bgColor});">
              <path fill="${bgColor}" d="M12 0c-4.198 0-8 3.403-8 7.602 0 4.198 3.469 9.21 8 16.398 4.531-7.188 8-12.2 8-16.398 0-4.199-3.801-7.602-8-7.602zm0 11c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z"/>
            </svg>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });
      
      const marker = window.L.marker([loc.lat, loc.lng], { 
        icon: featureIcon,
        locationId: loc.id // Store ID for focus logic
      })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="text-align: center; min-width: 200px; background: #1e293b; color: #f1f5f9; padding: 12px; border-radius: 12px;">
            <div style="
              display: inline-block;
              background: ${bgColor};
              color: white;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 0.75rem;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              margin-bottom: 10px;
              box-shadow: 0 0 15px ${bgColor}80;
            ">${loc.crowdLevel} Crowd</div>
            <h4 style="margin: 0 0 4px 0; color: white; font-size: 1rem; font-weight: 700;">${loc.name}</h4>
            <p style="margin: 0 0 14px 0; color: #94a3b8; font-size: 0.85rem; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 4px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              Baguio City
            </p>
            <button class="live-feed-btn" data-location-id="${loc.id}" style="
              display: flex; align-items: center; justify-content: center; gap: 8px;
              background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 10px 14px; border-radius: 10px; 
              font-size: 0.85rem; font-weight: 600; cursor: pointer; width: 100%; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: 0 4px 15px rgba(102,126,234,0.4);
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(118,75,162,0.5)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(102,126,234,0.4)';">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="m22 8-6 4 6 4V8Z"></path>
                <rect width="14" height="12" x="2" y="6" rx="2" ry="2"></rect>
              </svg>
              View Live Feed
            </button>
          </div>
        `, { autoPan: false, className: 'dark-popup' });
      
      featureMarkersRef.current.push(marker);
    });
  }, [mapInstanceRef.current, window.L, showFeatures, locations]);





  return (
    <div className="flex flex-col h-full bg-[#0f172a] border-2 border-white/5 border-l-0 overflow-hidden relative">
      <div className="bg-[#0a0f1e]/80 backdrop-blur-2xl px-8 py-7 border-b border-white/5 z-10 shadow-lg">
        <div className="flex justify-between items-center gap-6 flex-wrap">
          <div className="flex-1 min-w-80">
            <h2 className="text-3xl font-black text-white mt-2 mb-2 tracking-tight">Explore Baguio City</h2>
            <p className="m-0 p-0 bg-transparent text-slate-400 text-base leading-relaxed font-medium">
              Click the <span className="text-indigo-400">glowing markers</span> to discover featured destinations in Baguio City.
            </p>
          </div>
        </div>
      </div>
      

      <div 
        ref={mapRef} 
        className="flex-1 min-h-96 bg-[#0f172a] overflow-hidden"
        style={{ height: '100%', width: '100%', borderRadius: '0px', cursor: 'pointer' }}
      >
        {!mapLoaded && (
          <div className="flex items-center justify-center h-full bg-[#0f172a] text-slate-500 text-base font-semibold uppercase tracking-widest">
            <p className="animate-pulse">🗺️ Loading interactive map of Baguio City...</p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .dark-popup .leaflet-popup-content-wrapper {
          background: #1e293b !important;
          color: white !important;
          border-radius: 16px !important;
          padding: 0 !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
        }
        .dark-popup .leaflet-popup-content {
          margin: 0 !important;
          line-height: inherit !important;
        }
        .dark-popup .leaflet-popup-tip {
          background: #1e293b !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
        }
        .dark-popup .leaflet-popup-close-button {
          color: #94a3b8 !important;
          padding: 12px 12px 0 0 !important;
        }
        .dark-popup .leaflet-popup-close-button:hover {
          color: white !important;
        }
      `}} />
    </div>
  );
};

export default MobilePhilippinesMap;