import React, { useState } from 'react';
import { 
   Users, BookOpen, UserCheck, ShieldAlert, Settings, LogOut, Plus, Edit2, Trash2, 
   ChevronRight, ChevronLeft, Database, Save, CheckCircle, Lock, BookMarked, FileText, Printer,
   Calendar, Clock, Camera, Search, RefreshCw, AlertCircle, Upload, Download, FileSpreadsheet
} from 'lucide-react';
import logoMinSukoharjo from '../assets/logo_min_sukoharjo.jpg';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { Kelas, Halaqoh, Siswa, Musyrif, CatatanHarian } from '../types';

interface AbsenMusyrif {
  id: string;
  musyrifId: string;
  musyrifNama: string;
  tanggal: string; // YYYY-MM-DD
  waktu: string; // HH:mm:ss
  hari: string; // e.g. Senin, Selasa, dll
  fotoUrl: string; // base64 string
  status?: 'Proses' | 'Disetujui';
}

interface AdminDashboardProps {
  onLogout: () => void;
  classes: Kelas[];
  students: Siswa[];
  musyrifs: Musyrif[];
  halaqohs: Halaqoh[];
  journals: CatatanHarian[];
  adminPass: string;
  refreshData: () => Promise<void>;
}

export default function AdminDashboard({
  onLogout,
  classes,
  students,
  musyrifs,
  halaqohs,
  journals,
  adminPass,
  refreshData
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'kelas' | 'siswa' | 'pengajar' | 'halaqoh' | 'laporan' | 'pengaturan' | 'absen'>('kelas');
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: 'success' });

  // Modal States
  const [modalType, setModalType] = useState<'add' | 'edit' | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // Form Field States
  // 1. Kelas Form
  const [kelasNama, setKelasNama] = useState('');

  // 2. Halaqoh Form
  const [halaqohNama, setHalaqohNama] = useState('');
  const [halaqohMusyrifId, setHalaqohMusyrifId] = useState('');
  const [selectedMusyrifIds, setSelectedMusyrifIds] = useState<string[]>([]);

  const handleToggleMusyrif = (mId: string) => {
    setSelectedMusyrifIds(prev => 
      prev.includes(mId) ? prev.filter(id => id !== mId) : [...prev, mId]
    );
  };

  // 3. Siswa Form
  const [siswaNoInduk, setSiswaNoInduk] = useState('');
  const [siswaNama, setSiswaNama] = useState('');
  const [siswaKelasId, setSiswaKelasId] = useState('');
  const [siswaHalaqohId, setSiswaHalaqohId] = useState('');
  const [siswaIsKelasDasar, setSiswaIsKelasDasar] = useState(false);
  const [siswaIsKelasTahfidz, setSiswaIsKelasTahfidz] = useState(false);

  // 4. Musyrif Form
  const [musyrifNim, setMusyrifNim] = useState('');
  const [musyrifNama, setMusyrifNama] = useState('');
  const [musyrifHalaqohId, setMusyrifHalaqohId] = useState('');
  const [musyrifUsername, setMusyrifUsername] = useState('');
  const [musyrifPassword, setMusyrifPassword] = useState('');

  // 5. Laporan Form
  const [selectedLaporanHalaqohId, setSelectedLaporanHalaqohId] = useState(halaqohs[0]?.id || '');
  const [selectedLaporanMusyrifId, setSelectedLaporanMusyrifId] = useState('');
  const [selectedLaporanKelasTipe, setSelectedLaporanKelasTipe] = useState('semua');

  // 6. Pengaturan Form
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');

  // 7. Absen States
  const [attendances, setAttendances] = useState<AbsenMusyrif[]>([]);
  const [absenSearch, setAbsenSearch] = useState('');
  const [absenStartDateFilter, setAbsenStartDateFilter] = useState('');
  const [absenEndDateFilter, setAbsenEndDateFilter] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [loadingAbsen, setLoadingAbsen] = useState(false);

  // 8. Bulk Import / Update States
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkParsedData, setBulkParsedData] = useState<any[]>([]);
  const [bulkImportProgress, setBulkImportProgress] = useState<{current: number; total: number} | null>(null);
  const [bulkImportError, setBulkImportError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // 9. Bulk Assign Halaqoh States for Checklist
  const [selectedSiswaIds, setSelectedSiswaIds] = useState<string[]>([]);
  const [bulkTargetHalaqohId, setBulkTargetHalaqohId] = useState<string>('');
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [siswaSearch, setSiswaSearch] = useState('');
  const [siswaHalaqohFilter, setSiswaHalaqohFilter] = useState('all');
  const [siswaCurrentPage, setSiswaCurrentPage] = useState(1);

  // Sync attendance logs when the administrator views the 'absen' tab
  React.useEffect(() => {
    if (activeTab !== 'absen') return;

    setLoadingAbsen(true);
    const q = collection(db, 'absen_musyrif');

    const unsub = onSnapshot(q, (snap) => {
      const list: AbsenMusyrif[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as AbsenMusyrif);
      });
      // Sort in memory by newest first (tanggal desc, then waktu desc)
      list.sort((a, b) => {
        const dateTimeA = `${a.tanggal}T${a.waktu}`;
        const dateTimeB = `${b.tanggal}T${b.waktu}`;
        return dateTimeB.localeCompare(dateTimeA);
      });
      setAttendances(list);
      setLoadingAbsen(false);
    }, (err) => {
      console.error('Error fetching admin attendances:', err);
      setLoadingAbsen(false);
    });

    return () => unsub();
  }, [activeTab]);

  const handleDeleteAbsen = async (id: string) => {
    const isConfirmed = window.confirm('Apakah Anda yakin ingin menghapus catatan absen ini secara permanen?');
    if (!isConfirmed) return;

    setIsSaving(true);
    try {
      await deleteDoc(doc(db, 'absen_musyrif', id));
      showFeedback('Catatan absen berhasil dihapus!');
    } catch (err: any) {
      showFeedback('Gagal menghapus catatan absen: ' + err.message, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveAbsen = async (id: string) => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'absen_musyrif', id), {
        status: 'Disetujui'
      });
      showFeedback('Kehadiran Musyrif berhasil disetujui!');
    } catch (err: any) {
      showFeedback('Gagal menyetujui kehadiran: ' + err.message, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRejectAbsen = async (id: string) => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'absen_musyrif', id), {
        status: 'Proses'
      });
      showFeedback('Persetujuan kehadiran musyrif berhasil dibatalkan.');
    } catch (err: any) {
      showFeedback('Gagal membatalkan persetujuan: ' + err.message, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredAttendances = attendances.filter(absen => {
    const nameMatch = (absen.musyrifNama || '').toLowerCase().includes(absenSearch.toLowerCase());
    
    let dateMatch = true;
    if (absenStartDateFilter && absenEndDateFilter) {
      dateMatch = absen.tanggal >= absenStartDateFilter && absen.tanggal <= absenEndDateFilter;
    } else if (absenStartDateFilter) {
      dateMatch = absen.tanggal >= absenStartDateFilter;
    } else if (absenEndDateFilter) {
      dateMatch = absen.tanggal <= absenEndDateFilter;
    }
    
    return nameMatch && dateMatch;
  });

  // Helpers
  const showFeedback = (text: string, type: 'success' | 'danger' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg({ text: '', type: 'success' }), 4000);
  };

  const closeFormModal = () => {
    setModalType(null);
    setEditId(null);
    // Reset forms
    setKelasNama('');
    setHalaqohNama('');
    setHalaqohMusyrifId('');
    setSelectedMusyrifIds([]);
    setSiswaNoInduk('');
    setSiswaNama('');
    setSiswaKelasId('');
    setSiswaHalaqohId('');
    setSiswaIsKelasDasar(false);
    setSiswaIsKelasTahfidz(false);
    setMusyrifNim('');
    setMusyrifNama('');
    setMusyrifHalaqohId('');
    setMusyrifUsername('');
    setMusyrifPassword('');
  };

  // ----------------------------------------------------
  // SUBMIT HANDLERS
  // ----------------------------------------------------

  // 1. KELAS
  const handleKelasSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kelasNama.trim()) return;
    setIsSaving(true);
    try {
      if (modalType === 'add') {
        await addDoc(collection(db, 'classes'), { nama: kelasNama.trim() });
        showFeedback('Berhasil menambah kelas baru!');
      } else if (modalType === 'edit' && editId) {
        await updateDoc(doc(db, 'classes', editId), { nama: kelasNama.trim() });
        // Update students with old class name
        const associatedStudents = students.filter(s => s.kelasId === editId);
        for (const s of associatedStudents) {
          await updateDoc(doc(db, 'students', s.id), { kelasNama: kelasNama.trim() });
        }
        showFeedback('Berhasil memperbarui kelas!');
      }
      await refreshData();
      closeFormModal();
    } catch (err: any) {
      showFeedback('Gagal menyimpan kelas: ' + err.message, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  // 2. HALAQOH
  const handleHalaqohSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!halaqohNama.trim()) return;
    setIsSaving(true);
    try {
      const chosenMusyrifs = musyrifs.filter(m => selectedMusyrifIds.includes(m.id));
      const mNames = chosenMusyrifs.map(m => m.nama).join(', ');
      const truncatedNames = mNames.length > 150 ? mNames.slice(0, 147) + '...' : mNames;

      // For backward compatibility and firestore.rules:
      const mId = chosenMusyrifs.length > 0 ? chosenMusyrifs[0].id : '';
      const mNama = chosenMusyrifs.length > 0 ? truncatedNames : 'Belum Ditentukan';

      const payload = {
        nama: halaqohNama.trim(),
        musyrifId: mId,
        musyrifNama: mNama,
        musyrifIds: selectedMusyrifIds
      };

      if (modalType === 'add') {
        const docRef = await addDoc(collection(db, 'halaqoh'), payload);

        // Cascade update assigned Musyrifs
        for (const mId of selectedMusyrifIds) {
          await updateDoc(doc(db, 'musyrif', mId), {
            halaqohId: docRef.id,
            halaqohNama: halaqohNama.trim()
          });
        }

        showFeedback('Berhasil menambah halaqoh baru!');
      } else if (modalType === 'edit' && editId) {
        await updateDoc(doc(db, 'halaqoh', editId), payload);

        // Cascade updates: students referencing this halaqoh
        const associatedStudents = students.filter(s => s.halaqohId === editId);
        for (const s of associatedStudents) {
          await updateDoc(doc(db, 'students', s.id), { halaqohNama: halaqohNama.trim() });
        }

        // Cascade updates: currently assigned Musyrifs
        for (const mId of selectedMusyrifIds) {
          await updateDoc(doc(db, 'musyrif', mId), {
            halaqohId: editId,
            halaqohNama: halaqohNama.trim()
          });
        }

        // Cascade updates: previously assigned Musyrifs who are no longer in selectedMusyrifIds
        const previouslyAssignedMusyrif = musyrifs.filter(m => m.halaqohId === editId);
        for (const m of previouslyAssignedMusyrif) {
          if (!selectedMusyrifIds.includes(m.id)) {
            await updateDoc(doc(db, 'musyrif', m.id), {
              halaqohId: '',
              halaqohNama: 'Belum Ditentukan'
            });
          }
        }

        showFeedback('Berhasil memperbarui halaqoh!');
      }
      await refreshData();
      closeFormModal();
    } catch (err: any) {
      showFeedback('Gagal menyimpan halaqoh: ' + err.message, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  // 3. SISWA
  const handleSiswaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siswaNoInduk.trim() || !siswaNama.trim() || !siswaKelasId) return;
    setIsSaving(true);
    try {
      const cls = classes.find(c => c.id === siswaKelasId);
      const hq = halaqohs.find(h => h.id === siswaHalaqohId);

      const payload = {
        noInduk: siswaNoInduk.trim(),
        nama: siswaNama.trim(),
        kelasId: siswaKelasId,
        kelasNama: cls ? cls.nama : '',
        halaqohId: siswaHalaqohId || '',
        halaqohNama: hq ? hq.nama : 'Belum Ada Halaqoh',
        isKelasDasar: siswaIsKelasDasar,
        isKelasTahfidz: siswaIsKelasTahfidz
      };

      if (modalType === 'add') {
        await addDoc(collection(db, 'students'), payload);
        showFeedback('Berhasil menambah siswa baru!');
      } else if (modalType === 'edit' && editId) {
        await updateDoc(doc(db, 'students', editId), payload);
        showFeedback('Berhasil memperbarui profil siswa!');
      }
      await refreshData();
      closeFormModal();
    } catch (err: any) {
      showFeedback('Gagal menyimpan siswa: ' + err.message, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  // --- BULK STUDENT IMPORT HELPERS ---
  const findExistingStudent = (rowNoInduk: string, rowNama: string, currentStudents: Siswa[]) => {
    const cleanNoInduk = (rowNoInduk || '').trim();
    const cleanNama = (rowNama || '').trim().toLowerCase();

    // Match by No Induk first if provided and non-empty
    if (cleanNoInduk) {
      const matchByNoInduk = currentStudents.find(
        s => (s.noInduk || '').trim() === cleanNoInduk
      );
      if (matchByNoInduk) return matchByNoInduk;
    }

    // Fallback match by Name (case-insensitive) if provided
    if (cleanNama) {
      const matchByNama = currentStudents.find(
        s => (s.nama || '').trim().toLowerCase() === cleanNama
      );
      if (matchByNama) return matchByNama;
    }

    return undefined;
  };

  const generateNextNoInduk = (currentStudents: Siswa[]): string => {
    let maxNum = 1000;
    for (const s of currentStudents) {
      if (s.noInduk) {
        const num = parseInt(s.noInduk.replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
    return (maxNum + 1).toString();
  };

  const parseCSV = (text: string): string[][] => {
    const result: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentValue = "";

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentValue);
        currentValue = "";
      } else if (char === ';' && !inQuotes) {
        // support semicolon as separator (common in Indonesian Excel regional settings)
        row.push(currentValue);
        currentValue = "";
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(currentValue);
        result.push(row);
        row = [];
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    if (currentValue || row.length > 0) {
      row.push(currentValue);
      result.push(row);
    }
    // Trim spaces and filter out empty rows
    return result
      .map(r => r.map(cell => cell.trim().replace(/^"|"$/g, '').trim()))
      .filter(r => r.some(cell => cell !== ""));
  };

  const processParsedRows = (rawRows: string[][]): any[] => {
    // Filter out metadata rows like sep=; or sep=, or completely empty lines
    const cleanRawRows = rawRows.filter(row => {
      if (row.length === 0) return false;
      if (row.some(cell => cell.toLowerCase().startsWith('sep='))) {
        return false;
      }
      return true;
    });

    let startIndex = 0;
    if (cleanRawRows.length > 0) {
      const firstRow = cleanRawRows[0].map(cell => cell.toLowerCase().trim());
      if (firstRow.some(cell => cell.includes('induk') || cell.includes('nama') || cell.includes('kelas') || cell.includes('halaqoh'))) {
        startIndex = 1; // Skip header row
      }
    }

    const processed: any[] = [];

    for (let i = startIndex; i < cleanRawRows.length; i++) {
      const cols = cleanRawRows[i];
      if (cols.length < 2) continue; // Must have at least No Induk & Nama

      const noInduk = cols[0] ? cols[0].trim() : '';
      const nama = cols[1] ? cols[1].trim() : '';
      const kelasNamaRaw = cols[2] ? cols[2].trim() : '';
      const halaqohNamaRaw = cols[3] ? cols[3].trim() : '';
      
      const dasarRaw = cols[4] ? cols[4].trim().toLowerCase() : '';
      const tahfidzRaw = cols[5] ? cols[5].trim().toLowerCase() : '';

      const rowErrors: string[] = [];
      if (!nama) rowErrors.push("Nama Lengkap wajib diisi.");

      // Check if student with same noInduk or name already exists
      const existingStudent = findExistingStudent(noInduk, nama, students);
      const action = existingStudent ? 'update' : 'insert';

      // Match class
      let matchedClassId = '';
      let matchedClassName = '';
      let isUnmatchedClass = false;

      if (kelasNamaRaw) {
        const cls = classes.find(c => c.nama.toLowerCase().trim() === kelasNamaRaw.toLowerCase().trim());
        if (cls) {
          matchedClassId = cls.id;
          matchedClassName = cls.nama;
        } else {
          isUnmatchedClass = true;
          if (existingStudent) {
            matchedClassId = existingStudent.kelasId || '';
            matchedClassName = existingStudent.kelasNama || '';
          }
        }
      } else {
        if (existingStudent) {
          matchedClassId = existingStudent.kelasId || '';
          matchedClassName = existingStudent.kelasNama || '';
        }
      }

      // Match halaqoh
      let matchedHalaqohId = '';
      let matchedHalaqohName = 'Belum Ada Halaqoh';
      let isUnmatchedHalaqoh = false;

      if (halaqohNamaRaw) {
        const hq = halaqohs.find(h => h.nama.toLowerCase().trim() === halaqohNamaRaw.toLowerCase().trim());
        if (hq) {
          matchedHalaqohId = hq.id;
          matchedHalaqohName = hq.nama;
        } else {
          isUnmatchedHalaqoh = true;
          if (existingStudent) {
            matchedHalaqohId = existingStudent.halaqohId || '';
            matchedHalaqohName = existingStudent.halaqohNama || 'Belum Ada Halaqoh';
          }
        }
      } else {
        if (existingStudent) {
          matchedHalaqohId = existingStudent.halaqohId || '';
          matchedHalaqohName = existingStudent.halaqohNama || 'Belum Ada Halaqoh';
        }
      }

      // Programs
      let isKelasDasar = false;
      let isKelasTahfidz = false;

      const hasDasarCol = cols[4] !== undefined && cols[4] !== null && cols[4].trim() !== '';
      const hasTahfidzCol = cols[5] !== undefined && cols[5] !== null && cols[5].trim() !== '';

      if (hasDasarCol) {
        isKelasDasar = dasarRaw === 'y' || dasarRaw === 'ya' || dasarRaw === 'yes' || dasarRaw === '1' || dasarRaw === 'true';
      } else {
        if (existingStudent) {
          isKelasDasar = existingStudent.isKelasDasar || false;
        }
      }

      if (hasTahfidzCol) {
        isKelasTahfidz = tahfidzRaw === 'y' || tahfidzRaw === 'ya' || tahfidzRaw === 'yes' || tahfidzRaw === '1' || tahfidzRaw === 'true';
      } else {
        if (existingStudent) {
          isKelasTahfidz = existingStudent.isKelasTahfidz || false;
        }
      }

      processed.push({
        noInduk,
        nama,
        kelasNamaRaw,
        halaqohNamaRaw,
        isKelasDasar,
        isKelasTahfidz,
        hasDasarCol,
        hasTahfidzCol,
        action,
        matchedClassId,
        matchedClassName,
        matchedHalaqohId,
        matchedHalaqohName,
        isUnmatchedClass,
        isUnmatchedHalaqoh,
        isValid: rowErrors.length === 0,
        errors: rowErrors
      });
    }

    return processed;
  };

  const handleDownloadTemplate = () => {
    const headers = "No Induk;Nama;Nama Kelas;Nama Halaqoh;Kelas Dasar (Y/T);Kelas Tahfidz (Y/T)";
    const exampleRows = [
      "1001;Ahmad Fauzan;Kelas 1A;Halaqoh Al-Mulk;Y;T",
      "1002;Muhammad Ibrahim;Kelas 2B;Halaqoh An-Naba;T;Y",
      "1003;Siti Aminah;Kelas 3A;;Y;Y"
    ];
    // Add sep=; instruction line for Excel compatibility
    const csvContent = "\ufeff" + ["sep=;", headers, ...exampleRows].join("\n"); // UTF-8 BOM for Excel
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "template_input_siswa.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showFeedback("Template Excel (CSV) diunduh! Kolom otomatis terpisah di Excel.");
  };

  const handleFileSelected = (file: File) => {
    setBulkFile(file);
    setBulkImportError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setBulkImportError("Gagal membaca file.");
        return;
      }
      try {
        const rawRows = parseCSV(text);
        const processed = processParsedRows(rawRows);
        setBulkParsedData(processed);
      } catch (err: any) {
        setBulkImportError("Gagal mengurai file CSV: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => {
    setDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleCommitImport = async () => {
    if (bulkParsedData.length === 0) return;
    setBulkImportProgress({ current: 0, total: bulkParsedData.length });
    setBulkImportError(null);
    setIsSaving(true);

    try {
      let count = 0;
      let importedNewCount = 0;
      let updatedCount = 0;
      const accumulatedStudents = [...students];

      for (const row of bulkParsedData) {
        if (!row.isValid) {
          count++;
          setBulkImportProgress({ current: count, total: bulkParsedData.length });
          continue; // Skip invalid rows
        }

        const existingStudent = findExistingStudent(row.noInduk, row.nama, accumulatedStudents);

        if (existingStudent) {
          // Update existing student without wiping out existing class/halaqoh if blank in CSV
          const payload: any = {
            nama: row.nama || existingStudent.nama || '',
            noInduk: row.noInduk || existingStudent.noInduk || '',
            kelasId: row.matchedClassId || existingStudent.kelasId || '',
            kelasNama: row.matchedClassName || existingStudent.kelasNama || '',
            halaqohId: row.matchedHalaqohId || existingStudent.halaqohId || '',
            halaqohNama: (row.matchedHalaqohName && row.matchedHalaqohName !== 'Belum Ada Halaqoh') 
              ? row.matchedHalaqohName 
              : (existingStudent.halaqohNama || 'Belum Ada Halaqoh'),
            isKelasDasar: row.hasDasarCol ? row.isKelasDasar : (existingStudent.isKelasDasar || false),
            isKelasTahfidz: row.hasTahfidzCol ? row.isKelasTahfidz : (existingStudent.isKelasTahfidz || false)
          };

          await updateDoc(doc(db, 'students', existingStudent.id), payload);
          
          const idx = accumulatedStudents.findIndex(s => s.id === existingStudent.id);
          if (idx !== -1) {
            accumulatedStudents[idx] = { ...accumulatedStudents[idx], ...payload };
          }
          updatedCount++;
        } else {
          // Add NEW student (data bertambah / appends to existing database)
          const assignedNoInduk = row.noInduk || generateNextNoInduk(accumulatedStudents);
          const payload = {
            noInduk: assignedNoInduk,
            nama: row.nama,
            kelasId: row.matchedClassId || '',
            kelasNama: row.matchedClassName || '',
            halaqohId: row.matchedHalaqohId || '',
            halaqohNama: row.matchedHalaqohName || 'Belum Ada Halaqoh',
            isKelasDasar: row.isKelasDasar || false,
            isKelasTahfidz: row.isKelasTahfidz || false
          };

          const docRef = await addDoc(collection(db, 'students'), payload);
          
          accumulatedStudents.push({
            id: docRef.id,
            ...payload
          });
          importedNewCount++;
        }

        count++;
        setBulkImportProgress({ current: count, total: bulkParsedData.length });
      }

      await refreshData();
      showFeedback(`Berhasil mengimpor data massal! (${importedNewCount} siswa baru ditambahkan, ${updatedCount} siswa diperbarui)`);
      setShowBulkModal(false);
      setBulkFile(null);
      setBulkParsedData([]);
      setBulkImportProgress(null);
    } catch (err: any) {
      setBulkImportError(err.message || 'Terjadi kesalahan saat mengimpor data.');
      showFeedback('Gagal mengimpor data masal: ' + err.message, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  // 9. Bulk Assign Halaqoh for Selected Students
  const handleBulkAssignHalaqoh = async () => {
    if (selectedSiswaIds.length === 0) return;
    setIsBulkAssigning(true);
    try {
      const hq = halaqohs.find(h => h.id === bulkTargetHalaqohId);
      const targetHalaqohNama = hq ? hq.nama : 'Belum Ada Halaqoh';
      const targetHalaqohId = bulkTargetHalaqohId || '';

      for (const id of selectedSiswaIds) {
        await updateDoc(doc(db, 'students', id), {
          halaqohId: targetHalaqohId,
          halaqohNama: targetHalaqohNama
        });
      }

      await refreshData();
      showFeedback(`Berhasil mengatur halaqoh untuk ${selectedSiswaIds.length} siswa!`);
      setSelectedSiswaIds([]);
      setBulkTargetHalaqohId('');
    } catch (err: any) {
      showFeedback('Gagal mengatur halaqoh siswa secara massal: ' + err.message, 'danger');
    } finally {
      setIsBulkAssigning(false);
    }
  };

  // 10. Bulk Delete for Selected Students
  const handleBulkDeleteSiswa = async () => {
    if (selectedSiswaIds.length === 0) return;
    const isConfirmed = window.confirm(`Apakah Anda yakin ingin menghapus ${selectedSiswaIds.length} data siswa terpilih secara permanen?`);
    if (!isConfirmed) return;

    setIsBulkAssigning(true);
    try {
      for (const id of selectedSiswaIds) {
        await deleteDoc(doc(db, 'students', id));
      }

      await refreshData();
      showFeedback(`Berhasil menghapus ${selectedSiswaIds.length} siswa secara massal!`);
      setSelectedSiswaIds([]);
    } catch (err: any) {
      showFeedback('Gagal menghapus siswa secara massal: ' + err.message, 'danger');
    } finally {
      setIsBulkAssigning(false);
    }
  };

  // 4. PENGAJAR (MUSYRIF)
  const handleMusyrifSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!musyrifNim.trim() || !musyrifNama.trim() || !musyrifUsername.trim()) return;
    setIsSaving(true);
    try {
      const hq = halaqohs.find(h => h.id === musyrifHalaqohId);
      
      const payload: any = {
        nim: musyrifNim.trim(),
        nama: musyrifNama.trim(),
        username: musyrifUsername.trim(),
        halaqohId: musyrifHalaqohId || '',
        halaqohNama: hq ? hq.nama : 'Belum Ditentukan'
      };
      
      // Only include password if set (or on add)
      if (musyrifPassword.trim()) {
        payload.password = musyrifPassword.trim();
      }

      if (modalType === 'add') {
        if (!musyrifPassword.trim()) {
          showFeedback('Password wajib diisi untuk pengajar baru!', 'danger');
          setIsSaving(false);
          return;
        }
        const docRef = await addDoc(collection(db, 'musyrif'), payload);

        // If a halaqoh was chosen, link it with this musyrif automatically
        if (musyrifHalaqohId) {
          const targetHq = halaqohs.find(h => h.id === musyrifHalaqohId);
          if (targetHq) {
            const currentIds = targetHq.musyrifIds || (targetHq.musyrifId ? [targetHq.musyrifId] : []);
            if (!currentIds.includes(docRef.id)) {
              const newIds = [...currentIds, docRef.id];
              const assignedMusyrifs = [
                ...musyrifs.filter(m => newIds.includes(m.id)),
                { id: docRef.id, nama: musyrifNama.trim() }
              ];
              const mNames = assignedMusyrifs.map(m => m.nama).join(', ');
              const truncatedNames = mNames.length > 150 ? mNames.slice(0, 147) + '...' : mNames;

              await updateDoc(doc(db, 'halaqoh', musyrifHalaqohId), {
                musyrifId: newIds[0] || '',
                musyrifNama: truncatedNames,
                musyrifIds: newIds
              });
            }
          }
        }
        showFeedback('Berhasil menambah pengajar baru!');
      } else if (modalType === 'edit' && editId) {
        await updateDoc(doc(db, 'musyrif', editId), payload);

        // Find old assigned halaqoh
        const oldMusyrif = musyrifs.find(m => m.id === editId);

        // Link with selected halaqoh
        if (musyrifHalaqohId) {
          const targetHq = halaqohs.find(h => h.id === musyrifHalaqohId);
          if (targetHq) {
            const currentIds = targetHq.musyrifIds || (targetHq.musyrifId ? [targetHq.musyrifId] : []);
            if (!currentIds.includes(editId)) {
              const newIds = [...currentIds, editId];
              const assignedMusyrifs = [
                ...musyrifs.filter(m => newIds.includes(m.id) && m.id !== editId),
                { id: editId, nama: musyrifNama.trim() }
              ];
              const mNames = assignedMusyrifs.map(m => m.nama).join(', ');
              const truncatedNames = mNames.length > 150 ? mNames.slice(0, 147) + '...' : mNames;

              await updateDoc(doc(db, 'halaqoh', musyrifHalaqohId), {
                musyrifId: newIds[0] || '',
                musyrifNama: truncatedNames,
                musyrifIds: newIds
              });
            }
          }
        }

        // Remove from old halaqoh if it changed
        if (oldMusyrif && oldMusyrif.halaqohId && oldMusyrif.halaqohId !== musyrifHalaqohId) {
          const oldHqId = oldMusyrif.halaqohId;
          const oldHq = halaqohs.find(h => h.id === oldHqId);
          if (oldHq) {
            const currentIds = oldHq.musyrifIds || (oldHq.musyrifId ? [oldHq.musyrifId] : []);
            const newIds = currentIds.filter(id => id !== editId);
            const assignedMusyrifs = musyrifs.filter(m => newIds.includes(m.id) && m.id !== editId);
            const mNames = assignedMusyrifs.map(m => m.nama).join(', ');
            const truncatedNames = mNames.length > 150 ? mNames.slice(0, 147) + '...' : mNames;

            await updateDoc(doc(db, 'halaqoh', oldHqId), {
              musyrifId: newIds[0] || '',
              musyrifNama: newIds.length > 0 ? truncatedNames : 'Belum Ditentukan',
              musyrifIds: newIds
            });
          }
        }
        showFeedback('Berhasil memperbarui data pengajar!');
      }
      await refreshData();
      closeFormModal();
    } catch (err: any) {
      showFeedback('Gagal menyimpan data pengajar: ' + err.message, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  // 5. DELETE HANDLERS
  const handleDeleteObj = async (collectionName: 'classes' | 'students' | 'musyrif' | 'halaqoh', id: string) => {
    const isConfirmed = window.confirm('Apakah Anda yakin ingin menghapus data ini secara permanen?');
    if (!isConfirmed) return;
    
    setIsSaving(true);
    try {
      await deleteDoc(doc(db, collectionName, id));
      showFeedback('Data berhasil dihapus!');
      await refreshData();
    } catch (err: any) {
      showFeedback('Gagal menghapus data: ' + err.message, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  // 6. CHANGE PASSWORD ADMIN
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPass !== adminPass) {
      showFeedback('Password saat ini salah!', 'danger');
      return;
    }
    if (!newPass || newPass !== confirmNewPass) {
      showFeedback('Konfirmasi password baru tidak cocok!', 'danger');
      return;
    }
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'settings', 'admin'), {
        adminPassword: newPass.trim()
      });
      showFeedback('Password administrator berhasil diubah!');
      setCurrentPass('');
      setNewPass('');
      setConfirmNewPass('');
      await refreshData();
    } catch (err: any) {
      showFeedback('Gagal mengubah password: ' + err.message, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCetakPDF = () => {
    if (!activeHalaqoh) return;

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) return;

    // Build compact table rows for printing
    const tableRowsHtml = reportStudents.map((siswa, idx) => {
      const baseHistory = journals
        .filter(j => j.siswaId === siswa.id && (j.program === 'tahfidz' || (j.program !== 'dasar' && !!j.kategori)))
        .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
      
      const totalSetoran = baseHistory.length;

      let setoranTerakhirHtml = '';
      let riwayatCompactHtml = '';

      if (totalSetoran === 0) {
        setoranTerakhirHtml = `<span class="no-data">Belum ada catatan setoran.</span>`;
        riwayatCompactHtml = `<span class="no-data">-</span>`;
      } else {
        const latestLog = baseHistory[0];
        const otherLogs = baseHistory.slice(1, 4); // show next 3 logs

        const labelNilai = latestLog.nilai === 'A' ? 'Mumtaz (A)' : 
                           latestLog.nilai === 'B' ? 'Jayyid Jiddan (B)' : 
                           latestLog.nilai === 'C' ? 'Jayyid (C)' : 
                           latestLog.nilai === 'D' ? 'Maqbul (D)' : 'Rosib (E)';

        setoranTerakhirHtml = `
          <div class="latest-setoran-box">
            <div class="latest-meta">
              <span>Tanggal: <strong>${latestLog.tanggal}</strong></span>
              <span class="nilai-badge nilai-${latestLog.nilai}">${labelNilai}</span>
            </div>
            <div style="margin-top: 3px;"><strong>Materi:</strong> ${latestLog.materiSetoran}</div>
          </div>
        `;

        if (otherLogs.length === 0) {
          riwayatCompactHtml = `<span class="no-data">Tidak ada riwayat lain.</span>`;
        } else {
          const items = otherLogs.map(log => `
            <li>
              <strong>${log.tanggal}</strong>: ${log.materiSetoran} 
              <span class="nilai-badge-tiny nilai-${log.nilai}">${log.nilai}</span>
            </li>
          `).join('');
          riwayatCompactHtml = `<ul class="history-compact-list">${items}</ul>`;
        }
      }

      return `
        <tr>
          <td style="text-align: center; font-weight: bold; vertical-align: middle;">${idx + 1}</td>
          <td>
            <div class="siswa-info">
              <span class="siswa-name-cell">${siswa.nama}</span>
              <span class="siswa-sub-cell">No. Induk: ${siswa.noInduk}</span>
              <span class="siswa-sub-cell">Kelas: ${siswa.kelasNama || 'Belum Diatur'}</span>
            </div>
          </td>
          <td style="text-align: center; vertical-align: middle;">
            <span class="badge-total">${totalSetoran} Setoran</span>
          </td>
          <td>${setoranTerakhirHtml}</td>
          <td>${riwayatCompactHtml}</td>
        </tr>
      `;
    }).join('');

    const formattedDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Laporan Tahfidz - Halaqoh ${activeHalaqoh.nama}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          body {
            font-family: 'Inter', -apple-system, sans-serif;
            color: #1e293b;
            padding: 30px;
            margin: 0;
            background-color: #fff;
            line-height: 1.3;
          }
          .header {
            text-align: center;
            border-bottom: 3px double #0f766e;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            font-size: 20px;
            color: #0f766e;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .header h2 {
            margin: 4px 0 0;
            font-size: 13px;
            color: #334155;
            font-weight: 600;
          }
          .header p {
            margin: 4px 0 0;
            font-size: 10px;
            color: #64748b;
            font-style: italic;
          }
          .meta-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 15px;
            font-size: 11px;
          }
          .meta-item {
            margin-bottom: 4px;
          }
          .meta-item:last-child {
            margin-bottom: 0;
          }
          .meta-item strong {
            color: #334155;
            display: inline-block;
            width: 120px;
          }
          .report-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            margin-bottom: 25px;
            font-size: 11px;
          }
          .report-table th, .report-table td {
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            vertical-align: top;
          }
          .report-table th {
            background-color: #f1f5f9;
            color: #0f766e;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.5px;
          }
          .report-table tr {
            page-break-inside: avoid;
          }
          .report-table tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .siswa-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .siswa-name-cell {
            font-weight: 700;
            color: #0f172a;
            text-transform: uppercase;
            font-size: 11px;
          }
          .siswa-sub-cell {
            font-size: 9px;
            color: #64748b;
          }
          .badge-total {
            display: inline-block;
            font-weight: 700;
            background-color: #f0fdf4;
            color: #166534;
            border: 1px solid #bbf7d0;
            border-radius: 4px;
            padding: 2px 6px;
            font-size: 9px;
            white-space: nowrap;
          }
          .latest-setoran-box {
            display: flex;
            flex-direction: column;
            gap: 2px;
            font-size: 10px;
          }
          .latest-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px dashed #e2e8f0;
            padding-bottom: 2px;
            margin-bottom: 2px;
            font-size: 9px;
          }
          .nilai-badge {
            font-weight: 700;
            font-size: 8px;
            padding: 1px 4px;
            border-radius: 4px;
            text-transform: uppercase;
            white-space: nowrap;
          }
          .nilai-badge-tiny {
            font-weight: 700;
            font-size: 8px;
            padding: 0px 3px;
            border-radius: 3px;
            text-transform: uppercase;
            display: inline-block;
          }
          .nilai-A { background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
          .nilai-B { background-color: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; }
          .nilai-C { background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
          .nilai-D { background-color: #fef08a; color: #854d0e; border: 1px solid #fde68a; }
          .nilai-E { background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
          
          .history-compact-list {
            margin: 0;
            padding-left: 12px;
            font-size: 9px;
            color: #475569;
          }
          .history-compact-list li {
            margin-bottom: 2px;
            line-height: 1.2;
          }
          .history-compact-list li:last-child {
            margin-bottom: 0;
          }
          .no-data {
            font-size: 9px;
            color: #94a3b8;
            font-style: italic;
            margin: 0;
          }
          .footer-signature {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            font-size: 11px;
            page-break-inside: avoid;
          }
          .sig-box {
            width: 180px;
            text-align: center;
          }
          .sig-line {
            margin-top: 50px;
            border-top: 1px solid #475569;
            padding-top: 4px;
            font-weight: 700;
            color: #1e293b;
          }
          @media print {
            body {
              padding: 0;
            }
            @page {
              size: A4;
              margin: 1cm;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MARKAZ MUHIBBIL QUR'AN</h1>
          <h2>LAPORAN PERKEMBANGAN TAHFIDZ SANTRI</h2>
          <p>Mencetak Generasi Qur'ani yang Berakhlaqul Karimah</p>
        </div>

        <div class="meta-container">
          <div>
            <div class="meta-item"><strong>Halaqoh Qur'an</strong>: ${activeHalaqoh.nama}</div>
            <div class="meta-item"><strong>Musyrif Pengampu</strong>: ${activeHalaqohMusyrifNames}</div>
            <div class="meta-item"><strong>Kategori Kelas</strong>: ${selectedLaporanKelasTipe === 'semua' ? 'Semua Kelas (Dasar & Tahfidz)' : selectedLaporanKelasTipe === 'dasar' ? 'Kelas Dasar' : 'Kelas Tahfidz'}</div>
          </div>
          <div>
            <div class="meta-item"><strong>Tanggal Cetak</strong>: ${formattedDate}</div>
            <div class="meta-item"><strong>Jumlah Santri</strong>: ${reportStudents.length} Anak</div>
          </div>
        </div>

        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">No</th>
              <th style="width: 25%; text-align: left;">Nama Santri</th>
              <th style="width: 12%; text-align: center;">Total Setoran</th>
              <th style="width: 33%; text-align: left;">Setoran Terakhir (Utama)</th>
              <th style="width: 25%; text-align: left;">Riwayat Sebelumnya (Ringkas)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="footer-signature">
          <div class="sig-box">
            <div>Mengetahui,</div>
            <div style="font-weight: 700; margin-top: 4px;">Pimpinan Markaz</div>
            <div class="sig-line">__________________________</div>
          </div>
          <div class="sig-box">
            <div>Sukoharjo, ${formattedDate}</div>
            <div style="font-weight: 700; margin-top: 4px;">Musyrif Pengampu</div>
            <div class="sig-line">${activeHalaqohMusyrifNames}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Small delay to ensure iframe resources/fonts are loaded before printing
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      
      // Cleanup the iframe after printing is initiated
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 5000);
    }, 500);
  };

  // Helper getters to compute totals dynamically
  const getClassStudentCount = (kelasId: string) => {
    return students.filter(s => s.kelasId === kelasId).length;
  };

  const getHalaqohStudentCount = (hqId: string) => {
    return students.filter(s => s.halaqohId === hqId).length;
  };

  // Prepare reports data
  const reportStudents = students.filter(s => {
    if (s.halaqohId !== selectedLaporanHalaqohId) return false;
    if (selectedLaporanKelasTipe === 'dasar') return s.isKelasDasar === true;
    if (selectedLaporanKelasTipe === 'tahfidz') return s.isKelasTahfidz === true;
    return true;
  });
  const reportStudentIds = reportStudents.map(s => s.id);
  const reportJournals = journals.filter(j => 
    reportStudentIds.includes(j.siswaId) && 
    (j.program === 'tahfidz' || (j.program !== 'dasar' && !!j.kategori))
  );
  const activeHalaqoh = halaqohs.find(h => h.id === selectedLaporanHalaqohId);
  const activeHalaqohMusyrifs = musyrifs.filter(m => 
    m.halaqohId === selectedLaporanHalaqohId || 
    (activeHalaqoh?.musyrifIds && activeHalaqoh.musyrifIds.includes(m.id))
  );
  const activeHalaqohMusyrifNames = activeHalaqohMusyrifs.map(m => m.nama).join(', ') || activeHalaqoh?.musyrifNama || 'Belum Ditentukan';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Admin Navigation bar */}
      <nav className="bg-emerald-900 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-emerald-500/50">
                <img src={logoMinSukoharjo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div>
                <span className="font-extrabold text-sm sm:text-base leading-none block uppercase">
                  HALAMAN ADMIN
                </span>
                <span className="text-xs text-emerald-300 font-semibold uppercase tracking-wider block">
                  MARKAZ MUHIBBIL QUR'AN
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="admin-logout-btn"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-700/80 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition duration-150 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Admin Central Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-6">
        
        {/* Left Side menu sidebar (Responsive) */}
        <div className="w-full md:w-64 flex-none space-y-2">
          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm space-y-1">
            <h4 className="text-xs font-bold text-slate-400 px-3 uppercase tracking-wider mb-2">MENU UTAMA</h4>
            
            {[
              { id: 'kelas', label: 'Data Kelas', icon: BookOpen },
              { id: 'siswa', label: 'Data Siswa', icon: Users },
              { id: 'pengajar', label: 'Data Pengajar', icon: UserCheck },
              { id: 'halaqoh', label: 'Data Halaqoh', icon: BookMarked },
              { id: 'absen', label: 'Kelola Absen', icon: Calendar },
              { id: 'laporan', label: 'Laporan Tahfidz', icon: FileText },
              { id: 'pengaturan', label: 'Pengaturan', icon: Settings }
            ].map(tab => {
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setFeedbackMsg({ text: '', type: 'success' });
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-emerald-50 text-emerald-800 shadow-xs border-l-4 border-emerald-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <IconComp className={`w-4 h-4 ${activeTab === tab.id ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-400 opacity-60" />
                </button>
              );
            })}
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-900">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <ShieldAlert className="w-4 h-4 text-emerald-700" />
              <span>Sesi Administrator</span>
            </div>
            <p className="text-emerald-700">Semua aksi tambah, edit, dan hapus langsung tersinkronisasi ke Firebase Database.</p>
          </div>
        </div>

        {/* Right Side Content Pane */}
        <div className="flex-1 bg-white border border-slate-150 p-6 rounded-3xl shadow-sm space-y-6">
          
          {feedbackMsg.text && (
            <div className={`p-4 rounded-xl text-xs font-semibold border ${
              feedbackMsg.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-250 text-rose-800'
            }`}>
              {feedbackMsg.text}
            </div>
          )}

          {/* TAB 1: KELAS */}
          {activeTab === 'kelas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">Daftar Kelas</h3>
                  <p className="text-xs text-slate-500">Kelola semua tingkatan kelas yang ada di MIN 6 Sukoharjo</p>
                </div>
                <button
                  onClick={() => {
                    setModalType('add');
                    setKelasNama('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Kelas</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-16">NO</th>
                      <th className="py-3.5 px-4">NAMA KELAS</th>
                      <th className="py-3.5 px-4 text-center">TOTAL SISWA KELAS INI</th>
                      <th className="py-3.5 px-4 text-right w-32">OPSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {classes.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 font-medium">Belum ada kelas. Klik Tambah Kelas di atas.</td>
                      </tr>
                    ) : (
                      classes.map((c, i) => (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-400">{i + 1}</td>
                          <td className="py-3 px-4 font-bold text-slate-950">{c.nama}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full font-bold text-[11px]">
                              {getClassStudentCount(c.id)} Siswa
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => {
                                  setModalType('edit');
                                  setEditId(c.id);
                                  setKelasNama(c.nama);
                                }}
                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer transition"
                                title="Edit Kelas"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteObj('classes', c.id)}
                                className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer transition"
                                title="Hapus Kelas"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: SISWA */}
          {activeTab === 'siswa' && (() => {
            const filteredStudents = students.filter(sys => {
              const matchesSearch = sys.nama.toLowerCase().includes(siswaSearch.toLowerCase()) || 
                                    sys.noInduk.toLowerCase().includes(siswaSearch.toLowerCase()) ||
                                    (sys.kelasNama || '').toLowerCase().includes(siswaSearch.toLowerCase());
              
              const matchesHalaqoh = siswaHalaqohFilter === 'all' || 
                                     (siswaHalaqohFilter === 'none' && (!sys.halaqohId || sys.halaqohId === '')) || 
                                     sys.halaqohId === siswaHalaqohFilter;
                                     
              return matchesSearch && matchesHalaqoh;
            });

            const itemsPerPage = 25;
            const totalSiswaItems = filteredStudents.length;
            const totalSiswaPages = Math.ceil(totalSiswaItems / itemsPerPage) || 1;
            const currentPage = Math.min(siswaCurrentPage, totalSiswaPages);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

            return (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-1 rounded-2xl">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">Daftar Siswa</h3>
                    <p className="text-xs text-slate-500">Kelola database siswa, no induk, dan pemetaan halaqoh</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleDownloadTemplate}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Template Excel</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowBulkModal(true);
                        setBulkFile(null);
                        setBulkParsedData([]);
                        setBulkImportProgress(null);
                        setBulkImportError(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>Update Massal (Excel/CSV)</span>
                    </button>
                    <button
                      onClick={() => {
                        setModalType('add');
                        setSiswaNoInduk('');
                        setSiswaNama('');
                        setSiswaKelasId('');
                        setSiswaHalaqohId('');
                        setSiswaIsKelasDasar(false);
                        setSiswaIsKelasTahfidz(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-750 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 shrink-0" />
                      <span>Tambah Siswa</span>
                    </button>
                  </div>
                </div>

                {/* Search & Filter Controls */}
                <div className="flex flex-col md:flex-row gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                    </span>
                    <input
                      type="text"
                      placeholder="Cari siswa berdasarkan nama, no induk, atau kelas..."
                      value={siswaSearch}
                      onChange={(e) => {
                        setSiswaSearch(e.target.value);
                        setSiswaCurrentPage(1);
                      }}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none transition shadow-2xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-600 shrink-0">Filter Halaqoh:</label>
                    <select
                      value={siswaHalaqohFilter}
                      onChange={(e) => {
                        setSiswaHalaqohFilter(e.target.value);
                        setSelectedSiswaIds([]); // clear checkboxes on filter change
                        setSiswaCurrentPage(1);
                      }}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none transition shadow-2xs cursor-pointer min-w-44"
                    >
                      <option value="all">Semua Halaqoh</option>
                      <option value="none">Belum Ada Halaqoh</option>
                      {halaqohs.map(h => (
                        <option key={h.id} value={h.id}>{h.nama}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Bulk Action Panel */}
                {selectedSiswaIds.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-indigo-50 border border-indigo-150 rounded-2xl animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                        {selectedSiswaIds.length}
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-indigo-900">Siswa Terpilih</p>
                        <p className="text-[10px] text-indigo-600">Pilih halaqoh sasaran untuk mengatur penempatan siswa sekaligus, atau hapus data terpilih secara massal.</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={bulkTargetHalaqohId}
                        onChange={(e) => setBulkTargetHalaqohId(e.target.value)}
                        className="px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none transition shadow-2xs cursor-pointer text-indigo-950 font-bold min-w-44"
                      >
                        <option value="">-- Atur Tanpa Halaqoh --</option>
                        {halaqohs.map(h => (
                          <option key={h.id} value={h.id}>Pindahkan ke: {h.nama}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleBulkAssignHalaqoh}
                        disabled={isBulkAssigning}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shadow-sm"
                      >
                        {isBulkAssigning ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Memproses...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Terapkan Halaqoh</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleBulkDeleteSiswa}
                        disabled={isBulkAssigning}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shadow-sm"
                      >
                        {isBulkAssigning ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Memproses...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus Massal</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setSelectedSiswaIds([])}
                        disabled={isBulkAssigning}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-700 font-extrabold text-xs rounded-xl transition cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider">
                        <th className="py-3.5 px-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={paginatedStudents.length > 0 && paginatedStudents.every(s => selectedSiswaIds.includes(s.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const currentIds = paginatedStudents.map(s => s.id);
                                setSelectedSiswaIds(prev => Array.from(new Set([...prev, ...currentIds])));
                              } else {
                                const currentIds = paginatedStudents.map(s => s.id);
                                setSelectedSiswaIds(prev => prev.filter(id => !currentIds.includes(id)));
                              }
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                        </th>
                        <th className="py-3.5 px-4 w-12">NO</th>
                        <th className="py-3.5 px-4 w-28">NO INDUK</th>
                        <th className="py-3.5 px-4">NAMA LENGKAP SISWA</th>
                        <th className="py-3.5 px-4">PROGRAM</th>
                        <th className="py-3.5 px-4">KELAS</th>
                        <th className="py-3.5 px-4">HALAQOH QUR'AN</th>
                        <th className="py-3.5 px-4 text-right w-24">OPSI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {paginatedStudents.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">Data siswa tidak ditemukan.</td>
                        </tr>
                      ) : (
                        paginatedStudents.map((sys, idx) => {
                          const isSelected = selectedSiswaIds.includes(sys.id);
                          return (
                            <tr key={sys.id} className={`hover:bg-slate-50/50 ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                              <td className="py-3 px-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setSelectedSiswaIds(selectedSiswaIds.filter(id => id !== sys.id));
                                    } else {
                                      setSelectedSiswaIds([...selectedSiswaIds, sys.id]);
                                    }
                                  }}
                                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-400">{startIndex + idx + 1}</td>
                              <td className="py-3 px-4 font-mono font-semibold text-slate-800">{sys.noInduk}</td>
                              <td className="py-3 px-4 font-bold text-slate-900">{sys.nama}</td>
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap gap-1">
                                  {sys.isKelasDasar && (
                                    <span className="px-2 py-0.5 bg-sky-50 border border-sky-200 text-sky-700 rounded-lg text-[10px] font-bold">
                                      Dasar
                                    </span>
                                  )}
                                  {sys.isKelasTahfidz && (
                                    <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[10px] font-bold">
                                      Tahfidz
                                    </span>
                                  )}
                                  {!sys.isKelasDasar && !sys.isKelasTahfidz && (
                                    <span className="text-slate-400 italic text-[11px]">-</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-medium">
                                  {sys.kelasNama || 'N/A'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-150 px-2.5 py-0.5 rounded-full text-[11px]">
                                  {sys.halaqohNama || 'Belum Ada Halaqoh'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex gap-1.5">
                                  <button
                                    onClick={() => {
                                      setModalType('edit');
                                      setEditId(sys.id);
                                      setSiswaNoInduk(sys.noInduk);
                                      setSiswaNama(sys.nama);
                                      setSiswaKelasId(sys.kelasId);
                                      setSiswaHalaqohId(sys.halaqohId);
                                      setSiswaIsKelasDasar(sys.isKelasDasar || false);
                                      setSiswaIsKelasTahfidz(sys.isKelasTahfidz || false);
                                    }}
                                    className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer transition"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteObj('students', sys.id)}
                                    className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalSiswaPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                    <p className="text-xs font-medium text-slate-500">
                      Menampilkan <strong className="text-slate-800 font-extrabold">{startIndex + 1}</strong> sampai{" "}
                      <strong className="text-slate-800 font-extrabold">{Math.min(endIndex, totalSiswaItems)}</strong> dari{" "}
                      <strong className="text-slate-800 font-extrabold">{totalSiswaItems}</strong> siswa
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSiswaCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition cursor-pointer"
                        title="Halaman Sebelumnya"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      
                      {/* Page numbers */}
                      {(() => {
                        const pages = [];
                        const maxVisiblePages = 5;
                        let startPage = Math.max(1, currentPage - 2);
                        let endPage = Math.min(totalSiswaPages, startPage + maxVisiblePages - 1);
                        
                        if (endPage - startPage + 1 < maxVisiblePages) {
                          startPage = Math.max(1, endPage - maxVisiblePages + 1);
                        }
                        
                        for (let p = startPage; p <= endPage; p++) {
                          const isActive = p === currentPage;
                          pages.push(
                            <button
                              key={p}
                              onClick={() => setSiswaCurrentPage(p)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                                isActive 
                                  ? 'bg-emerald-600 text-white shadow-xs' 
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {p}
                            </button>
                          );
                        }
                        return pages;
                      })()}

                      <button
                        onClick={() => setSiswaCurrentPage(prev => Math.min(prev + 1, totalSiswaPages))}
                        disabled={currentPage === totalSiswaPages}
                        className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition cursor-pointer"
                        title="Halaman Berikutnya"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 3: PENGAJAR */}
          {activeTab === 'pengajar' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">Daftar Pengajar (Musyrif)</h3>
                  <p className="text-xs text-slate-500">Kelola akun dan kredensial akses login Musyrif lapangan</p>
                </div>
                <button
                  onClick={() => {
                    setModalType('add');
                    setMusyrifNim('');
                    setMusyrifNama('');
                    setMusyrifHalaqohId('');
                    setMusyrifUsername('');
                    setMusyrifPassword('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Pengajar</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-12">NO</th>
                      <th className="py-3.5 px-4">NIM</th>
                      <th className="py-3.5 px-4">NAMA PENGAJAR</th>
                      <th className="py-3.5 px-4">USERNAME</th>
                      <th className="py-3.5 px-4">PASSWORD</th>
                      <th className="py-3.5 px-4 text-right w-24">OPSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {musyrifs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">Belum ada pengajar terdaftar.</td>
                      </tr>
                    ) : (
                      musyrifs.map((m, i) => (
                        <tr key={m.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-400">{i + 1}</td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800">{m.nim}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{m.nama}</td>
                          <td className="py-3 px-4 font-mono">{m.username}</td>
                          <td className="py-3 px-4 font-mono text-slate-400 select-all font-bold group hover:text-slate-700 transition" title="Klik untuk menyalin">
                            ⚡ {m.password || '●●●●●●'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex gap-1.5">
                              <button
                                onClick={() => {
                                  setModalType('edit');
                                  setEditId(m.id);
                                  setMusyrifNim(m.nim);
                                  setMusyrifNama(m.nama);
                                  setMusyrifHalaqohId(m.halaqohId);
                                  setMusyrifUsername(m.username);
                                  setMusyrifPassword(m.password || '');
                                }}
                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteObj('musyrif', m.id)}
                                className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: HALAQOH */}
          {activeTab === 'halaqoh' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">Daftar Halaqoh Qur'an</h3>
                  <p className="text-xs text-slate-500">Kelompok halaqoh, pengampu, serta jumlah keanggotaan santri</p>
                </div>
                <button
                  onClick={() => {
                    setModalType('add');
                    setHalaqohNama('');
                    setHalaqohMusyrifId('');
                    setSelectedMusyrifIds([]);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Halaqoh</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-12">NO</th>
                      <th className="py-3.5 px-4">NAMA HALAQOH</th>
                      <th className="py-3.5 px-4">MUSYRIF PENGAMPU</th>
                      <th className="py-3.5 px-4 text-center">JUMLAH SISWA</th>
                      <th className="py-3.5 px-4 text-right w-24">OPSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {halaqohs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">Belum ada halaqoh terdaftar.</td>
                      </tr>
                    ) : (
                      halaqohs.map((hp, index) => (
                        <tr key={hp.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-400">{index + 1}</td>
                          <td className="py-3 px-4 font-bold text-emerald-800">{hp.nama}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{hp.musyrifNama}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full font-bold text-[10px]">
                              {getHalaqohStudentCount(hp.id)} Santri
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex gap-1.5">
                              <button
                                onClick={() => {
                                  setModalType('edit');
                                  setEditId(hp.id);
                                  setHalaqohNama(hp.nama);
                                  setHalaqohMusyrifId(hp.musyrifId);
                                  if (hp.musyrifIds && Array.isArray(hp.musyrifIds)) {
                                    setSelectedMusyrifIds(hp.musyrifIds);
                                  } else if (hp.musyrifId) {
                                    setSelectedMusyrifIds([hp.musyrifId]);
                                  } else {
                                    setSelectedMusyrifIds([]);
                                  }
                                }}
                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteObj('halaqoh', hp.id)}
                                className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: LAPORAN TAHFIDZ */}
          {activeTab === 'laporan' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-extrabold text-slate-800">Laporan Rekonstruksi & Rekap Tahfidz</h3>
                <p className="text-xs text-slate-500">Filter berdasarkan Halaqoh untuk menampilkan seluruh data siswa bersangkutan</p>
              </div>

              {/* Filter Row */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 items-center flex-wrap w-full md:w-auto">
                  {/* Select Halaqoh */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-bold text-slate-600 shrink-0">PILIH HALAQOH:</span>
                    <select
                      value={selectedLaporanHalaqohId}
                      onChange={(e) => setSelectedLaporanHalaqohId(e.target.value)}
                      className="w-full sm:w-56 px-3 py-2 bg-white border border-slate-250 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    >
                      <option value="">-- Silahkan Pilih Halaqoh --</option>
                      {halaqohs.map(hq => (
                        <option key={hq.id} value={hq.id}>{hq.nama}</option>
                      ))}
                    </select>
                  </div>

                  {/* Select Kategori Kelas (Dasar / Tahfidz) */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-bold text-slate-600 shrink-0">PILIH KELAS:</span>
                    <select
                      value={selectedLaporanKelasTipe}
                      onChange={(e) => setSelectedLaporanKelasTipe(e.target.value)}
                      className="w-full sm:w-44 px-3 py-2 bg-white border border-slate-250 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    >
                      <option value="semua">-- Semua (Dasar & Tahfidz) --</option>
                      <option value="dasar">Kelas Dasar</option>
                      <option value="tahfidz">Kelas Tahfidz</option>
                    </select>
                  </div>

                  {activeHalaqoh && (
                    <div className="text-xs text-slate-500 hidden lg:block">
                      Musyrif Pengampu: <strong className="text-emerald-800">{activeHalaqohMusyrifNames}</strong>
                    </div>
                  )}
                </div>

                {selectedLaporanHalaqohId && (
                  <button
                    onClick={handleCetakPDF}
                    className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm hover:shadow shrink-0 self-stretch md:self-auto"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak PDF</span>
                  </button>
                )}
              </div>

              {selectedLaporanHalaqohId ? (
                <div className="space-y-6">
                  {/* Summary Metric Header */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">Total Anggota Halaqoh</div>
                      <div className="text-2xl font-black text-emerald-900 mt-1">{reportStudents.length} Siswa</div>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-600">Total Transaksi Setoran</div>
                      <div className="text-2xl font-black text-indigo-900 mt-1">
                        {reportJournals.length} Setoran
                      </div>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-amber-600">Peringkat Mumtaz (A)</div>
                      <div className="text-2xl font-black text-amber-900 mt-1">
                        {reportJournals.filter(j => j.nilai === 'A').length} Kali
                      </div>
                    </div>
                  </div>

                  {/* List of Students & their Progress Reports */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Detail Perkembangan Perkembangan Per Siswa</h4>
                    
                    {reportStudents.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                        Tidak ada siswa terdaftar pada halaqoh ini.
                      </div>
                    ) : (
                      reportStudents.map((siswa, isDx) => {
                        // Gather history logs of this student
                        const baseHistory = journals.filter(j => j.siswaId === siswa.id && (j.program === 'tahfidz' || (j.program !== 'dasar' && !!j.kategori)));
                        
                        return (
                          <div key={siswa.id} className="p-5 bg-white border border-slate-100 shadow-xs rounded-2xl space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-50 pb-2">
                              <div>
                                <span className="text-[10px] font-mono text-slate-400">#{isDx + 1} | INDUK: {siswa.noInduk}</span>
                                <h5 className="font-extrabold text-sm text-slate-800 uppercase">{siswa.nama}</h5>
                              </div>
                              <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-100 self-start sm:self-auto">
                                Kelas: {siswa.kelasNama || 'Belum Diatur'}
                              </span>
                            </div>

                            {/* Setoran Logs History Ledger */}
                            <div className="space-y-2">
                              <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Histori Jurnal Setoran ({baseHistory.length}):</h6>
                              {baseHistory.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">Belum ada catatan setoran harian untuk siswa ini.</p>
                              ) : (
                                <div className="grid grid-cols-1 gap-2">
                                  {baseHistory.map(log => (
                                    <div key={log.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-mono font-bold text-slate-500">{log.tanggal}</span>
                                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                          log.nilai === 'A' ? 'bg-emerald-100 text-emerald-800' :
                                          log.nilai === 'B' ? 'bg-indigo-100 text-indigo-800' :
                                          log.nilai === 'C' ? 'bg-amber-150 text-amber-900' :
                                          log.nilai === 'D' ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-rose-100 text-rose-800'
                                        }`}>
                                          Nilai: {log.nilai === 'A' ? 'Mumtaz (A)' : 
                                                 log.nilai === 'B' ? 'Jayyid Jidid (B)' : 
                                                 log.nilai === 'C' ? 'Jayyid (C)' : 
                                                 log.nilai === 'D' ? 'Maqbul (D)' : 'Rosib (E)'}
                                        </span>
                                      </div>
                                      <div><strong>Materi:</strong> <span className="text-slate-800">{log.materiSetoran}</span></div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-150 text-xs text-slate-400">
                  Silahkan pilih salah satu Halaqoh Qur'an di atas untuk melihat laporan.
                </div>
              )}
            </div>
          )}

          {/* TAB 5.5: KELOLA ABSEN */}
          {activeTab === 'absen' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">Kelola Absen Musyrif</h3>
                  <p className="text-xs text-slate-500">Monitor daftar kehadiran, hari, tanggal, waktu, dan verifikasi foto selfie para Musyrif</p>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 items-end">
                <div className="relative">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nama Musyrif</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                      type="text"
                      placeholder="Cari nama musyrif..."
                      value={absenSearch}
                      onChange={(e) => setAbsenSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tanggal Mulai</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Calendar className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                      type="date"
                      value={absenStartDateFilter}
                      onChange={(e) => setAbsenStartDateFilter(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tanggal Selesai</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Calendar className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                      type="date"
                      value={absenEndDateFilter}
                      onChange={(e) => setAbsenEndDateFilter(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium text-slate-800"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    setAbsenSearch('');
                    setAbsenStartDateFilter('');
                    setAbsenEndDateFilter('');
                  }}
                  className="w-full h-9 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center"
                >
                  Reset Filter
                </button>
              </div>

              {/* Attendance Table / Content */}
              {loadingAbsen ? (
                <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                  <p className="font-semibold">Memuat catatan kehadiran...</p>
                </div>
              ) : filteredAttendances.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-semibold">Tidak ditemukan catatan kehadiran musyrif.</p>
                  <p className="text-[10px] text-slate-400">Silakan coba sesuaikan filter pencarian atau tanggal.</p>
                </div>
              ) : (
                <>
                  {/* Desktop View Table */}
                  <div className="hidden md:block overflow-x-auto border border-slate-100 rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider">
                          <th className="py-3.5 px-4 w-12 text-center">NO</th>
                          <th className="py-3.5 px-4">NAMA MUSYRIF</th>
                          <th className="py-3.5 px-4">HALAQOH AMPUAN</th>
                          <th className="py-3.5 px-4 text-center">HARI & TANGGAL</th>
                          <th className="py-3.5 px-4 text-center">WAKTU</th>
                          <th className="py-3.5 px-4 text-center w-28">FOTO SELFIE</th>
                          <th className="py-3.5 px-4 text-center">STATUS</th>
                          <th className="py-3.5 px-4 text-right w-20">AKSI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {filteredAttendances.map((absen, idx) => {
                          const matchedMusyrif = musyrifs.find(m => m.id === absen.musyrifId);
                          let displayDate = absen.tanggal;
                          try {
                            displayDate = new Date(absen.tanggal).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            });
                          } catch (_) {}
                          
                          return (
                            <tr key={absen.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-4 font-mono font-bold text-slate-400 text-center">{idx + 1}</td>
                              <td className="py-3 px-4 font-extrabold text-slate-900 uppercase">
                                {absen.musyrifNama}
                                {matchedMusyrif && (
                                  <span className="block text-[10px] font-mono font-medium text-slate-400 lowercase">
                                    @{matchedMusyrif.username}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-150 px-2.5 py-0.5 rounded-full text-[11px]">
                                  {matchedMusyrif?.halaqohNama || 'N/A'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center font-medium">
                                {absen.hari}, {displayDate}
                              </td>
                              <td className="py-3 px-4 text-center font-mono font-semibold text-slate-600">
                                {absen.waktu} WIB
                              </td>
                              <td className="py-3 px-4 text-center">
                                {absen.fotoUrl ? (
                                  <button
                                    onClick={() => setPreviewPhoto(absen.fotoUrl)}
                                    className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 mx-auto cursor-pointer group hover:border-emerald-500 transition shadow-xs block"
                                  >
                                    <img 
                                      src={absen.fotoUrl} 
                                      alt="Selfie" 
                                      className="w-full h-full object-cover group-hover:scale-110 transition duration-200" 
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                      <Camera className="w-4 h-4 text-white" />
                                    </div>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">No Photo</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center">
                                  {absen.status === 'Disetujui' ? (
                                    <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-xl flex items-center gap-1">
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Disetujui
                                    </span>
                                  ) : (
                                    <span className="text-xs font-extrabold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1.5 rounded-xl flex items-center gap-1 animate-pulse">
                                      <span className="w-2 h-2 rounded-full bg-amber-500" /> Proses
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {absen.status !== 'Disetujui' ? (
                                    <button
                                      onClick={() => handleApproveAbsen(absen.id)}
                                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-lg cursor-pointer transition flex items-center gap-1 shadow-sm hover:shadow-md"
                                      title="Setujui Kehadiran (ACC)"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      <span>ACC</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleRejectAbsen(absen.id)}
                                      className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[10px] rounded-lg cursor-pointer transition flex items-center gap-1 border border-amber-200"
                                      title="Batalkan Persetujuan (Batal ACC)"
                                    >
                                      <span>Batal ACC</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteAbsen(absen.id)}
                                    className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer transition"
                                    title="Hapus Catatan Absen"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View Card Grid */}
                  <div className="md:hidden grid grid-cols-1 gap-4">
                    {filteredAttendances.map((absen) => {
                      const matchedMusyrif = musyrifs.find(m => m.id === absen.musyrifId);
                      let displayDate = absen.tanggal;
                      try {
                        displayDate = new Date(absen.tanggal).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        });
                      } catch (_) {}

                      return (
                        <div key={absen.id} className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex gap-3 relative">
                          {absen.fotoUrl && (
                            <button
                              onClick={() => setPreviewPhoto(absen.fotoUrl)}
                              className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 cursor-pointer shadow-xs relative group"
                            >
                              <img 
                                src={absen.fotoUrl} 
                                alt="Selfie Mobile" 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                              />
                            </button>
                          )}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-black text-slate-900 uppercase truncate">
                                {absen.musyrifNama}
                              </h4>
                              <div className="flex flex-col items-end gap-1">
                                {absen.status === 'Disetujui' ? (
                                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 uppercase tracking-wider">
                                    DISETUJUI
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 uppercase tracking-wider animate-pulse">
                                    PROSES
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-[10px] font-semibold text-indigo-700">
                              Halaqoh: {matchedMusyrif?.halaqohNama || 'N/A'}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium">
                              Tanggal: {absen.hari}, {displayDate}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono font-bold">
                              Waktu: {absen.waktu} WIB
                            </p>
                          </div>
                          
                          <div className="absolute bottom-4 right-4 flex items-center gap-1.5">
                            {absen.status !== 'Disetujui' ? (
                              <button
                                onClick={() => handleApproveAbsen(absen.id)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] rounded-lg cursor-pointer transition flex items-center gap-1 shadow-xs"
                                title="ACC Kehadiran"
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span>ACC</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRejectAbsen(absen.id)}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-black text-[9px] rounded-lg cursor-pointer transition flex items-center gap-1 border border-amber-200"
                                title="Batalkan Persetujuan"
                              >
                                <span>Batal ACC</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteAbsen(absen.id)}
                              className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer transition"
                              title="Hapus Absen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Lightbox Selfie Modal */}
              {previewPhoto && (
                <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
                  <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 flex flex-col relative animate-none">
                    <button
                      onClick={() => setPreviewPhoto(null)}
                      className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/65 hover:bg-black/85 flex items-center justify-center text-white cursor-pointer transition font-bold text-xs"
                    >
                      ✕
                    </button>
                    <div className="bg-emerald-800 text-white p-5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <Camera className="w-5 h-5 text-emerald-100" />
                      </div>
                      <div>
                        <h3 className="text-xs font-extrabold uppercase">Foto Absensi Selfie</h3>
                        <p className="text-[10px] text-emerald-200 mt-0.5">Verifikasi Kehadiran Musyrif</p>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-950 aspect-square flex items-center justify-center">
                      <img 
                        src={previewPhoto} 
                        alt="Foto Absen Selfie" 
                        className="max-h-[50vh] max-w-full object-contain rounded-2xl"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-100">
                      {(() => {
                        const matchedAbsen = attendances.find(a => a.fotoUrl === previewPhoto);
                        if (!matchedAbsen) return null;
                        let displayDateLong = matchedAbsen.tanggal;
                        try {
                          displayDateLong = new Date(matchedAbsen.tanggal).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          });
                        } catch (_) {}

                        return (
                          <div className="text-xs space-y-1.5">
                            <p className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Identitas Musyrif</p>
                            <p className="font-extrabold text-slate-900 text-sm uppercase">{matchedAbsen.musyrifNama}</p>
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-slate-600">
                              <div>
                                <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Hari & Tanggal</span>
                                <span className="font-semibold text-slate-800">
                                  {matchedAbsen.hari}, {displayDateLong}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Waktu Absen</span>
                                <span className="font-semibold text-slate-800">{matchedAbsen.waktu} WIB</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: PENGATURAN */}
          {activeTab === 'pengaturan' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-extrabold text-slate-800">Pengaturan Sistem</h3>
                <p className="text-xs text-slate-500">Ubah kredensial password login administrator utama</p>
              </div>

              <div className="max-w-md bg-slate-50 border border-slate-100 p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span>Ubah Password Administrator</span>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">Password Saat Ini</label>
                    <input
                      type="password"
                      required
                      placeholder="Masukkan password admin lama"
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">Password Baru</label>
                    <input
                      type="password"
                      required
                      placeholder="Masukkan password admin baru"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">Ulangi Password Baru</label>
                    <input
                      type="password"
                      required
                      placeholder="Konfirmasi password baru"
                      value={confirmNewPass}
                      onChange={(e) => setConfirmNewPass(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Password Administrator</span>
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* BULK IMPORT MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-slate-100 flex flex-col animate-in fade-in duration-200">
            
            {/* Header */}
            <div className="bg-indigo-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-300" />
                  <span>Update & Impor Massal Data Siswa</span>
                </h3>
                <p className="text-[10px] text-indigo-200 mt-0.5">Unggah template CSV/Excel untuk sinkronisasi database siswa secara instan</p>
              </div>
              <button
                onClick={() => {
                  if (!isSaving) {
                    setShowBulkModal(false);
                    setBulkFile(null);
                    setBulkParsedData([]);
                    setBulkImportProgress(null);
                  }
                }}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white cursor-pointer transition disabled:opacity-50"
                disabled={isSaving}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Petunjuk & Download Template */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-800">Petunjuk Pengisian Template Excel/CSV:</h4>
                  <ul className="text-[11px] text-amber-700 list-disc pl-4 space-y-0.5">
                    <li>Gunakan template dengan pembatas titik koma (Semicolon <strong>;</strong>) agar otomatis terbagi ke dalam kolom-kolom terpisah yang rapi di Microsoft Excel secara langsung.</li>
                    <li>Sistem otomatis mencocokkan <strong className="text-amber-900">No Induk</strong>. Jika sudah ada, nama siswa akan diperbarui. Jika belum ada, siswa baru akan ditambahkan.</li>
                    <li>Sistem <strong className="text-amber-900">tidak akan membuat kelas atau halaqoh baru</strong>. Data kelas/halaqoh siswa akan otomatis dicocokkan dengan data yang sudah ada di sistem. Jika tidak terdaftar, data siswa lama akan tetap mempertahankan kelas/halaqoh sebelumnya, sedangkan siswa baru akan dikosongkan.</li>
                    <li>Kolom <strong className="text-amber-900">Kelas Dasar</strong> dan <strong className="text-amber-900">Kelas Tahfidz</strong> diisi dengan <strong className="font-extrabold">Y</strong> (Ya/Ikut) atau <strong className="font-extrabold">T</strong> (Tidak/Bukan).</li>
                  </ul>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="sm:shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-amber-100 border border-amber-200 text-amber-800 font-extrabold text-xs rounded-xl transition cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Contoh Template</span>
                </button>
              </div>

              {/* Upload Target */}
              {!bulkFile ? (
                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition ${
                    dragOver 
                      ? 'border-indigo-500 bg-indigo-50/50' 
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50'
                  }`}
                  onClick={() => document.getElementById('bulk-file-input')?.click()}
                >
                  <input
                    id="bulk-file-input"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileSelected(e.target.files[0]);
                      }
                    }}
                  />
                  <Upload className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                  <p className="text-sm font-bold text-slate-700">Tarik & lepas file .csv di sini, atau klik untuk memilih file</p>
                  <p className="text-xs text-slate-400 mt-1">Hanya mendukung file CSV dengan enkoding UTF-8 (Pemisah Koma atau Titik Koma)</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{bulkFile.name}</p>
                        <p className="text-[10px] text-slate-400">Ukuran: {(bulkFile.size / 1024).toFixed(2)} KB • Terdeteksi {bulkParsedData.length} baris data</p>
                      </div>
                    </div>
                    {!isSaving && (
                      <button
                        onClick={() => {
                          setBulkFile(null);
                          setBulkParsedData([]);
                          setBulkImportError(null);
                        }}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer px-3 py-1.5 rounded-lg hover:bg-rose-50"
                      >
                        Ganti File
                      </button>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {bulkImportProgress && (
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                        <span>Sedang Memproses Data...</span>
                        <span>{bulkImportProgress.current} / {bulkImportProgress.total} ({Math.round((bulkImportProgress.current / bulkImportProgress.total) * 100)}%)</span>
                      </div>
                      <div className="w-full bg-indigo-200 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${(bulkImportProgress.current / bulkImportProgress.total) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-[10px] text-indigo-600 font-medium animate-pulse">Mohon tunggu, sistem sedang memperbarui database Firestore. Jangan tutup dialog ini.</p>
                    </div>
                  )}

                  {/* Error Indicator */}
                  {bulkImportError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2 text-rose-700 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{bulkImportError}</span>
                    </div>
                  )}

                  {/* Preview Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Pratinjau Hasil Impor:</h4>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Baru</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Update</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Tidak Terdaftar</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Tidak Valid</span>
                      </div>
                    </div>

                    <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100">
                          <tr>
                            <th className="py-2.5 px-3 w-10">NO</th>
                            <th className="py-2.5 px-3">NO INDUK</th>
                            <th className="py-2.5 px-3">NAMA</th>
                            <th className="py-2.5 px-3">KELAS</th>
                            <th className="py-2.5 px-3">HALAQOH</th>
                            <th className="py-2.5 px-3">PROG</th>
                            <th className="py-2.5 px-3 text-center">STATUS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {bulkParsedData.map((row, index) => (
                            <tr key={index} className={`hover:bg-slate-50/50 ${!row.isValid ? 'bg-rose-50/20' : ''}`}>
                              <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{index + 1}</td>
                              <td className="py-2 px-3 font-mono font-bold text-slate-900">{row.noInduk || <span className="text-rose-500 italic">Kosong</span>}</td>
                              <td className="py-2 px-3 font-bold text-slate-800">{row.nama || <span className="text-rose-500 italic">Kosong</span>}</td>
                              <td className="py-2 px-3">
                                {row.kelasNamaRaw ? (
                                  <div className="flex items-center gap-1.5">
                                    <span>{row.kelasNamaRaw}</span>
                                    {row.isUnmatchedClass && (
                                      <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-150 rounded text-[9px] font-extrabold shrink-0" title="Kelas tidak ada di database, data kelas akan disesuaikan dengan yang sudah ada (tidak diubah atau dikosongkan)">Tidak Terdaftar</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-rose-500 italic">Kosong</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {row.halaqohNamaRaw ? (
                                  <div className="flex items-center gap-1.5">
                                    <span>{row.halaqohNamaRaw}</span>
                                    {row.isUnmatchedHalaqoh && (
                                      <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-150 rounded text-[9px] font-extrabold shrink-0" title="Halaqoh tidak ada di database, data halaqoh akan disesuaikan dengan yang sudah ada (tidak diubah atau dikosongkan)">Tidak Terdaftar</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">Tanpa Halaqoh</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex gap-1 text-[9px] font-black">
                                  {row.isKelasDasar && <span className="px-1 bg-sky-50 text-sky-700 border border-sky-200 rounded">Dasar</span>}
                                  {row.isKelasTahfidz && <span className="px-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">Tahfidz</span>}
                                  {!row.isKelasDasar && !row.isKelasTahfidz && <span className="text-slate-400 font-normal">-</span>}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-center">
                                {!row.isValid ? (
                                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded-full text-[9px] font-black animate-bounce">
                                    Error
                                  </span>
                                ) : row.action === 'update' ? (
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[9px] font-black animate-pulse">
                                    Update
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[9px] font-black">
                                    Baru
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {bulkParsedData.some(row => !row.isValid) && (
                      <div className="text-[11px] text-rose-650 font-bold mt-1">
                        * Peringatan: Beberapa baris memiliki data tidak valid (error). Baris-baris ini akan otomatis dilewati saat proses impor berjalan. Silahkan periksa kolom "No Induk" dan "Nama".
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkFile(null);
                  setBulkParsedData([]);
                  setBulkImportProgress(null);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
                disabled={isSaving}
              >
                Batal
              </button>
              {bulkFile && bulkParsedData.length > 0 && (
                <button
                  onClick={handleCommitImport}
                  disabled={isSaving || bulkImportProgress !== null}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shadow-md shadow-indigo-200 flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Mengimpor ({bulkImportProgress?.current || 0}/{bulkImportProgress?.total || 0})...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Konfirmasi & Mulai Impor Massal</span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* POPUP FORMS MODALS (Reusable layout) */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col">
            
            {/* Modal Head */}
            <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold uppercase">
                  {modalType === 'add' ? 'Tambah Data Baru' : 'Perbaharui Data Tertunjuk'}
                </h3>
                <p className="text-[10px] text-emerald-200 mt-0.5">Sesi Formulir Database Admin</p>
              </div>
              <button
                onClick={closeFormModal}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Scrollable */}
            <div className="p-6 overflow-y-auto max-h-[80vh] space-y-4">
              
              {/* 1. KELAS FORM BODY */}
              {activeTab === 'kelas' && (
                <form onSubmit={handleKelasSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">Nama Kelas</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kelas 1A, Kelas 6B"
                      value={kelasNama}
                      onChange={(e) => setKelasNama(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition animate-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    {isSaving ? 'Menyimpan...' : 'Simpan Data Kelas'}
                  </button>
                </form>
              )}

              {/* 2. HALAQOH FORM BODY */}
              {activeTab === 'halaqoh' && (
                <form onSubmit={handleHalaqohSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">Nama Halaqoh</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Halaqoh Al-Fatihah, Halaqoh An-Naba"
                      value={halaqohNama}
                      onChange={(e) => setHalaqohNama(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 block">Musyrif Pengampu (Bisa diampu oleh lebih dari 1)</label>
                    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 max-h-48 overflow-y-auto space-y-1.5">
                      {musyrifs.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Belum ada pengajar terdaftar</p>
                      ) : (
                        musyrifs.map(m => {
                          const isChecked = selectedMusyrifIds.includes(m.id);
                          return (
                            <label key={m.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white rounded-lg cursor-pointer transition text-xs font-medium text-slate-700">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleMusyrif(m.id)}
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                              />
                              <span>{m.nama} <span className="text-[10px] text-slate-400 font-mono">(@{m.username})</span></span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    {isSaving ? 'Menyimpan...' : 'Simpan Data Halaqoh'}
                  </button>
                </form>
              )}

              {/* 3. SISWA FORM BODY */}
              {activeTab === 'siswa' && (
                <form onSubmit={handleSiswaSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">No Induk Siswa</label>
                    <input
                      type="text"
                      required
                      placeholder="Masukkan No Induk Siswa"
                      value={siswaNoInduk}
                      onChange={(e) => setSiswaNoInduk(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">Nama Lengkap Siswa</label>
                    <input
                      type="text"
                      required
                      placeholder="Masukkan nama lengkap siswa"
                      value={siswaNama}
                      onChange={(e) => setSiswaNama(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">Kategori Tingkat Kelas</label>
                    <select
                      required
                      value={siswaKelasId}
                      onChange={(e) => setSiswaKelasId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                    >
                      <option value="">-- Pilih Kelas --</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.nama}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">Halaqoh Qur'an (Opsional)</label>
                    <select
                      value={siswaHalaqohId}
                      onChange={(e) => setSiswaHalaqohId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                    >
                      <option value="">-- Pilih Halaqoh --</option>
                      {halaqohs.map(h => (
                        <option key={h.id} value={h.id}>{h.nama}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 block">Program Kelas</label>
                    <div className="flex gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={siswaIsKelasDasar}
                          onChange={(e) => setSiswaIsKelasDasar(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <span>Kelas Dasar</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={siswaIsKelasTahfidz}
                          onChange={(e) => setSiswaIsKelasTahfidz(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <span>Kelas Tahfidz</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    {isSaving ? 'Menyimpan...' : 'Simpan Data Siswa'}
                  </button>
                </form>
              )}

              {/* 4. PENGAJAR (MUSYRIF) FORM BODY */}
              {activeTab === 'pengajar' && (
                <form onSubmit={handleMusyrifSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block">NIM Pengajar</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 202601001"
                        value={musyrifNim}
                        onChange={(e) => setMusyrifNim(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block">Nama Lengkap</label>
                      <input
                        type="text"
                        required
                        placeholder="Masukkan nama lengkap"
                        value={musyrifNama}
                        onChange={(e) => setMusyrifNama(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                      />
                    </div>
                  </div>



                  <div className="grid grid-cols-2 gap-3 pb-2 border-t border-slate-100 pt-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block">Username Login</label>
                      <input
                        type="text"
                        required
                        placeholder="Ketik username"
                        value={musyrifUsername}
                        onChange={(e) => setMusyrifUsername(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block">
                        Password Login {modalType === 'edit' && '(Opsional)'}
                      </label>
                      <input
                        type="text"
                        required={modalType === 'add'}
                        placeholder={modalType === 'add' ? 'Ketik password login' : 'Ketik baru jika diganti'}
                        value={musyrifPassword}
                        onChange={(e) => setMusyrifPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    {isSaving ? 'Menyimpan...' : 'Simpan Data Pengajar'}
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
