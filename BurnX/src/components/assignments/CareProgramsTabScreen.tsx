import { useCallback, useRef, useState } from "react";
import { RefreshControl } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AssignmentsList } from "../../../src/components/assignments/AssignmentsList";
import { PageHeader } from "../../../src/components/PageHeader";
import { Screen } from "../../../src/components/Screen";
import { colors } from "../../../src/theme/colors";

type CareProgramsTabScreenProps = {
  formIds: readonly string[];
  eyebrow: string;
  title: string;
  subtitle: string;
  emptySubtitle?: string;
  onScheduleRefresh?: () => Promise<void>;
};

export function CareProgramsTabScreen({
  formIds,
  eyebrow,
  title,
  subtitle,
  emptySubtitle,
  onScheduleRefresh,
}: CareProgramsTabScreenProps) {
  const [refreshing, setRefreshing] = useState(false);
  const refreshRef = useRef<(() => Promise<void>) | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onScheduleRefresh?.();
      await refreshRef.current?.();
    } finally {
      setRefreshing(false);
    }
  }, [onScheduleRefresh]);

  return (
    <Screen
      preset="materialTabs"
      refreshControl={
        <RefreshControl
          colors={[colors.primary]}
          onRefresh={onRefresh}
          refreshing={refreshing}
          tintColor={colors.primary}
        />
      }
      scroll
    >
      <StatusBar style="dark" />
      <PageHeader eyebrow={eyebrow} subtitle={subtitle} title={title} />
      <AssignmentsList
        emptySubtitle={emptySubtitle}
        formIds={formIds}
        onRefreshRegister={(fn) => {
          refreshRef.current = fn;
        }}
      />
    </Screen>
  );
}
