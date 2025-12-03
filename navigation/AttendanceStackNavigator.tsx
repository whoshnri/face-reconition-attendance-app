import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AttendanceHomeScreen from "@/screens/AttendanceHomeScreen";
import AttendanceScannerScreen from "@/screens/AttendanceScannerScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type AttendanceStackParamList = {
  AttendanceHome: undefined;
  AttendanceScanner: { sessionId: string };
};

const Stack = createNativeStackNavigator<AttendanceStackParamList>();

export default function AttendanceStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="AttendanceHome"
        component={AttendanceHomeScreen}
        options={{
          headerTitle: () => <HeaderTitle title="FaceAttend" />,
        }}
      />
      <Stack.Screen
        name="AttendanceScanner"
        component={AttendanceScannerScreen}
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
    </Stack.Navigator>
  );
}
