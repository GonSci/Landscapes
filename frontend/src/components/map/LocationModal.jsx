import React, { useState } from 'react';
import { Clock, MapPin, Star, Phone, Globe, Navigation, Bookmark, Share2, X } from 'lucide-react';

const LocationModal = ({ location, onClose, onMarkBeen, onMarkWant }) => {
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
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-lg flex items-center justify-center z-[1000] p-5 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl border-2 border-slate-200 animate-in slide-in-from-bottom-5" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-5 right-5 bg-white border-2 border-slate-200 w-11 h-11 rounded-xl font-light text-2xl cursor-pointer flex items-center justify-center shadow-none z-10 text-slate-500 transition-all hover:bg-slate-900 hover:border-slate-900 hover:rotate-90 hover:text-white" onClick={onClose}>✕</button>
        
        <div className="flex flex-col justify-between items-center p-7 px-8 border-b-2 border-gray-200 bg-gradient-to-r from-indigo-600/5 to-purple-700/5">
          <h2 className="m-0 text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent">{location.name}</h2>
          <div className="inline-flex items-center gap-1.5 p-0 bg-transparent text-slate-500 rounded-none text-base font-black m-0 shadow-none leading-tight tracking-tight">{location.region}</div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-0 bg-gray-50 border-b-2 border-gray-200 px-8">
          <button 
            className={`flex-1 px-6 py-4 border-none bg-transparent text-base font-semibold text-gray-500 cursor-pointer transition-all relative flex items-center justify-center gap-2 border-b-4 border-transparent ${!showCommunity ? 'text-indigo-600 bg-white border-b-indigo-600' : 'hover:text-indigo-600 hover:bg-indigo-50'}`}
            onClick={() => setShowCommunity(false)}
          >
            📍 Information
          </button>
          <button 
            className={`flex-1 px-6 py-4 border-none bg-transparent text-base font-semibold text-gray-500 cursor-pointer transition-all relative flex items-center justify-center gap-2 border-b-4 border-transparent ${showCommunity ? 'text-indigo-600 bg-white border-b-indigo-600' : 'hover:text-indigo-600 hover:bg-indigo-50'}`}
            onClick={() => setShowCommunity(true)}
          >
            💬 Community Chat
            <span className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white px-2 py-0.5 rounded-full text-xs font-bold min-w-6 text-center">{currentCommunity.length + communityMessages.length}</span>
          </button>
        </div>

        <div className="p-0 px-8 pb-6">
          {/* Information Tab */}
          {!showCommunity && (
            <div className="animate-in fade-in duration-400">
              <div className="w-full h-70 rounded-2xl overflow-hidden mb-6 bg-gradient-to-br from-gray-100 to-gray-200 shadow-md">
                <img 
                  src={location.image || '/assets/images/philippines-placeholder.jpg'} 
                  alt={location.name}
                  className="w-full h-full object-cover transition-transform hover:scale-105"
                  onError={(e) => {
                    e.target.src = '/assets/images/philippines-placeholder.jpg';
                  }}
                />
              </div>

              <p className="text-gray-600 leading-relaxed mb-6 text-base">
                {location.description || 'Discover this beautiful location in the Philippines!'}
              </p>

              {/* Marketplace Categories */}
              <div className="mt-6">
                <div className="flex gap-2 mb-5 bg-gray-50 p-1.5 rounded-xl">
                  <button 
                    className={`flex-1 flex flex-col items-center gap-1 px-4 py-3 border-none bg-transparent rounded-2xl cursor-pointer transition-all font-semibold text-gray-500 ${activeCategory === 'activities' ? 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-md' : 'hover:bg-indigo-100/50 hover:text-indigo-600'}`}
                    onClick={() => setActiveCategory('activities')}
                  >
                    <span className="text-2xl">🎯</span>
                    <span className="text-xs">Activities</span>
                  </button>
                  <button 
                    className={`flex-1 flex flex-col items-center gap-1 px-4 py-3 border-none bg-transparent rounded-2xl cursor-pointer transition-all font-semibold text-gray-500 ${activeCategory === 'places' ? 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-md' : 'hover:bg-indigo-100/50 hover:text-indigo-600'}`}
                    onClick={() => setActiveCategory('places')}
                  >
                    <span className="text-2xl">📍</span>
                    <span className="text-xs">Places</span>
                  </button>
                  <button 
                    className={`flex-1 flex flex-col items-center gap-1 px-4 py-3 border-none bg-transparent rounded-2xl cursor-pointer transition-all font-semibold text-gray-500 ${activeCategory === 'food' ? 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-md' : 'hover:bg-indigo-100/50 hover:text-indigo-600'}`}
                    onClick={() => setActiveCategory('food')}
                  >
                    <span className="text-2xl">🍴</span>
                    <span className="text-xs">Food</span>
                  </button>
                </div>

                <div className="flex flex-col gap-4 max-h-[450px] overflow-y-auto pr-2">
                  {currentMarketplace[activeCategory]?.map((item) => (
                    <div key={item.id} className="flex gap-4 p-3 bg-white border-2 border-gray-200 rounded-2xl transition-all cursor-pointer hover:border-indigo-600 hover:shadow-md hover:-translate-y-0.5" onClick={() => handleShowItemDetail(item)}>
                      <div className="relative flex-shrink-0 w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden">
                        <img 
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="absolute inset-0 hidden items-center justify-center text-6xl">
                          {item.emoji}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <h5 className="m-0 mb-1.5 text-base font-bold text-gray-800 leading-tight">{item.name}</h5>
                        <p className="m-0 mb-2 text-sm text-gray-500 leading-relaxed">{item.description}</p>
                        {item.bestTime && (
                          <div className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-1 bg-gradient-to-r from-indigo-100 to-indigo-200 rounded-full text-xs text-indigo-900 whitespace-nowrap w-fit">
                            <Clock size={14} className="text-indigo-600 flex-shrink-0" />
                            <span>Peak: <strong>{item.bestTime}</strong></span>
                          </div>
                        )}
                        <div className="flex gap-3 items-center mb-2 flex-wrap">
                          <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 ${item.crowdLevel?.toLowerCase() === 'low' ? 'bg-green-500 text-white' : item.crowdLevel?.toLowerCase() === 'moderate' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'}`}>
                            Crowd: {item.crowdLevel}
                          </span>
                          <span className="text-xs font-semibold text-gray-800 flex items-center gap-1">
                            ⭐ {item.rating} <span className="text-gray-400 font-medium">({item.reviews})</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-auto gap-3">
                          <p className="m-0 text-xs text-gray-500 italic flex items-center gap-1">🏢 {item.business}</p>
                          <button className="inline-flex items-center gap-1.5 px-0 py-0 bg-transparent border-none text-gray-500 text-xs font-medium cursor-pointer transition-all hover:text-indigo-600 hover:underline" onClick={(e) => {
                            e.stopPropagation();
                            handleShowReviews(item);
                          }}>
                            💬 Reviews ({item.reviews})
                          </button>
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
            <div className="animate-in fade-in duration-400 flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-5 px-8 max-h-[450px] min-h-[300px]">
                {currentCommunity.map((msg) => {
                  const messageKey = `${location.id}-${msg.id}`;
                  const currentLikes = messageLikes[messageKey] !== undefined 
                    ? msg.likes + messageLikes[messageKey]
                    : msg.likes;
                  
                  return (
                    <div key={msg.id} className="flex gap-3 p-1 mb-3 transition-all">
                      <div className="text-2xl w-9 h-9 flex items-center justify-center bg-gray-300 rounded-full flex-shrink-0 self-end">{msg.avatar}</div>
                      <div className="max-w-[75%] flex-1 bg-white border border-gray-200 px-4 py-3 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-gray-900 text-sm">{msg.user}</span>
                          <span className="text-xs text-gray-500 font-medium">{msg.time}</span>
                        </div>
                        <p className="m-0 mb-3 text-gray-700 leading-relaxed text-sm break-words">{msg.message}</p>
                        <div className="flex gap-2">
                          <button 
                            className="bg-none border-none p-1 px-2 rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1 text-gray-500 font-medium hover:bg-gray-200 hover:text-indigo-600"
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
                  <div key={index} className={`flex gap-3 p-1 mb-3 transition-all ${msg.user === 'You' ? 'flex-row-reverse' : ''}`}>
                    <div className="text-2xl w-9 h-9 flex items-center justify-center bg-gray-300 rounded-full flex-shrink-0 self-end">{msg.avatar}</div>
                    <div className="max-w-[75%] flex-1 bg-white border border-gray-200 px-4 py-3 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-gray-900 text-sm">{msg.user}</span>
                        <span className="text-xs text-gray-500 font-medium">{msg.time}</span>
                      </div>
                      <p className="m-0 mb-3 text-gray-700 leading-relaxed text-sm break-words">{msg.message}</p>
                      <div className="flex gap-2">
                        <button 
                          className="bg-none border-none p-1 px-2 rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1 text-gray-500 font-medium hover:bg-gray-200 hover:text-indigo-600"
                          onClick={() => handleLike(`${msg.id || index}`)}
                        >
                          <span>👍</span> {messageLikes[`${msg.id || index}`] || msg.likes || 0}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 items-center p-5 px-8 bg-gray-50 border-t-2 border-gray-200 flex-shrink-0">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Share your experience..."
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-inherit transition-all focus:outline-none focus:border-indigo-600 focus:shadow-lg focus:shadow-indigo-600/10 bg-white placeholder:text-gray-500"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-700 text-white border-none rounded-2xl font-semibold text-base cursor-pointer transition-all shadow-md whitespace-nowrap flex-shrink-0 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 px-8 border-t-2 border-gray-200 bg-gray-50 rounded-none rounded-b-3xl flex-wrap">
          <button onClick={onMarkBeen} className="flex-1 px-5 py-3.5 border-none rounded-2xl font-semibold cursor-pointer transition-all text-base flex items-center justify-center gap-1.5 shadow-md bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:-translate-y-0.5">
            ✅ Been There
          </button>
          <button onClick={onMarkWant} className="flex-1 px-5 py-3.5 border-none rounded-2xl font-semibold cursor-pointer transition-all text-base flex items-center justify-center gap-1.5 shadow-md bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:-translate-y-0.5">
            ⭐ Want to Go
          </button>
        </div>
      </div>

      {/* Item Detail Modal */}
      {showItemDetail && selectedDetailItem && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-lg flex items-center justify-center z-[1001] p-5 animate-in fade-in duration-200" onClick={handleCloseItemDetail}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl animate-in slide-in-from-bottom-5" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-5 right-5 w-8 h-8 border-none bg-transparent rounded-lg flex items-center justify-center text-2xl cursor-pointer transition-all text-slate-500 hover:bg-gray-100 z-50" onClick={handleCloseItemDetail}>
              <X size={20} />
            </button>

            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-gray-200">
              <div className="inline-block bg-gradient-to-r from-indigo-600 to-purple-700 text-white px-3 py-1.5 rounded-full text-sm font-bold mb-3">
                {activeCategory === 'activities' && 'Activity'}
                {activeCategory === 'places' && 'Place'}
                {activeCategory === 'food' && 'Food'}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{selectedDetailItem.name}</h2>
              
              <div className="flex items-center gap-2 mb-2">
                <Star size={18} fill="#f59e0b" color="#f59e0b" />
                <span className="text-lg font-bold text-gray-900">{selectedDetailItem.rating}</span>
                <span className="text-sm text-gray-500">({selectedDetailItem.reviews} reviews)</span>
              </div>

              <div className="text-sm font-semibold text-gray-600 mb-6">
                {activeCategory === 'activities' && 'Activity'}
                {activeCategory === 'places' && 'Tourist Spot'}
                {activeCategory === 'food' && 'Restaurant'}
              </div>

              {/* Details */}
              <div className="space-y-4 mb-6">
                <div className="flex gap-3 items-start">
                  <MapPin size={16} className="mt-0.5 flex-shrink-0 text-gray-600" />
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Address</div>
                    <div className="text-sm text-gray-700">{location.name}, Philippines</div>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <Clock size={16} className="mt-0.5 flex-shrink-0 text-gray-600" />
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Best time to visit</div>
                    <div className="text-sm text-gray-700">{selectedDetailItem.bestTime || 'Anytime'}</div>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <Globe size={16} className="mt-0.5 flex-shrink-0 text-gray-600" />
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Business</div>
                    <div className="text-sm text-gray-700">{selectedDetailItem.business}</div>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <Phone size={16} className="mt-0.5 flex-shrink-0 text-gray-600" />
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</div>
                    <div className="text-sm text-gray-700">+63 (2) 8XXX XXXX</div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-base font-bold text-gray-800 mb-3">About</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{selectedDetailItem.description}</p>
              </div>

              {/* Price Info */}
              <div className="mb-6">
                <h3 className="text-base font-bold text-gray-800 mb-3">Pricing</h3>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm font-semibold text-gray-700">Entry Fee / Cost:</span>
                  <span className="text-sm font-bold text-gray-900">{selectedDetailItem.price || 'Contact for pricing'}</span>
                </div>
              </div>

              {/* Reviews Section */}
              <div>
                <h3 className="text-base font-bold text-gray-800 mb-3">Reviews</h3>
                <button 
                  className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-700 text-white border-none rounded-lg font-semibold cursor-pointer transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShowReviews(selectedDetailItem);
                    handleCloseItemDetail();
                  }}
                >
                  View all {selectedDetailItem.reviews} reviews
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reviews Modal */}
      {showReviewsModal && selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[2000] p-5 animate-in fade-in duration-200" onClick={() => setShowReviewsModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-lg animate-in slide-in-from-bottom-5 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-start flex-shrink-0">
              <div className="flex items-start gap-3 flex-1">
                <div>
                  <h3 className="m-0 mb-1.5 text-xl font-semibold text-gray-900 leading-tight">{selectedItem.name}</h3>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-amber-500 font-medium">⭐ {selectedItem.rating}</span>
                    <span className="text-gray-500">({selectedItem.reviews} reviews)</span>
                  </div>
                </div>
              </div>
              <button className="w-8 h-8 border-none bg-transparent rounded-2xl flex items-center justify-center text-2xl cursor-pointer transition-all text-gray-500 hover:bg-gray-200 hover:text-gray-900 flex-shrink-0" onClick={() => setShowReviewsModal(false)}>✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 bg-gray-50 space-y-4">
              {getItemReviews(selectedItem.name).map((review) => (
                <div key={review.id} className="bg-white border border-gray-200 rounded-2xl p-4 transition-all hover:border-gray-300 hover:shadow-sm">
                  <div className="flex justify-between items-start mb-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-gray-900 text-sm">{review.user}</span>
                      <span className="text-xs text-gray-500">{review.date}</span>
                    </div>
                    <div className="text-xs text-amber-500 leading-none">
                      {'⭐'.repeat(review.rating)}
                    </div>
                  </div>
                  <p className="m-0 mb-3 text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-500 cursor-pointer transition-all hover:bg-gray-200 hover:text-gray-700">
                      👍 Helpful ({review.helpful})
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <button className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-700 text-white border-none rounded-lg font-semibold cursor-pointer transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">✍️ Write a Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LocationModal;
