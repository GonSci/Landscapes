import React, { useState } from 'react';
import AuthModal from './AuthModal';
import { User } from 'lucide-react';

function LoginButton({ currentUser, onNavigate, onLogin }) {
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
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 m-0 shadow-[0_1px_4px_rgba(102,126,234,0.10)] transition-[box-shadow,transform] duration-200 hover:scale-[1.08] hover:shadow-[0_4px_12px_rgba(102,126,234,0.18)] focus:scale-[1.08] focus:shadow-[0_4px_12px_rgba(102,126,234,0.18)] focus:outline-none"
                        title="Profile"
                        onClick={() => onNavigate && onNavigate('profile')}
                    >
                        <img
                            src={currentUser.photoURL || 'https://via.placeholder.com/32'}
                            alt="Profile"
                            className="h-8 w-8 rounded-full border-2 border-[#667eea] bg-slate-100 object-cover"
                        />
                    </button>
                    <button
                        className="m-0 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 pl-0.5 transition-[background,box-shadow,transform] duration-150 hover:scale-[1.12] hover:bg-[#ffeaea] hover:shadow-[0_2px_8px_rgba(229,62,62,0.13)] focus:scale-[1.12] focus:bg-[#ffeaea] focus:shadow-[0_2px_8px_rgba(229,62,62,0.13)] focus:outline-none"
                        onClick={handleLogout}
                        title="Logout"
                    >
                        {/* Universal logout icon */}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M16 17L21 12L16 7" stroke="#e53e3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M21 12H9" stroke="#e53e3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 19C7.58172 19 4 15.4183 4 11C4 6.58172 7.58172 3 12 3C13.6569 3 15.1566 3.63214 16.2426 4.75736" stroke="#a0aec0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setShowAuthModal(true)}
                    className="relative inline-flex items-center gap-0 overflow-hidden whitespace-nowrap rounded-2xl border border-solid border-[#e2e8f0] bg-white px-4 py-1.5 text-xs font-semibold leading-none tracking-[-0.01em] text-[#222] shadow-[0_2px_8px_0_rgba(102,126,234,0.10)] transition-[box-shadow,transform,background,color,border-color] duration-200 hover:translate-y-[-1px] hover:scale-[1.04] hover:border-[#667eea] hover:bg-slate-100 hover:text-[#222] hover:shadow-[0_6px_20px_0_rgba(102,126,234,0.13)] focus:outline-none"
                >
                    <User size={16} className="mr-2 text-[#667eea]" />
                    Login or Signup
                </button>
            )}
        </div>
    );
}

export default LoginButton;