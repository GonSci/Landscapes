import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import baguioData from '../../data/baguio_locations.json';
import redirectionFallback from '../../data/redirection_fallback_locations.json';
import { useLiveLocations } from '../../hooks/useLiveLocations';

const Redirection = React.forwardRef(({ redirectionLocationId }, ref) => {
  const [baguioLocations, setBaguioLocations] = useState([]);
  const [hoveredLocation, setHoveredLocation] = useState(null);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [maxTravelTime, setMaxTravelTime] = useState(15);
  const [travelMode, setTravelMode] = useState('walking');
  const [groupSize, setGroupSize] = useState(1);
  const [priorityWeight, setPriorityWeight] = useState(0.5);
  const [environment, setEnvironment] = useState('any');
  const [paidAttractions, setPaidAttractions] = useState(false);
  const [placeCategory, setPlaceCategory] = useState('any');
  const [isTravelModeOpen, setIsTravelModeOpen] = useState(false);
  const [isPlaceCategoryOpen, setIsPlaceCategoryOpen] = useState(false);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState('preferences');
  const [topsisResults, setTopsisResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const markerRefs = useRef({});
  const mapRef = useRef(null);
  const travelModeRef = useRef(null);
  const placeCategoryRef = useRef(null);
  const locationDropdownRef = useRef(null);


  // Handle clicking outside the location dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target)) {
        setIsLocationDropdownOpen(false);
      }
    };

    if (isLocationDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isLocationDropdownOpen]);

  // Load Baguio locations for Hidden Gems section
  useEffect(() => {
    setBaguioLocations(baguioData.locations);
  }, []);

  // Handle clicking outside the travel mode dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (travelModeRef.current && !travelModeRef.current.contains(event.target)) {
        setIsTravelModeOpen(false);
      }
    };

    if (isTravelModeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isTravelModeOpen]);

  // Handle clicking outside the place category dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (placeCategoryRef.current && !placeCategoryRef.current.contains(event.target)) {
        setIsPlaceCategoryOpen(false);
      }
    };

    if (isPlaceCategoryOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isPlaceCategoryOpen]);

  // Get live locations from database for interactive map
  const { locations: liveLocations } = useLiveLocations();
  // Use fallback locations if database locations are empty or not loaded
  // NOTE: show all available locations (not limited to 1-5) so places
  // without camera footage can still appear on the redirection map.
  const mapLocations = (liveLocations && liveLocations.length > 0)
    ? liveLocations
    : redirectionFallback.locations;

  // Synchronization with redirectionLocationId from Live View
  useEffect(() => {
    console.log('[Redirection] Received redirectionLocationId:', redirectionLocationId);
    if (redirectionLocationId !== null) {
      setSelectedLocationId(redirectionLocationId);
      // Wait for map to be ready
      const timer = setTimeout(() => {
        const location = mapLocations.find(loc => loc.id === redirectionLocationId);
        console.log('[Redirection] Centering map on:', location?.name);
        if (location && mapRef.current) {
          mapRef.current.setView([location.lat, location.lng], 17);
          if (markerRefs.current[location.id]) {
            markerRefs.current[location.id].openPopup();
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [redirectionLocationId, mapLocations]);

  // Fit map to show all markers on initial load only
  useEffect(() => {
    if (mapRef.current && mapLocations && mapLocations.length > 0) {
      setTimeout(() => {
        try {
          const bounds = L.latLngBounds(mapLocations.map(loc => [loc.lat, loc.lng]));
          mapRef.current.fitBounds(bounds, { padding: [30, 30] });
        } catch (e) {
          console.error('Error fitting bounds:', e);
        }
      }, 300);
    }
  }, []);

  // Handle location card hover
  const handleLocationHover = (locationId) => {
    setHoveredLocation(locationId);
    if (locationId && markerRefs.current[locationId]) {
      markerRefs.current[locationId].openPopup();
    }
  };

  // Handle location card hover out
  const handleLocationHoverOut = () => {
    setHoveredLocation(null);
    Object.values(markerRefs.current).forEach(marker => {
      if (marker) marker.closePopup();
    });
  };

  // Helper function to determine crowd status based on exact thresholds
  const getCrowdStatus = (locationName, peopleCount) => {
    const count = peopleCount || 0;
    const name = (locationName || "").toLowerCase();

    if (name.includes("melvin jones") || name.includes("burnham")) {
      if (count <= 296) return { statusText: "Sparse", color: "green" };
      if (count <= 1037) return { statusText: "Low Crowd", color: "green" };
      if (count <= 2233) return { statusText: "Moderate Crowd", color: "yellow" };
      return { statusText: "High Crowd", color: "red" };
    }
    if (name.includes("night market") || name.includes("market")) {
      if (count <= 40) return { statusText: "Sparse", color: "green" };
      if (count <= 141) return { statusText: "Low Crowd", color: "green" };
      if (count <= 303) return { statusText: "Moderate Crowd", color: "yellow" };
      return { statusText: "High Crowd", color: "red" };
    }
    if (name.includes("cathedral")) {
      if (count <= 92) return { statusText: "Sparse", color: "green" };
      if (count <= 320) return { statusText: "Low Crowd", color: "green" };
      if (count <= 686) return { statusText: "Moderate Crowd", color: "yellow" };
      return { statusText: "High Crowd", color: "red" };
    }
    if (name.includes("wright")) {
      if (count <= 108) return { statusText: "Sparse", color: "green" };
      if (count <= 378) return { statusText: "Low Crowd", color: "green" };
      if (count <= 809) return { statusText: "Moderate Crowd", color: "yellow" };
      return { statusText: "High Crowd", color: "red" };
    }
    if (name.includes("mansion")) {
      if (count <= 26) return { statusText: "Sparse", color: "green" };
      if (count <= 92) return { statusText: "Low Crowd", color: "green" };
      if (count <= 197) return { statusText: "Moderate Crowd", color: "yellow" };
      return { statusText: "High Crowd", color: "red" };
    }

    // fallback
    if (count <= 20) return { statusText: "Sparse", color: "green" };
    if (count <= 50) return { statusText: "Low Crowd", color: "green" };
    if (count <= 120) return { statusText: "Moderate Crowd", color: "yellow" };
    return { statusText: "High Crowd", color: "red" };
  };

  // Handle marker click - zoom in on marker
  const handleMarkerClick = (location) => {
    setSelectedLocationId(location.id);

    // Log the raw effective density to console (Hidden Telemetry)
    const effectiveDensity = location.effective_density_pm2 !== undefined && location.effective_density_pm2 !== null
      ? location.effective_density_pm2
      : (location.detectedPeople / (location.fov_area_m2 || 50.0));
    console.log(`[Telemetry] Location: "${location.name}" | Effective Density: ${effectiveDensity.toFixed(6)} P/m²`);

    if (mapRef.current) {
      // Instant zoom without animation
      mapRef.current.setView([location.lat, location.lng], 17);
      
      // Open popup immediately
      if (markerRefs.current[location.id]) {
        markerRefs.current[location.id].openPopup();
      }
    }
  };

  // Handle popup close - zoom back out
  const handlePopupClose = () => {
    setSelectedLocationId(null);
    if (mapRef.current) {
      mapRef.current.setView([16.413, 120.604], 15);
    }
  };

  // Get color based on crowd status color name
  const getCrowdColor = (color) => {
    switch (color?.toLowerCase()) {
      case 'green':
        return '#10b981'; // Emerald
      case 'yellow':
        return '#f59e0b'; // Amber
      case 'red':
        return '#ef4444'; // Red
      default:
        return '#8b5cf6'; // Purple fallback
    }
  };

  // Create custom marker icon
  const createCustomMarker = (crowdLevel, isTopResult = false) => {
    const baseColor = getCrowdColor(crowdLevel);
    const color = isTopResult ? '#fbbf24' : baseColor; // Gold for top result
    return L.divIcon({
      className: 'custom-location-marker',
      html: `
        <div class="marker-inner" style="${isTopResult ? 'filter: drop-shadow(0px 0px 12px #fbbf24) drop-shadow(0px 0px 6px #f59e0b);' : ''}">
          <svg viewBox="0 0 24 24" width="${isTopResult ? '44' : '36'}" height="${isTopResult ? '44' : '36'}" style="filter: drop-shadow(0px 0px 8px ${color});">
            <path fill="${color}" d="M12 0c-4.198 0-8 3.403-8 7.602 0 4.198 3.469 9.21 8 16.398 4.531-7.188 8-12.2 8-16.398 0-4.199-3.801-7.602-8-7.602zm0 11c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z"/>
          </svg>
        </div>
      `,
      iconSize: [isTopResult ? 44 : 36, isTopResult ? 44 : 36],
      iconAnchor: [isTopResult ? 22 : 18, isTopResult ? 44 : 36],
      popupAnchor: [0, isTopResult ? -44 : -36],
    });
  };

  // Handle Get Recommendations - Call TOPSIS API
  const handleGetRecommendations = async () => {
    console.log('Get Recommendations clicked');
    if (selectedLocationId === null) {
      console.log('No location selected');
      return;
    }

    const selectedLocation = mapLocations.find(loc => loc.id === selectedLocationId);
    if (!selectedLocation) {
      console.log('Selected location not found in mapLocations');
      return;
    }

    console.log('Calling TOPSIS API with payload:', {
      start_location_id: selectedLocationId,
      start_coords: [selectedLocation.lat, selectedLocation.lng],
      max_travel_time: maxTravelTime,
      place_category: placeCategory,
    });

    setIsLoading(true);
    try {
      const payload = {
        start_location_id: selectedLocationId,
        start_coords: [selectedLocation.lat, selectedLocation.lng],
        max_travel_time: maxTravelTime,
        travel_mode: travelMode,
        group_size: groupSize,
        environment: environment,
        place_category: placeCategory,
        paid_attractions: paidAttractions,
        priority_weight: priorityWeight,
      };

      const response = await fetch('http://localhost:5001/api/redirection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to get recommendations: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // ── TOPSIS Calculation Breakdown (thesis transparency) ──────────────────
      if (data.calculation_breakdown) {
        const bd = data.calculation_breakdown;
        const names = bd.location_names_in_order || [];

        const makeMatrixRows = (matrix) =>
          matrix.map((row, i) => ({
            Location:              names[i] ?? `Alt ${i + 1}`,
            'Travel Time (C1)':    row[0]?.toFixed(6) ?? row[0],
            'Crowd Density (C2)':  row[1]?.toFixed(6) ?? row[1],
          }));

        console.groupCollapsed('🧮 TOPSIS Calculation Breakdown');

        if (bd['2_weights_applied'] && bd['1_raw_matrix']) {
          console.log('📐 Weights applied →',
            `Travel Time: ${(bd['2_weights_applied'][0] * 100).toFixed(0)}%`,
            `| Crowd Density: ${(bd['2_weights_applied'][1] * 100).toFixed(0)}%`);

          console.group('① Raw Decision Matrix');
          console.table(makeMatrixRows(bd['1_raw_matrix']));
          console.groupEnd();

          console.group('② Normalized Matrix');
          console.table(makeMatrixRows(bd['3_normalized_matrix']));
          console.groupEnd();

          console.group('③ Weighted Normalized Matrix');
          console.table(makeMatrixRows(bd['4_weighted_matrix']));
          console.groupEnd();

          if (bd['5_ideal_solutions']) {
            const { PIS_A_plus, NIS_A_minus } = bd['5_ideal_solutions'];
            console.log('✅ PIS A⁺ (ideal)     →', `[${PIS_A_plus.map(v => v.toFixed(6)).join(', ')}]`);
            console.log('❌ NIS A⁻ (anti-ideal) →', `[${NIS_A_minus.map(v => v.toFixed(6)).join(', ')}]`);
          }

          if (bd['6_separation_measures']) {
            const { S_plus, S_minus } = bd['6_separation_measures'];
            console.group('④ Separation Measures');
            console.table(names.map((name, i) => ({
              Location:                name,
              'S⁺ (from ideal)':       S_plus[i]?.toFixed(6),
              'S⁻ (from anti-ideal)':  S_minus[i]?.toFixed(6),
            })));
            console.groupEnd();
          }

          if (bd['7_final_topsis_scores']) {
            console.group('⑤ Final TOPSIS Scores (Cᵢ = S⁻ / (S⁺ + S⁻))');
            console.table(names.map((name, i) => ({
              Location:    name,
              'Cᵢ Score':  bd['7_final_topsis_scores'][i]?.toFixed(6),
            })));
            console.groupEnd();
          }
        } else if (bd.calculation_explanation) {
          console.log('ℹ️', bd.calculation_explanation);
        }

        console.groupEnd(); // 🧮 TOPSIS Calculation Breakdown
      }
      // ─────────────────────────────────────────────────────────────────────────

      setTopsisResults(data.top_3_results || []);
      setViewMode('results');

      // Center to top 1 recommendation
      if (data.top_3_results && data.top_3_results.length > 0 && mapRef.current) {
        const topLocId = data.top_3_results[0].location_id;
        const topLoc = mapLocations.find(loc => loc.id === topLocId);
        if (topLoc) {
          mapRef.current.setView([topLoc.lat, topLoc.lng], 16, { animate: true });
        }
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Edit Preferences - Return to preferences view
  const handleEditPreferences = () => {
    setViewMode('preferences');
    setTopsisResults(null);
    
    // Reset map view to show all markers
    if (mapRef.current && mapLocations && mapLocations.length > 0) {
      try {
        const bounds = L.latLngBounds(mapLocations.map(loc => [loc.lat, loc.lng]));
        mapRef.current.fitBounds(bounds, { padding: [30, 30] });
      } catch (e) {
        console.error('Error fitting bounds:', e);
      }
    }
  };

  return (
    <div ref={ref} className="mx-auto max-w-[1600px] scroll-mt-8 flex flex-col gap-0">
      {/* Interactive Map Card */}
      <div className="flex-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)] sm:p-5 flex flex-col">
        {/* Map and Settings Layout */}
        <div className="grid grid-cols-1 gap-4 items-stretch flex-1 lg:grid-cols-[2fr_1fr]">
          {/* Left Column - Map with Header */}
          <div className="flex flex-col gap-2">
            {/* Header - Left Aligned */}
            <div className="flex flex-col gap-1 text-left">
              <h2 className="m-0 text-[10px] font-black uppercase tracking-[4px] text-slate-500">Smart Redirection</h2>
              <h3 className="m-0 text-xl font-black bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
                Crowd-Aware Redirection
              </h3>
              <p className="m-0 text-xs text-slate-400 font-medium">Click on any location marker to view details and find alternative routes based on current crowd levels</p>
            </div>

            {/* Leaflet Map */}
            <div className="flex-1 overflow-hidden rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.1)]" style={{ minHeight: 'calc(100vh - 300px)' }}>
            <MapContainer
              ref={mapRef}
              center={[16.413, 120.604]}
              zoom={14}
              minZoom={10}
              maxZoom={18}
              scrollWheelZoom={true}
              zoomControl={false}
              attributionControl={false}
              className="h-full w-full"
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              <ZoomControl position="bottomright" />
              {
                (() => {
                  // Filter markers based on view mode
                  let locationsToDisplay = mapLocations;
                  if (viewMode === 'results' && topsisResults && topsisResults.length > 0) {
                    const resultIds = topsisResults.map(r => r.location_id);
                    locationsToDisplay = mapLocations.filter(loc => resultIds.includes(loc.id));
                  }
                  return locationsToDisplay.map((location) => {
                    const isTopResult = viewMode === 'results' && topsisResults && topsisResults.length > 0 && topsisResults[0].location_id === location.id;
                    const statusObj = getCrowdStatus(location.name, location.detectedPeople);
                    
                    let pillClass = "";
                    if (statusObj.color === "green") {
                      pillClass = "text-emerald-800 bg-emerald-100/95 font-semibold";
                    } else if (statusObj.color === "yellow") {
                      pillClass = "text-amber-800 bg-amber-100/95 font-semibold";
                    } else if (statusObj.color === "red") {
                      pillClass = "text-red-800 bg-red-100/95 font-semibold";
                    }

                    const formatAge = (ageMinutes) => {
                      if (ageMinutes === undefined || ageMinutes === null) return "Just now";
                      const mins = Math.round(ageMinutes);
                      if (mins <= 0) return "Just now";
                      if (mins === 1) return "1 min ago";
                      return `${mins} mins ago`;
                    };

                    return (
                      <Marker 
                        key={location.id} 
                        position={[location.lat, location.lng]}
                        icon={createCustomMarker(statusObj.color, isTopResult)}
                        eventHandlers={{
                          click: () => handleMarkerClick(location),
                        }}
                        ref={(ref) => {
                          if (ref) {
                            markerRefs.current[location.id] = ref;
                          }
                        }}
                      >
                        <Popup 
                          className="location-popup"
                          eventHandlers={{
                            close: handlePopupClose,
                          }}
                        >
                          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 p-4 min-w-[240px] shadow-2xl">
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <h4 className="text-base font-black text-white tracking-tight">
                                {location.name}
                              </h4>
                            </div>
                            
                            <p className="text-xs text-slate-400 capitalize mb-3 font-medium">
                              {location.type}
                            </p>

                            <div className="inline-block mb-3">
                              <span className={`rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-widest ${pillClass}`}>
                                {statusObj.statusText}
                              </span>
                            </div>

                            <div className="space-y-2 border-t border-white/10 pt-3 text-xs">
                              <div className="text-slate-300">
                                Current Estimate: <span className="font-bold text-white">{location.detectedPeople} people</span>
                              </div>
                              <div className="text-slate-400">
                                Last Updated: <span className="font-semibold text-slate-300">{formatAge(location.crowd_reading_age_minutes)}</span>
                              </div>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  });
                })()
              }
            </MapContainer>
            </div>
          </div>

          {/* Settings Sidebar - Right Side */}
          <div className="flex flex-col self-stretch" style={{ height: 'calc(100vh - 220px)' }}>
            {/* Settings Panel / Results View */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 p-5 overflow-hidden flex flex-col flex-1">
              
              {viewMode === 'preferences' ? (
                /* PREFERENCES VIEW */
                <div className="flex flex-col h-full">
                  <h4 className="text-lg font-black text-white mb-4 tracking-tight shrink-0">Your Preferences</h4>
              
                  <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 -mr-2 pb-2 custom-scrollbar">
              {/* SECTION: Trip Basics */}
              <div className="mb-3">
                {/* Max Travel Time */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Max Travel Time</label>
                    <span className="text-sm font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{maxTravelTime} min</span>
                  </div>
                  <div className="relative group">
                    <input 
                      type="range" 
                      min="1" 
                      max="30" 
                      value={maxTravelTime}
                      onChange={(e) => setMaxTravelTime(Number(e.target.value))}
                      className="w-full h-2 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/30"
                      style={{
                        background: `linear-gradient(to right, rgb(79, 70, 229) 0%, rgb(79, 70, 229) ${(maxTravelTime / 30) * 100}%, rgb(55, 65, 81) ${(maxTravelTime / 30) * 100}%, rgb(55, 65, 81) 100%)`
                      }}
                    />
                  </div>
                </div>

                {/* Place Category */}
                <div className="space-y-1.5 mb-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Place Category</label>
                  <div className="relative" ref={placeCategoryRef}>
                    <button
                      onClick={() => setIsPlaceCategoryOpen(!isPlaceCategoryOpen)}
                      className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-white/20 hover:border-indigo-500/50 text-sm text-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all duration-300 cursor-pointer backdrop-blur-sm shadow-lg hover:shadow-indigo-500/20 hover:shadow-lg flex items-center justify-between"
                    >
                      <span className="capitalize">
                        {placeCategory === 'shopping' ? 'Shopping & Retail' : placeCategory === 'nature' ? 'Nature & Outdoors' : placeCategory === 'dining' ? 'Dining & Food' : placeCategory === 'culture' ? 'Museums & Arts' : 'Any Category'}
                      </span>
                      <svg 
                        className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isPlaceCategoryOpen ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </button>

                    {isPlaceCategoryOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100]">
                        {[
                          { value: 'any', label: 'Any Category' },
                          { value: 'shopping', label: 'Shopping & Retail' },
                          { value: 'nature', label: 'Nature & Outdoors' },
                          { value: 'dining', label: 'Dining & Food' },
                          { value: 'culture', label: 'Museums & Arts' }
                        ].map((option, index) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setPlaceCategory(option.value);
                              setIsPlaceCategoryOpen(false);
                            }}
                            style={{
                              animationDelay: `${index * 30}ms`
                            }}
                            className={`w-full px-4 py-3 text-sm font-medium text-left transition-all duration-200 flex items-center gap-3 group ${
                              placeCategory === option.value
                                ? 'bg-gradient-to-r from-indigo-500/40 to-purple-500/40 text-indigo-100 border-l-2 border-indigo-400'
                                : 'text-slate-300 hover:bg-slate-700/50 border-l-2 border-transparent'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-current opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                            <span>{option.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Travel Mode */}
                <div className="space-y-1.5 mb-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Travel Mode</label>
                  <div className="relative" ref={travelModeRef}>
                    <button
                      onClick={() => setIsTravelModeOpen(!isTravelModeOpen)}
                      className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-white/20 hover:border-indigo-500/50 text-sm text-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all duration-300 cursor-pointer backdrop-blur-sm shadow-lg hover:shadow-indigo-500/20 hover:shadow-lg flex items-center justify-between"
                    >
                      <span className="capitalize">
                        {travelMode === 'walking' ? 'Walking' : travelMode === 'commuting' ? 'Public Transport' : 'Driving'}
                      </span>
                      <svg 
                        className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isTravelModeOpen ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </button>

                    {isTravelModeOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                        {['Walking', 'Public Transport', 'Driving'].map((option, index) => (
                          <button
                            key={option}
                            onClick={() => {
                              setTravelMode(option.toLowerCase().replace(' ', '_'));
                              setIsTravelModeOpen(false);
                            }}
                            style={{
                              animationDelay: `${index * 30}ms`
                            }}
                            className={`w-full px-4 py-3 text-sm font-medium text-left transition-all duration-200 flex items-center gap-3 group ${
                              (option === 'Walking' && travelMode === 'walking') ||
                              (option === 'Public Transport' && travelMode === 'commuting') ||
                              (option === 'Driving' && travelMode === 'driving')
                                ? 'bg-gradient-to-r from-indigo-500/40 to-purple-500/40 text-indigo-100 border-l-2 border-indigo-400'
                                : 'text-slate-300 hover:bg-slate-700/50 border-l-2 border-transparent'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-current opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                            <span>{option}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Routing Priority */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Routing Priority</label>
                    <span className="text-xs font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent tabular-nums">
                      {Math.round(priorityWeight * 100)}% Speed
                      <span className="text-slate-500 font-semibold"> | </span>
                      {Math.round((1 - priorityWeight) * 100)}% Comfort
                    </span>
                  </div>
                  <div className="relative group">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={Math.round(priorityWeight * 100)}
                      onChange={(e) => setPriorityWeight(Number(e.target.value) / 100)}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/30"
                      style={{
                        background: `linear-gradient(to right, rgb(79, 70, 229) 0%, rgb(79, 70, 229) ${priorityWeight * 100}%, rgb(55, 65, 81) ${priorityWeight * 100}%, rgb(55, 65, 81) 100%)`
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-start mt-1 px-0.5">
                    <div className="text-left transition-opacity duration-200" style={{ opacity: 0.3 + priorityWeight * 0.7 }}>
                      <p className="text-[10px] font-semibold text-slate-400">Fastest Arrival</p>
                      <p className="text-[9px] text-slate-600">Shortest distance</p>
                    </div>
                    <div className="text-center" style={{ opacity: 1 - Math.abs(priorityWeight - 0.5) * 1.8 }}>
                      <p className="text-[10px] font-semibold text-slate-500">Balanced</p>
                    </div>
                    <div className="text-right transition-opacity duration-200" style={{ opacity: 0.3 + (1 - priorityWeight) * 0.7 }}>
                      <p className="text-[10px] font-semibold text-slate-400">Max Comfort</p>
                      <p className="text-[9px] text-slate-600">Lowest crowd density</p>
                    </div>
                  </div>
                </div>

                {/* Group Size */}
                <div className="space-y-1.5 mb-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Group Size</label>
                  <div className="relative group">
                    <input 
                      type="number" 
                      min="1" 
                      max="50"
                      value={groupSize}
                      onChange={(e) => setGroupSize(Math.max(1, Math.min(50, Number(e.target.value))))}
                      placeholder={groupSize === 1 ? 'Person' : 'People'}
                      className="group-size-input w-full px-4 pr-16 py-2.5 rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-white/20 hover:border-indigo-500/50 text-sm text-white font-black focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-indigo-500/20 hover:shadow-lg text-center"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 pointer-events-auto z-50">
                      <button
                        onClick={() => setGroupSize(Math.min(50, groupSize + 1))}
                        className="group/btn flex items-center justify-center w-6 h-4.5 rounded-t-md bg-gradient-to-br from-slate-700/50 to-slate-800/50 hover:from-indigo-500/40 hover:to-purple-500/40 border border-white/20 hover:border-indigo-500/50 transition-all duration-200 cursor-pointer shadow-sm active:from-indigo-500/60 active:to-purple-500/60"
                      >
                        <svg className="w-3 h-3 text-slate-300 group-hover/btn:text-indigo-200 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setGroupSize(Math.max(1, groupSize - 1))}
                        className="group/btn flex items-center justify-center w-6 h-4.5 rounded-b-md bg-gradient-to-br from-slate-700/50 to-slate-800/50 hover:from-indigo-500/40 hover:to-purple-500/40 border border-white/20 hover:border-indigo-500/50 transition-all duration-200 cursor-pointer shadow-sm active:from-indigo-500/60 active:to-purple-500/60"
                      >
                        <svg className="w-3 h-3 text-slate-300 group-hover/btn:text-indigo-200 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 my-2.5"></div>

              {/* SECTION: Interests & Amenities */}
              <div className="mb-3">
                {/* Environment Preference */}
                <div className="space-y-2 mb-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Environment</label>
                  <div className="grid grid-cols-3 gap-2">
                    <label className={`flex items-center justify-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-300 font-medium text-xs uppercase tracking-wide ${environment === 'indoors' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/50' : 'bg-slate-700/30 border border-white/10 text-slate-300 hover:border-indigo-500/30 hover:bg-slate-700/50'}`}>
                      <input 
                        type="radio" 
                        id="indoors"
                        name="environment"
                        value="indoors"
                        checked={environment === 'indoors'}
                        onChange={(e) => setEnvironment(e.target.value)}
                        className="w-3 h-3 accent-white cursor-pointer"
                      />
                      <span className="ml-2">Indoors</span>
                    </label>
                    <label className={`flex items-center justify-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-300 font-medium text-xs uppercase tracking-wide ${environment === 'outdoors' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/50' : 'bg-slate-700/30 border border-white/10 text-slate-300 hover:border-indigo-500/30 hover:bg-slate-700/50'}`}>
                      <input 
                        type="radio" 
                        id="outdoors"
                        name="environment"
                        value="outdoors"
                        checked={environment === 'outdoors'}
                        onChange={(e) => setEnvironment(e.target.value)}
                        className="w-3 h-3 accent-white cursor-pointer"
                      />
                      <span className="ml-2">Outdoors</span>
                    </label>
                    <label className={`flex items-center justify-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-300 font-medium text-xs uppercase tracking-wide ${environment === 'any' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/50' : 'bg-slate-700/30 border border-white/10 text-slate-300 hover:border-indigo-500/30 hover:bg-slate-700/50'}`}>
                      <input 
                        type="radio" 
                        id="any"
                        name="environment"
                        value="any"
                        checked={environment === 'any'}
                        onChange={(e) => setEnvironment(e.target.value)}
                        className="w-3 h-3 accent-white cursor-pointer"
                      />
                      <span className="ml-2">Any</span>
                    </label>
                  </div>
                </div>

                <div className="border-t border-white/10 my-2.5"></div>

                {/* Paid Attractions */}
                <div className="space-y-1.5 mb-3">
                  <label className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-300 ${paidAttractions ? 'bg-gradient-to-r from-indigo-500/30 to-purple-500/30 border border-indigo-500/50 shadow-lg shadow-indigo-500/20' : 'bg-slate-700/30 border border-white/10 hover:border-indigo-500/30 hover:bg-slate-700/50'}`}>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-300">Include Paid Attractions</span>
                    <div className={`relative w-12 h-6 rounded-full transition-colors duration-300 shadow-inner ${paidAttractions ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                      <input 
                        type="checkbox" 
                        checked={paidAttractions}
                        onChange={(e) => setPaidAttractions(e.target.checked)}
                        className="absolute opacity-0 w-full h-full cursor-pointer"
                      />
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-md ${paidAttractions ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </div>
                  </label>
                  </div>
                </div>

              </div>

              {/* Starting Location Dropdown */}
              <div className="mt-4 pt-4 border-t border-white/10 shrink-0 relative group">
                  <div className="mb-2.5 px-1">
                    <p className="text-xs text-slate-400 font-medium mb-2">Starting Location:</p>
                    <div className="relative" ref={locationDropdownRef}>
                      <button
                        onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                        className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-white/20 hover:border-indigo-500/50 text-sm text-white font-black transition-all duration-300 cursor-pointer backdrop-blur-sm shadow-lg flex items-center justify-between"
                      >
                        <span className="truncate">
                          {selectedLocationId !== null 
                            ? mapLocations.find(loc => loc.id === selectedLocationId)?.name || 'Select Location'
                            : 'Select Location'}
                        </span>
                        <svg 
                          className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isLocationDropdownOpen ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </button>

                      {isLocationDropdownOpen && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[110] max-h-60 overflow-y-auto custom-scrollbar">
                          {mapLocations.map((loc) => (
                            <button
                              key={loc.id}
                              onClick={() => {
                                setSelectedLocationId(loc.id);
                                setIsLocationDropdownOpen(false);
                                if (mapRef.current) {
                                  mapRef.current.setView([loc.lat, loc.lng], 17);
                                  if (markerRefs.current[loc.id]) {
                                    markerRefs.current[loc.id].openPopup();
                                  }
                                }
                              }}
                              className={`w-full px-4 py-3 text-sm font-black text-left transition-all duration-200 flex items-center gap-3 ${
                                selectedLocationId === loc.id
                                  ? 'bg-gradient-to-r from-indigo-500/40 to-purple-500/40 text-indigo-100 border-l-2 border-indigo-400'
                                  : 'text-slate-300 hover:bg-slate-700/50 border-l-2 border-transparent'
                              }`}
                            >
                              <span>{loc.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                <button 
                  onClick={handleGetRecommendations}
                  disabled={selectedLocationId === null || isLoading}
                  className={`w-full py-3 px-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all duration-300 relative overflow-hidden flex items-center justify-center gap-2 ${
                    selectedLocationId === null || isLoading
                      ? 'bg-gradient-to-r from-slate-700/50 to-slate-800/50 text-slate-400 cursor-not-allowed border border-white/10 shadow-lg'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg hover:shadow-2xl hover:shadow-purple-500/40 hover:-translate-y-0.5 active:translate-y-0 active:shadow-lg'
                  }`}
                >
                  <div className={`absolute inset-0 transition-opacity duration-300 ${selectedLocationId === null || isLoading ? 'bg-transparent' : 'bg-white/10 opacity-0 group-hover:opacity-100'}`}></div>
                  <svg className={`w-4 h-4 relative ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="relative">{isLoading ? 'Loading...' : 'Get Recommendations'}</span>
                </button>

                {selectedLocationId === null && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-slate-900/95 border border-indigo-500/50 rounded-lg shadow-2xl text-xs font-medium text-indigo-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                    <div className="flex items-center gap-2">
                      <span>Click your location on the map to start</span>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900/95 border-r border-b border-indigo-500/50 rotate-45"></div>
                  </div>
                )}
              </div>
                </div>
              ) : (
                /* RESULTS VIEW */
                <div className="flex flex-col gap-4 h-full">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-black text-white tracking-tight">Top Recommendations</h4>
                    <button
                      onClick={handleEditPreferences}
                      className="px-3 py-1.5 text-xs font-black uppercase tracking-widest bg-slate-700/50 border border-white/20 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-200 rounded-lg transition-all duration-300"
                    >
                      Edit
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 pb-4 pt-2 -mt-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {topsisResults && topsisResults.length > 0 ? (
                      topsisResults.map((result, index) => {
                        const location = mapLocations.find(loc => loc.id === result.location_id);
                        const isTopResult = index === 0;
                        return (
                          <div
                            key={result.location_id}
                            onMouseEnter={() => {
                              if (mapRef.current && location) {
                                mapRef.current.setView([location.lat, location.lng], 16, { animate: true });
                                if (markerRefs.current[location.id]) {
                                  markerRefs.current[location.id].openPopup();
                                }
                              }
                            }}
                            className={`p-3 rounded-2xl border transition-all duration-300 flex flex-col gap-2 cursor-pointer transform hover:-translate-y-1 hover:shadow-xl hover:z-10 ${
                              isTopResult
                                ? 'bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border-amber-500/50 shadow-lg shadow-amber-500/20 relative overflow-hidden hover:border-amber-400'
                                : 'bg-gradient-to-br from-slate-700/50 to-slate-800/50 border-white/10 hover:border-indigo-500/50 hover:bg-slate-700/80 relative'
                            }`}
                          >
                            {isTopResult && (
                              <div className="absolute top-2 right-2 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg">
                                #1 Best Match
                              </div>
                            )}
                            
                            <div className="pr-20">
                              <h5 className={`text-sm font-black ${isTopResult ? 'text-amber-100' : 'text-white'} mb-0.5`}>
                                #{index + 1} {location?.name || result?.name || 'Location'}
                              </h5>
                              <p className="text-[10px] text-slate-400 mb-0">{location?.type || result?.type || 'Unknown'}</p>
                            </div>

                            {result.reason_text && (
                              <p className="text-[10px] text-slate-500 italic mb-1 mt-0.5">
                                <span className="mr-1">💡</span>
                                {result.reason_text}
                              </p>
                            )}

                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Score</span>
                                <span className="font-black text-indigo-300">{result.topsis_score?.toFixed(2) || 'N/A'}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Distance</span>
                                <span className="font-black text-slate-200">{result.distance?.toFixed(1) || location?.distance} km</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">People</span>
                                <span className="font-black text-slate-200">{location?.detectedPeople || 0}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Level</span>
                                <span className={`font-black uppercase text-[9px] ${
                                  (location?.crowdLevel?.toLowerCase() === 'low' || location?.crowdLevel?.toLowerCase() === 'sparse') ? 'text-emerald-400' :
                                  location?.crowdLevel?.toLowerCase() === 'moderate' ? 'text-amber-400' :
                                  'text-red-400'
                                }`}>
                                  {location?.crowdLevel || 'Unknown'}
                                </span>
                              </div>
                            </div>

                            <div className="mt-1 pt-3 border-t border-white/5 flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const lat = result.latitude || location?.lat;
                                  const lng = result.longitude || location?.lng;
                                  if (lat && lng) {
                                    window.open(`https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank', 'noopener,noreferrer');
                                  }
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#33ccff]/10 hover:bg-[#33ccff]/20 border border-[#33ccff]/30 text-[#33ccff] text-[9px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 hover:-translate-y-0.5"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.556 16.59l-5.11-2.95a.89.89 0 0 1-.446-.77V7.11c0-.49.398-.888.89-.888s.89.398.89.889v5.24l4.57 2.64a.89.89 0 0 1 .326 1.218.89.89 0 0 1-1.22.38z"/>
                                </svg>
                                Waze
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const lat = result.latitude || location?.lat;
                                  const lng = result.longitude || location?.lng;
                                  if (lat && lng) {
                                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`, '_blank', 'noopener,noreferrer');
                                  }
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#4285F4]/10 hover:bg-[#4285F4]/20 border border-[#4285F4]/30 text-[#4285F4] text-[9px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 hover:-translate-y-0.5"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0zm-.375 16.634l-5.698-3.29c-.392-.226-.392-.782 0-1.008l5.698-3.29c.392-.226.98.058.98.504v6.58c0 .446-.588.73-.98.504zm6.09-3.518l-5.698 3.29c-.392.226-.98-.058-.98-.504v-6.58c0-.446.588-.73.98-.504l5.698 3.29c.392.226.392.782 0 1.008z"/>
                                </svg>
                                Maps
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex items-center justify-center h-32 text-slate-400">
                        <p className="text-sm">No recommendations found</p>
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
});

Redirection.displayName = 'Redirection';

export default Redirection;

const styles = `
  .location-popup .leaflet-popup-content-wrapper {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%) !important;
    color: white !important;
    border-radius: 16px !important;
    padding: 0 !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
  }

  .location-popup .leaflet-popup-content {
    margin: 0 !important;
    line-height: inherit !important;
  }

  .location-popup .leaflet-popup-tip {
    background: #1e293b !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
  }

  .location-popup .leaflet-popup-close-button {
    color: #94a3b8 !important;
    padding: 12px 12px 0 0 !important;
    font-size: 20px !important;
    opacity: 0.8;
  }

  .location-popup .leaflet-popup-close-button:hover {
    color: white !important;
    opacity: 1;
  }

  .custom-location-marker {
    display: flex;
    align-items: center;
    justify-content: center;
    will-change: transform;
    backface-visibility: hidden;
    perspective: 1000px;
  }

  .marker-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    width: 36px;
    height: 36px;
    transform-origin: bottom center;
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    will-change: transform;
    backface-visibility: hidden;
  }

  .custom-location-marker:hover .marker-inner {
    transform: scale(1.2);
  }

  .leaflet-container {
    background-color: #0f172a;
  }

  /* Hide default top-left zoom control */
  .leaflet-top.leaflet-left .leaflet-control-zoom {
    display: none !important;
  }

  /* Group Size Input Styling */
  .group-size-input {
    -moz-appearance: textfield;
    background: linear-gradient(135deg, rgba(55, 65, 81, 0.5) 0%, rgba(15, 23, 42, 0.5) 100%) !important;
    color: white !important;
    caret-color: rgb(165, 180, 252);
  }

  .group-size-input::-webkit-outer-spin-button,
  .group-size-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .group-size-input::placeholder {
    color: rgba(148, 163, 184, 0.9);
    font-weight: 500;
  }

  .group-size-input::-moz-placeholder {
    color: rgba(148, 163, 184, 0.9);
    font-weight: 500;
  }

  .group-size-input:hover {
    border-color: rgba(99, 102, 241, 0.5);
  }

  .group-size-input:focus {
    background: linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(139, 92, 246, 0.15) 100%) !important;
  }

  .group-size-input:-webkit-autofill,
  .group-size-input:-webkit-autofill:hover,
  .group-size-input:-webkit-autofill:focus,
  .group-size-input:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 30px rgba(55, 65, 81, 0.5) inset !important;
    -webkit-text-fill-color: white !important;
  }

  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    cursor: pointer;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    background: linear-gradient(135deg, #6366f1, #a855f7);
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 0 10px rgba(99, 102, 241, 0.6), 0 0 20px rgba(168, 85, 247, 0.3);
    transition: all 0.3s ease;
  }

  input[type="range"]::-webkit-slider-thumb:hover {
    width: 20px;
    height: 20px;
    box-shadow: 0 0 15px rgba(99, 102, 241, 1), 0 0 30px rgba(168, 85, 247, 0.5);
    border-color: rgba(99, 102, 241, 0.8);
  }

  input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: linear-gradient(135deg, #6366f1, #a855f7);
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 0 10px rgba(99, 102, 241, 0.6), 0 0 20px rgba(168, 85, 247, 0.3);
    transition: all 0.3s ease;
  }

  input[type="range"]::-moz-range-thumb:hover {
    width: 20px;
    height: 20px;
    box-shadow: 0 0 15px rgba(99, 102, 241, 1), 0 0 30px rgba(168, 85, 247, 0.5);
    border-color: rgba(99, 102, 241, 0.8);
  }

  .leaflet-popup-pane {
    /* Animation removed for better map interaction */
  }

  @keyframes slideInFromTop {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-in {
    animation: slideInFromTop 0.2s ease-out;
  }

  .fade-in {
    animation: fadeInDropdown 0.2s ease-out;
  }

  @keyframes fadeInDropdown {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .slide-in-from-top-2 {
    animation: slideInFromTop 0.2s ease-out;
  }

  .leaflet-map-pane {
    /* Transition removed for smooth interaction */
  }

  button:disabled {
    opacity: 0.6;
  }

  button:disabled:hover {
    transform: none;
  }

  @keyframes pulse-glow {
    0%, 100% {
      border-color: rgba(99, 102, 241, 0.3);
      box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.1);
    }
    50% {
      border-color: rgba(99, 102, 241, 0.6);
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
    }
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
