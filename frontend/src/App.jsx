import React, { useState, useEffect } from 'react';
import './App.css';
import Navbar from './components/navbar/Navbar';
import PhilippinesMap from './components/map/PhilippinesMap';
import UserProfile from './components/profile/UserProfile';

import ExploreSection from './components/explore/ExploreSection';
import Home from './components/landingPage/Home';
import Dashboard from './components/dashboard/Dashboard';
import MapSidebar from './components/map/MapSidebar';

import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

function App() {
  const getInitialPage = () => {
    const hash = window.location.hash.replace('#', '');
    return hash || 'map';
  };

  const [currentPage, setCurrentPage] = useState(getInitialPage());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [userProfile, setUserProfile] = useState({
    checklists: [], 
    savedTemplates: [],
    lastPreloadedTemplateId: null
  });
  const [focusLocation, setFocusLocation] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardTargetId, setDashboardTargetId] = useState(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedUser = localStorage.getItem('travel_user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setCurrentUser(user);
          
          // Only fetch preferences from Firebase using the email or uid
          // We assume Firebase is still used for saving user profile configs like checklists for now,
          // OR we could store it locally. For now, let's keep the existing logic but use user.uid
          const uid = user.uid || user.id || user.email;
          const userDocRef = doc(db, 'users', uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data());
          } else {
            const newProfile = {
              checklists: [],
              savedTemplates: [],
              lastPreloadedTemplateId: null,
              email: user.email,
              displayName: user.displayName || 'Traveler',
              photoURL: user.photoURL || '',
              createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
          }
        } else {
          setUserProfile({
            checklists: [],
            savedTemplates: [],
            lastPreloadedTemplateId: null
          });
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
  }, []); 

  const handleLogin = (user) => {
    localStorage.setItem('travel_user', JSON.stringify(user));
    setCurrentUser(user);
    window.location.reload();
  };

  const saveProfileToFirebase = async (newProfile) => {
    if (currentUser) {
      try {
        const uid = currentUser.uid || currentUser.id || currentUser.email;
        const userDocRef = doc(db, 'users', uid);

        await setDoc(userDocRef, {
          ...newProfile,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        console.log('Profile saved to Firebase!')

      } catch (error) {
        console.error("Error saving user profile:", error);
      }
    } else {
      console.log('No user logged in, data not saved')
    }
  };





  const handleNavigate = (page) => {
    setCurrentPage(page);
    window.location.hash = page;
  };



  const handleSidebarItemClick = (location) => {
    // Append a timestamp so React always sees this as a new object, forcing the map to react on every click
    setFocusLocation({ ...location, t: Date.now() });
  };

  const handleViewLiveFeed = (locationId) => {
    setDashboardTargetId(locationId);
    handleNavigate('dashboard');
  };

  if (loading) {
    return (
      <div className="App loading-screen">
        <div className="plane-icon">✈️</div>
        <div className="app-title">Landscapes</div>
        <div className="loading-text">Loading your travel journey...</div>
        <div className="loading-dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onLogin={handleLogin}
      />

      {/* Add padding-top to offset fixed navbar (approx 72px) */}
      <div className="app-content pt-[72px]">
        {currentPage === 'home' && (
          <div className="page home-page">
            <Home onNavigate={handleNavigate} currentUser={currentUser} />
          </div>
        )}

        {currentPage === 'map' && (
          <div className="page map-page">
            <div className="map-layout">
              {isSidebarOpen ? (
                <div className="map-sidebar p-0">
                  <MapSidebar 
                    userProfile={userProfile}
                    currentUser={currentUser}
                    onLocationClick={handleSidebarItemClick}
                    onSidebarToggle={() => setIsSidebarOpen(false)}
                  />
                </div>
              ) : (
                <div className="w-[56px] shrink-0 bg-slate-900/40 backdrop-blur-md border-r border-white/10 h-full hidden lg:flex flex-col items-center py-4 z-10 shadow-sm relative">
                  <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Expand Sidebar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <div className="mt-8 text-slate-500 rotate-180 uppercase tracking-widest text-[10px] font-bold" style={{ writingMode: 'vertical-rl' }}>
                    Explore Baguio
                  </div>
                </div>
              )}

              <div className="map-main relative">
                {/* Mobile-only floating toggle button */}
                {!isSidebarOpen && (
                  <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="flex lg:hidden absolute top-4 left-4 z-[400] bg-slate-900/80 backdrop-blur-md p-2.5 rounded-xl shadow-xl hover:bg-slate-800 transition-colors border border-white/10 cursor-pointer items-center justify-center text-white"
                    title="Expand Sidebar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
                
                <PhilippinesMap
                  userProfile={userProfile}
                  focusLocation={focusLocation}
                  isSidebarOpen={isSidebarOpen}
                  onViewLiveFeed={handleViewLiveFeed}
                />
              </div>
            </div>
          </div>
        )}

        {currentPage === 'explore' && (
          <div className="page explore-page">
            <ExploreSection 
              onNavigate={handleNavigate}
              userProfile={userProfile}
              onViewLiveFeed={handleViewLiveFeed}
            />
          </div>
        )}

        {currentPage === 'profile' && (
          <div className="page profile-page">
            <div className="profile-container">
              <UserProfile 
                profile={userProfile}
                onToggleAI={() => setShowAIChat(!showAIChat)}
                expanded={true}
                currentUser={currentUser}
              />
            </div>
          </div>
        )}



        {currentPage === 'dashboard' && (
          <div className="page dashboard-page">
            <Dashboard 
              targetLocationId={dashboardTargetId} 
              clearTargetLocation={() => setDashboardTargetId(null)}
            />
          </div>
        )}
      </div>


    </div>
  );
}

export default App;