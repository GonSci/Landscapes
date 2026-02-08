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

    // Initialize map centered on the Philippines
    const map = window.L.map(mapRef.current).setView([12.8797, 121.7740], 6);

    // Add OpenStreetMap tiles
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Add click handler for map exploration
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`
        );
        const data = await response.json();
        
        console.log('Full Nominatim data:', data);
        
        const address = data.address || {};
        
        const locationName = data.name || 
                            address.tourism ||
                            address.village || 
                            address.town || 
                            address.city || 
                            address.municipality ||
                            address.suburb ||
                            address.neighbourhood ||
                            address.hamlet ||
                            address.county ||
                            address.state_district ||
                            data.display_name?.split(',')[0] ||
                            'Discovered Location';
        
        const region = address.state || 
                      address.province || 
                      address.region ||
                      'Philippines';
        
        let description = `You've discovered ${locationName}`;
        if (address.city && address.city !== locationName) {
          description += ` in ${address.city}`;
        }
        if (region !== 'Philippines') {
          description += `, ${region}`;
        }
        description += '! ';
        
        if (address.tourism) {
          description += `This is a ${address.tourism} destination. `;
        } else if (address.amenity) {
          description += `This area features ${address.amenity} facilities. `;
        } else if (data.type === 'city' || data.type === 'town') {
          description += `This is a ${data.type} area. `;
        }
        
        description += `Click 'Ask AI' to discover local attractions, culture, food, and travel tips for this specific location!`;
        
        const highlights = [];
        
        if (address.tourism) highlights.push(`${address.tourism} destination`);
        if (address.amenity) highlights.push(`${address.amenity} available`);
        if (address.city && address.city !== locationName) highlights.push(`Part of ${address.city}`);
        if (region && region !== 'Philippines') highlights.push(`${region} region`);
        
        highlights.push('Local culture and traditions');
        highlights.push('Nearby attractions');
        highlights.push('Regional cuisine and specialties');
        highlights.push('Best time to visit');
        highlights.push('Travel tips and recommendations');
        
        if (data.class === 'natural' || address.natural) {
          highlights.push('Natural scenery and beauty');
        }
        
        const clickedLocation = {
          id: `custom-${Date.now()}`,
          name: locationName,
          region: region,
          lat: lat,
          lng: lng,
          description: description,
          highlights: highlights.slice(0, 6),
          image: '/assets/images/philippines-placeholder.jpg',
          isCustom: true,
          fullAddress: data.display_name,
          locationType: data.type || data.class || 'location'
        };
        
        const tempIcon = window.L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="
              background-color: #8b5cf6;
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
              animation: pulse 1s ease-in-out infinite;
            ">
              🔍
            </div>
            <style>
              @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
              }
            </style>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        
        const tempMarker = window.L.marker([lat, lng], { icon: tempIcon })
          .addTo(map)
          .bindPopup(`
            <div style="text-align: center;">
              <h3 style="margin: 0 0 5px 0; color: #1f2937;">📍 ${clickedLocation.name}</h3>
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 0.875rem;">${clickedLocation.region}</p>
              <p style="margin: 0; color: #8b5cf6; font-size: 0.75rem;">Click to explore this area!</p>
            </div>
          `)
          .openPopup();
        
        tempMarker.on('click', () => {
          onLocationClick(clickedLocation);
          setTimeout(() => tempMarker.remove(), 500);
        });
        
        setTimeout(() => {
          if (map.hasLayer(tempMarker)) {
            tempMarker.remove();
          }
        }, 10000);
        
      } catch (error) {
        console.error('Error fetching location info:', error);
        
        const basicLocation = {
          id: `custom-${Date.now()}`,
          name: `Location at ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
          region: 'Philippines',
          lat: lat,
          lng: lng,
          description: `You've clicked on coordinates ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E in the Philippines. While we couldn't fetch specific details, you can still ask the AI about this area to discover nearby attractions, culture, and travel information!`,
          highlights: [
            'Philippine destination',
            'Local culture and heritage',
            'Regional attractions',
            'Travel recommendations',
            'Ask AI for detailed information'
          ],
          image: '/assets/images/philippines-placeholder.jpg',
          isCustom: true,
          fullAddress: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        };
        
        onLocationClick(basicLocation);
      }
    });

    // Add markers for each predefined location
    philippinesData.locations.forEach((location) => {
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

  // Add feature markers for activities, places, and food
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    
    // Clear existing feature markers
    featureMarkersRef.current.forEach(marker => marker.remove());
    featureMarkersRef.current = [];
    
    // If features are hidden, don't add any markers
    if (!showFeatures) return;
    
    // Featured locations with their categories
    const featuredLocations = [
      // Manila features
      { lat: 14.5907, lng: 120.9735, type: 'place', name: 'Intramuros', city: 'Manila', icon: '🏰' },
      { lat: 14.5831, lng: 120.9813, type: 'place', name: 'National Museum', city: 'Manila', icon: '🏛️' },
      { lat: 14.5547, lng: 121.0244, type: 'place', name: 'Ayala Museum', city: 'Manila', icon: '🎨' },
      { lat: 14.5897, lng: 120.9745, type: 'food', name: 'Barbara\'s Restaurant', city: 'Manila', icon: '🍽️' },
      { lat: 14.5350, lng: 121.0500, type: 'activity', name: 'Manila Bay Cruise', city: 'Manila', icon: '⛵' },
      
      // Cebu features
      { lat: 10.2930, lng: 123.9020, type: 'place', name: 'Magellan\'s Cross', city: 'Cebu', icon: '✝️' },
      { lat: 10.2950, lng: 123.9000, type: 'place', name: 'Basilica del Santo Niño', city: 'Cebu', icon: '⛪' },
      { lat: 9.8500, lng: 123.4000, type: 'activity', name: 'Oslob Whale Sharks', city: 'Cebu', icon: '🦈' },
      { lat: 9.9400, lng: 123.3900, type: 'activity', name: 'Kawasan Falls', city: 'Cebu', icon: '🏞️' },
      { lat: 10.3100, lng: 123.8900, type: 'food', name: 'Zubuchon', city: 'Cebu', icon: '🍖' },
      
      // Boracay features
      { lat: 11.9670, lng: 121.9240, type: 'place', name: 'White Beach', city: 'Boracay', icon: '🏖️' },
      { lat: 11.9945, lng: 121.9178, type: 'place', name: 'Puka Beach', city: 'Boracay', icon: '🐚' },
      { lat: 11.9680, lng: 121.9250, type: 'activity', name: 'Sunset Sailing', city: 'Boracay', icon: '⛵' },
      { lat: 11.9665, lng: 121.9260, type: 'food', name: 'Jonah\'s Fruit Shake', city: 'Boracay', icon: '🥤' },
      
      // Palawan features
      { lat: 11.2050, lng: 119.4100, type: 'place', name: 'Big Lagoon', city: 'Palawan', icon: '💧' },
      { lat: 11.2588, lng: 119.4949, type: 'place', name: 'Nacpan Beach', city: 'Palawan', icon: '🏝️' },
      { lat: 10.3670, lng: 119.0830, type: 'activity', name: 'Underground River', city: 'Palawan', icon: '🦇' },
      { lat: 11.1950, lng: 119.4020, type: 'food', name: 'Artcafe', city: 'Palawan', icon: '🍽️' },
      
      // Baguio features
      { lat: 16.4120, lng: 120.5930, type: 'place', name: 'Burnham Park', city: 'Baguio', icon: '🌳' },
      { lat: 16.4050, lng: 120.5900, type: 'place', name: 'Session Road', city: 'Baguio', icon: '🛍️' },
      { lat: 16.3980, lng: 120.5600, type: 'activity', name: 'Strawberry Picking', city: 'Baguio', icon: '🍓' },
      { lat: 16.4023, lng: 120.5960, type: 'food', name: 'Good Shepherd', city: 'Baguio', icon: '🫙' },
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
            <h2 className="map-title">🗺️ Explore the Philippines</h2>
            <p className="map-instruction">
              <strong>💡 Tip:</strong> Click anywhere on the map to discover that area! Or click the colored markers (⭐) for featured destinations.
            </p>
          </div>
        </div>
      </div>
      
      <div className="map-legend">
        <div className="legend-section">
          <h4 className="legend-heading">Main Destinations</h4>
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
            <p>🗺️ Loading interactive map of the Philippines...</p>
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