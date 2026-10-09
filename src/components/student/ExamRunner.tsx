import React, { useState, useEffect, useMemo } from 'react';
import { Exam, StudentAnswer, StudentSubmission, User, ViolationRecord } from '../../types/exam';
import { useExamSecurity } from '../../hooks/useExamSecurity';
import { ExamWarningModal } from './ExamWarningModal';
import { ExamSuspendedModal } from './ExamSuspendedModal';
import { autosaveSubmissionApi, recordViolationApi, submitFinalExamApi } from '../../utils/api';
import { evaluateSubmission } from '../../utils/storage';
import {
  Clock,
  Save,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  HelpCircle,
  Send,
  ZoomIn,
  ZoomOut,
  ShieldCheck,
  ShieldAlert,
  X,
  Image as ImageIcon,
} from 'lucide-react';

interface ExamRunnerProps {
  exam: Exam;
  student: User;
  submission: StudentSubmission;
  onUpdateSubmission: (updated: StudentSubmission) => void;
  onSubmitExam: (finalSubmission: StudentSubmission) => void;
}

export const ExamRunner: React.FC<ExamRunnerProps> = ({
  exam,
  student,
  submission,
  onUpdateSubmission,
  onSubmitExam,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>(submission.answers || {});
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState<boolean>(false);
  const [isSuspended, setIsSuspended] = useState<boolean>(submission.status === 'suspended');
  const [imageZoomUrl, setImageZoomUrl] = useState<{ url: string; caption?: string } | null>(null);

  // Timer: calculate remaining seconds
  const totalDurationSeconds = exam.settings.durationMinutes * 60;
  const startedAtMs = useMemo(() => new Date(submission.startedAt).getTime(), [submission.startedAt]);

  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(() => {
    const elapsedSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
    return Math.max(0, totalDurationSeconds - elapsedSeconds);
  });

  // Handle Exam Security Hook
  const {
    violations,
    violationCount,
    isFullscreen,
    enterFullscreen,
    warningMessage,
    showWarningModal,
    dismissWarningModal,
    lastSavedTime,
    isSaving,
  } = useExamSecurity({
    exam,
    studentId: student.id,
    currentQuestionIndex: currentIndex,
    answers,
    initialViolations: submission.violations || [],
    onViolationOccurred: (record) => {
      const updatedSub: StudentSubmission = {
        ...submission,
        violations: [...(submission.violations || []), record],
        lastActiveAt: new Date().toISOString(),
      };
      onUpdateSubmission(updatedSub);
      // Persist violation log directly to database
      recordViolationApi(submission.id, record, false).catch((err) =>
        console.warn('DB violation log failed:', err)
      );
    },
    onMaxViolationsExceeded: () => {
      setIsSuspended(true);
      const updatedSub: StudentSubmission = {
        ...submission,
        status: 'suspended',
        isLockedByProctor: true,
        lastActiveAt: new Date().toISOString(),
      };
      onUpdateSubmission(updatedSub);
      // Persist suspension directly to database
      recordViolationApi(
        submission.id,
        {
          id: `v_suspend_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'window_blur',
          description: 'Batas maksimal pelanggaran terlampaui. Ujian ditangguhkan secara otomatis.',
          questionIndexAtEvent: currentIndex + 1,
        },
        true
      ).catch((err) => console.warn('DB suspension log failed:', err));
    },
    onAutosave: (currentAnswers) => {
      // Direct real-time autosave to server database
      autosaveSubmissionApi(submission.id, currentAnswers).catch((err) =>
        console.warn('DB autosave error:', err)
      );
    },
    isActiveExam: !isSuspended && submission.status === 'in_progress',
  });

  // Automatically request fullscreen on mount
  useEffect(() => {
    if (exam.settings.requireFullscreen) {
      enterFullscreen();
    }
  }, [enterFullscreen, exam.settings.requireFullscreen]);

  // Countdown Timer interval
  useEffect(() => {
    if (isSuspended || submission.status !== 'in_progress') return;

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto submit when time runs out
          handleForceSubmit('Waktu Ujian Habis');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSuspended, submission.status]);

  // Force submit handler with direct database recording
  const handleForceSubmit = (reason?: string) => {
    const evaluation = evaluateSubmission(exam, answers);
    const finalSub: StudentSubmission = {
      ...submission,
      answers,
      submittedAt: new Date().toISOString(),
      status: 'submitted',
      score: evaluation.score,
      passedKkm: evaluation.passed,
      lastActiveAt: new Date().toISOString(),
    };

    // Save final state to database
    submitFinalExamApi(submission.id, answers, evaluation.score, evaluation.passed).catch((err) =>
      console.warn('DB submit error:', err)
    );

    onUpdateSubmission(finalSub);
    onSubmitExam(finalSub);
  };

  const currentQuestion = exam.questions[currentIndex] || exam.questions[0];
  const currentAnswer = answers[currentQuestion.id] || {
    questionId: currentQuestion.id,
    updatedAt: new Date().toISOString(),
  };

  // Helper to update student answer
  const handleSetAnswer = (partial: Partial<StudentAnswer>) => {
    const updated: StudentAnswer = {
      ...currentAnswer,
      ...partial,
      updatedAt: new Date().toISOString(),
    };
    const newAnswers = { ...answers, [currentQuestion.id]: updated };
    setAnswers(newAnswers);

    // Sync to submission state & trigger fast debounced DB autosave
    onUpdateSubmission({
      ...submission,
      answers: newAnswers,
      lastActiveAt: new Date().toISOString(),
    });
    autosaveSubmissionApi(submission.id, newAnswers).catch(() => {});
  };

  // Stats for questions
  const totalQuestions = exam.questions.length;
  const answeredCount = exam.questions.filter((q) => {
    const a = answers[q.id];
    if (!a) return false;
    if (q.type === 'multiple_choice') return !!a.selectedOptionId;
    if (q.type === 'multiple_choice_multi') return !!(a.selectedOptionIds && a.selectedOptionIds.length > 0);
    if (q.type === 'true_false') return a.booleanAnswer !== undefined;
    if (q.type === 'short_answer') return !!a.shortAnswerText?.trim();
    if (q.type === 'essay') return !!a.essayText?.trim();
    return false;
  }).length;
  const doubtfulCount = exam.questions.filter((q) => answers[q.id]?.isDoubtful).length;
  const unansweredCount = totalQuestions - answeredCount;

  // Format Time Remaining
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeLeftSeconds <= 300; // less than 5 minutes

  // Font size classes
  const fontSizeClasses = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
  }[fontSize];

  // Keyboard shortcut listener for options A, B, C, D, E and question navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in an input or textarea (short answer / essay)
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D', 'E'].includes(key)) {
        if (currentQuestion.type === 'multiple_choice' && currentQuestion.options) {
          const matchedOpt = currentQuestion.options.find((opt) => opt.id.toUpperCase() === key);
          if (matchedOpt) {
            e.preventDefault();
            handleSetAnswer({ selectedOptionId: matchedOpt.id });
          }
        } else if (currentQuestion.type === 'multiple_choice_multi' && currentQuestion.options) {
          const matchedOpt = currentQuestion.options.find((opt) => opt.id.toUpperCase() === key);
          if (matchedOpt) {
            e.preventDefault();
            const curSelected = currentAnswer.selectedOptionIds || [];
            const nextSelected = curSelected.includes(matchedOpt.id)
              ? curSelected.filter((id) => id !== matchedOpt.id)
              : [...curSelected, matchedOpt.id].sort();
            handleSetAnswer({ selectedOptionIds: nextSelected });
          }
        }
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < exam.questions.length - 1) {
          e.preventDefault();
          setCurrentIndex((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          e.preventDefault();
          setCurrentIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion, currentIndex, exam.questions.length]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col exam-secure-shield select-none">
      {/* Violation Warnings and Suspension Modals */}
      <ExamWarningModal
        isOpen={showWarningModal && !isSuspended}
        violationCount={violationCount}
        maxViolationsAllowed={exam.settings.maxViolationsAllowed}
        latestDescription={warningMessage || undefined}
        onConfirmReturn={() => {
          dismissWarningModal();
          enterFullscreen();
        }}
      />

      <ExamSuspendedModal
        isOpen={isSuspended}
        proctorPin={exam.settings.proctorPin}
        totalViolations={violationCount}
        onUnlockedByProctor={() => {
          setIsSuspended(false);
          enterFullscreen();
          onUpdateSubmission({
            ...submission,
            status: 'in_progress',
            isLockedByProctor: false,
          });
        }}
      />

      {/* Top Exam Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Exam Info & Subject */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-[200px] sm:max-w-md">
                {exam.title}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span>{exam.subject}</span>
                <span>•</span>
                <span>{student.name}</span>
              </div>
            </div>
          </div>

          {/* Center: Live Timer */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-sm sm:text-base border transition-colors ${
                isLowTime
                  ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                  : 'bg-slate-50 text-slate-800 border-slate-200'
              }`}
            >
              <Clock className={`w-4 h-4 ${isLowTime ? 'text-rose-600' : 'text-blue-600'}`} />
              <span>{formatTimer(timeLeftSeconds)}</span>
            </div>
          </div>

          {/* Right: Autosave status, Font scale, Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Autosave indicator */}
            <div
              className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg"
              title="Penyimpanan otomatis berkala"
            >
              <Save className={`w-3.5 h-3.5 ${isSaving ? 'text-blue-600 animate-spin' : 'text-emerald-600'}`} />
              <span className="font-mono">{isSaving ? 'Menyimpan...' : `Tersimpan ${lastSavedTime}`}</span>
            </div>

            {/* Violation Badge */}
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                violationCount > 0
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
              title="Jumlah Pelanggaran Tercatat"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="font-mono">
                {violationCount}/{exam.settings.maxViolationsAllowed}
              </span>
            </div>

            {/* Font Scaler */}
            <div className="hidden lg:flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
              <button
                onClick={() => setFontSize('sm')}
                className={`px-2 py-1 rounded ${fontSize === 'sm' ? 'bg-white font-bold text-blue-700 shadow-xs' : 'text-slate-600'}`}
                title="Font Kecil"
              >
                A-
              </button>
              <button
                onClick={() => setFontSize('base')}
                className={`px-2 py-1 rounded ${fontSize === 'base' ? 'bg-white font-bold text-blue-700 shadow-xs' : 'text-slate-600'}`}
                title="Font Standar"
              >
                A
              </button>
              <button
                onClick={() => setFontSize('lg')}
                className={`px-2 py-1 rounded ${fontSize === 'lg' ? 'bg-white font-bold text-blue-700 shadow-xs' : 'text-slate-600'}`}
                title="Font Besar"
              >
                A+
              </button>
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={() => (isFullscreen ? null : enterFullscreen())}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                isFullscreen
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
              }`}
              title={isFullscreen ? 'Layar Penuh Aktif' : 'Aktifkan Layar Penuh'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden xl:inline text-[11px] font-medium">
                {isFullscreen ? 'Fullscreen' : 'Buka Fullscreen'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Examination Viewport */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Question Content (8 cols on lg) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-7 flex-1 flex flex-col justify-between">
            <div>
              {/* Question Header & Points */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-sm flex items-center justify-center font-mono">
                    {currentIndex + 1}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Soal No. {currentIndex + 1} dari {totalQuestions}
                  </span>
                  <span className="text-xs text-slate-300">•</span>
                  <span className="text-xs text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded">
                    {currentQuestion.type === 'multiple_choice' && 'Pilihan Ganda'}
                    {currentQuestion.type === 'multiple_choice_multi' && 'Pilihan Ganda Kompleks (MCMA)'}
                    {currentQuestion.type === 'true_false' && 'Benar / Salah'}
                    {currentQuestion.type === 'short_answer' && 'Isian Singkat'}
                    {currentQuestion.type === 'essay' && 'Uraian / Essay'}
                  </span>
                </div>
                <div className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                  Bobot: {currentQuestion.points} Poin
                </div>
              </div>

              {/* Passage / Reading Stimulus if present */}
              {currentQuestion.passage && (
                <div className="mb-5 p-4 rounded-xl bg-slate-50 border-l-4 border-blue-600 border-y border-r border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed font-serif">
                  <span className="font-bold text-slate-900 block font-sans text-xs uppercase tracking-wider mb-1">
                    Stimulus Wacana / Teks:
                  </span>
                  <p className="whitespace-pre-line">{currentQuestion.passage}</p>
                </div>
              )}

              {/* Question Image Stimulus if present */}
              {currentQuestion.imageUrl && (
                <div className="mb-5 p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="relative inline-block max-w-full">
                    <img
                      src={currentQuestion.imageUrl}
                      alt={currentQuestion.imageCaption || 'Gambar Butir Soal'}
                      onClick={() => setImageZoomUrl({ url: currentQuestion.imageUrl!, caption: currentQuestion.imageCaption })}
                      className="max-h-72 sm:max-h-84 w-auto mx-auto rounded-lg object-contain bg-white shadow-xs border border-slate-200 cursor-zoom-in hover:opacity-95 transition-opacity"
                    />
                    <button
                      type="button"
                      onClick={() => setImageZoomUrl({ url: currentQuestion.imageUrl!, caption: currentQuestion.imageCaption })}
                      className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
                      title="Klik untuk memperbesar gambar"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-medium hidden sm:inline">Perbesar Gambar</span>
                    </button>
                  </div>
                  {currentQuestion.imageCaption && (
                    <p className="text-xs text-slate-500 italic mt-2.5 font-serif text-center">
                      {currentQuestion.imageCaption}
                    </p>
                  )}
                </div>
              )}

              {/* Question Prompt */}
              <div className={`font-semibold text-slate-900 leading-relaxed mb-6 ${fontSizeClasses}`}>
                {currentQuestion.prompt}
              </div>

              {/* Answers Input Area by Question Type */}
              <div className="space-y-3">
                {/* 1. Multiple Choice */}
                {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                  <div className="space-y-2.5">
                    {currentQuestion.options.map((option) => {
                      const isSelected = currentAnswer.selectedOptionId === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleSetAnswer({ selectedOptionId: option.id })}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/80 border-blue-600 text-blue-950 font-medium shadow-xs ring-1 ring-blue-600'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 text-slate-800'
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 font-mono transition-colors ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {option.id}
                          </span>
                          <span className={`pt-0.5 leading-relaxed ${fontSizeClasses}`}>{option.text}</span>
                        </button>
                      );
                    })}
                    <div className="pt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Pintasan Keyboard: Tekan <strong>[A] [B] [C] [D] [E]</strong> untuk memilih opsi langsung</span>
                      <span>Navigasi: <strong>[←] [→]</strong></span>
                    </div>
                  </div>
                )}

                {/* 1.b Multiple Choice Multiple Answers (MCMA / PG Kompleks) */}
                {currentQuestion.type === 'multiple_choice_multi' && currentQuestion.options && (
                  <div className="space-y-2.5">
                    <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-semibold">
                          Pilihan Ganda Kompleks (MCMA): Pilih satu atau lebih dari satu jawaban yang benar.
                        </span>
                      </div>
                      <span className="text-[11px] font-bold bg-white text-blue-700 px-2 py-0.5 rounded border border-blue-200 shrink-0 self-start sm:self-auto font-mono">
                        {currentAnswer.selectedOptionIds && currentAnswer.selectedOptionIds.length > 0
                          ? `${currentAnswer.selectedOptionIds.length} Terpilih: [${currentAnswer.selectedOptionIds.join(', ')}]`
                          : 'Belum Ada Pilihan Tercentang'}
                      </span>
                    </div>

                    {currentQuestion.options.map((option) => {
                      const isSelected = (currentAnswer.selectedOptionIds || []).includes(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            const cur = currentAnswer.selectedOptionIds || [];
                            const next = cur.includes(option.id)
                              ? cur.filter((id) => id !== option.id)
                              : [...cur, option.id].sort();
                            handleSetAnswer({ selectedOptionIds: next });
                          }}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/80 border-blue-600 text-blue-950 font-medium shadow-xs ring-1 ring-blue-600'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 text-slate-800'
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 font-mono transition-colors ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {option.id}
                          </span>
                          <span className={`pt-0.5 leading-relaxed flex-1 ${fontSizeClasses}`}>{option.text}</span>
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                        </button>
                      );
                    })}
                    <div className="pt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Pintasan Keyboard: Tekan <strong>[A] [B] [C] [D] [E]</strong> untuk mencentang/membatalkan pilihan</span>
                      <span>Navigasi: <strong>[←] [→]</strong></span>
                    </div>
                  </div>
                )}

                {/* 2. True / False */}
                {currentQuestion.type === 'true_false' && (
                  <div className="grid grid-cols-2 gap-4 max-w-md pt-2">
                    <button
                      type="button"
                      onClick={() => handleSetAnswer({ booleanAnswer: true })}
                      className={`p-4 rounded-xl border text-center font-bold text-sm transition-all cursor-pointer ${
                        currentAnswer.booleanAnswer === true
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-400/50'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40'
                      }`}
                    >
                      BENAR
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAnswer({ booleanAnswer: false })}
                      className={`p-4 rounded-xl border text-center font-bold text-sm transition-all cursor-pointer ${
                        currentAnswer.booleanAnswer === false
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-400/50'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-rose-300 hover:bg-rose-50/40'
                      }`}
                    >
                      SALAH
                    </button>
                  </div>
                )}

                {/* 3. Short Answer */}
                {currentQuestion.type === 'short_answer' && (
                  <div className="pt-2 max-w-lg">
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Tuliskan Jawaban Singkat Anda:
                    </label>
                    <input
                      type="text"
                      value={currentAnswer.shortAnswerText || ''}
                      onChange={(e) => handleSetAnswer({ shortAnswerText: e.target.value })}
                      placeholder="Ketik jawaban singkat di sini..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      *Perhatikan ejaan kata kunci (tidak terpengaruh huruf besar/kecil).
                    </p>
                  </div>
                )}

                {/* 4. Essay */}
                {currentQuestion.type === 'essay' && (
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                      <span>Tuliskan Uraian Lengkap Jawaban Anda:</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {(currentAnswer.essayText || '').length} Karakter
                      </span>
                    </label>
                    <textarea
                      rows={6}
                      value={currentAnswer.essayText || ''}
                      onChange={(e) => handleSetAnswer({ essayText: e.target.value })}
                      placeholder="Ketik penjelasan atau argumentasi ilmiah Anda secara runtut..."
                      className="w-full p-4 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed"
                    />
                    {currentQuestion.essayRubric && (
                      <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <span className="font-semibold text-slate-700 block">Rubrik Panduan Penilaian:</span>
                        <span>{currentQuestion.essayRubric}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions of Left Pane */}
            <div className="pt-6 mt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    currentIndex === 0
                      ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Sebelumnya</span>
                </button>

                <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold cursor-pointer hover:bg-amber-100/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={!!currentAnswer.isDoubtful}
                    onChange={(e) => handleSetAnswer({ isDoubtful: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
                  />
                  <span>Ragu-ragu</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                {currentIndex < totalQuestions - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Selanjutnya</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitConfirmModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Kumpulkan Ujian</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Question Navigation Matrix (4 cols on lg) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center justify-between">
              <span>Navigasi Soal Asesmen</span>
              <span className="text-xs font-normal text-slate-500">
                {answeredCount}/{totalQuestions} Terjawab
              </span>
            </h3>

            {/* Status Legend */}
            <div className="grid grid-cols-3 gap-2 pb-3 mb-4 border-b border-slate-100 text-[11px] font-medium text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-600 shrink-0"></span>
                <span>Dijawab ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-400 shrink-0"></span>
                <span>Ragu ({doubtfulCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-200 shrink-0"></span>
                <span>Kosong ({unansweredCount})</span>
              </div>
            </div>

            {/* Question Buttons Matrix */}
            <div className="grid grid-cols-5 gap-2 max-h-[380px] overflow-y-auto pr-1">
              {exam.questions.map((q, idx) => {
                const ans = answers[q.id];
                const isCurrent = idx === currentIndex;
                const isDoubtful = !!ans?.isDoubtful;
                const isAnswered =
                  ans &&
                  (q.type === 'multiple_choice'
                    ? !!ans.selectedOptionId
                    : q.type === 'multiple_choice_multi'
                    ? !!(ans.selectedOptionIds && ans.selectedOptionIds.length > 0)
                    : q.type === 'true_false'
                    ? ans.booleanAnswer !== undefined
                    : q.type === 'short_answer'
                    ? !!ans.shortAnswerText?.trim()
                    : !!ans.essayText?.trim());

                let btnStyle = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200';
                if (isAnswered) {
                  btnStyle = 'bg-blue-600 text-white font-bold border-blue-600';
                }
                if (isDoubtful) {
                  btnStyle = 'bg-amber-400 text-slate-900 font-bold border-amber-500';
                }
                if (isCurrent) {
                  btnStyle += ' ring-2 ring-slate-900 ring-offset-2';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-xl border text-xs font-mono transition-all flex flex-col items-center justify-center cursor-pointer ${btnStyle}`}
                  >
                    <span>{idx + 1}</span>
                    {q.type === 'multiple_choice' && ans?.selectedOptionId && (
                      <span className="text-[9px] -mt-0.5 opacity-90">{ans.selectedOptionId}</span>
                    )}
                    {q.type === 'multiple_choice_multi' && ans?.selectedOptionIds && ans.selectedOptionIds.length > 0 && (
                      <span className="text-[9px] -mt-0.5 opacity-90 font-bold">{ans.selectedOptionIds.join('')}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Finish Button */}
            <div className="pt-5 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSubmitConfirmModal(true)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Konfirmasi Selesai Ujian</span>
              </button>
            </div>
          </div>

          {/* Quick Notice Card */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900">
            <div className="font-bold flex items-center gap-1 mb-1">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>Integritas Jawaban Terjaga</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Jawaban Anda disimpan otomatis ke server setiap {exam.settings.autoSaveIntervalSeconds || 5} detik. Tombol 'Ragu-ragu' membantu menandai soal yang ingin diperiksa ulang sebelum mengumpulkan.
            </p>
          </div>
        </div>
      </main>

      {/* Confirmation Submit Modal */}
      {showSubmitConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Konfirmasi Kumpulkan Ujian
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Harap periksa rekapitulasi pengerjaan Anda sebelum mengakhiri sesi asesmen:
            </p>

            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-center">
              <div>
                <span className="text-xs text-slate-500 block">Terjawab</span>
                <span className="text-base font-bold text-blue-700 font-mono">{answeredCount}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Belum Terjawab</span>
                <span className={`text-base font-bold font-mono ${unansweredCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                  {unansweredCount}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Ragu-ragu</span>
                <span className="text-base font-bold text-amber-600 font-mono">{doubtfulCount}</span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Masih terdapat <strong>{unansweredCount} soal yang belum dijawab</strong>. Jawaban yang kosong tidak akan mendapatkan poin.
                </span>
              </div>
            )}

            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Setelah dikumpulkan, lembar ujian akan dikunci dan Anda tidak dapat mengubah jawaban lagi. Apakah Anda yakin ingin menyelesaikan ujian sekarang?
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowSubmitConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
              >
                Kembali Periksa
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitConfirmModal(false);
                  handleForceSubmit('Dikumpulkan Siswa');
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Ya, Kumpulkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ZOOM / PERBESAR GAMBAR SOAL SISWA */}
      {imageZoomUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-700 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-sm text-slate-900">Perbesar Tampilan Gambar Soal</h4>
              </div>
              <button
                type="button"
                onClick={() => setImageZoomUrl(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3 flex flex-col items-center justify-center bg-slate-50 rounded-xl my-3">
              <img
                src={imageZoomUrl.url}
                alt={imageZoomUrl.caption || 'Gambar Soal Penuh'}
                className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-sm bg-white border border-slate-200"
              />
              {imageZoomUrl.caption && (
                <p className="text-xs text-slate-600 italic mt-3 font-serif text-center max-w-2xl">
                  {imageZoomUrl.caption}
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setImageZoomUrl(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Tutup Tampilan Gambar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
