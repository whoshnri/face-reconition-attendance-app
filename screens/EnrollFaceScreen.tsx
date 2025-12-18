import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
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
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";
import { useFaceDetection } from "@infinitered/react-native-mlkit-face-detection";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useApp } from "@/store/AppContext";
import { StudentsStackParamList } from "@/navigation/StudentsStackNavigator";
import {
  loadFaceModel,
  isModelLoaded,
  generateEmbeddingFromPhoto,
} from "@/lib/faceRecognition";
import { saveFaceEmbedding } from "@/lib/database";

type NavigationProp = NativeStackNavigationProp<StudentsStackParamList>;
type RouteType = RouteProp<StudentsStackParamList, "EnrollFace">;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function EnrollFaceScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { enrollFace } = useApp();

  // Camera setup
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("front");
  const cameraRef = useRef<Camera>(null);

  // Face detection for photos
  const { detectFaces } = useFaceDetection();

  const [status, setStatus] = useState<
    "loading" | "positioning" | "detecting" | "processing" | "success" | "error"
  >("loading");
  const [statusMessage, setStatusMessage] = useState("Loading model...");
  const [faceDetected, setFaceDetected] = useState(false);

  const student = route.params.student;
  const pulseScale = useSharedValue(1);
  const successScale = useSharedValue(0);
  const borderColor = useSharedValue(0);
  const isCapturing = useRef(false);
  const stableFaceCount = useRef(0);

  // Load face recognition model on mount
  useEffect(() => {
    const initModel = async () => {
      try {
        if (!isModelLoaded()) {
          await loadFaceModel();
        }
        setStatus("positioning");
        setStatusMessage("Position face within frame");
      } catch (error) {
        console.error("Failed to load face model:", error);
        setStatus("error");
        setStatusMessage("Failed to load face recognition model");
      }
    };
    initModel();
  }, []);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1000 }),
        withTiming(1, { duration: 1000 }),
      ),
      -1,
      true,
    );
  }, []);

  // Periodic face presence check using photo
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (status === "positioning" && cameraRef.current) {
      interval = setInterval(async () => {
        try {
          const photo = await cameraRef.current?.takePhoto();
          if (photo?.path) {
            const result = await detectFaces(`file://${photo.path}`);
            setFaceDetected((result?.faces?.length ?? 0) > 0);
          }
        } catch (e) {
          // Silently handle errors
        }
      }, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, detectFaces]);


  const captureAndEnroll = async () => {
    if (isCapturing.current || !cameraRef.current) return;
    isCapturing.current = true;

    setStatus("detecting");
    setStatusMessage("Hold still...");
    borderColor.value = withTiming(1, { duration: 500 });

    try {
      // Take a photo
      const photo = await cameraRef.current.takePhoto();

      // Detect face in the photo
      const faceResult = await detectFaces(`file://${photo.path}`);

      if (!faceResult?.faces?.length) {
        setStatus("error");
        setStatusMessage("No face detected. Please try again.");
        isCapturing.current = false;
        return;
      }

      setStatus("processing");
      setStatusMessage("Processing face...");

      // Get face bounds for cropping (ML Kit uses 'frame' property)
      const face = faceResult.faces[0] as any;
      const faceBounds = face?.frame ? {
        x: face.frame.x,
        y: face.frame.y,
        width: face.frame.width,
        height: face.frame.height,
      } : undefined;

      // Generate real embedding from the photo
      const embedding = await generateEmbeddingFromPhoto(
        `file://${photo.path}`,
        faceBounds
      );

      // Save embedding to database
      await saveFaceEmbedding(student.id, embedding);

      // Mark student as enrolled in app context
      await enrollFace(student.id);

      setStatus("success");
      setStatusMessage("Face enrolled successfully!");
      successScale.value = withSpring(1, { damping: 12, stiffness: 100 });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error("Enrollment failed:", error);
      setStatus("error");
      setStatusMessage("Enrollment failed. Please try again.");
      isCapturing.current = false;
    }
  };

  const frameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    borderColor:
      status === "success"
        ? Colors.light.success
        : faceDetected
          ? Colors.light.primary
          : "rgba(255, 255, 255, 0.6)",
  }));

  const successStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successScale.value,
  }));

  if (!hasPermission) {
    return (
      <ThemedView style={[styles.container, styles.permissionContainer]}>
        <View style={styles.permissionContent}>
          <View
            style={[
              styles.permissionIcon,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="camera-off" size={48} color={theme.textSecondary} />
          </View>
          <ThemedText type="h3" style={styles.permissionTitle}>
            Camera Access Required
          </ThemedText>
          <ThemedText
            style={[styles.permissionText, { color: theme.textSecondary }]}
          >
            We need camera access to capture and enroll the student's face for
            attendance recognition.
          </ThemedText>
          <AnimatedPressable
            onPress={requestPermission}
            style={[
              styles.permissionButton,
              { backgroundColor: theme.primary },
            ]}
          >
            <Feather name="camera" size={20} color="#FFFFFF" />
            <ThemedText style={styles.permissionButtonText}>
              Enable Camera
            </ThemedText>
          </AnimatedPressable>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.cancelLink}
          >
            <ThemedText style={{ color: theme.textSecondary }}>
              Cancel
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (Platform.OS === "web") {
    return (
      <ThemedView style={[styles.container, styles.permissionContainer]}>
        <View style={styles.permissionContent}>
          <View
            style={[
              styles.permissionIcon,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="smartphone" size={48} color={theme.textSecondary} />
          </View>
          <ThemedText type="h3" style={styles.permissionTitle}>
            Use Development Build
          </ThemedText>
          <ThemedText
            style={[styles.permissionText, { color: theme.textSecondary }]}
          >
            Face enrollment requires native camera features. Please use the
            development build on your Android device.
          </ThemedText>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.cancelLink}
          >
            <ThemedText style={{ color: theme.primary }}>Go Back</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (!device) {
    return (
      <ThemedView style={[styles.container, styles.permissionContainer]}>
        <View style={styles.permissionContent}>
          <Feather name="alert-circle" size={48} color={theme.error} />
          <ThemedText type="h3" style={styles.permissionTitle}>
            No Camera Found
          </ThemedText>
          <ThemedText
            style={[styles.permissionText, { color: theme.textSecondary }]}
          >
            Unable to access the front camera on this device.
          </ThemedText>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.cancelLink}
          >
            <ThemedText style={{ color: theme.primary }}>Go Back</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={status !== "success"}
        photo={true}
        pixelFormat="yuv"
      />

      <View style={[styles.overlay, StyleSheet.absoluteFill]}>
        <View style={[styles.topBar, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.closeButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
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
            ) : status === "processing" ? (
              <View style={styles.processingIndicator}>
                <Feather name="loader" size={32} color="#FFFFFF" />
              </View>
            ) : null}
          </Animated.View>
          <ThemedText style={styles.statusText}>{statusMessage}</ThemedText>
          {faceDetected && status === "positioning" && (
            <ThemedText style={styles.faceDetectedText}>
              Face detected - Ready to capture
            </ThemedText>
          )}
        </View>

        <View
          style={[
            styles.bottomSection,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
        >
          {status === "positioning" || status === "loading" ? (
            <>
              <View style={styles.tipsCard}>
                <ThemedText style={styles.tipsTitle}>
                  Tips for best results:
                </ThemedText>
                <ThemedText style={styles.tipText}>
                  • Face the camera directly
                </ThemedText>
                <ThemedText style={styles.tipText}>
                  • Ensure good lighting
                </ThemedText>
                <ThemedText style={styles.tipText}>
                  • Remove glasses if possible
                </ThemedText>
              </View>
              <AnimatedPressable
                onPress={captureAndEnroll}
                disabled={!faceDetected || status === "loading"}
                style={[
                  styles.captureButton,
                  {
                    backgroundColor:
                      faceDetected && status !== "loading"
                        ? theme.primary
                        : theme.textDisabled,
                  },
                ]}
              >
                <Feather name="camera" size={24} color="#FFFFFF" />
                <ThemedText style={styles.captureButtonText}>
                  {status === "loading" ? "Loading..." : "Capture Face"}
                </ThemedText>
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
  processingIndicator: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  faceDetectedText: {
    color: Colors.light.success,
    fontSize: 14,
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
