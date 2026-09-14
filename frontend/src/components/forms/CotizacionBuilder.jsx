import { useEffect, useMemo, useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { apiRequest } from '../../api/client';
import { formatCurrency } from '../../utils/formatters';
import SearchSelect from '../ui/SearchSelect';
import logo from '../../assets/logo.svg';

const TALLER_NOMBRE = 'Miguel Expert Collision';

// Conceptos frecuentes para la cotizacion simple (un renglon por concepto y su total).
const CONCEPTOS_RAPIDOS = ['Repuestos', 'Mano de obra', 'Pintura'];

const lineTotal = (linea) => (Number(linea.cantidad) || 0) * (Number(linea.precio) || 0);

const fechaSoloDia = () => new Intl.DateTimeFormat('es-HN', { dateStyle: 'long' }).format(new Date());

// Rasteriza el logo SVG a un PNG pequeno para poder insertarlo en el PDF.
const loadLogoDataUrl = () => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => {
    try {
      const ratio = (img.naturalWidth || 1) / (img.naturalHeight || 1) || 1;
      const height = 260;
      const canvas = document.createElement('canvas');
      canvas.height = height;
      canvas.width = Math.round(height * ratio);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ dataUrl: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height });
    } catch {
      resolve(null);
    }
  };
  img.onerror = () => resolve(null);
  img.src = logo;
});

function CotizacionBuilder({ token, onRequestError, simple = false }) {
  const [cliente, setCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [vehiculo, setVehiculo] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [color, setColor] = useState('');
  const [vin, setVin] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [lineas, setLineas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [servicios, setServicios] = useState([]);

  const fecha = useMemo(() => fechaSoloDia(), []);

  useEffect(() => {
    if (!token || simple) return undefined;

    let ignore = false;
    Promise.allSettled([
      apiRequest('/productos?estado=Activo', { token }),
      apiRequest('/servicios', { token })
    ]).then(([prodRes, servRes]) => {
      if (ignore) return;
      if (prodRes.status === 'fulfilled') setProductos(prodRes.value.productos || []);
      else onRequestError?.(prodRes.reason);
      if (servRes.status === 'fulfilled') setServicios((servRes.value.servicios || []).filter((s) => s.estado === 'Activo'));
    });

    return () => { ignore = true; };
  }, [onRequestError, simple, token]);

  const total = useMemo(() => lineas.reduce((acc, linea) => acc + lineTotal(linea), 0), [lineas]);

  const onlyDigits = (value) => value.replace(/[^\d]/g, '');
  const updateLinea = (index, campo, valor) => setLineas((c) => c.map((l, i) => (i === index ? { ...l, [campo]: valor } : l)));
  const addLinea = (descripcion = '') => setLineas((c) => [...c, { descripcion, cantidad: 1, precio: 0 }]);
  const removeLinea = (index) => setLineas((c) => c.filter((_, i) => i !== index));

  const addProducto = (id) => {
    const p = productos.find((x) => String(x.id) === String(id));
    if (!p) return;
    setLineas((c) => [...c, {
      descripcion: [p.codigo, p.nombre, p.marca].filter(Boolean).join(' - '),
      cantidad: 1,
      precio: Math.round(Number(p.precio_referencia) || 0)
    }]);
  };

  const addServicio = (id) => {
    const s = servicios.find((x) => String(x.id) === String(id));
    if (!s) return;
    setLineas((c) => [...c, { descripcion: s.nombre, cantidad: 1, precio: Math.round(Number(s.precio_sugerido) || 0) }]);
  };

  const downloadPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const right = doc.internal.pageSize.getWidth() - 14;

    // Logo en la esquina superior izquierda (si carga correctamente)
    const logoImg = await loadLogoDataUrl();
    let textX = 14;
    if (logoImg) {
      const boxW = 20;
      const boxH = 16;
      const ratio = logoImg.w / logoImg.h || 1;
      let w = boxW;
      let h = boxW / ratio;
      if (h > boxH) { h = boxH; w = boxH * ratio; }
      doc.addImage(logoImg.dataUrl, 'PNG', 14, 8, w, h);
      textX = 14 + w + 4;
    }

    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(23, 65, 92);
    doc.text(TALLER_NOMBRE, textX, 16);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90);
    doc.text('Taller de enderezado y pintura', textX, 21);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(23, 65, 92);
    doc.text('COTIZACION', right, 14, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90);
    doc.text('Fecha: ' + fecha, right, 20, { align: 'right' });

    doc.setDrawColor(23, 65, 92); doc.setLineWidth(0.6); doc.line(14, 26, right, 26);

    doc.setFontSize(10); doc.setTextColor(15);
    let tableStartY = 46;

    if (simple) {
      let iy = 34;
      const col2 = 110;
      doc.text('Cliente: ' + (cliente || '-'), 14, iy);
      doc.text('Telefono: ' + (telefono || '-'), col2, iy);
      iy += 5.5;
      doc.text('Email: ' + (email || '-'), 14, iy);
      iy += 8;
      doc.setFont('helvetica', 'bold'); doc.text('Datos del vehiculo', 14, iy); doc.setFont('helvetica', 'normal');
      iy += 5.5;
      doc.text(`Marca: ${marca || '-'}     Modelo: ${modelo || '-'}     Anio: ${anio || '-'}`, 14, iy);
      iy += 5.5;
      doc.text(`Color: ${color || '-'}     VIN: ${vin || '-'}`, 14, iy);
      tableStartY = iy + 8;
    } else {
      doc.text('Cliente: ' + (cliente || '-'), 14, 35);
      doc.text('Vehiculo: ' + (vehiculo || '-'), 14, 41);
    }

    const baseStyles = {
      styles: { textColor: 20, lineColor: [70, 70, 70], lineWidth: 0.2, fontSize: 10, cellPadding: 2.5 },
      headStyles: { fillColor: [225, 233, 238], textColor: 15, fontStyle: 'bold', lineColor: [70, 70, 70], lineWidth: 0.2 },
      theme: 'grid',
      startY: tableStartY
    };

    if (simple) {
      autoTable(doc, {
        ...baseStyles,
        head: [['Detalle', 'Total']],
        body: lineas.map((l) => [l.descripcion || 'Sin detalle', formatCurrency(l.precio)]),
        columnStyles: { 1: { halign: 'right', cellWidth: 45 } }
      });
    } else {
      autoTable(doc, {
        ...baseStyles,
        head: [['Descripcion', 'Cant.', 'Precio', 'Subtotal']],
        body: lineas.map((l) => [
          l.descripcion || 'Sin descripcion',
          String(Number(l.cantidad) || 0),
          formatCurrency(l.precio),
          formatCurrency(lineTotal(l))
        ]),
        columnStyles: { 1: { halign: 'right', cellWidth: 20 }, 2: { halign: 'right', cellWidth: 30 }, 3: { halign: 'right', cellWidth: 32 } }
      });
    }

    let y = doc.lastAutoTable.finalY + 8;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(23, 65, 92);
    doc.text('Total: ' + formatCurrency(total), right, y, { align: 'right' });

    y += 10;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(90);
    if (observaciones) {
      const wrapped = doc.splitTextToSize(observaciones, right - 14);
      doc.text(wrapped, 14, y);
      y += wrapped.length * 4 + 2;
    }
    doc.text('Cotizacion referencial, sujeta a revision. Los precios pueden variar segun el trabajo real.', 14, y);

    const nombre = (cliente || 'cotizacion').replace(/[^\w\d]+/g, '_');
    doc.save(`Cotizacion_${nombre}.pdf`);
  };

  return (
    <div className="cotizacion-builder">
      {simple ? (
        <div className="cotizacion-fields cotizacion-fields-grid">
          <label className="field">Cliente<input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente" /></label>
          <label className="field">Telefono<input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Telefono" /></label>
          <label className="field">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" /></label>
          <label className="field">Fecha<input value={fecha} readOnly className="field-readonly" /></label>
          <label className="field">Marca<input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Marca" /></label>
          <label className="field">Modelo<input value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Modelo" /></label>
          <label className="field">Ano<input inputMode="numeric" maxLength={4} value={anio} onChange={(e) => setAnio(onlyDigits(e.target.value).slice(0, 4))} placeholder="Ano" /></label>
          <label className="field">Color<input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Color" /></label>
          <label className="field"># de VIN<input value={vin} onChange={(e) => setVin(e.target.value)} placeholder="Numero de VIN" maxLength={40} /></label>
        </div>
      ) : (
        <div className="cotizacion-fields">
          <label className="field">Cliente<input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente" /></label>
          <label className="field">Vehiculo<input value={vehiculo} onChange={(e) => setVehiculo(e.target.value)} placeholder="Marca, modelo, placa..." /></label>
        </div>
      )}

      <table className="cobro-table">
        <thead>
          {simple ? (
            <tr>
              <th>Detalle</th>
              <th>Total</th>
              <th aria-label="Acciones" />
            </tr>
          ) : (
            <tr>
              <th>Descripcion</th>
              <th>Cant.</th>
              <th>Precio</th>
              <th>Subtotal</th>
              <th aria-label="Acciones" />
            </tr>
          )}
        </thead>
        <tbody>
          {lineas.length ? lineas.map((linea, index) => (
            <tr key={index}>
              <td>
                <input
                  value={linea.descripcion}
                  onChange={(e) => updateLinea(index, 'descripcion', e.target.value)}
                  placeholder={simple ? 'Ej. Repuestos' : 'Descripcion'}
                  maxLength={255}
                />
              </td>
              {!simple ? (
                <td>
                  <input type="number" min="1" step="1" inputMode="numeric" value={linea.cantidad}
                    onChange={(e) => updateLinea(index, 'cantidad', onlyDigits(e.target.value))}
                    onKeyDown={(e) => { if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }} />
                </td>
              ) : null}
              <td>
                <input type="number" min="0" step="1" inputMode="numeric" value={linea.precio}
                  onChange={(e) => updateLinea(index, 'precio', onlyDigits(e.target.value))}
                  onKeyDown={(e) => { if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }} />
              </td>
              {!simple ? <td className="cobro-subtotal">{formatCurrency(lineTotal(linea))}</td> : null}
              <td>
                <button className="icon-button" type="button" onClick={() => removeLinea(index)} aria-label="Quitar linea" title="Quitar linea">
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={simple ? 3 : 5} className="compact-empty">
                {simple ? 'Sin lineas. Agrega un concepto y su total.' : 'Sin lineas. Agrega manualmente o desde el inventario/servicios.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="cobro-add-row">
        {simple ? CONCEPTOS_RAPIDOS.map((concepto) => (
          <button className="secondary-button compact-button" type="button" key={concepto} onClick={() => addLinea(concepto)}>
            <Plus size={16} aria-hidden="true" /> {concepto}
          </button>
        )) : null}
        <button className="secondary-button compact-button" type="button" onClick={() => addLinea('')}>
          <Plus size={16} aria-hidden="true" /> {simple ? 'Otro' : 'Linea manual'}
        </button>
      </div>

      {!simple ? (
        <div className="cotizacion-pickers">
          <label className="field">
            Agregar del inventario
            <SearchSelect value="" onChange={addProducto} placeholder="Buscar producto (no descuenta stock)" emptyText="Sin productos"
              options={productos.map((p) => ({ value: p.id, label: `${[p.codigo, p.nombre, p.marca].filter(Boolean).join(' - ')} · ${formatCurrency(p.precio_referencia)}` }))} />
          </label>
          <label className="field">
            Agregar servicio del catalogo
            <SearchSelect value="" onChange={addServicio} placeholder="Buscar servicio" emptyText="Sin servicios"
              options={servicios.map((s) => ({ value: s.id, label: `${s.nombre} · ${formatCurrency(s.precio_sugerido)}` }))} />
          </label>
        </div>
      ) : null}

      <label className="field">
        Observaciones
        <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} />
      </label>

      <div className="cobro-totales">
        <div className="cobro-total-final"><span>Total</span><strong>{formatCurrency(total)}</strong></div>
      </div>

      <div className="modal-actions">
        <button className="primary-button" type="button" onClick={downloadPdf} disabled={!lineas.length}>
          <Download size={18} aria-hidden="true" /> Descargar PDF
        </button>
      </div>

      <div className="cotizacion-preview">
        <h3>Vista previa</h3>
        <CotizacionDoc
          simple={simple}
          fecha={fecha}
          datos={{ cliente, telefono, email, vehiculo, marca, modelo, anio, color, vin }}
          lineas={lineas}
          total={total}
          observaciones={observaciones}
        />
      </div>
    </div>
  );
}

function CotizacionDoc({ simple, fecha, datos, lineas, total, observaciones }) {
  const dato = (value) => value || 'Sin dato';

  return (
    <article className="factura-doc cotizacion-doc">
      <header className="factura-doc-header">
        <div className="factura-doc-brand">
          <img src={logo} alt={TALLER_NOMBRE} />
          <div>
            <h1>{TALLER_NOMBRE}</h1>
            <p>Taller de enderezado y pintura</p>
          </div>
        </div>
        <div className="factura-doc-meta">
          <strong>COTIZACION</strong>
          <small>Fecha: {fecha}</small>
        </div>
      </header>

      {simple ? (
        <div className="factura-doc-info cotizacion-doc-info">
          <div><span>Cliente</span><strong>{dato(datos.cliente)}</strong></div>
          <div><span>Telefono</span><strong>{dato(datos.telefono)}</strong></div>
          <div><span>Email</span><strong>{dato(datos.email)}</strong></div>
          <div><span>Marca</span><strong>{dato(datos.marca)}</strong></div>
          <div><span>Modelo</span><strong>{dato(datos.modelo)}</strong></div>
          <div><span>Ano</span><strong>{dato(datos.anio)}</strong></div>
          <div><span>Color</span><strong>{dato(datos.color)}</strong></div>
          <div><span>VIN</span><strong>{dato(datos.vin)}</strong></div>
        </div>
      ) : (
        <div className="factura-doc-info">
          <div><span>Cliente</span><strong>{dato(datos.cliente)}</strong></div>
          <div><span>Vehiculo</span><strong>{dato(datos.vehiculo)}</strong></div>
        </div>
      )}

      <table className="factura-doc-table">
        <thead>
          {simple ? (
            <tr>
              <th>Detalle</th>
              <th className="num">Total</th>
            </tr>
          ) : (
            <tr>
              <th>Descripcion</th>
              <th className="num">Cant.</th>
              <th className="num">Precio</th>
              <th className="num">Subtotal</th>
            </tr>
          )}
        </thead>
        <tbody>
          {lineas.length ? lineas.map((linea, index) => (
            simple ? (
              <tr key={index}>
                <td>{linea.descripcion || 'Sin detalle'}</td>
                <td className="num">{formatCurrency(linea.precio)}</td>
              </tr>
            ) : (
              <tr key={index}>
                <td>{linea.descripcion || 'Sin descripcion'}</td>
                <td className="num">{Number(linea.cantidad)}</td>
                <td className="num">{formatCurrency(linea.precio)}</td>
                <td className="num">{formatCurrency(lineTotal(linea))}</td>
              </tr>
            )
          )) : (
            <tr><td colSpan={simple ? 2 : 4}>Sin lineas</td></tr>
          )}
        </tbody>
      </table>

      <div className="factura-doc-totals">
        <div className="factura-doc-total-final"><span>Total</span><span>{formatCurrency(total)}</span></div>
      </div>

      {observaciones ? <p className="factura-doc-note">{observaciones}</p> : null}
      <p className="factura-doc-note">Cotizacion referencial, sujeta a revision. Los precios pueden variar segun el trabajo real.</p>
    </article>
  );
}

export default CotizacionBuilder;
