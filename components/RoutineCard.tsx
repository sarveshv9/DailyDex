import React, { useCallback, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Theme } from "../constants/shared";
import { useTheme } from "../context/ThemeContext";
import { RoutineItem } from "../utils/utils";

interface RoutineCardProps {
  item: RoutineItem;
  onPress: (item: RoutineItem, x: number, y: number) => void;
}

const RoutineCard: React.FC<RoutineCardProps> = ({ item, onPress }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  
  const [touchPosition, setTouchPosition] = useState({ x: 0, y: 0 });
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(
    (e: any) => {
      const { pageX, pageY } = e.nativeEvent;
      setTouchPosition({ x: pageX, y: pageY });
      Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, tension: 300, friction: 10 }).start();
    },
    [scaleAnim]
  );

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onPress(item, touchPosition.x, touchPosition.y)}
        style={styles.cardContainer}
      >
        {/* Minimalist Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.pokemonName}>{item.task}</Text>
          </View>
          <View style={styles.hpContainer}>
            <Text style={styles.hpLabel}>TIME</Text>
            <Text style={styles.hpValue}>{item.time.replace(" ", "")}</Text>
          </View>
        </View>

        {/* Text Only - Lore/Description */}
        <View style={styles.infoSection}>
          <Text style={styles.loreText} numberOfLines={2}>
            {item.description}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
           <Text style={styles.idText}>NO. {item.id.padStart(3, '0')}</Text>
           <View style={styles.miniButton}>
              <Text style={styles.miniButtonText}>EDIT</Text>
           </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  cardContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    marginVertical: 4, 
    padding: 12, // Slightly increased padding since image is gone to let text breathe
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: `${theme.colors.primary}15`,
  },
  /* Header Styles */
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: `${theme.colors.primary}08`, // Divider line similar to Trainer cards
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pokemonName: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.primary,
    letterSpacing: 0.3,
  },
  hpContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  hpLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: theme.colors.primary,
    opacity: 0.6,
    marginRight: 3,
  },
  hpValue: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  /* Lore */
  infoSection: {
    marginBottom: 8,
    paddingTop: 4,
  },
  loreText: {
    fontSize: 11,
    color: theme.colors.secondary,
    lineHeight: 15,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  /* Footer */
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  idText: {
    fontSize: 9,
    fontWeight: "700",
    color: theme.colors.secondary,
    opacity: 0.4,
  },
  miniButton: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 3,
    backgroundColor: `${theme.colors.primary}08`,
  },
  miniButtonText: {
    fontSize: 9,
    fontWeight: "700",
    color: theme.colors.primary,
  }
});

export default RoutineCard;