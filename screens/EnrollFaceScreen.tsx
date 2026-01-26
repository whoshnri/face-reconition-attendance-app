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
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useApp } from "@/store/AppContext";
import { saveFaceEmbedding } from "@/lib/database";
import { normalizeEmbedding, ensureArray } from "@/lib/faceRecognition";
import { useTheme } from "@/hooks/useTheme";
import { AnimatedPressable } from "@/components/AnimatedPressable";


export default function EnrollFaceScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { enrollFace } = useApp();
  const student = route.params.student;


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
  const pulseScale = useRef(new Animated.Value(1)).current;

  // --- 3. DETECTOR CONFIG ---
  const { detectFaces } = useFaceDetector({
    performanceMode: "fast",
    classificationMode: "none",
    landmarkMode: "none",
  });

  useEffect(() => {
    if (model) setStatus("positioning");
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [model]);

  // request camera permission
  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission]);

  // --- 4. WORKLETS (The High Speed Part) ---
  const syncFaceState = Worklets.createRunOnJS((isFound: boolean, vector: any) => {
    if (faceDetected !== isFound) setFaceDetected(isFound);

    // Robustly convert potentially serialized object to array
    const cleanVector = normalizeEmbedding(ensureArray(vector));

    if (cleanVector.length > 0) {
      vectorRef.current = new Float32Array(cleanVector);
      console.log(`[FaceEnroll] Face detected, embedding size: ${cleanVector.length}`);
    } else {
      vectorRef.current = null;
    }
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
    if (isCapturing.current || !vectorRef.current) return;

    isCapturing.current = true;
    setStatus("processing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Convert Float32Array to number array and normalize
      const rawEmbedding = Array.from(vectorRef.current);
      console.log(rawEmbedding)

      // Normalize the embedding before storage for accurate comparison
      const normalizedEmbedding = normalizeEmbedding(rawEmbedding);

      await saveFaceEmbedding(student.id, normalizedEmbedding);
      await enrollFace(student.id);

      setStatus("success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => navigation.goBack(), 1500);
    } catch (err) {
      console.error("Enrollment failed:", err);
      setStatus("positioning");
      isCapturing.current = false;
    }
  };

  // --- 6. RENDER ---
  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <ThemedView style={styles.permissionContainer}>
          <View style={styles.iconCircle}>
            <Feather name="camera-off" size={48} color={theme.error} />
          </View>
          <ThemedText type="h2" style={styles.permissionTitle}>Camera Access Required</ThemedText>
          <ThemedText style={styles.permissionText}>
            We need camera access to enroll your face for attendance.
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
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="x" size={28} color="white" />
        </Pressable>

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
            {status === "processing" ? "Enrolling..." :
              (faceDetected && vectorRef.current) ? "Ready to Capture" :
                faceDetected ? "Adjusting Face..." : "Align Face in Frame"}
          </ThemedText>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 50 }]}>
          <AnimatedPressable
            disabled={!faceDetected || !vectorRef.current || status === "processing"}
            onPress={onCapture}
            style={[
              styles.captureBtn,
              { backgroundColor: (faceDetected && vectorRef.current) ? theme.primary : "#444" }
            ]}
          >
            <Feather name="user-check" size={24} color="white" />
            <ThemedText style={styles.btnText}>Enroll Face</ThemedText>
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
  backBtn: { alignSelf: "flex-start", marginLeft: 20, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  guideContainer: { alignItems: "center" },
  faceMask: {
    width: 250,
    height: 320,
    borderWidth: 3,
    borderRadius: 125,
    borderStyle: "dashed",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  statusMsg: { color: "white", marginTop: 20, fontSize: 18, fontWeight: "600" },
  footer: {
    width: "100%", paddingHorizontal: 40, alignItems: "center", marginBottom: 30
  },
  captureBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 40, paddingVertical: 18, borderRadius: 35, gap: 12 },
  btnText: { color: "white", fontWeight: "bold", fontSize: 16 },
  permissionContainer: { padding: 30, alignItems: "center", backgroundColor: 'transparent' },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255, 75, 75, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  permissionTitle: { marginBottom: 12, textAlign: 'center' },
  permissionText: { textAlign: 'center', color: '#666', marginBottom: 32, lineHeight: 22 },
  requestBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, width: '100%', alignItems: 'center' },
  cancelBtn: { marginTop: 20, padding: 10 },
  cancelText: { color: '#666', fontWeight: '600' },
});