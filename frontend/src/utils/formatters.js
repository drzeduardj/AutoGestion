import { estadosVisita } from '../constants/app';

export const stripAccents = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

export const normalizeVisitStatus = (value) => {
  const source = stripAccents(value).toLowerCase();
  return estadosVisita.find((estado) => stripAccents(estado).toLowerCase() === source) || value;
};

export const formatDate = (value) => {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-HN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
};

export const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
    maximumFractionDigits: 0
  }).format(amount);
};

// Fecha de documentos: 25 de septiembre de 2026
export const formatFechaLarga = (value) => (value
  ? new Intl.DateTimeFormat('es-HN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value))
  : 'Sin fecha');

// Montos de documentos (factura/cotizacion): L 1,250.50
export const formatMonto = (value) => `L ${new Intl.NumberFormat('es-HN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(Number(value || 0))}`;

export const vehicleLabel = (row) => {
  const parts = [row.marca, row.modelo].filter(Boolean).join(' ');
  return [row.placa, parts].filter(Boolean).join(' - ') || row.vehiculo || 'Sin dato';
};

export const optionLabel = (row, fields) => fields.map((field) => row[field]).filter(Boolean).join(' - ');

export const filterRows = (rows, query) => {
  if (!query.trim()) return rows;
  const needle = query.trim().toLowerCase();

  return rows.filter((row) => Object.values(row).some((value) => (
    value !== null
    && value !== undefined
    && String(value).toLowerCase().includes(needle)
  )));
};

export const toDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};
