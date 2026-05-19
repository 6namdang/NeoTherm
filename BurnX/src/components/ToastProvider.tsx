import type { PropsWithChildren } from "react";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

const DISMISS_MS = 4800;

type ToastVariant = "error" | "info" | "success";

export type ToastShowOptions = {
  /** When set, tapping the message runs this (e.g. navigate) then dismisses the toast. */
  onPress?: () => void;
};

type ToastContextValue = {
  showToast: (
    message: string,
    variant?: ToastVariant,
    options?: ToastShowOptions,
  ) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const [payload, setPayload] = useState<{
    message: string;
    variant: ToastVariant;
    onPress?: () => void;
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showToast = useCallback(
    (
      message: string,
      variant: ToastVariant = "error",
      options?: ToastShowOptions,
    ) => {
      clearTimer();
      void AccessibilityInfo.announceForAccessibility(message);
      setPayload({
        message,
        variant,
        onPress: options?.onPress,
      });
      timerRef.current = setTimeout(() => {
        setPayload(null);
        timerRef.current = null;
      }, DISMISS_MS);
    },
    [clearTimer],
  );

  const dismiss = useCallback(() => {
    clearTimer();
    setPayload(null);
  }, [clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {payload ? (
        <View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFill, styles.overlay]}
        >
          <Animated.View
            entering={FadeInDown.springify().damping(17).stiffness(280)}
            exiting={FadeOutUp.duration(200)}
            style={[
              styles.toast,
              { marginTop: insets.top + spacing.sm },
              payload.variant === "error"
                ? styles.toastError
                : payload.variant === "success"
                  ? styles.toastSuccess
                  : styles.toastInfo,
            ]}
          >
            <Ionicons
              color={
                payload.variant === "error"
                  ? colors.danger
                  : payload.variant === "success"
                    ? colors.success
                    : colors.primary
              }
              name={
                payload.variant === "error"
                  ? "alert-circle"
                  : payload.variant === "success"
                    ? "checkmark-circle"
                    : "information-circle"
              }
              size={22}
            />
            {payload.onPress ? (
              <Pressable
                accessibilityHint="Opens assignments"
                accessibilityLabel="Open assignments"
                accessibilityRole="button"
                onPress={() => {
                  payload.onPress?.();
                  dismiss();
                }}
                style={styles.toastMessageFlex}
              >
                <Text style={styles.toastMessage}>{payload.message}</Text>
              </Pressable>
            ) : (
              <Text style={[styles.toastMessageFlex, styles.toastMessage]}>
                {payload.message}
              </Text>
            )}
            <Pressable
              accessibilityLabel="Dismiss message"
              hitSlop={10}
              onPress={dismiss}
              style={styles.dismissHit}
            >
              <Ionicons color={colors.textMuted} name="close" size={22} />
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = use(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      default: { elevation: 8 },
    }),
  },
  toastError: {
    backgroundColor: colors.surface,
    borderColor: colors.dangerSoft,
  },
  toastSuccess: {
    backgroundColor: colors.surface,
    borderColor: colors.successSoft,
  },
  toastInfo: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  toastMessageFlex: {
    flex: 1,
    minWidth: 0,
  },
  toastMessage: {
    ...typography.body,
    color: colors.text,
  },
  dismissHit: {
    padding: spacing.xs,
    marginTop: -spacing.xs,
    marginRight: -spacing.xs,
  },
});
