import React, { createContext, useContext, useState, ReactNode } from "react";

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
  addStudent: (name: string, studentId: string) => Student;
  updateStudent: (id: string, name: string, studentId: string) => void;
  deleteStudent: (id: string) => void;
  enrollFace: (id: string) => void;
  startSession: () => string;
  markAttendance: (studentId: string) => boolean;
  endSession: () => void;
  getStudentById: (id: string) => Student | undefined;
  getSessionById: (id: string) => AttendanceSession | undefined;
  getTodayAttendance: () => AttendanceRecord[];
  getStudentAttendanceStats: (studentId: string) => { attended: number; total: number };
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
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const addStudent = (name: string, studentId: string): Student => {
    const newStudent: Student = {
      id: generateId(),
      name,
      studentId,
      faceEnrolled: false,
      createdAt: new Date().toISOString(),
    };
    setStudents((prev) => [...prev, newStudent]);
    return newStudent;
  };

  const updateStudent = (id: string, name: string, studentId: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name, studentId } : s))
    );
  };

  const deleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const enrollFace = (id: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, faceEnrolled: true, enrolledDate: new Date().toISOString() }
          : s
      )
    );
  };

  const startSession = (): string => {
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
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(sessionId);
    return sessionId;
  };

  const markAttendance = (studentId: string): boolean => {
    if (!currentSessionId) return false;

    const student = students.find((s) => s.id === studentId);
    if (!student) return false;

    let alreadyMarked = false;
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id === currentSessionId) {
          if (session.attendees.some((a) => a.studentId === studentId)) {
            alreadyMarked = true;
            return session;
          }
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
      })
    );
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
