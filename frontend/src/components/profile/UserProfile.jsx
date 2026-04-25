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



  // Always show profile prop data instantly for all UI (badges, map, etc.)
  useEffect(() => {
    // Only update if changed
    setUserChecklists(profile.checklists || []);
    setSavedChecklistTemplates(profile.savedTemplates || []);
    setLastPreloadedTemplateId(profile.lastPreloadedTemplateId || null);
  }, [profile, currentUser]);

  // Remove duplicate/legacy Firestore fetch effect (now handled by reload on login)



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

  const modalActionBtnClass = 'cursor-pointer rounded-lg px-5 py-2.5 text-[0.9rem] font-bold uppercase tracking-[0.5px] transition-all duration-200';
  const templateActionBaseClass = 'flex items-center justify-center gap-1 whitespace-nowrap rounded-md px-[10px] py-1.5 text-[0.8rem] font-semibold transition-all duration-200';

  return (
    <div
      className={`flex h-full flex-col gap-2 overflow-y-auto bg-[#0a0f1e]/80 backdrop-blur-2xl border-white/5 px-3 py-3 shadow-2xl transition-all duration-300 custom-scrollbar ${compactMode ? 'border-r-0' : 'border-r'}`}
    >
      <div
        className={`flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-white shadow-xl ${compactMode ? 'px-4 py-3' : 'px-5 py-4'}`}
      >
        <div className="flex-1">
          <h3 className={`m-0 font-black tracking-tight ${compactMode ? 'text-[0.95rem]' : 'text-[1.05rem]'}`}>
            My Travel Journey
          </h3>
          <p className={`m-0 mt-0.5 font-bold text-white/80 ${compactMode ? 'text-[10px] uppercase tracking-wider' : 'text-[0.8rem]'}`}>
            Track your adventures
          </p>
        </div>
      </div>



      {/* Travel Checklist Section */}
      <div className="flex flex-col gap-0 px-1">
        <h4
          className={`m-0 grid items-center pt-px font-black uppercase tracking-widest text-slate-400 ${compactMode ? 'mb-3 mt-5 text-[10px]' : 'mb-5 text-[11px]'} ${expanded ? 'mt-9' : ''}`}
        >
          Travel Checklist
        </h4>
        <button
          onClick={handleAddChecklistClick}
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 font-black uppercase tracking-wider text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 hover:border-white/20 hover:text-white hover:shadow-xl active:translate-y-0 ${compactMode ? 'mx-1 w-[calc(100%-8px)] px-2.5 py-3 text-[10px]' : 'w-full px-3 py-3.5 text-[11px]'}`}
        >
          <span className="text-[1.1rem] font-black">+</span>
          <span>Add Checklist Item</span>
        </button>
        {/* Display added checklists */}
        <div className={`grid gap-3 ${compactMode ? 'mt-3 gap-2.5' : 'mt-4'}`}>
          {userChecklists.map(item => (
            <div
              key={item.id}
              className={`relative w-full overflow-hidden rounded-xl border transition-all duration-300 ${item.completed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 bg-white/5 hover:bg-white/[0.07] hover:border-white/10 shadow-lg'}`}
            >
              <div className={`flex w-full items-center ${compactMode ? 'gap-2 px-2.5 py-2' : 'gap-3 px-3 py-2.5'}`}>
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => handleToggleChecklistItem(item.id)}
                  className={`shrink-0 cursor-pointer accent-[#667eea] ${compactMode ? 'h-4 w-4' : 'h-5 w-5'}`}
                />
                <span
                  className={`flex shrink-0 items-center justify-center rounded-xl border bg-black/20 ${compactMode ? 'h-8 w-8 text-[1.1rem]' : 'h-10 w-10 text-[1.5rem]'} ${item.completed ? 'border-emerald-500/30 text-emerald-400' : 'border-white/10 text-slate-300'}`}
                >
                  {item.icon}
                </span>
                <span className={`font-bold transition-all ${compactMode ? 'text-[0.8rem]' : 'text-[0.9rem]'} ${item.completed ? 'text-emerald-400/70 line-through' : 'text-slate-200'}`}>
                  {item.name}
                </span>
                <button
                  onClick={() => handleToggleExpand(item.id)}
                  className={`ml-auto flex shrink-0 cursor-pointer items-center justify-center bg-transparent px-2 py-1 text-slate-500 transition-all duration-300 hover:text-white ${expandedChecklistId === item.id ? 'rotate-180' : 'rotate-0'}`}
                  title="Add notes"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteChecklistItem(item.id)}
                  className="cursor-pointer bg-transparent px-2 py-1 text-[1.1rem] opacity-40 transition-all duration-200 hover:scale-110 hover:opacity-100 active:scale-95 grayscale"
                  title="Delete this checklist item"
                >
                  🗑️
                </button>
              </div>
              {expandedChecklistId === item.id && (
                <div className="w-full">
                  <textarea
                    className={`w-full resize-none border-0 border-t border-white/5 bg-black/30 p-3 font-inherit leading-[1.5] text-slate-200 placeholder:italic placeholder:text-slate-500 focus:bg-black/50 focus:outline-none focus:border-t-[#667eea] ${compactMode ? 'min-h-[60px] text-[0.8rem] p-2.5' : 'min-h-20 text-[0.85rem]'}`}
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
          className={`w-full rounded-xl border border-white/5 bg-white/5 transition-all duration-300 hover:border-white/10 shadow-2xl ${compactMode ? 'mt-6 p-3' : 'mt-8 p-4'}`}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h5 className={`m-0 flex items-center gap-2 font-black uppercase tracking-widest text-slate-400 ${compactMode ? 'text-[10px]' : 'text-[11px]'}`}>
              Template Management
            </h5>
            {userChecklists.length > 0 && (
              <button
                onClick={handleOpenSaveModal}
                className={`${templateActionBaseClass} bg-gradient-to-br from-emerald-500 to-emerald-600 px-3 py-1.5 text-white shadow-lg shadow-emerald-500/20 hover:-translate-y-px hover:shadow-emerald-500/40 ${compactMode ? 'text-[9px]' : 'text-[10px] uppercase tracking-wider'}`}
              >
                <span className="text-[1rem]">💾</span>
                <span>Save</span>
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
                    <span className={`block break-words font-black tracking-tight text-slate-200 ${compactMode ? 'text-[0.8rem]' : 'text-[0.9rem]'}`}>
                      {template.name}
                    </span>
                    <span className={`font-bold text-slate-500 ${compactMode ? 'text-[10px] uppercase tracking-widest' : 'text-[11px]'}`}>
                      {template.items.length} item{template.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      onClick={() => handleLoadTemplate(template)}
                      className={`${templateActionBaseClass} bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white shadow-lg shadow-indigo-500/20 hover:scale-105 hover:shadow-indigo-500/40 ${compactMode ? 'px-3 py-1.5 text-[10px]' : 'px-4 py-2 text-[10px] uppercase tracking-wider'}`}
                      title="Load this template"
                    >
                      📥 Load
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className={`${templateActionBaseClass} border border-white/10 bg-white/5 text-slate-500 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 ${compactMode ? 'px-2 py-1.5' : 'px-2.5 py-2'}`}
                      title="Delete this template"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="m-0 rounded-xl border border-dashed border-white/10 bg-black/20 p-5 text-center shadow-inner">
              <p className="m-0 text-[0.8rem] font-bold text-slate-500 uppercase tracking-widest">No saved templates</p>
            </div>
          )}

          {/* Preloaded Templates */}
          <div className={`mt-6 border-t border-white/5 pt-5 ${compactMode ? 'mt-5 pt-4' : ''}`}>
            <h5 className={`m-0 mb-4 flex items-center gap-2 font-black uppercase tracking-widest text-slate-500 ${compactMode ? 'text-[10px]' : 'text-[11px]'}`}>
              Quick Start Templates
            </h5>
            <div className={`grid grid-cols-2 ${compactMode ? 'gap-2' : 'gap-3'}`}>
              {preloadedTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleLoadPreloadedTemplate(template)}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 transition-all duration-300 hover:-translate-y-1 hover:border-[#667eea]/50 hover:bg-[#667eea]/10 hover:shadow-2xl hover:shadow-indigo-500/20 active:translate-y-0 ${compactMode ? 'px-2 py-3.5' : 'px-3 py-4'}`}
                  title={`Load ${template.name} template`}
                >
                  <span className={`${compactMode ? 'text-[1.4rem]' : 'text-[1.8rem]'}`}>{template.icon}</span>
                  <span className={`break-words text-center font-black leading-tight text-slate-300 tracking-tight ${compactMode ? 'text-[0.75rem]' : 'text-[0.85rem]'}`}>
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
        <div className="fixed inset-0 z-[3000] flex animate-in fade-in duration-300 items-center justify-center bg-black/80 backdrop-blur-xl" onClick={handleCloseModal}>
          <div className="w-[90%] max-w-[460px] animate-in slide-in-from-bottom-8 duration-300 overflow-hidden rounded-3xl bg-[#0a0f1e]/95 border border-white/10 shadow-2xl backdrop-blur-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-br from-[#667eea]/20 to-[#764ba2]/20 p-7 text-white">
              <h3 className="m-0 text-xl font-black tracking-tight">Add Checklist Item</h3>
              <button className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-white/5 border border-white/10 text-xl text-white transition-all duration-200 hover:bg-white/20 hover:rotate-90" onClick={handleCloseModal}>✕</button>
            </div>
            
            <div className="p-8">
              <div className="mb-6">
                <label htmlFor="checklist-name" className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-400">Item Name</label>
                <input
                  type="text"
                  id="checklist-name"
                  name="name"
                  placeholder="What do you need to bring?"
                  value={checklistForm.name}
                  onChange={handleFormChange}
                  className="box-border w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-[0.95rem] text-white transition-all duration-200 focus:bg-white/10 focus:border-[#667eea] focus:outline-none focus:shadow-[0_0_15px_rgba(102,126,234,0.2)]"
                />
              </div>

              <div className="mb-8">
                <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-400">Select Icon</label>
                <div className="grid grid-cols-6 gap-3">
                  {iconOptions.map(icon => (
                    <button
                      key={icon}
                      className={`aspect-square cursor-pointer rounded-xl border transition-all duration-200 flex items-center justify-center text-[1.5rem] hover:scale-110 ${checklistForm.icon === icon ? 'border-transparent bg-gradient-to-br from-[#667eea] to-[#764ba2] shadow-[0_4px_15px_rgba(102,126,234,0.4)] scale-110' : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10'}`}
                      onClick={() => handleIconSelect(icon)}
                      title={`Select ${icon}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="-mx-8 -mb-8 flex justify-end gap-3 border-t border-white/10 px-8 py-6 bg-black/20">
                <button onClick={handleCloseModal} className="px-6 py-3 rounded-xl border border-white/10 text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all">Cancel</button>
                <button onClick={handleAddChecklist} className="px-6 py-3 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all">Add Item</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveChecklistModal && (
        <div className="fixed inset-0 z-[3000] flex animate-in fade-in duration-300 items-center justify-center bg-black/80 backdrop-blur-xl" onClick={handleCloseSaveModal}>
          <div className="w-[90%] max-w-[460px] animate-in slide-in-from-bottom-8 duration-300 overflow-hidden rounded-3xl bg-[#0a0f1e]/95 border border-white/10 shadow-2xl backdrop-blur-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-br from-[#667eea]/20 to-[#764ba2]/20 p-7 text-white">
              <h3 className="m-0 text-xl font-black tracking-tight">Save Template</h3>
              <button className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-white/5 border border-white/10 text-xl text-white transition-all duration-200 hover:bg-white/20 hover:rotate-90" onClick={handleCloseSaveModal}>✕</button>
            </div>
            
            <div className="p-8">
              <div className="mb-6">
                <label htmlFor="template-name" className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-400">Template Name</label>
                <input
                  type="text"
                  id="template-name"
                  placeholder="e.g., 'Beach Trip Essentials'"
                  value={saveChecklistName}
                  onChange={(e) => setSaveChecklistName(e.target.value)}
                  className="box-border w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-[0.95rem] text-white transition-all duration-200 focus:bg-white/10 focus:border-[#667eea] focus:outline-none focus:shadow-[0_0_15px_rgba(102,126,234,0.2)]"
                />
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <p className="m-0 mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Preview: {userChecklists.length} items</p>
                <div className="grid gap-2">
                  {userChecklists.slice(0, 3).map(item => (
                    <div key={item.id} className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="shrink-0">{item.icon}</span>
                      <span className="truncate">{item.name}</span>
                    </div>
                  ))}
                  {userChecklists.length > 3 && (
                    <p className="m-0 text-xs text-slate-500 italic mt-1">+ {userChecklists.length - 3} more items...</p>
                  )}
                </div>
              </div>

              <div className="-mx-8 -mb-8 mt-8 flex justify-end gap-3 border-t border-white/10 px-8 py-6 bg-black/20">
                <button onClick={handleCloseSaveModal} className="px-6 py-3 rounded-xl border border-white/10 text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all">Cancel</button>
                <button onClick={handleSaveChecklist} className="px-6 py-3 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all">Save Template</button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default UserProfile;