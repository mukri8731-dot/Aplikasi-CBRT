import React from 'react';
import { AlertTriangle, ShieldAlert, ArrowRight } from 'lucide-react';

interface ExamWarningModalProps {
  isOpen: boolean;
  violationCount: number;
  maxViolationsAllowed: number;
  latestDescription?: string;
  onConfirmReturn: () => void;
}

export const ExamWarningModal: React.FC<ExamWarningModalProps> = ({
  isOpen,
  violationCount,
  maxViolationsAllowed,
  latestDescription,
  onConfirmReturn,
}) => {
  if (!isOpen) return null;

  const remaining = Math.max(0, maxViolationsAllowed - violationCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border-2 border-amber-500 text-center relative overflow-hidden">
        {/* Top Warning Strip */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 to-rose-500" />

        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4 ring-8 ring-amber-50">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Peringatan Pelanggaran Asesmen!
        </h2>

        <p className="text-sm font-semibold text-rose-700 mb-3 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
          "Terdeteksi aktivitas meninggalkan halaman ujian. Silakan kembali ke ujian."
        </p>

        {latestDescription && (
          <p className="text-xs text-slate-600 mb-4 bg-slate-100 p-2 rounded-lg font-mono text-left">
            Insiden: {latestDescription}
          </p>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6">
          <div className="flex justify-between items-center text-xs font-semibold mb-1">
            <span className="text-slate-600">Akumulasi Pelanggaran:</span>
            <span className="text-rose-600 font-mono text-sm">{violationCount} dari {maxViolationsAllowed} batas maksimal</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                violationCount >= maxViolationsAllowed ? 'bg-rose-600' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, (violationCount / maxViolationsAllowed) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2 text-left">
            Tersisa <strong>{remaining} kesempatan</strong> sebelum sesi ujian Anda ditangguhkan otomatis dan terkunci.
          </p>
        </div>

        <button
          onClick={onConfirmReturn}
          className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Saya Mengerti & Kembali ke Soal Ujian</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
