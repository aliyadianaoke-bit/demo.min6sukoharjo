import React, { useState, useEffect } from 'react';
import { 
  Calendar, CheckCircle, Award, BookMarked, FileText, BarChart2, Plus, Edit2, 
  Trash2, LogOut, ChevronRight, Filter, AlertCircle, Sparkles, Smile, Info, BookOpen,
  Printer, Share2, TrendingUp, Camera, UserCheck, Clock, RefreshCw, Search
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { Kelas, Siswa, Halaqoh, CatatanHarian, NilaiEvaluasi } from '../types';
import AbsenSayaView from './AbsenSayaView';
import AbsenCamera from './AbsenCamera';

interface MusyrifDashboardProps {
  onLogout: () => void;
  userId: string;
  userNama: string;
  classes: Kelas[];
  students: Siswa[];
  halaqohs: Halaqoh[];
  journals: CatatanHarian[];
  refreshData: () => Promise<void>;
}

export default function MusyrifDashboard({
  onLogout,
  userId,
  userNama,
  classes,
  students,
  halaqohs,
  journals,
  refreshData
}: MusyrifDashboardProps) {
  const [activeTab, setActiveTab] = useState<'absen_saya' | 'input_siswa' | 'rekap_hari' | 'rekap_bulan'>('absen_saya');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: 'success' });
  const [showAutoAbsenModal, setShowAutoAbsenModal] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);


  // Filter halaqohs to only those managed by the current Musyrif (supports multiple Musyrifs)
  const myHalaqohs = halaqohs.filter(h => h.musyrifId === userId || (h.musyrifIds && h.musyrifIds.includes(userId)));

  // Auto-find Musyrif's assigned halaqoh (if any) as initial value
  const assignedHalaqoh = halaqohs.find(h => h.musyrifId === userId || (h.musyrifIds && h.musyrifIds.includes(userId)));
  const initialHalaqohId = assignedHalaqoh?.id || myHalaqohs[0]?.id || '';

  // Filter States
  const [selectedHalaqohId, setSelectedHalaqohId] = useState(initialHalaqohId);
  const [selectedKelasId, setSelectedKelasId] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<'dasar' | 'tahfidz' | ''>('dasar');
  const [rekapHariTanggal, setRekapHariTanggal] = useState(new Date().toISOString().split('T')[0]);
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

  // Check today's attendance on mount
  useEffect(() => {
    async function checkTodayAttendance() {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const q = query(
          collection(db, 'absen_musyrif'),
          where('musyrifId', '==', userId),
          where('tanggal', '==', todayStr)
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          setShowAutoAbsenModal(true);
        }
      } catch (err) {
        console.error('Error checking today attendance:', err);
      }
    }
    checkTodayAttendance();
  }, [userId]);

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

      const payload = {
        musyrifId: userId,
        musyrifNama: userNama,
        tanggal: tanggalStr,
        waktu: waktuStr,
        hari: hariStr,
        fotoUrl: base64Image
      };

      await addDoc(collection(db, 'absen_musyrif'), payload);
      showFeedback('Absensi kehadiran Anda berhasil disimpan!');
      setShowAutoAbsenModal(false);
    } catch (err: any) {
      console.error('Failed to save automatic attendance:', err);
      showFeedback('Gagal menyimpan absensi: ' + err.message, 'danger');
    } finally {
      setIsAutoSaving(false);
    }
  };

  const showFeedback = (text: string, type: 'success' | 'danger' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback({ text: '', type: 'success' }), 4000);
  };

  const handleOpenInputForm = (siswa: Siswa, existingLog?: CatatanHarian) => {
    setTargetSiswa(siswa);
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
      const payload = {
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

      if (editingJournalId) {
        await updateDoc(doc(db, 'catatan_harian', editingJournalId), payload);
        showFeedback('Berhasil memperbarui catatan setoran!');
      } else {
        await addDoc(collection(db, 'catatan_harian'), payload);
        showFeedback(`Berhasil mencatat setoran untuk ${targetSiswa.nama}!`);
      }
      
      await refreshData();
      setShowInputModal(false);
      setTargetSiswa(null);
    } catch (err: any) {
      showFeedback('Gagal menyimpan setoran: ' + err.message, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!window.confirm('Hapus catatan setoran ini?')) return;
    try {
      await deleteDoc(doc(db, 'catatan_harian', id));
      showFeedback('Berhasil menghapus catatan setoran.');
      await refreshData();
    } catch (err: any) {
      showFeedback('Gagal menghapus: ' + err.message, 'danger');
    }
  };

  const handleShareWA = () => {
    if (!selectedKelasId || !selectedProgram) return;
    const activeKelasObj = classes.find(c => c.id === selectedKelasId);
    const kelasNama = activeKelasObj?.nama || 'N/A';
    const programLabel = selectedProgram === 'dasar' ? 'Dasar' : 'Tahfidz';

    const formattedDate = new Date(rekapHariTanggal).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    let text = `*REKAP HARIAN KELAS ${kelasNama.toUpperCase()} (${programLabel.toUpperCase()})*\n`;
    text += `*Markaz Muhibbil Qur'an*\n\n`;
    text += `🏫 *Kelas / Program*: ${kelasNama} / ${programLabel}\n`;
    text += `👤 *Musyrif/ah*: Ustadz/ah ${userNama}\n`;
    text += `📅 *Tanggal*: ${formattedDate}\n`;
    text += `📊 *Total Setoran*: ${dailyRecapLogs.length} Santri\n\n`;
    text += `===================================\n\n`;

    if (dailyRecapLogs.length === 0) {
      text += `_Belum ada setoran yang tercatat hari ini._\n`;
    } else {
      dailyRecapLogs.forEach((log, idx) => {
        const labelNilai = log.nilai === 'A' ? 'Mumtaz (A)' : 
                           log.nilai === 'B' ? 'Jayyid Jidid (B)' : 
                           log.nilai === 'C' ? 'Jayyid (C)' : 
                           log.nilai === 'D' ? 'Maqbul (D)' : 'Rosib (E)';

        text += `*${idx + 1}. ${log.siswaNama}* (No Induk: ${log.noInduk})\n`;
        text += `• Materi: _${log.materiSetoran}_\n`;
        text += `• Evaluasi: _${log.evaluasiTahsin || '-'}_\n`;
        text += `• Nilai: *${labelNilai}*\n\n`;
      });
    }

    text += `===================================\n`;
    text += `_Mencetak Generasi Qur'ani yang Berakhlaqul Karimah_`;

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handleCetakPDF = () => {
    if (!selectedKelasId || !selectedProgram) return;
    const activeKelasObj = classes.find(c => c.id === selectedKelasId);
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

    const tableRowsHtml = dailyRecapLogs.map((log, index) => {
      const labelNilai = log.nilai === 'A' ? 'Mumtaz (A)' : 
                         log.nilai === 'B' ? 'Jayyid Jidid (B)' : 
                         log.nilai === 'C' ? 'Jayyid (C)' : 
                         log.nilai === 'D' ? 'Maqbul (D)' : 'Rosib (E)';
      return `
        <tr>
          <td style="text-align: center; font-weight: bold;">${index + 1}</td>
          <td style="font-family: monospace; text-align: center;">${log.noInduk}</td>
          <td>
            <div style="font-weight: 700; text-transform: uppercase;">${log.siswaNama}</div>
            <div style="font-size: 9px; color: #64748b;">Kelas: ${log.kelasNama || 'Belum Diatur'}</div>
          </td>
          <td style="font-weight: 600; color: #0f766e;">${log.materiSetoran}</td>
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
          <h2>LAPORAN REKAP HARIAN SETORAN TAHFIDZ</h2>
          <p>Mencetak Generasi Qur'ani yang Berakhlaqul Karimah</p>
        </div>

        <div class="meta-container">
          <div>
            <div class="meta-item"><strong>Kelas / Program</strong>: ${kelasNama} / ${programLabel}</div>
            <div class="meta-item"><strong>Musyrif Pengampu</strong>: Ustadz/ah ${userNama}</div>
          </div>
          <div>
            <div class="meta-item"><strong>Tanggal Laporan</strong>: ${formattedDate}</div>
            <div class="meta-item"><strong>Total Setoran</strong>: ${dailyRecapLogs.length} Anak</div>
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
            <div style="font-weight: 700; margin-top: 4px;">Pimpinan Markaz</div>
            <div class="sig-line">__________________________</div>
          </div>
          <div class="sig-box">
            <div>Sukoharjo, ${formattedDate}</div>
            <div style="font-weight: 700; margin-top: 4px;">Musyrif Pengampu</div>
            <div class="sig-line">Ustadz/ah ${userNama}</div>
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
      return `
        <tr>
          <td style="text-align: center; font-weight: bold;">${index + 1}</td>
          <td style="text-align: center; font-family: monospace;">${log.tanggal}</td>
          <td style="font-weight: 600; color: #0f766e;">${log.materiSetoran}</td>
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
            <div class="meta-item"><strong>Musyrif Pengampu</strong>: Ustadz/ah ${userNama}</div>
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
            <div style="font-weight: 700; margin-top: 4px;">Pimpinan Markaz</div>
            <div class="sig-line">__________________________</div>
          </div>
          <div class="sig-box">
            <div>Sukoharjo, ${bulanName} 2026</div>
            <div style="font-weight: 700; margin-top: 4px;">Musyrif Pengampu</div>
            <div class="sig-line">Ustadz/ah ${userNama}</div>
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

  // All students belonging to this Musyrif's managed halaqohs
  const myStudents = students.filter(s => myHalaqohs.some(h => h.id === s.halaqohId));

  // Filter students based on selected Class and Program
  const inputTabStudents = myStudents.filter(s => {
    if (!selectedKelasId) return false;
    if (s.kelasId !== selectedKelasId) return false;
    
    // Check program
    if (selectedProgram === 'dasar') {
      if (!(s.isKelasDasar === true || (!s.isKelasDasar && !s.isKelasTahfidz))) return false;
    } else if (selectedProgram === 'tahfidz') {
      if (s.isKelasTahfidz !== true) return false;
    } else {
      return false;
    }

    // Check search term
    if (searchSiswa.trim()) {
      const term = searchSiswa.toLowerCase();
      return s.nama.toLowerCase().includes(term) || (s.noInduk && s.noInduk.toLowerCase().includes(term));
    }

    return true;
  });

  // Filter journals for "Rekap Harian" based on class, program, and date
  const dailyRecapLogs = journals.filter(j => {
    if (j.tanggal !== rekapHariTanggal) return false;
    
    // Find student in students list
    const s = students.find(siswa => siswa.id === j.siswaId);
    if (!s) return false;

    // Must be managed by this Musyrif
    const isMyStudent = myHalaqohs.some(h => h.id === s.halaqohId);
    if (!isMyStudent) return false;

    // Filter by selected Class
    if (s.kelasId !== selectedKelasId) return false;

    // Filter by selected Program
    if (selectedProgram === 'dasar') {
      return s.isKelasDasar === true || (!s.isKelasDasar && !s.isKelasTahfidz);
    }
    if (selectedProgram === 'tahfidz') {
      return s.isKelasTahfidz === true;
    }
    return false;
  });

  // Students available for selection in "Rekap Bulanan"
  const selectBulanStudents = myStudents.filter(s => {
    if (s.kelasId !== selectedKelasId) return false;
    if (selectedProgram === 'dasar') {
      return s.isKelasDasar === true || (!s.isKelasDasar && !s.isKelasTahfidz);
    }
    if (selectedProgram === 'tahfidz') {
      return s.isKelasTahfidz === true;
    }
    return false;
  });

  // Filter for "Rekap Bulanan" logs
  // Month string format: 2026-XX
  const selectedYearMonthPrefix = `2026-${selectedBulanMonth}`;
  const studentMonthlyLogs = journals.filter(j => 
    j.siswaId === selectedBulanSiswaId && 
    j.tanggal.startsWith(selectedYearMonthPrefix)
  );

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
              <div className="w-10 h-10 rounded-lg bg-emerald-700 border border-emerald-500/50 flex flex-col items-center justify-center">
                <BookOpen className="w-5 h-5 text-emerald-50" />
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
              { id: 'input_siswa', label: 'Input Harian Siswa', icon: BookOpen },
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

          {/* TAB: INPUT HARIAN */}
          {activeTab === 'input_siswa' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    Pencatatan Setoran Harian (Input Harian Siswa)
                  </h3>
                  <p className="text-xs text-slate-500">Pilih kelas kemudian dilanjut program dasar/tahfidz baru muncul data siswanya</p>
                </div>
              </div>

              {/* Filter Kelas & Program - Diluar border daftar murid */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row gap-4 items-center">
                <div className="w-full sm:w-auto text-xs font-bold text-slate-600 shrink-0 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-emerald-600" />
                  <span>1. Pilih Kelas :</span>
                </div>
                <select
                  value={selectedKelasId}
                  onChange={(e) => {
                    setSelectedKelasId(e.target.value);
                    setSelectedBulanSiswaId(''); // Reset selected student in reports
                    setSearchSiswa(''); // Reset search
                  }}
                  className="w-full sm:w-60 px-4 py-2 bg-white border border-slate-200 text-xs rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-800"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nama}
                    </option>
                  ))}
                </select>

                <div className="w-full sm:w-auto text-xs font-bold text-slate-600 shrink-0 uppercase tracking-wider flex items-center gap-1.5 sm:ml-4">
                  <Filter className="w-4 h-4 text-emerald-600" />
                  <span>2. Pilih Program :</span>
                </div>
                <select
                  value={selectedProgram}
                  onChange={(e) => {
                    const programVal = e.target.value as 'dasar' | 'tahfidz' | '';
                    setSelectedProgram(programVal);
                    setSelectedBulanSiswaId('');
                    setSearchSiswa(''); // Reset search
                  }}
                  className="w-full sm:w-60 px-4 py-2 bg-white border border-slate-200 text-xs rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-800"
                >
                  <option value="">-- Pilih Program --</option>
                  <option value="dasar">Program Dasar</option>
                  <option value="tahfidz">Program Tahfidz</option>
                </select>
              </div>

              {/* Student Cards Grid for Laypeople & Mobile Friendliness - Wrapped in White Card Border */}
              <div className="bg-white border border-slate-150 p-6 rounded-3xl shadow-xs">
                {selectedKelasId && selectedProgram ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                        Daftar Murid ({inputTabStudents.length} Anak)
                      </h4>
                      <span className="text-[10px] text-slate-400 font-semibold italic">Tampilan Mobile-Friendly Card</span>
                    </div>

                    {/* Search Input Field */}
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                        <Search className="w-4 h-4 text-slate-400" />
                      </span>
                      <input
                        type="text"
                        placeholder="Cari nama santri atau nomor induk di kelas ini..."
                        value={searchSiswa}
                        onChange={(e) => setSearchSiswa(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none font-medium text-slate-800 placeholder-slate-400 transition"
                      />
                    </div>

                    {inputTabStudents.length === 0 ? (
                      <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                        {searchSiswa.trim() 
                          ? `Tidak ditemukan santri dengan nama atau nomor induk "${searchSiswa}".`
                          : "Tidak ada santri yang terdaftar dalam program ini di Halaqoh terpilih."}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {inputTabStudents.map((siswa, sIndex) => {
                        // Find if there is a setoran entry today
                        const todayStr = new Date().toISOString().split('T')[0];
                        const logHariIni = journals.find(j => j.siswaId === siswa.id && j.tanggal === todayStr);

                        return (
                          <div 
                            key={siswa.id} 
                            className={`p-5 rounded-2xl border transition duration-150 flex flex-col justify-between space-y-4 ${
                              logHariIni 
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

                              {logHariIni ? (
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
                                  {selectedProgram === 'dasar' && (() => {
                                    const lastLog = journals
                                      .filter(j => j.siswaId === siswa.id)
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
                              )}
                            </div>

                            <div className="pt-2 flex gap-2">
                              {logHariIni ? (
                                <>
                                  <button
                                    onClick={() => handleOpenInputForm(siswa, logHariIni)}
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
                                </>
                              ) : (
                                <button
                                  onClick={() => handleOpenInputForm(siswa)}
                                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs hover:shadow-md hover:shadow-emerald-100 flex items-center justify-center gap-1"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Input Setoran Harian</span>
                                </button>
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
                  Silahkan pilih Kelas kemudian dilanjut Program di atas terlebih dahulu untuk memunculkan data siswa.
                </div>
              )}
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
                          Total Diinput: <strong>{dailyRecapLogs.length} dari {inputTabStudents.length} Siswa</strong>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button
                            id="btn-share-wa"
                            onClick={handleShareWA}
                            disabled={dailyRecapLogs.length === 0}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none text-white font-extrabold text-xs rounded-xl transition shadow-xs cursor-pointer"
                            title="Bagikan Laporan ke WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Kirim ke WA</span>
                          </button>
                          <button
                            id="btn-print-pdf"
                            onClick={handleCetakPDF}
                            disabled={dailyRecapLogs.length === 0}
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
                          {dailyRecapLogs.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-slate-400 font-medium italic">
                                Tidak ada data setoran yang tercatat pada kelas, program, dan tanggal ini.
                              </td>
                            </tr>
                          ) : (
                            dailyRecapLogs.map((log, index) => (
                              <tr key={log.id} className="hover:bg-slate-50/40">
                                <td className="py-3 px-4 font-mono font-bold text-slate-400">{index + 1}</td>
                                <td className="py-3 px-4 font-mono">{log.noInduk}</td>
                                <td className="py-3 px-4 font-bold text-slate-900">{log.siswaNama}</td>
                                <td className="py-3 px-4 font-semibold text-emerald-900">{log.materiSetoran}</td>
                                <td className="py-3 px-4 text-slate-500 italic max-w-xs truncate" title={log.evaluasiTahsin}>{log.evaluasiTahsin}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`px-2 py-1 rounded-full font-bold text-[10px] uppercase ${getNilaiBadgeClass(log.nilai)}`}>
                                    {getNilaiLabel(log.nilai)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => handleDeleteLog(log.id)}
                                    className="text-rose-600 hover:text-rose-800 p-1 bg-rose-50 hover:bg-rose-100 rounded-md cursor-pointer transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
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
                <p className="text-xs text-slate-500">Melihat performa, tingkat keaktifan, dan rekam materi setoran per individu siswa per bulan</p>
              </div>

              {/* Filters Block - Diluar atas border */}
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
                    <option value="">-- Pilih Kelas --</option>
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
                  <label className="text-[10px] font-bold text-slate-500 block uppercase">3. Pilih Siswa :</label>
                  <select
                    value={selectedBulanSiswaId}
                    onChange={(e) => setSelectedBulanSiswaId(e.target.value)}
                    disabled={!selectedKelasId || !selectedProgram}
                    className="w-full px-4 py-2 bg-white border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 font-bold text-slate-800"
                  >
                    <option value="">-- Pilih Siswa --</option>
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
                {selectedBulanSiswaId ? (
                  <div className="space-y-6">
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
                          <span>Cetak PDF</span>
                        </button>
                      </div>

                      {studentMonthlyLogs.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                          Tidak ada laporan setoran siswa ini untuk bulan terpilih.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {studentMonthlyLogs.map((log, index) => (
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
                                <p className="text-slate-500 italic leading-snug">
                                  🔍 Evaluasi: {log.evaluasiTahsin}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-slate-400 text-xs">
                    Silahkan pilih Kelas, Program, dan Siswa di atas untuk memuat laporan bulanan.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

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
                onCancel={() => setShowAutoAbsenModal(false)}
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
                  {editingJournalId ? 'Edit Catatan Setoran' : 'Input Setoran Baru'}
                </h3>
                <p className="text-[11px] text-emerald-200 mt-0.5 uppercase">
                  Siswa: {targetSiswa.nama}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowInputModal(false);
                  setTargetSiswa(null);
                }}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSetoranSubmit} className="p-6 space-y-4">
              
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
                <label className="text-xs font-bold text-slate-600 block">Materi Setoran (Surat & Ayat)</label>
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
                <label className="text-xs font-bold text-slate-600 block">Evaluasi (Tahsin & Tajwid)</label>
                <textarea
                  placeholder="Contoh: Makharijul huruf cukup baik, pertahankan dengung bighunnah pada ayat 4."
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
                {isSaving ? 'Sedang Menyimpan...' : 'Simpan Setoran Santri'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/80 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:hidden">
        <div className="grid grid-cols-4 h-16 max-w-md mx-auto">
          {[
            { id: 'absen_saya', label: 'Absen Saya', icon: UserCheck },
            { id: 'input_siswa', label: 'Input Harian', icon: BookOpen },
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
