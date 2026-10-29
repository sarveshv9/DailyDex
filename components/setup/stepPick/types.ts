import { Ionicons } from "@expo/vector-icons";

export type CategoryKey =
    | "morning"
    | "meals"
    | "fitness"
    | "productivity"
    | "mindfulness"
    | "creative"
    | "social"
    | "evening";

export interface CategoryDef {
    key: CategoryKey;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
}

export interface ActivityTemplate {
    task: string;
    description: string;
    imageKey: string;
    defaultTime: string;
    category: CategoryKey;
    minutes: number;
}

export interface OutcomePack {
    id: string;
    title: string;
    promise: string;
    habits: string[];
    isHero?: boolean;
    badge?: string;
    icon: keyof typeof Ionicons.glyphMap;
}

export interface StepPickProps {
    selected: string[];
    onToggle: (task: string) => void;
    onSetSelected?: (tasks: string[]) => void;
    onAddCustom: (activity: ActivityTemplate) => void;
    onNext: () => void;
    onBack: () => void;
    onSkip: () => void;
    customActivities: ActivityTemplate[];
}

