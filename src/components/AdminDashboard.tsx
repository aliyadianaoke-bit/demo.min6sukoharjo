import React, { useState } from 'react';
import { 
  Users, BookOpen, UserCheck, ShieldAlert, Settings, LogOut, Plus, Edit2, Trash2, 
  ChevronRight, Database, Save, CheckCircle, Lock, BookMarked, FileText, Printer 
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Kelas, Halaqoh, Siswa, Musyrif, CatatanHarian } from '../types';

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
  const [activeTab, setActiveTab] = useState<'kelas' | 'siswa' | 'pengajar' | 'halaqoh' | 'laporan' | 'pengaturan'>('kelas');
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

  // 6. Pengaturan Form
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');

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
        .filter(j => j.siswaId === siswa.id)
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
            ${latestLog.evaluasiTahsin ? `<div style="margin-top: 2px; color: #475569; font-style: italic;">Eva: ${latestLog.evaluasiTahsin}</div>` : ''}
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
            <div class="meta-item"><strong>Musyrif Pengampu</strong>: ${activeHalaqoh.musyrifNama}</div>
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
            <div class="sig-line">${activeHalaqoh.musyrifNama}</div>
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
  const reportStudents = students.filter(s => s.halaqohId === selectedLaporanHalaqohId);
  const activeHalaqoh = halaqohs.find(h => h.id === selectedLaporanHalaqohId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Admin Navigation bar */}
      <nav className="bg-emerald-900 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-700 border border-emerald-500 flex items-center justify-center">
                <Database className="w-5 h-5 text-emerald-100" />
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
          {activeTab === 'siswa' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">Daftar Siswa</h3>
                  <p className="text-xs text-slate-500">Kelola database siswa, no induk, dan pemetaan halaqoh</p>
                </div>
                <button
                  onClick={() => {
                    setModalType('add');
                    setSiswaNoInduk('');
                    setSiswaNama('');
                    setSiswaKelasId('');
                    setSiswaHalaqohId('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Siswa</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider">
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
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">Belum ada data siswa.</td>
                      </tr>
                    ) : (
                      students.map((sys, idx) => (
                        <tr key={sys.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-400">{idx + 1}</td>
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
                      <th className="py-3.5 px-4">HALAQOH AMPUAN</th>
                      <th className="py-3.5 px-4">USERNAME</th>
                      <th className="py-3.5 px-4">PASSWORD</th>
                      <th className="py-3.5 px-4 text-right w-24">OPSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {musyrifs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">Belum ada pengajar terdaftar.</td>
                      </tr>
                    ) : (
                      musyrifs.map((m, i) => (
                        <tr key={m.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-400">{i + 1}</td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800">{m.nim}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{m.nama}</td>
                          <td className="py-3 px-4 font-semibold text-emerald-800">
                            {m.halaqohNama || 'Belum Ditentukan'}
                          </td>
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
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row gap-4 items-center">
                <div className="w-full sm:w-auto text-xs font-bold text-slate-600 shrink-0">
                  PILIH HALAQOH :
                </div>
                <select
                  value={selectedLaporanHalaqohId}
                  onChange={(e) => setSelectedLaporanHalaqohId(e.target.value)}
                  className="w-full sm:w-64 px-4 py-2 bg-white border border-slate-250 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                >
                  <option value="">-- Silahkan Pilih Halaqoh --</option>
                  {halaqohs.map(hq => (
                    <option key={hq.id} value={hq.id}>{hq.nama} ({hq.musyrifNama})</option>
                  ))}
                </select>
                
                {activeHalaqoh && (
                  <div className="text-xs text-slate-500 hidden sm:block">
                    Musyrif Pengampu: <strong>{activeHalaqoh.musyrifNama}</strong>
                  </div>
                )}

                {selectedLaporanHalaqohId && (
                  <button
                    onClick={handleCetakPDF}
                    className="w-full sm:w-auto ml-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm hover:shadow"
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
                        {journals.filter(j => j.halaqohId === selectedLaporanHalaqohId).length} Setoran
                      </div>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-amber-600">Peringkat Mumtaz (A)</div>
                      <div className="text-2xl font-black text-amber-900 mt-1">
                        {journals.filter(j => j.halaqohId === selectedLaporanHalaqohId && j.nilai === 'A').length} Kali
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
                        const baseHistory = journals.filter(j => j.siswaId === siswa.id);
                        
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
                                      <div className="text-slate-500 text-[11px] leading-relaxed">
                                        <strong>Evaluasi (Tahsin/Tajwid):</strong> {log.evaluasiTahsin}
                                      </div>
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

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">Halaqoh Pengampu (Opsional)</label>
                    <select
                      value={musyrifHalaqohId}
                      onChange={(e) => setMusyrifHalaqohId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                    >
                      <option value="">-- Pilih Halaqoh --</option>
                      {halaqohs.map(h => (
                        <option key={h.id} value={h.id}>{h.nama}</option>
                      ))}
                    </select>
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
