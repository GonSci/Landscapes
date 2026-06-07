import React from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

// Import Mobile Views
import DashboardMobile from './mobile/DashboardMobile';
import LiveViewMobile from './mobile/LiveViewMobile';
import RedirectionMobile from './mobile/RedirectionMobile';
import BarChartMobile from './mobile/BarChartMobile';
import DonutChartMobile from './mobile/DonutChartMobile';

// Import Desktop Views
import DashboardDesktop from './desktop/DashboardDesktop';
import LiveViewDesktop from './desktop/LiveViewDesktop';
import RedirectionDesktop from './desktop/RedirectionDesktop';
import BarChartDesktop from './desktop/BarChartDesktop';
import DonutChartDesktop from './desktop/DonutChartDesktop';

export const Dashboard = (props) => {
  const isMobile = useIsMobile();
  return isMobile ? <DashboardMobile {...props} /> : <DashboardDesktop {...props} />;
};

export const LiveView = (props) => {
  const isMobile = useIsMobile();
  return isMobile ? <LiveViewMobile {...props} /> : <LiveViewDesktop {...props} />;
};

export const Redirection = (props) => {
  const isMobile = useIsMobile();
  return isMobile ? <RedirectionMobile {...props} /> : <RedirectionDesktop {...props} />;
};

export const BarChart = (props) => {
  const isMobile = useIsMobile();
  return isMobile ? <BarChartMobile {...props} /> : <BarChartDesktop {...props} />;
};

export const DonutChart = (props) => {
  const isMobile = useIsMobile();
  return isMobile ? <DonutChartMobile {...props} /> : <DonutChartDesktop {...props} />;
};

export default Dashboard;
