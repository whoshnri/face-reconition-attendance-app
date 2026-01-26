import React, { useState } from "react";
import { View, StyleSheet, Platform, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useApp } from "@/store/AppContext";
import { AttendanceStackParamList } from "@/navigation/AttendanceStackNavigator";
import { AnimatedPressable } from "@/components/AnimatedPressable";

type NavigationProp = NativeStackNavigationProp<AttendanceStackParamList>;

export default function CreateSessionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { students, startSession } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const enrolledCount = students.filter((s) => s.faceEnrolled).length;

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (event.type === "set" && date) {
        setSelectedDate(date);
      }
    } else {
      if (date) {
        setSelectedDate(date);
      }
    }
  };

  const handleCreateSession = async () => {
    if (enrolledCount === 0) {
      return;
    }

    setIsCreating(true);
    try {
      const sessionId = await startSession(selectedDate);
      // Navigate to scanner and remove CreateSession from stack
      navigation.reset({
        index: 1,
        routes: [
          { name: "AttendanceHome" },
          { name: "AttendanceScanner", params: { sessionId } },
        ],
      });
    } catch (error) {
      console.error("Failed to create session:", error);
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ThemedView style={styles.content}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.backButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h3">Create Session</ThemedText>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.form}>
          <View style={styles.section}>
            <ThemedText style={styles.label}>Session Date</ThemedText>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[
                styles.dateButton,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.border,
                },
              ]}
            >
              <Feather name="calendar" size={20} color={theme.primary} />
              <ThemedText style={styles.dateText}>
                {formatDateDisplay(selectedDate)}
              </ThemedText>
              <Feather name="chevron-down" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>

          <View style={[styles.infoCard, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={styles.infoRow}>
              <Feather name="users" size={18} color={theme.textSecondary} />
              <ThemedText style={styles.infoText}>
                {students.length} Total Students
              </ThemedText>
            </View>
            <View style={styles.infoRow}>
              <Feather name="check-circle" size={18} color={theme.success} />
              <ThemedText style={styles.infoText}>
                {enrolledCount} Faces Enrolled
              </ThemedText>
            </View>
          </View>

          {enrolledCount === 0 && (
            <View
              style={[
                styles.warningCard,
                { backgroundColor: theme.warning + "15", borderColor: theme.warning },
              ]}
            >
              <Feather name="alert-circle" size={20} color={theme.warning} />
              <ThemedText
                style={[styles.warningText, { color: theme.warning }]}
              >
                No students have enrolled faces yet. Please enroll at least one student
                before creating a session.
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <AnimatedPressable
            onPress={handleCreateSession}
            disabled={enrolledCount === 0 || isCreating}
            style={[
              styles.createButton,
              {
                backgroundColor:
                  enrolledCount === 0 || isCreating
                    ? theme.textDisabled
                    : theme.primary,
                marginBottom: Spacing.lg,
              },
            ]}
          >
            <Feather name="camera" size={20} color="#FFFFFF" />
            <ThemedText style={styles.createButtonText}>
              {isCreating ? "Creating..." : "Start Scanning"}
            </ThemedText>
          </AnimatedPressable>
        </View>

        {showDatePicker && (
          <>
            {Platform.OS === "ios" && (
              <View style={[styles.datePickerContainer, { backgroundColor: theme.backgroundRoot }]}>
                <View style={[styles.datePickerHeader, { borderBottomColor: theme.border }]}>
                  <Pressable
                    onPress={() => setShowDatePicker(false)}
                    style={styles.datePickerButton}
                  >
                    <ThemedText style={{ color: theme.primary, fontSize: 16 }}>
                      Cancel
                    </ThemedText>
                  </Pressable>
                  <ThemedText style={styles.datePickerTitle}>Select Date</ThemedText>
                  <Pressable
                    onPress={() => setShowDatePicker(false)}
                    style={styles.datePickerButton}
                  >
                    <ThemedText style={{ color: theme.primary, fontSize: 16, fontWeight: "600" }}>
                      Done
                    </ThemedText>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  style={styles.datePicker}
                  textColor={theme.text}
                />
              </View>
            )}
            {Platform.OS === "android" && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}
          </>
        )}
      </ThemedView>
    </SafeAreaView>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  backButton: {
    padding: Spacing.xs,
  },
  placeholder: {
    width: 40,
  },
  form: {
    flex: 1,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
  },
  infoCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  infoText: {
    fontSize: 15,
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    paddingBottom: Spacing.xl,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  datePickerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  datePickerButton: {
    padding: Spacing.xs,
    minWidth: 60,
  },
  datePicker: {
    height: 200,
  },
});

