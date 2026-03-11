// components/profile/SettingModal.tsx
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Theme } from '../../constants/shared';

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

  const save = () => {
    // This spread operator (...) correctly preserves all fields
    // like email, bio, stats, etc., while only updating name and role.
    setUser(prev => ({ ...prev, name, role }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Saved', 'Profile updated');
    if (handleSaveProfile) {
      handleSaveProfile();
    } else {
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <View style={{
          width: '90%',
          maxHeight: '80%',
          backgroundColor: theme.colors.card,
          borderRadius: theme.borderRadius.lg,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: theme.spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.background
          }}>
            <Text style={{ fontSize: 18, fontFamily: theme.fonts.bold, color: theme.colors.text }}>Edit Profile</Text>
            <TouchableOpacity onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}>
              <Ionicons name="close" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: theme.spacing.lg }}>
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

            <TouchableOpacity
              onPress={save}
              style={{
                backgroundColor: theme.colors.primary,
                padding: theme.spacing.md,
                borderRadius: theme.borderRadius.md,
                marginTop: theme.spacing.md,
              }}
            >
              <Text style={{ textAlign: 'center', color: theme.colors.white, fontFamily: theme.fonts.bold }}>Save</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};