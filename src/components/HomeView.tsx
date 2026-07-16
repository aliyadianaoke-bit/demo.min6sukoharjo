import React, { useState } from 'react';
import { BookOpen, LogIn, Lock, User, Sparkles, Heart, Target, Award, ShieldCheck, HelpCircle } from 'lucide-react';
import logoMinSukoharjo from '../assets/logo_min_sukoharjo.jpg';

interface HomeViewProps {
  onLoginSuccess: (role: 'admin' | 'musyrif', userId?: string, userNama?: string) => void;
  adminPass: string;
  musyrifList: Array<{ id: string; nama: string; username: string; password?: string }>;
}

export default function HomeView({ onLoginSuccess, adminPass, musyrifList }: HomeViewProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'musyrif'>('musyrif');
  
  // Login form fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (selectedRole === 'admin') {
      if (adminPasswordInput === adminPass) {
        onLoginSuccess('admin');
        setShowLoginModal(false);
      } else {
        setErrorMsg('Password Admin salah!');
      }
    } else {
      // Find Musyrif with matching username and password
      const found = musyrifList.find(
        (m) => m.username.toLowerCase() === username.toLowerCase() && m.password === password
      );
      if (found) {
        onLoginSuccess('musyrif', found.id, found.nama);
        setShowLoginModal(false);
      } else {
        setErrorMsg('Username atau Password Musyrif salah!');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md shadow-emerald-200">
            <img src={logoMinSukoharjo} alt="Logo MIN 6 Sukoharjo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-800 uppercase tracking-wide leading-tight">
              MIN 6 SUKOHARJO
            </h1>
            <p className="text-xs text-emerald-600 font-medium tracking-wider">
              MARKAZ MUHIBBIL QUR'AN
            </p>
          </div>
        </div>
        
        <button
          id="login-btn"
          onClick={() => {
            setErrorMsg('');
            setShowLoginModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition duration-150 rounded-xl shadow-md hover:shadow-lg hover:shadow-emerald-100 cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          <span>Masuk</span>
        </button>
      </header>

      {/* Hero Banner Section */}
      <section className="relative bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-950 text-white py-16 px-4 overflow-hidden shadow-inner">
        {/* Abstract background shapes */}
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-10 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-emerald-200 text-xs font-semibold tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sistem Informasi Jurnal Tahfidz Elektronik</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Portal Tahfidz Al-Qur'an <br />
            <span className="text-emerald-400 bg-clip-text">Markaz Muhibbil Qur'an</span>
          </h2>
          <p className="text-slate-200 text-sm sm:text-base max-w-2xl mx-auto font-medium">
            Membentuk generasi Qur'ani yang cinta Al-Qur'an, mutqin hafalan, serta berakhlak mulia di lingkungan MIN 6 Sukoharjo.
          </p>
        </div>
      </section>

      {/* Main Content: Visi, Misi, Tujuan, Prinsip */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-12 space-y-12">
        
        {/* Banner Quick info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Heart className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Cinta Al-Qur'an</h4>
            <p className="text-xs text-slate-500">Menumbuhkan kecintaan mendalam pada kalamullah dalam setiap helaan nafas.</p>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Hafalan Mutqin</h4>
            <p className="text-xs text-slate-500">Membina materi setoran agar kokoh, kuat, dan melekat dalam ingatan.</p>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Standar Rasulullah</h4>
            <p className="text-xs text-slate-500">Mempelajari cara melantunkan bacaan sesuai kaidah tahsin & tajwid mutabar.</p>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Aman & Terukur</h4>
            <p className="text-xs text-slate-500">Pencatatan perkembangan harian santri secara akurat dan transparan.</p>
          </div>
        </div>

        {/* Visi & Misi */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Visi */}
          <div className="md:col-span-12 lg:col-span-5 p-8 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-10 -translate-y-10" />
            <div className="space-y-4 relative z-10">
              <span className="px-3 py-1 bg-white/20 rounded-full font-bold uppercase tracking-wider text-xs">
                I. VISI
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold leading-snug">
                Terwujudnya Generasi Qur'ani
              </h3>
              <p className="text-sm sm:text-base leading-relaxed font-light text-emerald-50/90 text-justify">
                "Terwujudnya generasi Qur’ani yang cinta Qur’an, Hafidz Qur’an yang mutqin ( kuat ) dalam hafalannya serta memiliki bacaan yang bagus sesuai dengan standar tahsin yang diajarkan Rasulullah."
              </p>
            </div>
            <div className="pt-6 border-t border-white/20 text-xs text-emerald-100/70 font-semibold uppercase tracking-wider mt-6">
              Markaz Muhibbil Qur'an MIN 6 Sukoharjo
            </div>
          </div>

          {/* Misi */}
          <div className="md:col-span-12 lg:col-span-7 p-8 bg-white border border-slate-100 shadow-md rounded-3xl space-y-6">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full font-bold uppercase tracking-wider text-xs">
                II. MISI
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-800">
              Menjaga Kualitas & Kebiasaan Mulia
            </h3>
            <ul className="space-y-4">
              {[
                "Membina kebiasaan dan kecintaan santri untuk selalu membaca dan menghafal Qur’an.",
                "Melaksanakan pembelajaran tahsin dan tahfidz secara intensif.",
                "Melaksanakan ujian secara berkala untuk menjaga hafalan siswa dan siswi.",
                "Membawa model baru bagi wali santri tentang keutamaan menghafal Qur’an dan menjaga hafalannya dengan baik bukan sekedar pernah menghafal dan hafal."
              ].map((misi, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-600 leading-relaxed text-justify">
                  <span className="flex-none w-6 h-6 rounded-lg bg-emerald-50 text-emerald-750 font-bold text-xs flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span>{misi}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Tujuan & Prinsip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Tujuan */}
          <div className="p-8 bg-white border border-slate-100 shadow-md rounded-3xl space-y-6">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-teal-50 border border-teal-200 text-teal-700 rounded-full font-bold uppercase tracking-wider text-xs">
                III. TUJUAN
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-800">Target Belajar Santri</h3>
            <ul className="space-y-4">
              {[
                "Program Bagian Tahfidz ini bertujuan untuk mengaplikasikan visi dan misi Darul Muhibbil Qur’an dan MIN 6 Sukoharjo.",
                "Hadirnya dan tumbuhnya rasa Cinta terhadap Qur’an pada setiap siswa MIN 6 Sukoharjo.",
                "Setiap siswa mampu membaca Qur’an dengan kaidah yang berlaku dan benar.",
                "Hafal 2 Juz hingga 3 Juz atau bisa lebih dengan baik dan benar sesuai standar kelulusan yang dibuat oleh bagian Tahfidz, dengan catatan mampu mempertanggungjawabkan hafalan yang dimiliki."
              ].map((tujuan, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-600 leading-relaxed text-justify">
                  <span className="flex-none p-1.5 w-6 h-6 rounded-full bg-teal-50 border border-teal-100 text-teal-750 font-bold text-xs flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span>{tujuan}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Prinsip */}
          <div className="p-8 bg-amber-50/50 border border-amber-100/80 rounded-3xl flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-bold uppercase tracking-wider text-xs">
                  IV. PRINSIP TAHFIDZ
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 leading-snug">
                "Bukan Hanya Sekadar Setoran, Melainkan Tanggung Jawab Hafalan"
              </h3>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed text-justify italic">
                “Prinsip yang akan diterapkan di Darul Muhibbil Qur’an MIN 6 Sukoharjo berprinsip pada <strong className="text-slate-800 font-bold">benar, lancar, kuat dan bagus dalam hafalan</strong>, bukan banyaknya setoran akan tetapi tidak bisa mempertanggungjawabkan hafalannya.”
              </p>
            </div>

            <div className="mt-8 bg-white p-4 rounded-2xl border border-amber-150 flex items-center gap-3">
              <span className="text-xl">💡</span>
              <p className="text-xs text-slate-500 font-medium">
                Sistem Jurnal Tahfidz ini dirancang khusus untuk mewujudkan prinsip di atas dengan mempermudah asatidzah mencatat kualitas hafalan santri.
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 mt-12 px-4 border-t border-slate-800">
        <div className="max-w-5xl mx-auto text-center space-y-3">
          <p className="text-sm font-semibold text-slate-300">
            MIN 6 SUKOHARJO — PROGRAM TAHFIDZ MARKAZ MUHIBBIL QUR'AN
          </p>
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Markaz Muhibbil Qur'an. All rights reserved.
          </p>
          <div className="flex justify-center gap-4 text-xs font-medium text-emerald-500 pt-2">
            <span>Kabupaten Sukoharjo, Jawa Tengah</span>
            <span>•</span>
            <span>Mudah & Praktis</span>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-emerald-800 text-white p-6 relative">
              <button
                onClick={() => {
                  setShowLoginModal(false);
                }}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
              <h3 className="text-lg font-bold">Sistem Login Portal</h3>
              <p className="text-xs text-emerald-250 mt-1">
                Silahkan pilih hak akses Anda untuk mengelola data tahfidz
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Role Toggle Selector */}
              <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('musyrif');
                    setErrorMsg('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedRole === 'musyrif'
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>MUSYRIF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('admin');
                    setErrorMsg('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedRole === 'admin'
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>ADMIN</span>
                </button>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-semibold">
                    ⚠️ {errorMsg}
                  </div>
                )}

                {selectedRole === 'musyrif' ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block">Username Musyrif</label>
                      <input
                        type="text"
                        required
                        placeholder="Masukkan username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block">Password</label>
                      <input
                        type="password"
                        required
                        placeholder="Masukkan password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">Password Administrator</label>
                    <input
                      type="password"
                      required
                      placeholder="Masukkan password admin"
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold rounded-xl text-sm shadow-md transition duration-150 cursor-pointer"
                >
                  Masuk Sekarang
                </button>
              </form>



            </div>
          </div>
        </div>
      )}
    </div>
  );
}
