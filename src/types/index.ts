export type MovementCategory = 'Legs' | 'Back' | 'Chest' | 'Shoulders' | 'Arms' | 'Core' | 'Cardio' | 'Other';

export interface Movement {
  id: string;
  name: string;
  category: MovementCategory;
  isCustom: boolean;
}

export interface WorkoutEntry {
  id: string;
  movementName: string;
  reps: number | '';
  weight: number | '';
  unit: 'kg' | 'lbs';
  notes?: string;
  createdAt: number;
}

export interface WorkoutSession {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  entries: WorkoutEntry[];
  createdAt: number;
  completed: boolean;
}

export interface TemplateEntry {
  movementName: string;
  reps: number | '';
  weight: number | '';
  unit: 'kg' | 'lbs';
}

export interface Template {
  id: string;
  name: string;
  entries: TemplateEntry[];
  createdAt: number;
  order: number;
}

export interface UserSettings {
  unit: 'kg' | 'lbs';
  theme: 'system' | 'light' | 'dark';
}
