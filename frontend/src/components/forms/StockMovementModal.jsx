import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, PackagePlus, X } from 'lucide-react';
import { apiRequest, crudRequest } from '../../api/client';
import { formatDate } from '../../utils/formatters';

const TIPOS = [
  { value: 'Entrada', label: 'Entrada (recibir mercaderia)', signo: 1 },
  { value: 'Ajuste positivo', label: 'Ajuste positivo (+)', signo: 1 },
  { value: 'Devolución', label: 'Devolucion (+)', signo: 1 },
  { value: 'Salida', label: 'Salida (-)', signo: -1 },
  { value: 'Ajuste negativo', label: 'Ajuste negativo (-)', signo: -1 }
];

function StockMovementModal({ producto, token, onClose, onSaved, showToast, onRequestError }) {
  const [tipo, setTipo] = useState('Entrada');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stockActual, setStockActual] = useState(Number(producto.stock_actual) || 0);
  const [movimientos, setMovimientos] = useState([]);

  const cargarMovimientos = () => {
    apiRequest(`/inventario/movimientos?producto_id=${producto.id}`, { token })
      .then((payload) => setMovimientos((payload.movimientos || []).slice(0, 8)))
      .catch(() => setMovimientos([]));
  };

  useEffect(() => {
    cargarMovimientos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [producto.id, token]);

  const signo = useMemo(() => TIPOS.find((t) => t.value === tipo)?.signo || 1, [tipo]);
  const cantidadNum = Number(cantidad) || 0;
  const resultado = stockActual + signo * cantidadNum;

  const submit = async (event) => {
    event.preventDefault();

    if (!(cantidadNum > 0)) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }

    if (resultado < 0) {
      setError(`Stock insuficiente. Actual: ${stockActual}, no puede quedar negativo.`);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = await crudRequest({
        path: '/inventario/movimiento',
        token,
        method: 'POST',
        body: {
          producto_id: producto.id,
          tipo_movimiento: tipo,
          cantidad: cantidadNum,
          motivo: motivo || undefined,
          observaciones: observaciones || undefined
        }
      });
      setStockActual(Number(payload.producto?.stock_actual) ?? resultado);
      setCantidad('');
      setMotivo('');
      setObservaciones('');
      cargarMovimientos();
      onSaved?.();
      showToast?.('Movimiento registrado');
    } catch (err) {
      setError(onRequestError?.(err) || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-layer" role="presentation">
      <section className="modal-panel stock-panel" role="dialog" aria-modal="true" aria-label="Movimiento de stock">
        <div className="modal-header">
          <div className="modal-title-group">
            <h2>Entrada / ajuste de stock</h2>
            <span className="modal-step-indicator">
              {[producto.codigo, producto.nombre, producto.marca].filter(Boolean).join(' · ')}
            </span>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar" title="Cerrar">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="stock-body">
          <div className="stock-summary">
            <div><span>Stock actual</span><strong>{stockActual} {producto.unidad_medida || ''}</strong></div>
            <div><span>Resultado</span><strong className={resultado < 0 ? 'stock-negativo' : ''}>{resultado} {producto.unidad_medida || ''}</strong></div>
          </div>

          <form className="stock-form" onSubmit={submit} noValidate>
            <label className="field">
              Tipo de movimiento
              <select value={tipo} onChange={(e) => { setError(''); setTipo(e.target.value); }}>
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="field">
              Cantidad
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={cantidad}
                onChange={(e) => { setError(''); setCantidad(e.target.value.replace(/[^\d]/g, '')); }}
                onKeyDown={(e) => { if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                required
              />
            </label>
            <label className="field field-wide">
              Motivo
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. Compra a proveedor, conteo fisico..." />
            </label>
            <label className="field field-wide">
              Observaciones
              <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </label>

            {error ? <div className="form-error full-row">{error}</div> : null}

            <div className="modal-actions full-row">
              <button className="secondary-button" type="button" onClick={onClose}>Cerrar</button>
              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <PackagePlus size={18} aria-hidden="true" />}
                Registrar movimiento
              </button>
            </div>
          </form>

          <div className="stock-history">
            <h3>Movimientos recientes</h3>
            {movimientos.length ? (
              <div className="compact-list">
                {movimientos.map((m) => (
                  <div className="compact-row stock-history-row" key={m.id}>
                    <strong>{m.tipo_movimiento}</strong>
                    <span>{Number(m.cantidad)} · {m.stock_anterior} → {m.stock_nuevo} · {formatDate(m.fecha_creacion)}</span>
                  </div>
                ))}
              </div>
            ) : <div className="compact-empty">Sin movimientos registrados</div>}
          </div>
        </div>
      </section>
    </div>
  );
}

export default StockMovementModal;
