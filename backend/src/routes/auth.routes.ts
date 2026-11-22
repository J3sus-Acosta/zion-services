import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.login(req.body);

    // Configurar cookies HTTP-only
    res.cookie('satem_auth_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutos
    });

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutos
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });

    res.status(200).json({
      data: {
        usuario: result.usuario,
        accessToken: result.accessToken
      }
    });
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({
        error: {
          code: error.code || 'AUTH_ERROR',
          message: error.message
        }
      });
      return;
    }
    next(error);
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('satem_auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  res.status(200).json({
    data: {
      message: 'Sesión cerrada exitosamente.'
    }
  });
});

// GET /api/auth/me
authRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No autenticado.' } });
      return;
    }
    const usuario = await AuthService.getProfile(req.user.userId);
    res.status(200).json({ data: { usuario } });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh
authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    const result = await AuthService.refresh(token);

    res.cookie('satem_auth_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000
    });

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      data: {
        usuario: result.usuario,
        accessToken: result.accessToken
      }
    });
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({
        error: {
          code: error.code || 'REFRESH_ERROR',
          message: error.message
        }
      });
      return;
    }
    next(error);
  }
});
