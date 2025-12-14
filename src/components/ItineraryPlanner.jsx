import React, { useState, useRef } from 'react';
import manilaItineraryData from '../data/itinerary_locations.json';
import itineraryLocations from '../data/itinerary_locations.json';
import { Tooltip } from 'react-leaflet';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Calendar, MapPin, Clock, Sparkles, Star } from 'lucide-react';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { HfInference } from '@huggingface/inference';
import './ItineraryPlanner.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ItineraryPlanner = () => {
  const [destination, setDestination] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: undefined,
    endDate: undefined,
    key: 'selection',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [itinerary, setItinerary] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState({ start: false, end: false });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [view, setView] = useState('input'); // 'input' or 'planner'
  const inputRef = useRef(null);

  // Close calendar on outside click
  React.useEffect(() => {
    if (!showCalendar) return;
    const handleClick = (e) => {
      if (!document.querySelector('.calendar-modal')?.contains(e.target)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showCalendar]);

  // Philippines locations data with coordinates
  const philippinesLocations = {
    manila: { name: 'Manila', position: [14.5995, 120.9842], attractions: ['Intramuros', 'Rizal Park', 'Manila Bay'] },
    boracay: { name: 'Boracay', position: [11.9674, 121.9248], attractions: ['White Beach', 'Puka Shell Beach', 'Mount Luho'] },
    cebu: { name: 'Cebu', position: [10.3157, 123.8854], attractions: ["Magellan's Cross", 'Basilica del Santo Niño', 'Tops Lookout'] },
    palawan: { name: 'Palawan (El Nido)', position: [11.1949, 119.4013], attractions: ['Big Lagoon', 'Small Lagoon', 'Nacpan Beach'] },
    baguio: { name: 'Baguio', position: [16.4023, 120.5960], attractions: ['Burnham Park', 'The Mansion', 'Mines View Park'] },
    davao: { name: 'Davao', position: [7.1907, 125.4553], attractions: ['Mount Apo', 'Philippine Eagle Center', 'Eden Nature Park'] },
    vigan: { name: 'Vigan', position: [17.5748, 120.3869], attractions: ['Calle Crisologo', 'Bantay Bell Tower', 'Baluarte Zoo'] },
    siargao: { name: 'Siargao', position: [9.8601, 126.0453], attractions: ['Cloud 9', 'Sugba Lagoon', 'Magpupungko Rock Pools'] },
  };

  const topDestinations = [
    { key: 'manila', icon: <MapPin size={18} color="#667eea" />, label: 'Manila' },
    { key: 'boracay', icon: <MapPin size={18} color="#fbbf24" />, label: 'Boracay' },
    { key: 'cebu', icon: <MapPin size={18} color="#38bdf8" />, label: 'Cebu' },
    { key: 'palawan', icon: <MapPin size={18} color="#10b981" />, label: 'Palawan (El Nido)' },
    { key: 'baguio', icon: <MapPin size={18} color="#a78bfa" />, label: 'Baguio' },
    { key: 'davao', icon: <MapPin size={18} color="#f472b6" />, label: 'Davao' },
    { key: 'vigan', icon: <MapPin size={18} color="#f87171" />, label: 'Vigan' },
    { key: 'siargao', icon: <MapPin size={18} color="#34d399" />, label: 'Siargao' },
  ];

  // Filtered suggestions based on input
  const filteredSuggestions = destination
    ? topDestinations.filter(dest => dest.label.toLowerCase().includes(destination.toLowerCase()))
    : topDestinations;

  const calculateDays = () => {
    if (!dateRange.startDate || !dateRange.endDate) return 0;
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  const generateItinerary = async () => {
    if (!destination || !dateRange.startDate || !dateRange.endDate) return;

    setIsGenerating(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const days = calculateDays();
    const normalizedInput = (destination || '').trim().toLowerCase();

    // Try to find a matching place in the JSON data (match by key or by place name substring)
    const jsonKeys = Object.keys(itineraryLocations || {});
    let matchedKey = jsonKeys.find(k => k.toLowerCase() === normalizedInput);
    if (!matchedKey) {
      matchedKey = jsonKeys.find(k => (itineraryLocations[k].name || '').toLowerCase().includes(normalizedInput));
    }
    if (!matchedKey) {
      // Try substring match against names if user typed a partial name
      matchedKey = jsonKeys.find(k => normalizedInput && (itineraryLocations[k].name || '').toLowerCase().indexOf(normalizedInput) !== -1);
    }

    if (matchedKey) {
      const placeData = itineraryLocations[matchedKey];
      // Build itinerary from JSON days, repeat or trim to match requested days
      const availableDays = placeData.days || [];
      const dailyPlan = [];

      for (let i = 0; i < days; i++) {
        const srcDay = availableDays[i % availableDays.length] || availableDays[0] || { day: i + 1, activities: [] };
        // Map activities into our UI shape
        const activities = (srcDay.activities || []).map(act => ({
          title: act.title || act.business || 'Activity',
          description: act.description || '',
          position: act.position || act.coords || [placeData.center[0], placeData.center[1]],
          image: act.image ? act.image : null,
          emoji: act.emoji || '',
          period: act.tag || act.bestTime || '',
          tag: act.tag || '',
          time: act.bestTime || '',
          type: act.type || 'place'
        }));

        dailyPlan.push({
          day: i + 1,
          date: new Date(new Date(dateRange.startDate).getTime() + i * 24 * 60 * 60 * 1000).toLocaleDateString(),
          activities
        });
      }

      // Build allPins for the map
      const allPins = [];
      dailyPlan.forEach(d => {
        d.activities.forEach((a, idx) => {
          allPins.push({ position: a.position, title: a.title, day: d.day, time: a.time || '', tag: a.tag || '' });
        });
      });

      setItinerary({
        destination: placeData.name || destination,
        days,
        startDate: new Date(dateRange.startDate).toLocaleDateString(),
        endDate: new Date(dateRange.endDate).toLocaleDateString(),
        dailyPlan,
        center: placeData.center || [14.5995, 120.9842],
        allPins
      });
      setView('planner');
      setIsGenerating(false);
      return;
    }

    // Fallback: no JSON match — use nearest known Philippines location or generic generator
    const destKey = Object.keys(philippinesLocations).find(
      key => philippinesLocations[key].name.toLowerCase().includes(destination.toLowerCase())
    );
    // ...existing code for generic itinerary generation...
    const generatedItinerary = {
      destination: selectedLocation.name,
      startDate: dateRange.startDate ? new Date(dateRange.startDate).toISOString().slice(0, 10) : '',
      endDate: dateRange.endDate ? new Date(dateRange.endDate).toISOString().slice(0, 10) : '',
      days: days,
      center: selectedLocation.position,
      dailyPlan: Array.from({ length: Math.min(days, 5) }, (_, i) => ({
        day: i + 1,
        date: dateRange.startDate ? new Date(new Date(dateRange.startDate).getTime() + i * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }) : '',
        activities: [
          {
            time: '8:00 AM',
            period: 'Morning',
            title: selectedLocation.attractions[i % selectedLocation.attractions.length],
            description: `Explore the beautiful ${selectedLocation.attractions[i % selectedLocation.attractions.length]} and discover its hidden gems.`,
            position: [
              selectedLocation.position[0] + (Math.random() - 0.5) * 0.1,
              selectedLocation.position[1] + (Math.random() - 0.5) * 0.1
            ],
            image: '/assets/featured_images/intramuros-walking-tour.jpg'
          },
          {
            time: '12:00 PM',
            period: 'Afternoon',
            title: 'Local Restaurant',
            description: 'Enjoy authentic Filipino cuisine at a highly-rated local restaurant.',
            position: [
              selectedLocation.position[0] + (Math.random() - 0.5) * 0.1,
              selectedLocation.position[1] + (Math.random() - 0.5) * 0.1
            ],
            image: '/assets/featured_images/intramuros-walking-tour.jpg'
          },
          {
            time: '4:00 PM',
            period: 'Evening',
            title: selectedLocation.attractions[(i + 1) % selectedLocation.attractions.length],
            description: `Visit ${selectedLocation.attractions[(i + 1) % selectedLocation.attractions.length]} for an unforgettable evening experience.`,
            position: [
              selectedLocation.position[0] + (Math.random() - 0.5) * 0.1,
              selectedLocation.position[1] + (Math.random() - 0.5) * 0.1
            ],
            image: '/assets/featured_images/intramuros-walking-tour.jpg'
          }
        ]
      })),
      allPins: []
    };

    // Collect all pins for map
    generatedItinerary.allPins = generatedItinerary.dailyPlan.flatMap(day =>
      day.activities.map(activity => ({
        position: activity.position,
        title: activity.title,
        day: day.day,
        time: activity.time
      }))
    );

    setItinerary(generatedItinerary);
    setIsGenerating(false);
    setView('planner');
  };

  const isFormValid = destination && dateRange.startDate && dateRange.endDate;

  // Close calendar on outside click
  React.useEffect(() => {
    if (!showCalendar) return;
    const handleClick = (e) => {
      if (!document.querySelector('.calendar-modal')?.contains(e.target)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showCalendar]);

  return (
    <div className="itinerary-planner">
      {view === 'input' && (
        <>
          <div className="itinerary-header">
            <h1 className="itinerary-title">Plan Your Perfect Trip</h1>
            <p className="itinerary-subtitle">Tell us where you're going and when. We'll help you build an unforgettable itinerary.</p>
            <div className="itinerary-inputs">
              <div className="input-group destination-input">
                <label>Where to?</label>
                <input
                  type="text"
                  placeholder="e.g. Boracay, Manila, Palawan"
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                  className="destination-field"
                  ref={inputRef}
                  autoComplete="off"
                />
                {showSuggestions && (
                  <div className="destination-suggestions">
                    <div className="suggestions-title">
                      <Star size={16} color="#fbbf24" style={{ marginRight: 6, verticalAlign: 'middle' }} />
                      Top destinations:
                    </div>
                    <ul className="suggestions-list">
                      {filteredSuggestions.length === 0 ? (
                        <li className="suggestion-item no-match">No matches found</li>
                      ) : (
                        filteredSuggestions.map((dest, idx) => (
                          <li
                            key={dest.key}
                            className="suggestion-item"
                            onMouseDown={() => {
                              setDestination(dest.label);
                              setShowSuggestions(false);
                              inputRef.current.blur();
                            }}
                          >
                            <span className="suggestion-rank">{idx + 1}.</span> {dest.icon} <span className="suggestion-label">{dest.label}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>
              <div className="dates-container">
                <div className="input-group date-input">
                  <label>Dates</label>
                  <div className="calendar-picker-row">
                    <div className="date-inputs-wrapper">
                      <input
                        type="text"
                        className="calendar-date-input"
                        readOnly
                        value={dateRange.startDate ? new Date(dateRange.startDate).toLocaleDateString() : ''}
                        placeholder="Start Date"
                        onClick={() => {
                          setShowCalendar(true);
                          if (dateRange.startDate && dateRange.endDate) {
                            setDateRange({ startDate: undefined, endDate: undefined, key: 'selection' });
                          }
                        }}
                      />
                      <span className="date-range-separator">→</span>
                      <input
                        type="text"
                        className="calendar-date-input"
                        readOnly
                        value={dateRange.endDate ? new Date(dateRange.endDate).toLocaleDateString() : ''}
                        placeholder="End Date"
                        onClick={() => {
                          setShowCalendar(true);
                          if (dateRange.startDate && dateRange.endDate) {
                            setDateRange({ startDate: undefined, endDate: undefined, key: 'selection' });
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="calendar-icon-btn"
                        onClick={() => setShowCalendar(true)}
                        aria-label="Open calendar"
                      >
                        <Calendar size={18} />
                      </button>
                    </div>
                    {showCalendar && (
                      <div className="calendar-modal" onClick={e => e.stopPropagation()}>
                        <DateRange
                          ranges={[
                            {
                              startDate: dateRange.startDate ? new Date(dateRange.startDate) : undefined,
                              endDate: dateRange.endDate ? new Date(dateRange.endDate) : undefined,
                              key: 'selection',
                            }
                          ]}
                          onChange={item => {
                            setDateRange(item.selection);
                          }}
                          moveRangeOnFirstSelection={false}
                          showDateDisplay={false}
                          months={2}
                          direction="horizontal"
                          rangeColors={["#667eea"]}
                          minDate={new Date()}
                        />
                        <button
                          className="calendar-done-btn"
                          type="button"
                          onClick={() => setShowCalendar(false)}
                        >Done</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <button
              className={`make-itinerary-btn ${!isFormValid ? 'disabled' : ''}`}
              onClick={generateItinerary}
              disabled={!isFormValid || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Sparkles className="sparkle-icon spinning" size={20} />
                  Generating...
                </>
              ) : (
                'Make Itinerary'
              )}
            </button>
          </div>
          {isGenerating && (
            <div className="generating-state">
              <div className="generating-animation">
                <Sparkles className="sparkle-icon pulse" size={48} />
                <h2>Crafting your perfect itinerary...</h2>
                <p>Discovering the best spots in {destination || 'the Philippines'}</p>
              </div>
            </div>
          )}
        </>
      )}
      {view === 'planner' && itinerary && !isGenerating && (
        <div className="itinerary-content itinerary-animate-in">
          <button className="back-btn" onClick={() => {
            setView('input');
            setItinerary(null);
            setDateRange({ startDate: undefined, endDate: undefined, key: 'selection' });
          }}>
            ← Back / New Itinerary
          </button>
          <div className="itinerary-timeline">
            <div className="timeline-header">
              <h2>{itinerary.destination} Trip</h2>
              <p className="trip-duration">{itinerary.days} days • {itinerary.startDate} to {itinerary.endDate}</p>
            </div>
            <div className="timeline-days">
              {itinerary.dailyPlan.map((day, dayIndex) => (
                <div key={day.day} className="day-card" style={{ animationDelay: `${dayIndex * 0.1}s` }}>
                  <div className="day-header">
                    <span className="day-number">Day {day.day}</span>
                    <span className="day-date">{day.date}</span>
                  </div>
                  <div className="day-activities">
                    {day.activities.map((activity, actIndex) => (
                      <div key={actIndex} className="activity-item">
                        <div className="activity-time">
                          <Clock size={16} />
                          <span>{activity.time}</span>
                        </div>
                        <div className="activity-content">
                          <div className="activity-image">
                            {activity.image ? (
                              <img
                                src={activity.image}
                                alt={activity.title}
                                onError={(e) => {
                                  // Replace broken image with emoji fallback (avoid external placeholder request)
                                  try {
                                    const emoji = activity.emoji || '📍';
                                    const wrapper = document.createElement('div');
                                    wrapper.className = 'activity-emoji';
                                    wrapper.setAttribute('aria-hidden', 'true');
                                    wrapper.textContent = emoji;
                                    e.target.replaceWith(wrapper);
                                  } catch (err) {
                                    e.target.style.display = 'none';
                                  }
                                }}
                              />
                            ) : (
                              <div className="activity-emoji" aria-hidden>
                                {activity.emoji || '📍'}
                              </div>
                            )}
                          </div>
                          <div className="activity-details">
                            <h4>{activity.title}</h4>
                            <p>{activity.description}</p>
                            <span className="activity-period">{activity.period}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="itinerary-map-container">
            <MapContainer
              center={itinerary.center}
              zoom={12}
              className="itinerary-map"
              scrollWheelZoom={true}
              touchZoom={true}
              doubleClickZoom={true}
              zoomControl={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              {/* Pin color palette by day */}
              {(() => {
                const dayColors = [
                  '#2563eb', // blue (day 1)
                  '#22c55e', // green (day 2)
                  '#facc15', // yellow (day 3)
                  '#f472b6', // pink (day 4)
                  '#a78bfa', // purple (day 5)
                  '#f87171', // red (day 6)
                  '#38bdf8', // sky (day 7)
                ];
                // Custom icon generator
                function createColoredIcon(color) {
                  return new L.Icon({
                    iconUrl: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='48' viewBox='0 0 32 48'><g><ellipse cx='16' cy='16' rx='14' ry='14' fill='white' stroke='${encodeURIComponent(color)}' stroke-width='3'/><path d='M16 2C8.268 2 2 8.268 2 16c0 8.837 12.5 28 14 28s14-19.163 14-28C30 8.268 23.732 2 16 2z' fill='${encodeURIComponent(color)}' stroke='${encodeURIComponent(color)}' stroke-width='2'/><circle cx='16' cy='16' r='7' fill='white' stroke='${encodeURIComponent(color)}' stroke-width='2'/></g></svg>` ,
                    iconSize: [32, 48],
                    iconAnchor: [16, 48],
                    popupAnchor: [0, -44],
                    className: 'custom-leaflet-pin',
                  });
                }
                // Tooltip content helper
                function getTooltip(pin) {
                  return `Day ${pin.day || '?'} - ${pin.time || ''} ${pin.title || ''}`;
                }
                // Popup content helper
                function getPopup(pin) {
                  // Robustly find the activity by title and time, fallback to just title
                  let activity = undefined;
                  if (pin.day && itinerary.dailyPlan[pin.day-1]) {
                    activity = itinerary.dailyPlan[pin.day-1].activities.find(a => a.title === pin.title && (a.time === pin.time || a.period === pin.time));
                    if (!activity) {
                      activity = itinerary.dailyPlan[pin.day-1].activities.find(a => a.title === pin.title);
                    }
                  }
                  return (
                    <div className="map-popup-details">
                      <div className="popup-title">{activity?.title || pin.title}</div>
                      <div className="popup-row"><b>Day:</b> {pin.day || '?'}</div>
                      <div className="popup-row"><b>Time:</b> {pin.time || ''}</div>
                      <div className="popup-row"><b>Description:</b> {activity?.description || ''}</div>
                      <div className="popup-row"><b>Tag:</b> <span className="popup-tag">{activity?.tag || 'Hidden Gem'}</span></div>
                    </div>
                  );
                }
                return itinerary.allPins.map((pin, index) => {
                  const color = dayColors[(pin.day-1)%dayColors.length];
                  return (
                    <Marker
                      key={index}
                      position={pin.position}
                      icon={createColoredIcon(color)}
                      eventHandlers={{
                        mouseover: (e) => {
                          e.target.openTooltip();
                        },
                        mouseout: (e) => {
                          e.target.closeTooltip();
                        },
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -32]} opacity={1} className="custom-tooltip">
                        {getTooltip(pin)}
                      </Tooltip>
                      <Popup className="custom-popup">
                        {getPopup(pin)}
                      </Popup>
                    </Marker>
                  );
                });
              })()}
              {/* Solid line connecting pins */}
              {itinerary.allPins.length > 1 && (
                <Polyline
                  positions={itinerary.allPins.map(pin => pin.position)}
                  color="#0400ffff" // red
                  weight={4}
                  opacity={0.85}
                  dashArray={null}
                />
              )}
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItineraryPlanner;
