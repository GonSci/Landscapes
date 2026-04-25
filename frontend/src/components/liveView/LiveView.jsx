import React, { useState, useEffect, useRef } from 'react';
import Redirection from './Redirection';

const API_URL = 'http://localhost:5001/api';

const LiveView = () => {
  const [detectedCount, setDetectedCount] = useState(0);
  const [videoInitialized, setVideoInitialized] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [continuousDetection, setContinuousDetection] = useState(false);
  const [annotatedFrame, setAnnotatedFrame] = useState(null);
  const [surveillanceLogs, setSurveillanceLogs] = useState([]);
  const [hourlyData, setHourlyData] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredBar, setHoveredBar] = useState(null);
  const [claheEnabled, setClaheEnabled] = useState(true);
  const [blurEnabled, setBlurEnabled]   = useState(true);
  const [stableCrowdLevel, setStableCrowdLevel] = useState({ label: 'LOW', color: '#10b981', percentage: 33 });
  const levelChangeTimerRef = useRef(null);
  
  const videoRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const currentFrameRef = useRef(0);
  const hiddenGemsRef = useRef(null);
  // Request gating: prevents firing a new request while one is in-flight
  const isFetchingRef = useRef(false);
  // Count smoothing: sliding window of recent counts for median calculation
  const countHistoryRef = useRef([]);

  const updateConfig = async (clahe, blur) => {
    await fetch(`${API_URL}/yolo/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable_clahe: clahe, enable_blur: blur })
    });
  };

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Start continuous detection when video loads
  useEffect(() => {
    if (videoLoaded && videoInitialized && !continuousDetection) {
      console.log('Starting automatic continuous detection...');
      startContinuousDetection();
    }
  }, [videoLoaded, videoInitialized]);

  // Initialize YOLOv8 on component mount
  useEffect(() => {
    const initializeYOLO = async () => {
      try {
        const response = await fetch(`${API_URL}/yolo/initialize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            video: 'demo_video.mp4',
            conf_threshold: 0.5,
            iou_threshold: 0.45,
            use_gpu: true
          })
        });
        
        const data = await response.json();
        if (response.ok) {
          setVideoInitialized(true);
          console.log('YOLOv8 initialized:', data);
        } else {
          setVideoError(data.error || 'Failed to initialize YOLOv8');
          console.error('Initialization error:', data);
        }
      } catch (error) {
        setVideoError('Cannot connect to backend server. Please start the Flask server.');
        console.error('Error initializing YOLOv8:', error);
      }
    };

    initializeYOLO();

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  // Fetch historical logs on mount
  useEffect(() => {
    const fetchHistoricalLogs = async () => {
      try {
        const [recentRes, hourlyRes] = await Promise.all([
          fetch(`${API_URL}/logs/recent`),
          fetch(`${API_URL}/logs/hourly`)
        ]);
        if (recentRes.ok) {
          const recent = await recentRes.json();
          setSurveillanceLogs(recent);
        }
        if (hourlyRes.ok) {
          const hourlyArray = await hourlyRes.json();
          const newHourlyData = {};
          hourlyArray.forEach(item => {
            newHourlyData[item.label] = item.value;
          });
          setHourlyData(newHourlyData);
        }
      } catch (e) {
        console.error("Error fetching historical logs", e);
      }
    };
    fetchHistoricalLogs();
  }, []);

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
      id: `local-${Date.now()}`,
      time: timeString,
      count: count
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
      try {
        const hourlyRes = await fetch(`${API_URL}/logs/hourly`);
        if (hourlyRes.ok) {
          const hourlyArray = await hourlyRes.json();
          const newHourlyData = {};
          hourlyArray.forEach(item => {
            newHourlyData[item.label] = item.value;
          });
          setHourlyData(newHourlyData);
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
    if (detectedCount < 10) return { label: 'MEDIUM', color: '#f59e0b', percentage: 66 };
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
        // For LOW and MEDIUM, keep the 3s smoothing to prevent flickering
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
      case 'MEDIUM':
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

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    });
  };

  // Get peak time data for bar chart - one hour intervals
  const getPeakTimeData = () => {
    const currentHour = currentTime.getHours();
    const hours = [];
    
    // Get last 4 hours of data (handle midnight wrapping)
    for (let i = 3; i >= 0; i--) {
      let hour = currentHour - i;
      // Handle negative hours (wrap to previous day)
      if (hour < 0) {
        hour = 24 + hour;
      }
      hours.push(hour);
    }
    
    return hours.map((hour, index) => {
      const hourKey = `${hour}:00`;
      const value = hourlyData[hourKey] || 0;
      return {
        label: `${hour}:00`,
        value: value,
        hour: hour
      };
    });
  };



  return (
    <div className="min-h-screen bg-[#0a0f1e] p-4 sm:p-6 text-white font-sans selection:bg-[#667eea]/30">
      <div className="mb-10 text-center animate-fadeInDown">
        <h1 className="mb-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-4xl font-black text-transparent sm:text-5xl lg:text-6xl tracking-tight leading-tight">
          Live Crowd Monitoring
        </h1>
        <p className="mx-auto max-w-2xl text-base text-slate-400 sm:text-lg font-medium opacity-80">
          Smart city monitoring with real-time YOLOv8 detection.
        </p>
      </div>

      <div className="mx-auto max-w-[1600px] animate-fadeInUp">
        <div className="grid grid-cols-1 gap-8 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] lg:grid-cols-[1.5fr_1fr] lg:p-10">
          {/* Left Side - Live Feed */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-3 px-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.8)]"></div>
                <h2 className="m-0 text-2xl font-black tracking-tight text-white uppercase tracking-[2px] text-sm">System Live Feed</h2>
              </div>
              <span className="px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-[11px] font-black tracking-widest text-red-400">
                STABLE CONNECTION
              </span>
            </div>
            
            <div className="flex gap-3 px-2">
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
                      ref={videoRef}
                      className="h-full w-full object-cover"
                      src="/assets/demo_video.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      onError={(e) => {
                        console.error('Video error:', e);
                        setVideoError('Failed to load video. Please check if demo_video.mp4 exists in public/assets folder.');
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
                      CAM-01 / NORTH-WING
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
            <h2 className="m-0 text-[11px] font-black uppercase tracking-[3px] text-slate-500 px-2">Analysis Intelligence</h2>
            
            {/* Cards Row */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Date & Time Card */}
              <div className="flex flex-col gap-4 rounded-3xl bg-white/5 border border-white/10 p-6 transition-all hover:bg-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#667eea]"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Temporal</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-slate-300">{formatDate()}</span>
                  <span className="text-3xl font-black tracking-tight text-white">{formatTime()}</span>
                </div>
              </div>

              {/* People Detected Card */}
              <div className="flex flex-col gap-4 rounded-3xl bg-white/5 border border-white/10 p-6 transition-all hover:bg-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Detections</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-black tracking-tighter text-white leading-none">{detectedCount}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 pb-1">PERSONS</span>
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div className="px-2">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#667eea]"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Crowd Density Engine</span>
                </div>
                {crowdLevel.label === 'HIGH' && (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-500 transition-all hover:text-red-400 group"
                    onClick={scrollToHiddenGems}
                  >
                    <svg className="h-4 w-4 animate-warningPulse" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                    <span>View Map Analysis</span>
                  </button>
                )}
              </div>
              <div className="w-full">
                <div className="relative mb-4 h-2.5 rounded-full bg-white/5 border border-white/5 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 opacity-20"></div>
                  <div 
                    className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(0,0,0,0.5)] ${
                      crowdLevel.label === 'HIGH' ? 'from-red-500 to-rose-600' : 
                      crowdLevel.label === 'MEDIUM' ? 'from-amber-500 to-orange-600' : 
                      'from-emerald-500 to-teal-600'
                    }`}
                    style={{ width: `${crowdLevel.percentage}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-[0_0_10px_white] scale-75 opacity-50"></div>
                  </div>
                </div>
                <div className="flex justify-between text-[9px] font-black uppercase tracking-[2px] text-slate-600">
                  <span className={crowdLevel.label === 'LOW' ? 'text-emerald-500' : ''}>Safe / Low</span>
                  <span className={crowdLevel.label === 'MEDIUM' ? 'text-amber-500' : ''}>Active / Medium</span>
                  <span className={crowdLevel.label === 'HIGH' ? 'text-red-500' : ''}>Peak / High</span>
                </div>
              </div>
            </div>

            {/* Peak Time Analysis & Surveillance Logs */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Peak Time Analysis */}
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#667eea]"></div>
                  <h3 className="m-0 text-[10px] font-black uppercase tracking-widest text-slate-500">Peak Analysis</h3>
                </div>
                <div className="flex items-stretch gap-4">
                  {/* Y-axis labels */}
                  <div className="flex min-w-[25px] flex-col justify-between py-1">
                    {[20, 15, 10, 5, 0].map(val => (
                      <span key={val} className="text-right text-[9px] font-black text-slate-600">{val}</span>
                    ))}
                  </div>
                  
                  {/* Chart area */}
                  <div className="flex min-h-[320px] flex-1 items-end justify-between gap-3 bg-white/5 rounded-2xl p-6 border border-white/5">
                    {getPeakTimeData().map((data, index) => {
                      const maxValue = 25; 
                      const percentage = data.value > 0 ? (data.value / maxValue) * 100 : 5;
                      const isHovered = hoveredBar === index;
                      return (
                        <div key={index} className="flex h-full flex-1 flex-col items-center gap-3">
                          <div 
                            className="relative flex flex-1 w-full cursor-pointer items-end justify-center"
                            onMouseEnter={() => setHoveredBar(index)}
                            onMouseLeave={() => setHoveredBar(null)}
                          >
                            <div 
                              className={`min-h-[4px] w-full max-w-[32px] rounded-full bg-gradient-to-t from-[#667eea]/40 to-[#667eea] transition-all duration-700 ease-out animate-barGrow ${isHovered ? 'scale-x-[1.2] from-[#667eea] to-[#764ba2] shadow-[0_0_20px_rgba(102,126,234,0.6)]' : ''}`}
                              style={{ height: `${Math.min(percentage, 100)}%` }}
                            />
                            {isHovered && (
                              <div className="pointer-events-none absolute bottom-[calc(100%+0.75rem)] left-1/2 z-20 -translate-x-1/2 animate-tooltipFadeIn rounded-xl bg-slate-900/90 backdrop-blur-xl border border-white/10 px-4 py-3 text-white shadow-2xl whitespace-nowrap">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[#667eea] mb-1">{data.hour}:00</div>
                                <div className="text-lg font-black">{data.value} People</div>
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] font-black text-slate-500 tracking-tighter">{data.hour}:00</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Surveillance Logs */}
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#667eea]"></div>
                  <h3 className="m-0 text-[10px] font-black uppercase tracking-widest text-slate-500">Live Activity Log</h3>
                </div>
                <div className="flex max-h-[320px] flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
                  {surveillanceLogs.length > 0 ? (
                    surveillanceLogs.map((log, i) => (
                      <div key={log.id} className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 animate-slideIn" style={{ animationDelay: `${i * 50}ms` }}>
                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{log.time}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-black text-white">{log.count}</span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Detected</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-10 opacity-30">
                      <div className="w-8 h-8 rounded-full border-2 border-slate-500 border-t-transparent animate-spin mb-3"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Syncing Feed...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden Gems Nearby Section */}
        <Redirection ref={hiddenGemsRef} />
      </div>
      </div>
  );
};

export default LiveView;
