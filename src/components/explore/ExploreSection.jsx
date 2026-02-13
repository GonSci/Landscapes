import React, { useState } from 'react';
import './ExploreSection.css';
import baguioData from '../../data/baguio_locations.json';

const ExploreSection = ({ onLocationClick, onMarkLocation, userProfile }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCrowdLevel, setSelectedCrowdLevel] = useState('All');
  
  const categories = [
    { id: 'all', name: 'All Places', icon: '🌟' },
    { id: 'park', name: 'Parks', icon: '🌳' },
    { id: 'viewpoint', name: 'Viewpoints', icon: '🏔️' },
    { id: 'street', name: 'Streets', icon: '🛣️' },
    { id: 'mall', name: 'Shopping', icon: '🛍️' },
    { id: 'religious', name: 'Religious', icon: '⛪' },
    { id: 'farm', name: 'Farms', icon: '🍓' },
    { id: 'historical', name: 'Historical', icon: '🏛️' }
  ];

  const crowdLevelOptions = [
    'All',
    'Low Crowd',
    'Moderate Crowd',
    'High Crowd'
  ];

  // Transform Baguio locations data
  const transformBaguioLocations = () => {
    return baguioData.locations.map(loc => {
      // Convert crowd level to readable format
      const crowdLevel = loc.currentCrowdLevel === 'high' ? 'High Crowd' : 
                        loc.currentCrowdLevel === 'moderate' ? 'Moderate Crowd' : 'Low Crowd';
      
      // Create highlights from facilities and other data
      const highlights = [
        ...loc.facilities,
        `Capacity: ${loc.capacity} people`,
        `Current visitors: ${loc.detectedPeople}`,
        `Distance: ${loc.distance} km from city center`
      ];

      return {
        id: loc.id,
        name: loc.name,
        region: loc.region,
        lat: loc.coordinates.lat,
        lng: loc.coordinates.lng,
        image: loc.image,
        description: loc.description,
        highlights: highlights,
        bestTime: `Peak Hours: ${loc.peakHours.join(', ')}`,
        category: loc.type,
        rating: loc.crowdDensity * 5,
        ratingLabel: crowdLevel,
        discoveryLevel: crowdLevel,
        currentCrowdLevel: loc.currentCrowdLevel,
        detectedPeople: loc.detectedPeople,
        capacity: loc.capacity,
        crowdDensity: loc.crowdDensity,
        averageWaitTime: loc.averageWaitTime
      };
    });
  };

  const baguioLocations = transformBaguioLocations();

  // Filter by category
  const currentData = selectedCategory === 'all' 
    ? baguioLocations 
    : baguioLocations.filter(loc => loc.category === selectedCategory);

  const filteredData = currentData
    .filter(loc =>
      selectedCrowdLevel === 'All' ? true : loc.ratingLabel === selectedCrowdLevel
    )
    .sort((a, b) => a.detectedPeople - b.detectedPeople); // Sort by crowd (low to high)

  const isVisited = (locationId) => {
    return userProfile?.beenThere?.includes(locationId) || false;
  };

  const isWishlist = (locationId) => {
    return userProfile?.wantToGo?.includes(locationId) || false;
  };

  return (
    <div className="explore-section">
      {/* Header */}
      <div className="explore-header">
        <h2 className="explore-title">🏔️ Explore Baguio City</h2>
        <p className="explore-subtitle">
          Discover Baguio's top attractions with real-time crowd monitoring - from scenic parks to historical sites
        </p>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span className="category-icon">{cat.icon}</span>
            <span className="category-name">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Crowd Level Filter */}
      <div className="discovery-filter">
        <label htmlFor="crowdlevel">Filter by Crowd Level:</label>
        <select
          id="crowdlevel"
          value={selectedCrowdLevel}
          onChange={(e) => setSelectedCrowdLevel(e.target.value)}
        >
          {crowdLevelOptions.map(level => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>
      </div>

      {/* Cards Grid */}
      <div className="explore-cards-grid">
        {filteredData.map(location => (
          <div
            key={location.id}
            className={`explore-card ${isVisited(location.id) ? 'visited' : ''} ${isWishlist(location.id) ? 'wishlist' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onLocationClick(location);
            }}
          >
            <div className="card-image-wrapper">
              <img
                src={location.image}
                alt={location.name}
                className="card-image"
                onError={(e) => {
                  e.target.src = '/assets/images/philippines-placeholder.jpg';
                }}
              />
            </div>

            <div className="card-content">
              <div className="card-header-with-badges">
                <h3 className="card-title">{location.name}</h3>
                <div className="card-badge">
                  {isVisited(location.id) && <span className="badge visited-badge">✓ Visited</span>}
                  {isWishlist(location.id) && <span className="badge wishlist-badge">♡ Wishlist</span>}
                </div>
              </div>

              <p className="card-region">📍 {location.region}</p>
              <p className="card-description">{location.description}</p>

              <div className="card-highlights">
                <strong>Highlights:</strong>
                <ul>
                  {location.highlights.slice(0, 3).map((highlight, idx) => (
                    <li key={idx}>{highlight}</li>
                  ))}
                </ul>
              </div>

              {/* Crowd Info */}
              <div className="card-discovery-label">
                👥 {location.detectedPeople}/{location.capacity} people • {location.ratingLabel}
              </div>

              <div className="card-footer">
                <span className="best-time">
                  <span className="time-icon">📅</span>
                  {location.bestTime}
                </span>
                <div className="card-actions">
                  <button
                    className="action-btn view-details-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLocationClick(location);
                    }}
                  >
                    View Details
                  </button>
                  <button
                    className="action-btn mark-been-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkLocation(location, 'been');
                    }}
                  >
                    ✓ Been
                  </button>
                  <button
                    className="action-btn mark-want-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkLocation(location, 'want');
                    }}
                  >
                    ★ Want
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExploreSection;
