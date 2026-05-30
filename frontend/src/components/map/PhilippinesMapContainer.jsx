import React, { useState, useEffect } from 'react';
import DesktopPhilippinesMap from './desktop/DesktopPhilippinesMap';
import MobilePhilippinesMap from './mobile/MobilePhilippinesMap';

const PhilippinesMapContainer = (props) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check on mount
    checkIsMobile();

    // Add event listener
    window.addEventListener('resize', checkIsMobile);

    // Clean up
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  if (isMobile) {
    return <MobilePhilippinesMap {...props} />;
  }

  return <DesktopPhilippinesMap {...props} />;
};

export default PhilippinesMapContainer;
