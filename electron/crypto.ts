import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16

let encryptionKey: Buffer

const SENSITIVE_KEYS = ['iban', 'bic']
const ENC_PREFIX = 'enc::'

export function hashPassword(pw: string): string {
  return crypto.createHash('sha256').update(pw).digest('hex')
}

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.includes(key)
}

export function initEncryption(dataPath: string): void {
  const keyFile = path.join(dataPath, '.encryption-key')

  if (fs.existsSync(keyFile)) {
    encryptionKey = Buffer.from(fs.readFileSync(keyFile, 'utf-8'), 'hex')
  } else {
    encryptionKey = crypto.randomBytes(KEY_LENGTH)
    fs.writeFileSync(keyFile, encryptionKey.toString('hex'), 'utf-8')
  }
}

export function encrypt(plaintext: string): string {
  if (!plaintext || !encryptionKey) return plaintext

  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv)
  let encrypted = cipher.update(plaintext, 'utf-8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()

  return ENC_PREFIX + iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext || !encryptionKey) return ciphertext
  if (!ciphertext.startsWith(ENC_PREFIX)) return ciphertext

  try {
    const data = ciphertext.slice(ENC_PREFIX.length)
    const [ivHex, authTagHex, encrypted] = data.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encrypted, 'hex', 'utf-8')
    decrypted += decipher.final('utf-8')
    return decrypted
  } catch {
    return ciphertext
  }
}
