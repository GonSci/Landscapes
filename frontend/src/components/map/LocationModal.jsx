import React, { useState } from 'react';
import { Clock, MapPin, Star, Phone, Globe, Navigation, Bookmark, Share2, X } from 'lucide-react';

const LocationModal = ({ location, onClose }) => {
  const [showCommunity, setShowCommunity] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [communityMessages, setCommunityMessages] = useState([]);
  const [messageLikes, setMessageLikes] = useState({});
  const [activeCategory, setActiveCategory] = useState('activities'); // activities, places, food
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showItemDetail, setShowItemDetail] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState(null);

  if (!location) return null;

  // Comprehensive marketplace data for each location
  const locationMarketplace = {
    baguio: {
      activities: [
        { id: 1, name: 'Strawberry Picking', crowdLevel: 'Low', rating: 4.8, reviews: 892, image: '/assets/featured_images/strawberry-picking-experience.jpg', emoji: '🍓', description: 'Pick fresh strawberries at La Trinidad', business: 'Strawberry Farms', bestTime: '6:00 AM - 4:00 PM' },
        { id: 2, name: 'Burnham Park Boat Ride', crowdLevel: 'Moderate', rating: 4.6, reviews: 456, image: '/assets/featured_images/burnham-park-boat-ride.jpg', emoji: '🚣', description: 'Scenic lake paddleboat ride', business: 'Burnham Park Admin', bestTime: '8:00 AM - 6:00 PM' },
        { id: 3, name: 'Tam-Awan Village Tour', crowdLevel: 'High', rating: 4.7, reviews: 234, image: '/assets/featured_images/tam-awan-village-tour.jpg', emoji: '🏘️', description: 'Cordillera cultural village', business: 'Tam-Awan Village', bestTime: '9:00 AM - 6:00 PM' },
        { id: 4, name: 'Mines View Park', crowdLevel: 'Low', rating: 4.7, reviews: 1234, image: '/assets/featured_images/mines-view-park-photography.jpg', emoji: '📷', description: 'Mountain views & souvenir shops', business: 'Baguio Tourism', bestTime: '6:00 AM - 6:00 PM' }
      ],
      places: [
        { id: 1, name: 'The Mansion', crowdLevel: 'Moderate', rating: 4.8, reviews: 678, image: '/assets/featured_images/the-mansion.jpg', emoji: '🏛️', description: 'Official summer residence of President', business: 'Philippine Gov', bestTime: '7:00 AM - 5:00 PM' },
        { id: 2, name: 'Botanical Garden', crowdLevel: 'High', rating: 4.6, reviews: 567, image: '/assets/featured_images/botanical-garden.jpg', emoji: '🏺', description: 'Peaceful garden with Igorot sculptures', business: 'Baguio Parks', bestTime: '6:00 AM - 6:00 PM' },
        { id: 3, name: 'Session Road', crowdLevel: 'High', rating: 4.7, reviews: 2341, image: '/assets/featured_images/session-road.jpg', emoji: '🛍️', description: 'Main shopping & dining street', business: 'Session Road Assoc.', bestTime: '9:00 AM - 10:00 PM' },
        { id: 4, name: 'Bell Church', crowdLevel: 'Low', rating: 4.8, reviews: 456, image: '/assets/featured_images/bell-church.jpg', emoji: '⛪', description: 'Historic church with prayer bell', business: 'Baguio Cathedral', bestTime: '6:00 AM - 7:00 PM' }
      ],
      food: [
        { id: 1, name: 'Good Shepherd Convent', crowdLevel: 'Low', rating: 4.9, reviews: 3456, image: '/assets/featured_images/good-shepherd-convent.jpg', emoji: '🪧', description: 'Famous ube jam & strawberry jam', business: 'Good Shepherd', bestTime: '8:00 AM - 5:00 PM' },
        { id: 2, name: 'Hill Station', crowdLevel: 'Low', rating: 4.8, reviews: 892, image: '/assets/featured_images/hill-station.jpg', emoji: '🍽️', description: 'Fine dining with mountain views', business: 'Hill Station Rest.', bestTime: '11:00 AM - 2:00 PM, 6:00 PM - 10:00 PM' },
        { id: 3, name: 'Vizco\'s', crowdLevel: 'Moderate', rating: 4.7, reviews: 1234, image: '/assets/featured_images/vizcos.jpg', emoji: '🍰', description: 'Strawberry shortcake & pastries', business: 'Vizco\'s Bakery', bestTime: '8:00 AM - 8:00 PM' },
        { id: 4, name: 'Strawberry Taho Vendors', crowdLevel: 'Low', rating: 4.9, reviews: 567, image: '/assets/featured_images/strawberry-taho-vendors.jpg', emoji: '🥛', description: 'Fresh strawberry taho at parks', business: 'Various Vendors', bestTime: '6:00 AM - 10:00 AM' }
      ]
    },
  };

  const currentMarketplace = locationMarketplace[location.id] || { activities: [], places: [], food: [] };

  // Reviews data for featured items
  const itemReviews = {
    'Good Shepherd Convent': [
      { id: 1, user: 'Grace Lee', rating: 5, date: '3 days ago', comment: 'Their ube jam is legendary! Been buying here for 20 years. Also try the strawberry jam and peanut brittle. Perfect pasalubong!', helpful: 67 },
      { id: 2, user: 'Robert Chen', rating: 5, date: '1 week ago', comment: 'Best food souvenir from Baguio! The ube jam tastes homemade and natural. Not too sweet. Stock up!', helpful: 52 },
      { id: 3, user: 'Anna Reyes', rating: 5, date: '2 weeks ago', comment: 'A Baguio institution! Great quality, reasonable prices. Their cashew brittle is also excellent. Get there early to avoid crowds.', helpful: 43 },
      { id: 4, user: 'Mark Davis', rating: 5, date: '3 weeks ago', comment: 'Everyone visiting Baguio should stop here. The products are authentic and delicious. Supporting a good cause too!', helpful: 38 }
    ]
  };

  // Function to get reviews for an item
  const getItemReviews = (itemName) => {
    return itemReviews[itemName] || [
      { id: 1, user: 'Patricia Wong', rating: 5, date: '1 week ago', comment: 'Great experience! Would definitely recommend to anyone visiting the area.', helpful: 10 },
      { id: 2, user: 'Marcus Rodriguez', rating: 4, date: '2 weeks ago', comment: 'Really enjoyed this! Good value for money and friendly staff.', helpful: 8 },
      { id: 3, user: 'Samantha Chen', rating: 5, date: '3 weeks ago', comment: 'One of the highlights of my trip! Don\'t miss this place.', helpful: 12 }
    ];
  };

  const handleShowReviews = (item) => {
    setSelectedItem(item);
    setShowReviewsModal(true);
  };

  const handleShowItemDetail = (item) => {
    setSelectedDetailItem(item);
    setShowItemDetail(true);
  };

  const handleCloseItemDetail = () => {
    setShowItemDetail(false);
    setSelectedDetailItem(null);
  };

  // Community insights data for each location
  const communityInsights = {
    baguio: [
      { id: 1, user: 'Jason', avatar: '🧔', message: 'The weather is PERFECT! 15-20°C even in summer. Bring a jacket! Mines View Park has great strawberries and mountain views. 🍓', time: '3 hours ago', likes: 18 },
      { id: 2, user: 'Sean', avatar: '👨', message: 'Burnham Park boat rides are fun! Session Road for shopping and ukay-ukay finds. Good Shepherd for pasalubong - their ube jam is famous! 🫙', time: '8 hours ago', likes: 14 },
      { id: 3, user: 'Lily', avatar: '👩', message: 'Tam-Awan Village showcases Cordillera culture beautifully. Also visited Botanical Garden and Bell Church. The whole city is Instagram-worthy! 📷', time: '1 day ago', likes: 16 },
      { id: 4, user: 'Mark', avatar: '🧑', message: 'Traffic is CRAZY on weekends! Visit weekdays if possible. Try strawberry taho and fresh vegetables at the market. Affordable accommodations everywhere! 🚗', time: '2 days ago', likes: 12 }
    ]
  };

  const currentCommunity = communityInsights[location.id] || [];

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMsg = {
        id: Date.now(),
        user: 'You',
        avatar: '😊',
        message: newMessage,
        time: 'Just now',
        likes: 0,
        isOwn: true
      };
      setCommunityMessages([...communityMessages, newMsg]);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLike = (messageId) => {
    setMessageLikes(prev => ({
      ...prev,
      [messageId]: (prev[messageId] || 0) + 1
    }));
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[1000] p-5 animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-[#0a0f1e]/90 border border-white/10 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl animate-in slide-in-from-bottom-8 backdrop-blur-2xl" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-6 right-6 bg-white/5 border border-white/10 w-10 h-10 rounded-xl font-light text-xl cursor-pointer flex items-center justify-center z-20 text-slate-400 transition-all hover:bg-white/20 hover:text-white hover:rotate-90 shadow-lg" onClick={onClose}>✕</button>
        
        <div className="flex flex-col justify-between items-center p-8 px-10 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 to-purple-600/10">
          <h2 className="m-0 text-3xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-tight">{location.name}</h2>
          <div className="inline-flex items-center gap-1.5 mt-1 text-slate-400 text-sm font-bold tracking-widest uppercase">{location.region}</div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-0 bg-black/40 border-b border-white/10 px-8">
          <button 
            className={`flex-1 px-6 py-4 border-none bg-transparent text-sm font-bold transition-all relative flex items-center justify-center gap-2 border-b-2 ${!showCommunity ? 'text-white border-b-[#667eea] bg-white/5 shadow-[inset_0_-10px_20px_-10px_rgba(102,126,234,0.2)]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'}`}
            onClick={() => setShowCommunity(false)}
          >
            Information
          </button>
          <button 
            className={`flex-1 px-6 py-4 border-none bg-transparent text-sm font-bold transition-all relative flex items-center justify-center gap-2 border-b-2 ${showCommunity ? 'text-white border-b-[#667eea] bg-white/5 shadow-[inset_0_-10px_20px_-10px_rgba(102,126,234,0.2)]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'}`}
            onClick={() => setShowCommunity(true)}
          >
            Community Chat
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black min-w-5 text-center shadow-lg transition-all ${showCommunity ? 'bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white shadow-indigo-500/30' : 'bg-slate-700 text-slate-300'}`}>{currentCommunity.length + communityMessages.length}</span>
          </button>
        </div>

        <div className="p-0 px-8 pb-6">
          {/* Information Tab */}
          {!showCommunity && (
            <div className="animate-in fade-in duration-500">
              <div className="w-full h-72 rounded-2xl overflow-hidden mb-6 border border-white/5 shadow-2xl mt-6">
                <img 
                  src={location.image || '/assets/images/philippines-placeholder.jpg'} 
                  alt={location.name}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                  onError={(e) => {
                    e.target.src = '/assets/images/philippines-placeholder.jpg';
                  }}
                />
              </div>

              <p className="text-slate-300 leading-relaxed mb-8 text-[15px] font-medium">
                {location.description || 'Discover this beautiful location in the Philippines!'}
              </p>

              {/* Marketplace Categories */}
              <div className="mt-8">
                <div className="flex gap-2 mb-6 bg-black/40 p-1.5 rounded-2xl border border-white/10 shadow-inner">
                  <button 
                    className={`flex-1 flex flex-col items-center gap-1.5 px-4 py-3.5 border-none bg-transparent rounded-xl cursor-pointer transition-all font-bold text-slate-400 ${activeCategory === 'activities' ? 'bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20' : 'hover:bg-white/5 hover:text-slate-200'}`}
                    onClick={() => setActiveCategory('activities')}
                  >
                    <span className="text-2xl">🎯</span>
                    <span className="text-[11px] uppercase tracking-wider">Activities</span>
                  </button>
                  <button 
                    className={`flex-1 flex flex-col items-center gap-1.5 px-4 py-3.5 border-none bg-transparent rounded-xl cursor-pointer transition-all font-bold text-slate-400 ${activeCategory === 'places' ? 'bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20' : 'hover:bg-white/5 hover:text-slate-200'}`}
                    onClick={() => setActiveCategory('places')}
                  >
                    <span className="text-2xl">📍</span>
                    <span className="text-[11px] uppercase tracking-wider">Places</span>
                  </button>
                  <button 
                    className={`flex-1 flex flex-col items-center gap-1.5 px-4 py-3.5 border-none bg-transparent rounded-xl cursor-pointer transition-all font-bold text-slate-400 ${activeCategory === 'food' ? 'bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20' : 'hover:bg-white/5 hover:text-slate-200'}`}
                    onClick={() => setActiveCategory('food')}
                  >
                    <span className="text-2xl">🍴</span>
                    <span className="text-[11px] uppercase tracking-wider">Food</span>
                  </button>
                </div>

                <div className="flex flex-col gap-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                  {currentMarketplace[activeCategory]?.map((item) => (
                    <div key={item.id} className="group flex gap-5 p-4 bg-white/5 border border-white/5 rounded-2xl transition-all cursor-pointer hover:bg-white/10 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1" onClick={() => handleShowItemDetail(item)}>
                      <div className="relative flex-shrink-0 w-28 h-28 bg-slate-800 rounded-xl overflow-hidden border border-white/5">
                        <img 
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="absolute inset-0 hidden items-center justify-center text-4xl">
                          {item.emoji}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <h5 className="m-0 mb-1 text-base font-bold text-white group-hover:text-indigo-300 transition-colors">{item.name}</h5>
                        <p className="m-0 mb-3 text-xs text-slate-400 leading-relaxed line-clamp-2">{item.description}</p>
                        {item.bestTime && (
                          <div className="inline-flex items-center gap-1.5 mb-3 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px] text-indigo-300 font-bold uppercase tracking-wide">
                            <Clock size={12} className="text-indigo-400 flex-shrink-0" />
                            <span>Peak: {item.bestTime}</span>
                          </div>
                        )}
                        <div className="flex gap-3 items-center mb-0 mt-auto">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border transition-all ${item.crowdLevel?.toLowerCase() === 'low' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : item.crowdLevel?.toLowerCase() === 'moderate' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]'}`}>
                            {item.crowdLevel}
                          </span>
                          <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                            ⭐ {item.rating} <span className="text-slate-500 font-medium">({item.reviews})</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Community Chat Tab */}
          {showCommunity && (
            <div className="animate-in fade-in duration-500 flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-6 px-8 max-h-[450px] min-h-[300px] custom-scrollbar">
                {currentCommunity.map((msg) => {
                  const messageKey = `${location.id}-${msg.id}`;
                  const currentLikes = messageLikes[messageKey] !== undefined 
                    ? msg.likes + messageLikes[messageKey]
                    : msg.likes;
                  
                  return (
                    <div key={msg.id} className="flex gap-4 p-1 mb-5 transition-all">
                      <div className="text-2xl w-10 h-10 flex items-center justify-center bg-slate-700 rounded-full flex-shrink-0 self-end shadow-lg border border-white/10">{msg.avatar}</div>
                      <div className="max-w-[80%] flex-1 bg-white/5 border border-white/5 px-5 py-4 rounded-2xl shadow-xl backdrop-blur-md">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-white text-sm">{msg.user}</span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{msg.time}</span>
                        </div>
                        <p className="m-0 mb-4 text-slate-300 leading-relaxed text-sm break-words">{msg.message}</p>
                        <div className="flex gap-2">
                          <button 
                            className="bg-white/5 border border-white/5 p-1.5 px-3 rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1.5 text-slate-400 font-bold hover:bg-white/10 hover:text-indigo-400"
                            onClick={() => handleLike(messageKey)}
                          >
                            <span>👍</span> {currentLikes}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {communityMessages.map((msg, index) => (
                  <div key={index} className={`flex gap-4 p-1 mb-5 transition-all ${msg.user === 'You' ? 'flex-row-reverse' : ''}`}>
                    <div className="text-2xl w-10 h-10 flex items-center justify-center bg-indigo-600 rounded-full flex-shrink-0 self-end shadow-lg shadow-indigo-500/20 border border-white/10">{msg.avatar}</div>
                    <div className={`max-w-[80%] flex-1 px-5 py-4 rounded-2xl shadow-xl backdrop-blur-md ${msg.user === 'You' ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-white/5 border border-white/5'}`}>
                      <div className={`flex items-center gap-2 mb-2 ${msg.user === 'You' ? 'flex-row-reverse' : ''}`}>
                        <span className="font-bold text-white text-sm">{msg.user}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{msg.time}</span>
                      </div>
                      <p className={`m-0 mb-4 text-slate-300 leading-relaxed text-sm break-words ${msg.user === 'You' ? 'text-right' : ''}`}>{msg.message}</p>
                      <div className={`flex gap-2 ${msg.user === 'You' ? 'flex-row-reverse' : ''}`}>
                        <button 
                          className="bg-white/5 border border-white/5 p-1.5 px-3 rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1.5 text-slate-400 font-bold hover:bg-white/10 hover:text-indigo-400"
                          onClick={() => handleLike(`${msg.id || index}`)}
                        >
                          <span>👍</span> {messageLikes[`${msg.id || index}`] || msg.likes || 0}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 items-center p-6 px-8 bg-black/20 border-t border-white/5 flex-shrink-0">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Share your experience..."
                  className="flex-1 px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-white font-medium transition-all focus:outline-none focus:border-indigo-500 focus:bg-white/10 placeholder:text-slate-500"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="px-8 py-3.5 bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white border-none rounded-2xl font-bold text-sm cursor-pointer transition-all shadow-lg shadow-indigo-500/20 whitespace-nowrap flex-shrink-0 hover:shadow-indigo-500/40 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Removed Been There and Want to Go buttons */}
      </div>

      {/* Item Detail Modal */}
      {showItemDetail && selectedDetailItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-[1001] p-5 animate-in fade-in duration-300" onClick={handleCloseItemDetail}>
          <div className="bg-[#1e293b]/95 border border-white/10 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl animate-in slide-in-from-bottom-8 backdrop-blur-2xl" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-6 right-6 w-10 h-10 border border-white/10 bg-white/5 rounded-xl flex items-center justify-center text-xl cursor-pointer transition-all text-slate-400 hover:bg-white/20 hover:text-white z-50" onClick={handleCloseItemDetail}>
              <X size={20} />
            </button>

            {/* Header */}
            <div className="p-8 bg-gradient-to-r from-indigo-500/10 to-purple-600/10 border-b border-white/5">
              <div className="inline-block bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4 shadow-lg shadow-indigo-500/20">
                {activeCategory === 'activities' && 'Activity'}
                {activeCategory === 'places' && 'Place'}
                {activeCategory === 'food' && 'Food'}
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">{selectedDetailItem.name}</h2>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill={i < Math.floor(selectedDetailItem.rating) ? "#f59e0b" : "transparent"} color={i < Math.floor(selectedDetailItem.rating) ? "#f59e0b" : "#475569"} />
                  ))}
                </div>
                <span className="text-lg font-black text-white">{selectedDetailItem.rating}</span>
                <span className="text-sm text-slate-500 font-bold uppercase tracking-wider">({selectedDetailItem.reviews} reviews)</span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="flex gap-4 items-start p-4 bg-white/5 rounded-2xl border border-white/5">
                  <MapPin size={20} className="text-indigo-400 flex-shrink-0" />
                  <div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Location</div>
                    <div className="text-sm text-slate-200 font-semibold">{location.name}, Baguio City</div>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 bg-white/5 rounded-2xl border border-white/5">
                  <Clock size={20} className="text-amber-400 flex-shrink-0" />
                  <div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Best time</div>
                    <div className="text-sm text-slate-200 font-semibold">{selectedDetailItem.bestTime || 'Anytime'}</div>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 bg-white/5 rounded-2xl border border-white/5">
                  <Globe size={20} className="text-emerald-400 flex-shrink-0" />
                  <div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Operator</div>
                    <div className="text-sm text-slate-200 font-semibold">{selectedDetailItem.business}</div>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 bg-white/5 rounded-2xl border border-white/5">
                  <Phone size={20} className="text-rose-400 flex-shrink-0" />
                  <div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Contact</div>
                    <div className="text-sm text-slate-200 font-semibold">+63 74 442 XXXX</div>
                  </div>
                </div>
              </div>

              {/* About */}
              <div className="mb-10">
                <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-1 bg-indigo-500 rounded-full"></span>
                  About this experience
                </h3>
                <p className="text-slate-400 leading-relaxed font-medium">{selectedDetailItem.description}</p>
              </div>

              {/* Pricing */}
              <div className="mb-10">
                <div className="flex justify-between items-center p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl shadow-inner">
                  <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">Estimated Cost</span>
                  <span className="text-xl font-black text-white">{selectedDetailItem.price || 'P250 - P500'}</span>
                </div>
              </div>

              {/* Reviews Preview */}
              <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
                <h3 className="text-base font-black text-white mb-5 flex justify-between items-center">
                  <span>Guest Reviews</span>
                  <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-1 rounded-md uppercase tracking-widest">{selectedDetailItem.reviews} TOTAL</span>
                </h3>
                <button 
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-bold text-sm cursor-pointer transition-all hover:bg-white/10 hover:border-indigo-500/50 hover:shadow-xl active:scale-[0.98]"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShowReviews(selectedDetailItem);
                    handleCloseItemDetail();
                  }}
                >
                  Read all community reviews
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reviews Modal */}
      {showReviewsModal && selectedItem && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[2000] p-5 animate-in fade-in duration-300" onClick={() => setShowReviewsModal(false)}>
          <div className="bg-[#1e293b] border border-white/10 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-8 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 border-b border-white/5 bg-black/20 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="m-0 mb-1 text-2xl font-black text-white tracking-tight">{selectedItem.name}</h3>
                <div className="flex items-center gap-2 text-sm font-bold">
                  <span className="text-amber-400">⭐ {selectedItem.rating}</span>
                  <span className="text-slate-500 uppercase tracking-widest text-[10px]">({selectedItem.reviews} Verified Reviews)</span>
                </div>
              </div>
              <button className="w-10 h-10 border border-white/10 bg-white/5 rounded-xl flex items-center justify-center text-xl cursor-pointer transition-all text-slate-400 hover:bg-white/10 hover:text-white" onClick={() => setShowReviewsModal(false)}>✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-900/30 space-y-6 custom-scrollbar">
              {getItemReviews(selectedItem.name).map((review) => (
                <div key={review.id} className="bg-white/5 border border-white/5 rounded-2xl p-6 transition-all hover:bg-white/10 hover:border-indigo-500/30 shadow-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-white text-sm">{review.user}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{review.date}</span>
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={12} fill={i < review.rating ? "#f59e0b" : "transparent"} color={i < review.rating ? "#f59e0b" : "#475569"} />
                      ))}
                    </div>
                  </div>
                  <p className="m-0 mb-5 text-slate-300 text-sm leading-relaxed font-medium">{review.comment}</p>
                  <div className="flex items-center gap-2">
                    <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer transition-all hover:bg-white/10 hover:text-indigo-400">
                      👍 Helpful ({review.helpful})
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-8 border-t border-white/5 bg-black/20 flex-shrink-0">
              <button className="w-full px-6 py-4 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none rounded-xl font-black text-sm uppercase tracking-widest cursor-pointer transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5">✍️ Write a Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LocationModal;
