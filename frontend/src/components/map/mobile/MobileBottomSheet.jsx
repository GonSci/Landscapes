import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, ChevronDown } from 'lucide-react';
import { useLiveLocations } from '../../../hooks/useLiveLocations';

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

const MobileBottomSheet = ({ onViewLiveFeed, onSnapStateChange }) => {
  const { locations } = useLiveLocations();
  const [snapState, setSnapState] = useState('minimized');

  useEffect(() => {
    if (onSnapStateChange) {
      onSnapStateChange(snapState);
    }
  }, [snapState, onSnapStateChange]);

  const variants = {
    minimized: { height: '140px' },
    half: { height: '60vh' },
    full: { height: '90vh' }
  };

  const handleDragEnd = (event, info) => {
    const threshold = 30; // pixels to trigger state change
    
    if (info.offset.y < -threshold) {
      // Swipe Up
      if (snapState === 'minimized') setSnapState('half');
      else if (snapState === 'half') setSnapState('full');
    } else if (info.offset.y > threshold) {
      // Swipe Down
      if (snapState === 'full') setSnapState('half');
      else if (snapState === 'half') setSnapState('minimized');
    }
  };

  return (
    <motion.div 
      className="absolute bottom-0 left-0 right-0 z-[9999] flex flex-col bg-[#121626] rounded-t-[24px] shadow-[0_-10px_40px_rgba(0,0,0,0.8)] border-t border-white/10"
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
      {/* Drag Handle Area (Only this area initiates drag cleanly without disrupting scrolling) */}
      <div className="flex-none pt-4 pb-4 w-full flex justify-center cursor-grab active:cursor-grabbing">
        <div className="w-14 h-1.5 bg-white/30 rounded-full" />
      </div>

      {/* Content Area - stopPropagation prevents the drag from taking over when the user tries to scroll the list */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-6 hide-scrollbar"
        onPointerDown={(e) => e.stopPropagation()} 
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Explore Baguio City</h2>
            <p className="text-sm text-slate-400">
              Click the <span className="text-indigo-400">glowing markers</span> to discover destinations.
            </p>
          </div>
          <button className="flex items-center gap-1 text-xs font-bold text-white tracking-wider bg-white/5 py-1 px-2 rounded-lg">
            ALL<br/>LEVELS
            <ChevronDown size={14} className="ml-1 text-slate-400" />
          </button>
        </div>

        {/* Location Cards */}
        <div className="space-y-4">
          {locations.map((loc) => (
            <div 
              key={loc.id} 
              className="flex gap-4 p-0 bg-transparent rounded-xl cursor-pointer group"
              onClick={() => onViewLiveFeed && onViewLiveFeed(loc.id)}
            >
              <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800 border border-white/5 shadow-inner">
                <img 
                  src={loc.image_url || '/placeholder-image.jpg'} 
                  alt={loc.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
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
        </div>
      </div>
    </motion.div>
  );
};

export default MobileBottomSheet;
