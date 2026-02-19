export type SecurityPreferences = {
  biometricLock: boolean;
  screenshotBlock: boolean;
  antiDelete: boolean;
  preferDirectP2P: boolean;
  relayFallback: boolean;
};

export const DEFAULT_SECURITY_PREFERENCES: SecurityPreferences = {
  biometricLock: true,
  screenshotBlock: true,
  antiDelete: true,
  preferDirectP2P: true,
  relayFallback: true,
};
