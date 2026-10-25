// components/profile/SettingModal.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Theme, getSharedStyles } from "../../styles/shared";
import * as Haptics from "../../utils/haptics";
import { ModalSheet } from "../ui/ModalSheet";

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
  const shared = React.useMemo(() => getSharedStyles(theme), [theme]);
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [email, setEmail] = useState(user.email);
  const [bio, setBio] = useState(user.bio);

  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible && !prevVisible) {
    setPrevVisible(true);
    setName(user.name || "");
    setRole(user.role || "");
    setEmail(user.email || "");
    setBio(user.bio || "");
  } else if (!visible && prevVisible) {
    setPrevVisible(false);
  }

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
    <View style={shared.inputContainer}>
      <Text style={shared.inputLabel}>
        {label}
      </Text>
      <View
        style={[
          shared.inputWrapper,
          {
            alignItems: multiline ? "flex-start" : "center",
            paddingVertical: multiline ? 12 : 2,
          },
        ]}
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
          style={[
            shared.textInput,
            {
              minHeight: multiline ? 80 : 48,
              textAlignVertical: multiline ? "top" : "center",
            },
          ]}
        />
      </View>
    </View>
  );

  const previewInitial = name ? name.trim().charAt(0).toUpperCase() : "U";

  return (
    <ModalSheet visible={visible} onClose={onClose} theme={theme} title="Edit Profile">
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
          style={({ pressed }) => [
            shared.primaryButton,
            {
              marginTop: theme.spacing.lg,
              opacity: pressed ? 0.88 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={20} color={theme.colors.white} />
          <Text style={shared.primaryButtonText}>
            Save Changes
          </Text>
        </Pressable>
      </ScrollView>
    </ModalSheet>
  );
};