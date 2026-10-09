import { Exam, StudentSubmission, User, StudentAnswer, ViolationRecord } from '../types/exam';
import { INITIAL_EXAMS, INITIAL_SUBMISSIONS, INITIAL_USERS } from '../data/initialData';

const STORAGE_KEYS = {
  EXAMS: 'asesmenpro_exams_v1',
  SUBMISSIONS: 'asesmenpro_submissions_v1',
  USERS: 'asesmenpro_users_v1',
  CURRENT_USER: 'asesmenpro_current_user_v1',
  LOCAL_ANSWERS_PREFIX: 'asesmenpro_answers_',
};

export const getStoredExams = (): Exam[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXAMS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(INITIAL_EXAMS));
      return INITIAL_EXAMS;
    }
    const parsed: Exam[] = JSON.parse(raw);
    let modified = false;
    const synced = parsed.map((ex) => {
      if (ex.id === 'exam-anbk-literasi' && !ex.questions.some((q) => q.id === 'lit-q3')) {
        const sampleQ = INITIAL_EXAMS.find((e) => e.id === 'exam-anbk-literasi')?.questions.find((q) => q.id === 'lit-q3');
        if (sampleQ) {
          modified = true;
          return { ...ex, questions: [...ex.questions, sampleQ] };
        }
      }
      return ex;
    });
    if (modified) {
      localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(synced));
      return synced;
    }
    return parsed;
  } catch (err) {
    console.error('Error reading exams from localStorage', err);
    return INITIAL_EXAMS;
  }
};

export const saveStoredExams = (exams: Exam[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(exams));
  } catch (err) {
    console.error('Error saving exams', err);
  }
};

export const getStoredSubmissions = (): StudentSubmission[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(INITIAL_SUBMISSIONS));
      return INITIAL_SUBMISSIONS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading submissions', err);
    return INITIAL_SUBMISSIONS;
  }
};

export const saveStoredSubmissions = (submissions: StudentSubmission[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
  } catch (err) {
    console.error('Error saving submissions', err);
  }
};

export const getStoredUsers = (): User[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading users', err);
    return INITIAL_USERS;
  }
};

export const getCurrentUser = (): User => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error(err);
  }
  // Default to Teacher demo
  return INITIAL_USERS[0];
};

export const setCurrentUser = (user: User): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } catch (err) {
    console.error(err);
  }
};

// Autosave student local draft buffer for offline safety
export const saveLocalDraftAnswers = (examId: string, studentId: string, answers: Record<string, StudentAnswer>): void => {
  try {
    const key = `${STORAGE_KEYS.LOCAL_ANSWERS_PREFIX}${examId}_${studentId}`;
    localStorage.setItem(key, JSON.stringify({ answers, timestamp: new Date().toISOString() }));
  } catch (err) {
    console.error('Error saving local draft answers', err);
  }
};

export const getLocalDraftAnswers = (examId: string, studentId: string): Record<string, StudentAnswer> | null => {
  try {
    const key = `${STORAGE_KEYS.LOCAL_ANSWERS_PREFIX}${examId}_${studentId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.answers || null;
    }
  } catch (err) {
    console.error('Error reading local draft answers', err);
  }
  return null;
};

// Automatic evaluation calculation for auto-gradable questions
export const evaluateSubmission = (exam: Exam, answers: Record<string, StudentAnswer>): { score: number; passed: boolean } => {
  let earnedPoints = 0;
  let totalPoints = 0;

  for (const q of exam.questions) {
    totalPoints += q.points;
    const ans = answers[q.id];
    if (!ans) continue;

    if (q.type === 'multiple_choice') {
      if (ans.selectedOptionId && ans.selectedOptionId === q.correctOptionId) {
        earnedPoints += q.points;
      }
    } else if (q.type === 'multiple_choice_multi') {
      const correctKeys = q.correctOptionIds || (q.correctOptionId ? [q.correctOptionId] : []);
      const studentKeys = ans.selectedOptionIds || (ans.selectedOptionId ? [ans.selectedOptionId] : []);
      if (correctKeys.length > 0 && studentKeys.length > 0) {
        const correctSet = new Set(correctKeys);
        const studentSet = new Set(studentKeys);
        const isExact = correctSet.size === studentSet.size && [...correctSet].every((k) => studentSet.has(k));
        if (isExact) {
          earnedPoints += q.points;
        } else {
          // Proportional points if student picked only valid keys and no incorrect keys
          const correctChosen = studentKeys.filter((k) => correctSet.has(k)).length;
          const wrongChosen = studentKeys.filter((k) => !correctSet.has(k)).length;
          if (wrongChosen === 0 && correctChosen > 0) {
            earnedPoints += Math.round((correctChosen / correctKeys.length) * q.points);
          }
        }
      }
    } else if (q.type === 'true_false') {
      if (ans.booleanAnswer !== undefined && ans.booleanAnswer === q.isTrue) {
        earnedPoints += q.points;
      }
    } else if (q.type === 'short_answer') {
      if (ans.shortAnswerText && q.correctShortAnswerKeywords && q.correctShortAnswerKeywords.length > 0) {
        const cleanStudentAns = ans.shortAnswerText.trim().toLowerCase();
        const isMatch = q.correctShortAnswerKeywords.some(kw => kw.trim().toLowerCase() === cleanStudentAns);
        if (isMatch) {
          earnedPoints += q.points;
        }
      }
    } else if (q.type === 'essay') {
      // Default to 70% if answered, teacher can fine tune
      if (ans.essayText && ans.essayText.trim().length > 20) {
        earnedPoints += Math.round(q.points * 0.8);
      }
    }
  }

  const finalScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const passed = finalScore >= exam.settings.kkm;

  return { score: finalScore, passed };
};

export const resetAllDataToDefault = (): void => {
  localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(INITIAL_EXAMS));
  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(INITIAL_SUBMISSIONS));
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));
};
