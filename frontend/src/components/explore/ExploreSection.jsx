import React, { useState } from 'react';
import baguioData from '../../data/baguio_locations.json';

const ExploreSection = ({ onLocationClick }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCrowdLevel, setSelectedCrowdLevel] = useState('All');
  
  const categories = [
    { id: 'all', name: 'All Places'},
    { id: 'park', name: 'Parks'},
    { id: 'viewpoint', name: 'Viewpoints' },
    { id: 'street', name: 'Streets'},
    { id: 'mall', name: 'Shopping Malls'},
    { id: 'religious', name: 'Religious'},
    { id: 'farm', name: 'Farms'},
    { id: 'historical', name: 'Historical' }
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



  return (
    <div className="min-h-[calc(100vh-100px)] bg-white px-3 py-5 text-slate-900 sm:px-4 md:px-5 md:py-8 lg:px-6 lg:py-10">
      {/* Header */}
      <div className="relative z-10 mb-6 text-center md:mb-10">
        <h2 className="mb-3 inline-block animate-fadeInDown bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text pb-1 text-3xl font-extrabold leading-[1.1] tracking-tight text-transparent sm:text-4xl lg:text-[42px]">
          Explore Baguio City
        </h2>
        <p className="mx-auto max-w-2xl animate-fadeInUp text-sm leading-7 text-slate-600 sm:text-base lg:text-lg">
          Discover Baguio's top attractions with real-time crowd monitoring - from scenic parks to historical sites
        </p>
      </div>

      {/* Category Tabs */}
      <div className="relative z-10 mb-6 flex flex-wrap justify-center gap-2 animate-fadeIn md:mb-10 md:gap-3">
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border-2 px-4 py-2 text-sm font-semibold transition-all duration-300 sm:px-5 sm:py-3 sm:text-base ${
              selectedCategory === cat.id
                ? 'border-transparent bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-[0_4px_16px_rgba(102,126,234,0.3)]'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-100 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]'
            }`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span className="text-sm sm:text-[14px]">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Crowd Level Filter */}
      <div className="mb-4 flex items-center gap-2 text-sm text-[#4b4b7a] sm:mb-5">
        <label htmlFor="crowdlevel" className="font-medium text-slate-600">
          Filter by Crowd Level:
        </label>
        <select
          id="crowdlevel"
          value={selectedCrowdLevel}
          onChange={(e) => setSelectedCrowdLevel(e.target.value)}
          className="cursor-pointer rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-700 outline-none transition-all duration-300 hover:border-[#7a5fff] hover:shadow-[0_2px_6px_rgba(122,95,255,0.25)] focus:border-[#5a3fff] focus:bg-white focus:shadow-[0_0_0_3px_rgba(122,95,255,0.2)]"
        >
          {crowdLevelOptions.map(level => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>
      </div>

      {/* Cards Grid */}
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 animate-fadeIn sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
        {filteredData.map(location => (
          <div
            key={location.id}
            className="group cursor-pointer overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-all duration-300 animate-slideInUp hover:-translate-y-2 hover:shadow-[0_12px_32px_rgba(0,0,0,0.3)]"
            onClick={(e) => {
              e.stopPropagation();
              onLocationClick(location);
            }}
          >
            <div className="relative h-44 overflow-hidden sm:h-48 lg:h-[220px]">
              <img
                src={location.image}
                alt={location.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                onError={(e) => {
                  e.currentTarget.src = '/assets/images/philippines-placeholder.jpg';
                }}
              />
            </div>

            <div className="p-4 text-slate-900 sm:p-5">
              <div className="mb-2 flex items-start justify-between gap-3">
                <h3 className="text-xl font-bold text-slate-900 sm:text-[22px]">{location.name}</h3>
                {/* Removed visited/wishlist badges */}
              </div>

              <p className="mb-3 text-sm font-semibold text-[#667eea] sm:text-[14px]">📍 {location.region}</p>
              <p className="mb-3 overflow-hidden text-sm leading-6 text-slate-600 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
                {location.description}
              </p>

              <div className="mb-3 text-sm text-slate-700">
                <strong className="mb-1 block text-[#667eea]">Highlights:</strong>
                <ul className="list-disc space-y-1 pl-5 marker:text-[#667eea]">
                  {location.highlights.slice(0, 3).map((highlight, idx) => (
                    <li key={idx}>{highlight}</li>
                  ))}
                </ul>
              </div>

              {/* Crowd Info */}
              <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                {location.detectedPeople}/{location.capacity} people • {location.ratingLabel}
              </div>

              <div className="mt-4 border-t border-slate-200 pt-4">
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                  {location.bestTime}
                </span>
                <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-2.5">
                  <button
                    type="button"
                    className="min-w-[100px] flex-1 rounded-xl border border-transparent bg-gradient-to-r from-[#667eea] to-[#764ba2] px-4 py-3 text-sm sm:text-[11px] font-bold uppercase tracking-[0.5px] text-white shadow-[0_4px_12px_rgba(102,126,234,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(102,126,234,0.4)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLocationClick(location);
                    }}
                  >
                    View Details
                  </button>
                  {/* Removed Been and Want buttons */}
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
