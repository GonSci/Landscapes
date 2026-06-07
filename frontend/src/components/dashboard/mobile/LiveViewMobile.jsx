import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  GitBranch, 
  ChevronDown, 
  AlertTriangle, 
  ArrowRight,
  Users,
  TrendingUp,
  Compass,
  Map,
  LayoutDashboard,
  Settings
} from 'lucide-react';
import BarChartDesktop from '../desktop/BarChartDesktop';
import DonutChartDesktop from '../desktop/DonutChartDesktop';

const getLocalDateString = (d = new Date()) => {
  const local = new Date(d);
  local.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return local.toISOString().split('T')[0];
};

const API_URL = `${import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:5001`}/api`;
const VISION_URL = import.meta.env.VITE_VISION_BASE_URL || `http://${window.location.hostname}:5002`;

const LiveViewMobile = ({ onTabChange, targetLocationId, clearTargetLocation }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  const [locations, setLocations] = useState([]);
  const [activeLocationId, setActiveLocationId] = useState(null);
  const [activeLocationName, setActiveLocationName] = useState('Session Road (Main)');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [claheEnabled, setClaheEnabled] = useState(true);
  const [blurEnabled, setBlurEnabled] = useState(true);
  const [annotatedFrame, setAnnotatedFrame] = useState(null);
  const [videoInitialized, setVideoInitialized] = useState(false);
  const [continuousDetection, setContinuousDetection] = useState(false);
  const [detectedCount, setDetectedCount] = useState(0);
  const [stableCrowdLevel, setStableCrowdLevel] = useState({ label: 'SPARSE', color: '#3b82f6', percentage: 15 });

  const [surveillanceLogs, setSurveillanceLogs] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [analysisView, setAnalysisView] = useState('overview');
  const [analyticsData, setAnalyticsData] = useState([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [peakHours, setPeakHours] = useState(12);
  const [peakDate, setPeakDate] = useState(getLocalDateString());
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getLocalDateString(d);
  });
  const [endDate, setEndDate] = useState(getLocalDateString());

  const dropdownRef = React.useRef(null);
  const heartbeatRef = React.useRef(null);
  const levelChangeTimerRef = React.useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateConfig = async (clahe, blur) => {
    try {
      await fetch(`${VISION_URL}/yolo/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable_clahe: clahe, enable_blur: blur })
      });
    } catch (e) {
      console.error('Failed to update config:', e);
    }
  };

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch(`${API_URL}/locations`);
        if (response.ok) {
          const data = await response.json();
          const noCameraList = [
            'Mt. Cloud Bookshop', 
            'Ili-Likha Arts & Village', 
            'Heritage Hill', 
            'Cafe by the Ruins', 
            'Baguio Orchidarium', 
            'Gypsy Baguio by Chef Waya'
          ];
          const locationsWithCameras = data.filter(loc => !noCameraList.includes(loc.name));
          setLocations(locationsWithCameras);
          
          const targetLoc = targetLocationId ? locationsWithCameras.find(l => l.id === targetLocationId) : null;
          const active = targetLoc || locationsWithCameras.find(l => l.is_active) || locationsWithCameras[0];
          
          if (active) {
            setActiveLocationId(active.id);
            setActiveLocationName(active.name);
            
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
              if (res.ok) {
                setVideoInitialized(true);
                if (clearTargetLocation) clearTargetLocation();
              }
            });
          }
        }
      } catch (e) {
        console.error("Error fetching locations", e);
      }
    };
    fetchLocations();
  }, [targetLocationId, clearTargetLocation]);

  useEffect(() => {
    if (!activeLocationId) return;

    const sendHeartbeat = () => {
      fetch(`${VISION_URL}/set-active-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_id: activeLocationId })
      }).catch(() => {});
    };

    sendHeartbeat();
    heartbeatRef.current = setInterval(sendHeartbeat, 10000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [activeLocationId]);

  const handleLocationChange = async (location) => {
    if (location.id === activeLocationId) return;

    setContinuousDetection(false);
    setAnnotatedFrame(null);
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
      
      if (response.ok) {
        setActiveLocationId(location.id);
        setActiveLocationName(location.name);
        setVideoInitialized(true);
      }
    } catch (error) {
      console.error('Error switching location:', error);
    }
  };

  useEffect(() => {
    if (videoInitialized && !continuousDetection) {
      setContinuousDetection(true);
      setAnnotatedFrame(`${VISION_URL}/video_feed?location_id=${activeLocationId}`);
    }
  }, [videoInitialized, continuousDetection, activeLocationId]);

  const addLocalLog = (count) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    setSurveillanceLogs(prev => [{ id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, time: timeString, count: count }, ...prev].slice(0, 10));
  };

  const fetchHistoricalLogs = async (locId = activeLocationId, hours = peakHours, date = peakDate) => {
    try {
      const queryParam = locId ? `?location_id=${locId}` : '';
      const separator = queryParam ? '&' : '?';
      const [recentRes, hourlyRes] = await Promise.all([
        fetch(`${API_URL}/logs/recent${queryParam}`),
        fetch(`${API_URL}/logs/hourly${queryParam}${separator}hours=${hours}&date=${date}`)
      ]);
      if (recentRes.ok) setSurveillanceLogs(await recentRes.json());
      if (hourlyRes.ok) setHourlyData(await hourlyRes.json());
    } catch (e) { console.error("Error fetching historical logs", e); }
  };

  useEffect(() => {
    if (activeLocationId) {
      fetchHistoricalLogs(activeLocationId, peakHours, peakDate);
    }
  }, [activeLocationId, peakHours, peakDate]);

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const response = await fetch(`${API_URL}/analytics/distribution?start_date=${startDate}&end_date=${endDate}`);
      if (response.ok) setAnalyticsData(await response.json());
    } catch (error) {} finally { setLoadingAnalytics(false); }
  };

  useEffect(() => {
    if (analysisView === 'analytics') {
      fetchAnalytics();
    }
  }, [analysisView, startDate, endDate]);

  const busiestLocation = React.useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) return null;
    return [...analyticsData].sort((a, b) => b.percentage - a.percentage)[0];
  }, [analyticsData]);

  useEffect(() => {
    if (!continuousDetection) return;
    
    const liveCountInterval = setInterval(async () => {
      try {
        const response = await fetch(`${VISION_URL}/live-count?location_id=${activeLocationId}`);
        if (response.ok) {
          const data = await response.json();
          const newCount = data.count || 0;
          setDetectedCount(prevCount => {
            if (prevCount !== newCount) addLocalLog(newCount);
            return newCount;
          });
        }
      } catch (e) {}
    }, 1000);

    const fetchHourly = async () => {
      const today = getLocalDateString();
      if (peakDate !== today) return;
      try {
        const queryParam = activeLocationId ? `?location_id=${activeLocationId}` : '';
        const separator = queryParam ? '&' : '?';
        const hourlyRes = await fetch(`${API_URL}/logs/hourly${queryParam}${separator}hours=${peakHours}&date=${peakDate}`);
        if (hourlyRes.ok) setHourlyData(await hourlyRes.json());
      } catch (e) {}
    };

    fetchHourly();
    const historicalLogsInterval = setInterval(fetchHourly, 15000);
    
    return () => {
      clearInterval(liveCountInterval);
      clearInterval(historicalLogsInterval);
    };
  }, [continuousDetection, activeLocationId, peakHours, peakDate]);

  const locationThresholds = {
    1: { sparse: 2, low: 8, moderate: 14 },
    2: { sparse: 6, low: 22, moderate: 37 },
    3: { sparse: 2, low: 7, moderate: 13 },
    4: { sparse: 2, low: 8, moderate: 14 },
    5: { sparse: 12, low: 39, moderate: 65 },
  };

  const getCrowdLevel = () => {
    const thresholds = locationThresholds[activeLocationId] || { sparse: 2, low: 8, moderate: 14 };
    if (detectedCount <= thresholds.sparse) return { label: 'SPARSE', color: '#3b82f6', percentage: 15 };
    if (detectedCount <= thresholds.low) return { label: 'LOW', color: '#10b981', percentage: 45 };
    if (detectedCount <= thresholds.moderate) return { label: 'MODERATE', color: '#f59e0b', percentage: 75 };
    return { label: 'HIGH', color: '#ef4444', percentage: 100 };
  };

  const crowdLevel = getCrowdLevel();

  useEffect(() => {
    if (crowdLevel.label !== stableCrowdLevel.label) {
      if (levelChangeTimerRef.current) clearTimeout(levelChangeTimerRef.current);
      if (crowdLevel.label === 'HIGH') {
        setStableCrowdLevel(crowdLevel);
      } else {
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

  const getRecommendation = () => {
    switch (stableCrowdLevel.label) {
      case 'HIGH':
        return {
          title: 'CRITICAL RECOMMENDATION',
          text: `Density at ${activeLocationName} has reached peak capacity. Recommend immediate redirection of foot traffic.`,
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          textMuted: 'text-red-400',
          iconColor: 'text-red-400'
        };
      case 'MODERATE':
        return {
          title: 'Active Environment',
          text: `The area is moderately active. It's a good time to visit if you enjoy a lively atmosphere.`,
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          textMuted: 'text-amber-400',
          iconColor: 'text-amber-400'
        };
      case 'LOW':
        return {
          title: 'Optimal Access',
          text: `Low crowd density detected. Perfect time for a visit to enjoy a peaceful environment.`,
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          textMuted: 'text-emerald-400',
          iconColor: 'text-emerald-400'
        };
      default:
        return {
          title: 'Minimal Crowd',
          text: `Crowd density is sparse. Excellent time for uninterrupted viewing and minimal foot traffic.`,
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          textMuted: 'text-blue-400',
          iconColor: 'text-blue-400'
        };
    }
  };

  const recommendation = getRecommendation();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = () => {
    return currentTime.toLocaleDateString('en-US', { 
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
      hour12: false
    }) + " PST";
  };

  const dummyHourlyData = [
    { label: '10am', value: 12 },
    { label: '11am', value: 18 },
    { label: '12pm', value: 25 },
    { label: '1pm', value: 32 },
    { label: '2pm', value: 28 },
    { label: '3pm', value: 22 }
  ];

  return (
    <div className="min-h-screen bg-[#0d111c] text-white pb-24 overflow-y-auto flex flex-col font-sans">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-[#0d111c]/95 backdrop-blur-md pt-[76px] pb-4 px-4 w-full border-b border-white/5">
        <div className="mx-auto bg-[#1a1e2d] rounded-full p-1 border border-white/5 flex shadow-lg">
          <button 
            onClick={() => onTabChange && onTabChange('live')}
            className="flex-1 py-2 text-xs font-medium bg-indigo-500/20 text-indigo-300 rounded-full flex items-center justify-center gap-2"
          >
            <Activity size={14} />
            LIVE MONITORING
          </button>
          <button 
            onClick={() => onTabChange && onTabChange('redirection')}
            className="flex-1 py-2 text-xs font-medium text-slate-400 flex items-center justify-center gap-2 rounded-full hover:bg-white/5"
          >
            <GitBranch size={14} />
            SMART REDIRECTION
          </button>
        </div>
      </div>

      {/* Video Feed & Controls Layer */}
      <div className="mt-4 px-4 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
        <h2 className="text-xs font-bold tracking-wider text-white uppercase">SYSTEM LIVE FEED</h2>
      </div>

      <div className="px-4 mt-3 flex gap-2 overflow-x-visible overflow-y-hidden [&::-webkit-scrollbar]:hidden py-1">
        <button 
          onClick={() => { setClaheEnabled(p => !p); updateConfig(!claheEnabled, blurEnabled); }}
          className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap border transition-colors ${
            claheEnabled 
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' 
              : 'bg-white/5 text-slate-400 border-white/10'
          }`}
        >
          CLAHE
        </button>
        <button 
          onClick={() => { setBlurEnabled(p => !p); updateConfig(claheEnabled, !blurEnabled); }}
          className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap border transition-colors ${
            blurEnabled 
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' 
              : 'bg-white/5 text-slate-400 border-white/10'
          }`}
        >
          PRIVACY BLUR
        </button>

        <div className="relative flex-shrink-0">
          <button className="bg-white/5 text-slate-300 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap border border-white/10 flex items-center gap-1 w-full h-full">
            <span className="w-1.5 h-1.5 rounded-full bg-white mr-1 shadow-[0_0_8px_white]"></span>
            {activeLocationName}
            <ChevronDown size={14} className="ml-1 text-slate-500" />
          </button>

          <select 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            value={activeLocationId || ''}
            onChange={(e) => {
              const loc = locations.find(l => String(l.id) === String(e.target.value));
              if (loc) handleLocationChange(loc);
            }}
          >
            {locations.map(loc => (
              <option key={loc.id} value={loc.id} className="text-black bg-white">
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mx-4 mt-4 aspect-video bg-black rounded-xl border border-white/10 relative overflow-hidden flex items-center justify-center">
        {annotatedFrame ? (
          <img 
            src={annotatedFrame} 
            alt="Live Feed" 
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Connecting...</span>
          </div>
        )}
        {/* Placeholder for YOLO bounding boxes overlay - static mockup */}
        <div className="absolute inset-0 border-[0.5px] border-emerald-500/30 opacity-50 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        
        <div className="absolute bottom-3 left-3 bg-black/70 text-[10px] px-2 py-1 rounded font-mono font-bold flex items-center gap-1.5 border border-white/10">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
          REC - SESSION ROAD
        </div>
      </div>

      {/* Dynamic Alert Card */}
      <div className={`mx-4 mt-4 p-4 rounded-xl border ${recommendation.border} ${recommendation.bg} flex flex-col gap-3 transition-colors duration-500`}>
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} className={recommendation.iconColor} />
          <h3 className={`${recommendation.textMuted} font-bold text-sm tracking-wide`}>{recommendation.title}</h3>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          {recommendation.text}
        </p>
        
        {stableCrowdLevel.label === 'HIGH' && (
          <button 
            onClick={() => onTabChange && onTabChange('redirection')}
            className="w-full mt-1 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 flex items-center justify-center gap-2 font-medium text-xs tracking-wider uppercase transition-colors active:bg-red-500/20"
          >
            SHOW ALTERNATIVE PLACES <ArrowRight size={14} />
          </button>
        )}
      </div>

      {/* System Analysis & Data Section */}
      <h2 className="px-4 mt-8 mb-3 text-xs font-bold tracking-widest text-slate-400 uppercase">SYSTEM ANALYSIS</h2>
      
      <div className="px-4 mb-4 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
        {[
          { id: 'overview', label: 'OVERVIEW' },
          { id: 'analytics', label: 'ANALYTICS' },
          { id: 'logs', label: 'SYSTEM LOGS' }
        ].map(view => (
          <button
            key={view.id}
            onClick={() => setAnalysisView(view.id)}
            className={`rounded-lg px-4 py-2 text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
              analysisView === view.id 
                ? 'bg-white/10 text-white shadow-sm' 
                : 'bg-transparent text-slate-400'
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {analysisView === 'overview' && (
        <div className="animate-fadeIn">
          <div className="px-4 grid grid-cols-2 gap-3 mb-3">
            <div className="bg-[#1a1e2d] rounded-xl border border-white/5 p-4 flex flex-col justify-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">DATE &amp; TIME</div>
              <div className="text-sm font-bold text-white mb-0.5">{formatDate()}</div>
              <div className="text-xs text-slate-400 font-mono">{formatTime()}</div>
            </div>
            
            <div className="bg-[#1a1e2d] rounded-xl border border-white/5 p-4 flex flex-col justify-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                TOTAL DETECTIONS
                <Users size={12} className="text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{detectedCount}</span>
                <span className="text-[9px] font-bold text-slate-500 flex items-center uppercase tracking-widest">
                  PERSONS
                </span>
              </div>
            </div>
          </div>

          <div className="mx-4 mb-3 p-4 bg-[#1a1e2d] rounded-xl border border-white/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CROWD DENSITY</div>
              <div className={`${recommendation.bg} ${recommendation.textMuted} text-[10px] font-bold px-2 py-0.5 rounded border ${recommendation.border}`}>
                {stableCrowdLevel.label} DENSITY
              </div>
            </div>
            
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className="h-2.5 rounded-full relative transition-all duration-1000 ease-out" 
                style={{ 
                  width: `${stableCrowdLevel.percentage}%`,
                  backgroundColor: stableCrowdLevel.color
                }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:10px_10px]"></div>
              </div>
            </div>
            
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Optimal (&lt; 50%)</span>
              <span>Capacity (100%)</span>
            </div>
          </div>

          {/* Peak Analysis Graph */}
          <div className="mx-4 mt-3 p-4 bg-[#1a1e2d] rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]"></div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PEAK ANALYSIS</div>
              </div>
              <div className="flex bg-black/20 rounded-lg border border-white/5 p-0.5">
                {[4, 12, 24].map(h => (
                  <button
                    key={h}
                    onClick={() => setPeakHours(h)}
                    className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all ${
                      peakHours === h 
                        ? 'bg-white/10 text-white shadow-sm' 
                        : 'text-slate-500'
                    }`}
                  >
                    {h}H
                  </button>
                ))}
              </div>
            </div>
            <div className="w-full h-[180px]">
              <BarChartDesktop data={hourlyData} />
            </div>
          </div>
        </div>
      )}

      {analysisView === 'analytics' && (
        <div className="mx-4 animate-fadeIn flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 bg-[#1a1e2d] rounded-xl border border-white/5 p-3">
            <div className="flex flex-col gap-1 w-full">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">From</span>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-white text-[10px] outline-none border-none [color-scheme:dark] w-full"
              />
            </div>
            <div className="w-px h-8 bg-white/10 shrink-0"></div>
            <div className="flex flex-col gap-1 w-full">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">To</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-white text-[10px] outline-none border-none [color-scheme:dark] w-full"
              />
            </div>
          </div>
          <div className="bg-[#1a1e2d] rounded-xl border border-white/5 p-4 min-h-[300px] flex items-center justify-center">
            {loadingAnalytics ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Syncing Data...</span>
              </div>
            ) : (
              <DonutChartDesktop data={analyticsData} busiestLocation={busiestLocation} />
            )}
          </div>
        </div>
      )}

      {analysisView === 'logs' && (
        <div className="mx-4 animate-fadeIn space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pb-10">
          {surveillanceLogs.length > 0 ? surveillanceLogs.map((log) => {
            const isHigh = log.count > (locationThresholds[activeLocationId]?.moderate || 14);
            const isMod = log.count > (locationThresholds[activeLocationId]?.low || 8);
            const isLow = log.count > (locationThresholds[activeLocationId]?.sparse || 2);
            
            const style = log.isEvent ? null : {
              bg: isHigh ? 'bg-red-500/10' : isMod ? 'bg-amber-500/10' : isLow ? 'bg-emerald-500/10' : 'bg-blue-500/10',
              iconColor: isHigh ? 'text-red-400' : isMod ? 'text-amber-400' : isLow ? 'text-emerald-400' : 'text-blue-400',
              textColor: isHigh ? 'text-red-500' : isMod ? 'text-amber-500' : isLow ? 'text-emerald-500' : 'text-blue-500'
            };

            return (
              <div key={log.id} className="flex items-center justify-between rounded-xl bg-[#1a1e2d] border border-white/5 p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${log.isEvent ? 'bg-indigo-500/10 text-indigo-400' : `${style.bg} ${style.iconColor}`}`}>
                    {log.isEvent ? <Settings className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">{log.isEvent ? log.message : (log.location_name || activeLocationName)}</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{log.time}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  {!log.isEvent ? (
                    <>
                      <span className={`text-sm font-black ${style.textColor}`}>{log.count}</span>
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">PEOPLE</span>
                    </>
                  ) : (
                    <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">SYSTEM</span>
                  )}
                </div>
              </div>
            );
          }) : (
            <div className="flex flex-col items-center gap-4 py-10 bg-[#1a1e2d] rounded-xl border border-white/5">
              <div className="w-8 h-8 border-2 border-indigo-500/10 border-t-indigo-500/40 rounded-full animate-spin"></div>
              <p className="text-[10px] font-black uppercase tracking-[3px] text-slate-600">Waiting for logs...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveViewMobile;
