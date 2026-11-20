import jwt from 'jsonwebtoken';
import { RolUsuario } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  email: string;
  rol: RolUsuario;
  empresaClienteId: string | null;
  conductorId?: string | null;
}

const JWT_SECRET = process.env.JWT_SECRET || 'zion_secret_key_change_in_prod';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'zion_refresh_secret_key_change_in_prod';
const ACCESS_TOKEN_EXPIRATION = '15m';
const REFRESH_TOKEN_EXPIRATION = '7d';

export class TokenService {
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRATION });
  }

  static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRATION });
  }

  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  }

  static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
  }
}
