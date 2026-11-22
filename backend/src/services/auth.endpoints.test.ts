import { describe, it, expect, beforeAll } from 'vitest';
import { AuthService } from './auth.service.js';
import { UserManagementService } from './user-management.service.js';
import { RolUsuario } from '@prisma/client';
import { seedDemoData } from '../../prisma/seed.js';

describe('AuthService y UserManagementService (RBAC & Habilitación de Cuentas)', () => {
  beforeAll(async () => {
    await seedDemoData();
  });
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
      rut: `12.${Date.now().toString().slice(-6)}-9`,
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
      rut: `11.${Date.now().toString().slice(-6)}-4`,
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

  it('UserManagementService: cambiarPassword debe actualizar la clave y permitir login con nueva contraseña', async () => {
    const usuario = await UserManagementService.crearUsuario({
      email: `pwd.change.${Date.now()}@test.cl`,
      password: 'PasswordInicial2026!',
      nombre: 'Clave',
      apellido: 'Test',
      rut: `15.${Date.now().toString().slice(-6)}-1`,
      rol: RolUsuario.CONDUCTOR,
      activo: true
    });

    const updated = await UserManagementService.cambiarPassword(usuario.id, {
      password: 'NuevaClaveSegura2026!'
    });
    expect(updated.id).toBe(usuario.id);

    // Login con clave anterior debe fallar
    await expect(
      AuthService.login({
        email: usuario.email,
        password: 'PasswordInicial2026!'
      })
    ).rejects.toThrow('Credenciales incorrectas');

    // Login con nueva clave debe ser exitoso
    const loginOk = await AuthService.login({
      email: usuario.email,
      password: 'NuevaClaveSegura2026!'
    });
    expect(loginOk.usuario.id).toBe(usuario.id);
  });

  it('UserManagementService: cambiarPassword debe validar longitud mínima y complejidad', async () => {
    const usuario = await UserManagementService.crearUsuario({
      email: `pwd.val.${Date.now()}@test.cl`,
      password: 'PasswordInicial2026!',
      nombre: 'Complejidad',
      apellido: 'Test',
      rut: `16.${Date.now().toString().slice(-6)}-2`,
      rol: RolUsuario.CONDUCTOR,
      activo: true
    });

    // Menos de 6 caracteres
    await expect(
      UserManagementService.cambiarPassword(usuario.id, { password: '123' })
    ).rejects.toThrow();

    // Sin números
    await expect(
      UserManagementService.cambiarPassword(usuario.id, { password: 'sololetras' })
    ).rejects.toThrow();

    // Sin letras
    await expect(
      UserManagementService.cambiarPassword(usuario.id, { password: '12345678' })
    ).rejects.toThrow();
  });

  it('UserManagementService: cambiarRol debe reasignar rol correctamente y validar cliente', async () => {
    const usuario = await UserManagementService.crearUsuario({
      email: `rol.test.${Date.now()}@test.cl`,
      password: 'PasswordSegura2026!',
      nombre: 'Rol',
      apellido: 'Prueba',
      rut: `17.${Date.now().toString().slice(-6)}-3`,
      rol: RolUsuario.JEFE_OPERACIONES,
      activo: true
    });

    expect(usuario.rol).toBe(RolUsuario.JEFE_OPERACIONES);

    // Cambiar a COMERCIAL
    const updatedComercial = await UserManagementService.cambiarRol(usuario.id, {
      rol: RolUsuario.COMERCIAL
    });
    expect(updatedComercial.rol).toBe(RolUsuario.COMERCIAL);

    // Cambiar a CLIENTE sin empresa existente o en payload debe fallar
    await expect(
      UserManagementService.cambiarRol(usuario.id, {
        rol: RolUsuario.CLIENTE
      })
    ).rejects.toThrow();

    // Cambiar a CLIENTE con empresaClienteId válido
    const updatedCliente = await UserManagementService.cambiarRol(usuario.id, {
      rol: RolUsuario.CLIENTE,
      empresaClienteId: 'empresa-acme'
    });
    expect(updatedCliente.rol).toBe(RolUsuario.CLIENTE);
    expect(updatedCliente.empresaClienteId).toBe('empresa-acme');
  });
});
