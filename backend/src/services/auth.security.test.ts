import { describe, it, expect, vi } from 'vitest';
import { TokenService, TokenPayload } from './token.service.js';
import { authenticate, authorize, enforceTenantIsolation, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { RolUsuario } from '@prisma/client';
import { Response } from 'express';

describe('Seguridad: Autenticación, RBAC y Tenant Isolation', () => {
  const mockPayload: TokenPayload = {
    userId: 'user-123',
    email: 'cliente@horse.cl',
    rol: RolUsuario.CLIENTE,
    empresaClienteId: 'empresa-horse'
  };

  it('debe generar y verificar tokens JWT válidos', () => {
    const accessToken = TokenService.generateAccessToken(mockPayload);
    const decoded = TokenService.verifyAccessToken(accessToken);

    expect(decoded.userId).toBe('user-123');
    expect(decoded.rol).toBe(RolUsuario.CLIENTE);
    expect(decoded.empresaClienteId).toBe('empresa-horse');
  });

  it('debe rechazar acceso si el rol no está permitido (RBAC)', () => {
    const req = {
      user: mockPayload
    } as AuthenticatedRequest;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    const next = vi.fn();

    // Solo ADMIN y OPERACIONES permitidos
    const rbacMiddleware = authorize(RolUsuario.ADMIN, RolUsuario.OPERACIONES);
    rbacMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('debe permitir acceso a SUPERADMIN en cualquier ruta administrativa (RBAC Superadmin bypass)', () => {
    const superadminPayload: TokenPayload = {
      userId: 'super-01',
      email: 'super@zion.cl',
      rol: RolUsuario.SUPERADMIN,
      empresaClienteId: null
    };

    const req = { user: superadminPayload } as AuthenticatedRequest;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
    const next = vi.fn();

    const rbacMiddleware = authorize(RolUsuario.ADMIN, RolUsuario.JEFE_OPERACIONES);
    rbacMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('debe autorizar a JEFE_OPERACIONES en rutas de operaciones', () => {
    const opsPayload: TokenPayload = {
      userId: 'ops-01',
      email: 'jefe@zion.cl',
      rol: RolUsuario.JEFE_OPERACIONES,
      empresaClienteId: null
    };

    const req = { user: opsPayload } as AuthenticatedRequest;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
    const next = vi.fn();

    const rbacMiddleware = authorize(RolUsuario.JEFE_OPERACIONES);
    rbacMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('debe bloquear acceso cruzado entre clientes (Tenant Isolation)', () => {
    const req = {
      user: mockPayload, // Pertenece a empresa-horse
      params: { empresaClienteId: 'empresa-bravo-energy' } // Intenta acceder a otra
    } as unknown as AuthenticatedRequest;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    const next = vi.fn();

    enforceTenantIsolation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('debe permitir acceso a SUPERADMIN en cualquier ruta administrativa (RBAC Superadmin bypass)', () => {
    const superadminPayload: TokenPayload = {
      userId: 'super-01',
      email: 'super@zion.cl',
      rol: RolUsuario.SUPERADMIN,
      empresaClienteId: null
    };

    const req = { user: superadminPayload } as AuthenticatedRequest;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
    const next = vi.fn();

    const rbacMiddleware = authorize(RolUsuario.ADMIN, RolUsuario.JEFE_OPERACIONES);
    rbacMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('debe autorizar a JEFE_OPERACIONES en rutas de operaciones', () => {
    const opsPayload: TokenPayload = {
      userId: 'ops-01',
      email: 'jefe@zion.cl',
      rol: RolUsuario.JEFE_OPERACIONES,
      empresaClienteId: null
    };

    const req = { user: opsPayload } as AuthenticatedRequest;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
    const next = vi.fn();

    const rbacMiddleware = authorize(RolUsuario.JEFE_OPERACIONES);
    rbacMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('debe autenticar mediante la cookie HTTP-only satem_auth_token', () => {
    const token = TokenService.generateAccessToken(mockPayload);
    const req = {
      cookies: {
        satem_auth_token: token
      },
      headers: {}
    } as unknown as AuthenticatedRequest;

    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user?.userId).toBe('user-123');
    expect(req.user?.rol).toBe(RolUsuario.CLIENTE);
  });

  it('debe bloquear acceso de COMERCIAL, CONDUCTOR y CLIENTE a rutas exclusivas de administración de usuarios', () => {
    const rolesRestringidos = [RolUsuario.COMERCIAL, RolUsuario.CONDUCTOR, RolUsuario.CLIENTE];

    for (const rol of rolesRestringidos) {
      const req = {
        user: {
          userId: `usr-${rol.toLowerCase()}`,
          email: `${rol.toLowerCase()}@zion.cl`,
          rol
        }
      } as AuthenticatedRequest;

      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      const userAdminRbac = authorize(RolUsuario.SUPERADMIN, RolUsuario.ADMIN);
      userAdminRbac(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    }
  });

  it('debe lanzar error fatal si NODE_ENV es production y faltan secretos JWT (SEC-03)', () => {
    expect(() => {
      TokenService.validarConfiguracion({
        NODE_ENV: 'production'
      });
    }).toThrow(/FATAL: JWT_SECRET y JWT_REFRESH_SECRET deben estar definidos/);

    expect(() => {
      TokenService.validarConfiguracion({
        NODE_ENV: 'production',
        JWT_SECRET: 'secreto-ok'
      });
    }).toThrow(/FATAL: JWT_SECRET y JWT_REFRESH_SECRET deben estar definidos/);

    expect(() => {
      TokenService.validarConfiguracion({
        NODE_ENV: 'production',
        JWT_SECRET: 'secreto-ok',
        JWT_REFRESH_SECRET: 'refresh-ok'
      });
    }).not.toThrow();
  });
});
