import React, { useState } from 'react';
import { Download, Copy, Check, Database, FileCode, FileJson, X, ExternalLink } from 'lucide-react';

interface ExportSupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportSupabaseModal({ isOpen, onClose }: ExportSupabaseModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'sql' | 'json'>('sql');

  if (!isOpen) return null;

  const handleDownloadJson = () => {
    window.open('/api/export/json', '_blank');
  };

  const handleDownloadSql = () => {
    window.open('/api/export/sql', '_blank');
  };

  const handleCopySql = async () => {
    try {
      const res = await fetch('/api/export/sql');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      alert('Gagal menyalin SQL. Anda bisa mengunduh file supabase_migration.sql.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Eksport Database ke Supabase
                <span className="text-xs bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Siap Pindah
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Eksport semua tabel & data Firestore ke format PostgreSQL / JSON
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-300 text-sm">
          
          {/* Quick Actions / Download Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* SQL Card */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-emerald-500/50 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                    <FileCode className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100 text-sm">Migrasi SQL Supabase</h3>
                    <p className="text-xs text-slate-400">Schema Table & INSERT Statements (.sql)</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Skrip SQL lengkap berisi perancangan tabel PostgreSQL (<code className="text-emerald-300">CREATE TABLE</code>) dan seluruh data baris (<code className="text-emerald-300">INSERT INTO</code>).
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleDownloadSql}
                  className="flex-1 inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs py-2.5 px-3 rounded-lg transition-colors shadow-lg shadow-emerald-900/30"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh .sql</span>
                </button>
                <button
                  onClick={handleCopySql}
                  className="inline-flex items-center justify-center space-x-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-xs py-2.5 px-3 rounded-lg transition-colors border border-slate-600"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Tersalin!' : 'Salin SQL'}</span>
                </button>
              </div>
            </div>

            {/* JSON Card */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-blue-500/50 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
                    <FileJson className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100 text-sm">Eksport Full JSON</h3>
                    <p className="text-xs text-slate-400">Restrukturisasi Koleksi (.json)</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Berkas mentah JSON dari seluruh koleksi Firestore (<code className="text-blue-300">settings</code>, <code className="text-blue-300">classes</code>, <code className="text-blue-300">students</code>, <code className="text-blue-300">catatan_harian</code>, dll).
              </p>
              <div className="pt-2">
                <button
                  onClick={handleDownloadJson}
                  className="w-full inline-flex items-center justify-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white font-medium text-xs py-2.5 px-3 rounded-lg transition-colors border border-slate-600"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh exported_db.json</span>
                </button>
              </div>
            </div>

          </div>

          {/* Guide Steps to Move to Supabase */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <span>🚀 Langkah-Langkah Mengimpor ke Supabase:</span>
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 leading-relaxed">
              <li>
                Buka <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium">Dashboard Supabase Anda <ExternalLink className="w-3 h-3" /></a> dan pilih/buat proyek baru.
              </li>
              <li>
                Di menu sebelah kiri, buka menu <span className="font-semibold text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">SQL Editor</span>.
              </li>
              <li>
                Klik tombol <span className="font-semibold text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">+ New Query</span>.
              </li>
              <li>
                Klik tombol <span className="font-semibold text-emerald-400">"Salin SQL"</span> di atas atau buka file <code className="text-emerald-300">supabase_migration.sql</code> lalu paste ke dalam SQL Editor Supabase.
              </li>
              <li>
                Klik tombol <span className="font-semibold text-emerald-400">RUN</span> di Supabase. Seluruh tabel dan data awal akan otomatis terbuat!
              </li>
            </ol>
          </div>

          {/* Tabel yang Dieksport Summary */}
          <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-800">
            <h4 className="font-medium text-slate-300 text-xs mb-2">Daftar Tabel Terhitung:</h4>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700 font-mono">settings</span>
              <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700 font-mono">classes</span>
              <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700 font-mono">halaqoh</span>
              <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700 font-mono">musyrif</span>
              <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700 font-mono">students</span>
              <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700 font-mono">catatan_harian</span>
              <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700 font-mono">absen_musyrif</span>
              <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700 font-mono">absen_siswa</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
