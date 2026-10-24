import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { themeTokens } from "../../constants/themeTokens";
import { useTheme } from "../../context/ThemeContext";
import { Theme } from "../../styles/shared";
import { Button } from "../ui/Button";
import { ModalSheet } from "../ui/ModalSheet";

export interface RoutineConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const RoutineConfirmModalComponent: React.FC<RoutineConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmText,
  onCancel,
  onConfirm,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <ModalSheet
      visible={visible}
      onClose={onCancel}
      title={title}
      showHandle={false}
      showCloseButton={false}
      contentContainerStyle={styles.sheetContent}
    >
      <View style={styles.body}>
        <Text style={styles.messageText}>{message}</Text>
        <View style={styles.actionsRow}>
          <Button
            title="Cancel"
            variant="secondary"
            size="md"
            onPress={onCancel}
            style={styles.actionBtn}
          />
          <Button
            title={confirmText}
            variant="destructive"
            size="md"
            onPress={onConfirm}
            style={styles.actionBtn}
          />
        </View>
      </View>
    </ModalSheet>
  );
};

export const RoutineConfirmModal = React.memo(RoutineConfirmModalComponent);

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    sheetContent: {
      paddingBottom: themeTokens.spacing.lg,
    },
    body: {
      paddingHorizontal: themeTokens.spacing.lg,
      paddingTop: themeTokens.spacing.sm,
      alignItems: "center",
    },
    messageText: {
      fontSize: themeTokens.fonts.size.md,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginBottom: themeTokens.spacing.xl,
      lineHeight: 22,
    },
    actionsRow: {
      flexDirection: "row",
      gap: themeTokens.spacing.md,
      width: "100%",
    },
    actionBtn: {
      flex: 1,
    },
  });
