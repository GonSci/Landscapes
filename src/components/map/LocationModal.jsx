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
    manila: {
      activities: [
        { id: 1, name: 'Intramuros Walking Tour', price: '₱500-800', rating: 4.8, reviews: 22, image: '/assets/featured_images/intramuros-walking-tour.jpg', emoji: '🏰', description: 'Explore 400-year-old Spanish walled city', business: 'Manila Tours Co.', bestTime: '7:00 AM - 10:00 AM' },
        { id: 2, name: 'Manila Bay Sunset Cruise', price: '₱1,500', rating: 4.9, reviews: 3, image: '/assets/featured_images/manila-bay-sunset-cruise.jpg', emoji: '⛵', description: 'Romantic sunset cruise with dinner buffet', business: 'Bay Cruise Manila', bestTime: '5:00 PM - 7:00 PM' },
        { id: 3, name: 'Rizal Park Cultural Show', price: '₱300', rating: 4.6, reviews: 12, image: '/assets/featured_images/rizal-park-cultural-show.jpg', emoji: '🎭', description: 'Live cultural performances every weekend', business: 'National Parks Board', bestTime: '10:00 AM - 12:00 PM' },
        { id: 4, name: 'Street Food Tour Binondo', price: '₱650', rating: 4.9, reviews: 18, image: '/assets/featured_images/street-food-tour-binondo.jpg', emoji: '🍜', description: 'Authentic Chinatown food adventure', business: 'Manila Food Tours', bestTime: '6:00 PM - 9:00 PM' }
      ],
      places: [
        { id: 1, name: 'National Museum Complex', price: 'FREE', rating: 4.9, reviews: 3, image: '/assets/featured_images/national-museum-complex.jpg', emoji: '🏛️', description: 'World-class art and history museums', business: 'National Museum PH', bestTime: '10:00 AM - 4:00 PM' },
        { id: 2, name: 'BGC High Street', price: 'FREE', rating: 4.7, reviews: 19, image: '/assets/featured_images/bgc-high-street.jpg', emoji: '🏙️', description: 'Modern shopping and dining district', business: 'BGC Development', bestTime: '5:00 PM - 10:00 PM' },
        { id: 3, name: 'Manila Ocean Park', price: '₱800', rating: 4.5, reviews: 11, image: '/assets/featured_images/manila-ocean-park.jpg', emoji: '🐠', description: 'Aquarium & marine life experiences', business: 'Ocean Park Manila', bestTime: '10:00 AM - 3:00 PM' },
        { id: 4, name: 'SM Mall of Asia', price: 'FREE', rating: 4.6, reviews: 12, image: '/assets/featured_images/sm-mall-of-asia.jpg', emoji: '🛍️', description: 'One of largest malls in the world', business: 'SM Supermalls', bestTime: '11:00 AM - 9:00 PM' }
      ],
      food: [
        { id: 1, name: 'Barbara\'s Heritage Restaurant', price: '₱₱₱', rating: 4.8, reviews: 6, image: '/assets/featured_images/barbaras-heritage-restaurant.jpg', emoji: '🍽️', description: 'Authentic Filipino heritage cuisine', business: 'Barbara\'s Group', bestTime: '11:00 AM - 2:00 PM, 6:00 PM - 9:00 PM' },
        { id: 2, name: 'Abe Restaurant', price: '₱₱', rating: 4.7, reviews: 4, image: '/assets/featured_images/abe-restaurant.jpg', emoji: '🥘', description: 'Kapampangan traditional dishes', business: 'Abe Franchise', bestTime: '12:00 PM - 2:00 PM, 6:00 PM - 9:00 PM' },
        { id: 3, name: 'Café Adriatico', price: '₱₱', rating: 4.6, reviews: 21, image: '/assets/featured_images/cafe-adriatico.jpg', emoji: '☕', description: 'Historic café since 1980s', business: 'Café Adriatico Inc.', bestTime: '7:00 AM - 11:00 PM' },
        { id: 4, name: 'Binondo Food Stalls', price: '₱', rating: 4.9, reviews: 14, image: '/assets/featured_images/binondo-food-stalls.jpg', emoji: '🥟', description: 'Street food paradise - siopao, lumpia', business: 'Various Vendors', bestTime: '10:00 AM - 8:00 PM' }
      ]
    },
    cebu: {
      activities: [
        { id: 1, name: 'Oslob Whale Shark Watching', price: '₱1,500', rating: 4.9, reviews: 22, image: '/assets/featured_images/oslob-whale-shark-watching.jpg', emoji: '🦈', description: 'Swim with gentle giants', business: 'Oslob Tourism', bestTime: '5:30 AM - 11:00 AM' },
        { id: 2, name: 'Canyoneering Kawasan Falls', price: '₱1,800', rating: 4.9, reviews: 12, image: '/assets/featured_images/canyoneering-kawasan-falls.jpg', emoji: '🏞️', description: 'Adventure jump, swim, climb', business: 'Kawasan Adventures', bestTime: '6:00 AM - 2:00 PM' },
        { id: 3, name: 'Island Hopping Moalboal', price: '₱2,500', rating: 4.8, reviews: 1, image: '/assets/featured_images/island-hopping-moalboal.jpg', emoji: '🏝️', description: 'See sardine run & sea turtles', business: 'Moalboal Tours', bestTime: '7:00 AM - 3:00 PM' },
        { id: 4, name: 'Sinulog Festival Experience', price: '₱500', rating: 5.0, reviews: 12, image: '/assets/featured_images/sinulog-festival-experience.jpg', emoji: '🎉', description: 'Cultural dance & street parade', business: 'Cebu Tourism Office', bestTime: '8:00 AM - 10:00 PM' }
      ],
      places: [
        { id: 1, name: 'Magellan\'s Cross', price: 'FREE', rating: 4.7, reviews: 22, image: '/assets/featured_images/magellans-cross.jpg', description: 'Historic cross from 1521', business: 'Cebu Heritage', bestTime: '6:00 AM - 8:00 PM' },
        { id: 2, name: 'Basilica del Santo Niño', price: 'FREE', rating: 4.9, reviews: 2, image: '/assets/featured_images/basilica-del-santo-nio.jpg', emoji: '⛪', description: 'Oldest Roman Catholic church', business: 'Basilica Foundation', bestTime: '6:00 AM - 7:00 PM' },
        { id: 3, name: 'Temple of Leah', price: '₱50', rating: 4.6, reviews: 32, image: '/assets/featured_images/temple-of-leah.jpg', emoji: '🏛️', description: 'Greco-Roman temple with city views', business: 'Temple of Leah', bestTime: '6:00 AM - 10:00 PM' },
        { id: 4, name: 'Tops Lookout', price: '₱100', rating: 4.7, reviews: 7, image: '/assets/featured_images/tops-lookout.jpg', emoji: '🌄', description: '360° panoramic city & sea views', business: 'Tops Management', bestTime: '4:00 AM - 10:00 PM' }
      ],
      food: [
        { id: 1, name: 'Zubuchon', price: '₱₱₱', rating: 4.9, reviews: 11, image: '/assets/featured_images/zubuchon.jpg', emoji: '🍖', description: 'World-famous Cebu lechon', business: 'Zubuchon Restaurant', bestTime: '11:00 AM - 9:00 PM' },
        { id: 2, name: 'STK ta Bay!', price: '₱₱', rating: 4.8, reviews: 22, image: '/assets/featured_images/stk-ta-bay.jpg', emoji: '🦞', description: 'Fresh seafood by the bay', business: 'STK Restaurant Group', bestTime: '11:00 AM - 10:00 PM' },
        { id: 3, name: 'House of Lechon', price: '₱₱', rating: 4.7, reviews: 32, image: '/assets/featured_images/house-of-lechon.jpg', emoji: '🐷', description: 'Multiple lechon varieties', business: 'House of Lechon', bestTime: '10:00 AM - 8:00 PM' },
        { id: 4, name: 'Larsian BBQ', price: '₱', rating: 4.8, reviews: 25, image: '/assets/featured_images/larsian-bbq.jpg', emoji: '🍢', description: 'Street BBQ institution', business: 'Larsian Vendors', bestTime: '6:00 PM - 2:00 AM' }
      ]
    },
    davao: {
      activities: [
        { id: 1, name: 'Philippine Eagle Center Visit', price: '₱150', rating: 4.9, reviews: 42, image: '/assets/featured_images/philippine-eagle-center-visit.jpg', emoji: '🦅', description: 'See majestic national bird', business: 'Eagle Foundation', bestTime: '8:00 AM - 4:00 PM' },
        { id: 2, name: 'Mt. Apo Climbing Expedition', price: '₱5,000', rating: 4.9, reviews: 43, image: '/assets/featured_images/mt-apo-climbing-expedition.jpg', emoji: '🏔️', description: '2-day climb to PH\'s highest peak', business: 'Apo Guides Association', bestTime: '5:00 AM - 6:00 PM' },
        { id: 3, name: 'Eden Nature Park Day Tour', price: '₱600', rating: 4.7, reviews: 22, image: '/assets/featured_images/eden-nature-park-day-tour.jpg', emoji: '🌲', description: 'Zipline, skyride, nature walk', business: 'Eden Nature Park', bestTime: '8:00 AM - 5:00 PM' },
        { id: 4, name: 'Durian Farm Tour', price: '₱400', rating: 4.6, reviews: 24, image: '/assets/featured_images/durian-farm-tour.jpg', emoji: '🍈', description: 'Learn about "King of Fruits"', business: 'Davao Fruit Tours', bestTime: '9:00 AM - 3:00 PM' }
      ],
      places: [
        { id: 1, name: 'People\'s Park', price: 'FREE', rating: 4.7, reviews: 32, image: '/assets/featured_images/peoples-park.jpg', description: 'Sculpture garden & green space', business: 'Davao City Gov', bestTime: '5:00 AM - 10:00 PM' },
        { id: 2, name: 'Samal Island Beaches', price: '₱300', rating: 4.8, reviews: 12, image: '/assets/featured_images/samal-island-beaches.jpg', emoji: '🏖️', description: 'White sand paradise near city', business: 'Samal Tourism', bestTime: '7:00 AM - 5:00 PM' },
        { id: 3, name: 'D\' Bone Collector Museum', price: '₱50', rating: 4.9, reviews: 44, image: '/assets/featured_images/d-bone-collector-museum.jpg', description: 'Largest skeletal collection in PH', business: 'D\' Bone Museum', bestTime: '9:00 AM - 6:00 PM' },
        { id: 4, name: 'Jack\'s Ridge', price: '₱100', rating: 4.7, reviews: 33, image: '/assets/featured_images/jacks-ridge.jpg', description: 'Hilltop dining with city lights', business: 'Jack\'s Ridge Resort', bestTime: '5:00 PM - 11:00 PM' }
      ],
      food: [
        { id: 1, name: 'Claude\'s Le Cafe de Ville', price: '₱₱₱', rating: 4.8, reviews: 32, image: '/assets/featured_images/claudes-le-cafe-de-ville.jpg', description: 'Fine dining with local twist', business: 'Claude\'s Restaurant', bestTime: '11:00 AM - 2:00 PM, 6:00 PM - 10:00 PM' },
        { id: 2, name: 'Penong\'s BBQ', price: '₱₱', rating: 4.9, reviews: 12, image: '/assets/featured_images/penongs-bbq.jpg', description: 'Famous grilled chicken & pork', business: 'Penong\'s Chain', bestTime: '10:00 AM - 9:00 PM' },
        { id: 3, name: 'Kusina Dabaw', price: '₱₱', rating: 4.7, reviews: 32, image: '/assets/featured_images/kusina-dabaw.jpg', emoji: '🥘', description: 'Traditional Davao cuisine', business: 'Kusina Dabaw Rest.', bestTime: '11:00 AM - 9:00 PM' },
        { id: 4, name: 'Magsaysay Fruit Stands', price: '₱', rating: 4.8, reviews: 27, image: '/assets/featured_images/magsaysay-fruit-stands.jpg', emoji: '🍉', description: 'Fresh durian & tropical fruits', business: 'Various Vendors', bestTime: '6:00 AM - 8:00 PM' }
      ]
    },
    boracay: {
      activities: [
        { id: 1, name: 'Sunset Sailing', price: '₱2,500', rating: 5.0, reviews: 26, image: '/assets/featured_images/sunset-sailing.jpg', emoji: '⛵', description: 'Paraw sailing at golden hour', business: 'Boracay Sailing', bestTime: '4:30 PM - 6:30 PM' },
        { id: 2, name: 'Helmet Diving Adventure', price: '₱1,500', rating: 4.8, reviews: 27, image: '/assets/featured_images/helmet-diving-adventure.jpg', emoji: '🤿', description: 'Walk underwater - no training needed', business: 'Helmet Dive Boracay', bestTime: '8:00 AM - 4:00 PM' },
        { id: 3, name: 'Island Hopping Tour', price: '₱1,800', rating: 4.9, reviews: 37, image: '/assets/featured_images/island-hopping-tour.jpg', emoji: '🏝️', description: 'Visit Crystal Cove & Crocodile Island', business: 'Island Tours Bora', bestTime: '9:00 AM - 3:00 PM' },
        { id: 4, name: 'Parasailing Experience', price: '₱2,000', rating: 4.9, reviews: 36, image: '/assets/featured_images/parasailing-experience.jpg', emoji: '🪂', description: 'Fly above White Beach', business: 'Sky High Boracay', bestTime: '8:00 AM - 5:00 PM' }
      ],
      places: [
        { id: 1, name: 'White Beach Station 1', price: 'FREE', rating: 4.9, reviews: 2341, image: '/assets/featured_images/white-beach-station-1.jpg', emoji: '🏖️', description: 'Finest white sand in the world', business: 'Boracay Tourism', bestTime: '6:00 AM - 10:00 PM' },
        { id: 2, name: 'Puka Shell Beach', price: 'FREE', rating: 4.8, reviews: 456, image: '/assets/featured_images/puka-shell-beach.jpg', emoji: '🐚', description: 'Quieter alternative to White Beach', business: 'Yapak Tourism', bestTime: '7:00 AM - 6:00 PM' },
        { id: 3, name: 'Mt. Luho Viewpoint', price: '₱100', rating: 4.6, reviews: 234, image: '/assets/featured_images/mt-luho-viewpoint.jpg', emoji: '⛰️', description: 'Highest point with 360° views', business: 'Mt. Luho Eco Park', bestTime: '6:00 AM - 6:00 PM' },
        { id: 4, name: 'D\'Mall Boracay', price: 'FREE', rating: 4.7, reviews: 1234, image: '🛍️', description: 'Shopping & dining hub', business: 'D\'Mall Management', bestTime: '10:00 AM - 11:00 PM' }
      ],
      food: [
        { id: 1, name: 'Aria Cucina Italiana', price: '₱₱₱₱', rating: 4.9, reviews: 678, image: '/assets/featured_images/aria-cucina-italiana.jpg', emoji: '🍝', description: 'Beachfront Italian fine dining', business: 'Aria Restaurant', bestTime: '11:00 AM - 2:00 PM, 6:00 PM - 10:00 PM' },
        { id: 2, name: 'Smoke Restaurant', price: '₱₱₱', rating: 4.8, reviews: 892, image: '/assets/featured_images/smoke-restaurant.jpg', emoji: '🥩', description: 'Ribs, steaks & seafood', business: 'Smoke Boracay', bestTime: '12:00 PM - 11:00 PM' },
        { id: 3, name: 'Jonah\'s Fruit Shake', price: '₱', rating: 4.9, reviews: 2341, image: '/assets/featured_images/jonahs-fruit-shake.jpg', description: 'Legendary mango shakes since 1992', business: 'Jonah\'s Shakes', bestTime: '8:00 AM - 10:00 PM' },
        { id: 4, name: 'D\'Talipapa Seafood Market', price: '₱₱', rating: 4.8, reviews: 1456, image: '/assets/featured_images/dtalipapa-seafood-market.jpg', description: 'Fresh seafood - buy & cook', business: 'D\'Talipapa Market', bestTime: '10:00 AM - 9:00 PM' }
      ]
    },
    palawan: {
      activities: [
        { id: 1, name: 'El Nido Island Hopping Tour A', price: '₱1,400', rating: 4.9, reviews: 3456, image: '/assets/featured_images/el-nido-island-hopping-tour-a.jpg', emoji: '🛥️', description: 'Secret Lagoon, Big & Small Lagoon', business: 'El Nido Tours', bestTime: '8:00 AM - 4:00 PM' },
        { id: 2, name: 'Underground River Tour', price: '₱1,500', rating: 4.9, reviews: 2341, image: '/assets/featured_images/underground-river-tour.jpg', emoji: '🦇', description: 'UNESCO World Heritage site', business: 'PPUR Tourism Office', bestTime: '8:00 AM - 3:00 PM' },
        { id: 3, name: 'Nacpan Beach Motorbike Tour', price: '₱800', rating: 4.8, reviews: 567, image: '/assets/featured_images/nacpan-beach-motorbike-tour.jpg', emoji: '🏍️', description: 'Scenic ride to 4km beach', business: 'Palawan Bike Rentals', bestTime: '7:00 AM - 5:00 PM' },
        { id: 4, name: 'Kayaking Bacuit Bay', price: '₱1,200', rating: 4.9, reviews: 892, image: '/assets/featured_images/kayaking-bacuit-bay.jpg', emoji: '🚣', description: 'Paddle through limestone cliffs', business: 'Bacuit Adventures', bestTime: '7:00 AM - 11:00 AM' }
      ],
      places: [
        { id: 1, name: 'Big Lagoon', price: 'incl. tour', rating: 5.0, reviews: 4567, image: '/assets/featured_images/big-lagoon.jpg', emoji: '💧', description: 'Turquoise waters surrounded by cliffs', business: 'El Nido Tourism', bestTime: '9:00 AM - 2:00 PM' },
        { id: 2, name: 'Nacpan Beach', price: 'FREE', rating: 4.9, reviews: 1234, image: '/assets/featured_images/nacpan-beach.jpg', emoji: '🏝️', description: '4km of unspoiled white sand', business: 'Nacpan Community', bestTime: '7:00 AM - 6:00 PM' },
        { id: 3, name: 'Las Cabanas Beach', price: 'FREE', rating: 4.8, reviews: 678, image: '/assets/featured_images/las-cabanas-beach.jpg', emoji: '🌅', description: 'Best sunset spot in El Nido', business: 'Las Cabanas Area', bestTime: '3:00 PM - 7:00 PM' },
        { id: 4, name: 'Helicopter Island', price: 'incl. tour', rating: 4.7, reviews: 456, image: '/assets/featured_images/helicopter-island.jpg', emoji: '🚁', description: 'Named for helicopter-like shape', business: 'Island Tours', bestTime: '10:00 AM - 3:00 PM' }
      ],
      food: [
        { id: 1, name: 'Artcafe', price: '₱₱₱', rating: 4.8, reviews: 892, image: '/assets/featured_images/artcafe.jpg', emoji: '🍽️', description: 'Art gallery & Mediterranean cuisine', business: 'Artcafe El Nido', bestTime: '11:00 AM - 10:00 PM' },
        { id: 2, name: 'Trattoria Altrove', price: '₱₱₱', rating: 4.9, reviews: 567, image: '/assets/featured_images/trattoria-altrove.jpg', emoji: '🍕', description: 'Wood-fired pizza & homemade pasta', business: 'Altrove Restaurant', bestTime: '12:00 PM - 10:00 PM' },
        { id: 3, name: 'Happiness Beach Bar', price: '₱₱', rating: 4.7, reviews: 1234, image: '/assets/featured_images/happiness-beach-bar.jpg', emoji: '🍹', description: 'Beachfront dining & cocktails', business: 'Happiness Beach', bestTime: '11:00 AM - 11:00 PM' },
        { id: 4, name: 'El Nido Public Market', price: '₱', rating: 4.6, reviews: 456, image: '/assets/featured_images/el-nido-public-market.jpg', emoji: '🦐', description: 'Fresh seafood grilled to order', business: 'Public Market', bestTime: '7:00 AM - 7:00 PM' }
      ]
    },
    baguio: {
      activities: [
        { id: 1, name: 'Strawberry Picking Experience', price: '₱200', rating: 4.8, reviews: 892, image: '/assets/featured_images/strawberry-picking-experience.jpg', emoji: '🍓', description: 'Pick fresh strawberries at La Trinidad', business: 'Strawberry Farms', bestTime: '6:00 AM - 4:00 PM' },
        { id: 2, name: 'Burnham Park Boat Ride', price: '₱150', rating: 4.6, reviews: 456, image: '/assets/featured_images/burnham-park-boat-ride.jpg', emoji: '🚣', description: 'Scenic lake paddleboat ride', business: 'Burnham Park Admin', bestTime: '8:00 AM - 6:00 PM' },
        { id: 3, name: 'Tam-Awan Village Tour', price: '₱60', rating: 4.7, reviews: 234, image: '/assets/featured_images/tam-awan-village-tour.jpg', emoji: '🏘️', description: 'Cordillera cultural village', business: 'Tam-Awan Village', bestTime: '9:00 AM - 6:00 PM' },
        { id: 4, name: 'Mines View Park Photography', price: 'FREE', rating: 4.7, reviews: 1234, image: '/assets/featured_images/mines-view-park-photography.jpg', emoji: '📷', description: 'Mountain views & souvenir shops', business: 'Baguio Tourism', bestTime: '6:00 AM - 6:00 PM' }
      ],
      places: [
        { id: 1, name: 'The Mansion', price: 'FREE', rating: 4.8, reviews: 678, image: '/assets/featured_images/the-mansion.jpg', emoji: '🏛️', description: 'Official summer residence of President', business: 'Philippine Gov', bestTime: '7:00 AM - 5:00 PM' },
        { id: 2, name: 'Botanical Garden', price: '₱10', rating: 4.6, reviews: 567, image: '/assets/featured_images/botanical-garden.jpg', emoji: '🏺', description: 'Peaceful garden with Igorot sculptures', business: 'Baguio Parks', bestTime: '6:00 AM - 6:00 PM' },
        { id: 3, name: 'Session Road', price: 'FREE', rating: 4.7, reviews: 2341, image: '/assets/featured_images/session-road.jpg', emoji: '🛍️', description: 'Main shopping & dining street', business: 'Session Road Assoc.', bestTime: '9:00 AM - 10:00 PM' },
        { id: 4, name: 'Bell Church', price: 'FREE', rating: 4.8, reviews: 456, image: '/assets/featured_images/bell-church.jpg', emoji: '⛪', description: 'Historic church with prayer bell', business: 'Baguio Cathedral', bestTime: '6:00 AM - 7:00 PM' }
      ],
      food: [
        { id: 1, name: 'Good Shepherd Convent', price: '₱', rating: 4.9, reviews: 3456, image: '/assets/featured_images/good-shepherd-convent.jpg', emoji: '🪧', description: 'Famous ube jam & strawberry jam', business: 'Good Shepherd', bestTime: '8:00 AM - 5:00 PM' },
        { id: 2, name: 'Hill Station', price: '₱₱₱', rating: 4.8, reviews: 892, image: '/assets/featured_images/hill-station.jpg', emoji: '🍽️', description: 'Fine dining with mountain views', business: 'Hill Station Rest.', bestTime: '11:00 AM - 2:00 PM, 6:00 PM - 10:00 PM' },
        { id: 3, name: 'Vizco\'s', price: '₱₱', rating: 4.7, reviews: 1234, image: '/assets/featured_images/vizcos.jpg', emoji: '🍰', description: 'Strawberry shortcake & pastries', business: 'Vizco\'s Bakery', bestTime: '8:00 AM - 8:00 PM' },
        { id: 4, name: 'Strawberry Taho Vendors', price: '₱', rating: 4.9, reviews: 567, image: '/assets/featured_images/strawberry-taho-vendors.jpg', emoji: '🥛', description: 'Fresh strawberry taho at parks', business: 'Various Vendors', bestTime: '6:00 AM - 10:00 AM' }
      ]
    },
    vigan: {
      activities: [
        { id: 1, name: 'Kalesa Ride Calle Crisologo', price: '₱150', rating: 4.9, reviews: 1234, image: '/src/assets/featured_images/kalesa-ride-calle-crisologo.jpg', emoji: '🐴', description: 'Horse carriage on cobblestone streets', business: 'Vigan Kalesa Assoc.', bestTime: '6:00 AM - 9:00 PM' },
        { id: 2, name: 'Pottery Making Workshop', price: '₱300', rating: 4.7, reviews: 234, image: '/src/assets/featured_images/pottery-making-workshop.jpg', emoji: '🏺', description: 'Traditional jar-making at Pagburnayan', business: 'Pagburnayan Pottery', bestTime: '8:00 AM - 5:00 PM' },
        { id: 3, name: 'Heritage House Tour', price: '₱200', rating: 4.8, reviews: 456, image: '/src/assets/featured_images/heritage-house-tour.jpg', emoji: '🏛️', description: 'Visit Crisologo Museum & ancestral homes', business: 'Heritage Tours', bestTime: '9:00 AM - 5:00 PM' },
        { id: 4, name: 'Bantay Bell Tower Climb', price: 'FREE', rating: 4.6, reviews: 567, image: '/src/assets/featured_images/bantay-bell-tower-climb.jpg', emoji: '🔔', description: 'Panoramic views of Vigan', business: 'Bantay Tourism', bestTime: '6:00 AM - 6:00 PM' }
      ],
      places: [
        { id: 1, name: 'Calle Crisologo', price: 'FREE', rating: 5.0, reviews: 2341, image: '/src/assets/featured_images/calle-crisologo.jpg', emoji: '🏘️', description: 'UNESCO cobblestone street', business: 'Vigan Heritage', bestTime: '6:00 AM - 10:00 PM' },
        { id: 2, name: 'Baluarte Zoo', price: 'FREE', rating: 4.7, reviews: 892, image: '/src/assets/featured_images/baluarte-zoo.jpg', emoji: '🦁', description: 'Mini zoo with exotic animals', business: 'Baluarte', bestTime: '8:00 AM - 7:00 PM' },
        { id: 3, name: 'Syquia Mansion', price: '₱30', rating: 4.8, reviews: 345, image: '/src/assets/featured_images/syquia-mansion.jpg', emoji: '🏛️', description: 'Elpidio Quirino\'s ancestral house', business: 'National Museum', bestTime: '9:00 AM - 5:00 PM' },
        { id: 4, name: 'Plaza Salcedo', price: 'FREE', rating: 4.6, reviews: 456, image: '/src/assets/featured_images/plaza-salcedo.jpg', emoji: '⛲', description: 'Dancing fountain shows at night', business: 'Vigan City Gov', bestTime: '5:00 PM - 10:00 PM' }
      ],
      food: [
        { id: 1, name: 'Café Leona', price: '₱₱', rating: 4.9, reviews: 1234, image: '/src/assets/featured_images/caf-leona.jpg', emoji: '🍽️', description: 'Ilocano cuisine in heritage house', business: 'Café Leona', bestTime: '11:00 AM - 9:00 PM' },
        { id: 2, name: 'Vigan Empanada Plaza', price: '₱', rating: 5.0, reviews: 2341, image: '/src/assets/featured_images/vigan-empanada-plaza.jpg', emoji: '🥟', description: 'Legendary orange empanada', business: 'Various Vendors', bestTime: '7:00 AM - 8:00 PM' },
        { id: 3, name: 'Kusina Felicitas', price: '₱₱', rating: 4.8, reviews: 567, image: '/src/assets/featured_images/kusina-felicitas.jpg', emoji: '🍖', description: 'Bagnet, longganisa & Ilocano dishes', business: 'Kusina Felicitas', bestTime: '11:00 AM - 9:00 PM' },
        { id: 4, name: 'Hidden Garden', price: '₱₱', rating: 4.7, reviews: 456, image: '/src/assets/featured_images/hidden-garden.jpg', emoji: '🌿', description: 'Garden restaurant with local food', business: 'Hidden Garden', bestTime: '10:00 AM - 8:00 PM' }
      ]
    },
    siargao: {
      activities: [
        { id: 1, name: 'Surfing Lesson at Cloud 9', price: '₱500', rating: 4.9, reviews: 2341, image: '/src/assets/featured_images/surfing-lesson-at-cloud-9.jpg', emoji: '🏄', description: '2-hour lesson with board rental', business: 'Cloud 9 Surf School', bestTime: '6:00 AM - 5:00 PM' },
        { id: 2, name: 'Sugba Lagoon Boat Tour', price: '₱1,500', rating: 5.0, reviews: 1234, image: '/src/assets/featured_images/sugba-lagoon-boat-tour.jpg', emoji: '🛥️', description: 'Cliff jumping & floating cottage', business: 'Sugba Tours', bestTime: '8:00 AM - 3:00 PM' },
        { id: 3, name: 'Island Hopping 3 Islands', price: '₱1,800', rating: 4.9, reviews: 892, image: '/src/assets/featured_images/island-hopping-3-islands.jpg', emoji: '🏝️', description: 'Naked, Daku, Guyam islands', business: 'Siargao Island Tours', bestTime: '8:00 AM - 4:00 PM' },
        { id: 4, name: 'Motorbike Island Exploration', price: '₱350/day', rating: 4.8, reviews: 567, image: '/src/assets/featured_images/motorbike-island-exploration.jpg', emoji: '🏍️', description: 'Rent & explore at your pace', business: 'Bike Rentals Siargao', bestTime: '6:00 AM - 6:00 PM' }
      ],
      places: [
        { id: 1, name: 'Cloud 9 Boardwalk', price: 'FREE', rating: 5.0, reviews: 3456, image: '/src/assets/featured_images/cloud-9-boardwalk.jpg', emoji: '🌊', description: 'Iconic surf break viewing deck', business: 'Siargao Tourism', bestTime: '5:00 AM - 8:00 PM' },
        { id: 2, name: 'Magpupungko Rock Pools', price: '₱50', rating: 4.8, reviews: 892, image: '/src/assets/featured_images/magpupungko-rock-pools.jpg', emoji: '🪨', description: 'Natural tidal pools (low tide only)', business: 'Pilar Tourism', bestTime: '9:00 AM - 12:00 PM' },
        { id: 3, name: 'Sohoton Cove', price: '₱1,200', rating: 4.9, reviews: 567, image: '/src/assets/featured_images/sohoton-cove.jpg', emoji: '🦑', description: 'Stingless jellyfish & cave swimming', business: 'Socorro Tours', bestTime: '8:00 AM - 2:00 PM' },
        { id: 4, name: 'Daku Island', price: 'incl. tour', rating: 4.7, reviews: 456, image: '/src/assets/featured_images/daku-island.jpg', emoji: '🥥', description: 'Largest island with coconut groves', business: 'Island Hopping', bestTime: '10:00 AM - 3:00 PM' }
      ],
      food: [
        { id: 1, name: 'Shaka Siargao', price: '₱₱₱', rating: 4.9, reviews: 1234, image: '/src/assets/featured_images/shaka-siargao.jpg', emoji: '🍽️', description: 'Healthy bowls & smoothies', business: 'Shaka Café', bestTime: '7:00 AM - 9:00 PM' },
        { id: 2, name: 'Kermit Siargao', price: '₱₱', rating: 4.8, reviews: 892, image: '/src/assets/featured_images/kermit-siargao.jpg', emoji: '🍕', description: 'Italian wood-fired pizza', business: 'Kermit Restaurant', bestTime: '11:00 AM - 10:00 PM' },
        { id: 3, name: 'Bravo Beach Resort Restaurant', price: '₱₱', rating: 4.7, reviews: 456, image: '/src/assets/featured_images/bravo-beach-resort-restaurant.jpg', emoji: '🥘', description: 'Filipino & international beachfront', business: 'Bravo Beach', bestTime: '7:00 AM - 10:00 PM' },
        { id: 4, name: 'General Luna Food Stalls', price: '₱', rating: 4.8, reviews: 678, image: '/src/assets/featured_images/general-luna-food-stalls.jpg', emoji: '🍢', description: 'BBQ, seafood & local dishes', business: 'Various Vendors', bestTime: '5:00 PM - 11:00 PM' }
      ]
    },
    'chocolate-hills': {
      activities: [
        { id: 1, name: 'ATV Tour Around Hills', price: '₱800', rating: 4.8, reviews: 567, image: '/src/assets/featured_images/atv-tour-around-hills.jpg', emoji: '🏍️', description: 'Thrilling ride around the hills', business: 'Choco Hills ATV', bestTime: '6:00 AM - 5:00 PM' },
        { id: 2, name: 'Loboc River Cruise', price: '₱500', rating: 4.9, reviews: 892, image: '/src/assets/featured_images/loboc-river-cruise.jpg', emoji: '🚤', description: 'Lunch buffet cruise with live music', business: 'Loboc River Cruises', bestTime: '11:00 AM - 2:00 PM' },
        { id: 3, name: 'Tarsier Sanctuary Visit', price: '₱60', rating: 4.9, reviews: 1234, image: '/src/assets/featured_images/tarsier-sanctuary-visit.jpg', emoji: '🐵', description: 'See world\'s smallest primates', business: 'Tarsier Foundation', bestTime: '8:00 AM - 4:00 PM' },
        { id: 4, name: 'Zipline Over Hills', price: '₱350', rating: 4.7, reviews: 345, image: '/src/assets/featured_images/zipline-over-hills.jpg', emoji: '🎪', description: 'Adrenaline rush with views', business: 'Choco Hills Adventure', bestTime: '8:00 AM - 5:00 PM' }
      ],
      places: [
        { id: 1, name: 'Chocolate Hills Viewpoint', price: '₱50', rating: 5.0, reviews: 2341, image: '/src/assets/featured_images/chocolate-hills-viewpoint.jpg', emoji: '🍫', description: '1,200+ cone-shaped hills', business: 'Carmen Tourism', bestTime: '5:00 AM - 6:00 PM' },
        { id: 2, name: 'Baclayon Church', price: 'FREE', rating: 4.8, reviews: 456, image: '/src/assets/featured_images/baclayon-church.jpg', emoji: '⛪', description: 'Oldest stone church in PH (1595)', business: 'Baclayon Heritage', bestTime: '6:00 AM - 6:00 PM' },
        { id: 3, name: 'Blood Compact Shrine', price: 'FREE', rating: 4.6, reviews: 234, image: '/src/assets/featured_images/blood-compact-shrine.jpg', emoji: '🗿', description: 'Historic Spanish-Filipino pact site', business: 'Bohol Tourism', bestTime: '6:00 AM - 6:00 PM' },
        { id: 4, name: 'Mahogany Forest', price: 'FREE', rating: 4.7, reviews: 567, image: '/src/assets/featured_images/mahogany-forest.jpg', emoji: '🌳', description: '2km man-made forest tunnel', business: 'Bilar Municipality', bestTime: '6:00 AM - 6:00 PM' }
      ],
      food: [
        { id: 1, name: 'Gerarda\'s', price: '₱₱', rating: 4.8, reviews: 678, image: '🍽️', description: 'Home-style Filipino & seafood', business: 'Gerarda\'s Restaurant', bestTime: '11:00 AM - 9:00 PM' },
        { id: 2, name: 'Loboc Riverwatch Floating Rest.', price: '₱₱', rating: 4.7, reviews: 892, image: '/src/assets/featured_images/loboc-riverwatch-floating-rest.jpg', emoji: '🚤', description: 'Buffet on floating restaurant', business: 'Loboc Riverwatch', bestTime: '11:00 AM - 2:00 PM' },
        { id: 3, name: 'The Buzzz Café', price: '₱₱', rating: 4.6, reviews: 234, image: '/src/assets/featured_images/the-buzzz-caf.jpg', emoji: '🐝', description: 'Bee farm products & organic food', business: 'Bohol Bee Farm', bestTime: '7:00 AM - 8:00 PM' },
        { id: 4, name: 'Carmen Public Market', price: '₱', rating: 4.7, reviews: 345, image: '/src/assets/featured_images/carmen-public-market.jpg', emoji: '🥘', description: 'Local street food & snacks', business: 'Carmen Market', bestTime: '6:00 AM - 6:00 PM' }
      ]
    },
    mayon: {
      activities: [
        { id: 1, name: 'ATV Lava Trail Adventure', price: '₱1,500', rating: 4.9, reviews: 892, image: '/src/assets/featured_images/atv-lava-trail-adventure.jpg', emoji: '🏍️', description: 'Ride through volcanic lava trails', business: 'Mayon ATV Tours', bestTime: '6:00 AM - 5:00 PM' },
        { id: 2, name: 'Mayon Volcano Trekking', price: '₱2,500', rating: 4.8, reviews: 234, image: '/src/assets/featured_images/mayon-volcano-trekking.jpg', emoji: '🥾', description: 'Guided trek to base camp', business: 'Mayon Guides Assoc.', bestTime: '5:00 AM - 12:00 PM' },
        { id: 3, name: 'Cagsawa Ruins Photography', price: 'FREE', rating: 4.9, reviews: 1234, image: '/src/assets/featured_images/cagsawa-ruins-photography.jpg', emoji: '📷', description: 'Iconic ruins with Mayon backdrop', business: 'Daraga Tourism', bestTime: '6:00 AM - 6:00 PM' },
        { id: 4, name: 'Whale Shark Watching Donsol', price: '₱3,500', rating: 5.0, reviews: 567, image: '/src/assets/featured_images/whale-shark-watching-donsol.jpg', emoji: '🦈', description: 'Swim with whale sharks (seasonal)', business: 'Donsol Tourism', bestTime: '6:00 AM - 12:00 PM' }
      ],
      places: [
        { id: 1, name: 'Cagsawa Ruins Park', price: '₱50', rating: 4.9, reviews: 2341, image: '/src/assets/featured_images/cagsawa-ruins-park.jpg', emoji: '🏛️', description: 'Iconic church ruins from 1814 eruption', business: 'Cagsawa Park', bestTime: '6:00 AM - 6:00 PM' },
        { id: 2, name: 'Sumlang Lake', price: 'FREE', rating: 4.8, reviews: 678, image: '/src/assets/featured_images/sumlang-lake.jpg', emoji: '🌊', description: 'Perfect Mayon reflection in water', business: 'Camalig Tourism', bestTime: '5:00 AM - 6:00 PM' },
        { id: 3, name: 'Lignon Hill Nature Park', price: '₱20', rating: 4.7, reviews: 456, image: '/src/assets/featured_images/lignon-hill-nature-park.jpg', emoji: '⛰️', description: 'Hilltop views of Mayon & city', business: 'Lignon Hill', bestTime: '6:00 AM - 9:00 PM' },
        { id: 4, name: 'Hoyop-Hoyopan Cave', price: '₱100', rating: 4.6, reviews: 234, image: '/src/assets/featured_images/hoyop-hoyopan-cave.jpg', emoji: '🦇', description: 'Cathedral-like limestone cave', business: 'Camalig Cave Tours', bestTime: '8:00 AM - 5:00 PM' }
      ],
      food: [
        { id: 1, name: 'Waway\'s Restaurant', price: '₱₱₱', rating: 4.8, reviews: 892, image: '🌶️', description: 'Authentic Bicol Express & laing', business: 'Waway\'s', bestTime: '10:00 AM - 9:00 PM' },
        { id: 2, name: '1st Colonial Grill', price: '₱₱', rating: 4.7, reviews: 567, image: '/src/assets/featured_images/1st-colonial-grill.jpg', emoji: '🍽️', description: 'Spanish-Filipino fusion', business: '1st Colonial', bestTime: '11:00 AM - 9:00 PM' },
        { id: 3, name: 'Small Talk Café', price: '₱₱', rating: 4.8, reviews: 678, image: '/src/assets/featured_images/small-talk-caf.jpg', emoji: '☕', description: 'Cozy café with Bicol specialties', business: 'Small Talk Café', bestTime: '7:00 AM - 9:00 PM' },
        { id: 4, name: 'Legazpi Public Market', price: '₱', rating: 4.7, reviews: 456, image: '/src/assets/featured_images/legazpi-public-market.jpg', emoji: '🌶️', description: 'Fresh Bicol Express ingredients & pili', business: 'Public Market', bestTime: '6:00 AM - 6:00 PM' }
      ]
    }
  };

  const currentMarketplace = locationMarketplace[location.id] || { activities: [], places: [], food: [] };

  // Reviews data for featured items
  const itemReviews = {
    'Intramuros Walking Tour': [
      { id: 1, user: 'Maria Santos', rating: 5, date: '2 days ago', comment: 'Amazing historical tour! Our guide was very knowledgeable about Philippine history. The walls and old churches are breathtaking. Highly recommend!', helpful: 24 },
      { id: 2, user: 'John Smith', rating: 5, date: '1 week ago', comment: 'Best way to experience Manila\'s colonial past. The Spanish architecture is stunning. Don\'t forget to bring comfortable shoes!', helpful: 18 },
      { id: 3, user: 'Ana Cruz', rating: 4, date: '2 weeks ago', comment: 'Great tour but can be very hot during midday. Go early morning or late afternoon. The Fort Santiago is a must-see!', helpful: 15 },
      { id: 4, user: 'David Lee', rating: 5, date: '3 weeks ago', comment: 'Absolutely loved the kalesa ride! Felt like going back in time. The guide shared fascinating stories about each landmark.', helpful: 12 }
    ],
    'Zubuchon': [
      { id: 1, user: 'Carlos Reyes', rating: 5, date: '1 day ago', comment: 'THE BEST LECHON IN THE PHILIPPINES! Crispy skin, juicy meat, perfect seasoning. Anthony Bourdain was right - this is the best pig ever!', helpful: 45 },
      { id: 2, user: 'Michelle Tan', rating: 5, date: '3 days ago', comment: 'Waited 30 minutes but totally worth it! The lechon is incredibly flavorful. Order the whole belly - you won\'t regret it!', helpful: 32 },
      { id: 3, user: 'James Wilson', rating: 5, date: '1 week ago', comment: 'First time trying Cebu lechon and I\'m blown away! The spices and herbs make it so aromatic. Best paired with their liver sauce!', helpful: 28 },
      { id: 4, user: 'Lisa Garcia', rating: 4, date: '2 weeks ago', comment: 'Very good lechon but a bit pricey. The quality justifies the price though. Service was fast and staff were friendly.', helpful: 19 }
    ],
    'White Beach Station 1': [
      { id: 1, user: 'Sarah Johnson', rating: 5, date: '2 days ago', comment: 'Paradise on earth! The sand is like powder and the water is crystal clear. Perfect for relaxing and swimming. Best beach I\'ve ever been to!', helpful: 56 },
      { id: 2, user: 'Mike Torres', rating: 5, date: '5 days ago', comment: 'Station 1 is definitely the finest part of White Beach. Less crowded, cleaner, and the sand is unbelievable. Worth the extra walk!', helpful: 41 },
      { id: 3, user: 'Emma Brown', rating: 4, date: '1 week ago', comment: 'Beautiful beach but very touristy. Go early morning for the best experience. Sunset here is magical!', helpful: 33 },
      { id: 4, user: 'Rico Santos', rating: 5, date: '2 weeks ago', comment: 'Clean and well-maintained. The water is so clear you can see the bottom. Perfect for families with kids.', helpful: 27 }
    ],
    'El Nido Island Hopping Tour A': [
      { id: 1, user: 'Alex Turner', rating: 5, date: '1 day ago', comment: 'Absolutely stunning! Big Lagoon and Small Lagoon are breathtaking. The limestone cliffs are spectacular. Book this tour first!', helpful: 38 },
      { id: 2, user: 'Sophie Martinez', rating: 5, date: '4 days ago', comment: 'Best tour in El Nido! Secret Lagoon was my favorite - swimming inside the rocks is surreal. Great food included too!', helpful: 34 },
      { id: 3, user: 'Jake Anderson', rating: 5, date: '1 week ago', comment: 'Tour A is a must-do! The water is so clear and blue. Our guide was excellent and took amazing photos for us. Bring waterproof bag!', helpful: 29 },
      { id: 4, user: 'Nina Lopez', rating: 4, date: '2 weeks ago', comment: 'Amazing sights but can be crowded. Try to book for weekdays. Still worth every peso!', helpful: 22 }
    ],
    'Good Shepherd Convent': [
      { id: 1, user: 'Grace Lee', rating: 5, date: '3 days ago', comment: 'Their ube jam is legendary! Been buying here for 20 years. Also try the strawberry jam and peanut brittle. Perfect pasalubong!', helpful: 67 },
      { id: 2, user: 'Robert Chen', rating: 5, date: '1 week ago', comment: 'Best food souvenir from Baguio! The ube jam tastes homemade and natural. Not too sweet. Stock up!', helpful: 52 },
      { id: 3, user: 'Anna Reyes', rating: 5, date: '2 weeks ago', comment: 'A Baguio institution! Great quality, reasonable prices. Their cashew brittle is also excellent. Get there early to avoid crowds.', helpful: 43 },
      { id: 4, user: 'Mark Davis', rating: 5, date: '3 weeks ago', comment: 'Everyone visiting Baguio should stop here. The products are authentic and delicious. Supporting a good cause too!', helpful: 38 }
    ],
    'Vigan Empanada Plaza': [
      { id: 1, user: 'Elena Cruz', rating: 5, date: '1 day ago', comment: 'THE ORIGINAL VIGAN EMPANADA! Crispy orange shell, perfect filling with egg, longganisa, and vegetables. Get it fresh and hot!', helpful: 48 },
      { id: 2, user: 'Jose Ramos', rating: 5, date: '4 days ago', comment: 'Best empanada in the Philippines! The sukang Iloko (vinegar) dip makes it perfect. Try different vendors to compare!', helpful: 41 },
      { id: 3, user: 'Carla Santos', rating: 5, date: '1 week ago', comment: 'Street food at its finest! Watch them cook it fresh. The combination of flavors is amazing. Only ₱35 per piece!', helpful: 36 },
      { id: 4, user: 'Tom Wilson', rating: 5, date: '2 weeks ago', comment: 'Must-try when in Vigan! Unique and delicious. The egg inside is perfectly runny. Bring cash!', helpful: 29 }
    ],
    'Cloud 9 Boardwalk': [
      { id: 1, user: 'Ryan Cooper', rating: 5, date: '2 days ago', comment: 'Iconic surf spot! Even if you don\'t surf, watching the pros is amazing. The boardwalk extends over the reef - great for photos!', helpful: 44 },
      { id: 2, user: 'Kelly White', rating: 5, date: '5 days ago', comment: 'Must-visit in Siargao! The waves are legendary. Sunrise and sunset here are spectacular. Free to visit!', helpful: 37 },
      { id: 3, user: 'Brad Mitchell', rating: 5, date: '1 week ago', comment: 'The heart of Siargao! Great vibe, lots of surfers, beautiful views. The rock formations are impressive too.', helpful: 31 },
      { id: 4, user: 'Amy Chen', rating: 4, date: '2 weeks ago', comment: 'Very cool spot but can get very crowded. Go early morning for best experience. The barrel waves are insane!', helpful: 26 }
    ],
    'Chocolate Hills Viewpoint': [
      { id: 1, user: 'Daniel Kim', rating: 5, date: '1 day ago', comment: 'Geological wonder! Over 1,200 hills as far as the eye can see. Climb to the top for panoramic views. Absolutely stunning!', helpful: 51 },
      { id: 2, user: 'Rachel Green', rating: 5, date: '3 days ago', comment: 'One of the most unique landscapes I\'ve seen! Visit during dry season when they turn brown. Worth the trip to Bohol!', helpful: 42 },
      { id: 3, user: 'Chris Lee', rating: 5, date: '1 week ago', comment: 'Breathtaking! The formation is unlike anywhere else in the world. Great photo opportunities. Don\'t miss this!', helpful: 38 },
      { id: 4, user: 'Maria Santos', rating: 4, date: '2 weeks ago', comment: 'Beautiful but very hot! Bring water and hat. The climb has many steps. The view from top is worth it though!', helpful: 30 }
    ],
    'Cagsawa Ruins Park': [
      { id: 1, user: 'Paul Martinez', rating: 5, date: '2 days ago', comment: 'Iconic view of Mayon Volcano! The ruins tell a powerful story of the 1814 eruption. Perfect backdrop for photos. History and nature combined!', helpful: 46 },
      { id: 2, user: 'Julia Santos', rating: 5, date: '5 days ago', comment: 'Must-visit when in Albay! The bell tower remnant is hauntingly beautiful. Mayon\'s perfect cone in the background is spectacular!', helpful: 39 },
      { id: 3, user: 'Eric Tan', rating: 4, date: '1 week ago', comment: 'Great historical site. Best time for photos is early morning with clear skies. Small entrance fee. Worth it!', helpful: 32 },
      { id: 4, user: 'Linda Chen', rating: 5, date: '2 weeks ago', comment: 'Peaceful and beautiful. Learn about the tragic history while enjoying stunning views. The museum nearby is informative.', helpful: 27 }
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
    manila: [
      { id: 1, user: 'Sean', avatar: '👨', message: 'Just visited Intramuros! The historical tours are amazing. Don\'t miss the sunset at Manila Bay - absolutely breathtaking! 🌅', time: '2 hours ago', likes: 12 },
      { id: 2, user: 'Jason', avatar: '🧔', message: 'Pro tip: Try the street food in Binondo! Authentic Chinese-Filipino fusion. The Lumpia and Siopao are to die for! 🍜', time: '5 hours ago', likes: 8 },
      { id: 3, user: 'Maria', avatar: '👩', message: 'Solo female traveler here! Manila is safe if you stick to main areas. BGC and Makati are very modern and tourist-friendly. Grab is your best friend! 🚗', time: '1 day ago', likes: 15 },
      { id: 4, user: 'Carlos', avatar: '👨‍💼', message: 'The National Museum is FREE and world-class! Spend at least half a day there. Also, Rizal Park at night is magical. ✨', time: '2 days ago', likes: 10 }
    ],
    cebu: [
      { id: 1, user: 'Jason', avatar: '🧔', message: 'The lechon here is UNREAL! Try CNT Lechon or Zubuchon. Best pork I\'ve ever had. Also, Sinulog Festival in January is a must-see! 🎉', time: '3 hours ago', likes: 20 },
      { id: 2, user: 'Sean', avatar: '👨', message: 'Went island hopping to Moalboal - saw sardine run and sea turtles! Book through local operators for better prices. Kawasan Falls is stunning! 🏝️', time: '6 hours ago', likes: 18 },
      { id: 3, user: 'Elena', avatar: '👩‍🦰', message: 'Magellan\'s Cross and Basilica del Santo Niño are free to visit. The history is incredible! Don\'t forget to try Cebu\'s dried mangoes - perfect pasalubong! 🥭', time: '1 day ago', likes: 14 },
      { id: 4, user: 'Mike', avatar: '🧑', message: 'For budget travelers: Stay in Fuente Osmeña area, lots of cheap hostels and restaurants. Jeepney rides are cheap but download maps offline! 🗺️', time: '3 days ago', likes: 9 }
    ],
    davao: [
      { id: 1, user: 'Sean', avatar: '👨', message: 'The Philippine Eagle Center blew my mind! Seeing these majestic birds up close is surreal. They\'re HUGE! Conservation fee is worth it. 🦅', time: '4 hours ago', likes: 25 },
      { id: 2, user: 'Anna', avatar: '👩', message: 'Tried durian for the first time at Magsaysay Park! Love it or hate it, but you MUST try it here. Also got fresh pomelo - so sweet! 🍈', time: '7 hours ago', likes: 11 },
      { id: 3, user: 'Jason', avatar: '🧔', message: 'Davao is SO clean and safe! You can walk around at night. Visited Eden Nature Park - perfect for families. The skyride has amazing views! 🌲', time: '2 days ago', likes: 16 },
      { id: 4, user: 'Rico', avatar: '🧑‍🦱', message: 'Climbed Mount Apo! 2-day trek, challenging but WORTH IT. Hire a local guide - they know the best routes and keep you safe. 🏔️', time: '4 days ago', likes: 22 }
    ],
    boracay: [
      { id: 1, user: 'Jason', avatar: '🧔', message: 'White Beach at Station 2 is paradise! Sand is like powder. Book sunset sailing - ₱2,500 for a group, includes drinks. Best experience ever! ⛵', time: '1 hour ago', likes: 30 },
      { id: 2, user: 'Sean', avatar: '👨', message: 'Tried helmet diving - you can walk underwater! Also did parasailing and island hopping. Book activities early morning for best rates. 🤿', time: '5 hours ago', likes: 24 },
      { id: 3, user: 'Sophie', avatar: '👩‍🦱', message: 'Puka Beach is less crowded than White Beach! Perfect for peaceful mornings. Station 1 has the finest sand. D\'Mall for shopping and food! 🛍️', time: '1 day ago', likes: 19 },
      { id: 4, user: 'Jake', avatar: '🧑', message: 'Budget tip: Stay in Station 3, way cheaper! Party at Epic nightclub if you\'re into that. Fire dancers at night are FREE entertainment! 🔥', time: '2 days ago', likes: 15 }
    ],
    palawan: [
      { id: 1, user: 'Sean', avatar: '👨', message: 'El Nido is BREATHTAKING! Did Tour A and C - Secret Lagoon and Hidden Beach are incredible. Kayaking through limestone cliffs is magical! 🛶', time: '2 hours ago', likes: 35 },
      { id: 2, user: 'Jason', avatar: '🧔', message: 'Book island hopping early! Tours fill up fast in peak season. Tour A is best for first-timers. Big Lagoon and Small Lagoon are must-sees! 🏝️', time: '6 hours ago', likes: 28 },
      { id: 3, user: 'Emma', avatar: '👩', message: 'Nacpan Beach is a hidden gem - 4km of pristine sand, barely any tourists! Rent a motorbike to get there. Las Cabanas beach for sunset! 🌅', time: '1 day ago', likes: 21 },
      { id: 4, user: 'Diego', avatar: '🧑‍🦰', message: 'Underground River in Puerto Princesa is world heritage! Book 2 days advance. The cave formations are insane. Bring a waterproof phone case! 📸', time: '3 days ago', likes: 26 }
    ],
    baguio: [
      { id: 1, user: 'Jason', avatar: '🧔', message: 'The weather is PERFECT! 15-20°C even in summer. Bring a jacket! Mines View Park has great strawberries and mountain views. 🍓', time: '3 hours ago', likes: 18 },
      { id: 2, user: 'Sean', avatar: '👨', message: 'Burnham Park boat rides are fun! Session Road for shopping and ukay-ukay finds. Good Shepherd for pasalubong - their ube jam is famous! 🫙', time: '8 hours ago', likes: 14 },
      { id: 3, user: 'Lily', avatar: '👩', message: 'Tam-Awan Village showcases Cordillera culture beautifully. Also visited Botanical Garden and Bell Church. The whole city is Instagram-worthy! 📷', time: '1 day ago', likes: 16 },
      { id: 4, user: 'Mark', avatar: '🧑', message: 'Traffic is CRAZY on weekends! Visit weekdays if possible. Try strawberry taho and fresh vegetables at the market. Affordable accommodations everywhere! 🚗', time: '2 days ago', likes: 12 }
    ],
    vigan: [
      { id: 1, user: 'Sean', avatar: '👨', message: 'Calle Crisologo at night is like time travel! Cobblestone streets, Spanish houses, kalesa rides - pure magic. No cars allowed, so peaceful! 🐴', time: '4 hours ago', likes: 22 },
      { id: 2, user: 'Jason', avatar: '🧔', message: 'Vigan empanada is LEGENDARY! Orange shell, filled with veggies and egg. Also tried bagnet and longganisa - Ilocano food is underrated! 🥟', time: '7 hours ago', likes: 19 },
      { id: 3, user: 'Rosa', avatar: '👩', message: 'Stayed at a heritage hotel - felt like Spanish colonial times! Crisologo Museum and Bantay Bell Tower are must-visits. The architecture is preserved perfectly! 🏛️', time: '2 days ago', likes: 15 },
      { id: 4, user: 'Luis', avatar: '🧑', message: 'Don\'t miss Baluarte Zoo (FREE!) and pottery-making at Pagburnayan. Buy authentic Vigan jars as souvenirs. Very affordable place to visit! 🏺', time: '3 days ago', likes: 13 }
    ],
    siargao: [
      { id: 1, user: 'Jason', avatar: '🧔', message: 'Cloud 9 boardwalk is iconic! Watched surfers catch massive waves. Even if you don\'t surf, the vibe here is incredible. Sunset sessions! 🏄', time: '2 hours ago', likes: 28 },
      { id: 2, user: 'Sean', avatar: '👨', message: 'Took a surf lesson at Cloud 9 - stood up on my first day! ₱500 for 2 hours with board rental. Instructors are patient and friendly! 🌊', time: '5 hours ago', likes: 24 },
      { id: 3, user: 'Mia', avatar: '👩', message: 'Sugba Lagoon is a MUST! Crystal clear water, floating cottages, cliff jumping. Book a boat tour - ₱1,500 per person, includes lunch. Heaven! 🛥️', time: '1 day ago', likes: 31 },
      { id: 4, user: 'Alex', avatar: '🧑', message: 'Island hopping to Naked Island, Daku, and Guyam! Pack snacks and water. Rent a motorbike to explore - roads are good. Laid-back island life! 🏝️', time: '2 days ago', likes: 20 }
    ],
    'chocolate-hills': [
      { id: 1, user: 'Sean', avatar: '👨', message: 'The hills are STUNNING! Over 1,200 of them! Best viewed from the observation deck. Visit during dry season when they turn chocolate brown! 🍫', time: '3 hours ago', likes: 26 },
      { id: 2, user: 'Jason', avatar: '🧔', message: 'Combined this with Tarsier Sanctuary - saw the world\'s smallest primates! They\'re nocturnal but so cute. Loboc River cruise for lunch is relaxing! 🐵', time: '6 hours ago', likes: 22 },
      { id: 3, user: 'Nina', avatar: '👩', message: 'Did ATV tour around the hills - super fun! Panglao beaches are just 2 hours away. Bohol is packed with attractions, plan at least 3 days! 🏍️', time: '1 day ago', likes: 18 },
      { id: 4, user: 'Tom', avatar: '🧑', message: 'Baclayon Church and Blood Compact Shrine are nearby. The geological formation is unique in the world! Entrance fee is minimal. Worth the trip! ⛰️', time: '3 days ago', likes: 14 }
    ],
    mayon: [
      { id: 1, user: 'Jason', avatar: '🧔', message: 'The perfect cone shape is unreal! Did ATV tour around Mayon - thrilling ride through lava trails. Cagsawa Ruins with Mayon backdrop is iconic! 🌋', time: '4 hours ago', likes: 24 },
      { id: 2, user: 'Sean', avatar: '👨', message: 'Tried authentic Bicol Express and laing - SO SPICY but delicious! The food here is incredible. Pili nuts as pasalubang are unique! 🌶️', time: '7 hours ago', likes: 19 },
      { id: 3, user: 'Isabella', avatar: '👩', message: 'Climbed to Mayon\'s base camp - challenging but manageable. The view of Albay province from up there is spectacular. Hire certified guides! 🥾', time: '2 days ago', likes: 21 },
      { id: 4, user: 'Rafael', avatar: '🧑', message: 'Legazpi is underrated! Whale shark watching in Donsol is nearby. The city is clean and organized. Sumlang Lake has perfect Mayon reflection! 📷', time: '3 days ago', likes: 17 }
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
                            <span>Best time to visit: <strong>{item.bestTime}</strong></span>
                          </div>
                        )}
                        <div className="card-meta">
                          <span className="card-price">{item.price}</span>
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
