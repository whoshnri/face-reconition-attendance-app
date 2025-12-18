import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
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
import { AttendanceStackParamList } from "@/navigation/AttendanceStackNavigator";
import {
  loadFaceModel,
  isModelLoaded,
  findBestMatch,
  generateEmbeddingFromPhoto,
} from "@/lib/faceRecognition";
import { getAllFaceEmbeddings } from "@/lib/database";

type NavigationProp = NativeStackNavigationProp<AttendanceStackParamList>;
type RouteType = RouteProp<AttendanceStackParamList, "AttendanceScanner">;

type RecognitionResult = {
  type: "success" | "duplicate" | "unknown";
  name?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function AttendanceScannerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    students,
    markAttendance,
    endSession,
    getSessionById,
    currentSessionId,
  } = useApp();

  // Camera setup
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("front");
  const cameraRef = useRef<Camera>(null);

  // Face detection for photos
  const { detectFaces } = useFaceDetection();

  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [sessionTime, setSessionTime] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [storedEmbeddings, setStoredEmbeddings] = useState<
    Array<{ studentId: string; embedding: number[] }>
  >([]);

  const enrolledStudents = students.filter((s) => s.faceEnrolled);
  const currentSession = currentSessionId
    ? getSessionById(currentSessionId)
    : null;
  const presentCount = currentSession?.presentCount || 0;

  const frameScale = useSharedValue(1);
  const isProcessing = useRef(false);
  const lastRecognitionTime = useRef(0);

  // Load model and embeddings on mount
  useEffect(() => {
    const init = async () => {
      try {
        if (!isModelLoaded()) {
          await loadFaceModel();
        }
        setModelLoaded(true);

        // Load all stored embeddings
        const embeddings = await getAllFaceEmbeddings();
        setStoredEmbeddings(embeddings);
      } catch (error) {
        console.error("Failed to initialize scanner:", error);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTime((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Periodic face presence check using photo
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (!isScanning && !result && cameraRef.current && modelLoaded) {
      interval = setInterval(async () => {
        try {
          const photo = await cameraRef.current?.takePhoto();
          if (photo?.path) {
            const faceResult = await detectFaces(`file://${photo.path}`);
            setFaceDetected((faceResult?.faces?.length ?? 0) > 0);
          }
        } catch (e) {
          // Silently handle errors
        }
      }, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isScanning, result, modelLoaded, detectFaces]);


  // Perform face recognition
  const performRecognition = async () => {
    if (
      isProcessing.current ||
      !cameraRef.current ||
      enrolledStudents.length === 0 ||
      storedEmbeddings.length === 0
    ) {
      return;
    }

    // Throttle recognition to once every 2 seconds
    const now = Date.now();
    if (now - lastRecognitionTime.current < 2000) {
      return;
    }
    lastRecognitionTime.current = now;
    isProcessing.current = true;
    setIsScanning(true);

    frameScale.value = withSequence(
      withTiming(1.05, { duration: 200 }),
      withTiming(1, { duration: 200 }),
    );

    try {
      // Take a photo for recognition
      const photo = await cameraRef.current.takePhoto();

      // Check if face is present
      const faceResult = await detectFaces(`file://${photo.path}`);
      if (!faceResult?.faces?.length) {
        setResult({ type: "unknown" });
        setIsScanning(false);
        isProcessing.current = false;
        setTimeout(() => setResult(null), 2500);
        return;
      }

      // Get face bounds for cropping (ML Kit uses 'frame' property)
      const face = faceResult.faces[0] as any;
      const faceBounds = face?.frame ? {
        x: face.frame.x,
        y: face.frame.y,
        width: face.frame.width,
        height: face.frame.height,
      } : undefined;

      // Generate real embedding from the photo
      const liveEmbedding = await generateEmbeddingFromPhoto(
        `file://${photo.path}`,
        faceBounds
      );

      // Try to find a match
      const match = findBestMatch(liveEmbedding, storedEmbeddings);

      if (match) {
        const matchedStudent = students.find((s) => s.id === match.studentId);
        if (matchedStudent) {
          const wasMarked = await markAttendance(matchedStudent.id);

          if (wasMarked) {
            setResult({ type: "success", name: matchedStudent.name });
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          } else {
            setResult({ type: "duplicate", name: matchedStudent.name });
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
          }
        } else {
          setResult({ type: "unknown" });
        }
      } else {
        setResult({ type: "unknown" });
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    } catch (error) {
      console.error("Recognition failed:", error);
      setResult({ type: "unknown" });
    } finally {
      setIsScanning(false);
      isProcessing.current = false;

      setTimeout(() => {
        setResult(null);
      }, 2500);
    }
  };

  const handleClose = () => {
    endSession();
    navigation.goBack();
  };

  const frameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: frameScale.value }],
    borderColor: faceDetected
      ? Colors.light.primary
      : "rgba(255, 255, 255, 0.6)",
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
            We need camera access to scan and recognize faces for attendance.
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
          <Pressable onPress={handleClose} style={styles.cancelLink}>
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
            Face scanning requires native camera features. Please use the
            development build on your Android device.
          </ThemedText>
          <Pressable onPress={handleClose} style={styles.cancelLink}>
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
          <Pressable onPress={handleClose} style={styles.cancelLink}>
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
        isActive={true}
        photo={true}
        pixelFormat="yuv"
      />

      <View style={[styles.overlay, StyleSheet.absoluteFill]}>
        <View style={[styles.topBar, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              styles.closeButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </Pressable>
          <View style={styles.sessionTimer}>
            <Feather name="clock" size={16} color="#FFFFFF" />
            <ThemedText style={styles.timerText}>
              {formatTime(sessionTime)}
            </ThemedText>
          </View>
          <View style={styles.countBadge}>
            <Feather name="user-check" size={16} color="#FFFFFF" />
            <ThemedText style={styles.countText}>
              {presentCount}/{students.length}
            </ThemedText>
          </View>
        </View>

        <View style={styles.frameContainer}>
          <Animated.View style={[styles.faceFrame, frameStyle]}>
            {isScanning ? (
              <View style={styles.scanningIndicator}>
                <ThemedText style={styles.scanningText}>Scanning...</ThemedText>
              </View>
            ) : faceDetected ? (
              <View style={styles.faceDetectedIndicator}>
                <ThemedText style={styles.faceDetectedText}>
                  Face Detected
                </ThemedText>
              </View>
            ) : null}
          </Animated.View>
        </View>

        <View
          style={[
            styles.bottomSection,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
        >
          {result ? (
            <Animated.View
              entering={SlideInDown.springify().damping(15)}
              exiting={SlideOutDown.springify().damping(15)}
              style={[
                styles.resultCard,
                {
                  backgroundColor:
                    result.type === "success"
                      ? Colors.light.success
                      : result.type === "duplicate"
                        ? Colors.light.warning
                        : Colors.light.error,
                },
              ]}
            >
              <Feather
                name={
                  result.type === "success"
                    ? "check-circle"
                    : result.type === "duplicate"
                      ? "alert-circle"
                      : "x-circle"
                }
                size={24}
                color="#FFFFFF"
              />
              <View style={styles.resultTextContainer}>
                <ThemedText style={styles.resultName}>
                  {result.name || "Unknown"}
                </ThemedText>
                <ThemedText style={styles.resultStatus}>
                  {result.type === "success"
                    ? "Marked Present"
                    : result.type === "duplicate"
                      ? "Already marked for this session"
                      : "Face not recognized"}
                </ThemedText>
              </View>
            </Animated.View>
          ) : (
            <AnimatedPressable
              onPress={performRecognition}
              disabled={isScanning || !faceDetected || !modelLoaded}
              style={[
                styles.scanButton,
                {
                  backgroundColor:
                    isScanning || !faceDetected || !modelLoaded
                      ? theme.textDisabled
                      : theme.primary,
                },
              ]}
            >
              <Feather name="camera" size={24} color="#FFFFFF" />
              <ThemedText style={styles.scanButtonText}>
                {!modelLoaded
                  ? "Loading..."
                  : isScanning
                    ? "Scanning..."
                    : faceDetected
                      ? "Scan Face"
                      : "No Face Detected"}
              </ThemedText>
            </AnimatedPressable>
          )}
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
  sessionTimer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  timerText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.success,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  countText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  frameContainer: {
    alignItems: "center",
  },
  faceFrame: {
    width: 280,
    height: 350,
    borderWidth: 3,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  scanningIndicator: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  scanningText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  faceDetectedIndicator: {
    backgroundColor: "rgba(37, 99, 235, 0.3)",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  faceDetectedText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  bottomSection: {
    paddingHorizontal: Spacing.xl,
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  resultStatus: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  scanButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
