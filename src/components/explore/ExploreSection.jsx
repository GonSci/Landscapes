import React, { useState } from 'react';
import './ExploreSection.css';

const ExploreSection = ({ onLocationClick, onMarkLocation, userProfile }) => {
  const [selectedCategory, setSelectedCategory] = useState('islands');
  const [selectedDiscovery, setSelectedDiscovery] = useState('All');
  
  const categories = [
    { id: 'islands', name: ' Islands', icon: '🏝️' },
    { id: 'museums', name: ' Museums', icon: '🏛️' },
    { id: 'festivals', name: ' Festivals', icon: '🎭' },
    { id: 'beaches', name: ' Beaches', icon: '🏖️' },
    { id: 'mountains', name: ' Mountains', icon: '⛰️' },
    { id: 'heritage', name: ' Heritage Sites', icon: '🏰' }
  ];

  const discoveryLevels = [
    'All',
    'Top Destination',
    'Popular Spot',
    'Cultural Favorite',
    'Undiscovered Treasure'
  ];

  const exploreData = {
    islands: [
      {
        id: 'boracay',
        name: 'Boracay',
        region: 'Aklan',
        lat: 11.9674,
        lng: 121.9248,
        image: '/assets/images/boracay.jpg',
        description: 'World-famous for its pristine white sand beaches and crystal-clear waters. Boracay offers vibrant nightlife, water sports, and stunning sunsets. Considered to be the most visited place in the Philippines',
        highlights: [
          'White Beach - 4km of powdery white sand',
          'Water sports: kiteboarding, parasailing, diving',
          'Vibrant nightlife and beach parties',
          'Island hopping and snorkeling',
          'Stunning sunset views at Station 1'
        ],
        bestTime: 'November to May',
        category: 'islands',
        rating: 5,
        ratingLabel: 'Most Visited',
        discoveryLevel: 'Top Destination'
      },
      {
        id: 'elnido',
        name: 'El Nido',
        region: 'Palawan',
        lat: 11.1791,
        lng: 119.3840,
        image: '/assets/images/palawan.jpg',
        description: 'El Nido is known for its dramatic limestone cliffs, turquoise lagoons, and pristine beaches. A paradise for divers, kayakers, and nature lovers.',
        highlights: [
          'Big and Small Lagoons kayaking',
          'Limestone cliffs and turquoise waters',
          'Island hopping tours A, B, C, and D',
          'Rich marine biodiversity'
        ],
        bestTime: 'December to May',
        category: 'islands',
        rating: 4,
        ratingLabel: 'Well-Known',
        discoveryLevel: 'Popular Spot'
      },
      {
        id: 'siargao',
        name: 'Siargao Island',
        region: 'Surigao del Norte',
        lat: 9.8484,
        lng: 126.0458,
        image: '/assets/images/siargao.jpg',
        description: 'The surfing capital of the Philippines, famous for Cloud 9, natural pools, and relaxed island culture.',
        highlights: [
          'Cloud 9 surf break',
          'Sugba Lagoon and Magpupungko pools',
          'Island hopping to Naked, Daku, and Guyam Islands',
          'Eco-friendly resorts and cafés'
        ],
        bestTime: 'March to October',
        category: 'islands',
        rating: 3,
        ratingLabel: 'Known',
        discoveryLevel: 'Cultural Favorite'
      },
      {
        id: 'camiguin',
        name: 'Camiguin Island',
        region: 'Northern Mindanao',
        lat: 9.1735,
        lng: 124.7299,
        image: '/assets/images/camiguin.jpg',
        description: 'Known as the "Island Born of Fire", Camiguin features volcanoes, waterfalls, and unspoiled beaches.',
        highlights: [
          'White Island sandbar',
          'Hot and cold springs',
          'Mt. Hibok-Hibok trekking',
          'Lanzones Festival and heritage sites'
        ],
        bestTime: 'February to June',
        category: 'islands',
        rating: 1,
        ratingLabel: 'Hidden Gem',
        discoveryLevel: 'Undiscovered Treasure'
      }
    ],
    museums: [
      {
        id: 'national-museum',
        name: 'National Museum of the Philippines',
        region: 'Manila',
        lat: 14.5831,
        lng: 120.9813,
        image: '/assets/images/national-museum.jpg',
        description: 'The premier cultural institution showcasing Filipino heritage, art, and natural history.',
        highlights: [
          'Juan Luna\'s Spoliarium masterpiece',
          'Natural history exhibits',
          'Anthropology and archaeology collections',
          'Free admission for all',
          'Beautiful neoclassical architecture'
        ],
        bestTime: 'Year-round (Closed Mondays)',
        category: 'museums',
        rating: 5,
        ratingLabel: 'Most Visited',
        discoveryLevel: 'Top Destination'
      },
      {
        id: 'ayalamuseum',
        name: 'Ayala Museum',
        region: 'Makati',
        lat: 14.5535,
        lng: 121.0232,
        image: '/assets/images/ayalamuseum.jpg',
        description: 'A modern museum featuring Philippine gold artifacts, dioramas of history, and contemporary art displays.',
        highlights: [
          'Gold of Ancestors exhibit',
          'Historical dioramas of the Philippines',
          'Interactive digital galleries',
          'Modern Filipino art showcases'
        ],
        bestTime: 'Year-round',
        category: 'museums',
        rating: 4,
        ratingLabel: 'Well-Known',
        discoveryLevel: 'Popular Spot'
      },
      {
        id: 'museosugbo',
        name: 'Museo Sugbo',
        region: 'Cebu City',
        lat: 10.3089,
        lng: 123.8998,
        image: '/assets/images/museosugbo.jpg',
        description: 'A former prison turned museum that tells Cebu’s story from the pre-colonial era to modern times.',
        highlights: [
          'Spanish colonial architecture',
          'Cebuano wartime exhibits',
          'Archaeological artifacts',
          'Local art and heritage collections'
        ],
        bestTime: 'Year-round',
        category: 'museums',
        rating: 3,
        ratingLabel: 'Known',
        discoveryLevel: 'Cultural Favorite'
      },
      { 
        id: 'ateneoartgallery',
        name: 'Ateneo Art Gallery',
        region: 'Quezon City',
        lat: 14.6394,
        lng: 121.0781,
        image: '/assets/images/ateneogallery.jpg',
        description: 'The first modern art museum in the Philippines, housing contemporary works and post-war pieces.',
        highlights: [
          'Fernando Zóbel collection',
          'Modern and contemporary art exhibits',
          'Minimalist architecture',
          'Quiet and intimate atmosphere'
        ],
        bestTime: 'Year-round',
        category: 'museums',
        rating: 1,
        ratingLabel: 'Hidden Gem',
        discoveryLevel: 'Undiscovered Treasure'
      }
    ],
    festivals: [
      {
        id: 'sinulog',
        name: 'Sinulog Festival',
        region: 'Cebu City',
        lat: 10.3157,
        lng: 123.8854,
        image: '/assets/images/sinulog.jpg',
        description: 'A grand celebration honoring the Santo Niño, featuring street dancing, parades, and colorful costumes.',
        highlights: [
          'Vibrant street parade',
          'Cultural and religious celebration',
          'Traditional dances and costumes',
          'Night concerts and fireworks'
        ],
        bestTime: 'January',
        category: 'festivals',
        rating: 5,
        ratingLabel: 'Most Visited',
        discoveryLevel: 'Top Destination'
      },
      {
        id: 'atiatihan',
        name: 'Ati-Atihan Festival',
        region: 'Aklan',
        lat: 11.7061,
        lng: 122.3649,
        image: '/assets/images/atiatihan.jpg',
        description: 'One of the oldest festivals in the Philippines, celebrating the Santo Niño with tribal dances and body paint.',
        highlights: [
          'Tribal-inspired street dancing',
          'Black body paint tradition',
          'Drumbeats and chants',
          'Community participation and energy'
        ],
        bestTime: 'January',
        category: 'festivals',
        rating: 4,
        ratingLabel: 'Well-Known',
        discoveryLevel: 'Popular Spot'
      },
      {
        id: 'pahiyas',
        name: 'Pahiyas Festival',
        region: 'Lucban, Quezon',
        lat: 14.1139,
        lng: 121.5534,
        image: '/assets/images/pahiyas.jpg',
        description: 'A colorful harvest festival where houses are decorated with rice grains, vegetables, and “kiping.”',
        highlights: [
          'Vibrant rice decorations',
          'Parades and street floats',
          'Cultural food exhibits',
          'Gratitude for good harvests'
        ],
        bestTime: 'May',
        category: 'festivals',
        rating: 3,
        ratingLabel: 'Known',
        discoveryLevel: 'Cultural Favorite'
      },
      {
        id: 'sandugo',
        name: 'Sandugo Festival',
        region: 'Bohol',
        lat: 9.6550,
        lng: 123.8530,
        image: '/assets/images/sandugo.jpg',
        description: 'A festival commemorating the blood compact of friendship between Datu Sikatuna and Miguel López de Legazpi.',
        highlights: [
          'Historical reenactments',
          'Street dancing and parades',
          'Trade fairs and cultural shows',
          'Theme of unity and peace'
        ],
        bestTime: 'July',
        category: 'festivals',
        rating: 1,
        ratingLabel: 'Hidden Gem',
        discoveryLevel: 'Undiscovered Treasure'
      }
    ],
    beaches: [
      {
        id: 'whitebeach',
        name: 'White Beach',
        region: 'Boracay, Aklan',
        lat: 11.9675,
        lng: 121.9245,
        image: '/assets/images/whitebeach.jpg',
        description: 'Boracay’s iconic 4-kilometer stretch of white sand and clear waters, famous worldwide.',
        highlights: [
          'Stunning sunsets',
          'Water sports activities',
          'Beachfront nightlife',
          'Top-rated luxury resorts'
        ],
        bestTime: 'November to May',
        category: 'beaches',
        rating: 5,
        ratingLabel: 'Most Visited',
        discoveryLevel: 'Top Destination'
      },
      {
        id: 'nacpan',
        name: 'Nacpan Beach',
        region: 'El Nido, Palawan',
        lat: 11.2402,
        lng: 119.3774,
        image: '/assets/images/nacpan.jpg',
        description: 'A peaceful 4-km stretch of golden sand and clear water, less crowded than other beaches.',
        highlights: [
          'Twin beach view',
          'Calm swimming waters',
          'Relaxed atmosphere',
          'Beach cafés and huts'
        ],
        bestTime: 'December to May',
        category: 'beaches',
        rating: 4,
        ratingLabel: 'Well-Known',
        discoveryLevel: 'Popular Spot'
      },
      {
        id: 'alonabeach',
        name: 'Alona Beach',
        region: 'Panglao, Bohol',
        lat: 9.5589,
        lng: 123.7731,
        image: '/assets/images/alonabeach.jpg',
        description: 'A vibrant beach known for diving, snorkeling, and dolphin-watching trips.',
        highlights: [
          'Coral reef snorkeling',
          'Beachfront restaurants',
          'Diving and island tours',
          'Lively nightlife'
        ],
        bestTime: 'November to April',
        category: 'beaches',
        rating: 3,
        ratingLabel: 'Known',
        discoveryLevel: 'Cultural Favorite'
      },
      {
        id: 'longbeach',
        name: 'Long Beach',
        region: 'San Vicente, Palawan',
        lat: 10.5268,
        lng: 119.2731,
        image: '/assets/images/longbeach.jpg',
        description: 'The longest white sand beach in the Philippines, still quiet and largely undeveloped.',
        highlights: [
          '14 km stretch of sand',
          'Untouched natural scenery',
          'Ideal for solitude and relaxation',
          'Sustainable tourism site'
        ],
        bestTime: 'November to May',
        category: 'beaches',
        rating: 1,
        ratingLabel: 'Hidden Gem',
        discoveryLevel: 'Undiscovered Treasure'
      }
    ],
    mountains: [
      {
        id: 'mayonvolcano',
        name: 'Mayon Volcano',
        region: 'Albay',
        lat: 13.2576,
        lng: 123.6856,
        image: '/assets/images/mayon.jpg',
        description: 'Famous for its near-perfect cone shape, Mayon Volcano is one of the most iconic landmarks in the Philippines.',
        highlights: [
          'Perfect cone symmetry',
          'Cagsawa Ruins viewpoint',
          'ATV adventure trails',
          'Sunrise and sunset photography spots'
        ],
        bestTime: 'March to May',
        category: 'mountains',
        rating: 5,
        ratingLabel: 'Most Visited',
        discoveryLevel: 'Top Destination'
      },
      {
        id: 'mountpulag',
        name: 'Mount Pulag',
        region: 'Benguet',
        lat: 16.5830,
        lng: 120.8833,
        image: '/assets/images/mountpulag.jpg',
        description: 'The third-highest mountain in the Philippines, known for its sea of clouds and diverse ecosystem.',
        highlights: [
          'Sea of clouds at sunrise',
          'Home to endemic species',
          'UNESCO-listed National Park',
          'Popular among trekkers and campers'
        ],
        bestTime: 'December to March',
        category: 'mountains',
        rating: 4,
        ratingLabel: 'Well-Known',
        discoveryLevel: 'Popular Spot'
      },
      {
        id: 'mountapo',
        name: 'Mount Apo',
        region: 'Davao',
        lat: 6.9874,
        lng: 125.2706,
        image: '/assets/images/mountapo.jpg',
        description: 'The highest mountain in the Philippines, offering challenging trails and breathtaking views.',
        highlights: [
          'Tallest peak at 2,954 meters',
          'Hot springs and lakes',
          'Rare Philippine Eagle sightings',
          'Challenging multi-day climbs'
        ],
        bestTime: 'March to May',
        category: 'mountains',
        rating: 3,
        ratingLabel: 'Known',
        discoveryLevel: 'Cultural Favorite'
      },
      {
        id: 'mountkitanglad',
        name: 'Mount Kitanglad Range',
        region: 'Bukidnon',
        lat: 8.2000,
        lng: 124.8000,
        image: '/assets/images/mountkitangladrange.jpg',
        description: 'A protected area with lush forests, rare wildlife, and sacred cultural significance to local tribes.',
        highlights: [
          'UNESCO Biosphere Reserve',
          'Ancestral home of the Bukidnon tribes',
          'Dense rainforest and cool climate',
          'Birdwatching and eco-trekking'
        ],
        bestTime: 'November to April',
        category: 'mountains',
        rating: 1,
        ratingLabel: 'Hidden Gem',
        discoveryLevel: 'Undiscovered Treasure'
      }
    ],
    heritage: [
      {
        id: 'viganheritage',
        name: 'Vigan Heritage Village',
        region: 'Ilocos Sur',
        lat: 17.5747,
        lng: 120.3869,
        image: '/assets/images/viganheritage.jpg',
        description: 'A UNESCO World Heritage Site, Vigan is known for its preserved Spanish colonial architecture and cobblestone streets.',
        highlights: [
          'Calle Crisologo cobblestone street',
          'Kalesa rides and ancestral houses',
          'Spanish-Filipino architecture',
          'UNESCO World Heritage status'
        ],
        bestTime: 'November to May',
        category: 'heritage-sites',
        rating: 5,
        ratingLabel: 'Most Visited',
        discoveryLevel: 'Top Destination'
      },
      {
        id: 'intramuros',
        name: 'Intramuros',
        region: 'Manila',
        lat: 14.5906,
        lng: 120.9747,
        image: '/assets/images/intramuros.jpg',
        description: 'Known as the “Walled City,” Intramuros is the historical heart of Manila, filled with Spanish-era landmarks.',
        highlights: [
          'Fort Santiago and Manila Cathedral',
          'Old walls and guard towers',
          'Cultural walking tours',
          'Rich colonial history'
        ],
        bestTime: 'Year-round',
        category: 'heritage-sites',
        rating: 4,
        ratingLabel: 'Well-Known',
        discoveryLevel: 'Popular Spot'
      },
      {
        id: 'tubbatahareef',
        name: 'Tubbataha Reefs Natural Park',
        region: 'Palawan',
        lat: 8.9543,
        lng: 119.8280,
        image: '/assets/images/tubbatahareef.jpg',
        description: 'A UNESCO World Heritage Site and marine sanctuary known for its stunning coral reefs and rich biodiversity.',
        highlights: [
          'World-class scuba diving',
          'Marine biodiversity hotspot',
          'Protected UNESCO site',
          'Accessible only by liveaboard boats'
        ],
        bestTime: 'March to June',
        category: 'heritage-sites',
        rating: 3,
        ratingLabel: 'Known',
        discoveryLevel: 'Cultural Favorite'
      },
      {
        id: 'miagaochurch',
        name: 'Miag-ao Church',
        region: 'Iloilo',
        lat: 10.6447,
        lng: 122.2358,
        image: '/assets/images/miagao.jpg',
        description: 'A UNESCO-listed Baroque church built in 1797, known for its ornate façade blending Spanish and local design elements.',
        highlights: [
          'Intricate stone carvings',
          'Baroque and local fusion architecture',
          'UNESCO World Heritage status',
          'Cultural and religious significance'
        ],
        bestTime: 'November to May',
        category: 'heritage-sites',
        rating: 1,
        ratingLabel: 'Hidden Gem',
        discoveryLevel: 'Undiscovered Treasure'
      }
    ]
  };

  const currentData = exploreData[selectedCategory] || [];

  const filteredData = currentData
    .filter(loc =>
      selectedDiscovery === 'All' ? true : loc.discoveryLevel === selectedDiscovery
    )
    .sort((a, b) => b.rating - a.rating);

  const isVisited = (locationId) => {
    return userProfile?.beenThere?.includes(locationId) || false;
  };

  const isWishlist = (locationId) => {
    return userProfile?.wantToGo?.includes(locationId) || false;
  };

  return (
    <div className="explore-section">
      {/* Header */}
      <div className="explore-header">
        <h2 className="explore-title">✨ Explore the Philippines</h2>
        <p className="explore-subtitle">
          Discover amazing destinations by category - from pristine islands to cultural festivals
        </p>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span className="category-icon">{cat.icon}</span>
            <span className="category-name">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Discovery Level Filter */}
      <div className="discovery-filter">
        <label htmlFor="discovery">Filter by Discovery Level:</label>
        <select
          id="discovery"
          value={selectedDiscovery}
          onChange={(e) => setSelectedDiscovery(e.target.value)}
        >
          {discoveryLevels.map(level => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>
      </div>

      {/* Cards Grid */}
      <div className="explore-cards-grid">
        {filteredData.map(location => (
          <div
            key={location.id}
            className={`explore-card ${isVisited(location.id) ? 'visited' : ''} ${isWishlist(location.id) ? 'wishlist' : ''}`}
            onClick={(e) => {
                      e.stopPropagation();
                      onLocationClick(location);
                    }}
          >

            <div className="card-image-wrapper">
              <img
                src={location.image}
                alt={location.name}
                className="card-image"
                onError={(e) => {
                  e.target.src = '/assets/images/philippines-placeholder.jpg';
                }}
              />
            </div>

            <div className="card-content">
              <div className="card-header-with-badges">
                <h3 className="card-title">{location.name}</h3>
                <div className="card-badge">
                  {isVisited(location.id) && <span className="badge visited-badge">✓ Visited</span>}
                  {isWishlist(location.id) && <span className="badge wishlist-badge">♡ Wishlist</span>}
                </div>
              </div>

              <p className="card-region">📍 {location.region}</p>
              <p className="card-description">{location.description}</p>

              <div className="card-highlights">
                <strong>Highlights:</strong>
                <ul>
                  {location.highlights.slice(0, 3).map((highlight, idx) => (
                    <li key={idx}>{highlight}</li>
                  ))}
                </ul>
              </div>

              {/* Rating / Discovery Label */}
              <div className="card-discovery-label">
                🌟 {location.ratingLabel} • {location.discoveryLevel}
              </div>

              <div className="card-footer">
                <span className="best-time">
                  <span className="time-icon">📅</span>
                  {location.bestTime}
                </span>
                <div className="card-actions">
                  <button
                    className="action-btn view-details-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLocationClick(location)
                    }}
                  >
                    View Details
                  </button>
                  <button
                    className="action-btn mark-been-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkLocation(location, 'been');
                    }}
                  >
                    ✓ Been
                  </button>
                  <button
                    className="action-btn mark-want-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkLocation(location, 'want');
                    }}
                  >
                    ★ Want
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExploreSection;
