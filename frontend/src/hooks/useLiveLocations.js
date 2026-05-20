import { useState, useEffect, useCallback, useRef } from 'react';

// Hardcoded static assets and strict continuous mathematical ranges mapped by location_id
const STATIC_LOCATION_ASSETS = {
  1: { // Baguio Night Market
    name: "Baguio Night Market",
    image: "/assets/featured_images/baguio-night-market.jpg", // Fallback image if not found
    description: "Bustling night market along Harrison Road featuring local street food, thrift shopping (ukay-ukay), and souvenirs.",
    business: "Baguio Tourism",
    bestTime: "9:00 PM - 2:00 AM",
    capacity: 20, // For progress bar scaling relative to High
    distance: 0.5,
    facilities: ["Food Stalls", "Shopping", "Street Parking"],
    thresholds: {
      sparse: [0, 2],
      low: [3, 8],
      moderate: [9, 14],
      high: 15
    }
  },
  2: { // Wright Park
    name: "Wright Park",
    image: "/assets/featured_images/wright-park.jpg",
    description: "Beautiful nature park with scenic walking paths, towering pine trees, and perfect for outdoor recreation and peaceful sightseeing.",
    business: "Baguio Tourism",
    bestTime: "8:00 AM - 6:00 PM",
    capacity: 150,
    distance: 3.8,
    facilities: ["Walking Paths", "Photo Spots", "Nature Trails", "Parking"],
    thresholds: {
      sparse: [0, 15],
      low: [16, 50],
      moderate: [51, 100],
      high: 101
    }
  },
  3: { // The Mansion Entrance
    name: "The Mansion Entrance",
    image: "/assets/featured_images/the-mansion-entrance.jpg",
    description: "The grand entrance to The Mansion, a popular spot for photography and quick sightseeing.",
    business: "Philippine Gov",
    bestTime: "7:00 AM - 5:00 PM",
    capacity: 20,
    distance: 4.1,
    facilities: ["Photo Spots", "Street Parking"],
    thresholds: {
      sparse: [0, 2],
      low: [3, 7],
      moderate: [8, 13],
      high: 14
    }
  },
  4: { // Baguio Cathedral
    name: "Baguio Cathedral",
    image: "/assets/featured_images/baguio-cathedral.jpg",
    description: "Rose-tinted twin-spired Catholic cathedral offering a peaceful atmosphere and panoramic city views.",
    business: "Baguio Cathedral",
    bestTime: "6:00 AM - 7:00 PM",
    capacity: 20,
    distance: 1.5,
    facilities: ["Prayer Area", "Candle Lighting", "Souvenir Shop"],
    thresholds: {
      sparse: [0, 2],
      low: [3, 8],
      moderate: [9, 14],
      high: 15
    }
  },
  5: { // Melvin Jones Burnham Park
    name: "Melvin Jones Burnham Park",
    image: "/assets/featured_images/burnham-park.jpg",
    description: "The sprawling grandstand and football field within Burnham Park, a central hub for outdoor activities and events.",
    business: "Burnham Park Admin",
    bestTime: "6:00 AM - 6:00 PM",
    capacity: 80,
    distance: 2.1,
    facilities: ["Restrooms", "Food Stalls", "Parking", "Boat Rental"],
    thresholds: {
      sparse: [0, 12],
      low: [13, 39],
      moderate: [40, 65],
      high: 66
    }
  },
  6: { // Mt. Cloud Bookshop
    name: "Mt. Cloud Bookshop",
    image: "/assets/featured_images/mt-cloud-bookshop.jpg",
    description: "Charming bookstore perched on a mountainside offering rare books, cozy reading spaces, and panoramic views.",
    business: "Mt. Cloud",
    bestTime: "9:00 AM - 6:00 PM",
    capacity: 80,
    distance: 1.2,
    facilities: ["Bookstore", "Cafe", "Parking", "Reading Area"],
    thresholds: {
      sparse: [0, 8],
      low: [9, 24],
      moderate: [25, 40],
      high: 41
    }
  },
  7: { // Ili-Likha Arts & Village
    name: "Ili-Likha Arts & Village",
    image: "/assets/featured_images/ili-likha-art.jpg",
    description: "Artistic village showcasing local crafts, traditional art forms, and indigenous cultural heritage.",
    business: "Ili-Likha",
    bestTime: "10:00 AM - 5:00 PM",
    capacity: 120,
    distance: 0.6,
    facilities: ["Art Gallery", "Workshops", "Shop", "Parking"],
    thresholds: {
      sparse: [0, 12],
      low: [13, 36],
      moderate: [37, 60],
      high: 61
    }
  },
  8: { // Cafe by the Ruins
    name: "Cafe by the Ruins",
    image: "/assets/featured_images/cafe-by-the-ruins.jpg",
    description: "Charming cafe nestled among historic ruins offering artisanal coffee and traditional Cordillera cuisine.",
    business: "Cafe Ruins",
    bestTime: "8:00 AM - 7:00 PM",
    capacity: 60,
    distance: 0.3,
    facilities: ["Cafe", "WiFi", "Outdoor Seating", "Parking"],
    thresholds: {
      sparse: [0, 6],
      low: [7, 18],
      moderate: [19, 30],
      high: 31
    }
  },
  9: { // Gypsy Baguio by Chef Waya
    name: "Gypsy Baguio by Chef Waya",
    image: "/assets/featured_images/gypsy-baguio.jpg",
    description: "Fusion restaurant by celebrity chef combining Asian flavors with international cuisine in bohemian ambiance.",
    business: "Gypsy Baguio",
    bestTime: "11:00 AM - 10:00 PM",
    capacity: 70,
    distance: 0.8,
    facilities: ["Restaurant", "Bar", "WiFi", "Parking"],
    thresholds: {
      sparse: [0, 7],
      low: [8, 21],
      moderate: [22, 35],
      high: 36
    }
  },
  10: { // Baguio Orchidarium
    name: "Baguio Orchidarium",
    image: "/assets/featured_images/bagiuo-orchidarium.jpg",
    description: "Garden sanctuary featuring thousands of rare orchid species from around the world with guided tours available.",
    business: "Orchidarium",
    bestTime: "7:00 AM - 5:00 PM",
    capacity: 100,
    distance: 1.8,
    facilities: ["Gardens", "Guided Tours", "Plant Shop", "Parking"],
    thresholds: {
      sparse: [0, 10],
      low: [11, 30],
      moderate: [31, 50],
      high: 51
    }
  },
  11: { // Heritage Hill
    name: "Heritage Hill",
    image: "/assets/featured_images/heritage-hill.jpg",
    description: "Historical site featuring colonial-era buildings, museums, and scenic overlooks of the Baguio landscape.",
    business: "Heritage Hill",
    bestTime: "8:00 AM - 6:00 PM",
    capacity: 150,
    distance: 2.5,
    facilities: ["Museums", "Photo Spots", "Walking Paths", "Parking"],
    thresholds: {
      sparse: [0, 15],
      low: [16, 45],
      moderate: [46, 75],
      high: 76
    }
  }
};

const getCrowdLevel = (count, thresholds) => {
  if (!thresholds) return "Low"; // Fallback
  if (count <= thresholds.sparse[1]) return "Sparse";
  if (count <= thresholds.low[1]) return "Low";
  if (count <= thresholds.moderate[1]) return "Moderate";
  return "High";
};

const getCrowdPercent = (count, capacity) => {
  return Math.min(100, Math.max(0, (count / capacity) * 100));
};

export const useLiveLocations = () => {
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Ref to hold the latest locations to merge with live data
  const baseLocationsRef = useRef([]);

  // Fetch base locations on mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/locations');
        if (!response.ok) throw new Error('Failed to fetch base locations');
        const data = await response.json();
        
        // Build initial merged array with 0 people_count
        const initialMerged = data.map(dbLoc => {
          const staticData = STATIC_LOCATION_ASSETS[dbLoc.id] || {};
          return {
            id: dbLoc.id,
            name: dbLoc.name,
            lat: dbLoc.latitude,
            lng: dbLoc.longitude,
            category: "Place", // Default for UI tabs
            ...staticData,
            // Dynamic defaults
            detectedPeople: 0,
            crowdLevel: "Sparse",
            crowdPercent: 0
          };
        });

        baseLocationsRef.current = initialMerged;
        setLocations(initialMerged);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching locations:", err);
        setIsLoading(false);
        setIsStale(true);
      }
    };

    fetchLocations();
  }, []);

  // Polling logic
  useEffect(() => {
    const fetchLiveStatus = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/locations/live-status');
        if (!response.ok) throw new Error('Failed to fetch live status');
        
        const liveData = await response.json(); // Array of { location_id, people_count, timestamp }
        
        // Create a lookup map for O(1) access
        const liveMap = {};
        liveData.forEach(status => {
          liveMap[status.location_id] = status;
        });

        // Merge with existing state (retaining last known values if not in liveData)
        setLocations(prevLocations => {
          return prevLocations.map(loc => {
            const liveStatus = liveMap[loc.id];
            if (liveStatus) {
              const count = liveStatus.people_count;
              return {
                ...loc,
                detectedPeople: count,
                crowdLevel: getCrowdLevel(count, loc.thresholds),
                crowdPercent: getCrowdPercent(count, loc.capacity || 20)
              };
            }
            return loc; // Retain last known value
          });
        });

        setIsStale(false);
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Live status poll failed:", error);
        setIsStale(true);
        // We do NOT reset state to empty/null here, retaining last known values.
      }
    };

    // Initial poll after base data is loaded
    if (!isLoading && baseLocationsRef.current.length > 0) {
      fetchLiveStatus();
    }

    // Set up polling every 10 seconds
    const intervalId = setInterval(() => {
      if (!isLoading) {
        fetchLiveStatus();
      }
    }, 10000);

    // CRITICAL: Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [isLoading]);

  return {
    locations,
    isLoading,
    isStale,
    lastUpdated
  };
};
