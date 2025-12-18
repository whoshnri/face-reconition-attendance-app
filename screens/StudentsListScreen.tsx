import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useApp, Student } from "@/store/AppContext";
import { StudentsStackParamList } from "@/navigation/StudentsStackNavigator";

type NavigationProp = NativeStackNavigationProp<StudentsStackParamList>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function StudentCard({
  student,
  onPress,
  onDelete,
}: {
  student: Student;
  onPress: () => void;
  onDelete: () => void;
}) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handleLongPress = () => {
    Alert.alert(
      "Delete Student",
      `Are you sure you want to delete ${student.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ],
    );
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={handleLongPress}
      style={[
        styles.studentCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.cardBorder,
        },
        animatedStyle,
      ]}
    >
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: isDark
              ? Colors.dark.backgroundSecondary
              : Colors.light.backgroundSecondary,
          },
        ]}
      >
        <Feather name="user" size={24} color={theme.textSecondary} />
      </View>
      <View style={styles.studentInfo}>
        <ThemedText style={styles.studentName}>{student.name}</ThemedText>
        <ThemedText style={[styles.studentId, { color: theme.textSecondary }]}>
          ID: {student.studentId}
        </ThemedText>
      </View>
      <View style={styles.enrollmentStatus}>
        {student.faceEnrolled ? (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: Colors.light.success + "20" },
            ]}
          >
            <Feather
              name="check-circle"
              size={16}
              color={Colors.light.success}
            />
          </View>
        ) : (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="camera" size={16} color={theme.textSecondary} />
          </View>
        )}
        <Feather name="chevron-right" size={20} color={theme.textDisabled} />
      </View>
    </AnimatedPressable>
  );
}

function EmptyState({ onAddStudent }: { onAddStudent: () => void }) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <Feather name="users" size={48} color={theme.textSecondary} />
      </View>
      <ThemedText type="h3" style={styles.emptyTitle}>
        No Students Yet
      </ThemedText>
      <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
        Add your first student to get started with attendance tracking
      </ThemedText>
      <AnimatedPressable
        onPress={onAddStudent}
        onPressIn={() => {
          scale.value = withSpring(0.95, { damping: 15, stiffness: 150 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 150 });
        }}
        style={[
          styles.addButton,
          { backgroundColor: theme.primary },
          animatedStyle,
        ]}
      >
        <Feather name="plus" size={20} color="#FFFFFF" />
        <ThemedText style={styles.addButtonText}>Add Student</ThemedText>
      </AnimatedPressable>
    </View>
  );
}

export default function StudentsListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme, isDark } = useTheme();
  const { students, deleteStudent } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAddStudent = () => {
    navigation.navigate("AddEditStudent", {});
  };

  const handleStudentPress = (student: Student) => {
    navigation.navigate("StudentDetail", { student });
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={handleAddStudent}
          style={({ pressed }) => [
            styles.headerButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="plus" size={24} color={theme.primary} />
        </Pressable>
      ),
    });
  }, [navigation, theme]);

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
            marginTop: headerHeight + Spacing.md,
          },
        ]}
      >
        <Feather name="search" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search students..."
          placeholderTextColor={theme.textDisabled}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 ? (
          <Pressable onPress={() => setSearchQuery("")}>
            <Feather name="x" size={20} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {students.length === 0 ? (
        <EmptyState onAddStudent={handleAddStudent} />
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <StudentCard
              student={item}
              onPress={() => handleStudentPress(item)}
              onDelete={() => deleteStudent(item.id)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: tabBarHeight + Spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.noResults}>
              <ThemedText style={{ color: theme.textSecondary }}>
                No students match your search
              </ThemedText>
            </View>
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    padding: Spacing.xs,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  studentInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "600",
  },
  studentId: {
    fontSize: 14,
    marginTop: 2,
  },
  enrollmentStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: Spacing.xl,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  noResults: {
    paddingTop: Spacing.xl,
    alignItems: "center",
  },
});
