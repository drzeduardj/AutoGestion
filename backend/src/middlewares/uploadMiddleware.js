const fs = require('fs');
const path = require('path');
const multer = require('multer');

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

// En Vercel las funciones no tienen disco persistente: si existe el token de Vercel Blob
// las imagenes se guardan ahi; si no, se guardan en disco local (instalacion en el taller).
const useBlobStorage = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

// Vercel limita el cuerpo de las peticiones a 4.5 MB.
const maxImageSizeMb = process.env.VERCEL ? 4 : 5;

const ensureDirectory = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const buildSafeName = (file) => {
  const extension = path.extname(file.originalname).toLowerCase();
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
};

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const baseUploadDir = process.env.UPLOAD_DIR || 'uploads';
    const folder = req.uploadFolder || 'generales';
    const destination = path.resolve(baseUploadDir, folder);

    ensureDirectory(destination);
    cb(null, destination);
  },
  filename: (req, file, cb) => {
    cb(null, buildSafeName(file));
  }
});

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Formato de imagen no permitido. Usa jpg, jpeg, png o webp.'));
  }

  return cb(null, true);
};

const multerUpload = multer({
  storage: useBlobStorage ? multer.memoryStorage() : diskStorage,
  fileFilter,
  limits: {
    fileSize: maxImageSizeMb * 1024 * 1024
  }
});

// Deja en req.file.url la ruta publica del archivo, sea local (/uploads/...) o de Vercel Blob.
const persistUploadedFile = async (req, res, next) => {
  if (!req.file) return next();

  const folder = req.uploadFolder || 'generales';

  if (!useBlobStorage) {
    req.file.url = `/uploads/${folder}/${req.file.filename}`;
    return next();
  }

  try {
    const { put } = require('@vercel/blob');
    const filename = buildSafeName(req.file);
    const blob = await put(`${folder}/${filename}`, req.file.buffer, {
      access: 'public',
      contentType: req.file.mimetype
    });

    req.file.filename = filename;
    req.file.url = blob.url;
    req.file.buffer = undefined;
    return next();
  } catch (error) {
    return next(error);
  }
};

const upload = {
  single: (fieldName) => [multerUpload.single(fieldName), persistUploadedFile]
};

const setUploadFolder = (folder) => (req, res, next) => {
  req.uploadFolder = folder;
  next();
};

const cleanupUploadedFile = (file) => {
  if (file?.url && /^https?:\/\//i.test(file.url)) {
    const { del } = require('@vercel/blob');
    del(file.url).catch((error) => {
      console.error('No se pudo eliminar el archivo de Vercel Blob:', error.message);
    });
    return;
  }

  if (file?.path && fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }
};

module.exports = {
  upload,
  setUploadFolder,
  cleanupUploadedFile
};
