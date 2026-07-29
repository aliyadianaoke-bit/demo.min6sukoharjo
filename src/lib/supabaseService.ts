import { supabase, isSupabaseConfigured } from './supabase';
import { Kelas, Halaqoh, Siswa, Musyrif, CatatanHarian, AbsenSiswa, AbsenMusyrif } from '../types';

// Fallback in-memory store for demo when Supabase is not configured or table does not exist
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

// 1. Seed initial data into Supabase if empty
export async function seedInitialSupabaseData() {
  if (!isSupabaseConfigured()) {
    console.info("Supabase is using local memory fallback (VITE_SUPABASE_URL not configured yet).");
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
      console.warn("Using memory fallback for settings:", e);
    }
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
  return memorySettings;
}

// CLASSES
export async function getClasses(): Promise<Kelas[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('classes').select('*').order('nama', { ascending: true });
      if (!error && data && data.length > 0) return data as Kelas[];
    } catch (e) {
      console.warn("Using memory fallback for classes:", e);
    }
  }
  return memoryClasses;
}

export async function addClass(nama: string): Promise<Kelas> {
  const newClass: Kelas = { id: generateId('kls'), nama };
  memoryClasses.push(newClass);
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('classes').insert(newClass).select().single();
      if (!error && data) return data as Kelas;
    } catch (e) {
      console.warn("Failed adding class to Supabase:", e);
    }
  }
  return newClass;
}

export async function updateClass(id: string, nama: string): Promise<void> {
  memoryClasses = memoryClasses.map(c => c.id === id ? { ...c, nama } : c);
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('classes').update({ nama }).eq('id', id);
    } catch (e) {
      console.warn("Failed updating class in Supabase:", e);
    }
  }
}

export async function deleteClass(id: string): Promise<void> {
  memoryClasses = memoryClasses.filter(c => c.id !== id);
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
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('halaqoh').select('*').order('nama', { ascending: true });
      if (!error && data && data.length > 0) return data as Halaqoh[];
    } catch (e) {
      console.warn("Using memory fallback for halaqoh:", e);
    }
  }
  return memoryHalaqohs;
}

export async function addHalaqoh(item: Omit<Halaqoh, 'id'>): Promise<Halaqoh> {
  const newItem: Halaqoh = { id: generateId('hq'), ...item };
  memoryHalaqohs.push(newItem);
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('halaqoh').insert(newItem).select().single();
      if (!error && data) return data as Halaqoh;
    } catch (e) {
      console.warn("Failed adding halaqoh to Supabase:", e);
    }
  }
  return newItem;
}

export async function updateHalaqoh(id: string, item: Partial<Halaqoh>): Promise<void> {
  memoryHalaqohs = memoryHalaqohs.map(h => h.id === id ? { ...h, ...item } : h);
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
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('musyrif').select('*').order('nama', { ascending: true });
      if (!error && data && data.length > 0) return data as Musyrif[];
    } catch (e) {
      console.warn("Using memory fallback for musyrif:", e);
    }
  }
  return memoryMusyrifs;
}

export async function addMusyrif(item: Omit<Musyrif, 'id'>): Promise<Musyrif> {
  const newItem: Musyrif = { id: generateId('usr'), ...item };
  memoryMusyrifs.push(newItem);
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('musyrif').insert(newItem).select().single();
      if (!error && data) return data as Musyrif;
    } catch (e) {
      console.warn("Failed adding musyrif to Supabase:", e);
    }
  }
  return newItem;
}

export async function updateMusyrif(id: string, item: Partial<Musyrif>): Promise<void> {
  memoryMusyrifs = memoryMusyrifs.map(m => m.id === id ? { ...m, ...item } : m);
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
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('students').select('*').order('nama', { ascending: true });
      if (!error && data && data.length > 0) return data as Siswa[];
    } catch (e) {
      console.warn("Using memory fallback for students:", e);
    }
  }
  return memoryStudents;
}

export async function addStudent(item: Omit<Siswa, 'id'>): Promise<Siswa> {
  const newItem: Siswa = { id: generateId('sis'), ...item };
  memoryStudents.push(newItem);
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('students').insert(newItem).select().single();
      if (!error && data) return data as Siswa;
    } catch (e) {
      console.warn("Failed adding student to Supabase:", e);
    }
  }
  return newItem;
}

export async function updateStudent(id: string, item: Partial<Siswa>): Promise<void> {
  memoryStudents = memoryStudents.map(s => s.id === id ? { ...s, ...item } : s);
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
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('catatan_harian')
        .select('*')
        .order('tanggal', { ascending: false })
        .limit(limitNum);
      if (!error && data) return data as CatatanHarian[];
    } catch (e) {
      console.warn("Using memory fallback for journals:", e);
    }
  }
  return memoryJournals;
}

export async function addJournal(item: Omit<CatatanHarian, 'id'>): Promise<CatatanHarian> {
  const newItem: CatatanHarian = { id: generateId('cat'), ...item };
  memoryJournals.unshift(newItem);
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('catatan_harian').insert(newItem).select().single();
      if (!error && data) return data as CatatanHarian;
    } catch (e) {
      console.warn("Failed adding journal to Supabase:", e);
    }
  }
  return newItem;
}

export async function updateJournal(id: string, item: Partial<CatatanHarian>): Promise<void> {
  memoryJournals = memoryJournals.map(j => j.id === id ? { ...j, ...item } : j);
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
  if (isSupabaseConfigured()) {
    try {
      let queryBuilder = supabase.from('absen_musyrif').select('*').order('tanggal', { ascending: false }).limit(limitNum);
      if (musyrifId) {
        queryBuilder = queryBuilder.eq('musyrifId', musyrifId);
      }
      const { data, error } = await queryBuilder;
      if (!error && data) return data as AbsenMusyrif[];
    } catch (e) {
      console.warn("Using memory fallback for absen musyrif:", e);
    }
  }
  return musyrifId ? memoryAbsenMusyrif.filter(a => a.musyrifId === musyrifId) : memoryAbsenMusyrif;
}

export async function addAbsenMusyrif(item: Omit<AbsenMusyrif, 'id'>): Promise<AbsenMusyrif> {
  const newItem: AbsenMusyrif = { id: generateId('abm'), ...item };
  memoryAbsenMusyrif.unshift(newItem);
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('absen_musyrif').insert(newItem).select().single();
      if (!error && data) return data as AbsenMusyrif;
    } catch (e) {
      console.warn("Failed adding absen musyrif to Supabase:", e);
    }
  }
  return newItem;
}

export async function updateAbsenMusyrif(id: string, item: Partial<AbsenMusyrif>): Promise<void> {
  memoryAbsenMusyrif = memoryAbsenMusyrif.map(a => a.id === id ? { ...a, ...item } : a);
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
  if (isSupabaseConfigured()) {
    try {
      let queryBuilder = supabase.from('absen_siswa').select('*').order('tanggal', { ascending: false }).limit(limitNum);
      if (musyrifId) {
        queryBuilder = queryBuilder.eq('musyrifId', musyrifId);
      }
      const { data, error } = await queryBuilder;
      if (!error && data) return data as AbsenSiswa[];
    } catch (e) {
      console.warn("Using memory fallback for absen siswa:", e);
    }
  }
  return musyrifId ? memoryAbsenSiswa.filter(a => a.musyrifId === musyrifId) : memoryAbsenSiswa;
}

export async function addAbsenSiswa(item: Omit<AbsenSiswa, 'id'>): Promise<AbsenSiswa> {
  const newItem: AbsenSiswa = { id: generateId('abs'), ...item };
  memoryAbsenSiswa.unshift(newItem);
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('absen_siswa').insert(newItem).select().single();
      if (!error && data) return data as AbsenSiswa;
    } catch (e) {
      console.warn("Failed adding absen siswa to Supabase:", e);
    }
  }
  return newItem;
}

export async function updateAbsenSiswa(id: string, item: Partial<AbsenSiswa>): Promise<void> {
  memoryAbsenSiswa = memoryAbsenSiswa.map(a => a.id === id ? { ...a, ...item } : a);
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
  if (!isSupabaseConfigured()) {
    return () => {};
  }
  const channel = supabase
    .channel(`public:${tableName}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      (payload) => callback(payload)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
