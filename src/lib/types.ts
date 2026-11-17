export type Role = "admin" | "adult" | "child";

export interface Household {
  id: string;
  name: string;
}

export interface Member {
  id: string;
  household_id: string | null; // null solo para el administrador de la aplicación
  user_id: string | null;
  username: string | null;
  name: string;
  emoji: string;
  color: string;
  role: Role;
  sort_order: number;
}

export interface Task {
  id: string;
  household_id: string;
  member_id: string;
  title: string;
  emoji: string;
  weekdays: number[]; // 0 = lunes ... 6 = domingo
  points: number;
  active: boolean;
}

export interface Completion {
  id: string;
  household_id: string;
  task_id: string;
  done_on: string; // YYYY-MM-DD
  completed_by: string | null;
}

export interface Guardian {
  household_id: string;
  guardian_id: string;
  child_id: string;
}
