import diagramaTurismo from '../assets/diagrama-vehiculo.png';
import diagramaCamioneta from '../assets/diagrama-camioneta.png';
import diagramaPickup from '../assets/diagrama-pickup.png';

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

// Diagramas de carroceria, uno por tipo de vehiculo (clave de la tabla tipos_vehiculo).
// En cada imagen: arriba la vista frontal, al centro la superior, abajo la trasera y a los lados
// los costados. Las zonas se dibujan en pixeles de la imagen:
// points = poligono, lx/ly = donde se escriben los codigos de dano; ruedas = circulos.
// Las zonas comparten keys entre diagramas (ej. puerta_del_izq) para que los danos se lean igual.
// Los costados son simetricos: el derecho se obtiene reflejando el izquierdo (x -> eje - x).
const zonasDiagrama = ({ centro, costado, ruedas, eje }) => [
  ...centro,
  ...costado.map((zona) => ({ ...zona, key: `${zona.key}_izq`, label: `${zona.label} izquierda` })),
  ...costado.map((zona) => ({
    ...zona,
    key: `${zona.key}_der`,
    label: `${zona.label} derecha`,
    points: zona.points.map(([x, y]) => [eje - x, y]),
    lx: eje - zona.lx
  })),

  // Las ruedas van al final para quedar por encima de salpicaderas y costados.
  ...ruedas.map((rueda) => ({ ...rueda, key: `${rueda.key}_izq`, label: `${rueda.label} izquierdo` })),
  ...ruedas.map((rueda) => ({ ...rueda, key: `${rueda.key}_der`, label: `${rueda.label} derecho`, cx: eje - rueda.cx }))
];

const costadoLabels = {
  salpicadera_del: 'Salpicadera delantera',
  puerta_del: 'Puerta delantera',
  puerta_tras: 'Puerta trasera',
  costado_tras: 'Costado trasero'
};

const ruedasLabels = { rin_del: 'Rin delantero', rin_tras: 'Rin trasero' };

const conLabels = (zonas, labels) => zonas.map((zona) => ({ ...zona, label: labels[zona.key] }));

// Turismo: assets/diagrama-vehiculo.png (531 x 750 px).
const turismo = {
  clave: 'turismo',
  nombre: 'Turismo',
  imagen: diagramaTurismo,
  ancho: 531,
  alto: 750,
  ejes: [
    { texto: 'FRENTE', x: 266, y: 11, anchor: 'middle' },
    { texto: 'ATRÁS', x: 266, y: 742, anchor: 'middle' },
    { texto: 'IZQUIERDO', x: 20, y: 742, anchor: 'start' },
    { texto: 'DERECHO', x: 511, y: 742, anchor: 'end' }
  ],
  zonas: zonasDiagrama({
    eje: 532,
    centro: [
      { key: 'defensa_delantera', label: 'Defensa delantera / parrilla', points: [[170, 16], [364, 16], [364, 106], [170, 106]], lx: 266, ly: 64 },
      { key: 'cofre', label: 'Cofre', points: [[184, 136], [234, 125], [300, 125], [348, 136], [346, 262], [186, 262]], lx: 266, ly: 205 },
      { key: 'parabrisas', label: 'Parabrisas', points: [[186, 262], [346, 262], [330, 324], [200, 324]], lx: 266, ly: 300 },
      { key: 'techo', label: 'Techo', points: [[200, 324], [330, 324], [330, 476], [200, 476]], lx: 266, ly: 425 },
      { key: 'medallon', label: 'Medallón (vidrio trasero)', points: [[200, 476], [333, 476], [335, 560], [197, 560]], lx: 266, ly: 505 },
      { key: 'cajuela', label: 'Cajuela / compuerta', points: [[185, 560], [347, 560], [347, 622], [185, 622]], lx: 266, ly: 600 },
      { key: 'defensa_trasera', label: 'Defensa trasera', points: [[168, 645], [366, 645], [366, 712], [168, 712]], lx: 266, ly: 690 }
    ],
    costado: conLabels([
      { key: 'salpicadera_del', points: [[62, 130], [80, 117], [105, 117], [105, 150], [124, 150], [124, 132], [136, 170], [150, 262], [62, 262]], lx: 132, ly: 235 },
      { key: 'puerta_del', points: [[62, 262], [150, 262], [170, 300], [185, 340], [190, 386], [62, 386]], lx: 112, ly: 330 },
      { key: 'puerta_tras', points: [[62, 386], [190, 386], [190, 455], [128, 500], [110, 478], [62, 462]], lx: 112, ly: 425 },
      { key: 'costado_tras', points: [[62, 462], [110, 478], [128, 500], [190, 455], [150, 560], [128, 622], [62, 622]], lx: 100, ly: 590 }
    ], costadoLabels),
    ruedas: conLabels([
      { key: 'rin_del', cx: 77, cy: 205, r: 40 },
      { key: 'rin_tras', cx: 77, cy: 514, r: 40 }
    ], ruedasLabels)
  })
};

// Camioneta: assets/diagrama-camioneta.png (616 x 750 px).
const camioneta = {
  clave: 'camioneta',
  nombre: 'Camioneta',
  imagen: diagramaCamioneta,
  ancho: 616,
  alto: 750,
  ejes: [
    { texto: 'FRENTE', x: 435, y: 62, anchor: 'start' },
    { texto: 'ATRÁS', x: 440, y: 700, anchor: 'start' },
    { texto: 'IZQUIERDO', x: 20, y: 742, anchor: 'start' },
    { texto: 'DERECHO', x: 596, y: 742, anchor: 'end' }
  ],
  zonas: zonasDiagrama({
    eje: 616,
    centro: [
      { key: 'defensa_delantera', label: 'Defensa delantera / parrilla', points: [[192, 17], [420, 17], [420, 105], [192, 105]], lx: 306, ly: 62 },
      { key: 'cofre', label: 'Cofre', points: [[210, 155], [255, 140], [360, 140], [402, 155], [412, 242], [202, 242]], lx: 306, ly: 200 },
      { key: 'parabrisas', label: 'Parabrisas', points: [[208, 242], [405, 242], [385, 303], [230, 303]], lx: 306, ly: 280 },
      { key: 'techo', label: 'Techo', points: [[228, 303], [388, 303], [388, 490], [228, 490]], lx: 306, ly: 400 },
      { key: 'medallon', label: 'Medallón (vidrio trasero)', points: [[228, 490], [388, 490], [398, 572], [218, 572]], lx: 306, ly: 545 },
      { key: 'cajuela', label: 'Compuerta trasera', points: [[212, 572], [405, 572], [405, 620], [212, 620]], lx: 306, ly: 605 },
      { key: 'defensa_trasera', label: 'Defensa trasera', points: [[188, 628], [425, 628], [425, 722], [188, 722]], lx: 306, ly: 700 }
    ],
    costado: conLabels([
      { key: 'salpicadera_del', points: [[35, 120], [65, 108], [95, 107], [130, 125], [150, 170], [165, 250], [180, 262], [37, 262]], lx: 130, ly: 235 },
      { key: 'puerta_del', points: [[37, 262], [180, 262], [200, 300], [202, 378], [37, 378]], lx: 110, ly: 330 },
      { key: 'puerta_tras', points: [[37, 378], [202, 378], [200, 500], [185, 550], [140, 552], [120, 475], [37, 470]], lx: 110, ly: 430 },
      { key: 'costado_tras', points: [[37, 470], [120, 475], [140, 552], [185, 550], [170, 580], [150, 610], [120, 638], [37, 632]], lx: 110, ly: 600 }
    ], costadoLabels),
    ruedas: conLabels([
      { key: 'rin_del', cx: 53, cy: 200, r: 44 },
      { key: 'rin_tras', cx: 53, cy: 520, r: 44 }
    ], ruedasLabels)
  })
};

// Pickup: assets/diagrama-pickup.png (733 x 750 px). La caja (batea) tiene zona propia y en la
// vista trasera se separan compuerta y defensa.
const pickup = {
  clave: 'pickup',
  nombre: 'Pickup',
  imagen: diagramaPickup,
  ancho: 733,
  alto: 750,
  ejes: [
    { texto: 'FRENTE', x: 500, y: 80, anchor: 'start' },
    { texto: 'ATRÁS', x: 500, y: 700, anchor: 'start' },
    { texto: 'IZQUIERDO', x: 20, y: 742, anchor: 'start' },
    { texto: 'DERECHO', x: 713, y: 742, anchor: 'end' }
  ],
  zonas: zonasDiagrama({
    eje: 730,
    centro: [
      { key: 'defensa_delantera', label: 'Defensa delantera / parrilla', points: [[250, 5], [485, 5], [485, 148], [250, 148]], lx: 366, ly: 80 },
      { key: 'cofre', label: 'Cofre', points: [[268, 205], [310, 180], [420, 180], [462, 205], [468, 264], [262, 264]], lx: 366, ly: 225 },
      { key: 'parabrisas', label: 'Parabrisas', points: [[266, 264], [466, 264], [445, 322], [288, 322]], lx: 366, ly: 300 },
      { key: 'techo', label: 'Techo', points: [[292, 322], [440, 322], [440, 436], [292, 436]], lx: 366, ly: 385 },
      { key: 'medallon', label: 'Medallón (vidrio trasero)', points: [[292, 436], [440, 436], [440, 455], [292, 455]], lx: 366, ly: 451 },
      { key: 'caja', label: 'Caja / batea', points: [[262, 455], [470, 455], [470, 582], [262, 582]], lx: 366, ly: 525 },
      { key: 'cajuela', label: 'Compuerta trasera', points: [[252, 617], [478, 617], [478, 683], [252, 683]], lx: 366, ly: 660 },
      { key: 'defensa_trasera', label: 'Defensa trasera', points: [[250, 683], [480, 683], [480, 735], [250, 735]], lx: 366, ly: 725 }
    ],
    costado: conLabels([
      { key: 'salpicadera_del', points: [[88, 140], [100, 110], [130, 105], [165, 120], [180, 160], [190, 235], [205, 258], [88, 258]], lx: 150, ly: 240 },
      { key: 'puerta_del', points: [[88, 258], [195, 250], [225, 275], [240, 300], [242, 362], [88, 362]], lx: 150, ly: 315 },
      { key: 'puerta_tras', points: [[88, 362], [242, 362], [240, 450], [215, 480], [185, 470], [180, 455], [88, 452]], lx: 150, ly: 410 },
      { key: 'costado_tras', points: [[88, 452], [180, 455], [192, 475], [192, 630], [160, 635], [100, 630], [88, 600]], lx: 150, ly: 590 }
    ], costadoLabels),
    ruedas: conLabels([
      { key: 'rin_del', cx: 92, cy: 195, r: 42 },
      { key: 'rin_tras', cx: 89, cy: 503, r: 42 }
    ], ruedasLabels)
  })
};

export const diagramas = { turismo, camioneta, pickup };

// Ancho de referencia de los textos del diagrama: en imagenes mas anchas se escalan para verse igual.
export const DIAGRAMA_ANCHO_BASE = turismo.ancho;

export const getDiagrama = (clave) => diagramas[clave] || turismo;

// Etiqueta de una zona; si no esta en el diagrama indicado se busca en los demas.
export const zonaLabel = (key, clave) => getDiagrama(clave).zonas.find((zona) => zona.key === key)?.label
  || Object.values(diagramas).flatMap((diagrama) => diagrama.zonas).find((zona) => zona.key === key)?.label
  || key;
