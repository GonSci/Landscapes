import React, { useState } from 'react';
import { X } from 'lucide-react';

const getBadgeStyle = (level) => {
  const styles = {
    sparse: 'bg-[#1e1b4b] text-[#c084fc] border border-[#c084fc]/30',
    low: 'bg-[#064e3b] text-[#34d399] border border-[#34d399]/30',
    moderate: 'bg-[#422006] text-[#fcd34d] border border-[#fcd34d]/30',
    high: 'bg-[#7f1d1d] text-[#f87171] border border-[#f87171]/30',
  };
  return styles[(level || 'moderate').toLowerCase()] || styles.moderate;
};

const LocationCard = ({ location, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="w-[280px] shrink-0 flex-none snap-center rounded-2xl bg-slate-800/40 border border-white/5 overflow-hidden flex flex-col cursor-pointer active:scale-95 transition-transform"
    >
      <img src={location.image || 'https://via.placeholder.com/280x160?text=No+Image'} alt={location.name} className="w-full h-40 object-cover" />
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-lg font-bold">{location.name}</h3>
        
        {location.highlights && location.highlights.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {location.highlights.slice(0, 3).map((highlight, idx) => (
              <span key={idx} className="text-[10px] uppercase font-bold text-slate-300 bg-slate-800 px-2 py-1 rounded-md">
                {highlight}
              </span>
            ))}
          </div>
        )}
        
        <div className="mt-auto pt-4 flex items-center justify-between">
          <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg ${getBadgeStyle(location.crowdLevel)}`}>
            {location.crowdLevel || 'Moderate'} Crowd
          </span>
        </div>
      </div>
    </div>
  );
};

const categoryMap = {
  "shopping-retail": "Shopping & Retail",
  "nature-outdoors": "Nature & Outdoors",
  "museum-arts": "Museum & Arts",
  "dining-food": "Dining & Food",
  "recommended": "Recommended For You"
};
const formatCategory = (cat) => categoryMap[cat.toLowerCase()] || cat;

const ExploreMobile = ({ onNavigate, onViewLiveFeed, userProfile, locations = [], isLoading, isStale, lastUpdated }) => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');

  // 1. Group Locations
  const recommended = locations.filter(
    (loc) => loc.crowdLevel?.toLowerCase() === 'sparse' || loc.crowdLevel?.toLowerCase() === 'low'
  );

  const categoriesMap = locations.reduce((acc, loc) => {
    const cat = loc.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(loc);
    return acc;
  }, {});

  const categories = Object.keys(categoriesMap).sort();

  return (
    <div className="w-full min-h-screen bg-[#121626] text-white pb-28">
      <header className="sticky top-0 z-40 bg-[#121626]/95 backdrop-blur-md pt-[96px] pb-4 px-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Explore Baguio</h1>
          <span className="bg-red-500/20 text-red-400 text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
            LIVE DATA
          </span>
        </div>
        <div className="flex overflow-x-auto gap-3 [&::-webkit-scrollbar]:hidden">
          <button 
            onClick={() => setActiveCategory('All')}
            className={`whitespace-nowrap px-4 py-2 rounded-full font-medium text-sm transition-colors ${activeCategory === 'All' ? 'bg-indigo-500 text-white' : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'}`}
          >
            All Places
          </button>
          {categories.map((cat) => (
            <button 
              key={cat} 
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full font-medium text-sm transition-colors ${activeCategory === cat ? 'bg-indigo-500 text-white' : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'}`}
            >
              {formatCategory(cat)}
            </button>
          ))}
        </div>
      </header>

      <div className="pt-6">
        {activeCategory === 'All' && recommended.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xl font-bold px-4 mb-3">Recommended For You</h2>
            <div className="flex flex-nowrap overflow-x-auto gap-4 px-4 pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
              {recommended.map(loc => <LocationCard key={loc.id} location={loc} onClick={() => setSelectedLocation(loc)} />)}
            </div>
          </section>
        )}

        {categories.map((cat) => {
          if (activeCategory !== 'All' && activeCategory !== cat) return null;
          if (!categoriesMap[cat] || categoriesMap[cat].length === 0) return null;
          return (
            <section key={cat} className="mb-6">
              <h2 className="text-xl font-bold px-4 mb-3">{formatCategory(cat)}</h2>
              <div className="flex flex-nowrap overflow-x-auto gap-4 px-4 pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
                {categoriesMap[cat].map(loc => <LocationCard key={loc.id} location={loc} onClick={() => setSelectedLocation(loc)} />)}
              </div>
            </section>
          );
        })}
      </div>

      {/* Detail View Modal */}
      {selectedLocation && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center px-4">
          {/* Clickable Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedLocation(null)}
          ></div>
          
          {/* Centered Window Modal */}
          <div className="relative w-[92%] max-w-sm max-h-[85vh] rounded-2xl bg-[#121626] border border-white/10 shadow-2xl overflow-hidden flex flex-col z-50">
            
            {/* Hero Image */}
            <div className="relative w-full h-48 shrink-0">
              <button 
                onClick={() => setSelectedLocation(null)}
                className="absolute top-3 right-3 z-50 p-1.5 bg-black/50 backdrop-blur-md rounded-full text-white transition-transform active:scale-90"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
              <img 
                src={selectedLocation.image || 'https://via.placeholder.com/600x400?text=No+Image'} 
                alt={selectedLocation.name} 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121626] via-transparent to-transparent"></div>
            </div>
            
            {/* Scrollable Content Body */}
            <div className="p-5 flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden">
              
              {/* Tightened Text Wrapper */}
              <div className="flex flex-col gap-1.5">
                {/* Title & Hours Row */}
                <div className="flex justify-between items-start gap-4">
                  <h2 className="text-xl font-bold text-white leading-tight">{selectedLocation.name}</h2>
                  <p className="text-xs text-slate-400 font-medium shrink-0 mt-1">8:00 AM - 6:00 PM</p>
                </div>
                
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {selectedLocation.highlights && selectedLocation.highlights.map((highlight, idx) => (
                    <span key={idx} className="text-[9px] uppercase font-bold text-slate-300 bg-white/5 border border-white/10 px-2 py-1 rounded-md">
                      {highlight}
                    </span>
                  ))}
                </div>

                <p className="text-sm text-slate-300 leading-relaxed mt-1">
                  {selectedLocation.description || 'No description available for this location.'}
                </p>
              </div>

              {/* Unboxed YOLOv8 Data Section */}
              <div className="flex flex-col gap-2 mt-5">
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${getBadgeStyle(selectedLocation.crowdLevel)}`}>
                    {selectedLocation.crowdLevel || 'Moderate'}
                  </span>
                  <span className="text-xs font-bold text-slate-300">
                    EST. CROWD: {selectedLocation.crowdCount || Math.floor(Math.random() * 50) + 10}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${getBadgeStyle(selectedLocation.crowdLevel).split(' ')[0]}`}
                    style={{ width: `${selectedLocation.crowdLevel?.toLowerCase() === 'sparse' ? '15%' : selectedLocation.crowdLevel?.toLowerCase() === 'low' ? '35%' : selectedLocation.crowdLevel?.toLowerCase() === 'high' ? '85%' : '60%'}` }}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-400 text-right mt-0.5 font-bold uppercase tracking-widest">LAST UPDATED: JUST NOW</p>
              </div>
              
              {/* Action Button */}
              <button 
                onClick={() => {
                  setSelectedLocation(null);
                  if (onViewLiveFeed) onViewLiveFeed(selectedLocation.id);
                }}
                className="w-full py-3.5 mt-6 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
                View Live Feed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExploreMobile;
