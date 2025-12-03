import React from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useApp } from "@/store/AppContext";
import { StudentsStackParamList } from "@/navigation/StudentsStackNavigator";

type NavigationProp = NativeStackNavigationProp<StudentsStackParamList>;
type RouteType = RouteProp<StudentsStackParamList, "StudentDetail">;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ActionButton({
  icon,
  label,
  onPress,
  variant = "default",
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  variant?: "default" | "destructive" | "primary";
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getBgColor = () => {
    switch (variant) {
      case "destructive":
        return Colors.light.error + "15";
      case "primary":
        return theme.primary;
      default:
        return theme.backgroundDefault;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "destructive":
        return Colors.light.error;
      case "primary":
        return "#FFFFFF";
      default:
        return theme.text;
    }
  };

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
        styles.actionButton,
        {
          backgroundColor: getBgColor(),
          borderColor: variant === "default" ? theme.border : "transparent",
          borderWidth: variant === "default" ? 1 : 0,
        },
        animatedStyle,
      ]}
    >
      <Feather name={icon} size={20} color={getTextColor()} />
      <ThemedText style={[styles.actionButtonText, { color: getTextColor() }]}>
        {label}
      </ThemedText>
    </AnimatedPressable>
  );
}

export default function StudentDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { theme, isDark } = useTheme();
  const { getStudentById, deleteStudent, getStudentAttendanceStats } = useApp();

  const studentFromRoute = route.params.student;
  const student = getStudentById(studentFromRoute.id) || studentFromRoute;
  const stats = getStudentAttendanceStats(student.id);
  const attendancePercentage =
    stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0;

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate("AddEditStudent", { student })}
          style={({ pressed }) => [
            styles.headerButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="edit-2" size={20} color={theme.primary} />
        </Pressable>
      ),
    });
  }, [navigation, theme, student]);

  const handleEnrollFace = () => {
    navigation.navigate("EnrollFace", { student });
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Student",
      `Are you sure you want to delete ${student.name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteStudent(student.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <ScreenScrollView>
      <View style={styles.profileSection}>
        <View
          style={[
            styles.largeAvatar,
            { backgroundColor: isDark ? Colors.dark.backgroundSecondary : Colors.light.backgroundSecondary },
          ]}
        >
          <Feather name="user" size={48} color={theme.textSecondary} />
        </View>
        <ThemedText type="h2" style={styles.name}>
          {student.name}
        </ThemedText>
        <ThemedText style={[styles.studentId, { color: theme.textSecondary }]}>
          Student ID: {student.studentId}
        </ThemedText>
      </View>

      <View style={[styles.card, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
        <ThemedText type="h4" style={styles.cardTitle}>
          Face Enrollment
        </ThemedText>
        {student.faceEnrolled ? (
          <View style={styles.enrolledContainer}>
            <View style={[styles.enrolledBadge, { backgroundColor: Colors.light.success + "20" }]}>
              <Feather name="check-circle" size={24} color={Colors.light.success} />
              <ThemedText style={[styles.enrolledText, { color: Colors.light.success }]}>
                Face Enrolled
              </ThemedText>
            </View>
            {student.enrolledDate ? (
              <ThemedText style={[styles.enrolledDate, { color: theme.textSecondary }]}>
                Enrolled on {new Date(student.enrolledDate).toLocaleDateString()}
              </ThemedText>
            ) : null}
            <ActionButton
              icon="camera"
              label="Re-enroll Face"
              onPress={handleEnrollFace}
            />
          </View>
        ) : (
          <View style={styles.notEnrolledContainer}>
            <View style={[styles.notEnrolledBadge, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="camera-off" size={24} color={theme.textSecondary} />
              <ThemedText style={[styles.notEnrolledText, { color: theme.textSecondary }]}>
                Face Not Enrolled
              </ThemedText>
            </View>
            <ThemedText style={[styles.enrollInfo, { color: theme.textSecondary }]}>
              Enroll this student's face to enable automatic attendance marking
            </ThemedText>
            <ActionButton
              icon="camera"
              label="Enroll Face"
              onPress={handleEnrollFace}
              variant="primary"
            />
          </View>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
        <ThemedText type="h4" style={styles.cardTitle}>
          Attendance Summary
        </ThemedText>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: theme.primary }}>
              {stats.attended}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Sessions Attended
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: theme.primary }}>
              {attendancePercentage}%
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Attendance Rate
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.dangerZone}>
        <ActionButton
          icon="trash-2"
          label="Delete Student"
          onPress={handleDelete}
          variant="destructive"
        />
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    padding: Spacing.xs,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  largeAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  name: {
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  studentId: {
    fontSize: 16,
  },
  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  cardTitle: {
    marginBottom: Spacing.md,
  },
  enrolledContainer: {
    gap: Spacing.md,
  },
  enrolledBadge: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  enrolledText: {
    fontSize: 16,
    fontWeight: "600",
  },
  enrolledDate: {
    fontSize: 14,
  },
  notEnrolledContainer: {
    gap: Spacing.md,
  },
  notEnrolledBadge: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  notEnrolledText: {
    fontSize: 16,
    fontWeight: "600",
  },
  enrollInfo: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 48,
    marginHorizontal: Spacing.md,
  },
  statLabel: {
    fontSize: 12,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  dangerZone: {
    marginTop: Spacing.lg,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
