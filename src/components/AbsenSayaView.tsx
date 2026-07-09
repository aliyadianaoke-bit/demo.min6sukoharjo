import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, orderBy, addDoc } from 'firebase/firestore';
import { Camera, Calendar, Clock, Smile, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import AbsenCamera from './AbsenCamera';

interface AbsenMusyrif {
  id: string;
  musyrifId: string;
  musyrifNama: string;
  tanggal: string; // YYYY-MM-DD
  waktu: string; // HH:mm:ss
  hari: string; // e.g. Senin, Selasa, dll
  fotoUrl: string; // base64 string
}

interface AbsenSayaViewProps {
  userId: string;
  userNama: string;
  onOpenAutomaticPopup?: (callback: (photo: string) => Promise<void>) => void;
}

export default function AbsenSayaView({ userId, userNama }: AbsenSayaViewProps) {
  const [attendances, setAttendances] = useState<AbsenMusyrif[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const getDayName = (dateStr: string): string => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const date = new Date(dateStr);
    return days[date.getDay()];
  };

  const getFormattedDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Sync attendance list for current musyrif in real-time
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'absen_musyrif'),
      where('musyrifId', '==', userId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: AbsenMusyrif[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as AbsenMusyrif);
      });
      // Sort in memory by tanggal desc, then waktu desc
      list.sort((a, b) => {
        const dateTimeA = `${a.tanggal}T${a.waktu}`;
        const dateTimeB = `${b.tanggal}T${b.waktu}`;
        return dateTimeB.localeCompare(dateTimeA);
      });
      setAttendances(list);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching attendance logs:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [userId]);

  const handleCapture = async (base64Image: string) => {
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const now = new Date();
      
      // ISO Date in local timezone or server-safe representation
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const date = String(now.getDate()).padStart(2, '0');
      const tanggalStr = `${year}-${month}-${date}`;
      
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const waktuStr = `${hours}:${minutes}:${seconds}`;
      
      const hariStr = getDayName(tanggalStr);

      const payload = {
        musyrifId: userId,
        musyrifNama: userNama,
        tanggal: tanggalStr,
        waktu: waktuStr,
        hari: hariStr,
        fotoUrl: base64Image
      };

      await addDoc(collection(db, 'absen_musyrif'), payload);
      setSuccessMsg('Absensi berhasil disimpan!');
      setShowCameraModal(false);
      
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error('Failed to save attendance:', err);
      setErrorMsg('Gagal menyimpan absensi: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const hasAbsentedToday = attendances.some(a => a.tanggal === todayStr);

  return (
    <div className="space-y-6">
      {/* Upper Greeting & Quick Action Banner */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-x-10 translate-y-6 opacity-10 text-9xl font-black pointer-events-none">
          🕌
        </div>
        
        <div className="relative z-10 space-y-4">
          <div className="space-y-1.5">
            <span className="text-[10px] font-extrabold tracking-widest bg-emerald-500/30 px-2.5 py-1 rounded-full uppercase">
              MODUL KEHADIRAN MUSYRIF
            </span>
            <h2 className="text-xl sm:text-2xl font-black">
              Assalamu'alaikum, {userNama}!
            </h2>
            <p className="text-xs text-emerald-100 font-medium">
              Silakan lakukan absensi harian Anda dengan mengambil foto selfie secara langsung sebelum memulai bimbingan halaqoh santri.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {hasAbsentedToday ? (
              <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500/20 border border-emerald-400/40 text-emerald-100 rounded-xl text-xs font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Alhamdulillah, Anda sudah absen hari ini</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500/20 border border-amber-400/45 text-amber-100 rounded-xl text-xs font-bold animate-pulse">
                <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Anda belum melakukan absensi hari ini</span>
              </div>
            )}

            <button
              onClick={() => {
                setErrorMsg('');
                setShowCameraModal(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-extrabold rounded-xl transition shadow-sm cursor-pointer shrink-0"
            >
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>{hasAbsentedToday ? 'Absen Lagi' : 'Mulai Absen Sekarang'}</span>
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-150 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-bold">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid List of Attendances */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Riwayat Kehadiran Anda</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-bold">
            Total Kehadiran: {attendances.length} Hari
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
            <span>Memuat riwayat absen...</span>
          </div>
        ) : attendances.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-slate-400 text-xs space-y-2">
            <Smile className="w-8 h-8 mx-auto text-slate-350" />
            <p className="font-bold text-slate-500">Belum Ada Riwayat Absensi</p>
            <p className="text-[10px] text-slate-400 max-w-xs mx-auto">Riwayat foto, hari, tanggal dan waktu kehadiran Anda akan tercatat secara rapi di sini.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-150 overflow-hidden shadow-xs divide-y divide-slate-100">
            {attendances.map((item) => (
              <div 
                key={item.id} 
                className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition gap-4"
              >
                {/* Left: Avatar & Date details */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div 
                    onClick={() => setPreviewPhoto(item.fotoUrl)}
                    className="relative w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 cursor-pointer group shrink-0 shadow-inner"
                    title="Klik untuk perbesar foto"
                  >
                    <img 
                      src={item.fotoUrl} 
                      alt={`Selfie ${item.tanggal}`} 
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-250"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                        {item.hari}
                      </span>
                      <p className="text-xs font-black text-slate-800 truncate">
                        {getFormattedDate(item.tanggal)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium mt-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Waktu Absen: <strong className="text-slate-700">{item.waktu} WIB</strong></span>
                    </div>
                  </div>
                </div>

                {/* Right: Status Tag & Optional View Button */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-xl border border-emerald-100 uppercase tracking-wider">
                    HADIR
                  </span>
                  
                  <button
                    onClick={() => setPreviewPhoto(item.fotoUrl)}
                    className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lihat Foto</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Preview Modal */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-55 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div 
            className="bg-white rounded-3xl p-4 max-w-sm w-full border border-slate-100 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-square w-full rounded-2xl bg-slate-900 overflow-hidden mb-4">
              <img 
                src={previewPhoto} 
                alt="Foto Selfie Kehadiran" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-700">Foto Absensi Selfie</span>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Absen Camera Dialog Overlay */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-slate-100 transform transition-all p-6 space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-800">
                Ambil Foto Selfie Absensi
              </h3>
              <p className="text-xs text-slate-500">
                Posisikan wajah Anda tepat di tengah bingkai kamera.
              </p>
            </div>

            {isSaving ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                <p className="text-xs font-bold text-slate-600">Menyimpan Kehadiran...</p>
              </div>
            ) : (
              <AbsenCamera
                onCapture={handleCapture}
                onCancel={() => setShowCameraModal(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
