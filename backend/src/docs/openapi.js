const okResponse = {
  type: 'object',
  properties: {
    ok: { type: 'boolean', example: true },
    message: { type: 'string', example: 'Operacion realizada correctamente' },
    data: { type: 'object' }
  }
};

const errorResponse = {
  type: 'object',
  properties: {
    ok: { type: 'boolean', example: false },
    message: { type: 'string', example: 'Descripcion del error' },
    error: { description: 'Detalle tecnico opcional' }
  }
};

const authRequired = [{ bearerAuth: [] }];

const idParam = (name, description) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'integer', minimum: 1 }
});

const stateGeneral = {
  type: 'string',
  enum: ['Activo', 'Inactivo']
};

const estadoVisita = {
  type: 'string',
  enum: [
    'Recibido',
    'En diagnóstico',
    'Pendiente de aprobación',
    'En proceso',
    'En espera de repuesto',
    'En prueba',
    'Finalizado',
    'Entregado',
    'Cancelado'
  ]
};

const tipoMovimientoInventario = {
  type: 'string',
  enum: [
    'Entrada',
    'Salida',
    'Ajuste positivo',
    'Ajuste negativo',
    'Uso en servicio',
    'Devolución'
  ]
};

const estadoMecanico = {
  type: 'string',
  enum: [
    'Recibido',
    'En diagnóstico',
    'Pendiente de aprobación',
    'En proceso',
    'En espera de repuesto',
    'En prueba',
    'Finalizado'
  ]
};

const jsonBody = (schema) => ({
  required: true,
  content: {
    'application/json': {
      schema
    }
  }
});

const success = (description = 'Operacion correcta') => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/OkResponse' }
    }
  }
});

const error = (description = 'Error') => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' }
    }
  }
});

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'AutoGestion Taller Automotriz API',
    version: '0.1.0',
    description: 'API local para gestion de taller automotriz. Usa JWT Bearer para rutas protegidas.'
  },
  servers: [
    {
      url: '/api',
      description: 'Servidor actual'
    },
    {
      url: 'http://localhost:4000/api',
      description: 'Backend local'
    }
  ],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Usuarios' },
    { name: 'Clientes' },
    { name: 'Vehiculos' },
    { name: 'Servicios' },
    { name: 'Visitas' },
    { name: 'Inventario' },
    { name: 'Dashboard' },
    { name: 'Mecanico' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      OkResponse: okResponse,
      ErrorResponse: errorResponse,
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'admin' },
          password: { type: 'string', example: 'admin123' }
        }
      },
      UsuarioCreate: {
        type: 'object',
        required: ['rol_id', 'nombre', 'apellido', 'username', 'password'],
        properties: {
          rol_id: { type: 'integer', example: 1 },
          nombre: { type: 'string', example: 'Eduard' },
          apellido: { type: 'string', example: 'Administrador' },
          username: { type: 'string', example: 'eduard.admin' },
          email: { type: 'string', example: 'eduard@taller.local' },
          telefono: { type: 'string', example: '9999-9999' },
          password: { type: 'string', example: 'Admin123' },
          estado: stateGeneral
        }
      },
      Cliente: {
        type: 'object',
        required: ['nombre'],
        properties: {
          nombre: { type: 'string', example: 'Cliente de prueba' },
          identidad_rtn: { type: 'string', nullable: true, example: '0801199912345' },
          telefono: { type: 'string', nullable: true, example: '2222-3333' },
          whatsapp: { type: 'string', nullable: true, example: '9999-0000' },
          email: { type: 'string', nullable: true, example: 'cliente@taller.local' },
          direccion: { type: 'string', nullable: true },
          observaciones: { type: 'string', nullable: true },
          estado: stateGeneral
        }
      },
      Vehiculo: {
        type: 'object',
        required: ['cliente_id', 'marca', 'modelo'],
        properties: {
          cliente_id: { type: 'integer', example: 1 },
          placa: { type: 'string', nullable: true, example: 'ABC123' },
          marca: { type: 'string', example: 'Toyota' },
          modelo: { type: 'string', example: 'Corolla' },
          anio: { type: 'integer', nullable: true, example: 2020 },
          color: { type: 'string', nullable: true, example: 'Blanco' },
          vin: { type: 'string', nullable: true },
          tipo_vehiculo_id: { type: 'integer', nullable: true, example: 1, description: 'Ver GET /api/tipos-vehiculo (Turismo, Camioneta, Pickup)' },
          kilometraje_actual: { type: 'integer', nullable: true, example: 45000 },
          observaciones: { type: 'string', nullable: true },
          estado: stateGeneral
        }
      },
      Servicio: {
        type: 'object',
        required: ['nombre'],
        properties: {
          categoria_servicio_id: { type: 'integer', nullable: true, example: 1 },
          nombre: { type: 'string', example: 'Revision de frenos' },
          descripcion: { type: 'string', nullable: true },
          precio_sugerido: { type: 'number', nullable: true, example: 0 },
          tiempo_estimado_minutos: { type: 'integer', nullable: true, example: 60 },
          estado: stateGeneral
        },
        description: 'El precio sugerido es solo referencia. El cobro real se guarda como precio_acordado al asignar el servicio a una visita.'
      },
      ServicioAsignado: {
        type: 'object',
        required: ['servicio_id'],
        properties: {
          servicio_id: { type: 'integer', example: 1 },
          mecanico_id: { type: 'integer', nullable: true, example: 3 },
          descripcion_adicional: { type: 'string', nullable: true },
          precio_acordado: { type: 'number', nullable: true, example: 1250.5 },
          cantidad: { type: 'number', example: 1 },
          estado: estadoVisita,
          observaciones: { type: 'string', nullable: true }
        }
      },
      Visita: {
        type: 'object',
        required: ['cliente_id', 'vehiculo_id', 'motivo_visita'],
        properties: {
          cliente_id: { type: 'integer', example: 1 },
          vehiculo_id: { type: 'integer', example: 1 },
          mecanico_asignado_id: { type: 'integer', nullable: true, example: 3 },
          fecha_entrega_estimada: { type: 'string', format: 'date-time', nullable: true },
          kilometraje_ingreso: { type: 'integer', nullable: true, example: 58100 },
          motivo_visita: { type: 'string', example: 'Revision de frenos' },
          descripcion_problema: { type: 'string', nullable: true },
          diagnostico: { type: 'string', nullable: true },
          estado: estadoVisita,
          observaciones: { type: 'string', nullable: true },
          servicios: {
            type: 'array',
            items: { $ref: '#/components/schemas/ServicioAsignado' }
          }
        }
      },
      RecepcionVisita: {
        type: 'object',
        properties: {
          nivel_combustible: { type: 'integer', nullable: true, minimum: 0, maximum: 100, example: 50 },
          exteriores: {
            type: 'object',
            additionalProperties: { type: 'boolean' },
            example: { 'Unidad de luces': true, Cristales: true }
          },
          interiores: {
            type: 'object',
            additionalProperties: { type: 'boolean' },
            example: { Radio: true, Tapetes: false }
          },
          accesorios: {
            type: 'object',
            additionalProperties: { type: 'boolean' },
            example: { Gato: true, 'Llanta de refaccion': true }
          },
          componentes_mecanicos: {
            type: 'object',
            additionalProperties: { type: 'boolean' },
            example: { Bateria: true, 'Filtro de aire': true }
          },
          trabajo_a_realizar: { type: 'string', nullable: true },
          comentarios_cliente: { type: 'string', nullable: true },
          autoriza_presupuesto_previo: { type: 'boolean', example: true },
          autoriza_sin_presupuesto: { type: 'boolean', example: false },
          autoriza_pruebas: { type: 'boolean', example: true },
          acepta_condiciones: { type: 'boolean', example: true },
          nombre_aceptacion: { type: 'string', nullable: true, example: 'Cliente de prueba' },
          firma_cliente: { type: 'string', nullable: true },
          recibido_por: { type: 'integer', nullable: true },
          fecha_recepcion: { type: 'string', format: 'date-time', nullable: true }
        }
      },
      Producto: {
        type: 'object',
        required: ['nombre'],
        properties: {
          categoria_producto_id: { type: 'integer', nullable: true, example: 1 },
          codigo: { type: 'string', nullable: true, example: 'FIL-001' },
          nombre: { type: 'string', example: 'Filtro de aceite' },
          marca: { type: 'string', nullable: true },
          descripcion: { type: 'string', nullable: true },
          unidad_medida: { type: 'string', example: 'Unidad' },
          stock_inicial: { type: 'number', example: 10 },
          stock_minimo: { type: 'number', example: 3 },
          costo_promedio: { type: 'number', example: 100 },
          precio_referencia: { type: 'number', example: 150 },
          estado: stateGeneral
        }
      },
      MovimientoInventario: {
        type: 'object',
        required: ['producto_id', 'tipo_movimiento', 'cantidad'],
        properties: {
          producto_id: { type: 'integer', example: 1 },
          visita_id: { type: 'integer', nullable: true },
          tipo_movimiento: tipoMovimientoInventario,
          cantidad: { type: 'number', example: 2 },
          motivo: { type: 'string', nullable: true },
          observaciones: { type: 'string', nullable: true }
        }
      },
      ProductoUsado: {
        type: 'object',
        required: ['producto_id', 'cantidad'],
        properties: {
          producto_id: { type: 'integer', example: 1 },
          cantidad: { type: 'number', example: 1.5 },
          observaciones: { type: 'string', nullable: true }
        }
      },
      FotoUpload: {
        type: 'object',
        required: ['foto'],
        properties: {
          foto: {
            type: 'string',
            format: 'binary',
            description: 'Archivo jpg, jpeg, png o webp. Maximo 5 MB.'
          },
          tipo: {
            type: 'string',
            enum: ['Vehículo', 'Visita', 'Daño', 'Avance', 'Final', 'VIN', 'Kilometraje', 'Otro'],
            example: 'Daño'
          },
          descripcion: { type: 'string', nullable: true }
        }
      },
      EstadoGeneralPatch: {
        type: 'object',
        required: ['estado'],
        properties: {
          estado: stateGeneral
        }
      },
      EstadoVisitaPatch: {
        type: 'object',
        required: ['estado'],
        properties: {
          estado: estadoVisita,
          observaciones: { type: 'string', nullable: true }
        }
      },
      EstadoMecanicoPatch: {
        type: 'object',
        required: ['estado'],
        properties: {
          estado: estadoMecanico,
          observaciones: { type: 'string', nullable: true },
          diagnostico: { type: 'string', nullable: true }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Verifica que la API este funcionando',
        responses: { 200: success() }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Inicia sesion y retorna JWT',
        requestBody: jsonBody({ $ref: '#/components/schemas/LoginRequest' }),
        responses: { 200: success('Inicio de sesion correcto'), 401: error('Credenciales invalidas') }
      }
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Obtiene el usuario autenticado',
        security: authRequired,
        responses: { 200: success(), 401: error('No autenticado') }
      }
    },
    '/usuarios': {
      get: {
        tags: ['Usuarios'],
        summary: 'Lista usuarios',
        security: authRequired,
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'estado', in: 'query', schema: stateGeneral },
          { name: 'rol_id', in: 'query', schema: { type: 'integer' } }
        ],
        responses: { 200: success(), 403: error('Sin permisos') }
      },
      post: {
        tags: ['Usuarios'],
        summary: 'Crea usuario',
        security: authRequired,
        requestBody: jsonBody({ $ref: '#/components/schemas/UsuarioCreate' }),
        responses: { 201: success(), 400: error(), 409: error('Duplicado') }
      }
    },
    '/usuarios/{id}': {
      put: {
        tags: ['Usuarios'],
        summary: 'Actualiza usuario',
        security: authRequired,
        parameters: [idParam('id', 'ID de usuario')],
        requestBody: jsonBody({ $ref: '#/components/schemas/UsuarioCreate' }),
        responses: { 200: success(), 404: error('No encontrado') }
      }
    },
    '/usuarios/{id}/estado': {
      patch: {
        tags: ['Usuarios'],
        summary: 'Cambia estado de usuario',
        security: authRequired,
        parameters: [idParam('id', 'ID de usuario')],
        requestBody: jsonBody({ $ref: '#/components/schemas/EstadoGeneralPatch' }),
        responses: { 200: success(), 404: error('No encontrado') }
      }
    },
    '/clientes': {
      get: {
        tags: ['Clientes'],
        summary: 'Lista clientes',
        security: authRequired,
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'estado', in: 'query', schema: stateGeneral }
        ],
        responses: { 200: success() }
      },
      post: {
        tags: ['Clientes'],
        summary: 'Crea cliente',
        security: authRequired,
        requestBody: jsonBody({ $ref: '#/components/schemas/Cliente' }),
        responses: { 201: success() }
      }
    },
    '/clientes/{id}': {
      get: {
        tags: ['Clientes'],
        summary: 'Obtiene cliente con sus vehiculos',
        security: authRequired,
        parameters: [idParam('id', 'ID de cliente')],
        responses: { 200: success(), 404: error() }
      },
      put: {
        tags: ['Clientes'],
        summary: 'Actualiza cliente',
        security: authRequired,
        parameters: [idParam('id', 'ID de cliente')],
        requestBody: jsonBody({ $ref: '#/components/schemas/Cliente' }),
        responses: { 200: success(), 404: error() }
      }
    },
    '/clientes/{id}/estado': {
      patch: {
        tags: ['Clientes'],
        summary: 'Cambia estado de cliente',
        security: authRequired,
        parameters: [idParam('id', 'ID de cliente')],
        requestBody: jsonBody({ $ref: '#/components/schemas/EstadoGeneralPatch' }),
        responses: { 200: success(), 404: error() }
      }
    },
    '/clientes/{clienteId}/vehiculos': {
      get: {
        tags: ['Clientes', 'Vehiculos'],
        summary: 'Lista vehiculos de un cliente',
        security: authRequired,
        parameters: [idParam('clienteId', 'ID de cliente')],
        responses: { 200: success(), 404: error() }
      }
    },
    '/vehiculos': {
      get: {
        tags: ['Vehiculos'],
        summary: 'Lista vehiculos',
        security: authRequired,
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'estado', in: 'query', schema: stateGeneral },
          { name: 'cliente_id', in: 'query', schema: { type: 'integer' } }
        ],
        responses: { 200: success() }
      },
      post: {
        tags: ['Vehiculos'],
        summary: 'Crea vehiculo',
        security: authRequired,
        requestBody: jsonBody({ $ref: '#/components/schemas/Vehiculo' }),
        responses: { 201: success(), 409: error('Placa o VIN duplicado') }
      }
    },
    '/vehiculos/{id}': {
      get: {
        tags: ['Vehiculos'],
        summary: 'Obtiene vehiculo',
        security: authRequired,
        parameters: [idParam('id', 'ID de vehiculo')],
        responses: { 200: success(), 404: error() }
      },
      put: {
        tags: ['Vehiculos'],
        summary: 'Actualiza vehiculo',
        security: authRequired,
        parameters: [idParam('id', 'ID de vehiculo')],
        requestBody: jsonBody({ $ref: '#/components/schemas/Vehiculo' }),
        responses: { 200: success(), 404: error() }
      }
    },
    '/vehiculos/{id}/estado': {
      patch: {
        tags: ['Vehiculos'],
        summary: 'Cambia estado de vehiculo',
        security: authRequired,
        parameters: [idParam('id', 'ID de vehiculo')],
        requestBody: jsonBody({ $ref: '#/components/schemas/EstadoGeneralPatch' }),
        responses: { 200: success(), 404: error() }
      }
    },
    '/vehiculos/{id}/historial': {
      get: {
        tags: ['Vehiculos'],
        summary: 'Consulta historial del vehiculo desde vista_historial_vehiculo',
        security: authRequired,
        parameters: [idParam('id', 'ID de vehiculo')],
        responses: { 200: success(), 404: error() }
      }
    },
    '/vehiculos/{id}/fotos': {
      post: {
        tags: ['Vehiculos'],
        summary: 'Carga una foto asociada a un vehiculo',
        security: authRequired,
        parameters: [idParam('id', 'ID de vehiculo')],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: { $ref: '#/components/schemas/FotoUpload' }
            }
          }
        },
        responses: { 201: success(), 400: error(), 404: error() }
      }
    },
    '/categorias-servicio': {
      get: {
        tags: ['Servicios'],
        summary: 'Lista categorias de servicio',
        security: authRequired,
        parameters: [{ name: 'estado', in: 'query', schema: stateGeneral }],
        responses: { 200: success() }
      }
    },
    '/servicios': {
      get: {
        tags: ['Servicios'],
        summary: 'Lista servicios de catalogo',
        security: authRequired,
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'estado', in: 'query', schema: stateGeneral },
          { name: 'categoria_servicio_id', in: 'query', schema: { type: 'integer' } }
        ],
        responses: { 200: success() }
      },
      post: {
        tags: ['Servicios'],
        summary: 'Crea servicio de catalogo',
        security: authRequired,
        requestBody: jsonBody({ $ref: '#/components/schemas/Servicio' }),
        responses: { 201: success(), 409: error('Duplicado') }
      }
    },
    '/servicios/{id}': {
      put: {
        tags: ['Servicios'],
        summary: 'Actualiza servicio',
        security: authRequired,
        parameters: [idParam('id', 'ID de servicio')],
        requestBody: jsonBody({ $ref: '#/components/schemas/Servicio' }),
        responses: { 200: success(), 404: error() }
      }
    },
    '/servicios/{id}/estado': {
      patch: {
        tags: ['Servicios'],
        summary: 'Cambia estado de servicio',
        security: authRequired,
        parameters: [idParam('id', 'ID de servicio')],
        requestBody: jsonBody({ $ref: '#/components/schemas/EstadoGeneralPatch' }),
        responses: { 200: success(), 404: error() }
      }
    },
    '/visitas': {
      get: {
        tags: ['Visitas'],
        summary: 'Lista visitas',
        security: authRequired,
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'estado', in: 'query', schema: estadoVisita },
          { name: 'cliente_id', in: 'query', schema: { type: 'integer' } },
          { name: 'vehiculo_id', in: 'query', schema: { type: 'integer' } },
          { name: 'mecanico_id', in: 'query', schema: { type: 'integer' } }
        ],
        responses: { 200: success() }
      },
      post: {
        tags: ['Visitas'],
        summary: 'Crea visita. Puede incluir servicios con precio_acordado negociado.',
        security: authRequired,
        requestBody: jsonBody({ $ref: '#/components/schemas/Visita' }),
        responses: { 201: success(), 400: error() }
      }
    },
    '/visitas/activas': {
      get: {
        tags: ['Visitas'],
        summary: 'Lista visitas no entregadas ni canceladas',
        security: authRequired,
        responses: { 200: success() }
      }
    },
    '/visitas/{id}': {
      get: {
        tags: ['Visitas'],
        summary: 'Obtiene detalle de visita con servicios, productos y bitacora',
        security: authRequired,
        parameters: [idParam('id', 'ID de visita')],
        responses: { 200: success(), 404: error() }
      },
      put: {
        tags: ['Visitas'],
        summary: 'Actualiza visita',
        security: authRequired,
        parameters: [idParam('id', 'ID de visita')],
        requestBody: jsonBody({ $ref: '#/components/schemas/Visita' }),
        responses: { 200: success(), 404: error() }
      }
    },
    '/visitas/{id}/estado': {
      patch: {
        tags: ['Visitas'],
        summary: 'Cambia estado de visita y deja que el trigger registre bitacora',
        security: authRequired,
        parameters: [idParam('id', 'ID de visita')],
        requestBody: jsonBody({ $ref: '#/components/schemas/EstadoVisitaPatch' }),
        responses: { 200: success(), 404: error() }
      }
    },
    '/visitas/{id}/recepcion': {
      get: {
        tags: ['Visitas'],
        summary: 'Obtiene checklist de recepcion de una visita',
        security: authRequired,
        parameters: [idParam('id', 'ID de visita')],
        responses: { 200: success(), 404: error() }
      },
      put: {
        tags: ['Visitas'],
        summary: 'Crea o actualiza la recepcion/checklist de una visita',
        security: authRequired,
        parameters: [idParam('id', 'ID de visita')],
        requestBody: jsonBody({ $ref: '#/components/schemas/RecepcionVisita' }),
        responses: { 200: success(), 400: error(), 404: error() }
      }
    },
    '/visitas/{id}/servicios': {
      post: {
        tags: ['Visitas'],
        summary: 'Asigna uno o varios servicios a una visita con precio_acordado por caso',
        security: authRequired,
        parameters: [idParam('id', 'ID de visita')],
        requestBody: jsonBody({
          oneOf: [
            { $ref: '#/components/schemas/ServicioAsignado' },
            {
              type: 'object',
              properties: {
                servicios: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/ServicioAsignado' }
                }
              }
            }
          ]
        }),
        responses: { 201: success(), 400: error() }
      }
    },
    '/visitas/{id}/productos': {
      post: {
        tags: ['Visitas', 'Inventario'],
        summary: 'Registra producto usado en visita. El trigger descuenta inventario.',
        security: authRequired,
        parameters: [idParam('id', 'ID de visita')],
        requestBody: jsonBody({ $ref: '#/components/schemas/ProductoUsado' }),
        responses: { 201: success(), 400: error('Stock insuficiente') }
      }
    },
    '/visitas/{id}/fotos': {
      post: {
        tags: ['Visitas'],
        summary: 'Carga una foto asociada a una visita',
        security: authRequired,
        parameters: [idParam('id', 'ID de visita')],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: { $ref: '#/components/schemas/FotoUpload' }
            }
          }
        },
        responses: { 201: success(), 400: error(), 404: error() }
      }
    },
    '/visitas/{id}/bitacora': {
      get: {
        tags: ['Visitas'],
        summary: 'Lista bitacora de estados de una visita',
        security: authRequired,
        parameters: [idParam('id', 'ID de visita')],
        responses: { 200: success(), 404: error() }
      }
    },
    '/categorias-producto': {
      get: {
        tags: ['Inventario'],
        summary: 'Lista categorias de producto',
        security: authRequired,
        parameters: [{ name: 'estado', in: 'query', schema: stateGeneral }],
        responses: { 200: success() }
      }
    },
    '/productos': {
      get: {
        tags: ['Inventario'],
        summary: 'Lista productos',
        security: authRequired,
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'estado', in: 'query', schema: stateGeneral },
          { name: 'categoria_producto_id', in: 'query', schema: { type: 'integer' } },
          { name: 'stock_bajo', in: 'query', schema: { type: 'boolean' } }
        ],
        responses: { 200: success() }
      },
      post: {
        tags: ['Inventario'],
        summary: 'Crea producto. stock_inicial se registra como movimiento Entrada.',
        security: authRequired,
        requestBody: jsonBody({ $ref: '#/components/schemas/Producto' }),
        responses: { 201: success(), 409: error('Codigo duplicado') }
      }
    },
    '/productos/{id}': {
      get: {
        tags: ['Inventario'],
        summary: 'Obtiene producto',
        security: authRequired,
        parameters: [idParam('id', 'ID de producto')],
        responses: { 200: success(), 404: error() }
      },
      put: {
        tags: ['Inventario'],
        summary: 'Actualiza producto sin modificar stock_actual',
        security: authRequired,
        parameters: [idParam('id', 'ID de producto')],
        requestBody: jsonBody({ $ref: '#/components/schemas/Producto' }),
        responses: { 200: success(), 404: error() }
      }
    },
    '/productos/{id}/estado': {
      patch: {
        tags: ['Inventario'],
        summary: 'Cambia estado de producto',
        security: authRequired,
        parameters: [idParam('id', 'ID de producto')],
        requestBody: jsonBody({ $ref: '#/components/schemas/EstadoGeneralPatch' }),
        responses: { 200: success(), 404: error() }
      }
    },
    '/inventario/movimiento': {
      post: {
        tags: ['Inventario'],
        summary: 'Registra movimiento usando aplicar_movimiento_inventario',
        security: authRequired,
        requestBody: jsonBody({ $ref: '#/components/schemas/MovimientoInventario' }),
        responses: { 201: success(), 400: error('Stock insuficiente') }
      }
    },
    '/inventario/movimientos': {
      get: {
        tags: ['Inventario'],
        summary: 'Lista movimientos de inventario',
        security: authRequired,
        parameters: [
          { name: 'producto_id', in: 'query', schema: { type: 'integer' } },
          { name: 'visita_id', in: 'query', schema: { type: 'integer' } },
          { name: 'tipo_movimiento', in: 'query', schema: tipoMovimientoInventario },
          { name: 'desde', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'hasta', in: 'query', schema: { type: 'string', format: 'date-time' } }
        ],
        responses: { 200: success() }
      }
    },
    '/inventario/stock-bajo': {
      get: {
        tags: ['Inventario'],
        summary: 'Lista stock bajo desde vista_stock_bajo',
        security: authRequired,
        responses: { 200: success() }
      }
    },
    '/dashboard/visitas-activas': {
      get: {
        tags: ['Dashboard'],
        summary: 'Lista visitas activas desde vista_dashboard_visitas_activas',
        security: authRequired,
        responses: { 200: success() }
      }
    },
    '/dashboard/resumen': {
      get: {
        tags: ['Dashboard'],
        summary: 'Obtiene tarjetas y resumen general del dashboard',
        description: 'Incluye contadores de visitas por estado, indicadores principales, inventario y listas cortas para la pantalla inicial.',
        security: authRequired,
        responses: { 200: success() }
      }
    },
    '/dashboard/stock-bajo': {
      get: {
        tags: ['Dashboard'],
        summary: 'Lista productos con stock bajo desde vista_stock_bajo',
        security: authRequired,
        responses: { 200: success() }
      }
    },
    '/mecanico/mis-trabajos': {
      get: {
        tags: ['Mecanico'],
        summary: 'Lista trabajos asignados al mecanico autenticado',
        description: 'Filtra por visitas asignadas directamente al mecanico o por servicios de visita asignados al mecanico.',
        security: authRequired,
        parameters: [
          { name: 'estado', in: 'query', schema: estadoMecanico },
          { name: 'activas', in: 'query', schema: { type: 'boolean', default: true } }
        ],
        responses: { 200: success(), 403: error('Solo rol Mecanico') }
      }
    },
    '/mecanico/mis-trabajos/{id}': {
      get: {
        tags: ['Mecanico'],
        summary: 'Obtiene detalle de un trabajo asignado al mecanico',
        security: authRequired,
        parameters: [idParam('id', 'ID de visita/trabajo')],
        responses: { 200: success(), 404: error('No asignado o no encontrado') }
      }
    },
    '/mecanico/mis-trabajos/{id}/estado': {
      patch: {
        tags: ['Mecanico'],
        summary: 'Actualiza estado, diagnostico u observaciones del trabajo asignado',
        security: authRequired,
        parameters: [idParam('id', 'ID de visita/trabajo')],
        requestBody: jsonBody({ $ref: '#/components/schemas/EstadoMecanicoPatch' }),
        responses: { 200: success(), 400: error(), 404: error('No asignado o no encontrado') }
      }
    },
    '/mecanico/mis-trabajos/{id}/productos': {
      post: {
        tags: ['Mecanico'],
        summary: 'Registra producto usado en un trabajo asignado',
        description: 'Inserta en visita_productos y deja que el trigger descuente inventario.',
        security: authRequired,
        parameters: [idParam('id', 'ID de visita/trabajo')],
        requestBody: jsonBody({ $ref: '#/components/schemas/ProductoUsado' }),
        responses: { 201: success(), 400: error('Stock insuficiente'), 404: error('No asignado o no encontrado') }
      }
    },
    '/mecanico/mis-trabajos/{id}/fotos': {
      post: {
        tags: ['Mecanico'],
        summary: 'Carga una foto de avance en un trabajo asignado',
        security: authRequired,
        parameters: [idParam('id', 'ID de visita/trabajo')],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: { $ref: '#/components/schemas/FotoUpload' }
            }
          }
        },
        responses: { 201: success(), 400: error(), 404: error('No asignado o no encontrado') }
      }
    }
  }
};

module.exports = openapi;
