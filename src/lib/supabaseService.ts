import { supabase, isSupabaseConfigured } from './supabase';
import { Kelas, Halaqoh, Siswa, Musyrif, CatatanHarian, AbsenSiswa, AbsenMusyrif } from '../types';

const safeString = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null) {
    return val.nama || val.value || val.title || JSON.stringify(val);
  }
  return String(val);
};

// Memory fallback store (used when Supabase is not configured or offline)
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

const JOURNALS_KEY = 'mmq_journals_v3';
const ABSEN_SISWA_KEY = 'mmq_absen_siswa_v2';
const ABSEN_MUSYRIF_KEY = 'mmq_absen_musyrif_v2';
const MUSYRIFS_KEY = 'mmq_musyrifs_v3';
const STUDENTS_KEY = 'mmq_students_v3';

function loadStoredMusyrifs(): Musyrif[] {
  try {
    const raw = localStorage.getItem(MUSYRIFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed loading stored musyrifs:", e);
  }
  return [
    { id: 'usr-1', nim: '202601001', nama: 'Ahmad Muzakki, S.Pd.', username: 'ahmad', password: 'password123', halaqohId: 'hq-1', halaqohNama: 'Halaqoh Al-Kahfi', isMengajarLomba: true },
    { id: 'usr-2', nim: '202601002', nama: 'Umar Al-Faruq', username: 'umar', password: 'password123', halaqohId: 'hq-2', halaqohNama: 'Halaqoh An-Nur' }
  ];
}

function saveStoredMusyrifs(data: Musyrif[]) {
  try {
    localStorage.setItem(MUSYRIFS_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed saving stored musyrifs:", e);
  }
}

function loadStoredStudents(): Siswa[] {
  try {
    const raw = localStorage.getItem(STUDENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed loading stored students:", e);
  }
  return [
    { id: 'sis-1', noInduk: '1001', nama: 'Abdurrahman Wahid', kelasId: 'kls-1', kelasNama: 'Kelas 1A', halaqohId: 'hq-1', halaqohNama: 'Halaqoh Al-Kahfi', isKelasDasar: true, isKelasTahfidz: true },
    { id: 'sis-2', noInduk: '1002', nama: 'Aisyah Humaira', kelasId: 'kls-1', kelasNama: 'Kelas 1A', halaqohId: 'hq-1', halaqohNama: 'Halaqoh Al-Kahfi', isKelasDasar: true },
    { id: 'sis-3', noInduk: '1003', nama: 'Muhammad Bilal', kelasId: 'kls-2', kelasNama: 'Kelas 2B', halaqohId: 'hq-1', halaqohNama: 'Halaqoh Al-Kahfi', isKelasLomba: true },
    { id: 'sis-4', noInduk: '1004', nama: 'Fathimah Az-Zahra', kelasId: 'kls-2', kelasNama: 'Kelas 2B', halaqohId: 'hq-2', halaqohNama: 'Halaqoh An-Nur', isKelasTahfidz: true },
    { id: 'sis-5', noInduk: '1005', nama: 'Yusuf Al-Banjari', kelasId: 'kls-3', kelasNama: 'Kelas 3A', halaqohId: 'hq-2', halaqohNama: 'Halaqoh An-Nur', isKelasLomba: true },
    { id: 'sis-6', noInduk: '1006', nama: 'Khadijah Al-Kubra', kelasId: 'kls-3', kelasNama: 'Kelas 3A', halaqohId: 'hq-3', halaqohNama: 'Halaqoh At-Tin' }
  ];
}

function saveStoredStudents(data: Siswa[]) {
  try {
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed saving stored students:", e);
  }
}

let memoryMusyrifs: Musyrif[] = loadStoredMusyrifs();
let memoryStudents: Siswa[] = loadStoredStudents();

function loadStoredJournals(): CatatanHarian[] {
  try {
    const raw = localStorage.getItem(JOURNALS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed loading stored journals:", e);
  }
  return [
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
}

function saveStoredJournals(data: CatatanHarian[]) {
  try {
    localStorage.setItem(JOURNALS_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed saving stored journals:", e);
  }
}

let memoryJournals: CatatanHarian[] = loadStoredJournals();

function loadStoredAbsenSiswa(): AbsenSiswa[] {
  try {
    const raw = localStorage.getItem(ABSEN_SISWA_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed loading stored absen_siswa:", e);
  }
  return [];
}

function saveStoredAbsenSiswa(data: AbsenSiswa[]) {
  try {
    localStorage.setItem(ABSEN_SISWA_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed saving stored absen_siswa:", e);
  }
}

function loadStoredAbsenMusyrif(): AbsenMusyrif[] {
  try {
    const raw = localStorage.getItem(ABSEN_MUSYRIF_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed loading stored absen_musyrif:", e);
  }
  return [];
}

function saveStoredAbsenMusyrif(data: AbsenMusyrif[]) {
  try {
    localStorage.setItem(ABSEN_MUSYRIF_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed saving stored absen_musyrif:", e);
  }
}

let memoryAbsenMusyrif: AbsenMusyrif[] = loadStoredAbsenMusyrif();
let memoryAbsenSiswa: AbsenSiswa[] = loadStoredAbsenSiswa();

// Helper to generate IDs
export const generateId = (prefix: string = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

// 1. Seed initial data into Supabase if empty (only ONCE per browser installation)
export async function seedInitialSupabaseData() {
  if (!isSupabaseConfigured()) {
    console.info("Supabase URL / ANON_KEY not configured. Using local memory fallback.");
    return;
  }

  try {
    const SEED_KEY = 'supabase_seeded_v3';
    if (localStorage.getItem(SEED_KEY)) {
      return;
    }

    const { data: settingsData, error } = await supabase.from('settings').select('*').limit(1);
    
    if (!error && settingsData && settingsData.length > 0) {
      localStorage.setItem(SEED_KEY, 'true');
      return;
    }

    if (error || !settingsData || settingsData.length === 0) {
      console.info("Seeding initial schema and data into Supabase...");
      
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
      localStorage.setItem(SEED_KEY, 'true');
      console.info("Supabase database successfully seeded.");
    }
  } catch (err) {
    console.warn("Supabase seeding check encountered an issue:", err);
  }
}

// SETTINGS
export async function getSettings() {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 'admin').maybeSingle();
      if (!error && data) {
        memorySettings = { adminPassword: data.adminPassword || 'admin123', musyrifLoginEnabled: data.musyrifLoginEnabled ?? true };
        return memorySettings;
      }
    } catch (e) {
      console.warn("Supabase getSettings fallback to memory:", e);
    }
  }
  return memorySettings;
}

export async function updateSettings(updates: Partial<{ adminPassword: string; musyrifLoginEnabled: boolean }>) {
  memorySettings = { ...memorySettings, ...updates };
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('settings').upsert({ id: 'admin', ...memorySettings });
      if (error) console.error("Supabase updateSettings error:", error.message || error);
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
      if (!error && Array.isArray(data)) {
        memoryClasses = data as Kelas[];
        return memoryClasses.map(c => ({
          ...c,
          id: String(c.id || ''),
          nama: safeString(c.nama)
        }));
      } else if (error) {
        console.warn("Supabase getClasses error:", error.message || error);
      }
    } catch (e) {
      console.warn("Supabase getClasses error:", e);
    }
  }

  return memoryClasses.map(c => ({
    ...c,
    id: String(c.id || ''),
    nama: safeString(c.nama)
  }));
}

export async function addClass(input: string | { nama: string }): Promise<Kelas> {
  const namaStr = typeof input === 'string' ? input : (input && (input as any).nama ? (input as any).nama : String(input || ''));
  const newClass: Kelas = { id: generateId('kls'), nama: namaStr };

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('classes').insert(newClass);
      if (error) {
        console.warn("Supabase addClass notice:", error.message);
      }
    } catch (e: any) {
      console.warn("Failed adding class to Supabase:", e);
    }
  }

  memoryClasses.push(newClass);
  return newClass;
}

export async function updateClass(id: string, input: string | { nama: string }): Promise<void> {
  const namaStr = typeof input === 'string' ? input : (input && (input as any).nama ? (input as any).nama : String(input || ''));
  memoryClasses = memoryClasses.map(c => c.id === id ? { ...c, nama: namaStr } : c);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('classes').update({ nama: namaStr }).eq('id', id);
      if (error) {
        console.warn("Supabase updateClass notice:", error.message);
      }
    } catch (e: any) {
      console.warn("Failed updating class in Supabase:", e);
    }
  }
}

export async function deleteClass(id: string): Promise<void> {
  memoryClasses = memoryClasses.filter(c => c.id !== id);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) {
        console.warn("Supabase deleteClass notice:", error.message);
      }
    } catch (e: any) {
      console.warn("Failed deleting class in Supabase:", e);
    }
  }
}

// HALAQOH
export async function getHalaqohs(): Promise<Halaqoh[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('halaqoh').select('*').order('nama', { ascending: true });
      if (!error && Array.isArray(data)) {
        memoryHalaqohs = data as Halaqoh[];
        return memoryHalaqohs.map(h => ({
          ...h,
          id: String(h.id || ''),
          nama: safeString(h.nama),
          musyrifNama: safeString(h.musyrifNama)
        }));
      } else if (error) {
        console.warn("Supabase getHalaqohs error:", error.message || error);
      }
    } catch (e) {
      console.warn("Supabase getHalaqohs error:", e);
    }
  }

  return memoryHalaqohs.map(h => ({
    ...h,
    id: String(h.id || ''),
    nama: safeString(h.nama),
    musyrifNama: safeString(h.musyrifNama)
  }));
}

export async function addHalaqoh(item: Omit<Halaqoh, 'id'>): Promise<Halaqoh> {
  const newItem: Halaqoh = { id: generateId('hq'), ...item };

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('halaqoh').insert(newItem);
      if (error) {
        console.warn("Supabase addHalaqoh notice:", error.message);
      }
    } catch (e: any) {
      console.warn("Failed adding halaqoh to Supabase:", e);
    }
  }
  memoryHalaqohs.push(newItem);
  return newItem;
}

export async function updateHalaqoh(id: string, item: Partial<Halaqoh>): Promise<void> {
  memoryHalaqohs = memoryHalaqohs.map(h => h.id === id ? { ...h, ...item } : h);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('halaqoh').update(item).eq('id', id);
      if (error) {
        console.warn("Supabase updateHalaqoh notice:", error.message);
      }
    } catch (e: any) {
      console.warn("Failed updating halaqoh in Supabase:", e);
    }
  }
}

export async function deleteHalaqoh(id: string): Promise<void> {
  memoryHalaqohs = memoryHalaqohs.filter(h => h.id !== id);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('halaqoh').delete().eq('id', id);
      if (error) {
        console.warn("Supabase deleteHalaqoh notice:", error.message);
      }
    } catch (e: any) {
      console.warn("Failed deleting halaqoh in Supabase:", e);
    }
  }
}

// MUSYRIF
export async function getMusyrifs(): Promise<Musyrif[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('musyrif').select('*').order('nama', { ascending: true });
      if (!error && Array.isArray(data)) {
        const stored = loadStoredMusyrifs();
        const storedMap = new Map(stored.map(m => [m.id, m]));

        memoryMusyrifs = data.map(dbM => {
          const localM = storedMap.get(dbM.id);
          return {
            ...dbM,
            id: String(dbM.id || ''),
            nama: safeString(dbM.nama),
            username: safeString(dbM.username),
            isMengajarLomba: (dbM.isMengajarLomba !== undefined && dbM.isMengajarLomba !== null)
              ? Boolean(dbM.isMengajarLomba)
              : Boolean(localM?.isMengajarLomba)
          };
        });
        saveStoredMusyrifs(memoryMusyrifs);
        return memoryMusyrifs;
      } else if (error) {
        console.warn("Supabase getMusyrifs error:", error.message || error);
      }
    } catch (e) {
      console.warn("Supabase getMusyrifs error:", e);
    }
  }

  return memoryMusyrifs.map(m => ({
    ...m,
    id: String(m.id || ''),
    nama: safeString(m.nama),
    username: safeString(m.username)
  }));
}

export async function addMusyrif(item: Omit<Musyrif, 'id'>): Promise<Musyrif> {
  const newItem: Musyrif = { id: generateId('usr'), ...item };
  memoryMusyrifs.push(newItem);
  saveStoredMusyrifs(memoryMusyrifs);

  if (isSupabaseConfigured()) {
    try {
      let { error } = await supabase.from('musyrif').insert(newItem);
      if (error && (error.message?.includes('isMengajarLomba') || error.message?.includes('column') || error.message?.includes('schema cache'))) {
        console.warn("Supabase musyrif table missing optional columns, retrying insert without optional boolean flags...");
        const { isMengajarLomba, ...cleanItem } = newItem as any;
        const retryResult = await supabase.from('musyrif').insert(cleanItem);
        error = retryResult.error;
      }
      if (error) {
        console.warn("Supabase addMusyrif notice:", error.message);
      }
    } catch (e: any) {
      console.warn("Failed adding musyrif to Supabase:", e);
    }
  }
  return newItem;
}

export async function updateMusyrif(id: string, item: Partial<Musyrif>): Promise<void> {
  memoryMusyrifs = memoryMusyrifs.map(m => m.id === id ? { ...m, ...item } : m);
  saveStoredMusyrifs(memoryMusyrifs);

  if (isSupabaseConfigured()) {
    try {
      let { error } = await supabase.from('musyrif').update(item).eq('id', id);
      if (error && (error.message?.includes('isMengajarLomba') || error.message?.includes('column') || error.message?.includes('schema cache'))) {
        console.warn("Supabase musyrif table missing optional columns, retrying update without optional boolean flags...");
        const { isMengajarLomba, ...cleanItem } = item as any;
        const retryResult = await supabase.from('musyrif').update(cleanItem).eq('id', id);
        error = retryResult.error;
      }
      if (error) {
        console.warn("Supabase updateMusyrif notice:", error.message);
      }
    } catch (e: any) {
      console.warn("Failed updating musyrif in Supabase:", e);
    }
  }
}

export async function deleteMusyrif(id: string): Promise<void> {
  memoryMusyrifs = memoryMusyrifs.filter(m => m.id !== id);
  saveStoredMusyrifs(memoryMusyrifs);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('musyrif').delete().eq('id', id);
      if (error) {
        console.warn("Supabase deleteMusyrif notice:", error.message);
      }
    } catch (e: any) {
      console.warn("Failed deleting musyrif in Supabase:", e);
    }
  }
}

// STUDENTS
export async function getStudents(): Promise<Siswa[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('students').select('*').order('nama', { ascending: true });
      if (!error && Array.isArray(data)) {
        const stored = loadStoredStudents();
        const storedMap = new Map(stored.map(s => [s.id, s]));

        memoryStudents = data.map(dbS => {
          const localS = storedMap.get(dbS.id);
          return {
            ...dbS,
            id: String(dbS.id || ''),
            nama: safeString(dbS.nama),
            noInduk: safeString(dbS.noInduk),
            isKelasDasar: (dbS.isKelasDasar !== undefined && dbS.isKelasDasar !== null) ? Boolean(dbS.isKelasDasar) : Boolean(localS?.isKelasDasar),
            isKelasTahfidz: (dbS.isKelasTahfidz !== undefined && dbS.isKelasTahfidz !== null) ? Boolean(dbS.isKelasTahfidz) : Boolean(localS?.isKelasTahfidz),
            isKelasLomba: (dbS.isKelasLomba !== undefined && dbS.isKelasLomba !== null) ? Boolean(dbS.isKelasLomba) : Boolean(localS?.isKelasLomba),
          };
        });
        saveStoredStudents(memoryStudents);
        return memoryStudents.map(s => ({
          ...s,
          id: String(s.id || ''),
          nama: safeString(s.nama),
          noInduk: safeString(s.noInduk)
        }));
      } else if (error) {
        console.warn("Supabase getStudents error:", error.message || error);
      }
    } catch (e) {
      console.warn("Supabase getStudents error:", e);
    }
  }

  return memoryStudents.map(s => ({
    ...s,
    id: String(s.id || ''),
    nama: safeString(s.nama),
    noInduk: safeString(s.noInduk)
  }));
}

export async function addStudent(item: Omit<Siswa, 'id'>): Promise<Siswa> {
  const newItem: Siswa = { id: generateId('sis'), ...item };
  memoryStudents.push(newItem);
  saveStoredStudents(memoryStudents);

  if (isSupabaseConfigured()) {
    try {
      let { error } = await supabase.from('students').insert(newItem);
      if (error && (error.message?.includes('isKelasDasar') || error.message?.includes('isKelasTahfidz') || error.message?.includes('isKelasLomba') || error.message?.includes('column') || error.message?.includes('schema cache'))) {
        console.warn("Supabase students table missing optional columns, retrying insert without optional boolean flags...");
        const { isKelasDasar, isKelasTahfidz, isKelasLomba, ...cleanItem } = newItem as any;
        const retryResult = await supabase.from('students').insert(cleanItem);
        error = retryResult.error;
      }
      if (error) {
        console.warn("Supabase addStudent notice:", error.message);
      }
    } catch (e: any) {
      console.warn("Failed adding student to Supabase:", e);
    }
  }
  return newItem;
}

export async function updateStudent(id: string, item: Partial<Siswa>): Promise<void> {
  memoryStudents = memoryStudents.map(s => s.id === id ? { ...s, ...item } : s);
  saveStoredStudents(memoryStudents);

  if (isSupabaseConfigured()) {
    try {
      let { error } = await supabase.from('students').update(item).eq('id', id);
      if (error && (error.message?.includes('isKelasDasar') || error.message?.includes('isKelasTahfidz') || error.message?.includes('isKelasLomba') || error.message?.includes('column') || error.message?.includes('schema cache'))) {
        console.warn("Supabase students table missing optional columns, retrying update without optional boolean flags...");
        const { isKelasDasar, isKelasTahfidz, isKelasLomba, ...cleanItem } = item as any;
        const retryResult = await supabase.from('students').update(cleanItem).eq('id', id);
        error = retryResult.error;
      }
      if (error) {
        console.warn("Supabase updateStudent notice:", error.message);
      }
    } catch (e: any) {
      console.warn("Failed updating student in Supabase:", e);
    }
  }
}

export async function deleteStudent(id: string): Promise<void> {
  memoryStudents = memoryStudents.filter(s => s.id !== id);
  saveStoredStudents(memoryStudents);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) {
        console.warn("Supabase deleteStudent notice:", error.message);
      }
    } catch (e: any) {
      console.warn("Failed deleting student in Supabase:", e);
    }
  }
}

export function formatJournalFromDb(j: any): CatatanHarian {
  let kategori = j.kategori;
  let program = j.program;
  let evaluasiTahsin = safeString(j.evaluasiTahsin);
  let materiSetoran = safeString(j.materiSetoran);

  const metaRegex = /\[PROG:(dasar|tahfidz|Kelas Lomba)\|KAT:(Murojaah|Ziyadah|Setoran|Tugas Tilawah)\]\s*/;
  const matchEval = evaluasiTahsin.match(metaRegex);
  const matchMat = materiSetoran.match(metaRegex);
  const match = matchEval || matchMat;

  if (match) {
    if (!program) program = match[1] as 'dasar' | 'tahfidz' | 'Kelas Lomba';
    if (!kategori) kategori = match[2] as 'Murojaah' | 'Ziyadah' | 'Setoran' | 'Tugas Tilawah';
    evaluasiTahsin = evaluasiTahsin.replace(metaRegex, '').trim();
    materiSetoran = materiSetoran.replace(metaRegex, '').trim();
  }

  if (!kategori && materiSetoran) {
    if (materiSetoran.startsWith('[MUROJAAH]') || materiSetoran.startsWith('[Murojaah]')) {
      kategori = 'Murojaah';
      program = program || 'tahfidz';
    } else if (materiSetoran.startsWith('[ZIYADAH]') || materiSetoran.startsWith('[Ziyadah]')) {
      kategori = 'Ziyadah';
      program = program || 'tahfidz';
    } else if (materiSetoran.startsWith('[SETORAN]') || materiSetoran.startsWith('[Setoran]')) {
      kategori = 'Setoran';
      program = program || 'tahfidz';
    } else if (materiSetoran.startsWith('[TUGAS TILAWAH]') || materiSetoran.startsWith('[Tilawah]')) {
      kategori = 'Tugas Tilawah';
      program = program || 'tahfidz';
    }
  }

  if (!program) {
    program = kategori ? 'tahfidz' : 'dasar';
  }

  return {
    ...j,
    id: String(j.id || ''),
    siswaNama: safeString(j.siswaNama),
    materiSetoran: materiSetoran,
    evaluasiTahsin: evaluasiTahsin,
    kategori: kategori,
    program: program
  };
}

// CATATAN HARIAN / JOURNALS
export async function getJournals(limitNum = 200): Promise<CatatanHarian[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('catatan_harian')
        .select('*')
        .order('tanggal', { ascending: false })
        .limit(limitNum);
      if (!error && Array.isArray(data)) {
        const formattedData = data.map(j => formatJournalFromDb(j));
        const dataMap = new Map(formattedData.map(d => [d.id, d]));
        const merged = [...formattedData];
        for (const localItem of memoryJournals) {
          if (!dataMap.has(localItem.id)) {
            merged.push(localItem);
          }
        }
        memoryJournals = merged;
        saveStoredJournals(memoryJournals);
        return memoryJournals;
      } else if (error) {
        console.warn("Supabase getJournals error:", error.message || error);
      }
    } catch (e) {
      console.warn("Supabase getJournals error:", e);
    }
  }

  return memoryJournals.map(j => formatJournalFromDb(j));
}

export async function addJournal(item: Omit<CatatanHarian, 'id'>): Promise<CatatanHarian> {
  const prog = item.program || (item.kategori ? 'tahfidz' : 'dasar');
  const kat = item.kategori || (prog === 'tahfidz' ? 'Setoran' : undefined);

  const metaTag = `[PROG:${prog}|KAT:${kat || 'Setoran'}] `;

  let evaluasi = item.evaluasiTahsin || 'Lancar, terus tingkatkan.';
  if (!evaluasi.includes('[PROG:')) {
    evaluasi = `${metaTag}${evaluasi}`;
  }

  const rawItem: CatatanHarian = { 
    id: generateId('cat'), 
    ...item, 
    program: prog,
    ...(kat ? { kategori: kat } : {}),
    evaluasiTahsin: evaluasi 
  };

  const formatted = formatJournalFromDb(rawItem);
  const existingIdx = memoryJournals.findIndex(j => j.id === formatted.id);
  if (existingIdx >= 0) {
    memoryJournals[existingIdx] = formatted;
  } else {
    memoryJournals.unshift(formatted);
  }
  saveStoredJournals(memoryJournals);

  if (isSupabaseConfigured()) {
    try {
      const cleanItem: any = {};
      Object.keys(rawItem).forEach(k => {
        if ((rawItem as any)[k] !== undefined) {
          cleanItem[k] = (rawItem as any)[k];
        }
      });

      let { error } = await supabase.from('catatan_harian').insert(cleanItem);
      if (error) {
        console.warn("Supabase addJournal first try error:", error.message);
        const { kategori, program, ...fallbackItem } = cleanItem;
        const retryResult = await supabase.from('catatan_harian').insert(fallbackItem);
        if (retryResult.error) {
          console.warn("Supabase addJournal fallback notice:", retryResult.error.message);
        }
      }
    } catch (e: any) {
      console.warn("Failed adding journal to Supabase:", e);
    }
  }

  return formatted;
}

export async function updateJournal(id: string, item: Partial<CatatanHarian>): Promise<void> {
  const existing = memoryJournals.find(j => j.id === id);
  const prog = item.program || existing?.program || (item.kategori || existing?.kategori ? 'tahfidz' : 'dasar');
  const kat = item.kategori || existing?.kategori || (prog === 'tahfidz' ? 'Setoran' : undefined);

  let evaluasi = item.evaluasiTahsin || existing?.evaluasiTahsin || 'Lancar, terus tingkatkan.';
  const metaTag = `[PROG:${prog}|KAT:${kat || 'Setoran'}] `;
  if (!evaluasi.includes('[PROG:')) {
    evaluasi = `${metaTag}${evaluasi}`;
  }

  const rawUpdate: any = {
    ...item,
    program: prog,
    ...(kat ? { kategori: kat } : {}),
    evaluasiTahsin: evaluasi
  };

  const cleanUpdate: any = {};
  Object.keys(rawUpdate).forEach(k => {
    if (rawUpdate[k] !== undefined) {
      cleanUpdate[k] = rawUpdate[k];
    }
  });

  memoryJournals = memoryJournals.map(j => {
    if (j.id === id) {
      return formatJournalFromDb({ ...j, ...cleanUpdate });
    }
    return j;
  });
  saveStoredJournals(memoryJournals);

  if (isSupabaseConfigured()) {
    try {
      let { error } = await supabase.from('catatan_harian').update(cleanUpdate).eq('id', id);
      if (error) {
        console.warn("Supabase updateJournal first try error:", error.message);
        const { kategori, program, ...fallbackUpdate } = cleanUpdate;
        const retryResult = await supabase.from('catatan_harian').update(fallbackUpdate).eq('id', id);
        if (retryResult.error) {
          console.warn("Supabase updateJournal fallback notice:", retryResult.error.message);
        }
      }
    } catch (e: any) {
      console.warn("Failed updating journal in Supabase:", e);
    }
  }
}

export async function deleteJournal(id: string): Promise<void> {
  memoryJournals = memoryJournals.filter(j => j.id !== id);
  saveStoredJournals(memoryJournals);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('catatan_harian').delete().eq('id', id);
      if (error) {
        console.warn("Supabase deleteJournal notice:", error.message);
      }
    } catch (e: any) {
      console.warn("Failed deleting journal in Supabase:", e);
    }
  }
}

// ABSEN MUSYRIF
export async function getAbsenMusyrif(musyrifId?: string, limitNum = 100): Promise<AbsenMusyrif[]> {
  if (isSupabaseConfigured()) {
    try {
      let queryBuilder = supabase.from('absen_musyrif').select('*').order('tanggal', { ascending: false }).limit(limitNum);
      if (musyrifId) queryBuilder = queryBuilder.eq('musyrifId', musyrifId);
      const { data, error } = await queryBuilder;
      if (!error && Array.isArray(data) && data.length > 0) {
        const dataMap = new Map(data.map(d => [d.id, d]));
        const merged = [...data];
        for (const localItem of memoryAbsenMusyrif) {
          if (!dataMap.has(localItem.id)) {
            merged.push(localItem);
          }
        }
        memoryAbsenMusyrif = merged;
        saveStoredAbsenMusyrif(memoryAbsenMusyrif);
      }
    } catch (e) {
      console.warn("Supabase getAbsenMusyrif error:", e);
    }
  }

  let list = [...memoryAbsenMusyrif];
  if (musyrifId) {
    list = list.filter(a => a.musyrifId === musyrifId || !a.musyrifId);
  }
  list.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
  return list.slice(0, limitNum);
}

export async function addAbsenMusyrif(item: Omit<AbsenMusyrif, 'id'>): Promise<AbsenMusyrif> {
  const newItem: AbsenMusyrif = { id: generateId('abm'), ...item };

  const existingIdx = memoryAbsenMusyrif.findIndex(
    a => a.musyrifId === item.musyrifId && a.tanggal === item.tanggal
  );
  if (existingIdx >= 0) {
    memoryAbsenMusyrif[existingIdx] = { ...memoryAbsenMusyrif[existingIdx], ...newItem };
  } else {
    memoryAbsenMusyrif.unshift(newItem);
  }
  saveStoredAbsenMusyrif(memoryAbsenMusyrif);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('absen_musyrif').insert(newItem);
      if (error) {
        console.warn("Supabase addAbsenMusyrif notice:", error.message);
      }
    } catch (e: any) {
      console.warn("Failed adding absen musyrif to Supabase:", e);
    }
  }
  return newItem;
}

export async function updateAbsenMusyrif(id: string, item: Partial<AbsenMusyrif>): Promise<void> {
  memoryAbsenMusyrif = memoryAbsenMusyrif.map(a => a.id === id ? { ...a, ...item } : a);
  saveStoredAbsenMusyrif(memoryAbsenMusyrif);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('absen_musyrif').update(item).eq('id', id);
      if (error) {
        console.warn("Supabase updateAbsenMusyrif notice:", error.message);
      }
    } catch (e: any) {
      console.warn("Failed updating absen musyrif in Supabase:", e);
    }
  }
}

export async function deleteAbsenMusyrif(id: string): Promise<void> {
  memoryAbsenMusyrif = memoryAbsenMusyrif.filter(a => a.id !== id);
  saveStoredAbsenMusyrif(memoryAbsenMusyrif);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('absen_musyrif').delete().eq('id', id);
      if (error) {
        console.warn("Supabase deleteAbsenMusyrif notice:", error.message);
      }
    } catch (e: any) {
      console.warn("Failed deleting absen musyrif in Supabase:", e);
    }
  }
}

// ABSEN SISWA
export async function getAbsenSiswa(musyrifId?: string, limitNum = 300): Promise<AbsenSiswa[]> {
  if (isSupabaseConfigured()) {
    try {
      let queryBuilder = supabase.from('absen_siswa').select('*').order('tanggal', { ascending: false }).limit(limitNum);
      if (musyrifId) queryBuilder = queryBuilder.eq('musyrifId', musyrifId);
      const { data, error } = await queryBuilder;
      if (!error && Array.isArray(data) && data.length > 0) {
        const dataMap = new Map(data.map(d => [d.id, d]));
        const merged = [...data];
        for (const localItem of memoryAbsenSiswa) {
          if (!dataMap.has(localItem.id)) {
            merged.push(localItem);
          }
        }
        memoryAbsenSiswa = merged;
        saveStoredAbsenSiswa(memoryAbsenSiswa);
      }
    } catch (e) {
      console.warn("Supabase getAbsenSiswa error:", e);
    }
  }

  let list = [...memoryAbsenSiswa];
  if (musyrifId) {
    list = list.filter(a => a.musyrifId === musyrifId || !a.musyrifId);
  }
  list.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
  return list.slice(0, limitNum);
}

export async function addAbsenSiswa(item: Omit<AbsenSiswa, 'id'>): Promise<AbsenSiswa> {
  const newItem: AbsenSiswa = { id: generateId('abs'), ...item };

  const existingIdx = memoryAbsenSiswa.findIndex(
    a => String(a.siswaId) === String(item.siswaId) && a.tanggal === item.tanggal
  );
  if (existingIdx >= 0) {
    memoryAbsenSiswa[existingIdx] = { ...memoryAbsenSiswa[existingIdx], ...item, id: memoryAbsenSiswa[existingIdx].id };
  } else {
    memoryAbsenSiswa.unshift(newItem);
  }
  saveStoredAbsenSiswa(memoryAbsenSiswa);

  if (isSupabaseConfigured()) {
    try {
      let { error } = await supabase.from('absen_siswa').insert(newItem);
      if (error && (error.message?.includes('column') || error.message?.includes('schema cache'))) {
        console.warn("Supabase absen_siswa table missing column, retrying clean insert...");
        const cleanItem = { ...newItem };
        const retryResult = await supabase.from('absen_siswa').insert(cleanItem);
        error = retryResult.error;
      }
      if (error) {
        console.warn("Supabase addAbsenSiswa notice:", error.message);
      }
    } catch (e: any) {
      console.warn("Failed adding absen siswa to Supabase:", e);
    }
  }

  return newItem;
}

export async function updateAbsenSiswa(id: string, item: Partial<AbsenSiswa>): Promise<void> {
  memoryAbsenSiswa = memoryAbsenSiswa.map(a => a.id === id ? { ...a, ...item } : a);
  saveStoredAbsenSiswa(memoryAbsenSiswa);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('absen_siswa').update(item).eq('id', id);
      if (error) {
        console.warn("Supabase updateAbsenSiswa notice:", error.message);
      }
    } catch (e: any) {
      console.warn("Failed updating absen siswa in Supabase:", e);
    }
  }
}

export async function deleteAbsenSiswa(id: string): Promise<void> {
  memoryAbsenSiswa = memoryAbsenSiswa.filter(a => a.id !== id);
  saveStoredAbsenSiswa(memoryAbsenSiswa);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('absen_siswa').delete().eq('id', id);
      if (error) {
        console.warn("Supabase deleteAbsenSiswa notice:", error.message);
      }
    } catch (e: any) {
      console.warn("Failed deleting absen siswa in Supabase:", e);
    }
  }
}

type SiswaAbsenItem = AbsenSiswa;

// REALTIME SUBSCRIPTIONS
export function subscribeToTable(tableName: string, callback: (payload: any) => void) {
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
      return () => { supabase.removeChannel(channel); };
    } catch (e) {
      console.warn("Supabase realtime subscribe error:", e);
    }
  }
  return () => {};
}
