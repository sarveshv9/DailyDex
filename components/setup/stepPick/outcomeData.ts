import { ActivityTemplate, OutcomePack } from "./types";

export const OUTCOME_PACKS: OutcomePack[] = [
    {
        id: "calm",
        title: "Calm",
        promise: "Start gentle, end rested.",
        habits: [
            "Meditate",
            "Breathing exercise",
            "Journal",
            "Gratitude note",
            "Wind-down routine",
        ],
        isHero: true,
        badge: "Most popular",
        icon: "flower-outline",
    },
    {
        id: "focus",
        title: "Focus",
        promise: "Carve out space for deep, distraction-free work.",
        habits: [
            "Plan the day",
            "Deep work block",
            "Phone-free focus",
            "Review to-dos",
        ],
        icon: "flash-outline",
    },
    {
        id: "energy",
        title: "Energy",
        promise: "Fuel your body and keep your vitality high.",
        habits: [
            "Drink water",
            "Strength training",
            "10k steps",
            "Eat a veggie",
        ],
        icon: "barbell-outline",
    },
    {
        id: "balance",
        title: "Balance",
        promise: "Nourish your mind, health, and loved ones.",
        habits: [
            "Stretch",
            "Read 20 pages",
            "Call a friend",
            "Family time",
        ],
        icon: "compass-outline",
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

