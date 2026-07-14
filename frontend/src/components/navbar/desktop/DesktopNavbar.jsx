import React from 'react';
import LoginButton from '../../profile/LoginButton';
import { Map, Compass, LayoutDashboard, Settings } from 'lucide-react';

const DesktopNavbar = ({ currentPage, onNavigate, currentUser, onLogin }) => {
  const menuItems = [
    { id: 'map', label: 'Interactive Map', Icon: Map },
    { id: 'explore', label: 'Explore', Icon: Compass },
    { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-[1000] border-b border-white/5 bg-[#0a0f1e]/90 backdrop-blur-2xl py-3 shadow-2xl">
      <div className="mt-4 mb-4 mx-5 animate-slideDown md:mr-8">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
          {/* Logo */}
          <div
            className="cursor-pointer col-span-1"
            onClick={() => onNavigate('home')}
          >
            <h1 className="m-0 text-xl font-bold text-white">
              Landscapes
            </h1>
          </div>
          {/* Desktop menu */}
          <div className="block min-w-0" role="navigation" aria-label="Main navigation">
            <div className="flex justify-center gap-3 px-1">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`relative inline-flex items-center gap-2 whitespace-nowrap rounded-xl border-none px-4 py-2.5 text-sm font-black transition-all duration-300 ease-out ${
                    currentPage === item.id
                      ? 'bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white shadow-[0_4px_20px_rgba(102,126,234,0.4)] scale-[1.02]'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white hover:-translate-y-0.5'
                  }`}
                  onClick={() => onNavigate(item.id)}
                  aria-current={currentPage === item.id ? 'page' : undefined}
                  title={item.label}
                >
                  {item.Icon && (
                    <span className="inline-flex items-center justify-center text-current" aria-hidden>
                      <item.Icon size={16} strokeWidth={2.5} />
                    </span>
                  )}
                  <span className="inline-block overflow-hidden text-ellipsis whitespace-nowrap tracking-wide uppercase text-[11px]">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {/* Desktop login button + admin gear */}
          <div className="flex items-center justify-end gap-2">
            {currentUser?.is_admin && (
              <button
                onClick={() => onNavigate('admin')}
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 ${
                  currentPage === 'admin'
                    ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:border-indigo-500/30 hover:bg-indigo-500/10 hover:text-indigo-300'
                }`}
                title="Admin Dashboard"
              >
                <Settings size={16} strokeWidth={2.5} />
              </button>
            )}
            <LoginButton currentUser={currentUser} onNavigate={onNavigate} onLogin={onLogin} currentPage={currentPage} />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DesktopNavbar;
