const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'data', 'sph.db');

// Pastikan folder data ada
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

const db = new Database(DB_PATH);

// Aktifkan WAL mode untuk performa lebih baik
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Inisialisasi tabel
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'staff')),
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nomor TEXT,
    perihal TEXT DEFAULT 'Penawaran Harga',
    lampiran TEXT DEFAULT '',
    client_title TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_address TEXT NOT NULL,
    client_city TEXT NOT NULL DEFAULT 'di Tempat',
    items TEXT NOT NULL,
    ppn_included INTEGER DEFAULT 1,
    ongkir_included INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    reject_reason TEXT DEFAULT '',
    created_by INTEGER NOT NULL,
    approved_by INTEGER,
    approved_at TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Cek apakah sudah ada data awal
const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
if (!adminExists) {
  // Buat user admin dan staff default
  const insertUser = db.prepare(`
    INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)
  `);

  insertUser.run('admin', 'admin123', 'Administrator', 'admin');
  insertUser.run('staff1', 'staff123', 'Staff Penjualan 1', 'staff');

  console.log('✅ User default dibuat: admin/admin123 dan staff1/staff123');
}

// Cek pengaturan perusahaan
const companyExists = db.prepare("SELECT value FROM settings WHERE key = 'company_name'").get();
if (!companyExists) {
  const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('company_name', 'PT. Lapan Alpha Kirana');
  insertSetting.run('company_tagline', 'Perdagangan Alat Kesehatan');
  insertSetting.run('company_address', 'Jakarta');
  insertSetting.run('signer_name', 'Aris Hamdanny');
  insertSetting.run('signer_title', 'General Manager');
  insertSetting.run('nomor_prefix', 'PMH-LAK');
}

module.exports = db;
