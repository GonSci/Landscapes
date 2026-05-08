#!/usr/bin/env python3
"""
Enhanced TOPSIS Redirection Logic - Test Suite for Baguio Smart Tourism
=========================================================================
This script tests the TOPSIS (Technique for Order Preference by Similarity to Ideal Solution)
algorithm to rank alternative locations for smart crowd-aware redirection.

Data flows from PostgreSQL → Mock Criteria → Distance Calculation (Haversine) → 
TOPSIS Ranking → Formatted Output Table

Every calculation step is commented for paper documentation.
"""

import psycopg2
import math
import os
from dotenv import load_dotenv
from typing import List, Dict, Tuple
import sys

# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION & CONSTANTS
# ══════════════════════════════════════════════════════════════════════════════

# Load environment variables
load_dotenv()

# Database connection parameters
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PORT = os.environ.get('DB_PORT', '5432')
DB_NAME = os.environ.get('DB_NAME', 'landscapes')
DB_USER = os.environ.get('DB_USER', 'landscapes_user')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'landscapes_pass123')

# TOPSIS Configuration
# Starting point for redirection analysis (simulating overcrowded primary location)
START_LOCATION_NAME = "Burnham Park"

# Baguio-specific terrain multiplier (mountainous area adds travel time)
# Walking on flat ground: 5km/h; on hills: 1.4x slower effective speed
TERRAIN_MULTIPLIER = 1.4

# Walking speed assumption for baseline calculation (km/h)
WALKING_SPEED_KMH = 5.0

# TOPSIS weights (50/50 balance between time efficiency and crowd comfort)
WEIGHT_TIME = 0.5
WEIGHT_DENSITY = 0.5

# Mock data assignment (since DB doesn't have capacity columns yet)
# Using real Baguio location characteristics as reference
MOCK_LOCATION_DATA = {
    # Structure: "Location Name": {"capacity": int, "people_count": int}
    "Baguio Cathedral": {"capacity": 150, "people_count": 130},  # Overcrowded (starting point)
    "Baguio Night Market": {"capacity": 200, "people_count": 85},  # Light
    "Melvin Jones Burnham Park": {"capacity": 300, "people_count": 150},  # Moderate
    "The Mansion": {"capacity": 100, "people_count": 28},  # Very light
    "The Mansion Entrance": {"capacity": 80, "people_count": 40},  # Moderate
    "Mt. Cloud Bookshop": {"capacity": 80, "people_count": 32},  # Light
    "Ili-Likha Arts & Village": {"capacity": 120, "people_count": 45},  # Light
    "Cafe by the Ruins": {"capacity": 60, "people_count": 28},  # Light
    "Gypsy Baguio by Chef Waya": {"capacity": 70, "people_count": 35},  # Moderate
    "Baguio Orchidarium": {"capacity": 100, "people_count": 18},  # Very light
    "Heritage Hill": {"capacity": 150, "people_count": 24},  # Very light
}

# ══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def connect_to_db():
    """
    Establish PostgreSQL connection using credentials from environment.
    Returns connection object or exits with error.
    """
    try:
        # Attempt to connect to the PostgreSQL database
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        print(f"✓ Connected to PostgreSQL: {DB_NAME}@{DB_HOST}")
        return conn
    except psycopg2.Error as e:
        # Print error and exit if connection fails
        print(f"✗ Database connection failed: {e}")
        sys.exit(1)

def fetch_active_locations(conn) -> List[Dict]:
    """
    Query PostgreSQL for all locations with their coordinates.
    (Fetches both active and inactive locations for testing purposes)
    
    Returns:
        List of dictionaries with keys: ['id', 'name', 'latitude', 'longitude']
    """
    try:
        # Create cursor to execute SQL queries
        cursor = conn.cursor()
        
        # SQL query to retrieve ALL locations (active and inactive)
        # Removed WHERE clause to get all available locations for testing
        query = """
            SELECT id, name, latitude, longitude 
            FROM locations 
            ORDER BY name ASC;
        """
        
        # Execute query on the database
        cursor.execute(query)
        
        # Fetch all results from the query
        rows = cursor.fetchall()
        
        # Close cursor to free resources
        cursor.close()
        
        # Transform raw database rows into list of dictionaries
        locations = [
            {
                "id": row[0],
                "name": row[1],
                "latitude": row[2],
                "longitude": row[3]
            }
            for row in rows
        ]
        
        return locations
    except psycopg2.Error as e:
        # Print error if query fails
        print(f"✗ Query error: {e}")
        return []

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate great-circle distance between two geographic points using Haversine formula.
    
    This formula accounts for Earth's spherical shape and is ideal for short distances
    like within Baguio City (avoiding flat-earth approximation errors).
    
    Args:
        lat1, lon1: Starting point latitude and longitude (degrees)
        lat2, lon2: Ending point latitude and longitude (degrees)
    
    Returns:
        Distance in kilometers
    """
    # Earth's mean radius in kilometers
    R_KM = 6371.0
    
    # Convert latitude and longitude from degrees to radians
    # Radians = degrees * (π / 180)
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    # Calculate differences (Δ) between coordinates
    # These represent angular distances between points
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    # Haversine formula component (a):
    # Calculates the angular distance between two points on a sphere
    # sin²(Δlat/2) handles latitude difference
    # sin²(Δlon/2) * cos(lat1) * cos(lat2) handles longitude difference (corrected for latitude)
    a = (
        math.sin(dlat / 2) ** 2 +
        math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    )
    
    # Haversine formula component (c):
    # Uses 2 * atan2 to convert angular distance back to linear distance
    # atan2 is more numerically stable than asin for this calculation
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    # Final distance = Earth radius × angular distance (in radians)
    distance_km = R_KM * c
    
    return distance_km

def calculate_travel_time(distance_km: float, terrain_multiplier: float = TERRAIN_MULTIPLIER) -> float:
    """
    Convert distance to travel time using terrain-adjusted walking speed.
    
    Baguio City is mountainous; simple flat-ground speed doesn't apply.
    We adjust walking speed downward by applying a multiplier to time.
    
    Formula:
        Effective Speed = Base Speed / Terrain Multiplier
        Travel Time = Distance / Effective Speed
        Travel Time = (Distance / Base Speed) * Terrain Multiplier
    
    Args:
        distance_km: Distance in kilometers
        terrain_multiplier: Factor to account for steep terrain (1.4x for Baguio)
    
    Returns:
        Estimated travel time in minutes
    """
    # Calculate time without terrain adjustment
    # Time = Distance / Speed, in hours
    time_hours_flat = distance_km / WALKING_SPEED_KMH
    
    # Apply terrain multiplier to account for hills, narrow roads, altitude
    # Multiplier increases the effective time (slower walking on rough terrain)
    time_hours_adjusted = time_hours_flat * terrain_multiplier
    
    # Convert hours to minutes (multiply by 60)
    time_minutes = time_hours_adjusted * 60
    
    return time_minutes

def prepare_decision_matrix(locations: List[Dict], start_location: Dict) -> Tuple[List[Dict], List[List[float]]]:
    """
    Build the TOPSIS decision matrix with normalized criteria for each location.
    
    Criteria:
        1. Travel Time (minutes) — LOWER is better
        2. Crowd Density % (people/capacity) — LOWER is better
    
    Args:
        locations: List of location dictionaries with id, name, lat, lon
        start_location: Dictionary of the starting/overcrowded location
    
    Returns:
        Tuple of:
        - Locations list with calculated metrics
        - Raw decision matrix (list of [time, density] for each location)
    """
    # Initialize list to store enriched location data with calculated metrics
    enriched_locations = []
    
    # Initialize matrix to store decision criteria for TOPSIS
    decision_matrix = []
    
    # Iterate through each potential redirection target location
    for location in locations:
        # Extract coordinates from location dictionary
        target_lat = location["latitude"]
        target_lon = location["longitude"]
        
        # Calculate straight-line distance between start and target using Haversine
        distance_km = haversine_distance(
            start_location["latitude"],
            start_location["longitude"],
            target_lat,
            target_lon
        )
        
        # Convert distance to walking time with terrain adjustment
        travel_time_minutes = calculate_travel_time(distance_km)
        
        # Retrieve mock capacity and people count from MOCK_LOCATION_DATA
        # Falls back to defaults if location not in mock data
        mock_data = MOCK_LOCATION_DATA.get(location["name"], {"capacity": 100, "people_count": 50})
        capacity = mock_data["capacity"]
        people_count = mock_data["people_count"]
        
        # Calculate crowd density as percentage
        # Density % = (people_count / capacity) * 100
        crowd_density_percent = (people_count / capacity) * 100
        
        # Store enriched location data for output table
        enriched_locations.append({
            "id": location["id"],
            "name": location["name"],
            "latitude": target_lat,
            "longitude": target_lon,
            "distance_km": distance_km,
            "travel_time_minutes": travel_time_minutes,
            "capacity": capacity,
            "people_count": people_count,
            "crowd_density_percent": crowd_density_percent
        })
        
        # Add this location's criteria to decision matrix
        # Row format: [Travel Time (minutes), Crowd Density (%)]
        decision_matrix.append([travel_time_minutes, crowd_density_percent])
    
    return enriched_locations, decision_matrix

def normalize_matrix(matrix: List[List[float]]) -> List[List[float]]:
    """
    Normalize decision matrix using Vector Normalization (Euclidean Norm).
    
    This scaling method converts raw criteria values to comparable 0-1 range.
    
    Formula:
        Normalized value = Original value / sqrt(sum of squares of column)
    
    This ensures that different criteria (time in minutes, density in %) can be
    fairly compared on the same scale.
    
    Args:
        matrix: Raw decision matrix with shape [n_alternatives × n_criteria]
    
    Returns:
        Normalized matrix with same shape, values scaled to 0-1 range
    """
    # Get number of criteria (columns) in the matrix
    n_criteria = len(matrix[0])
    
    # Get number of alternatives (rows) in the matrix
    n_alternatives = len(matrix)
    
    # Initialize normalized matrix
    normalized_matrix = []
    
    # Process each criterion (column) to normalize it
    for criterion_idx in range(n_criteria):
        # Extract all values for this criterion from all alternatives
        column_values = [matrix[alt_idx][criterion_idx] for alt_idx in range(n_alternatives)]
        
        # Calculate sum of squares for this criterion
        # This is the Euclidean norm denominator
        sum_of_squares = sum(value ** 2 for value in column_values)
        
        # Calculate the Euclidean norm (denominator)
        euclidean_norm = math.sqrt(sum_of_squares)
        
        # Normalize each value in this criterion by dividing by Euclidean norm
        # Store normalized values back into matrix structure
        for alt_idx in range(n_alternatives):
            # On first criterion, initialize the row in normalized matrix
            if criterion_idx == 0:
                normalized_matrix.append([])
            
            # Normalize value: original / euclidean_norm
            # Result is between 0 and 1 for all values
            normalized_value = matrix[alt_idx][criterion_idx] / euclidean_norm
            normalized_matrix[alt_idx].append(normalized_value)
    
    return normalized_matrix

def calculate_weighted_matrix(normalized_matrix: List[List[float]], weights: List[float]) -> List[List[float]]:
    """
    Apply TOPSIS weights to normalized matrix.
    
    Weights represent the importance of each criterion:
        - Weight for Time: 0.5 (50% importance)
        - Weight for Density: 0.5 (50% importance)
    
    Formula:
        Weighted Normalized Value = Normalized Value × Weight
    
    Args:
        normalized_matrix: Normalized decision matrix
        weights: List of weights for each criterion [weight_time, weight_density]
    
    Returns:
        Weighted normalized matrix with same shape
    """
    # Initialize weighted matrix
    weighted_matrix = []
    
    # Iterate through each alternative (row)
    for alt_idx, row in enumerate(normalized_matrix):
        # Initialize row for this alternative
        weighted_row = []
        
        # Iterate through each criterion (column)
        for criterion_idx, normalized_value in enumerate(row):
            # Get weight for this criterion
            weight = weights[criterion_idx]
            
            # Multiply normalized value by its weight
            weighted_value = normalized_value * weight
            
            # Append weighted value to this row
            weighted_row.append(weighted_value)
        
        # Add completed row to weighted matrix
        weighted_matrix.append(weighted_row)
    
    return weighted_matrix

def calculate_ideal_and_anti_ideal(weighted_matrix: List[List[float]]) -> Tuple[List[float], List[float]]:
    """
    Identify ideal solution (A+) and anti-ideal solution (A-).
    
    For this problem:
        - IDEAL (A+) = [min(travel_time), min(density)] — minimize both
        - ANTI-IDEAL (A-) = [max(travel_time), max(density)] — maximize both
    
    Args:
        weighted_matrix: Weighted normalized decision matrix
    
    Returns:
        Tuple of (ideal_solution, anti_ideal_solution) as lists
    """
    # Get number of criteria
    n_criteria = len(weighted_matrix[0])
    
    # Initialize ideal and anti-ideal solutions
    ideal_solution = []
    anti_ideal_solution = []
    
    # Process each criterion (column)
    for criterion_idx in range(n_criteria):
        # Extract all values for this criterion
        column_values = [weighted_matrix[alt_idx][criterion_idx] for alt_idx in range(len(weighted_matrix))]
        
        # Ideal solution = minimum value for this criterion
        # (We want to minimize both time and density)
        min_value = min(column_values)
        ideal_solution.append(min_value)
        
        # Anti-ideal solution = maximum value for this criterion
        # (Worst case scenario)
        max_value = max(column_values)
        anti_ideal_solution.append(max_value)
    
    return ideal_solution, anti_ideal_solution

def calculate_separation_measures(weighted_matrix: List[List[float]], 
                                   ideal: List[float], 
                                   anti_ideal: List[float]) -> Tuple[List[float], List[float]]:
    """
    Calculate separation distance of each alternative from ideal and anti-ideal solutions.
    
    Uses Euclidean distance in the criteria space.
    
    Formula:
        S+ = sqrt(sum((weighted_value - ideal_value)²))  — distance to ideal
        S- = sqrt(sum((weighted_value - anti_ideal_value)²))  — distance to anti-ideal
    
    Args:
        weighted_matrix: Weighted normalized decision matrix
        ideal: Ideal solution vector [A+]
        anti_ideal: Anti-ideal solution vector [A-]
    
    Returns:
        Tuple of (separation_to_ideal, separation_to_anti_ideal) as lists
    """
    # Initialize lists to store separation measures for each alternative
    separation_to_ideal = []
    separation_to_anti_ideal = []
    
    # Calculate separation for each alternative (row)
    for alt_idx, row in enumerate(weighted_matrix):
        # Initialize sum of squared differences for ideal separation
        sum_squared_diff_ideal = 0
        
        # Initialize sum of squared differences for anti-ideal separation
        sum_squared_diff_anti_ideal = 0
        
        # Calculate squared differences for each criterion
        for criterion_idx, value in enumerate(row):
            # Difference from ideal solution: (weighted_value - ideal_value)
            diff_from_ideal = value - ideal[criterion_idx]
            
            # Square this difference and add to sum
            sum_squared_diff_ideal += diff_from_ideal ** 2
            
            # Difference from anti-ideal solution: (weighted_value - anti_ideal_value)
            diff_from_anti_ideal = value - anti_ideal[criterion_idx]
            
            # Square this difference and add to sum
            sum_squared_diff_anti_ideal += diff_from_anti_ideal ** 2
        
        # Calculate Euclidean distance to ideal solution
        # S+ = sqrt(sum of squared differences)
        dist_to_ideal = math.sqrt(sum_squared_diff_ideal)
        separation_to_ideal.append(dist_to_ideal)
        
        # Calculate Euclidean distance to anti-ideal solution
        # S- = sqrt(sum of squared differences)
        dist_to_anti_ideal = math.sqrt(sum_squared_diff_anti_ideal)
        separation_to_anti_ideal.append(dist_to_anti_ideal)
    
    return separation_to_ideal, separation_to_anti_ideal

def calculate_topsis_scores(separation_to_ideal: List[float], 
                           separation_to_anti_ideal: List[float]) -> List[float]:
    """
    Calculate TOPSIS scores (Relative Closeness to Ideal Solution).
    
    Formula:
        C_i = S- / (S+ + S-)
    
    Where:
        - C_i ranges from 0 to 1
        - C_i = 1 means alternative is identical to ideal solution (best)
        - C_i = 0 means alternative is identical to anti-ideal solution (worst)
    
    Args:
        separation_to_ideal: Distance from each alternative to ideal solution [S+]
        separation_to_anti_ideal: Distance from each alternative to anti-ideal solution [S-]
    
    Returns:
        List of TOPSIS scores for each alternative
    """
    # Initialize list to store TOPSIS scores
    topsis_scores = []
    
    # Calculate score for each alternative
    for alt_idx in range(len(separation_to_ideal)):
        # Get separation measures for this alternative
        s_plus = separation_to_ideal[alt_idx]
        s_minus = separation_to_anti_ideal[alt_idx]
        
        # TOPSIS score = S- / (S+ + S-)
        # Numerator: distance to anti-ideal (how far from worst)
        # Denominator: total spread (S+ + S-)
        # Higher score = closer to ideal (better)
        denominator = s_plus + s_minus
        
        # Avoid division by zero
        if denominator == 0:
            # If alternative is identical to both ideal and anti-ideal (unlikely)
            # Assign score of 0.5 (neutral)
            topsis_score = 0.5
        else:
            # Calculate relative closeness
            topsis_score = s_minus / denominator
        
        # Append score to list
        topsis_scores.append(topsis_score)
    
    return topsis_scores

# ══════════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ══════════════════════════════════════════════════════════════════════════════

def main():
    """
    Main execution flow: retrieve data → apply TOPSIS → display results.
    """
    print("\n" + "="*100)
    print("ENHANCED TOPSIS REDIRECTION LOGIC - BAGUIO SMART TOURISM")
    print("="*100 + "\n")
    
    # Step 1: Connect to database
    print("[STEP 1] Connecting to PostgreSQL database...")
    conn = connect_to_db()
    
    # Step 2: Fetch active locations from database
    print("[STEP 2] Retrieving active locations from locations table...")
    locations = fetch_active_locations(conn)
    
    # Close database connection (no longer needed)
    conn.close()
    
    # Verify we retrieved locations
    if not locations:
        print("✗ No active locations found in database. Exiting.")
        sys.exit(1)
    
    print(f"✓ Retrieved {len(locations)} active location(s)")
    
    # Step 3: Identify starting location (simulated as overcrowded)
    print(f"\n[STEP 3] Identifying starting point: '{START_LOCATION_NAME}'...")
    
    # Find the starting location in the list
    start_location = None
    current_start_name = START_LOCATION_NAME
    
    for loc in locations:
        if loc["name"] == current_start_name:
            start_location = loc
            break
    
    # If starting location not found, use the first available location
    if not start_location:
        print(f"⚠ Starting location '{current_start_name}' not found in database.")
        print(f"   Available locations: {', '.join([loc['name'] for loc in locations])}")
        print(f"   Using first available location as starting point...\n")
        
        if locations:
            start_location = locations[0]
            current_start_name = start_location["name"]
            print(f"✓ Start point set to: {current_start_name} (Lat: {start_location['latitude']}, Lon: {start_location['longitude']})")
        else:
            print(f"✗ No locations found in database. Exiting.")
            sys.exit(1)
    else:
        print(f"✓ Start point set to: {current_start_name} (Lat: {start_location['latitude']}, Lon: {start_location['longitude']})")
    
    # Step 4: Prepare decision matrix with distance and crowd calculations
    print("\n[STEP 4] Preparing TOPSIS decision matrix...")
    print(f"   • Haversine distance calculation between all location pairs")
    print(f"   • Terrain multiplier: {TERRAIN_MULTIPLIER}x (mountainous Baguio terrain)")
    print(f"   • Walking speed: {WALKING_SPEED_KMH} km/h")
    
    enriched_locations, decision_matrix = prepare_decision_matrix(locations, start_location)
    
    print(f"✓ Decision matrix prepared: {len(enriched_locations)} alternatives × 2 criteria")
    
    # Step 5: Normalize the decision matrix
    print("\n[STEP 5] Normalizing decision matrix (Vector Normalization)...")
    print(f"   • Method: Euclidean norm for each criterion")
    normalized_matrix = normalize_matrix(decision_matrix)
    print(f"✓ Matrix normalized")
    
    # Step 6: Apply TOPSIS weights
    print("\n[STEP 6] Applying criteria weights...")
    weights = [WEIGHT_TIME, WEIGHT_DENSITY]
    print(f"   • Travel Time weight: {WEIGHT_TIME} (50%)")
    print(f"   • Crowd Density weight: {WEIGHT_DENSITY} (50%)")
    weighted_matrix = calculate_weighted_matrix(normalized_matrix, weights)
    print(f"✓ Weights applied")
    
    # Step 7: Calculate ideal and anti-ideal solutions
    print("\n[STEP 7] Calculating ideal and anti-ideal solutions...")
    ideal_solution, anti_ideal_solution = calculate_ideal_and_anti_ideal(weighted_matrix)
    print(f"   • Ideal solution (A+): [{ideal_solution[0]:.4f}, {ideal_solution[1]:.4f}]")
    print(f"   • Anti-ideal solution (A-): [{anti_ideal_solution[0]:.4f}, {anti_ideal_solution[1]:.4f}]")
    print(f"✓ Reference solutions identified")
    
    # Step 8: Calculate separation measures
    print("\n[STEP 8] Calculating separation measures (Euclidean distances)...")
    separation_to_ideal, separation_to_anti_ideal = calculate_separation_measures(
        weighted_matrix, ideal_solution, anti_ideal_solution
    )
    print(f"✓ Separation distances calculated")
    
    # Step 9: Calculate TOPSIS scores
    print("\n[STEP 9] Calculating TOPSIS scores (relative closeness)...")
    topsis_scores = calculate_topsis_scores(separation_to_ideal, separation_to_anti_ideal)
    print(f"✓ TOPSIS scores computed")
    
    # Step 10: Rank locations by TOPSIS score
    print("\n[STEP 10] Ranking locations by TOPSIS score...")
    
    # Create ranking data: combine locations with scores
    ranked_data = [
        {
            **enriched_locations[idx],
            "s_plus": separation_to_ideal[idx],
            "s_minus": separation_to_anti_ideal[idx],
            "topsis_score": topsis_scores[idx]
        }
        for idx in range(len(enriched_locations))
    ]
    
    # Sort by TOPSIS score in descending order (highest score = best)
    ranked_data.sort(key=lambda x: x["topsis_score"], reverse=True)
    
    # Assign ranks based on sorted order
    for rank, location_data in enumerate(ranked_data, 1):
        location_data["rank"] = rank
    
    print(f"✓ Locations ranked")
    
    # Step 11: Display results table
    print("\n" + "="*100)
    print("TOPSIS REDIRECTION RANKING RESULTS")
    print("="*100)
    print(f"Starting Point (Overcrowded): {current_start_name}")
    print(f"Analysis Date: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # Print table header
    print(f"{'Rank':<5} {'Location':<30} {'Distance':<12} {'Time':<10} {'Crowd %':<10} {'S+':<10} {'S-':<10} {'TOPSIS':<10}")
    print("-" * 100)
    
    # Print each ranked location
    for location_data in ranked_data:
        print(
            f"{location_data['rank']:<5} "
            f"{location_data['name']:<30} "
            f"{location_data['distance_km']:>10.2f} km "
            f"{location_data['travel_time_minutes']:>8.1f} min "
            f"{location_data['crowd_density_percent']:>8.1f}% "
            f"{location_data['s_plus']:>9.4f} "
            f"{location_data['s_minus']:>9.4f} "
            f"{location_data['topsis_score']:>9.4f}"
        )
    
    print("\n" + "="*100)
    print("LEGEND:")
    print("  Distance: Haversine distance from starting point")
    print("  Time: Estimated travel time (minutes) with 1.4x terrain multiplier")
    print("  Crowd %: People count / Capacity × 100")
    print("  S+: Separation distance to Ideal Solution (lower is better)")
    print("  S-: Separation distance to Anti-Ideal Solution (higher is better)")
    print("  TOPSIS: Relative closeness score (0.0 to 1.0, higher is better)")
    print("="*100 + "\n")
    
    # Step 12: Recommendation
    best_location = ranked_data[0]
    print(f"🎯 RECOMMENDED REDIRECTION TARGET: {best_location['name']}")
    print(f"   TOPSIS Score: {best_location['topsis_score']:.4f}")
    print(f"   Travel Time: {best_location['travel_time_minutes']:.1f} minutes from {current_start_name}")
    print(f"   Crowd Level: {best_location['crowd_density_percent']:.1f}% capacity")
    print()

if __name__ == "__main__":
    main()
