import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Student = {
  id: string;
  name: string;
  studentId: string;
  faceEnrolled: boolean;
  enrolledDate?: string;
  createdAt: string;
};

export type AttendanceRecord = {
  studentId: string;
  name: string;
  timestamp: string;
};

export type AttendanceSession = {
  id: string;
  date: string;
  time: string;
  presentCount: number;
  totalCount: number;
  attendees: AttendanceRecord[];
};

type AppContextType = {
  students: Student[];
  sessions: AttendanceSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  addStudent: (name: string, studentId: string) => Promise<Student>;
  updateStudent: (id: string, name: string, studentId: string) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  enrollFace: (id: string) => Promise<void>;
  startSession: () => Promise<string>;
  markAttendance: (studentId: string) => Promise<boolean>;
  endSession: () => void;
  getStudentById: (id: string) => Student | undefined;
  getSessionById: (id: string) => AttendanceSession | undefined;
  getTodayAttendance: () => AttendanceRecord[];
  getStudentAttendanceStats: (studentId: string) => { attended: number; total: number };
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  STUDENTS: "@faceattend_students",
  SESSIONS: "@faceattend_sessions",
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [studentsData, sessionsData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.STUDENTS),
        AsyncStorage.getItem(STORAGE_KEYS.SESSIONS),
      ]);

      if (studentsData) {
        setStudents(JSON.parse(studentsData));
      }
      if (sessionsData) {
        setSessions(JSON.parse(sessionsData));
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveStudents = async (newStudents: Student[]) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.STUDENTS,
        JSON.stringify(newStudents)
      );
    } catch (error) {
      console.error("Error saving students:", error);
    }
  };

  const saveSessions = async (newSessions: AttendanceSession[]) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SESSIONS,
        JSON.stringify(newSessions)
      );
    } catch (error) {
      console.error("Error saving sessions:", error);
    }
  };

  const addStudent = async (name: string, studentId: string): Promise<Student> => {
    const newStudent: Student = {
      id: generateId(),
      name,
      studentId,
      faceEnrolled: false,
      createdAt: new Date().toISOString(),
    };
    const newStudents = [...students, newStudent];
    setStudents(newStudents);
    await saveStudents(newStudents);
    return newStudent;
  };

  const updateStudent = async (id: string, name: string, studentId: string) => {
    const newStudents = students.map((s) =>
      s.id === id ? { ...s, name, studentId } : s
    );
    setStudents(newStudents);
    await saveStudents(newStudents);
  };

  const deleteStudent = async (id: string) => {
    const newStudents = students.filter((s) => s.id !== id);
    setStudents(newStudents);
    await saveStudents(newStudents);
  };

  const enrollFace = async (id: string) => {
    const newStudents = students.map((s) =>
      s.id === id
        ? { ...s, faceEnrolled: true, enrolledDate: new Date().toISOString() }
        : s
    );
    setStudents(newStudents);
    await saveStudents(newStudents);
  };

  const startSession = async (): Promise<string> => {
    const now = new Date();
    const sessionId = generateId();
    const newSession: AttendanceSession = {
      id: sessionId,
      date: formatDate(now),
      time: formatTime(now),
      presentCount: 0,
      totalCount: students.length,
      attendees: [],
    };
    const newSessions = [newSession, ...sessions];
    setSessions(newSessions);
    setCurrentSessionId(sessionId);
    await saveSessions(newSessions);
    return sessionId;
  };

  const markAttendance = async (studentId: string): Promise<boolean> => {
    if (!currentSessionId) return false;

    const student = students.find((s) => s.id === studentId);
    if (!student) return false;

    let alreadyMarked = false;
    const currentSession = sessions.find((s) => s.id === currentSessionId);
    
    if (currentSession?.attendees.some((a) => a.studentId === studentId)) {
      alreadyMarked = true;
      return false;
    }

    const newSessions = sessions.map((session) => {
      if (session.id === currentSessionId) {
        return {
          ...session,
          presentCount: session.presentCount + 1,
          attendees: [
            ...session.attendees,
            {
              studentId,
              name: student.name,
              timestamp: formatTime(new Date()),
            },
          ],
        };
      }
      return session;
    });

    setSessions(newSessions);
    await saveSessions(newSessions);
    return !alreadyMarked;
  };

  const endSession = () => {
    setCurrentSessionId(null);
  };

  const getStudentById = (id: string) => students.find((s) => s.id === id);

  const getSessionById = (id: string) => sessions.find((s) => s.id === id);

  const getTodayAttendance = (): AttendanceRecord[] => {
    const today = formatDate(new Date());
    const todaySessions = sessions.filter((s) => s.date === today);
    const allAttendees: AttendanceRecord[] = [];
    todaySessions.forEach((session) => {
      session.attendees.forEach((a) => {
        if (!allAttendees.some((att) => att.studentId === a.studentId)) {
          allAttendees.push(a);
        }
      });
    });
    return allAttendees;
  };

  const getStudentAttendanceStats = (studentId: string) => {
    let attended = 0;
    sessions.forEach((session) => {
      if (session.attendees.some((a) => a.studentId === studentId)) {
        attended++;
      }
    });
    return { attended, total: sessions.length };
  };

  return (
    <AppContext.Provider
      value={{
        students,
        sessions,
        currentSessionId,
        isLoading,
        addStudent,
        updateStudent,
        deleteStudent,
        enrollFace,
        startSession,
        markAttendance,
        endSession,
        getStudentById,
        getSessionById,
        getTodayAttendance,
        getStudentAttendanceStats,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
