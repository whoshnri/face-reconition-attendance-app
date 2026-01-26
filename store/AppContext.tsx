import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import * as db from "@/lib/database";

export type {
  Student,
  AttendanceRecord,
  AttendanceSession,
} from "@/lib/database";

type AppContextType = {
  students: db.Student[];
  sessions: db.AttendanceSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  addStudent: (name: string, studentId: string) => Promise<db.Student>;
  updateStudent: (id: string, name: string, studentId: string) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  enrollFace: (id: string) => Promise<void>;
  startSession: (sessionDate?: Date) => Promise<string>;
  markAttendance: (studentId: string) => Promise<boolean>;
  endSession: () => void;
  getStudentById: (id: string) => db.Student | undefined;
  getSessionById: (id: string) => db.AttendanceSession | undefined;
  getTodayAttendance: () => db.AttendanceRecord[];
  getStudentAttendanceStats: (studentId: string) => {
    attended: number;
    total: number;
  };
  deleteSession: (id: string) => Promise<void>;
  reactivateSession: (id: string) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

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
  const [students, setStudents] = useState<db.Student[]>([]);
  const [sessions, setSessions] = useState<db.AttendanceSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await db.openDatabase();
      const [studentsData, sessionsData] = await Promise.all([
        db.getAllStudents(),
        db.getAllSessions(),
      ]);
      setStudents(studentsData);
      setSessions(sessionsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addStudent = async (
    name: string,
    studentId: string,
  ): Promise<db.Student> => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    await db.addStudent(id, name, studentId, createdAt);
    const newStudent: db.Student = {
      id,
      name,
      studentId,
      faceEnrolled: false,
      createdAt,
    };
    setStudents((prev) => [newStudent, ...prev]);
    return newStudent;
  };

  const updateStudent = async (id: string, name: string, studentId: string) => {
    await db.updateStudent(id, name, studentId);
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name, studentId } : s)),
    );
  };

  const deleteStudent = async (id: string) => {
    await db.deleteStudent(id);
    setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const enrollFace = async (id: string) => {
    const enrolledDate = new Date().toISOString();
    await db.enrollFace(id, enrolledDate);
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, faceEnrolled: true, enrolledDate } : s,
      ),
    );
  };

  const startSession = async (sessionDate?: Date): Promise<string> => {
    const now = sessionDate || new Date();
    const sessionId = generateId();
    const date = formatDate(now);
    const time = formatTime(now);
    await db.addSession(sessionId, date, time, students.length);
    const newSession: db.AttendanceSession = {
      id: sessionId,
      date,
      time,
      presentCount: 0,
      totalCount: students.length,
      attendees: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(sessionId);
    return sessionId;
  };

  const deleteSession = async (id: string) => {
    await db.deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (currentSessionId === id) {
      setCurrentSessionId(null);
    }
  };

  const reactivateSession = (id: string) => {
    setCurrentSessionId(id);
  };

  const markAttendance = async (studentId: string): Promise<boolean> => {
    if (!currentSessionId) return false;

    const student = students.find((s) => s.id === studentId);
    if (!student) return false;

    const alreadyMarked = await db.isAlreadyMarked(currentSessionId, studentId);
    if (alreadyMarked) return false;

    const timestamp = formatTime(new Date());
    await db.markAttendance(
      currentSessionId,
      studentId,
      student.name,
      timestamp,
    );

    setSessions((prev) =>
      prev.map((session) => {
        if (session.id === currentSessionId) {
          return {
            ...session,
            presentCount: session.presentCount + 1,
            attendees: [
              ...session.attendees,
              { studentId, name: student.name, timestamp },
            ],
          };
        }
        return session;
      }),
    );
    return true;
  };

  const endSession = () => {
    setCurrentSessionId(null);
  };

  const getStudentById = (id: string) => students.find((s) => s.id === id);

  const getSessionById = (id: string) => sessions.find((s) => s.id === id);

  const getTodayAttendance = (): db.AttendanceRecord[] => {
    const today = formatDate(new Date());
    const todaySessions = sessions.filter((s) => s.date === today);
    const allAttendees: db.AttendanceRecord[] = [];
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
        deleteSession,
        reactivateSession,
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
