import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useAppHaptics } from "../../hooks/useAppHaptics";
import { getRoutineIcon, ICON_GROUPS } from "../../utils/utils";

import { getSharedStyles } from "../../styles/shared";

export interface IconPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectIcon: (iconKey: string) => void;
  activeColor?: string;
  currentIconKey?: string;
}

export const IconPickerModal: React.FC<IconPickerModalProps> = ({
  visible,
  onClose,
  onSelectIcon,
  activeColor,
  currentIconKey,
}) => {
  const { theme } = useTheme();
  const { selection } = useAppHaptics();
  const shared = React.useMemo(() => getSharedStyles(theme), [theme]);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const highlightColor = activeColor || theme.colors.primary;

  const currentCategory = ICON_GROUPS[activeCategoryIndex] || ICON_GROUPS[0];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={shared.modalOverlay} onPress={onClose}>
        <Pressable style={[shared.modalContent, styles.card]} onPress={(e) => e.stopPropagation()}>
          <View style={shared.modalHeader}>
            <View>
              <Text style={shared.modalTitle}>
                Choose an Icon
              </Text>
              <Text style={shared.modalSubtitle}>
                Pick an icon for this ritual
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={shared.modalCloseButton}
            >
              <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          {/* Category Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            {ICON_GROUPS.map((grp, idx) => {
              const isActive = activeCategoryIndex === idx;
              return (
                <Pressable
                  key={grp.category}
                  style={[
                    styles.tab,
                    { backgroundColor: isActive ? highlightColor : theme.glass.neutralFill },
                  ]}
                  onPress={() => {
                    selection();
                    setActiveCategoryIndex(idx);
                  }}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        fontFamily: isActive ? theme.fonts.bold : theme.fonts.medium,
                        color: isActive ? theme.colors.white : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {grp.category}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Icon Grid */}
          <FlatList
            key={currentCategory.category}
            data={currentCategory.icons}
            keyExtractor={(item) => item.key}
            numColumns={4}
            style={styles.gridScroll}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.columnWrapper}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = currentIconKey === item.key;
              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.gridItem,
                    pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
                  ]}
                  onPress={() => {
                    selection();
                    onSelectIcon(item.key);
                    onClose();
                  }}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: isSelected ? highlightColor : `${highlightColor}15`,
                        borderColor: isSelected ? highlightColor : `${highlightColor}35`,
                      },
                    ]}
                  >
                    <Ionicons
                      name={getRoutineIcon(item.key)}
                      size={24}
                      color={isSelected ? theme.colors.white : highlightColor}
                    />
                  </View>
                  <Text
                    style={[
                      styles.gridLabel,
                      {
                        color: theme.colors.text,
                        fontFamily: isSelected ? theme.fonts.bold : theme.fonts.regular,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    maxHeight: 520,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tabsContainer: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 12,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tabText: {
    fontSize: 12,
  },
  gridScroll: {
    maxHeight: 340,
  },
  grid: {
    paddingTop: 8,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  gridItem: {
    width: "23%",
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  gridLabel: {
    fontSize: 11,
    textAlign: "center",
  },
});
