"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSecurityConfig = setSecurityConfig;
exports.configureSecurityFromEnvironment = configureSecurityFromEnvironment;
exports.getSecurityConfig = getSecurityConfig;
exports.isLegacyCryptoAllowed = isLegacyCryptoAllowed;
function readEnv(name) {
    try {
        const envObj = globalThis?.process?.env;
        const direct = envObj?.[name];
        if (typeof direct === "string" && direct.length > 0) {
            return direct;
        }
        const expoPublic = envObj?.[`EXPO_PUBLIC_${name}`];
        if (typeof expoPublic === "string" && expoPublic.length > 0) {
            return expoPublic;
        }
    }
    catch {
        // Ignore process/env read failures.
    }
    return undefined;
}
function detectDevRuntime() {
    const devFlag = globalThis?.__DEV__;
    if (typeof devFlag === "boolean") {
        return devFlag;
    }
    const nodeEnv = readEnv("NODE_ENV");
    if (nodeEnv) {
        return nodeEnv !== "production";
    }
    return true;
}
function normalizePolicy(value) {
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
let currentSecurityConfig = {
    cryptoPolicy: "strict",
    devRuntime: detectDevRuntime(),
    source: "default",
};
function sanitizePolicy(requestedPolicy, devRuntime) {
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
function setSecurityConfig(nextConfig) {
    const devRuntime = typeof nextConfig.devRuntime === "boolean" ? nextConfig.devRuntime : currentSecurityConfig.devRuntime;
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
function configureSecurityFromEnvironment(envVarName = "NAIER_CRYPTO_POLICY") {
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
function getSecurityConfig() {
    return {
        ...currentSecurityConfig,
    };
}
function isLegacyCryptoAllowed() {
    return currentSecurityConfig.cryptoPolicy === "compat";
}
