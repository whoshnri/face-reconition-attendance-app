import React, { useState } from "react";
import {
  View,
  Pressable,
  FlatList,
  Share,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/store/AppContext";
import { ReportsStackParamList } from "@/navigation/ReportsStackNavigator";
import { AnimatedPressable } from "@/components/AnimatedPressable";

type RouteType = RouteProp<ReportsStackParamList, "SessionDetail">;

interface ListItem {
  type: "summary" | "present-header" | "present" | "absent-header" | "absent" | "spacer";
  id?: string;
  name?: string;
  timestamp?: string;
  showAbsent?: boolean;
}

// Keep AttendeeItem & AbsentItem – just convert to className

function AttendeeItem({
  name,
  timestamp,
}: {
  name: string;
  timestamp: string;
}) {
  const { theme } = useTheme();

  return (
    <View className={`flex-row items-center py-4 px-4 border-b border-[${theme.border}]`}>
      <View className="w-2.5 h-2.5 rounded-full bg-green-500 mr-4" />
      <View className="flex-1">
        <ThemedText className="text-base font-medium">{name}</ThemedText>
        <ThemedText className="text-sm mt-0.5 text-text-secondary">
          Marked at {timestamp}
        </ThemedText>
      </View>
      <Feather name="check" size={18} color="#10b981" /> {/* green-500 */}
    </View>
  );
}

function AbsentItem({ name }: { name: string }) {
  const { theme } = useTheme();

  return (
    <View className={`flex-row items-center py-4 px-4 border-b border-[${theme.border}] opacity-60`}>
      <View className="w-2.5 h-2.5 rounded-full bg-gray-400 mr-4" />
      <View className="flex-1">
        <ThemedText className="text-base font-medium">{name}</ThemedText>
        <ThemedText className="text-sm mt-0.5 text-text-secondary">
          Not marked
        </ThemedText>
      </View>
      <Feather name="x" size={18} color={theme.textDisabled} />
    </View>
  );
}

export default function SessionDetailScreen() {
  const route = useRoute<RouteType>();
  const { theme } = useTheme();
  const { students, deleteSession, reactivateSession } = useApp();
  const navigation = useNavigation<any>();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [showAbsent, setShowAbsent] = useState(false);

  const session = route.params.session;
  const attendanceRate =
    session.totalCount > 0
      ? Math.round((session.presentCount / session.totalCount) * 100)
      : 0;

  const presentStudentIds = new Set(session.attendees.map((a) => a.studentId));
  const absentStudents = students.filter((s) => !presentStudentIds.has(s.id));

  const listData: ListItem[] = [
    { type: "summary" },
    { type: "present-header" },
    ...session.attendees.map((a) => ({
      type: "present" as const,
      id: a.studentId,
      name: a.name,
      timestamp: a.timestamp,
    })),
    ...(absentStudents.length > 0
      ? [{ type: "absent-header" as const, showAbsent }]
      : []),
    ...(showAbsent
      ? absentStudents.map((s) => ({
        type: "absent" as const,
        id: s.id,
        name: s.name,
      }))
      : []),
    { type: "spacer" },
  ];

  const handleExport = async () => {
    const lines = [
      `Attendance Report - ${session.date}`,
      `Time: ${session.time}`,
      `Present: ${session.presentCount}/${session.totalCount} (${attendanceRate}%)`,
      "",
      "Present Students:",
      ...session.attendees.map((a) => `- ${a.name} (${a.timestamp})`),
      "",
      "Absent Students:",
      ...absentStudents.map((s) => `- ${s.name}`),
    ];

    try {
      await Share.share({
        message: lines.join("\n"),
        title: `Attendance - ${session.date}`,
      });
    } catch (error) {
      console.log("Error sharing:", error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Session",
      "Are you sure you want to delete this session and all its attendance records?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteSession(session.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleScan = () => {
    reactivateSession(session.id);
    navigation.navigate("AttendanceScanner", { sessionId: session.id });
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === "summary") {
      return (
        <View
          className={`p-4 rounded-xl border border-border bg-background-default mb-6 mt-12`}
        >
          <View className="flex-row gap-6 mb-4">
            <View className="flex-row items-center gap-2">
              <Feather name="calendar" size={18} color={theme.primary} />
              <ThemedText className="text-[15px]">{session.date}</ThemedText>
            </View>
            <View className="flex-row items-center gap-2">
              <Feather name="clock" size={18} color={theme.primary} />
              <ThemedText className="text-[15px]">{session.time}</ThemedText>
            </View>
          </View>

          <View className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
            <View
              className="h-full bg-green-500"
              style={{ width: `${attendanceRate}%` }}
            />
          </View>

          <View className="flex-row items-center flex-wrap gap-4">
            <View className="flex-row items-center gap-1.5">
              <View className="w-2 h-2 rounded-full bg-green-500" />
              <ThemedText className="text-sm">{session.presentCount} Present</ThemedText>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-2 h-2 rounded-full bg-gray-400" />
              <ThemedText className="text-sm">{absentStudents.length} Absent</ThemedText>
            </View>
            <ThemedText className={`ml-auto text-sm font-semibold text-primary`}>
              {attendanceRate}% Rate
            </ThemedText>
          </View>
        </View>
      );
    }

    if (item.type === "present-header") {
      return (
        <View className="flex-row justify-between items-center my-2 px-1">
          <ThemedText type="h4">Present Students</ThemedText>
          <ThemedText className="text-text-secondary">
            {session.attendees.length}
          </ThemedText>
        </View>
      );
    }

    if (item.type === "present") {
      return <AttendeeItem name={item.name!} timestamp={item.timestamp!} />;
    }

    if (item.type === "absent-header") {
      return (
        <Pressable
          onPress={() => setShowAbsent((p) => !p)}
          className="px-4 py-4 bg-black/3"
        >
          <View className="flex-row justify-between items-center">
            <ThemedText className="text-sm font-medium text-text-secondary">
              Absent Students ({absentStudents.length})
            </ThemedText>
            <Feather
              name={showAbsent ? "chevron-up" : "chevron-down"}
              size={18}
              color={theme.textSecondary}
            />
          </View>
        </Pressable>
      );
    }

    if (item.type === "absent") {
      return <AbsentItem name={item.name!} />;
    }

    if (item.type === "spacer") {
      return (
        <View
          className="w-full"
          style={{
            height: tabBarHeight + insets.bottom + 140,
          }}
        />
      );
    }

    return null;
  };

  const actionHeightEstimate = 64;

  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <View className="flex-1 relative">
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item, index) =>
            item.type + (item.id || item.name || index.toString())
          }
          contentContainerStyle={{
            paddingHorizontal: 16, // Spacing.md ≈ 16
            paddingTop: headerHeight + 16,
            paddingBottom:
              insets.bottom +
              tabBarHeight +
              actionHeightEstimate +
              64, // Spacing.xl * 2 ≈ 32–64
          }}
          showsVerticalScrollIndicator={false}
        />

        <View
          className={`
    absolute left-0 right-0 
    flex-row items-center gap-3 
    px-4 py-3
    border-t border-b border-border
    bg-background-default
    z-10
  `}
          style={{
            bottom: insets.bottom + 70,  
            paddingBottom: insets.bottom > 0 ? 8 : 16,
          }}
        >
          {/* buttons */}
          <AnimatedPressable
            onPress={handleScan}
            className={`
              flex-3 flex-row items-center justify-center 
              py-3.5 px-3 rounded-xl gap-2 shadow-md shadow-black/20
              bg-green-600
            `}
          >
            <Feather name="camera" size={20} color="white" />
            <ThemedText className="text-white text-[15px] font-semibold">
              Scan Now
            </ThemedText>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={handleExport}
            className={`
              flex-[2] flex-row items-center justify-center 
              py-3.5 px-3 rounded-xl gap-2 border border-border
              bg-blue-600
            `}
          >
            <Feather name="share" size={20} color={theme.text} />
            <ThemedText className="text-text text-[15px] font-semibold">
              Export
            </ThemedText>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={handleDelete}
            className={`
              w-14 aspect-square items-center justify-center 
              rounded-xl border border-red-500/30
              bg-red-500/12
            `}
          >
            <Feather name="trash-2" size={22} color="#ef4444" />
          </AnimatedPressable>
        </View>
      </View>
    </SafeAreaView>
  );
}