import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, UserPlus } from 'lucide-react';

const AuthModal = ({ onClose, onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = isLogin ? '/api/login' : '/api/register';
    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Authentication failed');
      }

      // Success! Pass user data back
      onLoginSuccess({
        uid: data.user.id,
        email: data.user.email,
        photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + data.user.email
      });
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="w-full max-w-md overflow-hidden rounded-[32px] bg-[#0a0f1e]/80 border border-white/10 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative p-8 text-center">
          <button 
            onClick={onClose}
            className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 transition-all hover:bg-white/10 hover:text-white border border-white/5"
          >
            ✕
          </button>
          
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white shadow-[0_0_30px_rgba(102,126,234,0.4)] animate-pulseSlow">
            {isLogin ? <Lock size={36} /> : <UserPlus size={36} />}
          </div>
          
          <h2 className="m-0 text-3xl font-black text-white tracking-tight leading-tight">
            {isLogin ? 'Welcome Back' : 'Join the Journey'}
          </h2>
          <p className="mx-auto mt-2 max-w-[280px] text-sm font-medium text-slate-400">
            {isLogin ? 'Enter your credentials to continue your adventure.' : 'Create an account to start tracking your travels.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-10">
          {error && (
            <div className="mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-xs font-bold text-red-400 animate-slideIn">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                {error}
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="relative group">
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[2px] text-slate-500 px-1">Email Address</label>
              <div className="relative">
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-sm text-white outline-none transition-all duration-300 focus:border-[#667eea]/50 focus:bg-white/[0.08] focus:shadow-[0_0_20px_rgba(102,126,234,0.15)] placeholder:text-slate-600"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="relative group">
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[2px] text-slate-500 px-1">Password</label>
              <div className="relative">
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-sm text-white outline-none transition-all duration-300 focus:border-[#667eea]/50 focus:bg-white/[0.08] focus:shadow-[0_0_20px_rgba(102,126,234,0.15)] placeholder:text-slate-600"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#667eea] to-[#764ba2] py-4 text-xs font-black uppercase tracking-[2px] text-white shadow-[0_10px_20px_rgba(102,126,234,0.3)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_15px_30px_rgba(102,126,234,0.4)] active:scale-[0.98] disabled:opacity-50 group"
            >
              <span className="relative z-10">
                {loading ? 'Authenticating...' : (isLogin ? 'Sign In' : 'Create Account')}
              </span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full"></div>
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs font-bold text-slate-500">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(null); }}
                className="ml-1 text-[#667eea] transition-all hover:text-[#764ba2] hover:underline bg-transparent border-none cursor-pointer"
              >
                {isLogin ? 'Register Now' : 'Log In'}
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AuthModal;
