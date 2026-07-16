import React, { useState, useEffect } from 'react';
import { db, seedInitialData } from './firebase';
import { collection, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { Kelas, Halaqoh, Siswa, Musyrif, CatatanHarian, AbsenSiswa } from './types';
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
  const [adminPass, setAdminPass] = useState('admin123'); // fallback default

  // Load and seed initial data once
  useEffect(() => {
    async function init() {
      // Seed if necessary
      await seedInitialData();
      setAppState('home');
    }
    init();
  }, []);

  // Fetch / Sync all collections in real-time
  useEffect(() => {
    // 1. Sync settings (admin password)
    const unsubSettings = onSnapshot(doc(db, 'settings', 'admin'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.adminPassword) {
          setAdminPass(data.adminPassword);
        }
      }
    });

    // 2. Sync classes
    const unsubClasses = onSnapshot(collection(db, 'classes'), (snap) => {
      const list: Kelas[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Kelas);
      });
      // Sort alphabetically
      list.sort((a, b) => a.nama.localeCompare(b.nama));
      setClasses(list);
    });

    // 3. Sync halaqoh
    const unsubHalaqoh = onSnapshot(collection(db, 'halaqoh'), (snap) => {
      const list: Halaqoh[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Halaqoh);
      });
      list.sort((a, b) => a.nama.localeCompare(b.nama));
      setHalaqohs(list);
    });

    // 4. Sync musyrif
    const unsubMusyrif = onSnapshot(collection(db, 'musyrif'), (snap) => {
      const list: Musyrif[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Musyrif);
      });
      list.sort((a, b) => a.nama.localeCompare(b.nama));
      setMusyrifs(list);
    });

    // 5. Sync students
    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      const list: Siswa[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Siswa);
      });
      // Sort by name
      list.sort((a, b) => a.nama.localeCompare(b.nama));
      setStudents(list);
    });

    // 6. Sync daily setoran journals
    const unsubCatatan = onSnapshot(collection(db, 'catatan_harian'), (snap) => {
      const list: CatatanHarian[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as CatatanHarian);
      });
      // Sort by newest date first
      list.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
      setJournals(list);
    });

    // 7. Sync student daily attendance
    const unsubAbsenSiswa = onSnapshot(collection(db, 'absen_siswa'), (snap) => {
      const list: AbsenSiswa[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as AbsenSiswa);
      });
      setStudentAttendances(list);
    });

    return () => {
      unsubSettings();
      unsubClasses();
      unsubHalaqoh();
      unsubMusyrif();
      unsubStudents();
      unsubCatatan();
      unsubAbsenSiswa();
    };
  }, []);

  const refreshAllData = async () => {
    // Already synced via onSnapshot listeners, but provides manual reload hook if needed
    console.log("Real-time listener handles sync. Refresh complete.");
  };

  const handleLoginSuccess = (role: 'admin' | 'musyrif', userId?: string, userNama?: string) => {
    if (role === 'admin') {
      setAppState('admin');
      setCurrentUser(null);
    } else {
      setAppState('musyrif');
      setCurrentUser({
        id: userId || '',
        nama: userNama || 'Musyrif'
      });
    }
  };

  const handleLogout = () => {
    setAppState('home');
    setCurrentUser(null);
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
