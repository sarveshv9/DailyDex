/* eslint-disable @typescript-eslint/no-require-imports, import/first */
import React from "react";
import { render, fireEvent, cleanup } from "@testing-library/react-native";

jest.mock("@react-native-async-storage/async-storage", () =>
    require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("lucide-react-native", () => ({}));
jest.mock("../utils/haptics", () => ({
    impactAsync: jest.fn(),
    notificationAsync: jest.fn(),
    selectionAsync: jest.fn(),
    ImpactFeedbackStyle: {
        Light: "light",
        Medium: "medium",
        Heavy: "heavy",
    },
}));

import { ThemeProvider } from "../context/ThemeContext";
import { useThemeStore } from "../stores/themeStore";
import { PokemonWelcome } from "../components/setup/PokemonWelcome";

describe("PokemonWelcome Screen", () => {
    beforeEach(() => {
        useThemeStore.setState({ isLoaded: true });
    });

    afterEach(() => {
        cleanup();
    });

    it("renders headline, static Pokémon mascots, and action buttons", async () => {
        const onStart = jest.fn();
        const onSkip = jest.fn();

        const res = await render(
            <ThemeProvider>
                <PokemonWelcome onStart={onStart} onSkip={onSkip} />
            </ThemeProvider>
        );

        // Header check
        expect(res.getByText(/Welcome! Want to get on/i)).toBeTruthy();
        expect(res.getByText(/daily routine\?/i)).toBeTruthy();

        // 6 Pokémon mascot accessibility labels
        expect(res.getByLabelText("Pikachu mascot bubble")).toBeTruthy();
        expect(res.getByLabelText("Charizard mascot bubble")).toBeTruthy();
        expect(res.getByLabelText("Bulbasaur mascot bubble")).toBeTruthy();
        expect(res.getByLabelText("Squirtle mascot bubble")).toBeTruthy();
        expect(res.getByLabelText("Snorlax mascot bubble")).toBeTruthy();
        expect(res.getByLabelText("Gengar mascot bubble")).toBeTruthy();

        // Action button check
        const startBtn = res.getByLabelText("Get Started");
        expect(startBtn).toBeTruthy();
        fireEvent.press(startBtn);
        expect(onStart).toHaveBeenCalledTimes(1);

        // Skip button check
        const skipBtn = res.getByLabelText("Skip welcome");
        expect(skipBtn).toBeTruthy();
        fireEvent.press(skipBtn);
        expect(onSkip).toHaveBeenCalledTimes(1);
    });
});
