import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { Spacing, BorderRadius, Colors, Shadows } from "@/constants/theme";
import { useApp } from "@/store/AppContext";
import { AttendanceStackParamList } from "@/navigation/AttendanceStackNavigator";

type NavigationProp = NativeStackNavigationProp<AttendanceStackParamList>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  value: string | number;
  label: string;
  color: string;
}) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: color + "15" }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <ThemedText type="h3" style={styles.statValue}>
        {value}
      </ThemedText>
      <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
    </View>
  );
}

function RecentAttendanceItem({ name, time }: { name: string; time: string }) {
  const { theme } = useTheme();

  return (
    <View style={styles.recentItem}>
      <View
        style={[styles.recentDot, { backgroundColor: Colors.light.success }]}
      />
      <ThemedText style={styles.recentName}>{name}</ThemedText>
      <ThemedText style={[styles.recentTime, { color: theme.textSecondary }]}>
        {time}
      </ThemedText>
    </View>
  );
}

export default function AttendanceHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { students, sessions, getTodayAttendance, startSession } = useApp();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  const todayAttendance = getTodayAttendance();
  const enrolledCount = students.filter((s) => s.faceEnrolled).length;
  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const fabScale = useSharedValue(1);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const handleStartSession = async () => {
    if (enrolledCount === 0) {
      return;
    }
    const sessionId = await startSession();
    navigation.navigate("AttendanceScanner", { sessionId });
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.md,
            paddingBottom: tabBarHeight + 100,
          },
        ]}
      >
        <View
          style={[
            styles.dateCard,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
            },
          ]}
        >
          <Feather name="calendar" size={20} color={theme.primary} />
          <ThemedText style={styles.dateText}>{todayDate}</ThemedText>
        </View>

        <View style={styles.statsRow}>
          <StatCard
            icon="users"
            value={students.length}
            label="Total Students"
            color={theme.primary}
          />
          <StatCard
            icon="check-circle"
            value={enrolledCount}
            label="Faces Enrolled"
            color={Colors.light.success}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            icon="user-check"
            value={todayAttendance.length}
            label="Present Today"
            color={Colors.light.warning}
          />
          <StatCard
            icon="clock"
            value={sessions.length}
            label="Total Sessions"
            color={Colors.light.primary}
          />
        </View>

        {todayAttendance.length > 0 ? (
          <View
            style={[
              styles.recentCard,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
              },
            ]}
          >
            <ThemedText type="h4" style={styles.recentTitle}>
              Recent Attendance
            </ThemedText>
            {todayAttendance.slice(0, 5).map((record, index) => (
              <RecentAttendanceItem
                key={`${record.studentId}-${index}`}
                name={record.name}
                time={record.timestamp}
              />
            ))}
          </View>
        ) : (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
              },
            ]}
          >
            <Feather name="inbox" size={32} color={theme.textDisabled} />
            <ThemedText
              style={[styles.emptyText, { color: theme.textSecondary }]}
            >
              No attendance recorded today
            </ThemedText>
            <ThemedText
              style={[styles.emptySubtext, { color: theme.textDisabled }]}
            >
              Tap the camera button to start a session
            </ThemedText>
          </View>
        )}
      </View>

      <AnimatedPressable
        onPress={handleStartSession}
        onPressIn={() => {
          fabScale.value = withSpring(0.95, { damping: 15, stiffness: 150 });
        }}
        onPressOut={() => {
          fabScale.value = withSpring(1, { damping: 15, stiffness: 150 });
        }}
        disabled={enrolledCount === 0}
        style={[
          styles.fab,
          {
            backgroundColor:
              enrolledCount === 0 ? theme.textDisabled : theme.secondary,
            bottom: tabBarHeight + Spacing.xl,
            ...Shadows.fab,
          },
          fabStyle,
        ]}
      >
        <Feather name="camera" size={28} color="#FFFFFF" />
      </AnimatedPressable>
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
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
  },
  dateText: {
    fontSize: 15,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  statValue: {
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  recentCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
  },
  recentTitle: {
    marginBottom: Spacing.md,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  recentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  recentName: {
    flex: 1,
    fontSize: 15,
  },
  recentTime: {
    fontSize: 14,
  },
  emptyCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "500",
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
