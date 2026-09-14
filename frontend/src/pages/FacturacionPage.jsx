import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircle, Plus, Printer, Receipt, RotateCcw, Trash2 } from 'lucide-react';
import { apiRequest, crudRequest } from '../api/client';
import { formatCurrency } from '../utils/formatters';
import SearchSelect from '../components/ui/SearchSelect';
import FacturaDocument from '../components/ui/FacturaDocument';
import EmptyState from '../components/ui/EmptyState';

const lineTotal = (l) => (Number(l.cantidad) || 0) * (Number(l.precio) || 0);

function FacturacionPage({ session, showToast, onRequestError, onRefresh }) {
  const token = session?.token;
  const [productos, setProductos] = useState([]);
  const [cliente, setCliente] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [lineas, setLineas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [factura, setFactura] = useState(null);

  const cargarProductos = () => {
    if (!token) return;
    apiRequest('/productos?estado=Activo', { token })
      .then((payload) => setProductos(payload.productos || []))
      .catch((err) => onRequestError?.(err));
  };

  useEffect(() => {
    cargarProductos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const total = useMemo(() => lineas.reduce((acc, l) => acc + lineTotal(l), 0), [lineas]);
  const stockExcedido = useMemo(
    () => lineas.some((l) => l.producto_id && Number(l.cantidad) > Number(l.stock)),
    [lineas]
  );

  const onlyDigits = (v) => v.replace(/[^\d]/g, '');
  const updateLinea = (i, campo, val) => setLineas((c) => c.map((l, idx) => (idx === i ? { ...l, [campo]: val } : l)));
  const removeLinea = (i) => setLineas((c) => c.filter((_, idx) => idx !== i));
  const addManual = () => setLineas((c) => [...c, { producto_id: null, tipo: 'Servicio', descripcion: '', cantidad: 1, precio: 0, stock: null }]);

  const addProducto = (id) => {
    const p = productos.find((x) => String(x.id) === String(id));
    if (!p) return;
    setLineas((c) => [...c, {
      producto_id: p.id,
      tipo: 'Material',
      descripcion: [p.codigo, p.nombre, p.marca].filter(Boolean).join(' - '),
      cantidad: 1,
      precio: Math.round(Number(p.precio_referencia) || 0),
      stock: Number(p.stock_actual) || 0,
      unidad: p.unidad_medida
    }]);
  };

  const emitir = async () => {
    const payloadLineas = lineas
      .map((l) => ({
        tipo: l.tipo === 'Material' ? 'Material' : 'Servicio',
        descripcion: String(l.descripcion || '').trim(),
        cantidad: Number(l.cantidad),
        precio_unitario: Number(l.precio),
        producto_id: l.producto_id || undefined
      }))
      .filter((l) => l.descripcion && l.cantidad > 0 && l.precio_unitario >= 0);

    if (!payloadLineas.length) {
      setError('Agrega al menos una linea valida (descripcion, cantidad y precio).');
      return;
    }
    if (stockExcedido) {
      setError('Una o mas lineas superan el stock disponible.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const data = await crudRequest({
        path: '/facturas/venta',
        token,
        method: 'POST',
        body: { cliente_nombre: cliente || undefined, lineas: payloadLineas, observaciones: observaciones || undefined }
      });
      setFactura(data.factura);
      showToast?.(`Factura ${data.factura.numero} emitida`);
      onRefresh?.();
      cargarProductos();
    } catch (err) {
      setError(onRequestError?.(err) || err.message);
    } finally {
      setSaving(false);
    }
  };

  const nuevaVenta = () => {
    setFactura(null);
    setCliente('');
    setObservaciones('');
    setLineas([]);
    setError('');
  };

  const handlePrint = () => {
    document.body.classList.add('printing-factura');
    window.print();
    document.body.classList.remove('printing-factura');
  };

  if (factura) {
    return (
      <section className="panel facturacion-shell">
        <div className="panel-heading no-print">
          <h2>Factura {factura.numero}</h2>
          <div className="report-actions">
            <button className="secondary-button" type="button" onClick={nuevaVenta}>
              <RotateCcw size={17} aria-hidden="true" /> Nueva venta
            </button>
            <button className="primary-button" type="button" onClick={handlePrint}>
              <Printer size={17} aria-hidden="true" /> Imprimir
            </button>
          </div>
        </div>
        <FacturaDocument factura={factura} visita={null} />
        {createPortal(
          <div className="factura-print-portal"><FacturaDocument factura={factura} visita={null} /></div>,
          document.body
        )}
      </section>
    );
  }

  return (
    <section className="panel facturacion-shell">
      <div className="panel-heading">
        <h2>Facturacion / Venta directa</h2>
      </div>
      <p className="module-hint">Vende productos del inventario (descuenta stock al emitir) o agrega lineas manuales. Genera una factura con la misma numeracion del taller.</p>

      <label className="field facturacion-cliente">
        Cliente
        <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente (opcional)" />
      </label>

      <table className="cobro-table">
        <thead>
          <tr>
            <th>Descripcion</th>
            <th>Cant.</th>
            <th>Precio</th>
            <th>Subtotal</th>
            <th aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {lineas.length ? lineas.map((linea, index) => {
            const excede = linea.producto_id && Number(linea.cantidad) > Number(linea.stock);
            return (
              <tr key={index} className={excede ? 'linea-excede' : ''}>
                <td>
                  <input value={linea.descripcion} onChange={(e) => updateLinea(index, 'descripcion', e.target.value)} placeholder="Descripcion" maxLength={255} />
                  {linea.producto_id ? <small className="stock-hint">Stock: {linea.stock} {linea.unidad || ''}{excede ? ' — excede!' : ''}</small> : null}
                </td>
                <td>
                  <input type="number" min="1" step="1" inputMode="numeric" value={linea.cantidad}
                    onChange={(e) => updateLinea(index, 'cantidad', onlyDigits(e.target.value))}
                    onKeyDown={(e) => { if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }} />
                </td>
                <td>
                  <input type="number" min="0" step="1" inputMode="numeric" value={linea.precio}
                    onChange={(e) => updateLinea(index, 'precio', onlyDigits(e.target.value))}
                    onKeyDown={(e) => { if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }} />
                </td>
                <td className="cobro-subtotal">{formatCurrency(lineTotal(linea))}</td>
                <td>
                  <button className="icon-button" type="button" onClick={() => removeLinea(index)} aria-label="Quitar linea" title="Quitar linea">
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            );
          }) : (
            <tr><td colSpan={5} className="compact-empty">Sin lineas. Agrega productos del inventario o una linea manual.</td></tr>
          )}
        </tbody>
      </table>

      <div className="cotizacion-pickers">
        <label className="field">
          Agregar producto del inventario
          <SearchSelect value="" onChange={addProducto} placeholder="Buscar producto (descuenta stock)" emptyText="Sin productos"
            options={productos.map((p) => ({
              value: p.id,
              label: `${[p.codigo, p.nombre, p.marca].filter(Boolean).join(' - ')} · stock ${Number(p.stock_actual)} · ${formatCurrency(p.precio_referencia)}`
            }))} />
        </label>
        <div className="field facturacion-manual">
          <span>&nbsp;</span>
          <button className="secondary-button compact-button" type="button" onClick={addManual}>
            <Plus size={16} aria-hidden="true" /> Linea manual
          </button>
        </div>
      </div>

      <label className="field">
        Observaciones
        <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} />
      </label>

      <div className="cobro-totales">
        <div className="cobro-total-final"><span>Total</span><strong>{formatCurrency(total)}</strong></div>
      </div>

      {stockExcedido ? <div className="form-error full-row">Hay lineas que superan el stock disponible. Ajusta la cantidad antes de emitir.</div> : null}
      {error ? <div className="form-error full-row">{error}</div> : null}

      <div className="modal-actions">
        <button className="primary-button" type="button" onClick={emitir} disabled={saving || !lineas.length || stockExcedido}>
          {saving ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Receipt size={18} aria-hidden="true" />}
          Emitir factura
        </button>
      </div>
    </section>
  );
}

export default FacturacionPage;
