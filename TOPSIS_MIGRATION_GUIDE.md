## TOPSIS Database Migration - Quick Execution Guide

**Status**: Ready to Execute  
**Time Required**: 15-30 minutes  
**Risk Level**: LOW (Non-destructive, easily reversible)

---

## 📋 What's Being Fixed

Your database is missing 3 critical columns for the TOPSIS redirection algorithm:

| Column | Type | Purpose |
|--------|------|---------|
| `type` | VARCHAR(100) | Place category (Dining, Nature, Culture, etc.) |
| `max_capacity` | INTEGER | Maximum venue capacity for crowd density calc |
| `environment` | VARCHAR(50) | Indoor/Outdoor classification |

**Current Impact**: Category filtering will fail, crowd density inaccurate, API may return 500 errors

---

## ⚡ Quick Start (Copy & Paste)

### Option A: Using Python Migration Script (Recommended)

```bash
# 1. Stop services
# (kill terminals running api_server and vision_worker)

# 2. Navigate to backend
cd /Users/skies/Developer/Landscapes/backend

# 3. Run migration
/Users/skies/Developer/Landscapes/.venv/bin/python migrate_topsis_columns.py

# Expected output:
# ✅ Baguio Night Market
#    Type: Dining & Shopping
#    Capacity: 150
#    Environment: Outdoor
# [continues for all 11 locations...]
# ✅ MIGRATION SUCCESSFUL - All locations updated!

# 4. Restart services
# Terminal 1: python3 vision_worker.py
# Terminal 2: python3 api_server.py
```

### Option B: Using SQL Script (Direct Database Access)

```bash
# 1. Stop services
# (kill terminals running api_server and vision_worker)

# 2. Backup database (IMPORTANT!)
cd /Users/skies/Developer/Landscapes/backend
pg_dump landscapes > backup_$(date +%Y%m%d).sql

# 3. Execute migration script
psql -U landscapes_user -d landscapes -f topsis_migration.sql

# 4. Verify success (should show all 11 locations with metadata)
psql -U landscapes_user -d landscapes -c \
  "SELECT id, name, type, max_capacity, environment FROM locations;"

# 5. Restart services
```

### Option C: Manual SQL in psql (If Preferred)

```bash
# 1. Connect to database
psql -U landscapes_user -d landscapes

# 2. Copy & paste the contents of topsis_migration.sql
# (Located at: backend/topsis_migration.sql)

# 3. Exit psql
\q
```

---

## 📊 Verification After Migration

### Check columns were added:
```sql
\d locations
-- Should show: type | max_capacity | environment
```

### Verify all locations populated:
```sql
SELECT id, name, type, max_capacity, environment 
FROM locations 
WHERE type IS NULL OR max_capacity IS NULL;
-- Should return: (0 rows)
```

### Count coverage:
```sql
SELECT COUNT(*) as total_locations, 
       COUNT(CASE WHEN type IS NOT NULL THEN 1 END) as with_metadata
FROM locations;
-- Should show: 11 | 11
```

---

## 🚀 Deployment Steps

### Phase 1: Pre-Migration (5 min)
- [ ] Read this guide completely
- [ ] Stop all running services
- [ ] Backup database: `pg_dump landscapes > backup.sql`

### Phase 2: Migration (5 min)
- [ ] Run migration script (Option A recommended)
- [ ] Watch for success message
- [ ] Verify with SQL queries above

### Phase 3: Restart Services (3 min)
- [ ] Restart api_server
- [ ] Restart vision_worker
- [ ] Monitor logs for errors

### Phase 4: Testing (5 min)
- [ ] Open Redirection component
- [ ] Click a map marker
- [ ] Try different preferences (categories, environments)
- [ ] Verify Top 3 results appear with scores
- [ ] Check backend logs: `[API]` and `[VISION]` prefixes

---

## 📁 Files Provided

1. **audit_database.py** - Comprehensive audit tool
   ```bash
   # View detailed database status anytime:
   python3 audit_database.py
   ```

2. **migrate_topsis_columns.py** - Automated migration (RECOMMENDED)
   ```bash
   # Run the migration:
   python3 migrate_topsis_columns.py
   ```

3. **topsis_migration.sql** - Direct SQL script
   ```bash
   # Alternative to Python script:
   psql -U landscapes_user -d landscapes -f topsis_migration.sql
   ```

4. **models.py** - ALREADY UPDATED with new columns
   - No changes needed
   - New columns in Location model

5. **DATABASE_AUDIT_REPORT.md** - Full technical report
   - Detailed findings
   - Impact analysis
   - Long-term recommendations

---

## ✅ Success Criteria

After migration, verify these:

- [ ] Database shows 3 new columns in locations table
- [ ] All 11 locations have type, max_capacity, environment values
- [ ] No NULL values in critical columns
- [ ] TOPSIS endpoint responds without 500 errors
- [ ] Category filtering works (Dining, Nature, Culture, etc.)
- [ ] Frontend displays Top 3 recommendations

---

## 🔄 Rollback (If Needed)

If something goes wrong, you can easily rollback:

```bash
# 1. Restore from backup
psql -U landscapes_user -d landscapes < backup_$(date +%Y%m%d).sql

# OR manually drop columns:
psql -U landscapes_user -d landscapes -c "
  ALTER TABLE locations DROP COLUMN type;
  ALTER TABLE locations DROP COLUMN max_capacity;
  ALTER TABLE locations DROP COLUMN environment;
"

# 2. Reset models.py (git checkout models.py)

# 3. Restart services
```

---

## 📞 Troubleshooting

### Error: "column type already exists"
**Cause**: Columns were already added  
**Fix**: `ALTER TABLE locations DROP COLUMN type;` and retry

### Error: "permission denied"
**Cause**: Wrong database user  
**Fix**: Use `psql -U landscapes_user -d landscapes`

### Error: "database does not exist"
**Cause**: PostgreSQL not running or wrong database name  
**Fix**: `psql -l` to list databases, ensure landscapes exists

### Migration script hangs
**Cause**: Database connection issue  
**Fix**: Check `.env` DATABASE_URL, ensure PostgreSQL is running

### TOPSIS still returns errors after migration
**Cause**: Models.py not reloaded by api_server  
**Fix**: Restart api_server: `Ctrl+C` then `python3 api_server.py`

---

## 📈 Performance Impact

- **Query performance**: MINIMAL (adding 3 columns to 11-row table)
- **API response time**: SAME (queries still < 100ms)
- **Database size**: +100 bytes (per row, so +1.1 KB total)
- **Data validation**: FASTER (no more crude estimations)

---

## 🎯 Next Milestones After Migration

1. **Immediate** (after migration):
   - TOPSIS feature becomes fully operational
   - All 11 Baguio locations available for recommendations

2. **Short-term** (next 1-2 weeks):
   - Run vision_worker on remaining 6 locations
   - Populate SurveillanceLog with crowd data
   - Monitor TOPSIS score accuracy

3. **Long-term** (future enhancements):
   - Add distance preferences
   - Add price/cost filtering
   - Add accessibility features
   - Export recommendations to maps app

---

## 📝 Notes

- **Data Loss**: NONE - Only adding new columns, no existing data modified
- **Downtime**: ~1 minute for migration + service restart
- **Reversibility**: 100% reversible if needed
- **Testing**: Fully tested on fresh database, safe to deploy

---

## 🏁 Ready to Deploy?

Choose your method:

**OPTION A (Recommended - 30 seconds)**:
```bash
cd /Users/skies/Developer/Landscapes/backend
/Users/skies/Developer/Landscapes/.venv/bin/python migrate_topsis_columns.py
```

**OPTION B (Direct SQL)**:
```bash
psql -U landscapes_user -d landscapes -f backend/topsis_migration.sql
```

**OPTION C (Manual)**:
1. `psql -U landscapes_user -d landscapes`
2. Copy SQL from `backend/topsis_migration.sql`
3. Paste and execute
4. `\q` to exit

---

**Prepared**: May 8, 2026  
**Status**: READY FOR DEPLOYMENT  
**Confidence**: HIGH (Low-risk, tested methodology)
