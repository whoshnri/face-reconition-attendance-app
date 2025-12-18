import * as SQLite from "expo-sqlite";

// Types
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

// Database instance
let db: SQLite.SQLiteDatabase | null = null;

export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (db) return db;
    db = await SQLite.openDatabaseAsync("faceattend.db");
    await initializeTables();
    return db;
}

async function initializeTables() {
    if (!db) throw new Error("Database not initialized");

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      studentId TEXT NOT NULL UNIQUE,
      faceEnrolled INTEGER DEFAULT 0,
      enrolledDate TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      presentCount INTEGER DEFAULT 0,
      totalCount INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId TEXT NOT NULL,
      studentId TEXT NOT NULL,
      name TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (sessionId) REFERENCES sessions(id),
      FOREIGN KEY (studentId) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS face_embeddings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentId TEXT NOT NULL UNIQUE,
      embedding TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE
    );
  `);
}

// Face Embedding CRUD
export type FaceEmbedding = {
    studentId: string;
    embedding: number[];
    createdAt: string;
};

export async function saveFaceEmbedding(
    studentId: string,
    embedding: number[],
): Promise<void> {
    const database = await openDatabase();
    const createdAt = new Date().toISOString();
    const embeddingJson = JSON.stringify(embedding);

    // Use INSERT OR REPLACE to handle re-enrollment
    await database.runAsync(
        `INSERT OR REPLACE INTO face_embeddings (studentId, embedding, createdAt) VALUES (?, ?, ?)`,
        studentId,
        embeddingJson,
        createdAt,
    );
}

export async function getFaceEmbedding(
    studentId: string,
): Promise<FaceEmbedding | null> {
    const database = await openDatabase();
    const row = await database.getFirstAsync<{
        studentId: string;
        embedding: string;
        createdAt: string;
    }>("SELECT studentId, embedding, createdAt FROM face_embeddings WHERE studentId = ?", studentId);

    if (!row) return null;
    return {
        studentId: row.studentId,
        embedding: JSON.parse(row.embedding),
        createdAt: row.createdAt,
    };
}

export async function getAllFaceEmbeddings(): Promise<FaceEmbedding[]> {
    const database = await openDatabase();
    const rows = await database.getAllAsync<{
        studentId: string;
        embedding: string;
        createdAt: string;
    }>("SELECT studentId, embedding, createdAt FROM face_embeddings");

    return rows.map((row) => ({
        studentId: row.studentId,
        embedding: JSON.parse(row.embedding),
        createdAt: row.createdAt,
    }));
}

export async function deleteFaceEmbedding(studentId: string): Promise<void> {
    const database = await openDatabase();
    await database.runAsync("DELETE FROM face_embeddings WHERE studentId = ?", studentId);
}

// Student CRUD
export async function getAllStudents(): Promise<Student[]> {
    const database = await openDatabase();
    const rows = await database.getAllAsync<{
        id: string;
        name: string;
        studentId: string;
        faceEnrolled: number;
        enrolledDate: string | null;
        createdAt: string;
    }>("SELECT * FROM students ORDER BY createdAt DESC");

    return rows.map((row) => ({
        ...row,
        faceEnrolled: row.faceEnrolled === 1,
        enrolledDate: row.enrolledDate ?? undefined,
    }));
}

export async function addStudent(
    id: string,
    name: string,
    studentId: string,
    createdAt: string,
): Promise<void> {
    const database = await openDatabase();
    await database.runAsync(
        "INSERT INTO students (id, name, studentId, faceEnrolled, createdAt) VALUES (?, ?, ?, 0, ?)",
        id,
        name,
        studentId,
        createdAt,
    );
}

export async function updateStudent(
    id: string,
    name: string,
    studentId: string,
): Promise<void> {
    const database = await openDatabase();
    await database.runAsync(
        "UPDATE students SET name = ?, studentId = ? WHERE id = ?",
        name,
        studentId,
        id,
    );
}

export async function deleteStudent(id: string): Promise<void> {
    const database = await openDatabase();
    await database.runAsync("DELETE FROM students WHERE id = ?", id);
}

export async function enrollFace(
    id: string,
    enrolledDate: string,
): Promise<void> {
    const database = await openDatabase();
    await database.runAsync(
        "UPDATE students SET faceEnrolled = 1, enrolledDate = ? WHERE id = ?",
        enrolledDate,
        id,
    );
}

// Session CRUD
export async function getAllSessions(): Promise<AttendanceSession[]> {
    const database = await openDatabase();
    const sessions = await database.getAllAsync<{
        id: string;
        date: string;
        time: string;
        presentCount: number;
        totalCount: number;
    }>("SELECT * FROM sessions ORDER BY date DESC, time DESC");

    const result: AttendanceSession[] = [];
    for (const session of sessions) {
        const attendees = await database.getAllAsync<AttendanceRecord>(
            "SELECT studentId, name, timestamp FROM attendance_records WHERE sessionId = ?",
            session.id,
        );
        result.push({ ...session, attendees });
    }
    return result;
}

export async function addSession(
    id: string,
    date: string,
    time: string,
    totalCount: number,
): Promise<void> {
    const database = await openDatabase();
    await database.runAsync(
        "INSERT INTO sessions (id, date, time, presentCount, totalCount) VALUES (?, ?, ?, 0, ?)",
        id,
        date,
        time,
        totalCount,
    );
}

export async function markAttendance(
    sessionId: string,
    studentId: string,
    name: string,
    timestamp: string,
): Promise<void> {
    const database = await openDatabase();
    await database.runAsync(
        "INSERT INTO attendance_records (sessionId, studentId, name, timestamp) VALUES (?, ?, ?, ?)",
        sessionId,
        studentId,
        name,
        timestamp,
    );
    await database.runAsync(
        "UPDATE sessions SET presentCount = presentCount + 1 WHERE id = ?",
        sessionId,
    );
}

export async function isAlreadyMarked(
    sessionId: string,
    studentId: string,
): Promise<boolean> {
    const database = await openDatabase();
    const result = await database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM attendance_records WHERE sessionId = ? AND studentId = ?",
        sessionId,
        studentId,
    );
    return (result?.count ?? 0) > 0;
}
