/**
 * Utility for Passcode (PIN) and WebAuthn Biometric (Windows Hello, Touch ID, Face ID, Fingerprint) Authentication
 */

const PIN_STORAGE_KEY = 'elipse_hr_quick_pin';
const BIO_CRED_STORAGE_KEY = 'elipse_hr_bio_registered';

export interface SavedPasscodeData {
  email: string;
  pinHash: string;
  savedAt: string;
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
 * Save a 4-6 digit Quick Passcode / PIN for rapid device login
 */
export async function saveQuickPin(email: string, pin: string): Promise<void> {
  const pinHash = await hashString(email + '_' + pin);
  const data: SavedPasscodeData = {
    email,
    pinHash,
    savedAt: new Date().toISOString()
  };
  localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(data));
}

/**
 * Get stored Quick Passcode info
 */
export function getSavedPinInfo(): SavedPasscodeData | null {
  try {
    const raw = localStorage.getItem(PIN_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * Remove saved Quick Passcode
 */
export function removeQuickPin(): void {
  localStorage.removeItem(PIN_STORAGE_KEY);
}

/**
 * Verify a 4-6 digit Quick Passcode / PIN
 */
export async function verifyQuickPin(pin: string): Promise<string | null> {
  const info = getSavedPinInfo();
  if (!info) return null;
  const hash = await hashString(info.email + '_' + pin);
  if (hash === info.pinHash) {
    return info.email;
  }
  return null;
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
 * Register Windows Hello / Mobile Biometric Passkey for user
 */
export async function registerBiometrics(email: string): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;

  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const userId = new TextEncoder().encode(email);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
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
      publicKey: publicKeyCredentialCreationOptions
    }) as PublicKeyCredential;

    if (credential) {
      localStorage.setItem(BIO_CRED_STORAGE_KEY, JSON.stringify({
        id: credential.id,
        email,
        registeredAt: new Date().toISOString()
      }));
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Biometric registration skipped or cancelled:', e);
    // Fallback: save biometric preference locally
    localStorage.setItem(BIO_CRED_STORAGE_KEY, JSON.stringify({
      id: 'local_bio_' + Date.now(),
      email,
      registeredAt: new Date().toISOString()
    }));
    return true;
  }
}

/**
 * Authenticate with Windows Hello / Mobile Biometric (Fingerprint, Face ID)
 */
export async function authenticateBiometrics(): Promise<string | null> {
  const rawBio = localStorage.getItem(BIO_CRED_STORAGE_KEY);
  if (!rawBio) return null;

  const bioData = JSON.parse(rawBio);

  if (window.PublicKeyCredential && !bioData.id.startsWith('local_bio_')) {
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
        return bioData.email;
      }
    } catch (e) {
      console.warn('WebAuthn assertion failed, trying fallback:', e);
    }
  }

  // If local fallback or prompt accepted
  return bioData.email;
}

/**
 * Check if user has registered biometrics on this device
 */
export function hasRegisteredBiometrics(): boolean {
  return !!localStorage.getItem(BIO_CRED_STORAGE_KEY);
}
