import React, { useState } from 'react';
import UserProfile from '../profile/UserProfile';

const locationMarketplace = {
  baguio: {
    activities: [
      { id: 1, name: 'Strawberry Picking', lat: 16.3980, lng: 120.5600, crowdLevel: 'Low', image: '/assets/featured_images/strawberry-farm.jpg', emoji: '🍓', description: 'Pick fresh strawberries at La Trinidad', business: 'Strawberry Farms', bestTime: '6:00 AM - 4:00 PM' },
      { id: 2, name: 'Burnham Park Boat Ride', lat: 16.4120, lng: 120.5930, crowdLevel: 'Moderate', image: '/assets/featured_images/burnham-park.jpg', emoji: '🚣', description: 'Scenic lake paddleboat ride', business: 'Burnham Park Admin', bestTime: '8:00 AM - 6:00 PM' },
      { id: 3, name: 'Tam-Awan Village Tour', lat: 16.4250, lng: 120.5800, crowdLevel: 'High', image: '/assets/featured_images/teachers-camp.jpg', emoji: '🏘️', description: 'Cordillera cultural village', business: 'Tam-Awan Village', bestTime: '9:00 AM - 6:00 PM' },
      { id: 4, name: 'Mines View Park', lat: 16.3895, lng: 120.6145, crowdLevel: 'Low', image: '/assets/featured_images/mines-view-park.jpg', emoji: '📷', description: 'Mountain views & souvenir shops', business: 'Baguio Tourism', bestTime: '6:00 AM - 6:00 PM' }
    ],
    places: [
      { id: 1, name: 'The Mansion', lat: 16.4170, lng: 120.5970, crowdLevel: 'Moderate', image: '/assets/featured_images/wright-park.jpg', emoji: '🏛️', description: 'Official summer residence of President', business: 'Philippine Gov', bestTime: '7:00 AM - 5:00 PM' },
      { id: 2, name: 'Botanical Garden', lat: 16.4140, lng: 120.6050, crowdLevel: 'High', image: '/assets/images/baguio.jpg', emoji: '🏺', description: 'Peaceful garden with Igorot sculptures', business: 'Baguio Parks', bestTime: '6:00 AM - 6:00 PM' },
      { id: 3, name: 'Session Road', lat: 16.4050, lng: 120.5900, crowdLevel: 'High', image: '/assets/featured_images/session-road.jpg', emoji: '🛍️', description: 'Main shopping & dining street', business: 'Session Road Assoc.', bestTime: '9:00 AM - 10:00 PM' },
      { id: 4, name: 'Baguio Cathedral', lat: 16.4109, lng: 120.5926, crowdLevel: 'Low', image: '/assets/featured_images/baguio-cathedral.jpg', emoji: '⛪', description: 'Historic church with prayer bell', business: 'Baguio Cathedral', bestTime: '6:00 AM - 7:00 PM' }
    ],
    food: [
      { id: 1, name: 'Good Shepherd Convent', lat: 16.4020, lng: 120.6100, crowdLevel: 'Low', image: '/assets/images/philippines-placeholder.jpg', emoji: '🪧', description: 'Famous ube jam & strawberry jam', business: 'Good Shepherd', bestTime: '8:00 AM - 5:00 PM' },
      { id: 2, name: 'Hill Station', lat: 16.4080, lng: 120.5960, crowdLevel: 'Low', image: '/assets/images/baguio.jpg', emoji: '🍽️', description: 'Fine dining with mountain views', business: 'Hill Station Rest.', bestTime: '11:00 AM - 2:00 PM, 6:00 PM - 10:00 PM' },
      { id: 3, name: 'Vizco\'s', lat: 16.4060, lng: 120.5910, crowdLevel: 'Moderate', image: '/assets/featured_images/session-road.jpg', emoji: '🍰', description: 'Strawberry shortcake & pastries', business: 'Vizco\'s Bakery', bestTime: '8:00 AM - 8:00 PM' },
      { id: 4, name: 'Strawberry Taho Vendors', lat: 16.4120, lng: 120.5930, crowdLevel: 'Low', image: '/assets/featured_images/strawberry-farm.jpg', emoji: '🥛', description: 'Fresh strawberry taho at parks', business: 'Various Vendors', bestTime: '6:00 AM - 10:00 AM' }
    ]
  },
};

const MapSidebar = ({ userProfile, currentUser, onLocationClick, onSidebarToggle }) => {
  const [activeTab, setActiveTab] = useState('explore');
  const [crowdFilter, setCrowdFilter] = useState('All');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const allExploreItems = [
    ...locationMarketplace.baguio.activities.map(item => ({...item, category: 'Activity'})),
    ...locationMarketplace.baguio.places.map(item => ({...item, category: 'Place'})),
    ...locationMarketplace.baguio.food.map(item => ({...item, category: 'Food'})),
  ];

  const filteredItems = crowdFilter === 'All' 
    ? allExploreItems 
    : allExploreItems.filter(item => item.crowdLevel === crowdFilter);

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0f1e]/80 backdrop-blur-2xl overflow-hidden pointer-events-auto border-r border-white/5 shadow-2xl">
      {/* Header / Tabs */}
      <div className="flex items-center gap-2 m-4 mb-2 mt-7">
        {/* Collapse Button */}
        <button 
          onClick={onSidebarToggle}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          title="Collapse Sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        {/* Tabs */}
        <div className="flex flex-1 p-1 bg-black/40 rounded-xl border border-white/10 shadow-inner">
          <button 
            onClick={() => setActiveTab('explore')}
            className={`flex-1 py-2 px-3 text-[13px] font-bold rounded-lg transition-all duration-300 ${activeTab === 'explore' ? 'bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
          >
            Places
          </button>
          <button 
            onClick={() => setActiveTab('checklist')}
            className={`flex-1 py-2 px-3 text-[13px] font-bold rounded-lg transition-all duration-300 ${activeTab === 'checklist' ? 'bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
          >
            Checklist
          </button>
        </div>
      </div>

      {/* Content Canvas */}
      <div className="flex-1 overflow-hidden relative">
        {/* Explore Tab Content */}
        <div className={`absolute inset-0 transition-transform duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] ${activeTab === 'explore' ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-full overflow-y-auto px-4 pb-6 custom-scrollbar">
             {/* Header & Filter */}
             <div className="sticky top-0 bg-slate-900/10 backdrop-blur-md pt-2 pb-3 mb-2 z-10 border-b border-white/5">
               <div className="flex items-center justify-between">
                 <h2 className="text-[1.3rem] font-black text-white tracking-tight">Baguio City</h2>
                  <div className="relative">
                    <button 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl pl-3 pr-2 py-2 text-[11px] font-black uppercase tracking-widest text-slate-200 focus:ring-2 focus:ring-[#667eea]/40 outline-none cursor-pointer transition-all hover:bg-white/10"
                    >
                      <span>{crowdFilter === 'All' ? 'All Levels' : `${crowdFilter} Crowd`}</span>
                      <svg className={`w-4 h-4 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-20" 
                          onClick={() => setIsDropdownOpen(false)}
                        ></div>
                        <div className="absolute right-0 mt-2 w-48 bg-[#0a0f1e]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-30 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                          {['All', 'Low', 'Moderate', 'High'].map((level) => (
                            <button
                              key={level}
                              onClick={() => {
                                setCrowdFilter(level);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${
                                crowdFilter === level 
                                ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white' 
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              {level === 'All' ? 'All Crowd Levels' : `${level} Crowd`}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
               </div>
             </div>

             {/* Items List */}
             <div className="flex flex-col gap-3">
               {filteredItems.map(item => (
                  <div 
                    key={`${item.category}-${item.id}`} 
                    onClick={() => onLocationClick({ lat: item.lat || 16.4023, lng: item.lng || 120.5960, name: item.name, region: 'Baguio City' })}
                    className="group flex gap-3.5 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-all duration-300 border border-transparent hover:border-white/10 active:bg-white/10"
                  >
                    {/* Image */}
                    <div className="w-[88px] h-[88px] shrink-0 rounded-[12px] overflow-hidden bg-slate-800 border border-white/10 shadow-lg relative">
                      {/* Try to load real image, fallback to placeholder if fails or not found */}
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        onError={(e) => {
                          e.target.onerror = null; 
                          e.target.src = 'https://images.unsplash.com/photo-1518461748286-3532f41fc8d0?auto=format&fit=crop&q=80&w=200&h=200';
                        }}
                      />
                    </div>
                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col py-0.5">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h3 className="font-bold text-white truncate text-[14px] leading-snug group-hover:text-indigo-300 transition-colors">{item.name}</h3>
                      </div>
                      <p className="text-[12px] text-slate-400 line-clamp-2 leading-relaxed mb-2">{item.description}</p>
                      
                      <div className="mt-auto flex items-end justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.business}</span>
                          <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            {item.bestTime}
                          </span>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-[6px] border transition-all shadow-[0_0_10px_rgba(0,0,0,0.2)] ${
                          item.crowdLevel === 'Low' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/20' :
                          item.crowdLevel === 'Moderate' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/20' :
                          'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-rose-500/20'
                        }`} style={{ boxShadow: `0 0 12px ${
                          item.crowdLevel === 'Low' ? 'rgba(16, 185, 129, 0.25)' :
                          item.crowdLevel === 'Moderate' ? 'rgba(245, 158, 11, 0.25)' :
                          'rgba(244, 63, 94, 0.25)'
                        }` }}>{item.crowdLevel}</span>
                      </div>
                    </div>
                  </div>
               ))}
               {filteredItems.length === 0 && (
                 <div className="text-center py-8">
                   <p className="text-slate-500 text-sm">No locations found for this crowd level.</p>
                 </div>
               )}
             </div>
          </div>
        </div>

        {/* Checklist Tab Content */}
        <div className={`absolute inset-0 transition-transform duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] ${activeTab === 'checklist' ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="h-full">
            <UserProfile 
              profile={userProfile}
              compactMode={true}
              currentUser={currentUser}
            />
          </div>
        </div>
      </div>

       <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}

export default MapSidebar;
