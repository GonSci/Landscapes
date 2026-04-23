import React, { useEffect, useRef, useState } from 'react';
import philippinesData from '../../data/philippines_locations.json';

const PhilippinesMap = ({ onLocationClick, userProfile, focusLocation, isSidebarOpen, onViewLiveFeed }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const featureMarkersRef = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showFeatures, setShowFeatures] = useState(true);

  // Invalidate map size when sidebar toggles
  useEffect(() => {
    if (mapInstanceRef.current && window.L) {
      const timer = setTimeout(() => {
        mapInstanceRef.current.invalidateSize({ animate: true });
      }, 300); // 300ms matches the CSS transition duration
      return () => clearTimeout(timer);
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
    const map = window.L.map(mapRef.current, { zoomControl: false }).setView([16.4023, 120.5960], 13);
    window.L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Add OpenStreetMap tiles
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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
          const locationName = btn.getAttribute('data-location');
          if (onViewLiveFeed) onViewLiveFeed(locationName);
        };
      }
    });

    mapInstanceRef.current = map;

    // Removed: Click handler for map exploration - users can only click on markers

    // Removed standard Baguio location pins as per user request

  }, [mapLoaded, onLocationClick]);

  // Focus on a specific location when requested
  useEffect(() => {
    if (focusLocation && mapInstanceRef.current && window.L && featureMarkersRef.current) {
      // Find the marker that matches the coordinates
      const targetMarker = featureMarkersRef.current.find(
        m => m.getLatLng().lat === focusLocation.lat && m.getLatLng().lng === focusLocation.lng
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

  // Add feature markers for Baguio activities, places, and food only
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    
    // Clear existing feature markers
    featureMarkersRef.current.forEach(marker => marker.remove());
    featureMarkersRef.current = [];
    
    // If features are hidden, don't add any markers
    if (!showFeatures) return;
    
    // Featured locations with their categories - Baguio only
    const featuredLocations = [
      // Baguio features
      { lat: 16.4120, lng: 120.5930, type: 'place', name: 'Burnham Park', city: 'Baguio', icon: '🌳' },
      { lat: 16.4050, lng: 120.5900, type: 'place', name: 'Session Road', city: 'Baguio', icon: '🛍️' },
      { lat: 16.4109, lng: 120.5926, type: 'place', name: 'Baguio Cathedral', city: 'Baguio', icon: '⛪' },
      { lat: 16.4170, lng: 120.5970, type: 'place', name: 'The Mansion', city: 'Baguio', icon: '🏛️' },
      { lat: 16.4185, lng: 120.5935, type: 'place', name: 'Wright Park', city: 'Baguio', icon: '🐴' },
      { lat: 16.3980, lng: 120.5600, type: 'activity', name: 'Strawberry Farm', city: 'Baguio', icon: '🍓' },
      { lat: 16.3895, lng: 120.6145, type: 'activity', name: 'Mines View Park', city: 'Baguio', icon: '🔭' },
    ];
    
    // Add markers for each featured location
    featuredLocations.forEach((feature) => {
      // Choose color based on type
      let bgColor, label;
      if (feature.type === 'activity') {
        bgColor = '#3b82f6'; // Blue
        label = 'Activity';
      } else if (feature.type === 'place') {
        bgColor = '#8b5cf6'; // Purple
        label = 'Place';
      } else {
        bgColor = '#f59e0b'; // Orange
        label = 'Food';
      }
      
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
            <svg viewBox="0 0 24 24" width="36" height="36" style="filter: drop-shadow(0px 3px 2px rgba(0,0,0,0.3));">
              <path fill="#ea4335" d="M12 0c-4.198 0-8 3.403-8 7.602 0 4.198 3.469 9.21 8 16.398 4.531-7.188 8-12.2 8-16.398 0-4.199-3.801-7.602-8-7.602zm0 11c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z"/>
            </svg>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });
      
      const marker = window.L.marker([feature.lat, feature.lng], { icon: featureIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="text-align: center; min-width: 160px;">
            <div style="
              display: inline-block;
              background: ${bgColor};
              color: white;
              padding: 4px 10px;
              border-radius: 12px;
              font-size: 0.7rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 8px;
            ">${label}</div>
            <h4 style="margin: 0 0 4px 0; color: #1f2937; font-size: 0.95rem;">${feature.name}</h4>
            <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 0.8rem;">📍 ${feature.city}</p>
            <button class="live-feed-btn" data-location="${feature.name}" style="
              display: flex; align-items: center; justify-content: center; gap: 6px;
              background: #667eea; color: white; border: none; padding: 8px 12px; border-radius: 8px; 
              font-size: 0.8rem; font-weight: 600; cursor: pointer; width: 100%; transition: all 0.3s ease;
              box-shadow: 0 4px 12px rgba(102,126,234,0.3);
            " onmouseover="this.style.background='#764ba2'; this.style.boxShadow='0 6px 16px rgba(118,75,162,0.4)';" onmouseout="this.style.background='#667eea'; this.style.boxShadow='0 4px 12px rgba(102,126,234,0.3)';">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="m22 8-6 4 6 4V8Z"></path>
                <rect width="14" height="12" x="2" y="6" rx="2" ry="2"></rect>
              </svg>
              View Live Feed
            </button>
          </div>
        `, { autoPan: false });
      
      featureMarkersRef.current.push(marker);
    });
  }, [mapInstanceRef.current, window.L, showFeatures]);



  // Update marker colors when user profile changes
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    philippinesData.locations.forEach((location) => {
      const marker = markersRef.current[location.id];
      if (marker) {
        const color = getLocationColor(location.id);
        
        const icon = window.L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="
              background-color: ${color};
              width: 30px;
              height: 30px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 5px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              cursor: pointer;
            ">
              📍
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        
        marker.setIcon(icon);
      }
    });
  }, [userProfile]);

  const getLocationColor = (locationId) => {
    if (userProfile.beenThere && userProfile.beenThere.includes(locationId)) {
      return '#10b981'; // Green - Been there
    } else if (userProfile.wantToGo && userProfile.wantToGo.includes(locationId)) {
      return '#f59e0b'; // Orange - Want to go
    }
    return '#3b82f6'; // Blue - Default
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 border-2 border-slate-200 border-l-0 overflow-hidden relative">
      <div className="bg-white px-8 py-7 border-b-2 border-slate-200">
        <div className="flex justify-between items-center gap-6 flex-wrap">
          <div className="flex-1 min-w-80">
            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Explore Baguio City</h2>
            <p className="m-0 p-0 bg-transparent text-slate-500 text-base leading-relaxed font-medium">
              Click the colored markers to discover featured destinations in Baguio City - the Summer Capital of the Philippines!
            </p>
          </div>
        </div>
      </div>
      

      <div 
        ref={mapRef} 
        className="flex-1 min-h-96 bg-white overflow-hidden"
        style={{ height: '100%', width: '100%', borderRadius: '0px', cursor: 'pointer' }}
      >
        {!mapLoaded && (
          <div className="flex items-center justify-center h-full bg-white text-slate-400 text-base font-semibold uppercase tracking-widest">
            <p>🗺️ Loading interactive map of Baguio City...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhilippinesMap;