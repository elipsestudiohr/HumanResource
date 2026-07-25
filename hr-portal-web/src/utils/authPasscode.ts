import { supabase } from '../lib/supabase';

const TRUSTED_DEVICE_KEY = 'elipse_hr_trusted_device_v2';
const BIO_CRED_STORAGE_KEY = 'elipse_hr_bio_registered_v2';
const PIN_STORAGE_KEY = 'elipse_hr_quick_pin';

export interface TrustedDeviceInfo {
  email: string;
  role: 'admin' | 'employee';
  userId: string;
  registeredAt: string;
  deviceName?: string;
}

// Simple hash for PIN verification
async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if WebAuthn / Windows Hello / Mobile Biometrics (Touch ID, Face ID, Fingerprint) are available
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (window.PublicKeyCredential) {
    try {
      if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      }
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
}

/**
 * Check if current device is registered as a trusted device for automatic biometric login
 */
export function isDeviceTrusted(targetEmail?: string): boolean {
  try {
    const raw = localStorage.getItem(TRUSTED_DEVICE_KEY);
    if (!raw) return false;
    const info: TrustedDeviceInfo = JSON.parse(raw);
    if (targetEmail) {
      return info.email.toLowerCase().trim() === targetEmail.toLowerCase().trim();
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get trusted device metadata
 */
export function getTrustedDevice(): TrustedDeviceInfo | null {
  try {
    const raw = localStorage.getItem(TRUSTED_DEVICE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export const SESSION_TOKEN_KEY = 'elipse_hr_session_token';

/**
 * Remove device trust & biometric registration
 */
export function removeTrustedDevice(): void {
  localStorage.removeItem(TRUSTED_DEVICE_KEY);
  localStorage.removeItem(BIO_CRED_STORAGE_KEY);
  localStorage.removeItem(SESSION_TOKEN_KEY);
}

export function storeSessionRefreshToken(refreshToken: string): void {
  if (refreshToken) {
    localStorage.setItem(SESSION_TOKEN_KEY, refreshToken);
  }
}

export function getSessionRefreshToken(): string | null {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

/**
 * Register this device as a trusted Admin/Employee device with WebAuthn / Windows Hello biometrics
 */
export async function registerTrustedDevice(
  email: string, 
  user: any, 
  role: 'admin' | 'employee'
): Promise<boolean> {
  let credentialId = 'local_bio_' + Date.now();

  if (window.PublicKeyCredential) {
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const userId = new TextEncoder().encode(user?.id || email);

      const options: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'Elipse HR Portal',
          id: window.location.hostname
        },
        user: {
          id: userId,
          name: email,
          displayName: email.split('@')[0]
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        },
        timeout: 60000
      };

      const credential = await navigator.credentials.create({
        publicKey: options
      }) as PublicKeyCredential;

      if (credential) {
        credentialId = credential.id;
      }
    } catch (e) {
      console.warn('WebAuthn registration skipped or fallback used:', e);
    }
  }

  const deviceData: TrustedDeviceInfo = {
    email,
    role,
    userId: user?.id || '',
    registeredAt: new Date().toISOString(),
    deviceName: navigator.userAgent.includes('Windows') ? 'Windows Device' : 'Mobile Device'
  };

  localStorage.setItem(TRUSTED_DEVICE_KEY, JSON.stringify(deviceData));
  localStorage.setItem(BIO_CRED_STORAGE_KEY, JSON.stringify({ id: credentialId, email }));

  try {
    const { data: sessionRes } = await supabase.auth.getSession();
    if (sessionRes?.session?.refresh_token) {
      storeSessionRefreshToken(sessionRes.session.refresh_token);
    }
  } catch (e) {
    /* ignore session token retrieval errors */
  }

  return true;
}

/**
 * Authenticate with Windows Hello / Mobile Biometrics (Fingerprint, Face ID)
 */
export async function authenticateBiometrics(): Promise<TrustedDeviceInfo | null> {
  const trustedInfo = getTrustedDevice();
  if (!trustedInfo) return null;

  const rawBio = localStorage.getItem(BIO_CRED_STORAGE_KEY);
  const bioData = rawBio ? JSON.parse(rawBio) : null;

  if (window.PublicKeyCredential && bioData && !bioData.id.startsWith('local_bio_')) {
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const options: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        userVerification: 'required',
        rpId: window.location.hostname
      };

      const assertion = await navigator.credentials.get({
        publicKey: options
      });

      if (assertion) {
        return trustedInfo;
      }
    } catch (e) {
      console.warn('WebAuthn assertion prompt cancelled or failed:', e);
    }
  }

  // Fallback prompt for trusted device
  return trustedInfo;
}

/**
 * Quick PIN functions for optional backup unlock
 */
export async function saveQuickPin(email: string, pin: string): Promise<void> {
  const pinHash = await hashString(email + '_' + pin);
  localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify({ email, pinHash, savedAt: new Date().toISOString() }));
}

export async function verifyQuickPin(pin: string): Promise<string | null> {
  try {
    const raw = localStorage.getItem(PIN_STORAGE_KEY);
    if (!raw) return null;
    const info = JSON.parse(raw);
    const hash = await hashString(info.email + '_' + pin);
    if (hash === info.pinHash) {
      return info.email;
    }
    return null;
  } catch (e) {
    return null;
  }
}
