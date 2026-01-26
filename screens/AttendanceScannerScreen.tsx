import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Pressable, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import {
  Camera,
  useCameraDevice,
  useFrameProcessor,
  useCameraFormat,
  useCameraPermission,
} from "react-native-vision-camera";
import { useFaceDetector } from "react-native-vision-camera-face-detector";
import { Worklets } from "react-native-worklets-core";
import { useResizePlugin } from "vision-camera-resize-plugin";
import { useTensorflowModel } from "react-native-fast-tflite";
import { useSharedValue } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors, BorderRadius } from "@/constants/theme";
import { useApp } from "@/store/AppContext";
import {
  normalizeEmbedding,
  findBestMatch,
  ensureArray,
} from "@/lib/faceRecognition";
import { getAllFaceEmbeddings } from "@/lib/database";
import { useTheme } from "@/hooks/useTheme";
import { AnimatedPressable } from "@/components/AnimatedPressable";

type NavigationProp = ReturnType<typeof useNavigation<any>>;
type RouteType = ReturnType<typeof useRoute<any>>;

type RecognitionResult = {
  type: "success" | "duplicate" | "unknown";
  name?: string;
};

export default function AttendanceScannerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const {
    students,
    markAttendance,
    endSession,
    getSessionById,
    currentSessionId,
  } = useApp();

  // --- 1. SETTINGS & REFS ---
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("front");
  const format = useCameraFormat(device, [
    { videoResolution: { width: 640, height: 480 } }, // Low res = High speed
    { fps: 30 }
  ]);

  const { resize } = useResizePlugin();
  const tflite = useTensorflowModel(require("@/assets/models/mobilefacenet.tflite"));
  const model = tflite.state === "loaded" ? tflite.model : undefined;

  const vectorRef = useRef<Float32Array | null>(null);
  const isCapturing = useRef(false);
  const frameCounter = useSharedValue(0);

  // --- 2. STATE ---
  const [status, setStatus] = useState<"loading" | "positioning" | "processing" | "success">("loading");
  const [faceDetected, setFaceDetected] = useState(false);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [storedEmbeddings, setStoredEmbeddings] = useState<
    Array<{ studentId: string; embedding: number[] }>
  >([]);
  const pulseScale = useRef(new Animated.Value(1)).current;

  // --- 3. DETECTOR CONFIG ---
  const { detectFaces } = useFaceDetector({
    performanceMode: "fast",
    classificationMode: "none",
    landmarkMode: "none",
  });

  const enrolledStudents = students.filter((s) => s.faceEnrolled);
  const currentSession = currentSessionId
    ? getSessionById(currentSessionId)
    : null;
  const presentCount = currentSession?.presentCount || 0;

  // Load embeddings once on mount
  useEffect(() => {
    const loadEmbeddings = async () => {
      try {
        const embeddings = await getAllFaceEmbeddings();
        setStoredEmbeddings(embeddings);
        if (model) setStatus("positioning");
      } catch (error) {
        console.error("Failed to load embeddings:", error);
      }
    };
    loadEmbeddings();
  }, []);

  useEffect(() => {
    if (model && storedEmbeddings.length > 0) setStatus("positioning");
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [model, storedEmbeddings.length]);

  // Request permission on mount
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  // --- 4. WORKLETS (The High Speed Part) ---
  const syncFaceState = Worklets.createRunOnJS((isFound: boolean, vector: any) => {
    if (faceDetected !== isFound) setFaceDetected(isFound);
    const cleanVector = ensureArray(vector);
    // console.log(cleanVector)
    vectorRef.current = cleanVector.length > 0 ? new Float32Array(cleanVector) : null;
  });

  const frameProcessor = useFrameProcessor((frame) => {
    "worklet";
    frameCounter.value += 1;

    // Throttle: Process every 5th frame for performance
    if (frameCounter.value % 5 !== 0) return;

    const faces = detectFaces(frame);

    if (faces.length > 0 && model != null) {
      const face = faces[0];

      try {
        // --- CRITICAL: Coordinate Clamping ---
        // We ensure the crop never exceeds frame boundaries to prevent model errors
        const x = Math.max(0, face.bounds.x);
        const y = Math.max(0, face.bounds.y);
        const width = Math.min(face.bounds.width, frame.width - x);
        const height = Math.min(face.bounds.height, frame.height - y);

        const resized = resize(frame, {
          scale: { width: 112, height: 112 },
          crop: { x, y, width, height },
          pixelFormat: "rgb",
          dataType: "float32",
        });

        const output = model.runSync([resized]);
        if (output && output.length > 0) {
          syncFaceState(true, output[0] as Float32Array);
        } else {
          syncFaceState(true, null);
        }
      } catch (e) {
        syncFaceState(true, null);
      }
    } else {
      syncFaceState(false, null);
    }
  }, [model, detectFaces]);

  // --- 5. ACTION HANDLER ---
  const onCapture = async () => {
    if (isCapturing.current || !vectorRef.current || storedEmbeddings.length === 0) return;

    isCapturing.current = true;
    setStatus("processing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Convert Float32Array to number array and normalize
      const rawEmbedding = Array.from(vectorRef.current);
      // Normalize the live embedding to match stored normalized embeddings
      const normalizedEmbedding = normalizeEmbedding(rawEmbedding);
      // console.log(normalizedEmbedding)

      // Compare against all stored embeddings using the helper function
      const match = findBestMatch(normalizedEmbedding, storedEmbeddings);
      console.log(match)
      if (match) {
        const bestMatch = match;
        const matchedStudent = students.find((s) => s.id === bestMatch!.studentId);
        if (matchedStudent) {
          const wasMarked = await markAttendance(matchedStudent.id);

          if (wasMarked) {
            setResult({ type: "success", name: matchedStudent.name });
            setStatus("success");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Reset after showing success
            setTimeout(() => {
              setResult(null);
              setStatus("positioning");
              isCapturing.current = false;
            }, 2000);
          } else {
            setResult({ type: "duplicate", name: matchedStudent.name });
            setStatus("positioning");
            isCapturing.current = false;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

            setTimeout(() => {
              setResult(null);
            }, 2000);
          }
        } else {
          setResult({ type: "unknown" });
          setStatus("positioning");
          isCapturing.current = false;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

          setTimeout(() => {
            setResult(null);
          }, 2000);
        }
      } else {
        setResult({ type: "unknown" });
        setStatus("positioning");
        isCapturing.current = false;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        setTimeout(() => {
          setResult(null);
        }, 2000);
      }
    } catch (err) {
      console.error("Recognition failed:", err);
      setResult({ type: "unknown" });
      setStatus("positioning");
      isCapturing.current = false;

      setTimeout(() => {
        setResult(null);
      }, 2000);
    }
  };

  const handleClose = () => {
    endSession();
    navigation.goBack();
  };

  // --- 6. RENDER ---
  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <ThemedView style={styles.permissionContainer}>
          <View style={styles.iconCircle}>
            <Feather name="camera-off" size={48} color={Colors.light.error} />
          </View>
          <ThemedText type="h2" style={styles.permissionTitle}>Camera Access Required</ThemedText>
          <ThemedText style={styles.permissionText}>
            We need camera access to scan faces for attendance.
          </ThemedText>
          <AnimatedPressable
            onPress={requestPermission}
            style={styles.requestBtn}
          >
            <ThemedText style={styles.btnText}>Grant Permission</ThemedText>
          </AnimatedPressable>
          <Pressable onPress={() => navigation.goBack()} style={styles.cancelBtn}>
            <ThemedText style={styles.cancelText}>Cancel</ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <ThemedView style={styles.center}>
          <ThemedText>Loading Camera...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const getStatusMessage = () => {
    if (status === "processing") return "Recognizing...";
    if (status === "success") return "Attendance Marked!";
    if (result?.type === "duplicate") return "Already Marked";
    if (result?.type === "unknown") return "Face Not Recognized";
    if (faceDetected && vectorRef.current) return "Ready to Capture";
    if (faceDetected) return "Adjusting Face...";
    return "Align Face in Frame";
  };

  const getButtonColor = () => {
    if (status === "processing" || status === "success") return "#444";
    if (faceDetected && vectorRef.current) return theme.primary;
    return "#444";
  };

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        format={format}
        fps={30}
        isActive={status !== "success"}
        pixelFormat="yuv"
        frameProcessor={frameProcessor}
      />

      <View style={[styles.overlay, { paddingTop: insets.top + 20 }]}>
        <View style={styles.topBar}>
          <Pressable onPress={handleClose} style={styles.backBtn}>
            <Feather name="x" size={28} color="white" />
          </Pressable>

          <View style={styles.sessionInfo}>
            <View style={styles.infoBadge}>
              <Feather name="clock" size={14} color="white" />
              <ThemedText style={styles.infoText}>
                {presentCount}/{students.length}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.guideContainer}>
          <Animated.View
            style={[
              styles.faceMask,
              {
                transform: [{ scale: pulseScale }],
                borderColor: faceDetected && vectorRef.current ? theme.primary : 'white'
              }
            ]}
          />
          <ThemedText style={styles.statusMsg}>
            {getStatusMessage()}
          </ThemedText>
          {result && (
            <View style={[
              styles.resultBadge,
              {
                backgroundColor: result.type === "success"
                  ? Colors.light.success
                  : result.type === "duplicate"
                    ? Colors.light.warning
                    : Colors.light.error
              }
            ]}>
              <Feather
                name={result.type === "success" ? "check-circle" : result.type === "duplicate" ? "alert-circle" : "x-circle"}
                size={20}
                color="white"
              />
              <ThemedText style={styles.resultText}>
                {result.name || "Unknown"}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 50 }]}>
          <AnimatedPressable
            disabled={!faceDetected || !vectorRef.current || status === "processing" || status === "success"}
            onPress={onCapture}
            style={[
              styles.captureBtn,
              { backgroundColor: getButtonColor() }
            ]}
          >
            <Feather name="user-check" size={24} color="white" />
            <ThemedText style={styles.btnText}>Mark Attendance</ThemedText>
          </AnimatedPressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  overlay: { flex: 1, justifyContent: "space-between", alignItems: "center" },
  topBar: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backBtn: {
    alignSelf: "flex-start",
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20
  },
  sessionInfo: {
    flexDirection: "row",
    gap: 8,
  },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  infoText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600"
  },
  guideContainer: { alignItems: "center" },
  faceMask: {
    width: 250,
    height: 320,
    borderWidth: 3,
    borderRadius: 125,
    borderStyle: "dashed",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  statusMsg: {
    color: "white",
    marginTop: 20,
    fontSize: 18,
    fontWeight: "600"
  },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    gap: 8,
  },
  resultText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: { width: "100%", paddingHorizontal: 40, alignItems: "center", marginBottom: 12 },
  captureBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 26,
    gap: 12
  },
  btnText: { color: "white", fontWeight: "bold", fontSize: 16 },
  permissionContainer: { padding: 30, alignItems: "center", backgroundColor: 'transparent' },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255, 75, 75, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  permissionTitle: { marginBottom: 12, textAlign: 'center' },
  permissionText: { textAlign: 'center', color: '#666', marginBottom: 32, lineHeight: 22 },
  requestBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, width: '100%', alignItems: 'center' },
  cancelBtn: { marginTop: 20, padding: 10 },
  cancelText: { color: '#666', fontWeight: '600' },
});
