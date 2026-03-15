import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getServerKey(): Buffer {
  const hex = process.env.SERVER_ENCRYPTION_KEY;
  if (!hex || hex.length < 64) {
    throw new Error("SERVER_ENCRYPTION_KEY must be a 64-char hex string");
  }
  return Buffer.from(hex.slice(0, 64), "hex");
}

/** Generate a random 256-bit AES room key and return it as base64. */
export function generateRoomKey(): string {
  return randomBytes(32).toString("base64");
}

/**
 * Encrypt a base64 room key with the server secret.
 * Returns a hex string: iv + ciphertext + authTag.
 */
export function serverEncryptKey(plainBase64: string): string {
  const key = getServerKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const plainBuf = Buffer.from(plainBase64, "utf-8");
  const encrypted = Buffer.concat([cipher.update(plainBuf), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, encrypted, tag]).toString("hex");
}

/**
 * Decrypt a server-encrypted room key back to its base64 form.
 */
export function serverDecryptKey(encryptedHex: string): string {
  const key = getServerKey();
  const buf = Buffer.from(encryptedHex, "hex");

  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(buf.length - TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH, buf.length - TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf-8");
}

/**
 * Encrypt a base64 room key with a user's RSA-OAEP public key (SPKI, base64).
 * This lets the server distribute room keys without any client being online.
 */
export function serverEncryptForUser(
  roomKeyBase64: string,
  userPublicKeyBase64: string,
): string {
  const { publicEncrypt, constants } = require("crypto");
  const pubKeyDer = Buffer.from(userPublicKeyBase64, "base64");
  const pubKeyPem = `-----BEGIN PUBLIC KEY-----\n${pubKeyDer.toString("base64").match(/.{1,64}/g)!.join("\n")}\n-----END PUBLIC KEY-----`;

  const roomKeyBuf = Buffer.from(roomKeyBase64, "base64");
  const encrypted = publicEncrypt(
    {
      key: pubKeyPem,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    roomKeyBuf,
  );
  return encrypted.toString("base64");
}
