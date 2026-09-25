import { formatFechaLarga, formatMonto, vehicleLabel } from '../../utils/formatters';
import { numeroALetras } from '../../utils/numeroALetras';
import logo from '../../assets/logo.svg';

export const TALLER_NOMBRE = 'Miguel Expert Collision';

// Formato basado en la plantilla assets/Factura.xlsx, reducido a comprobante interno
// (sin CAI, RTN, ISV ni datos de exoneracion).

function FacturaDocument({ factura, visita }) {
  const lineas = factura.lineas || [];
  const clienteNombre = visita?.cliente_nombre || factura.cliente_nombre || 'Sin dato';
  const clienteTelefono = visita?.cliente_telefono || factura.cliente_telefono;
  const vehiculoTexto = visita ? vehicleLabel(visita) : (factura.tipo === 'Venta' ? 'Venta directa' : null);

  return (
    <article className="factura-doc comprobante-doc">
      <header className="factura-doc-header">
        <div className="factura-doc-brand">
          <img src={logo} alt={TALLER_NOMBRE} />
          <h1>{TALLER_NOMBRE}</h1>
        </div>
        <div className="factura-doc-meta">
          <strong>Factura</strong>
          <div><span>Fecha:</span> {formatFechaLarga(factura.fecha_emision)}</div>
        </div>
      </header>

      <div className="factura-doc-info">
        <dl>
          <div><dt>Nombre</dt><dd>{clienteNombre}</dd></div>
          <div><dt>Direccion</dt><dd>{factura.cliente_direccion || '—'}</dd></div>
          <div><dt>Telefono</dt><dd>{clienteTelefono || '—'}</dd></div>
          {vehiculoTexto ? <div><dt>Vehiculo</dt><dd>{vehiculoTexto}</dd></div> : null}
        </dl>
        <dl className="factura-doc-info-side">
          <div><dt>No. Factura</dt><dd><strong>{factura.numero}</strong></dd></div>
          {factura.emitida_por_nombre ? <div><dt>Emitido por</dt><dd>{factura.emitida_por_nombre}</dd></div> : null}
        </dl>
      </div>

      <table className="factura-doc-table">
        <thead>
          <tr>
            <th className="center">Cant.</th>
            <th>Descripcion</th>
            <th className="num">Precio por unidad</th>
            <th className="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((linea) => (
            <tr key={linea.id}>
              <td className="center">{Number(linea.cantidad)}</td>
              <td>{linea.descripcion}</td>
              <td className="num">{formatMonto(linea.precio_unitario)}</td>
              <td className="num">{formatMonto(linea.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="factura-doc-totals">
        {Number(factura.subtotal_servicios) > 0 ? (
          <div><span>Servicios</span><span>{formatMonto(factura.subtotal_servicios)}</span></div>
        ) : null}
        {Number(factura.subtotal_materiales) > 0 ? (
          <div><span>Materiales</span><span>{formatMonto(factura.subtotal_materiales)}</span></div>
        ) : null}
        <div className="factura-doc-total-final"><span>Total a Pagar</span><span>{formatMonto(factura.total)}</span></div>
      </div>

      <p className="factura-doc-letras"><span>Valor en Letras:</span> {numeroALetras(factura.total)}</p>

      {factura.observaciones ? <p className="factura-doc-note">{factura.observaciones}</p> : null}

      <div className="factura-doc-signs">
        <div>Caja</div>
        <div>Cliente</div>
      </div>

      <p className="factura-doc-footer">Documento de control interno</p>
    </article>
  );
}

export default FacturaDocument;
