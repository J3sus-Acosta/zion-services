/**
 * Utilidades para validación y formateo de RUT chileno (Módulo 11).
 */

export function cleanRut(rut: string): string {
  if (!rut) return '';
  const clean = rut.replace(/[\.\-\s]/g, '').toUpperCase();
  if (clean.length < 2) return clean;
  const cuerpo = clean.slice(0, -1);
  const dv = clean.slice(-1);
  return `${cuerpo}-${dv}`;
}

export function formatRut(rut: string): string {
  const normalized = cleanRut(rut);
  if (!normalized.includes('-')) return normalized;
  const [cuerpo, dv] = normalized.split('-');
  if (!dv) return normalized;
  const cuerpoConPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpoConPuntos}-${dv}`;
}

export function validateRut(rut: string): boolean {
  if (!rut || typeof rut !== 'string') return false;
  const clean = rut.replace(/[\.\-\s]/g, '').toUpperCase();
  if (clean.length < 7 || clean.length > 9) return false;

  const cuerpo = clean.slice(0, -1);
  const dv = clean.slice(-1);

  if (!/^\d+$/.test(cuerpo)) return false;
  if (!/^[\dK]$/.test(dv)) return false;

  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = 11 - (suma % 11);
  let dvCalculado = '0';
  if (resto === 11) {
    dvCalculado = '0';
  } else if (resto === 10) {
    dvCalculado = 'K';
  } else {
    dvCalculado = resto.toString();
  }

  return dv === dvCalculado;
}
