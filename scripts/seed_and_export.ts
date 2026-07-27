import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, setDoc, doc } from "firebase/firestore";
import fs from "fs";
import path from "path";

const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
if (!fs.existsSync(configPath)) {
  console.error("firebase-applet-config.json not found!");
  process.exit(1);
}

const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function seedInitialData() {
  console.log("Checking if Firestore needs seeding...");
  const settingsCol = collection(db, "settings");
  const settingsSnap = await getDocs(settingsCol);

  if (settingsSnap.empty) {
    console.log("Seeding initial data into Firestore...");
    await setDoc(doc(db, "settings", "admin"), {
      adminPassword: "admin123"
    });

    const demoClasses = [
      { id: "kls-1", nama: "Kelas 1A" },
      { id: "kls-2", nama: "Kelas 2B" },
      { id: "kls-3", nama: "Kelas 3A" },
      { id: "kls-4", nama: "Kelas 4A" },
      { id: "kls-5", nama: "Kelas 5B" },
      { id: "kls-6", nama: "Kelas 6A" }
    ];
    for (const item of demoClasses) {
      await setDoc(doc(db, "classes", item.id), { nama: item.nama });
    }

    const demoHalaqoh = [
      { id: "hq-1", nama: "Halaqoh Al-Kahfi", musyrifId: "usr-1", musyrifNama: "Ahmad Muzakki, S.Pd." },
      { id: "hq-2", nama: "Halaqoh An-Nur", musyrifId: "usr-2", musyrifNama: "Umar Al-Faruq" },
      { id: "hq-3", nama: "Halaqoh At-Tin", musyrifId: "", musyrifNama: "Belum Ditentukan" }
    ];
    for (const item of demoHalaqoh) {
      await setDoc(doc(db, "halaqoh", item.id), {
        nama: item.nama,
        musyrifId: item.musyrifId,
        musyrifNama: item.musyrifNama
      });
    }

    const demoMusyrifs = [
      {
        id: "usr-1",
        nim: "202601001",
        nama: "Ahmad Muzakki, S.Pd.",
        username: "ahmad",
        password: "password123",
        halaqohId: "hq-1",
        halaqohNama: "Halaqoh Al-Kahfi"
      },
      {
        id: "usr-2",
        nim: "202601002",
        nama: "Umar Al-Faruq",
        username: "umar",
        password: "password123",
        halaqohId: "hq-2",
        halaqohNama: "Halaqoh An-Nur"
      }
    ];
    for (const item of demoMusyrifs) {
      await setDoc(doc(db, "musyrif", item.id), item);
    }

    const demoSiswa = [
      { id: "sis-1", noInduk: "1001", nama: "Abdurrahman Wahid", kelasId: "kls-1", kelasNama: "Kelas 1A", halaqohId: "hq-1", halaqohNama: "Halaqoh Al-Kahfi" },
      { id: "sis-2", noInduk: "1002", nama: "Aisyah Humaira", kelasId: "kls-1", kelasNama: "Kelas 1A", halaqohId: "hq-1", halaqohNama: "Halaqoh Al-Kahfi" },
      { id: "sis-3", noInduk: "1003", nama: "Muhammad Bilal", kelasId: "kls-2", kelasNama: "Kelas 2B", halaqohId: "hq-1", halaqohNama: "Halaqoh Al-Kahfi" },
      { id: "sis-4", noInduk: "1004", nama: "Fathimah Az-Zahra", kelasId: "kls-2", kelasNama: "Kelas 2B", halaqohId: "hq-2", halaqohNama: "Halaqoh An-Nur" },
      { id: "sis-5", noInduk: "1005", nama: "Yusuf Al-Banjari", kelasId: "kls-3", kelasNama: "Kelas 3A", halaqohId: "hq-2", halaqohNama: "Halaqoh An-Nur" },
      { id: "sis-6", noInduk: "1006", nama: "Khadijah Al-Kubra", kelasId: "kls-3", kelasNama: "Kelas 3A", halaqohId: "hq-3", halaqohNama: "Halaqoh At-Tin" }
    ];
    for (const item of demoSiswa) {
      await setDoc(doc(db, "students", item.id), item);
    }

    const demoCatatan = [
      {
        id: "cat-1",
        tanggal: "2026-06-18",
        siswaId: "sis-1",
        siswaNama: "Abdurrahman Wahid",
        noInduk: "1001",
        kelasNama: "Kelas 1A",
        halaqohId: "hq-1",
        materiSetoran: "An-Naba 1-15",
        evaluasiTahsin: "Tahsin sangat lancar, perlu menjaga panjang pendek pada mad wajib.",
        nilai: "A"
      },
      {
        id: "cat-2",
        tanggal: "2026-06-18",
        siswaId: "sis-2",
        siswaNama: "Aisyah Humaira",
        noInduk: "1002",
        kelasNama: "Kelas 1A",
        halaqohId: "hq-1",
        materiSetoran: "An-Nazi'at 1-20",
        evaluasiTahsin: "Hafalan agak terbata-bata di ayat 12-15, perlu muraja'ah kembali.",
        nilai: "C"
      },
      {
        id: "cat-3",
        tanggal: "2026-06-19",
        siswaId: "sis-1",
        siswaNama: "Abdurrahman Wahid",
        noInduk: "1001",
        kelasNama: "Kelas 1A",
        halaqohId: "hq-1",
        materiSetoran: "An-Naba 16-30",
        evaluasiTahsin: "Bagus sekali, bacaannya tartil dan makhrajnya tepat.",
        nilai: "A"
      },
      {
        id: "cat-4",
        tanggal: "2026-06-19",
        siswaId: "sis-2",
        siswaNama: "Aisyah Humaira",
        noInduk: "1002",
        kelasNama: "Kelas 1A",
        halaqohId: "hq-1",
        materiSetoran: "An-Nazi'at 21-46",
        evaluasiTahsin: "Ada peningkatan dari kemarin, pertahankan mad lazim-nya.",
        nilai: "B"
      },
      {
        id: "cat-5",
        tanggal: "2026-06-19",
        siswaId: "sis-4",
        siswaNama: "Fathimah Az-Zahra",
        noInduk: "1004",
        kelasNama: "Kelas 2B",
        halaqohId: "hq-2",
        materiSetoran: "Abasa 1-20",
        evaluasiTahsin: "Alhamdulillah sudah setoran dengan tajwid yang memadai.",
        nilai: "B"
      }
    ];
    for (const item of demoCatatan) {
      await setDoc(doc(db, "catatan_harian", item.id), item);
    }
    console.log("Seeding finished.");
  } else {
    console.log("Database already contains data.");
  }
}

function sanitizeSqlValue(val: any): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return String(val);
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "object") {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'::jsonb`;
  }
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

function escapeIdentifier(str: string): string {
  return `"${str.replace(/"/g, '""')}"`;
}

async function exportData() {
  await seedInitialData();

  console.log("Starting DB Export from Firestore...");
  const collectionsToExport = [
    "settings",
    "classes",
    "halaqoh",
    "musyrif",
    "students",
    "catatan_harian",
    "absen_musyrif",
    "absen_siswa"
  ];

  const exportResult: Record<string, any[]> = {};
  let totalDocs = 0;

  for (const colName of collectionsToExport) {
    try {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      const docsData: any[] = [];
      snapshot.forEach((doc) => {
        docsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      exportResult[colName] = docsData;
      totalDocs += docsData.length;
      console.log(`- Collection '${colName}': ${docsData.length} records retrieved.`);
    } catch (err) {
      console.error(`Error fetching collection '${colName}':`, err);
      exportResult[colName] = [];
    }
  }

  // Save JSON
  const jsonPath = path.resolve(process.cwd(), "exported_db.json");
  fs.writeFileSync(jsonPath, JSON.stringify(exportResult, null, 2), "utf-8");
  console.log(`Saved JSON export to: ${jsonPath}`);

  // Generate Supabase SQL Script
  let sql = `-- ==========================================\n`;
  sql += `-- SUPABASE POSTGRESQL MIGRATION SCRIPT\n`;
  sql += `-- Database: ai-studio-335dd8de-a015-4eda-8dd1-3c5f21c7e92e\n`;
  sql += `-- Exported on: ${new Date().toISOString()}\n`;
  sql += `-- Total Records Exported: ${totalDocs}\n`;
  sql += `-- ==========================================\n\n`;

  // Pre-defined table schemas based on blueprint for clean Supabase tables
  const schemaDefinitions: Record<string, string> = {
    settings: `CREATE TABLE IF NOT EXISTS "settings" (
  "id" TEXT PRIMARY KEY,
  "adminPassword" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);`,
    classes: `CREATE TABLE IF NOT EXISTS "classes" (
  "id" TEXT PRIMARY KEY,
  "nama" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);`,
    halaqoh: `CREATE TABLE IF NOT EXISTS "halaqoh" (
  "id" TEXT PRIMARY KEY,
  "nama" TEXT NOT NULL,
  "musyrifId" TEXT,
  "musyrifNama" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);`,
    musyrif: `CREATE TABLE IF NOT EXISTS "musyrif" (
  "id" TEXT PRIMARY KEY,
  "nim" TEXT,
  "nama" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "halaqohId" TEXT,
  "halaqohNama" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);`,
    students: `CREATE TABLE IF NOT EXISTS "students" (
  "id" TEXT PRIMARY KEY,
  "noInduk" TEXT,
  "nama" TEXT NOT NULL,
  "kelasId" TEXT,
  "kelasNama" TEXT,
  "halaqohId" TEXT,
  "halaqohNama" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);`,
    catatan_harian: `CREATE TABLE IF NOT EXISTS "catatan_harian" (
  "id" TEXT PRIMARY KEY,
  "tanggal" TEXT NOT NULL,
  "siswaId" TEXT,
  "siswaNama" TEXT,
  "noInduk" TEXT,
  "kelasNama" TEXT,
  "halaqohId" TEXT,
  "materiSetoran" TEXT,
  "evaluasiTahsin" TEXT,
  "nilai" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);`,
    absen_musyrif: `CREATE TABLE IF NOT EXISTS "absen_musyrif" (
  "id" TEXT PRIMARY KEY,
  "musyrifId" TEXT,
  "musyrifNama" TEXT,
  "tanggal" TEXT,
  "waktu" TEXT,
  "hari" TEXT,
  "fotoUrl" TEXT,
  "status" TEXT DEFAULT 'Proses',
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);`,
    absen_siswa: `CREATE TABLE IF NOT EXISTS "absen_siswa" (
  "id" TEXT PRIMARY KEY,
  "tanggal" TEXT,
  "siswaId" TEXT,
  "siswaNama" TEXT,
  "noInduk" TEXT,
  "kelasId" TEXT,
  "kelasNama" TEXT,
  "status" TEXT,
  "musyrifId" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);`
  };

  for (const [colName, docs] of Object.entries(exportResult)) {
    const tableName = colName;
    sql += `-- ------------------------------------------\n`;
    sql += `-- Table: ${tableName} (${docs.length} rows)\n`;
    sql += `-- ------------------------------------------\n`;

    if (schemaDefinitions[tableName]) {
      sql += schemaDefinitions[tableName] + `\n\n`;
    } else {
      sql += `CREATE TABLE IF NOT EXISTS ${escapeIdentifier(tableName)} (\n`;
      sql += `  "id" TEXT PRIMARY KEY,\n`;
      sql += `  "data" JSONB,\n`;
      sql += `  "created_at" TIMESTAMPTZ DEFAULT NOW()\n`;
      sql += `);\n\n`;
    }

    if (docs.length > 0) {
      // Find all keys present in documents
      const allKeys = new Set<string>();
      allKeys.add("id");
      docs.forEach((d) => {
        Object.keys(d).forEach((k) => allKeys.add(k));
      });
      const keysArray = Array.from(allKeys);

      for (const docData of docs) {
        const colNamesStr = keysArray.map((k) => escapeIdentifier(k)).join(", ");
        const valStrs = keysArray.map((k) => sanitizeSqlValue(docData[k]));
        sql += `INSERT INTO ${escapeIdentifier(tableName)} (${colNamesStr})\nVALUES (${valStrs.join(", ")})\nON CONFLICT ("id") DO UPDATE SET\n`;
        
        const updateAssigns = keysArray
          .filter((k) => k !== "id")
          .map((k) => `  ${escapeIdentifier(k)} = EXCLUDED.${escapeIdentifier(k)}`);
        
        if (updateAssigns.length > 0) {
          sql += updateAssigns.join(",\n") + `;\n\n`;
        } else {
          sql += `  "id" = EXCLUDED."id";\n\n`;
        }
      }
    }
  }

  const sqlPath = path.resolve(process.cwd(), "supabase_migration.sql");
  fs.writeFileSync(sqlPath, sql, "utf-8");
  console.log(`Saved Supabase SQL export to: ${sqlPath}`);
}

exportData().catch((e) => {
  console.error("Seed and Export error:", e);
  process.exit(1);
});
