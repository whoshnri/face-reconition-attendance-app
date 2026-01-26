/**
 * ============================================================================
 * FACE RECOGNITION UTILITIES - "FOR DUMMIES" EDITION
 * ============================================================================
 *
 * This file handles all the face recognition magic! Here's what it does:
 *
 * 1. LOAD THE AI MODEL
 *    - We use a pre-trained "MobileFaceNet" model (a .tflite file)
 *    - Think of it like a mini brain that learned to recognize faces
 *
 * 2. GENERATE "EMBEDDINGS" FROM FACE PHOTOS
 *    - An "embedding" is just a list of 128 numbers
 *    - These numbers represent the face's unique features
 *    - Same person = similar numbers, different person = different numbers
 *
 * 3. COMPARE FACES
 *    - We use "cosine similarity" to compare embeddings
 *    - Score of 1.0 = identical, 0.0 = completely different
 *    - If score > 0.6, we consider it a match
 *
 * ============================================================================
 */

import { loadTensorflowModel, TensorflowModel } from "react-native-fast-tflite";

// ============================================================================
// CONFIGURATION - You can tweak these values
// ============================================================================

/**
 * This is our AI model file
 * The "require" loads it from the assets folder when the app starts
 */
const MODEL_PATH = require("../assets/models/mobilefacenet.tflite");

export const EMBEDDING_SIZE = 128;

export const SIMILARITY_THRESHOLD = 0.6;

// ============================================================================
// MODEL STATE - We keep track of whether the AI model is loaded
// ============================================================================

/**
 * This variable holds the loaded AI model
 * It's null until we call loadFaceModel()
 */
let model: TensorflowModel | null = null;

// ============================================================================
// MAIN FUNCTIONS - These are the ones you'll use in your app
// ============================================================================



/**
 * Robustly converts any numeric collection (Array, Float32Array, or Object with numeric keys)
 * into a standard number array. This is critical because Worklets often serialize 
 * typed arrays into plain objects when passing them between threads.
 */
export function ensureArray(input: any): number[] {
  "worklet";
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (input instanceof Float32Array) return Array.from(input);

  // Handle case where input is an object with numeric keys like {"0": 1.2, "1": 3.4 ...}
  const result: number[] = [];
  let i = 0;
  // MobileFaceNet output is always 128 floats
  while (input[i] !== undefined && i < 128) {
    result.push(Number(input[i]));
    i++;
  }
  return result;
}

/**
 * STEP 1: Load the AI model
 *
 * Call this ONCE when your app starts (usually in a useEffect)
 * The model takes a few seconds to load, so we do it early
 *
 * Example:
 *   useEffect(() => {
 *     loadFaceModel();
 *   }, []);
 */
export async function loadFaceModel(): Promise<void> {
  // If already loaded, don't load again
  if (model) {
    console.log("[FaceRecognition] Model already loaded, skipping");
    return;
  }

  try {
    console.log("[FaceRecognition] Loading AI model...");

    // This loads the .tflite file and prepares it for use
    // The MODEL_PATH is a number (asset ID) that React Native understands
    model = await loadTensorflowModel(MODEL_PATH);

    console.log("[FaceRecognition] ✅ Model loaded successfully!");
  } catch (error) {
    console.error("[FaceRecognition] ❌ Failed to load model:", error);
    throw error;
  }
}

/**
 * Check if the AI model is ready to use
 *
 * Example:
 *   if (isModelLoaded()) {
 *     // Safe to do face recognition
 *   }
 */
export function isModelLoaded(): boolean {
  return model !== null;
}

/**
 * Normalize an embedding vector using L2 normalization
 * This ensures embeddings are unit vectors for accurate cosine similarity
 *
 * @param embedding - Face embedding vector
 * @returns Normalized embedding vector
 */
export function normalizeEmbedding(
  embedding: number[] | Float32Array,
): number[] {
  // Calculate L2 norm
  let norm = 0;
  for (let i = 0; i < embedding.length; i++) {
    norm += embedding[i] * embedding[i];
  }
  norm = Math.sqrt(norm);

  // Normalize: divide each component by the norm
  if (norm === 0) return Array.from(embedding); // Return as-is if zero vector
  const normalized: number[] = [];
  for (let i = 0; i < embedding.length; i++) {
    normalized.push(embedding[i] / norm);
  }
  return normalized;
}

/**
 * STEP 3: Compare two faces using their embeddings
 *
 * This uses "cosine similarity" - a way to measure how similar two vectors are
 * Both embeddings should be normalized (unit vectors) for best results
 *
 * @param embedding1 - First face embedding (128 numbers, should be normalized)
 * @param embedding2 - Second face embedding (128 numbers, should be normalized)
 * @returns A number between -1 and 1 (1 = identical, 0 = unrelated)
 */
export function cosineSimilarity(
  embedding1: number[] | Float32Array,
  embedding2: number[] | Float32Array,
): number {
  "worklet";

  // Robust conversion to array if it's an object with numeric keys
  const a_arr = ensureArray(embedding1);
  const b_arr = ensureArray(embedding2);

  // Make sure both embeddings have the same size
  if (a_arr.length !== b_arr.length) {
    return 0;
  }

  // Calculate the dot product and norms
  // (This is the math formula for cosine similarity)
  let dotProduct = 0; // Sum of (a[i] * b[i])
  let norm1 = 0; // Sum of (a[i] * a[i])
  let norm2 = 0; // Sum of (b[i] * b[i])

  for (let i = 0; i < a_arr.length; i++) {
    const a = a_arr[i];
    const b = b_arr[i];
    dotProduct += a * b;
    norm1 += a * a;
    norm2 += b * b;
  }

  // The formula: cosine = dotProduct / (length1 * length2)
  const denom = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denom === 0) return 0;
  return dotProduct / denom;
}

/**
 * STEP 4: Find which student matches a face
 *
 * This compares a live face against all enrolled students and finds the best match
 *
 * @param liveEmbedding - The embedding from the camera (the face you're scanning)
 * @param storedEmbeddings - All enrolled student embeddings from the database
 * @returns The matching student's ID and similarity score, or null if no match
 *
 * Example:
 *   const match = findBestMatch(scannedFace, allEnrolledFaces);
 *   if (match) {
 *     console.log(`Found ${match.studentId} with ${match.similarity * 100}% confidence`);
 *   }
 */
export function findBestMatch(
  liveEmbedding: number[] | any,
  storedEmbeddings: Array<{ studentId: string; embedding: number[] }>,
): { studentId: string; similarity: number } | null {
  // If there are no enrolled students, we can't match anyone
  if (storedEmbeddings.length === 0) {
    console.log("[FaceRecognition] No stored embeddings to compare against");
    return null;
  }

  const liveArr = ensureArray(liveEmbedding);
  if (liveArr.length === 0) {
    console.log("[FaceRecognition] ❌ Invalid live embedding (0 length)");
    return null;
  }

  let bestMatch: { studentId: string; similarity: number } | null = null;

  console.log(bestMatch)

  // Compare against each enrolled student
  for (const stored of storedEmbeddings) {
    const similarity = cosineSimilarity(liveArr, stored.embedding);
    console.log("im here")


    console.log(
      `[FaceRecognition] Comparing vs ${stored.studentId}: ${(similarity * 100).toFixed(1)}%`,
    );

    // Only consider it a match if similarity is above our threshold
    if (similarity >= SIMILARITY_THRESHOLD) {
      // Keep track of the BEST match (highest similarity)
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { studentId: stored.studentId, similarity };
      }
    }
  }


  if (bestMatch) {
    console.log(
      `[FaceRecognition] ✅ Best match: ${bestMatch.studentId} (${(bestMatch.similarity * 100).toFixed(1)}%)`,
    );
  } else {
    console.log("[FaceRecognition] ❌ No match found above threshold");
  }
  return bestMatch;
}



