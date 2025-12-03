import React, { useState } from "react";
import { View, StyleSheet, Pressable, FlatList, Share } from "react-native";
import { Feather } from "@expo/vector-icons";
import { RouteProp, useRoute } from "@react-navigation/native";
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
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useApp } from "@/store/AppContext";
import { ReportsStackParamList } from "@/navigation/ReportsStackNavigator";

type RouteType = RouteProp<ReportsStackParamList, "SessionDetail">;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function AttendeeItem({ name, timestamp }: { name: string; timestamp: string }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.attendeeItem, { borderBottomColor: theme.border }]}>
      <View style={[styles.statusDot, { backgroundColor: Colors.light.success }]} />
      <View style={styles.attendeeInfo}>
        <ThemedText style={styles.attendeeName}>{name}</ThemedText>
        <ThemedText style={[styles.attendeeTime, { color: theme.textSecondary }]}>
          Marked at {timestamp}
        </ThemedText>
      </View>
      <Feather name="check" size={18} color={Colors.light.success} />
    </View>
  );
}

function AbsentItem({ name }: { name: string }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.attendeeItem, { borderBottomColor: theme.border, opacity: 0.6 }]}>
      <View style={[styles.statusDot, { backgroundColor: theme.textDisabled }]} />
      <View style={styles.attendeeInfo}>
        <ThemedText style={styles.attendeeName}>{name}</ThemedText>
        <ThemedText style={[styles.attendeeTime, { color: theme.textSecondary }]}>
          Not marked
        </ThemedText>
      </View>
      <Feather name="x" size={18} color={theme.textDisabled} />
    </View>
  );
}

export default function SessionDetailScreen() {
  const route = useRoute<RouteType>();
  const { theme } = useTheme();
  const { students } = useApp();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const [showAbsent, setShowAbsent] = useState(false);

  const session = route.params.session;
  const attendanceRate = session.totalCount > 0
    ? Math.round((session.presentCount / session.totalCount) * 100)
    : 0;

  const presentStudentIds = new Set(session.attendees.map((a) => a.studentId));
  const absentStudents = students.filter((s) => !presentStudentIds.has(s.id));

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleExport = async () => {
    const lines = [
      `Attendance Report - ${session.date}`,
      `Time: ${session.time}`,
      `Present: ${session.presentCount}/${session.totalCount} (${attendanceRate}%)`,
      "",
      "Present Students:",
      ...session.attendees.map((a) => `- ${a.name} (${a.timestamp})`),
      "",
      "Absent Students:",
      ...absentStudents.map((s) => `- ${s.name}`),
    ];

    try {
      await Share.share({
        message: lines.join("\n"),
        title: `Attendance - ${session.date}`,
      });
    } catch (error) {
      console.log("Error sharing:", error);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.content, { paddingTop: headerHeight + Spacing.md }]}>
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Feather name="calendar" size={18} color={theme.primary} />
              <ThemedText style={styles.summaryText}>{session.date}</ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <Feather name="clock" size={18} color={theme.primary} />
              <ThemedText style={styles.summaryText}>{session.time}</ThemedText>
            </View>
          </View>
          <View style={styles.attendanceBar}>
            <View
              style={[
                styles.attendanceProgress,
                {
                  backgroundColor: Colors.light.success,
                  width: `${attendanceRate}%`,
                },
              ]}
            />
          </View>
          <View style={styles.attendanceStats}>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: Colors.light.success }]} />
              <ThemedText style={styles.statLabel}>
                {session.presentCount} Present
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: theme.textDisabled }]} />
              <ThemedText style={styles.statLabel}>
                {absentStudents.length} Absent
              </ThemedText>
            </View>
            <ThemedText style={[styles.rateLabel, { color: theme.primary }]}>
              {attendanceRate}% Rate
            </ThemedText>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText type="h4">Present Students</ThemedText>
          <ThemedText style={{ color: theme.textSecondary }}>
            {session.attendees.length}
          </ThemedText>
        </View>

        <FlatList
          data={session.attendees}
          keyExtractor={(item) => item.studentId}
          renderItem={({ item }) => (
            <AttendeeItem name={item.name} timestamp={item.timestamp} />
          )}
          style={[styles.list, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
          ListFooterComponent={
            absentStudents.length > 0 ? (
              <>
                <Pressable
                  onPress={() => setShowAbsent(!showAbsent)}
                  style={styles.absentHeader}
                >
                  <View style={styles.absentHeaderContent}>
                    <ThemedText style={[styles.absentTitle, { color: theme.textSecondary }]}>
                      Absent Students ({absentStudents.length})
                    </ThemedText>
                    <Feather
                      name={showAbsent ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={theme.textSecondary}
                    />
                  </View>
                </Pressable>
                {showAbsent
                  ? absentStudents.map((student) => (
                      <AbsentItem key={student.id} name={student.name} />
                    ))
                  : null}
              </>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: tabBarHeight + Spacing.xl + 60 }}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <AnimatedPressable
        onPress={handleExport}
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 150 });
        }}
        style={[
          styles.exportButton,
          {
            backgroundColor: theme.primary,
            bottom: tabBarHeight + Spacing.md,
          },
          animatedStyle,
        ]}
      >
        <Feather name="share" size={20} color="#FFFFFF" />
        <ThemedText style={styles.exportButtonText}>Export Report</ThemedText>
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
  summaryCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  summaryText: {
    fontSize: 15,
  },
  attendanceBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  attendanceProgress: {
    height: "100%",
    borderRadius: 4,
  },
  attendanceStats: {
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
  statLabel: {
    fontSize: 13,
  },
  rateLabel: {
    marginLeft: "auto",
    fontSize: 14,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  list: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  attendeeItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.md,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    fontSize: 15,
    fontWeight: "500",
  },
  attendeeTime: {
    fontSize: 13,
    marginTop: 2,
  },
  absentHeader: {
    padding: Spacing.md,
  },
  absentHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  absentTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  exportButton: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  exportButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
