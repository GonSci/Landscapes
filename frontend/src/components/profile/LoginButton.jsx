import React, { useState } from 'react';
import AuthModal from './AuthModal';
import { User } from 'lucide-react';

function LoginButton({ currentUser, onNavigate, onLogin, currentPage }) {
    const [showAuthModal, setShowAuthModal] = useState(false);
    
    // Function para mahandle yung Logout
    const handleLogout = () => {
        // Just clear the local state/localStorage
        if (window.confirm("Are you sure you want to log out?")) {
            localStorage.removeItem('travel_user');
            window.location.reload();
        }
    };

    const handleLoginSuccess = (user) => {
        setShowAuthModal(false);
        if (onLogin) onLogin(user);
    };

    return (
        <div className="flex items-center gap-3">
            {showAuthModal && (
                <AuthModal 
                    onClose={() => setShowAuthModal(false)} 
                    onLoginSuccess={handleLoginSuccess}
                />
            )}

            {currentUser ? (
                <div className="flex items-center gap-1">
                    <button
                        className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 transition-all duration-500 ${
                            currentPage === 'profile' 
                            ? 'border-[#667eea] shadow-[0_0_20px_rgba(102,126,234,0.6)] scale-110' 
                            : 'border-white/10 bg-white/5 hover:border-[#667eea]/50 hover:shadow-[0_0_15px_rgba(102,126,234,0.3)]'
                        }`}
                        title="Profile"
                        onClick={() => onNavigate && onNavigate('profile')}
                    >
                        <img
                            src={currentUser.photoURL || 'https://via.placeholder.com/32'}
                            alt="Profile"
                            className="h-full w-full rounded-full object-cover"
                        />
                    </button>
                    <button
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-white/5 bg-white/5 text-red-500/80 transition-all duration-300 hover:bg-red-500/10 hover:text-red-500 hover:scale-110"
                        onClick={handleLogout}
                        title="Logout"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setShowAuthModal(true)}
                    className="group relative inline-flex items-center gap-3 overflow-hidden whitespace-nowrap rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-[10px] font-black uppercase tracking-[2px] text-slate-300 transition-all duration-500 hover:border-[#667eea]/50 hover:bg-white/[0.08] hover:text-white hover:shadow-[0_0_20px_rgba(102,126,234,0.2)]"
                >
                    <User size={14} className="text-[#667eea] group-hover:scale-110 transition-transform duration-300" strokeWidth={3} />
                    <span>Login or Signup</span>
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full"></div>
                </button>
            )}
        </div>
    );
}

export default LoginButton;