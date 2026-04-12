import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
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

  const modalActionBtnClass = 'cursor-pointer rounded-lg px-5 py-2.5 text-[0.9rem] font-bold uppercase tracking-[0.5px] transition-all duration-200';
  const templateActionBaseClass = 'flex items-center justify-center gap-1 whitespace-nowrap rounded-md px-[10px] py-1.5 text-[0.8rem] font-semibold transition-all duration-200';

  return (
    <div
      className={`flex h-full flex-col gap-2 overflow-y-auto rounded-lg bg-white px-3 py-3 shadow-[0_6px_20px_rgba(16,24,40,0.06)] transition-[padding,box-shadow,border-radius] duration-200 [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-slate-50 [&::-webkit-scrollbar]:w-1.5 ${compactMode ? 'border-r-0' : 'border-r border-[#e6eef8]'}`}
    >
      <div
        className={`flex items-center gap-3 rounded-lg bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white ${compactMode ? 'px-3 py-2.5' : 'px-3 py-3.5'}`}
      >
        <div
          className={`m-0 flex shrink-0 items-center justify-center rounded-xl border-2 border-white/90 bg-white text-[#667eea] shadow-[0_6px_18px_rgba(10,20,40,0.06)] ${compactMode ? 'h-10 w-10 text-[1.3rem]' : 'h-14 w-14 text-[1.6rem]'}`}
        >
          👤
        </div>
        <div className="flex-1">
          <h3 className={`m-0 font-extrabold tracking-[-0.01em] ${compactMode ? 'text-[0.95rem]' : 'text-[1.05rem]'}`}>
            My Travel Journey
          </h3>
          <p className={`m-0 mt-1 font-medium text-white/95 ${compactMode ? 'text-xs' : 'text-[0.9rem]'}`}>
            Track your adventures
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      {!compactMode && (
        <div className="grid grid-cols-3 gap-2.5 bg-transparent p-2.5">
          <div className="relative flex flex-col items-center gap-1.5 overflow-hidden rounded-[10px] border border-[#eef3fb] bg-gradient-to-b from-white to-[#fbfdff] px-2 py-2.5 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
            <div className="text-2xl">✓</div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[1.8rem] font-extrabold leading-none text-slate-900">{stats.visited}</span>
              <span className="text-[0.75rem] font-bold uppercase tracking-[0.5px] text-slate-500">Visited</span>
            </div>
          </div>
          <div className="relative flex flex-col items-center gap-1.5 overflow-hidden rounded-[10px] border border-[#eef3fb] bg-gradient-to-b from-white to-[#fbfdff] px-2 py-2.5 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
            <div className="text-2xl">♡</div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[1.8rem] font-extrabold leading-none text-slate-900">{stats.wishlist}</span>
              <span className="text-[0.75rem] font-bold uppercase tracking-[0.5px] text-slate-500">Wishlist</span>
            </div>
          </div>
          <div className="relative flex flex-col items-center gap-1.5 overflow-hidden rounded-[10px] border border-[#eef3fb] bg-gradient-to-b from-white to-[#fbfdff] px-2 py-2.5 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
            <div className="text-2xl">🏝️</div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[1.8rem] font-extrabold leading-none text-slate-900">{stats.regions}</span>
              <span className="text-[0.75rem] font-bold uppercase tracking-[0.5px] text-slate-500">Regions</span>
            </div>
          </div>
        </div>
      )}

      {/* Travel Checklist Section */}
      <div className="flex flex-col gap-0">
        <h4
          className={`m-0 grid items-center pt-px font-extrabold uppercase tracking-[0.5px] text-slate-900 ${compactMode ? 'mb-2.5 mt-3 text-[0.85rem]' : 'mb-4 text-[0.95rem]'} ${expanded ? 'mt-9' : ''}`}
        >
          ✓ Travel Checklist
        </h4>
        <button
          onClick={handleAddChecklistClick}
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-[#c4b5fd] bg-gradient-to-br from-[#ede9fe] to-[#f3e8ff] font-bold capitalize text-[#7c3aed] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#a78bfa] hover:from-[#ddd6fe] hover:to-[#e9d5ff] hover:shadow-[0_4px_12px_rgba(124,58,237,0.2)] active:translate-y-0 ${compactMode ? 'mx-2 w-[calc(100%-16px)] px-2.5 py-2 text-[0.8rem]' : 'w-[calc(100%-24px)] px-3 py-2.5 text-[0.9rem]'}`}
        >
          <span className="text-[1.2rem] font-extrabold">+</span>
          <span className={`${compactMode ? 'text-[0.8rem]' : 'text-[0.85rem]'}`}>Add Checklist Item</span>
        </button>
        {/* Display added checklists */}
        <div className={`grid gap-2.5 ${compactMode ? 'ml-2 mt-1.5 w-[calc(100%-16px)] gap-2' : 'mt-2 max-w-[90%]'}`}>
          {userChecklists.map(item => (
            <div
              key={item.id}
              className={`relative w-full max-w-[520px] overflow-hidden rounded-[10px] border-2 transition-all duration-300 ${item.completed ? 'border-green-300 bg-gradient-to-br from-green-50 to-green-100 before:absolute before:bottom-0 before:left-0 before:top-0 before:w-1 before:bg-gradient-to-b before:from-emerald-500 before:to-emerald-600' : 'border-slate-200 bg-[#fafafa]'}`}
            >
              <div className={`flex w-full items-center ${compactMode ? 'gap-2 px-2.5 py-2' : 'gap-3 px-3 py-2.5'}`}>
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => handleToggleChecklistItem(item.id)}
                  className={`shrink-0 cursor-pointer accent-[#667eea] ${compactMode ? 'h-4 w-4' : 'h-5 w-5'}`}
                />
                <span
                  className={`flex shrink-0 items-center justify-center rounded-[10px] border-2 bg-white ${compactMode ? 'h-7 w-7 text-[1.1rem]' : 'h-10 w-10 text-[1.6rem]'} ${item.completed ? 'border-green-300' : 'border-slate-200'}`}
                >
                  {item.icon}
                </span>
                <span className={`font-bold ${compactMode ? 'text-[0.8rem]' : 'text-[0.9rem]'} ${item.completed ? 'text-green-800 line-through' : 'text-slate-900'}`}>
                  {item.name}
                </span>
                <button
                  onClick={() => handleToggleExpand(item.id)}
                  className={`ml-auto flex shrink-0 cursor-pointer items-center justify-center bg-transparent px-2 py-1 text-slate-600 transition-all duration-300 hover:text-slate-900 ${expandedChecklistId === item.id ? 'rotate-180' : 'rotate-0'}`}
                  title="Add notes"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteChecklistItem(item.id)}
                  className="cursor-pointer bg-transparent px-2 py-1 text-[1.1rem] opacity-60 transition-all duration-200 hover:scale-110 hover:opacity-100 active:scale-95"
                  title="Delete this checklist item"
                >
                  🗑️
                </button>
              </div>
              {expandedChecklistId === item.id && (
                <div className="w-full">
                  <textarea
                    className={`w-full resize-none border-0 border-t border-solid border-slate-200 bg-white p-3 font-inherit leading-[1.5] text-slate-900 placeholder:italic placeholder:text-slate-300 focus:bg-slate-50 focus:outline-none focus:border-t-[#667eea] ${compactMode ? 'min-h-[60px] text-[0.8rem] p-2' : 'min-h-20 text-[0.85rem]'}`}
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
        <div
          className={`w-full max-w-[520px] rounded-[10px] border border-solid border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 transition-all duration-300 hover:border-slate-300 ${compactMode ? 'mx-2 my-2.5 w-[calc(100%-16px)] p-2.5' : 'mt-4 p-3.5'}`}
        >
          <div className="mb-3 flex items-center justify-between gap-2.5">
            <h5 className={`m-0 flex items-center gap-1.5 font-bold text-slate-700 ${compactMode ? 'text-[0.8rem]' : 'text-[0.9rem]'}`}>
              📦 Template Management
            </h5>
            {userChecklists.length > 0 && (
              <button
                onClick={handleOpenSaveModal}
                className={`${templateActionBaseClass} bg-gradient-to-br from-emerald-500 to-emerald-600 px-2 py-1.5 text-white hover:-translate-y-px hover:shadow-[0_2px_8px_rgba(16,185,129,0.3)] ${compactMode ? 'text-[0.7rem]' : 'text-[0.8rem]'}`}
              >
                <span className="text-[0.9rem]">💾</span>
                <span>Save Current</span>
              </button>
            )}
          </div>
          
          {savedChecklistTemplates.length > 0 ? (
            <div className="flex flex-col gap-2">
              {savedChecklistTemplates.map(template => (
                <div
                  key={template.id}
                  className={`flex items-center justify-between gap-2.5 rounded-lg border border-solid border-slate-200 bg-white transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-[0_2px_4px_rgba(0,0,0,0.05)] ${compactMode ? 'p-2' : 'p-2.5'}`}
                >
                  <div className="min-w-0 flex-1">
                    <span className={`block break-words font-semibold text-slate-800 ${compactMode ? 'text-[0.8rem]' : 'text-[0.9rem]'}`}>
                      {template.name}
                    </span>
                    <span className={`font-medium text-slate-400 ${compactMode ? 'text-[0.75rem]' : 'text-[0.8rem]'}`}>
                      {template.items.length} item{template.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      onClick={() => handleLoadTemplate(template)}
                      className={`${templateActionBaseClass} bg-gradient-to-br from-sky-500 to-sky-600 text-white hover:scale-105 hover:shadow-[0_2px_6px_rgba(2,132,199,0.3)] ${compactMode ? 'px-2 py-1.5 text-[0.7rem]' : 'text-[0.8rem]'}`}
                      title="Load this template"
                    >
                      📥 Load
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className={`${templateActionBaseClass} border border-solid border-slate-200 bg-[#f5f5f5] px-2 py-1.5 text-slate-500 hover:border-red-300 hover:bg-red-100 hover:text-red-600 ${compactMode ? 'text-[0.7rem]' : 'text-[0.8rem]'}`}
                      title="Delete this template"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="m-0 rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center">
              <p className="m-0 text-[0.85rem] font-medium text-slate-400">No saved templates yet. Create one to get started!</p>
            </div>
          )}

          {/* Preloaded Templates */}
          <div className={`mt-3.5 border-t border-solid border-slate-300 pt-3 ${compactMode ? 'mt-2 pt-2' : ''}`}>
            <h5 className={`m-0 mb-2.5 flex items-center gap-1 font-bold text-slate-600 ${compactMode ? 'mb-1.5 text-[0.8rem]' : 'text-[0.85rem]'}`}>
              🎯 Quick Start Templates
            </h5>
            <div className={`grid grid-cols-2 ${compactMode ? 'gap-1.5' : 'gap-2'}`}>
              {preloadedTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleLoadPreloadedTemplate(template)}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-solid border-slate-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-[#667eea] hover:bg-slate-50 hover:shadow-[0_4px_12px_rgba(102,126,234,0.15)] active:translate-y-0 ${compactMode ? 'gap-1 px-2 py-2.5' : 'px-2.5 py-3'}`}
                  title={`Load ${template.name} template`}
                >
                  <span className={`${compactMode ? 'text-[1.4rem]' : 'text-[1.8rem]'}`}>{template.icon}</span>
                  <span className={`break-words text-center font-semibold leading-tight text-slate-700 ${compactMode ? 'text-[0.7rem]' : 'text-[0.8rem]'}`}>
                    {template.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Checklist Modal */}
      {showAddChecklistModal && (
        <div className="fixed inset-0 z-[1000] flex animate-[fadeIn_0.3s_ease] items-center justify-center bg-black/50 backdrop-blur-[3px]" onClick={handleCloseModal}>
          <div className="w-[90%] max-w-[500px] animate-[slideUp_0.3s_ease] overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.3)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b-2 border-slate-200 bg-gradient-to-br from-[#667eea] to-[#764ba2] p-6 text-white">
              <h3 className="m-0 text-xl font-extrabold">Add Checklist Item</h3>
              <button className="flex h-8 w-8 cursor-pointer items-center justify-center bg-transparent p-0 text-2xl text-white transition-all duration-200 hover:scale-110" onClick={handleCloseModal}>✕</button>
            </div>
            
            <div className="p-6">
              <div className="mb-5">
                <label htmlFor="checklist-name" className="mb-2 block text-[0.95rem] font-bold uppercase tracking-[0.5px] text-slate-900">Item Name</label>
                <input
                  type="text"
                  id="checklist-name"
                  name="name"
                  placeholder="Enter checklist item name"
                  value={checklistForm.name}
                  onChange={handleFormChange}
                  className="box-border w-full rounded-[10px] border-2 border-slate-200 px-3.5 py-3 text-[0.95rem] transition-all duration-200 focus:border-[#667eea] focus:outline-none focus:ring-4 focus:ring-[#667eea]/10"
                />
              </div>

              <div className="mb-5">
                <label className="mb-2 block text-[0.95rem] font-bold uppercase tracking-[0.5px] text-slate-900">Select Icon</label>
                <div className="grid grid-cols-6 gap-2.5">
                  {iconOptions.map(icon => (
                    <button
                      key={icon}
                      className={`aspect-square cursor-pointer rounded-[10px] border-2 text-[1.8rem] transition-all duration-200 hover:scale-105 ${checklistForm.icon === icon ? 'border-[#667eea] bg-gradient-to-br from-[#667eea] to-[#764ba2] shadow-[0_4px_12px_rgba(102,126,234,0.3)]' : 'border-slate-200 bg-[#f5f3ff] hover:border-[#c4b5fd] hover:bg-[#f0e9ff]'}`}
                      onClick={() => handleIconSelect(icon)}
                      title={`Select ${icon}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="-mx-6 -mb-6 flex justify-end gap-3 border-t-2 border-slate-200 px-6 py-4">
                <button onClick={handleCloseModal} className={`${modalActionBtnClass} border-2 border-slate-200 bg-[#f5f3ff] text-[#667eea] hover:border-[#c4b5fd] hover:bg-[#f0e9ff]`}>Cancel</button>
                <button onClick={handleAddChecklist} className={`${modalActionBtnClass} border-none bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(102,126,234,0.3)]`}>Add Item</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveChecklistModal && (
        <div className="fixed inset-0 z-[1000] flex animate-[fadeIn_0.3s_ease] items-center justify-center bg-black/50 backdrop-blur-[3px]" onClick={handleCloseSaveModal}>
          <div className="w-[90%] max-w-[500px] animate-[slideUp_0.3s_ease] overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.3)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b-2 border-slate-200 bg-gradient-to-br from-[#667eea] to-[#764ba2] p-6 text-white">
              <h3 className="m-0 text-xl font-extrabold">Save Checklist as Template</h3>
              <button className="flex h-8 w-8 cursor-pointer items-center justify-center bg-transparent p-0 text-2xl text-white transition-all duration-200 hover:scale-110" onClick={handleCloseSaveModal}>✕</button>
            </div>
            
            <div className="p-6">
              <div className="mb-5">
                <label htmlFor="template-name" className="mb-2 block text-[0.95rem] font-bold uppercase tracking-[0.5px] text-slate-900">Template Name</label>
                <input
                  type="text"
                  id="template-name"
                  placeholder="e.g., 'Beach Trip Essentials'"
                  value={saveChecklistName}
                  onChange={(e) => setSaveChecklistName(e.target.value)}
                  className="box-border w-full rounded-[10px] border-2 border-slate-200 px-3.5 py-3 text-[0.95rem] transition-all duration-200 focus:border-[#667eea] focus:outline-none focus:ring-4 focus:ring-[#667eea]/10"
                />
              </div>

              <div className="rounded-lg border border-solid border-slate-200 bg-slate-50 p-3">
                <p className="m-0 mb-2 text-sm font-bold text-slate-700">Items to save: {userChecklists.length}</p>
                <ul className="m-0 list-none space-y-1 p-0 text-sm text-slate-700">
                  {userChecklists.slice(0, 5).map(item => (
                    <li key={item.id}>{item.icon} {item.name}</li>
                  ))}
                  {userChecklists.length > 5 && (
                    <li className="text-slate-500">... and {userChecklists.length - 5} more</li>
                  )}
                </ul>
              </div>

              <div className="-mx-6 -mb-6 mt-5 flex justify-end gap-3 border-t-2 border-slate-200 px-6 py-4">
                <button onClick={handleCloseSaveModal} className={`${modalActionBtnClass} border-2 border-slate-200 bg-[#f5f3ff] text-[#667eea] hover:border-[#c4b5fd] hover:bg-[#f0e9ff]`}>Cancel</button>
                <button onClick={handleSaveChecklist} className={`${modalActionBtnClass} border-none bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(102,126,234,0.3)]`}>Save Template</button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default UserProfile;