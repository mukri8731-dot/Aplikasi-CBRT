import { Exam, StudentAnswer, StudentSubmission, User, ViolationRecord } from '../types/exam';

const API_BASE = '/api';

export async function fetchExamsApi(): Promise<Exam[]> {
  try {
    const res = await fetch(`${API_BASE}/exams`);
    if (!res.ok) throw new Error('Gagal memuat ujian dari database');
    return await res.json();
  } catch (err) {
    console.warn('API error, falling back to local cache', err);
    throw err;
  }
}

export async function createExamApi(exam: Exam): Promise<Exam> {
  const res = await fetch(`${API_BASE}/exams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(exam),
  });
  if (!res.ok) throw new Error('Gagal menyimpan ujian ke database');
  return await res.json();
}

export async function updateExamApi(id: string, exam: Partial<Exam>): Promise<Exam> {
  const res = await fetch(`${API_BASE}/exams/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(exam),
  });
  if (!res.ok) throw new Error('Gagal memperbarui ujian di database');
  return await res.json();
}

export async function deleteExamApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/exams/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Gagal menghapus ujian di database');
}

export async function fetchSubmissionsApi(examId?: string): Promise<StudentSubmission[]> {
  try {
    const url = examId
      ? `${API_BASE}/submissions?examId=${examId}&sortBy=score&order=desc`
      : `${API_BASE}/submissions?sortBy=score&order=desc`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Gagal memuat lembar pengerjaan siswa dari database');
    return await res.json();
  } catch (err) {
    console.warn('API error fetching submissions', err);
    throw err;
  }
}

export interface ExamRecapData {
  examId: string;
  examTitle: string;
  examCode: string;
  kkm: number;
  lastRecappedAt?: string;
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

export async function fetchExamRecapApi(examId: string): Promise<ExamRecapData> {
  const res = await fetch(`${API_BASE}/recap/${examId}`);
  if (!res.ok) throw new Error('Gagal memuat rekapitulasi nilai peringkat dari database');
  return await res.json();
}

// Explicitly trigger server recalculation and disk persistence of ranked recap
export async function saveExamRecapApi(examId: string): Promise<{ success: boolean; message: string; recap: ExamRecapData }> {
  const res = await fetch(`${API_BASE}/recap/${examId}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Gagal menyimpan rekap nilai ke database');
  return await res.json();
}

// Fetch all exam recaps
export async function fetchAllRecapsApi(): Promise<{ recaps: Record<string, ExamRecapData>; totalExams: number }> {
  const res = await fetch(`${API_BASE}/recaps`);
  if (!res.ok) throw new Error('Gagal memuat daftar seluruh rekap nilai dari database');
  return await res.json();
}

// Teacher grades or adjusts student score
export async function gradeSubmissionApi(
  submissionId: string,
  score: number,
  passedKkm?: boolean
): Promise<{ success: boolean; submission: StudentSubmission; recap: ExamRecapData }> {
  const res = await fetch(`${API_BASE}/submissions/${submissionId}/grade`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score, passedKkm }),
  });
  if (!res.ok) throw new Error('Gagal memperbarui nilai di database');
  return await res.json();
}

export async function startSubmissionApi(payload: {
  examId: string;
  studentId: string;
  studentName: string;
  studentNisn: string;
  studentClass: string;
}): Promise<{ submission: StudentSubmission; isResumed: boolean }> {
  const res = await fetch(`${API_BASE}/submissions/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Gagal mendaftarkan pengerjaan ke database');
  return await res.json();
}

// Direct Database Autosave (Preserves all answers permanently)
export async function autosaveSubmissionApi(
  submissionId: string,
  answers: Record<string, StudentAnswer>
): Promise<{ success: boolean; answersCount: number; savedAt: string }> {
  const res = await fetch(`${API_BASE}/submissions/${submissionId}/autosave`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) throw new Error('Gagal menyimpan otomatis ke database');
  return await res.json();
}

// Record security violation to database
export async function recordViolationApi(
  submissionId: string,
  violation: ViolationRecord,
  shouldSuspend: boolean
): Promise<{ success: boolean; totalViolations: number; status: string }> {
  const res = await fetch(`${API_BASE}/submissions/${submissionId}/violation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ violation, shouldSuspend }),
  });
  if (!res.ok) throw new Error('Gagal merekam audit log pelanggaran ke database');
  return await res.json();
}

// Proctor unlocks suspended student
export async function unlockSubmissionApi(submissionId: string): Promise<StudentSubmission> {
  const res = await fetch(`${API_BASE}/submissions/${submissionId}/unlock`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Gagal membuka kunci sesi di database');
  const data = await res.json();
  return data.submission;
}

// Final Submit
export async function submitFinalExamApi(
  submissionId: string,
  finalAnswers: Record<string, StudentAnswer>,
  score: number,
  passedKkm: boolean
): Promise<StudentSubmission> {
  const res = await fetch(`${API_BASE}/submissions/${submissionId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ finalAnswers, score, passedKkm }),
  });
  if (!res.ok) throw new Error('Gagal mengirimkan ujian akhir ke database');
  const data = await res.json();
  return data.submission;
}

// Teacher Authentication: Only teachers who know secret credentials can log in
export async function loginTeacherApi(
  username: string,
  password: string
): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/teacher/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Autentikasi guru gagal.');
  }
  return data;
}

// Change Teacher Password
export async function changeTeacherPasswordApi(
  teacherId: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/auth/teacher/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teacherId, oldPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Gagal mengubah kata sandi.');
  }
  return data;
}

// Reset Database API
export async function resetDatabaseApi(): Promise<void> {
  await fetch(`${API_BASE}/reset-database`, { method: 'POST' });
}
