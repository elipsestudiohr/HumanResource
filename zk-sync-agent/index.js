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
  console.log(`Connecting to ZKTeco machine at ${deviceIp}:${devicePort}...`);

  // Initialize ZKLib
  // params: ip, port, timeout, inport (for UDP), comm_code, protocol
  const zk = new ZKLib(deviceIp, devicePort, 15000, 4000, 0, 'tcp');

  try {
    // 1. Connect to the device
    await zk.createSocket();
    console.log('Connected to ZKTeco machine successfully.');

    // 2. Fetch attendance logs
    console.log('Fetching attendance logs from device memory...');
    const logs = await zk.getAttendances((received, total) => {
      if (received % 100 === 0 || received === total) {
        console.log(`Downloaded logs: ${received}/${total}`);
      }
    });

    if (!logs || !logs.data || logs.data.length === 0) {
      console.log('No attendance logs found on the device.');
      return;
    }

    console.log(`Successfully retrieved ${logs.data.length} raw records from device.`);

    // Log the structure of the first record for debugging / verification
    console.log('Sample device record structure:', JSON.stringify(logs.data[0]));

    // 3. Format logs for Supabase
    // ZKTeco logs fields mapping:
    // - deviceUserId or userId: The pin of the employee (as a string)
    // - recordTime: Date object or ISO string of the check-in/out
    // - verifyType or verifyMethod: biometric verification method (fingerprint, card, password)
    // - status: 0 for check-in, 1 for check-out (or auto)
    const formattedRecords = logs.data.map(log => {
      const pin = log.deviceUserId || log.userId || log.uid;
      const rawTime = log.recordTime || log.timestamp;
      
      if (!pin || !rawTime) {
        return null; // Skip invalid records
      }

      // Convert recordTime to ISO string format (Supabase timestamptz)
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

    // 4. Batch upload/upsert to Supabase
    // We use upsert on the unique constraint (employee_pin, timestamp) to prevent duplicates.
    console.log('Syncing records with Supabase database...');
    
    // Process in batches of 500 to prevent query payload size issues
    const BATCH_SIZE = 500;
    let successfulCount = 0;

    for (let i = 0; i < formattedRecords.length; i += BATCH_SIZE) {
      const batch = formattedRecords.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('raw_attendance_logs')
        .upsert(batch, { 
          onConflict: 'employee_pin,timestamp',
          ignoreDuplicates: true // Do not overwrite existing records
        });

      if (error) {
        console.error(`Error uploading batch starting at index ${i}:`, error.message);
        throw error;
      }
      
      successfulCount += batch.length;
      console.log(`Synced batch: ${successfulCount}/${formattedRecords.length} records processed.`);
    }

    console.log(`[${new Date().toISOString()}] Sync completed successfully!`);

  } catch (err) {
    console.error(`[${new Date().toISOString()}] Sync failed:`, err.message || err);
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
