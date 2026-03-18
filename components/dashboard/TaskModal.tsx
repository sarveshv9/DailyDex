import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable, // for interactive elements
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RoutineItem } from "../../utils/utils";

interface TaskModalProps {
  visible: boolean;
  task: RoutineItem | null;
  animatedStyle?: any; // kept for backwards compatibility if needed
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const TaskModal: React.FC<TaskModalProps> = ({
  visible,
  task,
  onClose,
  onEdit,
  onDelete,
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  if (!task) return null;

  // Render a single row inside a card
  const CardRow = ({
    icon,
    iconColor,
    title,
    titleColor = "#FFFFFF",
    value,
    badge,
    showChevron = true,
    isLast = false,
  }: {
    icon: any;
    iconColor: string;
    title: string;
    titleColor?: string;
    value?: string;
    badge?: string;
    showChevron?: boolean;
    isLast?: boolean;
  }) => (
    <View>
      <View style={styles.cardRow}>
        <View style={styles.cardRowLeft}>
          <Ionicons name={icon} size={22} color={iconColor} />
          <Text style={[styles.cardRowTitle, { color: titleColor }]}>
            {title}
          </Text>
        </View>
        <View style={styles.cardRowRight}>
          {value && <Text style={styles.cardRowValue}>{value}</Text>}
          {badge && (
             <View style={styles.proBadge}>
               <Ionicons name="star" size={10} color="#8E8E93" style={{marginRight: 2}}/>
               <Text style={styles.proBadgeText}>{badge}</Text>
             </View>
          )}
          {showChevron && (
            <Ionicons name="chevron-forward" size={18} color="#555555" />
          )}
        </View>
      </View>
      {!isLast && <View style={styles.divider} />}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.container,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* --- Top Header Section (Blue) --- */}
        <View style={[styles.headerSection, { paddingTop: Math.max(insets.top, 20) }]}>
          {/* Top Actions */}
          <View style={styles.topActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={onEdit} hitSlop={10}>
              <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Icon & Title Row */}
          <View style={styles.titleRow}>
            {/* Dashed line extending upwards */}
            <View style={styles.dashedLineContainer}>
              <View style={styles.dashedLine} />
            </View>

            {/* Huge Icon Pill */}
            <View style={styles.iconPill}>
              <Ionicons name="moon" size={36} color="#4DA6FF" />
              {/* Tool badge attached to pill */}
              <View style={styles.paletteBadge}>
                <Ionicons name="color-palette" size={16} color="#FFFFFF" />
              </View>
            </View>

            {/* Text Details */}
            <View style={styles.titleDetails}>
              <Text style={styles.timeTag}>1:00 AM+1</Text>
              <View style={styles.titleWithCheckRow}>
                <View style={styles.titleBox}>
                  <Text style={styles.taskTitle}>{task.task}</Text>
                </View>
                <TouchableOpacity style={styles.checkboxCircle} />
              </View>
              <Ionicons name="sync" size={16} color="rgba(255,255,255,0.6)" style={{marginTop: 6}} />
            </View>
          </View>
        </View>

        {/* --- Bottom Body Section (Dark Grey) --- */}
        <ScrollView style={styles.bodySection} bounces={false}>
          
          {/* Main Info Card */}
          <View style={styles.card}>
            <CardRow
              icon="calendar-outline"
              iconColor="#FF8A8A"
              title="Thu, Mar 19, 2026"
              value="Today"
            />
            <CardRow
              icon="time-outline"
              iconColor="#FF8A8A"
              title={task.time || "1:00 AM"}
            />
            <CardRow
              icon="sync"
              iconColor="#FF8A8A"
              title="Every day"
              badge="PRO"
            />
            <CardRow
              icon="notifications-outline"
              iconColor="#FF8A8A"
              title="1 Alert"
              value="Nudge"
              isLast
            />
          </View>

          {/* Subtasks and Notes Card */}
          <View style={styles.card}>
            <CardRow
              icon="square-outline"
              iconColor="#666666"
              title="Add Subtask"
              titleColor="#666666"
              showChevron={false}
            />
            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                placeholder="Add notes, meeting links or phone numbers..."
                placeholderTextColor="#666666"
                multiline
                value={task.description}
                editable={false} // View only. User taps edit to change
              />
            </View>
          </View>

        </ScrollView>

        {/* --- Fixed Bottom Delete Area --- */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={20} color="#FF453A" style={{marginRight: 6}} />
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>

      </Animated.View>
    </Modal>
  );
};

export default TaskModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E', // Dark mode background
  },
  
  /* --- Top Header (Blue) --- */
  headerSection: {
    backgroundColor: '#4B7EB0', // Replicating the smooth blue from the screenshot
    paddingHorizontal: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: 10,
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    position: 'relative',
  },

  /* Dashed line */
  dashedLineContainer: {
    position: 'absolute',
    top: -200,
    bottom: '100%',
    left: 45, // roughly aligning with center of pill (which is 90 wide? wait: width 80 -> center 40)
    width: 2,
    alignItems: 'center',
    overflow: 'hidden',
  },
  dashedLine: {
    height: 1000,
    width: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.3)',
    borderStyle: 'dashed',
    borderRadius: 1,
  },

  /* Icon Pill */
  iconPill: {
    width: 80,
    height: 154,
    borderRadius: 40,
    backgroundColor: '#4A4A4A',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    position: 'relative',
  },
  paletteBadge: {
    position: 'absolute',
    bottom: -6,
    left: -10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1F3C5E', // matches the darker badge in screenshot
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4B7EB0', // blends with background
  },

  /* Task Details */
  titleDetails: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 15, // to align with the middle of the pill visually
  },
  timeTag: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  titleWithCheckRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleBox: {
    flex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.4)',
    paddingBottom: 6,
    marginRight: 16,
  },
  taskTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },
  checkboxCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  /* --- Body Section (Dark Grey) --- */
  bodySection: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  card: {
    backgroundColor: '#2A2A2C',
    borderRadius: 16,
    marginBottom: 16,
    paddingVertical: 4,
  },

  /* Card Rows */
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  cardRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardRowTitle: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '400',
  },
  cardRowValue: {
    color: '#8E8E93',
    fontSize: 16,
    marginRight: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginLeft: 50,
  },

  /* PRO Badge */
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  proBadgeText: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '600',
  },

  /* Text Area */
  textAreaContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  textArea: {
    color: '#FFFFFF',
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  /* --- Bottom Bar --- */
  bottomBar: {
    backgroundColor: '#1E1E1E',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    paddingTop: 16,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  deleteText: {
    color: '#FF453A',
    fontSize: 17,
    fontWeight: '600',
  },
});