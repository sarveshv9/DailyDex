// components/profile/SettingModal.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Theme } from "../../styles/shared";
import * as Haptics from "../../utils/haptics";
import { BottomSheet } from "./BottomSheet";

export type UserShape = {
  name: string;
  role: string;
  avatar: string;
  email: string;
  bio: string;
  stats?: Record<string, any>;
};

export type SettingModalProps = {
  visible: boolean;
  onClose: () => void;
  theme: Theme;
  user: UserShape;
  setUser: React.Dispatch<React.SetStateAction<UserShape>>;
  handleSaveProfile?: () => void;
};

export const SettingModal = ({
  visible,
  onClose,
  theme,
  user,
  setUser,
  handleSaveProfile,
}: SettingModalProps) => {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [email, setEmail] = useState(user.email);
  const [bio, setBio] = useState(user.bio);

  // Sync state when visible changes
  useEffect(() => {
    if (visible && user) {
      setName(user.name || "");
      setRole(user.role || "");
      setEmail(user.email || "");
      setBio(user.bio || "");
    }
  }, [visible, user]);

  const save = () => {
    const defaultAvatar = name ? name.trim().charAt(0).toUpperCase() : "U";
    setUser((prev) => ({ ...prev, name, role, email, bio, avatar: defaultAvatar }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (handleSaveProfile) {
      handleSaveProfile();
    } else {
      Alert.alert("Saved", "Profile updated successfully.");
      onClose();
    }
  };

  const renderInput = (
    label: string,
    iconName: keyof typeof Ionicons.glyphMap,
    value: string,
    setValue: (val: string) => void,
    placeholder: string,
    multiline = false
  ) => (
    <View style={{ marginBottom: theme.spacing.md }}>
      <Text
        style={{
          fontSize: 12,
          fontFamily: theme.fonts.bold,
          color: theme.colors.textSecondary,
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: 0.8,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
          backgroundColor: `${theme.colors.secondary}08`,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: `${theme.colors.secondary}15`,
          paddingHorizontal: 16,
          paddingVertical: multiline ? 12 : 2,
        }}
      >
        <Ionicons
          name={iconName}
          size={18}
          color={theme.colors.primary}
          style={{ marginRight: 12, marginTop: multiline ? 4 : 0 }}
        />
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={`${theme.colors.textSecondary}70`}
          multiline={multiline}
          style={{
            flex: 1,
            color: theme.colors.text,
            fontFamily: theme.fonts.medium,
            fontSize: 15,
            minHeight: multiline ? 80 : 48,
            textAlignVertical: multiline ? "top" : "center",
          }}
        />
      </View>
    </View>
  );

  const previewInitial = name ? name.trim().charAt(0).toUpperCase() : "U";

  return (
    <BottomSheet visible={visible} onClose={onClose} theme={theme} title="Edit Profile">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}
      >
        {/* Avatar Squircle Preview */}
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <View
            style={{
              padding: 4,
              borderRadius: 28,
              backgroundColor: `${theme.colors.primary}15`,
              borderWidth: 2,
              borderColor: `${theme.colors.primary}45`,
              ...theme.glows.primary,
            }}
          >
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 24,
                backgroundColor: theme.colors.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 34,
                  fontFamily: theme.fonts.bold,
                  color: theme.colors.white,
                }}
              >
                {previewInitial}
              </Text>
            </View>
          </View>
          <Text
            style={{
              marginTop: 10,
              fontSize: 13,
              fontFamily: theme.fonts.medium,
              color: theme.colors.textSecondary,
            }}
          >
            Profile Avatar Preview
          </Text>
        </View>

        {renderInput("Full Name", "person-outline", name, setName, "Enter your name")}
        {renderInput(
          "Headline / Role",
          "briefcase-outline",
          role,
          setRole,
          "e.g. Designer, Developer, Student...",
          false
        )}
        {renderInput("Email Address", "mail-outline", email, setEmail, "Enter your email", false)}
        {renderInput(
          "Bio",
          "document-text-outline",
          bio,
          setBio,
          "Tell us about your mindfulness journey...",
          true
        )}

        <Pressable
          onPress={save}
          style={({ pressed }) => ({
            height: 56,
            borderRadius: 22,
            backgroundColor: theme.colors.primary,
            marginTop: theme.spacing.lg,
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            ...theme.glows.primary,
          })}
        >
          <Ionicons name="checkmark-circle" size={20} color={theme.colors.white} />
          <Text
            style={{
              color: theme.colors.white,
              fontFamily: theme.fonts.bold,
              fontSize: 16,
            }}
          >
            Save Changes
          </Text>
        </Pressable>
      </ScrollView>
    </BottomSheet>
  );
};