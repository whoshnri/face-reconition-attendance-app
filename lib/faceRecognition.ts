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

import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';
import { Skia } from '@shopify/react-native-skia';

// ============================================================================
// CONFIGURATION - You can tweak these values
// ============================================================================

/**
 * This is our AI model file
 * The "require" loads it from the assets folder when the app starts
 */
const MODEL_PATH = require('../assets/models/mobilefacenet.tflite');

/**
 * How many numbers in each face embedding
 * MobileFaceNet outputs 128 numbers that represent a face
 */
const EMBEDDING_SIZE = 128;

/**
 * The minimum similarity score to consider two faces as the same person
 * 0.6 = 60% similar - this is a good balance between accuracy and strictness
 * 
 * If you're getting false matches: INCREASE this (e.g., 0.7)
 * If you're getting too many "face not recognized": DECREASE this (e.g., 0.5)
 */
const SIMILARITY_THRESHOLD = 0.6;

/**
 * The size the AI model expects for input images
 * MobileFaceNet needs 112x112 pixel images
 */
const MODEL_INPUT_SIZE = 112;

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
        console.log('[FaceRecognition] Model already loaded, skipping');
        return;
    }

    try {
        console.log('[FaceRecognition] Loading AI model...');

        // This loads the .tflite file and prepares it for use
        // The MODEL_PATH is a number (asset ID) that React Native understands
        model = await loadTensorflowModel(MODEL_PATH);

        console.log('[FaceRecognition] ✅ Model loaded successfully!');
    } catch (error) {
        console.error('[FaceRecognition] ❌ Failed to load model:', error);
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
 * STEP 2: Generate a face embedding from a photo
 * 
 * This is the main function! Give it a photo path and it gives you
 * 128 numbers that represent the face.
 * 
 * @param photoPath - The file path to the photo (from vision-camera)
 * @param faceBounds - Optional: where the face is in the photo (from ML Kit)
 * @returns An array of 128 numbers (the face embedding)
 * 
 * Example:
 *   const embedding = await generateEmbeddingFromPhoto('file:///path/to/photo.jpg');
 *   // embedding = [0.12, -0.45, 0.78, ...] (128 numbers)
 */
export async function generateEmbeddingFromPhoto(
    photoPath: string,
    faceBounds?: { x: number; y: number; width: number; height: number }
): Promise<number[]> {
    // Make sure the model is loaded first!
    if (!model) {
        throw new Error('Model not loaded! Call loadFaceModel() first.');
    }

    try {
        console.log('[FaceRecognition] Processing photo:', photoPath);

        // ====================================================================
        // STEP 2a: Load the image using Skia
        // Skia is a graphics library that can decode images
        // ====================================================================

        // Fetch the image file as binary data
        const response = await fetch(photoPath);
        const arrayBuffer = await response.arrayBuffer();

        // Convert to Skia data format
        const skiaData = Skia.Data.fromBytes(new Uint8Array(arrayBuffer));

        // Decode the image (works with JPG, PNG, etc.)
        const skiaImage = Skia.Image.MakeImageFromEncoded(skiaData);

        if (!skiaImage) {
            throw new Error('Failed to decode image - might be corrupted or unsupported format');
        }

        console.log(`[FaceRecognition] Image loaded: ${skiaImage.width()}x${skiaImage.height()}`);

        // ====================================================================
        // STEP 2b: Crop to face region (if we know where the face is)
        // This improves accuracy by focusing only on the face
        // ====================================================================

        let imageToProcess = skiaImage;

        if (faceBounds) {
            console.log('[FaceRecognition] Cropping to face region:', faceBounds);

            // Create a surface (canvas) the size of the face
            const surface = Skia.Surface.Make(
                Math.round(faceBounds.width),
                Math.round(faceBounds.height)
            );

            if (surface) {
                const canvas = surface.getCanvas();

                // Draw just the face region onto the canvas
                canvas.drawImageRect(
                    skiaImage,
                    // Source rectangle (where to copy FROM)
                    Skia.XYWHRect(faceBounds.x, faceBounds.y, faceBounds.width, faceBounds.height),
                    // Destination rectangle (where to copy TO)
                    Skia.XYWHRect(0, 0, faceBounds.width, faceBounds.height),
                    Skia.Paint()
                );

                // Get the cropped image
                const croppedImage = surface.makeImageSnapshot();
                if (croppedImage) {
                    imageToProcess = croppedImage;
                    console.log(`[FaceRecognition] Cropped to: ${croppedImage.width()}x${croppedImage.height()}`);
                }
            }
        }

        // ====================================================================
        // STEP 2c: Resize to 112x112 (what the AI model expects)
        // ====================================================================

        const resizeSurface = Skia.Surface.Make(MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
        if (!resizeSurface) {
            throw new Error('Failed to create resize surface');
        }

        const resizeCanvas = resizeSurface.getCanvas();

        // Draw the image scaled down to 112x112
        resizeCanvas.drawImageRect(
            imageToProcess,
            // Source: the entire image
            Skia.XYWHRect(0, 0, imageToProcess.width(), imageToProcess.height()),
            // Destination: 112x112 square
            Skia.XYWHRect(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE),
            Skia.Paint()
        );

        // Get the resized image
        const resizedImage = resizeSurface.makeImageSnapshot();
        if (!resizedImage) {
            throw new Error('Failed to resize image');
        }

        console.log('[FaceRecognition] Resized to 112x112');

        // ====================================================================
        // STEP 2d: Extract pixel data
        // We need to get the raw RGB values for each pixel
        // ====================================================================

        // Read the pixels as raw bytes (RGBA format = 4 bytes per pixel)
        // The readPixels method returns a Uint8Array with RGBA data
        let pixelBuffer: Uint8Array | null = null;

        try {
            // Try the newer API signature first
            pixelBuffer = resizedImage.readPixels(0, 0, {
                width: MODEL_INPUT_SIZE,
                height: MODEL_INPUT_SIZE,
                colorType: 4, // RGBA_8888
                alphaType: 1, // Opaque
            }) as Uint8Array | null;
        } catch (e) {
            // If that fails, try alternative signatures
            console.log('[FaceRecognition] Trying alternative readPixels signature...');
            try {
                // Some versions use just width/height
                pixelBuffer = (resizedImage as any).readPixels(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE) as Uint8Array | null;
            } catch (e2) {
                console.error('[FaceRecognition] readPixels failed:', e2);
            }
        }

        if (!pixelBuffer) {
            throw new Error('Failed to read pixel data from image. readPixels returned null.');
        }

        // Verify we got the expected amount of data
        // 112 * 112 * 4 = 50,176 bytes (RGBA)
        const expectedBytes = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE * 4;
        if (pixelBuffer.length !== expectedBytes) {
            console.warn(`[FaceRecognition] Unexpected pixel buffer size: ${pixelBuffer.length} (expected ${expectedBytes})`);
        }

        console.log(`[FaceRecognition] Got ${pixelBuffer.length} bytes of pixel data`);

        // ====================================================================
        // STEP 2e: Convert pixels to the format the AI model expects
        // The model wants: Float32 array, RGB only (no alpha), normalized to [-1, 1]
        // ====================================================================

        // Create the input array for the model
        // 112 * 112 * 3 = 37,632 numbers (RGB for each pixel)
        const inputData = new Float32Array(MODEL_INPUT_SIZE * MODEL_INPUT_SIZE * 3);

        // Convert each pixel
        for (let i = 0; i < MODEL_INPUT_SIZE * MODEL_INPUT_SIZE; i++) {
            // Each pixel in RGBA format takes 4 bytes
            const sourceIndex = i * 4;
            // In the output, we only need RGB (3 values per pixel)
            const destIndex = i * 3;

            // The model expects values between -1 and 1
            // Original pixel values are 0-255, so we:
            // 1. Divide by 127.5 to get 0-2
            // 2. Subtract 1 to get -1 to 1
            inputData[destIndex + 0] = (pixelBuffer[sourceIndex + 0] / 127.5) - 1; // Red
            inputData[destIndex + 1] = (pixelBuffer[sourceIndex + 1] / 127.5) - 1; // Green
            inputData[destIndex + 2] = (pixelBuffer[sourceIndex + 2] / 127.5) - 1; // Blue
            // We skip Alpha (sourceIndex + 3) - the model doesn't need it
        }

        console.log('[FaceRecognition] Preprocessed pixels for model input');

        // ====================================================================
        // STEP 2f: Run the AI model! 🧠
        // ====================================================================

        console.log('[FaceRecognition] Running AI inference...');

        // Send the pixel data to the model and get the embedding back
        const output = await model.run([inputData]);

        // The output is a 128-dimensional embedding
        const embedding = Array.from(output[0] as Float32Array);

        console.log(`[FaceRecognition] Got embedding with ${embedding.length} dimensions`);

        // ====================================================================
        // STEP 2g: Normalize the embedding (make it a "unit vector")
        // This makes comparing embeddings more accurate
        // ====================================================================

        // Calculate the "length" of the vector using Pythagorean theorem
        const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));

        // Divide each value by the length to get a unit vector
        const normalizedEmbedding = embedding.map(val => val / norm);

        console.log('[FaceRecognition] ✅ Embedding generated successfully!');

        return normalizedEmbedding;

    } catch (error) {
        console.error('[FaceRecognition] ❌ Failed to generate embedding:', error);
        throw error;
    }
}

/**
 * STEP 3: Compare two faces using their embeddings
 * 
 * This uses "cosine similarity" - a way to measure how similar two vectors are
 * 
 * @param embedding1 - First face embedding (128 numbers)
 * @param embedding2 - Second face embedding (128 numbers)
 * @returns A number between -1 and 1 (1 = identical, 0 = unrelated)
 * 
 * Example:
 *   const similarity = cosineSimilarity(face1, face2);
 *   if (similarity > 0.6) {
 *     console.log("Same person!");
 *   }
 */
export function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    // Make sure both embeddings have the same size
    if (embedding1.length !== embedding2.length) {
        throw new Error(`Embedding size mismatch: ${embedding1.length} vs ${embedding2.length}`);
    }

    // Calculate the dot product and norms
    // (This is the math formula for cosine similarity)
    let dotProduct = 0;  // Sum of (a[i] * b[i])
    let norm1 = 0;       // Sum of (a[i] * a[i])
    let norm2 = 0;       // Sum of (b[i] * b[i])

    for (let i = 0; i < embedding1.length; i++) {
        dotProduct += embedding1[i] * embedding2[i];
        norm1 += embedding1[i] * embedding1[i];
        norm2 += embedding2[i] * embedding2[i];
    }

    // The formula: cosine = dotProduct / (length1 * length2)
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
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
    liveEmbedding: number[],
    storedEmbeddings: Array<{ studentId: string; embedding: number[] }>
): { studentId: string; similarity: number } | null {
    // If there are no enrolled students, we can't match anyone
    if (storedEmbeddings.length === 0) {
        console.log('[FaceRecognition] No stored embeddings to compare against');
        return null;
    }

    let bestMatch: { studentId: string; similarity: number } | null = null;

    // Compare against each enrolled student
    for (const stored of storedEmbeddings) {
        const similarity = cosineSimilarity(liveEmbedding, stored.embedding);

        console.log(`[FaceRecognition] Comparing vs ${stored.studentId}: ${(similarity * 100).toFixed(1)}%`);

        // Only consider it a match if similarity is above our threshold
        if (similarity >= SIMILARITY_THRESHOLD) {
            // Keep track of the BEST match (highest similarity)
            if (!bestMatch || similarity > bestMatch.similarity) {
                bestMatch = { studentId: stored.studentId, similarity };
            }
        }
    }

    if (bestMatch) {
        console.log(`[FaceRecognition] ✅ Best match: ${bestMatch.studentId} (${(bestMatch.similarity * 100).toFixed(1)}%)`);
    } else {
        console.log('[FaceRecognition] ❌ No match found above threshold');
    }

    return bestMatch;
}

// ============================================================================
// EXPORTS - Make constants available to other files
// ============================================================================

export { EMBEDDING_SIZE, SIMILARITY_THRESHOLD };
