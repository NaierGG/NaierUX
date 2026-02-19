"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRecoveryPhrase = generateRecoveryPhrase;
exports.validateRecoveryPhrase = validateRecoveryPhrase;
exports.deriveFingerprintFromPhrase = deriveFingerprintFromPhrase;
exports.createIdentityProfile = createIdentityProfile;
const WORD_BANK = [
    "anchor",
    "apex",
    "arc",
    "ash",
    "atlas",
    "aurora",
    "binary",
    "black",
    "bloom",
    "bridge",
    "byte",
    "carbon",
    "cipher",
    "cobalt",
    "comet",
    "cosmos",
    "crystal",
    "cyber",
    "delta",
    "dune",
    "echo",
    "ember",
    "engine",
    "falcon",
    "flux",
    "forge",
    "frost",
    "gamma",
    "ghost",
    "glow",
    "grid",
    "halo",
    "haven",
    "helix",
    "hyper",
    "ice",
    "ion",
    "jet",
    "kernel",
    "lattice",
    "lumen",
    "matrix",
    "mesh",
    "mint",
    "mirror",
    "moon",
    "nebula",
    "neon",
    "node",
    "nova",
    "onyx",
    "orbit",
    "origin",
    "ozone",
    "phantom",
    "photon",
    "pixel",
    "pulse",
    "quantum",
    "quartz",
    "radar",
    "raven",
    "relay",
    "ripple",
    "sable",
    "saturn",
    "shadow",
    "signal",
    "silk",
    "sonic",
    "spark",
    "spectrum",
    "spike",
    "spire",
    "stealth",
    "storm",
    "switch",
    "tensor",
    "thunder",
    "titan",
    "trace",
    "turbo",
    "ultra",
    "vapor",
    "vector",
    "vertex",
    "vortex",
    "wave",
    "whisper",
    "xeno",
    "zenith",
];
function rand(maxExclusive) {
    return Math.floor(Math.random() * maxExclusive);
}
function fnv1a32(input) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}
function generateRecoveryPhrase(wordCount = 12) {
    const words = [];
    for (let i = 0; i < wordCount; i += 1) {
        words.push(WORD_BANK[rand(WORD_BANK.length)]);
    }
    return words;
}
function validateRecoveryPhrase(words) {
    if (words.length !== 12 && words.length !== 24) {
        return false;
    }
    return words.every((word) => WORD_BANK.includes(word.toLowerCase().trim()));
}
function deriveFingerprintFromPhrase(words) {
    const normalized = words.join("-").toLowerCase();
    const h1 = fnv1a32(`naier:${normalized}:1`).toString(16).toUpperCase().padStart(8, "0");
    const h2 = fnv1a32(`naier:${normalized}:2`).toString(16).toUpperCase().padStart(8, "0");
    return `${h1.slice(0, 4)}:${h1.slice(4, 8)}:${h2.slice(0, 4)}:${h2.slice(4, 8)}`;
}
function createIdentityProfile(displayName, words) {
    return {
        displayName,
        recoveryWords: words,
        publicFingerprint: deriveFingerprintFromPhrase(words),
        createdAtIso: new Date().toISOString(),
    };
}
