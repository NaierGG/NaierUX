function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function block(seed: string, index: number): string {
  const value = fnv1a32(`${seed}|${index}`).toString(10).padStart(10, "0");
  return value.slice(0, 5);
}

export function buildVerificationCode(
  localPeerId: string,
  remotePeerId: string,
  activePublicKeyHex: string | undefined,
): string | null {
  const key = activePublicKeyHex?.trim().toLowerCase();
  if (!key) {
    return null;
  }
  const pair = [localPeerId.trim().toLowerCase(), remotePeerId.trim().toLowerCase()].sort().join("|");
  const seed = `${pair}|${key}`;
  return [0, 1, 2, 3].map((index) => block(seed, index)).join(" ");
}
