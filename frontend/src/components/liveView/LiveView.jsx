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
  
  const videoRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const currentFrameRef = useRef(0);
  const hiddenGemsRef = useRef(null);

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

  const addSurveillanceLog = (count) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
    
    const newLog = {
      id: Date.now(),
      time: timeString,
      count: count,
      timestamp: now
    };
    
    setSurveillanceLogs(prev => [newLog, ...prev].slice(0, 10)); // Keep last 10 logs
    
    // Update hourly data
    const hour = now.getHours();
    const hourKey = `${hour}:00`;
    setHourlyData(prev => ({
      ...prev,
      [hourKey]: Math.max(prev[hourKey] || 0, count)
    }));
  };

  const startContinuousDetection = () => {
    if (continuousDetection) return;
    
    setContinuousDetection(true);
    console.log('Continuous detection started');
    
    // Process frames continuously
    detectionIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/yolo/process-frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            frame_number: currentFrameRef.current,
            annotate: true,
            show_overlay: true
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          const currentCount = data.count || 0;
          
          // Update detections in real-time
          setDetectedCount(currentCount);
          
          // Add surveillance log if count changed significantly
          if (Math.abs(currentCount - detectedCount) >= 1) {
            addSurveillanceLog(currentCount);
          }
          
          // Update annotated frame
          if (data.frame) {
            setAnnotatedFrame(`data:image/jpeg;base64,${data.frame}`);
          }
          
          // Move to next frame (process every 10 frames for performance)
          currentFrameRef.current += 10;
          
          // Reset to beginning if we reach the end (loop)
          if (currentFrameRef.current > 1000) {
            currentFrameRef.current = 0;
          }
        } else {
          console.error('Detection API error:', data);
        }
      } catch (error) {
        console.error('Error in continuous detection:', error);
      }
    }, 500); // Process every 500ms for smooth real-time detection
  };

  const stopContinuousDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
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
    <div className="min-h-screen bg-[#f8f9fa] p-4 sm:p-6">
      <div className="mb-8 text-center">
        <h1 className="mb-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
          Live Crowd Monitoring - Baguio City
        </h1>
        <p className="m-0 text-base text-slate-500 sm:text-lg">
          Smart city monitoring for a safer, more organized Baguio.
        </p>
      </div>

      <div className="mx-auto max-w-[1600px]">
        <div className="grid grid-cols-1 gap-8 rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.1)] lg:grid-cols-[1.5fr_1fr] lg:p-8">
          {/* Left Side - Live Feed */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="m-0 text-xl font-semibold text-slate-800">Live Feed</h2>
              <span className="inline-flex items-center gap-2 rounded-md bg-red-500 px-3 py-1.5 text-sm font-semibold text-white animate-pulseSlow">
                ● LIVE
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setClaheEnabled(p => !p); updateConfig(!claheEnabled, blurEnabled); }}
                className={`rounded px-3 py-1 text-xs font-bold transition-colors ${
                  claheEnabled ? 'bg-[#667eea] text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                CLAHE {claheEnabled ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => { setBlurEnabled(p => !p); updateConfig(claheEnabled, !blurEnabled); }}
                className={`rounded px-3 py-1 text-xs font-bold transition-colors ${
                  blurEnabled ? 'bg-[#667eea] text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                Privacy Blur {blurEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
              {videoError ? (
                <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-700 p-8 text-white">
                  <p className="my-2 text-center text-base">{videoError}</p>
                  <p className="my-2 text-center text-base">Please ensure:</p>
                  <ul className="my-4 list-none p-0 text-left">
                    <li className="relative my-2 pl-6 before:absolute before:left-0 before:font-bold before:text-red-500 before:content-['•']">Flask server is running (python server/app.py)</li>
                    <li className="relative my-2 pl-6 before:absolute before:left-0 before:font-bold before:text-red-500 before:content-['•']">demo_video.mp4 is in public/assets folder</li>
                    <li className="relative my-2 pl-6 before:absolute before:left-0 before:font-bold before:text-red-500 before:content-['•']">YOLOv8 dependencies are installed</li>
                  </ul>
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
                </div>
              )}
            </div>

            {/* High Crowd Recommendation */}
            {crowdLevel.label === 'HIGH' && (
              <div className="mt-4 flex items-center gap-4 rounded-lg bg-slate-100 px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                </div>
                <span className="text-sm leading-6 text-slate-500 sm:text-[0.9375rem]">
                  As crowd density is high, nearby locations with lower crowd levels are recommended.
                </span>
              </div>
            )}
          </div>

          {/* Right Side - Detection Overview */}
          <div className="flex flex-col gap-6">
            <h2 className="m-0 mb-2 text-2xl font-bold text-slate-500">Detection Overview</h2>
            
            {/* Date & Time and People Detected Row */}
            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Date & Time Card */}
              <div className="flex flex-col gap-4 rounded-lg bg-slate-100 p-6">
                <span className="text-sm font-semibold text-slate-500">Date & Time</span>
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-bold leading-tight text-[#667eea]">{formatDate()}</span>
                  <span className="text-2xl font-bold leading-tight text-slate-800">{formatTime()}</span>
                </div>
              </div>

              {/* People Detected Card */}
              <div className="flex flex-col gap-4 rounded-lg bg-slate-100 p-6">
                <span className="text-sm font-semibold text-slate-500">People Detected</span>
                <span className="text-5xl font-bold leading-none text-[#667eea]">{detectedCount}</span>
              </div>
            </div>

            {/* Current Status */}
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between gap-4">
                <span className="block text-sm font-semibold text-slate-500">Current Status</span>
                {crowdLevel.label === 'HIGH' && (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 bg-transparent p-0 text-sm font-semibold text-red-500 transition-all hover:text-red-600 hover:underline"
                    onClick={scrollToHiddenGems}
                  >
                    <svg className="h-[18px] w-[18px] animate-warningPulse" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                    <span>View HeatMap</span>
                  </button>
                )}
              </div>
              <div className="w-full">
                <div className="relative mb-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500">
                  <div 
                    className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#667eea] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-[left] duration-300" 
                    style={{ left: `${crowdLevel.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-bold uppercase tracking-[0.5px] text-slate-500">
                  <span className="text-emerald-500">LOW</span>
                  <span className="text-amber-500">MEDIUM</span>
                  <span className="text-red-500">HIGH</span>
                </div>
              </div>
            </div>

            {/* Peak Time Analysis & Surveillance Logs */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Peak Time Analysis */}
              <div className="flex flex-col gap-4">
                <h3 className="m-0 text-sm font-bold text-slate-500">Peak Time Analysis</h3>
                <div className="flex items-stretch gap-2">
                  {/* Y-axis labels */}
                  <div className="flex min-w-[30px] flex-col justify-between py-2">
                    {[20, 15, 10, 5, 0].map(val => (
                      <span key={val} className="text-right text-xs font-medium leading-none text-slate-500">{val}</span>
                    ))}
                  </div>
                  
                  {/* Chart area */}
                  <div className="flex min-h-[180px] flex-1 items-end justify-between gap-2 bg-transparent p-2">
                    {getPeakTimeData().map((data, index) => {
                      const maxValue = 25; // Max value for chart scale
                      const percentage = data.value > 0 ? (data.value / maxValue) * 100 : 5;
                      const isHovered = hoveredBar === index;
                      return (
                        <div key={index} className="flex h-full flex-1 flex-col items-center gap-2">
                          <div 
                            className="relative flex flex-1 w-full cursor-pointer items-end justify-center"
                            onMouseEnter={() => setHoveredBar(index)}
                            onMouseLeave={() => setHoveredBar(null)}
                          >
                            <div 
                              className={`min-h-[5px] w-full max-w-[60px] rounded-t-[4px] bg-[#667eea] transition-all duration-500 animate-barGrow ${isHovered ? 'scale-x-[1.05] bg-[#764ba2] shadow-[0_0_12px_rgba(102,126,234,0.5)]' : ''}`}
                              style={{ height: `${Math.min(percentage, 100)}%` }}
                            />
                            {isHovered && (
                              <div className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-10 -translate-x-1/2 animate-tooltipFadeIn rounded-lg bg-slate-800 px-4 py-3 text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)] whitespace-nowrap after:absolute after:left-1/2 after:top-full after:content-[''] after:-translate-x-1/2 after:border-[6px] after:border-transparent after:border-t-slate-800">
                                <div className="mb-1 text-sm font-bold text-[#667eea]">{`${data.hour}:00`}</div>
                                <div className="mb-1 text-lg font-bold text-white">{data.value} {data.value === 1 ? 'person' : 'people'}</div>
                              </div>
                            )}
                          </div>
                          <span className="pt-1 text-xs font-semibold whitespace-nowrap text-slate-500">{`${data.hour}:00`}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Surveillance Logs */}
              <div className="flex flex-col gap-4">
                <h3 className="m-0 text-sm font-bold text-slate-500">Surveillance Logs</h3>
                <div className="flex max-h-[180px] flex-col gap-2 overflow-y-auto pr-1">
                  {surveillanceLogs.length > 0 ? (
                    surveillanceLogs.map(log => (
                      <div key={log.id} className="flex flex-col gap-1 text-sm animate-slideIn">
                        <span className="text-sm font-medium text-slate-500">{log.time}</span>
                        <span className="text-sm font-normal text-slate-800">Detected {log.count} people</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-sm italic text-slate-400">
                      <span className="text-sm italic text-slate-400">Waiting for detections...</span>
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
