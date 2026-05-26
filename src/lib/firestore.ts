import { db, isFirebaseConfigured } from './firebase';
import { 
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, 
  query, orderBy, where, writeBatch 
} from 'firebase/firestore';
import { Movement, WorkoutSession, WorkoutEntry, Template, UserSettings } from '../types';

// Mock helper stores data in localStorage scoped by userId
const getMockStore = <T>(userId: string, key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  const saved = localStorage.getItem(`gym-log-mock:${userId}:${key}`);
  return saved ? JSON.parse(saved) : fallback;
};

const setMockStore = <T>(userId: string, key: string, data: T): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`gym-log-mock:${userId}:${key}`, JSON.stringify(data));
};

const isMock = !isFirebaseConfigured;

// ==========================================
// MOVEMENTS METHODS
// ==========================================

export const getMovements = async (userId: string): Promise<Movement[]> => {
  if (isMock) {
    return getMockStore<Movement[]>(userId, 'movements', []);
  }

  const colRef = collection(db, 'users', userId, 'movements');
  const snap = await getDocs(colRef);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Movement));
};

export const saveMovement = async (userId: string, movement: Movement): Promise<void> => {
  if (isMock) {
    const list = await getMovements(userId);
    const filtered = list.filter(m => m.id !== movement.id);
    setMockStore(userId, 'movements', [...filtered, movement]);
    return;
  }

  const docRef = doc(db, 'users', userId, 'movements', movement.id);
  await setDoc(docRef, movement);
};

export const deleteMovement = async (userId: string, movementId: string): Promise<void> => {
  if (isMock) {
    const list = await getMovements(userId);
    setMockStore(userId, 'movements', list.filter(m => m.id !== movementId));
    return;
  }

  const docRef = doc(db, 'users', userId, 'movements', movementId);
  await deleteDoc(docRef);
};

// ==========================================
// WORKOUTS METHODS
// ==========================================

export const getWorkouts = async (userId: string): Promise<WorkoutSession[]> => {
  if (isMock) {
    const workouts = getMockStore<WorkoutSession[]>(userId, 'workouts', []);
    // Rule: Filter out workouts with 0 entries
    return workouts
      .filter(w => w.entries && w.entries.length > 0)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  const colRef = collection(db, 'users', userId, 'workouts');
  const q = query(colRef, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkoutSession));
  // Rule: Filter out workouts with 0 entries
  return list.filter(w => w.entries && w.entries.length > 0);
};

export const saveWorkout = async (userId: string, workout: WorkoutSession): Promise<void> => {
  // Rule: If the workout has 0 entries, delete the whole workout document
  if (workout.entries.length === 0) {
    await deleteWorkout(userId, workout.id);
    return;
  }

  if (isMock) {
    const list = getMockStore<WorkoutSession[]>(userId, 'workouts', []);
    const filtered = list.filter(w => w.id !== workout.id);
    setMockStore(userId, 'workouts', [...filtered, workout]);
    return;
  }

  const docRef = doc(db, 'users', userId, 'workouts', workout.id);
  await setDoc(docRef, workout);
};

export const deleteWorkout = async (userId: string, workoutId: string): Promise<void> => {
  if (isMock) {
    const list = getMockStore<WorkoutSession[]>(userId, 'workouts', []);
    setMockStore(userId, 'workouts', list.filter(w => w.id !== workoutId));
    return;
  }

  const docRef = doc(db, 'users', userId, 'workouts', workoutId);
  await deleteDoc(docRef);
};

// Firestore helper: addEntriesToWorkout writes entries in a single operation
export const addEntriesToWorkout = async (
  userId: string,
  workoutId: string,
  newEntries: WorkoutEntry[],
  workoutTitle: string = "Workout Session"
): Promise<void> => {
  if (isMock) {
    const workouts = getMockStore<WorkoutSession[]>(userId, 'workouts', []);
    let workout = workouts.find(w => w.id === workoutId);
    
    if (!workout) {
      workout = {
        id: workoutId,
        title: workoutTitle,
        date: new Date().toISOString().split('T')[0],
        entries: [],
        createdAt: Date.now(),
        completed: false
      };
    }

    workout.entries = [...workout.entries, ...newEntries];
    
    const filtered = workouts.filter(w => w.id !== workoutId);
    setMockStore(userId, 'workouts', [...filtered, workout]);
    return;
  }

  const docRef = doc(db, 'users', userId, 'workouts', workoutId);
  const docSnap = await getDoc(docRef);
  
  let workoutData: WorkoutSession;
  
  if (docSnap.exists()) {
    workoutData = docSnap.data() as WorkoutSession;
    workoutData.entries = [...(workoutData.entries || []), ...newEntries];
  } else {
    workoutData = {
      id: workoutId,
      title: workoutTitle,
      date: new Date().toISOString().split('T')[0],
      entries: newEntries,
      createdAt: Date.now(),
      completed: false
    };
  }

  await setDoc(docRef, workoutData);
};

// Firestore helper: delegates to addEntriesToWorkout (one read + one write)
export const addEntryToWorkout = async (
  userId: string,
  workoutId: string,
  entry: WorkoutEntry,
  workoutTitle?: string
): Promise<void> => {
  await addEntriesToWorkout(userId, workoutId, [entry], workoutTitle);
};

// ==========================================
// TEMPLATES METHODS
// ==========================================

export const getTemplates = async (userId: string): Promise<Template[]> => {
  if (isMock) {
    return getMockStore<Template[]>(userId, 'templates', [])
      .sort((a, b) => a.order - b.order);
  }

  const colRef = collection(db, 'users', userId, 'templates');
  const q = query(colRef, orderBy('order', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Template));
};

export const saveTemplate = async (userId: string, template: Template): Promise<void> => {
  if (isMock) {
    const list = await getTemplates(userId);
    const filtered = list.filter(t => t.id !== template.id);
    setMockStore(userId, 'templates', [...filtered, template]);
    return;
  }

  const docRef = doc(db, 'users', userId, 'templates', template.id);
  await setDoc(docRef, template);
};

export const deleteTemplate = async (userId: string, templateId: string): Promise<void> => {
  if (isMock) {
    const list = await getTemplates(userId);
    setMockStore(userId, 'templates', list.filter(t => t.id !== templateId));
    return;
  }

  const docRef = doc(db, 'users', userId, 'templates', templateId);
  await deleteDoc(docRef);
};

// ==========================================
// SETTINGS METHODS
// ==========================================

export const getSettings = async (userId: string): Promise<UserSettings> => {
  const defaultSettings: UserSettings = { unit: 'lbs', theme: 'system' };
  
  if (isMock) {
    return getMockStore<UserSettings>(userId, 'settings', defaultSettings);
  }

  const docRef = doc(db, 'users', userId, 'settings', 'current');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as UserSettings;
  }
  return defaultSettings;
};

export const saveSettings = async (userId: string, settings: UserSettings): Promise<void> => {
  if (isMock) {
    setMockStore(userId, 'settings', settings);
    return;
  }

  const docRef = doc(db, 'users', userId, 'settings', 'current');
  await setDoc(docRef, settings);
};
