/**
 * Configuración centralizada de API para Zion Services Frontend.
 * Elimina URLs hardcodeadas y provee cliente HTTP seguro con soporte de credenciales.
 */

export const API_BASE_URL: string =
  (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

/**
 * Resuelve una ruta relativa al endpoint base de la API.
 * @param path Ruta del endpoint (ej. '/api/empresas-clientes' o 'api/bitacora')
 */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
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
