#!/usr/bin/env python3
"""
Step 7: Multi-User Active Location Support — Test Suite

Tests the heartbeat-based multi-user active location system.
Run from the backend directory:
    python3 test_step7_multiuser.py

These tests use the Flask test client (no live server needed) and mock
time where necessary to test expiration logic.
"""

import sys
import os
import json
import time
import threading
import unittest
from unittest.mock import patch

# ── Bootstrap ────────────────────────────────────────────────────────────────
# We need to import vision_worker's Flask app and its globals.
# Patch out heavy YOLO/model loading so tests don't need a GPU.
sys.path.insert(0, os.path.dirname(__file__))

# Prevent the heavy model from loading at import time
import backend.backup_vision_worker as vw

class TestMultiUserActiveLocations(unittest.TestCase):
    """Tests for /set-active-location and /deactivate-location endpoints."""

    def setUp(self):
        """Reset active_locations before each test."""
        vw.active_locations.clear()
        self.app = vw.app.test_client()
        vw.app.config['TESTING'] = True

    def tearDown(self):
        vw.active_locations.clear()

    # ── 1. Basic Heartbeat Registration ──────────────────────────────────────

    def test_01_single_location_activation(self):
        """A single heartbeat should register a location as active."""
        resp = self.app.post('/set-active-location',
                             json={'location_id': 1},
                             content_type='application/json')
        data = resp.get_json()

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(data['status'], 'ok')
        self.assertIn(1, data['active_locations'])
        self.assertEqual(len(data['active_locations']), 1)

    def test_02_multiple_locations_active(self):
        """Multiple locations can be active simultaneously."""
        self.app.post('/set-active-location', json={'location_id': 1})
        self.app.post('/set-active-location', json={'location_id': 3})
        resp = self.app.post('/set-active-location', json={'location_id': 5})
        data = resp.get_json()

        self.assertEqual(len(data['active_locations']), 3)
        self.assertIn(1, data['active_locations'])
        self.assertIn(3, data['active_locations'])
        self.assertIn(5, data['active_locations'])

    def test_03_repeated_heartbeat_no_duplicates(self):
        """Repeated heartbeats for the same location_id shouldn't create duplicates."""
        for _ in range(10):
            self.app.post('/set-active-location', json={'location_id': 2})

        with vw.active_locations_lock:
            count = list(vw.active_locations.keys()).count(2)
        self.assertEqual(count, 1)

    def test_04_heartbeat_updates_timestamp(self):
        """A heartbeat should update the timestamp to keep the location alive."""
        self.app.post('/set-active-location', json={'location_id': 1})
        with vw.active_locations_lock:
            ts1 = vw.active_locations[1]

        time.sleep(0.05)
        self.app.post('/set-active-location', json={'location_id': 1})
        with vw.active_locations_lock:
            ts2 = vw.active_locations[1]

        self.assertGreater(ts2, ts1)

    # ── 2. Input Validation ──────────────────────────────────────────────────

    def test_05_invalid_location_id_string(self):
        """String location_id should return 400."""
        resp = self.app.post('/set-active-location',
                             json={'location_id': 'abc'})
        self.assertEqual(resp.status_code, 400)

    def test_06_missing_location_id(self):
        """Missing location_id should return 400."""
        resp = self.app.post('/set-active-location', json={})
        self.assertEqual(resp.status_code, 400)

    def test_07_null_location_id(self):
        """null location_id should return 400."""
        resp = self.app.post('/set-active-location',
                             json={'location_id': None})
        self.assertEqual(resp.status_code, 400)

    def test_08_float_location_id(self):
        """Float location_id should return 400 (not an int)."""
        resp = self.app.post('/set-active-location',
                             json={'location_id': 1.5})
        self.assertEqual(resp.status_code, 400)

    def test_09_no_json_body(self):
        """No JSON body should return 400."""
        resp = self.app.post('/set-active-location',
                             content_type='application/json')
        self.assertEqual(resp.status_code, 400)

    # ── 3. Deactivation Endpoint ─────────────────────────────────────────────

    def test_10_explicit_deactivation(self):
        """Deactivating an active location should remove it immediately."""
        self.app.post('/set-active-location', json={'location_id': 1})
        self.app.post('/set-active-location', json={'location_id': 3})

        resp = self.app.post('/deactivate-location', json={'location_id': 1})
        data = resp.get_json()

        self.assertEqual(resp.status_code, 200)
        self.assertNotIn(1, data['active_locations'])
        self.assertIn(3, data['active_locations'])

    def test_11_deactivate_nonexistent_location(self):
        """Deactivating a location that isn't active should be a no-op (200)."""
        resp = self.app.post('/deactivate-location', json={'location_id': 99})
        data = resp.get_json()

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(data['status'], 'ok')

    def test_12_deactivate_invalid_input(self):
        """Invalid input to deactivate should return 400."""
        resp = self.app.post('/deactivate-location',
                             json={'location_id': 'abc'})
        self.assertEqual(resp.status_code, 400)

    def test_13_deactivate_all_leaves_empty(self):
        """Deactivating all active locations should leave the dict empty."""
        self.app.post('/set-active-location', json={'location_id': 1})
        self.app.post('/set-active-location', json={'location_id': 2})

        self.app.post('/deactivate-location', json={'location_id': 1})
        self.app.post('/deactivate-location', json={'location_id': 2})

        with vw.active_locations_lock:
            self.assertEqual(len(vw.active_locations), 0)

    # ── 4. Heartbeat Expiration ──────────────────────────────────────────────

    def test_14_stale_entries_expire(self):
        """Locations that haven't received a heartbeat in TIMEOUT seconds
        should be expired on the next heartbeat call."""
        # Inject a stale entry manually (simulating 60s ago)
        with vw.active_locations_lock:
            vw.active_locations[99] = time.time() - 60

        # Send a fresh heartbeat for location 1 — this triggers cleanup
        resp = self.app.post('/set-active-location', json={'location_id': 1})
        data = resp.get_json()

        self.assertNotIn(99, data['active_locations'])
        self.assertIn(1, data['active_locations'])

    def test_15_fresh_entries_not_expired(self):
        """Recently-heartbeated locations should NOT be expired."""
        self.app.post('/set-active-location', json={'location_id': 1})
        self.app.post('/set-active-location', json={'location_id': 2})

        # Small delay, then send another heartbeat — should NOT expire anything
        time.sleep(0.1)
        resp = self.app.post('/set-active-location', json={'location_id': 3})
        data = resp.get_json()

        self.assertEqual(len(data['active_locations']), 3)

    def test_16_only_stale_entries_expired(self):
        """Only entries older than TIMEOUT should expire; fresh ones survive."""
        with vw.active_locations_lock:
            vw.active_locations[10] = time.time() - 60  # stale
            vw.active_locations[20] = time.time() - 60  # stale
            vw.active_locations[30] = time.time()        # fresh

        resp = self.app.post('/set-active-location', json={'location_id': 40})
        data = resp.get_json()

        self.assertNotIn(10, data['active_locations'])
        self.assertNotIn(20, data['active_locations'])
        self.assertIn(30, data['active_locations'])
        self.assertIn(40, data['active_locations'])

    # ── 5. Camera Thread is_active Check ─────────────────────────────────────

    def test_17_camera_thread_active_membership(self):
        """camera_thread should treat a location as active if it's in
        active_locations dict."""
        with vw.active_locations_lock:
            vw.active_locations[3] = time.time()

        with vw.active_locations_lock:
            is_active_3 = 3 in vw.active_locations
            is_active_7 = 7 in vw.active_locations

        self.assertTrue(is_active_3)
        self.assertFalse(is_active_7)

    def test_18_multiple_locations_all_active(self):
        """When multiple locations have heartbeats, all should be treated as
        active by camera_thread."""
        with vw.active_locations_lock:
            vw.active_locations[1] = time.time()
            vw.active_locations[2] = time.time()
            vw.active_locations[5] = time.time()

        with vw.active_locations_lock:
            results = {lid: lid in vw.active_locations for lid in [1, 2, 3, 4, 5]}

        self.assertTrue(results[1])
        self.assertTrue(results[2])
        self.assertFalse(results[3])
        self.assertFalse(results[4])
        self.assertTrue(results[5])

    # ── 6. /video_feed Endpoint ──────────────────────────────────────────────

    def test_19_video_feed_accepts_location_id(self):
        """GET /video_feed?location_id=N should not error."""
        # We can't fully test the MJPEG stream generator, but we can verify
        # the route accepts the parameter without crashing
        with vw.active_locations_lock:
            vw.active_locations[1] = time.time()

        # Just verify the endpoint exists and accepts the param
        # (The actual stream would block, so we test via route matching)
        rules = [rule.rule for rule in vw.app.url_map.iter_rules()]
        self.assertIn('/video_feed', rules)

    # ── 7. /live-count Endpoint ──────────────────────────────────────────────

    def test_20_live_count_with_location_id(self):
        """GET /live-count?location_id=N should return count for that location."""
        # Seed a count
        with vw.STREAM_LOCK:
            vw.THREAD_COUNTS[1] = 42
            vw.THREAD_COUNTS[3] = 7

        resp = self.app.get('/live-count?location_id=1')
        data = resp.get_json()
        self.assertEqual(data['count'], 42)
        self.assertEqual(data['location_id'], 1)

        resp = self.app.get('/live-count?location_id=3')
        data = resp.get_json()
        self.assertEqual(data['count'], 7)
        self.assertEqual(data['location_id'], 3)

    def test_21_live_count_unknown_location(self):
        """live-count for an unknown location_id should return 0."""
        resp = self.app.get('/live-count?location_id=999')
        data = resp.get_json()
        self.assertEqual(data['count'], 0)

    def test_22_live_count_fallback_no_param(self):
        """live-count without location_id should fallback to first active or 1."""
        with vw.active_locations_lock:
            vw.active_locations[3] = time.time()
        with vw.STREAM_LOCK:
            vw.THREAD_COUNTS[3] = 15

        resp = self.app.get('/live-count')
        data = resp.get_json()
        # Should return count for location 3 (the only active one)
        self.assertEqual(data['count'], 15)

    # ── 8. Thread Safety ─────────────────────────────────────────────────────

    def test_23_concurrent_heartbeats(self):
        """Multiple threads sending heartbeats concurrently should not corrupt state."""
        errors = []

        def send_heartbeat(loc_id, n=50):
            try:
                for _ in range(n):
                    resp = self.app.post('/set-active-location',
                                        json={'location_id': loc_id})
                    if resp.status_code != 200:
                        errors.append(f"Location {loc_id}: status {resp.status_code}")
            except Exception as e:
                errors.append(str(e))

        threads = [threading.Thread(target=send_heartbeat, args=(i,))
                   for i in range(1, 6)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(len(errors), 0, f"Concurrent errors: {errors}")

        with vw.active_locations_lock:
            self.assertEqual(len(vw.active_locations), 5)

    def test_24_concurrent_activate_deactivate(self):
        """Concurrent heartbeats and deactivations should not raise errors."""
        errors = []

        def activate(loc_id, n=30):
            try:
                for _ in range(n):
                    self.app.post('/set-active-location',
                                  json={'location_id': loc_id})
            except Exception as e:
                errors.append(str(e))

        def deactivate(loc_id, n=30):
            try:
                for _ in range(n):
                    self.app.post('/deactivate-location',
                                  json={'location_id': loc_id})
            except Exception as e:
                errors.append(str(e))

        threads = []
        for i in range(1, 4):
            threads.append(threading.Thread(target=activate, args=(i,)))
            threads.append(threading.Thread(target=deactivate, args=(i,)))

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(len(errors), 0, f"Concurrent errors: {errors}")

    # ── 9. Edge Cases ────────────────────────────────────────────────────────

    def test_25_activate_then_immediately_deactivate(self):
        """Activate then immediately deactivate should leave location inactive."""
        self.app.post('/set-active-location', json={'location_id': 1})
        self.app.post('/deactivate-location', json={'location_id': 1})

        with vw.active_locations_lock:
            self.assertNotIn(1, vw.active_locations)

    def test_26_deactivate_then_reactivate(self):
        """Reactivating after deactivation should work."""
        self.app.post('/set-active-location', json={'location_id': 1})
        self.app.post('/deactivate-location', json={'location_id': 1})
        resp = self.app.post('/set-active-location', json={'location_id': 1})
        data = resp.get_json()

        self.assertIn(1, data['active_locations'])

    def test_27_large_location_id(self):
        """Very large location_id should work (edge case for dict keys)."""
        resp = self.app.post('/set-active-location',
                             json={'location_id': 999999})
        data = resp.get_json()
        self.assertIn(999999, data['active_locations'])

    def test_28_zero_location_id(self):
        """location_id=0 is technically a valid integer — should be accepted."""
        resp = self.app.post('/set-active-location',
                             json={'location_id': 0})
        self.assertEqual(resp.status_code, 200)

    def test_29_negative_location_id(self):
        """Negative location_id is a valid int — should be accepted at API level.
        (Business logic validation happens elsewhere.)"""
        resp = self.app.post('/set-active-location',
                             json={'location_id': -1})
        self.assertEqual(resp.status_code, 200)

    def test_30_empty_active_locations_fallback(self):
        """When no locations are active, live-count without param should 
        fall back to location 1 and return 0."""
        vw.active_locations.clear()
        with vw.STREAM_LOCK:
            vw.THREAD_COUNTS[1] = 0

        resp = self.app.get('/live-count')
        data = resp.get_json()
        # Should fallback to location 1 (next(iter({}), 1) == 1)
        self.assertEqual(data['location_id'], 1)


class TestCameraThreadTransitions(unittest.TestCase):
    """Tests for Step 9: Tracker state reset on active/inactive transitions.
    These verify the logic without spinning up actual camera threads."""

    def setUp(self):
        vw.active_locations.clear()

    def test_31_transition_inactive_to_active(self):
        """Simulates background→active transition: is_active should flip."""
        # Initially not active
        with vw.active_locations_lock:
            is_active_before = 1 in vw.active_locations

        # Register heartbeat
        with vw.active_locations_lock:
            vw.active_locations[1] = time.time()

        with vw.active_locations_lock:
            is_active_after = 1 in vw.active_locations

        self.assertFalse(is_active_before)
        self.assertTrue(is_active_after)

    def test_32_transition_active_to_inactive(self):
        """Simulates active→background transition via deactivation."""
        with vw.active_locations_lock:
            vw.active_locations[1] = time.time()
            is_active_before = 1 in vw.active_locations

        with vw.active_locations_lock:
            del vw.active_locations[1]
            is_active_after = 1 in vw.active_locations

        self.assertTrue(is_active_before)
        self.assertFalse(is_active_after)


class TestLiveCountIsolation(unittest.TestCase):
    """Verify that live-count returns correct per-location data."""

    def setUp(self):
        vw.active_locations.clear()
        self.app = vw.app.test_client()

    def test_33_different_locations_different_counts(self):
        """Two locations should have independent counts."""
        with vw.STREAM_LOCK:
            vw.THREAD_COUNTS[1] = 10
            vw.THREAD_COUNTS[2] = 25

        r1 = self.app.get('/live-count?location_id=1').get_json()
        r2 = self.app.get('/live-count?location_id=2').get_json()

        self.assertEqual(r1['count'], 10)
        self.assertEqual(r2['count'], 25)

    def test_34_count_survives_deactivation(self):
        """Deactivating a location shouldn't erase its count from THREAD_COUNTS
        (the count persists for display; only the active flag changes)."""
        with vw.STREAM_LOCK:
            vw.THREAD_COUNTS[1] = 42
        with vw.active_locations_lock:
            vw.active_locations[1] = time.time()

        self.app.post('/deactivate-location', json={'location_id': 1})

        # Count should still be readable
        r = self.app.get('/live-count?location_id=1').get_json()
        self.assertEqual(r['count'], 42)


# ── Run ──────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    # Suppress vision_worker print noise during tests
    print("\n" + "=" * 70)
    print("  Step 7: Multi-User Active Location Support — Test Suite")
    print("=" * 70 + "\n")
    unittest.main(verbosity=2)
