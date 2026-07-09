import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCtHjQv6MDfENJHHPouIzvZLKVaOxkCwKU",
  authDomain: "gen-lang-client-0478761458.firebaseapp.com",
  projectId: "gen-lang-client-0478761458",
  storageBucket: "gen-lang-client-0478761458.firebasestorage.app",
  messagingSenderId: "570049439235",
  appId: "1:570049439235:web:3d5c8b9c0a912d750f5036"
};

const app = initializeApp(firebaseConfig);
// Initialize Firestore with specific database ID
export const db = getFirestore(app, "ai-studio-335dd8de-a015-4eda-8dd1-3c5f21c7e92e");
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Seed function to initialize basic settings, demo classes, and demo accounts
export async function seedInitialData() {
  try {
    const settingsCol = collection(db, 'settings');
    const settingsSnap = await getDocs(settingsCol);
    
    if (settingsSnap.empty) {
      // Create admin document with default password "admin123"
      await setDoc(doc(db, 'settings', 'admin'), {
        adminPassword: 'admin123'
      });

      // Seed a few demo classes
      const demoClasses = [
        { id: 'kls-1', nama: 'Kelas 1A' },
        { id: 'kls-2', nama: 'Kelas 2B' },
        { id: 'kls-3', nama: 'Kelas 3A' },
        { id: 'kls-4', nama: 'Kelas 4A' },
        { id: 'kls-5', nama: 'Kelas 5B' },
        { id: 'kls-6', nama: 'Kelas 6A' }
      ];
      for (const item of demoClasses) {
        await setDoc(doc(db, 'classes', item.id), { nama: item.nama });
      }

      // Seed a few Halaqoh
      const demoHalaqoh = [
        { id: 'hq-1', nama: 'Halaqoh Al-Kahfi', musyrifId: 'usr-1', musyrifNama: 'Ahmad Muzakki, S.Pd.' },
        { id: 'hq-2', nama: 'Halaqoh An-Nur', musyrifId: 'usr-2', musyrifNama: 'Umar Al-Faruq' },
        { id: 'hq-3', nama: 'Halaqoh At-Tin', musyrifId: '', musyrifNama: 'Belum Ditentukan' }
      ];
      for (const item of demoHalaqoh) {
        await setDoc(doc(db, 'halaqoh', item.id), {
          nama: item.nama,
          musyrifId: item.musyrifId,
          musyrifNama: item.musyrifNama
        });
      }

      // Seed dual Musyrifs
      const demoMusyrifs = [
        { 
          id: 'usr-1', 
          nim: '202601001', 
          nama: 'Ahmad Muzakki, S.Pd.', 
          username: 'ahmad', 
          password: 'password123',
          halaqohId: 'hq-1',
          halaqohNama: 'Halaqoh Al-Kahfi'
        },
        { 
          id: 'usr-2', 
          nim: '202601002', 
          nama: 'Umar Al-Faruq', 
          username: 'umar', 
          password: 'password123',
          halaqohId: 'hq-2',
          halaqohNama: 'Halaqoh An-Nur'
        }
      ];
      for (const item of demoMusyrifs) {
        await setDoc(doc(db, 'musyrif', item.id), item);
      }

      // Seed demo students
      const demoSiswa = [
        { id: 'sis-1', noInduk: '1001', nama: 'Abdurrahman Wahid', kelasId: 'kls-1', kelasNama: 'Kelas 1A', halaqohId: 'hq-1', halaqohNama: 'Halaqoh Al-Kahfi' },
        { id: 'sis-2', noInduk: '1002', nama: 'Aisyah Humaira', kelasId: 'kls-1', kelasNama: 'Kelas 1A', halaqohId: 'hq-1', halaqohNama: 'Halaqoh Al-Kahfi' },
        { id: 'sis-3', noInduk: '1003', nama: 'Muhammad Bilal', kelasId: 'kls-2', kelasNama: 'Kelas 2B', halaqohId: 'hq-1', halaqohNama: 'Halaqoh Al-Kahfi' },
        { id: 'sis-4', noInduk: '1004', nama: 'Fathimah Az-Zahra', kelasId: 'kls-2', kelasNama: 'Kelas 2B', halaqohId: 'hq-2', halaqohNama: 'Halaqoh An-Nur' },
        { id: 'sis-5', noInduk: '1005', nama: 'Yusuf Al-Banjari', kelasId: 'kls-3', kelasNama: 'Kelas 3A', halaqohId: 'hq-2', halaqohNama: 'Halaqoh An-Nur' },
        { id: 'sis-6', noInduk: '1006', nama: 'Khadijah Al-Kubra', kelasId: 'kls-3', kelasNama: 'Kelas 3A', halaqohId: 'hq-3', halaqohNama: 'Halaqoh At-Tin' }
      ];
      for (const item of demoSiswa) {
        await setDoc(doc(db, 'students', item.id), item);
      }

      // Seed a few historic journal entries for demo
      const demoCatatan = [
        {
          id: 'cat-1',
          tanggal: '2026-06-18',
          siswaId: 'sis-1',
          siswaNama: 'Abdurrahman Wahid',
          noInduk: '1001',
          kelasNama: 'Kelas 1A',
          halaqohId: 'hq-1',
          materiSetoran: 'An-Naba 1-15',
          evaluasiTahsin: 'Tahsin sangat lancar, perlu menjaga panjang pendek pada mad wajib.',
          nilai: 'A'
        },
        {
          id: 'cat-2',
          tanggal: '2026-06-18',
          siswaId: 'sis-2',
          siswaNama: 'Aisyah Humaira',
          noInduk: '1002',
          kelasNama: 'Kelas 1A',
          halaqohId: 'hq-1',
          materiSetoran: 'An-Nazi\'at 1-20',
          evaluasiTahsin: 'Hafalan agak terbata-bata di ayat 12-15, perlu muraja\'ah kembali.',
          nilai: 'C'
        },
        {
          id: 'cat-3',
          tanggal: '2026-06-19',
          siswaId: 'sis-1',
          siswaNama: 'Abdurrahman Wahid',
          noInduk: '1001',
          kelasNama: 'Kelas 1A',
          halaqohId: 'hq-1',
          materiSetoran: 'An-Naba 16-30',
          evaluasiTahsin: 'Bagus sekali, bacaannya tartil dan makhrajnya tepat.',
          nilai: 'A'
        },
        {
          id: 'cat-4',
          tanggal: '2026-06-19',
          siswaId: 'sis-2',
          siswaNama: 'Aisyah Humaira',
          noInduk: '1002',
          kelasNama: 'Kelas 1A',
          halaqohId: 'hq-1',
          materiSetoran: 'An-Nazi\'at 21-46',
          evaluasiTahsin: 'Ada peningkatan dari kemarin, pertahankan mad lazim-nya.',
          nilai: 'B'
        },
        {
          id: 'cat-5',
          tanggal: '2026-06-19',
          siswaId: 'sis-4',
          siswaNama: 'Fathimah Az-Zahra',
          noInduk: '1004',
          kelasNama: 'Kelas 2B',
          halaqohId: 'hq-2',
          materiSetoran: 'Abasa 1-20',
          evaluasiTahsin: 'Alhamdulillah sudah setoran dengan tajwid yang memadai.',
          nilai: 'B'
        }
      ];
      for (const item of demoCatatan) {
        await setDoc(doc(db, 'catatan_harian', item.id), item);
      }

      console.log("Firebase initial data seeded successfully.");
    }
  } catch (error) {
    console.error("Error seeding initial data:", error);
    handleFirestoreError(error, OperationType.WRITE, 'seed_initial_data');
  }
}
