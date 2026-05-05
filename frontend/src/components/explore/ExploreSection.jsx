import React, { useState } from 'react';
import { useLiveLocations } from '../../hooks/useLiveLocations';

const ExploreSection = ({ onNavigate, onViewLiveFeed }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCrowdLevel, setSelectedCrowdLevel] = useState('All');
  const [isCrowdDropdownOpen, setIsCrowdDropdownOpen] = useState(false);
  
  const { locations, isLoading, isStale, lastUpdated } = useLiveLocations();

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
    'Sparse Crowd',
    'Low Crowd',
    'Moderate Crowd',
    'High Crowd'
  ];

  // Filter by category
  const currentData = selectedCategory === 'all' 
    ? locations 
    : locations.filter(loc => loc.category && loc.category.toLowerCase() === selectedCategory);

  const filteredData = currentData
    .filter(loc => {
      if (selectedCrowdLevel === 'All') return true;
      const levelString = `${loc.crowdLevel} Crowd`;
      return levelString === selectedCrowdLevel;
    })
    .sort((a, b) => a.detectedPeople - b.detectedPeople); // Sort by crowd (low to high)

  return (
    <div className="min-h-[calc(100vh-100px)] bg-[#0a0f1e] px-3 py-5 text-white sm:px-4 md:px-5 md:py-8 lg:px-6 lg:py-10">
      {/* Header */}
      <div className="relative z-10 mb-8 text-center md:mb-12">
        <h2 className="mb-4 inline-block animate-fadeInDown bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text pb-1 text-3xl font-black leading-[1.1] tracking-tight text-transparent sm:text-4xl lg:text-[48px]">
          Explore Baguio City
        </h2>
        {lastUpdated && (
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
            Live Data: {lastUpdated.toLocaleTimeString()}
            {isStale && <span className="ml-2 text-amber-500">Data may be outdated</span>}
          </p>
        )}
        <p className="mx-auto max-w-2xl animate-fadeInUp text-sm leading-7 text-slate-400 sm:text-base lg:text-lg">
          Discover Baguio's top attractions with real-time crowd monitoring - from scenic parks to historical sites
        </p>
      </div>

      {/* Category Tabs */}
      <div className="relative z-10 mb-10 flex flex-wrap justify-center gap-3 animate-fadeIn md:mb-12">
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all duration-300 ${
              selectedCategory === cat.id
                ? 'border-transparent bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-[0_4px_20px_rgba(102,126,234,0.4)] scale-105'
                : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10 hover:text-white'
            }`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Crowd Level Filter */}
      <div className="mx-auto max-w-[1400px] mb-12">
        <div className="inline-flex items-center gap-4 text-[12px] font-black uppercase tracking-[3px] text-slate-500">
          <label htmlFor="crowdlevel">
            Filter by Crowd Level
          </label>
          <div className="relative">
            <button 
              onClick={() => setIsCrowdDropdownOpen(!isCrowdDropdownOpen)}
              className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl pl-5 pr-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-200 focus:ring-4 focus:ring-[#667eea]/10 outline-none cursor-pointer transition-all hover:bg-white/10 hover:border-white/20"
            >
              <span>{selectedCrowdLevel}</span>
              <svg className={`w-4 h-4 transition-transform duration-300 text-[#667eea] ${isCrowdDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isCrowdDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsCrowdDropdownOpen(false)}
                ></div>
                <div className="absolute left-0 mt-3 w-64 bg-[#0a0f1e]/95 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in zoom-in duration-300 origin-top-left">
                  {crowdLevelOptions.map((level) => (
                    <button
                      key={level}
                      onClick={() => {
                        setSelectedCrowdLevel(level);
                        setIsCrowdDropdownOpen(false);
                      }}
                      className={`w-full text-left px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${
                        selectedCrowdLevel === level 
                        ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-lg' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 animate-fadeIn sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
        {filteredData.map(location => {
          const crowdPercent = location.crowdPercent || 0;
          const crowdColor = location.crowdLevel === 'High' ? 'from-rose-500 to-rose-600 shadow-rose-500/50' : 
                            location.crowdLevel === 'Moderate' ? 'from-amber-500 to-amber-600 shadow-amber-500/50' : 
                            location.crowdLevel === 'Sparse' ? 'from-blue-500 to-blue-600 shadow-blue-500/50' :
                            'from-emerald-500 to-emerald-600 shadow-emerald-500/50';
          
          const highlights = [
            ...(location.facilities || []),
          ];

          return (
            <div
              key={location.id}
              className="group cursor-pointer overflow-hidden rounded-3xl border border-white/5 bg-white/5 backdrop-blur-xl shadow-2xl transition-all duration-500 animate-slideInUp hover:-translate-y-2 hover:border-white/10 hover:bg-white/[0.08]"
              onClick={(e) => {
                e.stopPropagation();
                if (onViewLiveFeed) {
                  onViewLiveFeed(location.id);
                } else {
                  onNavigate('dashboard');
                }
              }}
            >
              <div className="relative h-48 overflow-hidden sm:h-52 lg:h-[240px]">
                <img
                  src={location.image}
                  alt={location.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  onError={(e) => {
                    e.currentTarget.src = '/assets/images/philippines-placeholder.jpg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-transparent to-transparent opacity-60"></div>
              </div>

              <div className="p-6">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h3 className="text-xl font-black tracking-tight text-white sm:text-[24px]">{location.name}</h3>
                </div>
                
                <p className="mb-5 overflow-hidden text-sm leading-relaxed text-slate-400 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
                  {location.description}
                </p>

                <div className="mb-6">
                  <h4 className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#667eea]">Highlights</h4>
                  <ul className="grid grid-cols-1 gap-2">
                    {highlights.slice(0, 3).map((highlight, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-[13px] text-slate-300">
                        <span className="h-1 w-1 rounded-full bg-[#667eea]"></span>
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Animated Crowd Loading Bar */}
                <div className="mb-6">
                  <div className="mb-2 flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">Crowd Density</span>
                    <span className={location.crowdLevel === 'High' ? 'text-rose-400' : 
                                  location.crowdLevel === 'Moderate' ? 'text-amber-400' : 
                                  location.crowdLevel === 'Sparse' ? 'text-blue-400' :
                                  'text-emerald-400'}>
                      {location.crowdLevel} Crowd
                    </span>
                  </div>
                  <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div 
                      className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)] ${crowdColor}`}
                      style={{ width: `${crowdPercent}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                    {location.detectedPeople} / {location.capacity} People
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-6 border-t border-white/5">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                    {location.bestTime}
                  </div>
                  <button
                    type="button"
                    className="w-full rounded-2xl bg-gradient-to-r from-[#667eea] to-[#764ba2] py-4 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-indigo-500/40"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onViewLiveFeed) {
                        onViewLiveFeed(location.id);
                      } else {
                        onNavigate('dashboard');
                      }
                    }}
                  >
                    View Live Feed
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExploreSection;
