import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Search, MapPin, Sparkles, Map, CheckCircle2, Target, Users, Star, ArrowRight, ChevronLeft, ChevronRight, Facebook, Twitter, Instagram, Mail, TrendingUp, Clock } from 'lucide-react';
import locationsData from '../../data/philippines_locations.json';
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
      title: "Burnham Park Relaxation",
      category: "Park Tours",
      location: "Baguio City",
      country: "Philippines",
      image: "/assets/featured_images/burnham-park.jpg",
      description: "Central park with boating lagoon, gardens, and cool mountain breeze perfect for family picnics.",
      badge: "Most Favorite",
      rating: 4.8,
      tag: "Family Friendly"
    },
    {
      id: 2,
      title: "Mines View Park Scenery",
      category: "Scenic Viewpoint",
      location: "Baguio City",
      country: "Philippines",
      image: "/assets/featured_images/mines-view-park.jpg",
      description: "Breathtaking viewpoint overlooking mining town, with souvenir shops and stunning mountain panoramas.",
      badge: "Best View",
      rating: 4.7,
      tag: "Photo Spot"
    },
    {
      id: 3,
      title: "Session Road Shopping",
      category: "City Experience",
      location: "Baguio City",
      country: "Philippines",
      image: "/assets/featured_images/session-road.jpg",
      description: "Main shopping and dining street with local shops, restaurants, and vibrant city atmosphere.",
      badge: "Popular",
      rating: 4.6,
      tag: "Urban Explorer"
    },
    {
      id: 4,
      title: "Baguio Cathedral Visit",
      category: "Heritage Sites",
      location: "Baguio City",
      country: "Philippines",
      image: "/assets/featured_images/baguio-cathedral.jpg",
      description: "Rose-tinted twin-spired Catholic cathedral with beautiful architecture and peaceful atmosphere.",
      badge: "Cultural Gem",
      rating: 4.8,
      tag: "Spiritual"
    },
    {
      id: 5,
      title: "Strawberry Farm Picking",
      category: "Farm Experience",
      location: "Baguio City",
      country: "Philippines",
      image: "/assets/featured_images/strawberry-farm.jpg",
      description: "Pick-your-own strawberries experience with fresh mountain air and authentic local farm products.",
      badge: "Unique Experience",
      rating: 4.7,
      tag: "Nature Lover"
    },
    {
      id: 6,
      title: "Teachers Camp Heritage",
      category: "Historical Tours",
      location: "Baguio City",
      country: "Philippines",
      image: "/assets/featured_images/teachers-camp.jpg",
      description: "Historical American-era training facility with pine tree surroundings and colonial architecture.",
      badge: "History Buff",
      rating: 4.5,
      tag: "Educational"
    },
    {
      id: 7,
      title: "Wright Park Horseback Riding",
      category: "Adventure Tours",
      location: "Baguio City",
      country: "Philippines",
      image: "/assets/featured_images/wright-park.jpg",
      description: "Horseback riding through pine tree-lined paths with photo opportunities and mountain views.",
      badge: "Adventure Pick",
      rating: 4.6,
      tag: "Outdoor Fun"
    },
    {
      id: 8,
      title: "SM Baguio Shopping",
      category: "Shopping Tours",
      location: "Baguio City",
      country: "Philippines",
      image: "/assets/featured_images/sm-baguio.jpg",
      description: "Large shopping mall with various stores, dining options, and entertainment facilities.",
      badge: "Convenient",
      rating: 4.4,
      tag: "Shopping"
    }
  ];

  const categories = [
    { id: 'foods', name: 'Foods', icon: Star, count: '100+', color: '#f59e0b', image: '/assets/featured_images/manila.jpg' },
    { id: 'beaches', name: 'Beaches', icon: MapPin, count: '45+', color: '#667eea', image: '/assets/featured_images/boracay.jpg' },
    { id: 'cities', name: 'Cities', icon: Map, count: '25+', color: '#8b5cf6', image: '/assets/featured_images/manila.jpg' },
    { id: 'islands', name: 'Islands', icon: Sparkles, count: '50+', color: '#667eea', image: '/assets/featured_images/palawan.jpg' },
    { id: 'historical', name: 'Historical', icon: MapPin, count: '40+', color: '#764ba2', image: '/assets/featured_images/vigan.jpg' },
    { id: 'nature', name: 'Nature', icon: Target, count: '60+', color: '#8b5cf6', image: '/assets/featured_images/chocolate-hills.jpg' }
  ];

  const testimonials = [
    {
      name: "Maria Santos",
      role: "Family Traveler",
      location: "Baguio City",
      avatar: "MS",
      rating: 5,
      text: "The real-time crowd detection is a lifesaver! We avoided Burnham Park during peak hours and visited nearby hidden gems instead. Perfect for families who hate crowded places!",
      date: "2 weeks ago"
    },
    {
      name: "Juan Dela Cruz",
      role: "Weekend Explorer",
      location: "Baguio City",
      avatar: "JD",
      rating: 5,
      text: "Tourist redirection feature saved my weekend! When Session Road was packed, the system suggested Teachers Camp - it was peaceful and beautiful. This is brilliant!",
      date: "1 week ago"
    },
    {
      name: "Sarah Chen",
      role: "Solo Traveler",
      location: "Baguio City",
      avatar: "SC",
      rating: 5,
      text: "As someone who hates crowds, the live crowd monitoring is exactly what I needed. The redirection suggestions helped me discover quieter spots I never knew existed!",
      date: "3 days ago"
    },
    {
      name: "Miguel Torres",
      role: "Tourist",
      location: "Baguio City",
      avatar: "MT",
      rating: 5,
      text: "Visited Baguio during peak season but never felt overwhelmed. Real-time alerts showed me when to visit each spot, and redirection to low-crowd areas made my trip stress-free!",
      date: "1 week ago"
    },
    {
      name: "Ana Reyes",
      role: "Photography Enthusiast",
      location: "Baguio City",
      avatar: "AR",
      rating: 5,
      text: "The crowd detection helped me find perfect photo opportunities without tourists in the background. Mines View Park at recommended times was absolutely serene!",
      date: "4 days ago"
    },
    {
      name: "David Kim",
      role: "Adventure Seeker",
      location: "Baguio City",
      avatar: "DK",
      rating: 5,
      text: "Tourist redirection is genius! Instead of waiting at crowded Strawberry Farm, I was directed to Wright Park. No crowds, better experience. Highly recommend!",
      date: "5 days ago"
    },
    {
      name: "Isabella Cruz",
      role: "Local Resident",
      location: "Baguio City",
      avatar: "IC",
      rating: 5,
      text: "Even as a local, the crowd monitoring helps me plan my outings. Avoiding high-density areas during peak hours has made exploring my own city so much better!",
      date: "1 week ago"
    },
    {
      name: "Rico Valdez",
      role: "Budget Traveler",
      location: "Baguio City",
      avatar: "RV",
      rating: 4,
      text: "Smart redirection saved me money too! No time wasted stuck in crowded areas and parking fees. The app directed me to free spots with less people. Perfect!",
      date: "2 weeks ago"
    }
  ];

  return (
    <div className="home-container-klook">
      <HeroSection searchQuery={searchQuery} setSearchQuery={setSearchQuery} onNavigate={onNavigate} />
      <FeaturedDestinations onNavigate={onNavigate} />
      <TravelersFavorites experiences={travelersFavorites} onNavigate={onNavigate} />
      <CategoriesSection categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} onNavigate={onNavigate} />
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
          <h1 className="hero-title-klook">Discover the Best of Baguio City</h1>
          <p className="hero-subtitle-klook">From chilly pine forests to vibrant art scenes — unlock unforgettable mountain getaways and local favorites.</p>
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
              placeholder="Parks, Sightseeing, or Local Cuisine"
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
