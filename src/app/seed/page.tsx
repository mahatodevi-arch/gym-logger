'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { seedUserInitialData } from '@/contexts/AuthContext';
import { getMovements, getTemplates } from '@/lib/firestore';
import { CheckCircle2, RefreshCw, Dumbbell, BookOpen, AlertCircle } from 'lucide-react';

type SeedStatus = 'idle' | 'running' | 'done' | 'error';

interface StepResult {
  label: string;
  count: number;
  icon: React.ReactNode;
}

export default function SeedPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SeedStatus>('idle');
  const [results, setResults] = useState<StepResult[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSeed = async () => {
    if (!user || status === 'running') return;
    setStatus('running');
    setResults([]);
    setErrorMsg('');

    try {
      await seedUserInitialData(user.uid);

      // Fetch counts after seeding
      const [movements, templates] = await Promise.all([
        getMovements(user.uid),
        getTemplates(user.uid),
      ]);

      setResults([
        { label: 'Movements seeded', count: movements.length, icon: <Dumbbell className="w-4 h-4" /> },
        { label: 'Templates seeded', count: templates.length, icon: <BookOpen className="w-4 h-4" /> },
      ]);
      setStatus('done');
    } catch (err: any) {
      console.error('Seeding failed:', err);
      setErrorMsg(err?.message || 'An unexpected error occurred.');
      setStatus('error');
    }
  };

  return (
    <div className="flex flex-col gap-6 pt-2 pb-10 items-center justify-start">

      {/* Page Header */}
      <div className="w-full border-b border-borderColor/60 pb-2 px-1">
        <h3 className="text-[10px] uppercase font-black tracking-widest text-textTertiary">
          Data Seeder
        </h3>
      </div>

      {/* Info Card */}
      <div className="w-full bg-bgSecondary border border-borderColor rounded-2xl p-5 flex flex-col gap-3 card-depth animate-fade-in">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-accent/10 rounded-xl shrink-0">
            <RefreshCw className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-textPrimary">Seed Initial Data</h4>
            <p className="text-xs text-textSecondary leading-relaxed mt-1">
              This utility seeds your account with the default movement catalog (60+ exercises across 8 categories)
              and 3 starter routine templates if they don&apos;t already exist. Safe to run multiple times — it won&apos;t
              duplicate existing data.
            </p>
          </div>
        </div>

        {/* What will be seeded */}
        <div className="flex flex-col gap-2 mt-1">
          {[
            { icon: <Dumbbell className="w-3.5 h-3.5" />, label: '60+ default movements across 8 categories' },
            { icon: <BookOpen className="w-3.5 h-3.5" />, label: '3 starter routines (Push · Pull · Legs)' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 text-xs text-textSecondary">
              <span className="text-accent">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* Action button */}
      <button
        id="seed-btn"
        onClick={handleSeed}
        disabled={status === 'running'}
        className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-sm tracking-wide active-scale cursor-pointer transition-all shadow-btn ${status === 'running'
            ? 'bg-bgTertiary text-textTertiary cursor-not-allowed'
            : status === 'done'
              ? 'bg-success/10 text-success border border-success/30'
              : status === 'error'
                ? 'bg-danger/10 text-danger border border-danger/30'
                : 'bg-accent text-bgPrimary'
          }`}
      >
        {status === 'running' && (
          <div className="w-5 h-5 border-2 border-textTertiary/30 border-t-textTertiary rounded-full animate-spin" />
        )}
        {status === 'done' && <CheckCircle2 className="w-5 h-5" />}
        {status === 'error' && <AlertCircle className="w-5 h-5" />}
        {status === 'idle' && <RefreshCw className="w-5 h-5" />}

        {status === 'idle' && 'Run Seed'}
        {status === 'running' && 'Seeding…'}
        {status === 'done' && 'Seeding Complete!'}
        {status === 'error' && 'Retry Seed'}
      </button>

      {/* Results */}
      {results.length > 0 && (
        <div className="w-full flex flex-col gap-2 animate-fade-in">
          <p className="text-[10px] uppercase font-black tracking-widest text-textTertiary px-1">Results</p>
          {results.map((result, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-bgSecondary border border-borderColor rounded-2xl px-4 py-3.5 animate-stagger-in"
              style={{ animationDelay: `${i * 80}ms`, opacity: 0, animationFillMode: 'forwards' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-success">{result.icon}</span>
                <span className="text-sm font-semibold text-textPrimary">{result.label}</span>
              </div>
              <span className="text-sm font-black text-accent">{result.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {status === 'error' && errorMsg && (
        <div className="w-full bg-danger/10 border border-danger/30 rounded-2xl px-4 py-3.5 animate-fade-in">
          <p className="text-xs text-danger font-semibold">{errorMsg}</p>
        </div>
      )}

    </div>
  );
}
