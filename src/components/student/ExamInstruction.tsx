import React, { useState } from 'react';
import { Exam, User } from '../../types/exam';
import { ShieldAlert, Clock, Award, FileText, CheckCircle2, AlertTriangle, ArrowLeft, Play, Monitor, Lock } from 'lucide-react';

interface ExamInstructionProps {
  exam: Exam;
  student: User;
  onStartExam: () => void;
  onBack: () => void;
}

export const ExamInstruction: React.FC<ExamInstructionProps> = ({
  exam,
  student,
  onStartExam,
  onBack,
}) => {
  const [agreedTerms, setAgreedTerms] = useState<boolean>(false);

  // Check schedule validity
  const now = new Date();
  const startTime = new Date(exam.startTime);
  const endTime = new Date(exam.endTime);
  const isBeforeStart = now < startTime;
  const isAfterEnd = now > endTime;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Back button */}
      <div className="mb-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Halaman Login</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-500/30 text-blue-100 text-xs font-semibold px-2.5 py-1 rounded-md mb-2 backdrop-blur-xs">
                <span>{exam.gradeClass}</span>
                <span>•</span>
                <span>{exam.subject}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {exam.title}
              </h1>
              <p className="text-blue-100 text-xs sm:text-sm mt-1">
                Guru Pengampu: {exam.teacherName}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 text-center min-w-32">
              <span className="text-[11px] text-blue-200 uppercase font-semibold block">Kode Ujian</span>
              <span className="text-lg font-mono font-bold text-white tracking-wider">{exam.code}</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Identity & Exam Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Durasi</span>
                <span className="text-sm font-bold text-slate-800 font-mono">{exam.settings.durationMinutes} Menit</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">KKM Minimal</span>
                <span className="text-sm font-bold text-slate-800 font-mono">{exam.settings.kkm}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Jumlah Butir</span>
                <span className="text-sm font-bold text-slate-800 font-mono">{exam.questions.length} Soal</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Batas Pelanggaran</span>
                <span className="text-sm font-bold text-slate-800 font-mono">{exam.settings.maxViolationsAllowed} Kali</span>
              </div>
            </div>
          </div>

          {/* Student Identity Card */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Identitas Peserta Didik:</span>
              <div className="text-base font-bold text-slate-900">{student.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                NISN: <span className="font-mono text-slate-700 font-medium">{student.nisn || '-'}</span> | Rombel: <span className="text-slate-700 font-medium">{student.gradeClass || 'Kelas X'}</span>
              </div>
            </div>
            <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Terverifikasi di Ruang Ujian</span>
            </div>
          </div>

          {/* Exam Instructions & Regulations */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Petunjuk Umum & Aturan Asesmen Digital:</span>
            </h2>
            <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-normal">
              {exam.instructions}
            </div>
          </div>

          {/* Security Protocols Notice */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-blue-900">
              <Monitor className="w-4 h-4 text-blue-700" />
              <span>Protokol Keamanan Mode Ujian (Exam Kiosk Guard):</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-slate-700">
              <li>Saat menekan <strong>Mulai Ujian</strong>, browser akan meminta masuk ke mode <strong>Fullscreen</strong>. Jangan keluar dari layar penuh sampai ujian selesai.</li>
              <li>Dilarang menekan <kbd className="px-1 py-0.5 bg-slate-200 rounded text-[10px]">Alt+Tab</kbd>, membuka tab baru, mencari contekan di Google, atau menyalin teks (Copy/Paste diblokir).</li>
              <li>Sistem dilengkapi deteksi <strong>Page Visibility API</strong> dan <strong>Blur Detection</strong> yang merekam timestamp setiap Anda meninggalkan layar ujian.</li>
              <li>Jika melanggar lebih dari <strong>{exam.settings.maxViolationsAllowed} kali</strong>, ujian otomatis ditangguhkan dan harus dibuka dengan PIN Pengawas.</li>
              <li>Jawaban Anda tersimpan otomatis setiap {exam.settings.autoSaveIntervalSeconds || 5} detik ke server.</li>
            </ul>
          </div>

          {/* Schedule Warning if out of range */}
          {isBeforeStart && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-800 text-xs flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Ujian belum dibuka. Jadwal pengerjaan baru dimulai pada: {new Date(exam.startTime).toLocaleString('id-ID')}.</span>
            </div>
          )}

          {isAfterEnd && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>Jadwal ujian ini telah berakhir pada: {new Date(exam.endTime).toLocaleString('id-ID')}.</span>
            </div>
          )}

          {/* Confirmation Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/60 transition-colors">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs text-slate-800 leading-normal font-medium">
                Saya menyatakan siap mengikuti ujian dengan jujur, tertib, dan menyetujui seluruh ketentuan Exam Mode AsesmenPRO.
              </span>
            </label>
          </div>

          {/* Start Button */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onStartExam}
              disabled={!agreedTerms || isBeforeStart || isAfterEnd}
              className={`flex-1 py-3.5 px-6 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                agreedTerms && !isBeforeStart && !isAfterEnd
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 hover:shadow-lg'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Mulai Ujian Sekarang (Masuk Mode Aman)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
