import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import StudentsListScreen from "@/screens/StudentsListScreen";
import StudentDetailScreen from "@/screens/StudentDetailScreen";
import AddEditStudentScreen from "@/screens/AddEditStudentScreen";
import EnrollFaceScreen from "@/screens/EnrollFaceScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { Student } from "@/store/AppContext";

export type StudentsStackParamList = {
  StudentsList: undefined;
  StudentDetail: { student: Student };
  AddEditStudent: { student?: Student };
  EnrollFace: { student: Student };
};

const Stack = createNativeStackNavigator<StudentsStackParamList>();

export default function StudentsStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="StudentsList"
        component={StudentsListScreen}
        options={{
          headerTitle: () => <HeaderTitle title="FaceAttend" />,
        }}
      />
      <Stack.Screen
        name="StudentDetail"
        component={StudentDetailScreen}
        options={({ route }) => ({
          headerTitle: route.params.student.name,
        })}
      />
      <Stack.Screen
        name="AddEditStudent"
        component={AddEditStudentScreen}
        options={({ route }) => ({
          headerTitle: route.params?.student ? "Edit Student" : "Add Student",
          presentation: "modal",
          ...getCommonScreenOptions({ theme, isDark, transparent: false }),
        })}
      />
      <Stack.Screen
        name="EnrollFace"
        component={EnrollFaceScreen}
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
    </Stack.Navigator>
  );
}
