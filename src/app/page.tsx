'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { getWorkouts, saveWorkout, deleteWorkout, getMovements } from '@/lib/firestore';
import { WorkoutSession, WorkoutEntry, Movement } from '@/types';
import WorkoutForm from '@/components/WorkoutForm';
import WorkoutList from '@/components/WorkoutList';
import { SkeletonList } from '@/components/Skeletons';
import { Dumbbell, RotateCcw, Award, CheckCircle, Flame } from 'lucide-react';
import StaggeredList from '@/components/StaggeredList';

export default function Home() {
  const { user } = useAuth();
  const { settings } = useSettings();

  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  // Undo Toast state
  const [undoMovement, setUndoMovement] = useState<{ name: string; entries: WorkoutEntry[] } | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Double-tap finish state
  const [finishConfirm, setFinishConfirm] = useState<'idle' | 'confirm'>('idle');
  const finishTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Success toast state
  const [showSuccess, setShowSuccess] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{ sets: number; volume: number } | null>(null);

  // Load today's active workout and movements library
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        // Fetch movements
        const movList = await getMovements(user.uid);
        setMovements(movList);

        // Fetch today's workout
        const todayStr = new Date().toISOString().split('T')[0];
        const allWorkouts = await getWorkouts(user.uid);
        
        // Find if there is an uncompleted workout from today
        const todayActive = allWorkouts.find(
          w => w.date === todayStr && !w.completed
        );

        if (todayActive) {
          setActiveSession(todayActive);
        } else {
          // Initialize empty local state placeholder (lazy Firestore doc creation)
          setActiveSession({
            id: `wo-${Date.now()}`,
            title: 'Push Day', // Default placeholder title
            date: todayStr,
            entries: [],
            createdAt: Date.now(),
            completed: false
          });
        }
      } catch (err) {
        console.error('Failed to load active workout:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    };
  }, []);

  // Handler to get smart defaults for the selected movement from history
  const getSmartDefaults = (movementName: string) => {
    if (!activeSession) return null;
    
    // 1. Search current active session first
    const currentSets = activeSession.entries.filter(
      e => e.movementName.toLowerCase() === movementName.toLowerCase()
    );
    if (currentSets.length > 0) {
      const lastSet = currentSets[currentSets.length - 1];
      return { weight: lastSet.weight, reps: lastSet.reps };
    }

    // Smart prefill is fully handled by this local return.
    return null;
  };

  // Perform optimistic update and database save
  const syncWorkoutState = async (updatedSession: WorkoutSession) => {
    setActiveSession(updatedSession);
    if (!user) return;

    try {
      // Lazy creation: only save if there are entries, otherwise delete or skip
      if (updatedSession.entries.length > 0) {
        await saveWorkout(user.uid, updatedSession);
      } else {
        await deleteWorkout(user.uid, updatedSession.id);
      }
    } catch (err) {
      console.error('Failed to sync workout state with database:', err);
    }
  };

  // Log a new set
  const handleLogSet = async (name: string, weight: number, reps: number, notes?: string) => {
    if (!activeSession) return;

    const newEntry: WorkoutEntry = {
      id: `set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      movementName: name,
      weight,
      reps,
      unit: settings.unit,
      notes,
      createdAt: Date.now()
    };

    const updatedSession: WorkoutSession = {
      ...activeSession,
      entries: [...activeSession.entries, newEntry]
    };

    await syncWorkoutState(updatedSession);
  };

  // Delete single set entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!activeSession) return;

    const updatedSession: WorkoutSession = {
      ...activeSession,
      entries: activeSession.entries.filter(e => e.id !== entryId)
    };

    await syncWorkoutState(updatedSession);
  };

  // Delete entire movement (all its sets) with 5s undo toast
  const handleDeleteMovement = async (name: string) => {
    if (!activeSession) return;

    const setsToRemove = activeSession.entries.filter(
      e => e.movementName.toLowerCase() === name.toLowerCase()
    );
    const remainingSets = activeSession.entries.filter(
      e => e.movementName.toLowerCase() !== name.toLowerCase()
    );

    // Save for undo
    setUndoMovement({ name, entries: setsToRemove });
    setShowUndo(true);

    const updatedSession: WorkoutSession = {
      ...activeSession,
      entries: remainingSets
    };

    await syncWorkoutState(updatedSession);

    // Auto-dismiss undo toast after 5s
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = setTimeout(() => {
      setShowUndo(false);
      setUndoMovement(null);
    }, 5000);
  };

  // Undo delete movement
  const handleUndoDeleteMovement = async () => {
    if (!activeSession || !undoMovement) return;

    // Restore sets to original positions (sorted by createdAt)
    const restoredEntries = [...activeSession.entries, ...undoMovement.entries].sort(
      (a, b) => a.createdAt - b.createdAt
    );

    const updatedSession: WorkoutSession = {
      ...activeSession,
      entries: restoredEntries
    };

    await syncWorkoutState(updatedSession);
    setShowUndo(false);
    setUndoMovement(null);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  };

  // Update single set reps/weight inline
  const handleUpdateEntry = async (entryId: string, updatedFields: Partial<WorkoutEntry>) => {
    if (!activeSession) return;

    const updatedSession: WorkoutSession = {
      ...activeSession,
      entries: activeSession.entries.map(e => 
        e.id === entryId ? { ...e, ...updatedFields } : e
      )
    };

    await syncWorkoutState(updatedSession);
  };

  // Duplicate set
  const handleDuplicateEntry = async (entry: WorkoutEntry) => {
    if (!activeSession) return;

    const duplicated: WorkoutEntry = {
      ...entry,
      id: `set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now()
    };

    const updatedSession: WorkoutSession = {
      ...activeSession,
      entries: [...activeSession.entries, duplicated]
    };

    await syncWorkoutState(updatedSession);
  };

  // Title in-place rename
  const handleTitleChange = async (newTitle: string) => {
    if (!activeSession || !newTitle.trim()) return;

    const updatedSession: WorkoutSession = {
      ...activeSession,
      title: newTitle.trim()
    };

    await syncWorkoutState(updatedSession);
  };

  // Finish session
  const handleFinishWorkout = async () => {
    if (!activeSession || activeSession.entries.length === 0) return;

    if (finishConfirm === 'idle') {
      setFinishConfirm('confirm');
      
      // Reset confirmation stage after 3 seconds
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = setTimeout(() => {
        setFinishConfirm('idle');
      }, 3000);
      return;
    }

    // Confirmed! Clear timeout
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);

    // Calculate total session volume
    let totalVolume = 0;
    activeSession.entries.forEach(e => {
      if (typeof e.weight === 'number' && typeof e.reps === 'number') {
        totalVolume += e.weight * e.reps;
      }
    });

    const finishedSession: WorkoutSession = {
      ...activeSession,
      completed: true
    };

    // Save final state
    if (user) {
      await saveWorkout(user.uid, finishedSession);
    }

    // Trigger success animations and details
    setSuccessDetails({
      sets: activeSession.entries.length,
      volume: Math.round(totalVolume)
    });
    setShowSuccess(true);
    setFinishConfirm('idle');

    // Setup a fresh Push/Pull/Leg routine placeholder for tomorrow
    const routines = ['Push Day', 'Pull Day', 'Leg Day', 'Upper Body', 'Lower Body', 'Full Body'];
    const currentTitle = activeSession.title;
    let nextIndex = routines.indexOf(currentTitle) + 1;
    if (nextIndex >= routines.length || nextIndex < 0) nextIndex = 0;

    const nextSession: WorkoutSession = {
      id: `wo-${Date.now()}`,
      title: routines[nextIndex],
      date: new Date().toISOString().split('T')[0],
      entries: [],
      createdAt: Date.now(),
      completed: false
    };

    setActiveSession(nextSession);

    // Dismiss success screen after 3.5s
    setTimeout(() => {
      setShowSuccess(false);
      setSuccessDetails(null);
    }, 3500);
  };

  // Tally current set and volume totals
  const getSessionTotals = () => {
    if (!activeSession) return { sets: 0, volume: 0 };
    let volume = 0;
    activeSession.entries.forEach(e => {
      if (typeof e.weight === 'number' && typeof e.reps === 'number') {
        volume += e.weight * e.reps;
      }
    });
    return {
      sets: activeSession.entries.length,
      volume: Math.round(volume)
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-fade-in pt-2">
        <div className="h-20 w-full skeleton rounded-2xl" />
        <div className="h-64 w-full skeleton rounded-2xl" />
        <SkeletonList count={2} />
      </div>
    );
  }

  const { sets: totalSets, volume: totalVolume } = getSessionTotals();
  const lastSet = activeSession && activeSession.entries.length > 0 
    ? activeSession.entries[activeSession.entries.length - 1]
    : null;

  const lastLoggedProp = lastSet 
    ? {
        movementName: lastSet.movementName,
        weight: Number(lastSet.weight),
        reps: Number(lastSet.reps),
        unit: lastSet.unit
      }
    : null;

  return (
    <div className="flex flex-col gap-5 pt-2 pb-10">
      
      {/* Dynamic Success Screens */}
      {showSuccess && successDetails && (
        <div className="fixed inset-0 bg-bgPrimary/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="flex flex-col items-center gap-6 max-w-xs animate-modal-in">
            <div className="p-5 bg-emerald-500/10 text-emerald-400 rounded-full animate-pulse-ring">
              <CheckCircle className="w-16 h-16 animate-bounce" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-textPrimary tracking-tight">
                Workout Complete!
              </h2>
              <p className="text-xs text-textSecondary font-semibold uppercase tracking-wider mt-1 flex items-center justify-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500 fill-current" /> Great session today!
              </p>
            </div>

            {/* Performance summaries grid */}
            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              <div className="bg-bgSecondary border border-borderColor p-4 rounded-2xl">
                <p className="text-xs text-textTertiary font-bold uppercase tracking-wider">Sets Logged</p>
                <p className="text-2xl font-black text-accent mt-1">{successDetails.sets}</p>
              </div>
              <div className="bg-bgSecondary border border-borderColor p-4 rounded-2xl">
                <p className="text-xs text-textTertiary font-bold uppercase tracking-wider">Volume ({settings.unit})</p>
                <p className="text-2xl font-black text-emerald-400 mt-1">{successDetails.volume}</p>
              </div>
            </div>

            <span className="text-[10px] text-textTertiary font-semibold animate-pulse mt-4">
              Saving logs and preparing next routine...
            </span>
          </div>
        </div>
      )}

      {/* Editable Session Header Card */}
      {activeSession && (
        <div className="bg-bgSecondary p-4 rounded-2xl border border-borderColor shadow-md flex items-center justify-between transition-colors duration-200">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={activeSession.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full text-xl font-black bg-transparent border-0 outline-none text-textPrimary focus:bg-bgTertiary focus:px-2 py-0.5 rounded-xl transition-all duration-150 select-text"
                placeholder="Workout Routine Title"
              />
            </div>
            <p className="text-xs text-textTertiary font-bold mt-1 uppercase tracking-wide">
              {new Date(activeSession.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
      )}

      {/* Logging Entry Form */}
      <WorkoutForm
        movements={movements}
        lastLoggedSet={lastLoggedProp}
        onLogSet={handleLogSet}
        unit={settings.unit}
        getSmartDefaults={getSmartDefaults}
      />

      {/* Logged Sets List Section */}
      {activeSession && activeSession.entries.length > 0 && (
        <div className="flex flex-col gap-3 mt-1">
          {/* Header volumes counts */}
          <div className="flex items-center justify-between border-b border-borderColor/60 pb-1.5 px-1">
            <h3 className="text-[10px] uppercase font-black tracking-widest text-textTertiary">
              Logged Exercises
            </h3>
            <span className="text-[10px] uppercase font-black tracking-widest text-accent">
              {totalSets} sets · {totalVolume} {settings.unit} total
            </span>
          </div>

          <WorkoutList
            entries={activeSession.entries}
            onDeleteEntry={handleDeleteEntry}
            onDeleteMovement={handleDeleteMovement}
            onUpdateEntry={handleUpdateEntry}
            onDuplicateEntry={handleDuplicateEntry}
            unit={settings.unit}
          />

          {/* Prominent sticky finish workout button */}
          <button
            onClick={handleFinishWorkout}
            className={`w-full font-black text-sm py-4 rounded-2xl shadow-lg mt-3 active-scale cursor-pointer transition-all duration-300 ${
              finishConfirm === 'confirm'
                ? 'bg-emerald-500 text-bgPrimary border border-emerald-400 animate-glow-pulse shadow-emerald-500/10'
                : 'bg-accent text-bgPrimary border border-accentHover hover:bg-accentHover shadow-accent/10'
            }`}
          >
            {finishConfirm === 'confirm' ? 'TAP AGAIN TO CONFIRM FINISH' : 'FINISH WORKOUT'}
          </button>
        </div>
      )}

      {/* 5-Second Undo Toast */}
      {showUndo && undoMovement && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-fit bg-bgSecondary border border-borderColor px-4 py-3 rounded-2xl shadow-card-shadow-lg z-50 flex items-center gap-3 animate-slide-up transition-colors duration-200">
          <span className="text-xs font-bold text-textSecondary">
            Removed "{undoMovement.name}"
          </span>
          <button
            onClick={handleUndoDeleteMovement}
            className="flex items-center gap-1 bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent font-black text-xs px-2.5 py-1.5 rounded-xl active-scale cursor-pointer transition-all duration-100"
          >
            <RotateCcw className="w-3 h-3" /> UNDO
          </button>
        </div>
      )}

    </div>
  );
}
