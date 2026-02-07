'use client';

import React, { useState, useEffect } from 'react';
import { Recycle, Lock, User } from '@phosphor-icons/react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkExistingAuth() {
      try {
        const token = api.getToken();
        if (!token) {
          setCheckingAuth(false);
          return;
        }

        await api.getMe();
        router.replace('/admin');
      } catch {
        api.clearToken();
        setCheckingAuth(false);
      }
    }
    checkExistingAuth();
  }, [router]);

  if (checkingAuth) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
        style={{ backgroundImage: 'linear-gradient(to bottom right, #0f172a, #1e293b)' }}
      >
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
        <div className="relative z-10 text-center space-y-4">
          <Recycle size={48} className="text-green-500 animate-pulse mx-auto" />
          <div className="text-slate-500 font-mono text-sm animate-pulse">VERIFYING SESSION...</div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.login(username, password);
      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: 'linear-gradient(to bottom right, #0f172a, #1e293b)' }}
    >
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      <div className="scanlines" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-slate-900/90 border border-slate-700 rounded-sm p-8 backdrop-blur-md">
          <div className="flex flex-col items-center mb-8">
            <Recycle size={48} weight="duotone" className="text-green-400 mb-4" />
            <h1 className="text-3xl font-chivo font-bold uppercase tracking-wider text-center">
              Waste Collection
            </h1>
            <p className="text-slate-400 text-sm mt-2">Scheduling & Management System</p>
          </div>

          {error && (
            <div className="bg-red-950/50 border border-red-800 rounded-sm p-3 mb-4 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full bg-slate-950 border-slate-700 text-slate-100 focus:border-green-500 focus:ring-1 focus:ring-green-500 rounded-sm placeholder:text-slate-600 font-mono text-sm pl-10 pr-3 py-2.5 border outline-none"
                  placeholder="Enter username"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 border-slate-700 text-slate-100 focus:border-green-500 focus:ring-1 focus:ring-green-500 rounded-sm placeholder:text-slate-600 font-mono text-sm pl-10 pr-3 py-2.5 border outline-none"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 text-white rounded-sm font-medium tracking-wide uppercase text-sm px-4 py-3 shadow-[0_0_10px_rgba(34,197,94,0.5)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Authenticating...' : 'Access System'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/worker')}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-sm font-medium tracking-wide uppercase text-sm px-4 py-3 transition-all duration-150 border border-slate-700"
            >
              Worker Check-In
            </button>
          </form>

          <div className="mt-6 p-4 bg-slate-950/50 border border-slate-800 rounded-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-mono">Demo Accounts:</p>
            <div className="grid grid-cols-1 gap-1 text-xs font-mono text-slate-400">
              <div>Admin: admin / admin123</div>
              <div>Supervisor: supervisor / super123</div>
              <div>Operator: operator / operator123</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
