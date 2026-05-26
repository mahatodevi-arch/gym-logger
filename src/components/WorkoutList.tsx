'use client';

import React, { useState } from 'react';
import { Trash2, Copy, Edit2, Check, X } from 'lucide-react';
import { WorkoutEntry } from '@/types';

interface WorkoutListProps {
  entries: WorkoutEntry[];
  onDeleteEntry: (entryId: string) => void;
  onDeleteMovement: (movementName: string) => void;
  onUpdateEntry: (entryId: string, updated: Partial<WorkoutEntry>) => void;
  onDuplicateEntry: (entry: WorkoutEntry) => void;
  unit: 'kg' | 'lbs';
}

export default function WorkoutList({
  entries,
  onDeleteEntry,
  onDeleteMovement,
  onUpdateEntry,
  onDuplicateEntry,
  unit
}: WorkoutListProps) {
  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'weight' | 'reps' | null>(null);
  const [editVal, setEditVal] = useState<string>('');

  // Group entries by movementName
  const groupedEntries: { [key: string]: WorkoutEntry[] } = {};
  entries.forEach((entry) => {
    if (!groupedEntries[entry.movementName]) {
      groupedEntries[entry.movementName] = [];
    }
    groupedEntries[entry.movementName].push(entry);
  });

  // Sort groups by the earliest created set in that group to preserve order
  const sortedMovements = Object.keys(groupedEntries).sort((a, b) => {
    const minA = Math.min(...groupedEntries[a].map(e => e.createdAt));
    const minB = Math.min(...groupedEntries[b].map(e => e.createdAt));
    return minA - minB;
  });

  const startEditing = (entryId: string, field: 'weight' | 'reps', currentVal: number | '') => {
    setEditingId(entryId);
    setEditingField(field);
    setEditVal(currentVal.toString());
  };

  const commitEdit = () => {
    if (!editingId || !editingField) return;
    const parsed = editingField === 'weight' ? parseFloat(editVal) : parseInt(editVal);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateEntry(editingId, { [editingField]: parsed });
    }
    cancelEdit();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingField(null);
    setEditVal('');
  };

  return (
    <div className="flex flex-col gap-4">
      {sortedMovements.map((movementName) => {
        const movementEntries = groupedEntries[movementName];
        
        return (
          <div
            key={movementName}
            className="bg-bgSecondary border border-borderColor rounded-2xl p-4 shadow-md transition-colors duration-200 animate-fade-in"
          >
            {/* Exercise Header */}
            <div className="flex items-center justify-between border-b border-borderColor/60 pb-2.5 mb-3">
              <div>
                <h3 className="font-extrabold text-md text-textPrimary tracking-tight">
                  {movementName}
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider text-textTertiary">
                  {movementEntries.length} {movementEntries.length === 1 ? 'set' : 'sets'} logged
                </span>
              </div>
              <button
                onClick={() => onDeleteMovement(movementName)}
                className="p-2 bg-danger/10 text-danger hover:bg-danger/20 rounded-xl active:scale-95 cursor-pointer transition-all duration-150"
                aria-label={`Delete all sets of ${movementName}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Set Grid Headers */}
            <div className="grid grid-cols-[30px_1fr_40px_40px_40px] items-center text-[10px] text-textTertiary uppercase font-black tracking-widest text-center px-1 mb-2">
              <span>Set</span>
              <span className="text-left pl-3">Weight × Reps</span>
              <span></span>
              <span></span>
              <span></span>
            </div>

            {/* Sets Rows */}
            <div className="flex flex-col gap-2">
              {movementEntries.map((entry, index) => {
                const isEditingWeight = editingId === entry.id && editingField === 'weight';
                const isEditingReps = editingId === entry.id && editingField === 'reps';

                return (
                  <div
                    key={entry.id}
                    className="grid grid-cols-[30px_1fr_40px_40px_40px] items-center gap-1.5 p-1 bg-bgTertiary border border-transparent rounded-xl hover:border-borderColor/60 transition-all duration-150"
                  >
                    {/* Set Number */}
                    <span className="text-xs font-black text-center text-textTertiary">
                      {index + 1}
                    </span>

                    {/* Weight & Reps Inline Interactive Display */}
                    <div className="flex items-center gap-1.5 pl-3 text-sm font-bold text-textPrimary select-none">
                      {/* Weight Value */}
                      {isEditingWeight ? (
                        <input
                          type="number"
                          value={editVal}
                          onChange={(e) => setEditVal(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                          className="w-16 text-center text-xs font-black bg-bgSecondary border border-accent rounded px-1.5 py-0.5 text-textPrimary"
                          autoFocus
                        />
                      ) : (
                        <span
                          onClick={() => startEditing(entry.id, 'weight', entry.weight)}
                          className="underline decoration-dashed decoration-textTertiary/60 hover:text-accent hover:decoration-accent cursor-pointer"
                        >
                          {entry.weight}
                        </span>
                      )}

                      <span className="text-xxs text-textTertiary font-semibold">{entry.unit}</span>
                      <span className="text-xxs text-textTertiary font-black">×</span>

                      {/* Reps Value */}
                      {isEditingReps ? (
                        <input
                          type="number"
                          value={editVal}
                          onChange={(e) => setEditVal(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                          className="w-12 text-center text-xs font-black bg-bgSecondary border border-accent rounded px-1.5 py-0.5 text-textPrimary"
                          autoFocus
                        />
                      ) : (
                        <span
                          onClick={() => startEditing(entry.id, 'reps', entry.reps)}
                          className="underline decoration-dashed decoration-textTertiary/60 hover:text-accent hover:decoration-accent cursor-pointer"
                        >
                          {entry.reps}
                        </span>
                      )}

                      <span className="text-xxs text-textTertiary font-semibold">reps</span>
                    </div>

                    {/* Commit/Cancel Inline Controls */}
                    {editingId === entry.id ? (
                      <div className="col-span-3 flex items-center justify-end gap-1.5 pr-2">
                        <button
                          onClick={commitEdit}
                          className="p-1 bg-emerald-500/10 text-emerald-400 rounded-lg active:scale-95 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1 bg-danger/10 text-danger rounded-lg active:scale-95 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Duplicate Button */}
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => onDuplicateEntry(entry)}
                            className="p-1.5 text-textTertiary hover:text-accent active:scale-95 rounded-lg cursor-pointer transition-colors duration-150"
                            aria-label="Duplicate set"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Inline Edit Pen */}
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => startEditing(entry.id, 'weight', entry.weight)}
                            className="p-1.5 text-textTertiary hover:text-accent active:scale-95 rounded-lg cursor-pointer transition-colors duration-150"
                            aria-label="Edit set weight"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Delete Single Set Trash */}
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => onDeleteEntry(entry.id)}
                            className="p-1.5 text-textTertiary hover:text-danger active:scale-95 rounded-lg cursor-pointer transition-colors duration-150"
                            aria-label="Delete set"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        );
      })}
    </div>
  );
}
