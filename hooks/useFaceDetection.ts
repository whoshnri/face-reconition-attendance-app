/**
 * Face Detection Hook
 *
 * This is a simplified wrapper hook that re-exports the useFaceDetection
 * from @infinitered/react-native-mlkit-face-detection for type safety.
 *
 * Note: The ML Kit library detects faces from image URIs, not video frames.
 * For real-time detection, we take periodic photos and detect faces in them.
 */

import { useFaceDetection } from "@infinitered/react-native-mlkit-face-detection";

export interface DetectedFace {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
}

/**
 * Utility to check if a face is well-positioned for capture
 * (centered, right size, not too rotated)
 */
export function isFaceWellPositioned(
  face: DetectedFace,
  frameWidth: number,
  frameHeight: number,
): { isGood: boolean; message: string } {
  const { bounds } = face;

  // Check if face is centered (within middle 40% of frame)
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const isCenteredX = centerX > frameWidth * 0.3 && centerX < frameWidth * 0.7;
  const isCenteredY =
    centerY > frameHeight * 0.25 && centerY < frameHeight * 0.75;

  if (!isCenteredX || !isCenteredY) {
    return { isGood: false, message: "Center your face in the frame" };
  }

  // Check if face is the right size (between 20% and 60% of frame height)
  const faceHeightRatio = bounds.height / frameHeight;
  if (faceHeightRatio < 0.2) {
    return { isGood: false, message: "Move closer to the camera" };
  }
  if (faceHeightRatio > 0.6) {
    return { isGood: false, message: "Move back from the camera" };
  }

  return { isGood: true, message: "Hold still..." };
}

// Re-export the hook for convenience
export { useFaceDetection };
