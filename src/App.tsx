import React, { useState, useEffect } from 'react';
import { db, seedInitialData, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, doc, query, orderBy, limit } from 'firebase/firestore';
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

  // Fetch / Sync collections with Quota Savings Mode (Scoped Listening + Query Limits + Error Callbacks)
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    // 1. Settings (admin password and musyrif login status) - Always active (lightweight doc listener)
    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'admin'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.adminPassword) {
            setAdminPass(data.adminPassword);
          }
          if (data && typeof data.musyrifLoginEnabled === 'boolean') {
            setMusyrifLoginEnabled(data.musyrifLoginEnabled);
          } else {
            setMusyrifLoginEnabled(true);
          }
        }
      },
      (error) => {
        ensureFallbackData();
        handleFirestoreError(error, OperationType.GET, 'settings/admin');
      }
    );
    unsubs.push(unsubSettings);

    // 2. Musyrif List - Always active for home login modal & dashboard
    const unsubMusyrif = onSnapshot(
      collection(db, 'musyrif'),
      (snap) => {
        const list: Musyrif[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Musyrif);
        });
        list.sort((a, b) => a.nama.localeCompare(b.nama));
        setMusyrifs(list);
      },
      (error) => {
        ensureFallbackData();
        handleFirestoreError(error, OperationType.GET, 'musyrif');
      }
    );
    unsubs.push(unsubMusyrif);

    // 3. Musyrif Attendance - Query recent records with limit(50) to save reads
    const qAbsenMusyrif = query(
      collection(db, 'absen_musyrif'),
      orderBy('tanggal', 'desc'),
      limit(50)
    );
    const unsubAbsenMusyrif = onSnapshot(
      qAbsenMusyrif,
      (snap) => {
        const list: AbsenMusyrif[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as AbsenMusyrif);
        });
        setMusyrifAttendances(list);
      },
      (error) => {
        ensureFallbackData();
        handleFirestoreError(error, OperationType.GET, 'absen_musyrif');
      }
    );
    unsubs.push(unsubAbsenMusyrif);

    // ONLY LISTEN TO HEAVY/MANAGEMENT COLLECTIONS WHEN IN ADMIN OR MUSYRIF DASHBOARD
    // This prevents unauthenticated home page visitors from executing reads on classes, halaqoh, students, journals, student attendance!
    if (appState === 'admin' || appState === 'musyrif') {
      // 4. Classes
      const unsubClasses = onSnapshot(
        collection(db, 'classes'),
        (snap) => {
          const list: Kelas[] = [];
          snap.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as Kelas);
          });
          list.sort((a, b) => a.nama.localeCompare(b.nama));
          setClasses(list);
        },
        (error) => {
          ensureFallbackData();
          handleFirestoreError(error, OperationType.GET, 'classes');
        }
      );
      unsubs.push(unsubClasses);

      // 5. Halaqoh
      const unsubHalaqoh = onSnapshot(
        collection(db, 'halaqoh'),
        (snap) => {
          const list: Halaqoh[] = [];
          snap.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as Halaqoh);
          });
          list.sort((a, b) => a.nama.localeCompare(b.nama));
          setHalaqohs(list);
        },
        (error) => {
          ensureFallbackData();
          handleFirestoreError(error, OperationType.GET, 'halaqoh');
        }
      );
      unsubs.push(unsubHalaqoh);

      // 6. Students
      const unsubStudents = onSnapshot(
        collection(db, 'students'),
        (snap) => {
          const list: Siswa[] = [];
          snap.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as Siswa);
          });
          list.sort((a, b) => a.nama.localeCompare(b.nama));
          setStudents(list);
        },
        (error) => {
          ensureFallbackData();
          handleFirestoreError(error, OperationType.GET, 'students');
        }
      );
      unsubs.push(unsubStudents);

      // 7. Daily Setoran Journals - Bounded by limit(100) sorted by newest date first
      const qCatatan = query(
        collection(db, 'catatan_harian'),
        orderBy('tanggal', 'desc'),
        limit(100)
      );
      const unsubCatatan = onSnapshot(
        qCatatan,
        (snap) => {
          const list: CatatanHarian[] = [];
          snap.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as CatatanHarian);
          });
          list.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
          setJournals(list);
        },
        (error) => {
          ensureFallbackData();
          handleFirestoreError(error, OperationType.GET, 'catatan_harian');
        }
      );
      unsubs.push(unsubCatatan);

      // 8. Student Daily Attendance - Bounded by limit(100) sorted by date
      const qAbsenSiswa = query(
        collection(db, 'absen_siswa'),
        orderBy('tanggal', 'desc'),
        limit(100)
      );
      const unsubAbsenSiswa = onSnapshot(
        qAbsenSiswa,
        (snap) => {
          const list: AbsenSiswa[] = [];
          snap.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as AbsenSiswa);
          });
          setStudentAttendances(list);
        },
        (error) => {
          ensureFallbackData();
          handleFirestoreError(error, OperationType.GET, 'absen_siswa');
        }
      );
      unsubs.push(unsubAbsenSiswa);
    }

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [appState]);

  const refreshAllData = async () => {
    // Already synced via onSnapshot listeners, but provides manual reload hook if needed
    console.log("Real-time listener handles sync. Refresh complete.");
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
