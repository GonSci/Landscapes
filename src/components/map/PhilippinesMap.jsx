import React, { useEffect, useRef, useState } from 'react';
import './PhilippinesMap.css';
import philippinesData from '../../data/philippines_locations.json';

const PhilippinesMap = ({ onLocationClick, userProfile, focusLocation }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const featureMarkersRef = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showFeatures, setShowFeatures] = useState(true);

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
    const map = window.L.map(mapRef.current).setView([16.4023, 120.5960], 13);

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

    mapInstanceRef.current = map;

    // Removed: Click handler for map exploration - users can only click on markers

    // Filter to only show Baguio locations
    const baguioLocations = philippinesData.locations.filter(location => 
      location.region === 'Cordillera Administrative Region' || 
      location.name.toLowerCase().includes('baguio')
    );

    // Add markers for Baguio locations only
    baguioLocations.forEach((location) => {
      const color = getLocationColor(location.id);
      
      // Create custom icon
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
        .addTo(map)
        .bindPopup(`
          <div style="text-align: center;">
            <h3 style="margin: 0 0 5px 0; color: #1f2937;">⭐ ${location.name}</h3>
            <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">${location.region}</p>
          </div>
        `)
        .on('click', () => {
          onLocationClick(location);
        });

      markersRef.current[location.id] = marker;
    });

  }, [mapLoaded, onLocationClick]);

  // Focus on a specific location when requested
  useEffect(() => {
    if (focusLocation && mapInstanceRef.current && window.L) {
      // Clear existing feature markers
      featureMarkersRef.current.forEach(marker => marker.remove());
      featureMarkersRef.current = [];
      
      // Zoom to location
      mapInstanceRef.current.setView([focusLocation.lat, focusLocation.lng], 13, {
        animate: true,
        duration: 1
      });
      
      // Add a pulsing marker for the focused location
      const focusIcon = window.L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background-color: #ef4444;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: 4px solid white;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 26px;
            cursor: pointer;
            animation: pulseGlow 2s ease-in-out infinite;
          ">
            📍
          </div>
          <style>
            @keyframes pulseGlow {
              0%, 100% { 
                transform: scale(1);
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
              }
              50% { 
                transform: scale(1.15);
                box-shadow: 0 8px 24px rgba(239, 68, 68, 0.8);
              }
            }
          </style>
        `,
        iconSize: [50, 50],
        iconAnchor: [25, 25],
      });
      
      const focusMarker = window.L.marker([focusLocation.lat, focusLocation.lng], { icon: focusIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="text-align: center; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 1.1rem;">📍 ${focusLocation.name}</h3>
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 0.9rem;">${focusLocation.region}</p>
            <p style="margin: 0; color: #ef4444; font-size: 0.85rem; font-weight: 600;">📌 You are here!</p>
          </div>
        `)
        .openPopup();
      
      featureMarkersRef.current.push(focusMarker);
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
      { lat: 16.4210, lng: 120.5825, type: 'place', name: 'Camp John Hay', city: 'Baguio', icon: '🏕️' },
      { lat: 16.3980, lng: 120.5600, type: 'activity', name: 'Strawberry Farm', city: 'Baguio', icon: '🍓' },
      { lat: 16.4155, lng: 120.5715, type: 'activity', name: 'Tree Top Adventure', city: 'Baguio', icon: '🌲' },
      { lat: 16.3895, lng: 120.6145, type: 'activity', name: 'Mines View Park', city: 'Baguio', icon: '🔭' },
      { lat: 16.4023, lng: 120.5960, type: 'food', name: 'Good Shepherd', city: 'Baguio', icon: '🫙' },
      { lat: 16.4050, lng: 120.5920, type: 'food', name: 'Hill Station', city: 'Baguio', icon: '☕' },
      { lat: 16.4090, lng: 120.5940, type: 'food', name: 'Oh My Gulay!', city: 'Baguio', icon: '🥗' },
      { lat: 16.4060, lng: 120.5905, type: 'food', name: 'Café by the Ruins', city: 'Baguio', icon: '🍽️' },
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
            background: ${bgColor};
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 3px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.2s ease;
          "
          onmouseover="this.style.transform='scale(1.2)'"
          onmouseout="this.style.transform='scale(1)'">
            ${feature.icon}
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
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
            <h4 style="margin: 0 0 4px 0; color: #1f2937; font-size: 0.95rem;">${feature.icon} ${feature.name}</h4>
            <p style="margin: 0; color: #6b7280; font-size: 0.8rem;">📍 ${feature.city}</p>
          </div>
        `);
      
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
    <div className="map-container">
      <div className="map-header">
        <div className="map-header-content">
          <div className="map-title-section">
            <h2 className="map-title">🗺️ Explore Baguio City</h2>
            <p className="map-instruction">
              <strong>💡 Tip:</strong> Click the colored markers to discover featured destinations in Baguio City - the Summer Capital of the Philippines!
            </p>
          </div>
        </div>
      </div>
      
      <div className="map-legend">
        <div className="legend-section">
          <h4 className="legend-heading">Baguio Locations</h4>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#3b82f6' }}>📍</span>
              <span>Unvisited</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#10b981' }}>📍</span>
              <span>Been There</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#f59e0b' }}>📍</span>
              <span>Want to Go</span>
            </div>
          </div>
        </div>
        
        {showFeatures && (
          <div className="legend-section">
            <h4 className="legend-heading">Featured</h4>
            <div className="legend-items">
              <div className="legend-item">
                <span className="legend-color" style={{ background: '#3b82f6' }}>🎯</span>
                <span>Activities</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ background: '#8b5cf6' }}>🏛</span>
                <span>Places</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ background: '#f59e0b' }}>🍴</span>
                <span>Food</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div 
        ref={mapRef} 
        className="leaflet-map"
        style={{ height: '600px', width: '100%', borderRadius: '8px', cursor: 'pointer' }}
      >
        {!mapLoaded && (
          <div className="map-loading">
            <p>🗺️ Loading interactive map of Baguio City...</p>
          </div>
        )}
      </div>

      {/* Toggle Features Button - Positioned over map */}
      <button 
        className={`toggle-features-btn-map ${showFeatures ? 'active' : ''}`}
        onClick={() => setShowFeatures(!showFeatures)}
        title={showFeatures ? 'Hide featured places' : 'Show featured places'}
      >
        {showFeatures ? '👁️ Hide Featured' : '👁️‍🗨️ Show Featured'}
      </button>
    </div>
  );
};

export default PhilippinesMap;