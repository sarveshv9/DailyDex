import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";

jest.mock("lucide-react-native", () => ({}));
jest.mock("react-native-worklets", () => ({}));
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    Ionicons: (props: any) => React.createElement(View, { ...props, testID: props.name }),
  };
});
jest.mock("react-native-reanimated", () => {
  const { View, Text } = require("react-native");
  return {
    __esModule: true,
    default: {
      View,
      Text,
      createAnimatedComponent: (c: any) => c,
    },
    FadeInDown: {
      duration: () => ({
        delay: () => ({}),
      }),
    },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: () => ({}),
  };
});

import { TodayTasksSection } from "../components/dashboard/TodayTasksSection";
import { createTheme } from "../constants/themeGenerator";
import { Task } from "../app/(tabs)/todo";

const theme = createTheme("#FF4036", "dark");

describe("TodayTasksSection Component", () => {
  const sampleTasks: Task[] = [
    {
      id: "task-1",
      text: "Draft weekly reflection",
      completed: false,
      createdAt: new Date().toISOString(),
      category: "today",
    },
    {
      id: "task-2",
      text: "Drink morning matcha",
      completed: true,
      createdAt: new Date().toISOString(),
      category: "today",
    },
    {
      id: "task-3",
      text: "Review backlog items",
      completed: false,
      createdAt: new Date().toISOString(),
      category: "later",
    },
  ];

  it("renders only today tasks and displays counter badge", async () => {
    const onToggle = jest.fn();
    const onAdd = jest.fn();
    const onOpen = jest.fn();

    const utils = await render(
      <TodayTasksSection
        tasks={sampleTasks}
        onToggleTask={onToggle}
        onAddTask={onAdd}
        onOpenTasks={onOpen}
        theme={theme}
        isDarkMode={true}
      />
    );

    expect(utils.getByText("Draft weekly reflection")).toBeTruthy();
    expect(utils.getByText("Drink morning matcha")).toBeTruthy();
    // 'later' task should NOT be displayed here
    expect(utils.queryByText("Review backlog items")).toBeNull();
    // 1 of 2 completed
    expect(utils.getByText("1/2")).toBeTruthy();
  });

  it("calls onToggleTask when checkmark is tapped", async () => {
    const onToggle = jest.fn();
    const onAdd = jest.fn();
    const onOpen = jest.fn();

    const utils = await render(
      <TodayTasksSection
        tasks={sampleTasks}
        onToggleTask={onToggle}
        onAddTask={onAdd}
        onOpenTasks={onOpen}
        theme={theme}
        isDarkMode={true}
      />
    );

    const checkbox = utils.getByLabelText("Mark complete");
    fireEvent.press(checkbox);
    expect(onToggle).toHaveBeenCalledWith("task-1");
  });

  it("submits a new intention via inline quick-add", async () => {
    const onToggle = jest.fn();
    const onAdd = jest.fn();
    const onOpen = jest.fn();

    const utils = await render(
      <TodayTasksSection
        tasks={sampleTasks}
        onToggleTask={onToggle}
        onAddTask={onAdd}
        onOpenTasks={onOpen}
        theme={theme}
        isDarkMode={true}
      />
    );

    const input = utils.getByTestId("today-tasks-quick-add-input");
    await act(async () => {
      fireEvent.changeText(input, "Meditate for 15 minutes");
    });
    const submitBtn = utils.getByTestId("today-tasks-quick-add-submit");
    await act(async () => {
      fireEvent.press(submitBtn);
    });

    expect(onAdd).toHaveBeenCalledWith("Meditate for 15 minutes");
  });

  it("opens focus timer for task when timer icon is tapped", async () => {
    const onToggle = jest.fn();
    const onAdd = jest.fn();
    const onOpen = jest.fn();
    const onOpenFocus = jest.fn();

    const utils = await render(
      <TodayTasksSection
        tasks={sampleTasks}
        onToggleTask={onToggle}
        onAddTask={onAdd}
        onOpenTasks={onOpen}
        onOpenFocusForTask={onOpenFocus}
        theme={theme}
        isDarkMode={true}
      />
    );

    const timerBtn = utils.getByTestId("task-timer-task-1");
    fireEvent.press(timerBtn);
    expect(onOpenFocus).toHaveBeenCalledWith(sampleTasks[0]);
  });
});
