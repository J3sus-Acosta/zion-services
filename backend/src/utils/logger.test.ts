import { describe, it, expect, vi } from 'vitest';
import { logger } from './logger.js';

describe('Logger estructurado seguro', () => {
  it('debe ofuscar campos sensibles como password, token y secret', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.info('Prueba de sanitización de credenciales', {
      user: 'operador@zionservices.cl',
      password: 'MiSuperPassword123!',
      jwt_secret: 'clave_super_secreta_jwt',
      token: 'jwt.token.payload',
      infoPublica: 'DatoNoSensible'
    });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const loggedJson = JSON.parse(consoleSpy.mock.calls[0][0] as string);

    expect(loggedJson.level).toBe('info');
    expect(loggedJson.message).toBe('Prueba de sanitización de credenciales');
    expect(loggedJson.meta.user).toBe('operador@zionservices.cl');
    expect(loggedJson.meta.password).toBe('[REDACTED]');
    expect(loggedJson.meta.jwt_secret).toBe('[REDACTED]');
    expect(loggedJson.meta.token).toBe('[REDACTED]');
    expect(loggedJson.meta.infoPublica).toBe('DatoNoSensible');

    consoleSpy.mockRestore();
  });
});
