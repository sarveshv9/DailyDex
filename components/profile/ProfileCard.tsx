// components/profile/ProfileCard.tsx
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useMemo } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { Theme } from "../../styles/shared";
import * as Haptics from "../../utils/haptics";

interface ProfileCardProps {
  userProfile: any;
  isEditingProfile: boolean;
  setUserProfile: (fn: any) => void;
  setIsEditingProfile: (v: boolean) => void;
  handleSaveProfile: () => void;
  onOpenEditModal?: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  userProfile,
  isEditingProfile,
  setUserProfile,
  setIsEditingProfile,
  handleSaveProfile,
  onOpenEditModal,
}) => {
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);

  const avatarInitial = userProfile.name?.trim()
    ? userProfile.name.trim().charAt(0).toUpperCase()
    : userProfile.avatar && !userProfile.avatar.startsWith("http")
    ? userProfile.avatar.charAt(0).toUpperCase()
    : "U";

  const handleToggleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onOpenEditModal) {
      onOpenEditModal();
    } else {
      setIsEditingProfile(!isEditingProfile);
    }
  };

  return (
    <View style={styles.cardContainer}>
      <BlurView
        intensity={Platform.OS === "ios" ? 40 : 80}
        tint={isDarkMode ? "dark" : "light"}
        style={styles.blurWrapper}
      >
        <View style={styles.glassOverlay} />

        {/* Top Action Affordance */}
        <Pressable
          style={({ pressed }) => [
            styles.editButton,
            pressed && { opacity: 0.75, transform: [{ scale: 0.92 }] },
          ]}
          onPress={handleToggleEdit}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          hitSlop={8}
        >
          <Ionicons
            name={isEditingProfile ? "checkmark" : "pencil-outline"}
            size={18}
            color={theme.colors.primary}
          />
        </Pressable>

        {/* Squircle Avatar with Luminous Subtle Glow Ring */}
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarGlowRing}>
            <View style={styles.avatar}>
              {userProfile.avatar?.startsWith("http") ? (
                <Image
                  source={{ uri: userProfile.avatar }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : userProfile.name?.trim() ? (
                <Text style={styles.avatarText}>{avatarInitial}</Text>
              ) : (
                <Ionicons name="person-add-outline" size={28} color={theme.colors.primary} />
              )}
            </View>
          </View>
        </View>

        {/* View / Edit Mode Content */}
        {isEditingProfile ? (
          <View style={styles.editModeContainer}>
            <Text style={styles.inputSectionLabel}>Quick Edit</Text>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={18}
                color={theme.colors.primary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={userProfile.name}
                placeholder="Full Name"
                placeholderTextColor={theme.colors.textSecondary + "70"}
                onChangeText={(text) =>
                  setUserProfile((prev: any) => ({ ...prev, name: text }))
                }
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={theme.colors.primary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={userProfile.email}
                placeholder="Email Address"
                placeholderTextColor={theme.colors.textSecondary + "70"}
                keyboardType="email-address"
                autoCapitalize="none"
                onChangeText={(text) =>
                  setUserProfile((prev: any) => ({ ...prev, email: text }))
                }
              />
            </View>

            <View style={[styles.inputWrapper, { alignItems: "flex-start", paddingTop: 12 }]}>
              <Ionicons
                name="document-text-outline"
                size={18}
                color={theme.colors.primary}
                style={[styles.inputIcon, { marginTop: 2 }]}
              />
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={userProfile.bio}
                placeholder="Mindful bio or daily intention..."
                placeholderTextColor={theme.colors.textSecondary + "70"}
                onChangeText={(text) =>
                  setUserProfile((prev: any) => ({ ...prev, bio: text }))
                }
                multiline
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
              onPress={handleSaveProfile}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.white} />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.viewModeContainer}>
            {userProfile.name?.trim() ? (
              <>
                <Text style={styles.userName} numberOfLines={1}>
                  {userProfile.name.trim()}
                </Text>

                {userProfile.email ? (
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {userProfile.email}
                  </Text>
                ) : null}

                {userProfile.bio ? (
                  <Text style={styles.userBio} numberOfLines={3}>
                    &ldquo;{userProfile.bio.trim()}&rdquo;
                  </Text>
                ) : null}
              </>
            ) : (
              <Pressable
                onPress={handleToggleEdit}
                style={styles.promptWrapper}
                accessibilityRole="button"
                accessibilityLabel="Set up your profile details"
              >
                <Text style={styles.promptTitle}>Set Up Your Profile</Text>
                <Text style={styles.promptSubtitle}>
                  Add your name, photo and bio to personalize your mindful journey
                </Text>

                <View style={styles.promptButton}>
                  <Ionicons name="create-outline" size={15} color={theme.colors.primary} />
                  <Text style={styles.promptButtonText}>Fill Profile Details</Text>
                </View>
              </Pressable>
            )}
          </View>
        )}
      </BlurView>
    </View>
  );
};

const getStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    cardContainer: {
      borderRadius: 28,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.glass.borderColor,
      ...Platform.select({
        ios: {
          shadowColor: theme.glows.card.shadowColor,
          shadowOffset: theme.glows.card.shadowOffset,
          shadowOpacity: theme.glows.card.shadowOpacity,
          shadowRadius: theme.glows.card.shadowRadius,
        },
        android: { elevation: 6 },
      }),
    },
    blurWrapper: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.xl,
      alignItems: "center",
      position: "relative",
    },
    glassOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.glass.cardBg,
    },
    editButton: {
      position: "absolute",
      top: 16,
      right: 16,
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: `${theme.colors.primary}18`,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}30`,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10,
    },
    avatarWrapper: {
      alignItems: "center",
      marginBottom: theme.spacing.md,
      zIndex: 5,
    },
    avatarGlowRing: {
      padding: 4,
      borderRadius: 36,
      backgroundColor: `${theme.colors.primary}15`,
      borderWidth: 2,
      borderColor: `${theme.colors.primary}45`,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.45 : 0.25,
      shadowRadius: 14,
      elevation: 6,
    },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: 30,
      backgroundColor: theme.colors.primary,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
      borderRadius: 30,
    },
    avatarText: {
      fontSize: 38,
      color: theme.colors.white,
      fontFamily: theme.fonts.bold,
    },
    viewModeContainer: {
      alignItems: "center",
      width: "100%",
      paddingHorizontal: theme.spacing.sm,
    },
    userName: {
      fontSize: 24,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      letterSpacing: -0.4,
      marginBottom: 2,
      textAlign: "center",
    },
    userEmail: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
      marginBottom: 10,
      textAlign: "center",
    },
    userBio: {
      textAlign: "center",
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      maxWidth: 280,
      opacity: 0.85,
    },
    promptWrapper: {
      alignItems: "center",
      width: "100%",
    },
    promptTitle: {
      fontSize: 20,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      letterSpacing: -0.4,
      marginBottom: 4,
      textAlign: "center",
    },
    promptSubtitle: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 18,
      maxWidth: 280,
      marginBottom: 12,
    },
    promptButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: `${theme.colors.primary}18`,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}35`,
    },
    promptButtonText: {
      fontFamily: theme.fonts.bold,
      fontSize: 13,
      color: theme.colors.primary,
    },
    editModeContainer: {
      width: "100%",
      marginTop: theme.spacing.xs,
    },
    inputSectionLabel: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: `${theme.colors.secondary}0A`,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: `${theme.colors.secondary}15`,
      paddingHorizontal: 14,
      marginBottom: 10,
    },
    inputIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      height: 48,
      fontSize: 15,
      color: theme.colors.text,
      fontFamily: theme.fonts.medium,
    },
    bioInput: {
      height: 70,
      textAlignVertical: "top",
    },
    saveButton: {
      height: 56,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 10,
      ...theme.glows.primary,
    },
    saveButtonText: {
      color: theme.colors.white,
      fontSize: 16,
      fontFamily: theme.fonts.bold,
    },
  });

export default ProfileCard;