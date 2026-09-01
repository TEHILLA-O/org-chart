import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { config } from './config';

const AUTH_TAG_LENGTH = 16;

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function hmacSha256(value: string, key = config().AUTH_SECRET): string {
  return createHmac('sha256', key).update(value).digest('hex');
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function encryptSecret(plaintext: string): Buffer {
  const key = Buffer.from(config().ENCRYPTION_KEY, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

export function decryptSecret(payload: Buffer): string {
  const key = Buffer.from(config().ENCRYPTION_KEY, 'hex');
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 12 + AUTH_TAG_LENGTH);
  const encrypted = payload.subarray(12 + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function hashShareToken(token: string): string {
  return sha256(token);
}
