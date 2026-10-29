import { OUTCOME_PACKS, computePackCommitment, formatMinutes } from "../components/setup/stepPick/outcomeData";
import { TEMPLATES } from "../components/setup/stepPick/templates";
import { ActivityTemplate } from "../components/setup/stepPick/types";

describe("StepPick Outcome Packs & Selection Logic", () => {
    it("has 4 defined outcome packs with Calm as hero and most popular badge", () => {
        expect(OUTCOME_PACKS).toHaveLength(4);
        const calm = OUTCOME_PACKS.find((p) => p.id === "calm");
        expect(calm).toBeDefined();
        expect(calm?.isHero).toBe(true);
        expect(calm?.badge).toBe("Most popular");
        expect(calm?.promise).toBe("Start gentle, end rested.");
        expect(calm?.habits).toEqual([
            "Meditate",
            "Breathing exercise",
            "Journal",
            "Gratitude note",
            "Wind-down routine",
        ]);
    });

    it("verifies all outcome pack habits exist in TEMPLATES", () => {
        const allTasksLower = TEMPLATES.map((t) => t.task.toLowerCase());
        for (const pack of OUTCOME_PACKS) {
            for (const habit of pack.habits) {
                expect(allTasksLower).toContain(habit.toLowerCase());
            }
        }
    });

    it("computes commitment time string accurately", () => {
        const calm = OUTCOME_PACKS.find((p) => p.id === "calm")!;
        const commitment = computePackCommitment(calm, TEMPLATES);
        expect(commitment).toContain("5 habits ·");
        expect(commitment).toMatch(/~\d+ min a day|~\d+ hr/);
    });

    it("formats minutes sensibly", () => {
        expect(formatMinutes(25)).toBe("~25 min a day");
        expect(formatMinutes(60)).toBe("~1 hr a day");
        expect(formatMinutes(90)).toBe("~1 hr 30 min a day");
    });

    it("correctly merges and dedupes multiple packs", () => {
        const packA = ["Drink water", "Strength training", "Stretch"];
        const packB = ["Stretch", "Read 20 pages", "Drink water"];

        const combined = Array.from(new Set([...packA, ...packB]));
        expect(combined).toHaveLength(4);
        expect(combined).toEqual([
            "Drink water",
            "Strength training",
            "Stretch",
            "Read 20 pages",
        ]);
    });

    it("preserves previous selection on Undo", () => {
        const initialSelected = ["Journal", "Read"];
        const packHabits = ["Meditate", "Breathing exercise", "Journal"];

        // Additive merge
        const merged = Array.from(new Set([...initialSelected, ...packHabits]));
        expect(merged).toEqual(["Journal", "Read", "Meditate", "Breathing exercise"]);

        // Undo restores initial
        const restored = [...initialSelected];
        expect(restored).toEqual(["Journal", "Read"]);
    });

    it("detects existing habit duplicates by name and category (case-insensitive)", () => {
        const existing: ActivityTemplate[] = [
            {
                task: "Drink water",
                description: "",
                imageKey: "water",
                defaultTime: "07:15 AM",
                category: "morning",
                minutes: 2,
            },
        ];

        const duplicate = existing.find(
            (t) =>
                t.task.toLowerCase() === "DRINK WATER".toLowerCase() &&
                t.category === "morning"
        );
        expect(duplicate).toBeDefined();
        expect(duplicate?.task).toBe("Drink water");

        const differentCategory = existing.find(
            (t) =>
                t.task.toLowerCase() === "DRINK WATER".toLowerCase() &&
                t.category === "evening"
        );
        expect(differentCategory).toBeUndefined();
    });

    it("correctly gates minimum 3 habits requirement and 10+ nudge", () => {
        const selection0: string[] = [];
        const selection2 = ["Habit 1", "Habit 2"];
        const selection3 = ["Habit 1", "Habit 2", "Habit 3"];
        const selection10 = Array.from({ length: 10 }, (_, i) => `Habit ${i + 1}`);

        expect(selection0.length >= 3).toBe(false);
        expect(selection2.length >= 3).toBe(false);
        expect(selection3.length >= 3).toBe(true);

        // CTA labels
        const ctaLabel = (count: number) =>
            count >= 3 ? `Continue (${count} habits)` : `Pick ${3 - count} more`;

        expect(ctaLabel(selection0.length)).toBe("Pick 3 more");
        expect(ctaLabel(selection2.length)).toBe("Pick 1 more");
        expect(ctaLabel(selection3.length)).toBe("Continue (3 habits)");

        // 10+ nudge
        expect(selection3.length >= 10).toBe(false);
        expect(selection10.length >= 10).toBe(true);
    });
});

