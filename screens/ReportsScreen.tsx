import React, { useState } from "react";
import { View, StyleSheet, Pressable, FlatList } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useApp, AttendanceSession } from "@/store/AppContext";
import { ReportsStackParamList } from "@/navigation/ReportsStackNavigator";

type NavigationProp = NativeStackNavigationProp<ReportsStackParamList>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type DateFilter = "week" | "month" | "all";

function FilterButton({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterButton,
        {
          backgroundColor: isActive ? theme.primary : theme.backgroundDefault,
          borderColor: isActive ? theme.primary : theme.border,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.filterText,
          { color: isActive ? "#FFFFFF" : theme.text },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function SessionCard({
  session,
  onPress,
}: {
  session: AttendanceSession;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const attendanceRate =
    session.totalCount > 0
      ? Math.round((session.presentCount / session.totalCount) * 100)
      : 0;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 150 });
      }}
      style={[
        styles.sessionCard,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
        animatedStyle,
      ]}
    >
      <View style={styles.sessionHeader}>
        <View>
          <ThemedText type="h4">{session.date}</ThemedText>
          <ThemedText
            style={[styles.sessionTime, { color: theme.textSecondary }]}
          >
            {session.time}
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={20} color={theme.textDisabled} />
      </View>
      <View style={styles.sessionStats}>
        <View style={styles.statItem}>
          <View
            style={[styles.statDot, { backgroundColor: Colors.light.success }]}
          />
          <ThemedText style={styles.statText}>
            {session.presentCount} present
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <View
            style={[styles.statDot, { backgroundColor: theme.textDisabled }]}
          />
          <ThemedText style={styles.statText}>
            {session.totalCount - session.presentCount} absent
          </ThemedText>
        </View>
        <View
          style={[
            styles.rateBadge,
            { backgroundColor: Colors.light.primary + "15" },
          ]}
        >
          <ThemedText
            style={[styles.rateText, { color: Colors.light.primary }]}
          >
            {attendanceRate}%
          </ThemedText>
        </View>
      </View>
    </AnimatedPressable>
  );
}

function EmptyState() {
  const { theme } = useTheme();

  return (
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <Feather name="bar-chart-2" size={48} color={theme.textSecondary} />
      </View>
      <ThemedText type="h3" style={styles.emptyTitle}>
        No Reports Yet
      </ThemedText>
      <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
        Start taking attendance to see reports and analytics here
      </ThemedText>
    </View>
  );
}

export default function ReportsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { sessions, students } = useApp();
  const [filter, setFilter] = useState<DateFilter>("all");
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  const totalSessions = sessions.length;
  const averageAttendance =
    sessions.length > 0
      ? Math.round(
          sessions.reduce((acc, s) => {
            const rate =
              s.totalCount > 0 ? (s.presentCount / s.totalCount) * 100 : 0;
            return acc + rate;
          }, 0) / sessions.length,
        )
      : 0;

  const handleSessionPress = (session: AttendanceSession) => {
    navigation.navigate("SessionDetail", { session });
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.content, { paddingTop: headerHeight + Spacing.md }]}>
        <View style={styles.filterRow}>
          <FilterButton
            label="This Week"
            isActive={filter === "week"}
            onPress={() => setFilter("week")}
          />
          <FilterButton
            label="This Month"
            isActive={filter === "month"}
            onPress={() => setFilter("month")}
          />
          <FilterButton
            label="All Time"
            isActive={filter === "all"}
            onPress={() => setFilter("all")}
          />
        </View>

        <View style={styles.summaryRow}>
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
              },
            ]}
          >
            <ThemedText type="h2" style={{ color: theme.primary }}>
              {totalSessions}
            </ThemedText>
            <ThemedText
              style={[styles.summaryLabel, { color: theme.textSecondary }]}
            >
              Total Sessions
            </ThemedText>
          </View>
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
              },
            ]}
          >
            <ThemedText type="h2" style={{ color: Colors.light.success }}>
              {averageAttendance}%
            </ThemedText>
            <ThemedText
              style={[styles.summaryLabel, { color: theme.textSecondary }]}
            >
              Avg. Attendance
            </ThemedText>
          </View>
        </View>

        {sessions.length === 0 ? (
          <EmptyState />
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SessionCard
                session={item}
                onPress={() => handleSessionPress(item)}
              />
            )}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: tabBarHeight + Spacing.xl },
            ]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
  },
  summaryRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    borderWidth: 1,
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  listContent: {
    gap: Spacing.sm,
  },
  sessionCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  sessionTime: {
    fontSize: 14,
    marginTop: 2,
  },
  sessionStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    fontSize: 13,
  },
  rateBadge: {
    marginLeft: "auto",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  rateText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
  },
});
