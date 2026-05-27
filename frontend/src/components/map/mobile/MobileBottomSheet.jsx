import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, ChevronDown } from 'lucide-react';
import { useLiveLocations } from '../../../hooks/useLiveLocations';
import UserProfile from '../../profile/UserProfile';

const getCrowdLevelStyles = (level) => {
  const normalized = (level || '').toLowerCase();
  switch (normalized) {
    case 'sparse':
      return 'bg-purple-900/40 text-purple-300 border border-purple-700/50';
    case 'low':
      return 'bg-green-900/40 text-green-300 border border-green-700/50';
    case 'high':
      return 'bg-red-900/40 text-red-300 border border-red-700/50';
    case 'moderate':
    default:
      return 'bg-amber-900/40 text-amber-300 border border-amber-700/50';
  }
};

const MobileBottomSheet = ({ onViewLiveFeed, onSnapStateChange, activeTab = 'explore', userProfile, currentUser }) => {
  const { locations } = useLiveLocations();
  const [snapState, setSnapState] = useState('minimized');
  const [crowdFilter, setCrowdFilter] = useState('All');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredLocations = crowdFilter === 'All' 
    ? locations 
    : locations.filter(loc => loc.crowdLevel === crowdFilter);

  useEffect(() => {
    if (onSnapStateChange) {
      onSnapStateChange(snapState);
    }
  }, [snapState, onSnapStateChange]);

  const variants = {
    minimized: { height: '175px' }, 
    full: { height: '75vh' }
  };

  const handleDragEnd = (event, info) => {
    const threshold = 30; // pixels to trigger state change
    
    if (info.offset.y < -threshold) {
      // Swipe Up
      if (snapState === 'minimized') setSnapState('full');
    } else if (info.offset.y > threshold) {
      // Swipe Down
      if (snapState === 'full') setSnapState('minimized');
    }
  };

  return (
    <motion.div 
      className="absolute bottom-0 left-0 right-0 z-[1500] flex flex-col bg-[#121626] rounded-t-[24px] shadow-[0_-10px_40px_rgba(0,0,0,0.8)] border-t border-white/10"
      initial="minimized"
      animate={snapState}
      variants={variants}
      transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.05}
      onDragEnd={handleDragEnd}
      dragDirectionLock
    >
      {/* Drag Handle Area */}
      <div className="w-full flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
        <div className="w-14 h-1.5 bg-white/30 rounded-full" />
      </div>

      {/* Content Area */}
      <div 
        className={`flex-1 overflow-x-hidden px-6 pb-[100px] hide-scrollbar ${snapState === 'minimized' ? 'overflow-hidden' : 'overflow-y-auto'}`}
        onPointerDown={(e) => e.stopPropagation()} 
        onTouchStart={(e) => e.stopPropagation()}
      >
        {activeTab === 'explore' ? (
          <>
            {/* Header */}
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-white mb-1">Explore Baguio City</h2>
              <p className="text-sm text-slate-400">
                Click the <span className="text-indigo-400">glowing markers</span> to discover destinations.
              </p>
            </div>

            {/* Filter Row and Cards Content (Hidden when minimized) */}
            <motion.div 
              className="flex flex-col flex-1"
              animate={{ 
                opacity: snapState === 'minimized' ? 0 : 1, 
                pointerEvents: snapState === 'minimized' ? 'none' : 'auto' 
              }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-5 relative z-50">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {filteredLocations.length} Places Found
                </span>
                <div className="relative">
                  <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-200 transition-all hover:bg-white/10"
                  >
                    {crowdFilter === 'All' ? 'All Levels' : `${crowdFilter} Crowd`}
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setIsDropdownOpen(false)}
                          onTouchStart={() => setIsDropdownOpen(false)}
                        />
                        <motion.div 
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          className="absolute right-0 top-full mt-2 w-48 bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                        >
                          {['All', 'Sparse', 'Low', 'Moderate', 'High'].map((level) => (
                            <button
                              key={level}
                              onClick={() => {
                                setCrowdFilter(level);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${
                                crowdFilter === level 
                                ? 'bg-indigo-500/20 text-indigo-400' 
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              {level === 'All' ? 'All Crowd Levels' : `${level} Crowd`}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Location Cards */}
              <div className="space-y-4 relative z-0 pb-4">
                {filteredLocations.map((loc) => (
                  <div 
                    key={loc.id} 
                    className="flex gap-4 p-0 bg-transparent rounded-xl cursor-pointer group"
                    onClick={() => onViewLiveFeed && onViewLiveFeed(loc.id)}
                  >
                    <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800 border border-white/5 shadow-inner">
                      <img 
                        src={loc.image} 
                        alt={loc.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1542314831-c6a4d14093c2?w=500&q=80';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-white font-semibold text-base truncate pr-2">{loc.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getCrowdLevelStyles(loc.crowdLevel)}`}>
                          {loc.crowdLevel || 'MODERATE'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm truncate mb-2">{loc.description || `Beautiful destination in Baguio`}</p>
                      <div className="flex items-center gap-4 text-xs font-medium text-slate-300">
                        <div className="flex items-center gap-1.5 uppercase tracking-wider">
                          <MapPin size={12} className="text-slate-400" />
                          {loc.category || 'Baguio Tourism'}
                        </div>
                        <div className="flex items-center gap-1.5 uppercase tracking-wider">
                          <Clock size={12} className="text-slate-400" />
                          8:00 AM - 6:00 PM
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredLocations.length === 0 && (
                  <div className="text-center py-10 opacity-70">
                    <span className="text-4xl mb-3 block">📍</span>
                    <p className="text-slate-300 font-bold text-sm">No locations found</p>
                    <p className="text-slate-500 text-xs mt-1">Try selecting a different crowd level</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Explore Baguio City</h2>
                <p className="text-sm text-slate-400">
                  Manage your <span className="text-indigo-400">checklist</span> for destinations in Baguio City.
                </p>
              </div>
            </div>
            
            <motion.div 
              className="flex-1 -mx-6 mt-2 pb-[100px]"
              animate={{ 
                opacity: snapState === 'minimized' ? 0 : 1, 
                pointerEvents: snapState === 'minimized' ? 'none' : 'auto' 
              }}
              transition={{ duration: 0.2 }}
            >
              <UserProfile 
                profile={userProfile}
                compactMode={true}
                currentUser={currentUser}
                isMobileSheet={true}
              />
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MobileBottomSheet;
