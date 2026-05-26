'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dumbbell, AlertCircle, RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const { loginWithGoogle, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(
        err.message || 'An unexpected error occurred during Google sign-in. Please try again.'
      );
    }
  };

  return (
    <div className="min-h-[80dvh] flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-bgSecondary border border-borderColor rounded-3xl p-6 shadow-card-shadow-lg flex flex-col items-center text-center gap-6 transition-colors duration-200">
        
        {/* Themed Dumbbell Logo Icon */}
        <div className="flex flex-col items-center gap-2">
          <div className="p-4.5 bg-accent/10 text-accent rounded-2xl animate-pulse-ring">
            <Dumbbell className="w-10 h-10" />
          </div>
          <div>
            <h1 className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-accent to-emerald-400 bg-clip-text text-transparent mt-2">
              GYM LOGGER
            </h1>
            <p className="text-xs text-textTertiary font-semibold uppercase tracking-widest mt-1">
              Perfect Workouts. Zero Friction.
            </p>
          </div>
        </div>

        {/* Informative Value Cards */}
        <div className="bg-bgTertiary/40 w-full p-4.5 border border-borderColor/60 rounded-2xl text-left flex flex-col gap-2.5">
          <div className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
            <p className="text-xs font-semibold text-textSecondary">
              Quick 5-second set logging designed for mobile viewports.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
            <p className="text-xs font-semibold text-textSecondary">
              Automatic metrics converting, routine loaders, and data backup.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
            <p className="text-xs font-semibold text-textSecondary">
              Fully optimized for offline use when network signal is weak.
            </p>
          </div>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="w-full bg-danger/10 border border-danger/20 text-danger p-3.5 rounded-xl text-left flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] font-semibold leading-relaxed">{error}</p>
          </div>
        )}

        {/* Primary CTA Sign In Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-accent hover:bg-accentHover text-bgPrimary font-black text-sm py-4 rounded-xl flex items-center justify-center gap-3 shadow-[var(--btn-shadow)] hover:shadow-[var(--btn-shadow-hover)] active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          {loading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {/* Google Inline Vector Icon */}
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              SIGN IN WITH GOOGLE
            </>
          )}
        </button>

      </div>
    </div>
  );
}
