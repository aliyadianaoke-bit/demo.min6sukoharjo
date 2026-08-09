import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, CheckCircle, Award, BookMarked, FileText, BarChart2, Plus, Edit2, 
  Trash2, LogOut, ChevronRight, Filter, AlertCircle, Sparkles, Smile, Info, BookOpen,
  Printer, Share2, TrendingUp, Camera, UserCheck, Clock, RefreshCw, Search, ArrowUpDown,
  Eye, ArrowLeft, Users
} from 'lucide-react';
import logoMinSukoharjo from '../assets/logo_min_sukoharjo.jpg';
import { 
  addAbsenMusyrif, 
  updateAbsenMusyrif, 
  getAbsenMusyrif,
  addAbsenSiswa, 
  updateAbsenSiswa, 
  addJournal, 
  updateJournal, 
  deleteJournal, 
  getAbsenSiswa,
  subscribeToTable 
} from '../lib/supabaseService';
import { Kelas, Siswa, Halaqoh, Musyrif, CatatanHarian, NilaiEvaluasi, AbsenSiswa, AbsenMusyrif } from '../types';
import AbsenSayaView from './AbsenSayaView';
import AbsenCamera from './AbsenCamera';

interface MusyrifDashboardProps {
  onLogout: () => void;
  userId: string;
  userNama: string;
  classes: Kelas[];
  students: Siswa[];
  musyrifs?: Musyrif[];
  halaqohs: Halaqoh[];
  journals: CatatanHarian[];
  studentAttendances?: AbsenSiswa[];
  refreshData: () => Promise<void>;
}

export default function MusyrifDashboard({
  onLogout,
  userId,
  userNama,
  classes,
  students,
  musyrifs = [],
  halaqohs,
  journals,
  studentAttendances = [],
  refreshData
}: MusyrifDashboardProps) {
  const [activeTab, setActiveTab] = useState<'absen_saya' | 'absen_siswa' | 'input_siswa' | 'halaqoh_lomba' | 'rekap_hari' | 'rekap_bulan'>('absen_saya');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: 'success' });
  const [showAutoAbsenModal, setShowAutoAbsenModal] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Find logged-in Musyrif profile object for deep relationship matching
  const currentMusyrif = useMemo(() => {
    return musyrifs.find(m => 
      String(m.id) === String(userId) || 
      m.username === userId || 
      (m.nama && userNama && m.nama.trim().toLowerCase() === userNama.trim().toLowerCase())
    );
  }, [musyrifs, userId, userNama]);

  const isMengajarLomba = currentMusyrif?.isMengajarLomba === true;

  // Filter halaqohs to only those managed by the current Musyrif (robust multi-field fallback)
  const myHalaqohs = useMemo(() => {
    return halaqohs.filter(h => {
      // 1. Direct ID or array match
      if (String(h.musyrifId) === String(userId)) return true;
      if (currentMusyrif && String(h.musyrifId) === String(currentMusyrif.id)) return true;
      if (h.musyrifIds && (h.musyrifIds.includes(userId) || (currentMusyrif && h.musyrifIds.includes(currentMusyrif.id)))) return true;
      
      // 2. Musyrif assigned halaqohId or halaqohNama match
      if (currentMusyrif?.halaqohId && String(h.id) === String(currentMusyrif.halaqohId)) return true;
      if (currentMusyrif?.halaqohNama && h.nama && currentMusyrif.halaqohNama.trim().toLowerCase() === h.nama.trim().toLowerCase()) return true;

      // 3. Name or credential match
      if (h.musyrifNama && userNama && (h.musyrifNama.trim().toLowerCase() === userNama.trim().toLowerCase() || userNama.trim().toLowerCase().includes(h.musyrifNama.trim().toLowerCase()))) return true;
      if (currentMusyrif && h.musyrifNama && (h.musyrifNama.trim().toLowerCase() === currentMusyrif.nama.trim().toLowerCase() || currentMusyrif.nama.trim().toLowerCase().includes(h.musyrifNama.trim().toLowerCase()))) return true;
      if (currentMusyrif && h.musyrifId && (h.musyrifId === currentMusyrif.username || h.musyrifId === currentMusyrif.nim)) return true;

      return false;
    });
  }, [halaqohs, userId, userNama, currentMusyrif]);

  // Auto-find Musyrif's assigned halaqoh (if any) as initial value
  const assignedHalaqoh = useMemo(() => {
    return myHalaqohs[0] || halaqohs.find(h => String(h.musyrifId) === String(userId));
  }, [myHalaqohs, halaqohs, userId]);
  const initialHalaqohId = assignedHalaqoh?.id || myHalaqohs[0]?.id || '';

  // Stable first halaqoh id for effect dependencies
  const firstMyHalaqohId = myHalaqohs[0]?.id || '';

  // Filter States
  const [selectedHalaqohId, setSelectedHalaqohId] = useState('');
  const [showHalaqohActivationModal, setShowHalaqohActivationModal] = useState(false);
  const [tempHalaqohId, setTempHalaqohId] = useState('');
  const [selectedKelasId, setSelectedKelasId] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<'dasar' | 'tahfidz' | 'Kelas Lomba' | ''>('dasar');
  const [rekapHariTanggal, setRekapHariTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [absenSiswaTanggal, setAbsenSiswaTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [absenSiswaSearch, setAbsenSiswaSearch] = useState('');
  const [absenSiswaKelasFilter, setAbsenSiswaKelasFilter] = useState('all');
  const [absenSiswaCurrentPage, setAbsenSiswaCurrentPage] = useState(1);
  const [classSortOrder, setClassSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isUpdatingAttendance, setIsUpdatingAttendance] = useState<string | null>(null);
  const [selectedBulanMonth, setSelectedBulanMonth] = useState('06'); // Default June (2026 as current year)
  const [selectedBulanSiswaId, setSelectedBulanSiswaId] = useState('');
  const [searchSiswa, setSearchSiswa] = useState('');

  // Form input states (for modal dialog input harian)
  const [showInputModal, setShowInputModal] = useState(false);
  const [targetSiswa, setTargetSiswa] = useState<Siswa | null>(null);
  
  // Specific Setoran Form Fields
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [formMateri, setFormMateri] = useState('');
  const [formEvaluasi, setFormEvaluasi] = useState('');
  const [formNilai, setFormNilai] = useState<NilaiEvaluasi>('A');
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [selectedKategori, setSelectedKategori] = useState<'Murojaah' | 'Ziyadah' | 'Setoran' | 'Tugas Tilawah' | null>(null);

  const [localStudentAttendances, setLocalStudentAttendances] = useState<AbsenSiswa[]>(studentAttendances || []);
  const [localMusyrifAttendances, setLocalMusyrifAttendances] = useState<AbsenMusyrif[]>(() => {
    try {
      const raw = localStorage.getItem('mmq_absen_musyrif_v2');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("Notice loading local musyrif attendances:", e);
    }
    return [];
  });

  useEffect(() => {
    if (studentAttendances) {
      setLocalStudentAttendances(studentAttendances);
    }
  }, [studentAttendances]);

  // Sync real-time student attendance for current musyrif
  const loadStudentAttendance = async () => {
    if (!userId) return;
    try {
      const list = await getAbsenSiswa(userId, 300);
      if (list) {
        setLocalStudentAttendances(list);
      }
    } catch (err) {
      console.warn('Notice syncing student attendance:', err);
    }
  };

  const loadMusyrifAttendance = async () => {
    if (!userId) return;
    try {
      const list = await getAbsenMusyrif(userId, 100);
      if (list) {
        setLocalMusyrifAttendances(list);
      }
    } catch (err) {
      console.warn('Notice syncing musyrif attendance:', err);
    }
  };

  useEffect(() => {
    if (!userId) return;
    loadStudentAttendance();
    loadMusyrifAttendance();
    const unsub1 = subscribeToTable('absen_siswa', () => {
      loadStudentAttendance();
    });
    const unsub2 = subscribeToTable('absen_musyrif', () => {
      loadMusyrifAttendance();
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, [userId]);

  // Retrieve the latest entry for this student and category (can be today or previous days, excluding the current editing doc)
  const lastEntryForKategori = useMemo(() => {
    if (!targetSiswa || !selectedKategori) return null;
    return journals.find(j => 
      String(j.siswaId) === String(targetSiswa.id) && 
      j.id !== editingJournalId &&
      (j.program === 'tahfidz' || (j.program !== 'dasar' && !!j.kategori)) &&
      (j.kategori === selectedKategori || (!j.kategori && selectedKategori === 'Setoran'))
    );
  }, [targetSiswa, selectedKategori, journals, editingJournalId]);

  // Check today's attendance on mount using synchronized musyrif state
  useEffect(() => {
    if (!userId) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const hasAttendedToday = (localMusyrifAttendances || []).some(
      a => String(a.musyrifId) === String(userId) && a.tanggal === todayStr
    );
    if (hasAttendedToday) {
      setShowAutoAbsenModal(false);
    } else {
      const dismissedKey = `dismissed_absen_${userId}_${todayStr}`;
      if (!sessionStorage.getItem(dismissedKey)) {
        setShowAutoAbsenModal(true);
      } else {
        setShowAutoAbsenModal(false);
      }
    }
  }, [userId, localMusyrifAttendances]);

  // Automatically open Halaqoh Activation Modal if none is active when switching to Input or Absen Siswa tab
  useEffect(() => {
    if ((activeTab === 'input_siswa' || activeTab === 'absen_siswa') && !selectedHalaqohId) {
      setTempHalaqohId(firstMyHalaqohId);
      setShowHalaqohActivationModal(true);
    }
  }, [activeTab, selectedHalaqohId, firstMyHalaqohId]);

  const handleOpenHalaqohModal = () => {
    setTempHalaqohId(selectedHalaqohId || myHalaqohs[0]?.id || '');
    setShowHalaqohActivationModal(true);
  };

  const handleAutoCapture = async (base64Image: string) => {
    setIsAutoSaving(true);
    try {
      const now = new Date();
      
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const date = String(now.getDate()).padStart(2, '0');
      const tanggalStr = `${year}-${month}-${date}`;
      
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const waktuStr = `${hours}:${minutes}:${seconds}`;
      
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const hariStr = days[now.getDay()];

      // Check existing attendance from synchronized local state
      const existingRecord = (localMusyrifAttendances || []).find(
        a => String(a.musyrifId) === String(userId) && a.tanggal === tanggalStr
      );

      if (existingRecord) {
        // Update existing record
        await updateAbsenMusyrif(existingRecord.id, {
          waktu: waktuStr,
          hari: hariStr,
          fotoUrl: base64Image
        });
        showFeedback('Absensi harian Anda hari ini berhasil diperbarui!');
      } else {
        // Create new record
        const payload = {
          musyrifId: userId,
          musyrifNama: userNama,
          tanggal: tanggalStr,
          waktu: waktuStr,
          hari: hariStr,
          fotoUrl: base64Image
        };

        await addAbsenMusyrif(payload);
        showFeedback('Absensi kehadiran Anda berhasil disimpan!');
      }
      await loadMusyrifAttendance();
      await refreshData();
      sessionStorage.setItem(`dismissed_absen_${userId}_${tanggalStr}`, 'true');
      setShowAutoAbsenModal(false);
    } catch (err: any) {
      console.warn('Notice saving automatic attendance:', err);
      showFeedback('Gagal menyimpan absensi: ' + err.message, 'danger');
    } finally {
      setIsAutoSaving(false);
    }
  };

  const showFeedback = (text: string, type: 'success' | 'danger' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback({ text: '', type: 'success' }), 4000);
  };

  const handleUpdateStudentAttendance = async (siswa: Siswa, status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa') => {
    setIsUpdatingAttendance(siswa.id);
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sKelas = classes.find(c => c.id === siswa.kelasId);
    const sKelasNama = sKelas?.nama || 'N/A';

    // Find existing in local state first
    const existing = localStudentAttendances.find(
      a => String(a.siswaId) === String(siswa.id) && a.tanggal === absenSiswaTanggal
    );

    // Optimistically update local state so UI buttons change color immediately
    setLocalStudentAttendances(prev => {
      const idx = prev.findIndex(a => String(a.siswaId) === String(siswa.id) && a.tanggal === absenSiswaTanggal);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], status };
        return updated;
      } else {
        const newRecord: AbsenSiswa = {
          id: tempId,
          tanggal: absenSiswaTanggal,
          siswaId: String(siswa.id),
          siswaNama: siswa.nama,
          noInduk: siswa.noInduk || '-',
          kelasId: siswa.kelasId || 'N/A',
          kelasNama: sKelasNama,
          status,
          musyrifId: userId
        };
        return [newRecord, ...prev];
      }
    });

    try {
      if (existing && !existing.id.startsWith('temp_')) {
        await updateAbsenSiswa(existing.id, { status });
      } else {
        const payload = {
          tanggal: absenSiswaTanggal,
          siswaId: siswa.id,
          siswaNama: siswa.nama,
          noInduk: siswa.noInduk || '-',
          kelasId: siswa.kelasId || 'N/A',
          kelasNama: sKelasNama,
          status,
          musyrifId: userId
        };
        const addedDoc = await addAbsenSiswa(payload);
        setLocalStudentAttendances(prev =>
          prev.map(a => (a.id === tempId ? { ...a, id: addedDoc.id } : a))
        );
      }
      showFeedback(`Kehadiran ${siswa.nama} (${status}) berhasil diperbarui`);
    } catch (err: any) {
      console.warn('Notice updating student attendance:', err);
      showFeedback('Gagal menyimpan ke server: ' + err.message, 'danger');
    } finally {
      setIsUpdatingAttendance(null);
    }
  };

  const handleMarkAllPresent = async () => {
    // Apply attendance strictly to the currently filtered/sorted students
    const targetStudents = myStudents.filter(s => {
      if (absenSiswaKelasFilter !== 'all') {
        if (s.kelasId !== absenSiswaKelasFilter && s.kelasNama !== absenSiswaKelasFilter) {
          return false;
        }
      }
      if (absenSiswaSearch.trim()) {
        const term = absenSiswaSearch.toLowerCase();
        return s.nama.toLowerCase().includes(term) ||
               (s.noInduk && s.noInduk.toLowerCase().includes(term)) ||
               (s.kelasNama && s.kelasNama.toLowerCase().includes(term));
      }
      return true;
    });

    if (targetStudents.length === 0) {
      showFeedback('Tidak ada data santri pada kriteria filter/pencarian saat ini.', 'danger');
      return;
    }
    
    setIsSaving(true);
    const newRecords: AbsenSiswa[] = [];

    for (const siswa of targetStudents) {
      const existing = localStudentAttendances.find(
        a => String(a.siswaId) === String(siswa.id) && a.tanggal === absenSiswaTanggal
      );
      if (!existing) {
        const sKelas = classes.find(c => c.id === siswa.kelasId);
        const sKelasNama = sKelas?.nama || 'N/A';
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        newRecords.push({
          id: tempId,
          tanggal: absenSiswaTanggal,
          siswaId: siswa.id,
          siswaNama: siswa.nama,
          noInduk: siswa.noInduk || '-',
          kelasId: siswa.kelasId || 'N/A',
          kelasNama: sKelasNama,
          status: 'Hadir',
          musyrifId: userId
        });
      }
    }

    if (newRecords.length > 0) {
      setLocalStudentAttendances(prev => [...newRecords, ...prev]);
    }

    try {
      let successCount = 0;
      for (const rec of newRecords) {
        const payload = {
          tanggal: rec.tanggal,
          siswaId: rec.siswaId,
          siswaNama: rec.siswaNama,
          noInduk: rec.noInduk,
          kelasId: rec.kelasId,
          kelasNama: rec.kelasNama,
          status: 'Hadir' as const,
          musyrifId: userId
        };
        await addAbsenSiswa(payload);
        successCount++;
      }
      if (newRecords.length > 0) {
        showFeedback(`Berhasil mengabsen 'Hadir' untuk ${newRecords.length} santri.`);
      } else {
        showFeedback('Semua santri pada filter ini sudah memiliki catatan absen hari ini.');
      }
    } catch (err: any) {
      console.warn('Notice marking all present:', err);
      showFeedback('Gagal mengabsen semua: ' + err.message, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenInputForm = (
    siswa: Siswa, 
    kategori?: 'Murojaah' | 'Ziyadah' | 'Setoran' | 'Tugas Tilawah', 
    existingLog?: CatatanHarian
  ) => {
    setTargetSiswa(siswa);
    setSelectedKategori(kategori || null);
    if (existingLog) {
      setFormTanggal(existingLog.tanggal);
      setFormMateri(existingLog.materiSetoran);
      setFormEvaluasi(existingLog.evaluasiTahsin);
      setFormNilai(existingLog.nilai);
      setEditingJournalId(existingLog.id);
    } else {
      setFormTanggal(new Date().toISOString().split('T')[0]);
      setFormMateri('');
      setFormEvaluasi('');
      setFormNilai('A');
      setEditingJournalId(null);
    }
    setShowInputModal(true);
  };

  const handleSetoranSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSiswa || !formMateri.trim()) return;
    setIsSaving(true);
    try {
      const payload: any = {
        tanggal: formTanggal,
        siswaId: targetSiswa.id,
        siswaNama: targetSiswa.nama,
        noInduk: targetSiswa.noInduk,
        kelasNama: targetSiswa.kelasNama,
        halaqohId: targetSiswa.halaqohId,
        materiSetoran: formMateri.trim(),
        evaluasiTahsin: formEvaluasi.trim() || 'Lancar, terus tingkatkan.',
        nilai: formNilai
      };

      if (selectedKategori) {
        payload.kategori = selectedKategori;
      }
      if (selectedProgram) {
        payload.program = selectedProgram;
      }

      // Check if there is already an entry for this student, category, and date
      let finalJournalId = editingJournalId;
      if (!finalJournalId) {
        const dupLog = journals.find(j => {
          if (String(j.siswaId) !== String(targetSiswa.id) || j.tanggal !== formTanggal) return false;
          const logProgram = j.program || (j.kategori ? 'tahfidz' : 'dasar');
          const logKategori = j.kategori || (logProgram === 'tahfidz' ? 'Setoran' : undefined);

          if (selectedProgram && logProgram !== selectedProgram) return false;
          if (selectedKategori) {
            return logKategori === selectedKategori;
          } else {
            return !logKategori || logKategori === 'Setoran';
          }
        });
        if (dupLog) {
          finalJournalId = dupLog.id;
        }
      }

      if (finalJournalId) {
        await updateJournal(finalJournalId, payload);
        showFeedback('Berhasil memperbarui catatan setoran!');
      } else {
        await addJournal(payload);
        showFeedback(`Berhasil mencatat setoran untuk ${targetSiswa.nama}!`);
      }
      
      await refreshData();
      setShowInputModal(false);
      setTargetSiswa(null);
      setSelectedKategori(null);
    } catch (err: any) {
      showFeedback('Gagal menyimpan setoran: ' + err.message, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!window.confirm('Hapus catatan setoran ini?')) return;
    try {
      await deleteJournal(id);
      showFeedback('Berhasil menghapus catatan setoran.');
      await refreshData();
    } catch (err: any) {
      showFeedback('Gagal menghapus: ' + err.message, 'danger');
    }
  };

  const copyToClipboard = async (str: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(str);
        return true;
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = str;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      }
    } catch {
      return false;
    }
  };

  const handleShareWA = async () => {
    if (!selectedKelasId || !selectedProgram) return;
    const activeKelasObj = classes.find(c => String(c.id) === String(selectedKelasId));
    const kelasNama = activeKelasObj?.nama || 'N/A';
    const programLabel = selectedProgram === 'dasar' ? 'Dasar' : 'Tahfidz';

    const formattedDate = new Date(rekapHariTanggal).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const sortedStudents = rekapKelasStudents;

    const categoryOrderMap: Record<string, number> = {
      'Murojaah': 1,
      'Ziyadah': 2,
      'Setoran': 3,
      'Tugas Tilawah': 4
    };

    const uniqueStudentsWithLogs = new Set(dailyRecapLogs.map(l => l.siswaId)).size;

    let text = `*REKAP HARIAN KELAS ${kelasNama.toUpperCase()} (${programLabel.toUpperCase()})*\n`;
    text += `*Program Mutiara Bangsa*\n\n`;
    text += `🏫 *Kelas / Program*: ${kelasNama} / ${programLabel}\n`;
    text += `👤 *Musyrif/ah*: ${userNama}\n`;
    text += `📅 *Tanggal*: ${formattedDate}\n`;
    text += `📊 *Total Setoran*: ${uniqueStudentsWithLogs} dari ${sortedStudents.length} Santri (${dailyRecapLogs.length} Input)\n\n`;
    text += `===================================\n\n`;

    if (sortedStudents.length === 0) {
      text += `_Tidak ada santri di kelas ini._\n`;
    } else {
      sortedStudents.forEach((siswa, idx) => {
        const studentLogs = dailyRecapLogs.filter(j => String(j.siswaId) === String(siswa.id));

        text += `*${idx + 1}. ${siswa.nama.toUpperCase()}* (No Induk: ${siswa.noInduk || '-'})\n`;
        if (studentLogs.length > 0) {
          const sortedLogs = [...studentLogs].sort((a, b) => {
            const orderA = a.kategori ? (categoryOrderMap[a.kategori] || 99) : 99;
            const orderB = b.kategori ? (categoryOrderMap[b.kategori] || 99) : 99;
            return orderA - orderB;
          });

          sortedLogs.forEach(log => {
            const labelNilai = log.nilai === 'A' ? 'Mumtaz (A)' : 
                               log.nilai === 'B' ? 'Jayyid Jidid (B)' : 
                               log.nilai === 'C' ? 'Jayyid (C)' : 
                               log.nilai === 'D' ? 'Maqbul (D)' : 'Rosib (E)';

            const isTahfidzMode = selectedProgram === 'tahfidz' || !!log.kategori;

            if (isTahfidzMode) {
              const katLabel = log.kategori || 'Setoran';
              text += `• *${katLabel}*: _${log.materiSetoran}_ (Nilai: *${labelNilai}*)\n`;
              if (log.evaluasiTahsin && log.evaluasiTahsin.trim()) {
                text += `  └ _Evaluasi: ${log.evaluasiTahsin}_\n`;
              }
            } else {
              text += `• *Materi*: _${log.materiSetoran}_\n`;
              text += `• *Evaluasi*: _${log.evaluasiTahsin || '-'}\n`;
              text += `• *Nilai*: *${labelNilai}*\n`;
            }
          });
          text += `\n`;
        } else {
          const att = localStudentAttendances.find(a => String(a.siswaId) === String(siswa.id) && a.tanggal === rekapHariTanggal);
          const attStatus = att ? att.status : 'Belum Absen';
          const displayStatus = attStatus === 'Hadir' ? 'Hadir (Belum Setoran)' : attStatus;
          text += `• *Status*: _${displayStatus}_\n\n`;
        }
      });
    }

    text += `===================================\n`;
    text += `_Mencetak Generasi Qur'ani yang Berakhlaqul Karimah_`;

    await copyToClipboard(text);

    const encodedText = encodeURIComponent(text);
    if (encodedText.length < 1800) {
      const waUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
      window.open(waUrl, '_blank');
      showFeedback(`Berhasil! Teks rekap ${sortedStudents.length} santri dikirim ke WA (dan tersalin di clipboard).`);
    } else {
      const introText = `*REKAP HARIAN KELAS ${kelasNama.toUpperCase()} (${programLabel.toUpperCase()})*\n📅 *Tanggal*: ${formattedDate}\n📊 *Total*: ${uniqueStudentsWithLogs} dari ${sortedStudents.length} Santri\n\n*(Teks rekap 1 kelas lengkap berisi ${sortedStudents.length} santri telah disalin ke Clipboard! Silakan langsung Tempel / Paste di WA)*\n\n`;
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(introText)}`;
      window.open(waUrl, '_blank');
      showFeedback(`Teks rekap 1 kelas (${sortedStudents.length} santri) telah disalin ke Clipboard! Tinggal PASTE (Tempel) di WhatsApp.`, 'success');
    }
  };

  const handleCetakPDF = () => {
    if (!selectedKelasId || !selectedProgram) return;
    const activeKelasObj = classes.find(c => String(c.id) === String(selectedKelasId));
    const kelasNama = activeKelasObj?.nama || 'N/A';
    const programLabel = selectedProgram === 'dasar' ? 'Dasar' : 'Tahfidz';

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) return;

    const formattedDate = new Date(rekapHariTanggal).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const sortedStudents = rekapKelasStudents;

    const categoryOrderMap: Record<string, number> = {
      'Murojaah': 1,
      'Ziyadah': 2,
      'Setoran': 3,
      'Tugas Tilawah': 4
    };

    const tableRowsHtml = sortedStudents.map((siswa, index) => {
      const studentLogs = dailyRecapLogs.filter(j => String(j.siswaId) === String(siswa.id));
      
      if (studentLogs.length > 0) {
        const sortedLogs = [...studentLogs].sort((a, b) => {
          const orderA = a.kategori ? (categoryOrderMap[a.kategori] || 99) : 99;
          const orderB = b.kategori ? (categoryOrderMap[b.kategori] || 99) : 99;
          return orderA - orderB;
        });

        const isTahfidzMode = selectedProgram === 'tahfidz' || sortedLogs.some(l => !!l.kategori);

        const materiCellHtml = sortedLogs.map((log, lIdx) => {
          const isLast = lIdx === sortedLogs.length - 1;
          const borderStyle = isLast ? '' : 'border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; margin-bottom: 4px;';
          const katLabel = log.kategori 
            ? `<span style="display: inline-block; font-size: 8px; font-weight: 800; background-color: #f1f5f9; border: 1px solid #cbd5e1; color: #0f766e; padding: 1px 5px; border-radius: 4px; text-transform: uppercase; margin-right: 6px;">${log.kategori}</span>` 
            : '';
          return `<div style="${borderStyle}">${katLabel}<strong style="color: #0f766e;">${log.materiSetoran}</strong></div>`;
        }).join('');

        const evaluasiCellHtml = sortedLogs.map((log, lIdx) => {
          const isLast = lIdx === sortedLogs.length - 1;
          const borderStyle = isLast ? '' : 'border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; margin-bottom: 4px;';
          const evalText = log.evaluasiTahsin || '-';
          return `<div style="${borderStyle}">${evalText}</div>`;
        }).join('');

        const nilaiCellHtml = sortedLogs.map((log, lIdx) => {
          const isLast = lIdx === sortedLogs.length - 1;
          const borderStyle = isLast ? '' : 'border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; margin-bottom: 4px;';
          const labelNilai = log.nilai === 'A' ? 'Mumtaz (A)' : 
                             log.nilai === 'B' ? 'Jayyid Jidid (B)' : 
                             log.nilai === 'C' ? 'Jayyid (C)' : 
                             log.nilai === 'D' ? 'Maqbul (D)' : 'Rosib (E)';
          return `
            <div style="${borderStyle} text-align: center;">
              <span class="nilai-badge nilai-${log.nilai}">${labelNilai}</span>
            </div>
          `;
        }).join('');

        return `
          <tr>
            <td style="text-align: center; font-weight: bold; vertical-align: middle;">${index + 1}</td>
            <td style="font-family: monospace; text-align: center; vertical-align: middle;">${siswa.noInduk || '-'}</td>
            <td style="vertical-align: middle;">
              <div style="font-weight: 700; text-transform: uppercase;">${siswa.nama}</div>
              <div style="font-size: 9px; color: #64748b;">Kelas: ${kelasNama}</div>
            </td>
            <td style="vertical-align: top;">${materiCellHtml}</td>
            <td style="color: #475569; font-style: italic; vertical-align: top;">${evaluasiCellHtml}</td>
            <td style="vertical-align: top;">${nilaiCellHtml}</td>
          </tr>
        `;
      } else {
        const att = localStudentAttendances.find(a => String(a.siswaId) === String(siswa.id) && a.tanggal === rekapHariTanggal);
        const attStatus = att ? att.status : 'Belum Absen';
        const displayStatus = attStatus === 'Hadir' ? 'Hadir (Belum Setoran)' : attStatus;
        const isAbsent = attStatus !== 'Hadir';
        const rowBg = isAbsent ? '#fff1f2' : '#f0fdf4';
        const rowColor = isAbsent ? '#9f1239' : '#166534';
        return `
          <tr style="background-color: ${rowBg}; color: ${rowColor};">
            <td style="text-align: center; font-weight: bold;">${index + 1}</td>
            <td style="font-family: monospace; text-align: center; color: ${rowColor};">${siswa.noInduk || '-'}</td>
            <td>
              <div style="font-weight: 700; text-transform: uppercase; color: ${rowColor};">${siswa.nama}</div>
              <div style="font-size: 9px; color: ${rowColor};">Kelas: ${kelasNama}</div>
            </td>
            <td style="font-style: italic; color: ${rowColor}; font-weight: 600;" colspan="3">
              ${displayStatus}
            </td>
          </tr>
        `;
      }
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Rekap Harian Kelas ${kelasNama} - ${programLabel}</title>
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
          .header-logo {
            width: 100%;
            max-width: 100%;
            height: auto;
            max-height: 140px;
            margin: 0 auto 10px auto;
            display: block;
            object-fit: contain;
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
          .nilai-badge {
            font-weight: 700;
            font-size: 9px;
            padding: 2px 6px;
            border-radius: 4px;
            text-transform: uppercase;
            white-space: nowrap;
            display: inline-block;
          }
          .nilai-A { background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
          .nilai-B { background-color: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; }
          .nilai-C { background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
          .nilai-D { background-color: #fef08a; color: #854d0e; border: 1px solid #fde68a; }
          .nilai-E { background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
          
          .no-data {
            font-size: 11px;
            color: #94a3b8;
            font-style: italic;
            text-align: center;
          }
          .footer-signature {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            font-size: 11px;
            page-break-inside: avoid;
          }
          .sig-box {
            width: 220px;
            text-align: center;
          }
          .sig-line {
            margin-top: 50px;
            border-top: 1px solid #475569;
            padding-top: 4px;
            font-weight: 700;
            color: #1e293b;
          }
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.22;
            z-index: 0;
            pointer-events: none;
            width: 520px;
            max-width: 85%;
            text-align: center;
          }
          .watermark img {
            width: 100%;
            height: auto;
            object-fit: contain;
          }
          .header, .meta-container, table, .summary-box, .footer-signature {
            position: relative;
            z-index: 1;
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
        <div class="watermark">
          <img src="https://lh3.googleusercontent.com/d/1651wKNM5H8EGuDrdBiA82bNKuCE3es0d" alt="Watermark" />
        </div>
        <div class="header">
          <img src="https://lh3.googleusercontent.com/d/1kr1Sw04azCLhACIUu0rqCLY0ch2LplxJ" alt="Logo Mutiara Bangsa" class="header-logo" />
          <h1>PROGRAM MUTIARA BANGSA</h1>
          <h2>LAPORAN REKAP HARIAN SETORAN TAHFIDZ</h2>
          <p>Mencetak Generasi Qur'ani yang Berakhlaqul Karimah</p>
        </div>

        <div class="meta-container">
          <div>
            <div class="meta-item"><strong>Kelas / Program</strong>: ${kelasNama} / ${programLabel}</div>
            <div class="meta-item"><strong>Musyrif Pengampu</strong>: ${userNama}</div>
          </div>
          <div>
            <div class="meta-item"><strong>Tanggal Laporan</strong>: ${formattedDate}</div>
            <div class="meta-item"><strong>Total Setoran</strong>: ${dailyRecapLogs.length} dari ${sortedStudents.length} Anak</div>
          </div>
        </div>

        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">No</th>
              <th style="width: 12%; text-align: center;">No Induk</th>
              <th style="width: 25%; text-align: left;">Nama Santri</th>
              <th style="width: 25%; text-align: left;">Materi Setoran</th>
              <th style="width: 21%; text-align: left;">Evaluasi / Tahsin</th>
              <th style="width: 12%; text-align: center;">Nilai</th>
            </tr>
          </thead>
          <tbody>
            ${dailyRecapLogs.length === 0 ? `
              <tr>
                <td colspan="6" class="no-data">Belum ada catatan setoran harian untuk tanggal ini.</td>
              </tr>
            ` : tableRowsHtml}
          </tbody>
        </table>

        <div class="footer-signature">
          <div class="sig-box">
            <div>Mengetahui,</div>
            <div style="font-weight: 700; margin-top: 4px;">Manager Pengajaran Team Qur'an</div>
            <div class="sig-line">Ust. M. Ridwan Sam, S.Pd, M.Pd.</div>
          </div>
          <div class="sig-box">
            <div>Sukoharjo, ${formattedDate}</div>
            <div style="font-weight: 700; margin-top: 4px;">Musyrif Pengampu</div>
            <div class="sig-line">${userNama}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 5000);
    }, 500);
  };

  const handleCetakPDFBulanan = () => {
    const selectedSiswa = students.find(s => s.id === selectedBulanSiswaId);
    if (!selectedSiswa) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) return;

    const getBulanName = (monthCode: string) => {
      const months: Record<string, string> = {
        '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
        '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
        '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
      };
      return months[monthCode] || monthCode;
    };

    const bulanName = getBulanName(selectedBulanMonth);

    const totalA = studentMonthlyLogs.filter(j => j.nilai === 'A').length;
    const totalB = studentMonthlyLogs.filter(j => j.nilai === 'B').length;
    const totalC = studentMonthlyLogs.filter(j => j.nilai === 'C').length;
    const totalD = studentMonthlyLogs.filter(j => j.nilai === 'D').length;
    const totalE = studentMonthlyLogs.filter(j => j.nilai === 'E').length;

    const tableRowsHtml = studentMonthlyLogs.map((log, index) => {
      const labelNilai = log.nilai === 'A' ? 'Mumtaz (A)' : 
                         log.nilai === 'B' ? 'Jayyid Jidid (B)' : 
                         log.nilai === 'C' ? 'Jayyid (C)' : 
                         log.nilai === 'D' ? 'Maqbul (D)' : 'Rosib (E)';
      const isTahfidzLog = log.program === 'tahfidz' || (log.program !== 'dasar' && !!log.kategori);
      const categoryBadge = log.kategori 
        ? `<span style="display: inline-block; font-size: 8px; background-color: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; padding: 1px 4px; border-radius: 3px; text-transform: uppercase; margin-right: 4px; font-weight: bold; font-family: sans-serif;">${log.kategori}</span>` 
        : '';
      return `
        <tr>
          <td style="text-align: center; font-weight: bold;">${index + 1}</td>
          <td style="text-align: center; font-family: monospace;">${log.tanggal}</td>
          <td style="font-weight: 600; color: #0f766e;">
            ${categoryBadge}${log.materiSetoran}
          </td>
          <td style="color: #475569; font-style: italic;">${log.evaluasiTahsin || '-'}</td>
          <td style="text-align: center;">
            <span class="nilai-badge nilai-${log.nilai}">${labelNilai}</span>
          </td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Rekap Bulanan - ${selectedSiswa.nama}</title>
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
          .header-logo {
            width: 100%;
            max-width: 100%;
            height: auto;
            max-height: 140px;
            margin: 0 auto 10px auto;
            display: block;
            object-fit: contain;
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
            margin-bottom: 15px;
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
          
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 10px;
            margin-bottom: 20px;
          }
          .stat-box {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px;
            text-align: center;
          }
          .stat-title {
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
          }
          .stat-value {
            font-size: 14px;
            font-weight: 800;
            margin-top: 2px;
            color: #0f172a;
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
          .nilai-badge {
            font-weight: 700;
            font-size: 9px;
            padding: 2px 6px;
            border-radius: 4px;
            text-transform: uppercase;
            white-space: nowrap;
            display: inline-block;
          }
          .nilai-A { background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
          .nilai-B { background-color: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; }
          .nilai-C { background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
          .nilai-D { background-color: #fef08a; color: #854d0e; border: 1px solid #fde68a; }
          .nilai-E { background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
          
          .no-data {
            font-size: 11px;
            color: #94a3b8;
            font-style: italic;
            text-align: center;
          }
          .footer-signature {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            font-size: 11px;
            page-break-inside: avoid;
          }
          .sig-box {
            width: 220px;
            text-align: center;
          }
          .sig-line {
            margin-top: 50px;
            border-top: 1px solid #475569;
            padding-top: 4px;
            font-weight: 700;
            color: #1e293b;
          }
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.22;
            z-index: 0;
            pointer-events: none;
            width: 520px;
            max-width: 85%;
            text-align: center;
          }
          .watermark img {
            width: 100%;
            height: auto;
            object-fit: contain;
          }
          .header, .meta-container, table, .summary-box, .footer-signature {
            position: relative;
            z-index: 1;
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
        <div class="watermark">
          <img src="https://lh3.googleusercontent.com/d/1651wKNM5H8EGuDrdBiA82bNKuCE3es0d" alt="Watermark" />
        </div>
        <div class="header">
          <img src="https://lh3.googleusercontent.com/d/1kr1Sw04azCLhACIUu0rqCLY0ch2LplxJ" alt="Logo Mutiara Bangsa" class="header-logo" />
          <h1>PROGRAM MUTIARA BANGSA</h1>
          <h2>LAPORAN REKAP BULANAN SETORAN TAHFIDZ</h2>
          <p>Mencetak Generasi Qur'ani yang Berakhlaqul Karimah</p>
        </div>

        <div class="meta-container">
          <div>
            <div class="meta-item"><strong>Nama Santri</strong>: ${selectedSiswa.nama}</div>
            <div class="meta-item"><strong>No. Induk / Kelas</strong>: ${selectedSiswa.noInduk} / ${selectedSiswa.kelasNama || 'Belum Diatur'}</div>
            <div class="meta-item"><strong>Halaqoh Qur'an</strong>: ${selectedSiswa.halaqohNama || 'Belum Diatur'}</div>
          </div>
          <div>
            <div class="meta-item"><strong>Bulan / Tahun</strong>: ${bulanName} 2026</div>
            <div class="meta-item"><strong>Musyrif Pengampu</strong>: ${userNama}</div>
            <div class="meta-item"><strong>Total Setoran</strong>: ${studentMonthlyLogs.length} Kali</div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-box" style="background-color: #f0fdf4;">
            <div class="stat-title" style="color: #166534;">Mumtaz (A)</div>
            <div class="stat-value" style="color: #166534;">${totalA}</div>
          </div>
          <div class="stat-box" style="background-color: #f0fdfa;">
            <div class="stat-title" style="color: #0f766e;">Jayyid Jidid (B)</div>
            <div class="stat-value" style="color: #0f766e;">${totalB}</div>
          </div>
          <div class="stat-box" style="background-color: #fffbeb;">
            <div class="stat-title" style="color: #b45309;">Jayyid (C)</div>
            <div class="stat-value" style="color: #b45309;">${totalC}</div>
          </div>
          <div class="stat-box" style="background-color: #fefce8;">
            <div class="stat-title" style="color: #a16207;">Maqbul (D)</div>
            <div class="stat-value" style="color: #a16207;">${totalD}</div>
          </div>
          <div class="stat-box" style="background-color: #fef2f2;">
            <div class="stat-title" style="color: #991b1b;">Rosib (E)</div>
            <div class="stat-value" style="color: #991b1b;">${totalE}</div>
          </div>
        </div>

        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">No</th>
              <th style="width: 15%; text-align: center;">Tanggal</th>
              <th style="width: 35%; text-align: left;">Materi Setoran</th>
              <th style="width: 30%; text-align: left;">Evaluasi / Tahsin</th>
              <th style="width: 15%; text-align: center;">Nilai</th>
            </tr>
          </thead>
          <tbody>
            ${studentMonthlyLogs.length === 0 ? `
              <tr>
                <td colspan="5" class="no-data">Tidak ada catatan setoran untuk bulan ini.</td>
              </tr>
            ` : tableRowsHtml}
          </tbody>
        </table>

        <div class="footer-signature">
          <div class="sig-box">
            <div>Mengetahui,</div>
            <div style="font-weight: 700; margin-top: 4px;">Manager Pengajaran Team Qur'an</div>
            <div class="sig-line">Ust. M. Ridwan Sam, S.Pd, M.Pd.</div>
          </div>
          <div class="sig-box">
            <div>Sukoharjo, ${bulanName} 2026</div>
            <div style="font-weight: 700; margin-top: 4px;">Musyrif Pengampu</div>
            <div class="sig-line">${userNama}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 5000);
    }, 500);
  };

  // All students belonging to this Musyrif's managed halaqohs (filtered to selected halaqoh if active)
  const myStudents = useMemo(() => {
    return students
      .filter(s => {
        if (selectedHalaqohId) {
          if (String(s.halaqohId) === String(selectedHalaqohId)) return true;
          const targetHq = halaqohs.find(h => String(h.id) === String(selectedHalaqohId));
          if (targetHq && s.halaqohNama && s.halaqohNama.trim().toLowerCase() === targetHq.nama.trim().toLowerCase()) return true;
          return false;
        }

        if (myHalaqohs.length > 0) {
          return myHalaqohs.some(h => 
            String(s.halaqohId) === String(h.id) || 
            (s.halaqohNama && h.nama && s.halaqohNama.trim().toLowerCase() === h.nama.trim().toLowerCase())
          );
        }

        if (currentMusyrif?.halaqohId && String(s.halaqohId) === String(currentMusyrif.halaqohId)) return true;
        if (currentMusyrif?.halaqohNama && s.halaqohNama && s.halaqohNama.trim().toLowerCase() === currentMusyrif.halaqohNama.trim().toLowerCase()) return true;

        // Fallback: If no halaqoh binding exists, include student so data doesn't disappear
        return true;
      })
      .sort((a, b) => {
        const classCompare = (a.kelasNama || '').localeCompare(b.kelasNama || '', 'id', { numeric: true, sensitivity: 'base' });
        if (classCompare !== 0) {
          return classSortOrder === 'asc' ? classCompare : -classCompare;
        }
        return (a.nama || '').localeCompare(b.nama || '', 'id');
      });
  }, [students, selectedHalaqohId, myHalaqohs, halaqohs, currentMusyrif, classSortOrder]);

  // Filter students based on selected Class and Program
  const inputTabStudents = useMemo(() => {
    return myStudents.filter(s => {
      // Check program
      if (selectedProgram === 'dasar') {
        if (!(s.isKelasDasar === true || (!s.isKelasDasar && !s.isKelasTahfidz && !s.isKelasLomba))) return false;
      } else if (selectedProgram === 'tahfidz') {
        if (!(s.isKelasTahfidz === true || (!s.isKelasDasar && !s.isKelasTahfidz && !s.isKelasLomba))) return false;
      } else if (selectedProgram === 'Kelas Lomba') {
        if (!(s.isKelasLomba === true || (!s.isKelasDasar && !s.isKelasTahfidz && !s.isKelasLomba))) return false;
      }

      // Check class filter (only if selected)
      if (selectedKelasId && String(s.kelasId) !== String(selectedKelasId) && s.kelasNama !== selectedKelasId) return false;

      // Check search term
      if (searchSiswa.trim()) {
        const term = searchSiswa.toLowerCase();
        if (!(s.nama.toLowerCase().includes(term) || (s.noInduk && s.noInduk.toLowerCase().includes(term)) || (s.kelasNama && s.kelasNama.toLowerCase().includes(term)))) {
          return false;
        }
      }

      return true;
    });
  }, [myStudents, selectedProgram, selectedKelasId, searchSiswa]);

  // Filter journals for "Rekap Harian" based on class, program, and date
  const dailyRecapLogs = journals.filter(j => {
    if (j.tanggal !== rekapHariTanggal) return false;
    
    // Find student in students list
    const s = students.find(siswa => String(siswa.id) === String(j.siswaId));
    if (!s) return false;

    // Filter by selected Class
    if (selectedKelasId && String(s.kelasId) !== String(selectedKelasId) && s.kelasNama !== selectedKelasId) return false;

    // Filter by selected Program
    if (selectedProgram === 'dasar') {
      const isStudentMatch = s.isKelasDasar === true || (!s.isKelasDasar && !s.isKelasTahfidz && !s.isKelasLomba);
      if (!isStudentMatch) return false;
      return j.program === 'dasar' || (j.program !== 'tahfidz' && j.program !== 'Kelas Lomba' && !j.kategori);
    }
    if (selectedProgram === 'tahfidz') {
      const isStudentMatch = s.isKelasTahfidz === true || (!s.isKelasDasar && !s.isKelasTahfidz && !s.isKelasLomba);
      if (!isStudentMatch) return false;
      return j.program === 'tahfidz' || (j.program !== 'dasar' && j.program !== 'Kelas Lomba' && !!j.kategori);
    }
    if (selectedProgram === 'Kelas Lomba') {
      const isStudentMatch = s.isKelasLomba === true || (!s.isKelasDasar && !s.isKelasTahfidz && !s.isKelasLomba);
      if (!isStudentMatch) return false;
      return j.program === 'Kelas Lomba';
    }
    return false;
  });

  // All students belonging to the selected class/program or defaulting to myStudents
  const rekapKelasStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedKelasId && String(s.kelasId) !== String(selectedKelasId) && s.kelasNama !== selectedKelasId) {
        return false;
      }
      if (!selectedKelasId) {
        if (myStudents.length > 0 && !myStudents.some(ms => ms.id === s.id)) return false;
      }
      if (selectedProgram === 'dasar') {
        return s.isKelasDasar === true || (!s.isKelasDasar && !s.isKelasTahfidz && !s.isKelasLomba);
      }
      if (selectedProgram === 'tahfidz') {
        return s.isKelasTahfidz === true || (!s.isKelasDasar && !s.isKelasTahfidz && !s.isKelasLomba);
      }
      if (selectedProgram === 'Kelas Lomba') {
        return s.isKelasLomba === true || (!s.isKelasDasar && !s.isKelasTahfidz && !s.isKelasLomba);
      }
      return true;
    }).sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id'));
  }, [students, selectedKelasId, myStudents, selectedProgram]);

  // Students available for selection in "Rekap Bulanan" & "Rekap Harian"
  const selectBulanStudents = rekapKelasStudents;

  // Filter for "Rekap Bulanan" logs
  // Month string format: 2026-XX
  const selectedYearMonthPrefix = `2026-${selectedBulanMonth}`;
  const studentMonthlyLogs = journals.filter(j => {
    if (String(j.siswaId) !== String(selectedBulanSiswaId) || !j.tanggal.startsWith(selectedYearMonthPrefix)) return false;
    if (selectedProgram === 'tahfidz') {
      return j.program === 'tahfidz' || (j.program !== 'dasar' && j.program !== 'Kelas Lomba' && !!j.kategori);
    } else if (selectedProgram === 'Kelas Lomba') {
      return j.program === 'Kelas Lomba';
    } else {
      return j.program === 'dasar' || (j.program !== 'tahfidz' && j.program !== 'Kelas Lomba' && !j.kategori);
    }
  });

  // Class Monthly Recap calculation for all students in the selected class & program
  const classMonthlyRecap = useMemo(() => {
    const prefix = `2026-${selectedBulanMonth}`;
    return rekapKelasStudents.map(siswa => {
      const sLogs = journals.filter(j => {
        if (String(j.siswaId) !== String(siswa.id) || !j.tanggal.startsWith(prefix)) return false;
        if (selectedProgram === 'tahfidz') {
          return j.program === 'tahfidz' || (j.program !== 'dasar' && !!j.kategori);
        } else if (selectedProgram === 'dasar') {
          return j.program === 'dasar' || (j.program !== 'tahfidz' && !j.kategori);
        }
        return true;
      }).sort((a, b) => {
        const d = a.tanggal.localeCompare(b.tanggal);
        if (d !== 0) return d;
        return String(a.id).localeCompare(String(b.id));
      });

      const totalSetoran = sLogs.length;
      const setoranAwal = totalSetoran > 0 ? sLogs[0] : null;
      const setoranAkhir = totalSetoran > 0 ? sLogs[totalSetoran - 1] : null;

      return {
        siswa,
        sLogs,
        totalSetoran,
        setoranAwal,
        setoranAkhir
      };
    });
  }, [rekapKelasStudents, journals, selectedBulanMonth, selectedProgram]);

  // Printable PDF function for Class Monthly Recap
  const handleCetakPDFBulananKelas = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) return;

    const selectedClass = classes.find(c => String(c.id) === String(selectedKelasId));
    const kelasNamaStr = selectedClass ? selectedClass.nama : 'Semua Kelas';
    const programNamaStr = selectedProgram === 'tahfidz' ? 'Tahfidz Qur\'an' : 'Program Dasar';
    const monthNames: Record<string, string> = {
      '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
      '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
      '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
    };
    const bulanName = monthNames[selectedBulanMonth] || selectedBulanMonth;

    const totalStudents = classMonthlyRecap.length;
    const totalSetoranKelas = classMonthlyRecap.reduce((acc, curr) => acc + curr.totalSetoran, 0);

    const tableRowsHtml = classMonthlyRecap.map((item, idx) => {
      const awalStr = item.setoranAwal 
        ? `${item.setoranAwal.tanggal.split('-').reverse().slice(0,2).join('/')} - ${item.setoranAwal.kategori ? `[${item.setoranAwal.kategori}] ` : ''}${item.setoranAwal.materiSetoran}` 
        : '-';
      const akhirStr = item.setoranAkhir 
        ? `${item.setoranAkhir.tanggal.split('-').reverse().slice(0,2).join('/')} - ${item.setoranAkhir.kategori ? `[${item.setoranAkhir.kategori}] ` : ''}${item.setoranAkhir.materiSetoran}` 
        : '-';

      return `
        <tr>
          <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="text-align: center;">${item.siswa.noInduk || '-'}</td>
          <td style="font-weight: bold; text-transform: uppercase;">${item.siswa.nama}</td>
          <td style="text-align: center; font-weight: bold; color: #065f46;">${item.totalSetoran} Kali</td>
          <td>${awalStr}</td>
          <td>${akhirStr}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Rekap Bulanan Kelas - ${kelasNamaStr}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          body { font-family: 'Inter', -apple-system, sans-serif; margin: 0; padding: 25px; color: #1e293b; font-size: 11px; line-height: 1.3; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 3px double #0f766e; padding-bottom: 12px; }
          .header-logo { width: 100%; max-width: 100%; height: auto; max-height: 140px; margin: 0 auto 10px auto; display: block; object-fit: contain; }
          .header h1 { margin: 0; font-size: 20px; color: #0f766e; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
          .header h2 { margin: 4px 0 0 0; font-size: 13px; color: #334155; font-weight: 600; }
          .header p { margin: 4px 0 0 0; font-size: 10px; color: #64748b; font-style: italic; }
          .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.22; z-index: 0; pointer-events: none; width: 520px; max-width: 85%; text-align: center; }
          .watermark img { width: 100%; height: auto; object-fit: contain; }
          .header, .meta-container, table, .summary-box, .footer-signature { position: relative; z-index: 1; }
          .meta-container { display: flex; justify-content: space-between; margin-bottom: 15px; background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; }
          .meta-item { margin-bottom: 3px; font-size: 11px; }
          .report-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
          .report-table th, .report-table td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
          .report-table th { background-color: #f1f5f9; color: #0f766e; font-weight: 700; text-transform: uppercase; font-size: 9px; }
          .report-table tr:nth-child(even) { background-color: #f8fafc; }
          .footer-signature { display: flex; justify-content: space-between; margin-top: 30px; font-size: 11px; page-break-inside: avoid; }
          .sig-box { width: 200px; text-align: center; }
          .sig-line { margin-top: 45px; border-top: 1px solid #475569; padding-top: 4px; font-weight: 700; }
          @media print {
            body { padding: 0; }
            @page { size: A4; margin: 1cm; }
          }
        </style>
      </head>
      <body>
        <div class="watermark">
          <img src="https://lh3.googleusercontent.com/d/1651wKNM5H8EGuDrdBiA82bNKuCE3es0d" alt="Watermark" />
        </div>
        <div class="header">
          <img src="https://lh3.googleusercontent.com/d/1kr1Sw04azCLhACIUu0rqCLY0ch2LplxJ" alt="Logo Mutiara Bangsa" class="header-logo" />
          <h1>PROGRAM MUTIARA BANGSA</h1>
          <h2>REKAPAN BULANAN SETORAN PER KELAS (${programNamaStr.toUpperCase()})</h2>
          <p>Mencetak Generasi Qur'ani yang Berakhlaqul Karimah</p>
        </div>
        <div class="meta-container">
          <div>
            <div class="meta-item"><strong>Kelas</strong>: ${kelasNamaStr}</div>
            <div class="meta-item"><strong>Program</strong>: ${programNamaStr}</div>
            <div class="meta-item"><strong>Musyrif Pengampu</strong>: ${userNama}</div>
          </div>
          <div>
            <div class="meta-item"><strong>Bulan / Tahun</strong>: ${bulanName} 2026</div>
            <div class="meta-item"><strong>Total Santri</strong>: ${totalStudents} Orang</div>
            <div class="meta-item"><strong>Total Setoran Kelas</strong>: ${totalSetoranKelas} Kali</div>
          </div>
        </div>
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 4%; text-align: center;">No</th>
              <th style="width: 12%; text-align: center;">No. Induk</th>
              <th style="width: 22%; text-align: left;">Nama Santri</th>
              <th style="width: 12%; text-align: center;">Jumlah Setoran</th>
              <th style="width: 25%; text-align: left;">Setoran Awal Bulan</th>
              <th style="width: 25%; text-align: left;">Setoran Akhir Bulan</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml.length === 0 ? `<tr><td colspan="6" style="text-align:center; padding: 15px; color:#94a3b8;">Tidak ada data santri untuk filter ini.</td></tr>` : tableRowsHtml}
          </tbody>
        </table>
        <div class="footer-signature">
          <div class="sig-box">
            <div>Mengetahui,</div>
            <div style="font-weight: 700; margin-top: 4px;">Manager Pengajaran Team Qur'an</div>
            <div class="sig-line">Ust. M. Ridwan Sam, S.Pd, M.Pd.</div>
          </div>
          <div class="sig-box">
            <div>Sukoharjo, ${bulanName} 2026</div>
            <div style="font-weight: 700; margin-top: 4px;">Musyrif Pengampu</div>
            <div class="sig-line">${userNama}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 5000);
    }, 500);
  };

  const getNilaiBadgeClass = (val: NilaiEvaluasi) => {
    switch(val) {
      case 'A': return 'bg-emerald-100 text-emerald-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-amber-100 text-amber-900 border border-amber-200';
      case 'D': return 'bg-yellow-100 text-yellow-800';
      case 'E': return 'bg-rose-100 text-rose-800';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getNilaiLabel = (val: NilaiEvaluasi) => {
    switch(val) {
      case 'A': return 'Mumtaz (A)';
      case 'B': return 'Jayyid Jidid (B)';
      case 'C': return 'Jayyid (C)';
      case 'D': return 'Maqbul (D)';
      case 'E': return 'Rosib (E)';
      default: return val;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Musyrif Navigation */}
      <nav className="bg-emerald-800 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-emerald-500/50">
                <img src={logoMinSukoharjo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div>
                <span className="font-extrabold text-xs sm:text-sm tracking-wide leading-none block uppercase text-emerald-100">
                  PORTAL MUSYRIF
                </span>
                <span className="text-[11px] text-emerald-300 font-bold block mt-0.5" title="Logged in musyrif name">
                  Ustadz {userNama}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="musyrif-logout-btn"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-700/80 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs transition duration-150 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Core Section */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-6 pb-24 md:pb-8">
        
        {/* Left Control Sidebar */}
        <div className="w-full md:w-64 flex-none space-y-4">
          
          {/* Active Tab Buttons */}
          <div className="hidden md:block bg-white p-4 rounded-2xl border border-slate-150 shadow-sm space-y-1">
            <h4 className="text-[10px] font-bold text-slate-400 px-3 uppercase tracking-widest mb-2">MENU PERKEMBANGAN</h4>
            
            {[
              { id: 'absen_saya', label: 'Absen Saya', icon: UserCheck },
              { id: 'absen_siswa', label: 'Absen Siswa', icon: CheckCircle },
              { id: 'input_siswa', label: 'Input Harian Siswa', icon: BookOpen },
              ...(isMengajarLomba ? [{ id: 'halaqoh_lomba', label: 'Halaqoh Lomba', icon: Award }] : []),
              { id: 'rekap_hari', label: 'Rekap Harian', icon: Calendar },
              { id: 'rekap_bulan', label: 'Rekap Bulanan', icon: TrendingUp }
            ].map(tab => {
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setFeedback({ text: '', type: 'success' });
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-emerald-50 text-emerald-800 border-l-4 border-emerald-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComp className={`w-4 h-4 ${activeTab === tab.id ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-400 opacity-60" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Dashboard Body Panel */}
        <div className="flex-1 space-y-6">
          
          {feedback.text && (
            <div className={`p-4 rounded-xl text-xs font-semibold border ${
              feedback.type === 'success' ? 'bg-emerald-50 border-emerald-250 text-emerald-800' : 'bg-rose-50 border-rose-250 text-rose-800'
            }`}>
              {feedback.text}
            </div>
          )}

          {/* TAB: ABSEN SAYA */}
          {activeTab === 'absen_saya' && (
            <AbsenSayaView userId={userId} userNama={userNama} />
          )}

          {/* TAB: ABSEN SISWA */}
          {activeTab === 'absen_siswa' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    Absensi Kehadiran Santri (Absen Siswa)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kelola absensi harian santri untuk halaqoh aktif. Kehadiran ini otomatis memengaruhi rekap harian saat dishare.
                  </p>
                </div>
              </div>

              {/* Policy Info Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-900 text-xs leading-relaxed font-medium shadow-2xs">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-extrabold uppercase text-[10px] tracking-wider text-amber-800">
                    Kebijakan Absensi Harian Satu Akun Satu Kali
                  </p>
                  <p>
                    Sesuai ketentuan, <strong>1 santri/siswa hanya diabsen 1 kali dalam 1 hari</strong>. Jika santri sudah diabsen pada hari tersebut, mengganti halaqoh tidak akan menghapus status kehadiran mereka; data kehadiran akan tersinkronisasi dan dipertahankan secara otomatis untuk hari ini.
                  </p>
                </div>
              </div>

              {!selectedHalaqohId ? (
                <div className="text-center py-16 bg-white border border-slate-150 rounded-3xl shadow-xs max-w-xl mx-auto my-8 p-8 space-y-6">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-black text-slate-800">Halaqoh Belum Aktif</h3>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                      Silakan aktifkan halaqoh binaan Anda terlebih dahulu melalui menu popup untuk mulai mencatat absensi harian santri.
                    </p>
                  </div>
                  <button
                    onClick={handleOpenHalaqohModal}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md hover:shadow-lg flex items-center justify-center gap-2 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Aktifkan Halaqoh Sekarang</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Active Halaqoh Bar */}
                  <div className="bg-emerald-800 text-white p-5 rounded-2xl flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <BookMarked className="w-5 h-5 text-emerald-100" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest leading-none">HALAQOH AKTIF</div>
                        <div className="text-sm font-black mt-1">
                          {myHalaqohs.find(h => h.id === selectedHalaqohId)?.nama || 'Halaqoh Aktif'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleOpenHalaqohModal}
                      className="px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-extrabold rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Ganti Halaqoh</span>
                    </button>
                  </div>

                  {/* Date selection, search & bulk operations */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
                      <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4 flex-1">
                        {/* Date Picker */}
                        <div className="w-full sm:w-48 space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Absensi</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                              type="date"
                              value={absenSiswaTanggal}
                              onChange={(e) => setAbsenSiswaTanggal(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-600"
                            />
                          </div>
                        </div>

                        {/* Search Input */}
                        <div className="w-full flex-1 space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cari Santri</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Cari nama atau nomor induk..."
                              value={absenSiswaSearch}
                              onChange={(e) => {
                                setAbsenSiswaSearch(e.target.value);
                                setAbsenSiswaCurrentPage(1);
                              }}
                              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-600"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Dropdown Filter Kelas & Bulk Operations */}
                      <div className="w-full md:w-auto shrink-0 flex flex-wrap gap-2 items-end">
                        <div className="w-full sm:w-auto space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pilih / Filter Kelas</label>
                          <div className="flex items-center gap-1.5">
                            <select
                              value={absenSiswaKelasFilter}
                              onChange={(e) => {
                                setAbsenSiswaKelasFilter(e.target.value);
                                setAbsenSiswaCurrentPage(1);
                              }}
                              className="w-full sm:w-auto px-3.5 py-2 bg-slate-50 hover:bg-white text-slate-700 font-bold text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 transition shadow-2xs cursor-pointer min-w-40"
                            >
                              <option value="all">Semua Kelas</option>
                              {classes.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nama}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setClassSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                              className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer flex items-center justify-center shrink-0"
                              title={classSortOrder === 'asc' ? 'Urutan Kelas: Naik (1 → 6)' : 'Urutan Kelas: Turun (6 → 1)'}
                            >
                              <ArrowUpDown className="w-4 h-4 text-emerald-600" />
                            </button>
                          </div>
                        </div>
                        <div className="w-full sm:w-auto">
                          <label className="text-[10px] font-bold text-transparent uppercase tracking-wider hidden sm:block mb-1.5">Aksi</label>
                          <button
                            type="button"
                            disabled={isSaving || myStudents.length === 0}
                            onClick={handleMarkAllPresent}
                            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>Hadirkan Semua</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Statistics Cards */}
                    {(() => {
                      const list = myStudents;
                      const todaysAbsen = localStudentAttendances.filter(a => a.tanggal === absenSiswaTanggal);
                      
                      let countHadir = 0;
                      let countSakit = 0;
                      let countIzin = 0;
                      let countAlpa = 0;
                      let countBelum = 0;

                      list.forEach(s => {
                        const rec = todaysAbsen.find(a => String(a.siswaId) === String(s.id));
                        if (!rec) {
                          countBelum++;
                        } else if (rec.status === 'Hadir') {
                          countHadir++;
                        } else if (rec.status === 'Sakit') {
                          countSakit++;
                        } else if (rec.status === 'Izin') {
                          countIzin++;
                        } else if (rec.status === 'Alpa') {
                          countAlpa++;
                        }
                      });

                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                          <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl text-center">
                            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Hadir</div>
                            <div className="text-xl font-extrabold text-emerald-800 mt-1">{countHadir}</div>
                          </div>
                          <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-xl text-center">
                            <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Sakit</div>
                            <div className="text-xl font-extrabold text-amber-800 mt-1">{countSakit}</div>
                          </div>
                          <div className="bg-sky-50/50 border border-sky-100 p-3 rounded-xl text-center">
                            <div className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">Izin</div>
                            <div className="text-xl font-extrabold text-sky-800 mt-1">{countIzin}</div>
                          </div>
                          <div className="bg-rose-50/50 border border-rose-100 p-3 rounded-xl text-center">
                            <div className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Alpa</div>
                            <div className="text-xl font-extrabold text-rose-800 mt-1">{countAlpa}</div>
                          </div>
                          <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-xl text-center col-span-2 sm:col-span-1">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Belum Diabsen</div>
                            <div className="text-xl font-extrabold text-slate-700 mt-1">{countBelum}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Student List for Attendance */}
                  <div className="bg-white rounded-2xl border border-slate-150 shadow-xs overflow-hidden">
                    {(() => {
                      const filteredList = myStudents
                        .filter(s => {
                          if (absenSiswaKelasFilter !== 'all') {
                            if (s.kelasId !== absenSiswaKelasFilter && s.kelasNama !== absenSiswaKelasFilter) {
                              return false;
                            }
                          }
                          if (absenSiswaSearch.trim()) {
                            const term = absenSiswaSearch.toLowerCase();
                            return s.nama.toLowerCase().includes(term) ||
                                   (s.noInduk && s.noInduk.toLowerCase().includes(term)) ||
                                   (s.kelasNama && s.kelasNama.toLowerCase().includes(term));
                          }
                          return true;
                        })
                        .sort((a, b) => {
                          const classCompare = (a.kelasNama || '').localeCompare(b.kelasNama || '', 'id', { numeric: true, sensitivity: 'base' });
                          if (classCompare !== 0) {
                            return classSortOrder === 'asc' ? classCompare : -classCompare;
                          }
                          return (a.nama || '').localeCompare(b.nama || '', 'id');
                        });

                      const itemsPerPage = 20;
                      const totalSiswaItems = filteredList.length;
                      const totalSiswaPages = Math.ceil(totalSiswaItems / itemsPerPage) || 1;
                      const currentPage = Math.min(absenSiswaCurrentPage, totalSiswaPages);
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const paginatedList = filteredList.slice(startIndex, endIndex);

                      return (
                        <>
                          <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black text-slate-800 tracking-wider uppercase">Daftar Kehadiran Santri ({totalSiswaItems})</h4>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                              <span>Tampilan 20 Data per Halaman (Hal {currentPage}/{totalSiswaPages})</span>
                            </div>
                          </div>

                          {filteredList.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-xs">
                              {absenSiswaSearch.trim() || absenSiswaKelasFilter !== 'all'
                                ? 'Tidak ada santri yang cocok dengan kriteria filter/pencarian.'
                                : 'Halaqoh ini belum memiliki data santri.'}
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {paginatedList.map((siswa, idx) => {
                                const prevSiswa = idx > 0 ? paginatedList[idx - 1] : null;
                                const showClassHeader = !prevSiswa || prevSiswa.kelasNama !== siswa.kelasNama;
                                const attRecord = localStudentAttendances.find(a => String(a.siswaId) === String(siswa.id) && a.tanggal === absenSiswaTanggal);
                                const currentStatus = attRecord?.status || null;
                                const isUpdating = isUpdatingAttendance === siswa.id;

                                return (
                                  <React.Fragment key={siswa.id}>
                                    {showClassHeader && (
                                      <div className="bg-slate-100/90 px-5 py-2 border-y border-slate-200 text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                                          <span>Kelas: {siswa.kelasNama || 'Tanpa Kelas'}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500 font-mono">
                                          {filteredList.filter(s => (s.kelasNama || 'Tanpa Kelas') === (siswa.kelasNama || 'Tanpa Kelas')).length} Santri
                                        </span>
                                      </div>
                                    )}
                                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50/50 transition duration-150">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <h5 className="text-sm font-black text-slate-800 uppercase">{siswa.nama}</h5>
                                          {isUpdating && (
                                            <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                          )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 text-xs font-medium">
                                          <span>No Induk: <span className="font-bold font-mono text-slate-700">{siswa.noInduk || '-'}</span></span>
                                          <span className="text-slate-300">•</span>
                                          <span>Kelas: <span className="font-bold text-slate-700">{siswa.kelasNama || 'N/A'}</span></span>
                                        </div>
                                      </div>

                                      {/* Attendance Status Picker */}
                                      <div className="flex items-center gap-1.5 self-start sm:self-center">
                                        {[
                                          { status: 'Hadir', label: 'Hadir', color: 'bg-emerald-600 text-white border-emerald-600', inactiveColor: 'border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700' },
                                          { status: 'Sakit', label: 'Sakit', color: 'bg-amber-600 text-white border-amber-600', inactiveColor: 'border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700' },
                                          { status: 'Izin', label: 'Izin', color: 'bg-sky-600 text-white border-sky-600', inactiveColor: 'border-slate-200 text-slate-600 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-700' },
                                          { status: 'Alpa', label: 'Alpa', color: 'bg-rose-600 text-white border-rose-600', inactiveColor: 'border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700' }
                                        ].map((opt) => {
                                          const isSelected = currentStatus === opt.status;
                                          return (
                                            <button
                                              key={opt.status}
                                              type="button"
                                              disabled={isUpdating}
                                              onClick={() => handleUpdateStudentAttendance(siswa, opt.status as any)}
                                              className={`px-3 py-1.5 rounded-xl border text-[10px] font-black tracking-wider uppercase transition cursor-pointer ${
                                                isSelected ? opt.color : opt.inactiveColor
                                              }`}
                                            >
                                              {opt.label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          )}

                          {/* Pagination Footer */}
                          {totalSiswaItems > 0 && (
                            <div className="px-5 py-4 bg-slate-50 border-t border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                              <div className="text-slate-500 font-medium">
                                Menampilkan <span className="font-bold text-slate-800">{startIndex + 1}</span> - <span className="font-bold text-slate-800">{Math.min(endIndex, totalSiswaItems)}</span> dari <span className="font-bold text-slate-800">{totalSiswaItems}</span> Santri
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={currentPage <= 1}
                                  onClick={() => setAbsenSiswaCurrentPage(p => Math.max(1, p - 1))}
                                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                                >
                                  Sebelumnya
                                </button>
                                
                                <div className="flex items-center gap-1 px-2">
                                  {Array.from({ length: totalSiswaPages }, (_, i) => i + 1).map((pg) => {
                                    if (
                                      pg === 1 || 
                                      pg === totalSiswaPages || 
                                      (pg >= currentPage - 1 && pg <= currentPage + 1)
                                    ) {
                                      return (
                                        <button
                                          key={pg}
                                          type="button"
                                          onClick={() => setAbsenSiswaCurrentPage(pg)}
                                          className={`w-8 h-8 rounded-lg font-extrabold text-xs transition cursor-pointer ${
                                            currentPage === pg
                                              ? 'bg-emerald-600 text-white shadow-xs'
                                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                          }`}
                                        >
                                          {pg}
                                        </button>
                                      );
                                    } else if (
                                      (pg === 2 && currentPage > 3) ||
                                      (pg === totalSiswaPages - 1 && currentPage < totalSiswaPages - 2)
                                    ) {
                                      return <span key={pg} className="text-slate-400 font-bold px-0.5">...</span>;
                                    }
                                    return null;
                                  })}
                                </div>

                                <button
                                  type="button"
                                  disabled={currentPage >= totalSiswaPages}
                                  onClick={() => setAbsenSiswaCurrentPage(p => Math.min(totalSiswaPages, p + 1))}
                                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                                >
                                  Selanjutnya
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB: INPUT HARIAN */}
          {activeTab === 'input_siswa' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    Pencatatan Setoran Harian (Input Harian Siswa)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Aktifkan halaqoh terlebih dahulu, kemudian pilih kelas, program, dan cari nama santri secara langsung.
                  </p>
                </div>
              </div>

              {!selectedHalaqohId ? (
                <div className="text-center py-16 bg-white border border-slate-150 rounded-3xl shadow-xs max-w-xl mx-auto my-8 p-8 space-y-6">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-black text-slate-800">Halaqoh Belum Aktif</h3>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                      Silakan aktifkan halaqoh binaan Anda terlebih dahulu melalui menu popup untuk mulai mencatat setoran harian santri agar tidak terlalu membaca banyak data.
                    </p>
                  </div>
                  <button
                    onClick={handleOpenHalaqohModal}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md hover:shadow-lg flex items-center justify-center gap-2 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Aktifkan Halaqoh Sekarang</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Active Halaqoh Bar */}
                  <div className="bg-emerald-800 text-white p-5 rounded-2xl flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <BookMarked className="w-5 h-5 text-emerald-100" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest leading-none">HALAQOH AKTIF</div>
                        <div className="text-sm font-black mt-1">
                          {myHalaqohs.find(h => h.id === selectedHalaqohId)?.nama || 'Halaqoh Aktif'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleOpenHalaqohModal}
                      className="px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-extrabold rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Ganti Halaqoh</span>
                    </button>
                  </div>

                  {/* Filter Program & Kelas - Diluar border daftar murid */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-4 items-center w-full">
                    <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4 items-center flex-1">
                      {/* 1. Pilih Program */}
                      <div className="w-full sm:w-auto text-xs font-bold text-slate-600 shrink-0 uppercase tracking-wider flex items-center gap-1.5">
                        <Filter className="w-4 h-4 text-emerald-600" />
                        <span>1. Pilih Program :</span>
                      </div>
                      <select
                        value={selectedProgram}
                        onChange={(e) => {
                          const programVal = e.target.value as 'dasar' | 'tahfidz' | 'Kelas Lomba' | '';
                          setSelectedProgram(programVal);
                          setSelectedBulanSiswaId('');
                          setSelectedKelasId(''); // Reset kelas
                          setSearchSiswa(''); // Reset search
                        }}
                        className="w-full sm:w-48 px-4 py-2 bg-white border border-slate-200 text-xs rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-800 shadow-sm"
                      >
                        <option value="">-- Pilih Program --</option>
                        <option value="dasar">Program Dasar</option>
                        <option value="tahfidz">Program Tahfidz</option>
                        <option value="Kelas Lomba">Program Kelas Lomba</option>
                      </select>

                      {/* 2. Pilih Kelas (Hanya tampil setelah program dipilih) */}
                      {selectedProgram && (
                        <>
                          <div className="w-full sm:w-auto text-xs font-bold text-slate-600 shrink-0 uppercase tracking-wider flex items-center gap-1.5 sm:ml-4">
                            <Filter className="w-4 h-4 text-emerald-600" />
                            <span>2. Pilih Kelas :</span>
                          </div>
                          <select
                            value={selectedKelasId}
                            onChange={(e) => {
                              setSelectedKelasId(e.target.value);
                              setSelectedBulanSiswaId(''); // Reset selected student in reports
                            }}
                            className="w-full sm:w-48 px-4 py-2 bg-white border border-slate-200 text-xs rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-800 shadow-sm"
                          >
                            <option value="">-- Semua Kelas --</option>
                            {classes.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.nama}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>

                    {/* Pencarian Langsung - Tampil setelah program dipilih */}
                    {selectedProgram && (
                      <div className="w-full md:w-64 relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <Search className="w-4 h-4 text-slate-400" />
                        </span>
                        <input
                          type="text"
                          placeholder="Pencarian langsung (Nama/Induk)..."
                          value={searchSiswa}
                          onChange={(e) => setSearchSiswa(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 text-xs rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-800 placeholder-slate-400 shadow-sm"
                        />
                      </div>
                    )}
                  </div>

                  {/* Student Cards Grid for Laypeople & Mobile Friendliness - Wrapped in White Card Border */}
                  <div className="bg-white border border-slate-150 p-6 rounded-3xl shadow-xs">
                    {selectedProgram ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                            Daftar Murid {inputTabStudents.length > 0 ? `(${inputTabStudents.length} Anak)` : ''}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-semibold italic">Tampilan Mobile-Friendly Card</span>
                        </div>

                        {inputTabStudents.length === 0 ? (
                          <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                            {searchSiswa.trim() 
                              ? `Tidak ditemukan santri dengan nama atau nomor induk "${searchSiswa}".`
                              : "Tidak ada santri yang terdaftar dalam program/filter ini di Halaqoh terpilih."}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {inputTabStudents.map((siswa, sIndex) => {
                              // Find if there is a setoran entry today
                              const todayStr = new Date().toISOString().split('T')[0];
                              const logsHariIni = journals.filter(j => {
                                if (String(j.siswaId) !== String(siswa.id) || j.tanggal !== todayStr) return false;
                                if (selectedProgram === 'tahfidz') {
                                  return j.program === 'tahfidz' || (j.program !== 'dasar' && !!j.kategori);
                                } else {
                                  return j.program === 'dasar' || (j.program !== 'tahfidz' && !j.kategori);
                                }
                              });
                              const logHariIni = logsHariIni[0]; // for compatibility with 'dasar' program
                              const hasInputToday = selectedProgram === 'tahfidz' ? logsHariIni.length > 0 : !!logHariIni;

                              return (
                                <div 
                                  key={siswa.id} 
                                  className={`p-5 rounded-2xl border transition duration-150 flex flex-col justify-between space-y-4 ${
                                    hasInputToday 
                                      ? 'bg-emerald-50/50 border-emerald-150 shadow-xs' 
                                      : 'bg-white border-slate-150 hover:border-emerald-300 hover:shadow-xs'
                                  }`}
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <span className="text-[10px] font-mono font-bold text-slate-400">#{sIndex + 1} | INDUK: {siswa.noInduk}</span>
                                        <h5 className="font-extrabold text-sm text-slate-800 uppercase leading-snug mt-0.5">{siswa.nama}</h5>
                                        <div className="flex gap-1.5 mt-1">
                                          {siswa.isKelasDasar && (
                                            <span className="text-[9px] bg-sky-50 border border-sky-100 font-bold px-1.5 py-0.5 rounded text-sky-700">
                                              Dasar
                                            </span>
                                          )}
                                          {siswa.isKelasTahfidz && (
                                            <span className="text-[9px] bg-emerald-50 border border-emerald-100 font-bold px-1.5 py-0.5 rounded text-emerald-700">
                                              Tahfidz
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <span className="text-[10px] bg-slate-100 border border-slate-200 rounded-lg font-bold px-2 py-0.5 text-slate-600 block self-start">
                                        {siswa.kelasNama || 'N/A'}
                                      </span>
                                    </div>

                                    {selectedProgram === 'tahfidz' ? (
                                      logsHariIni.length > 0 ? (
                                        <div className="space-y-1.5 bg-white p-3 rounded-xl border border-emerald-100/50">
                                          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                                            Sudah Input Hari Ini:
                                          </div>
                                          <div className="space-y-1.5">
                                            {logsHariIni.map(log => (
                                              <div key={log.id} className="p-2 bg-slate-50/50 rounded-lg border border-slate-150 text-[11px] flex justify-between items-center gap-2">
                                                <div className="truncate flex-1">
                                                  <span className="font-extrabold text-[9px] text-emerald-800 bg-emerald-50 border border-emerald-150 px-1.5 py-0.5 rounded mr-1.5 uppercase">
                                                    {log.kategori || 'Setoran'}
                                                  </span>
                                                  <span className="font-bold text-slate-800">{log.materiSetoran}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                  <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-extrabold ${
                                                    log.nilai === 'A' ? 'bg-emerald-100 text-emerald-800' :
                                                    log.nilai === 'B' ? 'bg-indigo-100 text-indigo-800' :
                                                    log.nilai === 'C' ? 'bg-sky-100 text-sky-800' :
                                                    log.nilai === 'D' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                                  }`}>
                                                    {log.nilai}
                                                  </span>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteLog(log.id);
                                                    }}
                                                    className="text-slate-450 hover:text-rose-600 p-0.5 transition cursor-pointer"
                                                    title="Hapus"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : (() => {
                                        // Show overall latest log if any for Tahfidz
                                        const lastLog = journals
                                          .filter(j => j.siswaId === siswa.id && (j.program === 'tahfidz' || (j.program !== 'dasar' && !!j.kategori)))
                                          .sort((a, b) => b.tanggal.localeCompare(a.tanggal))[0];
                                        if (lastLog) {
                                          const parts = lastLog.tanggal.split('-');
                                          const formattedDate = parts.length === 3 
                                            ? `${parseInt(parts[2], 10)} ${['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][parseInt(parts[1], 10) - 1]} ${parts[0]}`
                                            : lastLog.tanggal;
                                          return (
                                            <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-xs space-y-1">
                                              <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                                                <span>Input Terakhir ({formattedDate})</span>
                                                <span className="bg-slate-100 text-slate-700 px-1.5 rounded text-[9px] font-black uppercase">{lastLog.kategori || 'Setoran'}</span>
                                              </div>
                                              <p className="font-bold text-slate-700">Materi: <span className="text-slate-950 font-extrabold">{lastLog.materiSetoran}</span></p>
                                            </div>
                                          );
                                        }
                                        return (
                                          <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 italic">
                                            Belum ada catatan setoran hari ini.
                                          </div>
                                        );
                                      })()
                                    ) : (
                                      // Program Dasar
                                      logHariIni ? (
                                        <div className="p-3 bg-white rounded-xl border border-emerald-100/50 text-xs text-emerald-950 space-y-1">
                                          <div className="flex items-center justify-between text-[10px] font-bold text-emerald-600 uppercase">
                                            <span>SUDAH SETORAN HARI INI</span>
                                            <span className="bg-emerald-200 text-emerald-800 px-1.5 rounded-sm">{logHariIni.nilai}</span>
                                          </div>
                                          <p className="line-clamp-1 font-semibold text-slate-700">Materi: {logHariIni.materiSetoran}</p>
                                          <p className="line-clamp-2 text-slate-500 leading-snug text-[11px]">Eval: {logHariIni.evaluasiTahsin}</p>
                                        </div>
                                      ) : (
                                        <>
                                          {(() => {
                                            const lastLog = journals
                                              .filter(j => j.siswaId === siswa.id && (j.program === 'dasar' || (j.program !== 'tahfidz' && !j.kategori)))
                                              .sort((a, b) => b.tanggal.localeCompare(a.tanggal))[0];
                                            if (lastLog) {
                                              const parts = lastLog.tanggal.split('-');
                                              const formattedDate = parts.length === 3 
                                                ? `${parseInt(parts[2], 10)} ${['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][parseInt(parts[1], 10) - 1]} ${parts[0]}`
                                                : lastLog.tanggal;
                                              return (
                                                <div className="p-3 bg-amber-50/40 border border-amber-200/60 rounded-xl text-xs space-y-1">
                                                  <div className="flex items-center justify-between text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">
                                                    <span>Setoran Terakhir ({formattedDate})</span>
                                                    <span className="bg-amber-100 text-amber-900 px-1.5 rounded text-[9px] font-black">{lastLog.nilai}</span>
                                                  </div>
                                                  <p className="font-bold text-slate-700">Materi: <span className="text-amber-950 font-extrabold">{lastLog.materiSetoran}</span></p>
                                                  <p className="text-slate-500 leading-relaxed text-[11px] italic">Eval: {lastLog.evaluasiTahsin}</p>
                                                </div>
                                              );
                                            }
                                            return null;
                                          })()}
                                          <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 italic">
                                            Belum ada setoran hari ini.
                                          </div>
                                        </>
                                      )
                                    )}
                                  </div>

                                  <div className="pt-2 flex gap-2">
                                    {selectedProgram === 'tahfidz' ? (
                                      (() => {
                                        const murojaahToday = logsHariIni.find(j => j.kategori === 'Murojaah');
                                        const ziyadahToday = logsHariIni.find(j => j.kategori === 'Ziyadah');
                                        const setoranTodayFiltered = logsHariIni.find(j => j.kategori === 'Setoran' || !j.kategori);
                                        const tugasTilawahToday = logsHariIni.find(j => j.kategori === 'Tugas Tilawah');

                                        return (
                                          <div className="grid grid-cols-2 gap-2 w-full pt-1">
                                            <button
                                              onClick={() => handleOpenInputForm(siswa, 'Murojaah', murojaahToday)}
                                              className={`py-2 px-1 border text-center rounded-xl transition duration-150 cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                                                murojaahToday 
                                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-750 hover:bg-indigo-100' 
                                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                              }`}
                                            >
                                              <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Murojaah</span>
                                              <span className="font-extrabold text-[11px]">{murojaahToday ? '✓ Edit' : '+ Input'}</span>
                                            </button>

                                            <button
                                              onClick={() => handleOpenInputForm(siswa, 'Ziyadah', ziyadahToday)}
                                              className={`py-2 px-1 border text-center rounded-xl transition duration-150 cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                                                ziyadahToday 
                                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100' 
                                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                              }`}
                                            >
                                              <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Ziyadah</span>
                                              <span className="font-extrabold text-[11px]">{ziyadahToday ? '✓ Edit' : '+ Input'}</span>
                                            </button>

                                            <button
                                              onClick={() => handleOpenInputForm(siswa, 'Setoran', setoranTodayFiltered)}
                                              className={`py-2 px-1 border text-center rounded-xl transition duration-150 cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                                                setoranTodayFiltered 
                                                  ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100' 
                                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                              }`}
                                            >
                                              <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Setoran</span>
                                              <span className="font-extrabold text-[11px]">{setoranTodayFiltered ? '✓ Edit' : '+ Input'}</span>
                                            </button>

                                            <button
                                              onClick={() => handleOpenInputForm(siswa, 'Tugas Tilawah', tugasTilawahToday)}
                                              className={`py-2 px-1 border text-center rounded-xl transition duration-150 cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                                                tugasTilawahToday 
                                                  ? 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100' 
                                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                              }`}
                                            >
                                              <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Tilawah</span>
                                              <span className="font-extrabold text-[11px]">{tugasTilawahToday ? '✓ Edit' : '+ Input'}</span>
                                            </button>
                                          </div>
                                        );
                                      })()
                                    ) : (
                                      // Program Dasar
                                      logHariIni ? (
                                        <div className="flex gap-2 w-full">
                                          <button
                                            onClick={() => handleOpenInputForm(siswa, undefined, logHariIni)}
                                            className="flex-1 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold rounded-xl transition cursor-pointer text-center"
                                          >
                                            Edit Catatan
                                          </button>
                                          <button
                                            onClick={() => handleDeleteLog(logHariIni.id)}
                                            className="px-3 py-2 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-xs font-bold rounded-xl transition cursor-pointer text-center"
                                            title="Hapus setoran"
                                          >
                                            Hapus
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => handleOpenInputForm(siswa)}
                                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs hover:shadow-md hover:shadow-emerald-100 flex items-center justify-center gap-1"
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                          <span>Input Setoran Harian</span>
                                        </button>
                                      )
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-slate-400 text-xs">
                        Silakan pilih Program di atas terlebih dahulu untuk memunculkan data siswa.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB: HALAQOH LOMBA */}
          {activeTab === 'halaqoh_lomba' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-amber-100 pb-4 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-800">
                      Halaqoh Lomba
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                      <Award className="w-3 h-3 text-amber-600" />
                      <span>Kelas Lomba</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pencatatan setoran & rekap santri terpilih yang masuk dalam kategori Kelas Lomba.
                  </p>
                </div>
              </div>

              {/* Stat Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase text-amber-700 tracking-wider">Total Santri Lomba</div>
                    <div className="text-lg font-black text-amber-900">{students.filter(s => s.isKelasLomba === true).length} Anak</div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase text-emerald-700 tracking-wider">Setoran Lomba Hari Ini</div>
                    <div className="text-lg font-black text-emerald-900">
                      {journals.filter(j => j.tanggal === new Date().toISOString().split('T')[0] && j.program === 'Kelas Lomba').length} Setoran
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-sky-50/60 border border-sky-200/80 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-black shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase text-sky-700 tracking-wider">Total Rekomendasi Lomba</div>
                    <div className="text-lg font-black text-sky-900">
                      {journals.filter(j => j.program === 'Kelas Lomba').length} Catatan
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter Controls */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3 items-center w-full md:w-auto">
                  <div className="text-xs font-bold text-slate-600 shrink-0 uppercase tracking-wider flex items-center gap-1.5">
                    <Filter className="w-4 h-4 text-amber-600" />
                    <span>Pilih Kelas :</span>
                  </div>
                  <select
                    value={selectedKelasId}
                    onChange={(e) => setSelectedKelasId(e.target.value)}
                    className="w-full sm:w-48 px-4 py-2 bg-white border border-slate-200 text-xs rounded-xl focus:ring-2 focus:ring-amber-500 font-bold text-slate-800 shadow-xs"
                  >
                    <option value="">-- Semua Kelas --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.nama}</option>
                    ))}
                  </select>
                </div>

                <div className="w-full md:w-64 relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="w-4 h-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    placeholder="Cari santri kelas lomba..."
                    value={searchSiswa}
                    onChange={(e) => setSearchSiswa(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 text-xs rounded-xl focus:ring-2 focus:ring-amber-500 font-bold text-slate-800 placeholder-slate-400 shadow-xs"
                  />
                </div>
              </div>

              {/* Student Cards for Kelas Lomba */}
              <div className="bg-white border border-amber-100 p-6 rounded-3xl shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span>Daftar Santri Kelas Lomba ({students.filter(s => s.isKelasLomba === true && (!selectedKelasId || String(s.kelasId) === String(selectedKelasId) || s.kelasNama === selectedKelasId) && (!searchSiswa.trim() || s.nama.toLowerCase().includes(searchSiswa.toLowerCase()) || (s.noInduk && s.noInduk.toLowerCase().includes(searchSiswa.toLowerCase())))).length} Anak)</span>
                  </h4>
                </div>

                {(() => {
                  const lombaList = students.filter(s => {
                    if (s.isKelasLomba !== true) return false;
                    if (selectedKelasId && String(s.kelasId) !== String(selectedKelasId) && s.kelasNama !== selectedKelasId) return false;
                    if (searchSiswa.trim()) {
                      const term = searchSiswa.toLowerCase();
                      if (!(s.nama.toLowerCase().includes(term) || (s.noInduk && s.noInduk.toLowerCase().includes(term)) || (s.kelasNama && s.kelasNama.toLowerCase().includes(term)))) {
                        return false;
                      }
                    }
                    return true;
                  });

                  if (lombaList.length === 0) {
                    return (
                      <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl space-y-2">
                        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto opacity-60" />
                        <p className="font-semibold text-slate-600">Tidak ada santri kelas lomba ditemukan.</p>
                        <p className="text-[11px] text-slate-400">
                          Pastikan siswa sudah ditandai sebagai <span className="font-bold">Kelas Lomba</span> oleh Admin di menu Kelola Siswa.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {lombaList.map((siswa, sIndex) => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const lombaLogsHariIni = journals.filter(j => 
                          String(j.siswaId) === String(siswa.id) && 
                          j.tanggal === todayStr && 
                          j.program === 'Kelas Lomba'
                        );
                        const hasLombaInputToday = lombaLogsHariIni.length > 0;

                        const lombaHistory = journals.filter(j => 
                          String(j.siswaId) === String(siswa.id) && 
                          j.program === 'Kelas Lomba'
                        ).sort((a, b) => b.tanggal.localeCompare(a.tanggal));

                        return (
                          <div 
                            key={siswa.id} 
                            className={`p-5 rounded-2xl border transition duration-150 flex flex-col justify-between space-y-4 ${
                              hasLombaInputToday 
                                ? 'bg-amber-50/40 border-amber-200 shadow-xs' 
                                : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs'
                            }`}
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="text-[10px] font-mono font-bold text-slate-400">#{sIndex + 1} | INDUK: {siswa.noInduk}</span>
                                  <h5 className="font-extrabold text-sm text-slate-800 uppercase leading-snug mt-0.5">{siswa.nama}</h5>
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    <span className="text-[9px] bg-amber-100 border border-amber-300 font-extrabold px-1.5 py-0.5 rounded text-amber-900 flex items-center gap-1">
                                      <Award className="w-2.5 h-2.5 text-amber-700" />
                                      <span>Kelas Lomba</span>
                                    </span>
                                    {siswa.halaqohNama && (
                                      <span className="text-[9px] bg-slate-100 border border-slate-200 font-bold px-1.5 py-0.5 rounded text-slate-700">
                                        {siswa.halaqohNama}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className="text-[10px] bg-slate-100 border border-slate-200 rounded-lg font-bold px-2 py-0.5 text-slate-600 block self-start">
                                  {siswa.kelasNama || 'N/A'}
                                </span>
                              </div>

                              {/* Today / Latest Setoran Lomba Display */}
                              {lombaLogsHariIni.length > 0 ? (
                                <div className="space-y-1.5 bg-white p-3 rounded-xl border border-amber-200">
                                  <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center justify-between">
                                    <span>Sudah Input Setoran Lomba Hari Ini:</span>
                                    <span className="text-[9px] font-extrabold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">✓ Terdata</span>
                                  </div>
                                  {lombaLogsHariIni.map(log => (
                                    <div key={log.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px] flex justify-between items-center gap-2">
                                      <div className="truncate flex-1">
                                        <span className="font-bold text-slate-900 block">{log.materiSetoran}</span>
                                        {log.evaluasiTahsin && (
                                          <span className="text-[10px] text-slate-500 italic block truncate">{log.evaluasiTahsin}</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${getNilaiBadgeClass(log.nilai)}`}>
                                          {log.nilai}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteLog(log.id);
                                          }}
                                          className="text-slate-400 hover:text-rose-600 p-0.5 transition cursor-pointer"
                                          title="Hapus"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                lombaHistory.length > 0 ? (
                                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                                    <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                                      <span>Setoran Lomba Terakhir</span>
                                      <span className="font-mono text-slate-600">{lombaHistory[0].tanggal}</span>
                                    </div>
                                    <p className="font-bold text-slate-800">Materi: <span className="text-slate-950 font-black">{lombaHistory[0].materiSetoran}</span></p>
                                    <p className="text-[10px] text-slate-500 italic">Evaluasi: {lombaHistory[0].evaluasiTahsin || '-'}</p>
                                  </div>
                                ) : (
                                  <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 italic">
                                    Belum ada catatan setoran lomba.
                                  </div>
                                )
                              )}
                            </div>

                            <div className="pt-2">
                              <button
                                onClick={() => {
                                  setTargetSiswa(siswa);
                                  setSelectedProgram('Kelas Lomba');
                                  setSelectedKategori('Setoran');
                                  const existingToday = lombaLogsHariIni[0];
                                  if (existingToday) {
                                    setFormTanggal(existingToday.tanggal);
                                    setFormMateri(existingToday.materiSetoran);
                                    setFormEvaluasi(existingToday.evaluasiTahsin);
                                    setFormNilai(existingToday.nilai);
                                    setEditingJournalId(existingToday.id);
                                  } else {
                                    setFormTanggal(new Date().toISOString().split('T')[0]);
                                    setFormMateri('');
                                    setFormEvaluasi('');
                                    setFormNilai('A');
                                    setEditingJournalId(null);
                                  }
                                  setShowInputModal(true);
                                }}
                                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold rounded-xl transition cursor-pointer shadow-xs hover:shadow-md flex items-center justify-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{hasLombaInputToday ? 'Edit Setoran Lomba' : 'Catat Setoran Lomba'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB: REKAP HARIAN */}
          {activeTab === 'rekap_hari' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-800">Rekap Harian Halaqoh</h3>
                <p className="text-xs text-slate-500">Melihat seluruh setoran santri di dalam satu halaqoh pada tanggal tertentu</p>
              </div>

              {/* Day filters - Diluar atas border daftar murid */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">1. Pilih Kelas :</label>
                  <select
                    value={selectedKelasId}
                    onChange={(e) => setSelectedKelasId(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-250 text-xs rounded-xl focus:outline-none font-bold text-slate-800"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.nama}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">2. Pilih Program :</label>
                  <select
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value as any)}
                    className="w-full px-4 py-2 bg-white border border-slate-250 text-xs rounded-xl focus:outline-none font-bold text-slate-800"
                  >
                    <option value="">-- Pilih Program --</option>
                    <option value="dasar">Program Dasar</option>
                    <option value="tahfidz">Program Tahfidz</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">3. Pilih Tanggal :</label>
                  <input
                    type="date"
                    value={rekapHariTanggal}
                    onChange={(e) => setRekapHariTanggal(e.target.value)}
                    className="w-full px-4 py-1.5 bg-white border border-slate-250 text-xs rounded-xl focus:outline-none font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div className="bg-white border border-slate-150 p-6 rounded-3xl shadow-xs">
                {selectedKelasId && selectedProgram ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-emerald-900 uppercase">Rekap Hasil Setoran Santri</h4>
                        <div className="text-emerald-700 text-xs mt-0.5">
                          Kelas: <strong>{classes.find(c => c.id === selectedKelasId)?.nama}</strong> | Program: <strong>{selectedProgram === 'dasar' ? 'Dasar' : 'Tahfidz'}</strong> | Tanggal: <strong>{rekapHariTanggal}</strong>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                        <div className="text-xs font-bold text-emerald-900">
                          Total Diinput: <strong>{new Set(dailyRecapLogs.map(l => l.siswaId)).size} dari {selectBulanStudents.length} Siswa</strong> ({dailyRecapLogs.length} Input)
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button
                            id="btn-share-wa"
                            onClick={handleShareWA}
                            disabled={selectBulanStudents.length === 0}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none text-white font-extrabold text-xs rounded-xl transition shadow-xs cursor-pointer"
                            title="Bagikan Laporan ke WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Kirim ke WA</span>
                          </button>
                          <button
                            id="btn-print-pdf"
                            onClick={handleCetakPDF}
                            disabled={selectBulanStudents.length === 0}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none text-white font-extrabold text-xs rounded-xl transition shadow-xs cursor-pointer"
                            title="Cetak/Simpan PDF Laporan"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak PDF</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider">
                            <th className="py-3 px-4 w-12">NO</th>
                            <th className="py-3 px-4 w-24">NO INDUK</th>
                            <th className="py-3 px-4 w-44">NAMA SISWA</th>
                            <th className="py-3 px-4">MATERI SETORAN (SURAT/AYAT)</th>
                            <th className="py-3 px-4">EVALUASI TAHSIN & TAJWID</th>
                            <th className="py-3 px-4 text-center w-28">NILAI</th>
                            <th className="py-3 px-4 text-right w-16">AKSI</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 text-[11.5px] text-slate-700">
                          {selectBulanStudents.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-slate-400 font-medium italic">
                                Tidak ada siswa terdaftar pada kelas dan program ini.
                              </td>
                            </tr>
                          ) : (
                            selectBulanStudents.map((siswa, index) => {
                              const studentLogs = dailyRecapLogs.filter(j => String(j.siswaId) === String(siswa.id));
                              const categoryOrderMap: Record<string, number> = {
                                'Murojaah': 1,
                                'Ziyadah': 2,
                                'Setoran': 3,
                                'Tugas Tilawah': 4
                              };

                              if (studentLogs.length > 0) {
                                const sortedLogs = [...studentLogs].sort((a, b) => {
                                  const orderA = a.kategori ? (categoryOrderMap[a.kategori] || 99) : 99;
                                  const orderB = b.kategori ? (categoryOrderMap[b.kategori] || 99) : 99;
                                  return orderA - orderB;
                                });

                                return (
                                  <tr key={siswa.id} className="hover:bg-slate-50/40">
                                    <td className="py-3.5 px-4 font-mono font-bold text-slate-400 align-top">{index + 1}</td>
                                    <td className="py-3.5 px-4 font-mono align-top text-slate-600">{siswa.noInduk || '-'}</td>
                                    <td className="py-3.5 px-4 align-top">
                                      <div className="font-bold text-slate-900 uppercase">{siswa.nama}</div>
                                      <span className="text-[10px] text-emerald-700 font-semibold">{studentLogs.length} Input Setoran</span>
                                    </td>
                                    <td className="py-3.5 px-4 align-top">
                                      <div className="space-y-2">
                                        {sortedLogs.map((log, lIdx) => (
                                          <div key={log.id} className={`pb-1.5 ${lIdx < sortedLogs.length - 1 ? 'border-b border-slate-150/70' : ''}`}>
                                            {log.kategori && (
                                              <span className="inline-block text-[9px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded-md mr-1.5 shadow-2xs">
                                                {log.kategori}
                                              </span>
                                            )}
                                            <span className="font-bold text-emerald-950">{log.materiSetoran}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-4 align-top">
                                      <div className="space-y-2">
                                        {sortedLogs.map((log, lIdx) => (
                                          <div key={log.id} className={`pb-1.5 text-slate-500 italic ${lIdx < sortedLogs.length - 1 ? 'border-b border-slate-150/70' : ''}`}>
                                            {log.evaluasiTahsin || '-'}
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-4 align-top text-center">
                                      <div className="space-y-2">
                                        {sortedLogs.map((log, lIdx) => (
                                          <div key={log.id} className={`pb-1.5 ${lIdx < sortedLogs.length - 1 ? 'border-b border-slate-150/70' : ''}`}>
                                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${getNilaiBadgeClass(log.nilai)}`}>
                                              {getNilaiLabel(log.nilai)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-4 align-top text-right">
                                      <div className="space-y-2">
                                        {sortedLogs.map((log, lIdx) => (
                                          <div key={log.id} className={`pb-1.5 ${lIdx < sortedLogs.length - 1 ? 'border-b border-slate-150/70' : ''}`}>
                                            <button
                                              onClick={() => handleDeleteLog(log.id)}
                                              className="text-rose-600 hover:text-rose-800 p-1 bg-rose-50 hover:bg-rose-100 rounded-md cursor-pointer transition inline-flex items-center gap-1 text-[10px] font-bold"
                                              title={`Hapus ${log.kategori || 'setoran'}`}
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              } else {
                                const att = localStudentAttendances.find(a => String(a.siswaId) === String(siswa.id) && a.tanggal === rekapHariTanggal);
                                const attStatus = att ? att.status : 'Belum Absen';
                                const displayStatus = attStatus === 'Hadir' ? 'Hadir (Belum Setoran)' : attStatus;
                                const isAbsent = attStatus !== 'Hadir';

                                return (
                                  <tr key={siswa.id} className={isAbsent ? 'bg-rose-50/30 text-rose-900' : 'bg-emerald-50/20 text-emerald-900'}>
                                    <td className="py-3.5 px-4 font-mono font-bold text-slate-400">{index + 1}</td>
                                    <td className="py-3.5 px-4 font-mono text-slate-500">{siswa.noInduk || '-'}</td>
                                    <td className="py-3.5 px-4 font-bold text-slate-900 uppercase">{siswa.nama}</td>
                                    <td colSpan={4} className="py-3.5 px-4 italic font-semibold text-slate-500">
                                      {displayStatus}
                                    </td>
                                  </tr>
                                );
                              }
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                    Silahkan pilih Kelas dan Program terlebih dahulu di atas.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: REKAP BULANAN */}
          {activeTab === 'rekap_bulan' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-800">Laporan Rekap Bulanan Siswa</h3>
                <p className="text-xs text-slate-500">Melihat performa, rekap setoran per kelas (jumlah setoran, setoran awal & setoran akhir bulan), serta detail riwayat harian per santri</p>
              </div>

              {/* Filters Block */}
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase">1. Pilih Kelas :</label>
                  <select
                    value={selectedKelasId}
                    onChange={(e) => {
                      setSelectedKelasId(e.target.value);
                      setSelectedBulanSiswaId(''); // Reset selected student
                    }}
                    className="w-full px-4 py-2 bg-white border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                  >
                    <option value="">-- Semua Kelas --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.nama}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase">2. Pilih Program :</label>
                  <select
                    value={selectedProgram}
                    onChange={(e) => {
                      setSelectedProgram(e.target.value as any);
                      setSelectedBulanSiswaId(''); // Reset selected student
                    }}
                    className="w-full px-4 py-2 bg-white border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                  >
                    <option value="">-- Pilih Program --</option>
                    <option value="dasar">Program Dasar</option>
                    <option value="tahfidz">Program Tahfidz</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase">3. Pilih Santri (Opsional) :</label>
                  <select
                    value={selectedBulanSiswaId}
                    onChange={(e) => setSelectedBulanSiswaId(e.target.value)}
                    disabled={selectBulanStudents.length === 0 || !selectedProgram}
                    className="w-full px-4 py-2 bg-white border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 font-bold text-slate-800"
                  >
                    <option value="">-- Rekapan Per Kelas (Semua Santri) --</option>
                    {selectBulanStudents.map(s => (
                      <option key={s.id} value={s.id}>{s.nama} ({s.noInduk})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase">4. Pilih Bulan :</label>
                  <select
                    value={selectedBulanMonth}
                    onChange={(e) => setSelectedBulanMonth(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                  >
                    <option value="01">Januari (2026)</option>
                    <option value="02">Februari (2026)</option>
                    <option value="03">Maret (2026)</option>
                    <option value="04">April (2026)</option>
                    <option value="05">Mei (2026)</option>
                    <option value="06">Juni (2026)</option>
                    <option value="07">Juli (2026)</option>
                    <option value="08">Agustus (2026)</option>
                    <option value="09">September (2026)</option>
                    <option value="10">Oktober (2026)</option>
                    <option value="11">November (2026)</option>
                    <option value="12">Desember (2026)</option>
                  </select>
                </div>
              </div>

              <div className="bg-white border border-slate-150 p-6 rounded-3xl shadow-xs">
                {!selectedProgram ? (
                  <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-slate-400 text-xs">
                    Silahkan pilih Program (Dasar / Tahfidz) dan Bulan di atas untuk memuat laporan bulanan.
                  </div>
                ) : selectedBulanSiswaId ? (
                  /* INDIVIDUAL STUDENT DETAIL VIEW */
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <button
                        onClick={() => setSelectedBulanSiswaId('')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Kembali ke Rekapan Bulanan Per Kelas</span>
                      </button>

                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-800 uppercase">
                          {selectBulanStudents.find(s => String(s.id) === String(selectedBulanSiswaId))?.nama}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          NIS: {selectBulanStudents.find(s => String(s.id) === String(selectedBulanSiswaId))?.noInduk || '-'}
                        </div>
                      </div>
                    </div>

                    {/* Monthly Summary Statistics Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
                        <div className="text-[10px] font-bold text-emerald-600 uppercase">Jumlah Setoran</div>
                        <div className="text-2xl font-black text-emerald-900 mt-1">{studentMonthlyLogs.length} Kali</div>
                      </div>

                      <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
                        <div className="text-[10px] font-bold text-indigo-600 uppercase">Perolehan Mumtaz (A)</div>
                        <div className="text-2xl font-black text-indigo-900 mt-1">
                          {studentMonthlyLogs.filter(j => j.nilai === 'A').length} Kali
                        </div>
                      </div>

                      <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl">
                        <div className="text-[10px] font-bold text-sky-600 uppercase">Jayyid Jidid (B)</div>
                        <div className="text-xl font-bold text-sky-900 mt-1">
                          {studentMonthlyLogs.filter(j => j.nilai === 'B').length} Kali
                        </div>
                      </div>

                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                        <div className="text-[10px] font-bold text-amber-600 uppercase">Nilai Lain (C/D/E)</div>
                        <div className="text-xl font-bold text-amber-900 mt-1">
                          {studentMonthlyLogs.filter(j => ['C','D','E'].includes(j.nilai)).length} Kali
                        </div>
                      </div>
                    </div>

                    {/* Monthly Chronology Logs table/timeline */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">
                          Detail Jurnal Bulanan Siswa
                        </h4>
                        <button
                          id="btn-print-monthly"
                          onClick={handleCetakPDFBulanan}
                          disabled={studentMonthlyLogs.length === 0}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none text-white font-extrabold text-xs rounded-xl transition shadow-xs cursor-pointer"
                          title="Cetak Rekap Bulanan ke PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak PDF Santri</span>
                        </button>
                      </div>

                      {studentMonthlyLogs.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                          Tidak ada laporan setoran siswa ini untuk bulan terpilih.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {studentMonthlyLogs.map((log) => (
                            <div key={log.id} className="p-4 bg-white border border-slate-150 rounded-2xl shadow-xs space-y-2">
                              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                <span className="text-[11px] font-mono font-bold text-slate-500">
                                  📅 {log.tanggal}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${getNilaiBadgeClass(log.nilai)}`}>
                                  {getNilaiLabel(log.nilai)}
                                </span>
                              </div>
                              <div className="text-xs space-y-1">
                                <p className="font-bold text-slate-800">
                                  📖 Materi: <span className="text-emerald-800">{log.materiSetoran}</span>
                                </p>
                                {!(log.program === 'tahfidz' || (log.program !== 'dasar' && !!log.kategori)) && (
                                  <p className="text-slate-500 italic leading-snug">
                                    🔍 Evaluasi: {log.evaluasiTahsin}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* CLASS MONTHLY RECAP TABLE (REKAPAN BULANAN PER KELAS) */
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <h4 className="text-base font-black text-slate-800 flex items-center gap-2">
                          <Users className="w-5 h-5 text-emerald-600" />
                          <span>Rekapan Bulanan Per Kelas</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          Menampilkan rekapitulasi jumlah setoran, setoran awal bulan, dan setoran akhir bulan seluruh santri.
                        </p>
                      </div>

                      <button
                        onClick={handleCetakPDFBulananKelas}
                        disabled={classMonthlyRecap.length === 0}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer self-start sm:self-auto"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Cetak PDF Rekap Kelas</span>
                      </button>
                    </div>

                    {/* Quick Stats for the whole class */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Total Santri</div>
                          <div className="text-2xl font-black text-emerald-950 mt-0.5">{classMonthlyRecap.length} Orang</div>
                        </div>
                        <Users className="w-8 h-8 text-emerald-400 opacity-60" />
                      </div>

                      <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Total Setoran Kelas</div>
                          <div className="text-2xl font-black text-indigo-950 mt-0.5">
                            {classMonthlyRecap.reduce((a, c) => a + c.totalSetoran, 0)} Kali
                          </div>
                        </div>
                        <BookMarked className="w-8 h-8 text-indigo-400 opacity-60" />
                      </div>

                      <div className="p-4 bg-sky-50/60 border border-sky-100 rounded-2xl flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">Santri Aktif Setoran</div>
                          <div className="text-2xl font-black text-sky-950 mt-0.5">
                            {classMonthlyRecap.filter(c => c.totalSetoran > 0).length} Orang
                          </div>
                        </div>
                        <TrendingUp className="w-8 h-8 text-sky-400 opacity-60" />
                      </div>
                    </div>

                    {/* CLASS MONTHLY RECAP TABLE */}
                    {classMonthlyRecap.length === 0 ? (
                      <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                        Tidak ada data santri ditemukan pada kelas dan program ini.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100/80 text-slate-700 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-200">
                              <th className="py-3 px-3.5 text-center w-12">No</th>
                              <th className="py-3 px-3.5 text-center w-24">No. Induk</th>
                              <th className="py-3 px-4 min-w-[160px]">Nama Santri</th>
                              <th className="py-3 px-3.5 text-center min-w-[110px]">Jumlah Setoran</th>
                              <th className="py-3 px-4 min-w-[220px]">Setoran Awal Bulan</th>
                              <th className="py-3 px-4 min-w-[220px]">Setoran Akhir Bulan</th>
                              <th className="py-3 px-3.5 text-center w-20">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150 bg-white">
                            {classMonthlyRecap.map((item, index) => (
                              <tr key={item.siswa.id} className="hover:bg-slate-50/80 transition">
                                <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-400">
                                  {index + 1}
                                </td>
                                <td className="py-3 px-3.5 text-center font-mono text-slate-500 font-semibold">
                                  {item.siswa.noInduk || '-'}
                                </td>
                                <td className="py-3 px-4 font-bold text-slate-900 uppercase">
                                  {item.siswa.nama}
                                </td>
                                <td className="py-3 px-3.5 text-center">
                                  <span className={`inline-block px-2.5 py-1 rounded-lg font-black text-xs ${
                                    item.totalSetoran > 0 
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                      : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    {item.totalSetoran} Kali
                                  </span>
                                </td>
                                <td className="py-3 px-4 align-top">
                                  {item.setoranAwal ? (
                                    <div className="space-y-1">
                                      <div className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                        📅 {item.setoranAwal.tanggal.split('-').reverse().join('/')}
                                      </div>
                                      <div className="font-bold text-slate-800 text-xs">
                                        {item.setoranAwal.kategori && (
                                          <span className="text-[10px] font-extrabold uppercase text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded mr-1">
                                            {item.setoranAwal.kategori}
                                          </span>
                                        )}
                                        {item.setoranAwal.materiSetoran}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">- Belum ada -</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 align-top">
                                  {item.setoranAkhir ? (
                                    <div className="space-y-1">
                                      <div className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                        📅 {item.setoranAkhir.tanggal.split('-').reverse().join('/')}
                                      </div>
                                      <div className="font-bold text-slate-800 text-xs">
                                        {item.setoranAkhir.kategori && (
                                          <span className="text-[10px] font-extrabold uppercase text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded mr-1">
                                            {item.setoranAkhir.kategori}
                                          </span>
                                        )}
                                        {item.setoranAkhir.materiSetoran}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">- Belum ada -</span>
                                  )}
                                </td>
                                <td className="py-3 px-3.5 text-center">
                                  <button
                                    onClick={() => setSelectedBulanSiswaId(item.siswa.id)}
                                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold text-xs inline-flex items-center gap-1 transition cursor-pointer"
                                    title="Lihat Detail Riwayat Santri"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span className="hidden lg:inline text-[10px]">Detail</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* HALAQOH ACTIVATION DIALOG MODAL */}
      {showHalaqohActivationModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-slate-100 transform transition-all p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center mx-auto border border-emerald-100">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-800">
                Pilih Halaqoh yang Ingin Diaktifkan
              </h3>
              <p className="text-xs text-slate-500">
                Silakan pilih halaqoh yang akan Anda input hari ini agar tidak terlalu membaca banyak data santri.
              </p>
            </div>

            <div className="space-y-3">
              {myHalaqohs.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl">
                  Anda tidak memiliki halaqoh yang terdaftar atas nama Anda.
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Daftar Halaqoh Binaan
                  </label>
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                    {myHalaqohs.map(h => {
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => setTempHalaqohId(h.id)}
                          className={`w-full text-left p-3.5 rounded-xl border-2 text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                            tempHalaqohId === h.id
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                              : 'border-slate-100 bg-slate-50 text-slate-700 hover:border-slate-200 hover:bg-slate-100/50'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div>{h.nama}</div>
                            <div className="text-[10px] font-medium text-slate-400">Musyrif: {h.musyrifNama || userNama}</div>
                          </div>
                          {tempHalaqohId === h.id && (
                            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowHalaqohActivationModal(false);
                }}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!tempHalaqohId}
                onClick={() => {
                  setSelectedHalaqohId(tempHalaqohId);
                  setShowHalaqohActivationModal(false);
                  showFeedback(`Halaqoh "${myHalaqohs.find(h => h.id === tempHalaqohId)?.nama}" berhasil diaktifkan!`);
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer text-center"
              >
                Aktifkan Halaqoh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTOMATIC ATTENDANCE DIALOG MODAL */}
      {showAutoAbsenModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-slate-100 transform transition-all p-6 space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-800">
                Kehadiran Harian Musyrif
              </h3>
              <p className="text-xs text-slate-500">
                Assalamu'alaikum {userNama}, silakan lakukan absensi kehadiran hari ini dengan mengambil foto selfie.
              </p>
            </div>

            {isAutoSaving ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                <p className="text-xs font-bold text-slate-600">Menyimpan Kehadiran...</p>
              </div>
            ) : (
              <AbsenCamera
                onCapture={handleAutoCapture}
                onCancel={() => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  sessionStorage.setItem(`dismissed_absen_${userId}_${todayStr}`, 'true');
                  setShowAutoAbsenModal(false);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* INPUT / EDIT SETORAN HARIAN DIALOG MODAL */}
      {showInputModal && targetSiswa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col">
            
            <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wide">
                  {editingJournalId ? `Edit Catatan ${selectedKategori || 'Setoran'}` : `Input ${selectedKategori || 'Setoran'} Baru`}
                </h3>
                <p className="text-[11px] text-emerald-200 mt-0.5 uppercase">
                  Siswa: {targetSiswa.nama}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowInputModal(false);
                  setTargetSiswa(null);
                  setSelectedKategori(null);
                }}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSetoranSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              {selectedKategori && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[10px] text-slate-500 uppercase tracking-wider">
                      Catatan {selectedKategori} Terakhir
                    </span>
                    {lastEntryForKategori && (
                      <span className="font-mono text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                        {lastEntryForKategori.tanggal}
                      </span>
                    )}
                  </div>
                  {lastEntryForKategori ? (
                    <div className="space-y-1">
                      <p className="font-bold text-slate-700">Materi: <span className="text-emerald-800 font-extrabold">{lastEntryForKategori.materiSetoran}</span></p>
                      {lastEntryForKategori.evaluasiTahsin && (
                        <p className="text-slate-500 italic text-[11px] leading-relaxed">Eval: {lastEntryForKategori.evaluasiTahsin}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] text-slate-450 font-bold">Nilai:</span>
                        <span className={`px-2 py-0.5 rounded-sm font-extrabold text-[9px] uppercase ${
                          lastEntryForKategori.nilai === 'A' ? 'bg-emerald-100 text-emerald-800' :
                          lastEntryForKategori.nilai === 'B' ? 'bg-indigo-100 text-indigo-800' :
                          lastEntryForKategori.nilai === 'C' ? 'bg-sky-100 text-sky-850' :
                          lastEntryForKategori.nilai === 'D' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {lastEntryForKategori.nilai === 'A' ? 'Mumtaz (A)' : 
                           lastEntryForKategori.nilai === 'B' ? 'Jayyid Jidid (B)' : 
                           lastEntryForKategori.nilai === 'C' ? 'Jayyid (C)' : 
                           lastEntryForKategori.nilai === 'D' ? 'Maqbul (D)' : 'Rosib (E)'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic text-[11px] text-center py-1">
                      Belum ada riwayat catatan untuk {selectedKategori}.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Hari / Tanggal Setoran</label>
                <input
                  type="date"
                  required
                  value={formTanggal}
                  onChange={(e) => setFormTanggal(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">
                  {selectedKategori ? `Materi ${selectedKategori}` : 'Materi Setoran'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: An-Naba 1-20, Al-Baqarah 45"
                  value={formMateri}
                  onChange={(e) => setFormMateri(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">
                  {selectedKategori === 'Tugas Tilawah' ? 'Keterangan' : 'Evaluasi / Catatan'}
                </label>
                <textarea
                  placeholder={selectedKategori === 'Tugas Tilawah' ? 'Masukkan keterangan tugas tilawah siswa...' : 'Contoh: Makharijul huruf cukup baik, pertahankan dengung bighunnah pada ayat 4.'}
                  value={formEvaluasi}
                  onChange={(e) => setFormEvaluasi(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Kategori Penilaian Setoran Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block uppercase tracking-wider">Kategori Penilaian Setoran</label>
                <select
                  value={formNilai}
                  onChange={(e) => setFormNilai(e.target.value as NilaiEvaluasi)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700"
                >
                  <option value="A">Mumtaz (A) - Sangat Lancar, Sempurna</option>
                  <option value="B">Jayyid Jidid (B) - Lancar, Sedikit Koreksi</option>
                  <option value="C">Jayyid (C) - Cukup Lancar, Agak Terbata</option>
                  <option value="D">Maqbul (D) - Banyak Terputus / Perlu Mengulang</option>
                  <option value="E">Rosib (E) - Belum Bisa / Mengulang Total</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition duration-150 cursor-pointer"
              >
                {isSaving ? 'Sedang Menyimpan...' : editingJournalId ? 'Simpan Perubahan' : 'Simpan Catatan Santri'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/80 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:hidden">
        <div className={`grid h-16 max-w-md mx-auto ${isMengajarLomba ? 'grid-cols-6' : 'grid-cols-5'}`}>
          {[
            { id: 'absen_saya', label: 'Absen Saya', icon: UserCheck },
            { id: 'absen_siswa', label: 'Absen Siswa', icon: CheckCircle },
            { id: 'input_siswa', label: 'Input Harian', icon: BookOpen },
            ...(isMengajarLomba ? [{ id: 'halaqoh_lomba', label: 'Halaqoh Lomba', icon: Award }] : []),
            { id: 'rekap_hari', label: 'Rekap Harian', icon: Calendar },
            { id: 'rekap_bulan', label: 'Rekap Bulanan', icon: TrendingUp }
          ].map(tab => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setFeedback({ text: '', type: 'success' });
                }}
                className={`flex flex-col items-center justify-center gap-1 w-full h-full cursor-pointer transition-colors ${
                  isActive 
                    ? 'text-emerald-700 font-extrabold' 
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-emerald-50 scale-110' : ''}`}>
                  <IconComp className={`w-5 h-5 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                </div>
                <span className="text-[9px] tracking-tight leading-none truncate max-w-full px-1">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
