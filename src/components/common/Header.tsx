import React from 'react';
import { User } from '../../types/exam';
import { ShieldCheck, UserCheck, GraduationCap, RefreshCw, LogOut } from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  onSwitchRole: (role: 'teacher' | 'student') => void;
  onLogout: () => void;
  onResetData: () => void;
  activeExamTitle?: string;
  isExamModeActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSwitchRole,
  onLogout,
  onResetData,
  activeExamTitle,
  isExamModeActive = false,
}) => {
  // If student is currently taking exam in active secure mode, render minimal unobtrusive bar
  if (isExamModeActive) {
    return (
      <header className="bg-slate-900 text-white px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold tracking-wide text-slate-200">AsesmenPRO Secure Kiosk</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 font-medium truncate max-w-xs">{activeExamTitle}</span>
        </div>
        <div className="flex items-center gap-4 text-slate-300">
          <span>Peserta: <strong className="text-white font-medium">{currentUser.name}</strong></span>
          <span className="text-slate-500">·</span>
          <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px] font-mono">NISN: {currentUser.nisn || '-'}</span>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-900 tracking-tight">AsesmenPRO</span>
                <span className="text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                  CBT Indonesia
                </span>
              </div>
              <p className="text-xs text-slate-500">Sistem Ujian & Asesmen Digital Terproteksi</p>
            </div>
          </div>

          {/* Quick Role Switcher & User Details */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1 text-xs">
              <button
                onClick={() => onSwitchRole('student')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  currentUser.role === 'student'
                    ? 'bg-white text-blue-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Mode Siswa</span>
              </button>
              <button
                onClick={() => onSwitchRole('teacher')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  currentUser.role === 'teacher'
                    ? 'bg-white text-blue-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Portal Guru</span>
              </button>
            </div>

            {/* Reset Data Button */}
            <button
              onClick={() => {
                if (window.confirm('Reset seluruh data simulasi ujian dan nilai ke kondisi awal?')) {
                  onResetData();
                }
              }}
              title="Reset Data Demo"
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-xs flex items-center gap-1 border border-slate-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reset Data</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              title="Keluar"
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-xs flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
