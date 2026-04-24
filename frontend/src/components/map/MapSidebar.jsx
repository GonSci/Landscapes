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

  const allExploreItems = [
    ...locationMarketplace.baguio.activities.map(item => ({...item, category: 'Activity'})),
    ...locationMarketplace.baguio.places.map(item => ({...item, category: 'Place'})),
    ...locationMarketplace.baguio.food.map(item => ({...item, category: 'Food'})),
  ];

  const filteredItems = crowdFilter === 'All' 
    ? allExploreItems 
    : allExploreItems.filter(item => item.crowdLevel === crowdFilter);

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden pointer-events-auto">
      {/* Header / Tabs */}
      <div className="flex items-center gap-2 m-4 mb-2 mt-7">
        {/* Collapse Button */}
        <button 
          onClick={onSidebarToggle}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          title="Collapse Sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        {/* Tabs */}
        <div className="flex flex-1 p-1.5 bg-slate-100/80 rounded-[10px]">
          <button 
            onClick={() => setActiveTab('explore')}
            className={`flex-1 py-1.5 px-3 text-[13px] font-semibold rounded-[8px] transition-all duration-200 ${activeTab === 'explore' ? 'bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Places
          </button>
          <button 
            onClick={() => setActiveTab('checklist')}
            className={`flex-1 py-1.5 px-3 text-[13px] font-semibold rounded-[8px] transition-all duration-200 ${activeTab === 'checklist' ? 'bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
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
             <div className="sticky top-0 bg-white/95 backdrop-blur-xl pt-2 pb-3 mb-2 z-10 border-b border-slate-100/60">
               <div className="flex items-center justify-between">
                 <h2 className="text-[1.3rem] font-bold text-slate-900 tracking-tight">Baguio City</h2>
                 <div className="relative">
                   <select 
                     value={crowdFilter}
                     onChange={(e) => setCrowdFilter(e.target.value)}
                     className="appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-[12px] font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer transition-all hover:bg-slate-100"
                   >
                     <option value="All">All Crowd Levels</option>
                     <option value="Low">Low Crowd</option>
                     <option value="Moderate">Moderate Crowd</option>
                     <option value="High">High Crowd</option>
                   </select>
                   <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                     <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                   </div>
                 </div>
               </div>
             </div>

             {/* Items List */}
             <div className="flex flex-col gap-3">
               {filteredItems.map(item => (
                 <div 
                   key={`${item.category}-${item.id}`} 
                   onClick={() => onLocationClick({ lat: item.lat || 16.4023, lng: item.lng || 120.5960, name: item.name, region: 'Baguio City' })}
                   className="group flex gap-3.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors duration-200 border border-transparent hover:border-slate-200/60 active:bg-slate-100"
                 >
                   {/* Image */}
                   <div className="w-[88px] h-[88px] shrink-0 rounded-[10px] overflow-hidden bg-slate-100 border border-slate-200/50 shadow-sm relative">
                     {/* Try to load real image, fallback to placeholder if fails or not found */}
                     <img 
                       src={item.image} 
                       alt={item.name} 
                       className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                       onError={(e) => {
                         e.target.onerror = null; 
                         e.target.src = 'https://images.unsplash.com/photo-1518461748286-3532f41fc8d0?auto=format&fit=crop&q=80&w=200&h=200';
                       }}
                     />
                   </div>
                   {/* Details */}
                   <div className="flex-1 min-w-0 flex flex-col py-0.5">
                     <div className="flex justify-between items-start gap-2 mb-0.5">
                       <h3 className="font-semibold text-slate-900 truncate text-[14px] leading-snug">{item.name}</h3>
                     </div>
                     <p className="text-[12px] text-slate-500 line-clamp-2 leading-relaxed mb-1.5">{item.description}</p>
                     
                     <div className="mt-auto flex items-end justify-between">
                       <div className="flex flex-col">
                         <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{item.business}</span>
                         <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1 mt-0.5">
                           <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                           {item.bestTime}
                         </span>
                       </div>
                       <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] border ${
                         item.crowdLevel === 'Low' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                         item.crowdLevel === 'Moderate' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                         'bg-rose-50 text-rose-600 border-rose-100'
                       }`}>{item.crowdLevel}</span>
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
          background-color: rgba(203, 213, 225, 0.5);
          border-radius: 20px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: rgba(203, 213, 225, 0.8);
        }
      `}} />
    </div>
  );
}

export default MapSidebar;
