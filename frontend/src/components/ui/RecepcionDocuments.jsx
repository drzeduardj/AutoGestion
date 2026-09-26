import logo from '../../assets/logo.svg';
import {
  autorizaciones,
  checklistItems,
  checklistSections,
  tipoDanoLabel,
  tiposDano,
  getDiagrama,
  zonaLabel
} from '../../constants/recepcion';
import { formatDate } from '../../utils/formatters';
import DanosDiagram from './DanosDiagram';
import { TALLER_NOMBRE } from './FacturaDocument';

const dato = (value) => (value === null || value === undefined || value === '' ? '—' : value);

function DocHeader({ titulo, visita }) {
  return (
    <header className="recepcion-doc-header">
      <img src={logo} alt={TALLER_NOMBRE} />
      <div>
        <h1>Taller {TALLER_NOMBRE}</h1>
        <p>{titulo}</p>
      </div>
      <div className="recepcion-doc-folio">
        <span>Orden de servicio No.</span>
        <strong>VIS-{visita.id}</strong>
      </div>
    </header>
  );
}

function DatosVisita({ visita, completo = true }) {
  return (
    <>
      <h2 className="recepcion-doc-band">Datos del vehículo</h2>
      <dl className="recepcion-doc-fields">
        <div><dt>Marca</dt><dd>{dato(visita.marca)}</dd></div>
        <div><dt>Modelo</dt><dd>{dato(visita.modelo)}</dd></div>
        <div><dt>Color</dt><dd>{dato(visita.color)}</dd></div>
        <div><dt>Placa</dt><dd>{dato(visita.placa)}</dd></div>
        {completo ? <div><dt>Año</dt><dd>{dato(visita.anio)}</dd></div> : null}
        <div><dt>Kilometraje</dt><dd>{dato(visita.kilometraje_ingreso)}</dd></div>
        {completo ? <div className="recepcion-doc-field-wide"><dt>No. serie</dt><dd>{dato(visita.vin)}</dd></div> : null}
      </dl>
      <h2 className="recepcion-doc-band">Datos del cliente</h2>
      <dl className="recepcion-doc-fields">
        <div><dt>Nombre</dt><dd>{dato(visita.cliente_nombre)}</dd></div>
        <div><dt>Teléfono</dt><dd>{dato(visita.cliente_telefono || visita.cliente_whatsapp)}</dd></div>
        <div><dt>Ingreso</dt><dd>{formatDate(visita.fecha_ingreso)}</dd></div>
        <div><dt>Salida</dt><dd>{visita.fecha_entrega_estimada ? formatDate(visita.fecha_entrega_estimada) : '—'}</dd></div>
        {completo ? <div className="recepcion-doc-field-wide"><dt>Email</dt><dd>{dato(visita.cliente_email)}</dd></div> : null}
      </dl>
    </>
  );
}

function Firmas({ recibidoPor }) {
  return (
    <div className="recepcion-doc-signatures">
      <div>
        <span />
        <strong>Cliente</strong>
      </div>
      <div>
        <span />
        <strong>Recibido por{recibidoPor ? `: ${recibidoPor}` : ''}</strong>
      </div>
    </div>
  );
}

function Check({ checked, children }) {
  return (
    <div className={checked ? 'recepcion-doc-check recepcion-doc-check-on' : 'recepcion-doc-check'}>
      <span aria-hidden="true">{checked ? '✔' : ''}</span>
      {children}
    </div>
  );
}

function FuelGauge({ nivel }) {
  const valor = nivel === null || nivel === undefined || nivel === '' ? null : Number(nivel);

  return (
    <div className="recepcion-doc-fuel">
      <div className="recepcion-doc-fuel-scale"><span>E</span><span>1/4</span><span>1/2</span><span>3/4</span><span>F</span></div>
      <div className="recepcion-doc-fuel-bar">
        {valor !== null ? <span style={{ width: `${Math.min(Math.max(valor, 0), 100)}%` }} /> : null}
      </div>
      <small>{valor !== null ? `${valor}%` : 'Sin dato'}</small>
    </div>
  );
}

export function InventarioDocument({ visita, recepcion, recibidoPor }) {
  return (
    <article className="recepcion-doc">
      <DocHeader titulo="Orden de servicio · Inventario de recepción" visita={visita} />
      <DatosVisita visita={visita} />

      <h2 className="recepcion-doc-band">Trabajo a realizar</h2>
      <p className="recepcion-doc-text">{dato(recepcion.trabajo_a_realizar || visita.motivo_visita)}</p>
      <p className="recepcion-doc-text"><strong>Comentarios del cliente:</strong> {dato(recepcion.comentarios_cliente)}</p>

      <p className="recepcion-doc-legend">Marcado (✔) = el vehículo lo trae al ingresar. Sin marcar = no lo trae / no existe.</p>
      <div className="recepcion-doc-checklist">
        {checklistSections.map((section) => (
          <section key={section.key}>
            <h2 className="recepcion-doc-band">{section.title}</h2>
            <div className="recepcion-doc-check-grid">
              {checklistItems(section, recepcion[section.key]).map((item) => (
                <Check key={item} checked={Boolean(recepcion[section.key]?.[item])}>{item}</Check>
              ))}
            </div>
          </section>
        ))}
      </div>

      <h2 className="recepcion-doc-band">Nivel de combustible</h2>
      <FuelGauge nivel={recepcion.nivel_combustible} />

      <h2 className="recepcion-doc-band">Autorizaciones</h2>
      <div className="recepcion-doc-auth">
        {autorizaciones.map(([key, label]) => (
          <Check key={key} checked={Boolean(recepcion[key])}>{label}</Check>
        ))}
      </div>

      <Firmas recibidoPor={recibidoPor} />
    </article>
  );
}

export function DanosDocument({ visita, recepcion, recibidoPor }) {
  const danos = recepcion.danos || {};
  const { zonas } = getDiagrama(recepcion.tipo_diagrama);
  const zonasMarcadas = zonas.filter((zona) => danos[zona.key]);
  const zonasExtra = Object.keys(danos).filter((key) => !zonas.some((zona) => zona.key === key));

  return (
    <article className="recepcion-doc">
      <DocHeader titulo="Reporte de daños de carrocería al ingreso" visita={visita} />
      <DatosVisita visita={visita} completo={false} />

      <h2 className="recepcion-doc-band">Estado de la carrocería</h2>
      <div className="recepcion-doc-danos">
        <DanosDiagram tipo={recepcion.tipo_diagrama} danos={danos} />
        <div>
          <div className="recepcion-doc-legend-box">
            <strong>Simbología</strong>
            {tiposDano.map((tipo) => (
              <span key={tipo.codigo}><b>{tipo.codigo}</b> {tipo.label}</span>
            ))}
          </div>
          <table className="recepcion-doc-table">
            <thead>
              <tr><th>Zona</th><th>Daño</th><th>Nota</th></tr>
            </thead>
            <tbody>
              {[...zonasMarcadas.map((zona) => zona.key), ...zonasExtra].map((key) => (
                <tr key={key}>
                  <td>{zonaLabel(key, recepcion.tipo_diagrama)}</td>
                  <td>{(danos[key].tipos || []).map(tipoDanoLabel).join(', ') || '—'}</td>
                  <td>{danos[key].nota || ''}</td>
                </tr>
              ))}
              {!zonasMarcadas.length && !zonasExtra.length ? (
                <tr><td colSpan={3}>Sin daños visibles registrados.</td></tr>
              ) : null}
            </tbody>
          </table>
          <p className="recepcion-doc-legend">Las zonas sin marcar se recibieron sin daños visibles.</p>
        </div>
      </div>

      <h2 className="recepcion-doc-band">Observaciones</h2>
      <p className="recepcion-doc-text recepcion-doc-notes">{dato(recepcion.observaciones_danos)}</p>

      <p className="recepcion-doc-legend">
        El cliente declara estar de acuerdo con el estado del vehículo descrito en este reporte al momento del ingreso.
      </p>
      <Firmas recibidoPor={recibidoPor} />
    </article>
  );
}
