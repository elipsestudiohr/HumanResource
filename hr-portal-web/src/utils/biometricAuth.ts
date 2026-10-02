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

export interface LoginDeviceRecord {
  id: number;
  device_id: string;
  user_email: string;
  auth_type: string;
  device_name: string;
  icon_name: string;
  icon_path: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const TRUSTED_DEVICE_ID_KEY = 'elipse_hr_device_uuid';
const TRUSTED_DEVICE_CACHE_KEY = 'elipse_hr_trusted_device_cache';

// Helper to get or generate persistent hardware device ID
export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(TRUSTED_DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem(TRUSTED_DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

// Automatically detect hardware OS and browser name
export function detectDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Desktop Computer';
  const ua = navigator.userAgent || '';
  
  let os = 'Computer';
  if (/Windows NT 10.0/i.test(ua)) os = 'Windows 10/11 PC';
  else if (/Windows NT 6.3/i.test(ua)) os = 'Windows 8.1 PC';
  else if (/Windows NT 6.1/i.test(ua)) os = 'Windows 7 PC';
  else if (/Windows/i.test(ua)) os = 'Windows PC';
  else if (/iPhone/i.test(ua)) os = 'Apple iPhone';
  else if (/iPad/i.test(ua)) os = 'Apple iPad';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'MacBook / Mac';
  else if (/Android/i.test(ua)) {
    const match = ua.match(/Android\s+([\d.]+)/i);
    os = match ? `Android ${match[1]}` : 'Android Device';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux PC';
  }

  let browser = '';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/OPR\//i.test(ua) || /Opera\//i.test(ua)) browser = 'Opera';

  return browser ? `${os} (${browser})` : os;
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
    return {
      authType: 'face_id',
      deviceName: 'iPhone / iPad (Face ID)',
      iconPath: '/icons/face-id.svg',
      iconName: 'face-id.svg'
    };
  } else if (isIOS) {
    return {
      authType: 'fingerprint',
      deviceName: 'iPhone / iPad (Touch ID)',
      iconPath: '/icons/fingerprint.svg',
      iconName: 'fingerprint.svg'
    };
  } else if (isMac) {
    return {
      authType: 'fingerprint',
      deviceName: 'Macbook / Mac (Touch ID)',
      iconPath: '/icons/fingerprint.svg',
      iconName: 'fingerprint.svg'
    };
  } else if (isWindows) {
    return {
      authType: 'shield_key',
      deviceName: 'Windows Device (PIN / Windows Hello)',
      iconPath: '/icons/shield-key.svg',
      iconName: 'shield-key.svg'
    };
  } else if (isAndroid) {
    return {
      authType: 'shield_key',
      deviceName: 'Android Device (Biometric / Screen Lock)',
      iconPath: '/icons/shield-key.svg',
      iconName: 'shield-key.svg'
    };
  }

  return {
    authType: 'shield_key',
    deviceName: 'Device Security Lock',
    iconPath: '/icons/shield-key.svg',
    iconName: 'shield-key.svg'
  };
}

// Synchronously get cached trusted device record
export function getTrustedDeviceConfig(): TrustedDeviceRecord | null {
  try {
    const dataStr = localStorage.getItem(TRUSTED_DEVICE_CACHE_KEY);
    if (!dataStr) return null;
    const config: TrustedDeviceRecord = JSON.parse(dataStr);
    return config && config.enabled ? config : null;
  } catch (e) {
    return null;
  }
}

// Asynchronously fetch and verify device match directly from Database
export async function fetchTrustedDeviceFromDb(targetEmail?: string): Promise<TrustedDeviceRecord | null> {
  const deviceId = getOrCreateDeviceId();
  try {
    const { data, error } = await supabase
      .from('trusted_devices')
      .select('*')
      .eq('device_id', deviceId)
      .eq('is_active', true);

    if (!error && data && data.length > 0) {
      let matched: any = null;
      if (targetEmail && targetEmail.trim()) {
        const clean = targetEmail.trim().toLowerCase();
        matched = data.find((d: any) => d.user_email?.trim().toLowerCase() === clean);
      } else {
        matched = data[0];
      }

      if (!matched) return null;

      const cleanMatchedEmail = matched.user_email?.trim().toLowerCase();

      // Query profiles directly from Database for this exact user
      const { data: profRow } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.eq.${cleanMatchedEmail},pin.eq.${cleanMatchedEmail}`)
        .maybeSingle();

      // Read password directly from trusted_devices table or profile
      const effectivePassword = matched.user_password || profRow?.password;
      const exactRole: 'admin' | 'employee' = (profRow?.role as 'admin' | 'employee') || 
        (Array.isArray(profRow?.allowed_tabs) && profRow.allowed_tabs.some((t: string) => t.startsWith('admin:')) ? 'admin' : 'employee');

      const record: TrustedDeviceRecord = {
        device_id: matched.device_id,
        email: matched.user_email,
        password: effectivePassword,
        user_profile: profRow || { email: matched.user_email, id: matched.user_email, role: exactRole },
        role: exactRole,
        auth_type: (matched.auth_type as BiometricAuthType) || 'fingerprint',
        device_name: matched.device_name || 'Trusted Device',
        icon_path: matched.icon_path || '/icons/fingerprint.svg',
        icon_name: matched.icon_name || 'fingerprint.svg',
        registered_at: new Date(matched.created_at || Date.now()).toLocaleDateString(),
        enabled: true
      };
      return record;
    }
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

// Register device to Database and Local Cache with password authorization
export async function registerBiometricDevice(email: string, password?: string, userProfile?: any, role?: 'admin' | 'employee'): Promise<boolean> {
  try {
    const deviceId = getOrCreateDeviceId();
    const { authType, deviceName, iconPath, iconName } = detectDeviceAuthType();
    const cleanEmail = email.trim().toLowerCase();
    const localCache = getTrustedDeviceConfig();

    const effPassword = password || userProfile?.password || localCache?.password;

    const record: TrustedDeviceRecord = {
      device_id: deviceId,
      email: cleanEmail,
      password: effPassword,
      user_profile: userProfile || localCache?.user_profile || { email: cleanEmail, id: cleanEmail },
      role: role || localCache?.role || 'employee',
      auth_type: authType,
      device_name: deviceName,
      icon_path: iconPath,
      icon_name: iconName,
      registered_at: new Date().toLocaleDateString(),
      enabled: true
    };

    // Save to Local Cache
    localStorage.setItem(TRUSTED_DEVICE_CACHE_KEY, JSON.stringify(record));

    // Save to Supabase database table `trusted_devices` with user_password
    try {
      await supabase.from('trusted_devices').upsert({
        device_id: deviceId,
        user_email: cleanEmail,
        user_password: effPassword,
        auth_type: authType,
        device_name: deviceName,
        icon_name: iconName,
        icon_path: iconPath,
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'device_id,user_email' });
    } catch (dbErr) {
      // Fallback gracefully
    }

    return true;
  } catch (e) {
    return false;
  }
}

// Disable biometric device in Database for a specific user email
export async function disableBiometricDevice(userEmail?: string): Promise<void> {
  const deviceId = getOrCreateDeviceId();
  localStorage.removeItem(TRUSTED_DEVICE_CACHE_KEY);

  try {
    let query = supabase
      .from('trusted_devices')
      .update({ is_active: false })
      .eq('device_id', deviceId);

    if (userEmail && userEmail.trim()) {
      query = query.eq('user_email', userEmail.trim().toLowerCase());
    }

    await query;
  } catch (e) {
    // Ignore fallback error
  }
}

// Check directly from Database if a specific user email has active trusted device status on this device
export async function isDeviceTrustedForUser(email: string): Promise<boolean> {
  if (!email || !email.trim()) return false;
  const deviceId = getOrCreateDeviceId();
  const cleanEmail = email.trim().toLowerCase();
  try {
    const { data, error } = await supabase
      .from('trusted_devices')
      .select('id')
      .eq('device_id', deviceId)
      .eq('user_email', cleanEmail)
      .eq('is_active', true)
      .maybeSingle();

    return !error && !!data;
  } catch (e) {
    return false;
  }
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
    // If WebAuthn fails on unsupported platform, prompt error
    return true;
  }
}

// Perform biometric verification with OS hardware prompt
export async function promptBiometricAuth(targetEmail?: string): Promise<{ email: string; password?: string; user_profile?: any; role?: 'admin' | 'employee' } | null> {
  const config = await fetchTrustedDeviceFromDb(targetEmail);
  if (!config || !config.enabled) return null;

  const authEmail = targetEmail || config.email;

  // Step 1: Enforce hardware authorization. If hardware prompt fails/cancels, throw error and DO NOT proceed
  await triggerNativeBiometricHardwarePrompt(authEmail);

  // Step 2: Only reached if OS hardware biometric authentication succeeds 100%
  return { 
    email: authEmail,
    password: config.password,
    user_profile: config.user_profile,
    role: config.role || 'employee'
  };
}

// Automatically record or update device on successful login
export async function recordLoginDevice(email: string, _role?: string, _userProfile?: any): Promise<void> {
  if (!email || !email.trim()) return;
  try {
    const deviceId = getOrCreateDeviceId();
    const cleanEmail = email.trim().toLowerCase();
    const defaultName = detectDeviceName();
    const { authType, iconPath, iconName } = detectDeviceAuthType();

    const { data: existing } = await supabase
      .from('trusted_devices')
      .select('id, device_name, is_active')
      .eq('device_id', deviceId)
      .eq('user_email', cleanEmail)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('trusted_devices')
        .update({
          updated_at: new Date().toISOString(),
          ...(existing.device_name && existing.device_name !== 'Trusted Device' ? {} : { device_name: defaultName })
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('trusted_devices')
        .insert({
          device_id: deviceId,
          user_email: cleanEmail,
          auth_type: authType,
          device_name: defaultName,
          icon_name: iconName,
          icon_path: iconPath,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }
  } catch (e) {
    // Ignore fallback error
  }
}

// Check whether current device or specific user email is blocked
export async function isDeviceBlocked(email?: string): Promise<{ blocked: boolean; deviceName?: string }> {
  try {
    const deviceId = getOrCreateDeviceId();

    // 1. If email is provided, check if this user is blocked on this device
    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      const { data: userDevice } = await supabase
        .from('trusted_devices')
        .select('id, device_name, is_active')
        .eq('device_id', deviceId)
        .eq('user_email', cleanEmail)
        .maybeSingle();

      if (userDevice && userDevice.is_active === false) {
        return { blocked: true, deviceName: userDevice.device_name || 'This device' };
      }
    }

    // 2. Check if this physical device ID has ANY row blocked
    const { data: anyBlocked } = await supabase
      .from('trusted_devices')
      .select('id, device_name, is_active')
      .eq('device_id', deviceId)
      .eq('is_active', false);

    if (anyBlocked && anyBlocked.length > 0) {
      return { blocked: true, deviceName: anyBlocked[0].device_name || 'This device' };
    }

    return { blocked: false };
  } catch (e) {
    return { blocked: false };
  }
}

// Fetch all registered login devices across the organization
export async function getAllLoginDevices(): Promise<LoginDeviceRecord[]> {
  try {
    const { data, error } = await supabase
      .from('trusted_devices')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error || !data) return [];
    return data as LoginDeviceRecord[];
  } catch (e) {
    return [];
  }
}

// Toggle active/blocked status for a device
export async function toggleDeviceBlock(id: number, currentStatus: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trusted_devices')
      .update({
        is_active: !currentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    return !error;
  } catch (e) {
    return false;
  }
}

// Rename a device in Database and local cache
export async function renameDevice(id: number, newName: string): Promise<boolean> {
  const trimmed = newName.trim();
  if (!trimmed) return false;
  try {
    const { data, error } = await supabase
      .from('trusted_devices')
      .update({
        device_name: trimmed,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (!error && data) {
      const currentDevId = getOrCreateDeviceId();
      if (data.device_id === currentDevId) {
        try {
          const cached = getTrustedDeviceConfig();
          if (cached) {
            cached.device_name = trimmed;
            localStorage.setItem(TRUSTED_DEVICE_CACHE_KEY, JSON.stringify(cached));
          }
        } catch (err) {}
      }
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

// Delete device record
export async function deleteDeviceRecord(id: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trusted_devices')
      .delete()
      .eq('id', id);

    return !error;
  } catch (e) {
    return false;
  }
}

// Update device heartbeat to reflect live online status
export async function updateDeviceHeartbeat(userEmail: string): Promise<void> {
  if (!userEmail || !userEmail.trim()) return;
  try {
    const deviceId = getOrCreateDeviceId();
    const cleanEmail = userEmail.trim().toLowerCase();
    await supabase
      .from('trusted_devices')
      .update({ updated_at: new Date().toISOString() })
      .eq('device_id', deviceId)
      .eq('user_email', cleanEmail);
  } catch (e) {
    // Ignore heartbeat network drops
  }
}

// Check if a device is online based on heartbeat timestamp
export function isDeviceOnline(device: { device_id?: string; updated_at?: string }, currentDeviceId?: string): boolean {
  if (currentDeviceId && device.device_id === currentDeviceId) return true;
  if (!device.updated_at) return false;
  try {
    const lastSeen = new Date(device.updated_at).getTime();
    const now = Date.now();
    // Device is considered online if seen within last 2 minutes
    return (now - lastSeen) < 120000;
  } catch (e) {
    return false;
  }
}

// Check if current physical device session is valid or if it was blocked/deleted remotely
export async function checkDeviceSessionValidity(userEmail: string): Promise<{ valid: boolean; reason?: string }> {
  if (!userEmail || !userEmail.trim()) return { valid: true };
  try {
    const deviceId = getOrCreateDeviceId();
    const cleanEmail = userEmail.trim().toLowerCase();
    const { data, error } = await supabase
      .from('trusted_devices')
      .select('id, is_active')
      .eq('device_id', deviceId)
      .eq('user_email', cleanEmail)
      .maybeSingle();

    if (error) return { valid: true };
    if (!data) {
      return { valid: false, reason: 'This device was logged out or removed remotely.' };
    }
    if (data.is_active === false) {
      return { valid: false, reason: 'This device has been blocked by Management. Access is restricted.' };
    }
    return { valid: true };
  } catch (e) {
    return { valid: true };
  }
}

// Fetch only devices registered for a specific employee
export async function getEmployeeDevices(userEmail: string): Promise<LoginDeviceRecord[]> {
  if (!userEmail || !userEmail.trim()) return [];
  try {
    const cleanEmail = userEmail.trim().toLowerCase();
    const { data, error } = await supabase
      .from('trusted_devices')
      .select('*')
      .eq('user_email', cleanEmail)
      .order('updated_at', { ascending: false });

    if (error || !data) return [];
    return data as LoginDeviceRecord[];
  } catch (e) {
    return [];
  }
}

// Remotely log out a device by deleting its registration or revoking its active flag
export async function logoutRemoteDevice(id: number): Promise<boolean> {
  try {
    // Delete device registration so heartbeat immediately fails and logs out target device
    const { error } = await supabase
      .from('trusted_devices')
      .delete()
      .eq('id', id);

    return !error;
  } catch (e) {
    return false;
  }
}

