import React, { useState, useMemo } from 'react';
import { Exam, Question, QuestionType, StudentSubmission, User, ViolationRecord } from '../../types/exam';
import { evaluateSubmission } from '../../utils/storage';
import {
  ShieldAlert,
  Users,
  FileText,
  Clock,
  Award,
  Plus,
  Edit,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Search,
  BookOpen,
  Filter,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  Sliders,
  Eye,
  Server,
  Layers,
  HelpCircle,
  LogOut,
  KeyRound,
  ShieldCheck,
  Printer,
  Database,
  Sparkles,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  ZoomIn,
} from 'lucide-react';
import { changeTeacherPasswordApi, saveExamRecapApi, gradeSubmissionApi } from '../../utils/api';
import { WordImportModal } from './WordImportModal';
import { downloadWordExamTemplate } from '../../utils/wordExamTemplate';

interface TeacherDashboardProps {
  exams: Exam[];
  submissions: StudentSubmission[];
  currentUser: User;
  onSaveExams: (updated: Exam[]) => void;
  onSaveSubmissions: (updated: StudentSubmission[]) => void;
  onLogout: () => void;
  onRefreshData?: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  exams,
  submissions,
  currentUser,
  onSaveExams,
  onSaveSubmissions,
  onLogout,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'exams' | 'questions' | 'proctor' | 'grades' | 'docs' | 'account'>('overview');
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected Exam object
  const currentExam = useMemo(() => exams.find((e) => e.id === selectedExamId) || exams[0], [exams, selectedExamId]);

  // Modal states
  const [showExamModal, setShowExamModal] = useState<boolean>(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  const [showQuestionModal, setShowQuestionModal] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const [selectedStudentAudit, setSelectedStudentAudit] = useState<StudentSubmission | null>(null);

  // Teacher Account & Security state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newTeacherUsername, setNewTeacherUsername] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherNip, setNewTeacherNip] = useState('');
  const [newTeacherPass, setNewTeacherPass] = useState('');
  const [teacherCreateMsg, setTeacherCreateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Recap database sync & grading states
  const [recapSyncMsg, setRecapSyncMsg] = useState<{ type: 'success' | 'error'; text: string; time?: string } | null>(null);
  const [isSyncingRecap, setIsSyncingRecap] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [editingGradeSub, setEditingGradeSub] = useState<StudentSubmission | null>(null);
  const [gradeInputScore, setGradeInputScore] = useState<number>(0);
  const [viewingImageModal, setViewingImageModal] = useState<{ url: string; caption?: string } | null>(null);
  const [showWordImportModal, setShowWordImportModal] = useState<boolean>(false);
  const [isDownloadingWordTemplate, setIsDownloadingWordTemplate] = useState<boolean>(false);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);

  const handleSaveRecapToDb = async () => {
    if (!currentExam) return;
    setIsSyncingRecap(true);
    setRecapSyncMsg(null);
    try {
      await saveExamRecapApi(currentExam.id);
      setRecapSyncMsg({
        type: 'success',
        text: `Berhasil! Seluruh rekap nilai ujian [${currentExam.code}] dari nilai tertinggi ke terendah (${rankedSubmissions.length} siswa) telah terekap dan tersimpan permanen di database server.`,
        time: new Date().toLocaleTimeString('id-ID'),
      });
      if (onRefreshData) {
        onRefreshData();
      }
    } catch (err: any) {
      setRecapSyncMsg({
        type: 'error',
        text: err.message || 'Gagal menyimpan rekap nilai ke database server.',
      });
    } finally {
      setIsSyncingRecap(false);
    }
  };

  const handleUpdateGradeScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGradeSub || !currentExam) return;
    try {
      const isPassed = gradeInputScore >= currentExam.settings.kkm;
      await gradeSubmissionApi(editingGradeSub.id, gradeInputScore, isPassed);
      const updated = submissions.map((s) =>
        s.id === editingGradeSub.id
          ? { ...s, score: gradeInputScore, passedKkm: isPassed, status: 'graded' as const, gradedByTeacher: true }
          : s
      );
      onSaveSubmissions(updated);
      setRecapSyncMsg({
        type: 'success',
        text: `Nilai peserta "${editingGradeSub.studentName}" berhasil diperbarui menjadi ${gradeInputScore} dan disinkronkan ke rekap peringkat database.`,
        time: new Date().toLocaleTimeString('id-ID'),
      });
      setEditingGradeSub(null);
    } catch (err: any) {
      alert('Gagal memperbarui nilai di database: ' + err.message);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Konfirmasi kata sandi baru tidak cocok!' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Kata sandi minimal 6 karakter demi keamanan.' });
      return;
    }
    try {
      await changeTeacherPasswordApi(currentUser.id, oldPassword, newPassword);
      setPasswordMsg({ type: 'success', text: 'Kata sandi pengawas berhasil diperbarui di database server!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Gagal mengubah kata sandi.' });
    }
  };

  const handleCreateTeacherAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherCreateMsg(null);
    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newTeacherUsername,
          name: newTeacherName,
          nip: newTeacherNip,
          password: newTeacherPass,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTeacherCreateMsg({
        type: 'success',
        text: `Akun pengawas baru "${newTeacherUsername}" berhasil ditambahkan ke database. Hanya guru tersebut yang dapat mengakses dengan kredensialnya.`,
      });
      setNewTeacherUsername('');
      setNewTeacherName('');
      setNewTeacherNip('');
      setNewTeacherPass('');
    } catch (err: any) {
      setTeacherCreateMsg({ type: 'error', text: err.message || 'Gagal membuat akun pengawas.' });
    }
  };

  // Filter submissions for current exam
  const currentSubmissions = useMemo(() => {
    return submissions.filter((s) => s.examId === selectedExamId);
  }, [submissions, selectedExamId]);

  // Calculate high-level stats
  const stats = useMemo(() => {
    const totalStudents = currentSubmissions.length;
    const activeTaking = currentSubmissions.filter((s) => s.status === 'in_progress').length;
    const suspendedCount = currentSubmissions.filter((s) => s.status === 'suspended').length;
    const finishedCount = currentSubmissions.filter((s) => s.status === 'submitted' || s.status === 'graded').length;

    const scoredSubs = currentSubmissions.filter((s) => s.score !== undefined);
    const avgScore = scoredSubs.length > 0 ? Math.round(scoredSubs.reduce((acc, curr) => acc + (curr.score || 0), 0) / scoredSubs.length) : 0;
    const passedCount = scoredSubs.filter((s) => (s.score || 0) >= (currentExam?.settings.kkm || 75)).length;
    const passRate = scoredSubs.length > 0 ? Math.round((passedCount / scoredSubs.length) * 100) : 0;

    const totalViolations = currentSubmissions.reduce((acc, curr) => acc + (curr.violations?.length || 0), 0);

    return {
      totalStudents,
      activeTaking,
      suspendedCount,
      finishedCount,
      avgScore,
      passRate,
      totalViolations,
    };
  }, [currentSubmissions, currentExam]);

  // Handle Exam Create / Edit save
  const handleSaveExam = (examData: Partial<Exam>) => {
    if (editingExam) {
      // update
      const updated = exams.map((ex) => (ex.id === editingExam.id ? ({ ...ex, ...examData } as Exam) : ex));
      onSaveExams(updated);
    } else {
      // create
      const newExam: Exam = {
        id: `exam-${Date.now()}`,
        code: examData.code || `EXAM-${Math.floor(1000 + Math.random() * 9000)}`,
        pin: examData.pin || `${Math.floor(1000 + Math.random() * 9000)}`,
        title: examData.title || 'Ujian Baru',
        subject: examData.subject || 'Umum',
        gradeClass: examData.gradeClass || 'Kelas X',
        teacherName: currentUser.name,
        teacherId: currentUser.id,
        startTime: examData.startTime || new Date().toISOString(),
        endTime: examData.endTime || new Date(Date.now() + 86400 * 1000 * 7).toISOString(),
        isActive: true,
        instructions:
          examData.instructions ||
          '1. Dilarang meninggalkan jendela ujian.\n2. Wajib mode Fullscreen.\n3. Autosave aktif.',
        settings: examData.settings || {
          durationMinutes: 60,
          kkm: 75,
          requireFullscreen: true,
          maxViolationsAllowed: 3,
          violationAction: 'suspend',
          proctorPin: '9922',
          shuffleQuestions: false,
          shuffleOptions: false,
          blockCopyPaste: true,
          blockRightClick: true,
          showResultToStudent: true,
          showExplanationToStudent: true,
          preventMultipleSubmissions: true,
          autoSaveIntervalSeconds: 5,
        },
        questions: [],
        createdAt: new Date().toISOString(),
      };
      onSaveExams([...exams, newExam]);
      setSelectedExamId(newExam.id);
    }
    setShowExamModal(false);
    setEditingExam(null);
  };

  // Toggle Exam Active Status
  const handleToggleExamActive = (id: string) => {
    const updated = exams.map((ex) => (ex.id === id ? { ...ex, isActive: !ex.isActive } : ex));
    onSaveExams(updated);
  };

  // Delete Exam
  const handleDeleteExam = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus ujian ini beserta seluruh bank soalnya?')) {
      const updated = exams.filter((ex) => ex.id !== id);
      onSaveExams(updated);
      if (selectedExamId === id && updated.length > 0) {
        setSelectedExamId(updated[0].id);
      }
    }
  };

  // Ranked Submissions from Highest to Lowest Score (Nilai Tertinggi ke Terendah)
  const rankedSubmissions = useMemo(() => {
    return [...currentSubmissions].sort((a, b) => {
      const scoreA = a.score !== undefined ? a.score : -1;
      const scoreB = b.score !== undefined ? b.score : -1;
      return scoreB - scoreA;
    });
  }, [currentSubmissions]);

  // Ranking Statistics for Highest, Lowest, Average Score
  const rankingStats = useMemo(() => {
    const finished = rankedSubmissions.filter((s) => s.score !== undefined);
    const highestScore = finished.length > 0 ? finished[0].score : 0;
    const topStudent = finished.length > 0 ? finished[0].studentName : '-';
    const lowestScore = finished.length > 0 ? finished[finished.length - 1].score : 0;
    const avgScore =
      finished.length > 0
        ? Math.round(finished.reduce((acc, curr) => acc + (curr.score || 0), 0) / finished.length)
        : 0;
    const kkm = currentExam?.settings.kkm || 75;
    const passedCount = finished.filter((s) => (s.score || 0) >= kkm).length;
    const passRate = finished.length > 0 ? Math.round((passedCount / finished.length) * 100) : 0;

    return {
      total: rankedSubmissions.length,
      finishedCount: finished.length,
      highestScore,
      topStudent,
      lowestScore,
      avgScore,
      passedCount,
      failedCount: finished.length - passedCount,
      passRate,
    };
  }, [rankedSubmissions, currentExam]);

  // Handle Question Create / Edit save with options up to E
  const handleSaveQuestion = (qData: Partial<Question>) => {
    if (!currentExam) return;

    let updatedQuestions: Question[] = [];
    if (editingQuestion) {
      updatedQuestions = currentExam.questions.map((q) => {
        if (q.id === editingQuestion.id) {
          return {
            ...q,
            ...qData,
            imageUrl: qData.imageUrl !== undefined ? qData.imageUrl : undefined,
            imageCaption: qData.imageUrl ? (qData.imageCaption !== undefined ? qData.imageCaption : undefined) : undefined,
          } as Question;
        }
        return q;
      });
    } else {
      const newQ: Question = {
        id: `q-${Date.now()}`,
        type: qData.type || 'multiple_choice',
        prompt: qData.prompt || 'Pertanyaan baru',
        passage: qData.passage || '',
        imageUrl: qData.imageUrl || undefined,
        imageCaption: qData.imageCaption || undefined,
        points: qData.points || 10,
        options: qData.options || [
          { id: 'A', text: 'Pilihan A' },
          { id: 'B', text: 'Pilihan B' },
          { id: 'C', text: 'Pilihan C' },
          { id: 'D', text: 'Pilihan D' },
          { id: 'E', text: 'Pilihan E' },
        ],
        correctOptionId: qData.correctOptionId || 'A',
        correctOptionIds: qData.correctOptionIds,
        isTrue: qData.isTrue ?? true,
        correctShortAnswerKeywords: qData.correctShortAnswerKeywords || [],
        essayRubric: qData.essayRubric || '',
        explanation: qData.explanation || '',
      };
      updatedQuestions = [...currentExam.questions, newQ];
    }

    const updatedExam = { ...currentExam, questions: updatedQuestions };
    const updatedExamsList = exams.map((ex) => (ex.id === currentExam.id ? updatedExam : ex));
    onSaveExams(updatedExamsList);
    setShowQuestionModal(false);
    setEditingQuestion(null);
  };

  // Download Microsoft Word Question Template
  const handleDownloadWordTemplate = async () => {
    if (!currentExam) return;
    try {
      setIsDownloadingWordTemplate(true);
      await downloadWordExamTemplate(currentExam.title);
    } catch (err) {
      console.error('Failed to generate Word template:', err);
      alert('Gagal membuat template Word.');
    } finally {
      setIsDownloadingWordTemplate(false);
    }
  };

  // Import Questions parsed from Word into Exam
  const handleImportWordQuestions = (newQuestions: Question[], mode: 'append' | 'replace') => {
    if (!currentExam) return;
    const updatedQuestions =
      mode === 'replace' ? newQuestions : [...currentExam.questions, ...newQuestions];
    const updatedExam = { ...currentExam, questions: updatedQuestions };
    const updatedExamsList = exams.map((ex) => (ex.id === currentExam.id ? updatedExam : ex));
    onSaveExams(updatedExamsList);
  };

  // Direct safe delete for Question (used by modal and QuestionFormModal)
  const handleDeleteQuestionDirect = (qId: string) => {
    if (!currentExam) return;
    const updatedQuestions = currentExam.questions.filter((q) => q.id !== qId);
    const updatedExamsList = exams.map((ex) => (ex.id === currentExam.id ? { ...ex, questions: updatedQuestions } : ex));
    onSaveExams(updatedExamsList);
    setQuestionToDelete(null);
  };

  // Delete Question trigger
  const handleDeleteQuestion = (qId: string) => {
    const target = currentExam?.questions.find((q) => q.id === qId);
    if (target) {
      setQuestionToDelete(target);
    } else {
      handleDeleteQuestionDirect(qId);
    }
  };

  // Proctor Actions: Unlock suspended student
  const handleUnlockStudent = (submissionId: string) => {
    const updated = submissions.map((sub) => {
      if (sub.id === submissionId) {
        return {
          ...sub,
          status: 'in_progress' as const,
          isLockedByProctor: false,
          lastActiveAt: new Date().toISOString(),
        };
      }
      return sub;
    });
    onSaveSubmissions(updated);
  };

  // Proctor Action: Force Submit student
  const handleForceSubmitStudent = (submissionId: string) => {
    if (window.confirm('Paksa kumpulkan ujian siswa ini sekarang?')) {
      const targetSub = submissions.find((s) => s.id === submissionId);
      if (!targetSub || !currentExam) return;

      const evalRes = evaluateSubmission(currentExam, targetSub.answers);
      const updated = submissions.map((sub) => {
        if (sub.id === submissionId) {
          return {
            ...sub,
            status: 'submitted' as const,
            submittedAt: new Date().toISOString(),
            score: evalRes.score,
            passedKkm: evalRes.passed,
            isLockedByProctor: false,
          };
        }
        return sub;
      });
      onSaveSubmissions(updated);
    }
  };

  // Export Grades to CSV (Sorted Highest to Lowest Score)
  const handleExportCsv = () => {
    if (!currentExam) return;

    const headers = [
      'Peringkat',
      'Nama Siswa',
      'NISN',
      'Kelas',
      'Nilai Akhir',
      'Status KKM',
      'Keterangan Peringkat',
      'Jumlah Pelanggaran',
      'Status Selesai',
    ];
    const rows = rankedSubmissions.map((s, index) => [
      `"#${index + 1}"`,
      `"${s.studentName}"`,
      `"${s.studentNisn}"`,
      `"${s.studentClass}"`,
      s.score !== undefined ? s.score : 'Belum dinilai',
      s.score !== undefined ? (s.score >= currentExam.settings.kkm ? 'Tuntas' : 'Remedial') : '-',
      s.score !== undefined ? (index === 0 ? 'Nilai Tertinggi' : '') : '',
      s.violations?.length || 0,
      s.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Rekap_Peringkat_Nilai_${currentExam.code}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner and Exam Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span>Dashboard Pengawas & Asesmen Guru</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Pusat Kendali Asesmen Digital
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengawas: <strong className="text-slate-700">{currentUser.name}</strong> • NIP: {currentUser.nip || '-'}
          </p>
        </div>

        {/* Selected Exam Selector Dropdown & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-500 block">Ujian yang Dipilih:</span>
          </div>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                [{ex.code}] {ex.title}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setEditingExam(null);
              setShowExamModal(true);
            }}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
            title="Tambah Paket Ujian"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Ujian</span>
          </button>

          {onRefreshData && (
            <button
              onClick={onRefreshData}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 border border-slate-200 cursor-pointer"
              title="Sinkronkan Data Pengerjaan Siswa dari Server Database"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-[11px]">Sinkronkan DB</span>
            </button>
          )}

          {/* Functional Logout button as requested */}
          <button
            onClick={() => {
              if (window.confirm('Apakah Anda yakin ingin keluar dari Portal Guru & Pengawas?')) {
                onLogout();
              }
            }}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Keluar dari Portal Guru"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex overflow-x-auto gap-1 p-1 bg-slate-200/80 rounded-xl text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'overview' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Ringkasan & Statistik</span>
        </button>

        <button
          onClick={() => setActiveTab('exams')}
          className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'exams' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Manajemen Ujian ({exams.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'questions' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Bank Soal ({currentExam?.questions.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('proctor')}
          className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'proctor' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Eye className="w-4 h-4 text-emerald-600" />
          <span>Pengawas Live ({stats.activeTaking} Aktif)</span>
          {stats.suspendedCount > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
              {stats.suspendedCount} Ditangguhkan
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('grades')}
          className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'grades' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Rekap Nilai & Audit Log</span>
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'docs' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4 text-purple-600" />
          <span>Panduan Teknis & Keamanan</span>
        </button>

        <button
          onClick={() => setActiveTab('account')}
          className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'account' ? 'bg-white text-amber-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <KeyRound className="w-4 h-4 text-amber-600" />
          <span>Keamanan & Akun Guru</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & STATS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Peserta Terdaftar</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                {stats.totalStudents}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {stats.finishedCount} Selesai • {stats.activeTaking} Sedang Mengerjakan
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Rata-rata Nilai</span>
                <Award className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                {stats.avgScore} <span className="text-sm text-slate-400 font-sans">/ 100</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                KKM: <strong className="text-slate-700">{currentExam?.settings.kkm}</strong>
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Tingkat Ketuntasan</span>
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-teal-700 font-mono">
                {stats.passRate}%
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Persentase siswa mencapai KKM
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Total Pelanggaran</span>
                <ShieldAlert className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 font-mono">
                {stats.totalViolations}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {stats.suspendedCount} siswa berstatus ditangguhkan
              </p>
            </div>
          </div>

          {/* Quick Active Exam Card & Status */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
                  Informasi Sesi Aktif
                </span>
                <h3 className="text-lg font-bold text-slate-900">{currentExam?.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mata Pelajaran: <strong>{currentExam?.subject}</strong> | Kelas: {currentExam?.gradeClass}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold ${
                    currentExam?.isActive
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {currentExam?.isActive ? '● Ujian Aktif / Dibuka' : '○ Ujian Dinonaktifkan'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-0.5">Kode Masuk Siswa:</span>
                <span className="font-mono font-bold text-blue-700 text-sm">{currentExam?.code}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-0.5">PIN Token Ujian:</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{currentExam?.pin}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-0.5">PIN Guru Pengawas (Buka Kunci):</span>
                <span className="font-mono font-bold text-rose-700 text-sm">{currentExam?.settings.proctorPin}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-0.5">Durasi Pengerjaan:</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{currentExam?.settings.durationMinutes} Menit</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MANAJEMEN UJIAN */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900">Daftar Paket Ujian & Pengaturan Exam Mode</h2>
            <button
              onClick={() => {
                setEditingExam(null);
                setShowExamModal(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Ujian Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((exam) => (
              <div key={exam.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                      {exam.gradeClass} • {exam.subject}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{exam.title}</h3>
                  </div>
                  <button
                    onClick={() => handleToggleExamActive(exam.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      exam.isActive
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {exam.isActive ? 'Aktif' : 'Nonaktif'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Kode / PIN:</span>
                    <span className="font-mono font-bold text-slate-800">{exam.code} / {exam.pin}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Durasi / KKM:</span>
                    <span className="font-mono font-bold text-slate-800">{exam.settings.durationMinutes}m / {exam.settings.kkm}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Jumlah Soal:</span>
                    <span className="font-mono font-bold text-slate-800">{exam.questions.length} Butir</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                  <span>Fullscreen: <strong>{exam.settings.requireFullscreen ? 'Wajib' : 'Opsional'}</strong></span>
                  <span>Batas Pelanggaran: <strong>{exam.settings.maxViolationsAllowed}x</strong></span>
                  <span>PIN Pengawas: <strong className="font-mono">{exam.settings.proctorPin}</strong></span>
                  <span>Tampilkan Nilai: <strong>{exam.settings.showResultToStudent ? 'Ya' : 'Tidak'}</strong></span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setSelectedExamId(exam.id);
                      setActiveTab('questions');
                    }}
                    className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                  >
                    Kelola Soal ({exam.questions.length}) →
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingExam(exam);
                        setShowExamModal(true);
                      }}
                      className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                      title="Edit Pengaturan Ujian"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteExam(exam.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Hapus Ujian"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: BANK SOAL */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Bank Soal: {currentExam?.title}
              </h2>
              <p className="text-xs text-slate-500">
                Total {currentExam?.questions.length || 0} butir soal terdaftar pada paket ujian ini.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadWordTemplate}
                disabled={isDownloadingWordTemplate}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Unduh Template Soal Microsoft Word (.docx) Resmi CBT"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>{isDownloadingWordTemplate ? 'Menyiapkan...' : 'Unduh Template Word (.docx)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowWordImportModal(true)}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Upload & Impor Soal dari Berkas Microsoft Word (.docx)"
              >
                <Upload className="w-4 h-4 text-indigo-600" />
                <span>Upload Soal Word (.docx)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingQuestion(null);
                  setShowQuestionModal(true);
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Butir Soal</span>
              </button>
            </div>
          </div>

          {currentExam?.questions.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <div>
                <p className="text-sm text-slate-700 font-semibold">Belum ada butir soal pada paket ujian ini.</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bapak/Ibu guru dapat mengunggah soal sekaligus menggunakan template Microsoft Word atau menginput satu per satu.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadWordTemplate}
                  disabled={isDownloadingWordTemplate}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>1. Unduh Template Word (.docx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowWordImportModal(true)}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span>2. Upload Berkas Word</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingQuestion(null);
                    setShowQuestionModal(true);
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Input Manual</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {currentExam?.questions.map((q, idx) => (
                <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-blue-600 text-white text-xs font-bold flex items-center justify-center font-mono">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 uppercase">
                        {q.type === 'multiple_choice' && 'Pilihan Ganda (PG)'}
                        {q.type === 'multiple_choice_multi' && 'Pilihan Ganda Kompleks (MCMA)'}
                        {q.type === 'true_false' && 'Benar / Salah'}
                        {q.type === 'short_answer' && 'Isian Singkat'}
                        {q.type === 'essay' && 'Uraian / Essay'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {q.points} Poin
                      </span>
                      <button
                        onClick={() => {
                          setEditingQuestion(q);
                          setShowQuestionModal(true);
                        }}
                        className="p-1 text-slate-500 hover:text-blue-600 cursor-pointer"
                        title="Edit Soal"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Hapus Soal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {q.passage && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 italic font-serif">
                      <strong className="not-italic text-slate-700 font-sans block mb-0.5 text-[11px]">Wacana / Stimulus:</strong>
                      {q.passage}
                    </div>
                  )}

                  {/* Gambar Stimulus / Ilustrasi Soal jika ada */}
                  {q.imageUrl && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl inline-block max-w-md">
                      <div className="relative group cursor-pointer" onClick={() => setViewingImageModal({ url: q.imageUrl!, caption: q.imageCaption })}>
                        <img
                          src={q.imageUrl}
                          alt={q.imageCaption || 'Gambar Butir Soal'}
                          className="max-h-48 w-auto rounded-lg object-contain bg-white border border-slate-200 group-hover:opacity-90 transition-opacity"
                        />
                        <div className="absolute top-2 right-2 bg-slate-900/80 text-white text-[10px] px-2 py-1 rounded-md flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ZoomIn className="w-3 h-3" />
                          <span>Perbesar</span>
                        </div>
                      </div>
                      {q.imageCaption && (
                        <p className="text-[11px] text-slate-500 italic mt-1.5 font-serif text-center">
                          {q.imageCaption}
                        </p>
                      )}
                    </div>
                  )}

                  <p className="text-sm font-semibold text-slate-900">{q.prompt}</p>

                  {/* Question specific details */}
                  <div className="text-xs text-slate-600">
                    {(q.type === 'multiple_choice' || q.type === 'multiple_choice_multi') && q.options && (
                      <div className="space-y-1.5 mt-2">
                        {q.type === 'multiple_choice_multi' && (
                          <div className="text-[11px] font-semibold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200 inline-flex items-center gap-1.5">
                            <span>Kunci Jawaban (MCMA):</span>
                            <span className="font-bold font-mono">
                              {(q.correctOptionIds && q.correctOptionIds.length > 0
                                ? q.correctOptionIds
                                : [q.correctOptionId || 'A']
                              ).join(', ')}
                            </span>
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {q.options.map((opt) => {
                            const isCorrect =
                              q.type === 'multiple_choice_multi'
                                ? (q.correctOptionIds || (q.correctOptionId ? [q.correctOptionId] : [])).includes(opt.id)
                                : opt.id === q.correctOptionId;
                            return (
                              <div
                                key={opt.id}
                                className={`p-2 rounded-lg border text-xs flex items-center gap-2 ${
                                  isCorrect
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                              >
                                <span className="font-mono font-bold w-4">{opt.id}.</span>
                                <span>{opt.text}</span>
                                {isCorrect && (
                                  <span className="ml-auto text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">
                                    Kunci
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {q.type === 'true_false' && (
                      <div className="mt-1 text-xs">
                        Kunci Jawaban:{' '}
                        <strong className={q.isTrue ? 'text-emerald-700' : 'text-rose-700'}>
                          {q.isTrue ? 'BENAR' : 'SALAH'}
                        </strong>
                      </div>
                    )}

                    {q.type === 'short_answer' && (
                      <div className="mt-1 text-xs">
                        Kata Kunci Pencocokan:{' '}
                        <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-mono">
                          {q.correctShortAnswerKeywords?.join(', ')}
                        </code>
                      </div>
                    )}

                    {q.type === 'essay' && q.essayRubric && (
                      <div className="mt-1 text-[11px] text-slate-500 bg-slate-50 p-2 rounded">
                        Rubrik: {q.essayRubric}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PENGAWAS LIVE (LIVE SUPERVISION) */}
      {activeTab === 'proctor' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Pemantauan Langsung Ruang Ujian (Live Proctoring)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Memantau secara real-time status pengerjaan, progress butir soal, deteksi keluar fullscreen/tab, dan autosave tiap peserta didik.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg text-slate-600 font-medium">
                PIN Pengawas: <strong className="font-mono text-slate-900">{currentExam?.settings.proctorPin}</strong>
              </span>
            </div>
          </div>

          {/* Live Candidates Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3.5">Nama Peserta Didik</th>
                    <th className="p-3.5">Status Pengerjaan</th>
                    <th className="p-3.5">Progress Soal</th>
                    <th className="p-3.5">Pelanggaran</th>
                    <th className="p-3.5">Autosave Terakhir</th>
                    <th className="p-3.5 text-right">Tindakan Pengawas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Belum ada peserta yang memulai sesi ujian ini.
                      </td>
                    </tr>
                  ) : (
                    currentSubmissions.map((sub) => {
                      const totalQ = currentExam?.questions.length || 1;
                      const answeredQ = Object.keys(sub.answers || {}).length;
                      const progressPct = Math.round((answeredQ / totalQ) * 100);
                      const isSuspended = sub.status === 'suspended';

                      return (
                        <tr
                          key={sub.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSuspended ? 'bg-rose-50/50' : ''
                          }`}
                        >
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{sub.studentName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              NISN: {sub.studentNisn} • {sub.studentClass}
                            </div>
                          </td>

                          <td className="p-3.5">
                            {sub.status === 'in_progress' && (
                              <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-semibold text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                                Sedang Mengerjakan
                              </span>
                            )}
                            {sub.status === 'suspended' && (
                              <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full font-bold text-[11px]">
                                <Lock className="w-3 h-3" />
                                Ujian Ditangguhkan
                              </span>
                            )}
                            {(sub.status === 'submitted' || sub.status === 'graded') && (
                              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-semibold text-[11px]">
                                <CheckCircle2 className="w-3 h-3" />
                                Selesai Dikumpulkan
                              </span>
                            )}
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-blue-600 h-full rounded-full"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <span className="font-mono text-slate-700 font-semibold text-[11px]">
                                {answeredQ}/{totalQ}
                              </span>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <button
                              onClick={() => setSelectedStudentAudit(sub)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] cursor-pointer ${
                                (sub.violations?.length || 0) > 0
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                              title="Klik untuk lihat detail audit log"
                            >
                              <ShieldAlert className="w-3 h-3" />
                              <span>{sub.violations?.length || 0} Insiden</span>
                            </button>
                          </td>

                          <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                            {sub.lastActiveAt
                              ? new Date(sub.lastActiveAt).toLocaleTimeString('id-ID')
                              : '-'}
                          </td>

                          <td className="p-3.5 text-right space-x-1.5">
                            {isSuspended && (
                              <button
                                onClick={() => handleUnlockStudent(sub.id)}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                <Unlock className="w-3 h-3" />
                                <span>Buka Kunci</span>
                              </button>
                            )}

                            {sub.status === 'in_progress' && (
                              <button
                                onClick={() => handleForceSubmitStudent(sub.id)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                title="Paksa Kumpulkan Jawaban Siswa"
                              >
                                <span>Paksa Selesai</span>
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedStudentAudit(sub)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] cursor-pointer"
                              title="Lihat Log Audit Siswa"
                            >
                              Detail Log
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: REKAP NILAI & AUDIT LOG */}
      {activeTab === 'grades' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <Database className="w-3 h-3 text-blue-600" />
                  <span>Terekap di Database Server</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  • Urutan Peringkat: <strong>Tertinggi ke Terendah</strong>
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Rekapitulasi Nilai & Peringkat Siswa: {currentExam?.title}
              </h2>
              <p className="text-xs text-slate-500">
                Nilai seluruh peserta diurutkan otomatis dari <strong>peringkat tertinggi ke terendah</strong> dan tersimpan permanen pada disk database (<code>data/db.json</code>). KKM: <strong>{currentExam?.settings.kkm}</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSaveRecapToDb}
                disabled={isSyncingRecap}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Simpan & Sinkronkan Rekapitulasi Nilai ke Pangkalan Data Server"
              >
                {isSyncingRecap ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                <span>Simpan Rekap ke DB</span>
              </button>

              <button
                onClick={() => setShowPrintModal(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Cetak format cetak dokumen resmi hasil ujian"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Rekap Resmi</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Unduh berkas spreadsheet CSV"
              >
                <Download className="w-4 h-4" />
                <span>Ekspor CSV</span>
              </button>
            </div>
          </div>

          {/* Alert Notification if Rekap is saved or synced */}
          {recapSyncMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 border animate-in fade-in ${
                recapSyncMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{recapSyncMsg.text}</span>
              </div>
              {recapSyncMsg.time && (
                <span className="font-mono text-[11px] text-emerald-700 font-semibold shrink-0">
                  Waktu: {recapSyncMsg.time}
                </span>
              )}
            </div>
          )}

          {/* Ringkasan Peringkat Nilai Tertinggi & Terendah */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-xs">
            <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-0.5">
                🏆 Nilai Tertinggi (Juara 1)
              </span>
              <div className="text-xl font-black text-amber-900 font-mono">
                {rankingStats.highestScore} <span className="text-xs font-normal text-amber-700">/ 100</span>
              </div>
              <span className="text-[11px] text-amber-800 truncate block font-medium mt-0.5">
                {rankingStats.topStudent}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-0.5">
                📉 Nilai Terendah
              </span>
              <div className="text-xl font-black text-slate-800 font-mono">
                {rankingStats.lowestScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                KKM: <strong>{currentExam?.settings.kkm}</strong>
              </span>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-xl">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block mb-0.5">
                📊 Rata-Rata Kelas
              </span>
              <div className="text-xl font-black text-blue-900 font-mono">
                {rankingStats.avgScore} <span className="text-xs font-normal text-blue-700">/ 100</span>
              </div>
              <span className="text-[11px] text-blue-800 block mt-0.5">
                {rankingStats.finishedCount} Siswa Dinilai
              </span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-0.5">
                🎯 Tingkat Ketuntasan
              </span>
              <div className="text-xl font-black text-emerald-900 font-mono">
                {rankingStats.passRate}%
              </div>
              <span className="text-[11px] text-emerald-800 block mt-0.5">
                {rankingStats.passedCount} Tuntas • {rankingStats.failedCount} Remedial
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3.5 text-center w-24">Peringkat</th>
                    <th className="p-3.5">Peserta Didik</th>
                    <th className="p-3.5">Nilai Akhir</th>
                    <th className="p-3.5">Status KKM</th>
                    <th className="p-3.5">Pelanggaran</th>
                    <th className="p-3.5">Waktu Submit</th>
                    <th className="p-3.5 text-right">Tindakan Guru</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rankedSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Belum ada peserta yang mengumpulkan ujian ini.
                      </td>
                    </tr>
                  ) : (
                    rankedSubmissions.map((sub, index) => {
                      const score = sub.score !== undefined ? sub.score : 0;
                      const isPassed = score >= (currentExam?.settings.kkm || 75);
                      const isTopRank = index === 0 && sub.score !== undefined;

                      return (
                        <tr
                          key={sub.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isTopRank ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          <td className="p-3.5 text-center font-mono">
                            {index === 0 && sub.score !== undefined && (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                                🏆 Juara 1
                              </span>
                            )}
                            {index === 1 && sub.score !== undefined && (
                              <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-800 border border-slate-300 px-2 py-0.5 rounded-full font-bold text-[11px]">
                                🥈 Peringkat 2
                              </span>
                            )}
                            {index === 2 && sub.score !== undefined && (
                              <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-900 border border-orange-300 px-2 py-0.5 rounded-full font-bold text-[11px]">
                                🥉 Peringkat 3
                              </span>
                            )}
                            {(index > 2 || sub.score === undefined) && (
                              <span className="text-slate-600 font-semibold text-xs bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                                #{index + 1}
                              </span>
                            )}
                          </td>

                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{sub.studentName}</span>
                              {isTopRank && (
                                <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                                  Tertinggi
                                </span>
                              )}
                              {sub.gradedByTeacher && (
                                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-medium">
                                  Diverifikasi Guru
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              NISN: {sub.studentNisn} • {sub.studentClass}
                            </div>
                          </td>

                          <td className="p-3.5 font-mono text-base font-bold text-slate-900">
                            {sub.score !== undefined ? sub.score : '-'}
                          </td>

                          <td className="p-3.5">
                            {sub.score !== undefined ? (
                              isPassed ? (
                                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                                  Tuntas
                                </span>
                              ) : (
                                <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                                  Remedial
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400">Belum Selesai</span>
                            )}
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`font-mono font-semibold px-2 py-0.5 rounded text-[11px] ${
                                (sub.violations?.length || 0) > 0
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {sub.violations?.length || 0} Pelanggaran
                            </span>
                          </td>

                          <td className="p-3.5 text-slate-500 text-[11px]">
                            {sub.submittedAt
                              ? new Date(sub.submittedAt).toLocaleTimeString('id-ID')
                              : 'Sedang Berlangsung'}
                          </td>

                          <td className="p-3.5 text-right space-x-1.5">
                            <button
                              onClick={() => {
                                setEditingGradeSub(sub);
                                setGradeInputScore(sub.score || 0);
                              }}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="Koreksi / sesuaikan nilai ujian siswa ini"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Koreksi Nilai</span>
                            </button>

                            <button
                              onClick={() => setSelectedStudentAudit(sub)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer"
                              title="Lihat Log Audit Kronologis"
                            >
                              Log Audit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PANDUAN TEKNIS & KEAMANAN (COMPREHENSIVE DOCS) */}
      {activeTab === 'docs' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-8 shadow-xs">
          <div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full uppercase">
              Dokumentasi Resmi Sistem
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
              Panduan Teknis, Arsitektur Keamanan & Deployment Produksi
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Standar implementasi asesmen digital aman untuk satuan pendidikan (SD/SMP/SMA/SMK/Madrasah) di Indonesia.
            </p>
          </div>

          {/* Section 1: Keterbatasan Browser & Solusi Kiosk Device */}
          <div className="space-y-3 border-l-4 border-amber-500 pl-4 py-1">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>1. Keterbatasan Web Browser Standar & Rekomendasi Kiosk Mode</span>
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              Sesuai dengan standar konsorsium W3C dan arsitektur sandbox sistem operasi, aplikasi berbasis web (Web Application) berjalan di dalam lingkungan sandbox browser. Browser modern <strong>secara sengaja tidak mengizinkan kode JavaScript untuk memblokir tombol sistem level kernel OS</strong> (seperti tombol <kbd className="bg-slate-100 px-1 border rounded">Windows Key</kbd>, <kbd className="bg-slate-100 px-1 border rounded">Ctrl+Alt+Del</kbd>, tombol Home di smartphone, atau task manager OS) demi alasan privasi dan keamanan pengguna.
            </p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-slate-800 block">Rekomendasi Implementasi Ujian Resmi (High-Stakes):</span>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li>
                  <strong>Safe Exam Browser (SEB):</strong> Untuk PC/Laptop Windows & macOS. Gunakan file konfigurasi <code>.seb</code> yang mengunci task manager, mematikan dual monitor, serta memvalidasi browser exam key melalui HTTP header.
                </li>
                <li>
                  <strong>Google Workspace for Education (Chromebook Kiosk App):</strong> Kunci perangkat Chromebook sekolah ke Single-App Kiosk Mode yang secara fisik mengunci pengguna di halaman ujian tanpa bilah status.
                </li>
                <li>
                  <strong>Android Kiosk / Exambro App:</strong> Menggunakan API <code>startLockTask()</code> (Android Device Owner/Lock Task Mode) yang menonaktifkan tombol Back, Home, dan Recent Apps.
                </li>
              </ul>
            </div>
          </div>

          {/* Section 2: Arsitektur Keamanan Aplikasi AsesmenPRO */}
          <div className="space-y-3 border-l-4 border-blue-600 pl-4 py-1">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-blue-600" />
              <span>2. Mekanisme Proteksi & Deteksi Kecurangan AsesmenPRO</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                <span className="font-bold text-blue-900 block">A. Page Visibility API & Window Blur</span>
                <p>
                  Mendeteksi saat siswa meminimalkan jendela, berganti tab, atau membuka jendela lain (seperti WhatsApp Web atau ChatGPT). Setiap perpindahan dicatat dengan timestamp presisi milidetik.
                </p>
              </div>

              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                <span className="font-bold text-blue-900 block">B. Fullscreen Enforcement</span>
                <p>
                  Memaksa layar penuh saat ujian dimulai. Event <code>fullscreenchange</code> memicu peringatan seketika saat siswa menekan tombol Esc atau keluar dari mode layar penuh.
                </p>
              </div>

              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                <span className="font-bold text-blue-900 block">C. Pencegahan Copy/Paste & Context Menu</span>
                <p>
                  Event <code>copy</code>, <code>cut</code>, <code>paste</code>, dan klik kanan (<code>contextmenu</code>) dicegah secara otomatis untuk mencegah penyebaran soal atau penyalinan jawaban dari luar.
                </p>
              </div>

              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                <span className="font-bold text-blue-900 block">D. Autosave Berkala & Tidak Menghapus Jawaban</span>
                <p>
                  Jawaban disinkronkan setiap 5 detik ke memori lokal dan server. Saat terjadi pelanggaran atau suspensi, seluruh jawaban tetap disimpan aman, melindungi hak siswa dari ketidaksengajaan teknis.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Panduan Deployment Produksi */}
          <div className="space-y-3 border-l-4 border-emerald-600 pl-4 py-1">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-600" />
              <span>3. Panduan Deployment Lingkungan Produksi (Production Setup)</span>
            </h3>
            <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto space-y-2">
              <div className="text-slate-400"># 1. Konfigurasi Container Dockerfile Produksi</div>
              <div>FROM node:20-alpine AS builder</div>
              <div>WORKDIR /app</div>
              <div>COPY package*.json ./ && npm ci</div>
              <div>COPY . . && npm run build</div>
              <div>CMD ["node", "server.js"]</div>
              <div className="pt-2 text-slate-400"># 2. Rekomendasi Header Keamanan Nginx (Reverse Proxy):</div>
              <div>add_header X-Frame-Options "DENY";</div>
              <div>add_header X-Content-Type-Options "nosniff";</div>
              <div>add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';";</div>
            </div>
          </div>

          {/* Section 4: SOP Pengawas Ruang Ujian */}
          <div className="space-y-3 border-l-4 border-purple-600 pl-4 py-1">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              <span>4. Standar Operasional Prosedur (SOP) Guru Pengawas di Ruang Asesmen</span>
            </h3>
            <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-700 leading-relaxed">
              <li>Membagikan Kode Ujian dan PIN Akses setelah seluruh peserta didik duduk di ruang ujian.</li>
              <li>Memastikan peserta didik menyetujui izin Fullscreen saat menekan 'Mulai Ujian'.</li>
              <li>Memantau halaman <strong>Pengawas Live</strong> di laptop pengawas untuk melihat status siswa secara berkala.</li>
              <li>Jika status siswa berubah menjadi <strong>Ujian Ditangguhkan</strong>: hampiri meja siswa, verifikasi alasan keluarnya layar (apakah pop-up antivirus, ketidaksengajaan, atau kesengajaan), lalu masukkan PIN Pengawas atau tekan tombol 'Buka Kunci' pada dashboard.</li>
              <li>Setelah waktu habis, sistem mengunci lembar ujian secara otomatis dan mengirimkan jawaban akhir ke pangkalan data.</li>
            </ol>
          </div>
        </div>
      )}

      {/* TAB 7: KEAMANAN & AKUN GURU (HANYA GURU YANG TAHU) */}
      {activeTab === 'account' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-8 shadow-xs">
          <div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full uppercase">
              Otoritas Terbatas
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
              Keamanan Akun & Kredensial Pengawas
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Kredensial login hanya diketahui oleh guru dan proktor berwenang. Anda dapat mengganti kata sandi atau menambahkan akun proktor pendamping.
            </p>
          </div>

          {/* Current Profile Card */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center">
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Akun Pengawas Aktif</span>
                <span className="text-base font-bold text-slate-900 block">{currentUser.name}</span>
                <span className="text-slate-500 font-mono">NIP: {currentUser.nip || '-'} • Role: Pengawas Utama</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full font-bold text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sesi Terautentikasi</span>
              </span>
              <button
                onClick={() => {
                  if (window.confirm('Keluar dari portal pengawas guru?')) {
                    onLogout();
                  }
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Portal</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Ganti Password */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-sm">Ganti Kata Sandi Pengawas</h3>
              </div>
              <p className="text-xs text-slate-500">
                Ubah kata sandi berkala untuk mencegah siswa atau pihak luar mengakses lembar soal dan kunci jawaban.
              </p>

              {passwordMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    passwordMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <span>{passwordMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kata Sandi Saat Ini</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan kata sandi lama"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kata Sandi Baru</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Konfirmasi Kata Sandi Baru</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Perbarui Kata Sandi Guru
                </button>
              </form>
            </div>

            {/* Form Tambah Guru Pengawas Baru */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Tambah Akun Guru / Proktor Rekan</h3>
              </div>
              <p className="text-xs text-slate-500">
                Daftarkan rekan guru pengawas ruang lain agar dapat masuk dengan akun pribadi masing-masing.
              </p>

              {teacherCreateMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    teacherCreateMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <span>{teacherCreateMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleCreateTeacherAccount} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
                  <input
                    type="text"
                    value={newTeacherName}
                    onChange={(e) => setNewTeacherName(e.target.value)}
                    placeholder="Contoh: Dra. Hj. Siti Rahmawati, M.Pd."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Username Login</label>
                    <input
                      type="text"
                      value={newTeacherUsername}
                      onChange={(e) => setNewTeacherUsername(e.target.value)}
                      placeholder="Contoh: guru_rahma"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">NIP Guru</label>
                    <input
                      type="text"
                      value={newTeacherNip}
                      onChange={(e) => setNewTeacherNip(e.target.value)}
                      placeholder="18 digit NIP"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kata Sandi Pengawas</label>
                  <input
                    type="password"
                    value={newTeacherPass}
                    onChange={(e) => setNewTeacherPass(e.target.value)}
                    placeholder="Kata sandi unik untuk guru ini"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Simpan Akun Guru Baru
                </button>
              </form>
            </div>
          </div>

          {/* Section: Database Status */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600" />
              <span>Status Koneksi Pangkalan Data (Persistent Database):</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Semua data paket ujian, bank butir soal, sesi ujian siswa, jawaban berkala (Autosave per 5 detik), dan catatan audit log tersimpan secara persisten pada disk server di <code>data/db.json</code>. Tidak ada jawaban siswa yang hilang atau terhapus saat terjadi insiden pelanggaran.
            </p>
          </div>
        </div>
      )}

      {/* MODAL: AUDIT LOG DETAIL PER SISWA */}
      {selectedStudentAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Audit Log Integritas: {selectedStudentAudit.studentName}
                </h3>
                <p className="text-xs text-slate-500">
                  NISN: {selectedStudentAudit.studentNisn} • Kelas: {selectedStudentAudit.studentClass}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentAudit(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 overflow-y-auto space-y-3 flex-1">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex justify-between">
                <span>Total Insiden: <strong>{selectedStudentAudit.violations?.length || 0} Kali</strong></span>
                <span>Status Saat Ini: <strong className="uppercase">{selectedStudentAudit.status}</strong></span>
              </div>

              {(!selectedStudentAudit.violations || selectedStudentAudit.violations.length === 0) ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <span>Tidak terdeteksi adanya insiden pelanggaran selama sesi ujian berlangsung.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Kronologi Peristiwa:</span>
                  {selectedStudentAudit.violations.map((v, i) => (
                    <div key={v.id || i} className="p-3 rounded-xl border border-rose-200 bg-rose-50/60 text-xs space-y-1">
                      <div className="flex justify-between items-center font-semibold text-rose-900">
                        <span className="font-mono text-[11px]">
                          #{i + 1} • {new Date(v.timestamp).toLocaleTimeString('id-ID')} WIB
                        </span>
                        <span className="text-[10px] bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full uppercase">
                          {v.type}
                        </span>
                      </div>
                      <p className="text-slate-800">{v.description}</p>
                      {v.questionIndexAtEvent && (
                        <p className="text-[11px] text-slate-500">
                          Posisi saat kejadian: Soal No. {v.questionIndexAtEvent}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              {selectedStudentAudit.status === 'suspended' && (
                <button
                  onClick={() => {
                    handleUnlockStudent(selectedStudentAudit.id);
                    setSelectedStudentAudit(null);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Buka Kunci Siswa Ini
                </button>
              )}
              <button
                onClick={() => setSelectedStudentAudit(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT EXAM */}
      {showExamModal && (
        <ExamFormModal
          isOpen={showExamModal}
          initialExam={editingExam}
          onClose={() => {
            setShowExamModal(false);
            setEditingExam(null);
          }}
          onSave={handleSaveExam}
        />
      )}

      {/* MODAL: CREATE / EDIT QUESTION */}
      {showQuestionModal && (
        <QuestionFormModal
          key={editingQuestion ? editingQuestion.id : 'new-q'}
          isOpen={showQuestionModal}
          initialQuestion={editingQuestion}
          onClose={() => {
            setShowQuestionModal(false);
            setEditingQuestion(null);
          }}
          onSave={handleSaveQuestion}
          onDelete={handleDeleteQuestionDirect}
        />
      )}

      {/* MODAL: KOREKSI NILAI SISWA */}
      {editingGradeSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Koreksi Nilai Peserta Didik</h3>
              </div>
              <button
                onClick={() => setEditingGradeSub(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div className="font-bold text-slate-900">{editingGradeSub.studentName}</div>
              <div className="text-[11px] text-slate-500 font-mono">
                NISN: {editingGradeSub.studentNisn} • {editingGradeSub.studentClass}
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                KKM Ujian: <strong>{currentExam?.settings.kkm}</strong>
              </div>
            </div>

            <form onSubmit={handleUpdateGradeScore} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nilai Akhir Baru (Skala 0 - 100):
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={gradeInputScore}
                  onChange={(e) => setGradeInputScore(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Status KKM: {gradeInputScore >= (currentExam?.settings.kkm || 75) ? (
                    <span className="text-emerald-700 font-bold">TUNTAS</span>
                  ) : (
                    <span className="text-amber-700 font-bold">REMEDIAL</span>
                  )}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingGradeSub(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Simpan Nilai ke DB</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CETAK REKAP NILAI RESMI */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in max-h-[90vh] overflow-y-auto">
            {/* Header Dokumen Resmi Cetak */}
            <div className="text-center pb-4 border-b-2 border-slate-900 mb-6 space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-600">
                KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI
              </h4>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase">
                REKAPITULASI RESMI HASIL ASESMEN DIGITAL & PERINGKAT KELAS
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Sistem Ujian Terproteksi AsesmenPRO • Terverifikasi & Tersimpan di Pangkalan Data Server
              </p>
            </div>

            {/* Identitas Paket Ujian */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-6 font-medium">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Mata Pelajaran:</span>
                <strong className="text-slate-900">{currentExam?.subject}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Paket / Kode Ujian:</span>
                <strong className="text-slate-900">{currentExam?.code}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Sasaran Kelas:</span>
                <strong className="text-slate-900">{currentExam?.gradeClass}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Nilai KKM Minimal:</span>
                <strong className="text-slate-900">{currentExam?.settings.kkm}</strong>
              </div>
            </div>

            {/* Ringkasan Nilai Tertinggi & Terendah */}
            <div className="grid grid-cols-4 gap-2 mb-6 text-center text-xs">
              <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">Nilai Tertinggi</span>
                <span className="text-lg font-black text-amber-900">{rankingStats.highestScore}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-[10px] font-bold text-slate-600 uppercase block">Nilai Terendah</span>
                <span className="text-lg font-black text-slate-800">{rankingStats.lowestScore}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50">
                <span className="text-[10px] font-bold text-blue-800 uppercase block">Rata-Rata</span>
                <span className="text-lg font-black text-blue-900">{rankingStats.avgScore}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Ketuntasan KKM</span>
                <span className="text-lg font-black text-emerald-900">{rankingStats.passRate}%</span>
              </div>
            </div>

            {/* Tabel Peringkat Lengkap */}
            <table className="w-full text-left text-xs border border-slate-300 mb-8">
              <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 uppercase text-[10px]">
                <tr>
                  <th className="p-2 text-center border-r border-slate-300 w-16">Peringkat</th>
                  <th className="p-2 border-r border-slate-300">Nama Peserta Didik</th>
                  <th className="p-2 border-r border-slate-300 w-28">NISN</th>
                  <th className="p-2 border-r border-slate-300 w-24">Kelas</th>
                  <th className="p-2 text-center border-r border-slate-300 w-20">Nilai Akhir</th>
                  <th className="p-2 text-center border-r border-slate-300 w-24">Status KKM</th>
                  <th className="p-2 text-center w-20">Pelanggaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rankedSubmissions.map((s, idx) => {
                  const score = s.score !== undefined ? s.score : 0;
                  const isPassed = score >= (currentExam?.settings.kkm || 75);
                  return (
                    <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-2 text-center font-bold border-r border-slate-200">#{idx + 1}</td>
                      <td className="p-2 font-bold text-slate-900 border-r border-slate-200">{s.studentName}</td>
                      <td className="p-2 font-mono text-slate-700 border-r border-slate-200">{s.studentNisn}</td>
                      <td className="p-2 text-slate-700 border-r border-slate-200">{s.studentClass}</td>
                      <td className="p-2 text-center font-bold font-mono text-slate-900 border-r border-slate-200">{s.score ?? '-'}</td>
                      <td className="p-2 text-center font-bold border-r border-slate-200">
                        {s.score !== undefined ? (isPassed ? 'TUNTAS' : 'REMEDIAL') : 'BELUM SELESAI'}
                      </td>
                      <td className="p-2 text-center font-mono text-slate-600">{s.violations?.length || 0}x</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Kolom Tanda Tangan */}
            <div className="grid grid-cols-2 text-center text-xs pt-4 mb-6">
              <div>
                <p className="text-slate-500 mb-14">Mengetahui,<br />Kepala Satuan Pendidikan</p>
                <p className="font-bold text-slate-900 underline">( .................................................... )</p>
                <p className="text-[10px] text-slate-500">NIP: ............................................</p>
              </div>
              <div>
                <p className="text-slate-500 mb-14">
                  {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />
                  Guru Pengampu / Proktor
                </p>
                <p className="font-bold text-slate-900 underline">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500">NIP: {currentUser.nip || '-'}</p>
              </div>
            </div>

            {/* Tombol Cetak / Tutup */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Lembar Nilai</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LIHAT / ZOOM GAMBAR BUTIR SOAL */}
      {viewingImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-sm text-slate-900">Lihat Gambar Butir Soal</h4>
              </div>
              <button
                onClick={() => setViewingImageModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3 flex flex-col items-center justify-center bg-slate-50 rounded-xl my-3">
              <img
                src={viewingImageModal.url}
                alt={viewingImageModal.caption || 'Gambar Soal'}
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-xs bg-white border border-slate-200"
              />
              {viewingImageModal.caption && (
                <p className="text-xs text-slate-600 italic mt-3 font-serif text-center max-w-xl">
                  {viewingImageModal.caption}
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setViewingImageModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT SOAL DARI MICROSOFT WORD */}
      {showWordImportModal && currentExam && (
        <WordImportModal
          isOpen={showWordImportModal}
          examTitle={currentExam.title}
          currentQuestionsCount={currentExam.questions.length}
          onClose={() => setShowWordImportModal(false)}
          onImport={handleImportWordQuestions}
        />
      )}

      {/* MODAL: KONFIRMASI HAPUS BUTIR SOAL */}
      {questionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Hapus Butir Soal?</h3>
                <p className="text-[11px] text-slate-500">Tindakan ini akan menghapus butir soal dari bank soal paket ujian.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 line-clamp-3 italic">
              "{questionToDelete.prompt}"
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setQuestionToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteQuestionDirect(questionToDelete.id)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold cursor-pointer text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Butir Soal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component: Exam Form Modal
function ExamFormModal({
  isOpen,
  initialExam,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  initialExam: Exam | null;
  onClose: () => void;
  onSave: (examData: Partial<Exam>) => void;
}) {
  const [title, setTitle] = useState(initialExam?.title || '');
  const [subject, setSubject] = useState(initialExam?.subject || '');
  const [gradeClass, setGradeClass] = useState(initialExam?.gradeClass || 'Kelas X');
  const [code, setCode] = useState(initialExam?.code || `EX-${Math.floor(100 + Math.random() * 900)}`);
  const [pin, setPin] = useState(initialExam?.pin || `${Math.floor(1000 + Math.random() * 9000)}`);
  const [durationMinutes, setDurationMinutes] = useState(initialExam?.settings.durationMinutes || 60);
  const [kkm, setKkm] = useState(initialExam?.settings.kkm || 75);
  const [maxViolationsAllowed, setMaxViolationsAllowed] = useState(initialExam?.settings.maxViolationsAllowed || 3);
  const [proctorPin, setProctorPin] = useState(initialExam?.settings.proctorPin || '9922');
  const [requireFullscreen, setRequireFullscreen] = useState(initialExam?.settings.requireFullscreen ?? true);
  const [showResultToStudent, setShowResultToStudent] = useState(initialExam?.settings.showResultToStudent ?? true);
  const [instructions, setInstructions] = useState(
    initialExam?.instructions || '1. Layar penuh wajib aktif.\n2. Dilarang berpindah tab.\n3. Autosave aktif berkala.'
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      subject,
      gradeClass,
      code,
      pin,
      instructions,
      settings: {
        durationMinutes: Number(durationMinutes),
        kkm: Number(kkm),
        requireFullscreen,
        maxViolationsAllowed: Number(maxViolationsAllowed),
        violationAction: 'suspend',
        proctorPin,
        shuffleQuestions: false,
        shuffleOptions: false,
        blockCopyPaste: true,
        blockRightClick: true,
        showResultToStudent,
        showExplanationToStudent: showResultToStudent,
        preventMultipleSubmissions: true,
        autoSaveIntervalSeconds: 5,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">
            {initialExam ? 'Edit Pengaturan Ujian' : 'Buat Paket Ujian Baru'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Judul Ujian / Asesmen</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Asesmen Sumatif Akhir Semester Genap"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mata Pelajaran</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Contoh: Matematika"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Rombel / Kelas</label>
              <input
                type="text"
                value={gradeClass}
                onChange={(e) => setGradeClass(e.target.value)}
                placeholder="Contoh: Kelas X MIPA"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kode Ujian</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-mono font-bold"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">PIN Siswa</label>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-mono font-bold"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Durasi (Menit)</label>
              <input
                type="number"
                min={5}
                max={300}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">KKM Lulus</label>
              <input
                type="number"
                min={0}
                max={100}
                value={kkm}
                onChange={(e) => setKkm(Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-blue-50/60 p-3 rounded-xl border border-blue-200">
            <div>
              <label className="block font-semibold text-blue-900 mb-1">Batas Maksimal Pelanggaran</label>
              <input
                type="number"
                min={1}
                max={10}
                value={maxViolationsAllowed}
                onChange={(e) => setMaxViolationsAllowed(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-blue-300 bg-white font-mono font-bold"
                required
              />
              <span className="text-[10px] text-slate-500">Toleransi sebelum ditangguhkan</span>
            </div>
            <div>
              <label className="block font-semibold text-blue-900 mb-1">PIN Guru Pengawas (Buka Kunci)</label>
              <input
                type="text"
                value={proctorPin}
                onChange={(e) => setProctorPin(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-blue-300 bg-white font-mono font-bold"
                required
              />
              <span className="text-[10px] text-slate-500">Kunci verifikasi proktor</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requireFullscreen}
                onChange={(e) => setRequireFullscreen(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 cursor-pointer"
              />
              <span className="font-medium text-slate-800">Wajibkan Mode Fullscreen saat Mulai Ujian</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showResultToStudent}
                onChange={(e) => setShowResultToStudent(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 cursor-pointer"
              />
              <span className="font-medium text-slate-800">Publikasikan Hasil / Nilai Langsung ke Siswa setelah Submit</span>
            </label>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tata Tertib & Petunjuk Ujian</label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer"
            >
              Simpan Paket Ujian
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Sub-component: Question Form Modal
function QuestionFormModal({
  isOpen,
  initialQuestion,
  onClose,
  onSave,
  onDelete,
}: {
  isOpen: boolean;
  initialQuestion: Question | null;
  onClose: () => void;
  onSave: (qData: Partial<Question>) => void;
  onDelete?: (questionId: string) => void;
}) {
  const [confirmDeleteInForm, setConfirmDeleteInForm] = useState(false);
  const [type, setType] = useState<QuestionType>(initialQuestion?.type || 'multiple_choice');
  const [prompt, setPrompt] = useState(initialQuestion?.prompt || '');
  const [passage, setPassage] = useState(initialQuestion?.passage || '');
  const [points, setPoints] = useState(initialQuestion?.points || 10);
  const [explanation, setExplanation] = useState(initialQuestion?.explanation || '');

  // Image import state
  const [imageUrl, setImageUrl] = useState<string>(initialQuestion?.imageUrl || '');
  const [imageCaption, setImageCaption] = useState<string>(initialQuestion?.imageCaption || '');
  const [imageImportTab, setImageImportTab] = useState<'upload' | 'url' | 'sample'>('upload');
  const [urlInput, setUrlInput] = useState<string>('');
  const [imageError, setImageError] = useState<string>('');
  const [isProcessingImg, setIsProcessingImg] = useState<boolean>(false);

  // Multiple Choice Options (A, B, C, D, E)
  const [optA, setOptA] = useState(
    initialQuestion?.options?.find((o) => o.id === 'A')?.text ?? (initialQuestion ? '' : 'Pilihan Jawaban A')
  );
  const [optB, setOptB] = useState(
    initialQuestion?.options?.find((o) => o.id === 'B')?.text ?? (initialQuestion ? '' : 'Pilihan Jawaban B')
  );
  const [optC, setOptC] = useState(
    initialQuestion?.options?.find((o) => o.id === 'C')?.text ?? (initialQuestion ? '' : 'Pilihan Jawaban C')
  );
  const [optD, setOptD] = useState(
    initialQuestion?.options?.find((o) => o.id === 'D')?.text ?? (initialQuestion ? '' : 'Pilihan Jawaban D')
  );
  const [optE, setOptE] = useState(
    initialQuestion?.options?.find((o) => o.id === 'E')?.text ?? (initialQuestion ? '' : 'Pilihan Jawaban E')
  );
  const [correctOptionId, setCorrectOptionId] = useState(initialQuestion?.correctOptionId || 'A');
  const [correctOptionIds, setCorrectOptionIds] = useState<string[]>(
    initialQuestion?.correctOptionIds ||
      (initialQuestion?.correctOptionId ? [initialQuestion.correctOptionId] : ['A', 'C'])
  );

  // True / False
  const [isTrue, setIsTrue] = useState(initialQuestion?.isTrue ?? true);

  // Short Answer
  const [shortKeywords, setShortKeywords] = useState(initialQuestion?.correctShortAnswerKeywords?.join(', ') || '');

  // Essay
  const [essayRubric, setEssayRubric] = useState(initialQuestion?.essayRubric || '');

  // Sample Educational Diagrams for quick import
  const sampleDiagrams = [
    {
      title: 'Grafik Fungsi / Koordinat',
      caption: 'Gambar 1. Grafik fungsi eksponensial f(x) pada bidang kartesius',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 220" width="100%"><rect width="520" height="220" fill="%23f8fafc" rx="10"/><line x1="40" y1="180" x2="480" y2="180" stroke="%23475569" stroke-width="2"/><line x1="70" y1="20" x2="70" y2="200" stroke="%23475569" stroke-width="2"/><path d="M 70 170 Q 220 160 320 90 T 460 30" fill="none" stroke="%232563eb" stroke-width="3.5"/><circle cx="320" cy="90" r="5" fill="%232563eb"/><circle cx="460" cy="30" r="5" fill="%23dc2626"/><text x="85" y="40" font-family="sans-serif" font-size="12" font-weight="bold" fill="%231e293b">Kurva Eksponensial: f(x) = a^x + c</text><text x="450" y="200" font-family="sans-serif" font-size="11" fill="%2364748b">Sumbu X</text><text x="20" y="30" font-family="sans-serif" font-size="11" fill="%2364748b">Sumbu Y</text></svg>',
    },
    {
      title: 'Geometri / Pythagoras',
      caption: 'Gambar 2. Segitiga siku-siku dengan panjang sisi alas dan tinggi',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 220" width="100%"><rect width="520" height="220" fill="%23f8fafc" rx="10"/><polygon points="120,180 390,180 120,40" fill="%23dbeafe" stroke="%232563eb" stroke-width="3"/><rect x="120" y="160" width="20" height="20" fill="none" stroke="%232563eb" stroke-width="2"/><text x="240" y="200" font-family="sans-serif" font-size="12" font-weight="bold" fill="%231e293b">Alas b = 12 cm</text><text x="45" y="115" font-family="sans-serif" font-size="12" font-weight="bold" fill="%231e293b">Tinggi a = 5 cm</text><text x="280" y="100" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23dc2626">Hipotenusa c = ?</text></svg>',
    },
    {
      title: 'Biologi / Struktur Sel',
      caption: 'Gambar 3. Penampang mikroskopis organel sel biologis',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 220" width="100%"><rect width="520" height="220" fill="%23f8fafc" rx="10"/><ellipse cx="260" cy="110" rx="180" ry="85" fill="%23dcfce7" stroke="%2316a34a" stroke-width="3"/><circle cx="260" cy="110" r="38" fill="%23bbf7d0" stroke="%2315803d" stroke-width="2"/><circle cx="260" cy="110" r="14" fill="%2315803d"/><ellipse cx="170" cy="80" rx="20" ry="10" fill="%23fef08a" stroke="%23ca8a04"/><ellipse cx="350" cy="140" rx="20" ry="10" fill="%23fef08a" stroke="%23ca8a04"/><text x="260" y="180" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="%2314532d">Struktur Sel: Membran, Sitoplasma, Nukleus</text></svg>',
    },
    {
      title: 'Fisika / Rangkaian Listrik',
      caption: 'Gambar 4. Rangkaian paralel hambatan listrik tertutup',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 220" width="100%"><rect width="520" height="220" fill="%23f8fafc" rx="10"/><rect x="80" y="40" width="360" height="130" fill="none" stroke="%23334155" stroke-width="3"/><rect x="220" y="30" width="80" height="20" fill="%23fee2e2" stroke="%23dc2626" stroke-width="2"/><text x="260" y="44" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle" fill="%23991b1b">R1 = 4 Ω</text><rect x="220" y="160" width="80" height="20" fill="%23fee2e2" stroke="%23dc2626" stroke-width="2"/><text x="260" y="174" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle" fill="%23991b1b">R2 = 6 Ω</text><line x1="80" y1="95" x2="80" y2="115" stroke="%232563eb" stroke-width="4"/><text x="50" y="110" font-family="sans-serif" font-size="11" font-weight="bold" fill="%231e40af">V=12V</text><text x="260" y="110" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="%231e293b">Skema Rangkaian Paralel</text></svg>',
    },
  ];

  const processImageFile = (file: File) => {
    setImageError('');
    if (!file.type.startsWith('image/')) {
      setImageError('Berkas harus berupa gambar (PNG, JPG, JPEG, GIF, SVG, atau WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setImageError('Ukuran gambar melebihi batas maksimal 8MB.');
      return;
    }

    setIsProcessingImg(true);
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setImageUrl(canvas.toDataURL('image/jpeg', 0.88));
            if (!imageCaption) {
              const nameClean = (file.name || 'stimulus').replace(/\.[^/.]+$/, '');
              setImageCaption(`Gambar: ${nameClean}`);
            }
            setIsProcessingImg(false);
            return;
          }
        }
        setImageUrl(dataUrl);
        if (!imageCaption) {
          const nameClean = (file.name || 'stimulus').replace(/\.[^/.]+$/, '');
          setImageCaption(`Gambar: ${nameClean}`);
        }
        setIsProcessingImg(false);
      };
      img.onerror = () => {
        setImageUrl(dataUrl);
        setIsProcessingImg(false);
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setImageError('Gagal membaca berkas gambar.');
      setIsProcessingImg(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError('');
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handlePasteImage = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processImageFile(file);
          break;
        }
      }
    }
  };

  const handleApplyUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setImageError('');
    const val = urlInput.trim();
    if (!val) return;
    setImageUrl(val);
    if (!imageCaption) {
      setImageCaption('Gambar ilustrasi dari tautan web');
    }
    setUrlInput('');
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const options = [
      { id: 'A', text: optA },
      { id: 'B', text: optB },
      { id: 'C', text: optC },
      { id: 'D', text: optD },
      { id: 'E', text: optE },
    ];

    const keywords = shortKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const finalImageUrl = (imageUrl || urlInput).trim();

    onSave({
      type,
      prompt,
      passage: passage.trim() || undefined,
      imageUrl: finalImageUrl || undefined,
      imageCaption: finalImageUrl ? (imageCaption.trim() || undefined) : undefined,
      points: Number(points),
      explanation: explanation.trim() || undefined,
      options: (type === 'multiple_choice' || type === 'multiple_choice_multi') ? options : undefined,
      correctOptionId: type === 'multiple_choice' ? correctOptionId : undefined,
      correctOptionIds:
        type === 'multiple_choice_multi'
          ? (correctOptionIds.length > 0 ? correctOptionIds : ['A'])
          : undefined,
      isTrue: type === 'true_false' ? isTrue : undefined,
      correctShortAnswerKeywords: type === 'short_answer' ? keywords : undefined,
      essayRubric: type === 'essay' ? essayRubric : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">
            {initialQuestion ? 'Edit Butir Soal' : 'Tambah Butir Soal Baru'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tipe Butir Soal</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as QuestionType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
              >
                <option value="multiple_choice">Pilihan Ganda (PG)</option>
                <option value="multiple_choice_multi">Pilihan Ganda Kompleks (MCMA / Multiple Answers)</option>
                <option value="true_false">Benar / Salah</option>
                <option value="short_answer">Isian Singkat</option>
                <option value="essay">Uraian / Essay</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bobot Nilai (Poin)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Wacana / Teks Stimulus (Opsional - Gaya Literasi/ANBK)
            </label>
            <textarea
              rows={2}
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
              placeholder="Ketik bacaan atau stimulus literasi jika ada..."
              className="w-full p-2.5 rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700 text-xs">
                Pertanyaan / Soal (Prompt) <span className="text-rose-500">*</span>
              </label>
              {!imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('stimulus-image-menu');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>+ Sisipkan Gambar Soal</span>
                </button>
              )}
            </div>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onPaste={handlePasteImage}
              placeholder="Tuliskan pertanyaan soal... (Anda juga dapat langsung menempelkan gambar dengan Ctrl+V di sini)"
              className="w-full p-2.5 rounded-xl border border-slate-300 font-medium"
              required
            />

            {/* Indikator Langsung Gambar Stimulus pada Soal */}
            {imageUrl && (
              <div className="mt-2.5 p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center gap-3 animate-in fade-in">
                <div className="relative group shrink-0">
                  <img
                    src={imageUrl}
                    alt={imageCaption || 'Gambar Butir Soal'}
                    className="w-16 h-16 rounded-lg object-contain bg-white border border-blue-200 shadow-2xs"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Gambar Stimulus Visual Langsung Muncul di Soal</span>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate mt-0.5 font-medium">
                    {imageCaption || 'Tanpa keterangan caption'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Gambar ini akan langsung tampil di atas teks pertanyaan pada layar ujian siswa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl('');
                    setImageCaption('');
                    setUrlInput('');
                    setImageError('');
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 text-[11px] font-semibold rounded-lg border border-rose-200 shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                  title="Hapus gambar dari butir soal ini"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Hapus</span>
                </button>
              </div>
            )}
          </div>

          {/* MENU IMPORT GAMBAR SOAL */}
          <div id="stimulus-image-menu" className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <label className="font-bold text-slate-800 text-xs">
                  Import / Sisipkan Gambar Soal (Stimulus Visual)
                </label>
              </div>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl('');
                    setImageCaption('');
                    setUrlInput('');
                    setImageError('');
                  }}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-rose-200"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Hapus Gambar</span>
                </button>
              )}
            </div>

            {/* Error Message */}
            {imageError && (
              <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-[11px]">
                {imageError}
              </div>
            )}

            {/* Sub-tabs for Image Source */}
            <div className="grid grid-cols-3 p-1 bg-white rounded-lg border border-slate-200 text-[11px] font-semibold text-center">
              <button
                type="button"
                onClick={() => setImageImportTab('upload')}
                className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  imageImportTab === 'upload' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3 h-3" />
                <span>Upload Berkas</span>
              </button>
              <button
                type="button"
                onClick={() => setImageImportTab('url')}
                className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  imageImportTab === 'url' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LinkIcon className="w-3 h-3" />
                <span>Tautan / URL</span>
              </button>
              <button
                type="button"
                onClick={() => setImageImportTab('sample')}
                className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  imageImportTab === 'sample' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Diagram Contoh</span>
              </button>
            </div>

            {/* Tab 1: Upload File */}
            {imageImportTab === 'upload' && (
              <div className="space-y-2">
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) {
                      processImageFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-400 bg-white rounded-xl p-4 cursor-pointer transition-colors text-center group"
                >
                  <Upload className="w-6 h-6 text-slate-400 group-hover:text-blue-600 mb-1 transition-colors" />
                  <span className="font-semibold text-slate-700 text-xs group-hover:text-blue-600">
                    {isProcessingImg ? 'Memproses berkas gambar...' : 'Klik untuk Unggah atau Tarik (Drag & Drop) Gambar'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Mendukung JPG, PNG, WebP, GIF, SVG (Maks. 8MB, kompresi otomatis) • Bisa tempel Ctrl+V
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onClick={(e) => {
                      (e.target as HTMLInputElement).value = '';
                    }}
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isProcessingImg}
                  />
                </label>
              </div>
            )}

            {/* Tab 2: URL Input */}
            {imageImportTab === 'url' && (
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    if (e.target.value.startsWith('http://') || e.target.value.startsWith('https://') || e.target.value.startsWith('data:image/')) {
                      setImageUrl(e.target.value.trim());
                      if (!imageCaption) setImageCaption('Gambar ilustrasi dari tautan web');
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyUrl();
                    }
                  }}
                  placeholder="https://contoh-domain.com/gambar-soal.png"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs bg-white"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors shrink-0 cursor-pointer"
                >
                  Terapkan URL
                </button>
              </div>
            )}

            {/* Tab 3: Preset Sample Educational Diagrams */}
            {imageImportTab === 'sample' && (
              <div className="grid grid-cols-2 gap-2">
                {sampleDiagrams.map((diag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setImageUrl(diag.url);
                      setImageCaption(diag.caption);
                    }}
                    className="p-2 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-left transition-colors cursor-pointer flex flex-col"
                  >
                    <span className="font-bold text-[11px] text-slate-800">{diag.title}</span>
                    <span className="text-[10px] text-slate-500 truncate">{diag.caption}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Preview Loaded Image & Caption Input */}
            {imageUrl && (
              <div className="pt-2 border-t border-slate-200/80 space-y-2">
                <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Pratinjau Gambar Soal:</span>
                  <span className="text-emerald-600 font-normal">✓ Gambar Siap Digunakan</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center">
                  <img
                    src={imageUrl}
                    alt="Pratinjau Soal"
                    className="max-h-44 w-auto rounded object-contain"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Keterangan Gambar / Caption (Opsional):
                  </label>
                  <input
                    type="text"
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                    placeholder="Contoh: Gambar 1. Grafik fungsi f(x) terhadap waktu"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Form specific to question type */}
          {(type === 'multiple_choice' || type === 'multiple_choice_multi') && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 block">
                  {type === 'multiple_choice_multi'
                    ? 'Pilihan Jawaban (A sampai E) & Multi-Kunci (MCMA):'
                    : 'Pilihan Jawaban (A sampai E) & Kunci:'}
                </span>
                {type === 'multiple_choice_multi' && (
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    MCMA (Pilihan Ganda Kompleks)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] font-bold text-slate-600">Pilihan A:</span>
                  <input
                    type="text"
                    value={optA}
                    onChange={(e) => setOptA(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
                    required
                  />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-600">Pilihan B:</span>
                  <input
                    type="text"
                    value={optB}
                    onChange={(e) => setOptB(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
                    required
                  />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-600">Pilihan C:</span>
                  <input
                    type="text"
                    value={optC}
                    onChange={(e) => setOptC(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
                    required
                  />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-600">Pilihan D:</span>
                  <input
                    type="text"
                    value={optD}
                    onChange={(e) => setOptD(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[11px] font-bold text-slate-600">Pilihan E:</span>
                  <input
                    type="text"
                    value={optE}
                    onChange={(e) => setOptE(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
                    required
                  />
                </div>
              </div>

              {type === 'multiple_choice' ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kunci Jawaban yang Benar (A - E):</label>
                  <select
                    value={correctOptionId}
                    onChange={(e) => setCorrectOptionId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 font-bold bg-white"
                  >
                    <option value="A">Pilihan A</option>
                    <option value="B">Pilihan B</option>
                    <option value="C">Pilihan C</option>
                    <option value="D">Pilihan D</option>
                    <option value="E">Pilihan E</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-2 pt-1 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-800">
                      Kunci Jawaban yang Benar (Pilih satu atau lebih):
                    </label>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Kunci Aktif: {correctOptionIds.length > 0 ? correctOptionIds.join(', ') : 'Belum Dipilih'}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {['A', 'B', 'C', 'D', 'E'].map((optId) => {
                      const isChecked = correctOptionIds.includes(optId);
                      return (
                        <button
                          key={optId}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              if (correctOptionIds.length > 1) {
                                setCorrectOptionIds(correctOptionIds.filter((id) => id !== optId));
                              }
                            } else {
                              setCorrectOptionIds([...correctOptionIds, optId].sort());
                            }
                          }}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            isChecked
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
                          }`}
                        >
                          <span>{optId}</span>
                          {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    * Klik opsi huruf di atas untuk menandai atau membatalkan sebagai kunci jawaban benar (jawaban jamak / MCMA).
                  </p>
                </div>
              )}
            </div>
          )}

          {type === 'true_false' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block font-bold text-slate-700 mb-2">Kunci Jawaban yang Benar:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-700">
                  <input
                    type="radio"
                    name="tf"
                    checked={isTrue === true}
                    onChange={() => setIsTrue(true)}
                  />
                  <span>BENAR</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-700">
                  <input
                    type="radio"
                    name="tf"
                    checked={isTrue === false}
                    onChange={() => setIsTrue(false)}
                  />
                  <span>SALAH</span>
                </label>
              </div>
            </div>
          )}

          {type === 'short_answer' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block font-bold text-slate-700 mb-1">
                Kata Kunci Jawaban Benar (Pisahkan dengan koma jika ada variasi ejaan):
              </label>
              <input
                type="text"
                value={shortKeywords}
                onChange={(e) => setShortKeywords(e.target.value)}
                placeholder="Contoh: fotosintesis, fotosintesa"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                required
              />
            </div>
          )}

          {type === 'essay' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block font-bold text-slate-700 mb-1">Rubrik Panduan Penilaian Guru:</label>
              <textarea
                rows={2}
                value={essayRubric}
                onChange={(e) => setEssayRubric(e.target.value)}
                placeholder="Pedoman pemberian skor untuk pengoreksi..."
                className="w-full p-2.5 rounded-lg border border-slate-300"
              />
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Pembahasan Soal (Akan ditampilkan saat ulasan jika diizinkan)
            </label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Penjelasan langkah kerja atau alasan jawaban benar..."
              className="w-full p-2.5 rounded-xl border border-slate-300"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            {initialQuestion && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirmDeleteInForm) {
                    onDelete(initialQuestion.id);
                    onClose();
                  } else {
                    setConfirmDeleteInForm(true);
                  }
                }}
                className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                  confirmDeleteInForm
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                }`}
                title="Hapus butir soal ini dari bank soal ujian"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{confirmDeleteInForm ? 'Klik Lagi: Yakin Hapus Soal?' : 'Hapus Soal Ini'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPrompt('');
                  setPassage('');
                  setImageUrl('');
                  setImageCaption('');
                  setUrlInput('');
                  setOptA('');
                  setOptB('');
                  setOptC('');
                  setOptD('');
                  setOptE('');
                  setShortKeywords('');
                  setEssayRubric('');
                  setExplanation('');
                  setCorrectOptionIds(['A', 'C']);
                  setCorrectOptionId('A');
                }}
                className="px-3 py-2 text-slate-500 hover:text-rose-600 rounded-xl font-medium text-xs flex items-center gap-1 cursor-pointer transition-colors"
                title="Kosongkan seluruh isian form input soal"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus / Reset Isian</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer"
              >
                Simpan Soal
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
