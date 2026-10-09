export type QuestionType = 'multiple_choice' | 'multiple_choice_multi' | 'true_false' | 'short_answer' | 'essay';

export interface QuestionOption {
  id: string; // e.g. "A", "B", "C", "D", "E"
  text: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  passage?: string; // Stimulus wacana atau bacaan literasi/numerasi
  imageUrl?: string; // Gambar stimulus visual / diagram / ilustrasi soal (Base64 atau URL)
  imageCaption?: string; // Keterangan atau sumber gambar
  options?: QuestionOption[]; // Untuk PG dan MCMA (A s/d E)
  correctOptionId?: string; // Untuk PG tunggal
  correctOptionIds?: string[]; // Untuk MCMA (Multiple Choice Multiple Answers / PG Kompleks)
  isTrue?: boolean; // Untuk Benar / Salah
  correctShortAnswerKeywords?: string[]; // Untuk Isian Singkat (case-insensitive)
  essayRubric?: string; // Panduan penilaian uraian
  points: number; // Bobot nilai (default e.g. 10 atau 20)
  explanation?: string; // Pembahasan
}

export interface ExamSettings {
  durationMinutes: number;
  kkm: number; // Kriteria Ketuntasan Minimal (misal 75)
  requireFullscreen: boolean;
  maxViolationsAllowed: number; // e.g. 3
  violationAction: 'suspend' | 'auto_submit' | 'warn_only';
  proctorPin: string; // PIN Guru untuk membuka kunci jika ditangguhkan (e.g. "9922")
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  blockCopyPaste: boolean;
  blockRightClick: boolean;
  showResultToStudent: boolean;
  showExplanationToStudent: boolean;
  preventMultipleSubmissions: boolean;
  autoSaveIntervalSeconds: number; // default 5s
}

export interface Exam {
  id: string;
  code: string; // e.g. "MAT-X-2026"
  pin: string; // PIN siswa untuk masuk (e.g. "8821")
  title: string;
  subject: string;
  gradeClass: string; // e.g. "Kelas X - MIPA"
  teacherName: string;
  teacherId: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  isActive: boolean;
  instructions: string;
  settings: ExamSettings;
  questions: Question[];
  createdAt: string;
}

export type ViolationType = 
  | 'tab_switch'
  | 'window_blur'
  | 'exit_fullscreen'
  | 'copy_paste_attempt'
  | 'context_menu'
  | 'developer_tools_attempt'
  | 'page_reload_attempt';

export interface ViolationRecord {
  id: string;
  timestamp: string; // ISO string
  type: ViolationType;
  description: string;
  questionIndexAtEvent?: number;
}

export interface StudentAnswer {
  questionId: string;
  selectedOptionId?: string; // PG
  selectedOptionIds?: string[]; // Untuk MCMA (Pilihan Ganda Kompleks / Multiple Answers)
  booleanAnswer?: boolean; // Benar / Salah
  shortAnswerText?: string; // Isian singkat
  essayText?: string; // Uraian
  isDoubtful?: boolean; // Ragu-ragu
  updatedAt: string;
}

export type SubmissionStatus = 'in_progress' | 'suspended' | 'submitted' | 'graded';

export interface StudentSubmission {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  studentNisn: string;
  studentClass: string;
  startedAt: string;
  lastActiveAt: string;
  submittedAt?: string;
  status: SubmissionStatus;
  answers: Record<string, StudentAnswer>; // questionId -> answer
  violations: ViolationRecord[];
  isLockedByProctor: boolean;
  score?: number; // 0 - 100
  passedKkm?: boolean;
  gradedByTeacher?: boolean;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  role: 'teacher' | 'student';
  nisn?: string; // Siswa
  nip?: string; // Guru
  gradeClass?: string;
}
