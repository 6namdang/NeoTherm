import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { primeHomeAwayLocationPermissions } from "../../lib/home-location-tracking";
import { Button } from "../Button";

export type HomeAddressSelection = {
  address: string;
  latitude?: number;
  longitude?: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelected: (home: HomeAddressSelection) => void | Promise<void>;
};

export function HomeAwayAddressSetupModal({
  visible,
  onClose,
  onSelected,
}: Props) {
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);
  const [homeAddress, setHomeAddress] = useState("");
  const [selectedHome, setSelectedHome] = useState<HomeAddressSelection | null>(null);
  const [suggestions, setSuggestions] = useState<HomeAddressSelection[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const requiredOk = useMemo(
    () => selectedHome !== null || homeAddress.trim().length >= 8,
    [homeAddress, selectedHome],
  );

  useEffect(() => {
    if (!visible || Platform.OS === "web") return;
    void primeHomeAwayLocationPermissions();
  }, [visible]);

  useEffect(() => {
    const query = homeAddress.trim();
    setSuggestionError(null);
    if (selectedHome?.address === query) return;
    setSelectedHome(null);
    if (query.length < 8) {
      setSuggestions([]);
      setSuggesting(false);
      return;
    }

    let cancelled = false;
    setSuggesting(true);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const matches = await Location.geocodeAsync(query);
          if (cancelled) return;
          const unique = matches
            .filter((match) => Number.isFinite(match.latitude) && Number.isFinite(match.longitude))
            .slice(0, 4);
          const resolved = await Promise.all(
            unique.map(async (match, index): Promise<HomeAddressSelection> => {
              try {
                const reverse = await Location.reverseGeocodeAsync({
                  latitude: match.latitude,
                  longitude: match.longitude,
                });
                const first = reverse[0];
                const label = first
                  ? [
                      first.name,
                      first.street,
                      first.city,
                      first.region,
                      first.postalCode,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : "";
                return {
                  address: label || `${query} (${index + 1})`,
                  latitude: match.latitude,
                  longitude: match.longitude,
                };
              } catch {
                return {
                  address: `${query} (${index + 1})`,
                  latitude: match.latitude,
                  longitude: match.longitude,
                };
              }
            }),
          );
          if (!cancelled) {
            setSuggestions(resolved);
            setSuggestionError(
              resolved.length === 0 ? "No suggestions found. Try adding city and ZIP." : null,
            );
          }
        } catch {
          if (!cancelled) {
            setSuggestions([]);
            setSuggestionError("Could not load suggestions. Check the address and try again.");
          }
        } finally {
          if (!cancelled) setSuggesting(false);
        }
      })();
    }, 550);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [homeAddress, selectedHome?.address]);

  function submit() {
    const address = homeAddress.trim();
    if (!requiredOk || submitting || address.length < 8) return;
    setSubmitting(true);
    void Promise.resolve(onSelected(selectedHome ?? { address })).finally(() => {
      setSubmitting(false);
    });
  }

  return (
    <Modal
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : undefined}
      visible={visible}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.root,
          {
            paddingBottom: Math.max(insets.bottom, spacing.lg),
            paddingTop: Platform.OS === "ios" ? insets.top + spacing.md : spacing.lg,
          },
        ]}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.icon}>
              <Ionicons color={colors.primary} name="home-outline" size={26} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.eyebrow, typography.micro]}>Home setup</Text>
              <Text style={[styles.title, typography.title]}>
                Set home address
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close home address setup"
              accessibilityRole="button"
              hitSlop={12}
              onPress={onClose}
            >
              <Ionicons color={colors.textMuted} name="close" size={24} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.copy, typography.body]}>
              Choose your home address so NeoTherm can create a local home boundary
              on this iPhone. This step is separate from consent.
            </Text>

            <View style={styles.addressCard}>
              <Text style={[styles.addressLabel, typography.micro]}>
                Home address
              </Text>
              <TextInput
                autoCapitalize="words"
                autoComplete="street-address"
                editable={!submitting}
                placeholder="Street, city, state, ZIP"
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
                style={[styles.addressInput, typography.body]}
                textContentType="fullStreetAddress"
                value={homeAddress}
                onChangeText={setHomeAddress}
              />
              {suggesting ? (
                <View style={styles.suggestingRow}>
                  <ActivityIndicator color={colors.primary} size="small" />
                  <Text style={[styles.addressHelp, typography.caption]}>
                    Looking up matching addresses…
                  </Text>
                </View>
              ) : null}
              {suggestions.length > 0 ? (
                <View style={styles.suggestions}>
                  {suggestions.map((suggestion) => {
                    const selected =
                      selectedHome?.latitude === suggestion.latitude &&
                      selectedHome?.longitude === suggestion.longitude;
                    return (
                      <Pressable
                        accessibilityLabel={`Use ${suggestion.address}`}
                        accessibilityRole="button"
                        key={`${suggestion.latitude}-${suggestion.longitude}-${suggestion.address}`}
                        onPress={() => {
                          setSelectedHome(suggestion);
                          setHomeAddress(suggestion.address);
                          setSuggestions([]);
                        }}
                        style={({ pressed }) => [
                          styles.suggestionRow,
                          selected && styles.suggestionRowSelected,
                          pressed && styles.suggestionRowPressed,
                        ]}
                      >
                        <Ionicons
                          color={selected ? colors.primary : colors.textMuted}
                          name={selected ? "checkmark-circle" : "location-outline"}
                          size={20}
                        />
                        <Text style={[styles.suggestionText, typography.caption]}>
                          {suggestion.address}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
              {selectedHome ? (
                <Text style={[styles.selectedHelp, typography.caption]}>
                  Selected address will be used for the home boundary.
                </Text>
              ) : suggestionError ? (
                <Text style={[styles.errorHelp, typography.caption]}>
                  {suggestionError}
                </Text>
              ) : null}
              <Text style={[styles.addressHelp, typography.caption]}>
                Choose a suggestion for a more precise boundary, or continue
                with the typed address and NeoTherm will geocode it during setup.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Button
              disabled={!requiredOk || submitting}
              title={submitting ? "Saving…" : "Set Up This iPhone"}
              onPress={submit}
            />
            <Button
              disabled={submitting}
              title="Not now"
              variant="ghost"
              onPress={onClose}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    flex: 1,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: colors.primary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  title: {
    color: colors.text,
  },
  copy: {
    color: colors.textSecondary,
    lineHeight: 25,
    marginBottom: spacing.md,
  },
  addressCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  addressLabel: {
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  addressInput: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.surfaceSubtle,
  },
  addressHelp: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  suggestingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  suggestions: {
    gap: spacing.xs,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  suggestionRowPressed: {
    opacity: 0.82,
  },
  suggestionText: {
    flex: 1,
    color: colors.text,
    lineHeight: 20,
  },
  selectedHelp: {
    color: colors.success,
  },
  errorHelp: {
    color: colors.warning,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
  },
});
