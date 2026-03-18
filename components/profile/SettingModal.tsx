// components/profile/SettingModal.tsx
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Theme } from '../../constants/shared';
import { BottomSheet } from './BottomSheet';

export type UserShape = {
  name: string;
  role: string;
  avatar: string;
  stats: {
    followers: number;
    following: number;
    projects: number;
  };
  // --- FIX: Add missing properties ---
  email: string;
  bio: string;
};

export type SettingModalProps = {
  visible: boolean;
  onClose: () => void;
  theme: Theme;
  user: UserShape;
  setUser: React.Dispatch<React.SetStateAction<UserShape>>;
  handleSaveProfile?: () => void;
};

export const SettingModal = ({ visible, onClose, theme, user, setUser, handleSaveProfile }: SettingModalProps) => {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [email, setEmail] = useState(user.email);
  const [bio, setBio] = useState(user.bio);

  const save = () => {
    // This spread operator (...) correctly preserves all fields
    // like email, bio, stats, etc.
    setUser(prev => ({ ...prev, name, role, email, bio }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Saved', 'Profile updated');
    if (handleSaveProfile) {
      handleSaveProfile();
    } else {
      onClose();
    }
  };

  return (
    <>
      {/* Previously a centered popup modal. Replaced with BottomSheet for consistent interactions. */}
      <BottomSheet visible={visible} onClose={onClose} theme={theme} title="Edit Profile">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24, paddingTop: 4 }}>
            <Text style={{ fontSize: 14, fontFamily: theme.fonts.medium, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm }}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor={theme.colors.textSecondary}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.background,
                padding: theme.spacing.md,
                borderRadius: theme.borderRadius.sm,
                marginBottom: theme.spacing.md,
                color: theme.colors.text,
                fontFamily: theme.fonts.regular
              }}
            />

            <Text style={{ fontSize: 14, fontFamily: theme.fonts.medium, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm }}>Role</Text>
            <TextInput
              value={role}
              onChangeText={setRole}
              placeholder="Role"
              placeholderTextColor={theme.colors.textSecondary}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.background,
                padding: theme.spacing.md,
                borderRadius: theme.borderRadius.sm,
                marginBottom: theme.spacing.md,
                color: theme.colors.text,
                fontFamily: theme.fonts.regular
              }}
            />

            <Text style={{ fontSize: 14, fontFamily: theme.fonts.medium, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm }}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={theme.colors.textSecondary}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.background,
                padding: theme.spacing.md,
                borderRadius: theme.borderRadius.sm,
                marginBottom: theme.spacing.md,
                color: theme.colors.text,
                fontFamily: theme.fonts.regular
              }}
            />

            <Text style={{ fontSize: 14, fontFamily: theme.fonts.medium, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm }}>Bio</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Bio"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              style={{
                borderWidth: 1,
                borderColor: theme.colors.background,
                padding: theme.spacing.md,
                borderRadius: theme.borderRadius.sm,
                marginBottom: theme.spacing.md,
                color: theme.colors.text,
                fontFamily: theme.fonts.regular,
                minHeight: 80,
                textAlignVertical: "top",
              }}
            />

            <Pressable
              onPress={save}
              style={({ pressed }) => ({
                backgroundColor: theme.colors.primary,
                padding: theme.spacing.md,
                borderRadius: theme.borderRadius.md,
                marginTop: theme.spacing.md,
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text style={{ textAlign: 'center', color: theme.colors.white, fontFamily: theme.fonts.bold }}>Save</Text>
            </Pressable>
          </ScrollView>
      </BottomSheet>
    </>
  );
};