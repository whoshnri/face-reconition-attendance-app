import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AttendanceHomeScreen from "@/screens/AttendanceHomeScreen";
import AttendanceScannerScreen from "@/screens/AttendanceScannerScreen";
import CreateSessionScreen from "@/screens/CreateSessionScreen";
import SessionDetailScreen from "@/screens/SessionDetailScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type AttendanceStackParamList = {
  AttendanceHome: undefined;
  CreateSession: undefined;
  AttendanceScanner: { sessionId: string };
  SessionDetail: { session: any };
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
        name="CreateSession"
        component={CreateSessionScreen}
        options={{
          headerShown: false,
          presentation: "card",
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
      <Stack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={{
          headerTitle: "Session Details",
        }}
      />
    </Stack.Navigator>
  );
}
