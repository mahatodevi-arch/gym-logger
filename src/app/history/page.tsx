'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { getWorkouts, saveWorkout, deleteWorkout } from '@/lib/firestore';
import { WorkoutSession, WorkoutEntry } from '@/types';
import WorkoutList from '@/components/WorkoutList';
import { SkeletonList } from '@/components/Skeletons';
import StaggeredList from '@/components/StaggeredList';
import { 
  ChevronDown, ChevronUp, Trash2, Calendar, Dumbbell, 
  HelpCircle, Trash, RefreshCw 
} from 'lucide-react';

export default function HistoryPage() {
  const { user } = useAuth();
  const { settings } = useSettings();

  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Deletion Modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'workout' | 'movement';
    workoutId: string;
    movementName?: string;
  }>({ isOpen: false, type: 'workout', workoutId: '' });

  // Load completed workouts
  const loadHistory = async () => {
    if (!user) return;
    try {
      const data = await getWorkouts(user.uid);
      // Filter out incomplete and empty sessions
      const completed = data.filter(w => w.completed && w.entries.length > 0);
      setWorkouts(completed);
    } catch (err) {
      console.error('Failed to load past workouts history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [user]);

  // Escape key to dismiss modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && deleteModal.isOpen) {
        closeDeleteModal();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [deleteModal.isOpen]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Sunday-start boundary calculator
  const getSunday = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay(); // 0 is Sun, 1 is Mon etc.
    const diff = d.getDate() - day;
    const sun = new Date(d.setDate(diff));
    sun.setHours(0, 0, 0, 0);
    return sun;
  };

  const getWeekRange = (sunday: Date) => {
    const sat = new Date(sunday);
    sat.setDate(sunday.getDate() + 6);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `Week of ${sunday.toLocaleDateString(undefined, options)} — ${sat.toLocaleDateString(undefined, options)}`;
  };

  // Group workouts by Sunday boundary
  const groupWorkoutsByWeek = () => {
    const groups: { [key: string]: { sunday: Date; sessions: WorkoutSession[] } } = {};
    
    workouts.forEach(session => {
      const sun = getSunday(session.date);
      const key = sun.getTime().toString();
      
      if (!groups[key]) {
        groups[key] = { sunday: sun, sessions: [] };
      }
      groups[key].sessions.push(session);
    });

    // Sort weeks descending
    return Object.keys(groups)
      .sort((a, b) => Number(b) - Number(a))
      .map(k => groups[k]);
  };

  // Relative dates formatting
  const formatRelativeDate = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);

    const diff = today.getTime() - d.getTime();
    const daysDiff = Math.round(diff / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) return 'Today';
    if (daysDiff === 1) return 'Yesterday';
    if (daysDiff < 7) {
      return d.toLocaleDateString(undefined, { weekday: 'long' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Summary preview string for card header
  const getExercisePreview = (session: WorkoutSession) => {
    const names = Array.from(new Set(session.entries.map(e => e.movementName)));
    if (names.length <= 2) return names.join(', ');
    return `${names[0]}, ${names[1]}, and ${names.length - 2} more`;
  };

  // Summary volume for card header
  const getSessionVolume = (session: WorkoutSession) => {
    let volume = 0;
    session.entries.forEach(e => {
      if (typeof e.weight === 'number' && typeof e.reps === 'number') {
        volume += e.weight * e.reps;
      }
    });
    return Math.round(volume);
  };

  // Modals operations
  const openDeleteModal = (type: 'workout' | 'movement', workoutId: string, movementName?: string) => {
    setDeleteModal({ isOpen: true, type, workoutId, movementName });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, type: 'workout', workoutId: '' });
  };

  const executeDelete = async () => {
    if (!user) return;
    const { type, workoutId, movementName } = deleteModal;

    if (type === 'workout') {
      // Remove entire session
      await deleteWorkout(user.uid, workoutId);
    } else if (type === 'movement' && movementName) {
      // Remove all entries matching movementName in the workout session
      const targetSession = workouts.find(w => w.id === workoutId);
      if (targetSession) {
        const updatedEntries = targetSession.entries.filter(
          e => e.movementName.toLowerCase() !== movementName.toLowerCase()
        );
        
        const updatedSession: WorkoutSession = {
          ...targetSession,
          entries: updatedEntries
        };

        // Note: saveWorkout auto-deletes document if entries length === 0
        await saveWorkout(user.uid, updatedSession);
      }
    }

    closeDeleteModal();
    await loadHistory();
  };

  // Set updates inside history card
  const handleUpdateEntry = async (workoutId: string, entryId: string, updatedFields: Partial<WorkoutEntry>) => {
    if (!user) return;
    const session = workouts.find(w => w.id === workoutId);
    if (!session) return;

    const updatedSession: WorkoutSession = {
      ...session,
      entries: session.entries.map(e => e.id === entryId ? { ...e, ...updatedFields } : e)
    };

    await saveWorkout(user.uid, updatedSession);
    await loadHistory();
  };

  const handleDeleteEntry = async (workoutId: string, entryId: string) => {
    if (!user) return;
    const session = workouts.find(w => w.id === workoutId);
    if (!session) return;

    const updatedSession: WorkoutSession = {
      ...session,
      entries: session.entries.filter(e => e.id !== entryId)
    };

    await saveWorkout(user.uid, updatedSession);
    await loadHistory();
  };

  const handleDuplicateEntry = async (workoutId: string, entry: WorkoutEntry) => {
    if (!user) return;
    const session = workouts.find(w => w.id === workoutId);
    if (!session) return;

    const duplicated: WorkoutEntry = {
      ...entry,
      id: `set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now()
    };

    const updatedSession: WorkoutSession = {
      ...session,
      entries: [...session.entries, duplicated]
    };

    await saveWorkout(user.uid, updatedSession);
    await loadHistory();
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-fade-in pt-2">
        <div className="h-6 w-1/3 skeleton" />
        <SkeletonList count={3} />
      </div>
    );
  }

  const weeklyGroups = groupWorkoutsByWeek();

  return (
    <div className="flex flex-col gap-6 pt-2 pb-10">
      
      {/* Visual Header */}
      <div className="flex items-center justify-between border-b border-borderColor/60 pb-2 px-1">
        <h3 className="text-[10px] uppercase font-black tracking-widest text-textTertiary">
          Logged Workouts
        </h3>
        <span className="text-[10px] uppercase font-black tracking-widest text-accent">
          {workouts.length} total sessions
        </span>
      </div>

      {workouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-bgSecondary rounded-2xl border border-borderColor text-center py-16 transition-colors duration-200">
          <div className="p-3.5 bg-bgTertiary rounded-full text-textTertiary mb-3 animate-pulse-ring">
            <Calendar className="w-8 h-8" />
          </div>
          <p className="text-textSecondary text-sm font-semibold">No past workouts logged yet</p>
          <p className="text-textTertiary text-xs max-w-xs mt-1">Complete your active session in the Logger tab to begin archiving your progress!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {weeklyGroups.map((group) => {
            const weekRange = getWeekRange(group.sunday);
            
            return (
              <div key={weekRange} className="flex flex-col gap-3">
                {/* Week Header */}
                <h4 className="text-xs font-black uppercase tracking-wider text-accent border-b border-accent/20 pb-1 pl-1">
                  {weekRange}
                </h4>

                {/* Staggered lists */}
                <StaggeredList>
                  {group.sessions.map((session) => {
                    const expanded = expandedIds.has(session.id);
                    const relativeDate = formatRelativeDate(session.date);
                    const preview = getExercisePreview(session);
                    const volume = getSessionVolume(session);
                    const setTotal = session.entries.length;

                    return (
                      <div
                        key={session.id}
                        className="bg-bgSecondary border border-borderColor rounded-2xl shadow-sm card-depth overflow-hidden transition-colors duration-200"
                      >
                        {/* Collapsed Header Bar */}
                        <div
                          onClick={() => toggleExpand(session.id)}
                          className="flex items-center justify-between p-4 cursor-pointer select-none"
                        >
                          <div className="flex-1 min-w-0 mr-3">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-black uppercase text-accent tracking-wide">
                                {relativeDate}
                              </span>
                              <h5 className="font-extrabold text-sm text-textPrimary tracking-tight truncate">
                                {session.title}
                              </h5>
                            </div>
                            <p className="text-xs text-textTertiary truncate mt-0.5">
                              {preview}
                            </p>
                          </div>

                          <div className="flex items-center gap-3.5">
                            {/* Sets count badge */}
                            <span className="text-[10px] uppercase font-black tracking-wider text-textSecondary bg-bgTertiary px-2.5 py-1 rounded-xl">
                              {setTotal} sets · {volume} {settings.unit}
                            </span>
                            
                            {expanded ? (
                              <ChevronUp className="w-4 h-4 text-textTertiary" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-textTertiary" />
                            )}

                            {/* Delete Workout trash */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Avoid expanding
                                openDeleteModal('workout', session.id);
                              }}
                              className="p-1.5 bg-danger/10 text-danger hover:bg-danger/20 rounded-lg active:scale-95 transition-all duration-100 cursor-pointer"
                              aria-label="Remove workout session"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded details container */}
                        {expanded && (
                          <div className="border-t border-borderColor/60 p-4 bg-bgPrimary/30 animate-fade-in">
                            <WorkoutList
                              entries={session.entries}
                              onDeleteEntry={(entryId) => handleDeleteEntry(session.id, entryId)}
                              onDeleteMovement={(movementName) => openDeleteModal('movement', session.id, movementName)}
                              onUpdateEntry={(entryId, updated) => handleUpdateEntry(session.id, entryId, updated)}
                              onDuplicateEntry={(entry) => handleDuplicateEntry(session.id, entry)}
                              unit={settings.unit}
                            />
                          </div>
                        )}

                      </div>
                    );
                  })}
                </StaggeredList>
              </div>
            );
          })}
        </div>
      )}

      {/* Double Safety Glass Deletion Confirmation Overlay */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-bgSecondary border border-borderColor rounded-3xl p-5 max-w-xs w-full flex flex-col items-center text-center gap-4.5 shadow-card-shadow-lg animate-modal-in transition-colors duration-200">
            <div className="p-3 bg-danger/10 text-danger rounded-full">
              <Trash className="w-6 h-6 animate-pulse" />
            </div>
            
            <div>
              <h4 className="text-md font-black tracking-tight text-textPrimary">
                Confirm Deletion
              </h4>
              <p className="text-xs text-textSecondary leading-relaxed mt-1.5">
                {deleteModal.type === 'workout'
                  ? 'Are you sure you want to permanently delete this entire workout session?'
                  : `Are you sure you want to delete all logged sets of "${deleteModal.movementName}" from this session?`}
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
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
