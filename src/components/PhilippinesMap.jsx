import React, { useEffect, useRef, useState } from 'react';
import './PhilippinesMap.css';
import philippinesData from '../data/philippines_locations.json';

const PhilippinesMap = ({ onLocationClick, userProfile }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const routingControlRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [routingMode, setRoutingMode] = useState(false);
  const [startLocation, setStartLocation] = useState(null);
  const [endLocation, setEndLocation] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    // Load Leaflet CSS
    const leafletCSS = document.createElement('link');
    leafletCSS.rel = 'stylesheet';
    leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    leafletCSS.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    leafletCSS.crossOrigin = '';
    document.head.appendChild(leafletCSS);

    // Load Leaflet Routing Machine CSS
    const routingCSS = document.createElement('link');
    routingCSS.rel = 'stylesheet';
    routingCSS.href = 'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css';
    document.head.appendChild(routingCSS);

    // Load Leaflet JS
    const leafletJS = document.createElement('script');
    leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    leafletJS.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    leafletJS.crossOrigin = '';
    
    leafletJS.onload = () => {
      // Load Leaflet Routing Machine JS after Leaflet loads
      const routingJS = document.createElement('script');
      routingJS.src = 'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js';
      routingJS.onload = () => {
        setMapLoaded(true);
      };
      document.body.appendChild(routingJS);
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

    // Add click handler for map - handles both routing and exploration
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      
      // Skip map clicks in routing mode (use address inputs instead)
      if (routingMode) {
        return;
      }
      
      // Normal exploration mode (existing code)
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
    if (userProfile.beenThere.includes(locationId)) {
      return '#10b981'; // Green - Been there
    } else if (userProfile.wantToGo.includes(locationId)) {
      return '#f59e0b'; // Orange - Want to go
    }
    return '#3b82f6'; // Blue - Default
  };

  // Routing helper functions
  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=ph&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          name: data[0].display_name
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const getCurrentLocation = () => {
    setGettingLocation(true);
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocode to get address
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            const addressName = data.display_name || 'Current Location';
            
            setStartAddress(addressName);
            setStartLocation({ lat: latitude, lng: longitude, name: addressName });
            setGettingLocation(false);
            
            // Add marker for current location
            if (startMarkerRef.current) {
              startMarkerRef.current.remove();
            }
            
            const startIcon = window.L.divIcon({
              className: 'custom-marker',
              html: `
                <div style="
                  background-color: #10b981;
                  width: 40px;
                  height: 40px;
                  border-radius: 50%;
                  border: 3px solid white;
                  box-shadow: 0 3px 8px rgba(0,0,0,0.4);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 20px;
                  cursor: pointer;
                ">
                  📍
                </div>
              `,
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            });
            
            startMarkerRef.current = window.L.marker([latitude, longitude], { icon: startIcon })
              .addTo(mapInstanceRef.current)
              .bindPopup('<div style="text-align: center;"><strong>Your Current Location</strong></div>')
              .openPopup();
            
            // Center map on current location
            mapInstanceRef.current.setView([latitude, longitude], 13);
          } catch (error) {
            console.error('Reverse geocoding error:', error);
            setStartAddress('Current Location');
            setStartLocation({ lat: latitude, lng: longitude, name: 'Current Location' });
            setGettingLocation(false);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your current location. Please enable location services or enter an address manually.');
          setGettingLocation(false);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser. Please enter an address manually.');
      setGettingLocation(false);
    }
  };

  const handleCalculateRoute = async () => {
    if (!startAddress && !useCurrentLocation) {
      alert('Please enter a starting address or use your current location.');
      return;
    }
    
    if (!endAddress) {
      alert('Please enter a destination address.');
      return;
    }
    
    setIsGeocoding(true);
    
    try {
      let startCoords = startLocation;
      
      // Geocode start address if not using current location
      if (!useCurrentLocation || !startLocation) {
        const startResult = await geocodeAddress(startAddress);
        if (!startResult) {
          alert('Could not find the starting location. Please try a different address.');
          setIsGeocoding(false);
          return;
        }
        startCoords = startResult;
        setStartLocation(startResult);
        
        // Add start marker
        if (startMarkerRef.current) {
          startMarkerRef.current.remove();
        }
        
        const startIcon = window.L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="
              background-color: #10b981;
              width: 40px;
              height: 40px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 3px 8px rgba(0,0,0,0.4);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
              cursor: pointer;
            ">
              🚩
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
        
        startMarkerRef.current = window.L.marker([startResult.lat, startResult.lng], { icon: startIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup(`<div style="text-align: center;"><strong>Start</strong><br/>${startResult.name}</div>`);
      }
      
      // Geocode destination address
      const endResult = await geocodeAddress(endAddress);
      if (!endResult) {
        alert('Could not find the destination. Please try a different address.');
        setIsGeocoding(false);
        return;
      }
      
      setEndLocation(endResult);
      
      // Add end marker
      if (endMarkerRef.current) {
        endMarkerRef.current.remove();
      }
      
      const endIcon = window.L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background-color: #ef4444;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 3px 8px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            cursor: pointer;
          ">
            🎯
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      
      endMarkerRef.current = window.L.marker([endResult.lat, endResult.lng], { icon: endIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<div style="text-align: center;"><strong>Destination</strong><br/>${endResult.name}</div>`);
      
      // Calculate route
      calculateRoute(startCoords, endResult);
      
      setIsGeocoding(false);
    } catch (error) {
      console.error('Error calculating route:', error);
      alert('An error occurred while calculating the route. Please try again.');
      setIsGeocoding(false);
    }
  };

  const calculateRoute = (startCoords, endCoords) => {
    if (!startCoords || !endCoords || !window.L || !window.L.Routing) {
      console.error('Start/end location or routing library not loaded');
      return;
    }

    // Remove existing routing control if any
    if (routingControlRef.current) {
      mapInstanceRef.current.removeControl(routingControlRef.current);
    }

    const waypoints = [
      window.L.latLng(startCoords.lat, startCoords.lng),
      window.L.latLng(endCoords.lat, endCoords.lng)
    ];

    const routingControl = window.L.Routing.control({
      waypoints: waypoints,
      routeWhileDragging: false,
      showAlternatives: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
      show: false,
      createMarker: () => null,
      lineOptions: {
        styles: [
          {
            color: '#667eea',
            opacity: 0.8,
            weight: 6
          }
        ]
      },
      router: window.L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1'
      })
    }).addTo(mapInstanceRef.current);

    routingControlRef.current = routingControl;

    // Listen for route found event
    routingControl.on('routesfound', (e) => {
      const routes = e.routes;
      const summary = routes[0].summary;
      
      const distanceKm = (summary.totalDistance / 1000).toFixed(2);
      const totalMinutes = Math.round(summary.totalTime / 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      let timeString = '';
      if (hours > 0) {
        timeString = `${hours} hour${hours > 1 ? 's' : ''}`;
        if (minutes > 0) {
          timeString += ` ${minutes} min`;
        }
      } else {
        timeString = `${minutes} minutes`;
      }
      
      setRouteInfo({
        distance: distanceKm,
        duration: timeString,
        totalMinutes: totalMinutes
      });
    });

    routingControl.on('routingerror', (e) => {
      console.error('Routing error:', e);
      alert('Unable to calculate route. Please try different locations.');
    });
  };

  const toggleRoutingMode = () => {
    const newMode = !routingMode;
    setRoutingMode(newMode);
    
    if (!newMode) {
      // Exiting routing mode - clear everything
      clearRoute();
    }
  };

  const clearRoute = () => {
    // Remove routing control
    if (routingControlRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }
    
    // Remove markers
    if (startMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(startMarkerRef.current);
      startMarkerRef.current = null;
    }
    
    if (endMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(endMarkerRef.current);
      endMarkerRef.current = null;
    }
    
    // Reset state
    setStartLocation(null);
    setEndLocation(null);
    setRouteInfo(null);
    setUseCurrentLocation(false);
    setStartAddress('');
    setEndAddress('');
  };

  return (
    <div className="map-container">
      {/* Routing Control Panel */}
      <div className="routing-panel">
        <button 
          className={`routing-toggle-btn ${routingMode ? 'active' : ''}`}
          onClick={toggleRoutingMode}
        >
          {routingMode ? '🗺️ Exit Routing' : '🧭 Get Directions'}
        </button>
        
        {routingMode && (
          <div className="routing-controls">
            <div className="routing-instructions">
              <h4>📍 Plan Your Route</h4>
              
              <div className="address-inputs">
                <div className="input-group">
                  <label htmlFor="start-address">🚩 Starting Point</label>
                  <div className="input-with-button">
                    <input
                      id="start-address"
                      type="text"
                      placeholder="Enter starting address..."
                      value={startAddress}
                      onChange={(e) => setStartAddress(e.target.value)}
                      disabled={useCurrentLocation}
                      className="address-input"
                    />
                    <button
                      onClick={getCurrentLocation}
                      className="gps-btn"
                      disabled={gettingLocation}
                      title="Use current location"
                    >
                      {gettingLocation ? '⏳' : '📱'}
                    </button>
                  </div>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={useCurrentLocation}
                      onChange={(e) => {
                        setUseCurrentLocation(e.target.checked);
                        if (e.target.checked) {
                          getCurrentLocation();
                        } else {
                          setStartAddress('');
                          setStartLocation(null);
                          if (startMarkerRef.current) {
                            startMarkerRef.current.remove();
                            startMarkerRef.current = null;
                          }
                        }
                      }}
                    />
                    Use my current location
                  </label>
                </div>
                
                <div className="input-group">
                  <label htmlFor="end-address">🎯 Destination</label>
                  <input
                    id="end-address"
                    type="text"
                    placeholder="Enter destination address..."
                    value={endAddress}
                    onChange={(e) => setEndAddress(e.target.value)}
                    className="address-input"
                  />
                </div>
                
                <button
                  onClick={handleCalculateRoute}
                  className="calculate-btn"
                  disabled={isGeocoding || (!startAddress && !useCurrentLocation) || !endAddress}
                >
                  {isGeocoding ? '⏳ Calculating...' : '🗺️ Calculate Route'}
                </button>
              </div>
              
              {routeInfo && (
                <div className="route-summary">
                  <div className="route-info-card">
                    <div className="route-stat">
                      <span className="route-icon">📏</span>
                      <div>
                        <div className="route-label">Distance</div>
                        <div className="route-value">{routeInfo.distance} km</div>
                      </div>
                    </div>
                    <div className="route-stat">
                      <span className="route-icon">⏱️</span>
                      <div>
                        <div className="route-label">Est. Travel Time</div>
                        <div className="route-value">{routeInfo.duration}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {(startLocation || endLocation || routeInfo) && (
                <button 
                  onClick={clearRoute} 
                  className="clear-route-btn"
                >
                  🔄 Clear Route
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="map-header">
        <h2 className="map-title">🗺️ Explore the Philippines</h2>
        <p className="map-instruction">
          <strong>💡 Tip:</strong> {routingMode 
            ? 'Enter addresses to calculate your route and travel time!' 
            : 'Click anywhere on the map to discover that area! Or click the colored markers (⭐) for featured destinations.'}
        </p>
      </div>
      
      <div className="map-legend">
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
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#8b5cf6' }}>🔍</span>
          <span>Exploring</span>
        </div>
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
    </div>
  );
};

export default PhilippinesMap;
