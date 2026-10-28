import { useCallback, useMemo, useState } from "react";
import {
  CATEGORY_COLORS,
  FALLBACK_CATEGORY_COLORS,
} from "../constants/categoryColors";
import {
  addMinutesToTime,
  guessRoutineIconKey,
  RoutineItem,
  SubTask,
} from "../utils/utils";

export const DAYS_OF_WEEK = [
  { label: "S", full: "Sun", value: 0 },
  { label: "M", full: "Mon", value: 1 },
  { label: "T", full: "Tue", value: 2 },
  { label: "W", full: "Wed", value: 3 },
  { label: "T", full: "Thu", value: 4 },
  { label: "F", full: "Fri", value: 5 },
  { label: "S", full: "Sat", value: 6 },
] as const;

export const DURATION_PRESETS = [10, 15, 20, 30, 45, 60, 90, 120];

export const TASK_COLORS: Record<string, string> = CATEGORY_COLORS;
export const FALLBACK_COLORS = FALLBACK_CATEGORY_COLORS;

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

export interface RoutineTaskFormState {
  task: string;
  time: string;
  duration: number;
  imageKey: string;
  daysOfWeek: number[];
  notes: string;
  subtasks: SubTask[];
}

export type ActivePickerType = "none" | "time" | "duration" | "repeat" | "details" | "icon";

export type RoutineItemWithNotes = Partial<RoutineItem> & { notes?: string };

export interface UseRoutineTaskFormOptions {
  initialItem?: RoutineItemWithNotes | null;
  defaultTime?: string;
}

const getItemNotes = (item?: RoutineItemWithNotes | null): string =>
  item?.description || item?.notes || "";

export function useRoutineTaskForm(options: UseRoutineTaskFormOptions = {}) {
  const { initialItem, defaultTime = "8:00 AM" } = options;

  const [formState, setFormState] = useState<RoutineTaskFormState>({
    task: initialItem?.task || "",
    time: initialItem?.time || defaultTime,
    duration: initialItem?.duration || 30,
    imageKey: initialItem?.imageKey || "breathe",
    daysOfWeek:
      initialItem?.daysOfWeek && initialItem.daysOfWeek.length > 0
        ? initialItem.daysOfWeek
        : [0, 1, 2, 3, 4, 5, 6],
    notes: getItemNotes(initialItem),
    subtasks: initialItem?.subtasks || [],
  });

  const [activePicker, setActivePicker] = useState<ActivePickerType>("none");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconPickerCat, setIconPickerCat] = useState(0);

  // Computed accent color for task
  const taskColor = useMemo(() => {
    if (formState.imageKey && TASK_COLORS[formState.imageKey]) {
      return TASK_COLORS[formState.imageKey];
    }
    let hash = 0;
    const str = formState.task || "";
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % FALLBACK_COLORS.length;
    return FALLBACK_COLORS[idx];
  }, [formState.imageKey, formState.task]);

  const updateField = useCallback(
    <K extends keyof RoutineTaskFormState>(
      field: K,
      value: RoutineTaskFormState[K]
    ) => {
      setFormState((prev) => {
        const next = { ...prev, [field]: value };
        // Auto-detect icon from task title if imageKey not manually changed
        if (field === "task" && typeof value === "string") {
          const autoIcon = guessRoutineIconKey(value);
          if (autoIcon && prev.imageKey === "breathe") {
            next.imageKey = autoIcon;
          }
        }
        return next;
      });
    },
    []
  );

  const resetForm = useCallback((item?: RoutineItemWithNotes | null) => {
    setFormState({
      task: item?.task || "",
      time: item?.time || defaultTime,
      duration: item?.duration || 30,
      imageKey: item?.imageKey || "breathe",
      daysOfWeek:
        item?.daysOfWeek && item.daysOfWeek.length > 0
          ? item.daysOfWeek
          : [0, 1, 2, 3, 4, 5, 6],
      notes: getItemNotes(item),
      subtasks: item?.subtasks || [],
    });
    setActivePicker("none");
    setShowIconPicker(false);
  }, [defaultTime]);

  // Subtask management
  const addSubtask = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const newSubtask: SubTask = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: trimmed,
      completed: false,
    };
    setFormState((prev) => ({
      ...prev,
      subtasks: [...prev.subtasks, newSubtask],
    }));
  }, []);

  const toggleSubtask = useCallback((id: string) => {
    setFormState((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((st) =>
        st.id === id ? { ...st, completed: !st.completed } : st
      ),
    }));
  }, []);

  const deleteSubtask = useCallback((id: string) => {
    setFormState((prev) => ({
      ...prev,
      subtasks: prev.subtasks.filter((st) => st.id !== id),
    }));
  }, []);

  const updateSubtaskTitle = useCallback((id: string, title: string) => {
    setFormState((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((st) =>
        st.id === id ? { ...st, title } : st
      ),
    }));
  }, []);

  const setSubtasks = useCallback((subtasks: SubTask[]) => {
    setFormState((prev) => ({ ...prev, subtasks }));
  }, []);

  // Validation
  const isValid = useMemo(() => {
    return formState.task.trim().length > 0 && formState.duration > 0;
  }, [formState.task, formState.duration]);

  const endTime = useMemo(() => {
    return addMinutesToTime(formState.time, formState.duration);
  }, [formState.time, formState.duration]);

  return {
    formState,
    taskColor,
    isValid,
    endTime,
    updateField,
    resetForm,
    activePicker,
    setActivePicker,
    showIconPicker,
    setShowIconPicker,
    iconPickerCat,
    setIconPickerCat,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    updateSubtaskTitle,
    setSubtasks,
  };
}
