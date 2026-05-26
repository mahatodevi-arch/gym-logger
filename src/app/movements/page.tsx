'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getMovements, saveMovement, deleteMovement } from '@/lib/firestore';
import { Movement, MovementCategory } from '@/types';
import { SkeletonList } from '@/components/Skeletons';
import {
  Search, Plus, Trash2, X, Check, Dumbbell,
  ChevronDown, Filter, Trash
} from 'lucide-react';

const CATEGORIES: MovementCategory[] = [
  'Legs', 'Back', 'Chest', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Other'
];

const CATEGORY_COLORS: Record<MovementCategory, string> = {
  Legs:      'bg-violet-500/15 text-violet-400 border-violet-500/25',
  Back:      'bg-blue-500/15 text-blue-400 border-blue-500/25',
  Chest:     'bg-rose-500/15 text-rose-400 border-rose-500/25',
  Shoulders: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  Arms:      'bg-green-500/15 text-green-400 border-green-500/25',
  Core:      'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  Cardio:    'bg-orange-500/15 text-orange-400 border-orange-500/25',
  Other:     'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
};

export default function MovementsPage() {
  const { user } = useAuth();

  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<MovementCategory | 'All'>('All');

  // Add new movement
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<MovementCategory>('Other');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  // Delete confirmation modal
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    movementId: string;
    movementName: string;
  }>({ isOpen: false, movementId: '', movementName: '' });

  const loadMovements = async () => {
    if (!user) return;
    try {
      const data = await getMovements(user.uid);
      // Sort: custom first, then alphabetical
      const sorted = [...data].sort((a, b) => {
        if (a.isCustom && !b.isCustom) return -1;
        if (!a.isCustom && b.isCustom) return 1;
        return a.name.localeCompare(b.name);
      });
      setMovements(sorted);
    } catch (err) {
      console.error('Failed to load movements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMovements(); }, [user]);

  // Close category dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filtered list
  const filtered = movements.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'All' || m.category === activeCategory;
    return matchSearch && matchCat;
  });

  // Count per category for badge
  const categoryCount = useCallback((cat: MovementCategory) =>
    movements.filter(m => m.category === cat).length
  , [movements]);

  const handleAdd = async () => {
    if (!user || !newName.trim()) return;
    const movement: Movement = {
      id: `mv-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: newName.trim(),
      category: newCategory,
      isCustom: true,
    };
    // Optimistic
    setMovements(prev => [movement, ...prev]);
    setAdding(false);
    setNewName('');
    try {
      await saveMovement(user.uid, movement);
    } catch (err) {
      console.error('Failed to save movement:', err);
      await loadMovements();
    }
  };

  const openDeleteModal = (id: string, name: string) => {
    setDeleteModal({ isOpen: true, movementId: id, movementName: name });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, movementId: '', movementName: '' });
  };

  const executeDelete = async () => {
    if (!user) return;
    const { movementId } = deleteModal;
    // Optimistic
    setMovements(prev => prev.filter(m => m.id !== movementId));
    closeDeleteModal();
    try {
      await deleteMovement(user.uid, movementId);
    } catch (err) {
      console.error('Failed to delete movement:', err);
      await loadMovements();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-fade-in pt-2">
        <div className="h-6 w-1/2 skeleton" />
        <div className="h-10 w-full skeleton" />
        <SkeletonList count={8} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-2 pb-10">

      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-borderColor/60 pb-2 px-1">
        <h3 className="text-[10px] uppercase font-black tracking-widest text-textTertiary">
          Movement Catalog
        </h3>
        <button
          onClick={() => { setAdding(true); setNewName(''); setNewCategory('Other'); }}
          className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-wider text-accent bg-accent/10 px-3 py-1.5 rounded-xl active-scale cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          Custom
        </button>
      </div>

      {/* Add Custom Movement Form */}
      {adding && (
        <div className="flex flex-col gap-2 bg-bgSecondary border border-accent/40 rounded-2xl p-4 shadow-md animate-fade-in">
          <p className="text-[10px] uppercase font-black tracking-widest text-accent">New Custom Movement</p>

          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
            placeholder="Movement name…"
            className="w-full bg-bgPrimary border border-borderColor rounded-xl px-3.5 py-2.5 text-sm font-bold text-textPrimary placeholder:text-textTertiary outline-none"
            autoFocus
          />

          {/* Category picker */}
          <div className="relative" ref={categoryRef}>
            <button
              onClick={() => setCategoryOpen(o => !o)}
              className="flex items-center justify-between w-full bg-bgPrimary border border-borderColor rounded-xl px-3.5 py-2.5 text-sm font-semibold text-textPrimary active-scale cursor-pointer"
            >
              <span className={`px-2 py-0.5 rounded-md border text-xs font-bold ${CATEGORY_COLORS[newCategory]}`}>
                {newCategory}
              </span>
              <ChevronDown className={`w-4 h-4 text-textTertiary transition-transform ${categoryOpen ? 'rotate-180' : ''}`} />
            </button>
            {categoryOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-bgSecondary border border-borderColor rounded-2xl shadow-xl z-30 overflow-hidden animate-fade-in">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setNewCategory(cat); setCategoryOpen(false); }}
                    className={`flex items-center justify-between w-full px-4 py-2.5 text-sm font-semibold text-left cursor-pointer transition-colors duration-100 ${newCategory === cat ? 'bg-accent/10 text-accent' : 'text-textSecondary hover:bg-bgTertiary'}`}
                  >
                    <span>{cat}</span>
                    {newCategory === cat && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-accent text-bgPrimary font-black text-xs py-3 rounded-xl active-scale disabled:opacity-40 cursor-pointer shadow-btn"
            >
              <Check className="w-4 h-4" />
              ADD
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-4 bg-bgTertiary text-textSecondary font-bold text-xs rounded-xl active-scale cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textTertiary pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search movements…"
          className="w-full bg-bgSecondary border border-borderColor rounded-2xl pl-10 pr-4 py-3 text-sm text-textPrimary placeholder:text-textTertiary outline-none focus:border-accent/60 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-textTertiary active-scale cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        <button
          onClick={() => setActiveCategory('All')}
          className={`flex items-center gap-1.5 shrink-0 px-3.5 py-1.5 rounded-xl border text-xs font-bold active-scale cursor-pointer transition-all ${
            activeCategory === 'All'
              ? 'bg-accent border-accent text-bgPrimary shadow-btn'
              : 'bg-bgSecondary border-borderColor text-textSecondary'
          }`}
        >
          All
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${activeCategory === 'All' ? 'bg-white/20' : 'bg-bgTertiary'}`}>
            {movements.length}
          </span>
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex items-center gap-1.5 shrink-0 px-3.5 py-1.5 rounded-xl border text-xs font-bold active-scale cursor-pointer transition-all ${
              activeCategory === cat
                ? 'bg-accent border-accent text-bgPrimary shadow-btn'
                : 'bg-bgSecondary border-borderColor text-textSecondary'
            }`}
          >
            {cat}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${activeCategory === cat ? 'bg-white/20' : 'bg-bgTertiary'}`}>
              {categoryCount(cat)}
            </span>
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-[10px] uppercase font-black tracking-widest text-textTertiary px-1">
        {filtered.length} movement{filtered.length !== 1 ? 's' : ''}
        {activeCategory !== 'All' ? ` · ${activeCategory}` : ''}
        {search ? ` · "${search}"` : ''}
      </p>

      {/* Movements list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-bgSecondary rounded-2xl border border-borderColor py-16 text-center">
          <div className="p-3.5 bg-bgTertiary rounded-full text-textTertiary mb-3 animate-pulse-ring">
            <Dumbbell className="w-8 h-8" />
          </div>
          <p className="text-textSecondary text-sm font-semibold">No movements found</p>
          <p className="text-textTertiary text-xs max-w-xs mt-1">
            {search ? `Try a different search term` : `Add a custom movement to get started`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-borderColor/50 bg-bgSecondary border border-borderColor rounded-2xl overflow-hidden">
          {filtered.map((movement, i) => (
            <div
              key={movement.id}
              className={`flex items-center justify-between px-4 py-3.5 gap-3 transition-colors duration-100 ${movement.isCustom ? 'hover:bg-accent/5' : ''} animate-stagger-in`}
              style={{ animationDelay: `${Math.min(i * 30, 300)}ms`, opacity: 0, animationFillMode: 'forwards' }}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className={`shrink-0 px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wide ${CATEGORY_COLORS[movement.category]}`}>
                  {movement.category}
                </span>
                <span className="text-sm font-semibold text-textPrimary truncate">
                  {movement.name}
                </span>
                {movement.isCustom && (
                  <span className="shrink-0 text-[9px] uppercase font-black tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded-md">
                    Custom
                  </span>
                )}
              </div>

              {/* Only custom movements can be deleted */}
              {movement.isCustom && (
                <button
                  onClick={() => openDeleteModal(movement.id, movement.name)}
                  className="shrink-0 p-2 bg-danger/10 text-danger rounded-xl active-scale cursor-pointer"
                  aria-label={`Delete ${movement.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-bgSecondary border border-borderColor rounded-3xl p-5 max-w-xs w-full flex flex-col items-center text-center gap-4 shadow-2xl animate-modal-in">
            <div className="p-3 bg-danger/10 text-danger rounded-full">
              <Trash className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="text-md font-black tracking-tight text-textPrimary">Remove Movement?</h4>
              <p className="text-xs text-textSecondary leading-relaxed mt-1.5">
                &quot;{deleteModal.movementName}&quot; will be permanently removed from your catalog.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 w-full">
              <button
                onClick={closeDeleteModal}
                className="w-full bg-bgTertiary text-textSecondary font-bold text-xs py-3 rounded-xl active-scale cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={executeDelete}
                className="w-full bg-danger text-bgPrimary font-black text-xs py-3 rounded-xl active-scale shadow-sm cursor-pointer"
              >
                REMOVE
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
