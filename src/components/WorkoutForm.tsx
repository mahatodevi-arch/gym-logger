'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Repeat, Sparkles, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Movement, WorkoutEntry } from '@/types';

interface WorkoutFormProps {
  movements: Movement[];
  lastLoggedSet: { movementName: string; weight: number; reps: number; unit: 'kg' | 'lbs' } | null;
  onLogSet: (movementName: string, weight: number, reps: number, notes?: string) => void;
  unit: 'kg' | 'lbs';
  // Optional callback to fetch smart defaults from parent
  getSmartDefaults?: (movementName: string) => { weight: number | ''; reps: number | '' } | null;
}

export default function WorkoutForm({
  movements,
  lastLoggedSet,
  onLogSet,
  unit,
  getSmartDefaults
}: WorkoutFormProps) {
  const [movementName, setMovementName] = useState('');
  const [weight, setWeight] = useState<number | ''>('');
  const [reps, setReps] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  // Autocomplete dropdown state
  const [suggestions, setSuggestions] = useState<Movement[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter autocomplete suggestions
  useEffect(() => {
    if (!movementName.trim()) {
      setSuggestions([]);
      return;
    }
    const query = movementName.toLowerCase();
    const filtered = movements
      .filter(m => m.name.toLowerCase().includes(query))
      .slice(0, 8); // Top 8 matches
    setSuggestions(filtered);
  }, [movementName, movements]);

  // Click outside listener for autocomplete dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update defaults when movement name matches exactly
  const handleSelectMovement = (name: string) => {
    setMovementName(name);
    setShowSuggestions(false);

    // Apply smart defaults from history if available
    if (getSmartDefaults) {
      const defaults = getSmartDefaults(name);
      if (defaults) {
        setWeight(defaults.weight);
        setReps(defaults.reps);
        return;
      }
    }

    // Fallback default: if matches last logged set, prefill
    if (lastLoggedSet && lastLoggedSet.movementName.toLowerCase() === name.toLowerCase()) {
      setWeight(lastLoggedSet.weight);
      setReps(lastLoggedSet.reps);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementName.trim() || weight === '' || reps === '') return;

    onLogSet(movementName.trim(), Number(weight), Number(reps), notes.trim() || undefined);

    // Keep movement name for consecutive sets, but clear inputs or focus
    setWeight(weight); // Keep same weight
    setReps(reps);     // Keep same reps
    setNotes('');      // Clear note
    setShowNotes(false);

    // Re-focus the weight input for rapid consecutive entries
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleRepeatLast = () => {
    if (!lastLoggedSet) return;
    onLogSet(
      lastLoggedSet.movementName,
      lastLoggedSet.weight,
      lastLoggedSet.reps,
      undefined
    );
    // Sync current form name to match
    setMovementName(lastLoggedSet.movementName);
    setWeight(lastLoggedSet.weight);
    setReps(lastLoggedSet.reps);
  };

  return (
    <div className="bg-bgSecondary p-4 rounded-2xl border border-borderColor shadow-md transition-colors duration-200">
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        {/* Exercise Auto-complete Input */}
        <div className="relative" ref={dropdownRef}>
          <label className="text-[10px] uppercase font-black tracking-widest text-textTertiary mb-1.5 block">
            Exercise Name
          </label>
          <input
            type="text"
            required
            placeholder="Bench Press, Squat, etc."
            value={movementName}
            onChange={(e) => {
              setMovementName(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            className="w-full text-md font-bold bg-bgTertiary border border-borderColor px-4 py-3.5 rounded-xl text-textPrimary placeholder:text-textTertiary/50 focus:border-accent"
          />

          {/* Autocomplete Dropdown Panel */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-bgSecondary border border-borderColor rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto">
              {suggestions.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMovement(m.name)}
                  className="w-full text-left px-4 py-3 text-sm font-semibold hover:bg-accent/10 hover:text-accent border-b border-borderColor/40 last:border-b-0 active:bg-accent/20 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span>{m.name}</span>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-textTertiary px-2 py-0.5 bg-bgTertiary rounded-full">
                      {m.category}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Weights and Reps Input Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-black tracking-widest text-textTertiary mb-1.5 block">
              Weight ({unit})
            </label>
            <input
              ref={inputRef}
              type="number"
              required
              placeholder="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value !== '' ? parseFloat(e.target.value) : '')}
              min="0"
              step="any"
              className="w-full text-lg font-black text-center bg-bgTertiary border border-borderColor px-4 py-3.5 rounded-xl text-textPrimary placeholder:text-textTertiary/50 focus:border-accent"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-black tracking-widest text-textTertiary mb-1.5 block">
              Reps
            </label>
            <input
              type="number"
              required
              placeholder="0"
              value={reps}
              onChange={(e) => setReps(e.target.value !== '' ? parseInt(e.target.value) : '')}
              min="0"
              className="w-full text-lg font-black text-center bg-bgTertiary border border-borderColor px-4 py-3.5 rounded-xl text-textPrimary placeholder:text-textTertiary/50 focus:border-accent"
            />
          </div>
        </div>

        {/* Collapsible Notes Selector */}
        <div>
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-1.5 text-xs font-bold text-textSecondary active:scale-95 transition-all duration-100 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            {showNotes ? 'Hide Notes' : 'Add Notes'}
            {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          
          {showNotes && (
            <textarea
              placeholder="e.g. Focus on chest stretch, RPE 8"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full mt-2 text-xs font-semibold bg-bgTertiary border border-borderColor px-3 py-2 rounded-xl text-textPrimary placeholder:text-textTertiary/50 focus:border-accent resize-none"
            />
          )}
        </div>

        {/* Action Button Row */}
        <div className="flex flex-col gap-2.5 mt-1">
          {/* Main Log Set Button */}
          <button
            type="submit"
            disabled={!movementName.trim() || weight === '' || reps === ''}
            className="w-full bg-accent text-bgPrimary font-black text-sm py-4 rounded-xl shadow-[var(--btn-shadow)] hover:shadow-[var(--btn-shadow-hover)] hover:bg-accent-hover active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2 transition-all duration-150"
          >
            <PlusCircle className="w-4.5 h-4.5 stroke-[2.5]" /> LOG SET
          </button>

          {/* Repeat Last Set Shortcut */}
          {lastLoggedSet && (
            <button
              type="button"
              onClick={handleRepeatLast}
              className="w-full bg-bgTertiary hover:bg-accent/10 border border-borderColor text-textSecondary hover:text-accent font-extrabold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 cursor-pointer transition-all duration-150"
            >
              <Repeat className="w-3.5 h-3.5" /> REPEAT LAST SET 
              <span className="opacity-80 font-black">
                ({lastLoggedSet.movementName}: {lastLoggedSet.weight}{unit} × {lastLoggedSet.reps})
              </span>
            </button>
          )}
        </div>

      </form>
    </div>
  );
}
