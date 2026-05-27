import React, { useState } from 'react';
import LoginButton from '../../profile/LoginButton';
import { Map, Compass, LayoutDashboard } from 'lucide-react';

const MenuIcon = ({ open }) => (
  <div className="flex flex-col justify-center items-center w-8 h-8 cursor-pointer">
    <span className={`block h-0.5 w-6 bg-white rounded transition-all duration-300 ${open ? 'rotate-45 translate-y-2' : ''}`}></span>
    <span className={`block h-0.5 w-6 bg-white rounded transition-all duration-300 my-1 ${open ? 'opacity-0' : ''}`}></span>
    <span className={`block h-0.5 w-6 bg-white rounded transition-all duration-300 ${open ? '-rotate-45 -translate-y-2' : ''}`}></span>
  </div>
);

const MobileNavbar = ({ currentPage, onNavigate, currentUser, onLogin }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuItems = [
    { id: 'map', label: 'Interactive Map', Icon: Map },
    { id: 'explore', label: 'Explore', Icon: Compass },
    { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  ];

  const OffcanvasMenu = () => (
    <div
      className={`fixed top-0 left-0 z-[2000] h-full w-64 bg-[#0a0f1e]/95 backdrop-blur-3xl shadow-2xl transform transition-transform duration-300 border-r border-white/5 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      style={{ willChange: 'transform' }}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <span className="text-lg font-bold text-white">Menu</span>
        <button
          className="text-white text-2xl focus:outline-none"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
        >
          &times;
        </button>
      </div>
      <nav className="flex flex-col gap-2 px-4 py-4">
        {menuItems.map(item => (
          <button
            key={item.id}
            type="button"
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 ${
              currentPage === item.id ? 'bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
            onClick={() => {
              setMenuOpen(false);
              onNavigate(item.id);
            }}
            aria-current={currentPage === item.id ? 'page' : undefined}
            title={item.label}
          >
            {item.Icon && <item.Icon size={18} />}
            <span>{item.label}</span>
          </button>
        ))}
        <div className="mt-6 pt-6 border-t border-white/5">
          <LoginButton currentUser={currentUser} onNavigate={onNavigate} onLogin={onLogin} currentPage={currentPage} />
        </div>
      </nav>
    </div>
  );

  const Overlay = () => (
    <div
      className={`fixed inset-0 z-[1500] bg-black/40 transition-opacity duration-300 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      onClick={() => setMenuOpen(false)}
      aria-hidden="true"
    />
  );

  return (
    <nav className="fixed top-0 left-0 w-full z-[1000] border-b border-white/5 bg-[#0a0f1e]/90 backdrop-blur-2xl py-3 shadow-2xl">
      {menuOpen && <Overlay />}
      {menuOpen && <OffcanvasMenu />}
      <div className="mt-4 mb-4 mx-5 animate-slideDown">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          {/* Mobile menu button */}
          <div className="flex items-center">
            <button
              className="mr-2 focus:outline-none"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
          {/* Logo */}
          <div
            className="cursor-pointer col-span-1"
            onClick={() => onNavigate('home')}
          >
            <h1 className="m-0 text-base font-bold text-white sm:text-lg">
              Landscapes
            </h1>
          </div>
          <div></div>
        </div>
      </div>
    </nav>
  );
};

export default MobileNavbar;
