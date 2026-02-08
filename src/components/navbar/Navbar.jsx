import React from 'react';
import './Navbar.css';
import LoginButton from '../profile/LoginButton'; // New import para sa login button
import { Map, Compass, Globe, User } from 'lucide-react';

const Navbar = ({ currentPage, onNavigate, currentUser }) => { // Added currentUser prop
  const menuItems = [
    { id: 'map', label: 'Interactive Map', Icon: Map },
    { id: 'explore', label: 'Explore', Icon: Compass },
    { id: 'community', label: 'Community', Icon: Globe },
    { id: 'profile', label: 'My Travels', Icon: User }
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand" onClick={() => onNavigate('home')} style={{ cursor: 'pointer' }}>
          <h1>Landscapes</h1>
        </div>
        
        <div className="navbar-menu" role="navigation" aria-label="Main navigation">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
              aria-current={currentPage === item.id ? 'page' : undefined}
              title={item.label}
            >
              {item.Icon && (
                <span className="nav-icon" aria-hidden>
                  <item.Icon />
                </span>
              )}
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>
        
        <div className="nav-auth">
          <LoginButton currentUser={currentUser} onNavigate={onNavigate} />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
