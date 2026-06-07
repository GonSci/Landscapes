import React from 'react';
import LoginButton from '../../profile/LoginButton';
import { Map, Compass, LayoutDashboard } from 'lucide-react';

const MobileNavbar = ({ currentPage, onNavigate, currentUser, onLogin }) => {
  const menuItems = [
    { id: 'explore', label: 'Explore', Icon: Compass },
    { id: 'map', label: 'Interactive Map', Icon: Map },
    { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  ];

  return (
    <>
      {/* Top Header */}
      <nav className={`fixed top-0 left-0 w-full z-[1000] py-4 transition-all duration-300 ${(currentPage === 'map' || currentPage === 'dashboard') ? 'bg-transparent border-transparent shadow-none' : 'border-b border-white/5 bg-[#0a0f1e]/90 backdrop-blur-2xl shadow-2xl'}`}>
        <div className="mx-5 flex items-center justify-between">
          <div
            className="cursor-pointer flex items-center"
            onClick={() => onNavigate('home')}
          >
            <h1 className="m-0 text-xl font-bold text-white tracking-wide">
              Landscapes
            </h1>
          </div>
          <div>
            <LoginButton currentUser={currentUser} onNavigate={onNavigate} onLogin={onLogin} currentPage={currentPage} />
          </div>
        </div>
      </nav>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 w-full z-[2000] bg-[#0a0f1e]/95 backdrop-blur-xl border-t border-white/10 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-3 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex justify-around items-center px-2">
          {menuItems.map(item => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="flex flex-1 flex-col items-center justify-center h-[54px] text-slate-400 hover:text-white transition-colors duration-300 focus:outline-none"
                aria-current={isActive ? 'page' : undefined}
                title={item.label}
              >
                <div className={`flex flex-col items-center justify-center transition-all duration-300 w-[110px] h-[46px] rounded-full ${
                  isActive 
                    ? 'bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white shadow-lg shadow-indigo-500/20' 
                    : 'bg-transparent'
                }`}>
                  <item.Icon size={isActive ? 20 : 18} strokeWidth={isActive ? 2.5 : 2} className="mb-1" />
                  <span className="text-[9px] font-semibold tracking-wide whitespace-nowrap">
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default MobileNavbar;
