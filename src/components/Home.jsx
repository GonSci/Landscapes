import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Search, MapPin, Sparkles, Map, CheckCircle2, Target, Users, Star, ArrowRight, ChevronLeft, ChevronRight, Facebook, Twitter, Instagram, Mail, TrendingUp, Clock } from 'lucide-react';
import locationsData from '../data/philippines_locations.json';
import FeaturedDestinations from './FeaturedDestinations';
import './Home.css';

const Home = ({ onNavigate, currentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const featuredDestinations = [
    {
      ...locationsData.locations.find(loc => loc.id === 'boracay'),
      rating: 4.9,
      activities: "150+ activities",
      vibe: "Party & Paradise"
    },
    {
      ...locationsData.locations.find(loc => loc.id === 'palawan'),
      rating: 4.8,
      activities: "200+ activities",
      vibe: "Adventure Central"
    },
    {
      ...locationsData.locations.find(loc => loc.id === 'siargao'),
      rating: 4.7,
      activities: "80+ activities",
      vibe: "Surf & Soul"
    },
    {
      ...locationsData.locations.find(loc => loc.id === 'cebu'),
      rating: 4.9,
      activities: "300+ activities",
      vibe: "Urban Vibes"
    },
    {
      ...locationsData.locations.find(loc => loc.id === 'baguio'),
      rating: 4.6,
      activities: "120+ activities",
      vibe: "Mountain Escape"
    },
    {
      ...locationsData.locations.find(loc => loc.id === 'vigan'),
      rating: 4.8,
      activities: "60+ activities",
      vibe: "Timeless Charm"
    }
  ];

  const travelersFavorites = [
    {
      id: 1,
      title: "Island Hopping in El Nido",
      category: "Beach Tours",
      location: "Palawan",
      country: "Philippines",
      image: "/assets/images/palawan.jpg",
      description: "Explore crystal-clear lagoons, hidden beaches, and limestone cliffs in this tropical paradise.",
      badge: "Most Favorite",
      rating: 4.9,
      tag: "Top Pick"
    },
    {
      id: 2,
      title: "Chocolate Hills Adventure",
      category: "Nature Tours",
      location: "Bohol",
      country: "Philippines",
      image: "/assets/images/chocolate-hills.jpg",
      description: "Discover the iconic cone-shaped hills and unique geological wonders of Bohol.",
      badge: "Trending Now",
      rating: 4.7,
      tag: "Nature Lover"
    },
    {
      id: 3,
      title: "Surfing in Cloud 9",
      category: "Water Sports",
      location: "Siargao",
      country: "Philippines",
      image: "/assets/images/siargao.jpg",
      description: "Ride world-class waves and experience the ultimate surfing adventure in paradise.",
      badge: "Adventure Pick",
      rating: 4.8,
      tag: "Thrill Seeker"
    },
    {
      id: 4,
      title: "Historic Vigan Tour",
      category: "Heritage Sites",
      location: "Ilocos Sur",
      country: "Philippines",
      image: "/assets/images/vigan.jpg",
      description: "Step back in time exploring cobblestone streets and Spanish colonial architecture.",
      badge: "Cultural Gem",
      rating: 4.6,
      tag: "History Buff"
    },
    {
      id: 5,
      title: "Boracay Sunset Experience",
      category: "Beach Tours",
      location: "Boracay",
      country: "Philippines",
      image: "/assets/images/boracay.jpg",
      description: "Witness breathtaking sunsets on powdery white sand beaches and turquoise waters.",
      badge: "Most Favorite",
      rating: 4.9,
      tag: "Beach Paradise"
    },
    {
      id: 6,
      title: "Baguio Cool Escape",
      category: "Mountain Tours",
      location: "Baguio",
      country: "Philippines",
      image: "/assets/images/baguio.jpg",
      description: "Escape to the mountains with cool weather, pine trees, and stunning highland views.",
      badge: "Popular Choice",
      rating: 4.6,
      tag: "Weekend Getaway"
    },
    {
      id: 7,
      title: "Cebu City & Beaches",
      category: "City Tours",
      location: "Cebu",
      country: "Philippines",
      image: "/assets/images/cebu.jpg",
      description: "Experience urban excitement combined with pristine beaches and island adventures.",
      badge: "Popular",
      rating: 4.9,
      tag: "City Explorer"
    },
    {
      id: 8,
      title: "Manila Heritage Walk",
      category: "Cultural Tours",
      location: "Manila",
      country: "Philippines",
      image: "/assets/images/manila.jpg",
      description: "Explore centuries of history through ancient churches, forts, and cultural landmarks.",
      badge: "Cultural Gem",
      rating: 4.5,
      tag: "Heritage Trail"
    }
  ];

  const categories = [
    { id: 'foods', name: 'Foods', icon: Star, count: '100+', color: '#f59e0b', image: '/assets/images/manila.jpg' },
    { id: 'beaches', name: 'Beaches', icon: MapPin, count: '45+', color: '#667eea', image: '/assets/images/boracay.jpg' },
    { id: 'cities', name: 'Cities', icon: Map, count: '25+', color: '#8b5cf6', image: '/assets/images/manila.jpg' },
    { id: 'islands', name: 'Islands', icon: Sparkles, count: '50+', color: '#667eea', image: '/assets/images/palawan.jpg' },
    { id: 'historical', name: 'Historical', icon: MapPin, count: '40+', color: '#764ba2', image: '/assets/images/vigan.jpg' },
    { id: 'nature', name: 'Nature', icon: Target, count: '60+', color: '#8b5cf6', image: '/assets/images/chocolate-hills.jpg' }
  ];

  const whyChoose = [
    {
      icon: Sparkles,
      title: 'AI Travel Assistant',
      description: 'Get instant recommendations, cultural insights, and personalized travel tips powered by advanced AI. Your 24/7 local guide in every destination.',
      color: '#667eea'
    },
    {
      icon: TrendingUp,
      title: 'Real-Time Crowd Patterns',
      description: 'Know exactly when to go to avoid crowds or join the buzz! Our AI analyzes real crowd data to reveal the perfect time, day, or month to visit any destination.',
      color: '#f59e0b'
    },
    {
      icon: Map,
      title: 'Interactive Philippine Map',
      description: 'Explore 70+ destinations with a beautiful, interactive map. Click anywhere to discover hidden gems and unlock local secrets you won\'t find in guidebooks.',
      color: '#764ba2'
    },
    {
      icon: Clock,
      title: 'Smart Itinerary Planner',
      description: 'Select your dream destinations and watch AI craft the perfect route. Optimized travel times, strategic stops, and personalized schedules tailored to your pace.',
      color: '#10b981'
    },
    {
      icon: CheckCircle2,
      title: 'Smart Travel Checklists',
      description: 'Never forget anything again! AI-powered packing lists and travel prep guides customized for your destination, season, and activities. Travel stress-free.',
      color: '#8b5cf6'
    },
    {
      icon: Target,
      title: 'Cultural Quests & Achievements',
      description: 'Turn exploration into an adventure! Unlock achievements, earn badges, and complete quests to win free travel vouchers.',
      color: '#667eea'
    }
  ];

  const testimonials = [
    {
      name: "Maria Santos",
      role: "Travel Blogger",
      location: "Manila",
      avatar: "MS",
      rating: 5,
      text: "Landscapes transformed my travel planning! The AI assistant is like having a local friend in every destination. Absolutely love it!",
      date: "2 weeks ago"
    },
    {
      name: "Juan Dela Cruz",
      role: "Adventure Seeker",
      location: "Cebu",
      avatar: "JD",
      rating: 5,
      text: "The interactive map is a game-changer. Found so many hidden spots I wouldn't have discovered otherwise. Highly recommended!",
      date: "1 month ago"
    },
    {
      name: "Sarah Chen",
      role: "Digital Nomad",
      location: "Siargao",
      avatar: "SC",
      rating: 5,
      text: "Premium tier is worth every peso. Unlimited AI queries saved me hours of research. The cultural quests are so fun!",
      date: "3 weeks ago"
    },
    {
      name: "Miguel Torres",
      role: "Family Traveler",
      location: "Baguio",
      avatar: "MT",
      rating: 4,
      text: "Perfect for planning family trips. The checklists ensure we never forget anything important. Kids love the quest system!",
      date: "1 week ago"
    },
    {
      name: "Ana Reyes",
      role: "Solo Explorer",
      location: "Palawan",
      avatar: "AR",
      rating: 5,
      text: "As a solo traveler, the safety tips and local insights were invaluable. Made me feel confident exploring on my own!",
      date: "4 days ago"
    },
    {
      name: "David Kim",
      role: "Food Enthusiast",
      location: "Pampanga",
      avatar: "DK",
      rating: 5,
      text: "The food recommendations alone are worth it! Discovered authentic restaurants I never would have found. Amazing!",
      date: "5 days ago"
    },
    {
      name: "Isabella Cruz",
      role: "Photography Lover",
      location: "Batanes",
      avatar: "IC",
      rating: 5,
      text: "Found the most stunning photo spots thanks to Landscapes. The location insights helped me capture perfect shots!",
      date: "1 week ago"
    },
    {
      name: "Rico Valdez",
      role: "Budget Traveler",
      location: "Ilocos",
      avatar: "RV",
      rating: 4,
      text: "Great for budget planning! The AI helped me create an amazing itinerary without breaking the bank. Very impressed!",
      date: "2 weeks ago"
    }
  ];

  return (
    <div className="home-container-klook">
      <HeroSection searchQuery={searchQuery} setSearchQuery={setSearchQuery} onNavigate={onNavigate} />
      <FeaturedDestinations onNavigate={onNavigate} />
      <TravelersFavorites experiences={travelersFavorites} onNavigate={onNavigate} />
      <CategoriesSection categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} onNavigate={onNavigate} />
      <WhyChooseLandscapes features={whyChoose} />
      <PricingPreview currentUser={currentUser} onNavigate={onNavigate} />
      <TestimonialsSection testimonials={testimonials} />
      <CTASection onNavigate={onNavigate} />
      <FooterSection />
    </div>
  );
};


function HeroSection({ searchQuery, setSearchQuery, onNavigate }) {
  const containerRef = useRef(null);
  const searchRef = useRef(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // Popular destinations from the app
  const popularDestinations = [
    'Manila', 'Boracay', 'Palawan', 'Cebu', 'Siargao',
    'Quezon City', 'Makati', 'Baguio', 'Vigan', 'Bohol'
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <motion.section ref={containerRef} className="hero-klook">
      <motion.div style={{ y }} className="hero-bg-klook">
        <div className="hero-overlay" />
      </motion.div>

      <motion.div style={{ opacity }} className="hero-content-klook">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="hero-text-klook"
        >
          <h1 className="hero-title-klook">Discover the Best of the Philippines</h1>
          <p className="hero-subtitle-klook">From pristine beaches to historic cities — unlock unforgettable experiences with AI-powered travel planning</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="hero-search-klook"
          ref={searchRef}
        >
          <div className="search-box-klook">
            <Search className="search-icon" size={24} />
            <input
              type="text"
              placeholder="Local Cuisine, Beaches, or Activities"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearchDropdown(true)}
              className="search-input-klook"
            />
            <button className="search-btn-klook" onClick={() => {
              setShowSearchDropdown(false);
              onNavigate('explore');
            }}>
              Search
            </button>
          </div>

          {/* Popular Destinations Dropdown */}
          {showSearchDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="popular-destinations-dropdown"
            >
              <h3 className="dropdown-title">Popular Destinations</h3>
              <div className="destinations-grid">
                {popularDestinations.map((destination, index) => (
                  <button
                    key={index}
                    className="destination-item"
                    onClick={() => {
                      setSearchQuery(destination);
                      setShowSearchDropdown(false);
                      onNavigate('explore');
                    }}
                  >
                    {destination}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="hero-cta-buttons"
        >
          <button className="hero-btn-primary" onClick={() => window.open('#map', '_blank')}>
            <Map size={20} />
            Start Exploring
          </button>
          <button className="hero-btn-secondary" onClick={() => window.open('#explore', '_blank')}>
            <Sparkles size={20} />
            Browse Destinations
          </button>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}

// ===== CATEGORIES SECTION =====
function CategoriesSection({ categories, activeCategory, setActiveCategory, onNavigate }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="categories-section-klook">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
        className="section-header-klook"
      >
        <h2 className="section-title-klook">Explore by Category</h2>
        <p className="section-subtitle-klook">Find your perfect Philippine adventure</p>
      </motion.div>

      <div className="categories-grid-klook">
        {categories.map((cat, i) => {
          const IconComponent = cat.icon;
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              whileHover={{ scale: 1.05, transition: { duration: 0.3 } }}
              className={`category-card-klook ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => {
                setActiveCategory(cat.id);
                window.open('#explore', '_blank');
              }}
            >
              <div className="category-image-bg" style={{ backgroundImage: `url(${cat.image})` }}></div>
              <div className="category-content">
                <div className="category-icon-klook" style={{ color: cat.color }}>
                  <IconComponent size={40} strokeWidth={2} />
                </div>
                <h3 className="category-name-klook">{cat.name}</h3>
                <p className="category-count-klook">{cat.count} destinations</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

// ===== TRAVELERS' FAVORITES SECTION =====
function TravelersFavorites({ experiences, onNavigate }) {
  const ref = useRef(null);
  const scrollRef = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const getBadgeColor = (badge) => {
    switch(badge) {
      case 'Most Favorite': return { bg: '#fef3c7', border: '#fbbf24', text: '#92400e' };
      case 'Trending Now': return { bg: '#ddd6fe', border: '#a78bfa', text: '#5b21b6' };
      case 'Adventure Pick': return { bg: '#fed7aa', border: '#fb923c', text: '#9a3412' };
      case 'Cultural Gem': return { bg: '#bae6fd', border: '#38bdf8', text: '#075985' };
      case 'Popular Choice': return { bg: '#fecaca', border: '#f87171', text: '#991b1b' };
      case 'Best Seller': return { bg: '#bbf7d0', border: '#4ade80', text: '#166534' };
      default: return { bg: '#f0fdf4', border: '#86efac', text: '#16a34a' };
    }
  };

  return (
    <section ref={ref} className="travelers-favorites-carousel">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
        className="section-header-klook"
      >
        <h2 className="section-title-klook">Top Favorites</h2>
        <p className="section-subtitle-klook">Travelers' favorite choices in the Philippines</p>
      </motion.div>

      <div className="carousel-wrapper-favorites">
        <button className="carousel-arrow-favorites left" onClick={() => scroll('left')}>
          <ChevronLeft size={28} strokeWidth={2.5} />
        </button>
        <button className="carousel-arrow-favorites right" onClick={() => scroll('right')}>
          <ChevronRight size={28} strokeWidth={2.5} />
        </button>

        <div ref={scrollRef} className="favorites-carousel-scroll">
          {experiences.map((exp, i) => (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, x: 50 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ scale: 1.03, y: -8, transition: { duration: 0.3 } }}
              className="favorite-card-klook"
              onClick={() => window.open('#explore', '_blank')}
            >
              {/* Image Container */}
              <div className="favorite-image-klook">
                <img src={exp.image} alt={exp.title} />
                <div className="favorite-tag-badge">{exp.tag}</div>
              </div>

              {/* Card Content */}
              <div className="favorite-content-klook">
                {/* Category + Country */}
                <p className="favorite-category">
                  {exp.category} ◇ {exp.country}
                </p>

                {/* Title */}
                <h3 className="favorite-title-klook">{exp.title}</h3>

                {/* Description */}
                <p className="favorite-description-klook">
                  {exp.description}
                </p>

                {/* Badge */}
                <div 
                  className="favorite-badge-klook"
                  style={{
                    backgroundColor: getBadgeColor(exp.badge).bg,
                    borderColor: getBadgeColor(exp.badge).border,
                    color: getBadgeColor(exp.badge).text
                  }}
                >
                  {exp.badge}
                </div>

                {/* Rating */}
                <div className="favorite-rating-row">
                  <div className="favorite-rating">
                    <Star size={14} fill="#fbbf24" color="#fbbf24" />
                    <span>{exp.rating}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* See More Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.6 }}
        className="see-more-container"
      >
        <button 
          className="see-more-btn-klook"
          onClick={() => window.open('#explore', '_blank')}
        >
          See More Experiences
          <ArrowRight size={18} />
        </button>
      </motion.div>
    </section>
  );
}

// ===== WHY CHOOSE Landscapes   =====
function WhyChooseLandscapes ({ features }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="why-choose-section-klook">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
        className="section-header-klook"
      >
        <h2 className="section-title-klook">Why Choose ?</h2>
        <p className="section-subtitle-klook">Travel smarter with AI-powered tools</p>
      </motion.div>

      <div className="features-grid-klook">
        {features.map((feature, i) => {
          const IconComponent = feature.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ delay: i * 0.12, duration: 0.6 }}
              whileHover={{ y: -5 }}
              className="feature-card-klook"
            >
              <div className="feature-icon-klook" style={{ color: feature.color }}>
                <IconComponent size={56} strokeWidth={1.5} />
              </div>
              <h3 className="feature-title-klook">{feature.title}</h3>
              <p className="feature-description-klook">{feature.description}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

// ===== PRICING PREVIEW =====
function PricingPreview({ currentUser, onNavigate }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const plans = [
    {
      name: 'Free',
      price: '₱0',
      period: 'forever',
      features: [
        { text: 'Interactive map browsing', included: true },
        { text: 'Browse 70+ destinations', included: true },
        { text: '5 AI queries per day', included: true },
        { text: 'Basic quest access', included: true },
        { text: 'Limited voucher rewards', included: true },
        { text: 'Itinerary planning', included: false },
        { text: 'Crowd insights', included: false },
      ],
      cta: 'Start Free',
      primary: false
    },
    {
      name: 'Basic',
      price: '₱99',
      period: 'month',
      features: [
        { text: 'Everything in Free', included: true },
        { text: '50 AI queries per day', included: true },
        { text: '10 itinerary plans per month', included: true },
        { text: 'Weekly crowd insights', included: true },
        { text: 'Standard quests & achievements', included: true },
        { text: 'Limited voucher rewards', included: true },
        { text: 'Real-time crowd alerts', included: false },
        { text: 'Unlimited itineraries', included: false },
        { text: 'Premium cultural guides', included: false },
        { text: 'Priority support', included: false }
      ],
      cta: 'Go Basic',
      primary: false
    },
    {
      name: 'Premium',
      price: '₱199',
      period: 'month',
      features: [
        { text: 'Everything in Basic +', included: true },
        { text: 'Unlimited AI queries & chat', included: true },
        { text: 'Unlimited smart itinerary planning', included: true },
        { text: 'Real-time crowd insights & alerts', included: true },
        { text: 'Unlimited quests + voucher rewards', included: true },
        { text: 'Exclusive cultural content & guides', included: true },
        { text: 'Priority 24/7 support', included: true },
        { text: 'Advanced travel analytics', included: true }
      ],
      cta: 'Go Premium',
      primary: true,
      badge: 'Best Value'
    }
  ];

  return (
    <section ref={ref} className="pricing-section-klook">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
        className="section-header-klook"
      >
        <h2 className="section-title-klook">Choose Your Adventure</h2>
        <p className="section-subtitle-klook">Free to explore, premium to unlock everything</p>
      </motion.div>

      <div className="pricing-grid-klook">
        {plans.map((plan, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ delay: i * 0.15, duration: 0.6 }}
            whileHover={{ y: -10, transition: { duration: 0.3 } }}
            className={`pricing-card-klook ${plan.primary ? 'primary' : ''}`}
          >
            {plan.badge && <div className="pricing-badge">{plan.badge}</div>}
            
            <h3 className="pricing-plan-name">{plan.name}</h3>
            <div className="pricing-price">
              <span className="price-amount">{plan.price}</span>
              <span className="price-period">/{plan.period}</span>
            </div>

            <ul className="pricing-features">
              {plan.features.map((feature, j) => (
                <li key={j} className={feature.included ? 'included' : 'excluded'}>
                  {feature.included ? (
                    <CheckCircle2 size={18} className="feature-icon" />
                  ) : (
                    <span className="feature-icon">×</span>
                  )}
                  {feature.text}
                </li>
              ))}
            </ul>

            <button
              className={`pricing-cta-btn ${plan.primary ? 'primary' : ''}`}
              onClick={() => window.open('#profile', '_blank')}
            >
              {plan.cta}
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ===== TESTIMONIALS SECTION =====
function TestimonialsSection({ testimonials }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="testimonials-section-klook">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
        className="section-header-klook"
      >
        <h2 className="section-title-klook">Loved by Travelers</h2>
        <p className="section-subtitle-klook">See what our community is saying</p>
      </motion.div>

      <div className="testimonials-carousel-container">
        <div className="testimonials-scroll-klook">
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ scale: 1.03 }}
              className="testimonial-card-klook"
            >
              <div className="testimonial-header">
                <div className="testimonial-avatar">{testimonial.avatar}</div>
                <div className="testimonial-author-info">
                  <h4 className="testimonial-author-name">{testimonial.name}</h4>
                  <p className="testimonial-author-role">{testimonial.role}</p>
                </div>
                <div className="testimonial-rating">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} size={16} fill="#fbbf24" color="#fbbf24" className="star-klook" />
                  ))}
                </div>
              </div>
              <p className="testimonial-text-klook">"{testimonial.text}"</p>
              <div className="testimonial-footer">
                <span className="testimonial-location">
                  <MapPin size={14} />
                  {testimonial.location}
                </span>
                <span className="testimonial-date">{testimonial.date}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ===== CTA SECTION =====
function CTASection({ onNavigate }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="cta-section-klook"
    >
      <motion.div
        className="cta-bg-orb cta-orb-1"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="cta-bg-orb cta-orb-2"
        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, delay: 2 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="cta-content-klook"
      >
        <h2 className="cta-title-klook">Ready for Your Next Adventure?</h2>
        <p className="cta-subtitle-klook">
          Join 50,000+ travelers discovering the Philippines with Landscapes
        </p>
        <button
          className="cta-button-klook"
          onClick={() => window.open('#map', '_blank')}
        >
          <Sparkles size={20} />
          Start Exploring Now
        </button>
      </motion.div>
    </motion.section>
  );
}

// ===== FOOTER =====
function FooterSection() {
  return (
    <footer className="footer-klook">
      <div className="footer-content-klook">
        <div className="footer-grid-klook">
          <div className="footer-col-klook">
            <h3 className="footer-brand-klook">Landscapes</h3>
            <p className="footer-tagline-klook">
              Your AI-powered companion to explore the Philippines authentically.
            </p>
            <div className="footer-social-klook">
              <a href="#" className="social-link" aria-label="Facebook">
                <Facebook size={20} />
              </a>
              <a href="#" className="social-link" aria-label="Twitter">
                <Twitter size={20} />
              </a>
              <a href="#" className="social-link" aria-label="Instagram">
                <Instagram size={20} />
              </a>
            </div>
          </div>

          <div className="footer-col-klook">
            <h4 className="footer-heading-klook">Explore</h4>
            <ul className="footer-links-klook">
              <li><a href="#map">Interactive Map</a></li>
              <li><a href="#explore">Destinations</a></li>
              <li><a href="#community">Community</a></li>
              <li><a href="#profile">My Profile</a></li>
            </ul>
          </div>

          <div className="footer-col-klook">
            <h4 className="footer-heading-klook">Company</h4>
            <ul className="footer-links-klook">
              <li><a href="#about">About Us</a></li>
              <li><a href="#blog">Travel Blog</a></li>
              <li><a href="#careers">Careers</a></li>
              <li><a href="#press">Press</a></li>
            </ul>
          </div>

          <div className="footer-col-klook">
            <h4 className="footer-heading-klook">Support</h4>
            <ul className="footer-links-klook">
              <li><a href="#help">Help Center</a></li>
              <li><a href="#contact">Contact Us</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#terms">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-klook">
          <p className="footer-copyright-klook">
            © 2025 Landscapes. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Home;
