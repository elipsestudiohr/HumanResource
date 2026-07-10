const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in the .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Generate mock attendance data for testing
function generateMockLogs() {
  const logs = [];
  const pins = ['1001', '1002', '1003'];
  const today = new Date();
  
  // Generate logs for the past 14 days
  for (let i = 14; i >= 0; i--) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() - i);
    
    // Skip Sundays
    if (currentDate.getDay() === 0) continue;

    const dateStr = currentDate.toISOString().split('T')[0];

    // Alternate Saturdays (Let's say odd Saturdays are on, even Saturdays are off)
    // We will generate logs for all Saturdays, and let the frontend processor filter out the off days!
    
    pins.forEach(pin => {
      // Create random check-in and check-out times
      let checkInHour, checkInMinute, checkOutHour, checkOutMinute;

      if (pin === '1001') {
        // Employee 1001: Always on time, leaves slightly after 8:00 PM
        checkInHour = 10;
        checkInMinute = 50 + Math.floor(Math.random() * 10); // 10:50 AM - 11:00 AM
        checkOutHour = 20;
        checkOutMinute = 5 + Math.floor(Math.random() * 15); // 8:05 PM - 8:20 PM
      } else if (pin === '1002') {
        // Employee 1002: Often late, leaves exactly at 8:00 PM
        const isLate = Math.random() > 0.4;
        checkInHour = 11;
        checkInMinute = isLate ? 6 + Math.floor(Math.random() * 20) : 0; // Late check-in (11:06 - 11:26) or exactly 11:00
        checkOutHour = 20;
        checkOutMinute = 0;
      } else {
        // Employee 1003: On time, works heavy overtime (leaves around 9:30 PM)
        checkInHour = 10;
        checkInMinute = 45 + Math.floor(Math.random() * 15); // 10:45 AM - 11:00 AM
        checkOutHour = 21;
        checkOutMinute = 15 + Math.floor(Math.random() * 30); // 9:15 PM - 9:45 PM
      }

      // 1. Check-In log
      const checkInTime = new Date(currentDate);
      checkInTime.setHours(checkInHour, checkInMinute, Math.floor(Math.random() * 60));
      logs.push({
        employee_pin: pin,
        timestamp: checkInTime.toISOString(),
        verify_type: 1, // fingerprint
        status_type: 0  // check-in
      });

      // 2. Check-Out log (only if they checked in)
      const checkOutTime = new Date(currentDate);
      checkOutTime.setHours(checkOutHour, checkOutMinute, Math.floor(Math.random() * 60));
      logs.push({
        employee_pin: pin,
        timestamp: checkOutTime.toISOString(),
        verify_type: 1, // fingerprint
        status_type: 1  // check-out
      });
    });
  }

  return logs;
}

async function uploadMockLogs() {
  console.log('Generating mock attendance logs for PINs 1001, 1002, 1003...');
  const logs = generateMockLogs();
  console.log(`Generated ${logs.length} mock punch logs.`);

  console.log('Uploading mock logs to Supabase raw_attendance_logs...');
  const { data, error } = await supabase
    .from('raw_attendance_logs')
    .upsert(logs, { 
      onConflict: 'employee_pin,timestamp',
      ignoreDuplicates: true 
    });

  if (error) {
    console.error('Error inserting mock logs:', error.message);
  } else {
    console.log('Successfully uploaded mock logs! Database is populated with test attendance.');
  }
}

uploadMockLogs();
