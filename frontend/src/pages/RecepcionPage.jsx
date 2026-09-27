import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, RefreshCcw, Save, Trash2 } from 'lucide-react';
import { apiRequest } from '../api/client';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import SearchSelect from '../components/ui/SearchSelect';
import DanosDiagram from '../components/ui/DanosDiagram';
import { DanosDocument, InventarioDocument } from '../components/ui/RecepcionDocuments';
import {
  autorizaciones,
  checklistItems,
  checklistSections,
  getDiagrama,
  tiposDano,
  zonaLabel
} from '../constants/recepcion';
import { formatDate, optionLabel, vehicleLabel } from '../utils/formatters';

const emptyChecklist = () => checklistSections.reduce((acc, section) => {
  acc[section.key] = Object.fromEntries(section.items.map((item) => [item, false]));
  return acc;
}, {});

const initialForm = () => ({
  nivel_combustible: '',
  trabajo_a_realizar: '',
  comentarios_cliente: '',
  autoriza_presupuesto_previo: false,
  autoriza_sin_presupuesto: false,
  autoriza_pruebas: false,
  acepta_condiciones: false,
  nombre_aceptacion: '',
  firma_cliente: '',
  danos: {},
  observaciones_danos: '',
  // Clave del diagrama de danos (turismo, camioneta, pickup, camion, buses); la decide el backend.
  tipo_diagrama: '',
  ...emptyChecklist()
});

const mergeChecklist = (recepcion = {}) => checklistSections.reduce((acc, section) => {
  acc[section.key] = {
    ...Object.fromEntries(section.items.map((item) => [item, false])),
    ...(recepcion[section.key] || {})
  };
  return acc;
}, {});

const nivelesCombustible = [
  ['', 'Sin dato'],
  ['0', 'E (vacío)'],
  ['25', '1/4'],
  ['50', '1/2'],
  ['75', '3/4'],
  ['100', 'F (lleno)']
];

function RecepcionPage({ session, data, loading, error, onRefresh, onRequestError, showToast }) {
  const visitas = data?.visitas || [];
  const [selectedVisitaId, setSelectedVisitaId] = useState('');
  const [form, setForm] = useState(initialForm);
  const [visitaDetalle, setVisitaDetalle] = useState(null);
  const [recibidoPor, setRecibidoPor] = useState('');
  const [recepcionLoading, setRecepcionLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [zonaSeleccionada, setZonaSeleccionada] = useState(null);
  const [printDoc, setPrintDoc] = useState(null);
  const selectedVisita = useMemo(() => (
    visitas.find((visita) => String(visita.id) === String(selectedVisitaId))
  ), [selectedVisitaId, visitas]);

  useEffect(() => {
    setZonaSeleccionada(null);

    if (!selectedVisitaId || !session?.token) {
      setForm(initialForm());
      setVisitaDetalle(null);
      return undefined;
    }

    let ignore = false;
    setRecepcionLoading(true);
    setFormError('');

    apiRequest(`/visitas/${selectedVisitaId}/recepcion`, { token: session.token })
      .then((payload) => {
        if (ignore) return;
        const recepcion = payload.recepcion || {};
        setVisitaDetalle(payload.visita || null);
        setRecibidoPor(recepcion.recibido_por_nombre || '');
        setForm({
          ...initialForm(),
          ...mergeChecklist(recepcion),
          nivel_combustible: recepcion.nivel_combustible ?? '',
          trabajo_a_realizar: recepcion.trabajo_a_realizar || '',
          comentarios_cliente: recepcion.comentarios_cliente || '',
          autoriza_presupuesto_previo: Boolean(recepcion.autoriza_presupuesto_previo),
          autoriza_sin_presupuesto: Boolean(recepcion.autoriza_sin_presupuesto),
          autoriza_pruebas: Boolean(recepcion.autoriza_pruebas),
          acepta_condiciones: Boolean(recepcion.acepta_condiciones),
          nombre_aceptacion: recepcion.nombre_aceptacion || '',
          firma_cliente: recepcion.firma_cliente || '',
          danos: recepcion.danos || {},
          observaciones_danos: recepcion.observaciones_danos || '',
          tipo_diagrama: payload.tipo_diagrama || ''
        });
      })
      .catch((err) => {
        if (!ignore) setFormError(onRequestError?.(err) || err.message);
      })
      .finally(() => {
        if (!ignore) setRecepcionLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [onRequestError, selectedVisitaId, session?.token]);

  // Se imprime cuando el documento ya esta montado en el portal y su logo cargo.
  useEffect(() => {
    if (!printDoc) return undefined;
    let cancelled = false;
    const imagenes = [...document.querySelectorAll('.recepcion-print-portal img')];
    // El diagrama es una <image> dentro del SVG: se precarga aparte.
    const diagrama = new Image();
    diagrama.src = getDiagrama(form.tipo_diagrama).imagen;

    Promise.all([
      ...imagenes.map((img) => (img.complete ? null : new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      }))),
      diagrama.decode().catch(() => null)
    ]).then(() => {
      if (cancelled) return;
      document.body.classList.add('printing-recepcion');
      window.print();
      document.body.classList.remove('printing-recepcion');
      setPrintDoc(null);
    });

    return () => {
      cancelled = true;
    };
  }, [form.tipo_diagrama, printDoc]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateChecklist = (sectionKey, item, checked) => {
    setForm((current) => ({
      ...current,
      [sectionKey]: {
        ...current[sectionKey],
        [item]: checked
      }
    }));
  };

  const updateDano = (zona, updater) => {
    setForm((current) => {
      const actual = current.danos[zona] || { tipos: [], nota: '' };
      const siguiente = updater(actual);
      const danos = { ...current.danos };

      if (siguiente.tipos.length || siguiente.nota) {
        danos[zona] = siguiente;
      } else {
        delete danos[zona];
      }

      return { ...current, danos };
    });
  };

  const toggleTipoDano = (zona, codigo) => {
    updateDano(zona, (actual) => ({
      ...actual,
      tipos: actual.tipos.includes(codigo)
        ? actual.tipos.filter((tipo) => tipo !== codigo)
        : [...actual.tipos, codigo]
    }));
  };

  const guardar = async () => {
    if (!selectedVisitaId) {
      setFormError('Selecciona una visita');
      return false;
    }

    setSaving(true);
    setFormError('');

    try {
      const payload = await apiRequest(`/visitas/${selectedVisitaId}/recepcion`, {
        token: session.token,
        method: 'PUT',
        body: {
          ...form,
          nivel_combustible: form.nivel_combustible === '' ? null : Number.parseInt(form.nivel_combustible, 10)
        }
      });
      setRecibidoPor(payload.recepcion?.recibido_por_nombre || recibidoPor);
      if (payload.tipo_diagrama) updateField('tipo_diagrama', payload.tipo_diagrama);
      return true;
    } catch (err) {
      setFormError(onRequestError?.(err) || err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (await guardar()) showToast?.('Recepcion guardada correctamente');
  };

  // Guarda primero para que lo impreso coincida con lo registrado.
  const imprimir = async (tipo) => {
    if (await guardar()) setPrintDoc(tipo);
  };

  if (loading) return <EmptyState text="Cargando visitas..." />;
  if (error) return <ErrorState text={error} onRetry={onRefresh} />;

  const visitaDoc = visitaDetalle || selectedVisita;
  const danoSeleccionado = zonaSeleccionada ? form.danos[zonaSeleccionada] || { tipos: [], nota: '' } : null;
  const diagrama = getDiagrama(form.tipo_diagrama);
  const zonasConDano = diagrama.zonas.filter((zona) => form.danos[zona.key]);

  return (
    <div className="reception-shell">
      <section className="panel reception-controls">
        <div className="panel-heading">
          <h2>Recepcion de vehiculo</h2>
          <button className="secondary-button compact-button" type="button" onClick={onRefresh}>
            <RefreshCcw size={17} aria-hidden="true" />
            Actualizar
          </button>
        </div>

        <label className="field">
          Visita activa
          <SearchSelect
            value={selectedVisitaId}
            onChange={setSelectedVisitaId}
            placeholder="Buscar visita por numero o cliente"
            emptyText="Sin visitas que coincidan"
            options={visitas.map((visita) => ({
              value: visita.id,
              label: optionLabel({
                orden: `VIS-${visita.id}`,
                cliente: visita.cliente_nombre,
                vehiculo: vehicleLabel(visita),
                estado: visita.estado
              }, ['orden', 'cliente', 'vehiculo', 'estado'])
            }))}
          />
        </label>

        {selectedVisita ? (
          <div className="reception-summary">
            <div>
              <span>Cliente</span>
              <strong>{selectedVisita.cliente_nombre || 'Sin dato'}</strong>
            </div>
            <div>
              <span>Vehiculo</span>
              <strong>{vehicleLabel(selectedVisita)}</strong>
            </div>
            <div>
              <span>Ingreso</span>
              <strong>{formatDate(selectedVisita.fecha_ingreso)}</strong>
            </div>
          </div>
        ) : null}
      </section>

      {!selectedVisitaId ? (
        <EmptyState text="Selecciona una visita para llenar la recepcion" />
      ) : (
        <form className="panel reception-form" onSubmit={submit}>
          {recepcionLoading ? <EmptyState text="Cargando recepcion..." /> : null}
          {formError ? <div className="form-error full-row">{formError}</div> : null}

          <div className="reception-grid">
            <label className="field">
              Nivel de combustible
              <select
                value={String(form.nivel_combustible)}
                onChange={(event) => updateField('nivel_combustible', event.target.value)}
              >
                {nivelesCombustible.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
                {form.nivel_combustible !== '' && !nivelesCombustible.some(([value]) => value === String(form.nivel_combustible)) ? (
                  <option value={String(form.nivel_combustible)}>{form.nivel_combustible}%</option>
                ) : null}
              </select>
            </label>
            <label className="field">
              Nombre de aceptacion
              <input
                maxLength="150"
                value={form.nombre_aceptacion}
                onChange={(event) => updateField('nombre_aceptacion', event.target.value)}
              />
            </label>
          </div>

          <label className="field">
            Trabajo a realizar
            <textarea
              value={form.trabajo_a_realizar}
              onChange={(event) => updateField('trabajo_a_realizar', event.target.value)}
            />
          </label>

          <label className="field">
            Comentarios del cliente
            <textarea
              value={form.comentarios_cliente}
              onChange={(event) => updateField('comentarios_cliente', event.target.value)}
            />
          </label>

          <div className="reception-section-heading">
            <h3>Inventario (lo que trae el vehiculo)</h3>
            <span>Marca los elementos que el vehiculo trae al ingresar.</span>
          </div>
          <div className="reception-checklist-grid">
            {checklistSections.map((section) => (
              <section className="reception-checklist" key={section.key}>
                <h3>{section.title}</h3>
                {checklistItems(section, form[section.key]).map((item) => (
                  <label key={item}>
                    <span>{item}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(form[section.key]?.[item])}
                      onChange={(event) => updateChecklist(section.key, item, event.target.checked)}
                    />
                  </label>
                ))}
              </section>
            ))}
          </div>

          <div className="reception-section-heading">
            <h3>Daños de carroceria</h3>
            <span>Diagrama de {diagrama.nombre.toLowerCase()}. Toca una zona del vehiculo y marca el tipo de daño. Las zonas sin marcar se reciben sin daños visibles.</span>
          </div>
          <div className="danos-editor">
            <DanosDiagram tipo={form.tipo_diagrama} danos={form.danos} selected={zonaSeleccionada} onSelect={setZonaSeleccionada} />
            <div className="danos-editor-side">
              {danoSeleccionado ? (
                <div className="danos-zone-panel">
                  <strong>{zonaLabel(zonaSeleccionada, form.tipo_diagrama)}</strong>
                  <div className="danos-type-list">
                    {tiposDano.map((tipo) => (
                      <label key={tipo.codigo} className={danoSeleccionado.tipos.includes(tipo.codigo) ? 'danos-type danos-type-on' : 'danos-type'}>
                        <input
                          type="checkbox"
                          checked={danoSeleccionado.tipos.includes(tipo.codigo)}
                          onChange={() => toggleTipoDano(zonaSeleccionada, tipo.codigo)}
                        />
                        <b>{tipo.codigo}</b> {tipo.label}
                      </label>
                    ))}
                  </div>
                  <label className="field">
                    Nota (opcional)
                    <input
                      maxLength="255"
                      placeholder="Ej. golpe de 10 cm cerca de la manija"
                      value={danoSeleccionado.nota || ''}
                      onChange={(event) => updateDano(zonaSeleccionada, (actual) => ({ ...actual, nota: event.target.value }))}
                    />
                  </label>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => updateDano(zonaSeleccionada, () => ({ tipos: [], nota: '' }))}
                    disabled={!form.danos[zonaSeleccionada]}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Sin daño en esta zona
                  </button>
                </div>
              ) : (
                <div className="compact-empty">Selecciona una zona del diagrama</div>
              )}

              <div className="danos-summary">
                <strong>Zonas con daño ({zonasConDano.length})</strong>
                {zonasConDano.length ? zonasConDano.map((zona) => (
                  <button key={zona.key} type="button" onClick={() => setZonaSeleccionada(zona.key)}>
                    <span>{zona.label}</span>
                    <b>{form.danos[zona.key].tipos.join(' ') || '•'}</b>
                  </button>
                )) : <span className="danos-summary-empty">Sin daños marcados</span>}
              </div>
            </div>
          </div>

          <label className="field">
            Observaciones de carroceria
            <textarea
              value={form.observaciones_danos}
              onChange={(event) => updateField('observaciones_danos', event.target.value)}
              placeholder="Ej. pintura opaca en general, reparaciones previas visibles..."
            />
          </label>

          <section className="reception-authorizations">
            <h3>Autorizaciones</h3>
            {autorizaciones.map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(event) => updateField(key, event.target.checked)}
                />
                {label}
              </label>
            ))}
            <label>
              <input
                type="checkbox"
                checked={form.acepta_condiciones}
                onChange={(event) => updateField('acepta_condiciones', event.target.checked)}
              />
              Acepto las condiciones indicadas en esta orden de servicio
            </label>
          </section>

          <label className="field">
            Firma / aceptacion digital
            <textarea
              value={form.firma_cliente}
              onChange={(event) => updateField('firma_cliente', event.target.value)}
            />
          </label>

          <div className="modal-actions reception-actions">
            <button className="secondary-button" type="button" onClick={() => imprimir('inventario')} disabled={saving || recepcionLoading}>
              <Printer size={17} aria-hidden="true" />
              Imprimir inventario
            </button>
            <button className="secondary-button" type="button" onClick={() => imprimir('danos')} disabled={saving || recepcionLoading}>
              <Printer size={17} aria-hidden="true" />
              Imprimir daños
            </button>
            <button className="primary-button" type="submit" disabled={saving || recepcionLoading}>
              <Save size={17} aria-hidden="true" />
              {saving ? 'Guardando...' : 'Guardar recepcion'}
            </button>
          </div>
        </form>
      )}

      {printDoc && visitaDoc ? createPortal(
        <div className="recepcion-print-portal">
          {printDoc === 'inventario'
            ? <InventarioDocument visita={visitaDoc} recepcion={form} recibidoPor={recibidoPor} />
            : <DanosDocument visita={visitaDoc} recepcion={form} recibidoPor={recibidoPor} />}
        </div>,
        document.body
      ) : null}
    </div>
  );
}

export default RecepcionPage;
