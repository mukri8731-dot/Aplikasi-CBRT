import { useEffect, useRef, useState, useCallback } from 'react';
import { Exam, ViolationRecord, ViolationType, StudentAnswer } from '../types/exam';
import { saveLocalDraftAnswers } from '../utils/storage';

interface UseExamSecurityProps {
  exam: Exam;
  studentId: string;
  currentQuestionIndex: number;
  answers: Record<string, StudentAnswer>;
  initialViolations?: ViolationRecord[];
  onViolationOccurred: (violation: ViolationRecord, newTotal: number) => void;
  onMaxViolationsExceeded: () => void;
  onAutosave?: (answers: Record<string, StudentAnswer>) => void;
  isActiveExam: boolean;
}

export function useExamSecurity({
  exam,
  studentId,
  currentQuestionIndex,
  answers,
  initialViolations = [],
  onViolationOccurred,
  onMaxViolationsExceeded,
  onAutosave,
  isActiveExam,
}: UseExamSecurityProps) {
  const [violations, setViolations] = useState<ViolationRecord[]>(initialViolations);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('Belum disimpan');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const lastViolationTimeRef = useRef<number>(0);
  const answersRef = useRef(answers);
  const currentIndexRef = useRef(currentQuestionIndex);

  // Keep refs updated
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    currentIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  // Record a violation with debounce protection (minimum 1.5 seconds between duplicate events)
  const recordViolation = useCallback(
    (type: ViolationType, description: string) => {
      if (!isActiveExam) return;

      const now = Date.now();
      if (checkDebounce(now)) {
        return;
      }

      const newRecord: ViolationRecord = {
        id: `v_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        type,
        description,
        questionIndexAtEvent: currentIndexRef.current + 1,
      };

      setViolations((prev) => {
        const updated = [...prev, newRecord];
        const newTotal = updated.length;

        // Callback to parent
        onViolationOccurred(newRecord, newTotal);

        // Check if exceeded threshold
        if (newTotal >= exam.settings.maxViolationsAllowed) {
          onMaxViolationsExceeded();
        } else {
          setWarningMessage(
            `Terdeteksi aktivitas meninggalkan halaman ujian. Silakan kembali ke ujian! (${newTotal}/${exam.settings.maxViolationsAllowed} batas toleransi)`
          );
          setShowWarningModal(true);
        }

        return updated;
      });
    },
    [isActiveExam, exam.settings.maxViolationsAllowed, onViolationOccurred, onMaxViolationsExceeded]
  );

  // Helper ref to avoid race condition debounce
  function checkDebounce(now: number): boolean {
    if (now - lastViolationTimeRef.current < 1500) {
      return true;
    }
    lastViolationTimeRef.current = now;
    return false;
  }

  // Request Fullscreen
  const enterFullscreen = useCallback(async () => {
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if ((docEl as any).webkitRequestFullscreen) {
        await (docEl as any).webkitRequestFullscreen();
      } else if ((docEl as any).msRequestFullscreen) {
        await (docEl as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
      return true;
    } catch (err) {
      console.warn('Fullscreen request denied or not supported in sandbox:', err);
      // We still allow exam to proceed with visibility/blur tracking
      return false;
    }
  }, []);

  // Exit Fullscreen helper
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Periodic Autosave effect
  useEffect(() => {
    if (!isActiveExam) return;

    const intervalSeconds = exam.settings.autoSaveIntervalSeconds || 5;
    const interval = setInterval(() => {
      setIsSaving(true);
      saveLocalDraftAnswers(exam.id, studentId, answersRef.current);
      if (onAutosave) {
        onAutosave(answersRef.current);
      }
      const now = new Date();
      setLastSavedTime(
        `${now.getHours().toString().padStart(2, '0')}:${now
          .getMinutes()
          .toString()
          .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} WIB`
      );
      setTimeout(() => setIsSaving(false), 600);
    }, intervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [isActiveExam, exam.id, studentId, exam.settings.autoSaveIntervalSeconds]);

  // Security event listeners: Fullscreen, Visibility, Blur, Shortcuts, ContextMenu
  useEffect(() => {
    if (!isActiveExam) return;

    // 1. Fullscreen Change
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isNowFullscreen);

      if (exam.settings.requireFullscreen && !isNowFullscreen) {
        recordViolation('exit_fullscreen', 'Keluar dari mode layar penuh (Fullscreen ditutup)');
      }
    };

    // 2. Page Visibility (Tab Switch or App Minimize)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('tab_switch', 'Berpindah tab atau browser diminimalkan');
      }
    };

    // 3. Window Blur (Lost focus to another app, second monitor, or Alt-Tab)
    const handleWindowBlur = () => {
      recordViolation('window_blur', 'Jendela ujian kehilangan fokus kursor/aplikasi');
    };

    // 4. Context Menu (Right Click)
    const handleContextMenu = (e: MouseEvent) => {
      if (exam.settings.blockRightClick) {
        e.preventDefault();
        recordViolation('context_menu', 'Mencoba membuka menu klik kanan (Inspect/Copy)');
      }
    };

    // 5. Copy / Cut / Paste events
    const handleCopy = (e: ClipboardEvent) => {
      if (exam.settings.blockCopyPaste) {
        e.preventDefault();
        recordViolation('copy_paste_attempt', 'Mencoba menyalin (Copy) teks lembar ujian');
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (exam.settings.blockCopyPaste) {
        e.preventDefault();
        recordViolation('copy_paste_attempt', 'Mencoba menempel (Paste) teks dari luar');
      }
    };

    // 6. Keyboard Shortcuts: DevTools, Reload, Print, etc.
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 or Ctrl+Shift+I or Ctrl+Shift+J or Ctrl+Shift+C (DevTools)
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c'))
      ) {
        e.preventDefault();
        recordViolation('developer_tools_attempt', 'Mencoba membuka Developer Tools (F12 / Inspect Element)');
        return;
      }

      // Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        recordViolation('developer_tools_attempt', 'Mencoba melihat kode sumber (Ctrl+U)');
        return;
      }

      // Ctrl+P (Print)
      if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        return;
      }

      // Block Ctrl+C / Ctrl+V if settings enable it
      if (exam.settings.blockCopyPaste && e.ctrlKey && (e.key === 'c' || e.key === 'C' || e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        recordViolation('copy_paste_attempt', 'Percobaan kombinasi keyboard shortcut copy/paste');
      }
    };

    // 7. Prevent accidental reload
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Ujian sedang berlangsung! Jawaban Anda telah tersimpan secara otomatis.';
      return e.returnValue;
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCopy);
    document.addEventListener('paste', handlePaste);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCopy);
      document.removeEventListener('paste', handlePaste);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isActiveExam, exam.settings, recordViolation]);

  return {
    violations,
    violationCount: violations.length,
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    warningMessage,
    showWarningModal,
    dismissWarningModal: () => setShowWarningModal(false),
    lastSavedTime,
    isSaving,
    recordViolation,
  };
}
