import React, { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ChevronLeft, ChevronRight, MapPin, ArrowRight } from 'lucide-react';
import locationsData from '../../data/philippines_locations.json';
import MapPreview from '../map/MapPreview';
import './FeaturedDestinations.css';

const ITEMS_PER_PAGE = 6;

// Location tags for engagement
const locationTags = {
  'manila': { text: 'Cultural Hub', color: 'blue' },
  'cebu': { text: 'Crowd Favorite', color: 'gold' },
  'davao': { text: 'Hidden Gem', color: 'green' },
  'boracay': { text: 'World Famous', color: 'gold' },
  'palawan': { text: "Traveler's Choice", color: 'red' },
  'baguio': { text: 'Mountain Escape', color: 'green' },
  'vigan': { text: 'UNESCO Site', color: 'blue' },
  'siargao': { text: 'Surfer Paradise', color: 'blue' },
  'bohol': { text: 'Nature Lover', color: 'green' },
  'mayon': { text: 'Instagram Favorite', color: 'red' }
};

const FeaturedDestinations = ({ onNavigate }) => {
  const [hoveredLocation, setHoveredLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const totalPages = Math.ceil(locationsData.locations.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentLocations = locationsData.locations.slice(startIndex, endIndex);

  const handleLocationHover = (locationId) => {
    setHoveredLocation(locationId);
  };

  const handleLocationClick = (location) => {
    setSelectedLocation(location);
  };

  const handleMapClick = () => {
    onNavigate('map');
  };

  const goToPage = (page) => {
    setCurrentPage(page);
    if (ref.current) {
      const yOffset = -100;
      const y = ref.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <section ref={ref} className="featured-destinations">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
        className="section-header-klook"
      >
        <h2 className="section-title-klook">Featured Destinations</h2>
        <p className="section-subtitle-klook">
          Every destination comes with smart timing insights — <span className="subtle-highlight">know exactly when to go</span> to avoid crowds
          and enjoy your visit <span className="subtle-highlight">based on real crowd patterns.</span>
</p>
      </motion.div>

      <div className="destinations-container">
        {/* Listings Column */}
        <div className="listings-column">
          <div className="listings-grid">
            {currentLocations.map((location, index) => (
              <motion.div
                key={location.id}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                whileHover={{ 
                  y: -8, 
                  transition: { duration: 0.3 }
                }}
                className={`listing-card ${hoveredLocation === location.id ? 'hovered' : ''} ${selectedLocation?.id === location.id ? 'selected' : ''}`}
                onMouseEnter={() => handleLocationHover(location.id)}
                onMouseLeave={() => handleLocationHover(null)}
                onClick={() => handleLocationClick(location)}
              >
                <div className="listing-image">
                  <img 
                    src={location.image} 
                    alt={location.name}
                    className="listing-img"
                  />
                  <div className="listing-overlay"></div>
                  {locationTags[location.id] && (
                    <div className={`listing-tag tag-${locationTags[location.id].color}`}>
                      {locationTags[location.id].text}
                    </div>
                  )}
                </div>

                <div className="listing-info">
                  <h3 className="listing-name">{location.name}</h3>
                  <div className="listing-location">
                    <MapPin size={12} />
                    {location.region}
                  </div>
                  <p className="listing-desc">
                    {location.description.length > 80 
                      ? `${location.description.substring(0, 80)}...` 
                      : location.description}
                  </p>
                  <button 
                    className="listing-view-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open('#explore', '_blank');
                    }}
                  >
                    View Details
                    <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-container">
              <button 
                className="pagination-btn"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={20} />
                Previous
              </button>

              <div className="pagination-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button 
                className="pagination-btn"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Map Preview */}
        <MapPreview
          locations={locationsData.locations}
          hoveredLocation={hoveredLocation}
          selectedLocation={selectedLocation}
          onMapClick={handleMapClick}
          isInView={isInView}
        />
      </div>
    </section>
  );
};

export default FeaturedDestinations;
