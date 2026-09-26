// Checklist de inventario de recepcion: mismos rubros que la orden de servicio impresa del taller.
// Cada item marcado significa "el vehiculo lo trae / existe" al ingresar.
export const checklistSections = [
  {
    key: 'exteriores',
    title: 'Exteriores',
    items: [
      'Unidad de luces',
      'Espejos laterales',
      'Emblema',
      'Emblema de ruedas (4)',
      'Tapón de gasolina',
      'Bocina de claxon',
      'Cuartos',
      'Cristales',
      'Llantas (4)',
      'Molduras completas',
      'Tapón de ruedas (4)',
      'Limpiadores'
    ]
  },
  {
    key: 'interiores',
    title: 'Interiores',
    items: [
      'Instrumentos de tablero',
      'Radio',
      'Encendedor',
      'Ceniceros',
      'Botones de interiores',
      'Tapetes',
      'Calefacción',
      'Bocinas',
      'Espejo retrovisor',
      'Cinturones',
      'Manijas de puerta',
      'Vestiduras'
    ]
  },
  {
    key: 'accesorios',
    title: 'Accesorios',
    items: [
      'Gato',
      'Llave de birlos',
      'Triángulo de seguridad',
      'Extinguidor',
      'Maneral de gato',
      'Estuche herramientas',
      'Llanta de refacción'
    ]
  },
  {
    key: 'componentes_mecanicos',
    title: 'Componentes mecánicos',
    items: [
      'Claxon',
      'Tapón de radiador',
      'Filtro de aire',
      'Tapón de aceite',
      'Varilla de aceite',
      'Batería'
    ]
  }
];

// Items de una seccion: los del formulario + los que se hayan guardado con otro nombre
// (recepciones anteriores), para no perder informacion.
export const checklistItems = (section, values = {}) => [
  ...section.items,
  ...Object.keys(values).filter((item) => !section.items.includes(item))
];

export const autorizaciones = [
  ['autoriza_presupuesto_previo', 'Solicito presupuesto previo antes de autorizar el trabajo'],
  ['autoriza_sin_presupuesto', 'Autorizo realizar reparación sin presupuesto previo'],
  ['autoriza_pruebas', 'Autorizo para conducir mi vehículo para pruebas']
];

export const tiposDano = [
  { codigo: 'G', label: 'Golpe / abolladura' },
  { codigo: 'R', label: 'Rayón' },
  { codigo: 'P', label: 'Pintura dañada' },
  { codigo: 'Q', label: 'Quebrado / roto' },
  { codigo: 'O', label: 'Óxido' }
];

export const tipoDanoLabel = (codigo) => tiposDano.find((tipo) => tipo.codigo === codigo)?.label || codigo;

// Zonas del diagrama de carroceria, dibujadas sobre assets/diagrama-vehiculo.png (531 x 750 px):
// arriba la vista frontal, al centro la vista superior y a los lados los costados.
// points = poligono en pixeles de la imagen; lx/ly = donde se escriben los codigos de dano.
export const DIAGRAMA_ANCHO = 531;
export const DIAGRAMA_ALTO = 750;

// Los costados son simetricos: el derecho se obtiene reflejando el izquierdo sobre x = 266.
const EJE_SIMETRIA = 532;
const reflejar = (points) => points.map(([x, y]) => [EJE_SIMETRIA - x, y]);

const costadoIzquierdo = [
  {
    key: 'salpicadera_del',
    label: 'Salpicadera delantera',
    points: [[62, 130], [80, 117], [105, 117], [105, 150], [124, 150], [124, 132], [136, 170], [150, 262], [62, 262]],
    lx: 132,
    ly: 235
  },
  {
    key: 'puerta_del',
    label: 'Puerta delantera',
    points: [[62, 262], [150, 262], [170, 300], [185, 340], [190, 386], [62, 386]],
    lx: 112,
    ly: 330
  },
  {
    key: 'puerta_tras',
    label: 'Puerta trasera',
    points: [[62, 386], [190, 386], [190, 455], [128, 500], [110, 478], [62, 462]],
    lx: 112,
    ly: 425
  },
  {
    key: 'costado_tras',
    label: 'Costado trasero',
    points: [[62, 462], [110, 478], [128, 500], [190, 455], [150, 560], [128, 622], [62, 622]],
    lx: 100,
    ly: 590
  }
];

const ruedas = [
  { key: 'rin_del', label: 'Rin delantero', cx: 77, cy: 205, r: 40 },
  { key: 'rin_tras', label: 'Rin trasero', cx: 77, cy: 514, r: 40 }
];

export const zonasCarroceria = [
  { key: 'defensa_delantera', label: 'Defensa delantera / parrilla', points: [[170, 16], [364, 16], [364, 106], [170, 106]], lx: 266, ly: 64 },
  { key: 'cofre', label: 'Cofre', points: [[184, 136], [234, 125], [300, 125], [348, 136], [346, 262], [186, 262]], lx: 266, ly: 205 },
  { key: 'parabrisas', label: 'Parabrisas', points: [[186, 262], [346, 262], [330, 324], [200, 324]], lx: 266, ly: 300 },
  { key: 'techo', label: 'Techo', points: [[200, 324], [330, 324], [330, 476], [200, 476]], lx: 266, ly: 425 },
  { key: 'medallon', label: 'Medallón (vidrio trasero)', points: [[200, 476], [333, 476], [335, 560], [197, 560]], lx: 266, ly: 505 },
  { key: 'cajuela', label: 'Cajuela / compuerta', points: [[185, 560], [347, 560], [347, 622], [185, 622]], lx: 266, ly: 600 },
  { key: 'defensa_trasera', label: 'Defensa trasera', points: [[168, 645], [366, 645], [366, 712], [168, 712]], lx: 266, ly: 690 },

  ...costadoIzquierdo.map((zona) => ({ ...zona, key: `${zona.key}_izq`, label: `${zona.label} izquierda` })),
  ...costadoIzquierdo.map((zona) => ({
    ...zona,
    key: `${zona.key}_der`,
    label: `${zona.label} derecha`,
    points: reflejar(zona.points),
    lx: EJE_SIMETRIA - zona.lx
  })),

  // Las ruedas van al final para quedar por encima de salpicaderas y costados.
  ...ruedas.map((rueda) => ({ ...rueda, key: `${rueda.key}_izq`, label: `${rueda.label} izquierdo` })),
  ...ruedas.map((rueda) => ({ ...rueda, key: `${rueda.key}_der`, label: `${rueda.label} derecho`, cx: EJE_SIMETRIA - rueda.cx }))
];

export const zonaLabel = (key) => zonasCarroceria.find((zona) => zona.key === key)?.label || key;
