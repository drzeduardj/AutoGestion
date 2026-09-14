export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Soporta tanto URL absoluta (http://host:4000/api) como relativa (/api).
// Para la relativa, el origen es el del propio navegador (mismo equipo que sirve la app).
const apiOriginBase = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000';
export const API_ORIGIN = new URL(API_URL, apiOriginBase).origin;

export class ApiError extends Error {
  constructor(message, { status, payload, cause } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    this.cause = cause;
  }
}

const extractValidationMessage = (payload) => {
  if (!Array.isArray(payload?.error)) return '';

  return payload.error
    .map((item) => item.msg || item.message)
    .filter(Boolean)
    .slice(0, 3)
    .join('. ');
};

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : { ok: false, message: await response.text() };

  if (!response.ok || payload.ok === false) {
    const detail = extractValidationMessage(payload);
    const message = detail || payload.message || 'No se pudo completar la solicitud';
    throw new ApiError(message, { status: response.status, payload });
  }

  return payload.data || {};
};

export const apiRequest = async (path, { token, method = 'GET', body } = {}) => {
  const headers = {};
  const isFormData = body instanceof FormData;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined && !isFormData ? JSON.stringify(body) : body
    });

    return await parseResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError('No se pudo conectar con el servidor. Revisa la red o intenta actualizar.', {
      cause: error
    });
  }
};

export const isSessionError = (error) => error?.status === 401;

export const isForbiddenError = (error) => error?.status === 403;

export const isAuthError = (error) => isSessionError(error) || isForbiddenError(error);

export const login = (credentials) => apiRequest('/auth/login', {
  method: 'POST',
  body: credentials
});

export const getModuleData = (moduleKey, token) => {
  const paths = {
    dashboard: '/dashboard/resumen',
    usuarios: '/usuarios',
    clientes: '/clientes',
    vehiculos: '/vehiculos',
    visitas: '/visitas',
    recepcion: '/visitas/activas',
    servicios: '/servicios',
    inventario: '/productos',
    facturacion: '/productos',
    reportes: '/visitas',
    mecanico: '/mecanico/mis-trabajos'
  };

  if (!paths[moduleKey]) {
    throw new ApiError('Modulo no disponible', { status: 403 });
  }

  return apiRequest(paths[moduleKey], { token });
};

export const crudRequest = ({ path, token, method, body }) => apiRequest(path, {
  token,
  method,
  body
});

export const assetUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path}`;
};
