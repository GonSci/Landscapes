import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './Redirection.css';
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
    <div className="hidden-gems-section" ref={ref}>
      <h2 className="hidden-gems-title">Hidden Gems Nearby</h2>
      
      <div className="hidden-gems-content">
        {/* Left Side - CSRNET Density Mapping */}
        <CSRNet />

        {/* Right Side - Map and Location Cards */}
        <div className="map-locations-container">
          {/* Leaflet Map */}
          <div className="leaflet-map-container">
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
              style={{ height: '100%', width: '100%', borderRadius: '12px' }}
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
                    <div className="map-popup">
                      <h4>{location.name}</h4>
                      <p className="popup-type">{location.type}</p>
                      <div className="popup-crowd">
                        <span 
                          className="popup-crowd-badge"
                          style={{ 
                            backgroundColor: location.currentCrowdLevel === 'low' ? '#10b981' : 
                                           location.currentCrowdLevel === 'moderate' ? '#f59e0b' : '#ef4444'
                          }}
                        >
                          {location.currentCrowdLevel.toUpperCase()}
                        </span>
                        <span className="popup-people">{location.detectedPeople} people</span>
                      </div>
                      <div className="popup-distance">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="popup-distance-icon">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                        <span>{location.distance} km away</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Scrollable Location Cards */}
          <div className="location-cards-container">
            <div className="location-cards-scroll">
              {baguioLocations
                .filter(loc => loc.currentCrowdLevel === 'low')
                .map((location) => (
                  <div 
                    key={location.id} 
                    className={`location-card ${hoveredLocation === location.id ? 'hovered' : ''}`}
                    onMouseEnter={() => handleLocationHover(location.id)}
                    onMouseLeave={handleLocationHoverOut}
                  >
                    <div className="location-card-image">
                      <img 
                        src={`/assets/featured_images/${location.id}.jpg`} 
                        alt={location.name}
                        onError={(e) => {
                          e.target.src = '/assets/images/placeholder.jpg';
                        }}
                      />
                      <div 
                        className="location-card-badge"
                        style={{ backgroundColor: '#10b981' }}
                      >
                        Low Crowd
                      </div>
                    </div>
                    <div className="location-card-content">
                      <h4 className="location-card-name">{location.name}</h4>
                      <p className="location-card-description">{location.description}</p>
                      <div className="location-card-stats">
                        <div className="stat-item">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="stat-icon">
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                          </svg>
                          <span>{location.detectedPeople} people</span>
                        </div>
                        <div className="stat-item">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="stat-icon">
                            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                          </svg>
                          <span>~{location.averageWaitTime} min wait</span>
                        </div>
                      </div>
                      <div className="location-card-distance">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="distance-icon">
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
