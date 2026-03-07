// E2E Encryption utilities
// The actual encryption/decryption happens client-side using Web Crypto API.
// Server only stores encrypted data and encrypted room keys.

// ─── Client-side helpers (used in browser) ───

export async function generateKeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );

  const publicKeyBuffer = await window.crypto.subtle.exportKey(
    "spki",
    keyPair.publicKey,
  );
  const privateKeyBuffer = await window.crypto.subtle.exportKey(
    "pkcs8",
    keyPair.privateKey,
  );

  return {
    publicKey: bufferToBase64(publicKeyBuffer),
    privateKey: bufferToBase64(privateKeyBuffer),
  };
}

export async function generateRoomKey(): Promise<string> {
  const key = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const raw = await window.crypto.subtle.exportKey("raw", key);
  return bufferToBase64(raw);
}

export async function encryptRoomKeyForUser(
  roomKeyBase64: string,
  userPublicKeyBase64: string,
): Promise<string> {
  const publicKey = await importPublicKey(userPublicKeyBase64);
  const roomKeyBuffer = base64ToBuffer(roomKeyBase64);

  const encrypted = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    roomKeyBuffer,
  );

  return bufferToBase64(encrypted);
}

export async function decryptRoomKey(
  encryptedKeyBase64: string,
  privateKeyBase64: string,
): Promise<string> {
  const privateKey = await importPrivateKey(privateKeyBase64);
  const encryptedBuffer = base64ToBuffer(encryptedKeyBase64);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedBuffer,
  );

  return bufferToBase64(decrypted);
}

export async function encryptMessage(
  plaintext: string,
  roomKeyBase64: string,
): Promise<{ ciphertext: string; iv: string }> {
  const key = await importAESKey(roomKeyBase64);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );

  return {
    ciphertext: bufferToBase64(cipherBuffer),
    iv: bufferToBase64(iv.buffer),
  };
}

export async function decryptMessage(
  ciphertextBase64: string,
  ivBase64: string,
  roomKeyBase64: string,
): Promise<string> {
  const key = await importAESKey(roomKeyBase64);
  const iv = base64ToBuffer(ivBase64);
  const cipherBuffer = base64ToBuffer(ciphertextBase64);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    cipherBuffer,
  );

  return new TextDecoder().decode(decrypted);
}

export async function encryptFile(
  fileBuffer: ArrayBuffer,
  roomKeyBase64: string,
): Promise<{ encrypted: ArrayBuffer; iv: string }> {
  const key = await importAESKey(roomKeyBase64);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    fileBuffer,
  );

  return { encrypted, iv: bufferToBase64(iv.buffer) };
}

export async function decryptFile(
  encryptedBuffer: ArrayBuffer,
  ivBase64: string,
  roomKeyBase64: string,
): Promise<ArrayBuffer> {
  const key = await importAESKey(roomKeyBase64);
  const iv = base64ToBuffer(ivBase64);

  return window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    encryptedBuffer,
  );
}

// Encrypt file with IV prepended to the output (no separate IV field needed)
export async function encryptFileWithEmbeddedIV(
  fileBuffer: ArrayBuffer,
  roomKeyBase64: string,
): Promise<ArrayBuffer> {
  const key = await importAESKey(roomKeyBase64);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    fileBuffer,
  );

  // Prepend 12-byte IV to encrypted data
  const combined = new Uint8Array(12 + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), 12);
  return combined.buffer;
}

// Decrypt file where the first 12 bytes are the IV
export async function decryptFileWithEmbeddedIV(
  combinedBuffer: ArrayBuffer,
  roomKeyBase64: string,
): Promise<ArrayBuffer> {
  const key = await importAESKey(roomKeyBase64);
  const combined = new Uint8Array(combinedBuffer);

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  return window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
}

// ─── Key import helpers ───

async function importPublicKey(base64: string): Promise<CryptoKey> {
  const buffer = base64ToBuffer(base64);
  return window.crypto.subtle.importKey(
    "spki",
    buffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
}

async function importPrivateKey(base64: string): Promise<CryptoKey> {
  const buffer = base64ToBuffer(base64);
  return window.crypto.subtle.importKey(
    "pkcs8",
    buffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"],
  );
}

async function importAESKey(base64: string): Promise<CryptoKey> {
  const buffer = base64ToBuffer(base64);
  return window.crypto.subtle.importKey(
    "raw",
    buffer,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// ─── Buffer conversion helpers ───

export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
