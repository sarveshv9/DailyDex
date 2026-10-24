import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { ThemeProvider } from "../context/ThemeContext";
import { TaskForm } from "../components/dashboard/TaskForm";
import type { RoutineFormData } from "../types";
import { useThemeStore } from "../stores/themeStore";

jest.mock("lucide-react-native", () => ({}));

jest.mock("expo-blur", () => ({
  BlurView: "BlurView",
}));

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn().mockResolvedValue("id"),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("../utils/haptics", () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "Light", Medium: "Medium" },
  NotificationFeedbackType: { Success: "Success" },
}));

describe("TaskForm Input Persistence on Parent Re-render", () => {
  beforeEach(() => {
    useThemeStore.setState({ isLoaded: true });
  });
  it("persists typed text when parent re-renders and does not wipe user input", async () => {
    const initialFormData: RoutineFormData = {
      task: "",
      time: "8:00 AM",
      duration: 30,
      imageKey: "breathe",
      description: "",
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    };

    const onUpdateField = jest.fn();
    const onSave = jest.fn();
    const onClose = jest.fn();

    const { rerender } = await render(
      <ThemeProvider>
        <TaskForm
          visible={true}
          isEditing={false}
          formData={initialFormData}
          onUpdateField={onUpdateField}
          onSave={onSave}
          onClose={onClose}
        />
      </ThemeProvider>
    );

    // 1. Find task title input
    const input = screen.getByPlaceholderText("Type any task (e.g. Walk Dog, Clean)...");
    expect(input.props.value).toBe("");

    // 2. User types into the input field
    await act(async () => {
      fireEvent.changeText(input, "Walk the Dog");
    });
    expect(screen.getByPlaceholderText("Type any task (e.g. Walk Dog, Clean)...").props.value).toBe("Walk the Dog");

    // 3. Parent component re-renders and passes a new formData object reference
    const updatedParentFormData: RoutineFormData = {
      ...initialFormData,
      time: "8:30 AM", // Parent updated a field during creation session
    };

    await rerender(
      <ThemeProvider>
        <TaskForm
          visible={true}
          isEditing={false}
          formData={updatedParentFormData}
          onUpdateField={onUpdateField}
          onSave={onSave}
          onClose={onClose}
        />
      </ThemeProvider>
    );

    // 4. Assert user's typed text was NOT wiped by the re-render
    const inputAfterRerender = screen.getByPlaceholderText("Type any task (e.g. Walk Dog, Clean)...");
    expect(inputAfterRerender.props.value).toBe("Walk the Dog");
  });
});
