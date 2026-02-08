import React, { useState, useEffect } from 'react';
import './App.css';
import Navbar from './components/navbar/Navbar';
import PhilippinesMap from './components/map/PhilippinesMap';
import AIAssistant from './components/ai/AIAssistant';
import UserProfile from './components/profile/UserProfile';
import LocationModal from './components/map/LocationModal';
import ExploreSection from './components/explore/ExploreSection';
import FloatingAIButton from './components/ai/FloatingAIButton';
import CommunityFeed from './components/community/CommunityFeed';
import Home from './components/landingPage/Home';

// --> Firebase Imports <-- //
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

function App() {
  const getInitialPage = () => {
    const hash = window.location.hash.replace('#', '');
    return hash || 'home';
  };

  const [currentPage, setCurrentPage] = useState(getInitialPage());
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [userProfile, setUserProfile] = useState({
    beenThere: [],
    wantToGo: [],
    checklists: [], 
    savedTemplates: [],
    lastPreloadedTemplateId: null
  });
  const [showAIChat, setShowAIChat] = useState(false);
  const [focusLocation, setFocusLocation] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data());
          } else {
            const newProfile = {
              beenThere: [],
              wantToGo: [],
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
        } catch (error) {
          console.error("Error fetching or creating user profile:", error);
        }
      } else {
        setUserProfile({
          beenThere: [],
          wantToGo: [],
          checklists: [],
          savedTemplates: [],
          lastPreloadedTemplateId: null
        });
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []); 

  const saveProfileToFirebase = async (newProfile) => {
    if (currentUser) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);

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

  const handleLocationClick = (location) => {
    setSelectedLocation(location);
    setShowModal(true);
    if (currentPage === 'explore') {
      setCurrentPage('map');
    }
  };

  const handleMarkLocation = async (location, type) => {
    const newProfile = { ...userProfile };
    const locationId = location?.id || selectedLocation?.id;
    
    if (!locationId) return;
    
    if (type === 'been') {
      if (!newProfile.beenThere.includes(locationId)) {
        newProfile.beenThere.push(locationId);
        newProfile.wantToGo = newProfile.wantToGo.filter(id => id !== locationId);
      }
    } else if (type === 'want') {
      if (!newProfile.wantToGo.includes(locationId)) {
        newProfile.wantToGo.push(locationId);
      }
    }
    
    setUserProfile(newProfile);
    await saveProfileToFirebase(newProfile);
    
    if (!location) {
      setShowModal(false);
    }
  };

  const handleAskAI = () => {
    setShowAIChat(true);
    setShowModal(false);
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
    window.location.hash = page;
    setShowAIChat(false);
  };

  const toggleAIChat = () => {
    setShowAIChat(!showAIChat);
  };

  const handleViewOnMap = (location) => {
    setCurrentPage('map');
    setFocusLocation(location);
    setShowModal(false);
    setTimeout(() => setFocusLocation(null), 3000);
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
      />

      <div className="app-content">
        {currentPage === 'home' && (
          <div className="page home-page">
            <Home onNavigate={handleNavigate} currentUser={currentUser} />
          </div>
        )}

        {currentPage === 'map' && (
          <div className="page map-page">
            <div className="map-layout">
              <div className="map-sidebar">
                <UserProfile 
                  profile={userProfile}
                  onToggleAI={() => setShowAIChat(!showAIChat)}
                  compactMode={true}
                  currentUser={currentUser}
                />
              </div>

              <div className="map-main">
                <PhilippinesMap
                  onLocationClick={handleLocationClick}
                  userProfile={userProfile}
                  focusLocation={focusLocation}
                />
              </div>
            </div>
          </div>
        )}

        {currentPage === 'explore' && (
          <div className="page explore-page">
            <ExploreSection 
              onLocationClick={handleLocationClick}
              onMarkLocation={handleMarkLocation}
              userProfile={userProfile}
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

        {currentPage === 'community' && (
          <div className="page community-page">
            <CommunityFeed currentUser={currentUser} />
          </div>
        )}
      </div>

      {showModal && (
        <LocationModal
          location={selectedLocation}
          onClose={() => setShowModal(false)}
          onMarkBeen={() => handleMarkLocation(null, 'been')}
          onMarkWant={() => handleMarkLocation(null, 'want')}
          onAskAI={handleAskAI}
        />
      )}

      <FloatingAIButton onClick={toggleAIChat} isActive={showAIChat} />

      {showAIChat && (
        <div className="ai-overlay" onClick={() => setShowAIChat(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <AIAssistant
              selectedLocation={selectedLocation}
              onClose={() => setShowAIChat(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;