import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Pencil, Trash2, X, MapPin, Video, Wifi, WifiOff, ArrowLeft, Shield, Save, AlertTriangle, Search, Filter } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:5001`;

// ── Helper: detect if a video source is "live" ──
const isLiveSource = (filename) => {
  if (!filename) return false;
  const f = filename.trim();
  return /^\d+$/.test(f) || f.startsWith('rtsp://') || f.startsWith('http://') || f.startsWith('https://');
};

// ── Delete Confirmation Modal ──
const DeleteModal = ({ location, onConfirm, onCancel }) => createPortal(
  <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/70 backdrop-blur-xl p-4" onClick={onCancel}>
    <div className="w-full max-w-md rounded-3xl bg-[#0d1226]/95 border border-red-500/20 p-8 shadow-[0_20px_60px_rgba(239,68,68,0.15)]" onClick={e => e.stopPropagation()}>
      <div className="flex flex-col items-center text-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
          <AlertTriangle size={28} className="text-red-400" />
        </div>
        <h3 className="text-xl font-black text-white">Delete Location</h3>
        <p className="text-sm text-slate-400 max-w-[300px]">
          Are you sure you want to delete <span className="text-white font-bold">"{location?.name}"</span>? This will also remove all associated surveillance logs. This action cannot be undone.
        </p>
        <div className="flex gap-3 mt-4 w-full">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-white/10 bg-white/5 text-sm font-bold text-slate-300 hover:bg-white/10 transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-sm font-bold text-red-400 hover:bg-red-500/30 transition-all">
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>,
  document.body
);

// ── Add/Edit Modal ──
const LocationFormModal = ({ location, onSave, onClose, saving }) => {
  const isEdit = !!location;
  const [form, setForm] = useState({
    name: '', district: '', latitude: '', longitude: '',
    video_filename: '', description: '', type: '',
    fov_area_m2: '', environment: '', is_active: false,
  });

  useEffect(() => {
    if (location) {
      setForm({
        name: location.name || '',
        district: location.district || '',
        latitude: location.latitude ?? '',
        longitude: location.longitude ?? '',
        video_filename: location.video_filename || '',
        description: location.description || '',
        type: location.type || '',
        fov_area_m2: location.fov_area_m2 ?? '',
        environment: location.environment || '',
        is_active: location.is_active || false,
      });
    }
  }, [location]);

  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      fov_area_m2: form.fov_area_m2 ? parseFloat(form.fov_area_m2) : null,
    });
  };

  const inputClass = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-all duration-300 focus:border-indigo-500/50 focus:bg-white/[0.08] focus:shadow-[0_0_15px_rgba(99,102,241,0.1)] placeholder:text-slate-600";
  const labelClass = "block text-[10px] font-black uppercase tracking-[2px] text-slate-500 mb-1.5 px-0.5";

  return createPortal(
    <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/70 backdrop-blur-xl p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-3xl bg-[#0d1226]/95 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] my-8" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-white/5">
          <button onClick={onClose} className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all border border-white/5">
            <X size={16} />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              {isEdit ? <Pencil size={18} className="text-indigo-400" /> : <Plus size={18} className="text-indigo-400" />}
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{isEdit ? 'Edit Location' : 'Add New Location'}</h3>
              <p className="text-[10px] font-bold uppercase tracking-[2px] text-slate-500">{isEdit ? 'Update location details' : 'Register a new monitoring point'}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Row 1: Name + District */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Location Name *</label>
              <input required value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="e.g. Baguio Night Market" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>District *</label>
              <input required value={form.district} onChange={e => handleChange('district', e.target.value)} placeholder="e.g. Harrison Rd" className={inputClass} />
            </div>
          </div>

          {/* Row 2: Lat + Lng */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Latitude *</label>
              <input required type="number" step="any" value={form.latitude} onChange={e => handleChange('latitude', e.target.value)} placeholder="e.g. 16.4126" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Longitude *</label>
              <input required type="number" step="any" value={form.longitude} onChange={e => handleChange('longitude', e.target.value)} placeholder="e.g. 120.5948" className={inputClass} />
            </div>
          </div>

          {/* Row 3: Video Source (most important field) */}
          <div>
            <label className={labelClass}>Video Source *</label>
            <input required value={form.video_filename} onChange={e => handleChange('video_filename', e.target.value)} placeholder='e.g. "0" (webcam), "rtsp://..." or "sample.mp4"' className={inputClass} />
            <p className="text-[10px] text-slate-600 mt-1.5 px-0.5">
              {isLiveSource(form.video_filename)
                ? <span className="text-emerald-400">⚡ Live source detected — will connect directly via OpenCV</span>
                : <span>Local file — will be resolved from frontend/public/assets/</span>
              }
            </p>
          </div>

          {/* Row 4: Type + Environment + FOV */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Type</label>
              <select value={form.type} onChange={e => handleChange('type', e.target.value)} className={inputClass + ' cursor-pointer'}>
                <option value="">Select...</option>
                <option value="Shopping & Retail">Shopping & Retail</option>
                <option value="Nature & Outdoors">Nature & Outdoors</option>
                <option value="Museums & Arts">Museums & Arts</option>
                <option value="Dining & Food">Dining & Food</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Environment</label>
              <select value={form.environment} onChange={e => handleChange('environment', e.target.value)} className={inputClass + ' cursor-pointer'}>
                <option value="">Select...</option>
                <option value="Indoor">Indoor</option>
                <option value="Outdoor">Outdoor</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>FOV Area (m²)</label>
              <input type="number" step="any" value={form.fov_area_m2} onChange={e => handleChange('fov_area_m2', e.target.value)} placeholder="e.g. 198.14" className={inputClass} />
            </div>
          </div>

          {/* Row 5: Description */}
          <div>
            <label className={labelClass}>Description</label>
            <textarea value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Optional description..." rows={2} className={inputClass + ' resize-none'} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-xs font-bold uppercase tracking-widest text-slate-400 hover:bg-white/10 hover:text-white transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="group relative px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-xs font-black uppercase tracking-widest text-white shadow-[0_8px_20px_rgba(99,102,241,0.3)] hover:shadow-[0_12px_30px_rgba(99,102,241,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 overflow-hidden">
              <span className="relative z-10 flex items-center gap-2">
                <Save size={14} />
                {saving ? 'Saving...' : (isEdit ? 'Update Location' : 'Create Location')}
              </span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// ── Main Admin Dashboard ──
const AdminDashboard = ({ onNavigate }) => {
  const [locations, setLocations] = useState([]);
  const [liveData, setLiveData] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingLocation, setEditingLocation] = useState(null); // null = closed, {} = add, {id:...} = edit
  const [deletingLocation, setDeletingLocation] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const currentUser = JSON.parse(localStorage.getItem('travel_user') || 'null');
  const userEmail = currentUser?.email;

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch(`${API_URL}/api/locations`);
      const data = await res.json();
      setLocations(data);
    } catch (err) {
      showToast('Failed to load locations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/locations/live-status`);
      const data = await res.json();
      const liveMap = {};
      data.forEach(item => {
        liveMap[item.location_id] = item;
      });
      setLiveData(liveMap);
    } catch (err) {
      console.error("Failed to fetch live data", err);
    }
  };

  useEffect(() => {
    fetchLocations();
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      const isEdit = editingLocation && editingLocation.id;
      const url = isEdit ? `${API_URL}/api/locations/${editingLocation.id}` : `${API_URL}/api/locations`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-User-Email': userEmail },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      showToast(isEdit ? `"${formData.name}" updated successfully` : `"${formData.name}" created successfully`);
      setEditingLocation(null);
      fetchLocations();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingLocation) return;
    try {
      const res = await fetch(`${API_URL}/api/locations/${deletingLocation.id}`, {
        method: 'DELETE',
        headers: { 'X-User-Email': userEmail },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');

      showToast(`"${deletingLocation.name}" deleted`);
      setDeletingLocation(null);
      fetchLocations();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#13151f] text-white p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate('dashboard')} className="flex items-center justify-center text-slate-400 hover:text-white transition-all" title="Back to Dashboard">
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Shield size={20} className="text-white" />
                <h1 className="text-2xl font-bold text-white tracking-tight">Admin Dashboard</h1>
              </div>
              <p className="text-xs tracking-wider text-slate-400 uppercase mt-1">
                LOCATION & FEED MANAGEMENT
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search locations..." className="w-full sm:w-auto bg-[#1c1f2e] border border-white/5 rounded-lg pl-9 pr-4 py-2 text-sm text-white outline-none focus:border-indigo-500/50" />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button className="flex items-center gap-2 px-4 py-2 bg-transparent text-slate-300 hover:text-white transition-colors">
                <Filter size={16} />
                <span className="text-sm font-medium">Filter</span>
              </button>
              <button
                onClick={() => setEditingLocation({})}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors whitespace-nowrap"
              >
                <Plus size={16} />
                <span>Add Location</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stat Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1c1f2e] border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-lg">
            <div className="text-white text-3xl font-bold">{locations.length}</div>
            <div className="text-xs font-bold text-slate-500 tracking-wider mt-2 uppercase">Total Locations</div>
          </div>
          
          <div className="bg-[#1c1f2e] border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-white text-3xl font-bold">{locations.filter(l => l.has_video).length}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
            </div>
            <div className="text-xs font-bold text-slate-500 tracking-wider mt-2 uppercase">Configured Cameras</div>
            <div className="text-[10px] text-slate-400 mt-1">Cameras Configured</div>
          </div>

          <div className="bg-[#1c1f2e] border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-lg">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
            </div>
            <div className="text-white font-bold">
              {(() => {
                const now = new Date();
                const operationalCount = locations.filter(l => {
                  const status = liveData[l.id];
                  if (!status || !status.timestamp) return false;
                  // Considered operational if log is within the last 5 minutes
                  const diff = now - new Date(status.timestamp);
                  return diff < 5 * 60 * 1000;
                }).length;
                const offlineCount = locations.filter(l => l.has_video).length - operationalCount;
                return `${operationalCount} Operational, ${Math.max(0, offlineCount)} Offline`;
              })()}
            </div>
            <div className="text-xs font-bold text-slate-500 tracking-wider mt-2 uppercase">Operational Hardware</div>
          </div>

          <div className="bg-[#2a161b] border border-red-900/50 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-lg">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle size={24} />
              <span className="text-3xl font-bold">
                {locations.filter(loc => {
                  const metrics = (() => {
                    const status = liveData[loc.id];
                    if (!status) return false;
                    const count = status.people_count || 0;
                    const area = loc.fov_area_m2 || 100;
                    const density = count / area;
                    return density >= 0.35; // High crowd density threshold
                  })();
                  return metrics;
                }).length}
              </span>
            </div>
            <div className="text-xs font-bold text-red-400 tracking-wider mt-2 uppercase">Active Alerts</div>
            <div className="text-[10px] text-red-300/80 mt-1">Locations in Critical Redirection State</div>
          </div>
        </div>

        {/* Locations Table */}
        <div className="bg-[#1c1f2e] border border-white/5 rounded-xl overflow-hidden mt-6 shadow-lg">
          {/* Table Header */}
          <div className="hidden lg:grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1.5fr_1.5fr_80px] gap-4 px-6 py-4 border-b border-white/5 bg-transparent uppercase text-[10px] tracking-wider text-slate-500 font-bold">
            <div>Location</div>
            <div>District</div>
            <div>Type</div>
            <div>FOV (M²)</div>
            <div>Video Source</div>
            <div>Crowd Level</div>
            <div className="text-right">Actions</div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20 text-slate-500">
              <div className="animate-spin h-6 w-6 border-2 border-white/20 border-t-indigo-400 rounded-full mr-3" />
              Loading locations...
            </div>
          )}

          {/* Empty State */}
          {!loading && locations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <MapPin size={32} className="mb-3 text-slate-600" />
              <p className="text-sm font-bold">No locations found</p>
              <p className="text-xs text-slate-600 mt-1">Click "Add Location" to get started</p>
            </div>
          )}

          {/* Location Rows */}
          {!loading && locations.map((loc, idx) => {
            const live = isLiveSource(loc.video_filename);
            
            // Calculate real crowd metrics based on live status
            const getCrowdMetrics = (loc) => {
              const status = liveData[loc.id];
              const now = new Date();
              const isOperational = status && status.timestamp && (now - new Date(status.timestamp) < 5 * 60 * 1000);

              if (!isOperational) {
                return { level: "N/A", color: "bg-slate-700", width: "0%", isHigh: false, isOperational: false };
              }
              
              const count = status.people_count || 0;
              if (count === 0) return { level: "0%", color: "bg-blue-400", width: "0%", isHigh: false, isOperational: true };
              
              // Base density on FOV area if available, else fallback to assuming 100 sqm
              const area = loc.fov_area_m2 || 100;
              const density = count / area;
              
              // Cap density at 0.40 people/m2 for 100% calculation
              let percentage = Math.min(100, Math.round((density / 0.40) * 100));
              if (percentage < 5 && count > 0) percentage = 5; // ensure visible bar if count > 0
              
              let color = "bg-blue-400"; // Sparse
              let isHigh = false;
              
              if (density >= 0.35) {
                color = "bg-red-400";
                isHigh = true;
              } else if (density >= 0.15) {
                color = "bg-amber-400";
              } else if (density >= 0.05) {
                color = "bg-emerald-400";
              }
              
              return {
                level: `${percentage}%`,
                color,
                width: `${percentage}%`,
                isHigh,
                isOperational: true
              };
            };

            const crowdMetrics = getCrowdMetrics(loc);

            return (
              <div
                key={loc.id}
                className="grid grid-cols-1 lg:grid-cols-[2fr_1.5fr_1.5fr_1fr_1.5fr_1.5fr_80px] gap-2 lg:gap-4 items-center px-6 py-4 border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                {/* Name + Coords */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-2 w-2 rounded-full flex-shrink-0 ${
                      crowdMetrics.isOperational ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-slate-600'
                    }`} />
                    <span className="text-sm font-semibold text-white truncate">{loc.name}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 pl-4">
                    {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}
                  </div>
                </div>

                {/* District */}
                <div className="text-sm text-slate-400 truncate">{loc.district}</div>

                {/* Type */}
                <div className="truncate">
                  {loc.type ? (
                    <span className={`inline-block border rounded-full px-3 py-1 text-xs ${
                      loc.type === 'Nature & Outdoors' ? 'border-emerald-500/30 text-emerald-400' :
                      loc.type === 'Shopping & Retail' ? 'border-orange-500/30 text-orange-400' :
                      loc.type === 'Museums & Arts' ? 'border-blue-500/30 text-blue-400' :
                      'border-white/20 text-slate-300'
                    }`}>
                      {loc.type}
                    </span>
                  ) : <span className="text-slate-600 italic text-xs">Unspecified</span>}
                </div>

                {/* FOV */}
                <div className="text-sm text-slate-300">
                  {loc.fov_area_m2 ? `${loc.fov_area_m2}` : <span className="text-slate-600 italic text-xs">Hardware Req.</span>}
                </div>

                {/* Video Source */}
                <div className="flex items-center gap-2 min-w-0 text-sm text-slate-300">
                  {loc.video_filename ? (
                     <>
                      <Video size={14} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate">{loc.video_filename}</span>
                     </>
                  ) : <span className="text-slate-600 italic text-xs">No feed</span>}
                </div>

                {/* Crowd Level */}
                <div className="flex flex-col justify-center pe-4 mt-2 lg:mt-0">
                  {crowdMetrics.level !== "N/A" ? (
                    <div className="flex items-center gap-3">
                       <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${crowdMetrics.color}`} style={{ width: crowdMetrics.width }}></div>
                       </div>
                       <div className="flex items-center gap-1 w-12 justify-end">
                         {crowdMetrics.isHigh && <AlertTriangle size={10} className="text-red-400" />}
                         <span className={`text-xs font-bold ${crowdMetrics.isHigh ? 'text-red-400' : 'text-slate-300'}`}>{crowdMetrics.level}</span>
                       </div>
                    </div>
                  ) : (
                    <span className="text-slate-500 italic text-xs font-medium">N/A</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center lg:justify-end gap-3 mt-2 lg:mt-0">
                  <button
                    onClick={() => setEditingLocation(loc)}
                    className="text-slate-400 hover:text-indigo-400 transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeletingLocation(loc)}
                    className="text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
          
          <div className="px-6 py-4 flex items-center justify-between border-t border-white/5 bg-[#1c1f2e]">
            <div className="text-xs text-slate-500">
              Showing 1 to {Math.min(locations.length, 10)} of {locations.length} locations
            </div>
            <div className="flex gap-4 text-slate-500">
              <button className="hover:text-white transition-colors">&lt;</button>
              <button className="hover:text-white transition-colors">&gt;</button>
            </div>
          </div>
        </div>

      </div>

      {/* Modals */}
      {editingLocation !== null && (
        <LocationFormModal
          location={editingLocation.id ? editingLocation : null}
          onSave={handleSave}
          onClose={() => setEditingLocation(null)}
          saving={saving}
        />
      )}

      {deletingLocation && (
        <DeleteModal
          location={deletingLocation}
          onConfirm={handleDelete}
          onCancel={() => setDeletingLocation(null)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[7000] px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl border backdrop-blur-xl transition-all animate-slideUp ${
          toast.type === 'error'
            ? 'bg-red-500/10 border-red-500/20 text-red-400'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Page Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-slideUp { animation: slideUp 0.3s ease-out forwards; }
      `}} />
    </div>
  );
};

export default AdminDashboard;
