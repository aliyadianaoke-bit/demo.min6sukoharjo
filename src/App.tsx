import React, { useState, useEffect } from 'react';
import { db, seedInitialData, handleFirestoreError, OperationType } from './firebase';
import { collection, doc, query, orderBy, limit, where, getDocs, getDoc } from 'firebase/firestore';
import { Kelas, Halaqoh, Siswa, Musyrif, CatatanHarian, AbsenSiswa, AbsenMusyrif } from './types';
import { isMusyrifAutoOff14 } from './utils';
import HomeView from './components/HomeView';
import AdminDashboard from './components/AdminDashboard';
import MusyrifDashboard from './components/MusyrifDashboard';
import logoMinSukoharjo from './assets/logo_min_sukoharjo.jpg';

export default function App() {
  const [appState, setAppState] = useState<'loading' | 'home' | 'admin' | 'musyrif'>('loading');
  const [currentUser, setCurrentUser] = useState<{ id: string; nama: string } | null>(null);

  // Firestore sync states
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [students, setStudents] = useState<Siswa[]>([]);
  const [musyrifs, setMusyrifs] = useState<Musyrif[]>([]);
  const [halaqohs, setHalaqohs] = useState<Halaqoh[]>([]);
  const [journals, setJournals] = useState<CatatanHarian[]>([]);
  const [studentAttendances, setStudentAttendances] = useState<AbsenSiswa[]>([]);
  const [musyrifAttendances, setMusyrifAttendances] = useState<AbsenMusyrif[]>([]);
  const [adminPass, setAdminPass] = useState('admin123'); // fallback default
  const [musyrifLoginEnabled, setMusyrifLoginEnabled] = useState(true);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // Fallback demo data if Firestore hits free tier quota limit
  const ensureFallbackData = () => {
    setQuotaExceeded(true);
    setMusyrifs((prev) => prev.length ? prev : [
      { id: 'usr-1', nim: '202601001', nama: 'Ahmad Muzakki, S.Pd.', username: 'ahmad', password: 'password123', halaqohId: 'hq-1', halaqohNama: 'Halaqoh Al-Kahfi' },
      { id: 'usr-2', nim: '202601002', nama: 'Umar Al-Faruq', username: 'umar', password: 'password123', halaqohId: 'hq-2', halaqohNama: 'Halaqoh An-Nur' }
    ]);
    setClasses((prev) => prev.length ? prev : [
      { id: 'kls-1', nama: 'Kelas 1A' },
      { id: 'kls-2', nama: 'Kelas 2B' },
      { id: 'kls-3', nama: 'Kelas 3A' },
      { id: 'kls-4', nama: 'Kelas 4A' },
      { id: 'kls-5', nama: 'Kelas 5B' },
      { id: 'kls-6', nama: 'Kelas 6A' }
    ]);
    setHalaqohs((prev) => prev.length ? prev : [
      { id: 'hq-1', nama: 'Halaqoh Al-Kahfi', musyrifId: 'usr-1', musyrifNama: 'Ahmad Muzakki, S.Pd.' },
      { id: 'hq-2', nama: 'Halaqoh An-Nur', musyrifId: 'usr-2', musyrifNama: 'Umar Al-Faruq' },
      { id: 'hq-3', nama: 'Halaqoh At-Tin', musyrifId: '', musyrifNama: 'Belum Ditentukan' }
    ]);
    setStudents((prev) => prev.length ? prev : [
      { id: 'sis-1', noInduk: '1001', nama: 'Abdurrahman Wahid', kelasId: 'kls-1', kelasNama: 'Kelas 1A', halaqohId: 'hq-1', halaqohNama: 'Halaqoh Al-Kahfi' },
      { id: 'sis-2', noInduk: '1002', nama: 'Aisyah Humaira', kelasId: 'kls-1', kelasNama: 'Kelas 1A', halaqohId: 'hq-1', halaqohNama: 'Halaqoh Al-Kahfi' },
      { id: 'sis-3', noInduk: '1003', nama: 'Muhammad Bilal', kelasId: 'kls-2', kelasNama: 'Kelas 2B', halaqohId: 'hq-1', halaqohNama: 'Halaqoh Al-Kahfi' },
      { id: 'sis-4', noInduk: '1004', nama: 'Fathimah Az-Zahra', kelasId: 'kls-2', kelasNama: 'Kelas 2B', halaqohId: 'hq-2', halaqohNama: 'Halaqoh An-Nur' },
      { id: 'sis-5', noInduk: '1005', nama: 'Yusuf Al-Banjari', kelasId: 'kls-3', kelasNama: 'Kelas 3A', halaqohId: 'hq-2', halaqohNama: 'Halaqoh An-Nur' },
      { id: 'sis-6', noInduk: '1006', nama: 'Khadijah Al-Kubra', kelasId: 'kls-3', kelasNama: 'Kelas 3A', halaqohId: 'hq-3', halaqohNama: 'Halaqoh At-Tin' }
    ]);
  };

  // Load and seed initial data once
  useEffect(() => {
    async function init() {
      // Seed if necessary
      try {
        await seedInitialData();
      } catch (e) {
        console.warn("Seeding initial data skipped due to quota limit:", e);
        ensureFallbackData();
      }

      // Restore session from localStorage if exists and not expired
      const savedState = localStorage.getItem('absen_app_state');
      const savedUser = localStorage.getItem('absen_current_user');
      const loginTimestamp = localStorage.getItem('absen_login_timestamp');

      if (savedState && (savedState === 'admin' || savedState === 'musyrif') && loginTimestamp) {
        const parsedTimestamp = parseInt(loginTimestamp, 10);
        const now = Date.now();
        const twoHoursInMs = 2 * 60 * 60 * 1000; // 7,200,000 ms

        if (now - parsedTimestamp < twoHoursInMs) {
          // Session is valid, load it
          setAppState(savedState as any);
          if (savedUser) {
            try {
              setCurrentUser(JSON.parse(savedUser));
            } catch (e) {
              setCurrentUser(null);
            }
          }
          return;
        } else {
          // Expired, clear storage
          localStorage.removeItem('absen_app_state');
          localStorage.removeItem('absen_current_user');
          localStorage.removeItem('absen_login_timestamp');
        }
      }

      setAppState('home');
    }
    init();
  }, []);

  // Periodic check for session expiration (2 hours from login) and Musyrif 14:00 cutoff
  useEffect(() => {
    if (appState === 'home' || appState === 'loading') return;

    const checkInterval = setInterval(() => {
      // 1. Session duration check (2 hours)
      const loginTimestamp = localStorage.getItem('absen_login_timestamp');
      if (loginTimestamp) {
        const parsedTimestamp = parseInt(loginTimestamp, 10);
        const now = Date.now();
        const twoHoursInMs = 2 * 60 * 60 * 1000;

        if (now - parsedTimestamp >= twoHoursInMs) {
          handleLogout();
          return;
        }
      } else {
        handleLogout();
        return;
      }

      // 2. Musyrif auto 14:00 cutoff check
      if (appState === 'musyrif' && currentUser?.id) {
        if (isMusyrifAutoOff14(currentUser.id, musyrifAttendances)) {
          alert('⚠️ Akses login dinonaktifkan otomatis karena Anda belum melakukan absensi hingga pukul 14.00 WIB. Akun akan terbuka kembali secara otomatis pada pukul 18.00 WIB.');
          handleLogout();
        }
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(checkInterval);
  }, [appState, currentUser, musyrifAttendances]);

  // Fetch / Load data strictly ON DEMAND (only on page switch or explicitly triggered action)
  const fetchRoleData = async (targetState: 'loading' | 'home' | 'admin' | 'musyrif', targetUserId?: string) => {
    try {
      // 1. Settings doc (1 doc read)
      try {
        const docSnapSettings = await getDoc(doc(db, 'settings', 'admin'));
        if (docSnapSettings.exists()) {
          const data = docSnapSettings.data();
          if (data && data.adminPassword) setAdminPass(data.adminPassword);
          if (data && typeof data.musyrifLoginEnabled === 'boolean') setMusyrifLoginEnabled(data.musyrifLoginEnabled);
        }
      } catch (err) {
        console.warn("Could not load admin settings:", err);
      }

      // 2. Musyrif List
      try {
        const snapMus = await getDocs(collection(db, 'musyrif'));
        const listMus: Musyrif[] = [];
        snapMus.forEach((d) => listMus.push({ id: d.id, ...d.data() } as Musyrif));
        listMus.sort((a, b) => a.nama.localeCompare(b.nama));
        setMusyrifs(listMus);
      } catch (err) {
        console.warn("Could not load musyrif list:", err);
      }

      // If home or loading state, stop here
      if (targetState === 'home' || targetState === 'loading') {
        setClasses([]);
        setHalaqohs([]);
        setStudents([]);
        setJournals([]);
        setStudentAttendances([]);
        setMusyrifAttendances([]);
        return;
      }

      // 3. ADMIN ROLE DATA
      if (targetState === 'admin') {
        const [qAbsMus, snapKls, snapHq, snapSis, qJrn, qAbsSis] = await Promise.all([
          getDocs(query(collection(db, 'absen_musyrif'), orderBy('tanggal', 'desc'), limit(50))),
          getDocs(collection(db, 'classes')),
          getDocs(collection(db, 'halaqoh')),
          getDocs(collection(db, 'students')),
          getDocs(query(collection(db, 'catatan_harian'), orderBy('tanggal', 'desc'), limit(100))),
          getDocs(query(collection(db, 'absen_siswa'), orderBy('tanggal', 'desc'), limit(100))),
        ]);

        const listAbsMus: AbsenMusyrif[] = [];
        qAbsMus.forEach((d) => listAbsMus.push({ id: d.id, ...d.data() } as AbsenMusyrif));
        setMusyrifAttendances(listAbsMus);

        const listKls: Kelas[] = [];
        snapKls.forEach((d) => listKls.push({ id: d.id, ...d.data() } as Kelas));
        listKls.sort((a, b) => a.nama.localeCompare(b.nama));
        setClasses(listKls);

        const listHq: Halaqoh[] = [];
        snapHq.forEach((d) => listHq.push({ id: d.id, ...d.data() } as Halaqoh));
        listHq.sort((a, b) => a.nama.localeCompare(b.nama));
        setHalaqohs(listHq);

        const listSis: Siswa[] = [];
        snapSis.forEach((d) => listSis.push({ id: d.id, ...d.data() } as Siswa));
        listSis.sort((a, b) => a.nama.localeCompare(b.nama));
        setStudents(listSis);

        const listJrn: CatatanHarian[] = [];
        qJrn.forEach((d) => listJrn.push({ id: d.id, ...d.data() } as CatatanHarian));
        listJrn.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
        setJournals(listJrn);

        const listAbsSis: AbsenSiswa[] = [];
        qAbsSis.forEach((d) => listAbsSis.push({ id: d.id, ...d.data() } as AbsenSiswa));
        setStudentAttendances(listAbsSis);
      }

      // 4. MUSYRIF ROLE DATA
      if (targetState === 'musyrif') {
        const mId = targetUserId || currentUser?.id;
        const qAbsMusQuery = mId
          ? query(collection(db, 'absen_musyrif'), where('musyrifId', '==', mId), orderBy('tanggal', 'desc'), limit(30))
          : query(collection(db, 'absen_musyrif'), orderBy('tanggal', 'desc'), limit(30));

        const [qAbsMus, snapKls, snapHq, snapSis, qJrn, qAbsSis] = await Promise.all([
          getDocs(qAbsMusQuery),
          getDocs(collection(db, 'classes')),
          getDocs(collection(db, 'halaqoh')),
          getDocs(collection(db, 'students')),
          getDocs(query(collection(db, 'catatan_harian'), orderBy('tanggal', 'desc'), limit(100))),
          getDocs(query(collection(db, 'absen_siswa'), orderBy('tanggal', 'desc'), limit(100))),
        ]);

        const listAbsMus: AbsenMusyrif[] = [];
        qAbsMus.forEach((d) => listAbsMus.push({ id: d.id, ...d.data() } as AbsenMusyrif));
        setMusyrifAttendances(listAbsMus);

        const listKls: Kelas[] = [];
        snapKls.forEach((d) => listKls.push({ id: d.id, ...d.data() } as Kelas));
        listKls.sort((a, b) => a.nama.localeCompare(b.nama));
        setClasses(listKls);

        const listHq: Halaqoh[] = [];
        snapHq.forEach((d) => listHq.push({ id: d.id, ...d.data() } as Halaqoh));
        listHq.sort((a, b) => a.nama.localeCompare(b.nama));
        setHalaqohs(listHq);

        const listSis: Siswa[] = [];
        snapSis.forEach((d) => listSis.push({ id: d.id, ...d.data() } as Siswa));
        listSis.sort((a, b) => a.nama.localeCompare(b.nama));
        setStudents(listSis);

        const listJrn: CatatanHarian[] = [];
        qJrn.forEach((d) => listJrn.push({ id: d.id, ...d.data() } as CatatanHarian));
        listJrn.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
        setJournals(listJrn);

        const listAbsSis: AbsenSiswa[] = [];
        qAbsSis.forEach((d) => listAbsSis.push({ id: d.id, ...d.data() } as AbsenSiswa));
        setStudentAttendances(listAbsSis);
      }
    } catch (error) {
      console.warn("Failed fetching action data from Firestore:", error);
      ensureFallbackData();
    }
  };

  // Trigger fetch only when appState or user ID changes
  useEffect(() => {
    fetchRoleData(appState, currentUser?.id);
  }, [appState, currentUser?.id]);

  const refreshAllData = async () => {
    await fetchRoleData(appState, currentUser?.id);
  };

  const handleLoginSuccess = (role: 'admin' | 'musyrif', userId?: string, userNama?: string) => {
    const now = Date.now();
    localStorage.setItem('absen_app_state', role);
    localStorage.setItem('absen_login_timestamp', now.toString());

    if (role === 'admin') {
      setAppState('admin');
      setCurrentUser(null);
      localStorage.removeItem('absen_current_user');
    } else {
      const user = {
        id: userId || '',
        nama: userNama || 'Musyrif'
      };
      setAppState('musyrif');
      setCurrentUser(user);
      localStorage.setItem('absen_current_user', JSON.stringify(user));
    }
  };

  const handleLogout = () => {
    setAppState('home');
    setCurrentUser(null);
    localStorage.removeItem('absen_app_state');
    localStorage.removeItem('absen_current_user');
    localStorage.removeItem('absen_login_timestamp');
  };

  if (appState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        {/* Modern clean Islamic pattern spinner */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
          <div className="w-10 h-10 rounded-full overflow-hidden">
            <img src={logoMinSukoharjo} alt="MIN 6" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        </div>
        <div className="text-center">
          <h3 className="font-extrabold text-sm sm:text-base tracking-wider text-slate-350">MIN 6 SUKOHARJO</h3>
          <p className="text-xs text-emerald-500 font-semibold tracking-widest uppercase mt-1">MARKAZ MUHIBBIL QUR'AN</p>
        </div>
        <p className="text-[10px] text-slate-500 font-medium">Sedang memprakarsai database Firebase...</p>
      </div>
    );
  }

  return (
    <>
      {appState === 'home' && (
        <HomeView
          onLoginSuccess={handleLoginSuccess}
          adminPass={adminPass}
          musyrifList={musyrifs}
          musyrifLoginEnabled={musyrifLoginEnabled}
          musyrifAttendances={musyrifAttendances}
        />
      )}

      {appState === 'admin' && (
        <AdminDashboard
          onLogout={handleLogout}
          classes={classes}
          students={students}
          musyrifs={musyrifs}
          halaqohs={halaqohs}
          journals={journals}
          adminPass={adminPass}
          musyrifLoginEnabled={musyrifLoginEnabled}
          musyrifAttendances={musyrifAttendances}
          refreshData={refreshAllData}
        />
      )}

      {appState === 'musyrif' && currentUser && (
        <MusyrifDashboard
          onLogout={handleLogout}
          userId={currentUser.id}
          userNama={currentUser.nama}
          classes={classes}
          students={students}
          halaqohs={halaqohs}
          journals={journals}
          studentAttendances={studentAttendances}
          refreshData={refreshAllData}
        />
      )}
    </>
  );
}
