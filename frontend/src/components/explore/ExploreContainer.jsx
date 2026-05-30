import React from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useLiveLocations } from '../../hooks/useLiveLocations';
import ExploreDesktop from './desktop/ExploreDesktop';
import ExploreMobile from './mobile/ExploreMobile';

const ExploreContainer = ({ onNavigate, onViewLiveFeed, userProfile }) => {
  const isMobile = useIsMobile(768); // Using 768px for standard md breakpoint
  const { locations, isLoading, isStale, lastUpdated } = useLiveLocations();

  const commonProps = {
    onNavigate,
    onViewLiveFeed,
    userProfile,
    locations,
    isLoading,
    isStale,
    lastUpdated
  };

  return isMobile ? <ExploreMobile {...commonProps} /> : <ExploreDesktop {...commonProps} />;
};

export default ExploreContainer;
