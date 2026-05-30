import React from 'react';

const getBadgeStyle = (level) => {
  const styles = {
    sparse: 'bg-[#1e1b4b] text-[#c084fc] border border-[#c084fc]/30',
    low: 'bg-[#064e3b] text-[#34d399] border border-[#34d399]/30',
    moderate: 'bg-[#422006] text-[#fcd34d] border border-[#fcd34d]/30',
    high: 'bg-[#7f1d1d] text-[#f87171] border border-[#f87171]/30',
  };
  return styles[(level || 'moderate').toLowerCase()] || styles.moderate;
};

const LocationCard = ({ location }) => {
  return (
    <div className="w-[280px] shrink-0 flex-none snap-center rounded-2xl bg-slate-800/40 border border-white/5 overflow-hidden flex flex-col">
      <img src={location.image || 'https://via.placeholder.com/280x160?text=No+Image'} alt={location.name} className="w-full h-40 object-cover" />
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-lg font-bold">{location.name}</h3>
        <p className="text-sm text-slate-400 line-clamp-2 mt-1">{location.description}</p>
        
        {location.highlights && location.highlights.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {location.highlights.slice(0, 3).map((highlight, idx) => (
              <span key={idx} className="text-[10px] uppercase font-bold text-slate-400 bg-black/30 px-2 py-1 rounded-md">
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
          <button className="whitespace-nowrap px-4 py-2 rounded-full bg-indigo-500 text-white font-medium text-sm transition-colors">
            All Places
          </button>
          {categories.map((cat) => (
            <button key={cat} className="whitespace-nowrap px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-300 font-medium text-sm transition-colors hover:bg-white/10">
              {formatCategory(cat)}
            </button>
          ))}
        </div>
      </header>

      <div className="pt-6">
        {recommended.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xl font-bold px-4 mb-3">Recommended For You</h2>
            <div className="flex flex-nowrap overflow-x-auto gap-4 px-4 pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
              {recommended.map(loc => <LocationCard key={loc.id} location={loc} />)}
            </div>
          </section>
        )}

        {categories.map((cat) => {
          if (!categoriesMap[cat] || categoriesMap[cat].length === 0) return null;
          return (
            <section key={cat} className="mb-6">
              <h2 className="text-xl font-bold px-4 mb-3">{formatCategory(cat)}</h2>
              <div className="flex flex-nowrap overflow-x-auto gap-4 px-4 pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
                {categoriesMap[cat].map(loc => <LocationCard key={loc.id} location={loc} />)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default ExploreMobile;
