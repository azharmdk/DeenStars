import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LEN = 32;
// scrypt cost parameters (N=2^14, r=8, p=1) are the Node defaults and reasonable for a short PIN
// combined with server-side lockout. The PIN space is small, so lockout is the real protection.

function scryptAsync(pin: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(pin, salt, KEY_LEN, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export interface PinRecord {
  hash: string;
  salt: string;
  kdf: "scrypt";
}

export async function hashPin(pin: string): Promise<PinRecord> {
  const salt = randomBytes(16);
  const key = await scryptAsync(pin, salt);
  return { hash: key.toString("base64"), salt: salt.toString("base64"), kdf: "scrypt" };
}

export async function verifyPin(pin: string, record: PinRecord): Promise<boolean> {
  const key = await scryptAsync(pin, Buffer.from(record.salt, "base64"));
  const expected = Buffer.from(record.hash, "base64");
  return key.length === expected.length && timingSafeEqual(key, expected);
}
