import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ListOrdered,
} from 'lucide-react';
import { Question } from '../../types/exam';
import {
  downloadWordExamTemplate,
  parseWordExamFile,
  ParsedQuestionItem,
} from '../../utils/wordExamTemplate';

interface WordImportModalProps {
  isOpen: boolean;
  examTitle: string;
  currentQuestionsCount: number;
  onClose: () => void;
  onImport: (newQuestions: Question[], mode: 'append' | 'replace') => void;
}

export const WordImportModal: React.FC<WordImportModalProps> = ({
  isOpen,
  examTitle,
  currentQuestionsCount,
  onClose,
  onImport,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string>('');
  const [parsedItems, setParsedItems] = useState<ParsedQuestionItem[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      await downloadWordExamTemplate(examTitle);
    } catch (err) {
      console.error('Failed to generate template:', err);
      alert('Gagal mengunduh template Microsoft Word.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    setParseError('');
    setSelectedFile(file);

    // Validate extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'docx' && ext !== 'doc') {
      setParseError('Mohon pilih berkas dengan format Microsoft Word (.docx atau .doc).');
      return;
    }

    setIsParsing(true);
    try {
      const items = await parseWordExamFile(file);
      if (items.length === 0) {
        setParseError(
          'Tidak ada butir soal yang berhasil dibaca dari berkas Word. Pastikan format dokumen sesuai tabel template atau penomoran soal (1. Soal ... A. ... B. ...).'
        );
        setParsedItems([]);
      } else {
        setParsedItems(items);
      }
    } catch (err: unknown) {
      console.error('Error parsing docx:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setParseError(`Gagal membaca berkas Word: ${msg}. Pastikan berkas .docx tidak rusak.`);
      setParsedItems([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsedItems.length === 0) return;

    const formattedQuestions: Question[] = parsedItems.map((item, idx) => ({
      id: `q-word-${Date.now()}-${idx + 1}`,
      type: item.type,
      prompt: item.prompt,
      passage: item.passage,
      imageUrl: item.imageUrl,
      imageCaption: item.imageCaption,
      points: item.points || 10,
      explanation: item.explanation,
      options: item.options,
      correctOptionId: item.correctOptionId,
      correctOptionIds: item.correctOptionIds,
      isTrue: item.isTrue,
      correctShortAnswerKeywords: item.correctShortAnswerKeywords,
      essayRubric: item.essayRubric,
    }));

    onImport(formattedQuestions, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Upload & Impor Soal dari Microsoft Word
              </h3>
              <p className="text-[11px] text-slate-500">
                Paket Ujian: <span className="font-semibold text-slate-700">{examTitle}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs pr-1">
          {/* Action 1: Download Word Template Card */}
          <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-950 text-sm">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Belum punya format template Word?</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed max-w-xl">
                Unduh template resmi Microsoft Word (.docx) yang sudah kami rancang dengan tabel rapi, petunjuk pengisian, contoh soal PG (opsi A-E), Benar/Salah, Isian Singkat, dan Uraian.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={isDownloadingTemplate}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloadingTemplate ? 'Menyiapkan Word...' : 'Unduh Template Word (.docx)'}</span>
            </button>
          </div>

          {/* Action 2: Upload Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/30 rounded-2xl p-6 text-center transition-all cursor-pointer group"
          >
            <input
              type="file"
              id="word-file-input"
              accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="word-file-input" className="cursor-pointer block">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div className="font-bold text-slate-800 text-sm mb-1">
                {selectedFile ? selectedFile.name : 'Pilih atau Seret (Drag & Drop) Berkas Word di Sini'}
              </div>
              <p className="text-[11px] text-slate-500">
                Mendukung berkas Microsoft Word <strong>.docx</strong> (Word 2007 - 2026) & kompatibel dengan WPS / Office 365.
              </p>
            </label>
          </div>

          {/* Loading parsing state */}
          {isParsing && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-800">
              <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              <span>Sedang membaca dan mengurai butir-butir soal dari berkas Word...</span>
            </div>
          )}

          {/* Error Message */}
          {parseError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-bold">Gagal Mengurai Berkas Word</p>
                <p className="mt-0.5 text-slate-600">{parseError}</p>
              </div>
            </div>
          )}

          {/* Parsed Result Preview */}
          {parsedItems.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    Berhasil Mendeteksi {parsedItems.length} Butir Soal dari Dokumen Word
                  </span>
                </div>
                <div className="text-[11px] text-emerald-700">
                  Total Poin: {parsedItems.reduce((acc, q) => acc + (q.points || 0), 0)} Poin
                </div>
              </div>

              {/* Import Mode selection */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-800 text-xs">Pilihan Metode Impor ke Bank Soal:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label
                    className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2.5 transition-all ${
                      importMode === 'append'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="accent-blue-600"
                    />
                    <div>
                      <div>Tambahkan ke Soal yang Ada (+{parsedItems.length} Soal)</div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        Soal lama ({currentQuestionsCount} butir) tetap tersimpan
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2.5 transition-all ${
                      importMode === 'replace'
                        ? 'border-amber-600 bg-amber-50 text-amber-900 font-semibold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-amber-600"
                    />
                    <div>
                      <div>Gantikan Seluruh Soal Ujian</div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        Mengganti {currentQuestionsCount} butir soal lama dengan {parsedItems.length} soal baru
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* List of parsed questions preview */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                  <span>Pratinjau Butir Soal Terdeteksi:</span>
                  <span>{parsedItems.length} Soal</span>
                </div>

                {parsedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                          {item.type === 'multiple_choice' && 'Pilihan Ganda (PG)'}
                          {item.type === 'multiple_choice_multi' && 'Pilihan Ganda Kompleks (MCMA)'}
                          {item.type === 'true_false' && 'Benar / Salah'}
                          {item.type === 'short_answer' && 'Isian Singkat'}
                          {item.type === 'essay' && 'Uraian / Essay'}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {item.points} Poin
                      </span>
                    </div>

                    {item.passage && (
                      <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 italic font-serif">
                        <strong className="not-italic text-slate-700 font-sans block text-[10px]">Stimulus/Wacana:</strong>
                        {item.passage}
                      </div>
                    )}

                    {item.imageUrl && (
                      <div className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg inline-block max-w-xs">
                        <img
                          src={item.imageUrl}
                          alt={item.imageCaption || 'Gambar Butir Soal'}
                          className="max-h-24 w-auto rounded object-contain bg-white border border-slate-200"
                        />
                        {item.imageCaption && (
                          <p className="text-[9px] text-slate-500 italic mt-0.5 truncate">{item.imageCaption}</p>
                        )}
                      </div>
                    )}

                    <div className="text-xs font-semibold text-slate-900 leading-snug">
                      {item.prompt}
                    </div>

                    {(item.type === 'multiple_choice' || item.type === 'multiple_choice_multi') && item.options && (
                      <div className="space-y-1 pt-1">
                        {item.type === 'multiple_choice_multi' && (
                          <div className="text-[10px] text-blue-700 font-semibold">
                            Kunci Jawaban (MCMA):{' '}
                            <span className="font-mono font-bold">
                              {(item.correctOptionIds && item.correctOptionIds.length > 0
                                ? item.correctOptionIds
                                : [item.correctOptionId || 'A']
                              ).join(', ')}
                            </span>
                          </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 text-[11px]">
                          {item.options.map((opt) => {
                            const isCorrect =
                              item.type === 'multiple_choice_multi'
                                ? (item.correctOptionIds || (item.correctOptionId ? [item.correctOptionId] : [])).includes(opt.id)
                                : opt.id === item.correctOptionId;
                            return (
                              <div
                                key={opt.id}
                                className={`p-1.5 rounded border text-[10px] truncate ${
                                  isCorrect
                                    ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-800'
                                    : 'bg-slate-50 border-slate-200 text-slate-600'
                                }`}
                                title={`${opt.id}. ${opt.text}`}
                              >
                                <span className="font-mono">{opt.id}.</span> {opt.text}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {item.type === 'true_false' && (
                      <div className="text-[11px] text-slate-600">
                        Kunci Jawaban:{' '}
                        <span className="font-bold text-emerald-700">
                          {item.isTrue ? 'BENAR' : 'SALAH'}
                        </span>
                      </div>
                    )}

                    {item.type === 'short_answer' && item.correctShortAnswerKeywords && (
                      <div className="text-[11px] text-slate-600">
                        Kunci Kata:{' '}
                        <span className="font-mono font-bold text-emerald-700">
                          {item.correctShortAnswerKeywords.join(', ')}
                        </span>
                      </div>
                    )}

                    {item.type === 'essay' && item.essayRubric && (
                      <div className="text-[11px] text-slate-600">
                        Rubrik Nilai: <span className="italic">{item.essayRubric}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Guidance Accordion / Notes */}
          <div className="p-3.5 bg-slate-100 rounded-xl text-slate-600 text-[11px] space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>Tips Penggunaan Template Word:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
              <li>
                Gunakan template resmi untuk hasil terbaik karena kolom tabel otomatis terdeteksi rapi.
              </li>
              <li>
                Jika soal memerlukan gambar, Bapak/Ibu dapat mengimpor berkas Word terlebih dahulu, lalu klik tombol edit (<span className="font-semibold text-blue-600">Edit Soal</span>) untuk menyisipkan gambar diagram melalui menu <span className="font-semibold text-blue-600">Import / Sisipkan Gambar Soal</span>.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer text-xs"
          >
            Tutup
          </button>

          {parsedItems.length > 0 && (
            <button
              type="button"
              onClick={handleConfirmImport}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {importMode === 'append' ? 'Tambahkan' : 'Gantikan'} {parsedItems.length} Soal ke Ujian
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
