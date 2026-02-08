import React from 'react';
import './FloatingAIButton.css';

const FloatingAIButton = ({ onClick, isActive }) => {
  return (
    <button 
      className={`floating-ai-button ${isActive ? 'active' : ''}`} 
      onClick={onClick} 
      aria-label={isActive ? "Close AI Assistant" : "Open AI Assistant"}
    >
      <div className="ai-icon">
        {!isActive && <span className="robot-emoji">🤖</span>}
        {isActive && <span className="close-icon">✕</span>}
      </div>
      {!isActive && <div className="ai-pulse"></div>}
    </button>
  );
};

export default FloatingAIButton;
