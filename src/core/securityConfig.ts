export type CryptoPolicyMode = "strict" | "compat";

export interface SecurityConfig {
  cryptoPolicy: CryptoPolicyMode;
  devRuntime: boolean;
  source: "default" | "env" | "code";
  note?: string;
}

function readEnv(name: string): string | undefined {
  try {
    const envObj = (globalThis as any)?.process?.env;
    const direct = envObj?.[name];
    if (typeof direct === "string" && direct.length > 0) {
      return direct;
    }
    const expoPublic = envObj?.[`EXPO_PUBLIC_${name}`];
    if (typeof expoPublic === "string" && expoPublic.length > 0) {
      return expoPublic;
    }
  } catch {
    // Ignore process/env read failures.
  }
  return undefined;
}

function detectDevRuntime(): boolean {
  const devFlag = (globalThis as any)?.__DEV__;
  if (typeof devFlag === "boolean") {
    return devFlag;
  }
  const nodeEnv = readEnv("NODE_ENV");
  if (nodeEnv) {
    return nodeEnv !== "production";
  }
  return true;
}

function normalizePolicy(value: string | undefined): CryptoPolicyMode | null {
  if (!value) {
    return null;
  }
  const lowered = value.trim().toLowerCase();
  if (lowered === "strict") {
    return "strict";
  }
  if (lowered === "compat") {
    return "compat";
  }
  return null;
}

let currentSecurityConfig: SecurityConfig = {
  cryptoPolicy: "strict",
  devRuntime: detectDevRuntime(),
  source: "default",
};

function sanitizePolicy(
  requestedPolicy: CryptoPolicyMode,
  devRuntime: boolean,
): Pick<SecurityConfig, "cryptoPolicy" | "note"> {
  if (requestedPolicy === "compat" && !devRuntime) {
    return {
      cryptoPolicy: "strict",
      note: "compat policy requested outside development runtime; forced to strict.",
    };
  }
  return {
    cryptoPolicy: requestedPolicy,
  };
}

export function setSecurityConfig(nextConfig: Partial<SecurityConfig>): SecurityConfig {
  const devRuntime =
    typeof nextConfig.devRuntime === "boolean" ? nextConfig.devRuntime : currentSecurityConfig.devRuntime;
  const requested = nextConfig.cryptoPolicy ?? currentSecurityConfig.cryptoPolicy;
  const sanitized = sanitizePolicy(requested, devRuntime);
  currentSecurityConfig = {
    ...currentSecurityConfig,
    ...nextConfig,
    devRuntime,
    cryptoPolicy: sanitized.cryptoPolicy,
    note: sanitized.note ?? nextConfig.note ?? currentSecurityConfig.note,
    source: nextConfig.source ?? "code",
  };
  return getSecurityConfig();
}

export function configureSecurityFromEnvironment(
  envVarName = "NAIER_CRYPTO_POLICY",
): SecurityConfig {
  const devRuntime = detectDevRuntime();
  const requested = normalizePolicy(readEnv(envVarName)) ?? "strict";
  const sanitized = sanitizePolicy(requested, devRuntime);
  currentSecurityConfig = {
    cryptoPolicy: sanitized.cryptoPolicy,
    devRuntime,
    source: readEnv(envVarName) ? "env" : "default",
    note: sanitized.note,
  };
  return getSecurityConfig();
}

export function getSecurityConfig(): SecurityConfig {
  return {
    ...currentSecurityConfig,
  };
}

export function isLegacyCryptoAllowed(): boolean {
  return currentSecurityConfig.cryptoPolicy === "compat";
}
