const UNIDADES = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const ESPECIALES = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve'];
const VEINTIS = ['veinte', 'veintiun', 'veintidos', 'veintitres', 'veinticuatro', 'veinticinco', 'veintiseis', 'veintisiete', 'veintiocho', 'veintinueve'];
const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

// Convierte 0-999 a letras.
const centenasALetras = (n) => {
  if (n === 0) return '';
  if (n === 100) return 'cien';

  const c = Math.floor(n / 100);
  const resto = n % 100;
  const d = Math.floor(resto / 10);
  const u = resto % 10;

  let texto = '';
  if (d === 0) texto = UNIDADES[u];
  else if (d === 1) texto = ESPECIALES[u];
  else if (d === 2) texto = VEINTIS[u];
  else texto = DECENAS[d] + (u ? ` y ${UNIDADES[u]}` : '');

  return [CENTENAS[c], texto].filter(Boolean).join(' ');
};

const enteroALetras = (n) => {
  if (n === 0) return 'cero';

  const millones = Math.floor(n / 1000000);
  const miles = Math.floor((n % 1000000) / 1000);
  const resto = n % 1000;
  const partes = [];

  if (millones) partes.push(millones === 1 ? 'un millon' : `${centenasALetras(millones)} millones`);
  if (miles) partes.push(miles === 1 ? 'mil' : `${centenasALetras(miles)} mil`);
  if (resto) partes.push(centenasALetras(resto));

  return partes.join(' ');
};

// Ej: 1250.5 -> "Mil doscientos cincuenta lempiras con 50/100"
export const numeroALetras = (value) => {
  const amount = Math.round(Math.abs(Number(value || 0)) * 100);
  const entero = Math.floor(amount / 100);
  const centavos = String(amount % 100).padStart(2, '0');
  const letras = enteroALetras(entero);
  const moneda = entero === 1 ? 'lempira' : 'lempiras';
  const texto = `${letras} ${moneda} con ${centavos}/100`;

  return texto.charAt(0).toUpperCase() + texto.slice(1);
};
