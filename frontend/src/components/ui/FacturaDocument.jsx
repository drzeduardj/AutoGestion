import { formatCurrency, formatDate, vehicleLabel } from '../../utils/formatters';
import logo from '../../assets/logo.svg';

export const TALLER_NOMBRE = 'Miguel Expert Collision';

function FacturaDocument({ factura, visita }) {
  const lineas = factura.lineas || [];
  const clienteNombre = visita?.cliente_nombre || factura.cliente_nombre || 'Sin dato';
  const vehiculoTexto = visita ? vehicleLabel(visita) : (factura.tipo === 'Venta' ? 'Venta directa' : 'Sin dato');

  return (
    <article className="factura-doc">
      <header className="factura-doc-header">
        <div className="factura-doc-brand">
          <img src={logo} alt={TALLER_NOMBRE} />
          <div>
            <h1>{TALLER_NOMBRE}</h1>
            <p>Taller de enderezado y pintura</p>
          </div>
        </div>
        <div className="factura-doc-meta">
          <strong>FACTURA</strong>
          <span>{factura.numero}</span>
          <small>Emitida: {formatDate(factura.fecha_emision)}</small>
        </div>
      </header>

      <div className="factura-doc-info">
        <div><span>Cliente</span><strong>{clienteNombre}</strong></div>
        <div><span>Vehiculo</span><strong>{vehiculoTexto}</strong></div>
        <div><span>Emitida por</span><strong>{factura.emitida_por_nombre || 'Sin dato'}</strong></div>
      </div>

      <table className="factura-doc-table">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Descripcion</th>
            <th className="num">Cant.</th>
            <th className="num">Precio</th>
            <th className="num">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((linea) => (
            <tr key={linea.id}>
              <td>{linea.tipo}</td>
              <td>{linea.descripcion}</td>
              <td className="num">{Number(linea.cantidad)}</td>
              <td className="num">{formatCurrency(linea.precio_unitario)}</td>
              <td className="num">{formatCurrency(linea.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="factura-doc-totals">
        <div><span>Servicios</span><span>{formatCurrency(factura.subtotal_servicios)}</span></div>
        <div><span>Materiales</span><span>{formatCurrency(factura.subtotal_materiales)}</span></div>
        <div className="factura-doc-total-final"><span>Total</span><span>{formatCurrency(factura.total)}</span></div>
      </div>

      {factura.observaciones ? <p className="factura-doc-note">{factura.observaciones}</p> : null}

      <div className="factura-doc-signs">
        <div>Caja</div>
        <div>Cliente</div>
      </div>
    </article>
  );
}

export default FacturaDocument;
