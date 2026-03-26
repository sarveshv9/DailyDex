import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface TimePickerSheetProps {
  initialTime: string;
  initialDuration?: number;
  onTimeChange: (time: string) => void;
  onDurationChange?: (duration: number) => void;
  onClose: () => void;
}

export const TimePickerSheet: React.FC<TimePickerSheetProps> = ({
  initialTime,
  initialDuration,
  onTimeChange,
  onDurationChange,
  onClose,
}) => {
  const { theme } = useTheme();

  const getDateFromString = (timeStr: string) => {
    const now = new Date();
    if (!timeStr) return now;
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3].toUpperCase();
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      now.setHours(h, m, 0, 0);
    }
    return now;
  };

  const [currentDate, setCurrentDate] = useState(() => getDateFromString(initialTime));
  const [activeDuration, setActiveDuration] = useState(initialDuration || 30);
  const [showCustomDuration, setShowCustomDuration] = useState(false);

  const isStandardDuration = [1, 15, 30, 45, 60].includes(activeDuration);

  const formatCustomDuration = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    if (mins % 60 === 0) return `${Math.floor(mins / 60)}h`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const dynamicDurations = [
    { label: '1m', value: 1 },
    { label: '15', value: 15 },
    { label: '30', value: 30 },
    { label: '45', value: 45 },
    { label: '1h', value: 60 },
    { 
      label: isStandardDuration ? '1.5h' : formatCustomDuration(activeDuration), 
      value: isStandardDuration ? 90 : activeDuration 
    },
  ];

  const getDurationDate = (minutes: number) => {
      const d = new Date();
      d.setHours(Math.floor(minutes / 60));
      d.setMinutes(minutes % 60);
      d.setSeconds(0);
      return d;
  };
  const [durationDate, setDurationDate] = useState(() => getDurationDate(activeDuration));

  const handleChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setCurrentDate(selectedDate);
      let h = selectedDate.getHours();
      const m = selectedDate.getMinutes();
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      onTimeChange(`${h}:${String(m).padStart(2, "0")} ${ampm}`);
    }
  };

  const selectDuration = (val: number) => {
    setActiveDuration(val);
    if (onDurationChange) {
        onDurationChange(val);
    }
  };

  const isWeb = Platform.OS === 'web';

  const renderTimePicker = () => {
    if (isWeb) {
      const { WebTimePicker } = require('./WebTimePicker');
      return (
        <View style={styles.pickerContainer}>
          <WebTimePicker
            value={initialTime || "1:00 AM"}
            onChange={(time: string) => onTimeChange(time)}
            textColor="#FFFFFF"
          />
        </View>
      );
    }

    const DateTimePicker = require('@react-native-community/datetimepicker').default;
    return (
      <View style={styles.pickerContainer}>
        <DateTimePicker
          value={currentDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          textColor="#FFFFFF"
          themeVariant="dark"
          style={{ height: 210, width: '100%' }}
        />
      </View>
    );
  };

  const renderCustomDuration = () => {
    if (isWeb) {
      const { WebDurationPicker } = require('./WebTimePicker');
      return (
        <View style={styles.pickerContainer}>
          <WebDurationPicker
            value={activeDuration}
            onChange={(mins: number) => selectDuration(mins)}
          />
        </View>
      );
    }

    const DateTimePicker = require('@react-native-community/datetimepicker').default;
    return (
      <View style={styles.pickerContainer}>
        <DateTimePicker
          value={durationDate}
          mode="countdown"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event: any, selectedDate?: Date) => {
            if (selectedDate) {
              setDurationDate(selectedDate);
              const mins = selectedDate.getHours() * 60 + selectedDate.getMinutes();
              selectDuration(mins);
            }
          }}
          textColor="#FFFFFF"
          themeVariant="dark"
          style={{ height: 160, width: '100%' }}
        />
      </View>
    );
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Time</Text>
        <View style={styles.headerActions}>
           <Pressable style={styles.iconBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color="#FFF" />
           </Pressable>
        </View>
      </View>

      {/* Time Wheel Container */}
      {renderTimePicker()}

      {/* Midnight tag */}
      <View style={styles.midnightRow}>
        <Text style={styles.midnightText}>
            Ends after midnight <Text style={{ color: '#4DA6FF' }}>🌙</Text>
            <Text style={{ fontSize: 10, color: '#4DA6FF' }}> +1</Text>
        </Text>
      </View>

      {/* Duration Section */}
      <View style={styles.durationHeader}>
         <Text style={styles.title}>Duration</Text>
         <Pressable style={styles.iconBtn} onPress={() => setShowCustomDuration(!showCustomDuration)}>
            <Ionicons name={showCustomDuration ? "checkmark" : "ellipsis-horizontal"} size={18} color="#FFF" />
         </Pressable>
      </View>
      
      {showCustomDuration ? (
         renderCustomDuration()
      ) : (
         <View style={styles.durationPillsContainer}>
            {dynamicDurations.map(dur => {
                const isSelected = dur.value === activeDuration;
                return (
                    <Pressable 
                       key={dur.value} 
                       style={[styles.durPill, isSelected && { backgroundColor: theme.colors.primary }]}
                       onPress={() => selectDuration(dur.value)}
                    >
                        <Text 
                            style={[styles.durPillText, isSelected && styles.durPillTextSelected]}
                            adjustsFontSizeToFit={true}
                            numberOfLines={1}
                        >
                            {dur.label}
                        </Text>
                    </Pressable>
                );
            })}
         </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E20',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    overflow: 'hidden',
    height: 210,
    marginBottom: 16,
  },
  midnightRow: {
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  midnightText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  durationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  durationPillsContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durPill: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durPillText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
    fontWeight: '500',
  },
  durPillTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
});
