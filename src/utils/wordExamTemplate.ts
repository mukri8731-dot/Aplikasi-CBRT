import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
} from 'docx';
import mammoth from 'mammoth';
import { Question, QuestionType } from '../types/exam';

/**
 * Generates and downloads a Microsoft Word (.docx) template for exam questions.
 */
export async function downloadWordExamTemplate(examTitle: string = 'Ujian Sekolah CBT'): Promise<void> {
  const tableBorder = {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  };

  const headerCell = (text: string, widthPercent: number) =>
    new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: '1E40AF' },
      margins: { top: 120, bottom: 120, left: 120, right: 120 },
      borders: tableBorder,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18, font: 'Arial' })],
        }),
      ],
    });

  const dataCell = (text: string, widthPercent: number, bold: boolean = false, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT) =>
    new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      margins: { top: 100, bottom: 100, left: 100, right: 100 },
      borders: tableBorder,
      children: [
        new Paragraph({
          alignment: align,
          children: [new TextRun({ text, bold, size: 18, font: 'Arial' })],
        }),
      ],
    });

  const sampleRows: TableRow[] = [
    // Header Row
    new TableRow({
      tableHeader: true,
      children: [
        headerCell('No', 5),
        headerCell('Tipe', 8),
        headerCell('Stimulus / Wacana', 15),
        headerCell('Pertanyaan / Soal', 20),
        headerCell('Opsi A', 8),
        headerCell('Opsi B', 8),
        headerCell('Opsi C', 8),
        headerCell('Opsi D', 8),
        headerCell('Opsi E', 8),
        headerCell('Kunci', 6),
        headerCell('Poin', 6),
      ],
    }),
    // Row 1: Multiple Choice Matematika
    new TableRow({
      children: [
        dataCell('1', 5, true, AlignmentType.CENTER),
        dataCell('PG', 8, true, AlignmentType.CENTER),
        dataCell('-', 15),
        dataCell('Akar-akar penyelesaian dari persamaan kuadrat x² - 5x + 6 = 0 adalah...', 20),
        dataCell('x = 1 atau x = 6', 8),
        dataCell('x = -2 atau x = -3', 8),
        dataCell('x = 2 atau x = 3', 8),
        dataCell('x = -1 atau x = -6', 8),
        dataCell('x = 0 atau x = 5', 8),
        dataCell('C', 6, true, AlignmentType.CENTER),
        dataCell('10', 6, false, AlignmentType.CENTER),
      ],
    }),
    // Row 2: Multiple Choice Biologi dengan Wacana
    new TableRow({
      children: [
        dataCell('2', 5, true, AlignmentType.CENTER),
        dataCell('PG', 8, true, AlignmentType.CENTER),
        dataCell('Tumbuhan hijau memanfaatkan energi cahaya matahari melalui klorofil untuk mengubah CO2 dan H2O menjadi glukosa.', 15),
        dataCell('Berdasarkan wacana di atas, gas apakah yang dihasilkan sebagai produk sampingan proses fotosintesis?', 20),
        dataCell('Nitrogen (N2)', 8),
        dataCell('Oksigen (O2)', 8),
        dataCell('Karbon Monoksida (CO)', 8),
        dataCell('Metana (CH4)', 8),
        dataCell('Hidrogen (H2)', 8),
        dataCell('B', 6, true, AlignmentType.CENTER),
        dataCell('10', 6, false, AlignmentType.CENTER),
      ],
    }),
    // Row 3: MCMA (Multiple Choice Multiple Answers / PG Kompleks)
    new TableRow({
      children: [
        dataCell('3', 5, true, AlignmentType.CENTER),
        dataCell('MCMA', 8, true, AlignmentType.CENTER),
        dataCell('-', 15),
        dataCell('Manakah di antara besaran-besaran berikut yang termasuk besaran pokok dalam sistem internasional (SI)? (Pilih semua yang benar)', 20),
        dataCell('Panjang (m)', 8),
        dataCell('Kecepatan (m/s)', 8),
        dataCell('Massa (kg)', 8),
        dataCell('Gaya (N)', 8),
        dataCell('Waktu (s)', 8),
        dataCell('A, C, E', 6, true, AlignmentType.CENTER),
        dataCell('15', 6, false, AlignmentType.CENTER),
      ],
    }),
    // Row 4: Benar / Salah
    new TableRow({
      children: [
        dataCell('4', 5, true, AlignmentType.CENTER),
        dataCell('BENAR_SALAH', 8, true, AlignmentType.CENTER),
        dataCell('-', 15),
        dataCell('Pancasila sila ke-3 berbunyi "Persatuan Indonesia".', 20),
        dataCell('-', 8),
        dataCell('-', 8),
        dataCell('-', 8),
        dataCell('-', 8),
        dataCell('-', 8),
        dataCell('BENAR', 6, true, AlignmentType.CENTER),
        dataCell('10', 6, false, AlignmentType.CENTER),
      ],
    }),
    // Row 5: Isian Singkat
    new TableRow({
      children: [
        dataCell('5', 5, true, AlignmentType.CENTER),
        dataCell('ISIAN', 8, true, AlignmentType.CENTER),
        dataCell('-', 15),
        dataCell('Ibukota negara Indonesia yang baru di Kalimantan Timur bernama...', 20),
        dataCell('-', 8),
        dataCell('-', 8),
        dataCell('-', 8),
        dataCell('-', 8),
        dataCell('-', 8),
        dataCell('Nusantara, IKN', 6, true, AlignmentType.CENTER),
        dataCell('10', 6, false, AlignmentType.CENTER),
      ],
    }),
    // Row 6: Essay / Uraian
    new TableRow({
      children: [
        dataCell('6', 5, true, AlignmentType.CENTER),
        dataCell('ESSAY', 8, true, AlignmentType.CENTER),
        dataCell('-', 15),
        dataCell('Jelaskan 3 faktor utama penyebab terjadinya pemanasan global (global warming)!', 20),
        dataCell('-', 8),
        dataCell('-', 8),
        dataCell('-', 8),
        dataCell('-', 8),
        dataCell('-', 8),
        dataCell('Rubrik: Efek rumah kaca, deforestasi, polusi industri', 6, false, AlignmentType.CENTER),
        dataCell('20', 6, false, AlignmentType.CENTER),
      ],
    }),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'TEMPLATE IMPORT SOAL UJIAN CBT & ASESMEN SEKOLAH',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Paket Ujian: ${examTitle} | Format Resmi Microsoft Word (.docx)`,
                bold: true,
                color: '475569',
                size: 20,
              }),
            ],
            spacing: { after: 240 },
          }),
          new Paragraph({
            text: 'PETUNJUK PENGISIAN UNTUK BAPAK/IBU GURU:',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 180, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '1. Tabel di bawah dapat Bapak/Ibu edit langsung. Tambahkan baris baru untuk menambah soal.\n',
              }),
              new TextRun({
                text: '2. Kolom "Tipe": Isi dengan salah satu: PG (Pilihan Ganda biasa), MCMA (Pilihan Ganda Kompleks / Multiple Answers), BENAR_SALAH, ISIAN, atau ESSAY.\n',
              }),
              new TextRun({
                text: '3. Untuk tipe PG: Isi Opsi A sampai Opsi E, dan kolom Kunci diisi 1 huruf: A, B, C, D, atau E.\n',
              }),
              new TextRun({
                text: '4. Untuk tipe MCMA: Isi Opsi A sampai Opsi E, dan kolom Kunci diisi huruf-huruf kunci benar dipisahkan koma (contoh: A, C atau A, C, E).\n',
              }),
              new TextRun({
                text: '5. Untuk tipe BENAR_SALAH: Kolom Opsi dikosongkan/tanda minus (-), kolom Kunci diisi BENAR atau SALAH.\n',
              }),
              new TextRun({
                text: '6. Untuk tipe ISIAN: Kolom Kunci diisi kata kunci jawaban benar (pisahkan tanda koma jika ada variasi kata).\n',
              }),
              new TextRun({
                text: '7. Kolom Poin: Bobot nilai numerik (contoh: 10, 15, 20).\n',
              }),
              new TextRun({
                text: '8. Selain format tabel, sistem juga menerima format teks daftar soal biasa (1. Soal ... A. ... B. ... Kunci: C atau Kunci: A, C).\n',
              }),
              new TextRun({
                text: '9. Setelah selesai mengisi, simpan berkas ini (.docx) lalu upload pada menu "Upload Soal Word".',
                bold: true,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: 'TABEL BUTIR SOAL:',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 120, after: 100 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: sampleRows,
          }),
          new Paragraph({
            spacing: { before: 240 },
            text: '',
          }),
          new Paragraph({
            text: 'Catatan: Jika ada gambar pada soal, Bapak/Ibu dapat menambahkan gambar secara langsung melalui tombol "Import / Sisipkan Gambar Soal" pada editor butir soal setelah file Word diimpor.',
            children: [
              new TextRun({
                text: '\nSelamat mengajar & menyusun asesmen pembelajaran!',
                italics: true,
                color: '64748B',
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanTitle = examTitle.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
  const filename = `Template_Soal_${cleanTitle || 'CBT'}.docx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parsed question preview item before saving
 */
export interface ParsedQuestionItem {
  id: string;
  type: QuestionType;
  prompt: string;
  passage?: string;
  imageUrl?: string;
  imageCaption?: string;
  options?: { id: string; text: string }[];
  correctOptionId?: string;
  correctOptionIds?: string[];
  isTrue?: boolean;
  correctShortAnswerKeywords?: string[];
  essayRubric?: string;
  points: number;
  explanation?: string;
  rawText?: string;
  isValid: boolean;
  validationError?: string;
}

/**
 * Parses uploaded .docx file and converts into structured questions
 */
export async function parseWordExamFile(file: File): Promise<ParsedQuestionItem[]> {
  const arrayBuffer = await file.arrayBuffer();

  // 1. First extract HTML to detect tables if present
  let htmlResult = '';
  try {
    const htmlConv = await mammoth.convertToHtml({ arrayBuffer });
    htmlResult = htmlConv.value || '';
  } catch {
    htmlResult = '';
  }

  // 2. Extract plain text as well
  let rawText = '';
  try {
    const textConv = await mammoth.extractRawText({ arrayBuffer });
    rawText = textConv.value || '';
  } catch {
    rawText = '';
  }

  const parsedQuestions: ParsedQuestionItem[] = [];

  // Method A: If HTML contains <table>, parse the table rows!
  if (htmlResult.includes('<table') && htmlResult.includes('<tr')) {
    const fromTable = parseHtmlTableQuestions(htmlResult);
    if (fromTable.length > 0) {
      return fromTable;
    }
  }

  // Method B: Parse text-based format (lines, numbering 1. 2. 3. or Q1, Q2)
  if (rawText.trim()) {
    const fromText = parseTextQuestions(rawText);
    if (fromText.length > 0) {
      return fromText;
    }
  }

  return parsedQuestions;
}

/**
 * Parse questions from HTML table (from our Word template table)
 */
function parseHtmlTableQuestions(html: string): ParsedQuestionItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const rows = doc.querySelectorAll('tr');

  const questions: ParsedQuestionItem[] = [];

  let rowIndex = 0;
  rows.forEach((row) => {
    rowIndex++;
    const cells = Array.from(row.querySelectorAll('td, th')).map((c) => (c.textContent || '').trim());
    if (cells.length < 4) return;

    // Check if this is the header row
    const firstCell = cells[0].toLowerCase();
    const secondCell = (cells[1] || '').toLowerCase();
    if (firstCell === 'no' || secondCell === 'tipe' || secondCell === 'jenis') {
      return; // Skip header
    }

    // Expected columns:
    // 0: No
    // 1: Tipe (PG, BENAR_SALAH, ISIAN, ESSAY)
    // 2: Stimulus/Wacana
    // 3: Pertanyaan/Soal
    // 4: Opsi A
    // 5: Opsi B
    // 6: Opsi C
    // 7: Opsi D
    // 8: Opsi E
    // 9: Kunci
    // 10: Poin
    const typeStr = cells[1].toUpperCase();
    const stimulus = cells[2] === '-' ? '' : cells[2];
    const prompt = cells[3];
    const optA = cells[4] || '';
    const optB = cells[5] || '';
    const optC = cells[6] || '';
    const optD = cells[7] || '';
    const optE = cells[8] || '';
    const answerKey = cells[9] || '';
    const pointsStr = cells[10] || '10';

    if (!prompt) return;

    let qType: QuestionType = 'multiple_choice';
    if (typeStr.includes('MCMA') || typeStr.includes('KOMPLEKS') || typeStr.includes('MULTI')) {
      qType = 'multiple_choice_multi';
    } else if (typeStr.includes('BENAR') || typeStr.includes('SALAH') || typeStr === 'TF' || typeStr === 'BS') {
      qType = 'true_false';
    } else if (typeStr.includes('ISIAN') || typeStr.includes('SINGKAT') || typeStr === 'SA') {
      qType = 'short_answer';
    } else if (typeStr.includes('ESSAY') || typeStr.includes('URAIAN')) {
      qType = 'essay';
    } else if (
      answerKey.includes(',') ||
      answerKey.includes(';') ||
      (answerKey.trim().length > 1 && /^[A-Ea-e\s,;]+$/.test(answerKey.trim()))
    ) {
      qType = 'multiple_choice_multi';
    } else {
      qType = 'multiple_choice';
    }

    const points = parseInt(pointsStr, 10) || 10;
    const cleanKey = answerKey.trim().toUpperCase();

    let isValid = true;
    let validationError = '';

    if (qType === 'multiple_choice' || qType === 'multiple_choice_multi') {
      if (!optA || !optB) {
        isValid = false;
        validationError = 'Pilihan jawaban A dan B minimal harus diisi.';
      }
    }

    // Check if cell or row contains an image (Mammoth creates <img> with data:image or http)
    const imgEl = row.querySelector('img');
    const tableImgUrl = imgEl?.getAttribute('src') || undefined;

    const qItem: ParsedQuestionItem = {
      id: `word-q-${Date.now()}-${rowIndex}`,
      type: qType,
      prompt,
      passage: stimulus || undefined,
      imageUrl: tableImgUrl,
      imageCaption: tableImgUrl ? `Gambar stimulus butir #${rowIndex}` : undefined,
      points,
      isValid,
      validationError,
    };

    if (qType === 'multiple_choice') {
      qItem.options = [
        { id: 'A', text: optA || 'Opsi A' },
        { id: 'B', text: optB || 'Opsi B' },
        { id: 'C', text: optC || 'Opsi C' },
        { id: 'D', text: optD || 'Opsi D' },
        { id: 'E', text: optE || 'Opsi E' },
      ];
      qItem.correctOptionId = ['A', 'B', 'C', 'D', 'E'].includes(cleanKey) ? cleanKey : 'A';
    } else if (qType === 'multiple_choice_multi') {
      qItem.options = [
        { id: 'A', text: optA || 'Opsi A' },
        { id: 'B', text: optB || 'Opsi B' },
        { id: 'C', text: optC || 'Opsi C' },
        { id: 'D', text: optD || 'Opsi D' },
        { id: 'E', text: optE || 'Opsi E' },
      ];
      const foundKeys = cleanKey
        .replace(/[^A-E]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
      const uniqueKeys = Array.from(new Set(foundKeys)).sort();
      qItem.correctOptionIds = uniqueKeys.length > 0 ? uniqueKeys : ['A', 'C'];
      qItem.correctOptionId = qItem.correctOptionIds[0];
    } else if (qType === 'true_false') {
      qItem.isTrue = cleanKey.includes('BENAR') || cleanKey === 'TRUE' || cleanKey === 'B';
    } else if (qType === 'short_answer') {
      qItem.correctShortAnswerKeywords = answerKey
        ? answerKey.split(',').map((k) => k.trim()).filter(Boolean)
        : ['kunci'];
    } else if (qType === 'essay') {
      qItem.essayRubric = answerKey;
    }

    questions.push(qItem);
  });

  return questions;
}

/**
 * Parse plain-text questions (standard numbering pattern)
 */
function parseTextQuestions(text: string): ParsedQuestionItem[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const questions: ParsedQuestionItem[] = [];

  // Group text into question blocks based on leading "1.", "2.", "Soal 1", etc.
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  const questionStartRegex = /^(?:Soal\s*)?(\d+)[.)\s]/i;

  for (const line of lines) {
    if (questionStartRegex.test(line)) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock);
      }
      currentBlock = [line];
    } else if (currentBlock.length > 0) {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  let index = 0;
  for (const block of blocks) {
    index++;
    let prompt = '';
    let stimulus = '';
    let textImageUrl = '';
    const options: { id: string; text: string }[] = [];
    let correctKey = '';
    let points = 10;
    let qType: QuestionType = 'multiple_choice';

    for (const rawLine of block) {
      const line = rawLine.trim();

      // Check for Wacana / Stimulus
      if (/^(?:Wacana|Stimulus|Bacaan)\s*[:：]/i.test(line)) {
        stimulus = line.replace(/^(?:Wacana|Stimulus|Bacaan)\s*[:：]\s*/i, '');
        continue;
      }

      // Check for Gambar / Image
      if (/^(?:Gambar|Image|Foto|Ilustrasi)\s*[:：]/i.test(line)) {
        textImageUrl = line.replace(/^(?:Gambar|Image|Foto|Ilustrasi)\s*[:：]\s*/i, '').trim();
        continue;
      }

      // Check for Kunci / Jawaban
      if (/^(?:Kunci|Kunci Jawaban|Jawaban|Ans|Answer)\s*[:：]/i.test(line)) {
        correctKey = line.replace(/^(?:Kunci|Kunci Jawaban|Jawaban|Ans|Answer)\s*[:：]\s*/i, '').trim();
        continue;
      }

      // Check for Poin / Bobot
      if (/^(?:Poin|Bobot|Nilai)\s*[:：]/i.test(line)) {
        const pMatch = line.match(/\d+/);
        if (pMatch) points = parseInt(pMatch[0], 10);
        continue;
      }

      // Check for Options A., B., C., D., E.
      const optMatch = line.match(/^([A-Ea-e])[.)\s]\s*(.*)$/);
      if (optMatch) {
        options.push({
          id: optMatch[1].toUpperCase(),
          text: optMatch[2].trim(),
        });
        continue;
      }

      // Otherwise, it's prompt text
      if (!prompt) {
        prompt = line.replace(questionStartRegex, '').trim();
      } else {
        prompt += ' ' + line;
      }
    }

    if (!prompt) continue;

    // Detect question type
    const upperKey = correctKey.toUpperCase();
    const promptLower = prompt.toLowerCase();
    const hasMultipleKeys =
      correctKey.includes(',') ||
      correctKey.includes(';') ||
      (correctKey.trim().length > 1 && /^[A-Ea-e\s,;]+$/.test(correctKey.trim()));

    if (upperKey.includes('BENAR') || upperKey.includes('SALAH') || upperKey === 'TRUE' || upperKey === 'FALSE') {
      qType = 'true_false';
    } else if (promptLower.includes('[mcma]') || promptLower.includes('mcma') || promptLower.includes('kompleks') || hasMultipleKeys) {
      qType = 'multiple_choice_multi';
    } else if (options.length === 0) {
      if (correctKey.length > 0 && correctKey.length < 50) {
        qType = 'short_answer';
      } else {
        qType = 'essay';
      }
    } else {
      qType = 'multiple_choice';
    }

    // Ensure options A to E for multiple choice / MCMA
    if (qType === 'multiple_choice' || qType === 'multiple_choice_multi') {
      const existingIds = options.map((o) => o.id);
      ['A', 'B', 'C', 'D', 'E'].forEach((letter) => {
        if (!existingIds.includes(letter)) {
          options.push({ id: letter, text: `Pilihan ${letter}` });
        }
      });
      options.sort((a, b) => a.id.localeCompare(b.id));
    }

    const item: ParsedQuestionItem = {
      id: `text-q-${Date.now()}-${index}`,
      type: qType,
      prompt,
      passage: stimulus || undefined,
      imageUrl: textImageUrl || undefined,
      imageCaption: textImageUrl ? `Gambar stimulus butir #${index}` : undefined,
      points,
      isValid: Boolean(prompt),
    };

    if (qType === 'multiple_choice') {
      item.options = options;
      item.correctOptionId = ['A', 'B', 'C', 'D', 'E'].includes(upperKey) ? upperKey : 'A';
    } else if (qType === 'multiple_choice_multi') {
      item.options = options;
      const foundKeys = upperKey
        .replace(/[^A-E]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
      const uniqueKeys = Array.from(new Set(foundKeys)).sort();
      item.correctOptionIds = uniqueKeys.length > 0 ? uniqueKeys : ['A', 'C'];
      item.correctOptionId = item.correctOptionIds[0];
    } else if (qType === 'true_false') {
      item.isTrue = upperKey.includes('BENAR') || upperKey === 'TRUE';
    } else if (qType === 'short_answer') {
      item.correctShortAnswerKeywords = correctKey ? correctKey.split(',').map((k) => k.trim()) : ['jawaban'];
    } else {
      item.essayRubric = correctKey;
    }

    questions.push(item);
  }

  return questions;
}
