export interface Kelas {
  id: string; // Document ID
  nama: string;
}

export interface Halaqoh {
  id: string;
  nama: string;
  musyrifId: string; // Reference to Musyrif (or can be empty / "Belum Ditentukan")
  musyrifNama: string;
  musyrifIds?: string[]; // Multiple Musyris supported
}

export interface Siswa {
  id: string;
  noInduk: string;
  nama: string;
  kelasId: string; // e.g. Kelas 1A, kelas ID
  kelasNama: string;
  halaqohId: string; // Halaqoh ID
  halaqohNama: string;
  isKelasDasar?: boolean;
  isKelasTahfidz?: boolean;
}

export interface Musyrif {
  id: string;
  nim: string;
  nama: string;
  username: string;
  password?: string;
  halaqohId: string; // Associated Halaqoh ID
  halaqohNama: string;
}

export type NilaiEvaluasi = 'A' | 'B' | 'C' | 'D' | 'E'; // Mumtaz (A), Jayyid Jidid (B), Jayyid (C), Maqbul (D), Rosib (E)

export interface CatatanHarian {
  id: string;
  tanggal: string; // YYYY-MM-DD
  siswaId: string;
  siswaNama: string;
  noInduk: string;
  kelasNama: string;
  halaqohId: string;
  materiSetoran: string; // e.g., Surat Al-Baqarah 1-10
  evaluasiTahsin: string; // Custom feedback
  nilai: NilaiEvaluasi;
}

export interface SystemSettings {
  adminPassword?: string;
}
