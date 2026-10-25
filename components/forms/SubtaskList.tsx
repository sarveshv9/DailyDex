import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useAppHaptics } from "../../hooks/useAppHaptics";
import type { SubTask } from "../../types/task";

export interface SubtaskListProps {
  subtasks: SubTask[];
  onChange: (subtasks: SubTask[]) => void;
  activeColor?: string;
}

export const SubtaskList: React.FC<SubtaskListProps> = ({
  subtasks = [],
  onChange,
  activeColor,
}) => {
  const { theme } = useTheme();
  const { light, selection } = useAppHaptics();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const highlightColor = activeColor || theme.colors.primary;

  const handleToggle = (id: string) => {
    selection();
    const updated = subtasks.map((st) =>
      st.id === id ? { ...st, completed: !st.completed } : st
    );
    onChange(updated);
  };

  const handleRemove = (id: string) => {
    light();
    onChange(subtasks.filter((st) => st.id !== id));
  };

  const handleAdd = () => {
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;
    light();
    const newSubtask: SubTask = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: trimmed,
      completed: false,
    };
    onChange([...subtasks, newSubtask]);
    setNewSubtaskTitle("");
  };

  const handleEditTitle = (id: string, text: string) => {
    const updated = subtasks.map((st) =>
      st.id === id ? { ...st, title: text } : st
    );
    onChange(updated);
  };

  return (
    <View style={styles.container}>
      {subtasks.map((st) => (
        <View key={st.id} style={styles.subtaskRow}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              { borderColor: theme.colors.border },
              st.completed && {
                backgroundColor: highlightColor,
                borderColor: highlightColor,
              },
            ]}
            onPress={() => handleToggle(st.id)}
            hitSlop={8}
          >
            {st.completed && (
              <Ionicons name="checkmark" size={14} color={theme.colors.onPrimary} />
            )}
          </TouchableOpacity>

          <TextInput
            style={[
              styles.subtaskTitle,
              {
                color: st.completed
                  ? theme.colors.textSecondary
                  : theme.colors.text,
                textDecorationLine: st.completed ? "line-through" : "none",
                fontFamily: theme.fonts.regular,
                opacity: st.completed ? 0.45 : 1,
              },
            ]}
            value={st.title}
            onChangeText={(t) => handleEditTitle(st.id, t)}
          />

          <TouchableOpacity
            onPress={() => handleRemove(st.id)}
            style={styles.deleteBtn}
            hitSlop={8}
          >
            <Ionicons
              name="close"
              size={16}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      ))}

      {/* Add input */}
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.text,
              backgroundColor: theme.colors.surfaceMuted,
              borderColor: theme.colors.border,
              fontFamily: theme.fonts.regular,
            },
          ]}
          placeholder="Add a subtask..."
          placeholderTextColor={`${theme.colors.textSecondary}70`}
          value={newSubtaskTitle}
          onChangeText={setNewSubtaskTitle}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[
            styles.addBtn,
            { backgroundColor: highlightColor },
            !newSubtaskTitle.trim() && { opacity: 0.5 },
          ]}
          onPress={handleAdd}
          disabled={!newSubtaskTitle.trim()}
        >
          <Ionicons name="add" size={20} color={theme.colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  subtaskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  subtaskTitle: {
    flex: 1,
    fontSize: 14,
  },
  deleteBtn: {
    padding: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
