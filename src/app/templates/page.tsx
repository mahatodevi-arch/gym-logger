'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { getTemplates, saveTemplate, deleteTemplate } from '@/lib/firestore';
import { Template, TemplateEntry } from '@/types';
import { SkeletonList } from '@/components/Skeletons';
import {
  Plus, Trash2, ChevronUp, ChevronDown, Edit2, Check,
  X, GripVertical, Dumbbell, BookOpen, Trash
} from 'lucide-react';

// ─── Toast ───────────────────────────────────────────────────────────────────
interface Toast { id: string; message: string; undoFn?: () => void }

function ToastBar({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div className="flex items-center justify-between gap-3 bg-bgSecondary border border-borderColor rounded-2xl px-4 py-3 shadow-lg animate-slide-up">
      <span className="text-xs text-textSecondary font-semibold">{toast.message}</span>
      {toast.undoFn && (
        <button
          onClick={() => { toast.undoFn!(); onDismiss(toast.id); }}
          className="text-xs font-black text-accent uppercase tracking-wider active-scale cursor-pointer"
        >
          UNDO
        </button>
      )}
    </div>
  );
}

// ─── Inline entry row in editor ───────────────────────────────────────────────
function EntryRow({
  entry,
  index,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  unit,
}: {
  entry: TemplateEntry;
  index: number;
  onUpdate: (i: number, field: keyof TemplateEntry, value: string | number) => void;
  onRemove: (i: number) => void;
  onMoveUp: (i: number) => void;
  onMoveDown: (i: number) => void;
  isFirst: boolean;
  isLast: boolean;
  unit: 'kg' | 'lbs';
}) {
  return (
    <div className="flex items-center gap-2 bg-bgPrimary rounded-xl p-2.5 border border-borderColor/60">
      {/* Reorder arrows */}
      <div className="flex flex-col gap-0.5 shrink-0">
        <button
          onClick={() => onMoveUp(index)}
          disabled={isFirst}
          className="p-0.5 text-textTertiary disabled:opacity-20 active-scale cursor-pointer"
          aria-label="Move up"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onMoveDown(index)}
          disabled={isLast}
          className="p-0.5 text-textTertiary disabled:opacity-20 active-scale cursor-pointer"
          aria-label="Move down"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Movement name */}
      <input
        type="text"
        value={entry.movementName}
        onChange={e => onUpdate(index, 'movementName', e.target.value)}
        placeholder="Exercise name"
        className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-textPrimary placeholder:text-textTertiary outline-none border-none"
      />

      {/* Reps */}
      <div className="flex items-center gap-0.5 bg-bgSecondary rounded-lg px-2 py-1.5 w-14 shrink-0">
        <input
          type="number"
          inputMode="numeric"
          value={entry.reps === '' ? '' : entry.reps}
          onChange={e => onUpdate(index, 'reps', e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="Reps"
          className="w-full bg-transparent text-xs font-bold text-textPrimary text-center outline-none border-none"
        />
      </div>

      {/* Weight */}
      <div className="flex items-center gap-0.5 bg-bgSecondary rounded-lg px-2 py-1.5 w-16 shrink-0">
        <input
          type="number"
          inputMode="decimal"
          value={entry.weight === '' ? '' : entry.weight}
          onChange={e => onUpdate(index, 'weight', e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={unit}
          className="w-full bg-transparent text-xs font-bold text-textPrimary text-center outline-none border-none"
        />
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(index)}
        className="p-1.5 text-danger/70 hover:text-danger rounded-lg active-scale cursor-pointer shrink-0"
        aria-label="Remove entry"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────
function TemplateCard({
  template,
  index,
  total,
  unit,
  onMoveUp,
  onMoveDown,
  onDelete,
  onSave,
}: {
  template: Template;
  index: number;
  total: number;
  unit: 'kg' | 'lbs';
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  onSave: (updated: Template) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Template>(template);

  useEffect(() => {
    setDraft(template);
  }, [template]);

  const addEntry = () => {
    setDraft(prev => ({
      ...prev,
      entries: [...prev.entries, { movementName: '', reps: '', weight: '', unit }]
    }));
  };

  const updateEntry = (i: number, field: keyof TemplateEntry, value: string | number) => {
    setDraft(prev => ({
      ...prev,
      entries: prev.entries.map((e, idx) => idx === i ? { ...e, [field]: value } : e)
    }));
  };

  const removeEntry = (i: number) => {
    setDraft(prev => ({
      ...prev,
      entries: prev.entries.filter((_, idx) => idx !== i)
    }));
  };

  const moveEntryUp = (i: number) => {
    if (i === 0) return;
    setDraft(prev => {
      const entries = [...prev.entries];
      [entries[i - 1], entries[i]] = [entries[i], entries[i - 1]];
      return { ...prev, entries };
    });
  };

  const moveEntryDown = (i: number) => {
    setDraft(prev => {
      const entries = [...prev.entries];
      if (i >= entries.length - 1) return prev;
      [entries[i], entries[i + 1]] = [entries[i + 1], entries[i]];
      return { ...prev, entries };
    });
  };

  const handleSave = () => {
    const clean = {
      ...draft,
      entries: draft.entries.filter(e => e.movementName.trim() !== '')
    };
    onSave(clean);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(template);
    setEditing(false);
  };

  return (
    <div className="bg-bgSecondary border border-borderColor rounded-2xl shadow-sm card-depth overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3.5">
        {/* Reorder arrows */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            onClick={() => onMoveUp(template.id)}
            disabled={index === 0}
            className="p-0.5 text-textTertiary disabled:opacity-20 active-scale cursor-pointer"
            aria-label="Move template up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onMoveDown(template.id)}
            disabled={index === total - 1}
            className="p-0.5 text-textTertiary disabled:opacity-20 active-scale cursor-pointer"
            aria-label="Move template down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Name (editable) */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              type="text"
              value={draft.name}
              onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-bgPrimary border border-accent/40 rounded-xl px-3 py-1.5 text-sm font-extrabold text-textPrimary outline-none"
              autoFocus
            />
          ) : (
            <div>
              <h4 className="font-extrabold text-sm text-textPrimary tracking-tight truncate">
                {template.name}
              </h4>
              <p className="text-[11px] text-textTertiary mt-0.5">
                {template.entries.length} exercise{template.entries.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                className="p-2 bg-accent/10 text-accent rounded-xl active-scale cursor-pointer"
                aria-label="Save template"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancel}
                className="p-2 bg-bgTertiary text-textSecondary rounded-xl active-scale cursor-pointer"
                aria-label="Cancel editing"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="p-2 bg-bgTertiary text-textSecondary rounded-xl active-scale cursor-pointer"
                aria-label="Edit template"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(template.id, template.name)}
                className="p-2 bg-danger/10 text-danger rounded-xl active-scale cursor-pointer"
                aria-label="Delete template"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Entries preview / edit */}
      <div className="border-t border-borderColor/50 px-4 py-3 bg-bgPrimary/40">
        {editing ? (
          <div className="flex flex-col gap-2">
            {draft.entries.map((entry, i) => (
              <EntryRow
                key={i}
                entry={entry}
                index={i}
                onUpdate={updateEntry}
                onRemove={removeEntry}
                onMoveUp={moveEntryUp}
                onMoveDown={moveEntryDown}
                isFirst={i === 0}
                isLast={i === draft.entries.length - 1}
                unit={unit}
              />
            ))}
            <button
              onClick={addEntry}
              className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-dashed border-accent/40 text-accent text-xs font-bold active-scale cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Exercise
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {template.entries.slice(0, 4).map((entry, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs font-semibold text-textSecondary truncate max-w-[65%]">
                  {entry.movementName}
                </span>
                <span className="text-[11px] text-textTertiary font-medium">
                  {entry.reps !== '' ? `${entry.reps} reps` : '—'} · {entry.weight !== '' ? `${entry.weight} ${entry.unit}` : '—'}
                </span>
              </div>
            ))}
            {template.entries.length > 4 && (
              <p className="text-[11px] text-textTertiary mt-0.5">
                +{template.entries.length - 4} more exercises…
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const { user } = useAuth();
  const { settings } = useSettings();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    templateId: string;
    templateName: string;
  }>({ isOpen: false, templateId: '', templateName: '' });

  // Creating new template
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const pushToast = (message: string, undoFn?: () => void) => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, message, undoFn }]);
  };

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const loadTemplates = async () => {
    if (!user) return;
    try {
      const data = await getTemplates(user.uid);
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [user]);

  const handleSaveTemplate = async (updated: Template) => {
    if (!user) return;
    // Optimistic update
    setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
    try {
      await saveTemplate(user.uid, updated);
    } catch (err) {
      console.error('Failed to save template:', err);
      await loadTemplates();
    }
  };

  const handleMoveUp = async (id: string) => {
    if (!user) return;
    const idx = templates.findIndex(t => t.id === id);
    if (idx <= 0) return;

    const next = templates.map(t => ({ ...t }));
    [next[idx - 1].order, next[idx].order] = [next[idx].order, next[idx - 1].order];
    const sorted = [...next].sort((a, b) => a.order - b.order);
    setTemplates(sorted);

    try {
      await Promise.all([
        saveTemplate(user.uid, next[idx - 1]),
        saveTemplate(user.uid, next[idx]),
      ]);
    } catch (err) {
      console.error('Failed to reorder templates:', err);
      await loadTemplates();
    }
  };

  const handleMoveDown = async (id: string) => {
    if (!user) return;
    const idx = templates.findIndex(t => t.id === id);
    if (idx < 0 || idx >= templates.length - 1) return;

    const next = templates.map(t => ({ ...t }));
    [next[idx].order, next[idx + 1].order] = [next[idx + 1].order, next[idx].order];
    const sorted = [...next].sort((a, b) => a.order - b.order);
    setTemplates(sorted);

    try {
      await Promise.all([
        saveTemplate(user.uid, next[idx]),
        saveTemplate(user.uid, next[idx + 1]),
      ]);
    } catch (err) {
      console.error('Failed to reorder templates:', err);
      await loadTemplates();
    }
  };

  const openDeleteModal = (templateId: string, templateName: string) => {
    setDeleteModal({ isOpen: true, templateId, templateName });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, templateId: '', templateName: '' });
  };

  const executeDelete = async () => {
    if (!user) return;
    const { templateId, templateName } = deleteModal;

    const snapshot = templates.find(t => t.id === templateId);
    // Optimistic remove
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    closeDeleteModal();

    pushToast(`"${templateName}" deleted`, async () => {
      if (snapshot) {
        await saveTemplate(user.uid, snapshot);
        await loadTemplates();
      }
    });

    try {
      await deleteTemplate(user.uid, templateId);
    } catch (err) {
      console.error('Failed to delete template:', err);
      await loadTemplates();
    }
  };

  const handleCreate = async () => {
    if (!user || !newName.trim()) return;
    const maxOrder = templates.length > 0 ? Math.max(...templates.map(t => t.order)) + 1 : 0;
    const newTemplate: Template = {
      id: `tp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: newName.trim(),
      entries: [],
      createdAt: Date.now(),
      order: maxOrder,
    };

    setTemplates(prev => [...prev, newTemplate]);
    setCreating(false);
    setNewName('');

    try {
      await saveTemplate(user.uid, newTemplate);
    } catch (err) {
      console.error('Failed to create template:', err);
      await loadTemplates();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-fade-in pt-2">
        <div className="h-6 w-1/2 skeleton" />
        <SkeletonList count={3} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pt-2 pb-10">

      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-borderColor/60 pb-2 px-1">
        <h3 className="text-[10px] uppercase font-black tracking-widest text-textTertiary">
          Routine Templates
        </h3>
        <button
          onClick={() => { setCreating(true); setNewName(''); }}
          className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-wider text-accent bg-accent/10 px-3 py-1.5 rounded-xl active-scale cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          New
        </button>
      </div>

      {/* New Template Input */}
      {creating && (
        <div className="flex items-center gap-2 bg-bgSecondary border border-accent/40 rounded-2xl px-4 py-3 shadow-md animate-fade-in">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
            placeholder="Template name…"
            className="flex-1 bg-transparent text-sm font-bold text-textPrimary placeholder:text-textTertiary outline-none"
            autoFocus
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="p-2 bg-accent text-bgPrimary rounded-xl active-scale disabled:opacity-40 cursor-pointer"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCreating(false)}
            className="p-2 bg-bgTertiary text-textSecondary rounded-xl active-scale cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Templates List */}
      {templates.length === 0 && !creating ? (
        <div className="flex flex-col items-center justify-center p-8 bg-bgSecondary rounded-2xl border border-borderColor text-center py-16">
          <div className="p-3.5 bg-bgTertiary rounded-full text-textTertiary mb-3 animate-pulse-ring">
            <BookOpen className="w-8 h-8" />
          </div>
          <p className="text-textSecondary text-sm font-semibold">No routine templates yet</p>
          <p className="text-textTertiary text-xs max-w-xs mt-1">
            Create a template to quickly pre-fill your Logger with a set of exercises.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {templates.map((template, index) => (
            <TemplateCard
              key={template.id}
              template={template}
              index={index}
              total={templates.length}
              unit={settings.unit}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onDelete={openDeleteModal}
              onSave={handleSaveTemplate}
            />
          ))}
        </div>
      )}

      {/* Toast Stack */}
      {toasts.length > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-40 flex flex-col gap-2">
          {toasts.map(toast => (
            <ToastBar key={toast.id} toast={toast} onDismiss={dismissToast} />
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
              <h4 className="text-md font-black tracking-tight text-textPrimary">Delete Template?</h4>
              <p className="text-xs text-textSecondary leading-relaxed mt-1.5">
                &quot;{deleteModal.templateName}&quot; will be permanently removed. You can undo within 5 seconds.
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
