import React, { useState, useEffect } from 'react';
import { 
  seedInitialSupabaseData, 
  getSettings, 
  getClasses, 
  getHalaqohs, 
  getMusyrifs, 
  getStudents, 
  getJournals, 
  getAbsenMusyrif, 
  getAbsenSiswa 
} from './lib/supabaseService';
import { Kelas, Halaqoh, Siswa, Musyrif, CatatanHarian, AbsenSiswa, AbsenMusyrif } from './types';
import { isMusyrifAutoOff14 } from './utils';
import HomeView from './components/HomeView';
import AdminDashboard from './components/AdminDashboard';
import MusyrifDashboard from './components/MusyrifDashboard';
import logoMinSukoharjo from './assets/logo_min_sukoharjo.jpg';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught Error in UI:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-slate-800 p-6 rounded-2xl border border-red-500/30 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              ⚠️
            </div>
            <h2 className="text-lg font-bold text-slate-100">Terjadi Kesalahan Tampilan</h2>
            <p className="text-xs text-slate-400">
              {this.state.error?.message || "Terjadi kesalahan saat memproses data tampilan."}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg"
            >
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [appState, setAppState] = useState<'loading' | 'home' | 'admin' | 'musyrif'>('loading');
  const [currentUser, setCurrentUser] = useState<{ id: string; nama: string } | null>(null);

  // Supabase sync states
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [students, setStudents] = useState<Siswa[]>([]);
  const [musyrifs, setMusyrifs] = useState<Musyrif[]>([]);
  const [halaqohs, setHalaqohs] = useState<Halaqoh[]>([]);
  const [journals, setJournals] = useState<CatatanHarian[]>([]);
  const [studentAttendances, setStudentAttendances] = useState<AbsenSiswa[]>([]);
  const [musyrifAttendances, setMusyrifAttendances] = useState<AbsenMusyrif[]>([]);
  const [adminPass, setAdminPass] = useState('admin123'); // fallback default
  const [musyrifLoginEnabled, setMusyrifLoginEnabled] = useState(true);

  // Inactivity tracking for auto logout (10 minutes = 600,000 ms)
  const lastActivityRef = React.useRef<number>(Date.now());

  const handleLogout = () => {
    setAppState('home');
    setCurrentUser(null);
    localStorage.removeItem('absen_app_state');
    localStorage.removeItem('absen_current_user');
    localStorage.removeItem('absen_login_timestamp');
  };

  // Load and seed initial data once
  useEffect(() => {
    async function init() {
      try {
        await seedInitialSupabaseData();
      } catch (e) {
        console.warn("Seeding initial Supabase data warning:", e);
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

      if (appState === 'musyrif' && currentUser?.id) {
        if (isMusyrifAutoOff14(currentUser.id, musyrifAttendances)) {
          alert('⚠️ Akses login dinonaktifkan otomatis karena Anda belum melakukan absensi hingga pukul 14.00 WIB. Akun akan terbuka kembali secara otomatis pada pukul 18.00 WIB.');
          handleLogout();
        }
      }
    }, 15000);

    return () => clearInterval(checkInterval);
  }, [appState, currentUser, musyrifAttendances]);

  // Auto Logout after 10 minutes of inactivity
  useEffect(() => {
    if (appState === 'home' || appState === 'loading') return;

    lastActivityRef.current = Date.now();

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'pointerdown'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    const inactivityCheckInterval = setInterval(() => {
      const tenMinutesInMs = 10 * 60 * 1000;
      const inactiveDuration = Date.now() - lastActivityRef.current;

      if (inactiveDuration >= tenMinutesInMs) {
        alert('⚠️ Sesi Anda telah berakhir secara otomatis karena tidak ada aktivitas selama 10 menit.');
        handleLogout();
      }
    }, 5000);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearInterval(inactivityCheckInterval);
    };
  }, [appState]);

  // Fetch / Load data strictly ON DEMAND
  const fetchRoleData = async (targetState: 'loading' | 'home' | 'admin' | 'musyrif', targetUserId?: string) => {
    try {
      const settings = await getSettings();
      if (settings?.adminPassword) setAdminPass(settings.adminPassword);
      if (typeof settings?.musyrifLoginEnabled === 'boolean') setMusyrifLoginEnabled(settings.musyrifLoginEnabled);

      const listMus = await getMusyrifs();
      setMusyrifs(listMus);

      if (targetState === 'home' || targetState === 'loading') {
        setClasses([]);
        setHalaqohs([]);
        setStudents([]);
        setJournals([]);
        setStudentAttendances([]);
        setMusyrifAttendances([]);
        return;
      }

      if (targetState === 'admin') {
        const [listAbsMus, listKls, listHq, listSis, listJrn, listAbsSis] = await Promise.all([
          getAbsenMusyrif(undefined, 50),
          getClasses(),
          getHalaqohs(),
          getStudents(),
          getJournals(100),
          getAbsenSiswa(undefined, 100)
        ]);

        setMusyrifAttendances(listAbsMus);
        setClasses(listKls);
        setHalaqohs(listHq);
        setStudents(listSis);
        setJournals(listJrn);
        setStudentAttendances(listAbsSis);
      }

      if (targetState === 'musyrif') {
        const mId = targetUserId || currentUser?.id;
        const [listAbsMus, listKls, listHq, listSis, listJrn, listAbsSis] = await Promise.all([
          getAbsenMusyrif(mId, 30),
          getClasses(),
          getHalaqohs(),
          getStudents(),
          getJournals(100),
          getAbsenSiswa(mId, 50)
        ]);

        setMusyrifAttendances(listAbsMus);
        setClasses(listKls);
        setHalaqohs(listHq);
        setStudents(listSis);
        setJournals(listJrn);
        setStudentAttendances(listAbsSis);
      }
    } catch (error) {
      console.warn("Failed fetching data from Supabase:", error);
    }
  };

  useEffect(() => {
    fetchRoleData(appState, currentUser?.id);
  }, [appState, currentUser?.id]);

  const refreshAllData = async () => {
    await fetchRoleData(appState, currentUser?.id);
  };

  const handleLoginSuccess = (role: 'admin' | 'musyrif', userId?: string, userNama?: string) => {
    const now = Date.now();
    lastActivityRef.current = now;
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

  if (appState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
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
        <p className="text-[10px] text-slate-500 font-medium">Sedang memproses database Supabase...</p>
      </div>
    );
  }



  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
