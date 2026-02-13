import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import './UserProfile.css';
import { db } from '../../firebase'; 
import { doc, setDoc, getDoc } from 'firebase/firestore';

const UserProfile = ({ profile, onToggleAI, expanded = false, compactMode = false, currentUser }) => { //NEW: Added currentUser prop
  const [showAddChecklistModal, setShowAddChecklistModal] = useState(false);
  const [checklistForm, setChecklistForm] = useState({ name: '', icon: '✓' });
  const [expandedChecklistId, setExpandedChecklistId] = useState(null);
  
  //MODIFIED: Initialize from profile prop instead of localStorage
  const [userChecklists, setUserChecklists] = useState(profile.checklists || []);
  
  // State for save/load checklist templates
  const [showSaveChecklistModal, setShowSaveChecklistModal] = useState(false);
  const [saveChecklistName, setSaveChecklistName] = useState('');
  
  //MODIFIED: Initialize from profile prop instead of localStorage
  const [savedChecklistTemplates, setSavedChecklistTemplates] = useState(profile.savedTemplates || []);
  
  // Track the last loaded preloaded template ID (for replacing logic)
  // MODIFIED: Initialize from profile prop instead of localStorage
  const [lastPreloadedTemplateId, setLastPreloadedTemplateId] = useState(profile.lastPreloadedTemplateId || null);

  // Preloaded templates for different occasions
  const preloadedTemplates = [
    {
      id: 'beach',
      name: 'Beach Trip',
      icon: '🏖️',
      items: [
        { name: 'Sunscreen', icon: '☀️', note: 'SPF 50+' },
        { name: 'Swimsuit', icon: '👙', note: '' },
        { name: 'Beach Towel', icon: '🏖️', note: '' },
        { name: 'Water Bottle', icon: '💧', note: 'Stay hydrated' },
        { name: 'Flip Flops', icon: '👡', note: '' },
        { name: 'Hat/Cap', icon: '🧢', note: 'Sun protection' },
        { name: 'Sunglasses', icon: '😎', note: '' }
      ]
    },
    {
      id: 'hiking',
      name: 'Hiking Adventure',
      icon: '⛰️',
      items: [
        { name: 'Hiking Boots', icon: '👢', note: 'Comfortable and broken in' },
        { name: 'Water Bottle', icon: '💧', note: '2-3 liters' },
        { name: 'Trail Snacks', icon: '🍎', note: 'Energy bars, nuts' },
        { name: 'First Aid Kit', icon: '🩹', note: 'Bandages, pain relief' },
        { name: 'Weather Jacket', icon: '🧥', note: 'Waterproof' },
        { name: 'Backpack', icon: '🎒', note: '20-30L capacity' },
        { name: 'Map/GPS', icon: '🗺️', note: 'Navigation' }
      ]
    },
    {
      id: 'camping',
      name: 'Camping Trip',
      icon: '⛺',
      items: [
        { name: 'Tent', icon: '⛺', note: '' },
        { name: 'Sleeping Bag', icon: '🛏️', note: 'Appropriate for season' },
        { name: 'Camping Stove', icon: '🔥', note: 'Fuel included' },
        { name: 'Cookware', icon: '🍳', note: 'Pots, pans, utensils' },
        { name: 'Headlamp/Flashlight', icon: '🔦', note: 'Extra batteries' },
        { name: 'Camping Mat', icon: '📋', note: 'Insulation' },
        { name: 'Firewood', icon: '🪵', note: 'Dry wood' }
      ]
    },
    {
      id: 'city',
      name: 'City Exploration',
      icon: '🏙️',
      items: [
        { name: 'Comfortable Shoes', icon: '👟', note: 'For walking' },
        { name: 'Camera', icon: '📸', note: 'Capture memories' },
        { name: 'Transit Pass', icon: '🎫', note: 'Bus/metro tickets' },
        { name: 'City Map/App', icon: '🗺️', note: 'Navigation' },
        { name: 'Portable Charger', icon: '🔋', note: 'Phone battery' },
        { name: 'Light Jacket', icon: '🧥', note: 'Layering' },
        { name: 'Tourist Guide', icon: '📖', note: 'Attractions list' }
      ]
    },
    {
      id: 'business',
      name: 'Business Trip',
      icon: '💼',
      items: [
        { name: 'Business Attire', icon: '👔', note: 'Formal clothes' },
        { name: 'Laptop', icon: '💻', note: 'And charger' },
        { name: 'Presentation Materials', icon: '📊', note: 'Printed copies' },
        { name: 'Business Cards', icon: '🎫', note: '' },
        { name: 'Professional Bag', icon: '👜', note: 'For documents' },
        { name: 'Notebook', icon: '📓', note: 'Meeting notes' },
        { name: 'Dress Shoes', icon: '👞', note: '' }
      ]
    },
    {
      id: 'island',
      name: 'Island Hopping',
      icon: '🏝️',
      items: [
        { name: 'Waterproof Bag', icon: '🎒', note: 'Electronics protection' },
        { name: 'Snorkel Gear', icon: '🤿', note: 'Mask and fins' },
        { name: 'Reef-Safe Sunscreen', icon: '☀️', note: 'Coral-friendly' },
        { name: 'Quick Dry Clothes', icon: '👕', note: '' },
        { name: 'Water Shoes', icon: '👟', note: 'Reef protection' },
        { name: 'Underwater Camera', icon: '📷', note: 'GoPro or equivalent' },
        { name: 'Dry Pouch', icon: '🧳', note: 'For valuables' }
      ]
    }
  ];

  // Quests and vouchers
  const initialQuests = [
    { id: 'q_visit_3', title: 'Discoverer', description: 'Visit 3 places to earn a voucher', type: 'visited', requirement: 3, reward: { type: 'voucher', amount: '5% off', vendor: 'Seaside Tours' } },
    { id: 'q_wishlist_5', title: 'Dream Planner', description: 'Add 5 places to your wishlist', type: 'wishlist', requirement: 5, reward: { type: 'voucher', amount: '5% off', vendor: 'Bayfront Restaurant' } },
    { id: 'q_checklist_3', title: 'Well Prepared', description: 'Complete 3 checklist items', type: 'checklistsCompleted', requirement: 3, reward: { type: 'voucher', amount: 'Free drink', vendor: 'Beachside Cafe' } }
  ];

  const [quests, setQuests] = useState(() => {
    const saved = profile.quests || [];
    return initialQuests.map(def => ({ ...def, completed: !!saved.find(s => s.id === def.id && s.completed) }));
  });

  const [vouchers, setVouchers] = useState(profile.vouchers || []);
  // Keep a ref of previous quests to detect newly completed quests
  const prevQuestsRef = useRef(quests);
  // Track awarded quest ids to avoid in-flight duplicate issuance
  const awardedQuestIdsRef = useRef(new Set());

  // Helper: dedupe vouchers by questId, keeping the latest by issuedAt (or last in array)
  // (Kept for initial voucher state, but not used repeatedly)
  const dedupeVouchers = (vs = []) => {
    const map = new Map();
    vs.forEach(v => {
      const key = v.questId || v.id || JSON.stringify(v);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, v);
      } else {
        const a = existing.issuedAt ? new Date(existing.issuedAt).getTime() : 0;
        const b = v.issuedAt ? new Date(v.issuedAt).getTime() : 0;
        if (b >= a) map.set(key, v);
      }
    });
    return Array.from(map.values());
  };

  // Save checklists to Firebase
  const saveChecklistsToFirebase = useCallback(async (checklists) => {
    if (!currentUser) {
      console.log('⚠️ No user logged in, checklists not saved');
      return;
    }

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, {
        checklists: checklists,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('✅ Checklists saved to Firebase:', checklists.length, 'items');
    } catch (error) {
      console.error('❌ Error saving checklists:', error);
      console.error('Error details:', error.message);
    }
  }, [currentUser]);

  // Save templates to Firebase
  const saveTemplatesToFirebase = useCallback(async (templates) => {
    if (!currentUser) return;

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, {
        savedTemplates: templates,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('✅ Templates saved to Firebase:', templates.length, 'items');
    } catch (error) {
      console.error('❌ Error saving templates:', error);
      console.error('Error details:', error.message);
    }
  }, [currentUser]);

  // Save last preloaded template ID to Firebase
  const saveLastPreloadedIdToFirebase = useCallback(async (templateId) => {
    if (!currentUser) return;

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, {
        lastPreloadedTemplateId: templateId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('✅ Last preloaded template ID saved:', templateId);
    } catch (error) {
      console.error('❌ Error saving last preloaded ID:', error);
      console.error('Error details:', error.message);
    }
  }, [currentUser]);

  // Save quests to Firebase
  const saveQuestsToFirebase = useCallback(async (questsToSave) => {
    if (!currentUser) return;
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, {
        quests: questsToSave,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('✅ Quests saved to Firebase');
    } catch (error) {
      console.error('❌ Error saving quests:', error);
    }
  }, [currentUser]);

  // Save vouchers to Firebase
  const saveVouchersToFirebase = useCallback(async (vouchersToSave) => {
    if (!currentUser) return;
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, {
        vouchers: vouchersToSave,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('✅ Vouchers saved to Firebase');
    } catch (error) {
      console.error('❌ Error saving vouchers:', error);
    }
  }, [currentUser]);



  // Save to Firebase when checklists change
  useEffect(() => {
    if (currentUser && userChecklists.length > 0) {
      saveChecklistsToFirebase(userChecklists);
    }
  }, [userChecklists, currentUser, saveChecklistsToFirebase]);

  // Save to Firebase when templates change
  useEffect(() => {
    if (currentUser && savedChecklistTemplates.length > 0) {
      saveTemplatesToFirebase(savedChecklistTemplates);
    }
  }, [savedChecklistTemplates, currentUser, saveTemplatesToFirebase]);

  // Save to Firebase when last preloaded ID changes
  useEffect(() => {
    if (currentUser && lastPreloadedTemplateId) {
      saveLastPreloadedIdToFirebase(lastPreloadedTemplateId);
    }
  }, [lastPreloadedTemplateId, currentUser, saveLastPreloadedIdToFirebase]);

  // Save quests and vouchers when they change
  useEffect(() => {
    if (currentUser) {
      saveQuestsToFirebase(quests);
    }
  }, [quests, currentUser, saveQuestsToFirebase]);

  useEffect(() => {
    if (currentUser) {
      saveVouchersToFirebase(vouchers);
    }
  }, [vouchers, currentUser, saveVouchersToFirebase]);

  // Always show profile prop data instantly for all UI (badges, map, etc.)
  useEffect(() => {
    // Only update if changed
    setUserChecklists(profile.checklists || []);
    setSavedChecklistTemplates(profile.savedTemplates || []);
    setLastPreloadedTemplateId(profile.lastPreloadedTemplateId || null);
    const savedQuests = profile.quests || [];
    const syncedQuests = initialQuests.map(def => ({
      ...def,
      completed: !!savedQuests.find(s => s.id === def.id && s.completed)
    }));
    setQuests(syncedQuests);
    setVouchers(dedupeVouchers(profile.vouchers || []));
    prevQuestsRef.current = syncedQuests;
    awardedQuestIdsRef.current = new Set((profile.vouchers || []).map(v => v.questId));
  }, [profile, currentUser]);

  // Remove duplicate/legacy Firestore fetch effect (now handled by reload on login)

  // Calculate gamification stats
  const stats = useMemo(() => {
    const beenThere = profile.beenThere || [];
    const wantToGo = profile.wantToGo || [];

    const visitedCount = beenThere.length;
    const wishlistCount = wantToGo.length;
    
    // Extract unique regions from visited places
    const uniqueRegions = new Set(beenThere.map(id => {
      // Extract region from location id (assuming format like "boracay-aklan")
      const parts = id.split('-');
      return parts[parts.length - 1];
    }));
    
    return {
      visited: visitedCount,
      wishlist: wishlistCount,
      regions: uniqueRegions.size,
      totalInteractions: visitedCount + wishlistCount
    };
  }, [profile]);

  // Define achievement badges
  const badges = [
    {
      id: 'explorer',
      name: 'Explorer',
      icon: '🗺️',
      description: 'Visit your first place',
      requirement: 1,
      current: stats.visited,
      unlocked: stats.visited >= 1
    },
    {
      id: 'adventurer',
      name: 'Adventurer',
      icon: '🎒',
      description: 'Visit 3 different places',
      requirement: 3,
      current: stats.visited,
      unlocked: stats.visited >= 3
    },
    {
      id: 'traveler',
      name: 'Traveler',
      icon: '✈️',
      description: 'Visit 5 different places',
      requirement: 5,
      current: stats.visited,
      unlocked: stats.visited >= 5
    },
    {
      id: 'globetrotter',
      name: 'Globetrotter',
      icon: '🌍',
      description: 'Visit 10 different places',
      requirement: 10,
      current: stats.visited,
      unlocked: stats.visited >= 10
    },
    {
      id: 'regional',
      name: 'Regional Explorer',
      icon: '🏝️',
      description: 'Visit 3 different regions',
      requirement: 3,
      current: stats.regions,
      unlocked: stats.regions >= 3
    },
    {
      id: 'wishlist-master',
      name: 'Dream Planner',
      icon: '⭐',
      description: 'Add 5 places to wishlist',
      requirement: 5,
      current: stats.wishlist,
      unlocked: stats.wishlist >= 5
    }
  ];

  const unlockedBadges = badges.filter(b => b.unlocked);
  const nextBadge = badges.find(b => !b.unlocked);

  // Icon options for checklist
  const iconOptions = ['✓', '📋', '📝', '✈️', '🎒', '🗺️', '📅', '🏨', '🎫', '📕', '🛡️', '⭐'];

  // Handle add checklist button click
  const handleAddChecklistClick = () => {
    setShowAddChecklistModal(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowAddChecklistModal(false);
    setChecklistForm({ name: '', icon: '✓' });
  };

  // Handle form input change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setChecklistForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle icon selection
  const handleIconSelect = (icon) => {
    setChecklistForm(prev => ({ ...prev, icon }));
  };

  // Handle form submission
  const handleAddChecklist = () => {
    if (checklistForm.name.trim()) {
      const newChecklist = {
        id: Date.now(),
        ...checklistForm,
        completed: false
      };
      console.log('Adding new checklist:', newChecklist);
      setUserChecklists(prev => {
        const updated = [...prev, newChecklist];
        console.log('Updated checklists:', updated);
        return updated;
      });
      // Clear preloaded template tracking so next template appends instead
      setLastPreloadedTemplateId(null);
      // ⭐ REMOVED: localStorage.removeItem('lastPreloadedTemplateId'); (Firebase handles this now)
      handleCloseModal();
    }
  };

  // Handle checkbox toggle
  const handleToggleChecklistItem = (id) => {
    setUserChecklists(prev =>
      prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  // Handle delete checklist item
  const handleDeleteChecklistItem = (id) => {
    setUserChecklists(prev => prev.filter(item => item.id !== id));
  };

  // Handle expand/collapse checklist
  const handleToggleExpand = (id) => {
    setExpandedChecklistId(expandedChecklistId === id ? null : id);
  };

  // Handle note update
  const handleUpdateNote = (id, note) => {
    setUserChecklists(prev =>
      prev.map(item =>
        item.id === id ? { ...item, note } : item
      )
    );
  };

  // Handle save checklist template
  const handleSaveChecklist = () => {
    if (saveChecklistName.trim() && userChecklists.length > 0) {
      const newTemplate = {
        id: Date.now(),
        name: saveChecklistName,
        items: userChecklists.map(({ name, icon, note }) => ({ name, icon, note }))
      };
      setSavedChecklistTemplates(prev => [...prev, newTemplate]);
      setSaveChecklistName('');
      setShowSaveChecklistModal(false);
      console.log('Checklist saved as template:', newTemplate);
    }
  };

  // Handle load checklist template
  const handleLoadTemplate = (template) => {
    const newItems = template.items.map(item => ({
      id: Date.now() + Math.random(),
      ...item,
      completed: false
    }));
    setUserChecklists(prev => [...prev, ...newItems]);
    console.log('Template loaded:', template);
  };

  // Handle delete saved template
  const handleDeleteTemplate = (templateId) => {
    setSavedChecklistTemplates(prev => prev.filter(t => t.id !== templateId));
  };

  // Handle open save modal
  const handleOpenSaveModal = () => {
    if (userChecklists.length === 0) {
      alert('Add some checklist items before saving a template!');
      return;
    }
    setShowSaveChecklistModal(true);
  };

  // Handle close save modal
  const handleCloseSaveModal = () => {
    setShowSaveChecklistModal(false);
    setSaveChecklistName('');
  };

  // Handle load preloaded template
  const handleLoadPreloadedTemplate = (template) => {
    const newItems = template.items.map(item => ({
      id: Date.now() + Math.random(),
      ...item,
      completed: false
    }));
    
    // If checklist is empty OR we're switching from one preloaded template to another
    // (i.e., all current items are from a preloaded template), replace instead of append
    if (userChecklists.length === 0 || lastPreloadedTemplateId) {
      // Replace the entire checklist
      setUserChecklists(newItems);
      console.log('Preloaded template loaded (replaced):', template.name);
    } else {
      // Append to existing checklist (user has manually added items)
      setUserChecklists(prev => [...prev, ...newItems]);
      console.log('Preloaded template loaded (appended):', template.name);
    }
    
    // Update the last loaded preloaded template ID
    setLastPreloadedTemplateId(template.id);
  };

  // Utility: generate simple voucher code
  const generateVoucherCode = (prefix = 'V') => {
    return prefix + Math.random().toString(36).slice(2, 8).toUpperCase();
  };

  // Award voucher for a completed quest (idempotent by questId)
  const awardVoucherForQuest = (quest) => {
    // Guard: don't issue if already awarded or in-flight
    if (awardedQuestIdsRef.current.has(quest.id)) return;
    // don't issue duplicate vouchers for same quest
    const alreadyLocal = vouchers.find(v => v.questId === quest.id);
    const alreadyInProfile = (profile.vouchers || []).find(v => v.questId === quest.id);
    if (alreadyLocal || alreadyInProfile) {
      awardedQuestIdsRef.current.add(quest.id);
      return;
    }

    const newVoucher = {
      id: Date.now() + Math.random(),
      questId: quest.id,
      vendor: quest.reward.vendor,
      amount: quest.reward.amount,
      code: generateVoucherCode('V'),
      claimed: false,
      issuedAt: new Date().toISOString()
    };
    setVouchers(prev => [newVoucher, ...prev]);
    // mark as awarded immediately to prevent concurrent awards
    awardedQuestIdsRef.current.add(quest.id);
  };

  // Watch for quest completion conditions (stats, wishlist, checklist completions)
  useEffect(() => {
    const checklistCompletedCount = userChecklists.filter(i => i.completed).length;

    const updated = quests.map(q => {
      const wasCompleted = prevQuestsRef.current?.find(x => x.id === q.id)?.completed;
      let met = q.completed;
      if (!q.completed) {
        if (q.type === 'visited' && stats.visited >= q.requirement) met = true;
        if (q.type === 'wishlist' && stats.wishlist >= q.requirement) met = true;
        if (q.type === 'checklistsCompleted' && checklistCompletedCount >= q.requirement) met = true;
      }
      // If newly met (was not completed before, now met), award voucher
      if (!wasCompleted && met) {
        awardVoucherForQuest(q);
      }
      return { ...q, completed: met };
    });

    // Only update state if something changed
    const changed = updated.some((u, i) => u.completed !== quests[i].completed);
    if (changed) {
      setQuests(updated);
    }

    // store for next comparison
    prevQuestsRef.current = updated;
  }, [stats, userChecklists, quests]);

  return (
    <div className={`user-profile ${expanded ? 'expanded' : ''} ${compactMode ? 'compact' : ''}`}>
      <div className="profile-header">
        <div className="avatar">👤</div>
        <div className="profile-info">
          <h3>My Travel Journey</h3>
          <p className="profile-subtitle">Track your adventures</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card visited">
          <div className="stat-icon">✓</div>
          <div className="stat-content">
            <span className="stat-number">{stats.visited}</span>
            <span className="stat-label">Visited</span>
          </div>
        </div>
        <div className="stat-card wishlist">
          <div className="stat-icon">♡</div>
          <div className="stat-content">
            <span className="stat-number">{stats.wishlist}</span>
            <span className="stat-label">Wishlist</span>
          </div>
        </div>
        <div className="stat-card regions">
          <div className="stat-icon">🏝️</div>
          <div className="stat-content">
            <span className="stat-number">{stats.regions}</span>
            <span className="stat-label">Regions</span>
          </div>
        </div>
      </div>

      {/* Travel Checklist Section */}
      <div className="checklist-container">
        <h4 className="checklist-title">✓ Travel Checklist</h4>
        <button onClick={handleAddChecklistClick} className="add-checklist-btn">
          <span className="btn-icon">+</span>
          <span className="btn-text">Add Checklist Item</span>
        </button>
        {/* Display added checklists */}
        <div className="checklist-items">
          {userChecklists.map(item => (
            <div key={item.id} className={`checklist-item ${item.completed ? 'completed' : ''} ${expandedChecklistId === item.id ? 'expanded' : ''}`}>
              <div className="checklist-item-header">
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => handleToggleChecklistItem(item.id)}
                  className="checklist-checkbox"
                />
                <span className="checklist-icon">{item.icon}</span>
                <span className="checklist-text">{item.name}</span>
                <button
                  onClick={() => handleToggleExpand(item.id)}
                  className="checklist-expand-btn"
                  title="Add notes"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteChecklistItem(item.id)}
                  className="checklist-delete-btn"
                  title="Delete this checklist item"
                >
                  🗑️
                </button>
              </div>
              {expandedChecklistId === item.id && (
                <div className="checklist-notes-wrapper">
                  <textarea
                    className="checklist-notes-input"
                    placeholder="Add notes, reminders, or details..."
                    value={item.note || ''}
                    onChange={(e) => handleUpdateNote(item.id, e.target.value)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Saved Templates Section - Combined Save/Load */}
        <div className="templates-section">
          <div className="templates-header">
            <h5 className="templates-header-title">📦 Template Management</h5>
            {userChecklists.length > 0 && (
              <button onClick={handleOpenSaveModal} className="templates-action-btn save-btn">
                <span className="btn-icon">💾</span>
                <span className="btn-text">Save Current</span>
              </button>
            )}
          </div>
          
          {savedChecklistTemplates.length > 0 ? (
            <div className="templates-list">
              {savedChecklistTemplates.map(template => (
                <div key={template.id} className="template-item">
                  <div className="template-info">
                    <span className="template-name">{template.name}</span>
                    <span className="template-meta">{template.items.length} item{template.items.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="template-actions">
                    <button
                      onClick={() => handleLoadTemplate(template)}
                      className="templates-action-btn load-btn"
                      title="Load this template"
                    >
                      📥 Load
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="templates-action-btn delete-btn"
                      title="Delete this template"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="templates-empty">
              <p>No saved templates yet. Create one to get started!</p>
            </div>
          )}

          {/* Preloaded Templates */}
          <div className="preloaded-templates">
            <h5 className="preloaded-title">🎯 Quick Start Templates</h5>
            <div className="preloaded-grid">
              {preloadedTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleLoadPreloadedTemplate(template)}
                  className="preloaded-template-btn"
                  title={`Load ${template.name} template`}
                >
                  <span className="preloaded-icon">{template.icon}</span>
                  <span className="preloaded-name">{template.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Checklist Modal */}
      {showAddChecklistModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Checklist Item</h3>
              <button className="modal-close" onClick={handleCloseModal}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="checklist-name">Item Name</label>
                <input
                  type="text"
                  id="checklist-name"
                  name="name"
                  placeholder="Enter checklist item name"
                  value={checklistForm.name}
                  onChange={handleFormChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Select Icon</label>
                <div className="icon-picker">
                  {iconOptions.map(icon => (
                    <button
                      key={icon}
                      className={`icon-option ${checklistForm.icon === icon ? 'selected' : ''}`}
                      onClick={() => handleIconSelect(icon)}
                      title={`Select ${icon}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button onClick={handleCloseModal} className="btn-cancel">Cancel</button>
                <button onClick={handleAddChecklist} className="btn-add">Add Item</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveChecklistModal && (
        <div className="modal-overlay" onClick={handleCloseSaveModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Save Checklist as Template</h3>
              <button className="modal-close" onClick={handleCloseSaveModal}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="template-name">Template Name</label>
                <input
                  type="text"
                  id="template-name"
                  placeholder="e.g., 'Beach Trip Essentials'"
                  value={saveChecklistName}
                  onChange={(e) => setSaveChecklistName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="template-preview">
                <p className="preview-label">Items to save: {userChecklists.length}</p>
                <ul className="preview-list">
                  {userChecklists.slice(0, 5).map(item => (
                    <li key={item.id}>{item.icon} {item.name}</li>
                  ))}
                  {userChecklists.length > 5 && (
                    <li className="more-items">... and {userChecklists.length - 5} more</li>
                  )}
                </ul>
              </div>

              <div className="modal-footer">
                <button onClick={handleCloseSaveModal} className="btn-cancel">Cancel</button>
                <button onClick={handleSaveChecklist} className="btn-save">Save Template</button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default UserProfile;