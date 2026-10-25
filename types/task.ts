export type TaskPriority = "low" | "medium" | "high";
export type TaskCategory = "today" | "later";
export type FilterTab = "all" | "today" | "later";

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  category: TaskCategory;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface NewTaskInput {
  text: string;
  category?: TaskCategory;
  priority?: TaskPriority;
  dueDate?: string;
}
