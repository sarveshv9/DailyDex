import React from "react";
import renderer, { act } from "react-test-renderer";
import { useRoutineTaskForm, formatDuration } from "../hooks/useRoutineTaskForm";

describe("useRoutineTaskForm", () => {
  it("formats durations accurately", () => {
    expect(formatDuration(30)).toBe("30m");
    expect(formatDuration(90)).toBe("1h 30m");
    expect(formatDuration(120)).toBe("2h");
  });

  it("handles form updates, subtasks, and auto-icon guessing", () => {
    let form: ReturnType<typeof useRoutineTaskForm>;

    const TestComponent = () => {
      form = useRoutineTaskForm({
        defaultTime: "7:30 AM",
      });
      return null;
    };

    act(() => {
      renderer.create(<TestComponent />);
    });

    expect(form!.formState.time).toBe("7:30 AM");
    expect(form!.formState.duration).toBe(30);
    expect(form!.isValid).toBe(false);

    // Update task title to a recognizable routine
    act(() => {
      form!.updateField("task", "Meditation");
    });

    expect(form!.formState.task).toBe("Meditation");
    expect(form!.isValid).toBe(true);
    expect(form!.formState.imageKey).toBe("meditate");

    // Add subtask
    act(() => {
      form!.addSubtask("Light incense");
    });

    expect(form!.formState.subtasks.length).toBe(1);
    expect(form!.formState.subtasks[0].title).toBe("Light incense");
    expect(form!.formState.subtasks[0].completed).toBe(false);

    // Toggle subtask
    act(() => {
      form!.toggleSubtask(form!.formState.subtasks[0].id);
    });
    expect(form!.formState.subtasks[0].completed).toBe(true);

    // Delete subtask
    act(() => {
      form!.deleteSubtask(form!.formState.subtasks[0].id);
    });
    expect(form!.formState.subtasks.length).toBe(0);
  });
});
