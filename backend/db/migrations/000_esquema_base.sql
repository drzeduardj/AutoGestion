-- ============================================================
-- BASE DE DATOS: Sistema de Taller Automotriz
-- PostgreSQL  -- Esquema base (se ejecuta antes de las migraciones 001+)
-- Idempotente: CREATE ... IF NOT EXISTS / ON CONFLICT / DO $$ EXCEPTION.
-- ============================================================

-- ============================================================
-- EXTENSIONES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- TIPOS ENUM
-- ============================================================

DO $$ BEGIN
    CREATE TYPE estado_general AS ENUM ('Activo', 'Inactivo');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_visita AS ENUM (
        'Recibido',
        'En diagnóstico',
        'Pendiente de aprobación',
        'En proceso',
        'En espera de repuesto',
        'En prueba',
        'Finalizado',
        'Entregado',
        'Cancelado'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE tipo_movimiento_inventario AS ENUM (
        'Entrada',
        'Salida',
        'Ajuste positivo',
        'Ajuste negativo',
        'Uso en servicio',
        'Devolución'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE tipo_foto AS ENUM (
        'Vehículo',
        'Visita',
        'Daño',
        'Avance',
        'Final',
        'VIN',
        'Kilometraje',
        'Otro'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- ROLES
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    estado estado_general NOT NULL DEFAULT 'Activo',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO roles (nombre, descripcion)
VALUES
('Admin', 'Gerente, dueño o administrador general del sistema'),
('Cajero', 'Usuario encargado de recepción, clientes, vehículos e ingresos'),
('Mecanico', 'Usuario encargado de actualizar avances y servicios asignados')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- USUARIOS
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    rol_id INT NOT NULL REFERENCES roles(id),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(150) UNIQUE,
    password_hash TEXT NOT NULL,
    telefono VARCHAR(30),
    estado estado_general NOT NULL DEFAULT 'Activo',
    ultimo_login TIMESTAMP,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Usuario inicial: admin con contrasena 123456 (hash bcrypt).
-- Recomendado cambiar la contrasena desde el sistema despues del primer login.
-- Los mecanicos y demas usuarios se crean desde Admin -> Usuarios.

INSERT INTO usuarios (rol_id, nombre, apellido, username, email, password_hash)
SELECT r.id, 'Administrador', 'General', 'admin', 'admin@taller.local',
       '$2b$10$BdROPVqPKszBttbv6Uml8O3o4LMFja/91pCwzwMQ0/HEv4GPZmaP.'
FROM roles r
WHERE r.nombre = 'Admin'
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- CLIENTES
-- ============================================================

CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    identidad_rtn VARCHAR(50),
    telefono VARCHAR(30),
    whatsapp VARCHAR(30),
    email VARCHAR(150),
    direccion TEXT,
    observaciones TEXT,
    estado estado_general NOT NULL DEFAULT 'Activo',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_telefono ON clientes(telefono);
CREATE INDEX IF NOT EXISTS idx_clientes_identidad_rtn ON clientes(identidad_rtn);

-- ============================================================
-- VEHÍCULOS
-- ============================================================

CREATE TABLE IF NOT EXISTS vehiculos (
    id SERIAL PRIMARY KEY,
    cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    placa VARCHAR(30),
    marca VARCHAR(80) NOT NULL,
    modelo VARCHAR(80) NOT NULL,
    anio INT,
    color VARCHAR(50),
    vin VARCHAR(80),
    tipo_vehiculo VARCHAR(80),
    kilometraje_actual INT,
    fecha_primera_visita DATE,
    fecha_ultimo_ingreso TIMESTAMP,
    observaciones TEXT,
    estado estado_general NOT NULL DEFAULT 'Activo',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_vehiculos_placa UNIQUE (placa),
    CONSTRAINT uq_vehiculos_vin UNIQUE (vin),
    CONSTRAINT chk_vehiculo_anio CHECK (anio IS NULL OR anio BETWEEN 1900 AND 2100),
    CONSTRAINT chk_vehiculo_km CHECK (kilometraje_actual IS NULL OR kilometraje_actual >= 0)
);

CREATE INDEX IF NOT EXISTS idx_vehiculos_cliente_id ON vehiculos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vehiculos_marca_modelo ON vehiculos(marca, modelo);
CREATE INDEX IF NOT EXISTS idx_vehiculos_placa ON vehiculos(placa);
CREATE INDEX IF NOT EXISTS idx_vehiculos_vin ON vehiculos(vin);

-- ============================================================
-- FOTOS DE VEHÍCULOS
-- ============================================================

CREATE TABLE IF NOT EXISTS vehiculo_fotos (
    id SERIAL PRIMARY KEY,
    vehiculo_id INT NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
    tipo tipo_foto NOT NULL DEFAULT 'Vehículo',
    url_archivo TEXT NOT NULL,
    nombre_archivo VARCHAR(255),
    descripcion TEXT,
    subido_por INT REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehiculo_fotos_vehiculo_id ON vehiculo_fotos(vehiculo_id);

-- ============================================================
-- CATEGORÍAS DE SERVICIOS
-- ============================================================

CREATE TABLE IF NOT EXISTS categorias_servicio (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    estado estado_general NOT NULL DEFAULT 'Activo',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO categorias_servicio (nombre, descripcion)
VALUES
('Mecánica', 'Servicios mecánicos generales'),
('Pintura', 'Trabajos de pintura automotriz'),
('Diagnóstico', 'Revisión y diagnóstico del vehículo'),
('Mantenimiento', 'Mantenimientos preventivos o correctivos'),
('Enderezado', 'Trabajos de enderezado y carrocería')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- SERVICIOS
-- ============================================================

CREATE TABLE IF NOT EXISTS servicios (
    id SERIAL PRIMARY KEY,
    categoria_servicio_id INT REFERENCES categorias_servicio(id) ON DELETE SET NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio_sugerido NUMERIC(12,2) DEFAULT 0.00,
    tiempo_estimado_minutos INT,
    estado estado_general NOT NULL DEFAULT 'Activo',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_servicios_nombre UNIQUE (nombre),
    CONSTRAINT chk_servicio_precio CHECK (precio_sugerido >= 0),
    CONSTRAINT chk_servicio_tiempo CHECK (
        tiempo_estimado_minutos IS NULL OR tiempo_estimado_minutos >= 0
    )
);

CREATE INDEX IF NOT EXISTS idx_servicios_categoria ON servicios(categoria_servicio_id);

INSERT INTO servicios (categoria_servicio_id, nombre, descripcion, precio_sugerido)
SELECT cs.id, 'Cambio de aceite', 'Cambio de aceite de motor', 0.00
FROM categorias_servicio cs WHERE cs.nombre = 'Mantenimiento'
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO servicios (categoria_servicio_id, nombre, descripcion, precio_sugerido)
SELECT cs.id, 'Cambio de filtro de aceite', 'Cambio de filtro de aceite', 0.00
FROM categorias_servicio cs WHERE cs.nombre = 'Mantenimiento'
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO servicios (categoria_servicio_id, nombre, descripcion, precio_sugerido)
SELECT cs.id, 'Diagnóstico general', 'Revisión general del vehículo', 0.00
FROM categorias_servicio cs WHERE cs.nombre = 'Diagnóstico'
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO servicios (categoria_servicio_id, nombre, descripcion, precio_sugerido)
SELECT cs.id, 'Revisión de frenos', 'Revisión del sistema de frenos', 0.00
FROM categorias_servicio cs WHERE cs.nombre = 'Mecánica'
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO servicios (categoria_servicio_id, nombre, descripcion, precio_sugerido)
SELECT cs.id, 'Pintura de bumper', 'Trabajo de pintura en bumper', 0.00
FROM categorias_servicio cs WHERE cs.nombre = 'Pintura'
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- VISITAS / INGRESOS AL TALLER
-- ============================================================

CREATE TABLE IF NOT EXISTS visitas (
    id SERIAL PRIMARY KEY,
    cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    vehiculo_id INT NOT NULL REFERENCES vehiculos(id) ON DELETE RESTRICT,

    recibido_por INT REFERENCES usuarios(id) ON DELETE SET NULL,
    mecanico_asignado_id INT REFERENCES usuarios(id) ON DELETE SET NULL,

    fecha_ingreso TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_entrega_estimada TIMESTAMP,
    fecha_entrega_real TIMESTAMP,

    kilometraje_ingreso INT,
    motivo_visita TEXT NOT NULL,
    descripcion_problema TEXT,
    diagnostico TEXT,

    estado estado_visita NOT NULL DEFAULT 'Recibido',
    observaciones TEXT,

    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_visita_km CHECK (kilometraje_ingreso IS NULL OR kilometraje_ingreso >= 0)
);

CREATE INDEX IF NOT EXISTS idx_visitas_cliente_id ON visitas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_visitas_vehiculo_id ON visitas(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_visitas_estado ON visitas(estado);
CREATE INDEX IF NOT EXISTS idx_visitas_fecha_ingreso ON visitas(fecha_ingreso);
CREATE INDEX IF NOT EXISTS idx_visitas_mecanico ON visitas(mecanico_asignado_id);

-- ============================================================
-- SERVICIOS ASIGNADOS A UNA VISITA
-- ============================================================

CREATE TABLE IF NOT EXISTS visita_servicios (
    id SERIAL PRIMARY KEY,
    visita_id INT NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
    servicio_id INT NOT NULL REFERENCES servicios(id) ON DELETE RESTRICT,
    mecanico_id INT REFERENCES usuarios(id) ON DELETE SET NULL,

    descripcion_adicional TEXT,
    estado estado_visita NOT NULL DEFAULT 'Recibido',

    fecha_inicio TIMESTAMP,
    fecha_fin TIMESTAMP,
    observaciones TEXT,

    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visita_servicios_visita_id ON visita_servicios(visita_id);
CREATE INDEX IF NOT EXISTS idx_visita_servicios_servicio_id ON visita_servicios(servicio_id);
CREATE INDEX IF NOT EXISTS idx_visita_servicios_mecanico_id ON visita_servicios(mecanico_id);

-- ============================================================
-- FASES / BITÁCORA DE PROGRESO DE LA VISITA
-- ============================================================

CREATE TABLE IF NOT EXISTS visita_estados (
    id SERIAL PRIMARY KEY,
    visita_id INT NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
    estado_anterior estado_visita,
    estado_nuevo estado_visita NOT NULL,
    comentario TEXT,
    usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visita_estados_visita_id ON visita_estados(visita_id);
CREATE INDEX IF NOT EXISTS idx_visita_estados_fecha ON visita_estados(fecha_creacion);

-- ============================================================
-- FOTOS POR VISITA
-- ============================================================

CREATE TABLE IF NOT EXISTS visita_fotos (
    id SERIAL PRIMARY KEY,
    visita_id INT NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
    tipo tipo_foto NOT NULL DEFAULT 'Visita',
    url_archivo TEXT NOT NULL,
    nombre_archivo VARCHAR(255),
    descripcion TEXT,
    subido_por INT REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visita_fotos_visita_id ON visita_fotos(visita_id);

-- ============================================================
-- CATEGORÍAS DE PRODUCTOS
-- ============================================================

CREATE TABLE IF NOT EXISTS categorias_producto (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    estado estado_general NOT NULL DEFAULT 'Activo',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO categorias_producto (nombre, descripcion)
VALUES
('Aceites', 'Aceites para motor o transmisión'),
('Refrigerantes', 'Refrigerantes y coolant'),
('Filtros', 'Filtros de aceite, aire, combustible, cabina'),
('Repuestos', 'Repuestos varios'),
('Pintura', 'Pinturas automotrices'),
('Insumos de pintura', 'Lijas, thinner, masilla y otros insumos'),
('Herramientas consumibles', 'Productos consumibles usados en taller')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- PRODUCTOS / INVENTARIO
-- ============================================================

CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    categoria_producto_id INT REFERENCES categorias_producto(id) ON DELETE SET NULL,

    codigo VARCHAR(80) UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    marca VARCHAR(100),
    descripcion TEXT,
    unidad_medida VARCHAR(50) NOT NULL DEFAULT 'Unidad',

    stock_actual NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    stock_minimo NUMERIC(12,2) NOT NULL DEFAULT 0.00,

    costo_promedio NUMERIC(12,2) DEFAULT 0.00,
    precio_referencia NUMERIC(12,2) DEFAULT 0.00,

    estado estado_general NOT NULL DEFAULT 'Activo',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_producto_stock_actual CHECK (stock_actual >= 0),
    CONSTRAINT chk_producto_stock_minimo CHECK (stock_minimo >= 0),
    CONSTRAINT chk_producto_costo CHECK (costo_promedio IS NULL OR costo_promedio >= 0),
    CONSTRAINT chk_producto_precio CHECK (precio_referencia IS NULL OR precio_referencia >= 0)
);

CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_producto_id);
CREATE INDEX IF NOT EXISTS idx_productos_stock_bajo ON productos(stock_actual, stock_minimo);

-- ============================================================
-- MOVIMIENTOS DE INVENTARIO
-- ============================================================

CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id SERIAL PRIMARY KEY,
    producto_id INT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    visita_id INT REFERENCES visitas(id) ON DELETE SET NULL,

    tipo_movimiento tipo_movimiento_inventario NOT NULL,
    cantidad NUMERIC(12,2) NOT NULL,
    stock_anterior NUMERIC(12,2) NOT NULL,
    stock_nuevo NUMERIC(12,2) NOT NULL,

    motivo TEXT,
    observaciones TEXT,

    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_movimiento_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_movimiento_stock_anterior CHECK (stock_anterior >= 0),
    CONSTRAINT chk_movimiento_stock_nuevo CHECK (stock_nuevo >= 0)
);

CREATE INDEX IF NOT EXISTS idx_movimientos_producto_id ON movimientos_inventario(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_usuario_id ON movimientos_inventario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_visita_id ON movimientos_inventario(visita_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos_inventario(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos_inventario(tipo_movimiento);

-- ============================================================
-- PRODUCTOS USADOS EN UNA VISITA
-- ============================================================

CREATE TABLE IF NOT EXISTS visita_productos (
    id SERIAL PRIMARY KEY,
    visita_id INT NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,

    cantidad NUMERIC(12,2) NOT NULL,
    observaciones TEXT,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_visita_producto_cantidad CHECK (cantidad > 0)
);

CREATE INDEX IF NOT EXISTS idx_visita_productos_visita_id ON visita_productos(visita_id);
CREATE INDEX IF NOT EXISTS idx_visita_productos_producto_id ON visita_productos(producto_id);

-- ============================================================
-- AUDITORÍA GENERAL
-- ============================================================

CREATE TABLE IF NOT EXISTS auditoria (
    id BIGSERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    accion VARCHAR(100) NOT NULL,
    tabla_afectada VARCHAR(100),
    registro_id VARCHAR(100),
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip_origen VARCHAR(100),
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_id ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla ON auditoria(tabla_afectada);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha_creacion);

-- ============================================================
-- FUNCIONES DE ACTUALIZACIÓN AUTOMÁTICA
-- ============================================================

CREATE OR REPLACE FUNCTION actualizar_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS DE UPDATED_AT
-- ============================================================

DROP TRIGGER IF EXISTS trg_roles_updated_at ON roles;
CREATE TRIGGER trg_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_actualizacion();

DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON usuarios;
CREATE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_actualizacion();

DROP TRIGGER IF EXISTS trg_clientes_updated_at ON clientes;
CREATE TRIGGER trg_clientes_updated_at
BEFORE UPDATE ON clientes
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_actualizacion();

DROP TRIGGER IF EXISTS trg_vehiculos_updated_at ON vehiculos;
CREATE TRIGGER trg_vehiculos_updated_at
BEFORE UPDATE ON vehiculos
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_actualizacion();

DROP TRIGGER IF EXISTS trg_servicios_updated_at ON servicios;
CREATE TRIGGER trg_servicios_updated_at
BEFORE UPDATE ON servicios
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_actualizacion();

DROP TRIGGER IF EXISTS trg_visitas_updated_at ON visitas;
CREATE TRIGGER trg_visitas_updated_at
BEFORE UPDATE ON visitas
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_actualizacion();

DROP TRIGGER IF EXISTS trg_visita_servicios_updated_at ON visita_servicios;
CREATE TRIGGER trg_visita_servicios_updated_at
BEFORE UPDATE ON visita_servicios
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_actualizacion();

DROP TRIGGER IF EXISTS trg_productos_updated_at ON productos;
CREATE TRIGGER trg_productos_updated_at
BEFORE UPDATE ON productos
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_actualizacion();

-- ============================================================
-- FUNCIÓN: ACTUALIZAR FECHAS DE VISITA DEL VEHÍCULO
-- ============================================================

CREATE OR REPLACE FUNCTION actualizar_fechas_vehiculo_por_visita()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE vehiculos
    SET
        fecha_primera_visita = COALESCE(fecha_primera_visita, NEW.fecha_ingreso::DATE),
        fecha_ultimo_ingreso = NEW.fecha_ingreso,
        kilometraje_actual = COALESCE(NEW.kilometraje_ingreso, kilometraje_actual),
        fecha_actualizacion = NOW()
    WHERE id = NEW.vehiculo_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_fechas_vehiculo ON visitas;
CREATE TRIGGER trg_actualizar_fechas_vehiculo
AFTER INSERT ON visitas
FOR EACH ROW
EXECUTE FUNCTION actualizar_fechas_vehiculo_por_visita();

-- ============================================================
-- FUNCIÓN: REGISTRAR CAMBIO DE ESTADO DE VISITA
-- ============================================================

CREATE OR REPLACE FUNCTION registrar_cambio_estado_visita()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
        INSERT INTO visita_estados (
            visita_id,
            estado_anterior,
            estado_nuevo,
            comentario,
            usuario_id
        )
        VALUES (
            NEW.id,
            OLD.estado,
            NEW.estado,
            'Cambio automático de estado',
            NULL
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_registrar_cambio_estado_visita ON visitas;
CREATE TRIGGER trg_registrar_cambio_estado_visita
AFTER UPDATE OF estado ON visitas
FOR EACH ROW
EXECUTE FUNCTION registrar_cambio_estado_visita();

-- ============================================================
-- FUNCIÓN: APLICAR MOVIMIENTO DE INVENTARIO
-- ============================================================

CREATE OR REPLACE FUNCTION aplicar_movimiento_inventario(
    p_producto_id INT,
    p_usuario_id INT,
    p_visita_id INT,
    p_tipo_movimiento tipo_movimiento_inventario,
    p_cantidad NUMERIC,
    p_motivo TEXT DEFAULT NULL,
    p_observaciones TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_stock_anterior NUMERIC(12,2);
    v_stock_nuevo NUMERIC(12,2);
BEGIN
    IF p_cantidad <= 0 THEN
        RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
    END IF;

    SELECT stock_actual
    INTO v_stock_anterior
    FROM productos
    WHERE id = p_producto_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Producto no encontrado';
    END IF;

    IF p_tipo_movimiento IN ('Entrada', 'Ajuste positivo', 'Devolución') THEN
        v_stock_nuevo := v_stock_anterior + p_cantidad;
    ELSE
        v_stock_nuevo := v_stock_anterior - p_cantidad;
    END IF;

    IF v_stock_nuevo < 0 THEN
        RAISE EXCEPTION 'Stock insuficiente. Stock actual: %, cantidad solicitada: %',
            v_stock_anterior,
            p_cantidad;
    END IF;

    UPDATE productos
    SET
        stock_actual = v_stock_nuevo,
        fecha_actualizacion = NOW()
    WHERE id = p_producto_id;

    INSERT INTO movimientos_inventario (
        producto_id,
        usuario_id,
        visita_id,
        tipo_movimiento,
        cantidad,
        stock_anterior,
        stock_nuevo,
        motivo,
        observaciones
    )
    VALUES (
        p_producto_id,
        p_usuario_id,
        p_visita_id,
        p_tipo_movimiento,
        p_cantidad,
        v_stock_anterior,
        v_stock_nuevo,
        p_motivo,
        p_observaciones
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCIÓN: DESCONTAR INVENTARIO CUANDO SE USA EN VISITA
-- ============================================================

CREATE OR REPLACE FUNCTION descontar_producto_por_visita()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM aplicar_movimiento_inventario(
        NEW.producto_id,
        NEW.usuario_id,
        NEW.visita_id,
        'Uso en servicio',
        NEW.cantidad,
        'Producto usado en visita de taller',
        NEW.observaciones
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_descontar_producto_por_visita ON visita_productos;
CREATE TRIGGER trg_descontar_producto_por_visita
AFTER INSERT ON visita_productos
FOR EACH ROW
EXECUTE FUNCTION descontar_producto_por_visita();

-- ============================================================
-- VISTAS ÚTILES PARA DASHBOARD
-- ============================================================

CREATE OR REPLACE VIEW vista_dashboard_visitas_activas AS
SELECT
    v.id AS visita_id,
    v.fecha_ingreso,
    v.estado,
    c.id AS cliente_id,
    c.nombre AS cliente,
    c.telefono,
    ve.id AS vehiculo_id,
    ve.placa,
    ve.marca,
    ve.modelo,
    ve.anio,
    ve.color,
    u.id AS mecanico_id,
    CONCAT(u.nombre, ' ', COALESCE(u.apellido, '')) AS mecanico_asignado,
    v.motivo_visita,
    v.observaciones,
    v.fecha_entrega_estimada,
    v.fecha_actualizacion
FROM visitas v
INNER JOIN clientes c ON c.id = v.cliente_id
INNER JOIN vehiculos ve ON ve.id = v.vehiculo_id
LEFT JOIN usuarios u ON u.id = v.mecanico_asignado_id
WHERE v.estado NOT IN ('Entregado', 'Cancelado');

CREATE OR REPLACE VIEW vista_historial_vehiculo AS
SELECT
    ve.id AS vehiculo_id,
    ve.placa,
    ve.marca,
    ve.modelo,
    ve.anio,
    c.nombre AS cliente,
    v.id AS visita_id,
    v.fecha_ingreso,
    v.fecha_entrega_real,
    v.estado,
    v.motivo_visita,
    v.diagnostico,
    v.observaciones
FROM vehiculos ve
INNER JOIN clientes c ON c.id = ve.cliente_id
INNER JOIN visitas v ON v.vehiculo_id = ve.id
ORDER BY v.fecha_ingreso DESC;

CREATE OR REPLACE VIEW vista_stock_bajo AS
SELECT
    p.id,
    p.codigo,
    p.nombre,
    cp.nombre AS categoria,
    p.marca,
    p.unidad_medida,
    p.stock_actual,
    p.stock_minimo
FROM productos p
LEFT JOIN categorias_producto cp ON cp.id = p.categoria_producto_id
WHERE p.stock_actual <= p.stock_minimo
  AND p.estado = 'Activo';

-- (Sin productos de ejemplo: el inventario arranca vacio.
--  Las categorias de producto si quedan sembradas para clasificar.)
