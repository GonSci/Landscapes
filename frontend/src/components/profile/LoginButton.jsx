import React from 'react';
import { auth } from '../../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth'; // ⭐ FIXED: was "signInwithPopup"

function LoginButton({ currentUser, onNavigate }) {
    
    // Function para mahandle yung Google Login
    const handleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider); // ⭐ FIXED: capital W
            console.log("User logged in:", result.user);
            // Force reload after login to ensure all user data is shown
            setTimeout(() => {
                window.location.reload();
            }, 200);
        } catch (error) {
            console.error("Error during login:", error);
            alert("Login failed: " + error.message);
        }
    };


    // Function para mahandle yung Logout
    const handleLogout = async () => {
        try {
            await signOut(auth);
            console.log("Logged out successfully");
        } catch (error) {
            console.error('Logout error:', error.message);
        }
    };


    return (
        <div className="flex items-center gap-3">
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
                        {/* Universal logout icon: arrow out of a door, colored red */}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M16 17L21 12L16 7" stroke="#e53e3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M21 12H9" stroke="#e53e3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 19C7.58172 19 4 15.4183 4 11C4 6.58172 7.58172 3 12 3C13.6569 3 15.1566 3.63214 16.2426 4.75736" stroke="#a0aec0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                </div>
            ) : (
                // Show if the user is not logged in
                <button
                    onClick={handleLogin}
                    className="relative inline-flex items-center gap-0 overflow-hidden whitespace-nowrap rounded-2xl border border-solid border-[#e2e8f0] bg-white px-[14px] py-1 pl-2 text-xs font-semibold leading-none tracking-[-0.01em] text-[#222] shadow-[0_2px_8px_0_rgba(102,126,234,0.10)] transition-[box-shadow,transform,background,color,border-color] duration-200 hover:translate-y-[-1px] hover:scale-[1.04] hover:border-[#667eea] hover:bg-slate-100 hover:text-[#222] hover:shadow-[0_6px_20px_0_rgba(102,126,234,0.13)] focus:translate-y-[-1px] focus:scale-[1.04] focus:border-[#667eea] focus:bg-slate-100 focus:text-[#222] focus:shadow-[0_6px_20px_0_rgba(102,126,234,0.13)] focus:outline-none md:px-[14px] md:py-1 md:pl-2 max-md:px-4 max-md:py-2 max-md:text-[13px]"
                >
                    <span
                        className="mr-[10px] flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-[0_1px_2px_rgba(60,64,67,0.08)]"
                        aria-label="Google"
                    >
                        <svg width="20" height="20" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.3-5.7 7-11.3 7-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.7 1.1 7.7 2.9l5.8-5.8C34.5 7.1 29.7 5 24 5 12.9 5 4 13.9 4 25s8.9 20 20 20c11.1 0 20-8.9 20-20 0-1.3-.1-2.2-.4-3.5z"/><path fill="#34A853" d="M6.3 14.7l6.6 4.8C15.1 16.2 19.2 13 24 13c3.1 0 5.7 1.1 7.7 2.9l5.8-5.8C34.5 7.1 29.7 5 24 5c-7.1 0-13.1 4.1-16.7 9.7z"/><path fill="#FBBC05" d="M24 44c5.4 0 10-1.8 13.3-4.9l-6.2-5.1c-1.7 1.2-3.9 2-7.1 2-5.6 0-10.3-3.8-12-8.9l-6.5 5C7.9 39.9 15.3 44 24 44z"/><path fill="#EA4335" d="M43.6 20.5H42V20H24v8h11.3c-0.7 2-2.1 3.7-4.1 4.9l6.2 5.1C41.7 36.6 44 31.8 44 25c0-1.3-.1-2.2-.4-3.5z"/></g></svg>
                    </span>
                    Login or Signup
                </button>
            )}
        </div>
    );
}

export default LoginButton;