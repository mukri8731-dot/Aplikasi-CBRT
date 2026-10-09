import React, { useState } from 'react';
import { Lock, AlertOctagon, CheckCircle2, KeyRound } from 'lucide-react';

interface ExamSuspendedModalProps {
  isOpen: boolean;
  proctorPin: string;
  totalViolations: number;
  onUnlockedByProctor: () => void;
}

export const ExamSuspendedModal: React.FC<ExamSuspendedModalProps> = ({
  isOpen,
  proctorPin,
  totalViolations,
  onUnlockedByProctor,
}) => {
  const [inputPin, setInputPin] = useState<string>('');
  const [errorPin, setErrorPin] = useState<string>('');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorPin('');

    if (inputPin.trim() === proctorPin.trim()) {
      setIsUnlocked(true);
      setTimeout(() => {
        setIsUnlocked(false);
        setInputPin('');
        onUnlockedByProctor();
      }, 1200);
    } else {
      setErrorPin('PIN Pengawas keliru. Silakan hubungi Guru Pengawas di ruang kelas.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-2 border-rose-600 text-center relative">
        <div className="w-20 h-20 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-rose-50 animate-bounce">
          <AlertOctagon className="w-10 h-10" />
        </div>

        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">
          Ujian Ditangguhkan
        </h2>
        <div className="inline-block px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
          Status: Terkunci Sistem (Pelanggaran Melebihi Batas: {totalViolations}x)
        </div>

        {/* Protection assurance note as requested */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-left text-xs text-emerald-900 mb-6 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-emerald-950 block">Seluruh Jawaban Anda Aman:</span>
            <span>
              Sistem telah mengarsipkan dan menyimpan seluruh butir jawaban Anda secara aman di server (tidak ada data jawaban yang dihapus).
            </span>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Sesi pengerjaan Anda ditangguhkan karena sistem mendeteksi aktivitas berulang di luar lembar ujian (seperti keluar fullscreen, berpindah aplikasi/tab).
          <br /><br />
          <strong>Silakan angkat tangan dan panggil Guru Pengawas di ruang kelas Anda</strong> untuk melakukan verifikasi dan membuka kembali akses ujian.
        </p>

        {isUnlocked ? (
          <div className="p-4 bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-2 font-bold animate-pulse">
            <CheckCircle2 className="w-5 h-5" />
            <span>Verifikasi Berhasil! Membuka lembar ujian...</span>
          </div>
        ) : (
          <form onSubmit={handleVerifyPin} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 mb-1">
              <KeyRound className="w-4 h-4 text-blue-600" />
              <span>Verifikasi Pengawas (Masukkan PIN Guru / Proktor):</span>
            </div>

            {errorPin && (
              <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2 rounded-lg border border-rose-200">
                {errorPin}
              </p>
            )}

            <div className="flex gap-2 max-w-xs mx-auto">
              <input
                type="password"
                maxLength={8}
                value={inputPin}
                onChange={(e) => setInputPin(e.target.value)}
                placeholder="PIN Pengawas"
                className="w-full text-center px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-base font-mono font-bold tracking-widest bg-white"
                autoFocus
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Buka Kunci
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              *Pengawas juga dapat membuka kunci secara remote melalui Dashboard Guru. (Demo PIN: <code>{proctorPin}</code>)
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
