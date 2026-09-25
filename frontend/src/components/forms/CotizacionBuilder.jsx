import { useEffect, useMemo, useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { apiRequest } from '../../api/client';
import { formatCurrency, formatMonto } from '../../utils/formatters';
import { numeroALetras } from '../../utils/numeroALetras';
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

  // PDF con el mismo formato de la factura (plantilla assets/Factura.xlsx).
  const downloadPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF({ unit: 'mm', format: 'letter' });
    const left = 14;
    const right = doc.internal.pageSize.getWidth() - 14;
    const pageH = doc.internal.pageSize.getHeight();
    // Pie reservado en cada hoja: nota referencial (ultima hoja) y paginacion
    const contentBottom = pageH - 26;
    const ensureSpace = (y, needed) => {
      if (y + needed <= contentBottom) return y;
      doc.addPage();
      return 18;
    };
    const ROJO = [178, 22, 22];
    const ROJO_ETIQUETA = [192, 0, 0];

    // Encabezado: logo y nombre del taller a la izquierda, titulo y fecha a la derecha
    const logoImg = await loadLogoDataUrl();
    let brandBottom = 12;
    if (logoImg) {
      const boxW = 45;
      const boxH = 18;
      const ratio = logoImg.w / logoImg.h || 1;
      let w = boxW;
      let h = boxW / ratio;
      if (h > boxH) { h = boxH; w = boxH * ratio; }
      doc.addImage(logoImg.dataUrl, 'PNG', left, 8, w, h);
      brandBottom = 8 + h;
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(17);
    doc.text(TALLER_NOMBRE, left, brandBottom + 5);

    doc.setFontSize(26); doc.setTextColor(...ROJO);
    doc.text('Cotizacion', right, 20, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(17);
    const fechaW = doc.getTextWidth(fecha);
    doc.text(fecha, right, 28, { align: 'right' });
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...ROJO_ETIQUETA);
    doc.text('Fecha:', right - fechaW - 2, 28, { align: 'right' });

    let y = Math.max(brandBottom + 9, 32);
    doc.setDrawColor(31); doc.setLineWidth(0.6); doc.line(left, y, right, y);

    // Datos del cliente / vehiculo: etiqueta roja + valor
    const campo = (label, value, x, fy, labelW = 24) => {
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...ROJO_ETIQUETA);
      doc.text(label, x, fy);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(17);
      doc.text(value || '-', x + labelW, fy);
    };

    doc.setFontSize(10);
    y += 7;
    const col2 = 125;
    if (simple) {
      campo('Nombre', cliente, left, y); campo('Marca', marca, col2, y, 18);
      campo('Telefono', telefono, left, y + 5.5); campo('Modelo', modelo, col2, y + 5.5, 18);
      campo('Email', email, left, y + 11); campo('Anio', anio, col2, y + 11, 18);
      campo('Color', color, col2, y + 16.5, 18);
      campo('VIN', vin, col2, y + 22, 18);
      y += 26;
    } else {
      campo('Nombre', cliente, left, y);
      campo('Vehiculo', vehiculo, left, y + 5.5);
      y += 9.5;
    }
    doc.line(left, y, right, y);

    const baseStyles = {
      styles: { textColor: 17, lineColor: [227, 196, 196], lineWidth: { bottom: 0.2 }, fontSize: 10, cellPadding: 2.5 },
      headStyles: { fillColor: ROJO, textColor: 255, fontStyle: 'bold' },
      theme: 'plain',
      startY: y + 5,
      margin: { left, right: 14, top: 18, bottom: pageH - contentBottom }
    };

    if (simple) {
      autoTable(doc, {
        ...baseStyles,
        head: [['Descripcion', { content: 'Total', styles: { halign: 'right' } }]],
        body: lineas.map((l) => [l.descripcion || 'Sin detalle', formatMonto(l.precio)]),
        columnStyles: { 1: { halign: 'right', cellWidth: 45 } }
      });
    } else {
      autoTable(doc, {
        ...baseStyles,
        head: [[
          { content: 'Cant.', styles: { halign: 'center' } },
          'Descripcion',
          { content: 'Precio por unidad', styles: { halign: 'right' } },
          { content: 'Total', styles: { halign: 'right' } }
        ]],
        body: lineas.map((l) => [
          String(Number(l.cantidad) || 0),
          l.descripcion || 'Sin descripcion',
          formatMonto(l.precio),
          formatMonto(lineTotal(l))
        ]),
        columnStyles: { 0: { halign: 'center', cellWidth: 16 }, 2: { halign: 'right', cellWidth: 38 }, 3: { halign: 'right', cellWidth: 34 } }
      });
    }

    // Total a pagar + valor en letras se mantienen juntos en la misma hoja
    y = ensureSpace(doc.lastAutoTable.finalY + 6, 32);
    doc.setDrawColor(31); doc.setLineWidth(0.5); doc.line(right - 70, y, right, y);
    y += 6;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(17);
    doc.text('Total a Pagar', right - 70, y);
    doc.text(formatMonto(total), right, y, { align: 'right' });

    // Valor en letras
    y += 11;
    doc.setDrawColor(208); doc.setLineWidth(0.2); doc.line(left, y - 5, right, y - 5);
    doc.setFontSize(10); doc.setTextColor(...ROJO_ETIQUETA);
    doc.text('Valor en Letras:', left, y);
    const letrasX = left + doc.getTextWidth('Valor en Letras:') + 2;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(17);
    const letras = doc.splitTextToSize(numeroALetras(total), right - letrasX);
    doc.text(letras, letrasX, y);
    y += (letras.length - 1) * 4.5 + 3;
    doc.line(left, y, right, y);

    y += 8;
    doc.setFontSize(9); doc.setTextColor(60);
    if (observaciones) {
      const wrapped = doc.splitTextToSize(observaciones, right - left);
      wrapped.forEach((linea) => {
        y = ensureSpace(y, 4.5);
        doc.text(linea, left, y);
        y += 4.5;
      });
    }

    // Pie de cada hoja: la nota va al fondo de la ultima hoja y todas llevan "Pagina x / y"
    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(90);
      if (page === totalPages) {
        doc.setDrawColor(208); doc.setLineWidth(0.2); doc.line(left, pageH - 22, right, pageH - 22);
        doc.text('Cotizacion referencial, sujeta a revision. Los precios pueden variar segun el trabajo real.', left, pageH - 17);
      }
      doc.text(`Pagina ${page} / ${totalPages}`, (left + right) / 2, pageH - 9, { align: 'center' });
    }

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
  const dato = (value) => value || '—';

  return (
    <article className="factura-doc comprobante-doc">
      <header className="factura-doc-header">
        <div className="factura-doc-brand">
          <img src={logo} alt={TALLER_NOMBRE} />
          <h1>{TALLER_NOMBRE}</h1>
        </div>
        <div className="factura-doc-meta">
          <strong>Cotizacion</strong>
          <div><span>Fecha:</span> {fecha}</div>
        </div>
      </header>

      <div className="factura-doc-info">
        <dl>
          <div><dt>Nombre</dt><dd>{dato(datos.cliente)}</dd></div>
          {simple ? (
            <>
              <div><dt>Telefono</dt><dd>{dato(datos.telefono)}</dd></div>
              <div><dt>Email</dt><dd>{dato(datos.email)}</dd></div>
            </>
          ) : (
            <div><dt>Vehiculo</dt><dd>{dato(datos.vehiculo)}</dd></div>
          )}
        </dl>
        {simple ? (
          <dl className="factura-doc-info-side">
            <div><dt>Marca</dt><dd>{dato(datos.marca)}</dd></div>
            <div><dt>Modelo</dt><dd>{dato(datos.modelo)}</dd></div>
            <div><dt>Ano</dt><dd>{dato(datos.anio)}</dd></div>
            <div><dt>Color</dt><dd>{dato(datos.color)}</dd></div>
            <div><dt>VIN</dt><dd>{dato(datos.vin)}</dd></div>
          </dl>
        ) : null}
      </div>

      <table className="factura-doc-table">
        <thead>
          {simple ? (
            <tr>
              <th>Descripcion</th>
              <th className="num">Total</th>
            </tr>
          ) : (
            <tr>
              <th className="center">Cant.</th>
              <th>Descripcion</th>
              <th className="num">Precio por unidad</th>
              <th className="num">Total</th>
            </tr>
          )}
        </thead>
        <tbody>
          {lineas.length ? lineas.map((linea, index) => (
            simple ? (
              <tr key={index}>
                <td>{linea.descripcion || 'Sin detalle'}</td>
                <td className="num">{formatMonto(linea.precio)}</td>
              </tr>
            ) : (
              <tr key={index}>
                <td className="center">{Number(linea.cantidad)}</td>
                <td>{linea.descripcion || 'Sin descripcion'}</td>
                <td className="num">{formatMonto(linea.precio)}</td>
                <td className="num">{formatMonto(lineTotal(linea))}</td>
              </tr>
            )
          )) : (
            <tr><td colSpan={simple ? 2 : 4}>Sin lineas</td></tr>
          )}
        </tbody>
      </table>

      <div className="factura-doc-totals">
        <div className="factura-doc-total-final"><span>Total a Pagar</span><span>{formatMonto(total)}</span></div>
      </div>

      <p className="factura-doc-letras"><span>Valor en Letras:</span> {numeroALetras(total)}</p>

      {observaciones ? <p className="factura-doc-note">{observaciones}</p> : null}
      <p className="factura-doc-footer">Cotizacion referencial, sujeta a revision. Los precios pueden variar segun el trabajo real.</p>
    </article>
  );
}

export default CotizacionBuilder;
