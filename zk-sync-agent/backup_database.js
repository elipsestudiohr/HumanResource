const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// All database tables to back up
const TABLES = [
  'profiles',
  'raw_attendance_logs',
  'leave_requests',
  'complaints',
  'announcements',
  'notifications',
  'holidays',
  'employee_loans',
  'shift_timings',
  'trusted_devices',
  'device_settings',
  'purpose_transfers'
];

/**
 * Fetch all records from a table using pagination
 */
async function fetchTableData(tableName) {
  const allRows = [];
  const pageSize = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, from + pageSize - 1);

    if (error) {
      // Table might not exist or empty
      console.warn(`  [${tableName}] Warning: ${error.message}`);
      return allRows;
    }

    if (data && data.length > 0) {
      allRows.push(...data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }
    } else {
      hasMore = false;
    }
  }

  return allRows;
}

/**
 * Perform complete database backup
 */
async function performBackup(customDir = null, customDate = null) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dateFolder = customDate || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  let baseBackupDir = customDir;
  if (!baseBackupDir) {
    try {
      const { data: dbSettings } = await supabase
        .from('device_settings')
        .select('backup_directory, auto_backup_enabled')
        .eq('id', 1)
        .maybeSingle();

      if (dbSettings && dbSettings.backup_directory) {
        baseBackupDir = dbSettings.backup_directory;
      }
    } catch (e) {}
  }

  if (!baseBackupDir) {
    baseBackupDir = path.resolve(__dirname, '..', 'backups');
  }

  const targetDateDir = path.join(baseBackupDir, dateFolder);

  if (!fs.existsSync(baseBackupDir)) {
    fs.mkdirSync(baseBackupDir, { recursive: true });
  }
  if (!fs.existsSync(targetDateDir)) {
    fs.mkdirSync(targetDateDir, { recursive: true });
  }

  console.log(`=======================================================`);
  console.log(`[${now.toISOString()}] Starting Supabase Database Backup`);
  console.log(`Target Base Folder: ${baseBackupDir}`);
  console.log(`Date Snapshot Folder: ${targetDateDir}`);
  console.log(`=======================================================`);

  const summary = {
    backup_timestamp: now.toISOString(),
    backup_date: dateFolder,
    backup_directory: targetDateDir,
    tables: {}
  };

  const fullDatabaseDump = {};

  for (const table of TABLES) {
    try {
      process.stdout.write(`Backing up table: ${table}... `);
      const rows = await fetchTableData(table);
      summary.tables[table] = rows.length;
      fullDatabaseDump[table] = rows;

      // Write individual table JSON file directly in base backup folder (and date folder)
      const rootTablePath = path.join(baseBackupDir, `${table}.json`);
      fs.writeFileSync(rootTablePath, JSON.stringify(rows, null, 2), 'utf-8');
      
      const tableFilePath = path.join(targetDateDir, `${table}.json`);
      fs.writeFileSync(tableFilePath, JSON.stringify(rows, null, 2), 'utf-8');
      console.log(`Done (${rows.length} rows)`);
    } catch (err) {
      console.error(`FAILED: ${err.message}`);
      summary.tables[table] = { error: err.message };
    }
  }

  // Write full consolidated JSON dump directly into base folder and date folder
  fs.writeFileSync(path.join(baseBackupDir, `full_database_dump.json`), JSON.stringify(fullDatabaseDump, null, 2), 'utf-8');
  fs.writeFileSync(path.join(targetDateDir, `full_database_dump.json`), JSON.stringify(fullDatabaseDump, null, 2), 'utf-8');

  // Write backup summary metadata
  fs.writeFileSync(path.join(baseBackupDir, `_backup_summary.json`), JSON.stringify(summary, null, 2), 'utf-8');
  fs.writeFileSync(path.join(targetDateDir, `_backup_summary.json`), JSON.stringify(summary, null, 2), 'utf-8');

  // Create or update "latest" link/folder
  const latestDir = path.join(baseBackupDir, 'latest');
  if (!fs.existsSync(latestDir)) {
    fs.mkdirSync(latestDir, { recursive: true });
  }
  for (const table of TABLES) {
    if (fullDatabaseDump[table]) {
      fs.writeFileSync(path.join(latestDir, `${table}.json`), JSON.stringify(fullDatabaseDump[table], null, 2), 'utf-8');
    }
  }
  fs.writeFileSync(path.join(latestDir, `full_database_dump.json`), JSON.stringify(fullDatabaseDump, null, 2), 'utf-8');

  // Update last_backup_time on device_settings in Supabase
  try {
    await supabase
      .from('device_settings')
      .update({ last_backup_time: now.toISOString() })
      .eq('id', 1);
  } catch (err) {}

  console.log(`=======================================================`);
  console.log(`Database Backup Complete!`);
  console.log(`All files saved to: ${targetDateDir}`);
  console.log(`Summary:`, JSON.stringify(summary.tables, null, 2));
  console.log(`=======================================================`);

  return summary;
}

if (require.main === module) {
  const customArgDir = process.argv[2] || null;
  const customArgDate = process.argv[3] || null;
  performBackup(customArgDir, customArgDate)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal backup error:', err);
      process.exit(1);
    });
}

module.exports = { performBackup };
