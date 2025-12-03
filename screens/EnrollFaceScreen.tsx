import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useApp } from "@/store/AppContext";
import { StudentsStackParamList } from "@/navigation/StudentsStackNavigator";

type NavigationProp = NativeStackNavigationProp<StudentsStackParamList>;
type RouteType = RouteProp<StudentsStackParamList, "EnrollFace">;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function EnrollFaceScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { enrollFace } = useApp();

  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<"positioning" | "detecting" | "success" | "error">("positioning");
  const [statusMessage, setStatusMessage] = useState("Position face within frame");

  const student = route.params.student;
  const pulseScale = useSharedValue(1);
  const successScale = useSharedValue(0);
  const borderColor = useSharedValue(0);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const simulateFaceDetection = () => {
    setStatus("detecting");
    setStatusMessage("Hold still...");
    borderColor.value = withTiming(1, { duration: 500 });

    setTimeout(() => {
      setStatus("success");
      setStatusMessage("Face enrolled successfully!");
      successScale.value = withSpring(1, { damping: 12, stiffness: 100 });
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      enrollFace(student.id);

      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    }, 2000);
  };

  const frameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    borderColor:
      borderColor.value === 0
        ? "rgba(255, 255, 255, 0.6)"
        : status === "success"
        ? Colors.light.success
        : Colors.light.primary,
  }));

  const successStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successScale.value,
  }));

  if (!permission) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading camera...</ThemedText>
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView style={[styles.container, styles.permissionContainer]}>
        <View style={styles.permissionContent}>
          <View style={[styles.permissionIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="camera-off" size={48} color={theme.textSecondary} />
          </View>
          <ThemedText type="h3" style={styles.permissionTitle}>
            Camera Access Required
          </ThemedText>
          <ThemedText style={[styles.permissionText, { color: theme.textSecondary }]}>
            We need camera access to capture and enroll the student's face for attendance recognition.
          </ThemedText>
          <AnimatedPressable
            onPress={requestPermission}
            style={[styles.permissionButton, { backgroundColor: theme.primary }]}
          >
            <Feather name="camera" size={20} color="#FFFFFF" />
            <ThemedText style={styles.permissionButtonText}>Enable Camera</ThemedText>
          </AnimatedPressable>
          <Pressable onPress={() => navigation.goBack()} style={styles.cancelLink}>
            <ThemedText style={{ color: theme.textSecondary }}>Cancel</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (Platform.OS === "web") {
    return (
      <ThemedView style={[styles.container, styles.permissionContainer]}>
        <View style={styles.permissionContent}>
          <View style={[styles.permissionIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="smartphone" size={48} color={theme.textSecondary} />
          </View>
          <ThemedText type="h3" style={styles.permissionTitle}>
            Use Expo Go
          </ThemedText>
          <ThemedText style={[styles.permissionText, { color: theme.textSecondary }]}>
            Face enrollment requires native camera features. Please scan the QR code and open this app in Expo Go on your mobile device.
          </ThemedText>
          <Pressable onPress={() => navigation.goBack()} style={styles.cancelLink}>
            <ThemedText style={{ color: theme.primary }}>Go Back</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFill} facing="front" />
      
      <View style={[styles.overlay, StyleSheet.absoluteFill]}>
        <View style={[styles.topBar, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </Pressable>
          <ThemedText style={styles.studentName}>{student.name}</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.frameContainer}>
          <Animated.View style={[styles.faceFrame, frameStyle]}>
            {status === "success" ? (
              <Animated.View style={[styles.successCheck, successStyle]}>
                <Feather name="check" size={64} color={Colors.light.success} />
              </Animated.View>
            ) : null}
          </Animated.View>
          <ThemedText style={styles.statusText}>{statusMessage}</ThemedText>
        </View>

        <View style={[styles.bottomSection, { paddingBottom: insets.bottom + Spacing.xl }]}>
          {status === "positioning" ? (
            <>
              <View style={styles.tipsCard}>
                <ThemedText style={styles.tipsTitle}>Tips for best results:</ThemedText>
                <ThemedText style={styles.tipText}>Face the camera directly</ThemedText>
                <ThemedText style={styles.tipText}>Ensure good lighting</ThemedText>
                <ThemedText style={styles.tipText}>Remove glasses if possible</ThemedText>
              </View>
              <AnimatedPressable
                onPress={simulateFaceDetection}
                style={[styles.captureButton, { backgroundColor: theme.primary }]}
              >
                <Feather name="camera" size={24} color="#FFFFFF" />
                <ThemedText style={styles.captureButtonText}>Capture Face</ThemedText>
              </AnimatedPressable>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  permissionContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  permissionContent: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  permissionIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  permissionTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  permissionText: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  permissionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  cancelLink: {
    padding: Spacing.md,
  },
  overlay: {
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 20,
  },
  studentName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  frameContainer: {
    alignItems: "center",
    gap: Spacing.lg,
  },
  faceFrame: {
    width: 250,
    height: 320,
    borderWidth: 3,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  successCheck: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  bottomSection: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  tipsCard: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  tipsTitle: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  tipText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
  },
  captureButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  captureButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
