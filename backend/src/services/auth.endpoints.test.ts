import { describe, it, expect } from 'vitest';
import { AuthService } from './auth.service.js';
import { UserManagementService } from './user-management.service.js';
import { RolUsuario } from '@prisma/client';

describe('AuthService y UserManagementService (RBAC & Habilitación de Cuentas)', () => {
  it('debe permitir login con credenciales válidas de SUPERADMIN', async () => {
    const result = await AuthService.login({
      email: 'superadmin@zion.cl',
      password: 'SuperAdmin2026!'
    });

    expect(result.usuario.rol).toBe(RolUsuario.SUPERADMIN);
    expect(result.usuario.activo).toBe(true);
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it('debe permitir login con credenciales válidas de JEFE_OPERACIONES', async () => {
    const result = await AuthService.login({
      email: 'operaciones@zion.cl',
      password: 'Ops2026!'
    });

    expect(result.usuario.rol).toBe(RolUsuario.JEFE_OPERACIONES);
    expect(result.usuario.activo).toBe(true);
  });

  it('debe bloquear login si la cuenta de usuario se encuentra inactiva (activo: false)', async () => {
    await expect(
      AuthService.login({
        email: 'inactivo@cliente.cl',
        password: 'Inactivo2026!'
      })
    ).rejects.toThrow('Su cuenta se encuentra inactiva o deshabilitada');
  });

  it('debe rechazar login con contraseña incorrecta', async () => {
    await expect(
      AuthService.login({
        email: 'superadmin@zion.cl',
        password: 'PasswordErronea123'
      })
    ).rejects.toThrow('Credenciales incorrectas');
  });

  it('debe refrescar la sesión si el token de refresco es válido', async () => {
    const loginResult = await AuthService.login({
      email: 'admin@zion.cl',
      password: 'Admin2026!'
    });

    const refreshed = await AuthService.refresh(loginResult.refreshToken);
    expect(refreshed.accessToken).toBeDefined();
    expect(refreshed.usuario.email).toBe('admin@zion.cl');
  });

  it('UserManagementService: debe permitir listar usuarios y filtrar por rol', async () => {
    const usuarios = await UserManagementService.listarUsuarios({ rol: RolUsuario.SUPERADMIN });
    expect(usuarios.length).toBeGreaterThanOrEqual(1);
    expect(usuarios[0].rol).toBe(RolUsuario.SUPERADMIN);
  });

  it('UserManagementService: debe crear un usuario cliente asociado a su empresa y habilitarlo', async () => {
    const nuevo = await UserManagementService.crearUsuario({
      email: `nuevo.cliente.${Date.now()}@acme.cl`,
      password: 'PasswordSegura2026!',
      nombre: 'Pedro',
      apellido: 'González',
      rut: '12.345.678-9',
      rol: RolUsuario.CLIENTE,
      empresaClienteId: 'empresa-acme',
      activo: true
    });

    expect(nuevo.id).toBeDefined();
    expect(nuevo.rol).toBe(RolUsuario.CLIENTE);
    expect(nuevo.empresaClienteId).toBe('empresa-acme');
    expect(nuevo.activo).toBe(true);
  });

  it('UserManagementService: debe exigir empresaClienteId al crear un usuario con rol CLIENTE', async () => {
    await expect(
      UserManagementService.crearUsuario({
        email: 'sinempresa@cliente.cl',
        password: 'PasswordSegura2026!',
        nombre: 'Sin',
        apellido: 'Empresa',
        rut: '9.876.543-2',
        rol: RolUsuario.CLIENTE,
        activo: true
      })
    ).rejects.toThrow();
  });

  it('UserManagementService: debe habilitar y deshabilitar cuentas con cambiarEstado', async () => {
    const usuarioCreado = await UserManagementService.crearUsuario({
      email: `toggle.${Date.now()}@test.cl`,
      password: 'PasswordSegura2026!',
      nombre: 'Juan',
      apellido: 'Pérez',
      rut: '11.222.333-4',
      rol: RolUsuario.CONDUCTOR,
      activo: true
    });

    expect(usuarioCreado.activo).toBe(true);

    // Deshabilitar cuenta
    const deshabilitado = await UserManagementService.cambiarEstado(usuarioCreado.id, false);
    expect(deshabilitado.activo).toBe(false);

    // Intentar login con la cuenta recién deshabilitada
    await expect(
      AuthService.login({
        email: usuarioCreado.email,
        password: 'PasswordSegura2026!'
      })
    ).rejects.toThrow('Su cuenta se encuentra inactiva o deshabilitada');

    // Volver a habilitar cuenta
    const rehabilitado = await UserManagementService.cambiarEstado(usuarioCreado.id, true);
    expect(rehabilitado.activo).toBe(true);

    // Ahora el login debe tener éxito
    const loginOk = await AuthService.login({
      email: usuarioCreado.email,
      password: 'PasswordSegura2026!'
    });
    expect(loginOk.usuario.activo).toBe(true);
  });
});
