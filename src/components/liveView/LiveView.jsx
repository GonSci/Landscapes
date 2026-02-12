import React, { useState, useEffect, useRef } from 'react';
import './LiveView.css';

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
  
  const videoRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const currentFrameRef = useRef(0);

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

  // Get crowd level based on detected count
  const getCrowdLevel = () => {
    if (detectedCount === 0) return { label: 'LOW', color: '#10b981', percentage: 0 };
    if (detectedCount < 150) return { label: 'LOW', color: '#10b981', percentage: 33 };
    if (detectedCount < 300) return { label: 'MEDIUM', color: '#f59e0b', percentage: 66 };
    return { label: 'HIGH', color: '#ef4444', percentage: 100 };
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

  // Calculate prediction based on hourly data trend
  const getPrediction = () => {
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    
    // If we have hourly data, find the peak
    if (Object.keys(hourlyData).length > 0) {
      let maxCount = 0;
      let peakHour = currentHour;
      
      Object.entries(hourlyData).forEach(([time, count]) => {
        if (count > maxCount) {
          maxCount = count;
          peakHour = parseInt(time.split(':')[0]);
        }
      });
      
      // Calculate minutes until peak
      let hoursUntilPeak = peakHour - currentHour;
      if (hoursUntilPeak < 0) {
        hoursUntilPeak += 24; // Handle next day
      }
      
      const minutesUntilPeak = (hoursUntilPeak * 60) - currentMinute;
      
      // Show prediction if peak is in the future within 3 hours
      if (minutesUntilPeak > 0 && minutesUntilPeak <= 180) {
        return {
          minutes: Math.round(minutesUntilPeak),
          expectedCount: Math.round(maxCount)
        };
      }
    }
    
    // Default prediction based on current trend (estimate 30% increase in next hour)
    const estimatedPeak = Math.max(detectedCount, 10); // At least show 10
    const estimatedIncrease = Math.round(estimatedPeak * 1.3);
    
    return {
      minutes: 45,
      expectedCount: estimatedIncrease
    };
  };

  const prediction = getPrediction();

  return (
    <div className="live-view-container">
      <div className="live-view-header">
        <h1 className="live-view-title">Live Crowd Monitoring - Baguio City</h1>
        <p className="live-view-subtitle">Smart city monitoring for a safer, more organized Baguio.</p>
      </div>

      <div className="live-view-content">
        <div className="main-grid">
          {/* Left Side - Live Feed */}
          <div className="live-feed-section">
            <div className="panel-header">
              <h2 className="panel-title">Live Feed</h2>
              <span className="live-indicator">● LIVE</span>
            </div>
            <div className="video-feed">
              {videoError ? (
                <div className="video-error">
                  <p>{videoError}</p>
                  <p>Please ensure:</p>
                  <ul>
                    <li>Flask server is running (python server/app.py)</li>
                    <li>demo_video.mp4 is in public/assets folder</li>
                    <li>YOLOv8 dependencies are installed</li>
                  </ul>
                </div>
              ) : (
                <div className="video-container">
                  {annotatedFrame ? (
                    <img
                      src={annotatedFrame}
                      alt="YOLOv8 Detection Feed"
                      className="video-element"
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      className="video-element"
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

            {/* Prediction Statement */}
            <div className="prediction-container">
              <div className="prediction-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </div>
              <span className="prediction-text">
                Prediction: Crowd expected to peak in {prediction.minutes} minutes (approx. {prediction.expectedCount} people).
              </span>
            </div>
          </div>

          {/* Right Side - Detection Overview */}
          <div className="detection-overview-section">
            <h2 className="section-title">Detection Overview</h2>
            
            {/* Date & Time and People Detected Row */}
            <div className="overview-top-row">
              {/* Date & Time Card */}
              <div className="overview-card">
                <span className="card-label">Date & Time</span>
                <div className="card-value-group">
                  <span className="card-value primary">{formatDate()}</span>
                  <span className="card-value secondary">{formatTime()}</span>
                </div>
              </div>

              {/* People Detected Card */}
              <div className="overview-card">
                <span className="card-label">People Detected</span>
                <span className="card-value count">{detectedCount}</span>
              </div>
            </div>

            {/* Current Status */}
            <div className="overview-section">
              <span className="section-label">Current Status</span>
              <div className="status-gradient-container">
                <div className="status-gradient-bar">
                  <div 
                    className="status-indicator" 
                    style={{ left: `${crowdLevel.percentage}%` }}
                  />
                </div>
                <div className="status-labels">
                  <span className="status-label">LOW</span>
                  <span className="status-label">MEDIUM</span>
                  <span className="status-label">HIGH</span>
                </div>
              </div>
            </div>

            {/* Peak Time Analysis & Surveillance Logs */}
            <div className="overview-bottom">
              {/* Peak Time Analysis */}
              <div className="peak-time-section">
                <h3 className="subsection-title">Peak Time Analysis</h3>
                <div className="peak-chart-wrapper">
                  {/* Y-axis labels */}
                  <div className="chart-y-axis">
                    {[20, 15, 10, 5, 0].map(val => (
                      <span key={val} className="y-axis-label">{val}</span>
                    ))}
                  </div>
                  
                  {/* Chart area */}
                  <div className="peak-chart">
                    {getPeakTimeData().map((data, index) => {
                      const maxValue = 25; // Max value for chart scale
                      const percentage = data.value > 0 ? (data.value / maxValue) * 100 : 5;
                      const isHovered = hoveredBar === index;
                      return (
                        <div key={index} className="chart-bar-group">
                          <div 
                            className="chart-bar-container"
                            onMouseEnter={() => setHoveredBar(index)}
                            onMouseLeave={() => setHoveredBar(null)}
                          >
                            <div 
                              className={`chart-bar ${isHovered ? 'hovered' : ''}`}
                              style={{ height: `${Math.min(percentage, 100)}%` }}
                            />
                            {isHovered && (
                              <div className="chart-tooltip">
                                <div className="tooltip-time">{`${data.hour}:00`}</div>
                                <div className="tooltip-count">{data.value} {data.value === 1 ? 'person' : 'people'}</div>
                              </div>
                            )}
                          </div>
                          <span className="chart-bar-label">{`${data.hour}:00`}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Surveillance Logs */}
              <div className="surveillance-logs-section">
                <h3 className="subsection-title">Surveillance Logs</h3>
                <div className="logs-container">
                  {surveillanceLogs.length > 0 ? (
                    surveillanceLogs.map(log => (
                      <div key={log.id} className="log-entry">
                        <span className="log-time">{log.time}</span>
                        <span className="log-text">Detected {log.count} people</span>
                      </div>
                    ))
                  ) : (
                    <div className="log-entry empty">
                      <span className="log-message">Waiting for detections...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveView;
