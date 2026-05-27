import React, { useState } from 'react';
import UserProfile from '../../profile/UserProfile';
import { useLiveLocations } from '../../../hooks/useLiveLocations';

const MapSidebar = ({ userProfile, currentUser, onLocationClick, onSidebarToggle }) => {
  const [activeTab, setActiveTab] = useState('explore');
  const [crowdFilter, setCrowdFilter] = useState('All');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { locations, isLoading, isStale, lastUpdated } = useLiveLocations();

  const filteredItems = crowdFilter === 'All' 
    ? locations 
    : locations.filter(item => item.crowdLevel === crowdFilter);

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0f1e]/80 backdrop-blur-2xl overflow-hidden pointer-events-auto border-r border-white/5 shadow-2xl">
      {/* Header / Tabs */}
      <div className="flex items-center gap-2 m-4 mb-2 mt-9">
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
                 <div>
                   <h2 className="text-[1.3rem] font-black text-white tracking-tight">Baguio City</h2>
                   {lastUpdated && (
                     <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                       Live: {lastUpdated.toLocaleTimeString()}
                       {isStale && <span className="ml-2 text-amber-500 font-bold">Data may be outdated</span>}
                     </p>
                   )}
                 </div>
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
                          {['All', 'Sparse', 'Low', 'Moderate', 'High'].map((level) => (
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
                    onClick={() => onLocationClick({ id: item.id, lat: item.lat || 16.4023, lng: item.lng || 120.5960, name: item.name, region: 'Baguio City' })}
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
                          item.crowdLevel === 'Sparse' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/20' :
                          item.crowdLevel === 'Low' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/20' :
                          item.crowdLevel === 'Moderate' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/20' :
                          'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-rose-500/20'
                        }`} style={{ boxShadow: `0 0 12px ${
                          item.crowdLevel === 'Sparse' ? 'rgba(59, 130, 246, 0.25)' :
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
