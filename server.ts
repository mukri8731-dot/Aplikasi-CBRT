import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { INITIAL_EXAMS, INITIAL_SUBMISSIONS, INITIAL_USERS } from './src/data/initialData.ts';
import { Exam, StudentSubmission, User, StudentAnswer, ViolationRecord } from './src/types/exam.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Ensure persistent database directory
const DB_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

interface TeacherAccount {
  id: string;
  username: string;
  name: string;
  nip: string;
  passwordHash: string; // Plain/hashed comparison
  role: 'teacher';
}

export interface ExamRecapRecord {
  examId: string;
  examTitle: string;
  examCode: string;
  kkm: number;
  lastRecappedAt: string;
  stats: {
    totalSubmissions: number;
    finishedCount: number;
    highestScore: number;
    topStudent: string;
    lowestScore: number;
    averageScore: number;
    passedCount: number;
    failedCount: number;
    passRate: number;
  };
  rankings: (StudentSubmission & { rank: number })[];
}

interface DatabaseSchema {
  exams: Exam[];
  submissions: StudentSubmission[];
  teachers: TeacherAccount[];
  auditLogs: {
    id: string;
    timestamp: string;
    studentName: string;
    studentNisn: string;
    examCode: string;
    type: string;
    description: string;
  }[];
  recaps: Record<string, ExamRecapRecord>;
}

const DEFAULT_TEACHERS: TeacherAccount[] = [
  {
    id: 'teacher-1',
    username: 'guru_asesmen',
    name: 'Guru Pengawas / Proktor',
    nip: '19840312 200801 1 009',
    passwordHash: 'GuruProktor2026!',
    role: 'teacher',
  },
  {
    id: 'teacher-2',
    username: 'admin_sekolah',
    name: 'Proktor Asesmen Digital',
    nip: '19890520 201402 1 003',
    passwordHash: 'AdminAsesmen2026#',
    role: 'teacher',
  },
];

function saveDatabase(data: DatabaseSchema) {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save database to disk:', err);
  }
}

// Compute ranked recap (from highest to lowest score) and persist to database
function computeAndSaveExamRecap(examId: string): ExamRecapRecord | null {
  const exam = db.exams.find((e) => e.id === examId);
  if (!exam) return null;

  // Filter and rank submissions from highest to lowest score
  const subs = db.submissions
    .filter((s) => s.examId === examId)
    .sort((a, b) => {
      const scoreA = a.score !== undefined ? a.score : -1;
      const scoreB = b.score !== undefined ? b.score : -1;
      return scoreB - scoreA;
    });

  const ranked = subs.map((s, index) => ({
    rank: index + 1,
    ...s,
  }));

  const finished = ranked.filter((s) => s.score !== undefined);
  const highestScore = finished.length > 0 ? finished[0].score || 0 : 0;
  const topStudent = finished.length > 0 ? finished[0].studentName : '-';
  const lowestScore = finished.length > 0 ? finished[finished.length - 1].score || 0 : 0;
  const averageScore =
    finished.length > 0
      ? Math.round(finished.reduce((acc, curr) => acc + (curr.score || 0), 0) / finished.length)
      : 0;
  const passedCount = finished.filter((s) => (s.score || 0) >= exam.settings.kkm).length;

  const recapRecord: ExamRecapRecord = {
    examId,
    examTitle: exam.title,
    examCode: exam.code,
    kkm: exam.settings.kkm,
    lastRecappedAt: new Date().toISOString(),
    stats: {
      totalSubmissions: ranked.length,
      finishedCount: finished.length,
      highestScore,
      topStudent,
      lowestScore,
      averageScore,
      passedCount,
      failedCount: finished.length - passedCount,
      passRate: finished.length > 0 ? Math.round((passedCount / finished.length) * 100) : 0,
    },
    rankings: ranked,
  };

  if (!db.recaps) {
    db.recaps = {};
  }
  db.recaps[examId] = recapRecord;
  saveDatabase(db);
  return recapRecord;
}

// Initialize and load database
function initDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      // Ensure structure integrity
      const loaded: DatabaseSchema = {
        exams: parsed.exams || INITIAL_EXAMS,
        submissions: parsed.submissions || INITIAL_SUBMISSIONS,
        teachers: parsed.teachers || DEFAULT_TEACHERS,
        auditLogs: parsed.auditLogs || [],
        recaps: parsed.recaps || {},
      };
      return loaded;
    }
  } catch (err) {
    console.error('Failed to load database file, initializing defaults:', err);
  }

  const initialDb: DatabaseSchema = {
    exams: INITIAL_EXAMS,
    submissions: INITIAL_SUBMISSIONS,
    teachers: DEFAULT_TEACHERS,
    auditLogs: [],
    recaps: {},
  };
  saveDatabase(initialDb);
  return initialDb;
}

let db = initDatabase();

// Ensure recaps are computed and saved on startup
for (const exam of db.exams) {
  computeAndSaveExamRecap(exam.id);
}

// ==========================================
// API ROUTES
// ==========================================

// Health / Status
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    examsCount: db.exams.length,
    submissionsCount: db.submissions.length,
    timestamp: new Date().toISOString(),
  });
});

// Teacher Auth: Login (Only teachers with correct credentials know and can access)
app.post('/api/auth/teacher/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan kata sandi wajib diisi.' });
  }

  const teacher = db.teachers.find(
    (t) =>
      (t.username.toLowerCase() === username.trim().toLowerCase() ||
        t.nip.replace(/\s+/g, '') === username.trim().replace(/\s+/g, '')) &&
      t.passwordHash === password.trim()
  );

  if (!teacher) {
    return res.status(401).json({
      error: 'Autentikasi gagal! Nama pengguna atau kata sandi pengawas keliru.',
    });
  }

  // Create session token
  const token = `tok_${Date.now()}_${Buffer.from(teacher.id).toString('base64')}`;

  return res.json({
    token,
    user: {
      id: teacher.id,
      name: teacher.name,
      nip: teacher.nip,
      username: teacher.username,
      role: 'teacher',
    },
  });
});

// Teacher Auth: Change Password
app.post('/api/auth/teacher/change-password', (req: Request, res: Response) => {
  const { teacherId, oldPassword, newPassword } = req.body;
  if (!teacherId || !oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Parameter perubahan password tidak lengkap.' });
  }

  const teacherIndex = db.teachers.findIndex((t) => t.id === teacherId);
  if (teacherIndex === -1) {
    return res.status(404).json({ error: 'Akun pengawas tidak ditemukan.' });
  }

  if (db.teachers[teacherIndex].passwordHash !== oldPassword) {
    return res.status(401).json({ error: 'Kata sandi lama tidak cocok.' });
  }

  db.teachers[teacherIndex].passwordHash = newPassword;
  saveDatabase(db);

  return res.json({ success: true, message: 'Kata sandi berhasil diperbarui.' });
});

// Teacher: Get teacher accounts list (for administration)
app.get('/api/teachers', (req: Request, res: Response) => {
  const sanitized = db.teachers.map((t) => ({
    id: t.id,
    username: t.username,
    name: t.name,
    nip: t.nip,
    role: t.role,
  }));
  res.json(sanitized);
});

// Teacher: Add new authorized teacher account
app.post('/api/teachers', (req: Request, res: Response) => {
  const { username, name, nip, password } = req.body;
  if (!username || !name || !password) {
    return res.status(400).json({ error: 'Username, nama, dan password wajib diisi.' });
  }

  if (db.teachers.some((t) => t.username.toLowerCase() === username.trim().toLowerCase())) {
    return res.status(400).json({ error: 'Nama pengguna tersebut sudah terdaftar.' });
  }

  const newTeacher: TeacherAccount = {
    id: `teacher-${Date.now()}`,
    username: username.trim(),
    name: name.trim(),
    nip: nip ? nip.trim() : '-',
    passwordHash: password.trim(),
    role: 'teacher',
  };

  db.teachers.push(newTeacher);
  saveDatabase(db);

  res.json({ success: true, user: newTeacher });
});

// Exams: Get all
app.get('/api/exams', (req: Request, res: Response) => {
  res.json(db.exams);
});

// Exams: Create
app.post('/api/exams', (req: Request, res: Response) => {
  const exam: Exam = req.body;
  if (!exam.id) {
    exam.id = `exam-${Date.now()}`;
  }
  db.exams.push(exam);
  saveDatabase(db);
  res.status(201).json(exam);
});

// Exams: Update
app.put('/api/exams/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db.exams.findIndex((e) => e.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Ujian tidak ditemukan.' });
  }
  db.exams[index] = { ...db.exams[index], ...req.body };
  saveDatabase(db);
  res.json(db.exams[index]);
});

// Exams: Delete
app.delete('/api/exams/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.exams = db.exams.filter((e) => e.id !== id);
  saveDatabase(db);
  res.json({ success: true });
});

// Submissions: Get all or by exam
app.get('/api/submissions', (req: Request, res: Response) => {
  const { examId, studentId, sortBy, order } = req.query;
  let list = [...db.submissions];
  if (examId) {
    list = list.filter((s) => s.examId === examId);
  }
  if (studentId) {
    list = list.filter((s) => s.studentId === studentId);
  }

  // Sort by score descending (highest to lowest) if requested
  if (sortBy === 'score') {
    list.sort((a, b) => {
      const scoreA = a.score !== undefined ? a.score : -1;
      const scoreB = b.score !== undefined ? b.score : -1;
      return order === 'asc' ? scoreA - scoreB : scoreB - scoreA;
    });
  }

  res.json(list);
});

// Submissions: GET RANKED RECAP (Sorted highest to lowest score)
app.get('/api/recap/:examId', (req: Request, res: Response) => {
  const { examId } = req.params;
  const exam = db.exams.find((e) => e.id === examId);
  if (!exam) {
    return res.status(404).json({ error: 'Ujian tidak ditemukan.' });
  }

  // Ensure fresh computation from database
  const recap = computeAndSaveExamRecap(examId);
  if (!recap) {
    return res.status(404).json({ error: 'Gagal menyusun rekap nilai.' });
  }

  res.json(recap);
});

// Submissions: SAVE & SYNC RANKED RECAP EXPLICITLY TO DATABASE
app.post('/api/recap/:examId/save', (req: Request, res: Response) => {
  const { examId } = req.params;
  const exam = db.exams.find((e) => e.id === examId);
  if (!exam) {
    return res.status(404).json({ error: 'Ujian tidak ditemukan.' });
  }

  const recap = computeAndSaveExamRecap(examId);
  res.json({
    success: true,
    message: `Rekap nilai ujian [${exam.code}] dari nilai tertinggi ke terendah berhasil disimpan ke database.`,
    recap,
    savedToDb: true,
    timestamp: new Date().toISOString(),
  });
});

// All recaps across all exams in the database
app.get('/api/recaps', (req: Request, res: Response) => {
  // Ensure all exams have current recaps
  for (const ex of db.exams) {
    if (!db.recaps[ex.id]) {
      computeAndSaveExamRecap(ex.id);
    }
  }
  res.json({
    recaps: db.recaps,
    totalExams: db.exams.length,
    timestamp: new Date().toISOString(),
  });
});

// Submissions: Start or get existing submission
app.post('/api/submissions/start', (req: Request, res: Response) => {
  const { examId, studentId, studentName, studentNisn, studentClass } = req.body;
  if (!examId || !studentName) {
    return res.status(400).json({ error: 'Data pendaftaran ujian tidak lengkap.' });
  }

  // Find if already exists
  let sub = db.submissions.find(
    (s) => s.examId === examId && (s.studentId === studentId || s.studentNisn === studentNisn)
  );

  if (sub) {
    return res.json({ submission: sub, isResumed: true });
  }

  // Create new persistent submission record
  const newSub: StudentSubmission = {
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    examId,
    studentId: studentId || `std_${Date.now()}`,
    studentName,
    studentNisn: studentNisn || '-',
    studentClass: studentClass || 'Siswa',
    startedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    status: 'in_progress',
    answers: {},
    violations: [],
    isLockedByProctor: false,
  };

  db.submissions.push(newSub);
  saveDatabase(db);

  return res.status(201).json({ submission: newSub, isResumed: false });
});

// Submissions: AUTOSAVE (Direct real-time persistence of student work)
app.put('/api/submissions/:id/autosave', (req: Request, res: Response) => {
  const { id } = req.params;
  const { answers } = req.body;

  const sub = db.submissions.find((s) => s.id === id);
  if (!sub) {
    return res.status(404).json({ error: 'Lembar pengerjaan tidak ditemukan di server.' });
  }

  // Merge answers safely - NEVER wipe existing answers
  sub.answers = { ...sub.answers, ...answers };
  sub.lastActiveAt = new Date().toISOString();
  saveDatabase(db);

  return res.json({
    success: true,
    answersCount: Object.keys(sub.answers).length,
    savedAt: sub.lastActiveAt,
  });
});

// Submissions: RECORD VIOLATION (Real-time security log persistence)
app.post('/api/submissions/:id/violation', (req: Request, res: Response) => {
  const { id } = req.params;
  const { violation, shouldSuspend } = req.body;

  const sub = db.submissions.find((s) => s.id === id);
  if (!sub) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  if (!sub.violations) {
    sub.violations = [];
  }

  const record: ViolationRecord = {
    id: violation.id || `v_${Date.now()}`,
    timestamp: violation.timestamp || new Date().toISOString(),
    type: violation.type,
    description: violation.description,
    questionIndexAtEvent: violation.questionIndexAtEvent,
  };

  sub.violations.push(record);
  sub.lastActiveAt = new Date().toISOString();

  if (shouldSuspend) {
    sub.status = 'suspended';
    sub.isLockedByProctor = true;
  }

  // Also log into global audit log
  const targetExam = db.exams.find((e) => e.id === sub.examId);
  db.auditLogs.push({
    id: record.id,
    timestamp: record.timestamp,
    studentName: sub.studentName,
    studentNisn: sub.studentNisn,
    examCode: targetExam?.code || 'EXAM',
    type: record.type,
    description: record.description,
  });

  saveDatabase(db);

  return res.json({
    success: true,
    totalViolations: sub.violations.length,
    status: sub.status,
  });
});

// Submissions: UNLOCK by teacher
app.post('/api/submissions/:id/unlock', (req: Request, res: Response) => {
  const { id } = req.params;
  const sub = db.submissions.find((s) => s.id === id);
  if (!sub) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  sub.status = 'in_progress';
  sub.isLockedByProctor = false;
  sub.lastActiveAt = new Date().toISOString();
  saveDatabase(db);

  return res.json({ success: true, submission: sub });
});

// Submissions: SUBMIT FINAL (Finish exam & automatically persist ranked recap to DB)
app.post('/api/submissions/:id/submit', (req: Request, res: Response) => {
  const { id } = req.params;
  const { finalAnswers, score, passedKkm } = req.body;

  const sub = db.submissions.find((s) => s.id === id);
  if (!sub) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  if (finalAnswers) {
    sub.answers = { ...sub.answers, ...finalAnswers };
  }

  sub.status = 'submitted';
  sub.submittedAt = new Date().toISOString();
  sub.lastActiveAt = sub.submittedAt;
  if (score !== undefined) {
    sub.score = score;
  }
  if (passedKkm !== undefined) {
    sub.passedKkm = passedKkm;
  }

  // Persist submission
  saveDatabase(db);

  // Automatically update and persist ranked recap for this exam from highest to lowest score
  const updatedRecap = computeAndSaveExamRecap(sub.examId);

  return res.json({ success: true, submission: sub, recap: updatedRecap });
});

// Submissions: GRADE or REVISE SCORE by teacher (Persists to database & updates ranked recap)
app.put('/api/submissions/:id/grade', (req: Request, res: Response) => {
  const { id } = req.params;
  const { score, passedKkm, notes } = req.body;

  const sub = db.submissions.find((s) => s.id === id);
  if (!sub) {
    return res.status(404).json({ error: 'Data pengerjaan siswa tidak ditemukan.' });
  }

  if (score !== undefined) {
    sub.score = Math.max(0, Math.min(100, Number(score)));
  }
  if (passedKkm !== undefined) {
    sub.passedKkm = Boolean(passedKkm);
  } else {
    const exam = db.exams.find((e) => e.id === sub.examId);
    if (exam && sub.score !== undefined) {
      sub.passedKkm = sub.score >= exam.settings.kkm;
    }
  }

  sub.status = 'graded';
  sub.gradedByTeacher = true;
  sub.lastActiveAt = new Date().toISOString();

  saveDatabase(db);

  // Update and re-sort ranked recap in database
  const updatedRecap = computeAndSaveExamRecap(sub.examId);

  return res.json({
    success: true,
    message: `Nilai siswa ${sub.studentName} berhasil diperbarui menjadi ${sub.score} dan disinkronkan ke rekap peringkat database.`,
    submission: sub,
    recap: updatedRecap,
  });
});

// Reset database to default
app.post('/api/reset-database', (req: Request, res: Response) => {
  db = {
    exams: INITIAL_EXAMS,
    submissions: INITIAL_SUBMISSIONS,
    teachers: DEFAULT_TEACHERS,
    auditLogs: [],
    recaps: {},
  };
  for (const ex of db.exams) {
    computeAndSaveExamRecap(ex.id);
  }
  saveDatabase(db);
  res.json({ success: true, message: 'Database reset to initial demo state with ranked recaps.' });
});

// ==========================================
// VITE DEV MIDDLEWARE / STATIC SERVING
// ==========================================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[AsesmenPRO] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[AsesmenPRO] Persistent database connected at: ${DB_FILE}`);
  });
}

startServer();
