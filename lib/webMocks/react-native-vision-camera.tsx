import React from "react";
import { View, Text } from "react-native";

export const Camera = (props: any) => (
  <View
    style={[
      {
        backgroundColor: "black",
        justifyContent: "center",
        alignItems: "center",
      },
      props.style,
    ]}
  >
    <Text style={{ color: "white" }}> Camera not supported on web </Text>
  </View>
);

export const useCameraDevice = () => null;
export const useCameraPermission = () => ({
  hasPermission: false,
  requestPermission: async () => false,
});
export const useFrameProcessor = () => {};
export const Worklets = { createRunOnJS: (fn: any) => fn };

export default Camera;
