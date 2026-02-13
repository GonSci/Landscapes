import React, { useState } from 'react';
import { Clock, MapPin, Star, Phone, Globe, Navigation, Bookmark, Share2, X } from 'lucide-react';
import './LocationModal.css';

const LocationModal = ({ location, onClose, onMarkBeen, onMarkWant, onAskAI }) => {
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        
        <div className="modal-header">
          <h2>{location.name}</h2>
          <div className="region-badge">{location.region}</div>
        </div>

        {/* Tab Navigation */}
        <div className="modal-tabs">
          <button 
            className={`tab-button ${!showCommunity ? 'active' : ''}`}
            onClick={() => setShowCommunity(false)}
          >
            📍 Information
          </button>
          <button 
            className={`tab-button ${showCommunity ? 'active' : ''}`}
            onClick={() => setShowCommunity(true)}
          >
            💬 Community Chat
            <span className="tab-badge">{currentCommunity.length + communityMessages.length}</span>
          </button>
        </div>

        <div className="modal-body">
          {/* Information Tab */}
          {!showCommunity && (
            <div className="info-section">
              <div className="location-image">
                <img 
                  src={location.image || '/assets/images/philippines-placeholder.jpg'} 
                  alt={location.name}
                  onError={(e) => {
                    e.target.src = '/assets/images/philippines-placeholder.jpg';
                  }}
                />
              </div>

              <p className="location-description">
                {location.description || 'Discover this beautiful location in the Philippines!'}
              </p>

              {/* Marketplace Categories */}
              <div className="marketplace-section">
                <div className="marketplace-tabs">
                  <button 
                    className={`marketplace-tab ${activeCategory === 'activities' ? 'active' : ''}`}
                    onClick={() => setActiveCategory('activities')}
                  >
                    <span className="tab-icon">🎯</span>
                    <span className="tab-label">Activities</span>
                  </button>
                  <button 
                    className={`marketplace-tab ${activeCategory === 'places' ? 'active' : ''}`}
                    onClick={() => setActiveCategory('places')}
                  >
                    <span className="tab-icon">📍</span>
                    <span className="tab-label">Places</span>
                  </button>
                  <button 
                    className={`marketplace-tab ${activeCategory === 'food' ? 'active' : ''}`}
                    onClick={() => setActiveCategory('food')}
                  >
                    <span className="tab-icon">🍴</span>
                    <span className="tab-label">Food</span>
                  </button>
                </div>

                <div className="marketplace-content">
                  {currentMarketplace[activeCategory]?.map((item) => (
                    <div key={item.id} className="marketplace-card" onClick={() => handleShowItemDetail(item)}>
                      <div className="card-image-container">
                        <img 
                          src={item.image}
                          alt={item.name}
                          className="card-thumbnail"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="card-image-fallback" style={{ display: 'none' }}>
                          {item.emoji}
                        </div>
                      </div>
                      <div className="card-info">
                        <h5 className="card-name">{item.name}</h5>
                        <p className="card-description">{item.description}</p>
                        {item.bestTime && (
                          <div className="card-best-time">
                            <Clock size={16} />
                            <span>Peak hours: <strong>{item.bestTime}</strong></span>
                          </div>
                        )}
                        <div className="card-meta">
                          <span className={`crowd-level crowd-level-${item.crowdLevel?.toLowerCase()}`}>
                            Crowd Level: {item.crowdLevel}
                          </span>
                          <span className="card-rating">
                            ⭐ {item.rating} <span className="reviews">({item.reviews})</span>
                          </span>
                        </div>
                        <div className="card-footer-info">
                          <p className="card-business">🏢 {item.business}</p>
                          <button className="card-reviews-link" onClick={(e) => {
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
            <div className="community-section">
              <div className="community-messages">
                {currentCommunity.map((msg) => {
                  const messageKey = `${location.id}-${msg.id}`;
                  const currentLikes = messageLikes[messageKey] !== undefined 
                    ? msg.likes + messageLikes[messageKey]
                    : msg.likes;
                  
                  return (
                    <div key={msg.id} className="community-message">
                      <div className="message-avatar">{msg.avatar}</div>
                      <div className="message-content">
                        <div className="message-header">
                          <span className="message-user">{msg.user}</span>
                          <span className="message-time">{msg.time}</span>
                        </div>
                        <p className="message-text">{msg.message}</p>
                        <div className="message-footer">
                          <button 
                            className="message-like"
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
                  <div key={index} className={`community-message ${msg.user === 'You' ? 'own-message' : ''}`}>
                    <div className="message-avatar">{msg.avatar}</div>
                    <div className="message-content">
                      <div className="message-header">
                        <span className="message-user">{msg.user}</span>
                        <span className="message-time">{msg.time}</span>
                      </div>
                      <p className="message-text">{msg.message}</p>
                      <div className="message-footer">
                        <button 
                          className="message-like"
                          onClick={() => handleLike(`${msg.id || index}`)}
                        >
                          <span>👍</span> {messageLikes[`${msg.id || index}`] || msg.likes || 0}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="community-input">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Share your experience..."
                  className="message-input"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="send-button"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onMarkBeen} className="btn btn-success">
            ✅ Been There
          </button>
          <button onClick={onMarkWant} className="btn btn-warning">
            ⭐ Want to Go
          </button>
          <button onClick={onAskAI} className="btn btn-primary">
            🤖 Ask AI
          </button>
        </div>
      </div>

      {/* Item Detail Modal */}
      {showItemDetail && selectedDetailItem && (
        <div className="item-detail-overlay" onClick={handleCloseItemDetail}>
          <div className="item-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="item-detail-close" onClick={handleCloseItemDetail}>
              <X size={20} />
            </button>

            {/* Header Image */}
            <div className="item-detail-header">
              <div className="item-detail-image">
                <div className="item-detail-category-badge">
                  {activeCategory === 'activities' && 'Activity'}
                  {activeCategory === 'places' && 'Place'}
                  {activeCategory === 'food' && 'Food'}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="item-detail-content">
              <h2 className="item-detail-name">{selectedDetailItem.name}</h2>
              
              <div className="item-detail-rating">
                <Star size={18} fill="#f59e0b" color="#f59e0b" />
                <span className="rating-value">{selectedDetailItem.rating}</span>
                <span className="rating-reviews">({selectedDetailItem.reviews} reviews)</span>
              </div>

              <div className="item-detail-type">
                {activeCategory === 'activities' && 'Activity'}
                {activeCategory === 'places' && 'Tourist Spot'}
                {activeCategory === 'food' && 'Restaurant'}
              </div>

              {/* Details */}
              <div className="item-detail-info">
                <div className="info-item">
                  <MapPin size={16} />
                  <div>
                    <div className="info-label">Address</div>
                    <div className="info-value">{location.name}, Philippines</div>
                  </div>
                </div>

                <div className="info-item">
                  <Clock size={16} />
                  <div>
                    <div className="info-label">Best time to visit</div>
                    <div className="info-value">{selectedDetailItem.bestTime || 'Anytime'}</div>
                  </div>
                </div>

                <div className="info-item">
                  <Globe size={16} />
                  <div>
                    <div className="info-label">Business</div>
                    <div className="info-value">{selectedDetailItem.business}</div>
                  </div>
                </div>

                <div className="info-item">
                  <Phone size={16} />
                  <div>
                    <div className="info-label">Contact</div>
                    <div className="info-value">+63 (2) 8XXX XXXX</div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="item-detail-description">
                <h3>About</h3>
                <p>{selectedDetailItem.description}</p>
              </div>

              {/* Price Info */}
              <div className="item-detail-price-section">
                <h3>Pricing</h3>
                <div className="price-box">
                  <span className="price-label">Entry Fee / Cost:</span>
                  <span className="price-amount">{selectedDetailItem.price}</span>
                </div>
              </div>

              {/* Reviews Section */}
              <div className="item-detail-reviews-section">
                <h3>Reviews</h3>
                <button 
                  className="view-all-reviews-btn"
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
        <div className="reviews-modal-overlay" onClick={() => setShowReviewsModal(false)}>
          <div className="reviews-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reviews-modal-header">
              <div className="reviews-header-info">
                <div>
                  <h3 className="reviews-item-name">{selectedItem.name}</h3>
                  <div className="reviews-item-rating">
                    <span className="rating-stars">⭐ {selectedItem.rating}</span>
                    <span className="rating-count">({selectedItem.reviews} reviews)</span>
                  </div>
                </div>
              </div>
              <button className="reviews-close-btn" onClick={() => setShowReviewsModal(false)}>✕</button>
            </div>

            <div className="reviews-list">
              {getItemReviews(selectedItem.name).map((review) => (
                <div key={review.id} className="review-card">
                  <div className="review-header">
                    <div className="review-user">
                      <div className="review-user-info">
                        <span className="review-username">{review.user}</span>
                        <span className="review-date">{review.date}</span>
                      </div>
                    </div>
                    <div className="review-rating">
                      {'⭐'.repeat(review.rating)}
                    </div>
                  </div>
                  <p className="review-comment">{review.comment}</p>
                  <div className="review-footer">
                    <button className="review-helpful">
                      👍 Helpful ({review.helpful})
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="reviews-modal-footer">
              <button className="btn-write-review">✍️ Write a Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LocationModal;
