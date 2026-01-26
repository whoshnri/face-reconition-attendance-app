export const useResizePlugin = () => ({
  resize: (frame: any, options: any) => {
    console.warn(
      "vision-camera-resize-plugin is not supported on web. Using mock.",
    );
    // Return a dummy float32 array of the expected size (112 * 112 * 3)
    return new Float32Array(112 * 112 * 3);
  },
});
