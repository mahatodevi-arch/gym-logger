'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, 
  signOut, onAuthStateChanged, User 
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { getMovements, saveMovement, getTemplates, saveTemplate } from '@/lib/firestore';
import { Movement, Template } from '@/types';

interface AuthContextType {
  user: User | { uid: string; email: string; displayName: string } | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SEED_MOVEMENTS: Omit<Movement, 'id'>[] = [
  // Legs
  { name: 'Squat', category: 'Legs', isCustom: false },
  { name: 'Front Squat', category: 'Legs', isCustom: false },
  { name: 'Hack Squat', category: 'Legs', isCustom: false },
  { name: 'Leg Press', category: 'Legs', isCustom: false },
  { name: 'Romanian Deadlift', category: 'Legs', isCustom: false },
  { name: 'Walking Lunge', category: 'Legs', isCustom: false },
  { name: 'Bulgarian Split Squat', category: 'Legs', isCustom: false },
  { name: 'Leg Extension', category: 'Legs', isCustom: false },
  { name: 'Leg Curl', category: 'Legs', isCustom: false },
  { name: 'Hip Thrust', category: 'Legs', isCustom: false },
  { name: 'Calf Raise', category: 'Legs', isCustom: false },
  { name: 'Goblet Squat', category: 'Legs', isCustom: false },
  
  // Back
  { name: 'Deadlift', category: 'Back', isCustom: false },
  { name: 'Barbell Row', category: 'Back', isCustom: false },
  { name: 'Dumbbell Row', category: 'Back', isCustom: false },
  { name: 'Seated Cable Row', category: 'Back', isCustom: false },
  { name: 'T-Bar Row', category: 'Back', isCustom: false },
  { name: 'Pull-Up', category: 'Back', isCustom: false },
  { name: 'Chin-Up', category: 'Back', isCustom: false },
  { name: 'Lat Pulldown', category: 'Back', isCustom: false },
  { name: 'Face Pull', category: 'Back', isCustom: false },
  { name: 'Shrug', category: 'Back', isCustom: false },

  // Chest
  { name: 'Bench Press', category: 'Chest', isCustom: false },
  { name: 'Incline Bench Press', category: 'Chest', isCustom: false },
  { name: 'Dumbbell Bench Press', category: 'Chest', isCustom: false },
  { name: 'Incline Dumbbell Press', category: 'Chest', isCustom: false },
  { name: 'Cable Fly', category: 'Chest', isCustom: false },
  { name: 'Dumbbell Fly', category: 'Chest', isCustom: false },
  { name: 'Chest Dip', category: 'Chest', isCustom: false },
  { name: 'Push-Up', category: 'Chest', isCustom: false },
  { name: 'Machine Chest Press', category: 'Chest', isCustom: false },

  // Shoulders
  { name: 'Overhead Press', category: 'Shoulders', isCustom: false },
  { name: 'Dumbbell Shoulder Press', category: 'Shoulders', isCustom: false },
  { name: 'Arnold Press', category: 'Shoulders', isCustom: false },
  { name: 'Lateral Raise', category: 'Shoulders', isCustom: false },
  { name: 'Front Raise', category: 'Shoulders', isCustom: false },
  { name: 'Reverse Fly', category: 'Shoulders', isCustom: false },
  { name: 'Upright Row', category: 'Shoulders', isCustom: false },

  // Arms
  { name: 'Barbell Curl', category: 'Arms', isCustom: false },
  { name: 'Dumbbell Curl', category: 'Arms', isCustom: false },
  { name: 'Hammer Curl', category: 'Arms', isCustom: false },
  { name: 'Preacher Curl', category: 'Arms', isCustom: false },
  { name: 'Cable Curl', category: 'Arms', isCustom: false },
  { name: 'Tricep Pushdown', category: 'Arms', isCustom: false },
  { name: 'Overhead Tricep Extension', category: 'Arms', isCustom: false },
  { name: 'Skull Crusher', category: 'Arms', isCustom: false },
  { name: 'Close-Grip Bench Press', category: 'Arms', isCustom: false },
  { name: 'Tricep Dip', category: 'Arms', isCustom: false },

  // Core
  { name: 'Plank', category: 'Core', isCustom: false },
  { name: 'Hanging Leg Raise', category: 'Core', isCustom: false },
  { name: 'Cable Crunch', category: 'Core', isCustom: false },
  { name: 'Ab Wheel Rollout', category: 'Core', isCustom: false },
  { name: 'Dead Bug', category: 'Core', isCustom: false },
  { name: 'Russian Twist', category: 'Core', isCustom: false },
  { name: 'Decline Sit-Up', category: 'Core', isCustom: false },

  // Cardio
  { name: 'Running', category: 'Cardio', isCustom: false },
  { name: 'Rowing Machine', category: 'Cardio', isCustom: false },
  { name: 'Stationary Bike', category: 'Cardio', isCustom: false },
  { name: 'Jump Rope', category: 'Cardio', isCustom: false },
  { name: 'Stair Climber', category: 'Cardio', isCustom: false }
];

const SEED_TEMPLATES: Omit<Template, 'id' | 'createdAt'>[] = [
  {
    name: 'Majestic Push Day',
    order: 0,
    entries: [
      { movementName: 'Bench Press', reps: 10, weight: 135, unit: 'lbs' },
      { movementName: 'Overhead Press', reps: 8, weight: 95, unit: 'lbs' },
      { movementName: 'Tricep Pushdown', reps: 12, weight: 50, unit: 'lbs' }
    ]
  },
  {
    name: 'Majestic Pull Day',
    order: 1,
    entries: [
      { movementName: 'Deadlift', reps: 5, weight: 225, unit: 'lbs' },
      { movementName: 'Lat Pulldown', reps: 10, weight: 120, unit: 'lbs' },
      { movementName: 'Hammer Curl', reps: 12, weight: 25, unit: 'lbs' }
    ]
  },
  {
    name: 'Majestic Leg Day',
    order: 2,
    entries: [
      { movementName: 'Squat', reps: 10, weight: 185, unit: 'lbs' },
      { movementName: 'Romanian Deadlift', reps: 10, weight: 135, unit: 'lbs' },
      { movementName: 'Calf Raise', reps: 15, weight: 150, unit: 'lbs' }
    ]
  }
];

export const seedUserInitialData = async (userId: string) => {
  try {
    const existingMovements = await getMovements(userId);
    if (existingMovements.length === 0) {
      console.log('Seeding initial movements library...');
      // Write movements
      for (const m of SEED_MOVEMENTS) {
        const id = `mv-${Math.random().toString(36).substr(2, 9)}`;
        await saveMovement(userId, { id, ...m });
      }
    }

    const existingTemplates = await getTemplates(userId);
    if (existingTemplates.length === 0) {
      console.log('Seeding initial routine templates...');
      // Write templates
      for (const t of SEED_TEMPLATES) {
        const id = `tp-${Math.random().toString(36).substr(2, 9)}`;
        await saveTemplate(userId, { id, createdAt: Date.now(), ...t });
      }
    }
  } catch (err) {
    console.error('Failed to seed user default data:', err);
  }
};

export const AuthContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      // Mock mode auth state syncing
      const cached = localStorage.getItem('gym-log-mock:guest-user');
      if (cached) {
        setUser(JSON.parse(cached));
      }
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Async background seed
        await seedUserInitialData(firebaseUser.uid);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    if (!isFirebaseConfigured) {
      // Mock login as Guest
      const guest = {
        uid: 'guest-user',
        email: 'guest@gymlogger.app',
        displayName: 'Gym Guest'
      };
      localStorage.setItem('gym-log-mock:guest-user', JSON.stringify(guest));
      setUser(guest);
      await seedUserInitialData(guest.uid);
      setLoading(false);
      return;
    }

    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.warn("Popup blocked, trying redirect fallback...", err);
      try {
        await signInWithRedirect(auth, provider);
      } catch (redirectErr) {
        console.error("Authentication failed:", redirectErr);
        setLoading(false);
      }
    }
  };

  const logout = async () => {
    setLoading(true);
    if (!isFirebaseConfigured) {
      localStorage.removeItem('gym-log-mock:guest-user');
      setUser(null);
      setLoading(false);
      return;
    }

    await signOut(auth);
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be nested within an AuthContextProvider');
  }
  return context;
};
