/**
 * Configuración centralizada de API para Zion Services Frontend.
 * Elimina URLs hardcodeadas y provee cliente HTTP seguro con soporte de credenciales.
 */

export const API_BASE_URL: string =
  (import.meta as any).env?.VITE_API_URL ??
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? ''
    : 'http://localhost:3000');

/**
 * Resuelve una ruta relativa al endpoint base de la API.
 * @param path Ruta del endpoint (ej. '/api/empresas-clientes' o 'api/bitacora')
 */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

/**
 * Resuelve una URL de archivo o imagen servida estáticamente desde /uploads/.
 * Si la URL ya es absoluta (http/https/data/blob), la retorna sin alteración.
 * Si es una ruta relativa (/uploads/...), la resuelve contra API_BASE_URL.
 *
 * @param url Ruta relativa o absoluta del recurso
 */
export function resolveFileUrl(url?: string | null): string {
  if (!url) return '';
  if (
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('http://') ||
    url.startsWith('https://')
  ) {
    return url;
  }
  return apiUrl(url);
}

/**
 * Wrapper de fetch para llamadas a la API de Zion Services.
 * Incluye automáticamente credenciales de sesión ('include') y headers por defecto.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = apiUrl(path);
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });
}
