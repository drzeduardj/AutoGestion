// Las fotos de celular pesan varios MB. Vercel corta el cuerpo de la peticion
// en ~4.5 MB, asi que se reducen en el navegador antes de subirlas: ademas de
// esquivar el limite, la carga es mucho mas rapida en el wifi del taller.
export const compressionRules = {
  maxDimension: 1600,
  quality: 0.8,
  outputType: 'image/jpeg'
};

// createImageBitmap respeta la orientacion EXIF, que es lo que evita que las
// fotos tomadas en vertical queden acostadas. Si el navegador no lo soporta se
// cae a un <img>, que el navegador ya orienta por su cuenta al renderizar.
const decodeImage = async (file) => {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch (error) {
      // Navegador sin soporte para la opcion: se usa el <img>.
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };

    image.src = url;
  });
};

const targetSize = (width, height, maxDimension) => {
  const longest = Math.max(width, height);

  if (!longest || longest <= maxDimension) {
    return { width, height };
  }

  const ratio = maxDimension / longest;

  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio))
  };
};

// El backend arma el nombre final con la extension del archivo original, asi
// que al convertir a JPEG hay que renombrar para que no quede un .png con
// contenido jpeg.
const asJpgName = (name) => `${String(name || 'foto').replace(/\.[^.]+$/, '') || 'foto'}.jpg`;

export const compressImage = async (file, options = {}) => {
  const { maxDimension, quality, outputType } = { ...compressionRules, ...options };

  if (!file || !file.type?.startsWith('image/')) {
    return file;
  }

  let source;

  try {
    source = await decodeImage(file);
  } catch (error) {
    // Si no se puede decodificar se sube tal cual y que valide el backend.
    return file;
  }

  try {
    const width = source.width || source.naturalWidth;
    const height = source.height || source.naturalHeight;
    const size = targetSize(width, height, maxDimension);

    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext('2d');
    context.drawImage(source, 0, 0, size.width, size.height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, outputType, quality));

    // Una imagen ya optimizada puede crecer al recomprimirse: en ese caso se
    // deja la original.
    if (!blob || blob.size >= file.size) {
      return file;
    }

    return new File([blob], asJpgName(file.name), {
      type: outputType,
      lastModified: Date.now()
    });
  } catch (error) {
    return file;
  } finally {
    source.close?.();
  }
};
