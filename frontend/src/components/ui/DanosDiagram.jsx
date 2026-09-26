import diagramaVehiculo from '../../assets/diagrama-vehiculo.png';
import { DIAGRAMA_ALTO, DIAGRAMA_ANCHO, zonasCarroceria } from '../../constants/recepcion';

export { diagramaVehiculo };

// Diagrama de carroceria: la imagen del vehiculo va de fondo y encima cada zona es un poligono
// (o circulo, en las ruedas) transparente que se colorea cuando tiene dano. Sin onSelect se
// dibuja solo lectura (documento impreso).
function DanosDiagram({ danos = {}, selected, onSelect }) {
  const interactive = Boolean(onSelect);

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
      viewBox={`0 0 ${DIAGRAMA_ANCHO} ${DIAGRAMA_ALTO}`}
      role="img"
      aria-label="Diagrama de daños del vehículo"
    >
      <image href={diagramaVehiculo} x="0" y="0" width={DIAGRAMA_ANCHO} height={DIAGRAMA_ALTO} />
      <text className="danos-axis" x="266" y="11" textAnchor="middle">FRENTE</text>
      <text className="danos-axis" x="266" y="742" textAnchor="middle">ATRÁS</text>
      <text className="danos-axis" x="20" y="742">IZQUIERDO</text>
      <text className="danos-axis" x="511" y="742" textAnchor="end">DERECHO</text>

      {zonasCarroceria.map((zona) => {
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
