import { ActivityTemplate, OutcomePack } from "./types";

export const OUTCOME_PACKS: OutcomePack[] = [
    {
        id: "daily_essentials",
        title: "Daily Essentials",
        promise: "The basic daily milestones to anchor your routine.",
        habits: [
            "Drink water",
            "Breakfast",
            "Lunch",
            "Dinner",
        ],
        isHero: true,
        badge: "Everyday Basics",
        icon: "restaurant-outline",
    },
    {
        id: "study",
        title: "Study & Learning",
        promise: "Sharpen your mind and make steady learning progress.",
        habits: [
            "Study",
            "Read 20 pages",
            "Deep work block",
            "Review to-dos",
        ],
        icon: "book-outline",
    },
    {
        id: "fitness",
        title: "Exercise & Fitness",
        promise: "Move your body, build strength, and stay active.",
        habits: [
            "Strength training",
            "Run",
            "Walk",
            "Stretch",
            "10k steps",
        ],
        icon: "barbell-outline",
    },
    {
        id: "productivity",
        title: "Work & Productivity",
        promise: "Carve out uninterrupted time for your highest priorities.",
        habits: [
            "Plan the day",
            "Deep work block",
            "Phone-free focus",
            "Review to-dos",
        ],
        icon: "briefcase-outline",
    },
    {
        id: "health",
        title: "Health & Nutrition",
        promise: "Fuel your body with proper hydration, food, and self-care.",
        habits: [
            "Drink water",
            "Eat a veggie",
            "Meal Prep",
            "Skincare",
        ],
        icon: "heart-outline",
    },
    {
        id: "mindfulness",
        title: "Mind & Recovery",
        promise: "Unwind your thoughts, rest deeply, and reset your mind.",
        habits: [
            "Meditate",
            "Breathing exercise",
            "Journal",
            "Wind-down routine",
            "Screen Off",
        ],
        icon: "moon-outline",
    },
];

export function formatMinutes(totalMinutes: number): string {
    if (totalMinutes <= 0) return "~0 min a day";
    if (totalMinutes < 60) {
        return `~${totalMinutes} min a day`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (mins === 0) {
        return `~${hours} hr a day`;
    }
    return `~${hours} hr ${mins} min a day`;
}

export function computePackCommitment(
    pack: OutcomePack,
    templates: ActivityTemplate[]
): string {
    const habitCount = pack.habits.length;
    const totalMinutes = pack.habits.reduce((acc, habitName) => {
        const t = templates.find(
            (item) => item.task.toLowerCase() === habitName.toLowerCase()
        );
        return acc + (t?.minutes || 10);
    }, 0);

    return `${habitCount} habits · ${formatMinutes(totalMinutes)}`;
}
