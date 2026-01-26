import React, { useRef } from "react";
import { View, StyleSheet, Pressable, Animated } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { ScreenScrollView } from "@/components/ScreenScrollView";

import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";


import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors, Shadows } from "@/constants/theme";
import { useApp } from "@/store/AppContext";
import { AttendanceStackParamList } from "@/navigation/AttendanceStackNavigator";

type NavigationProp = NativeStackNavigationProp<AttendanceStackParamList>;


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


export default function AttendanceHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { students, sessions, getTodayAttendance } = useApp();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const todayAttendance = getTodayAttendance();
  const enrolledCount = students.filter((s) => s.faceEnrolled).length;
  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const fabScale = useRef(new Animated.Value(1)).current;

  const fabStyle = {
    transform: [{ scale: fabScale }],
  };


  const handleCreateSession = () => {
    navigation.navigate("CreateSession");
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 100 },
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
            color={theme.primary}
          />
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText type="h4">Recent Sessions</ThemedText>
          {/* <AnimatedPressable onPress={() => navigation.navigate('Reports' as any)}>
            <ThemedText style={{ color: theme.primary, fontSize: 14 }}>View All</ThemedText>
          </AnimatedPressable> */}
        </View>

        {sessions.length > 0 ? (
          <View style={styles.sessionList}>
            {sessions.slice(0, 5).map((session) => (
              <AnimatedPressable
                key={session.id}
                onPress={() => navigation.navigate('SessionDetail', { session } as any)}
                style={[
                  styles.sessionCard,
                  { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                ]}
              >
                <View style={styles.sessionHeader}>
                  <View>
                    <ThemedText type="h4" style={{ fontSize: 16 }}>{session.date}</ThemedText>
                    <ThemedText style={[styles.sessionTime, { color: theme.textSecondary }]}>
                      {session.time}
                    </ThemedText>
                  </View>
                  <View style={styles.sessionRight}>
                    <ThemedText style={[styles.sessionCount, { color: theme.primary }]}>
                      {session.presentCount}/{session.totalCount}
                    </ThemedText>
                    <Feather name="chevron-right" size={20} color={theme.textDisabled} />
                  </View>
                </View>
              </AnimatedPressable>
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
              No sessions created yet
            </ThemedText>
            <ThemedText
              style={[styles.emptySubtext, { color: theme.textDisabled }]}
            >
              Tap the + button to create your first session
            </ThemedText>
          </View>
        )}
      </ScreenScrollView>

      <AnimatedPressable
        onPress={handleCreateSession}
        onPressIn={() => {
          Animated.spring(fabScale, {
            toValue: 0.95,
            useNativeDriver: true,
          }).start();
        }}
        onPressOut={() => {
          Animated.spring(fabScale, {
            toValue: 1,
            useNativeDriver: true,
          }).start();
        }}
        style={[
          styles.fab,
          {
            backgroundColor: theme.primary,
            bottom: tabBarHeight + Spacing.xl,
            ...Shadows.fab,
          },
          fabStyle,
        ]}
      >
        <Feather name="plus" size={28} color="#FFFFFF" />
      </AnimatedPressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
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
  sessionList: {
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
  },
  sessionTime: {
    fontSize: 14,
    marginTop: 2,
  },
  sessionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sessionCount: {
    fontSize: 15,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
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
