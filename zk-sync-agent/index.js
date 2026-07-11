const ZKLib = require('node-zklib');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Validate environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const deviceIp = process.env.ZK_DEVICE_IP;
const devicePort = parseInt(process.env.ZK_DEVICE_PORT || '4370', 10);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in the .env file.');
  process.exit(1);
}

if (!deviceIp) {
  console.error('Error: ZK_DEVICE_IP must be defined in the .env file.');
  process.exit(1);
}

// Initialize Supabase Client (bypassing RLS with service role key)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function runSync() {
  console.log(`[${new Date().toISOString()}] Starting ZKTeco K40 Sync Agent...`);

  // 1. Fetch current connection settings from Supabase device_settings table
  let currentIp = deviceIp;
  let currentPort = devicePort;

  try {
    console.log('Fetching connection settings from Supabase device_settings table...');
    const { data: dbSettings, error: dbSettingsError } = await supabase
      .from('device_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (!dbSettingsError && dbSettings) {
      currentIp = dbSettings.ip_address || deviceIp;
      currentPort = dbSettings.port || devicePort;
      console.log(`Using database configuration: ${currentIp}:${currentPort}`);
    } else {
      console.log(`Failed to fetch db settings (using env fallback): ${dbSettingsError?.message}`);
    }
  } catch (e) {
    console.log('Error reading device_settings table, falling back to .env configuration:', e.message || e);
  }

  console.log(`Connecting to ZKTeco machine at ${currentIp}:${currentPort}...`);

  // Initialize ZKLib
  const zk = new ZKLib(currentIp, currentPort, 15000, 4000, 0, 'tcp');

  try {
    // 2. Connect to the device
    await zk.createSocket();
    console.log('Connected to ZKTeco machine successfully.');

    // Update database status to Online / Connected
    try {
      await supabase
        .from('device_settings')
        .update({
          status: 'Online',
          last_connection_state: 'Connected'
        })
        .eq('id', 1);
    } catch (dbErr) {
      console.error('Failed to update connection status in Supabase:', dbErr.message);
    }

    // 3. Fetch attendance logs
    console.log('Fetching attendance logs from device memory...');
    const logs = await zk.getAttendances((received, total) => {
      if (received % 100 === 0 || received === total) {
        console.log(`Downloaded logs: ${received}/${total}`);
      }
    });

    if (!logs || !logs.data || logs.data.length === 0) {
      console.log('No attendance logs found on the device.');
      // Update sync time even if no logs
      try {
        await supabase
          .from('device_settings')
          .update({
            status: 'Online',
            last_connection_state: 'Sync Completed (No New Logs)',
            last_sync: new Date().toISOString()
          })
          .eq('id', 1);
      } catch (dbErr) {}
      return;
    }

    console.log(`Successfully retrieved ${logs.data.length} raw records from device.`);

    // Format and sync logs
    const formattedRecords = logs.data.map(log => {
      const pin = log.deviceUserId || log.userId || log.uid;
      const rawTime = log.recordTime || log.timestamp;
      
      if (!pin || !rawTime) {
        return null;
      }

      const timestamp = new Date(rawTime).toISOString();

      return {
        employee_pin: pin.toString().trim(),
        timestamp: timestamp,
        verify_type: log.verifyType || log.verifyMethod || 0,
        status_type: log.status || log.state || 0
      };
    }).filter(record => record !== null);

    console.log(`Formatted ${formattedRecords.length} valid records for database insertion.`);

    if (formattedRecords.length === 0) {
      console.log('No valid records to upload.');
      return;
    }

    console.log('Syncing records with Supabase database...');
    const BATCH_SIZE = 500;
    let successfulCount = 0;

    for (let i = 0; i < formattedRecords.length; i += BATCH_SIZE) {
      const batch = formattedRecords.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('raw_attendance_logs')
        .upsert(batch, { 
          onConflict: 'employee_pin,timestamp',
          ignoreDuplicates: true
        });

      if (error) {
        console.error(`Error uploading batch starting at index ${i}:`, error.message);
        throw error;
      }
      
      successfulCount += batch.length;
      console.log(`Synced batch: ${successfulCount}/${formattedRecords.length} records processed.`);
    }

    console.log(`[${new Date().toISOString()}] Sync completed successfully!`);

    // Update database sync completion
    try {
      await supabase
        .from('device_settings')
        .update({
          status: 'Online',
          last_connection_state: 'Sync Completed',
          last_sync: new Date().toISOString()
        })
        .eq('id', 1);
    } catch (dbErr) {
      console.error('Failed to update sync info in Supabase:', dbErr.message);
    }

  } catch (err) {
    const errMsg = err.message || err;
    console.error(`[${new Date().toISOString()}] Sync failed:`, errMsg);

    // Update database status to Offline with error details
    try {
      await supabase
        .from('device_settings')
        .update({
          status: 'Offline',
          last_connection_state: `Failed: ${errMsg}`
        })
        .eq('id', 1);
    } catch (dbErr) {}

  } finally {
    try {
      console.log('Disconnecting from ZKTeco machine...');
      await zk.disconnect();
      console.log('Disconnected.');
    } catch (disconErr) {
      // Ignore disconnect errors
    }
  }
}

// Run the sync
runSync();
