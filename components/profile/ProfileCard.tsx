// components/profile/ProfileCard.tsx
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "../../utils/haptics";
import React, { useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Theme } from "../../constants/shared";
import { useTheme } from "../../context/ThemeContext";

interface ProfileCardProps {
  userProfile: any;
  isEditingProfile: boolean;
  setUserProfile: (fn: any) => void;
  setIsEditingProfile: (v: boolean) => void;
  handleSaveProfile: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  userProfile,
  isEditingProfile,
  setUserProfile,
  setIsEditingProfile,
  handleSaveProfile,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      {/* Edit Button */}
      {/* Pressable with scale feedback replaced TouchableOpacity — consistent with app pattern */}
      <Pressable
        style={({ pressed }) => [
          styles.editButton,
          pressed && { opacity: 0.7, transform: [{ scale: 0.9 }] },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setIsEditingProfile(!isEditingProfile);
        }}
      >
        <Ionicons
          name={isEditingProfile ? "checkmark" : "pencil"}
          size={20}
          color={theme.colors.white}
        />
      </Pressable>

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userProfile.avatar}</Text>
        </View>
      </View>

      {/* Content */}
      {isEditingProfile ? (
        <View style={styles.editModeContainer}>
          <TextInput
            style={styles.input}
            value={userProfile.name}
            placeholder="Name"
            placeholderTextColor={theme.colors.secondary}
            onChangeText={(text) =>
              setUserProfile((prev: any) => ({ ...prev, name: text }))
            }
          />

          <TextInput
            style={styles.input}
            value={userProfile.email}
            placeholder="Email"
            placeholderTextColor={theme.colors.secondary}
            onChangeText={(text) =>
              setUserProfile((prev: any) => ({ ...prev, email: text }))
            }
          />

          <TextInput
            style={[styles.input, styles.bioInput]}
            value={userProfile.bio}
            placeholder="Bio"
            placeholderTextColor={theme.colors.secondary}
            onChangeText={(text) =>
              setUserProfile((prev: any) => ({ ...prev, bio: text }))
            }
            multiline
          />

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleSaveProfile}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.viewModeContainer}>
          <Text style={styles.userName}>{userProfile.name}</Text>
          <Text style={styles.userEmail}>{userProfile.email}</Text>
          <Text style={styles.userBio}>{userProfile.bio}</Text>
        </View>
      )}
    </View>
  );
};

// ------------------------------------------------------------
// THEME-BASED MATERIAL YOU STYLING
// ------------------------------------------------------------
const getStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.card,
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.xl,
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: 20,
      elevation: 6,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      position: "relative",
      alignItems: "center",
    },

    // Edit Icon
    editButton: {
      position: "absolute",
      top: 16,
      right: 16,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      elevation: 4,
    },

    // Avatar
    avatarContainer: {
      alignItems: "center",
      marginBottom: theme.spacing.lg,
    },
    avatar: {
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: theme.colors.primary,
      justifyContent: "center",
      alignItems: "center",
      borderColor: theme.colors.card,
      borderWidth: 4,
      elevation: 2,
    },
    avatarText: {
      fontSize: 50,
      color: theme.colors.white,
      fontFamily: theme.fonts.bold,
    },

    // View Mode
    viewModeContainer: {
      alignItems: "center",
      paddingHorizontal: theme.spacing.lg,
    },
    userName: {
      fontSize: 26,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 16,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    userBio: {
      textAlign: "center",
      fontSize: 15,
      color: theme.colors.textSecondary,
      lineHeight: 22,
      maxWidth: 260,
      opacity: 0.9,
    },

    // Edit mode
    editModeContainer: {
      width: "100%",
      marginTop: theme.spacing.sm,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.text,
      fontFamily: theme.fonts.regular,
      borderWidth: 1,
      borderColor: theme.colors.textSecondary + "55",
      marginBottom: theme.spacing.md,
    },
    bioInput: {
      minHeight: 80,
      textAlignVertical: "top",
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      alignItems: "center",
      marginTop: theme.spacing.md,
    },
    saveButtonText: {
      color: theme.colors.white,
      fontSize: 16,
      fontFamily: theme.fonts.medium,
    },
  });

export default ProfileCard;