/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Exam, StudentSubmission, User } from './types/exam';
import {
  getStoredExams,
  saveStoredExams,
  getStoredSubmissions,
  saveStoredSubmissions,
  getStoredUsers,
  getCurrentUser,
  setCurrentUser,
  resetAllDataToDefault,
  getLocalDraftAnswers,
} from './utils/storage';
import {
  fetchExamsApi,
  fetchSubmissionsApi,
  createExamApi,
  updateExamApi,
  deleteExamApi,
  startSubmissionApi,
  resetDatabaseApi,
} from './utils/api';
import { Header } from './components/common/Header';
import { LoginPage } from './components/auth/LoginPage';
import { ExamInstruction } from './components/student/ExamInstruction';
import { ExamRunner } from './components/student/ExamRunner';
import { ExamFinishScreen } from './components/student/ExamFinishScreen';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';

const SESSION_TEACHER_KEY = 'asesmenpro_teacher_token';
const SESSION_TEACHER_USER = 'asesmenpro_teacher_user';

export default function App() {
  const [exams, setExams] = useState<Exam[]>(() => getStoredExams());
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(() => getStoredSubmissions());
  const [users, setUsers] = useState<User[]>(() => getStoredUsers());

  // Teacher authentication session
  const [isTeacherAuth, setIsTeacherAuth] = useState<boolean>(() => {
    return !!sessionStorage.getItem(SESSION_TEACHER_KEY);
  });

  const [currentUser, setCurrentUserState] = useState<User>(() => {
    const savedTeacherRaw = sessionStorage.getItem(SESSION_TEACHER_USER);
    if (savedTeacherRaw) {
      try {
        return JSON.parse(savedTeacherRaw);
      } catch (e) {}
    }
    return {
      id: 'student-guest',
      name: 'Peserta Didik',
      role: 'student',
    };
  });

  // Student specific navigation flow: 'login' | 'instruction' | 'taking' | 'finish'
  const [studentFlowStep, setStudentFlowStep] = useState<'login' | 'instruction' | 'taking' | 'finish'>('login');
  const [activeStudentExam, setActiveStudentExam] = useState<Exam | null>(null);
  const [activeSubmission, setActiveSubmission] = useState<StudentSubmission | null>(null);

  // Synchronize state with backend database on mount
  const syncWithDatabase = useCallback(async () => {
    try {
      const [dbExams, dbSubs] = await Promise.all([
        fetchExamsApi(),
        fetchSubmissionsApi(),
      ]);
      if (dbExams && dbExams.length > 0) {
        setExams(dbExams);
        saveStoredExams(dbExams);
      }
      if (dbSubs && dbSubs.length > 0) {
        setSubmissions(dbSubs);
        saveStoredSubmissions(dbSubs);
      }
    } catch (err) {
      console.warn('Backend database sync fallback to local cache:', err);
    }
  }, []);

  useEffect(() => {
    syncWithDatabase();
  }, [syncWithDatabase]);

  // Sync exam changes to both database and localStorage
  const handleSaveExams = async (updated: Exam[]) => {
    setExams(updated);
    saveStoredExams(updated);

    // Sync with backend API
    for (const ex of updated) {
      try {
        await updateExamApi(ex.id, ex);
      } catch {
        try {
          await createExamApi(ex);
        } catch (e) {}
      }
    }
  };

  // Sync submission changes
  const handleSaveSubmissions = (updated: StudentSubmission[]) => {
    setSubmissions(updated);
    saveStoredSubmissions(updated);
  };

  // Role Switcher
  const handleSwitchRole = (role: 'teacher' | 'student') => {
    if (role === 'teacher') {
      if (isTeacherAuth) {
        // Teacher is already authenticated in session
        const savedTeacherRaw = sessionStorage.getItem(SESSION_TEACHER_USER);
        if (savedTeacherRaw) {
          const teacher = JSON.parse(savedTeacherRaw);
          setCurrentUserState(teacher);
          setCurrentUser(teacher);
          return;
        }
      }
      // If not authenticated, take to login screen
      setCurrentUserState({ id: 'guest', name: 'Pengawas', role: 'student' });
      setStudentFlowStep('login');
    } else {
      const studentUser: User = {
        id: 'student-guest',
        name: 'Peserta Ujian',
        role: 'student',
      };
      setCurrentUserState(studentUser);
      setCurrentUser(studentUser);
      setStudentFlowStep('login');
      setActiveStudentExam(null);
      setActiveSubmission(null);
    }
  };

  // Functional Logout for Teacher & Student
  const handleLogout = () => {
    // Clear teacher authentication completely
    sessionStorage.removeItem(SESSION_TEACHER_KEY);
    sessionStorage.removeItem(SESSION_TEACHER_USER);
    setIsTeacherAuth(false);

    // Reset to student guest login screen
    const studentUser: User = {
      id: 'student-guest',
      name: 'Peserta Ujian',
      role: 'student',
    };
    setCurrentUserState(studentUser);
    setCurrentUser(studentUser);
    setStudentFlowStep('login');
    setActiveStudentExam(null);
    setActiveSubmission(null);
  };

  const handleResetData = async () => {
    resetAllDataToDefault();
    try {
      await resetDatabaseApi();
    } catch (e) {}
    await syncWithDatabase();
    handleLogout();
  };

  // Teacher Login handler with token storage
  const handleTeacherLogin = (teacher: User, token?: string) => {
    setIsTeacherAuth(true);
    setCurrentUserState(teacher);
    setCurrentUser(teacher);
    sessionStorage.setItem(SESSION_TEACHER_KEY, token || `tok_${Date.now()}`);
    sessionStorage.setItem(SESSION_TEACHER_USER, JSON.stringify(teacher));
  };

  // Student Login handler
  const handleStudentLogin = async (exam: Exam, studentName: string, studentNisn: string) => {
    const studentUser: User = {
      id: `std_${studentNisn.replace(/\s+/g, '') || Date.now()}`,
      name: studentName,
      nisn: studentNisn,
      role: 'student',
      gradeClass: exam.gradeClass,
    };
    setCurrentUserState(studentUser);
    setCurrentUser(studentUser);
    setActiveStudentExam(exam);

    // Check existing submission in database / state
    try {
      const startRes = await startSubmissionApi({
        examId: exam.id,
        studentId: studentUser.id,
        studentName: studentUser.name,
        studentNisn: studentUser.nisn || '-',
        studentClass: studentUser.gradeClass || exam.gradeClass,
      });

      if (startRes && startRes.submission) {
        setActiveSubmission(startRes.submission);
        if (startRes.submission.status === 'submitted' || startRes.submission.status === 'graded') {
          setStudentFlowStep('finish');
          return;
        }
      }
    } catch (e) {
      // Local fallback
      const existingSub = submissions.find(
        (s) => s.examId === exam.id && (s.studentId === studentUser.id || s.studentNisn === studentNisn)
      );

      if (existingSub) {
        setActiveSubmission(existingSub);
        if (existingSub.status === 'submitted' || existingSub.status === 'graded') {
          setStudentFlowStep('finish');
          return;
        }
      }
    }

    setStudentFlowStep('instruction');
  };

  // Student starts taking exam (enters secure exam runner)
  const handleStartExam = async () => {
    if (!activeStudentExam) return;

    try {
      const startRes = await startSubmissionApi({
        examId: activeStudentExam.id,
        studentId: currentUser.id,
        studentName: currentUser.name,
        studentNisn: currentUser.nisn || '-',
        studentClass: currentUser.gradeClass || activeStudentExam.gradeClass,
      });

      if (startRes && startRes.submission) {
        setActiveSubmission(startRes.submission);
        setStudentFlowStep('taking');
        return;
      }
    } catch (e) {
      console.warn('API submission start failed, using local:', e);
    }

    // Local fallback
    let currentSub = submissions.find(
      (s) => s.examId === activeStudentExam.id && (s.studentId === currentUser.id || s.studentNisn === currentUser.nisn)
    );

    if (!currentSub) {
      const draftAnswers = getLocalDraftAnswers(activeStudentExam.id, currentUser.id) || {};
      currentSub = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        examId: activeStudentExam.id,
        studentId: currentUser.id,
        studentName: currentUser.name,
        studentNisn: currentUser.nisn || '-',
        studentClass: currentUser.gradeClass || activeStudentExam.gradeClass,
        startedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        status: 'in_progress',
        answers: draftAnswers,
        violations: [],
        isLockedByProctor: false,
      };

      const updated = [...submissions, currentSub];
      handleSaveSubmissions(updated);
    }

    setActiveSubmission(currentSub);
    setStudentFlowStep('taking');
  };

  // Update ongoing submission (autosave / answers / violations)
  const handleUpdateSubmission = (updated: StudentSubmission) => {
    setActiveSubmission(updated);
    const updatedList = submissions.map((s) => (s.id === updated.id ? updated : s));
    if (!submissions.some((s) => s.id === updated.id)) {
      updatedList.push(updated);
    }
    handleSaveSubmissions(updatedList);
  };

  // Final submit exam
  const handleSubmitExam = (finalSubmission: StudentSubmission) => {
    handleUpdateSubmission(finalSubmission);
    setStudentFlowStep('finish');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        onSwitchRole={handleSwitchRole}
        onLogout={handleLogout}
        onResetData={handleResetData}
        activeExamTitle={activeStudentExam?.title}
        isExamModeActive={currentUser.role === 'student' && studentFlowStep === 'taking'}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col">
        {currentUser.role === 'teacher' && isTeacherAuth ? (
          /* Teacher Dashboard */
          <TeacherDashboard
            exams={exams}
            submissions={submissions}
            currentUser={currentUser}
            onSaveExams={handleSaveExams}
            onSaveSubmissions={handleSaveSubmissions}
            onLogout={handleLogout}
            onRefreshData={syncWithDatabase}
          />
        ) : (
          /* Student Portal & Teacher Login */
          <div className="flex-1 flex flex-col">
            {studentFlowStep === 'login' && (
              <LoginPage
                exams={exams}
                users={users}
                onLoginStudent={handleStudentLogin}
                onLoginTeacher={handleTeacherLogin}
              />
            )}

            {studentFlowStep === 'instruction' && activeStudentExam && (
              <ExamInstruction
                exam={activeStudentExam}
                student={currentUser}
                onStartExam={handleStartExam}
                onBack={() => setStudentFlowStep('login')}
              />
            )}

            {studentFlowStep === 'taking' && activeStudentExam && activeSubmission && (
              <ExamRunner
                exam={activeStudentExam}
                student={currentUser}
                submission={activeSubmission}
                onUpdateSubmission={handleUpdateSubmission}
                onSubmitExam={handleSubmitExam}
              />
            )}

            {studentFlowStep === 'finish' && activeStudentExam && activeSubmission && (
              <ExamFinishScreen
                exam={activeStudentExam}
                student={currentUser}
                submission={activeSubmission}
                onReturnToHome={() => {
                  setStudentFlowStep('login');
                  setActiveStudentExam(null);
                  setActiveSubmission(null);
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
