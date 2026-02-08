import React from 'react';
import { auth } from '../../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth'; // ⭐ FIXED: was "signInwithPopup"
import './LoginButton.css';

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
        <div className="login-button-container">
            {currentUser ? (
                <div className="profile-auth-container">
                    <button
                        className="profile-avatar-btn"
                        title="Profile"
                        onClick={() => onNavigate && onNavigate('profile')}
                    >
                        <img
                            src={currentUser.photoURL || 'https://via.placeholder.com/32'}
                            alt="Profile"
                            className="profile-avatar-img"
                        />
                    </button>
                    <button className="logout-icon-btn" onClick={handleLogout} title="Logout">
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
                <button onClick={handleLogin} className="login-btn">
                    <span className="google-icon" aria-label="Google">
                        <svg width="20" height="20" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.3-5.7 7-11.3 7-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.7 1.1 7.7 2.9l5.8-5.8C34.5 7.1 29.7 5 24 5 12.9 5 4 13.9 4 25s8.9 20 20 20c11.1 0 20-8.9 20-20 0-1.3-.1-2.2-.4-3.5z"/><path fill="#34A853" d="M6.3 14.7l6.6 4.8C15.1 16.2 19.2 13 24 13c3.1 0 5.7 1.1 7.7 2.9l5.8-5.8C34.5 7.1 29.7 5 24 5c-7.1 0-13.1 4.1-16.7 9.7z"/><path fill="#FBBC05" d="M24 44c5.4 0 10-1.8 13.3-4.9l-6.2-5.1c-1.7 1.2-3.9 2-7.1 2-5.6 0-10.3-3.8-12-8.9l-6.5 5C7.9 39.9 15.3 44 24 44z"/><path fill="#EA4335" d="M43.6 20.5H42V20H24v8h11.3c-0.7 2-2.1 3.7-4.1 4.9l6.2 5.1C41.7 36.6 44 31.8 44 25c0-1.3-.1-2.2-.4-3.5z"/></g></svg>
                    </span>
                    Login or Signup
                </button>
            )}
        </div>
    );
}

export default LoginButton;