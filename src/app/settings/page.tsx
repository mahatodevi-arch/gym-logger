'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { getWorkouts } from '@/lib/firestore';
import {
  Scale, Sun, Moon, Monitor, Download, LogOut,
  User, ChevronRight, CheckCircle2, Dumbbell
} from 'lucide-react';

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] uppercase font-black tracking-widest text-textTertiary px-1">
        {title}
      </p>
      <div className="bg-bgSecondary border border-borderColor rounded-2xl overflow-hidden divide-y divide-borderColor/50">
        {children}
      </div>
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────
function Row({
  icon,
  label,
  children,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  children?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between px-4 py-3.5 gap-3 transition-colors duration-100 ${onClick ? 'cursor-pointer active:bg-bgTertiary' : ''}`}
    >
      <div className="flex items-center gap-3">
        <span className={`shrink-0 ${danger ? 'text-danger' : 'text-textSecondary'}`}>{icon}</span>
        <span className={`text-sm font-semibold ${danger ? 'text-danger' : 'text-textPrimary'}`}>{label}</span>
      </div>
      <div className="flex items-center gap-2 text-textTertiary">
        {children}
        {onClick && !children && <ChevronRight className="w-4 h-4" />}
      </div>
    </div>
  );
}

// ─── Pill toggle ──────────────────────────────────────────────────────────────
function PillToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T; icon?: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center bg-bgTertiary rounded-xl p-1 gap-1">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 active-scale cursor-pointer ${value === opt.value
            ? 'bg-bgSecondary text-accent shadow-sm border border-borderColor'
            : 'text-textTertiary'
            }`}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { settings, updateUnit, updateTheme } = useSettings();

  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  const handleExportCSV = async () => {
    if (!user || exporting) return;
    setExporting(true);
    setExportDone(false);

    try {
      const workouts = await getWorkouts(user.uid);

      const rows: string[] = [
        'Date,Session Title,Exercise,Reps,Weight,Unit,Notes'
      ];

      workouts.forEach(session => {
        session.entries.forEach(entry => {
          const escapedTitle = `"${session.title.replace(/"/g, '""')}"`;
          const escapedName = `"${entry.movementName.replace(/"/g, '""')}"`;
          const escapedNotes = entry.notes ? `"${entry.notes.replace(/"/g, '""')}"` : '';
          rows.push(
            `${session.date},${escapedTitle},${escapedName},${entry.reps},${entry.weight},${entry.unit},${escapedNotes}`
          );
        });
      });

      const csv = rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gym-logger-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch (err) {
      console.error('CSV export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const displayName = user?.displayName || 'Gym Guest';
  const email = user?.email || '';
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-6 pt-2 pb-10">

      {/* Page Header */}
      <div className="border-b border-borderColor/60 pb-2 px-1">
        <h3 className="text-[10px] uppercase font-black tracking-widest text-textTertiary">
          Settings
        </h3>
      </div>

      {/* Profile Card */}
      <div className="flex items-center gap-4 bg-bgSecondary border border-borderColor rounded-2xl px-4 py-4 card-depth">
        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0 border-2 border-accent/30">
          <span className="text-lg font-black text-accent">{avatarInitial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-textPrimary truncate">{displayName}</p>
          {email && <p className="text-xs text-textTertiary truncate mt-0.5">{email}</p>}
        </div>
        <Dumbbell className="w-5 h-5 text-textTertiary shrink-0" />
      </div>

      {/* Preferences */}
      <Section title="Preferences">
        {/* Weight Unit */}
        <Row icon={<Scale className="w-4 h-4" />} label="Weight Unit">
          <PillToggle
            options={[
              { label: 'kg', value: 'kg' as const },
              { label: 'lbs', value: 'lbs' as const },
            ]}
            value={settings.unit}
            onChange={updateUnit}
          />
        </Row>

        {/* Theme */}
        <Row icon={<Sun className="w-4 h-4" />} label="Appearance">
          <PillToggle
            options={[
              { label: 'System', value: 'system' as const, icon: <Monitor className="w-3 h-3" /> },
              { label: 'Light', value: 'light' as const, icon: <Sun className="w-3 h-3" /> },
              { label: 'Dark', value: 'dark' as const, icon: <Moon className="w-3 h-3" /> },
            ]}
            value={settings.theme}
            onChange={updateTheme}
          />
        </Row>
      </Section>

      {/* Data */}
      <Section title="Data">
        <Row
          icon={
            exportDone
              ? <CheckCircle2 className="w-4 h-4 text-success" />
              : <Download className="w-4 h-4" />
          }
          label={exportDone ? 'Export Complete!' : exporting ? 'Exporting…' : 'Export as CSV'}
          onClick={handleExportCSV}
        >
          {exporting && (
            <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          )}
          {!exporting && !exportDone && <ChevronRight className="w-4 h-4" />}
        </Row>
      </Section>

      {/* Account */}
      <Section title="Account">
        <Row
          icon={<LogOut className="w-4 h-4" />}
          label="Sign Out"
          onClick={logout}
          danger
        />
      </Section>

      {/* App version footer */}
      <p className="text-center text-[10px] text-textTertiary font-medium pb-2">
        Gym Logger · v1.0.0
      </p>

    </div>
  );
}
