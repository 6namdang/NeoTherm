import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { colors } from "../../theme/colors";
import { fontFamily } from "../../theme/fontFamily";
import { shadows } from "../../theme/shadows";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export const VOICE_CAPTURE_RING_SIZE = 176;
const RING_STROKE = 8;
const RING_R = (VOICE_CAPTURE_RING_SIZE - RING_STROKE) / 2;
export const VOICE_CAPTURE_RING_LEN = 2 * Math.PI * RING_R;
const RING_CX = VOICE_CAPTURE_RING_SIZE / 2;
const RING_CY = VOICE_CAPTURE_RING_SIZE / 2;

export type VoiceCaptureRingState = "idle" | "active" | "complete";

export type VoiceCaptureRingProps = {
  state: VoiceCaptureRingState;
  /** 0–1 progress around the ring (timed recording). Ignored when state is idle. */
  progress?: number;
  /** Shown in the center while active (e.g. countdown). Overrides default mic UI. */
  activeCenter?: React.ReactNode;
  /** Overrides default idle center UI (e.g. delay countdown). */
  idleCenter?: React.ReactNode;
  idleLabel?: string;
  activeLabel?: string;
  completeLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function VoiceCaptureRing({
  state,
  progress = state === "complete" ? 1 : state === "active" ? 1 : 0,
  activeCenter,
  idleCenter,
  idleLabel = "Ready when you are",
  activeLabel = "Listening",
  completeLabel = "Captured",
  style,
}: VoiceCaptureRingProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const ringOffset = VOICE_CAPTURE_RING_LEN * (1 - clampedProgress);
  const strokeActive = state !== "idle";

  return (
    <View style={[styles.outer, style]}>
      {state === "active" ? <View style={styles.pulseHalo} /> : null}
      <Svg
        height={VOICE_CAPTURE_RING_SIZE}
        pointerEvents="none"
        width={VOICE_CAPTURE_RING_SIZE}
      >
        <Circle
          cx={RING_CX}
          cy={RING_CY}
          fill="none"
          r={RING_R}
          stroke={colors.border}
          strokeWidth={RING_STROKE}
        />
        <G transform={`rotate(-90 ${RING_CX} ${RING_CY})`}>
          <Circle
            cx={RING_CX}
            cy={RING_CY}
            fill="none"
            opacity={strokeActive ? 1 : 0.35}
            r={RING_R}
            stroke={
              state === "complete"
                ? colors.success
                : strokeActive
                  ? colors.primary
                  : colors.borderStrong
            }
            strokeDasharray={`${VOICE_CAPTURE_RING_LEN} ${VOICE_CAPTURE_RING_LEN}`}
            strokeDashoffset={ringOffset}
            strokeLinecap="round"
            strokeWidth={RING_STROKE}
          />
        </G>
      </Svg>
      <View pointerEvents="none" style={styles.center}>
        {state === "active" ? (
          activeCenter ?? (
            <>
              <View style={styles.activeDisc}>
                <Ionicons color={colors.primaryForeground} name="mic" size={30} />
              </View>
              <Text style={[typography.caption, styles.activeLabel]}>{activeLabel}</Text>
            </>
          )
        ) : state === "complete" ? (
          <>
            <View style={styles.completeDisc}>
              <Ionicons color={colors.primaryForeground} name="checkmark" size={28} />
            </View>
            <Text style={[typography.micro, styles.completeLabel]}>{completeLabel}</Text>
          </>
        ) : (
          idleCenter ?? (
            <>
              <View style={styles.idleDisc}>
                <Ionicons color={colors.primary} name="mic-outline" size={28} />
              </View>
              <Text style={[typography.caption, styles.idleLabel]}>{idleLabel}</Text>
            </>
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: "center",
    alignSelf: "center",
    height: VOICE_CAPTURE_RING_SIZE + spacing.lg,
    justifyContent: "center",
    position: "relative",
    width: VOICE_CAPTURE_RING_SIZE + spacing.lg,
  },
  pulseHalo: {
    position: "absolute",
    width: VOICE_CAPTURE_RING_SIZE + 8,
    height: VOICE_CAPTURE_RING_SIZE + 8,
    borderRadius: (VOICE_CAPTURE_RING_SIZE + 8) / 2,
    backgroundColor: colors.primarySoft,
    opacity: 0.55,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    gap: spacing.xs,
    justifyContent: "center",
  },
  idleDisc: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  activeDisc: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.button,
  },
  completeDisc: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  idleLabel: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  activeLabel: {
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
    textAlign: "center",
  },
  completeLabel: {
    color: colors.textMuted,
    letterSpacing: 0.35,
    marginTop: spacing.xs,
    textAlign: "center",
    textTransform: "uppercase",
  },
});
