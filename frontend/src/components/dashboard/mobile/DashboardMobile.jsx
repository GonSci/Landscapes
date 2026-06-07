import React, { useState } from 'react';
import LiveViewMobile from './LiveViewMobile';
import RedirectionMobile from './RedirectionMobile';

const DashboardMobile = ({ targetLocationId, clearTargetLocation }) => {
  const [activeTab, setActiveTab] = useState('live');

  return (
    <>
      {activeTab === 'live' ? (
        <LiveViewMobile 
          onTabChange={setActiveTab} 
          targetLocationId={targetLocationId} 
          clearTargetLocation={clearTargetLocation}
        />
      ) : (
        <RedirectionMobile 
          onTabChange={setActiveTab} 
        />
      )}
    </>
  );
};

export default DashboardMobile;
