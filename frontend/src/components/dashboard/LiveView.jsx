import React, { useState, useEffect, useRef, useMemo } from 'react';
import Redirection from './Redirection';
import { MapPin, ChevronDown, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = 'http://localhost:5001/api';

const LiveView = () => {
  const [detectedCount, setDetectedCount] = useState(0);
  const [videoInitialized, setVideoInitialized] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [continuousDetection, setContinuousDetection] = useState(false);
  const [annotatedFrame, setAnnotatedFrame] = useState(null);
  const [surveillanceLogs, setSurveillanceLogs] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredBar, setHoveredBar] = useState(null);
  const [claheEnabled, setClaheEnabled] = useState(true);
  const [blurEnabled, setBlurEnabled]   = useState(true);
  const [stableCrowdLevel, setStableCrowdLevel] = useState({ label: 'LOW', color: '#10b981', percentage: 33 });
  const [analysisView, setAnalysisView] = useState('intelligence');
  const [analyticsData, setAnalyticsData] = useState([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [peakHours, setPeakHours] = useState(12);
  const [peakDate, setPeakDate] = useState(new Date().toISOString().split('T')[0]);
  const [locations, setLocations] = useState([]);
  const [activeLocationId, setActiveLocationId] = useState(null);
  const [activeLocationName, setActiveLocationName] = useState('NORTH-WING');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const levelChangeTimerRef = useRef(null);
  
  const videoRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const currentFrameRef = useRef(0);
  const hiddenGemsRef = useRef(null);
  const isFetchingRef = useRef(false);
  const countHistoryRef = useRef([]);

  const updateConfig = async (clahe, blur) => {
    await fetch(`${API_URL}/yolo/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable_clahe: clahe, enable_blur: blur })
    });
  };

  // Fetch available locations on mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch(`${API_URL}/locations`);
        if (response.ok) {
          const data = await response.json();
          setLocations(data);
          
          // Set initial active location based on what's active in DB
          const active = data.find(l => l.is_active) || data[0];
          if (active) {
            setActiveLocationId(active.id);
            setActiveLocationName(active.name);
            
            // Actually initialize the backend with this location's video
            fetch(`${API_URL}/yolo/initialize`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                video: active.video_filename,
                conf_threshold: 0.5,
                iou_threshold: 0.45,
                use_gpu: true
              })
            }).then(res => {
              if (res.ok) setVideoInitialized(true);
            });
          }
        }
      } catch (e) {
        console.error("Error fetching locations", e);
      }
    };
    fetchLocations();
  }, []);

  const handleLocationChange = async (location) => {
    if (location.id === activeLocationId) return;

    // Stop current detection
    stopContinuousDetection();
    setVideoInitialized(false);
    
    try {
      const response = await fetch(`${API_URL}/yolo/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          video: location.video_filename,
          conf_threshold: 0.5,
          iou_threshold: 0.45,
          use_gpu: true
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        setActiveLocationId(location.id);
        setActiveLocationName(location.name);
        setVideoInitialized(true);
        addSystemEventLog(`LOCATION SWITCHED TO ${location.name.toUpperCase()}`);
        console.log(`Switched to ${location.name}`);
        
        // Refresh logs for new location
        fetchHistoricalLogs(location.id);
      } else {
        setVideoError(data.error || 'Failed to switch location');
      }
    } catch (error) {
      setVideoError('Connection error while switching location.');
      console.error('Error switching location:', error);
    }
  };

  // Initialize YOLOv8 on component mount (Fallback/Default)
  useEffect(() => {
    // This is now handled by fetchLocations() logic
  }, []);

  const fetchHistoricalLogs = async (locId = activeLocationId, hours = peakHours, date = peakDate) => {
    try {
      const queryParam = locId ? `?location_id=${locId}` : '';
      const separator = queryParam ? '&' : '?';
      const hourlyQuery = `${queryParam}${separator}hours=${hours}&date=${date}`;
      
      const [recentRes, hourlyRes] = await Promise.all([
        fetch(`${API_URL}/logs/recent${queryParam}`),
        fetch(`${API_URL}/logs/hourly${hourlyQuery}`)
      ]);
      if (recentRes.ok) {
        const recent = await recentRes.json();
        setSurveillanceLogs(recent);
      }
      if (hourlyRes.ok) {
        const hourlyArray = await hourlyRes.json();
        setHourlyData(hourlyArray);
      }
    } catch (e) {
      console.error("Error fetching historical logs", e);
    }
  };

  // Fetch historical logs on mount and when activeLocationId, peakHours or peakDate changes
  useEffect(() => {
    if (activeLocationId) {
      fetchHistoricalLogs(activeLocationId, peakHours, peakDate);
    }
  }, [activeLocationId, peakHours, peakDate]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Start continuous detection when video loads
  useEffect(() => {
    if (videoLoaded && videoInitialized && !continuousDetection) {
      console.log('Starting automatic continuous detection...');
      startContinuousDetection();
    }
  }, [videoLoaded, videoInitialized]);

  // Helper to add visual-only logs instantly
  const addLocalLog = (count) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
    
    const newLog = {
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      time: timeString,
      count: count
    };
    
    setSurveillanceLogs(prev => [newLog, ...prev].slice(0, 10));
  };

  // Helper to add system event logs (non-persistent)
  const addSystemEventLog = (message) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
    
    const newLog = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      time: timeString,
      isEvent: true,
      message: message,
      count: 0
    };
    
    setSurveillanceLogs(prev => [newLog, ...prev].slice(0, 10));
  };

  // Poll live count and hourly logs
  useEffect(() => {
    if (!continuousDetection) return;
    
    const liveCountInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/live-count`);
        if (response.ok) {
          const data = await response.json();
          const newCount = data.count || 0;
          
          setDetectedCount(prevCount => {
            if (prevCount !== newCount) {
              addLocalLog(newCount);
            }
            return newCount;
          });
        }
      } catch (e) {
        console.error("Error fetching live count", e);
      }
    }, 1000);
    
    const historicalLogsInterval = setInterval(async () => {
      // Only poll if the selected peak date is today
      const today = new Date().toISOString().split('T')[0];
      if (peakDate !== today) return;

      try {
        const queryParam = activeLocationId ? `?location_id=${activeLocationId}` : '';
        const separator = queryParam ? '&' : '?';
        const hourlyQuery = `${queryParam}${separator}hours=${peakHours}&date=${peakDate}`;
        
        const hourlyRes = await fetch(`${API_URL}/logs/hourly${hourlyQuery}`);
        if (hourlyRes.ok) {
          const hourlyArray = await hourlyRes.json();
          setHourlyData(hourlyArray);
        }
      } catch (e) {
        console.error("Error fetching historical logs", e);
      }
    }, 60000); // refresh hourly data every minute
    
    return () => {
      clearInterval(liveCountInterval);
      clearInterval(historicalLogsInterval);
    };
  }, [continuousDetection]);

  // Helper: compute median of an array
  const median = (arr) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  };

  const startContinuousDetection = () => {
    if (continuousDetection) return;
    
    setContinuousDetection(true);
    countHistoryRef.current = [];
    console.log('Continuous detection started with BoT-SORT tracking');
    
    // Request-gated detection loop:
    // Fires every 100ms but SKIPS the tick if a request is already in-flight.
    // This prevents the request flooding that caused flickering detections.
    detectionIntervalRef.current = setInterval(async () => {
      // Gate: skip this tick if previous request hasn't returned
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const response = await fetch(`${API_URL}/yolo/next-frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });

        const data = await response.json();
        
        if (response.ok) {
          if (data.frame) {
            setAnnotatedFrame(`data:image/jpeg;base64,${data.frame}`);
          }

          // Count smoothing: sliding-window median over last 5 counts
          const rawCount = data.count || 0;
          countHistoryRef.current.push(rawCount);
          if (countHistoryRef.current.length > 5) {
            countHistoryRef.current.shift();
          }
          const smoothedCount = median(countHistoryRef.current);
          setDetectedCount(smoothedCount);
        } else {
          console.error('Detection API error:', data);
        }
      } catch (error) {
        console.error('Error in continuous detection:', error);
      } finally {
        isFetchingRef.current = false;
      }
    }, 30); // Check every 30ms (maximize pull rate for real-time speed)
  };

  const stopContinuousDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    isFetchingRef.current = false;
    countHistoryRef.current = [];
    setContinuousDetection(false);
    setAnnotatedFrame(null);
    console.log('Continuous detection stopped');
  };

  // Get crowd level based on detected count (10+ people = HIGH for demo)
  const getCrowdLevel = () => {
    if (detectedCount === 0) return { label: 'LOW', color: '#10b981', percentage: 0 };
    if (detectedCount < 5) return { label: 'LOW', color: '#10b981', percentage: 33 };
    if (detectedCount < 10) return { label: 'MODERATE', color: '#f59e0b', percentage: 66 };
    return { label: 'HIGH', color: '#ef4444', percentage: 100 };
  };

  // Scroll to Hidden Gems section
  const scrollToHiddenGems = () => {
    if (hiddenGemsRef.current) {
      hiddenGemsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const crowdLevel = getCrowdLevel();

  useEffect(() => {
    if (crowdLevel.label !== stableCrowdLevel.label) {
      if (levelChangeTimerRef.current) clearTimeout(levelChangeTimerRef.current);
      
      // PRIORITIZE HIGH: If detected level is HIGH, update immediately without delay
      if (crowdLevel.label === 'HIGH') {
        setStableCrowdLevel(crowdLevel);
      } else {
        // For LOW and MODERATE, keep the 3s smoothing to prevent flickering
        levelChangeTimerRef.current = setTimeout(() => {
          setStableCrowdLevel(crowdLevel);
        }, 3000);
      }
    } else {
      if (levelChangeTimerRef.current) clearTimeout(levelChangeTimerRef.current);
    }
    
    return () => {
      if (levelChangeTimerRef.current) clearTimeout(levelChangeTimerRef.current);
    };
  }, [crowdLevel.label, stableCrowdLevel.label]);

  // Helper to get recommendation details
  const getRecommendation = () => {
    switch (stableCrowdLevel.label) {
      case 'HIGH':
        return {
          title: 'CRITICAL RECOMMENDATION',
          text: 'Peak density reached. We recommend exploring nearby "Hidden Gems" with lower crowd levels for a better experience.',
          color: 'red',
          bg: 'bg-red-500/10',
          border: 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]',
          textMuted: 'text-red-500 animate-pulse font-black',
          shadow: 'shadow-[0_0_25px_rgba(239,68,68,0.5)] animate-pulse',
          icon: <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        };
      case 'MODERATE':
        return {
          title: 'Active / Balanced',
          text: 'The area is moderately active. It\'s a good time to visit if you enjoy a lively atmosphere without extreme crowding.',
          color: 'amber',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
          textMuted: 'text-amber-400',
          shadow: 'shadow-[0_0_20px_rgba(245,158,11,0.4)]',
          icon: <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        };
      default:
        return {
          title: 'Optimal Access',
          text: 'Low crowd density detected. This is the perfect time for a visit to enjoy full accessibility and a peaceful environment.',
          color: 'emerald',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
          textMuted: 'text-emerald-400',
          shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.4)]',
          icon: <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        };
    }
  };

  const recommendation = getRecommendation();

  // Format date and time
  const formatDate = () => {
    return currentTime.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Fetch Analytics Data
  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const response = await fetch(`${API_URL}/analytics/distribution?start_date=${startDate}&end_date=${endDate}`);
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (analysisView === 'analytics') {
      fetchAnalytics();
    }
  }, [analysisView, startDate, endDate]);

  const busiestLocation = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) return null;
    return [...analyticsData].sort((a, b) => b.percentage - a.percentage)[0];
  }, [analyticsData]);

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    });
  };




  const maxPeakVal = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return 10;
    const max = Math.max(...hourlyData.map(d => d.value));
    return max > 10 ? max : 10; // Baseline of 10 to prevent huge bars for tiny counts
  }, [hourlyData]);

  return (
    <div className="text-white font-sans selection:bg-[#667eea]/30">
      <div className="animate-fadeInUp">
        <div className="grid grid-cols-1 gap-8 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] lg:grid-cols-[1.5fr_1fr] lg:p-10">
          {/* Left Side - Live Feed */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-3 px-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.8)]"></div>
                <h2 className="m-0 font-black tracking-[2px] text-white uppercase text-sm">System Live Feed</h2>
              </div>
            </div>
            

            <div className="flex flex-wrap items-center gap-3 px-2">
              <button
                onClick={() => { setClaheEnabled(p => !p); updateConfig(!claheEnabled, blurEnabled); }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${
                  claheEnabled 
                  ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] border-transparent text-white shadow-lg shadow-indigo-500/20' 
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                <span>CLAHE</span>
                <span className={`w-1.5 h-1.5 rounded-full ${claheEnabled ? 'bg-white shadow-[0_0_8px_white]' : 'bg-slate-600'}`}></span>
              </button>
              <button
                onClick={() => { setBlurEnabled(p => !p); updateConfig(claheEnabled, !blurEnabled); }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${
                  blurEnabled 
                  ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] border-transparent text-white shadow-lg shadow-indigo-500/20' 
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                <span>Privacy Blur</span>
                <span className={`w-1.5 h-1.5 rounded-full ${blurEnabled ? 'bg-white shadow-[0_0_8px_white]' : 'bg-slate-600'}`}></span>
              </button>

              {/* Location Selector Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all duration-300 border bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 shadow-lg ${showLocationDropdown ? 'bg-white/10 border-white/30' : ''}`}
                >
                  <MapPin className="w-3.5 h-3.5 text-[#667eea]" />
                  <span>{activeLocationName}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showLocationDropdown ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showLocationDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute left-0 mt-2 w-64 z-50 rounded-2xl bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
                    >
                      <div className="p-2 space-y-1">
                        {locations.map(loc => (
                          <button
                            key={loc.id}
                            onClick={() => {
                              handleLocationChange(loc);
                              setShowLocationDropdown(false);
                            }}
                            className={`w-full flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                              activeLocationId === loc.id 
                              ? 'bg-indigo-500/20 border border-indigo-500/30 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                              : 'bg-transparent border border-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <span className="truncate">{loc.name}</span>
                            {activeLocationId === loc.id && (
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="relative aspect-video overflow-hidden rounded-3xl border-4 border-white/5 bg-black shadow-[0_0_40px_rgba(0,0,0,0.5)] group">
              <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-3xl z-10"></div>
              {videoError ? (
                <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white">
                  <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="mb-2 text-center text-xl font-black uppercase tracking-widest text-red-500">System Error</p>
                  <p className="text-center text-slate-400 font-medium">{videoError}</p>
                </div>
              ) : (
                <div className="relative h-full w-full">
                  {annotatedFrame ? (
                    <img
                      src={annotatedFrame}
                      alt="YOLOv8 Detection Feed"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <video
                      key={activeLocationId}
                      ref={videoRef}
                      className="h-full w-full object-cover"
                      src={`/assets/${locations.find(l => l.id === activeLocationId)?.video_filename || 'night_market.mp4'}`}
                      autoPlay
                      loop
                      muted
                      playsInline
                      onError={(e) => {
                        console.error('Video error:', e);
                        setVideoError(`Failed to load video. Please check if the video file exists in public/assets folder.`);
                      }}
                      onLoadedData={() => {
                        console.log('Video loaded successfully');
                        setVideoLoaded(true);
                        if (videoRef.current) {
                          videoRef.current.play().catch(err => console.log('Video play prevented:', err));
                        }
                      }}
                    />
                  )}
                  {/* Subtle overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <div className="absolute bottom-6 left-6 flex items-center gap-3">
                    <div className="px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-[2px]">
                      {activeLocationName}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Persistent System Recommendation */}
            <div className={`mt-4 flex items-center gap-5 rounded-3xl ${recommendation.bg} border ${recommendation.border} px-6 py-5 animate-slideIn transition-all duration-700`}>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-${recommendation.color}-500 text-white ${recommendation.shadow}`}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                  {recommendation.icon}
                </svg>
              </div>
              <div className="flex flex-col gap-1">
                <span className={`text-[11px] font-black uppercase tracking-widest ${recommendation.textMuted}`}>{recommendation.title}</span>
                <p className="text-sm leading-relaxed text-slate-300">
                  {recommendation.text}
                </p>
              </div>
            </div>
          </div>

          {/* Right Side - Detection Overview */}
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-5 px-2">
              <h2 className="m-0 text-[11px] font-black uppercase tracking-[3px] text-slate-500">System Analysis</h2>
              <div className="flex gap-1.5 p-1 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 w-fit">
                {[
                  { id: 'intelligence', label: 'Overview' },
                  { id: 'analytics', label: 'Analytics' },
                  { id: 'logs', label: 'System Logs' }
                ].map(view => (
                  <button
                    key={view.id}
                    onClick={() => setAnalysisView(view.id)}
                    className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 border ${
                      analysisView === view.id 
                        ? 'bg-white/10 text-white border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] scale-105' 
                        : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="min-h-[400px]">
              {analysisView === 'intelligence' && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 animate-fadeIn">
                  {/* Date & Time Card */}
                  <div className="flex flex-col gap-4 rounded-3xl bg-white/5 border border-white/10 p-6 transition-all hover:bg-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#667eea]"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Time</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-slate-300">{formatDate()}</span>
                      <span className="text-2xl font-black tracking-tight text-white">{formatTime()}</span>
                    </div>
                  </div>

                  {/* People Detected Card */}
                  <div className="flex flex-col gap-4 rounded-3xl bg-white/5 border border-white/10 p-6 transition-all hover:bg-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Detections</span>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-black tracking-tighter text-white leading-none">{detectedCount}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 pb-1">PERSONS</span>
                    </div>
                  </div>

                  {/* Crowd Density Engine Card */}
                  <div className="flex flex-col gap-6 rounded-3xl bg-white/5 border border-white/10 p-6 transition-all hover:bg-white/[0.08] sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Crowd Density</span>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        crowdLevel.label === 'HIGH' ? 'text-red-500' : 
                        crowdLevel.label === 'MODERATE' ? 'text-amber-500' : 
                        'text-emerald-500'
                      }`}>
                        {crowdLevel.label} DENSITY
                      </span>
                    </div>
                    <div className="space-y-4">
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/5">
                        <div 
                          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(0,0,0,0.5)] ${
                            crowdLevel.label === 'HIGH' ? 'from-red-500 to-rose-600' : 
                            crowdLevel.label === 'MODERATE' ? 'from-amber-500 to-orange-600' : 
                            'from-emerald-500 to-teal-600'
                          }`}
                          style={{ width: `${crowdLevel.percentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[9px] font-black uppercase tracking-[2px] text-slate-600">
                        <span className={crowdLevel.label === 'LOW' ? 'text-emerald-500' : ''}>Low</span>
                        <span className={crowdLevel.label === 'MODERATE' ? 'text-amber-500' : ''}>Moderate</span>
                        <span className={crowdLevel.label === 'HIGH' ? 'text-red-500' : ''}>High</span>
                      </div>
                    </div>
                  </div>

                  {/* Peak Analysis Card */}
                  <div className="flex flex-col gap-6 rounded-3xl bg-white/5 border border-white/10 p-6 transition-all hover:bg-white/[0.08] sm:col-span-2">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Peak Analysis</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Hour Range Selector */}
                        <div className="flex p-1 bg-black/20 rounded-xl border border-white/5">
                          {[4, 12, 24].map(h => (
                            <button
                              key={h}
                              onClick={() => setPeakHours(h)}
                              className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all ${
                                peakHours === h 
                                  ? 'bg-white/10 text-white shadow-sm' 
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {h}H
                            </button>
                          ))}
                        </div>
                        
                        {/* Date Picker (Calendar) */}
                        <div className="relative group">
                          <input 
                            type="date" 
                            value={peakDate}
                            onChange={(e) => setPeakDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="bg-black/20 text-white text-[9px] font-black uppercase tracking-widest outline-none border border-white/5 rounded-xl px-3 py-1.5 [color-scheme:dark] hover:border-white/20 transition-all cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 items-start pr-2">
                      {/* Y-Axis Labels */}
                      <div className="flex flex-col justify-between h-24 text-[8px] font-black text-slate-600 uppercase tracking-widest mt-10 select-none">
                        <span>{Math.round(maxPeakVal)}</span>
                        <span>{Math.round(maxPeakVal / 2)}</span>
                        <span>0</span>
                      </div>

                      <div className="flex-1 relative overflow-hidden">
                        {/* Grid Lines (Fixed in background) */}
                        <div className="absolute inset-x-0 top-10 h-24 flex flex-col justify-between pointer-events-none z-0">
                          <div className="border-t border-white/5 w-full"></div>
                          <div className="border-t border-white/5 w-full"></div>
                          <div className="border-t border-white/10 w-full"></div>
                        </div>

                        {/* Scrollable Chart Area */}
                        <div className="overflow-x-auto scrollbar-hide relative z-10 w-full">
                          <div className="flex items-end gap-2 min-w-max pt-10 pb-2 px-1">
                            {hourlyData.length > 0 ? (
                              hourlyData.map((data, index) => (
                                <div 
                                  key={index}
                                  className="group relative flex flex-col items-center gap-2 w-8"
                                >
                                  {/* Bar Container (Fixed to Y-axis height) */}
                                  <div className="w-full h-24 flex items-end relative">
                                    <div 
                                      className={`w-full rounded-t-lg transition-all duration-700 ease-out relative group-hover:brightness-125 ${
                                        data.value === 0 
                                          ? 'bg-slate-800/30' 
                                          : 'bg-gradient-to-t from-indigo-600 to-violet-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                                      }`}
                                      style={{ 
                                        height: `${Math.max((data.value / maxPeakVal) * 100, 4)}%`,
                                        minHeight: '4px'
                                      }}
                                    >
                                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-lg bg-indigo-600 px-2 py-1 text-[9px] font-black text-white opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:-top-10 shadow-xl z-20 pointer-events-none">
                                        {data.value}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-indigo-600"></div>
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-[7px] font-black uppercase tracking-tighter text-slate-600 whitespace-nowrap">{data.label}</span>
                                </div>
                              ))
                            ) : (
                              <div className="flex flex-col items-center justify-center w-full h-full gap-2 min-h-[128px]">
                                 <div className="w-1.5 h-1.5 rounded-full bg-slate-800 animate-pulse"></div>
                                 <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">Syncing Trends...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {analysisView === 'analytics' && (
                <div className="flex flex-col gap-6 animate-fadeIn">
                  {/* Analytics Filter */}
                  <div className="flex items-center justify-end gap-3 px-2">
                    <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 border border-white/10">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">From</span>
                      <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent text-white text-[10px] outline-none border-none [color-scheme:dark]"
                      />
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 border border-white/10">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">To</span>
                      <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent text-white text-[10px] outline-none border-none [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  {/* Distribution Chart Card */}
                  <div className="flex flex-col items-center justify-center gap-8 rounded-[32px] bg-white/5 border border-white/10 p-8 min-h-[300px]">
                    {loadingAnalytics ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Syncing Data...</span>
                      </div>
                    ) : analyticsData.length > 0 && analyticsData.some(d => d.percentage > 0) ? (
                      <>
                        <div className="relative w-48 h-48">
                          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                            {analyticsData.reduce((acc, curr, i) => {
                              const startAngle = acc.totalAngle;
                              const sliceAngle = (curr.percentage / 100) * 360;
                              acc.totalAngle += sliceAngle;
                              
                              const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
                              const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
                              const x2 = 50 + 40 * Math.cos(((startAngle + sliceAngle) * Math.PI) / 180);
                              const y2 = 50 + 40 * Math.sin(((startAngle + sliceAngle) * Math.PI) / 180);
                              
                              acc.paths.push(
                                <path
                                  key={curr.name}
                                  d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${sliceAngle > 180 ? 1 : 0} 1 ${x2} ${y2} Z`}
                                  fill={curr.color}
                                  className="transition-all duration-1000 ease-out hover:opacity-80 cursor-pointer"
                                  style={{ filter: `drop-shadow(0 0 5px ${curr.color}44)` }}
                                />
                              );
                              return acc;
                            }, { paths: [], totalAngle: 0 }).paths}
                            <circle cx="50" cy="50" r="25" fill="#0f172a" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center flex-col gap-0.5">
                            <span className="text-xs font-black text-white">Distribution</span>
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Places</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4 w-full px-4">
                          {analyticsData.map(item => (
                            <div key={item.name} className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                                <span className="text-[10px] font-bold text-slate-300">{item.name}</span>
                              </div>
                              <span className="text-[10px] font-black text-white">{item.percentage}%</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-4 py-12">
                        <div className="p-4 bg-white/5 rounded-full border border-white/10">
                          <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A2 2 0 013 15.488V5.83a2 2 0 011.161-1.812L9 2l5 2.5L19 2l5.447 2.724A2 2 0 0121 6.512v9.658a2 2 0 01-1.161 1.812L15 22l-5-2.5-1 0.5z" />
                          </svg>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[3px] text-slate-600">No data for selected period</p>
                      </div>
                    )}
                  </div>

                  {/* Notification Bar */}
                  {busiestLocation && busiestLocation.percentage > 0 && (
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 animate-pulse">
                      <div className="p-2 bg-indigo-500/20 rounded-lg">
                        <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-[11px] font-bold text-indigo-300">
                        {busiestLocation.name} has the highest crowd rate at {busiestLocation.percentage}%
                      </p>
                    </div>
                  )}
                </div>
              )}

              {analysisView === 'logs' && (
                <div className="flex flex-col gap-4 animate-fadeIn">
                  <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Live Activity Feed</span>
                    <div className="flex items-center gap-2">
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {surveillanceLogs.length > 0 ? surveillanceLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 p-4 transition-all hover:bg-white/[0.08]"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-xl ${log.isEvent ? 'bg-indigo-500/10 text-indigo-400' : (log.count >= 10 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400')}`}>
                            {log.isEvent ? (
                              <Settings className="w-3.5 h-3.5" />
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-black text-white uppercase tracking-wider">{log.isEvent ? log.message : (log.location_name || 'Detection Event')}</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{log.time}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          {!log.isEvent ? (
                            <>
                              <span className={`text-sm font-black ${log.count >= 10 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {log.count}
                              </span>
                              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">PEOPLE</span>
                            </>
                          ) : (
                            <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">SYSTEM</span>
                          )}
                        </div>
                      </div>
                    )) : (
                      <div className="flex flex-col items-center gap-4 py-20">
                         <div className="w-10 h-10 border-2 border-indigo-500/10 border-t-indigo-500/40 rounded-full animate-spin"></div>
                         <p className="text-[10px] font-black uppercase tracking-[3px] text-slate-600">Waiting for logs...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveView;

