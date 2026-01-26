export const loadTensorflowModel = async () => {
  console.warn("react-native-fast-tflite is not supported on web. Using mock.");
  return {
    run: async () => [new Float32Array(128)],
  };
};

export class TensorflowModel {
  async run() {
    return [new Float32Array(128)];
  }
}
