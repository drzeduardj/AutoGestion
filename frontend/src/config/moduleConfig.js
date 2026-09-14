import { estadosGenerales, estadosVisita, roleOptions } from '../constants/app';
import { formatDate, normalizeVisitStatus, optionLabel, toDateTimeLocal, vehicleLabel } from '../utils/formatters';

export const hasRole = (session, roles = []) => roles.includes(session?.user?.rol);

const nextYear = new Date().getFullYear() + 1;

export const moduleConfig = {
  usuarios: {
    path: '/usuarios',
    resourceKey: 'usuarios',
    createRoles: ['Admin'],
    editRoles: ['Admin'],
    statusRoles: ['Admin'],
    columns: [
      ['nombre', 'Nombre', (_, row) => `${row.nombre || ''} ${row.apellido || ''}`.trim()],
      ['username', 'Usuario'],
      ['rol', 'Rol'],
      ['estado', 'Estado']
    ],
    fields: () => [
      { name: 'rol_id', label: 'Rol', type: 'select', options: roleOptions, required: true, valueType: 'number' },
      { name: 'nombre', label: 'Nombre', required: true, maxLength: 120 },
      { name: 'apellido', label: 'Apellido', required: true, maxLength: 120 },
      { name: 'username', label: 'Usuario', required: true, minLength: 3, maxLength: 80 },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'telefono', label: 'Telefono', kind: 'phone', maxLength: 30 },
      { name: 'password', label: 'Contrasena', type: 'password', requiredOnCreate: true, omitEmpty: true, minLength: 6 },
      { name: 'estado', label: 'Estado', type: 'select', options: estadosGenerales, defaultValue: 'Activo' }
    ]
  },
  clientes: {
    path: '/clientes',
    resourceKey: 'clientes',
    createRoles: ['Admin', 'Cajero'],
    editRoles: ['Admin', 'Cajero'],
    statusRoles: ['Admin', 'Cajero'],
    columns: [
      ['nombre', 'Nombre'],
      ['telefono', 'Telefono'],
      ['whatsapp', 'WhatsApp'],
      ['email', 'Email'],
      ['estado', 'Estado']
    ],
    fields: () => [
      { name: 'nombre', label: 'Nombre', required: true, maxLength: 150 },
      { name: 'identidad_rtn', label: 'Identidad/RTN', maxLength: 30 },
      { name: 'telefono', label: 'Telefono', kind: 'phone', maxLength: 30 },
      { name: 'whatsapp', label: 'WhatsApp', kind: 'phone', maxLength: 30 },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'direccion', label: 'Direccion', type: 'textarea' },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea' },
      { name: 'estado', label: 'Estado', type: 'select', options: estadosGenerales, defaultValue: 'Activo' }
    ]
  },
  vehiculos: {
    path: '/vehiculos',
    resourceKey: 'vehiculos',
    createRoles: ['Admin', 'Cajero'],
    editRoles: ['Admin', 'Cajero'],
    statusRoles: ['Admin', 'Cajero'],
    imageUpload: {
      max: 6,
      label: 'Fotos del vehiculo',
      hint: 'Hasta 6 imagenes (JPG, PNG o WebP, max 5 MB c/u)',
      uploadPath: (id) => `/vehiculos/${id}/fotos`,
      tipo: 'Vehículo',
      resultKey: 'vehiculo'
    },
    columns: [
      ['placa', 'Placa'],
      ['cliente_nombre', 'Cliente'],
      ['marca', 'Marca'],
      ['modelo', 'Modelo'],
      ['estado', 'Estado']
    ],
    fields: ({ clientes }) => [
      { name: 'cliente_id', label: 'Cliente', type: 'select', options: clientes.map((row) => ({ value: row.id, label: row.nombre })), required: true, valueType: 'number' },
      { name: 'placa', label: 'Placa', maxLength: 20 },
      { name: 'marca', label: 'Marca', required: true, maxLength: 80 },
      { name: 'modelo', label: 'Modelo', required: true, maxLength: 80 },
      { name: 'anio', label: 'Anio', type: 'number', min: 1900, max: nextYear, valueType: 'integer' },
      { name: 'color', label: 'Color', maxLength: 50 },
      { name: 'vin', label: 'VIN', maxLength: 80 },
      { name: 'tipo_vehiculo', label: 'Tipo de vehiculo', maxLength: 50 },
      { name: 'kilometraje_actual', label: 'Kilometraje', type: 'number', min: 0, valueType: 'integer' },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea' },
      { name: 'estado', label: 'Estado', type: 'select', options: estadosGenerales, defaultValue: 'Activo' }
    ]
  },
  visitas: {
    path: '/visitas',
    resourceKey: 'visitas',
    createRoles: ['Admin', 'Cajero'],
    editRoles: ['Admin', 'Cajero'],
    statusRoles: ['Admin', 'Cajero'],
    statusOptions: estadosVisita,
    columns: [
      ['cliente_nombre', 'Cliente'],
      ['vehiculo', 'Vehiculo', (_, row) => vehicleLabel(row)],
      ['mecanico_asignado_nombre', 'Mecanico'],
      ['estado', 'Estado'],
      ['fecha_ingreso', 'Ingreso', formatDate]
    ],
    fields: ({ clientes, vehiculos, mecanicos, flujosTrabajo }, form = {}) => [
      { name: 'cliente_id', label: 'Cliente', type: 'select', searchable: true, options: clientes.map((row) => ({ value: row.id, label: row.nombre })), required: true, valueType: 'number', hideOnEdit: true, resets: ['vehiculo_id'] },
      { name: 'vehiculo_id', label: 'Vehiculo', type: 'select', searchable: true, emptyText: form.cliente_id ? 'Este cliente no tiene vehiculos' : 'Primero selecciona un cliente', options: vehiculos.filter((row) => form.cliente_id && String(row.cliente_id) === String(form.cliente_id)).map((row) => ({ value: row.id, label: optionLabel(row, ['placa', 'marca', 'modelo']) || `Vehiculo ${row.id}` })), required: true, valueType: 'number', hideOnEdit: true },
      { name: 'mecanico_asignado_id', label: 'Mecanico asignado', type: 'select', searchable: true, options: mecanicos.map((row) => ({ value: row.id, label: `${row.nombre} ${row.apellido}`.trim() || row.username })), valueType: 'number' },
      { name: 'flujo_trabajo_id', label: 'Flujo de trabajo', type: 'select', searchable: true, options: flujosTrabajo.map((row) => ({ value: row.id, label: row.nombre })), valueType: 'number' },
      { name: 'fecha_entrega_estimada', label: 'Entrega estimada', type: 'datetime-local', valueType: 'date' },
      { name: 'fecha_entrega_real', label: 'Entrega real', type: 'datetime-local', valueType: 'date', hideOnCreate: true },
      { name: 'kilometraje_ingreso', label: 'Kilometraje ingreso', type: 'number', min: 0, valueType: 'integer' },
      { name: 'motivo_visita', label: 'Motivo de visita', required: true, maxLength: 180 },
      { name: 'descripcion_problema', label: 'Descripcion del problema', type: 'textarea' },
      { name: 'diagnostico', label: 'Diagnostico', type: 'textarea' },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea' },
      { name: 'estado', label: 'Estado', type: 'select', options: estadosVisita, defaultValue: 'Recibido' }
    ]
  },
  servicios: {
    path: '/servicios',
    resourceKey: 'servicios',
    createRoles: ['Admin', 'Cajero'],
    editRoles: ['Admin', 'Cajero'],
    statusRoles: ['Admin', 'Cajero'],
    columns: [
      ['nombre', 'Servicio'],
      ['categoria_nombre', 'Categoria'],
      ['precio_sugerido', 'Precio sugerido'],
      ['estado', 'Estado']
    ],
    fields: ({ categoriasServicio }) => [
      { name: 'categoria_servicio_id', label: 'Categoria', type: 'select', options: categoriasServicio.map((row) => ({ value: row.id, label: row.nombre })), valueType: 'number' },
      { name: 'nombre', label: 'Nombre', required: true, maxLength: 150 },
      { name: 'descripcion', label: 'Descripcion', type: 'textarea' },
      { name: 'precio_sugerido', label: 'Precio sugerido', type: 'number', min: 0, step: 1, valueType: 'integer' },
      { name: 'tiempo_estimado_minutos', label: 'Tiempo estimado min', type: 'number', min: 1, valueType: 'integer' },
      { name: 'estado', label: 'Estado', type: 'select', options: estadosGenerales, defaultValue: 'Activo' }
    ]
  },
  inventario: {
    path: '/productos',
    resourceKey: 'productos',
    createRoles: ['Admin'],
    editRoles: ['Admin'],
    statusRoles: ['Admin'],
    stockMovements: true,
    stockRoles: ['Admin', 'Cajero'],
    columns: [
      ['codigo', 'Codigo'],
      ['nombre', 'Producto'],
      ['marca', 'Marca'],
      ['stock_actual', 'Stock'],
      ['estado', 'Estado']
    ],
    fields: ({ categoriasProducto }) => [
      { name: 'categoria_producto_id', label: 'Categoria', type: 'select', options: categoriasProducto.map((row) => ({ value: row.id, label: row.nombre })), valueType: 'number' },
      { name: 'codigo', label: 'Codigo', maxLength: 80 },
      { name: 'nombre', label: 'Nombre', required: true, maxLength: 150 },
      { name: 'marca', label: 'Marca', maxLength: 120 },
      { name: 'descripcion', label: 'Descripcion', type: 'textarea' },
      { name: 'unidad_medida', label: 'Unidad de medida', defaultValue: 'Unidad', maxLength: 50 },
      { name: 'stock_inicial', label: 'Stock inicial', type: 'number', min: 0, valueType: 'number', hideOnEdit: true },
      { name: 'stock_minimo', label: 'Stock minimo', type: 'number', min: 0, valueType: 'number' },
      { name: 'costo_promedio', label: 'Costo promedio', type: 'number', min: 0, step: 1, valueType: 'integer' },
      { name: 'precio_referencia', label: 'Precio referencia', type: 'number', min: 0, step: 1, valueType: 'integer' },
      { name: 'estado', label: 'Estado', type: 'select', options: estadosGenerales, defaultValue: 'Activo' }
    ]
  },
  mecanico: {
    path: '/mecanico/mis-trabajos',
    resourceKey: 'trabajos',
    columns: [
      ['cliente_nombre', 'Cliente'],
      ['vehiculo', 'Vehiculo', (_, row) => vehicleLabel(row)],
      ['estado', 'Estado'],
      ['fecha_ingreso', 'Ingreso', formatDate]
    ]
  }
};

export const getListForModule = (moduleKey, data) => data?.[moduleConfig[moduleKey]?.resourceKey] || [];

export const getFields = (config, catalogs, mode, form = {}) => (config.fields?.(catalogs, form) || [])
  .filter((field) => !(mode === 'create' && field.hideOnCreate))
  .filter((field) => !(mode === 'edit' && field.hideOnEdit));

export const getInitialForm = (config, catalogs, mode, row = {}) => {
  const fields = getFields(config, catalogs, mode);
  return fields.reduce((acc, field) => {
    const value = row[field.name] ?? field.defaultValue ?? '';
    acc[field.name] = field.type === 'datetime-local' ? toDateTimeLocal(value) : value;
    return acc;
  }, {});
};

export const normalizePayload = (form, fields, mode) => {
  return fields.reduce((acc, field) => {
    const rawValue = form[field.name];

    if (field.omitEmpty && rawValue === '') {
      return acc;
    }

    if (rawValue === '' || rawValue === undefined) {
      if (field.required || field.requiredOnCreate) return acc;
      acc[field.name] = null;
      return acc;
    }

    if (field.valueType === 'number') {
      acc[field.name] = Number(rawValue);
      return acc;
    }

    if (field.valueType === 'integer') {
      acc[field.name] = Number.parseInt(rawValue, 10);
      return acc;
    }

    if (field.valueType === 'date') {
      acc[field.name] = new Date(rawValue).toISOString();
      return acc;
    }

    acc[field.name] = field.name === 'estado' && mode !== 'delete'
      ? normalizeVisitStatus(rawValue)
      : rawValue;
    return acc;
  }, {});
};
