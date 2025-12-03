import React, { useState, useEffect } from "react";
import { View, StyleSheet, TextInput, Pressable, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useApp } from "@/store/AppContext";
import { StudentsStackParamList } from "@/navigation/StudentsStackNavigator";

type NavigationProp = NativeStackNavigationProp<StudentsStackParamList>;
type RouteType = RouteProp<StudentsStackParamList, "AddEditStudent">;

export default function AddEditStudentScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { theme } = useTheme();
  const { students, addStudent, updateStudent } = useApp();

  const existingStudent = route.params?.student;
  const isEditing = !!existingStudent;

  const [name, setName] = useState(existingStudent?.name || "");
  const [studentId, setStudentId] = useState(existingStudent?.studentId || "");
  const [errors, setErrors] = useState<{ name?: string; studentId?: string }>({});

  const isValid = name.trim().length > 0 && studentId.trim().length > 0;

  const validateForm = (): boolean => {
    const newErrors: { name?: string; studentId?: string } = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!studentId.trim()) {
      newErrors.studentId = "Student ID is required";
    } else {
      const duplicate = students.find(
        (s) =>
          s.studentId.toLowerCase() === studentId.trim().toLowerCase() &&
          s.id !== existingStudent?.id
      );
      if (duplicate) {
        newErrors.studentId = "This Student ID already exists";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    if (isEditing && existingStudent) {
      await updateStudent(existingStudent.id, name.trim(), studentId.trim());
    } else {
      await addStudent(name.trim(), studentId.trim());
    }
    navigation.goBack();
  };

  const handleCancel = () => {
    if (name.trim() || studentId.trim()) {
      Alert.alert(
        "Discard Changes",
        "Are you sure you want to discard your changes?",
        [
          { text: "Keep Editing", style: "cancel" },
          { text: "Discard", style: "destructive", onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={handleCancel}
          style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <ThemedText style={{ color: theme.primary }}>Cancel</ThemedText>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={handleSave}
          disabled={!isValid}
          style={({ pressed }) => [
            styles.headerButton,
            { opacity: !isValid ? 0.5 : pressed ? 0.7 : 1 },
          ]}
        >
          <ThemedText style={{ color: theme.primary, fontWeight: "600" }}>
            Save
          </ThemedText>
        </Pressable>
      ),
    });
  }, [navigation, theme, isValid, name, studentId]);

  return (
    <ScreenKeyboardAwareScrollView>
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Name</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: errors.name ? Colors.light.error : theme.border,
                color: theme.text,
              },
            ]}
            placeholder="Enter student name"
            placeholderTextColor={theme.textDisabled}
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
            }}
            autoCapitalize="words"
            autoFocus
          />
          {errors.name ? (
            <ThemedText style={styles.errorText}>{errors.name}</ThemedText>
          ) : null}
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Student ID</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: errors.studentId ? Colors.light.error : theme.border,
                color: theme.text,
              },
            ]}
            placeholder="Enter unique student ID"
            placeholderTextColor={theme.textDisabled}
            value={studentId}
            onChangeText={(text) => {
              setStudentId(text);
              if (errors.studentId) setErrors((e) => ({ ...e, studentId: undefined }));
            }}
            autoCapitalize="characters"
          />
          {errors.studentId ? (
            <ThemedText style={styles.errorText}>{errors.studentId}</ThemedText>
          ) : null}
        </View>
      </View>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  form: {
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  errorText: {
    color: Colors.light.error,
    fontSize: 12,
  },
});
