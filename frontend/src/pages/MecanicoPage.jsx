import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Ban,
  Camera,
  Check,
  ChevronRight,
  CircleCheck,
  CirclePause,
  Flag,
  Image,
  LoaderCircle,
  PackagePlus,
  Plus,
  Save,
  Search,
  Trash2,
  TriangleAlert
} from 'lucide-react';
import { apiRequest, assetUrl, crudRequest } from '../api/client';
import { estadosVisita } from '../constants/app';
import { formatCurrency, formatDate, vehicleLabel } from '../utils/formatters';
import { validateImageSize, validateImageType } from '../utils/validation';
import { compressImage } from '../utils/image';
import ConfirmModal from '../components/forms/ConfirmModal';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';

// Estados que el mecanico ve en su tablero: al finalizar, el trabajo sale de su lista.
const estadosActivos = estadosVisita.filter((estado) => !['Finalizado', 'Entregado', 'Cancelado'].includes(estado));

// Camino principal del trabajo. "En espera de repuesto" es una pausa dentro de "En proceso".
const flujoEstados = ['Recibido', 'En diagnóstico', 'Pendiente de aprobación', 'En proceso', 'En prueba', 'Finalizado'];

const accionesPorEstado = {
  Recibido: [{ estado: 'En diagnóstico', label: 'Iniciar diagnóstico', primary: true }],
  'En diagnóstico': [
    { estado: 'Pendiente de aprobación', label: 'Enviar a aprobación', primary: true },
    { estado: 'En proceso', label: 'Iniciar reparación' }
  ],
  'Pendiente de aprobación': [{ estado: 'En proceso', label: 'Aprobado: iniciar reparación', primary: true }],
  'En proceso': [
    { estado: 'En prueba', label: 'Pasar a prueba', primary: true },
    { estado: 'En espera de repuesto', label: 'Pausar: esperar repuesto' }
  ],
  'En espera de repuesto': [{ estado: 'En proceso', label: 'Llegó el repuesto: reanudar', primary: true }],
  'En prueba': [
    { finalizar: true, label: 'Finalizar trabajo', primary: true },
    { estado: 'En proceso', label: 'Volver a reparación' }
  ]
};

// El contenido del detalle sigue al estado: el unico "wizard" es el recorrido de estados.
const faseDeEstado = (estado) => {
  if (['En proceso', 'En espera de repuesto'].includes(estado)) return 'reparacion';
  if (estado === 'En prueba') return 'prueba';
  return 'diagnostico';
};

const horaActual = () => new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
const tiposFoto = ['Vehículo', 'Visita', 'Daño', 'Avance', 'Final', 'VIN', 'Kilometraje', 'Otro'];

const initialNoteForm = {
  diagnostico: '',
  observaciones: ''
};

const initialProductForm = {
  producto_id: '',
  cantidad: '1',
  observaciones: ''
};

const initialItemForm = {
  tipo: 'Servicio',
  descripcion: '',
  cantidad: '1',
  precio_sugerido: ''
};

function MecanicoPage({ session, data, loading, error, onRefresh, showToast, onRequestError }) {
  const trabajos = data?.trabajos || [];
  const [selectedId, setSelectedId] = useState(undefined);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [query, setQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [productos, setProductos] = useState([]);
  const [noteForm, setNoteForm] = useState(initialNoteForm);
  const [productForm, setProductForm] = useState(initialProductForm);
  const [itemForm, setItemForm] = useState(initialItemForm);
  const [photoForm, setPhotoForm] = useState({ tipo: 'Avance', descripcion: '', foto: null });
  const [savingAction, setSavingAction] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const [productError, setProductError] = useState('');
  const [itemError, setItemError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [feedback, setFeedback] = useState(null);
  // Trabajos finalizados en esta sesion: se ocultan de inmediato sin esperar la recarga.
  const [finalizadosIds, setFinalizadosIds] = useState([]);

  const trabajosActivos = useMemo(
    () => trabajos.filter((trabajo) => trabajo.estado !== 'Finalizado' && !finalizadosIds.includes(trabajo.id)),
    [finalizadosIds, trabajos]
  );

  const filteredTrabajos = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return trabajosActivos
      .filter((trabajo) => !estadoFilter || trabajo.estado === estadoFilter)
      .filter((trabajo) => {
        if (!needle) return true;
        return [
          trabajo.cliente_nombre,
          trabajo.placa,
          trabajo.marca,
          trabajo.modelo,
          trabajo.estado,
          trabajo.motivo_visita
        ].some((value) => String(value || '').toLowerCase().includes(needle));
      });
  }, [estadoFilter, query, trabajosActivos]);

  useEffect(() => {
    if (selectedId === undefined && trabajosActivos[0]?.id) {
      setSelectedId(trabajosActivos[0].id);
    }
  }, [selectedId, trabajosActivos]);

  useEffect(() => {
    setFeedback(null);
  }, [selectedId]);

  useEffect(() => {
    let ignore = false;

    apiRequest('/productos?estado=Activo', { token: session.token })
      .then((payload) => {
        if (!ignore) setProductos(payload.productos || []);
      })
      .catch((err) => {
        if (!ignore) {
          onRequestError?.(err);
          setProductos([]);
        }
      });

    return () => {
      ignore = true;
    };
  }, [onRequestError, session.token]);

  useEffect(() => {
    if (!selectedId) return;

    let ignore = false;
    setDetailLoading(true);
    setDetailError('');

    apiRequest(`/mecanico/mis-trabajos/${selectedId}`, { token: session.token })
      .then((payload) => {
        if (ignore) return;
        setDetail(payload);
        setNoteForm({
          diagnostico: payload.visita?.diagnostico || '',
          observaciones: payload.visita?.observaciones || ''
        });
      })
      .catch((err) => {
        if (!ignore) setDetailError(onRequestError?.(err) || err.message);
      })
      .finally(() => {
        if (!ignore) setDetailLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [onRequestError, selectedId, session.token]);

  const refreshDetail = async () => {
    if (!selectedId) return;
    const payload = await apiRequest(`/mecanico/mis-trabajos/${selectedId}`, { token: session.token });
    setDetail(payload);
    setNoteForm({
      diagnostico: payload.visita?.diagnostico || '',
      observaciones: payload.visita?.observaciones || ''
    });
  };

  const clearSelection = () => {
    setSelectedId(null);
    setDetail(null);
    setDetailError('');
  };

  const updateEstado = async (estado, { skipConfirm = false, confirmMessage } = {}) => {
    if (!detail?.visita) return;

    if (!skipConfirm && estado === 'Finalizado') {
      setConfirmModal({
        title: 'Finalizar trabajo',
        message: confirmMessage || 'El trabajo se marcara como finalizado y saldra de tu lista.',
        action: () => updateEstado(estado, { skipConfirm: true })
      });
      return;
    }

    const estadoAnterior = detail.visita.estado;

    setSavingAction(`estado:${estado}`);
    try {
      const payload = await crudRequest({
        path: `/mecanico/mis-trabajos/${detail.visita.id}/estado`,
        token: session.token,
        method: 'PATCH',
        body: {
          estado,
          diagnostico: noteForm.diagnostico || undefined,
          observaciones: noteForm.observaciones || undefined
        }
      });
      if (estado === 'Finalizado') {
        const finalizadoId = detail.visita.id;
        setFinalizadosIds((current) => [...current, finalizadoId]);
        setDetail(null);
        setSelectedId(undefined);
        showToast(`${vehicleLabel(detail.visita)} finalizado. Se retiro de tu lista de trabajos.`);
      } else {
        setDetail(payload);
        setFeedback({ text: `Estado cambiado de "${estadoAnterior}" a "${estado}"`, hora: horaActual() });
        showToast(`Estado actualizado a "${estado}"`);
      }
      onRefresh();
    } catch (err) {
      showToast(onRequestError?.(err) || err.message, 'danger');
    } finally {
      setSavingAction('');
      setConfirmModal(null);
    }
  };

  const saveNotes = async (event) => {
    event.preventDefault();
    if (!detail?.visita) return;

    setSavingAction('notes');
    try {
      const payload = await crudRequest({
        path: `/mecanico/mis-trabajos/${detail.visita.id}/estado`,
        token: session.token,
        method: 'PATCH',
        body: {
          estado: detail.visita.estado,
          diagnostico: noteForm.diagnostico || undefined,
          observaciones: noteForm.observaciones || undefined
        }
      });
      setDetail(payload);
      setFeedback({ text: 'Diagnóstico y observaciones guardados', hora: horaActual() });
      showToast('Diagnostico guardado');
      onRefresh();
    } catch (err) {
      showToast(onRequestError?.(err) || err.message, 'danger');
    } finally {
      setSavingAction('');
    }
  };

  const addProduct = async (event) => {
    event.preventDefault();
    if (!detail?.visita) return;

    const cantidad = Number(productForm.cantidad);

    if (!productForm.producto_id) {
      setProductError('Selecciona un producto');
      return;
    }

    if (!Number.isInteger(cantidad) || cantidad < 1) {
      setProductError('La cantidad debe ser un entero mayor a 0');
      return;
    }

    setSavingAction('product');
    setProductError('');
    try {
      const payload = await crudRequest({
        path: `/mecanico/mis-trabajos/${detail.visita.id}/productos`,
        token: session.token,
        method: 'POST',
        body: {
          producto_id: Number(productForm.producto_id),
          cantidad,
          observaciones: productForm.observaciones || undefined
        }
      });
      setDetail((current) => ({ ...current, productos: payload.productos || current.productos }));
      setProductForm(initialProductForm);
      showToast('Producto registrado');
    } catch (err) {
      showToast(onRequestError?.(err) || err.message, 'danger');
    } finally {
      setSavingAction('');
    }
  };

  const addItem = async (event) => {
    event.preventDefault();
    if (!detail?.visita) return;

    const descripcion = itemForm.descripcion.trim();
    const cantidad = Number(itemForm.cantidad);
    const precio = Number(itemForm.precio_sugerido);

    if (!descripcion) {
      setItemError('Ingresa una descripcion');
      return;
    }

    if (!(cantidad > 0)) {
      setItemError('La cantidad debe ser mayor a 0');
      return;
    }

    if (!(precio >= 0)) {
      setItemError('Ingresa un precio valido');
      return;
    }

    setSavingAction('item');
    setItemError('');
    try {
      const payload = await crudRequest({
        path: `/mecanico/mis-trabajos/${detail.visita.id}/items`,
        token: session.token,
        method: 'POST',
        body: {
          tipo: itemForm.tipo,
          descripcion,
          cantidad,
          precio_sugerido: precio
        }
      });
      setDetail((current) => ({ ...current, items: payload.items || current.items }));
      setItemForm(initialItemForm);
      showToast('Item agregado');
    } catch (err) {
      showToast(onRequestError?.(err) || err.message, 'danger');
    } finally {
      setSavingAction('');
    }
  };

  const removeItem = async (itemId) => {
    if (!detail?.visita) return;

    setSavingAction(`item:${itemId}`);
    try {
      const payload = await crudRequest({
        path: `/mecanico/mis-trabajos/${detail.visita.id}/items/${itemId}`,
        token: session.token,
        method: 'DELETE'
      });
      setDetail((current) => ({ ...current, items: payload.items || current.items }));
      showToast('Item eliminado');
    } catch (err) {
      showToast(onRequestError?.(err) || err.message, 'danger');
    } finally {
      setSavingAction('');
    }
  };

  const uploadPhoto = async (event) => {
    event.preventDefault();
    if (!detail?.visita) return;

    const typeError = validateImageType(photoForm.foto);

    if (typeError) {
      setPhotoError(typeError);
      return;
    }

    setSavingAction('photo');
    setPhotoError('');

    // Se reduce antes de medir el peso: en crudo casi cualquier foto de
    // celular superaria el limite.
    const foto = await compressImage(photoForm.foto);
    const sizeError = validateImageSize(foto);

    if (sizeError) {
      setPhotoError(sizeError);
      setSavingAction('');
      return;
    }

    const formData = new FormData();
    formData.append('tipo', photoForm.tipo);
    formData.append('descripcion', photoForm.descripcion);
    formData.append('foto', foto);

    try {
      const payload = await crudRequest({
        path: `/mecanico/mis-trabajos/${detail.visita.id}/fotos`,
        token: session.token,
        method: 'POST',
        body: formData
      });
      setDetail((current) => ({ ...current, fotos: payload.fotos || current.fotos }));
      setPhotoForm({ tipo: 'Avance', descripcion: '', foto: null });
      setPhotoError('');
      event.target.reset();
      showToast('Foto cargada');
      await refreshDetail();
    } catch (err) {
      showToast(onRequestError?.(err) || err.message, 'danger');
    } finally {
      setSavingAction('');
    }
  };

  const updateEtapa = async (etapa, estado, { skipConfirm = false } = {}) => {
    if (!detail?.visita) return;

    if (!skipConfirm && ['Completado', 'Omitido'].includes(estado)) {
      setConfirmModal({
        title: 'Confirmar etapa',
        message: `Se marcara la etapa "${etapa.nombre_etapa}" como ${estado}.`,
        action: () => updateEtapa(etapa, estado, { skipConfirm: true })
      });
      return;
    }

    setSavingAction(`etapa:${etapa.id}:${estado}`);
    try {
      const payload = await crudRequest({
        path: `/mecanico/mis-trabajos/${detail.visita.id}/etapas/${etapa.id}`,
        token: session.token,
        method: 'PATCH',
        body: {
          estado,
          observaciones: noteForm.observaciones || undefined
        }
      });
      setDetail(payload);
      showToast('Etapa actualizada');
      onRefresh();
    } catch (err) {
      showToast(onRequestError?.(err) || err.message, 'danger');
    } finally {
      setSavingAction('');
      setConfirmModal(null);
    }
  };

  return (
    <>
      <div className="mechanic-shell">
        <section className="mechanic-list panel">
        <div className="mechanic-toolbar">
          <label className="search-box mechanic-search">
            <Search size={18} aria-hidden="true" />
            <input
              placeholder="Buscar trabajo"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select className="mechanic-filter" value={estadoFilter} onChange={(event) => setEstadoFilter(event.target.value)}>
            <option value="">Todos</option>
            {estadosActivos.map((estado) => (
              <option key={estado} value={estado}>{estado}</option>
            ))}
          </select>
        </div>

        {loading ? <EmptyState text="Cargando trabajos..." /> : null}
        {error ? <ErrorState text={error} onRetry={onRefresh} /> : null}
        {!loading && !error && !filteredTrabajos.length ? <EmptyState text="Sin trabajos asignados" /> : null}

        <div className="work-card-list">
          {filteredTrabajos.map((trabajo) => (
            <button
              className={selectedId === trabajo.id ? 'work-card work-card-active' : 'work-card'}
              key={trabajo.id}
              type="button"
              onClick={() => setSelectedId(trabajo.id)}
            >
              <span className="status-pill">{trabajo.estado}</span>
              <strong>{vehicleLabel(trabajo)}</strong>
              <span>{trabajo.cliente_nombre}</span>
              <small>{trabajo.motivo_visita || 'Sin motivo'}</small>
              <div className="work-card-progress">
                <div className="progress-track">
                  <span style={{ width: `${Math.min(Number(trabajo.porcentaje_avance || 0), 100)}%` }} />
                </div>
                <b>{Number(trabajo.porcentaje_avance || 0).toFixed(0)}%</b>
              </div>
            </button>
          ))}
        </div>
        </section>

        <section className="mechanic-detail panel">
        {!selectedId ? <EmptyState text={trabajosActivos.length ? 'Selecciona un trabajo' : 'No tienes trabajos pendientes'} /> : null}
        {detailLoading ? <EmptyState text="Cargando detalle..." /> : null}
        {detailError ? <ErrorState text={detailError} onRetry={refreshDetail} /> : null}
        {!detailLoading && !detailError && detail ? (
          <TrabajoDetalle
            key={detail.visita.id}
            detail={detail}
            feedback={feedback}
            noteForm={noteForm}
            productForm={productForm}
            photoForm={photoForm}
            productos={productos}
            savingAction={savingAction}
            onBack={clearSelection}
            onEstado={updateEstado}
            onNoteChange={setNoteForm}
            onProductChange={(updater) => {
              setProductError('');
              setProductForm(updater);
            }}
            onPhotoChange={(updater) => {
              setPhotoError('');
              setPhotoForm(updater);
            }}
            onSaveNotes={saveNotes}
            onAddProduct={addProduct}
            onUploadPhoto={uploadPhoto}
            onUpdateEtapa={updateEtapa}
            productError={productError}
            photoError={photoError}
            itemForm={itemForm}
            onItemChange={(updater) => {
              setItemError('');
              setItemForm(updater);
            }}
            onAddItem={addItem}
            onRemoveItem={removeItem}
            itemError={itemError}
          />
        ) : null}
        </section>
      </div>
      <ConfirmModal
        confirm={confirmModal}
        saving={Boolean(savingAction)}
        onCancel={() => setConfirmModal(null)}
        onConfirm={() => confirmModal?.action?.()}
      />
    </>
  );
}

function TrabajoDetalle({
  detail,
  feedback,
  noteForm,
  productForm,
  photoForm,
  productos,
  savingAction,
  onBack,
  onEstado,
  onNoteChange,
  onProductChange,
  onPhotoChange,
  onSaveNotes,
  onAddProduct,
  onUploadPhoto,
  onUpdateEtapa,
  productError,
  photoError,
  itemForm,
  onItemChange,
  onAddItem,
  onRemoveItem,
  itemError
}) {
  const { visita, servicios = [], productos: productosUsados = [], items = [], fotos = [], bitacora = [], etapas = [], progreso } = detail;
  const fase = faseDeEstado(visita.estado);

  const notasPendientes = (noteForm.diagnostico || '') !== (visita.diagnostico || '')
    || (noteForm.observaciones || '') !== (visita.observaciones || '');
  const etapasCerradas = etapas.filter((etapa) => ['Completado', 'Omitido'].includes(etapa.estado)).length;
  const etapasPendientes = etapas.length - etapasCerradas;

  const porcentajeEtapas = progreso
    ? Number(progreso.porcentaje_avance || 0)
    : (etapas.length ? (etapasCerradas / etapas.length) * 100 : 0);
  const subAvance = etapas.length
    ? { cerradas: etapasCerradas, total: etapas.length, porcentaje: Math.min(porcentajeEtapas, 100) }
    : null;

  const avisos = [
    !visita.diagnostico && !noteForm.diagnostico ? 'No hay diagnóstico registrado.' : null,
    etapasPendientes > 0 ? `Quedan ${etapasPendientes} etapa(s) sin completar.` : null,
    !fotos.length ? 'No se han cargado fotos del trabajo.' : null,
    notasPendientes ? 'Hay cambios en el diagnóstico sin guardar; se guardarán al finalizar.' : null
  ].filter(Boolean);

  const finalizar = () => {
    const base = `${vehicleLabel(visita)} se marcará como Finalizado y saldrá de tu lista de trabajos.`;
    onEstado('Finalizado', {
      confirmMessage: avisos.length ? `${base} Atención: ${avisos.join(' ')}` : base
    });
  };

  const datosDiagnostico = (
    <>
      <section className="mechanic-section">
        <h3>Vehiculo</h3>
        <div className="detail-grid">
          <DetailItem label="Placa" value={visita.placa} />
          <DetailItem label="Marca" value={visita.marca} />
          <DetailItem label="Modelo" value={visita.modelo} />
          <DetailItem label="Color" value={visita.color} />
          <DetailItem label="Anio" value={visita.anio} />
          <DetailItem label="Kilometraje" value={visita.kilometraje_ingreso} />
        </div>
      </section>

      <section className="mechanic-section">
        <h3>Trabajo solicitado</h3>
        <div className="work-summary">
          <p><strong>Motivo:</strong> {visita.motivo_visita || 'Sin dato'}</p>
          <p><strong>Problema:</strong> {visita.descripcion_problema || 'Sin dato'}</p>
          <p><strong>Ingreso:</strong> {formatDate(visita.fecha_ingreso)}</p>
        </div>
        <CompactList
          rows={servicios}
          empty="Sin servicios asignados"
          render={(servicio) => (
            <>
              <strong>{servicio.servicio_nombre}</strong>
              <span>{servicio.estado}</span>
            </>
          )}
        />
      </section>

      <section className="mechanic-section">
        <h3>Diagnostico y observaciones</h3>
        <form className="mechanic-form" onSubmit={onSaveNotes}>
          <label className="field">
            Diagnostico
            <textarea
              value={noteForm.diagnostico}
              onChange={(event) => onNoteChange((current) => ({ ...current, diagnostico: event.target.value }))}
              rows={4}
            />
          </label>
          <label className="field">
            Observaciones
            <textarea
              value={noteForm.observaciones}
              onChange={(event) => onNoteChange((current) => ({ ...current, observaciones: event.target.value }))}
              rows={3}
            />
          </label>
          <div className="save-row">
            <button className="primary-button action-button" type="submit" disabled={savingAction === 'notes' || !notasPendientes}>
              {savingAction === 'notes' ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
              Guardar diagnóstico
            </button>
            <span className={notasPendientes ? 'save-status save-status-pending' : 'save-status'}>
              {notasPendientes ? 'Cambios sin guardar' : 'Todo guardado'}
            </span>
          </div>
        </form>
      </section>
    </>
  );

  return (
    <div className="work-detail-content">
      <div className="work-detail-header">
        <button className="icon-button mobile-only" type="button" onClick={onBack} aria-label="Volver" title="Volver a la lista">
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div>
          <span className="status-pill">{visita.estado}</span>
          <h2>{vehicleLabel(visita)}</h2>
          <p>{visita.cliente_nombre} · {visita.cliente_telefono || visita.cliente_whatsapp || 'Sin telefono'}</p>
        </div>
      </div>

      <EstadoFlow
        estado={visita.estado}
        feedback={feedback}
        savingAction={savingAction}
        subAvance={subAvance}
        onEstado={onEstado}
        onFinalizar={finalizar}
      />

      {fase === 'diagnostico' ? datosDiagnostico : null}

      {fase === 'reparacion' ? (
        <>
          <section className="mechanic-section">
            <h3>Etapas de la reparación</h3>
            {subAvance ? (
              <p className="mechanic-hint">
                {subAvance.cerradas} de {subAvance.total} etapas cerradas
                {progreso?.etapa_actual ? ` · Etapa actual: ${progreso.etapa_actual}` : ''}
              </p>
            ) : null}
            {progreso?.alerta_sin_avance ? (
              <div className="finish-warning">
                <TriangleAlert size={18} aria-hidden="true" />
                <div><strong>Sin avance reciente en la etapa actual</strong></div>
              </div>
            ) : null}
            <div className="stage-list">
              {etapas.length ? etapas.map((etapa) => {
                const esFinal = etapa.estado === 'Completado' || etapa.estado === 'Omitido';

                return (
                  <article className={`stage-card stage-${String(etapa.estado).toLowerCase().replaceAll(' ', '-')}`} key={etapa.id}>
                    <div>
                      <strong>{etapa.orden}. {etapa.nombre_etapa}</strong>
                      {!esFinal ? <span>{etapa.estado}</span> : null}
                    </div>
                    {esFinal ? (
                      <div className={`stage-final stage-final-${etapa.estado.toLowerCase()}`}>
                        {etapa.estado === 'Completado'
                          ? <Check size={16} aria-hidden="true" />
                          : <Ban size={16} aria-hidden="true" />}
                        {etapa.estado}
                      </div>
                    ) : (
                      <div className="stage-actions">
                        <button type="button" onClick={() => onUpdateEtapa(etapa, 'En proceso')} disabled={savingAction.startsWith(`etapa:${etapa.id}:`)}>
                          En proceso
                        </button>
                        <button type="button" onClick={() => onUpdateEtapa(etapa, 'Completado')} disabled={savingAction.startsWith(`etapa:${etapa.id}:`)}>
                          Completado
                        </button>
                        <button type="button" onClick={() => onUpdateEtapa(etapa, 'Omitido')} disabled={savingAction.startsWith(`etapa:${etapa.id}:`)}>
                          Omitir
                        </button>
                      </div>
                    )}
                  </article>
                );
              }) : <div className="compact-empty">Sin etapas inicializadas</div>}
            </div>
          </section>

          <section className="mechanic-section">
            <h3>Productos usados</h3>
            <form className="mechanic-form product-form" onSubmit={onAddProduct} noValidate>
              <label className="field">
                Producto
                <select
                  value={productForm.producto_id}
                  onChange={(event) => onProductChange((current) => ({ ...current, producto_id: event.target.value }))}
                  required
                >
                  <option value="">Seleccionar</option>
                  {productos.map((producto) => (
                    <option key={producto.id} value={producto.id}>
                      {[producto.codigo, producto.nombre, producto.marca].filter(Boolean).join(' - ')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field quantity-field">
                Cantidad
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={productForm.cantidad}
                  onChange={(event) => onProductChange((current) => ({ ...current, cantidad: event.target.value.replace(/[^\d]/g, '') }))}
                  onKeyDown={(event) => {
                    if (['.', ',', 'e', 'E', '+', '-'].includes(event.key)) {
                      event.preventDefault();
                    }
                  }}
                  required
                />
              </label>
              <label className="field">
                Observaciones
                <input
                  value={productForm.observaciones}
                  onChange={(event) => onProductChange((current) => ({ ...current, observaciones: event.target.value }))}
                />
              </label>
              <button className="primary-button action-button" type="submit" disabled={savingAction === 'product'}>
                {savingAction === 'product' ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <PackagePlus size={18} aria-hidden="true" />}
                Registrar producto
              </button>
              {productError ? <div className="form-error full-row">{productError}</div> : null}
            </form>
            <CompactList
              rows={productosUsados}
              empty="Sin productos usados"
              render={(producto) => (
                <>
                  <strong>{producto.producto_nombre}</strong>
                  <span>{producto.cantidad} {producto.unidad_medida || ''}</span>
                </>
              )}
            />
          </section>

          <section className="mechanic-section">
            <h3>Items adicionales (manual)</h3>
            <p className="mechanic-hint">Servicio o material que no esta en el catalogo. No afecta el inventario; el precio sugerido se podra ajustar en el resumen de cobro.</p>
            <form className="mechanic-form item-form" onSubmit={onAddItem} noValidate>
              <label className="field">
                Tipo
                <select
                  value={itemForm.tipo}
                  onChange={(event) => onItemChange((current) => ({ ...current, tipo: event.target.value }))}
                >
                  <option value="Servicio">Servicio</option>
                  <option value="Material">Material</option>
                </select>
              </label>
              <label className="field">
                Descripcion
                <input
                  value={itemForm.descripcion}
                  onChange={(event) => onItemChange((current) => ({ ...current, descripcion: event.target.value }))}
                  maxLength={255}
                  required
                />
              </label>
              <label className="field quantity-field">
                Cantidad
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={itemForm.cantidad}
                  onChange={(event) => onItemChange((current) => ({ ...current, cantidad: event.target.value.replace(/[^\d]/g, '') }))}
                  onKeyDown={(event) => { if (['.', ',', 'e', 'E', '+', '-'].includes(event.key)) event.preventDefault(); }}
                  required
                />
              </label>
              <label className="field quantity-field">
                Precio sugerido
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={itemForm.precio_sugerido}
                  onChange={(event) => onItemChange((current) => ({ ...current, precio_sugerido: event.target.value.replace(/[^\d]/g, '') }))}
                  onKeyDown={(event) => { if (['.', ',', 'e', 'E', '+', '-'].includes(event.key)) event.preventDefault(); }}
                  required
                />
              </label>
              <button className="primary-button action-button" type="submit" disabled={savingAction === 'item'}>
                {savingAction === 'item' ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
                Agregar item
              </button>
              {itemError ? <div className="form-error full-row">{itemError}</div> : null}
            </form>
            {items.length ? (
              <div className="compact-list">
                {items.map((item) => (
                  <div className="compact-row item-row" key={item.id}>
                    <strong>{item.descripcion}</strong>
                    <span>{item.tipo} · {Number(item.cantidad)} × {formatCurrency(item.precio_sugerido)}</span>
                    <button
                      className="icon-button"
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      disabled={savingAction === `item:${item.id}`}
                      aria-label="Quitar item"
                      title="Quitar item"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            ) : <div className="compact-empty">Sin items adicionales</div>}
          </section>
        </>
      ) : null}

      {fase === 'prueba' ? (
        <section className="mechanic-section">
          <h3>Revisión final</h3>
          <div className="finish-checklist">
            <FinishCheck ok={Boolean(visita.diagnostico)} label="Diagnóstico" detail={visita.diagnostico ? 'Registrado' : 'Sin registrar'} />
            <FinishCheck
              ok={etapas.length > 0 && etapasPendientes === 0}
              label="Etapas"
              detail={etapas.length ? `${etapasCerradas} de ${etapas.length} cerradas` : 'Sin etapas'}
            />
            <FinishCheck ok label="Productos usados" detail={`${productosUsados.length} registrado(s)`} />
            <FinishCheck ok label="Items adicionales" detail={`${items.length} registrado(s)`} />
            <FinishCheck ok={fotos.length > 0} label="Fotos" detail={`${fotos.length} cargada(s)`} />
          </div>
          {avisos.length ? (
            <div className="finish-warning">
              <TriangleAlert size={18} aria-hidden="true" />
              <div>
                <strong>Revisa antes de finalizar</strong>
                {avisos.map((aviso) => <span key={aviso}>{aviso}</span>)}
              </div>
            </div>
          ) : null}
          <p className="mechanic-hint">Si todo está en orden, usa «Finalizar trabajo» arriba: se notifica a recepción y el vehículo sale de tu lista de trabajos.</p>
        </section>
      ) : null}

      <section className="mechanic-section">
        <h3>Fotos</h3>
        <form className="mechanic-form photo-form" onSubmit={onUploadPhoto} noValidate>
          <label className="field">
            Tipo
            <select value={photoForm.tipo} onChange={(event) => onPhotoChange((current) => ({ ...current, tipo: event.target.value }))}>
              {tiposFoto.map((tipo) => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Descripcion
            <input
              value={photoForm.descripcion}
              onChange={(event) => onPhotoChange((current) => ({ ...current, descripcion: event.target.value }))}
            />
          </label>
          <label className="file-picker">
            <Camera size={20} aria-hidden="true" />
            <span>{photoForm.foto?.name || 'Seleccionar foto'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => onPhotoChange((current) => ({ ...current, foto: event.target.files?.[0] || null }))}
              required
            />
          </label>
          <button className="primary-button action-button" type="submit" disabled={savingAction === 'photo'}>
            {savingAction === 'photo' ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Image size={18} aria-hidden="true" />}
            Subir foto
          </button>
          {photoError ? <div className="form-error full-row">{photoError}</div> : null}
        </form>
        <PhotoGrid fotos={fotos} />
      </section>

      {fase !== 'diagnostico' ? (
        <details className="mechanic-collapsible">
          <summary>Diagnóstico y datos del vehículo</summary>
          {datosDiagnostico}
        </details>
      ) : null}

      <details className="mechanic-collapsible">
        <summary>Bitácora ({bitacora.length})</summary>
        <CompactList
          rows={bitacora}
          empty="Sin historial"
          render={(item) => (
            <>
              <strong>{item.estado_nuevo || item.estado || 'Cambio registrado'}</strong>
              <span>{item.observaciones || item.descripcion || formatDate(item.fecha_creacion)}</span>
            </>
          )}
        />
      </details>
    </div>
  );
}

function EstadoFlow({ estado, feedback, savingAction, subAvance, onEstado, onFinalizar }) {
  const enPausa = estado === 'En espera de repuesto';
  const actualIndex = flujoEstados.indexOf(enPausa ? 'En proceso' : estado);
  const procesoIndex = flujoEstados.indexOf('En proceso');
  const acciones = accionesPorEstado[estado] || [];
  const guardandoEstado = savingAction.startsWith('estado:');
  const otrosEstados = estadosActivos.filter((opcion) => opcion !== estado);

  return (
    <section className="estado-flow">
      <ol className="estado-track">
        {flujoEstados.map((paso, index) => {
          const done = index < actualIndex;
          const current = index === actualIndex;
          const className = [
            'estado-track-step',
            done ? 'estado-track-done' : '',
            current ? 'estado-track-current' : '',
            current && enPausa ? 'estado-track-paused' : ''
          ].filter(Boolean).join(' ');

          return (
            <li className={className} key={paso} aria-current={current ? 'step' : undefined}>
              <span className="estado-track-dot">
                {done ? <Check size={14} aria-hidden="true" /> : null}
                {current && enPausa ? <CirclePause size={14} aria-hidden="true" /> : null}
              </span>
              <span className="estado-track-label">{current && enPausa ? 'Esperando repuesto' : paso}</span>
              {index === procesoIndex && subAvance && actualIndex >= procesoIndex ? (
                <span className="estado-track-sub" title={`${subAvance.cerradas} de ${subAvance.total} etapas cerradas`}>
                  <span className="estado-track-sub-bar">
                    <span style={{ width: `${subAvance.porcentaje}%` }} />
                  </span>
                  <small>{subAvance.cerradas}/{subAvance.total} etapas</small>
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="estado-flow-body">
        <div className="estado-flow-current">
          <span>Estado actual</span>
          <strong>{estado}</strong>
        </div>
        <div className="estado-flow-actions">
          {acciones.map((accion) => (
            <button
              className={accion.primary ? 'primary-button action-button' : 'secondary-button'}
              key={accion.label}
              type="button"
              disabled={guardandoEstado}
              onClick={() => (accion.finalizar ? onFinalizar() : onEstado(accion.estado))}
            >
              {savingAction === `estado:${accion.finalizar ? 'Finalizado' : accion.estado}` ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : null}
              {accion.finalizar && savingAction !== 'estado:Finalizado' ? <Flag size={18} aria-hidden="true" /> : null}
              {accion.label}
              {accion.primary && !accion.finalizar ? <ChevronRight size={18} aria-hidden="true" /> : null}
            </button>
          ))}
          <select
            className="estado-flow-other"
            value=""
            disabled={guardandoEstado}
            onChange={(event) => event.target.value && onEstado(event.target.value)}
            aria-label="Cambiar a otro estado"
          >
            <option value="">Otro estado…</option>
            {otrosEstados.map((opcion) => (
              <option key={opcion} value={opcion}>{opcion}</option>
            ))}
          </select>
        </div>
      </div>

      {feedback ? (
        <div className="estado-flow-feedback" role="status">
          <CircleCheck size={18} aria-hidden="true" />
          <span>{feedback.text}</span>
          <small>{feedback.hora}</small>
        </div>
      ) : null}
    </section>
  );
}

function FinishCheck({ ok, label, detail }) {
  return (
    <div className={ok ? 'finish-check finish-check-ok' : 'finish-check finish-check-warn'}>
      {ok ? <CircleCheck size={18} aria-hidden="true" /> : <TriangleAlert size={18} aria-hidden="true" />}
      <strong>{label}</strong>
      <span>{detail}</span>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value || 'Sin dato'}</strong>
    </div>
  );
}

function CompactList({ rows, empty, render }) {
  if (!rows.length) {
    return <div className="compact-empty">{empty}</div>;
  }

  return (
    <div className="compact-list">
      {rows.map((row, index) => (
        <div className="compact-row" key={row.id || index}>
          {render(row)}
        </div>
      ))}
    </div>
  );
}

function PhotoGrid({ fotos }) {
  if (!fotos.length) {
    return <div className="compact-empty">Sin fotos cargadas</div>;
  }

  return (
    <div className="photo-grid">
      {fotos.map((foto) => (
        <a href={assetUrl(foto.url_archivo)} key={foto.id} target="_blank" rel="noreferrer">
          <img src={assetUrl(foto.url_archivo)} alt={foto.descripcion || foto.tipo || 'Foto de visita'} />
          <span>{foto.tipo}</span>
        </a>
      ))}
    </div>
  );
}

export default MecanicoPage;
