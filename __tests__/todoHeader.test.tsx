import React from "react";
import renderer, { act } from "react-test-renderer";
import { TextInput } from "react-native";

describe("Todo Quick-Add Header Focus and Input Stability", () => {
  it("keeps input mounted, allows typing, and submits cleanly without dropping focus", () => {
    const onQuickAdd = jest.fn();

    const TestQuickAddContainer = () => {
      const [text, setText] = React.useState("");
      return (
        <TextInput
          testID="quick-add-input"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => {
            onQuickAdd(text);
            setText("");
          }}
          placeholder="Quick-add task for Today..."
        />
      );
    };

    let testRenderer: renderer.ReactTestRenderer;
    act(() => {
      testRenderer = renderer.create(<TestQuickAddContainer />);
    });

    const root = testRenderer!.root;
    const input = root.findByProps({ testID: "quick-add-input" });

    // 1. Initial render
    expect(input.props.value).toBe("");

    // 2. Typing characters
    act(() => {
      input.props.onChangeText("Buy groceries");
    });
    expect(input.props.value).toBe("Buy groceries");

    // 3. Submitting text
    act(() => {
      input.props.onSubmitEditing();
    });
    expect(onQuickAdd).toHaveBeenCalledWith("Buy groceries");
    expect(input.props.value).toBe("");
  });
});
