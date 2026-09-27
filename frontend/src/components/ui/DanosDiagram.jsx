import { DIAGRAMA_ANCHO_BASE, getDiagrama } from '../../constants/recepcion';

// Diagrama de carroceria: la imagen del vehiculo va de fondo y encima cada zona es un poligono
// (o circulo, en las ruedas) transparente que se colorea cuando tiene dano. `tipo` es la clave
// del tipo de vehiculo (turismo, camioneta, pickup, camion, buses). Sin onSelect se dibuja solo lectura
// (documento impreso).
function DanosDiagram({ tipo, danos = {}, selected, onSelect }) {
  const interactive = Boolean(onSelect);
  const diagrama = getDiagrama(tipo);

  const zoneProps = (zona) => {
    const dano = danos[zona.key];
    const marcada = Boolean(dano?.tipos?.length || dano?.nota);
    const className = [
      'danos-zone',
      marcada ? 'danos-zone-marked' : '',
      selected === zona.key ? 'danos-zone-selected' : ''
    ].filter(Boolean).join(' ');

    if (!interactive) return { className };

    return {
      className,
      role: 'button',
      tabIndex: 0,
      'aria-label': zona.label,
      'aria-pressed': selected === zona.key,
      onClick: () => onSelect(zona.key),
      onKeyDown: (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(zona.key);
        }
      }
    };
  };

  return (
    <svg
      className={interactive ? 'danos-diagram danos-diagram-interactive' : 'danos-diagram'}
      viewBox={`0 0 ${diagrama.ancho} ${diagrama.alto}`}
      style={{ '--danos-escala': diagrama.ancho / DIAGRAMA_ANCHO_BASE }}
      role="img"
      aria-label={`Diagrama de daños del vehículo (${diagrama.nombre})`}
    >
      <image href={diagrama.imagen} x="0" y="0" width={diagrama.ancho} height={diagrama.alto} />
      {diagrama.ejes.map((eje) => (
        <text key={eje.texto} className="danos-axis" x={eje.x} y={eje.y} textAnchor={eje.anchor}>{eje.texto}</text>
      ))}

      {diagrama.zonas.map((zona) => {
        const dano = danos[zona.key];
        const codigos = dano?.tipos?.join(' ') || (dano?.nota ? '•' : '');
        const x = zona.r ? zona.cx : zona.lx;
        const y = zona.r ? zona.cy + 6 : zona.ly;

        return (
          <g key={zona.key} {...zoneProps(zona)}>
            <title>{zona.label}</title>
            {zona.r
              ? <circle cx={zona.cx} cy={zona.cy} r={zona.r} />
              : <polygon points={zona.points.map((punto) => punto.join(',')).join(' ')} />}
            {codigos ? <text className="danos-zone-codes" x={x} y={y} textAnchor="middle">{codigos}</text> : null}
          </g>
        );
      })}
    </svg>
  );
}

export default DanosDiagram;
