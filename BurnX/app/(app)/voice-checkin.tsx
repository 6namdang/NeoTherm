/**
 * Voice check-in: four short recordings, PUT to S3, register session via API.
 */

import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  AppState,
  type AppStateStatus,
  InteractionManager,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, type Href } from "expo-router";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Svg, { Circle, G } from "react-native-svg";
import { Button } from "../../src/components/Button";
import { PageHeader } from "../../src/components/PageHeader";
import { Screen } from "../../src/components/Screen";
import { useToast } from "../../src/components/ToastProvider";
import { VOICE_CHECKIN_FORM } from "../../src/constants/forms/voice-checkin";
import { getVoiceUploadUrls, submitVoiceSession } from "../../src/lib/api";
import { bxLog } from "../../src/lib/debug-log";
import {
  beginRecording,
  cancelRecording,
  finishRecording,
  requestMicPermission,
  uploadToS3,
} from "../../src/lib/voice-recording";
import {
  getWeeklyLocalSlotWindowContaining,
  isWithinWeeklyLocalSlotWindow,
} from "../../src/lib/weekly-local-slot-window";
import { colors } from "../../src/theme/colors";
import { fontFamily } from "../../src/theme/fontFamily";
import { shadows } from "../../src/theme/shadows";
import { radius, spacing } from "../../src/theme/spacing";
import { typography } from "../../src/theme/typography";

const TASKS = VOICE_CHECKIN_FORM.tasks;
const VOICE_SLOTS = {
  daysOfWeek: [...VOICE_CHECKIN_FORM.assignmentDaysOfWeek],
  hour: VOICE_CHECKIN_FORM.assignmentTimeOfDay.hour,
  minute: VOICE_CHECKIN_FORM.assignmentTimeOfDay.minute,
} as const;

type StepIx = 0 | 1 | 2 | 3 | 4 | 5;

type ClipsMap = Partial<Record<string, { uri: string; durationMs: number }>>;

const RING_SIZE = 168;
const RING_STROKE = 10;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_LEN = 2 * Math.PI * RING_R;
const RING_CX = RING_SIZE / 2;
const RING_CY = RING_SIZE / 2;

function Panel({ children, accent }: { children: ReactNode; accent?: "default" | "info" | "warning" }) {
  return (
    <View
      style={[
        styles.panel,
        shadows.card,
        accent === "info" && styles.panelInfo,
        accent === "warning" && styles.panelWarning,
      ]}
    >
      {children}
    </View>
  );
}

function SessionProgress({ step, clips }: { step: StepIx; clips: ClipsMap }) {
  if (step < 1) return null;

  const reviewPhase = step === 5;

  return (
    <View style={styles.progressHeader}>
      <Text style={[typography.micro, styles.progressMeta]}>Prompts</Text>
      <View style={styles.progressRow}>
        {TASKS.map((task, index) => {
          const recorded = Boolean(clips[task.id]);
          const complete = recorded || reviewPhase;
          const onStep = step === index + 1 && step <= 4;

          return (
            <Fragment key={task.id}>
              {index > 0 ? (
                <View
                  style={[
                    styles.progressConnector,
                    clips[TASKS[index - 1].id] || reviewPhase ? styles.progressConnectorDone : null,
                  ]}
                />
              ) : null}
              <View style={styles.stepColumn}>
                <View
                  style={[
                    styles.stepRingOuter,
                    complete ? styles.stepRingDone : null,
                    !complete && onStep ? styles.stepRingCurrent : null,
                    !complete && !onStep ? styles.stepRingUpcoming : null,
                  ]}
                >
                  {complete ? (
                    <Ionicons color={colors.primaryForeground} name="checkmark" size={16} />
                  ) : (
                    <Text
                      style={[
                        styles.stepRingNumber,
                        !complete && !onStep ? styles.stepRingNumberMuted : null,
                      ]}
                    >
                      {index + 1}
                    </Text>
                  )}
                </View>
                <Text numberOfLines={2} style={styles.stepCaption}>
                  {task.label}
                </Text>
              </View>
            </Fragment>
          );
        })}
      </View>
    </View>
  );
}

function ReviewClipList({ clips }: { clips: ClipsMap }) {
  return (
    <View style={styles.reviewList}>
      {TASKS.map((task) => {
        const ok = Boolean(clips[task.id]);
        return (
          <View key={task.id} style={styles.reviewRow}>
            <View style={[styles.reviewIcon, ok ? styles.reviewIconDone : styles.reviewIconPending]}>
              <Ionicons
                color={ok ? colors.primary : colors.textMuted}
                name={ok ? "checkmark-circle" : "ellipse-outline"}
                size={22}
              />
            </View>
            <View style={styles.reviewRowText}>
              <Text style={[typography.bodyStrong, styles.reviewTitle]}>{task.label}</Text>
              <Text style={[typography.caption, styles.reviewSubtitle]}>{task.instruction}</Text>
            </View>
            <Text style={[typography.micro, ok ? styles.reviewStatusOk : styles.reviewStatusPending]}>
              {ok ? "Recorded" : "Missing"}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function VoiceCheckinScreen() {
  const { showToast } = useToast();
  const appStateRef = useRef(AppState.currentState);

  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && s === "active") {
        setClock(Date.now());
      }
      appStateRef.current = s;
    });
    return () => sub.remove();
  }, []);

  const slotOpen = useMemo(
    () => isWithinWeeklyLocalSlotWindow(clock, VOICE_SLOTS),
    [clock],
  );

  const nextBoundaryLabel = useMemo(() => {
    const w = getWeeklyLocalSlotWindowContaining(clock, VOICE_SLOTS);
    if (!w) return "";
    const d = new Date(w.endMs);
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  }, [clock]);

  const [step, setStep] = useState<StepIx>(0);
  const [clips, setClips] = useState<ClipsMap>({});

  const recordingTaskIx = step >= 1 && step <= 4 ? step - 1 : 0;

  const [micGranted, setMicGranted] = useState<boolean | null>(null);
  const [recordingActive, setRecordingActive] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  type Rec = Awaited<ReturnType<typeof beginRecording>>;
  const activeRecordingRef = useRef<Rec | null>(null);
  const ticksRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (ticksRef.current) {
      clearInterval(ticksRef.current);
      ticksRef.current = null;
    }
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
  }, []);

  const discardSessionLocal = useCallback(async () => {
    clearTimers();
    const rec = activeRecordingRef.current;
    activeRecordingRef.current = null;
    await cancelRecording(rec ?? null);
    setRecordingActive(false);
    setElapsedMs(0);
    setStep(0);
    setClips({});
    setMicGranted(null);
    bxLog("voice", "session discarded locally");
  }, [clearTimers]);

  useEffect(
    () => () => {
      void (async () => {
        clearTimers();
        await cancelRecording(activeRecordingRef.current);
        activeRecordingRef.current = null;
      })();
    },
    [clearTimers],
  );

  const clipCount = useMemo(() => Object.keys(clips).length, [clips]);

  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadPct, setUploadPct] = useState(0);

  const promptExit = () => {
    if (recordingActive || uploadBusy) {
      Alert.alert(
        recordingActive ? "Recording in progress" : "Upload in progress",
        recordingActive
          ? "Leaving now will discard the current take. You can re-record later during your window."
          : "Please wait until the upload completes so your session is saved correctly.",
      );
      return;
    }
    const hasStarted = clipCount > 0 || step > 0;
    if (!hasStarted) {
      router.back();
      return;
    }
    Alert.alert(
      "Discard this session?",
      "Clips saved only on this device for this attempt will be removed. Nothing is uploaded until you tap Upload & finish.",
      [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            void discardSessionLocal().then(() => router.back());
          },
        },
      ],
    );
  };

  const goIntroContinue = async () => {
    if (Platform.OS === "web") {
      showToast("Voice recording is not supported on web yet — use the mobile app.", "info");
      return;
    }
    const ok = await requestMicPermission();
    setMicGranted(ok);
    if (!ok) {
      showToast("Microphone permission is required for Voice Check-In.", "error");
      return;
    }
    setStep(1);
  };

  const startAutoRecording = async () => {
    if (step < 1 || step > 4) return;
    const task = TASKS[step - 1];
    clearTimers();

    try {
      const rec = await beginRecording();
      activeRecordingRef.current = rec;
      setRecordingActive(true);
      setElapsedMs(0);
      const t0 = Date.now();
      ticksRef.current = setInterval(() => setElapsedMs(Date.now() - t0), 50);

      stopTimeoutRef.current = setTimeout(() => {
        void (async () => {
          const recCaptured = activeRecordingRef.current ?? rec;
          activeRecordingRef.current = null;

          if (ticksRef.current !== null) {
            clearInterval(ticksRef.current);
            ticksRef.current = null;
          }
          stopTimeoutRef.current = null;

          try {
            const doneMs = Date.now() - t0;
            const result = await finishRecording(recCaptured, doneMs);
            setClips((prev) => ({ ...prev, [task.id]: result }));
          } catch (e) {
            showToast(e instanceof Error ? e.message : "Recording failed.", "error");
          } finally {
            setRecordingActive(false);
            setElapsedMs(0);
          }
        })();
      }, task.durationMs);
    } catch (e) {
      setRecordingActive(false);
      clearTimers();
      activeRecordingRef.current = null;
      showToast(e instanceof Error ? e.message : "Could not start recording.", "error");
    }
  };

  const cancelActiveRecording = async () => {
    clearTimers();
    const captured = activeRecordingRef.current;
    activeRecordingRef.current = null;
    await cancelRecording(captured ?? null);
    setRecordingActive(false);
    setElapsedMs(0);
  };

  const continueAfterClip = () => {
    setStep((s) => {
      if (s < 1 || s > 4) return s;
      return (s === 4 ? 5 : s + 1) as StepIx;
    });
  };

  const runPipeline = async () => {
    try {
      setUploadBusy(true);
      setUploadPct(0);
      setUploadLabel("Requesting secure upload links…");

      const payload = await getVoiceUploadUrls();
      const urls = payload.urls;

      const s3_keys: string[] = [];
      for (const task of TASKS) {
        const slot = urls[task.id];
        if (!slot?.url || !slot?.key) {
          throw new Error(`Server missing URL for "${task.label}".`);
        }
        s3_keys.push(slot.key);
      }

      setUploadLabel("Encrypting upload…");

      await Promise.all(
        TASKS.map(async (task, idx) => {
          const uri = clips[task.id]?.uri;
          if (!uri) throw new Error(`Missing recording for ${task.label}.`);
          const slot = urls[task.id];
          await uploadToS3(uri, slot.url);
          setUploadPct(Math.round(((idx + 1) / TASKS.length) * 100));
        }),
      );

      setUploadLabel("Saving session…");
      await submitVoiceSession({ session_id: payload.session_id, s3_keys });
      bxLog("voice", "session submitted", { session_id: payload.session_id });
      showToast("Voice check-in saved.", "success");
      /*
       Avoid setUploadBusy(false) + resetting step/clips before leaving: that frame re-renders the
       intro flow and competes with navigation. Replacing nested "/(app)" also remounted the whole
       tab shell (lag / blank flashes). Navigate to "/" = Home tab in-place.
       */
      InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(() => {
          router.navigate("/" as Href);
        });
      });
    } catch (e) {
      setUploadBusy(false);
      showToast(e instanceof Error ? e.message : "Upload failed.", "error");
    }
  };

  const webBlock = Platform.OS === "web";
  const currentClipTask =
    step >= 1 && step <= 4 ? TASKS[recordingTaskIx] : TASKS[TASKS.length - 1];
  const currentClipDone = Boolean(clips[currentClipTask.id]);

  const headerSubtitle =
    uploadBusy
      ? "Saving your recordings…"
      : "Four short prompts · Timed captures · Protected in transit (TLS)";

  return (
    <Screen animateEntry preset="stack" scroll keyboardAvoid={false}>
      <StatusBar style="dark" />

      <PageHeader
        eyebrow="Care programs"
        onBackPress={promptExit}
        subtitle={headerSubtitle}
        title={uploadBusy ? "Submitting session" : "Voice Check-In"}
      />

      {!webBlock && !slotOpen ? (
        <Panel accent="warning">
          <View style={styles.gateIconWrap}>
            <Ionicons color={colors.primary} name="calendar-outline" size={26} />
          </View>
          <Text style={[typography.title, styles.gateTitle]}>Outside your recording window</Text>
          <Text style={[typography.body, styles.gateCopy]}>
            The Assignments tab stays available anytime; recordings are only collected during scheduled local windows (Mon /
            Wed / Fri at 10:00 through to the next boundary). Opening this screen outside that window lets you preview
            details only.
          </Text>
          {nextBoundaryLabel !== "" ? (
            <View style={styles.scheduleChip}>
              <Ionicons color={colors.primary} name="time-outline" size={16} />
              <Text style={[typography.caption, styles.scheduleChipText]}>
                Next window closes near <Text style={styles.scheduleChipBold}>{nextBoundaryLabel}</Text>
              </Text>
            </View>
          ) : null}
          <Button
            title="Return to dashboard"
            onPress={() => router.navigate("/" as Href)}
            variant="secondary"
          />
        </Panel>
      ) : webBlock ? (
        <Panel accent="info">
          <View style={styles.gateIconWrap}>
            <Ionicons color={colors.primary} name="phone-portrait-outline" size={26} />
          </View>
          <Text style={[typography.title, styles.gateTitle]}>Use the BurnX mobile app</Text>
          <Text style={[typography.body, styles.gateCopy]}>
            Voice Check-In requires the microphone APIs available on our iOS and Android builds.
          </Text>
          <Button title="Go back" onPress={() => router.back()} variant="secondary" />
        </Panel>
      ) : uploadBusy ? (
        <Panel>
          <View style={styles.uploadHero}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
          <Text style={[typography.title, styles.stageTitle]}>Saving securely</Text>
          <Text style={[typography.body, styles.bodyMuted]}>{uploadLabel}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${uploadPct}%` }]} />
          </View>
          <Text style={[typography.micro, styles.uploadPct]}>{uploadPct}%</Text>
          <Text style={[typography.caption, styles.trustFootnote]}>TLS encryption in transit · Clinical care program</Text>
        </Panel>
      ) : step === 0 ? (
        <View style={styles.flowCol}>
          <Panel>
            <Text style={[typography.title, styles.introLead]}>Before you begin</Text>
            <Text style={[typography.body, styles.bodyMuted]}>Each clip records once and stops automatically.</Text>
            <View style={styles.bulletStack}>
              <View style={styles.bulletRow}>
                <View style={styles.bulletGlyph}>
                  <Ionicons color={colors.primary} name="mic" size={18} />
                </View>
                <View style={styles.bulletText}>
                  <Text style={[typography.bodyStrong, styles.bulletTitle]}>Microphone access</Text>
                  <Text style={[typography.caption, styles.bulletSub]}>Allow when prompted — only used for these four prompts.</Text>
                </View>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bulletGlyph}>
                  <Ionicons color={colors.primary} name="timer-outline" size={18} />
                </View>
                <View style={styles.bulletText}>
                  <Text style={[typography.bodyStrong, styles.bulletTitle]}>Timed capture</Text>
                  <Text style={[typography.caption, styles.bulletSub]}>Tap Start; we stop when the prompt window ends.</Text>
                </View>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bulletGlyph}>
                  <Ionicons color={colors.primary} name="refresh-outline" size={18} />
                </View>
                <View style={styles.bulletText}>
                  <Text style={[typography.bodyStrong, styles.bulletTitle]}>Re-do before upload</Text>
                  <Text style={[typography.caption, styles.bulletSub]}>You can re-record any clip until you submit the session.</Text>
                </View>
              </View>
            </View>
            {micGranted === false ? (
              <View style={styles.inlineAlert}>
                <Ionicons color={colors.warning} name="alert-circle" size={18} />
                <Text style={[typography.caption, styles.inlineAlertText]}>
                  Microphone is off — enable it in Settings to continue.
                </Text>
              </View>
            ) : null}
          </Panel>

          <Panel accent="info">
            <View style={styles.trustRow}>
              <Ionicons color={colors.primary} name="shield-checkmark-outline" size={20} />
              <Text style={[typography.caption, styles.trustCopy]}>
                Audio uploads use encrypted HTTPS. Your clinical team accesses recordings through the usual care workflows.
              </Text>
            </View>
          </Panel>

          <Button title="Begin session" onPress={() => void goIntroContinue()} />
          <Button title="Exit" onPress={promptExit} variant="ghost" />
        </View>
      ) : step === 5 ? (
        <View style={styles.flowCol}>
          <SessionProgress clips={clips} step={step} />
          <Panel>
            <Text style={[typography.title, styles.stageTitle]}>Review & submit</Text>
            <Text style={[typography.body, styles.bodyMuted]}>
              {clipCount === TASKS.length
                ? "All prompts are recorded. Submit to send them to your care program."
                : "Complete every prompt before uploading."}
            </Text>
            <ReviewClipList clips={clips} />
          </Panel>
          <Button
            disabled={clipCount !== TASKS.length}
            title="Upload & finish"
            onPress={() => void runPipeline()}
          />
          <Button title="Re-record from first prompt" onPress={() => setStep(1)} variant="secondary" />
          <Button title="Exit" onPress={promptExit} variant="ghost" />
        </View>
      ) : (
        <View style={styles.flowCol}>
          <SessionProgress clips={clips} step={step} />
          <TaskStep
            clipDone={currentClipDone}
            currentTask={currentClipTask}
            elapsedMs={elapsedMs}
            onAbortSession={promptExit}
            onCancelRecording={() => void cancelActiveRecording()}
            onContinue={continueAfterClip}
            onRedo={() =>
              setClips((p) => {
                const n = { ...p };
                delete n[currentClipTask.id];
                return n;
              })}
            onStart={() => void startAutoRecording()}
            recordingActive={recordingActive}
            taskIndex={recordingTaskIx}
          />
        </View>
      )}
    </Screen>
  );
}

function TaskStep({
  currentTask,
  elapsedMs,
  recordingActive,
  onStart,
  onCancelRecording,
  onRedo,
  taskIndex,
  clipDone,
  onContinue,
  onAbortSession,
}: {
  currentTask: (typeof TASKS)[number];
  elapsedMs: number;
  recordingActive: boolean;
  onStart: () => void;
  onCancelRecording: () => void;
  onRedo: () => void;
  taskIndex: number;
  clipDone: boolean;
  onContinue: () => void;
  onAbortSession: () => void;
}) {
  const pct = recordingActive
    ? Math.min(1, elapsedMs / currentTask.durationMs)
    : clipDone
      ? 1
      : 0;
  const ringOffset = RING_LEN * (1 - pct);

  const remainSec = recordingActive
    ? Math.max(0, Math.ceil((currentTask.durationMs - elapsedMs) / 1000))
    : 0;

  const durationSec = Math.round(currentTask.durationMs / 1000);

  return (
    <View style={styles.taskFlow}>
      <Panel>
        <View style={styles.promptBadge}>
          <Text style={[typography.micro, styles.promptBadgeLabel]}>Prompt {taskIndex + 1}</Text>
        </View>
        <Text style={[typography.headlineMedium, styles.promptHeadline]}>{currentTask.label}</Text>
        <Text style={[typography.body, styles.promptBody]}>{currentTask.instruction}</Text>

        <View style={styles.metaChips}>
          <View style={styles.metaChip}>
            <Ionicons color={colors.textMuted} name="time-outline" size={14} />
            <Text style={[typography.caption, styles.metaChipText]}>{durationSec}s capture</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons color={colors.textMuted} name="mic-circle-outline" size={14} />
            <Text style={[typography.caption, styles.metaChipText]}>AAC · auto-stop</Text>
          </View>
        </View>

        <View style={styles.ringOuter}>
          <Svg height={RING_SIZE} width={RING_SIZE}>
            <Circle
              cx={RING_CX}
              cy={RING_CY}
              fill="none"
              opacity={0.95}
              r={RING_R}
              stroke={colors.primarySoft}
              strokeWidth={RING_STROKE}
            />
            <G transform={`rotate(-90 ${RING_CX} ${RING_CY})`}>
              <Circle
                cx={RING_CX}
                cy={RING_CY}
                fill="none"
                opacity={recordingActive ? 1 : clipDone ? 1 : 0.55}
                r={RING_R}
                stroke={recordingActive || clipDone ? colors.primary : colors.borderStrong}
                strokeDasharray={`${RING_LEN} ${RING_LEN}`}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                strokeWidth={RING_STROKE}
              />
            </G>
          </Svg>
          <View pointerEvents="none" style={styles.ringCenter}>
            {recordingActive ? (
              <>
                <Text style={[styles.timerBig]}>{remainSec}s</Text>
                <Text style={[typography.caption, styles.recLabel]}>Recording</Text>
              </>
            ) : clipDone ? (
              <>
                <View style={styles.captureDisc}>
                  <Ionicons color={colors.primaryForeground} name="checkmark" size={34} />
                </View>
                <Text style={[typography.micro, styles.capturedLabel]}>Captured</Text>
              </>
            ) : (
              <>
                <Ionicons color={colors.primary} name="pulse-outline" size={36} />
                <Text style={[typography.caption, styles.tapStart]}>Ready when you are</Text>
              </>
            )}
          </View>
        </View>
      </Panel>

      {!recordingActive && !clipDone ? (
        <Button title={`Start recording · ${durationSec}s`} onPress={onStart} />
      ) : recordingActive ? (
        <Button title="Cancel this take" variant="destructiveOutline" onPress={() => void onCancelRecording()} />
      ) : (
        <View style={styles.afterRow}>
          <Button style={styles.flexBtn} title="Re-do" variant="secondary" onPress={onRedo} />
          <Button style={styles.flexBtn} title="Continue" onPress={onContinue} />
        </View>
      )}

      <Button title="Exit session" onPress={onAbortSession} variant="ghost" />
    </View>
  );
}

const styles = StyleSheet.create({
  flowCol: {
    gap: spacing.md,
    paddingBottom: spacing.xxl + 24,
    width: "100%",
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xl - 2,
    gap: spacing.md,
  },
  panelInfo: {
    backgroundColor: colors.primarySoft + "66",
    borderColor: colors.border,
  },
  panelWarning: {
    backgroundColor: colors.warningSoft + "AA",
    borderColor: "#E7D4A8",
  },
  gateIconWrap: {
    alignSelf: "flex-start",
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  gateTitle: {
    color: colors.text,
  },
  gateCopy: {
    color: colors.textSecondary,
    lineHeight: 24,
  },
  scheduleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: "stretch",
  },
  scheduleChipText: {
    color: colors.textSecondary,
    flex: 1,
    flexWrap: "wrap",
  },
  scheduleChipBold: {
    fontFamily: fontFamily.semiBold,
    color: colors.text,
  },
  introLead: {
    color: colors.text,
  },
  bulletStack: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  bulletRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  bulletGlyph: {
    width: 40,
    height: 40,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  bulletText: {
    flex: 1,
    gap: 2,
  },
  bulletTitle: {
    color: colors.text,
  },
  bulletSub: {
    color: colors.textMuted,
    marginTop: 2,
  },
  inlineAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: "#F5E0B3",
  },
  inlineAlertText: {
    color: colors.warning,
    flex: 1,
    fontFamily: fontFamily.medium,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  trustCopy: {
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  trustFootnote: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  progressHeader: {
    marginBottom: spacing.xs,
    width: "100%",
  },
  progressMeta: {
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    width: "100%",
  },
  progressConnector: {
    width: 12,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: "center",
    marginTop: 16,
    opacity: 0.75,
  },
  progressConnectorDone: {
    backgroundColor: colors.primary,
    opacity: 1,
  },
  stepColumn: {
    alignItems: "center",
    maxWidth: 76,
    minWidth: 64,
  },
  stepRingOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  stepRingDone: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  stepRingCurrent: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  stepRingUpcoming: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
  },
  stepRingNumber: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.primary,
    fontVariant: ["tabular-nums"],
  },
  stepRingNumberMuted: {
    color: colors.textMuted,
  },
  stepCaption: {
    ...typography.micro,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 14,
    minHeight: 28,
    paddingHorizontal: 2,
  },
  uploadHero: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  stageTitle: {
    color: colors.text,
  },
  bodyMuted: {
    color: colors.textSecondary,
    lineHeight: 24,
  },
  uploadPct: {
    color: colors.textMuted,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  progressTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    height: 8,
    overflow: "hidden",
    marginTop: spacing.xs,
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: "100%",
  },
  reviewList: {
    gap: spacing.sm,
    marginTop: spacing.sm,
    width: "100%",
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  reviewIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewIconDone: {
    backgroundColor: colors.primarySoft,
  },
  reviewIconPending: {
    backgroundColor: colors.surfaceMuted,
  },
  reviewRowText: {
    flex: 1,
    gap: 2,
  },
  reviewTitle: {
    color: colors.text,
    fontSize: 15,
  },
  reviewSubtitle: {
    color: colors.textMuted,
  },
  reviewStatusOk: {
    color: colors.primary,
  },
  reviewStatusPending: {
    color: colors.textMuted,
  },
  taskFlow: {
    gap: spacing.md,
    paddingBottom: spacing.xxl + 24,
    width: "100%",
  },
  promptBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promptBadgeLabel: {
    color: colors.primary,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  promptHeadline: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
    marginTop: spacing.sm,
    letterSpacing: -0.4,
  },
  promptBody: {
    color: colors.textSecondary,
    lineHeight: 24,
  },
  metaChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaChipText: {
    color: colors.textSecondary,
  },
  ringOuter: {
    alignItems: "center",
    alignSelf: "center",
    height: RING_SIZE,
    justifyContent: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    position: "relative",
    width: RING_SIZE,
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
  },
  timerBig: {
    color: colors.text,
    fontVariant: ["tabular-nums"],
    fontSize: 40,
    fontFamily: fontFamily.bold,
    letterSpacing: -0.5,
  },
  recLabel: {
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
  },
  captureDisc: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  capturedLabel: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  tapStart: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  afterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
  },
  flexBtn: {
    flex: 1,
    minWidth: 0,
  },
});
