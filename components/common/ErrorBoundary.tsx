import React, { Component, ErrorInfo, ReactNode, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  useColorScheme,
} from "react-native";
import {
  AlertTriangle,
  RefreshCw,
  Home,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react-native";
import { router } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { darkThemes, lightThemes, Theme, getSharedStyles } from "../../styles/shared";
import * as Haptics from "../../utils/haptics";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    this.props.onReset?.();
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorFallbackView
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}

function ErrorFallbackView({ error, errorInfo, onReset }: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  // Safely attempt to read context theme, fallback to system dark/light default
  const colorScheme = useColorScheme();
  let theme: Theme;
  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
  } catch {
    theme = colorScheme === "dark" ? darkThemes.pokeball : lightThemes.pokeball;
  }

  const { colors, fonts, spacing, borderRadius } = theme;
  const shared = React.useMemo(() => getSharedStyles(theme), [theme]);

  const handleCopy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const trace = `${error?.message || "Error"}\n\n${error?.stack || ""}\n\n${
      errorInfo?.componentStack || ""
    }`;
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(trace);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGoHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.href = "/";
    } else {
      try {
        router.replace("/");
      } catch {
        onReset();
      }
    }
  };

  return (
    <View style={[styles.container, shared.centeredContainer, { backgroundColor: colors.background }]}>
      {/* Ambient background glow ring */}
      <View
        pointerEvents="none"
        style={[
          styles.glowRing,
          {
            backgroundColor: colors.primary,
            opacity: 0.12,
          },
        ]}
      />

      <View
        style={[
          shared.glassCard,
          styles.card,
          {
            borderRadius: borderRadius.lg * 1.5,
            padding: spacing.xl,
          },
        ]}
      >
        {/* Glowing Icon Header */}
        <View
          style={[
            shared.iconTile,
            styles.iconTile,
            {
              borderRadius: borderRadius.lg,
              borderWidth: 1,
              borderColor: colors.border,
            },
          ]}
        >
          <AlertTriangle
            size={36}
            color={colors.primaryText}
            strokeWidth={1.8}
          />
        </View>

        {/* Title & Description */}
        <Text
          style={[
            styles.title,
            {
              fontFamily: fonts.bold,
              color: colors.text,
              marginTop: spacing.lg,
            },
          ]}
        >
          Something Went Wrong
        </Text>
        <Text
          style={[
            styles.subtitle,
            {
              fontFamily: fonts.regular,
              color: colors.textSecondary,
              marginTop: spacing.xs,
              marginBottom: spacing.lg,
            },
          ]}
        >
          Zen encountered an unexpected issue. Don&apos;t worry, your routines and data are safely stored.
        </Text>

        {/* Action Buttons */}
        <View style={styles.actionGroup}>
          <Pressable
            onPress={onReset}
            style={({ pressed }) => [
              shared.primaryButton,
              styles.primaryBtn,
              {
                borderRadius: borderRadius.lg,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Try Again"
          >
            <RefreshCw size={18} color={colors.onPrimary} strokeWidth={2} />
            <Text
              style={[
                shared.primaryButtonText,
                styles.primaryBtnText,
              ]}
            >
              Try Again
            </Text>
          </Pressable>

          <Pressable
            onPress={handleGoHome}
            style={({ pressed }) => [
              shared.secondaryButton,
              styles.secondaryBtn,
              {
                borderRadius: borderRadius.lg,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Return Home"
          >
            <Home size={18} color={colors.text} strokeWidth={1.8} />
            <Text
              style={[
                shared.secondaryButtonText,
                styles.secondaryBtnText,
                { color: colors.text },
              ]}
            >
              Return Home
            </Text>
          </Pressable>
        </View>

        {/* Technical Error Accordion */}
        {error && (
          <View style={[styles.detailsContainer, { marginTop: spacing.lg }]}>
            <Pressable
              onPress={() => setShowDetails(!showDetails)}
              style={styles.detailsToggle}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text
                style={[
                  styles.detailsToggleText,
                  { fontFamily: fonts.medium, color: colors.textSecondary },
                ]}
              >
                {showDetails ? "Hide Error Details" : "View Error Details"}
              </Text>
              {showDetails ? (
                <ChevronUp size={16} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={16} color={colors.textSecondary} />
              )}
            </Pressable>

            {showDetails && (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                  },
                ]}
              >
                <View style={styles.errorBoxHeader}>
                  <Text
                    style={[
                      styles.errorMessage,
                      { fontFamily: fonts.bold, color: colors.primary },
                    ]}
                    numberOfLines={2}
                  >
                    {error.message || "Unknown error"}
                  </Text>
                  {Platform.OS === "web" && (
                    <Pressable
                      onPress={handleCopy}
                      style={styles.copyBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {copied ? (
                        <Check size={14} color={colors.primary} />
                      ) : (
                        <Copy size={14} color={colors.textSecondary} />
                      )}
                    </Pressable>
                  )}
                </View>

                {(error.stack || errorInfo?.componentStack) && (
                  <ScrollView
                    style={styles.stackScroll}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                  >
                    <Text
                      style={[
                        styles.stackText,
                        { color: colors.textSecondary },
                      ]}
                      selectable
                    >
                      {error.stack || errorInfo?.componentStack}
                    </Text>
                  </ScrollView>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    width: "100%",
    height: "100%",
  },
  glowRing: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    filter: Platform.OS === "web" ? "blur(80px)" : undefined,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    alignItems: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  iconTile: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  actionGroup: {
    width: "100%",
    gap: 12,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: "100%",
    minHeight: 48,
  },
  primaryBtnText: {
    fontSize: 15,
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: "100%",
    minHeight: 46,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
  },
  detailsContainer: {
    width: "100%",
  },
  detailsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
  },
  detailsToggleText: {
    fontSize: 12,
  },
  errorBox: {
    marginTop: 8,
    borderWidth: 1,
    maxHeight: 180,
    width: "100%",
  },
  errorBoxHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 12,
    flex: 1,
  },
  copyBtn: {
    padding: 2,
  },
  stackScroll: {
    maxHeight: 120,
  },
  stackText: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    lineHeight: 16,
  },
});
