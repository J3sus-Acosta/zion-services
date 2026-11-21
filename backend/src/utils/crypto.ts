import crypto from 'crypto';

export class CryptoUtil {
  /**
   * Hashea una contraseña usando scrypt con salt aleatorio
   */
  static hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return `${salt}:${derivedKey.toString('hex')}`;
  }

  /**
   * Verifica una contraseña contra el hash almacenado (formato salt:key o legacy)
   */
  static verifyPassword(password: string, storedHash: string): boolean {
    if (!storedHash) return false;

    // Soporte para formato salt:key
    if (storedHash.includes(':')) {
      const [salt, key] = storedHash.split(':');
      const keyBuffer = Buffer.from(key, 'hex');
      const derivedKey = crypto.scryptSync(password, salt, 64);
      return crypto.timingSafeEqual(keyBuffer, derivedKey);
    }

    // Fallback para hashes planos (ej. fixtures o tests)
    return password === storedHash;
  }
}
