import React from 'react';
import './CSRNet.css';

const CSRNet = () => {
  return (
    <div className="density-mapping-container">
      <h3 className="density-title">CSRNET Density Mapping</h3>
      <div className="density-placeholder">
        <div className="density-info">
          <svg viewBox="0 0 24 24" fill="currentColor" className="density-icon">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
          </svg>
          <p>Crowd density visualization</p>
          <p className="density-subtitle">Real-time heatmap analysis coming soon</p>
        </div>
      </div>
    </div>
  );
};

export default CSRNet;
