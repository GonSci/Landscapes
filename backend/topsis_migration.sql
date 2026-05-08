-- ============================================================================
-- Database Migration Script - TOPSIS Redirection Feature
-- ============================================================================
-- Purpose: Add critical columns to locations table for crowd-aware recommendations
-- Date: May 8, 2026
-- Status: Ready to execute
--
-- This script:
-- 1. Adds three missing columns (type, max_capacity, environment)
-- 2. Populates them with Baguio location metadata
-- 3. Validates the changes
--
-- ============================================================================

-- STEP 1: Add missing columns to locations table
-- ============================================================================

ALTER TABLE locations ADD COLUMN type VARCHAR(100);
ALTER TABLE locations ADD COLUMN max_capacity INTEGER DEFAULT 100;
ALTER TABLE locations ADD COLUMN environment VARCHAR(50);

-- Verification: Check columns were added
\d locations

-- STEP 2: Populate location metadata for Baguio locations
-- ============================================================================

-- Baguio Night Market
UPDATE locations SET 
    type = 'Dining & Shopping',
    max_capacity = 150,
    environment = 'Outdoor'
WHERE id = 1 AND name = 'Baguio Night Market';

-- The Mansion
UPDATE locations SET 
    type = 'Culture & History',
    max_capacity = 200,
    environment = 'Indoor'
WHERE id = 2 AND name = 'The Mansion';

-- The Mansion Entrance
UPDATE locations SET 
    type = 'Culture',
    max_capacity = 100,
    environment = 'Outdoor'
WHERE id = 3 AND name = 'The Mansion Entrance';

-- Baguio Cathedral
UPDATE locations SET 
    type = 'Culture & Religion',
    max_capacity = 500,
    environment = 'Indoor'
WHERE id = 4 AND name = 'Baguio Cathedral';

-- Melvin Jones Burnham Park
UPDATE locations SET 
    type = 'Nature & Recreation',
    max_capacity = 500,
    environment = 'Outdoor'
WHERE id = 5 AND name = 'Melvin Jones Burnham Park';

-- Mt. Cloud Bookshop
UPDATE locations SET 
    type = 'Dining & Culture',
    max_capacity = 80,
    environment = 'Indoor'
WHERE id = 11 AND name = 'Mt. Cloud Bookshop';

-- Ili-Likha Arts & Village
UPDATE locations SET 
    type = 'Arts & Culture',
    max_capacity = 120,
    environment = 'Indoor'
WHERE id = 12 AND name = 'Ili-Likha Arts & Village';

-- Cafe by the Ruins
UPDATE locations SET 
    type = 'Dining & Culture',
    max_capacity = 100,
    environment = 'Indoor'
WHERE id = 13 AND name = 'Cafe by the Ruins';

-- Gypsy Baguio by Chef Waya
UPDATE locations SET 
    type = 'Dining',
    max_capacity = 90,
    environment = 'Indoor'
WHERE id = 14 AND name = 'Gypsy Baguio by Chef Waya';

-- Baguio Orchidarium
UPDATE locations SET 
    type = 'Nature',
    max_capacity = 150,
    environment = 'Indoor'
WHERE id = 15 AND name = 'Baguio Orchidarium';

-- Heritage Hill
UPDATE locations SET 
    type = 'Nature & Recreation',
    max_capacity = 300,
    environment = 'Outdoor'
WHERE id = 16 AND name = 'Heritage Hill';

-- STEP 3: Verification queries
-- ============================================================================

-- Verify all locations have been updated
SELECT id, name, type, max_capacity, environment 
FROM locations 
ORDER BY id;

-- Count verification
SELECT 
    COUNT(*) as total_locations,
    COUNT(CASE WHEN type IS NOT NULL THEN 1 END) as with_type,
    COUNT(CASE WHEN max_capacity > 0 THEN 1 END) as with_capacity,
    COUNT(CASE WHEN environment IS NOT NULL THEN 1 END) as with_environment
FROM locations;

-- Check for any NULL values in critical columns
SELECT id, name, type, max_capacity, environment
FROM locations
WHERE type IS NULL OR max_capacity IS NULL OR environment IS NULL;

-- STEP 4: Data integrity checks
-- ============================================================================

-- Verify max_capacity values are reasonable (50-2000)
SELECT id, name, max_capacity
FROM locations
WHERE max_capacity < 50 OR max_capacity > 2000;

-- Verify environment values are valid (Indoor/Outdoor)
SELECT DISTINCT environment FROM locations WHERE environment IS NOT NULL;

-- Verify type/category values
SELECT DISTINCT type FROM locations WHERE type IS NOT NULL ORDER BY type;

-- STEP 5: TOPSIS-specific validation
-- ============================================================================

-- Check that all locations have what TOPSIS needs
SELECT 
    l.id,
    l.name,
    l.type,
    l.max_capacity,
    l.environment,
    COUNT(sl.id) as surveillance_log_count
FROM locations l
LEFT JOIN surveillance_logs sl ON l.id = sl.location_id
GROUP BY l.id
ORDER BY l.id;

-- Summary report
SELECT 
    'Locations' as entity,
    COUNT(*) as total,
    COUNT(CASE WHEN type IS NOT NULL THEN 1 END) as populated
FROM locations
UNION ALL
SELECT 
    'Surveillance Logs' as entity,
    COUNT(*) as total,
    COUNT(CASE WHEN confidence_avg IS NOT NULL THEN 1 END) as valid
FROM surveillance_logs;

-- ============================================================================
-- BACKUP AND NOTES
-- ============================================================================
--
-- Before running this script:
--   1. Create a backup: pg_dump landscapes > backup_$(date +%Y%m%d).sql
--   2. Stop all running services
--   3. Review the data in STEP 3 carefully
--
-- To run this script in production:
--   psql -U landscapes_user -d landscapes -f topsis_migration.sql
--
-- Rollback (if needed):
--   ALTER TABLE locations DROP COLUMN type;
--   ALTER TABLE locations DROP COLUMN max_capacity;
--   ALTER TABLE locations DROP COLUMN environment;
--
-- After successful migration:
--   1. Restart api_server and vision_worker
--   2. Test /api/redirection endpoint
--   3. Monitor logs for [API] and [VISION] prefixes
--
-- ============================================================================
