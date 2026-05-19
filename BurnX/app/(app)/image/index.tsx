import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, type Href } from "expo-router";
import { Button } from "../../../src/components/Button";
import { PageHeader } from "../../../src/components/PageHeader";
import { Screen } from "../../../src/components/Screen";
import { useToast } from "../../../src/components/ToastProvider";
import type { WoundImage } from "../../../src/lib/api";
import { getMyWoundImages, isVlmFailure, isVlmSuccess } from "../../../src/lib/api";
import { getWoundImageViewUrlQueued } from "../../../src/lib/wound-view-url-queue";
import { colors } from "../../../src/theme/colors";
import { fontFamily } from "../../../src/theme/fontFamily";
import { radius, spacing } from "../../../src/theme/spacing";
import { typography } from "../../../src/theme/typography";
import { formatRelativePast } from "../../../src/lib/format-relative-past";
import { formatPhotoTakenMedium } from "../../../src/lib/format-photo-date";
import { woundProcessingComplete } from "../../../src/lib/wound-image-status";
import { bxLog } from "../../../src/lib/debug-log";

const REFETCH_DEBOUNCE_MS = 60_000;

function statusMeta(item: WoundImage): { label: string; tone: "muted" | "warn" | "ok" } {
  if (!woundProcessingComplete(item)) {
    return { label: "Analyzing…", tone: "muted" };
  }
  const v = item.vlm_analysis;
  if (v !== null && isVlmFailure(v)) {
    return { label: "Analysis failed", tone: "warn" };
  }
  return { label: "Analyzed", tone: "ok" };
}

function summaryLine(item: WoundImage): string | null {
  const v = item.vlm_analysis;
  if (v === null || !isVlmSuccess(v)) return null;
  const t = v.patient_friendly_summary?.trim() ?? "";
  return t === "" ? null : t;
}

function statusIcon(tone: "muted" | "warn" | "ok"): "sync-outline" | "alert-circle-outline" | "checkmark-circle" {
  if (tone === "warn") return "alert-circle-outline";
  if (tone === "ok") return "checkmark-circle";
  return "sync-outline";
}

function WoundImageRow({
  item,
  onPress,
}: {
  item: WoundImage;
  onPress: () => void;
}) {
  const [thumbUri, setThumbUri] = useState<string | null>(null);
  const [thumbError, setThumbError] = useState(false);

  useEffect(() => {
    setThumbUri(null);
    setThumbError(false);
    let cancelled = false;

    const load = async (): Promise<void> => {
      const id = item.image_id;
      const fetchOnce = () => getWoundImageViewUrlQueued(id);

      try {
        const { url } = await fetchOnce();
        if (!cancelled) {
          setThumbUri(url);
          setThumbError(false);
          return;
        }
      } catch (e1) {
        bxLog("wound-image", "thumbnail view-url failed (1st)", id, e1);
      }

      if (cancelled) return;
      try {
        await new Promise<void>((r) => setTimeout(r, 450));
        const { url } = await fetchOnce();
        if (!cancelled) {
          setThumbUri(url);
          setThumbError(false);
        }
      } catch (e2) {
        if (!cancelled) {
          bxLog("wound-image", "thumbnail view-url failed (retry)", id, e2);
          setThumbError(true);
          setThumbUri(null);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [item.image_id]);

  const meta = statusMeta(item);
  const sum = summaryLine(item);
  const when = item.recorded_at || item.created_at;
  const whenAbsolute = formatPhotoTakenMedium(when);
  const badgeStyle =
    meta.tone === "ok"
      ? styles.badgeOk
      : meta.tone === "warn"
        ? styles.badgeWarn
        : styles.badgeMuted;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.thumbWrap}>
        {thumbUri && !thumbError ? (
          <Image
            contentFit="cover"
            onError={(e) => {
              bxLog("wound-image", "thumbnail load error", item.image_id, e);
              setThumbError(true);
            }}
            recyclingKey={item.image_id}
            source={{ uri: thumbUri }}
            style={styles.thumb}
            transition={200}
          />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons color={colors.textMuted} name="image-outline" size={28} />
          </View>
        )}
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={[typography.bodyStrong, styles.rowDate]} numberOfLines={1}>
            {formatRelativePast(when)}
          </Text>
          <View style={[styles.badge, badgeStyle]}>
            <Ionicons
              color={
                meta.tone === "ok" ? colors.success : meta.tone === "warn" ? colors.warning : colors.textMuted
              }
              name={statusIcon(meta.tone)}
              size={13}
            />
            <Text style={[styles.badgeText, meta.tone === "ok" ? styles.badgeTextOk : null]}>{meta.label}</Text>
          </View>
        </View>
        <Text style={[typography.caption, styles.rowAbsolute]} numberOfLines={1}>
          {whenAbsolute}
        </Text>
        {sum !== null ? (
          <Text style={[typography.caption, styles.rowSummary]} numberOfLines={2}>
            {sum}
          </Text>
        ) : (
          <Text style={[typography.caption, styles.rowPlaceholder]}>
            {!woundProcessingComplete(item)
              ? "We will add a short summary when analysis finishes."
              : " "}
          </Text>
        )}
      </View>
      <Ionicons color={colors.textMuted} name="chevron-forward" size={20} />
    </Pressable>
  );
}

export default function WoundPhotosScreen() {
  const { showToast } = useToast();
  const [items, setItems] = useState<WoundImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchAt = useRef(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const hasLoadedOnce = useRef(false);

  const load = useCallback(
    async (isPull: boolean) => {
      setError(null);
      if (isPull) setRefreshing(true);
      else if (!hasLoadedOnce.current) setLoading(true);
      try {
        const res = await getMyWoundImages(50);
        setItems(res.items);
        lastFetchAt.current = Date.now();
        hasLoadedOnce.current = true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        showToast(msg, "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (
        (prev === "inactive" || prev === "background") &&
        next === "active" &&
        Date.now() - lastFetchAt.current > REFETCH_DEBOUNCE_MS
      ) {
        void load(false);
      }
    });
    return () => sub.remove();
  }, [load]);

  if (Platform.OS === "web") {
    return (
      <Screen preset="tabs" scroll>
        <StatusBar style="dark" />
        <PageHeader title="Wound Photos" />
        <Text style={[typography.body, styles.webMsg]}>
          Wound photos are available in the BurnX mobile app for iOS and Android.
        </Text>
        <Button title="Back to Home" onPress={() => router.replace("/")} variant="secondary" />
      </Screen>
    );
  }

  const listHeader = (
    <View style={styles.headerBlock}>
      <PageHeader title="Wound Photos" />
      <Text style={[typography.subtitle, styles.listSubtitle]}>
        Log progress with clear photos—review analysis and trends with your care team.
      </Text>
      <Button
        title="Take new photo"
        style={styles.primaryBtn}
        onPress={() => router.push("/image/capture" as Href)}
      />
      {loading && items.length === 0 ? (
        <View style={styles.centerBusy}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[typography.caption, styles.muted]}>Loading photos…</Text>
        </View>
      ) : null}
      {error !== null && items.length === 0 ? (
        <Text style={[typography.caption, styles.errorText]}>{error}</Text>
      ) : null}
      {!loading && items.length === 0 && error === null ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyVisual}>
            <Ionicons color={colors.primary} name="camera-outline" size={44} />
          </View>
          <Text style={[typography.body, styles.emptyTitle]}>No photos yet</Text>
          <Text style={[typography.caption, styles.emptySub]}>
            Take your first photo to start tracking how your wound looks over time.
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen preset="tabs" scroll={false}>
      <StatusBar style="dark" />
      <FlatList
        data={items}
        keyExtractor={(r) => r.image_id}
        removeClippedSubviews={false}
        style={styles.listFlex}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={() => void load(true)}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <WoundImageRow
            item={item}
            onPress={() => router.push(`/image/${item.image_id}` as Href)}
          />
        )}
      />
    </Screen>
  );
}

const THUMB = 76;

const styles = StyleSheet.create({
  headerBlock: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  listSubtitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  primaryBtn: {
    marginBottom: spacing.lg,
  },
  listContent: {
    paddingBottom: spacing.xxl * 2,
    flexGrow: 1,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  rowPressed: {
    opacity: 0.92,
  },
  thumbWrap: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  rowAbsolute: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: spacing.xs,
    fontFamily: fontFamily.regular,
  },
  rowDate: {
    flex: 1,
    color: colors.text,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
  },
  badgeOk: {
    backgroundColor: colors.successSoft,
  },
  badgeWarn: {
    backgroundColor: colors.warningSoft,
  },
  badgeMuted: {
    backgroundColor: colors.surfaceMuted,
  },
  badgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.textMuted,
  },
  badgeTextOk: {
    color: colors.success,
  },
  rowSummary: {
    color: colors.textSecondary,
    lineHeight: 18,
  },
  rowPlaceholder: {
    color: colors.textMuted,
  },
  centerBusy: {
    paddingVertical: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  muted: {
    color: colors.textMuted,
  },
  errorText: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
  emptyVisual: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyBox: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  emptyTitle: {
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  emptySub: {
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  webMsg: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  listFlex: {
    flex: 1,
  },
});
