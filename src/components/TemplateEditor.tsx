'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Check, Trash2, ArrowUp, ArrowDown, Copy, Plus, 
  RotateCcw, Search, Dumbbell 
} from 'lucide-react';
import { Template, TemplateEntry, Movement } from '@/types';

interface TemplateEditorProps {
  template: Template | null; // Null if creating new
  movements: Movement[];
  onSave: (name: string, entries: TemplateEntry[]) => void;
  onCancel: () => void;
  unit: 'kg' | 'lbs';
}

export default function TemplateEditor({
  template,
  movements,
  onSave,
  onCancel,
  unit
}: TemplateEditorProps) {
  const [name, setName] = useState(template ? template.name : 'New Routine');
  const [entries, setEntries] = useState<TemplateEntry[]>(
    template ? [...template.entries] : []
  );

  // Autocomplete state
  const [searchVal, setSearchVal] = useState('');
  const [suggestions, setSuggestions] = useState<Movement[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Undo system state
  const [deletedEntry, setDeletedEntry] = useState<{ entry: TemplateEntry; index: number } | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter movements suggestions
  useEffect(() => {
    if (!searchVal.trim()) {
      setSuggestions([]);
      return;
    }
    const q = searchVal.toLowerCase();
    const filtered = movements
      .filter(m => m.name.toLowerCase().includes(q))
      .slice(0, 8);
    setSuggestions(filtered);
  }, [searchVal, movements]);

  // Click outside suggestions
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    };
  }, []);

  const addMovement = (movementName: string) => {
    const newEntry: TemplateEntry = {
      movementName,
      weight: 100, // Default weight
      reps: 10,    // Default reps
      unit
    };
    setEntries([...entries, newEntry]);
    setSearchVal('');
    setShowSuggestions(false);
  };

  const handleEntryChange = (index: number, field: 'weight' | 'reps', val: string) => {
    const nextVal = val === '' ? '' : parseFloat(val);
    setEntries(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: isNaN(Number(nextVal)) ? '' : nextVal
      };
      return copy;
    });
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setEntries(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const moveDown = (index: number) => {
    if (index === entries.length - 1) return;
    setEntries(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  const duplicateEntry = (index: number) => {
    const entryToCopy = entries[index];
    const copy = { ...entryToCopy };
    setEntries(prev => {
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const deleteEntry = (index: number) => {
    const target = entries[index];
    // Record for Undo
    setDeletedEntry({ entry: target, index });
    setShowUndo(true);

    // Filter out
    setEntries(prev => prev.filter((_, i) => i !== index));

    // Clear previous timeout and set new 5s toast lifetime
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = setTimeout(() => {
      setShowUndo(false);
      setDeletedEntry(null);
    }, 5000);
  };

  const handleUndo = () => {
    if (!deletedEntry) return;
    setEntries(prev => {
      const copy = [...prev];
      copy.splice(deletedEntry.index, 0, deletedEntry.entry);
      return copy;
    });
    setShowUndo(false);
    setDeletedEntry(null);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), entries);
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-16 relative">
      
      {/* Editor Header Card */}
      <div className="bg-bgSecondary p-4 border border-borderColor rounded-2xl shadow-md flex items-center justify-between transition-colors duration-200">
        <button
          onClick={onCancel}
          className="p-2 bg-bgTertiary text-textSecondary hover:text-textPrimary rounded-xl active-scale cursor-pointer"
          aria-label="Cancel editing"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-black uppercase tracking-widest text-textSecondary">
          {template ? 'Edit Routine' : 'Create Routine'}
        </h2>
        <button
          onClick={handleSave}
          disabled={!name.trim() || entries.length === 0}
          className="p-2 bg-emerald-500 text-bgPrimary font-black rounded-xl active-scale disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          aria-label="Save routine"
        >
          <Check className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Routine Title Field */}
      <div className="bg-bgSecondary p-4 border border-borderColor rounded-2xl shadow-md flex flex-col gap-2.5 transition-colors duration-200">
        <label className="text-[10px] uppercase font-black tracking-widest text-textTertiary">
          Routine Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Hypertrophy Pull Day"
          className="w-full text-md font-bold bg-bgTertiary border border-borderColor px-4 py-3 rounded-xl text-textPrimary placeholder:text-textTertiary/50 focus:border-accent"
        />
      </div>

      {/* Movement Search Input Card */}
      <div className="bg-bgSecondary p-4 border border-borderColor rounded-2xl shadow-md flex flex-col gap-2.5 transition-colors duration-200 relative" ref={dropdownRef}>
        <label className="text-[10px] uppercase font-black tracking-widest text-textTertiary">
          Add Exercise to Template
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchVal}
            onChange={(e) => {
              setSearchVal(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search exercises to add..."
            className="w-full text-sm font-bold bg-bgTertiary border border-borderColor pl-10 pr-4 py-3 rounded-xl text-textPrimary placeholder:text-textTertiary/50 focus:border-accent"
          />
          <Search className="w-4 h-4 text-textTertiary absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Dropdown Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-bgSecondary border border-borderColor rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto">
            {suggestions.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => addMovement(m.name)}
                className="w-full text-left px-4 py-3.5 text-sm font-semibold hover:bg-accent/10 hover:text-accent border-b border-borderColor/40 last:border-b-0 active:bg-accent/20 cursor-pointer"
              >
                <span>{m.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Template Entries List */}
      <div className="flex flex-col gap-3">
        <h3 className="text-[10px] uppercase font-black tracking-widest text-textTertiary pl-1">
          Exercises In Template ({entries.length})
        </h3>
        
        {entries.length === 0 ? (
          <div className="bg-bgSecondary p-8 border border-borderColor rounded-2xl text-center text-xs py-10 transition-colors duration-200">
            <div className="p-3 bg-bgTertiary rounded-full text-textTertiary w-fit mx-auto mb-2 animate-pulse-ring">
              <Dumbbell className="w-6 h-6" />
            </div>
            <p className="font-bold text-textSecondary">Template is empty</p>
            <p className="text-textTertiary/70 mt-1">Search and add exercises above to construct this routine.</p>
          </div>
        ) : (
          entries.map((entry, index) => (
            <div
              key={index}
              className="bg-bgSecondary border border-borderColor rounded-2xl p-4 shadow-sm flex flex-col gap-3 transition-colors duration-200 animate-fade-in"
            >
              <div className="flex items-center justify-between border-b border-borderColor/60 pb-1.5">
                <h4 className="font-extrabold text-sm text-textPrimary tracking-tight">
                  {index + 1}. {entry.movementName}
                </h4>
                
                {/* Entries Navigation Arrows */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-1 bg-bgTertiary hover:bg-accent/10 hover:text-accent border border-borderColor/60 rounded-lg active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    aria-label="Move exercise up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === entries.length - 1}
                    className="p-1 bg-bgTertiary hover:bg-accent/10 hover:text-accent border border-borderColor/60 rounded-lg active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    aria-label="Move exercise down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Weight & Reps inputs */}
              <div className="grid grid-cols-[1fr_20px_1fr_40px_40px] items-center gap-2">
                {/* Weight Field */}
                <div className="flex items-center bg-bgTertiary border border-borderColor rounded-xl px-3 py-1.5 focus-within:border-accent">
                  <input
                    type="number"
                    value={entry.weight}
                    onChange={(e) => handleEntryChange(index, 'weight', e.target.value)}
                    className="w-full text-center text-xs font-black bg-transparent border-0 outline-none text-textPrimary"
                    placeholder="0"
                  />
                  <span className="text-[10px] text-textTertiary font-extrabold ml-1">{unit}</span>
                </div>

                <span className="text-xxs text-textTertiary font-black text-center">×</span>

                {/* Reps Field */}
                <div className="flex items-center bg-bgTertiary border border-borderColor rounded-xl px-3 py-1.5 focus-within:border-accent">
                  <input
                    type="number"
                    value={entry.reps}
                    onChange={(e) => handleEntryChange(index, 'reps', e.target.value)}
                    className="w-full text-center text-xs font-black bg-transparent border-0 outline-none text-textPrimary"
                    placeholder="0"
                  />
                  <span className="text-[10px] text-textTertiary font-extrabold ml-1">reps</span>
                </div>

                {/* Duplicate */}
                <button
                  onClick={() => duplicateEntry(index)}
                  className="p-2 bg-bgTertiary hover:bg-accent/10 hover:text-accent border border-borderColor rounded-xl active:scale-95 cursor-pointer transition-colors"
                  aria-label="Duplicate template exercise"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {/* Delete */}
                <button
                  onClick={() => deleteEntry(index)}
                  className="p-2 bg-danger/10 text-danger hover:bg-danger/20 rounded-xl active:scale-95 cursor-pointer transition-colors"
                  aria-label="Remove exercise from template"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Elegant 5s Undo Toast */}
      {showUndo && deletedEntry && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-fit bg-bgSecondary border border-borderColor px-4 py-3 rounded-2xl shadow-card-shadow-lg z-50 flex items-center gap-3 animate-slide-up transition-colors duration-200">
          <span className="text-xs font-bold text-textSecondary">
            Removed "{deletedEntry.entry.movementName}"
          </span>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1 bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent font-black text-xs px-2.5 py-1.5 rounded-xl active-scale cursor-pointer transition-all duration-100"
          >
            <RotateCcw className="w-3 h-3" /> UNDO
          </button>
        </div>
      )}

    </div>
  );
}
