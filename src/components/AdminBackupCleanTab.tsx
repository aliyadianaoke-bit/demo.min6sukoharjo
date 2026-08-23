import React, { useState, useMemo } from 'react';
import { 
  Database, Download, Upload, Trash2, AlertTriangle, ShieldCheck, 
  CheckCircle, FileSpreadsheet, RefreshCw, FileText, Calendar, 
  Users, BookOpen, UserCheck, BookMarked, AlertCircle, Eye, EyeOff,
  Layers, Lock, Sparkles, Filter, Archive, Check, Clock, ChevronRight
} from 'lucide-react';
import { 
  getCompleteBackupSnapshot, 
  restoreDatabaseFromBackup, 
  clearAllJournals, 
  clearAllAbsenSiswa, 
  clearAllAbsenMusyrif, 
  clearTransactionalLogs, 
  resetAllStudentsHalaqoh, 
  clearMasterStudents, 
  clearMasterMusyrifs, 
  clearMasterHalaqohs, 
  clearMasterClasses, 
  factoryResetAllDatabase,
  getAbsenSiswa
} from '../lib/supabaseService';
import { Kelas, Halaqoh, Siswa, Musyrif, CatatanHarian, AbsenMusyrif, AbsenSiswa } from '../types';

interface AdminBackupCleanTabProps {
  classes: Kelas[];
  students: Siswa[];
  musyrifs: Musyrif[];
  halaqohs: Halaqoh[];
  journals: CatatanHarian[];
  musyrifAttendances?: AbsenMusyrif[];
  adminPass: string;
  refreshData: () => Promise<void>;
  setFeedbackMsg: (msg: { text: string; type: 'success' | 'error' }) => void;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function AdminBackupCleanTab({
  classes,
  students,
  musyrifs,
  halaqohs,
  journals,
  musyrifAttendances = [],
  adminPass,
  refreshData,
  setFeedbackMsg
}: AdminBackupCleanTabProps) {
  const [subTab, setSubTab] = useState<'backup' | 'clean'>('backup');
  const [isProcessing, setIsProcessing] = useState(false);

  // Default month string (YYYY-MM)
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = now.toISOString().split('T')[0];

  // ==========================================
  // BACKUP & RESTORE STATES & FILTERS
  // ==========================================
  const [backupFilterMode, setBackupFilterMode] = useState<'all' | 'month' | 'range'>('all');
  const [backupSelectedMonth, setBackupSelectedMonth] = useState(currentMonthStr);
  const [backupStartDate, setBackupStartDate] = useState('');
  const [backupEndDate, setBackupEndDate] = useState('');

  // Restore states
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreParsedData, setRestoreParsedData] = useState<any | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // ==========================================
  // CLEAN DATA STATES & FILTERS
  // ==========================================
  const [cleanModalType, setCleanModalType] = useState<
    | 'journals' 
    | 'absen_siswa' 
    | 'absen_musyrif' 
    | 'transactional_all' 
    | 'reset_halaqoh' 
    | 'master_students' 
    | 'master_musyrifs' 
    | 'factory_reset' 
    | null
  >(null);

  const [cleanFilterMode, setCleanFilterMode] = useState<'all' | 'month' | 'range'>('all');
  const [cleanSelectedMonth, setCleanSelectedMonth] = useState(currentMonthStr);
  const [cleanStartDate, setCleanStartDate] = useState('');
  const [cleanEndDate, setCleanEndDate] = useState('');
  const [cleanKelasFilter, setCleanKelasFilter] = useState('all');
  const [cleanHalaqohFilter, setCleanHalaqohFilter] = useState('all');
  const [cleanMusyrifFilter, setCleanMusyrifFilter] = useState('all');
  const [cleanConfirmText, setCleanConfirmText] = useState('');
  const [cleanAdminPasswordInput, setCleanAdminPasswordInput] = useState('');
  const [showCleanAdminPass, setShowCleanAdminPass] = useState(false);

  // Helper date conversions
  const formatMonthLabel = (yyyyMm: string) => {
    if (!yyyyMm) return '';
    const [year, month] = yyyyMm.split('-');
    const mIdx = parseInt(month, 10) - 1;
    return `${MONTH_NAMES[mIdx] || month} ${year}`;
  };

  // Helper download functions
  const triggerJsonDownload = (filename: string, data: any) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const triggerCsvDownload = (filename: string, content: string) => {
    const blob = new Blob(["\uFEFF" + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Calculate effective dates for Backup
  const backupDateRange = useMemo(() => {
    if (backupFilterMode === 'month' && backupSelectedMonth) {
      const [yStr, mStr] = backupSelectedMonth.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      const lastDay = new Date(y, m, 0).getDate();
      return {
        startDate: `${backupSelectedMonth}-01`,
        endDate: `${backupSelectedMonth}-${String(lastDay).padStart(2, '0')}`,
        label: `Bulan ${formatMonthLabel(backupSelectedMonth)}`,
        suffix: backupSelectedMonth
      };
    }
    if (backupFilterMode === 'range') {
      const label = `${backupStartDate || 'Awal'} s/d ${backupEndDate || 'Sekarang'}`;
      const suffix = `${backupStartDate || 'awal'}_sd_${backupEndDate || 'akhir'}`;
      return {
        startDate: backupStartDate || undefined,
        endDate: backupEndDate || undefined,
        label,
        suffix
      };
    }
    return {
      startDate: undefined,
      endDate: undefined,
      label: 'Seluruh Waktu (Full)',
      suffix: 'Full'
    };
  }, [backupFilterMode, backupSelectedMonth, backupStartDate, backupEndDate]);

  // Filtered counts for Backup preview
  const backupFilteredJournals = useMemo(() => {
    return journals.filter(j => {
      if (backupDateRange.startDate && j.tanggal < backupDateRange.startDate) return false;
      if (backupDateRange.endDate && j.tanggal > backupDateRange.endDate) return false;
      return true;
    });
  }, [journals, backupDateRange]);

  const backupFilteredMusyrifAttendances = useMemo(() => {
    return musyrifAttendances.filter(a => {
      if (backupDateRange.startDate && a.tanggal < backupDateRange.startDate) return false;
      if (backupDateRange.endDate && a.tanggal > backupDateRange.endDate) return false;
      return true;
    });
  }, [musyrifAttendances, backupDateRange]);

  // Calculate effective dates for Clean
  const cleanEffectiveDates = useMemo(() => {
    if (cleanFilterMode === 'month' && cleanSelectedMonth) {
      const [yStr, mStr] = cleanSelectedMonth.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      const lastDay = new Date(y, m, 0).getDate();
      return {
        startDate: `${cleanSelectedMonth}-01`,
        endDate: `${cleanSelectedMonth}-${String(lastDay).padStart(2, '0')}`,
        label: `Bulan ${formatMonthLabel(cleanSelectedMonth)}`
      };
    }
    if (cleanFilterMode === 'range') {
      return {
        startDate: cleanStartDate || undefined,
        endDate: cleanEndDate || undefined,
        label: `${cleanStartDate || 'Awal'} s/d ${cleanEndDate || 'Sekarang'}`
      };
    }
    return {
      startDate: undefined,
      endDate: undefined,
      label: 'Semua Waktu (Seluruh Data)'
    };
  }, [cleanFilterMode, cleanSelectedMonth, cleanStartDate, cleanEndDate]);

  // Real-time impacted items calculation for Clean dialog
  const impactedCleanCounts = useMemo(() => {
    const { startDate, endDate } = cleanEffectiveDates;

    const impactedJournals = journals.filter(j => {
      if (startDate && j.tanggal < startDate) return false;
      if (endDate && j.tanggal > endDate) return false;
      if (cleanHalaqohFilter !== 'all' && j.halaqohId !== cleanHalaqohFilter) return false;
      if (cleanKelasFilter !== 'all' && j.kelasNama !== cleanKelasFilter) return false;
      return true;
    }).length;

    const impactedAbsenMusyrif = musyrifAttendances.filter(a => {
      if (startDate && a.tanggal < startDate) return false;
      if (endDate && a.tanggal > endDate) return false;
      if (cleanMusyrifFilter !== 'all' && a.musyrifId !== cleanMusyrifFilter) return false;
      return true;
    }).length;

    return {
      journals: impactedJournals,
      absenMusyrif: impactedAbsenMusyrif
    };
  }, [journals, musyrifAttendances, cleanEffectiveDates, cleanHalaqohFilter, cleanKelasFilter, cleanMusyrifFilter]);

  // 1. Download Full Backup JSON (with filter)
  const handleDownloadFullBackup = async () => {
    try {
      setIsProcessing(true);
      const snapshot = await getCompleteBackupSnapshot({
        startDate: backupDateRange.startDate,
        endDate: backupDateRange.endDate,
        filterMode: backupFilterMode,
        filterLabel: backupDateRange.label
      });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `Backup_MMQ_MIN6_${backupDateRange.suffix}_${timestamp}.json`;
      triggerJsonDownload(filename, snapshot);
      setFeedbackMsg({
        text: `Cadangan database (${backupDateRange.label}) berhasil diunduh (${snapshot.meta.totalStudents} siswa, ${snapshot.meta.totalJournals} jurnal, ${snapshot.meta.totalMusyrifs} pengajar).`,
        type: 'success'
      });
    } catch (err: any) {
      setFeedbackMsg({
        text: `Gagal mencadangkan data: ${err.message || 'Terjadi kesalahan'}`,
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Export CSV Spreadsheets with applied date/month filter
  const handleExportCategoryCsv = async (category: 'siswa' | 'pengajar' | 'jurnal' | 'absen_siswa' | 'absen_musyrif') => {
    try {
      setIsProcessing(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const filterSuffix = backupFilterMode === 'all' ? '' : `_${backupDateRange.suffix}`;

      if (category === 'siswa') {
        let csv = 'No;No Induk;Nama Siswa;Kelas;Halaqoh;Kelas Dasar;Kelas Tahfidz;Kelas Lomba\n';
        students.forEach((s, idx) => {
          csv += `${idx + 1};"${s.noInduk || ''}";"${s.nama || ''}";"${s.kelasNama || ''}";"${s.halaqohNama || ''}";"${s.isKelasDasar ? 'Y' : 'T'}";"${s.isKelasTahfidz ? 'Y' : 'T'}";"${s.isKelasLomba ? 'Y' : 'T'}"\n`;
        });
        triggerCsvDownload(`Data_Siswa_MMQ_${todayStr}.csv`, csv);
      } else if (category === 'pengajar') {
        let csv = 'No;NIM;Nama Pengajar;Username;Halaqoh;Status Akses;Kelas Lomba\n';
        musyrifs.forEach((m, idx) => {
          csv += `${idx + 1};"${m.nim || ''}";"${m.nama || ''}";"${m.username || ''}";"${m.halaqohNama || ''}";"${m.statusAkses || 'aktif'}";"${m.isMengajarLomba ? 'Y' : 'T'}"\n`;
        });
        triggerCsvDownload(`Data_Pengajar_MMQ_${todayStr}.csv`, csv);
      } else if (category === 'jurnal') {
        let csv = 'No;Tanggal;No Induk;Nama Siswa;Kelas;Program;Kategori;Nilai;Materi Setoran;Evaluasi Tahsin\n';
        backupFilteredJournals.forEach((j, idx) => {
          const cleanMateri = (j.materiSetoran || '').replace(/"/g, '""').replace(/\n/g, ' ');
          const cleanEvaluasi = (j.evaluasiTahsin || '').replace(/"/g, '""').replace(/\n/g, ' ');
          csv += `${idx + 1};"${j.tanggal || ''}";"${j.noInduk || ''}";"${j.siswaNama || ''}";"${j.kelasNama || ''}";"${j.program || 'dasar'}";"${j.kategori || 'Setoran'}";"${j.nilai || 'A'}";"${cleanMateri}";"${cleanEvaluasi}"\n`;
        });
        triggerCsvDownload(`Jurnal_Mutabaah_MMQ${filterSuffix}_${todayStr}.csv`, csv);
      } else if (category === 'absen_siswa') {
        const studentAbsen = await getAbsenSiswa(undefined, 10000);
        const filteredAbsenSiswa = studentAbsen.filter(a => {
          if (backupDateRange.startDate && a.tanggal < backupDateRange.startDate) return false;
          if (backupDateRange.endDate && a.tanggal > backupDateRange.endDate) return false;
          return true;
        });

        let csv = 'No;Tanggal;No Induk;Nama Siswa;Kelas;Status Kehadiran\n';
        filteredAbsenSiswa.forEach((a, idx) => {
          csv += `${idx + 1};"${a.tanggal || ''}";"${a.noInduk || ''}";"${a.siswaNama || ''}";"${a.kelasNama || ''}";"${a.status || 'Hadir'}"\n`;
        });
        triggerCsvDownload(`Absensi_Siswa_MMQ${filterSuffix}_${todayStr}.csv`, csv);
      } else if (category === 'absen_musyrif') {
        let csv = 'No;Tanggal;Hari;Nama Musyrif;Waktu Absen;Status Verifikasi\n';
        backupFilteredMusyrifAttendances.forEach((a, idx) => {
          csv += `${idx + 1};"${a.tanggal || ''}";"${a.hari || ''}";"${a.musyrifNama || ''}";"${a.waktu || ''}";"${a.status || 'Disetujui'}"\n`;
        });
        triggerCsvDownload(`Absensi_Pengajar_MMQ${filterSuffix}_${todayStr}.csv`, csv);
      }

      setFeedbackMsg({
        text: `Data ${category.replace('_', ' ').toUpperCase()} (${backupDateRange.label}) berhasil diekspor ke file Spreadsheet CSV.`,
        type: 'success'
      });
    } catch (err: any) {
      setFeedbackMsg({
        text: `Gagal mengekspor data: ${err.message || 'Terjadi kesalahan'}`,
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Handle File Selection for Restore
  const handleRestoreFileSelected = (file: File) => {
    setRestoreError(null);
    setRestoreParsedData(null);
    setRestoreFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        // Validate structure
        const rawData = parsed.data || parsed;
        const hasStudents = Array.isArray(rawData.students) || Array.isArray(rawData.siswa);
        const hasClasses = Array.isArray(rawData.classes);
        const hasMusyrifs = Array.isArray(rawData.musyrifs) || Array.isArray(rawData.musyrif);
        
        if (!hasStudents && !hasClasses && !hasMusyrifs && !Array.isArray(rawData.journals)) {
          throw new Error("Format berkas JSON tidak memiliki struktur database Markaz Muhibbil Qur'an.");
        }

        const counts = {
          classes: (rawData.classes || []).length,
          halaqoh: (rawData.halaqohs || rawData.halaqoh || []).length,
          musyrifs: (rawData.musyrifs || rawData.musyrif || []).length,
          students: (rawData.students || rawData.siswa || []).length,
          journals: (rawData.journals || rawData.catatan_harian || []).length,
          absenSiswa: (rawData.absenSiswa || rawData.absen_siswa || []).length,
          absenMusyrif: (rawData.absenMusyrif || rawData.absen_musyrif || []).length,
          exportedAt: parsed.exportedAt || 'Tidak tercatat',
          filterApplied: parsed.filterApplied?.label || 'Semua Data'
        };

        setRestoreParsedData({ raw: parsed, counts });
      } catch (err: any) {
        setRestoreError(`File JSON tidak valid: ${err.message}`);
        setRestoreFile(null);
        setRestoreParsedData(null);
      }
    };
    reader.onerror = () => {
      setRestoreError("Gagal membaca file.");
    };
    reader.readAsText(file);
  };

  // 4. Confirm Restore Execution
  const handleExecuteRestore = async () => {
    if (!restoreParsedData?.raw) return;

    try {
      setIsProcessing(true);
      const res = await restoreDatabaseFromBackup(restoreParsedData.raw, restoreMode);
      await refreshData();
      
      setFeedbackMsg({
        text: `Pemulihan database berhasil (${restoreMode === 'replace' ? 'Mode Timpa' : 'Mode Gabung'}). ${res.restoredCount.students} siswa, ${res.restoredCount.journals} jurnal, ${res.restoredCount.musyrifs} pengajar telah dipulihkan.`,
        type: 'success'
      });
      setRestoreFile(null);
      setRestoreParsedData(null);
    } catch (err: any) {
      setFeedbackMsg({
        text: `Gagal memulihkan database: ${err.message || 'Terjadi kesalahan'}`,
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Execute Data Cleaning with applied Date / Month filter
  const handleExecuteCleanAction = async () => {
    if (!cleanModalType) return;

    // Security check for factory reset
    if (cleanModalType === 'factory_reset') {
      if (cleanConfirmText.trim().toUpperCase() !== 'BERSIHKAN DATA') {
        alert('Harap ketik "BERSIHKAN DATA" persis sama untuk konfirmasi.');
        return;
      }
      if (cleanAdminPasswordInput !== adminPass) {
        alert('Password administrator salah. Tindakan dibatalkan.');
        return;
      }
    }

    try {
      setIsProcessing(true);
      let message = '';
      const { startDate, endDate, label: filterLabel } = cleanEffectiveDates;

      if (cleanModalType === 'journals') {
        const deleted = await clearAllJournals({
          startDate,
          endDate,
          halaqohId: cleanHalaqohFilter !== 'all' ? cleanHalaqohFilter : undefined,
          kelasNama: cleanKelasFilter !== 'all' ? cleanKelasFilter : undefined
        });
        message = `${deleted} data catatan jurnal mutaba'ah (${filterLabel}) berhasil dibersihkan.`;
      } else if (cleanModalType === 'absen_siswa') {
        const deleted = await clearAllAbsenSiswa({
          startDate,
          endDate,
          kelasId: cleanKelasFilter !== 'all' ? cleanKelasFilter : undefined
        });
        message = `${deleted} data absensi siswa (${filterLabel}) berhasil dibersihkan.`;
      } else if (cleanModalType === 'absen_musyrif') {
        const deleted = await clearAllAbsenMusyrif({
          startDate,
          endDate,
          musyrifId: cleanMusyrifFilter !== 'all' ? cleanMusyrifFilter : undefined
        });
        message = `${deleted} data absensi pengajar (${filterLabel}) berhasil dibersihkan.`;
      } else if (cleanModalType === 'transactional_all') {
        const res = await clearTransactionalLogs({
          clearJournals: true,
          clearAbsenSiswa: true,
          clearAbsenMusyrif: true,
          startDate,
          endDate
        });
        message = `Pembersihan riwayat semester (${filterLabel}) selesai: ${res.deletedJournals} jurnal, ${res.deletedAbsenSiswa} absen siswa, ${res.deletedAbsenMusyrif} absen pengajar telah dihapus. Data Master siswa dan pengajar tetap aman.`;
      } else if (cleanModalType === 'reset_halaqoh') {
        const count = await resetAllStudentsHalaqoh();
        message = `Penugasan halaqoh pada ${count} siswa berhasil dikosongkan (status: Belum Ada Halaqoh).`;
      } else if (cleanModalType === 'master_students') {
        const count = await clearMasterStudents();
        message = `${count} data siswa berhasil dibersihkan dari database.`;
      } else if (cleanModalType === 'master_musyrifs') {
        const count = await clearMasterMusyrifs();
        message = `${count} data pengajar berhasil dibersihkan dari database.`;
      } else if (cleanModalType === 'factory_reset') {
        await factoryResetAllDatabase();
        message = `Database telah berhasil di-reset total ke pengaturan awal pabrik.`;
      }

      await refreshData();
      setFeedbackMsg({ text: message, type: 'success' });
      setCleanModalType(null);
      setCleanConfirmText('');
      setCleanAdminPasswordInput('');
    } catch (err: any) {
      setFeedbackMsg({
        text: `Gagal membersihkan data: ${err.message || 'Terjadi kesalahan'}`,
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-extrabold text-slate-800">Manajemen & Pemeliharaan Database</h3>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-md uppercase tracking-wider">
              Admin Tool
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencadangan arsip database (JSON/CSV) dengan filter tanggal/bulan, pemulihan data (restore), dan pembersihan berkala
          </p>
        </div>

        {/* SubTab switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-center border border-slate-200">
          <button
            type="button"
            onClick={() => setSubTab('backup')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
              subTab === 'backup'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup & Restore</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('clean')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
              subTab === 'clean'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bersihkan Data</span>
          </button>
        </div>
      </div>

      {/* Quick Database Volume Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Kelas</span>
          <span className="text-base font-black text-slate-800">{classes.length}</span>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Halaqoh</span>
          <span className="text-base font-black text-slate-800">{halaqohs.length}</span>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Pengajar</span>
          <span className="text-base font-black text-slate-800">{musyrifs.length}</span>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Siswa</span>
          <span className="text-base font-black text-emerald-700">{students.length}</span>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Jurnal Mutaba'ah</span>
          <span className="text-base font-black text-indigo-700">{journals.length}</span>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Absen Pengajar</span>
          <span className="text-base font-black text-slate-800">{musyrifAttendances.length}</span>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Status Storage</span>
          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Tersinkron
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: BACKUP & RESTORE */}
      {/* ========================================================================= */}
      {subTab === 'backup' && (
        <div className="space-y-6">
          
          {/* SECTION FILTER PERIODE BACKUP */}
          <div className="bg-white border border-emerald-200/90 p-4 sm:p-5 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Filter Periode Backup & Ekspor Data
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Pilih periode waktu tertentu (bulan / rentang tanggal) untuk cadangan JSON atau file CSV
                  </p>
                </div>
              </div>

              {/* Active filter badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Aktif: {backupDateRange.label}</span>
              </div>
            </div>

            {/* Filter Mode Selector Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setBackupFilterMode('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  backupFilterMode === 'all'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Semua Waktu (Full Backup)
              </button>

              <button
                type="button"
                onClick={() => setBackupFilterMode('month')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  backupFilterMode === 'month'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Berdasarkan Bulan
              </button>

              <button
                type="button"
                onClick={() => setBackupFilterMode('range')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  backupFilterMode === 'range'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Rentang Tanggal (Custom)
              </button>
            </div>

            {/* Input Controls for Month or Range */}
            {backupFilterMode === 'month' && (
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/70 rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-extrabold text-emerald-950 shrink-0">Pilih Bulan:</label>
                    <input
                      type="month"
                      value={backupSelectedMonth}
                      onChange={(e) => setBackupSelectedMonth(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Quick month shortcut buttons */}
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setBackupSelectedMonth(currentMonthStr)}
                      className="px-2.5 py-1 bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg cursor-pointer transition text-[11px]"
                    >
                      Bulan Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setMonth(d.getMonth() - 1);
                        setBackupSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                      }}
                      className="px-2.5 py-1 bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg cursor-pointer transition text-[11px]"
                    >
                      Bulan Lalu
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-emerald-800/80">
                  Data transaksional (Jurnal Mutaba'ah & Absensi) yang dicadangkan hanya yang tercatat pada <strong>{formatMonthLabel(backupSelectedMonth)}</strong>. Seluruh Data Master tetap lengkap.
                </p>
              </div>
            )}

            {backupFilterMode === 'range' && (
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/70 rounded-xl space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-center">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Dari Tanggal</label>
                    <input
                      type="date"
                      value={backupStartDate}
                      onChange={(e) => setBackupStartDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={backupEndDate}
                      onChange={(e) => setBackupEndDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center gap-2 pt-2 sm:pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        const start = new Date(d);
                        start.setDate(start.getDate() - 7);
                        setBackupStartDate(start.toISOString().split('T')[0]);
                        setBackupEndDate(todayStr);
                      }}
                      className="px-2.5 py-1 bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg cursor-pointer transition text-[11px]"
                    >
                      7 Hari Terakhir
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        const start = new Date(d);
                        start.setDate(start.getDate() - 30);
                        setBackupStartDate(start.toISOString().split('T')[0]);
                        setBackupEndDate(todayStr);
                      }}
                      className="px-2.5 py-1 bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg cursor-pointer transition text-[11px]"
                    >
                      30 Hari Terakhir
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Live Filter Count Indicator */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/60">
              <span className="font-bold text-slate-700">Preview Data Terpilih:</span>
              <span><strong>{backupFilteredJournals.length}</strong> Catatan Jurnal</span>
              <span>•</span>
              <span><strong>{backupFilteredMusyrifAttendances.length}</strong> Absen Pengajar</span>
              <span>•</span>
              <span><strong>{students.length}</strong> Siswa (Master)</span>
            </div>
          </div>
          
          {/* Card 1: Main Full Database Snapshot JSON */}
          <div className="p-5 sm:p-6 bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-3xl shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Archive className="w-5 h-5 text-emerald-300" />
                  <h4 className="text-sm font-extrabold uppercase tracking-wider text-emerald-100">
                    Cadangkan Database ({backupDateRange.label})
                  </h4>
                </div>
                <p className="text-xs text-emerald-200/90 max-w-2xl leading-relaxed">
                  Menyimpan file cadangan JSON standar yang mencakup data master lengkap serta riwayat mutaba'ah & absensi sesuai filter periode terpilih (<strong>{backupDateRange.label}</strong>).
                </p>
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleDownloadFullBackup}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition cursor-pointer shrink-0 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mempersiapkan...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Unduh Cadangan JSON</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-3 border-t border-emerald-800/60 flex flex-wrap items-center gap-y-2 gap-x-6 text-[11px] text-emerald-300/80">
              <span>✓ Format JSON Standar MMQ</span>
              <span>✓ Periode: {backupDateRange.label}</span>
              <span>✓ Mendukung Pemulihan Instan</span>
            </div>
          </div>

          {/* Card 2: Export CSV Spreadsheets per Category */}
          <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>Ekspor File Spreadsheet (.CSV / Microsoft Excel)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Unduh spreadsheet terpisah per kategori (data jurnal & absensi otomatis mengikuti filter: <strong>{backupDateRange.label}</strong>)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleExportCategoryCsv('siswa')}
                className="p-3.5 bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 rounded-xl text-left transition cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <span className="text-xs font-extrabold text-slate-800 group-hover:text-emerald-800 block">
                    Data Siswa & Halaqoh
                  </span>
                  <span className="text-[10px] text-slate-400">Total {students.length} santri terdaftar</span>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 shrink-0" />
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleExportCategoryCsv('pengajar')}
                className="p-3.5 bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 rounded-xl text-left transition cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <span className="text-xs font-extrabold text-slate-800 group-hover:text-emerald-800 block">
                    Data Pengajar (Musyrif)
                  </span>
                  <span className="text-[10px] text-slate-400">Total {musyrifs.length} akun pengajar</span>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 shrink-0" />
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleExportCategoryCsv('jurnal')}
                className="p-3.5 bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 rounded-xl text-left transition cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <span className="text-xs font-extrabold text-slate-800 group-hover:text-emerald-800 block">
                    Jurnal Mutaba'ah Harian
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {backupFilteredJournals.length} data ({backupDateRange.label})
                  </span>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 shrink-0" />
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleExportCategoryCsv('absen_siswa')}
                className="p-3.5 bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 rounded-xl text-left transition cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <span className="text-xs font-extrabold text-slate-800 group-hover:text-emerald-800 block">
                    Catatan Absensi Siswa
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    Kehadiran santri ({backupDateRange.label})
                  </span>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 shrink-0" />
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleExportCategoryCsv('absen_musyrif')}
                className="p-3.5 bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 rounded-xl text-left transition cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <span className="text-xs font-extrabold text-slate-800 group-hover:text-emerald-800 block">
                    Catatan Absensi Pengajar
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {backupFilteredMusyrifAttendances.length} data ({backupDateRange.label})
                  </span>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 shrink-0" />
              </button>
            </div>
          </div>

          {/* Card 3: Restore Database from File */}
          <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl space-y-4">
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-700" />
                <span>Pemulihan Data (Restore dari File Cadangan JSON)</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Unggah file cadangan JSON yang sebelumnya telah diekspor untuk memulihkan seluruh struktur data dan riwayat mutaba'ah
              </p>
            </div>

            {/* Upload Zone */}
            {!restoreFile ? (
              <div
                onClick={() => document.getElementById('restore-json-input')?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/30 rounded-2xl p-6 text-center cursor-pointer transition"
              >
                <input
                  id="restore-json-input"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleRestoreFileSelected(e.target.files[0]);
                    }
                  }}
                />
                <Database className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-extrabold text-slate-700">Pilih berkas file cadangan (.json) untuk dipulihkan</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Mendukung file snapshot cadangan Markaz Muhibbil Qur'an</p>
              </div>
            ) : (
              <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                      <Archive className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">{restoreFile.name}</p>
                      <p className="text-[10px] text-slate-400">
                        Ukuran: {(restoreFile.size / 1024).toFixed(1)} KB • Periode cadangan: {restoreParsedData?.counts?.filterApplied || 'Semua Waktu'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setRestoreFile(null);
                      setRestoreParsedData(null);
                    }}
                    className="text-xs font-bold text-rose-600 hover:underline cursor-pointer px-2 py-1"
                  >
                    Ganti Berkas
                  </button>
                </div>

                {/* Analyzed counts preview */}
                {restoreParsedData && (
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-700 block">Rincian Data Terdeteksi di File:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">Siswa</span>
                        <span className="font-bold text-slate-800">{restoreParsedData.counts.students} data</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">Pengajar</span>
                        <span className="font-bold text-slate-800">{restoreParsedData.counts.musyrifs} data</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">Jurnal Mutaba'ah</span>
                        <span className="font-bold text-slate-800">{restoreParsedData.counts.journals} data</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">Absensi Siswa</span>
                        <span className="font-bold text-slate-800">{restoreParsedData.counts.absenSiswa} data</span>
                      </div>
                    </div>

                    {/* Mode restore selection */}
                    <div className="space-y-1.5 pt-2">
                      <span className="text-xs font-bold text-slate-700 block">Metode Pemulihan:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                          restoreMode === 'replace' ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                          <input
                            type="radio"
                            name="restoreMode"
                            value="replace"
                            checked={restoreMode === 'replace'}
                            onChange={() => setRestoreMode('replace')}
                            className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="text-xs">
                            <strong className="block font-bold">Timpa Seluruh Database (Replace All)</strong>
                            <span className="text-[11px] text-slate-500 leading-tight">Menggantikan database saat ini dengan isi file backup ini secara menyeluruh.</span>
                          </div>
                        </label>

                        <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                          restoreMode === 'merge' ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                          <input
                            type="radio"
                            name="restoreMode"
                            value="merge"
                            checked={restoreMode === 'merge'}
                            onChange={() => setRestoreMode('merge')}
                            className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="text-xs">
                            <strong className="block font-bold">Gabungkan Data (Merge)</strong>
                            <span className="text-[11px] text-slate-500 leading-tight">Menambahkan data baru dan memperbarui yang sudah ada tanpa menghapus data lain.</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleExecuteRestore}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Memulihkan Data...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Mulai Pemulihan Data ({restoreMode === 'replace' ? 'Timpa Database' : 'Gabung Data'})</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {restoreError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{restoreError}</span>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: BERSIHKAN DATA */}
      {/* ========================================================================= */}
      {subTab === 'clean' && (
        <div className="space-y-6">

          {/* Warning & Shortcut Backup Banner */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <strong className="font-extrabold text-amber-950">Perhatian Pengamanan Data:</strong> Tindakan pembersihan bersifat permanen. Anda dapat memfilter pembersihan per bulan tertentu, rentang tanggal, atau semester tanpa menghapus data master santri & pengajar.
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadFullBackup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 font-extrabold text-xs rounded-xl transition cursor-pointer shrink-0 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Backup Dulu</span>
            </button>
          </div>

          {/* Clean Modules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* 1. Bersihkan Jurnal Mutaba'ah */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                      <FileText className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-extrabold text-slate-800">Bersihkan Jurnal Mutaba'ah</h4>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                    {journals.length} catatan
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Menghapus catatan setoran dan evaluasi harian santri (mendukung filter <strong>Bulan</strong>, <strong>Rentang Tanggal</strong>, Kelas, & Halaqoh).
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCleanModalType('journals');
                  setCleanFilterMode('month');
                  setCleanSelectedMonth(currentMonthStr);
                  setCleanStartDate('');
                  setCleanEndDate('');
                  setCleanKelasFilter('all');
                  setCleanHalaqohFilter('all');
                }}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer border border-slate-200 hover:border-rose-200 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Pilih & Bersihkan Jurnal</span>
              </button>
            </div>

            {/* 2. Bersihkan Absensi Siswa */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-extrabold text-slate-800">Bersihkan Absensi Siswa</h4>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                    Santri
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Menghapus riwayat absensi kehadiran santri harian (mendukung filter <strong>Bulan</strong>, <strong>Rentang Tanggal</strong>, atau Semua Waktu).
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCleanModalType('absen_siswa');
                  setCleanFilterMode('month');
                  setCleanSelectedMonth(currentMonthStr);
                  setCleanStartDate('');
                  setCleanEndDate('');
                  setCleanKelasFilter('all');
                }}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer border border-slate-200 hover:border-rose-200 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Pilih & Bersihkan Absensi Siswa</span>
              </button>
            </div>

            {/* 3. Bersihkan Absensi Pengajar */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-extrabold text-slate-800">Bersihkan Absensi Pengajar (Musyrif)</h4>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                    {musyrifAttendances.length} catatan
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Menghapus riwayat absensi kehadiran musyrif (mendukung filter <strong>Bulan</strong>, <strong>Rentang Tanggal</strong>, atau per Pengajar).
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCleanModalType('absen_musyrif');
                  setCleanFilterMode('month');
                  setCleanSelectedMonth(currentMonthStr);
                  setCleanStartDate('');
                  setCleanEndDate('');
                  setCleanMusyrifFilter('all');
                }}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer border border-slate-200 hover:border-rose-200 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Pilih & Bersihkan Absensi Pengajar</span>
              </button>
            </div>

            {/* 4. Reset Penugasan Halaqoh Siswa */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-sky-50 text-sky-700 rounded-lg">
                      <Users className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-extrabold text-slate-800">Reset Penugasan Halaqoh Siswa</h4>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-100 text-sky-800 rounded-full">
                    Tahun Baru
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Mengosongkan penempatan halaqoh seluruh siswa (menjadi 'Belum Ada Halaqoh'). Siswa tidak dihapus, siap dibagi ke halaqoh baru.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCleanModalType('reset_halaqoh')}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer border border-slate-200 hover:border-sky-200 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Penugasan Halaqoh</span>
              </button>
            </div>

          </div>

          {/* Card: Bersihkan Seluruh Catatan Mutaba'ah & Absensi (Semester Baru) */}
          <div className="p-5 bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-200 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-700" />
                  <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                    Persiapan Semester Baru (Bersihkan Log Transaksional)
                  </h4>
                  <span className="px-2 py-0.5 bg-indigo-600 text-white text-[9px] font-black rounded-md">
                    Rekomendasi
                  </span>
                </div>
                <p className="text-xs text-indigo-900/80 leading-relaxed max-w-2xl">
                  Mengosongkan riwayat Jurnal Mutaba'ah dan Absensi sekaligus dalam 1 aksi (bisa per <strong>Bulan</strong>, <strong>Rentang Tanggal</strong>, atau Semua). <strong>Data Master (Kelas, Halaqoh, Siswa, Pengajar) tetap tersimpan aman</strong>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCleanModalType('transactional_all');
                  setCleanFilterMode('all');
                  setCleanSelectedMonth(currentMonthStr);
                  setCleanStartDate('');
                  setCleanEndDate('');
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan Riwayat Semester Ini</span>
              </button>
            </div>
          </div>

          {/* Danger Zone: Factory Reset */}
          <div className="p-5 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-rose-800">
                  <AlertCircle className="w-4 h-4" />
                  <h4 className="text-xs font-black uppercase tracking-wider">
                    Zona Bahaya: Reset Total Database (Pengaturan Awal Pabrik)
                  </h4>
                </div>
                <p className="text-xs text-rose-700/90 leading-relaxed max-w-2xl">
                  Menghapus semua perubahan data dan mengembalikan database ke konfigurasi template standar awal. Tindakan ini memerlukan verifikasi ganda (kata kunci dan password admin).
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCleanModalType('factory_reset');
                  setCleanConfirmText('');
                  setCleanAdminPasswordInput('');
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Reset Total Database</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DIALOG KONFIRMASI PEMBERSIHAN DATA DENGAN FILTER TANGGAL / BULAN */}
      {/* ========================================================================= */}
      {cleanModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col animate-in fade-in duration-200">
            
            {/* Header */}
            <div className={`p-5 text-white flex items-center justify-between ${
              cleanModalType === 'factory_reset' ? 'bg-rose-800' : 'bg-slate-800'
            }`}>
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-300" />
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wide">
                    Konfirmasi Pembersihan Data
                  </h3>
                  <p className="text-[10px] text-slate-300 mt-0.5">Tentukan filter periode tanggal/bulan sebelum melanjutkan</p>
                </div>
              </div>
              <button
                onClick={() => setCleanModalType(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">

              {/* DATE / MONTH FILTER SELECTOR FOR TRANSACTIONAL CLEANS */}
              {(cleanModalType === 'journals' || cleanModalType === 'absen_siswa' || cleanModalType === 'absen_musyrif' || cleanModalType === 'transactional_all') && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-600" />
                      <span>Filter Periode Tanggal / Bulan</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                      {cleanEffectiveDates.label}
                    </span>
                  </div>

                  {/* Mode Buttons */}
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-200/70 p-1 rounded-xl text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setCleanFilterMode('month')}
                      className={`py-1.5 rounded-lg transition cursor-pointer ${
                        cleanFilterMode === 'month' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Pilih Bulan
                    </button>
                    <button
                      type="button"
                      onClick={() => setCleanFilterMode('range')}
                      className={`py-1.5 rounded-lg transition cursor-pointer ${
                        cleanFilterMode === 'range' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Rentang Tanggal
                    </button>
                    <button
                      type="button"
                      onClick={() => setCleanFilterMode('all')}
                      className={`py-1.5 rounded-lg transition cursor-pointer ${
                        cleanFilterMode === 'all' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Semua Waktu
                    </button>
                  </div>

                  {/* Month input */}
                  {cleanFilterMode === 'month' && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-700 shrink-0">Bulan & Tahun:</label>
                        <input
                          type="month"
                          value={cleanSelectedMonth}
                          onChange={(e) => setCleanSelectedMonth(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCleanSelectedMonth(currentMonthStr)}
                          className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-[10px] cursor-pointer"
                        >
                          Bulan Ini
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setMonth(d.getMonth() - 1);
                            setCleanSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                          }}
                          className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-[10px] cursor-pointer"
                        >
                          Bulan Lalu
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Date range input */}
                  {cleanFilterMode === 'range' && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Dari Tanggal</label>
                          <input
                            type="date"
                            value={cleanStartDate}
                            onChange={(e) => setCleanStartDate(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Sampai Tanggal</label>
                          <input
                            type="date"
                            value={cleanEndDate}
                            onChange={(e) => setCleanEndDate(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Secondary filters (Kelas / Halaqoh / Musyrif) */}
                  {cleanModalType === 'journals' && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Filter Kelas</label>
                        <select
                          value={cleanKelasFilter}
                          onChange={(e) => setCleanKelasFilter(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                        >
                          <option value="all">Semua Kelas</option>
                          {classes.map(c => (
                            <option key={c.id} value={c.nama}>{c.nama}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Filter Halaqoh</label>
                        <select
                          value={cleanHalaqohFilter}
                          onChange={(e) => setCleanHalaqohFilter(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                        >
                          <option value="all">Semua Halaqoh</option>
                          {halaqohs.map(h => (
                            <option key={h.id} value={h.id}>{h.nama}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {cleanModalType === 'absen_siswa' && (
                    <div className="pt-2 border-t border-slate-200/80">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Filter Kelas Siswa</label>
                      <select
                        value={cleanKelasFilter}
                        onChange={(e) => setCleanKelasFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                      >
                        <option value="all">Semua Kelas</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.nama}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {cleanModalType === 'absen_musyrif' && (
                    <div className="pt-2 border-t border-slate-200/80">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Filter Pengajar (Musyrif)</label>
                      <select
                        value={cleanMusyrifFilter}
                        onChange={(e) => setCleanMusyrifFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                      >
                        <option value="all">Semua Pengajar</option>
                        {musyrifs.map(m => (
                          <option key={m.id} value={m.id}>{m.nama}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Impact preview badge */}
                  {cleanModalType === 'journals' && (
                    <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-[11px] text-indigo-900 font-bold flex items-center justify-between">
                      <span>Estimasi jurnal yang akan dihapus:</span>
                      <span className="text-rose-700 text-xs font-black">{impactedCleanCounts.journals} data</span>
                    </div>
                  )}

                  {cleanModalType === 'absen_musyrif' && (
                    <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-[11px] text-emerald-900 font-bold flex items-center justify-between">
                      <span>Estimasi absensi pengajar yang akan dihapus:</span>
                      <span className="text-rose-700 text-xs font-black">{impactedCleanCounts.absenMusyrif} data</span>
                    </div>
                  )}

                </div>
              )}

              {/* Descriptive warning text */}
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                <div className="flex items-center gap-1.5 font-extrabold text-rose-900">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Apakah Anda yakin ingin melanjutkan tindakan ini?</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {cleanModalType === 'journals' && `Semua catatan jurnal setoran mutaba'ah periode (${cleanEffectiveDates.label}) yang sesuai dengan filter di atas akan dihapus permanen dari database.`}
                  {cleanModalType === 'absen_siswa' && `Semua data absensi kehadiran santri periode (${cleanEffectiveDates.label}) yang sesuai filter akan dihapus permanen dari database.`}
                  {cleanModalType === 'absen_musyrif' && `Semua riwayat absensi pengajar periode (${cleanEffectiveDates.label}) yang sesuai filter akan dihapus permanen dari database.`}
                  {cleanModalType === 'transactional_all' && `Seluruh riwayat mutaba'ah dan absensi periode (${cleanEffectiveDates.label}) akan dihapus. Data Master siswa dan pengajar tetap aman.`}
                  {cleanModalType === 'reset_halaqoh' && "Status halaqoh pada seluruh siswa akan diubah menjadi 'Belum Ada Halaqoh'."}
                  {cleanModalType === 'factory_reset' && "Seluruh database akan dikembalikan ke kondisi awal (reset pabrik). Semua data kustom akan terhapus!"}
                </p>
              </div>

              {/* Extra security inputs for Factory Reset */}
              {cleanModalType === 'factory_reset' && (
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 block">
                      1. Ketik kata konfirmasi <span className="text-rose-600 select-all">"BERSIHKAN DATA"</span>:
                    </label>
                    <input
                      type="text"
                      placeholder="Ketik BERSIHKAN DATA"
                      value={cleanConfirmText}
                      onChange={(e) => setCleanConfirmText(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 block">
                      2. Masukkan Password Administrator:
                    </label>
                    <div className="relative">
                      <input
                        type={showCleanAdminPass ? 'text' : 'password'}
                        placeholder="Password Admin"
                        value={cleanAdminPasswordInput}
                        onChange={(e) => setCleanAdminPasswordInput(e.target.value)}
                        className="w-full pl-3.5 pr-9 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCleanAdminPass(!showCleanAdminPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        {showCleanAdminPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setCleanModalType(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleExecuteCleanAction}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Bersihkan Data ({cleanEffectiveDates.label})</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
