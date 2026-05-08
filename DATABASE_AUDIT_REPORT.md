# Database Audit Report - TOPSIS Redirection Readiness

**Date**: May 8, 2026  
**Status**: ⚠️ REQUIRES MIGRATION - Missing Critical Columns  
**Severity**: HIGH - Redirection feature will not work properly without these fixes

---

## Executive Summary

The Landscapes database has been audited for TOPSIS (Technique for Order Preference by Similarity to Ideal Solution) redirection algorithm compatibility. The audit identified **3 critical missing columns** that are essential for the crowd-aware location recommendation system.

**Key Findings**:
- ✅ Database connection: **HEALTHY**
- ✅ Coordinate data quality: **VALID** (all 11 locations have correct lat/lng)
- ❌ Critical columns: **MISSING** (type, max_capacity, environment)
- ⚠️ SurveillanceLog coverage: **PARTIAL** (5/11 locations have logs)

---

## 1. Schema Inspection

### Locations Table - Current Structure

| Column | Data Type | Nullable | Default | Status |
|--------|-----------|----------|---------|--------|
| id | INTEGER | NO | Auto-increment | ✅ Present |
| name | VARCHAR(150) | NO | None | ✅ Present |
| district | VARCHAR(100) | NO | None | ✅ Present |
| latitude | DOUBLE PRECISION | NO | None | ✅ Present |
| longitude | DOUBLE PRECISION | NO | None | ✅ Present |
| video_filename | VARCHAR(255) | NO | None | ✅ Present |
| description | TEXT | YES | None | ✅ Present |
| is_active | BOOLEAN | YES | None | ✅ Present |
| **type** | - | - | - | ❌ **MISSING** |
| **max_capacity** | - | - | - | ❌ **MISSING** |
| **environment** | - | - | - | ❌ **MISSING** |

**Total Columns**: 8 (should be 11)

### SurveillanceLog Table - Current Structure

| Column | Data Type | Nullable | Default |
|--------|-----------|----------|---------|
| id | INTEGER | NO | Auto-increment |
| timestamp | TIMESTAMP | NO | Auto-generate |
| people_count | INTEGER | NO | None |
| location_name | VARCHAR(120) | NO | None |
| location_id | INTEGER | NO | FK to locations.id |
| confidence_avg | DOUBLE PRECISION | YES | None |

**Status**: ✅ Properly structured

---

## 2. Critical Columns Audit for TOPSIS

The TOPSIS algorithm requires location metadata for:

### ❌ Missing Column #1: `type` (VARCHAR)

**Purpose**: Place category classification  
**Required for**: Filtering locations by user preference (place_category parameter)  
**Current usage**: Frontend allows: Dining, Nature, Shopping, Culture, any  
**Database impact**: Without this, category filtering (`WHERE type LIKE 'Dining'`) will fail  
**Recommendation**: VARCHAR(100), allowing multi-category values like "Dining & Culture"

### ❌ Missing Column #2: `max_capacity` (INTEGER)

**Purpose**: Maximum venue capacity  
**Required for**: Crowd density calculation (`crowd_density % = (people_count / max_capacity) * 100`)  
**Current workaround**: Code defaults to `people_count * 2` (crude estimation)  
**Database impact**: Inaccurate crowd percentages leading to poor TOPSIS rankings  
**Recommendation**: INTEGER, default 100, range 50-1000 for Baguio venues

### ❌ Missing Column #3: `environment` (VARCHAR)

**Purpose**: Indoor/Outdoor classification  
**Required for**: Environment-based filtering (future feature)  
**Current usage**: Supported in API but not enforced  
**Database impact**: Filtering by environment will fail silently  
**Recommendation**: VARCHAR(50), values: "Indoor", "Outdoor", or NULL

---

## 3. Data Quality Analysis

### Coordinate Validation ✅

**Status**: ALL VALID

```
Total locations:      11
Null coordinates:     0  ✅
Invalid latitude:     0  ✅
Invalid longitude:    0  ✅
```

All latitude/longitude values are within valid geographic bounds:
- Latitude range: 16.4110° to 16.4151° (Baguio region)
- Longitude range: 120.5826° to 120.6130° (Baguio region)

**Haversine Distance Ready**: ✅ YES - Safe to calculate distances

### Location-SurveillanceLog Relationship ⚠️

**Status**: PARTIAL COVERAGE

```
Total locations:              11
Locations with video_filename: 11 (100%)
Locations with surveillance logs: 5 (45%)
Locations WITHOUT logs:       6 (55%)
```

**Orphaned Locations** (have video but no logs):

| ID | Location Name | Video File | Status |
|----|---------------|-----------|--------|
| 11 | Mt. Cloud Bookshop | mt_cloud_bookshop.mp4 | ⚠️ No logs |
| 12 | Ili-Likha Arts & Village | ili_likha_arts.mp4 | ⚠️ No logs |
| 13 | Cafe by the Ruins | cafe_ruins.mp4 | ⚠️ No logs |
| 14 | Gypsy Baguio by Chef Waya | gypsy_baguio.mp4 | ⚠️ No logs |
| 15 | Baguio Orchidarium | orchidarium.mp4 | ⚠️ No logs |
| 16 | Heritage Hill | heritage_hill.mp4 | ⚠️ No logs |

**Impact on TOPSIS**: Locations without logs will default to `crowd_density = 50%`, which is acceptable but not ideal.

**Recommendation**: Run vision_worker on additional videos or use default crowd estimates.

### SurveillanceLog Data Summary

```
Total logs:               52
Unique locations covered: 5
People count range:      13 - 19
Average count:           15.25
Missing confidence:       0  ✅
```

**Active Locations** (with surveillance data):
1. Baguio Night Market (covered by vision_worker)
2. The Mansion
3. The Mansion Entrance
4. Baguio Cathedral
5. Melvin Jones Burnham Park

---

## 4. Current Locations Inventory

All 11 Baguio locations in database:

| ID | Location | District | Coordinates | Video File | Active |
|----|----------|----------|-------------|-----------|--------|
| 1 | Baguio Night Market | Harrison Rd | 16.4150, 120.5960 | night_market.mp4 | ✓ |
| 2 | The Mansion | Leonard Wood | 16.4140, 120.6120 | mansion.mp4 | ✗ |
| 3 | The Mansion Entrance | Leonard Wood | 16.4140, 120.6130 | mansion_entrance.mp4 | ✗ |
| 4 | Baguio Cathedral | Session Rd | 16.4120, 120.5980 | cathedral.mp4 | ✗ |
| 5 | Melvin Jones Burnham Park | Burnham Park | 16.4110, 120.5940 | burnham.mp4 | ✗ |
| 11 | Mt. Cloud Bookshop | Asin Rd | 16.4151, 120.6085 | mt_cloud_bookshop.mp4 | ✗ |
| 12 | Ili-Likha Arts & Village | Chuntug Rd | 16.4139, 120.5974 | ili_likha_arts.mp4 | ✗ |
| 13 | Cafe by the Ruins | Chuntug Rd | 16.4130, 120.5916 | cafe_ruins.mp4 | ✗ |
| 14 | Gypsy Baguio by Chef Waya | Upper Gen. Luna | 16.4133, 120.5826 | gypsy_baguio.mp4 | ✗ |
| 15 | Baguio Orchidarium | Leonard Wood | 16.4110, 120.5924 | orchidarium.mp4 | ✗ |
| 16 | Heritage Hill | Bokawkan Rd | 16.4040, 120.5867 | heritage_hill.mp4 | ✗ |

---

## 5. Remediation Steps

### Step 1: Add Missing Columns to Database

Execute these SQL commands in psql:

```sql
ALTER TABLE locations ADD COLUMN type VARCHAR(100);
ALTER TABLE locations ADD COLUMN max_capacity INTEGER DEFAULT 100;
ALTER TABLE locations ADD COLUMN environment VARCHAR(50);
```

### Step 2: Update Models

The models.py file has been updated to include:

```python
class Location(db.Model):
    # ... existing columns ...
    
    # TOPSIS-required columns
    type           = db.Column(db.String(100), nullable=True)
    max_capacity   = db.Column(db.Integer, default=100)
    environment    = db.Column(db.String(50), nullable=True)
```

### Step 3: Populate Location Metadata

Use the provided migration script or manual SQL:

```sql
-- Baguio Night Market
UPDATE locations SET 
    type = 'Dining & Shopping',
    max_capacity = 150,
    environment = 'Outdoor'
WHERE id = 1;

-- The Mansion
UPDATE locations SET 
    type = 'Culture & History',
    max_capacity = 200,
    environment = 'Indoor'
WHERE id = 2;

-- The Mansion Entrance
UPDATE locations SET 
    type = 'Culture',
    max_capacity = 100,
    environment = 'Outdoor'
WHERE id = 3;

-- Baguio Cathedral
UPDATE locations SET 
    type = 'Culture & Religion',
    max_capacity = 500,
    environment = 'Indoor'
WHERE id = 4;

-- Melvin Jones Burnham Park
UPDATE locations SET 
    type = 'Nature & Recreation',
    max_capacity = 500,
    environment = 'Outdoor'
WHERE id = 5;

-- Mt. Cloud Bookshop
UPDATE locations SET 
    type = 'Dining & Culture',
    max_capacity = 80,
    environment = 'Indoor'
WHERE id = 11;

-- Ili-Likha Arts & Village
UPDATE locations SET 
    type = 'Arts & Culture',
    max_capacity = 120,
    environment = 'Indoor'
WHERE id = 12;

-- Cafe by the Ruins
UPDATE locations SET 
    type = 'Dining & Culture',
    max_capacity = 100,
    environment = 'Indoor'
WHERE id = 13;

-- Gypsy Baguio by Chef Waya
UPDATE locations SET 
    type = 'Dining',
    max_capacity = 90,
    environment = 'Indoor'
WHERE id = 14;

-- Baguio Orchidarium
UPDATE locations SET 
    type = 'Nature',
    max_capacity = 150,
    environment = 'Indoor'
WHERE id = 15;

-- Heritage Hill
UPDATE locations SET 
    type = 'Nature & Recreation',
    max_capacity = 300,
    environment = 'Outdoor'
WHERE id = 16;

-- Verify updates
SELECT id, name, type, max_capacity, environment FROM locations ORDER BY id;
```

---

## 6. Deployment Checklist

Use this checklist to ensure TOPSIS readiness:

### Phase 1: Database Migration
- [ ] Stop all running services (vision_worker, api_server)
- [ ] Backup database: `pg_dump landscapes > backup_$(date +%Y%m%d).sql`
- [ ] Execute ALTER TABLE commands to add missing columns
- [ ] Run migration script: `python3 migrate_topsis_columns.py`
- [ ] Verify updates: `SELECT id, name, type, max_capacity, environment FROM locations;`

### Phase 2: Restart Services
- [ ] Restart api_server with updated models
- [ ] Restart vision_worker for fresh logs
- [ ] Check logs for `[API]` and `[VISION]` prefixes

### Phase 3: Functional Testing
- [ ] Frontend: Navigate to Redirection component
- [ ] Test: Select a marker on map
- [ ] Test: Choose all preference combinations (categories, environments, times)
- [ ] Verify: Top 3 results displayed with scores
- [ ] Check: Backend logs show `[API] TOPSIS calculation completed`

### Phase 4: Validation
- [ ] Query database: `SELECT COUNT(*) FROM surveillance_logs;` (should grow)
- [ ] Monitor: Crowd density percentages are now accurate
- [ ] Test: Category filtering works correctly
- [ ] Performance: API response time < 1 second

---

## 7. Implementation Tools Provided

### audit_database.py
Comprehensive database audit script. Run to verify status at any time:
```bash
python3 audit_database.py
```

### migrate_topsis_columns.py
Automated migration script to add columns and populate metadata:
```bash
python3 migrate_topsis_columns.py
```

### models.py
Updated ORM models with new Location fields already defined.

---

## 8. Impact Analysis

### If Migration is NOT Applied

| Feature | Impact | Severity |
|---------|--------|----------|
| Category filtering | Silently fails | HIGH |
| Crowd density calculation | Uses crude estimation | MEDIUM |
| Environment filtering | Not available | MEDIUM |
| TOPSIS scores | Inaccurate | HIGH |
| Frontend errors | 500 errors on /api/redirection | CRITICAL |

### After Migration Complete

| Feature | Status | Benefit |
|---------|--------|---------|
| Category filtering | ✅ Works | Accurate filtering by type |
| Crowd density | ✅ Accurate | (people_count / max_capacity) * 100 |
| Environment filtering | ✅ Available | Indoor/Outdoor preferences |
| TOPSIS scores | ✅ Accurate | Better recommendations |
| API reliability | ✅ Stable | No 500 errors |

---

## 9. Next Steps

1. **Immediate** (Next 30 minutes):
   - [ ] Review this report
   - [ ] Backup database
   - [ ] Execute ALTER TABLE commands

2. **Short-term** (Next 1 hour):
   - [ ] Run migration script
   - [ ] Verify data in database
   - [ ] Restart backend services

3. **Testing** (Next 2 hours):
   - [ ] Test Redirection component
   - [ ] Verify all categories filter correctly
   - [ ] Monitor backend logs

4. **Production** (Next 4 hours):
   - [ ] Full integration testing
   - [ ] Performance benchmarking
   - [ ] Go live!

---

## 10. Quick Reference

### SQL Commands Summary

```bash
# 1. Connect to database
psql -U landscapes_user -d landscapes

# 2. Add missing columns
ALTER TABLE locations ADD COLUMN type VARCHAR(100);
ALTER TABLE locations ADD COLUMN max_capacity INTEGER DEFAULT 100;
ALTER TABLE locations ADD COLUMN environment VARCHAR(50);

# 3. Verify columns were added
\d locations

# 4. Run Python migration script
python3 migrate_topsis_columns.py

# 5. Verify data populated
SELECT id, name, type, max_capacity, environment FROM locations;

# 6. Exit psql
\q
```

---

## Report Summary

✅ **Database connectivity**: HEALTHY  
✅ **Coordinate data**: VALID  
✅ **SurveillanceLog table**: PROPER STRUCTURE  
❌ **Critical columns**: 3 MISSING  
⚠️ **Location coverage**: 5/11 with logs (45%)  

**Overall Status**: **REQUIRES MIGRATION** before TOPSIS feature deployment

**Estimated Migration Time**: 15-30 minutes  
**Risk Level**: LOW (non-destructive changes, easily reversible)  
**Rollback Plan**: Database backup available

---

**Report Generated**: May 8, 2026  
**Tools Used**: audit_database.py v1.0  
**Database Version**: PostgreSQL  
**Status**: ACTIONABLE - Ready for remediation
