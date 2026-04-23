import React, { useState } from 'react';
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
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

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

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in slide-in-from-bottom-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative bg-gradient-to-br from-[#667eea] to-[#764ba2] p-6 text-center text-white">
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/40"
          >
            ✕
          </button>
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white shadow-inner backdrop-blur-md">
            {isLogin ? <Lock size={32} /> : <UserPlus size={32} />}
          </div>
          <h2 className="m-0 text-2xl font-bold">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p className="m-0 mt-1 text-sm text-indigo-100">
            {isLogin ? 'Log in to access your travel journey' : 'Sign up to start tracking your travels'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1 block text-sm font-semibold text-slate-700">Email Address</label>
            <input 
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 outline-none transition-colors focus:border-[#667eea]"
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-6">
            <label className="mb-1 block text-sm font-semibold text-slate-700">Password</label>
            <input 
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 outline-none transition-colors focus:border-[#667eea]"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] py-3 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>

          <div className="mt-6 text-center text-sm text-slate-500">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="font-bold text-[#667eea] hover:underline bg-transparent border-none cursor-pointer"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
