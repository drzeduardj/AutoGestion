import diagramaTurismo from '../assets/diagrama-vehiculo.png';
import diagramaCamioneta from '../assets/diagrama-camioneta.png';
import diagramaPickup from '../assets/diagrama-pickup.png';
import diagramaCamion from '../assets/diagrama-camion.png';
import diagramaBusLiviano from '../assets/diagrama-bus-liviano.png';
import diagramaBusMediano from '../assets/diagrama-bus-mediano.png';
import diagramaAutobus from '../assets/diagrama-autobus.png';

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

// Camion (Hino, Isuzu NPR, etc.): assets/diagrama-camion.png (530 x 750 px). Es cabina sobre
// chasis: el parabrisas va en la vista frontal, arriba se ven el techo de la cabina y el chasis,
// y cada costado tiene una sola puerta y el larguero del chasis.
const camion = {
  clave: 'camion',
  nombre: 'Camión',
  imagen: diagramaCamion,
  ancho: 530,
  alto: 750,
  ejes: [
    { texto: 'FRENTE', x: 360, y: 110, anchor: 'start' },
    { texto: 'ATRÁS', x: 370, y: 660, anchor: 'start' },
    { texto: 'IZQUIERDO', x: 20, y: 742, anchor: 'start' },
    { texto: 'DERECHO', x: 510, y: 742, anchor: 'end' }
  ],
  zonas: zonasDiagrama({
    eje: 530,
    centro: [
      { key: 'parabrisas', label: 'Parabrisas', points: [[198, 12], [332, 12], [334, 68], [196, 68]], lx: 265, ly: 45 },
      { key: 'defensa_delantera', label: 'Defensa delantera / parrilla', points: [[188, 68], [342, 68], [342, 135], [188, 135]], lx: 265, ly: 112 },
      { key: 'techo', label: 'Techo de cabina', points: [[195, 185], [333, 185], [333, 312], [195, 312]], lx: 265, ly: 255 },
      { key: 'chasis', label: 'Chasis', points: [[228, 312], [302, 312], [302, 560], [228, 560]], lx: 265, ly: 440 },
      { key: 'medallon', label: 'Parte trasera de cabina', points: [[195, 580], [333, 580], [333, 648], [195, 648]], lx: 265, ly: 620 },
      { key: 'defensa_trasera', label: 'Travesaño / luces traseras', points: [[180, 650], [350, 650], [350, 690], [180, 690]], lx: 265, ly: 675 }
    ],
    costado: conLabels([
      { key: 'puerta_del', points: [[30, 175], [88, 180], [80, 220], [68, 250], [30, 250]], lx: 55, ly: 225 },
      { key: 'salpicadera_del', points: [[88, 180], [120, 162], [142, 165], [142, 272], [20, 272], [20, 250], [68, 250], [80, 220]], lx: 112, ly: 198 },
      { key: 'larguero', points: [[105, 272], [150, 272], [150, 595], [105, 595]], lx: 128, ly: 400 }
    ], { puerta_del: 'Puerta', salpicadera_del: 'Costado de cabina', larguero: 'Chasis / larguero' }),
    ruedas: conLabels([
      { key: 'rin_del', cx: 135, cy: 245, r: 30 },
      { key: 'rin_tras', cx: 132, cy: 512, r: 32 }
    ], ruedasLabels)
  })
};

// Buses: los costados son largos y sin puertas fijas (la de pasajeros va de un solo lado), asi
// que se dividen en tramo delantero, central y trasero.
const busCostadoLabels = {
  costado_del: 'Costado delantero',
  costado_centro: 'Costado central',
  costado_tras: 'Costado trasero'
};

// Bus liviano (tipo Hiace): assets/diagrama-bus-liviano.png (616 x 750 px). En la vista superior
// el frente queda abajo.
const busLiviano = {
  clave: 'bus_liviano',
  nombre: 'Bus liviano',
  imagen: diagramaBusLiviano,
  ancho: 616,
  alto: 750,
  ejes: [
    { texto: 'FRENTE', x: 420, y: 150, anchor: 'start' },
    { texto: 'ATRÁS', x: 420, y: 690, anchor: 'start' },
    { texto: 'IZQUIERDO', x: 20, y: 742, anchor: 'start' },
    { texto: 'DERECHO', x: 596, y: 742, anchor: 'end' }
  ],
  zonas: zonasDiagrama({
    eje: 614,
    centro: [
      { key: 'parabrisas', label: 'Parabrisas', points: [[228, 30], [388, 30], [390, 78], [226, 78]], lx: 307, ly: 58 },
      { key: 'defensa_delantera', label: 'Defensa delantera / parrilla', points: [[213, 80], [400, 80], [400, 165], [213, 165]], lx: 307, ly: 140 },
      { key: 'techo', label: 'Techo', points: [[225, 212], [390, 212], [390, 500], [225, 500]], lx: 307, ly: 355 },
      { key: 'cofre', label: 'Cofre / frente superior', points: [[225, 500], [390, 500], [385, 590], [230, 590]], lx: 307, ly: 575 },
      { key: 'medallon', label: 'Medallón (vidrio trasero)', points: [[235, 605], [378, 605], [378, 645], [235, 645]], lx: 307, ly: 630 },
      { key: 'cajuela', label: 'Compuerta trasera', points: [[225, 645], [390, 645], [390, 698], [225, 698]], lx: 307, ly: 685 },
      { key: 'defensa_trasera', label: 'Defensa trasera', points: [[225, 698], [390, 698], [390, 722], [225, 722]], lx: 307, ly: 716 }
    ],
    costado: conLabels([
      { key: 'costado_del', points: [[30, 260], [60, 215], [100, 195], [175, 188], [175, 335], [30, 335]], lx: 90, ly: 300 },
      { key: 'costado_centro', points: [[30, 335], [175, 335], [175, 455], [30, 455]], lx: 100, ly: 395 },
      { key: 'costado_tras', points: [[30, 455], [175, 455], [175, 585], [95, 583], [30, 560]], lx: 100, ly: 540 }
    ], busCostadoLabels),
    ruedas: conLabels([
      { key: 'rin_del', cx: 170, cy: 270, r: 30 },
      { key: 'rin_tras', cx: 170, cy: 500, r: 30 }
    ], ruedasLabels)
  })
};

// Bus mediano (tipo Coaster): assets/diagrama-bus-mediano.png (531 x 750 px). En la vista superior
// el frente queda abajo.
const busMediano = {
  clave: 'bus_mediano',
  nombre: 'Bus mediano',
  imagen: diagramaBusMediano,
  ancho: 531,
  alto: 750,
  ejes: [
    { texto: 'FRENTE', x: 365, y: 140, anchor: 'start' },
    { texto: 'ATRÁS', x: 355, y: 690, anchor: 'start' },
    { texto: 'IZQUIERDO', x: 20, y: 742, anchor: 'start' },
    { texto: 'DERECHO', x: 511, y: 742, anchor: 'end' }
  ],
  zonas: zonasDiagrama({
    eje: 529,
    centro: [
      { key: 'parabrisas', label: 'Parabrisas', points: [[197, 25], [338, 25], [340, 80], [195, 80]], lx: 267, ly: 55 },
      { key: 'defensa_delantera', label: 'Defensa delantera / parrilla', points: [[188, 80], [348, 80], [348, 150], [188, 150]], lx: 267, ly: 128 },
      { key: 'techo', label: 'Techo', points: [[195, 200], [335, 200], [335, 520], [195, 520]], lx: 265, ly: 380 },
      { key: 'cofre', label: 'Cofre / frente superior', points: [[195, 520], [335, 520], [330, 590], [200, 590]], lx: 265, ly: 575 },
      { key: 'medallon', label: 'Medallón (vidrio trasero)', points: [[200, 610], [332, 610], [332, 650], [200, 650]], lx: 266, ly: 635 },
      { key: 'cajuela', label: 'Panel trasero', points: [[192, 650], [340, 650], [340, 703], [192, 703]], lx: 266, ly: 690 },
      { key: 'defensa_trasera', label: 'Defensa trasera', points: [[192, 703], [340, 703], [340, 722], [192, 722]], lx: 266, ly: 717 }
    ],
    costado: conLabels([
      { key: 'costado_del', points: [[22, 225], [40, 190], [100, 178], [150, 178], [150, 320], [22, 320]], lx: 80, ly: 290 },
      { key: 'costado_centro', points: [[22, 320], [150, 320], [150, 450], [22, 450]], lx: 85, ly: 390 },
      { key: 'costado_tras', points: [[22, 450], [150, 450], [150, 590], [100, 588], [40, 565], [22, 540]], lx: 85, ly: 520 }
    ], busCostadoLabels),
    ruedas: conLabels([
      { key: 'rin_del', cx: 147, cy: 272, r: 29 },
      { key: 'rin_tras', cx: 147, cy: 527, r: 29 }
    ], ruedasLabels)
  })
};

// Autobus (tamano completo): assets/diagrama-autobus.png (531 x 750 px). La vista superior es
// toda techo.
const autobus = {
  clave: 'autobus',
  nombre: 'Autobús',
  imagen: diagramaAutobus,
  ancho: 531,
  alto: 750,
  ejes: [
    { texto: 'FRENTE', x: 355, y: 120, anchor: 'start' },
    { texto: 'ATRÁS', x: 355, y: 690, anchor: 'start' },
    { texto: 'IZQUIERDO', x: 20, y: 742, anchor: 'start' },
    { texto: 'DERECHO', x: 511, y: 742, anchor: 'end' }
  ],
  zonas: zonasDiagrama({
    eje: 529,
    centro: [
      { key: 'parabrisas', label: 'Parabrisas', points: [[200, 38], [330, 38], [330, 88], [200, 88]], lx: 265, ly: 65 },
      { key: 'defensa_delantera', label: 'Defensa delantera / parrilla', points: [[195, 88], [335, 88], [335, 142], [195, 142]], lx: 265, ly: 125 },
      { key: 'techo', label: 'Techo', points: [[197, 188], [333, 188], [333, 578], [197, 578]], lx: 265, ly: 380 },
      { key: 'medallon', label: 'Medallón (vidrio trasero)', points: [[222, 612], [308, 612], [308, 650], [222, 650]], lx: 265, ly: 636 },
      { key: 'cajuela', label: 'Panel trasero / motor', points: [[195, 652], [335, 652], [335, 690], [195, 690]], lx: 265, ly: 680 },
      { key: 'defensa_trasera', label: 'Defensa trasera', points: [[195, 690], [335, 690], [335, 710], [195, 710]], lx: 265, ly: 705 }
    ],
    costado: conLabels([
      { key: 'costado_del', points: [[28, 180], [60, 172], [148, 170], [148, 300], [28, 300]], lx: 75, ly: 245 },
      { key: 'costado_centro', points: [[28, 300], [148, 300], [148, 470], [28, 470]], lx: 80, ly: 390 },
      { key: 'costado_tras', points: [[28, 470], [148, 470], [148, 625], [60, 620], [35, 600], [28, 580]], lx: 80, ly: 560 }
    ], busCostadoLabels),
    ruedas: conLabels([
      { key: 'rin_del', cx: 142, cy: 250, r: 27 },
      { key: 'rin_tras', cx: 142, cy: 528, r: 28 }
    ], ruedasLabels)
  })
};

export const diagramas = {
  turismo,
  camioneta,
  pickup,
  camion,
  bus_liviano: busLiviano,
  bus_mediano: busMediano,
  autobus
};

// Ancho de referencia de los textos del diagrama: en imagenes mas anchas se escalan para verse igual.
export const DIAGRAMA_ANCHO_BASE = turismo.ancho;

export const getDiagrama = (clave) => diagramas[clave] || turismo;

// Etiqueta de una zona; si no esta en el diagrama indicado se busca en los demas.
export const zonaLabel = (key, clave) => getDiagrama(clave).zonas.find((zona) => zona.key === key)?.label
  || Object.values(diagramas).flatMap((diagrama) => diagrama.zonas).find((zona) => zona.key === key)?.label
  || key;
