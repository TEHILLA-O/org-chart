import { decryptSecret, encryptSecret } from '@/lib/crypto';

export function encryptConnectorSecrets(secrets: Record<string, string>): Buffer {
  return encryptSecret(JSON.stringify(secrets));
}

export function decryptConnectorSecrets(payload: Buffer | Uint8Array | null | undefined): Record<string, string> {
  if (!payload || payload.length === 0) return {};
  try {
    const parsed = JSON.parse(decryptSecret(Buffer.from(payload))) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string' && value.trim()) out[key] = value.trim();
    }
    return out;
  } catch {
    return {};
  }
}
