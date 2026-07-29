import { supabase, isSupabaseConfigured } from './supabase';
import { db, seedInitialData } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { Kelas, Halaqoh, Siswa, Musyrif, CatatanHarian, AbsenSiswa, AbsenMusyrif } from '../types';

const safeString = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null) {
    return val.nama || val.value || val.title || JSON.stringify(val);
  }
  return String(val);
};

// Fallback in-memory store
let memorySettings = { adminPassword: 'admin123', musyrifLoginEnabled: true };

let memoryClasses: Kelas[] = [
  { id: 'kls-1', nama: 'Kelas 1A' },
  { id: 'kls-2', nama: 'Kelas 2B' },
  { id: 'kls-3', nama: 'Kelas 3A' },
  { id: 'kls-4', nama: 'Kelas 4A' },
  { id: 'kls-5', nama: 'Kelas 5B' },
  { id: 'kls-6', nama: 'Kelas 6A' }
];

let memoryHalaqohs: Halaqoh[] = [
  { id: 'hq-1', nama: 'Halaqoh Al-Kahfi', musyrifId: 'usr-1', musyrifNama: 'Ahmad Muzakki, S.Pd.' },
  { id: 'hq-2', nama: 'Halaqoh An-Nur', musyrifId: 'usr-2', musyrifNama: 'Umar Al-Faruq' },
  { id: 'hq-3', nama: 'Halaqoh At-Tin', musyrifId: '', musyrifNama: 'Belum Ditentukan' }
];

let memoryMusyrifs: Musyrif[] = [
  { id: 'usr-1', nim: '202601001', nama: 'Ahmad Muzakki, S.Pd.', username: 'ahmad', password: 'password123', halaqohId: 'hq-1', halaqohNama: 'Halaqoh Al-Kahfi' },
  { id: 'usr-2', nim: '202601002', nama: 'Umar Al-Faruq', username: 'umar', password: 'password123', halaqohId: 'hq-2', halaqohNama: 'Halaqoh An-Nur' }
];

let memoryStudents: Siswa[] = [
  { id: 'sis-1', noInduk: '1001', nama: 'Abdurrahman Wahid', kelasId: 'kls-1', kelasNama: 'Kelas 1A', halaqohId: 'hq-1', halaqohNama: 'Halaqoh Al-Kahfi' },
  { id: 'sis-2', noInduk: '1002', nama: 'Aisyah Humaira', kelasId: 'kls-1', kelasNama: 'Kelas 1A', halaqohId: 'hq-1', halaqohNama: 'Halaqoh Al-Kahfi' },
  { id: 'sis-3', noInduk: '1003', nama: 'Muhammad Bilal', kelasId: 'kls-2', kelasNama: 'Kelas 2B', halaqohId: 'hq-1', halaqohNama: 'Halaqoh Al-Kahfi' },
  { id: 'sis-4', noInduk: '1004', nama: 'Fathimah Az-Zahra', kelasId: 'kls-2', kelasNama: 'Kelas 2B', halaqohId: 'hq-2', halaqohNama: 'Halaqoh An-Nur' },
  { id: 'sis-5', noInduk: '1005', nama: 'Yusuf Al-Banjari', kelasId: 'kls-3', kelasNama: 'Kelas 3A', halaqohId: 'hq-2', halaqohNama: 'Halaqoh An-Nur' },
  { id: 'sis-6', noInduk: '1006', nama: 'Khadijah Al-Kubra', kelasId: 'kls-3', kelasNama: 'Kelas 3A', halaqohId: 'hq-3', halaqohNama: 'Halaqoh At-Tin' }
];

let memoryJournals: CatatanHarian[] = [
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
  }
];

let memoryAbsenMusyrif: AbsenMusyrif[] = [];
let memoryAbsenSiswa: AbsenSiswa[] = [];

// Helper to generate IDs
export const generateId = (prefix: string = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

// 1. Seed initial data into Cloud Database
export async function seedInitialSupabaseData() {
  try {
    await seedInitialData();
  } catch (e) {
    console.warn("Firestore seed check:", e);
  }

  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    const { data: settingsData, error } = await supabase.from('settings').select('*').limit(1);
    
    if (error || !settingsData || settingsData.length === 0) {
      console.info("Seeding initial data into Supabase...");
      
      await supabase.from('settings').upsert({ id: 'admin', adminPassword: 'admin123', musyrifLoginEnabled: true });

      for (const item of memoryClasses) {
        await supabase.from('classes').upsert(item);
      }
      for (const item of memoryHalaqohs) {
        await supabase.from('halaqoh').upsert(item);
      }
      for (const item of memoryMusyrifs) {
        await supabase.from('musyrif').upsert(item);
      }
      for (const item of memoryStudents) {
        await supabase.from('students').upsert(item);
      }
      for (const item of memoryJournals) {
        await supabase.from('catatan_harian').upsert(item);
      }
      console.info("Supabase database successfully seeded with initial schema data.");
    }
  } catch (err) {
    console.warn("Supabase seeding check encountered an issue:", err);
  }
}

// SETTINGS
export async function getSettings() {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 'admin').single();
      if (!error && data) return data;
    } catch (e) {
      console.warn("Using Firestore/memory fallback for settings:", e);
    }
  }
  try {
    const docSnap = await getDoc(doc(db, 'settings', 'admin'));
    if (docSnap.exists()) {
      const data = docSnap.data();
      memorySettings = { ...memorySettings, ...data };
      return memorySettings;
    } else {
      await setDoc(doc(db, 'settings', 'admin'), memorySettings);
    }
  } catch (e) {
    console.warn("Firestore getSettings failed:", e);
  }
  return memorySettings;
}

export async function updateSettings(updates: Partial<{ adminPassword: string; musyrifLoginEnabled: boolean }>) {
  memorySettings = { ...memorySettings, ...updates };
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('settings').upsert({ id: 'admin', ...memorySettings });
    } catch (e) {
      console.warn("Failed updating Supabase settings:", e);
    }
  }
  try {
    await setDoc(doc(db, 'settings', 'admin'), memorySettings, { merge: true });
  } catch (e) {
    console.warn("Failed updating Firestore settings:", e);
  }
  return memorySettings;
}

// CLASSES
export async function getClasses(): Promise<Kelas[]> {
  let list: Kelas[] = [];
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('classes').select('*').order('nama', { ascending: true });
      if (!error && data && data.length > 0) list = data as Kelas[];
    } catch (e) {
      console.warn("Supabase getClasses error:", e);
    }
  }

  if (list.length === 0) {
    try {
      const snap = await getDocs(collection(db, 'classes'));
      if (!snap.empty) {
        const fsList: Kelas[] = [];
        snap.forEach(d => { fsList.push({ id: d.id, ...d.data() } as Kelas); });
        if (fsList.length > 0) list = fsList;
      } else {
        for (const item of memoryClasses) {
          await setDoc(doc(db, 'classes', item.id), item);
        }
        list = memoryClasses;
      }
    } catch (e) {
      console.warn("Firestore getClasses error:", e);
      list = memoryClasses;
    }
  }

  return list.map(c => ({
    ...c,
    id: String(c.id || ''),
    nama: safeString(c.nama)
  }));
}

export async function addClass(input: string | { nama: string }): Promise<Kelas> {
  const namaStr = typeof input === 'string' ? input : (input && (input as any).nama ? (input as any).nama : String(input || ''));
  const newClass: Kelas = { id: generateId('kls'), nama: namaStr };
  
  memoryClasses.push(newClass);

  try {
    await setDoc(doc(db, 'classes', newClass.id), newClass);
  } catch (e) {
    console.warn("Failed adding class to Firestore:", e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('classes').insert(newClass);
    } catch (e) {
      console.warn("Failed adding class to Supabase:", e);
    }
  }

  return newClass;
}

export async function updateClass(id: string, input: string | { nama: string }): Promise<void> {
  const namaStr = typeof input === 'string' ? input : (input && (input as any).nama ? (input as any).nama : String(input || ''));
  memoryClasses = memoryClasses.map(c => c.id === id ? { ...c, nama: namaStr } : c);

  try {
    await setDoc(doc(db, 'classes', id), { nama: namaStr }, { merge: true });
  } catch (e) {
    console.warn("Failed updating class in Firestore:", e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('classes').update({ nama: namaStr }).eq('id', id);
    } catch (e) {
      console.warn("Failed updating class in Supabase:", e);
    }
  }
}

export async function deleteClass(id: string): Promise<void> {
  memoryClasses = memoryClasses.filter(c => c.id !== id);

  try {
    await deleteDoc(doc(db, 'classes', id));
  } catch (e) {
    console.warn("Failed deleting class in Firestore:", e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('classes').delete().eq('id', id);
    } catch (e) {
      console.warn("Failed deleting class in Supabase:", e);
    }
  }
}

// HALAQOH
export async function getHalaqohs(): Promise<Halaqoh[]> {
  let list: Halaqoh[] = [];
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('halaqoh').select('*').order('nama', { ascending: true });
      if (!error && data && data.length > 0) list = data as Halaqoh[];
    } catch (e) {
      console.warn("Supabase getHalaqohs error:", e);
    }
  }

  if (list.length === 0) {
    try {
      const snap = await getDocs(collection(db, 'halaqoh'));
      if (!snap.empty) {
        const fsList: Halaqoh[] = [];
        snap.forEach(d => { fsList.push({ id: d.id, ...d.data() } as Halaqoh); });
        if (fsList.length > 0) list = fsList;
      } else {
        for (const item of memoryHalaqohs) {
          await setDoc(doc(db, 'halaqoh', item.id), item);
        }
        list = memoryHalaqohs;
      }
    } catch (e) {
      console.warn("Firestore getHalaqohs error:", e);
      list = memoryHalaqohs;
    }
  }

  return list.map(h => ({
    ...h,
    id: String(h.id || ''),
    nama: safeString(h.nama),
    musyrifNama: safeString(h.musyrifNama)
  }));
}

export async function addHalaqoh(item: Omit<Halaqoh, 'id'>): Promise<Halaqoh> {
  const newItem: Halaqoh = { id: generateId('hq'), ...item };
  memoryHalaqohs.push(newItem);

  try {
    await setDoc(doc(db, 'halaqoh', newItem.id), newItem);
  } catch (e) {
    console.warn("Failed adding halaqoh to Firestore:", e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('halaqoh').insert(newItem);
    } catch (e) {
      console.warn("Failed adding halaqoh to Supabase:", e);
    }
  }
  return newItem;
}

export async function updateHalaqoh(id: string, item: Partial<Halaqoh>): Promise<void> {
  memoryHalaqohs = memoryHalaqohs.map(h => h.id === id ? { ...h, ...item } : h);

  try {
    await setDoc(doc(db, 'halaqoh', id), item, { merge: true });
  } catch (e) {
    console.warn("Failed updating halaqoh in Firestore:", e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('halaqoh').update(item).eq('id', id);
    } catch (e) {
      console.warn("Failed updating halaqoh in Supabase:", e);
    }
  }
}

export async function deleteHalaqoh(id: string): Promise<void> {
  memoryHalaqohs = memoryHalaqohs.filter(h => h.id !== id);

  try {
    await deleteDoc(doc(db, 'halaqoh', id));
  } catch (e) {
    console.warn("Failed deleting halaqoh in Firestore:", e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('halaqoh').delete().eq('id', id);
    } catch (e) {
      console.warn("Failed deleting halaqoh in Supabase:", e);
    }
  }
}

// MUSYRIF
export async function getMusyrifs(): Promise<Musyrif[]> {
  let list: Musyrif[] = [];
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('musyrif').select('*').order('nama', { ascending: true });
      if (!error && data && data.length > 0) list = data as Musyrif[];
    } catch (e) {
      console.warn("Supabase getMusyrifs error:", e);
    }
  }

  if (list.length === 0) {
    try {
      const snap = await getDocs(collection(db, 'musyrif'));
      if (!snap.empty) {
        const fsList: Musyrif[] = [];
        snap.forEach(d => { fsList.push({ id: d.id, ...d.data() } as Musyrif); });
        if (fsList.length > 0) list = fsList;
      } else {
        for (const item of memoryMusyrifs) {
          await setDoc(doc(db, 'musyrif', item.id), item);
        }
        list = memoryMusyrifs;
      }
    } catch (e) {
      console.warn("Firestore getMusyrifs error:", e);
      list = memoryMusyrifs;
    }
  }

  return list.map(m => ({
    ...m,
    id: String(m.id || ''),
    nama: safeString(m.nama),
    username: safeString(m.username)
  }));
}

export async function addMusyrif(item: Omit<Musyrif, 'id'>): Promise<Musyrif> {
  const newItem: Musyrif = { id: generateId('usr'), ...item };
  memoryMusyrifs.push(newItem);

  try {
    await setDoc(doc(db, 'musyrif', newItem.id), newItem);
  } catch (e) {
    console.warn("Failed adding musyrif to Firestore:", e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('musyrif').insert(newItem);
    } catch (e) {
      console.warn("Failed adding musyrif to Supabase:", e);
    }
  }
  return newItem;
}

export async function updateMusyrif(id: string, item: Partial<Musyrif>): Promise<void> {
  memoryMusyrifs = memoryMusyrifs.map(m => m.id === id ? { ...m, ...item } : m);

  try {
    await setDoc(doc(db, 'musyrif', id), item, { merge: true });
  } catch (e) {
    console.warn("Failed updating musyrif in Firestore:", e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('musyrif').update(item).eq('id', id);
    } catch (e) {
      console.warn("Failed updating musyrif in Supabase:", e);
    }
  }
}

export async function deleteMusyrif(id: string): Promise<void> {
  memoryMusyrifs = memoryMusyrifs.filter(m => m.id !== id);

  try {
    await deleteDoc(doc(db, 'musyrif', id));
  } catch (e) {
    console.warn("Failed deleting musyrif in Firestore:", e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('musyrif').delete().eq('id', id);
    } catch (e) {
      console.warn("Failed deleting musyrif in Supabase:", e);
    }
  }
}

// STUDENTS
export async function getStudents(): Promise<Siswa[]> {
  let list: Siswa[] = [];
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('students').select('*').order('nama', { ascending: true });
      if (!error && data && data.length > 0) list = data as Siswa[];
    } catch (e) {
      console.warn("Supabase getStudents error:", e);
    }
  }

  if (list.length === 0) {
    try {
      const snap = await getDocs(collection(db, 'students'));
      if (!snap.empty) {
        const fsList: Siswa[] = [];
        snap.forEach(d => { fsList.push({ id: d.id, ...d.data() } as Siswa); });
        if (fsList.length > 0) list = fsList;
      } else {
        for (const item of memoryStudents) {
          await setDoc(doc(db, 'students', item.id), item);
        }
        list = memoryStudents;
      }
    } catch (e) {
      console.warn("Firestore getStudents error:", e);
      list = memoryStudents;
    }
  }

  return list.map(s => ({
    ...s,
    id: String(s.id || ''),
    nama: safeString(s.nama),
    noInduk: safeString(s.noInduk)
  }));
}

export async function addStudent(item: Omit<Siswa, 'id'>): Promise<Siswa> {
  const newItem: Siswa = { id: generateId('sis'), ...item };
  memoryStudents.push(newItem);

  try {
    await setDoc(doc(db, 'students', newItem.id), newItem);
  } catch (e) {
    console.warn("Failed adding student to Firestore:", e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('students').insert(newItem);
    } catch (e) {
      console.warn("Failed adding student to Supabase:", e);
    }
  }
  return newItem;
}

export async function updateStudent(id: string, item: Partial<Siswa>): Promise<void> {
  memoryStudents = memoryStudents.map(s => s.id === id ? { ...s, ...item } : s);

  try {
    await setDoc(doc(db, 'students', id), item, { merge: true });
  } catch (e) {
    console.warn("Failed updating student in Firestore:", e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('students').update(item).eq('id', id);
    } catch (e) {
      console.warn("Failed updating student in Supabase:", e);
    }
  }
}

export async function deleteStudent(id: string): Promise<void> {
  memoryStudents = memoryStudents.filter(s => s.id !== id);

  try {
    await deleteDoc(doc(db, 'students', id));
  } catch (e) {
    console.warn("Failed deleting student in Firestore:", e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('students').delete().eq('id', id);
    } catch (e) {
      console.warn("Failed deleting student in Supabase:", e);
    }
  }
}

// CATATAN HARIAN / JOURNALS
export async function getJournals(limitNum = 100): Promise<CatatanHarian[]> {
  let list: CatatanHarian[] = [];
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('catatan_harian')
        .select('*')
        .order('tanggal', { ascending: false })
        .limit(limitNum);
      if (!error && data && data.length > 0) list = data as CatatanHarian[];
    } catch (e) {
      console.warn("Supabase getJournals error:", e);
    }
  }

  if (list.length === 0) {
    try {
      const snap = await getDocs(collection(db, 'catatan_harian'));
      if (!snap.empty) {
        const fsList: CatatanHarian[] = [];
        snap.forEach(d => { fsList.push({ id: d.id, ...d.data() } as CatatanHarian); });
        if (fsList.length > 0) {
          fsList.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
          list = fsList.slice(0, limitNum);
        }
      } else {
        for (const item of memoryJournals) {
          await setDoc(doc(db, 'catatan_harian', item.id), item);
        }
        list = memoryJournals;
      }
    } catch (e) {
      console.warn("Firestore getJournals error:", e);
      list = memoryJournals;
    }
  }

  return list.map(j => ({
    ...j,
    id: String(j.id || ''),
    siswaNama: safeString(j.siswaNama),
    materiSetoran: safeString(j.materiSetoran)
  }));
}

export async function addJournal(item: Omit<CatatanHarian, 'id'>): Promise<CatatanHarian> {
  const newItem: CatatanHarian = { id: generateId('cat'), ...item };
  memoryJournals.unshift(newItem);

  try {
    await setDoc(doc(db, 'catatan_harian', newItem.id), newItem);
  } catch (e) {
    console.warn("Failed adding journal to Firestore:", e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('catatan_harian').insert(newItem);
    } catch (e) {
      console.warn("Failed adding journal to Supabase:", e);
    }
  }
  return newItem;
}

export async function updateJournal(id: string, item: Partial<CatatanHarian>): Promise<void> {
  memoryJournals = memoryJournals.map(j => j.id === id ? { ...j, ...item } : j);

  try {
    await setDoc(doc(db, 'catatan_harian', id), item, { merge: true });
  } catch (e) {
    console.warn("Failed updating journal in Firestore:", e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('catatan_harian').update(item).eq('id', id);
    } catch (e) {
      console.warn("Failed updating journal in Supabase:", e);
    }
  }
}

export async function deleteJournal(id: string): Promise<void> {
  memoryJournals = memoryJournals.filter(j => j.id !== id);

  try {
    await deleteDoc(doc(db, 'catatan_harian', id));
  } catch (e) {
    console.warn("Failed deleting journal in Firestore:", e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('catatan_harian').delete().eq('id', id);
    } catch (e) {
      console.warn("Failed deleting journal in Supabase:", e);
    }
  }
}

// ABSEN MUSYRIF
export async function getAbsenMusyrif(musyrifId?: string, limitNum = 50): Promise<AbsenMusyrif[]> {
  let list: AbsenMusyrif[] = [];
  if (isSupabaseConfigured()) {
    try {
      let queryBuilder = supabase.from('absen_musyrif').select('*').order('tanggal', { ascending: false }).limit(limitNum);
      if (musyrifId) queryBuilder = queryBuilder.eq('musyrifId', musyrifId);
      const { data, error } = await queryBuilder;
      if (!error && data && data.length > 0) list = data as AbsenMusyrif[];
    } catch (e) {
      console.warn("Supabase getAbsenMusyrif error:", e);
    }
  }

  if (list.length === 0) {
    try {
      const snap = await getDocs(collection(db, 'absen_musyrif'));
      if (!snap.empty) {
        const fsList: AbsenMusyrif[] = [];
        snap.forEach(d => { fsList.push({ id: d.id, ...d.data() } as AbsenMusyrif); });
        list = fsList;
      }
    } catch (e) {
      console.warn("Firestore getAbsenMusyrif error:", e);
      list = memoryAbsenMusyrif;
    }
  }

  if (musyrifId) {
    list = list.filter(a => a.musyrifId === musyrifId);
  }
  list.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
  return list.slice(0, limitNum);
}

export async function addAbsenMusyrif(item: Omit<AbsenMusyrif, 'id'>): Promise<AbsenMusyrif> {
  const newItem: AbsenMusyrif = { id: generateId('abm'), ...item };
  memoryAbsenMusyrif.unshift(newItem);

  try {
    await setDoc(doc(db, 'absen_musyrif', newItem.id), newItem);
  } catch (e) {
    console.warn("Failed adding absen musyrif to Firestore:", e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('absen_musyrif').insert(newItem);
    } catch (e) {
      console.warn("Failed adding absen musyrif to Supabase:", e);
    }
  }
  return newItem;
}

export async function updateAbsenMusyrif(id: string, item: Partial<AbsenMusyrif>): Promise<void> {
  memoryAbsenMusyrif = memoryAbsenMusyrif.map(a => a.id === id ? { ...a, ...item } : a);

  try {
    await setDoc(doc(db, 'absen_musyrif', id), item, { merge: true });
  } catch (e) {
    console.warn("Failed updating absen musyrif in Firestore:", e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('absen_musyrif').update(item).eq('id', id);
    } catch (e) {
      console.warn("Failed updating absen musyrif in Supabase:", e);
    }
  }
}

export async function deleteAbsenMusyrif(id: string): Promise<void> {
  memoryAbsenMusyrif = memoryAbsenMusyrif.filter(a => a.id !== id);

  try {
    await deleteDoc(doc(db, 'absen_musyrif', id));
  } catch (e) {
    console.warn("Failed deleting absen musyrif in Firestore:", e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('absen_musyrif').delete().eq('id', id);
    } catch (e) {
      console.warn("Failed deleting absen musyrif in Supabase:", e);
    }
  }
}

// ABSEN SISWA
export async function getAbsenSiswa(musyrifId?: string, limitNum = 100): Promise<AbsenSiswa[]> {
  let list: AbsenSiswa[] = [];
  if (isSupabaseConfigured()) {
    try {
      let queryBuilder = supabase.from('absen_siswa').select('*').order('tanggal', { ascending: false }).limit(limitNum);
      if (musyrifId) queryBuilder = queryBuilder.eq('musyrifId', musyrifId);
      const { data, error } = await queryBuilder;
      if (!error && data && data.length > 0) list = data as AbsenSiswa[];
    } catch (e) {
      console.warn("Supabase getAbsenSiswa error:", e);
    }
  }

  if (list.length === 0) {
    try {
      const snap = await getDocs(collection(db, 'absen_siswa'));
      if (!snap.empty) {
        const fsList: AbsenSiswa[] = [];
        snap.forEach(d => { fsList.push({ id: d.id, ...d.data() } as AbsenSiswa); });
        list = fsList;
      }
    } catch (e) {
      console.warn("Firestore getAbsenSiswa error:", e);
      list = memoryAbsenSiswa;
    }
  }

  if (musyrifId) {
    list = list.filter(a => a.musyrifId === musyrifId);
  }
  list.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
  return list.slice(0, limitNum);
}

export async function addAbsenSiswa(item: Omit<AbsenSiswa, 'id'>): Promise<AbsenSiswa> {
  const newItem: AbsenSiswa = { id: generateId('abs'), ...item };
  memoryAbsenSiswa.unshift(newItem);

  try {
    await setDoc(doc(db, 'absen_siswa', newItem.id), newItem);
  } catch (e) {
    console.warn("Failed adding absen siswa to Firestore:", e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('absen_siswa').insert(newItem);
    } catch (e) {
      console.warn("Failed adding absen siswa to Supabase:", e);
    }
  }
  return newItem;
}

export async function updateAbsenSiswa(id: string, item: Partial<AbsenSiswa>): Promise<void> {
  memoryAbsenSiswa = memoryAbsenSiswa.map(a => a.id === id ? { ...a, ...item } : a);

  try {
    await setDoc(doc(db, 'absen_siswa', id), item, { merge: true });
  } catch (e) {
    console.warn("Failed updating absen siswa in Firestore:", e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('absen_siswa').update(item).eq('id', id);
    } catch (e) {
      console.warn("Failed updating absen siswa in Supabase:", e);
    }
  }
}

export async function deleteAbsenSiswa(id: string): Promise<void> {
  memoryAbsenSiswa = memoryAbsenSiswa.filter(a => a.id !== id);

  try {
    await deleteDoc(doc(db, 'absen_siswa', id));
  } catch (e) {
    console.warn("Failed deleting absen siswa in Firestore:", e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('absen_siswa').delete().eq('id', id);
    } catch (e) {
      console.warn("Failed deleting absen siswa in Supabase:", e);
    }
  }
}

// REALTIME SUBSCRIPTIONS
export function subscribeToTable(tableName: string, callback: (payload: any) => void) {
  let unsubSupabase = () => {};
  let unsubFirestore = () => {};

  if (isSupabaseConfigured()) {
    try {
      const channel = supabase
        .channel(`public:${tableName}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: tableName },
          (payload) => callback(payload)
        )
        .subscribe();
      unsubSupabase = () => { supabase.removeChannel(channel); };
    } catch (e) {
      console.warn("Supabase realtime subscribe error:", e);
    }
  }

  try {
    const colRef = collection(db, tableName);
    unsubFirestore = onSnapshot(colRef, (snapshot) => {
      callback({ eventType: 'UPDATE', new: snapshot });
    }, (err) => {
      console.warn("Firestore snapshot listener warning:", err);
    });
  } catch (e) {
    console.warn("Could not attach Firestore listener:", e);
  }

  return () => {
    unsubSupabase();
    unsubFirestore();
  };
}
