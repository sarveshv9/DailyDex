import type { SubTask } from "./task";

export interface RoutineItem {
  id: string;
  time: string;
  task: string;
  description: string;
  imageKey?: string;
  insertionOrder?: number;
  daysOfWeek?: number[]; // [0,1,2,3,4,5,6] (0 = Sunday)
  date?: string; // "YYYY-MM-DD"
  duration?: number;
  subtasks?: SubTask[];
  parentId?: string; // ID of recurring parent for one-off modifications
  isSkipped?: boolean; // Deleted one-off occurrence of a recurring task
  completed?: boolean;
}

export interface RoutineFormData {
  time: string;
  task: string;
  description: string;
  imageKey?: string;
  daysOfWeek: number[];
  date?: string;
  duration?: number;
  subtasks?: SubTask[];
}
