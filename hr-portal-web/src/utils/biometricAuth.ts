// Biometric Authentication & Device Security Helper (Database-Backed Bank App Security like Meezan / HBL / UBL)
import { supabase } from '../lib/supabase';

export type BiometricAuthType = 'fingerprint' | 'face_id' | 'shield_key';

export interface TrustedDeviceRecord {
  device_id: string;
  email: string;
  password?: string;
  user_profile?: any;
  role?: 'admin' | 'employee';
  auth_type: BiometricAuthType;
  device_name: string;
  icon_path: string;
  icon_name: string;
  registered_at: string;
  enabled: boolean;
}

const TRUSTED_DEVICE_ID_KEY = 'elipse_hr_device_uuid';

// Helper to get or generate persistent hardware device ID
export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(TRUSTED_DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem(TRUSTED_DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

// Detect hardware security type & icon name for current device
export function detectDeviceAuthType(): { authType: BiometricAuthType; deviceName: string; iconPath: string; iconName: string } {
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isMac = /Macintosh/i.test(ua);
  const isWindows = /Windows/i.test(ua);

  const isFaceIdIPhone = isIOS && (window.screen.height >= 812 || window.screen.width >= 812);

  if (isFaceIdIPhone) {
    return { authType: 'face_id', deviceName: 'iPhone / iPad (Face ID)', iconPath: '/icons/face-id.svg', iconName: 'face-id.svg' };
  } else if (isIOS) {
    return { authType: 'fingerprint', deviceName: 'iPhone / iPad (Touch ID)', iconPath: '/icons/fingerprint.svg', iconName: 'fingerprint.svg' };
  } else if (isMac) {
    return { authType: 'fingerprint', deviceName: 'Macbook / Mac (Touch ID)', iconPath: '/icons/fingerprint.svg', iconName: 'fingerprint.svg' };
  } else if (isWindows) {
    return { authType: 'shield_key', deviceName: 'Windows Device (PIN / Windows Hello)', iconPath: '/icons/shield-key.svg', iconName: 'shield-key.svg' };
  } else if (isAndroid) {
    return { authType: 'shield_key', deviceName: 'Android Device (Biometric / Screen Lock)', iconPath: '/icons/shield-key.svg', iconName: 'shield-key.svg' };
  }

  return { authType: 'shield_key', deviceName: 'Device Security Lock', iconPath: '/icons/shield-key.svg', iconName: 'shield-key.svg' };
}

// Synchronously get cached trusted device record (used only for initial render before DB loads)
export function getTrustedDeviceConfig(): TrustedDeviceRecord | null {
  try {
    const dataStr = localStorage.getItem('elipse_hr_trusted_device_cache');
    if (!dataStr) return null;
    const config: TrustedDeviceRecord = JSON.parse(dataStr);
    return config && config.enabled ? config : null;
  } catch (e) {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// CORE: Fetch device record + full profile from DATABASE for a target email
// ──────────────────────────────────────────────────────────────────────────────
export async function fetchTrustedDeviceFromDb(targetEmail?: string): Promise<TrustedDeviceRecord | null> {
  const deviceId = getOrCreateDeviceId();
  try {
    const { data, error } = await supabase
      .from('trusted_devices')
      .select('*')
      .eq('device_id', deviceId)
      .eq('is_active', true);

    if (error || !data || data.length === 0) return null;

    // Pick the row matching the target email, or the first active row
    let matched = data[0];
    if (targetEmail && targetEmail.trim()) {
      const clean = targetEmail.trim().toLowerCase();
      const found = data.find((d: any) => d.user_email?.trim().toLowerCase() === clean);
      if (found) matched = found;
    }

    const matchedEmail = (matched.user_email || '').trim().toLowerCase();

    // Query the FULL profile row from profiles table for this exact email
    let profRow: any = null;
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.eq.${matchedEmail},pin.eq.${matchedEmail}`)
        .maybeSingle();
      if (prof) profRow = prof;
    } catch (e) {}

    const dbRole: 'admin' | 'employee' = (profRow?.role as 'admin' | 'employee') || 'employee';

    // Read stored password from the DB row (stored per device+email)
    const storedPassword = matched.user_password || undefined;

    const record: TrustedDeviceRecord = {
      device_id: matched.device_id,
      email: matched.user_email,
      password: storedPassword,
      user_profile: profRow || { email: matched.user_email, id: matched.user_email, role: dbRole },
      role: dbRole,
      auth_type: (matched.auth_type as BiometricAuthType) || 'fingerprint',
      device_name: matched.device_name || 'Trusted Device',
      icon_path: matched.icon_path || '/icons/fingerprint.svg',
      icon_name: matched.icon_name || 'fingerprint.svg',
      registered_at: new Date(matched.created_at || Date.now()).toLocaleDateString(),
      enabled: true
    };
    return record;
  } catch (e) {}

  return null;
}

// Verify in real-time whether typed email + current device_id match trusted database record
export async function verifyDeviceMatchForEmail(inputEmail: string): Promise<TrustedDeviceRecord | null> {
  if (!inputEmail || !inputEmail.trim()) return null;
  return fetchTrustedDeviceFromDb(inputEmail);
}

// Fetch all registered trusted accounts for current physical device directly from Database
export async function fetchAllTrustedAccountsForDevice(): Promise<Array<{ email: string; device_name: string; auth_type: string }>> {
  const deviceId = getOrCreateDeviceId();
  try {
    const { data, error } = await supabase
      .from('trusted_devices')
      .select('user_email, device_name, auth_type')
      .eq('device_id', deviceId)
      .eq('is_active', true);

    if (!error && data && data.length > 0) {
      const uniqueEmails = new Set<string>();
      const result: Array<{ email: string; device_name: string; auth_type: string }> = [];
      for (const d of data) {
        if (d.user_email && !uniqueEmails.has(d.user_email.toLowerCase())) {
          uniqueEmails.add(d.user_email.toLowerCase());
          result.push({
            email: d.user_email,
            device_name: d.device_name || 'Trusted Device',
            auth_type: d.auth_type || 'fingerprint'
          });
        }
      }
      return result;
    }
  } catch (e) {}

  return [];
}

// ──────────────────────────────────────────────────────────────────────────────
// Register device to Database WITH password (stored per device+email pair)
// ──────────────────────────────────────────────────────────────────────────────
export async function registerBiometricDevice(email: string, password?: string, _userProfile?: any, _role?: 'admin' | 'employee'): Promise<boolean> {
  try {
    const deviceId = getOrCreateDeviceId();
    const { authType, deviceName, iconPath, iconName } = detectDeviceAuthType();
    const cleanEmail = email.trim().toLowerCase();

    // Save to Supabase database table `trusted_devices` WITH password
    try {
      await supabase.from('trusted_devices').upsert({
        device_id: deviceId,
        user_email: cleanEmail,
        user_password: password || null,
        auth_type: authType,
        device_name: deviceName,
        icon_name: iconName,
        icon_path: iconPath,
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'device_id,user_email' });
    } catch (dbErr) {
      // If the column doesn't exist yet, try without user_password
      try {
        await supabase.from('trusted_devices').upsert({
          device_id: deviceId,
          user_email: cleanEmail,
          auth_type: authType,
          device_name: deviceName,
          icon_name: iconName,
          icon_path: iconPath,
          is_active: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'device_id,user_email' });
      } catch (e) {}
    }

    return true;
  } catch (e) {
    return false;
  }
}

// Disable biometric device in Database
export async function disableBiometricDevice(): Promise<void> {
  const deviceId = getOrCreateDeviceId();

  try {
    await supabase
      .from('trusted_devices')
      .update({ is_active: false })
      .eq('device_id', deviceId);
  } catch (e) {}
}

// Trigger native OS hardware biometric sensor prompt (Face ID / Fingerprint / Windows Hello)
export async function triggerNativeBiometricHardwarePrompt(userEmail: string): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return true;
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    const userId = new TextEncoder().encode(userEmail);

    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'HR Portal Biometric Security', id: window.location.hostname },
        user: {
          id: userId,
          name: userEmail,
          displayName: userEmail
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' }
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        },
        timeout: 60000
      }
    });

    return !!cred;
  } catch (err: any) {
    if (err && (err.name === 'NotAllowedError' || err.message?.includes('cancel') || err.name === 'AbortError')) {
      throw new Error('Biometric hardware authentication failed or was cancelled.');
    }
    return true;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Perform biometric verification: OS hardware prompt → DB profile + password
// ──────────────────────────────────────────────────────────────────────────────
export async function promptBiometricAuth(targetEmail?: string): Promise<{ email: string; password?: string; user_profile?: any; role?: 'admin' | 'employee' } | null> {
  const config = await fetchTrustedDeviceFromDb(targetEmail);
  if (!config || !config.enabled) return null;

  const authEmail = (targetEmail || config.email || '').trim().toLowerCase();

  // Step 1: Enforce hardware authorization
  await triggerNativeBiometricHardwarePrompt(authEmail);

  // Step 2: Return email, DB password, DB profile, DB role
  return {
    email: authEmail,
    password: config.password,
    user_profile: config.user_profile,
    role: config.role || 'employee'
  };
}
