import React, { useState } from 'react';
import LoginButton from '../profile/LoginButton'; // New import para sa login button
import { Map, Compass, Globe, User, Video } from 'lucide-react';

// Simple hamburger icon
const MenuIcon = ({ open }) => (
  <div className="flex flex-col justify-center items-center w-8 h-8 cursor-pointer">
    <span className={`block h-0.5 w-6 bg-white rounded transition-all duration-300 ${open ? 'rotate-45 translate-y-2' : ''}`}></span>
    <span className={`block h-0.5 w-6 bg-white rounded transition-all duration-300 my-1 ${open ? 'opacity-0' : ''}`}></span>
    <span className={`block h-0.5 w-6 bg-white rounded transition-all duration-300 ${open ? '-rotate-45 -translate-y-2' : ''}`}></span>
  </div>
);


const Navbar = ({ currentPage, onNavigate, currentUser }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuItems = [
    { id: 'map', label: 'Interactive Map', Icon: Map },
    { id: 'explore', label: 'Explore', Icon: Compass },
    { id: 'liveview', label: 'Live View', Icon: Video },
    { id: 'community', label: 'Community', Icon: Globe },
    { id: 'profile', label: 'My Travels', Icon: User }
  ];

  // Offcanvas menu for mobile
  const OffcanvasMenu = () => (
    <div
      className={`fixed top-0 left-0 z-[2000] h-full w-64 bg-gradient-to-br from-[#667eea] to-[#764ba2] shadow-lg transform transition-transform duration-300 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
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
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-white transition-colors duration-150 ${
              currentPage === item.id ? 'bg-white/20' : 'hover:bg-white/10'
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
        <div className="mt-4">
          <LoginButton currentUser={currentUser} onNavigate={onNavigate} />
        </div>
      </nav>
    </div>
  );

  // Overlay for offcanvas
  const Overlay = () => (
    <div
      className={`fixed inset-0 z-[1500] bg-black/40 transition-opacity duration-300 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      onClick={() => setMenuOpen(false)}
      aria-hidden="true"
    />
  );

  return (
    <nav className="fixed top-0 left-0 w-full z-[1000] border-b border-white/5 bg-gradient-to-br from-[#667eea] to-[#764ba2] py-2.5">
      {menuOpen && <Overlay />}
      {menuOpen && <OffcanvasMenu />}
      <div className="mt-4 mb-4 mx-5 animate-slideDown md:mr-8">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 md:gap-4">
          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
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
            <h1 className="m-0 text-base font-bold text-white sm:text-lg md:text-xl">
              Landscapes
            </h1>
          </div>
          {/* Desktop menu */}
          <div className="hidden md:block min-w-0" role="navigation" aria-label="Main navigation">
            <div className="flex justify-center gap-2 px-1">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-[10px] border-none px-3 py-2 text-sm font-semibold text-white backdrop-blur-[6px] transition-[color,background-color,transform,box-shadow] duration-200 ease-out after:absolute after:-bottom-1.5 after:left-2.5 after:right-2.5 after:h-[3px] after:rounded-[3px] after:transition-[background,transform] after:duration-200 ${
                    currentPage === item.id
                      ? 'bg-white !text-[#667EEA] shadow-[0_10px_26px_rgba(102,126,234,0.18)] after:bg-white/20'
                      : 'bg-white/10 hover:-translate-y-0.5 hover:bg-white/20 hover:text-white hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)] after:bg-transparent'
                  }`}
                  onClick={() => onNavigate(item.id)}
                  aria-current={currentPage === item.id ? 'page' : undefined}
                  title={item.label}
                >
                  {item.Icon && (
                    <span className="inline-flex items-center justify-center text-current" aria-hidden>
                      <item.Icon size={16} />
                    </span>
                  )}
                  <span className="inline-block overflow-hidden text-ellipsis whitespace-nowrap tracking-[0.2px]">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {/* Desktop login button */}
          <div className="hidden md:flex items-center justify-end">
            <LoginButton currentUser={currentUser} onNavigate={onNavigate} />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
