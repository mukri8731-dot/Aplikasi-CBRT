import React, { useState } from 'react';
import { Exam, StudentSubmission, User } from '../../types/exam';
import { evaluateSubmission } from '../../utils/storage';
import { CheckCircle2, Award, Clock, Printer, ArrowLeft, ShieldCheck, ChevronDown, ChevronUp, Lock } from 'lucide-react';

interface ExamFinishScreenProps {
  exam: Exam;
  student: User;
  submission: StudentSubmission;
  onReturnToHome: () => void;
}

export const ExamFinishScreen: React.FC<ExamFinishScreenProps> = ({
  exam,
  student,
  submission,
  onReturnToHome,
}) => {
  const [showReview, setShowReview] = useState<boolean>(false);

  // Calculate evaluation
  const evaluation = evaluateSubmission(exam, submission.answers);
  const score = submission.score !== undefined ? submission.score : evaluation.score;
  const isPassed = score >= exam.settings.kkm;

  const handlePrint = () => {
    window.print();
  };

  const submittedDate = submission.submittedAt
    ? new Date(submission.submittedAt).toLocaleString('id-ID', {
        dateStyle: 'full',
        timeStyle: 'medium',
      })
    : new Date().toLocaleString('id-ID');

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 sm:p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md text-white flex items-center justify-center mx-auto mb-3 border border-white/20">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Asesmen Berhasil Dikumpulkan
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-lg mx-auto">
            Seluruh berkas jawaban Anda telah dienkripsi dan tersimpan dengan aman pada pangkalan data server ujian.
          </p>
        </div>

        {/* Identity & Submission Summary */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">Nama Peserta:</span>
              <span className="font-bold text-slate-900 text-sm">{student.name}</span>
              <div className="text-slate-600 mt-0.5">
                NISN: <span className="font-mono font-medium">{student.nisn || '-'}</span> | Kelas: {student.gradeClass || 'Kelas X'}
              </div>
            </div>

            <div>
              <span className="text-slate-500 block">Mata Pelajaran & Ujian:</span>
              <span className="font-bold text-slate-900 text-sm">{exam.title}</span>
              <div className="text-slate-600 mt-0.5">
                Kode: <span className="font-mono font-medium">{exam.code}</span> | Waktu Selesai: {submittedDate}
              </div>
            </div>
          </div>

          {/* Result Card: Depends on teacher settings */}
          {exam.settings.showResultToStudent ? (
            <div className="border border-slate-200 rounded-2xl p-6 bg-gradient-to-b from-white to-blue-50/30 text-center">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Hasil Perolehan Nilai Asesmen
              </span>

              <div className="flex items-center justify-center gap-3 my-2">
                <span className="text-5xl font-black text-slate-900 font-mono tracking-tight">
                  {score}
                </span>
                <span className="text-xl text-slate-400 font-mono">/ 100</span>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4">
                {isPassed ? (
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    <span>TUNTAS (Memenuhi KKM: {exam.settings.kkm})</span>
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <span>BELUM TUNTAS / PERLU REMEDIAL (KKM: {exam.settings.kkm})</span>
                  </span>
                )}
              </div>

              {/* Toggle Review Button */}
              {exam.settings.showExplanationToStudent && (
                <div className="pt-2">
                  <button
                    onClick={() => setShowReview(!showReview)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <span>{showReview ? 'Sembunyikan Pembahasan Soal' : 'Lihat Ulasan & Pembahasan Soal'}</span>
                    {showReview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center mx-auto mb-2">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">
                Nilai Belum Dipublikasikan
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Pengaturan guru pengampu menetapkan perolehan nilai dan pembahasan akan diumumkan secara resmi setelah seluruh peserta selesai mengikuti asesmen.
              </p>
            </div>
          )}

          {/* Question Review Section (if enabled) */}
          {showReview && exam.settings.showExplanationToStudent && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                Ulasan Butir Soal & Pembahasan Kunci:
              </h3>
              {exam.questions.map((q, idx) => {
                const ans = submission.answers[q.id];
                return (
                  <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-white text-xs space-y-2">
                    <div className="flex items-center justify-between font-semibold text-slate-700">
                      <span>Soal {idx + 1} ({q.type === 'multiple_choice_multi' ? 'MCMA' : q.type})</span>
                      <span className="text-slate-400">{q.points} Poin</span>
                    </div>
                    <p className="text-slate-800 font-medium">{q.prompt}</p>

                    {q.imageUrl && (
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg inline-block max-w-sm">
                        <img
                          src={q.imageUrl}
                          alt={q.imageCaption || 'Gambar Butir Soal'}
                          className="max-h-40 w-auto rounded object-contain bg-white border border-slate-100"
                        />
                        {q.imageCaption && (
                          <p className="text-[10px] text-slate-500 italic mt-1 font-serif text-center">
                            {q.imageCaption}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="p-2.5 bg-slate-50 rounded-lg text-slate-700 font-mono text-[11px]">
                      <div>
                        <strong>Jawaban Anda:</strong>{' '}
                        {q.type === 'multiple_choice' && (ans?.selectedOptionId || 'Tidak dijawab')}
                        {q.type === 'multiple_choice_multi' && (ans?.selectedOptionIds && ans.selectedOptionIds.length > 0 ? ans.selectedOptionIds.join(', ') : 'Tidak dijawab')}
                        {q.type === 'true_false' && (ans?.booleanAnswer !== undefined ? (ans.booleanAnswer ? 'Benar' : 'Salah') : 'Tidak dijawab')}
                        {q.type === 'short_answer' && (ans?.shortAnswerText || 'Tidak dijawab')}
                        {q.type === 'essay' && (ans?.essayText || 'Tidak dijawab')}
                      </div>
                      {q.type === 'multiple_choice' && (
                        <div className="text-emerald-700 mt-1">
                          <strong>Kunci Jawaban:</strong> Pilihan {q.correctOptionId}
                        </div>
                      )}
                      {q.type === 'multiple_choice_multi' && (
                        <div className="text-emerald-700 mt-1">
                          <strong>Kunci Jawaban (MCMA):</strong> Pilihan {(q.correctOptionIds && q.correctOptionIds.length > 0 ? q.correctOptionIds : [q.correctOptionId || 'A']).join(', ')}
                        </div>
                      )}
                    </div>

                    {q.explanation && (
                      <div className="p-2.5 bg-blue-50/80 rounded-lg text-blue-900 text-[11px] leading-relaxed">
                        <strong className="block text-blue-950 mb-0.5">Pembahasan:</strong>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Integrity Note */}
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Catatan Integritas: Ujian diselesaikan dengan <strong>{submission.violations?.length || 0} catatan audit log</strong> terlampir.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handlePrint}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Bukti Pengerjaan</span>
            </button>
            <button
              onClick={onReturnToHome}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Halaman Utama</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
