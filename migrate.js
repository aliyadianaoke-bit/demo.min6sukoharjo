import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

// 1. Inisialisasi Firebase Admin dengan Service Account Key
let serviceAccount;
if (existsSync('./firebase-key.json')) {
  try {
    serviceAccount = JSON.parse(readFileSync('./firebase-key.json', 'utf8'));
    initializeApp({ credential: cert(serviceAccount) });
  } catch (err) {
    console.error("❌ Gagal membaca 'firebase-key.json':", err.message);
    process.exit(1);
  }
} else {
  console.log("⚠️ File 'firebase-key.json' tidak ditemukan di direktori root.");
  console.log("👉 Silakan unduh Service Account Key dari Firebase Console:");
  console.log("   (Project Settings -> Service Accounts -> Generate new private key)");
  console.log("   lalu simpan hasilnya sebagai file 'firebase-key.json' di direktori ini.\n");
}

const db = existsSync('./firebase-key.json') ? getFirestore() : null;

// 2. Inisialisasi Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'HTTPS_YOUR_SUPABASE_URL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const collections = [
  'classes',
  'halaqoh',
  'musyrif',
  'students',
  'catatan_harian',
  'absen_musyrif',
  'absen_siswa',
  'settings'
];

async function migrate() {
  if (!db) {
    console.error("❌ Tidak dapat menjalankan migrasi karena 'firebase-key.json' belum tersedia.");
    return;
  }

  if (supabaseUrl.includes('YOUR_SUPABASE') || supabaseServiceKey.includes('YOUR_SUPABASE')) {
    console.log("⚠️ PERHATIAN: Harap sesuaikan 'supabaseUrl' dan 'supabaseServiceKey' di dalam file migrate.js atau di .env sebelum menjalankan!");
  }

  console.log('🚀 Memulai proses migrasi dari Firebase Firestore ke Supabase...\n');

  for (const colName of collections) {
    console.log(`📦 Memindahkan koleksi: ${colName}...`);
    try {
      const snapshot = await db.collection(colName).get();
      const records = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        records.push({ id: doc.id, ...data });
      });

      if (records.length > 0) {
        const { error } = await supabase.from(colName).upsert(records);
        if (error) {
          console.error(`❌ Gagal migrasi '${colName}':`, error.message);
        } else {
          console.log(`✅ Berhasil memindahkan ${records.length} data ke tabel '${colName}' di Supabase.`);
        }
      } else {
        console.log(`ℹ️ Koleksi '${colName}' kosong di Firebase.`);
      }
    } catch (err) {
      console.error(`❌ Error saat mengambil data '${colName}':`, err.message);
    }
  }

  console.log('\n🎉 Proses migrasi selesai!');
}

migrate();
