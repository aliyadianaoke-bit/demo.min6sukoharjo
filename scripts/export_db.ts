import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Read Firebase Config
const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
if (!fs.existsSync(configPath)) {
  console.error("firebase-applet-config.json not found!");
  process.exit(1);
}

const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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
  console.log("Starting DB Export from Firestore...");
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
  let sql = `-- Supabase PostgreSQL Migration Script\n`;
  sql += `-- Exported on: ${new Date().toISOString()}\n`;
  sql += `-- Total Records: ${totalDocs}\n\n`;

  for (const [colName, docs] of Object.entries(exportResult)) {
    const tableName = colName;
    sql += `-- ==========================================\n`;
    sql += `-- Table: ${tableName}\n`;
    sql += `-- ==========================================\n`;

    if (docs.length === 0) {
      // Basic table structure if no documents exist
      sql += `CREATE TABLE IF NOT EXISTS ${escapeIdentifier(tableName)} (\n`;
      sql += `  "id" TEXT PRIMARY KEY,\n`;
      sql += `  "created_at" TIMESTAMPTZ DEFAULT NOW()\n`;
      sql += `);\n\n`;
      continue;
    }

    // Determine all unique keys/columns across documents in this collection
    const allKeys = new Set<string>();
    allKeys.add("id");
    docs.forEach((d) => {
      Object.keys(d).forEach((k) => allKeys.add(k));
    });

    const keysArray = Array.from(allKeys);

    // Create Table Statement
    sql += `CREATE TABLE IF NOT EXISTS ${escapeIdentifier(tableName)} (\n`;
    const colDefs: string[] = [];
    keysArray.forEach((key) => {
      if (key === "id") {
        colDefs.push(`  ${escapeIdentifier(key)} TEXT PRIMARY KEY`);
      } else {
        // Detect inferable data type
        let colType = "TEXT";
        const sampleVal = docs.find((d) => d[key] !== undefined && d[key] !== null)?.[key];
        if (typeof sampleVal === "boolean") colType = "BOOLEAN";
        else if (typeof sampleVal === "number") colType = Number.isInteger(sampleVal) ? "BIGINT" : "NUMERIC";
        else if (typeof sampleVal === "object") colType = "JSONB";
        
        colDefs.push(`  ${escapeIdentifier(key)} ${colType}`);
      }
    });
    sql += colDefs.join(",\n");
    sql += `\n);\n\n`;

    // Insert Statements
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

  const sqlPath = path.resolve(process.cwd(), "supabase_migration.sql");
  fs.writeFileSync(sqlPath, sql, "utf-8");
  console.log(`Saved Supabase SQL export to: ${sqlPath}`);
  console.log("DB Export completed successfully!");
}

exportData().catch((e) => {
  console.error("Export script error:", e);
  process.exit(1);
});
