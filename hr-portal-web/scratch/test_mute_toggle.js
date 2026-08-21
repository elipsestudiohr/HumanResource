import { getDeviceSettings, updateDeviceSettings } from '../src/lib/dbHelper.js';

async function run() {
  console.log('--- Initial Settings ---');
  let settings = await getDeviceSettings();
  console.log('Initial is_notifications_muted:', settings.is_notifications_muted);

  console.log('--- Setting Muted = true ---');
  await updateDeviceSettings({ is_notifications_muted: true });
  settings = await getDeviceSettings();
  console.log('After Muting is_notifications_muted:', settings.is_notifications_muted);

  console.log('--- Setting Muted = false ---');
  await updateDeviceSettings({ is_notifications_muted: false });
  settings = await getDeviceSettings();
  console.log('After Unmuting is_notifications_muted:', settings.is_notifications_muted);
}

run();
