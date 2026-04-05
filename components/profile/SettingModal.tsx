// components/profile/SettingModal.tsx
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../utils/haptics';
import React, { useState, useEffect } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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

  // Sync state when visible changes (to reset or populate correctly)
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
    setUser(prev => ({ ...prev, name, role, email, bio, avatar: defaultAvatar }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (handleSaveProfile) {
      handleSaveProfile();
    } else {
      Alert.alert('Saved', 'Profile updated successfully.');
      onClose();
    }
  };

  // Helper renderer for input fields
  const renderInput = (label: string, iconName: any, value: string, setValue: (val: string) => void, placeholder: string, multiline = false) => (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <Text style={{ fontSize: 12, fontFamily: theme.fonts.bold, color: theme.colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {label}
      </Text>
      <View style={{
        flexDirection: 'row',
        alignItems: multiline ? 'flex-start' : 'center',
        backgroundColor: `${theme.colors.secondary}08`,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: `${theme.colors.secondary}15`,
        paddingHorizontal: 16,
        paddingVertical: multiline ? 12 : 4,
      }}>
        <Ionicons name={iconName} size={20} color={theme.colors.primary} style={{ marginRight: 12, marginTop: multiline ? 4 : 0 }} />
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
            fontSize: 16,
            minHeight: multiline ? 80 : 44,
            textAlignVertical: multiline ? "top" : "center",
          }}
        />
      </View>
    </View>
  );

  const previewInitial = name ? name.trim().charAt(0).toUpperCase() : "U";

  return (
    <BottomSheet visible={visible} onClose={onClose} theme={theme} title="Edit Profile">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}>
        
        {/* Avatar Preview */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
           <View style={{ 
             width: 80, height: 80, borderRadius: 28, 
             backgroundColor: `${theme.colors.primary}15`, 
             alignItems: 'center', justifyContent: 'center', 
             borderWidth: 1.5, borderColor: `${theme.colors.primary}50` 
           }}>
             <Text style={{ fontSize: 36, fontFamily: theme.fonts.bold, color: theme.colors.primary }}>{previewInitial}</Text>
           </View>
           <Text style={{ marginTop: 10, fontSize: 13, fontFamily: theme.fonts.medium, color: theme.colors.textSecondary }}>Profile Avatar Preview</Text>
        </View>

        {renderInput("Full Name", "person-outline", name, setName, "Enter your name")}
        {renderInput("Role / Title", "briefcase-outline", role, setRole, "Enter your role", false)}
        {renderInput("Email Address", "mail-outline", email, setEmail, "Enter your email", false)}
        {renderInput("Bio", "document-text-outline", bio, setBio, "Tell us about yourself...", true)}

        <Pressable
          onPress={save}
          style={({ pressed }) => ({
            backgroundColor: theme.colors.primary,
            paddingVertical: 18,
            borderRadius: 16,
            marginTop: theme.spacing.md,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: theme.glows.primary.shadowColor,
            shadowOffset: theme.glows.primary.shadowOffset,
            shadowOpacity: theme.glows.primary.shadowOpacity,
            shadowRadius: theme.glows.primary.shadowRadius,
            elevation: theme.glows.primary.elevation,
          })}
        >
          <Ionicons name="checkmark-circle" size={20} color={theme.colors.white} style={{ marginRight: 8 }} />
          <Text style={{ color: theme.colors.white, fontFamily: theme.fonts.bold, fontSize: 16 }}>Save Changes</Text>
        </Pressable>
      </ScrollView>
    </BottomSheet>
  );
};