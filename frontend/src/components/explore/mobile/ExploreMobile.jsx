import React from 'react';

const ExploreMobile = ({ onNavigate, onViewLiveFeed, userProfile, locations, isLoading, isStale, lastUpdated }) => {
  return (
    <div className="min-h-[calc(100dvh-100px)] bg-[#0a0f1e] text-white flex items-center justify-center p-6 text-center">
      <div>
        <h2 className="mb-4 text-2xl font-black bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
          Mobile Explore View
        </h2>
        <p className="text-sm text-slate-400">
          This is a placeholder wrapper. We will build the Netflix pattern here next!
        </p>
      </div>
    </div>
  );
};

export default ExploreMobile;
