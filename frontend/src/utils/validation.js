const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+\-()\s]{7,30}$/;

export const imageRules = {
  maxSizeBytes: 5 * 1024 * 1024,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
};

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

export const validateField = (field, value, mode) => {
  const required = Boolean(field.required || (mode === 'create' && field.requiredOnCreate));

  if (required && isBlank(value)) {
    return `${field.label} es requerido`;
  }

  if (isBlank(value)) {
    return '';
  }

  const text = String(value).trim();

  if (field.minLength && text.length < field.minLength) {
    return `${field.label} debe tener al menos ${field.minLength} caracteres`;
  }

  if (field.maxLength && text.length > field.maxLength) {
    return `${field.label} no debe superar ${field.maxLength} caracteres`;
  }

  if (field.type === 'email' && !emailPattern.test(text)) {
    return 'Ingresa un email valido';
  }

  if (field.kind === 'phone' && !phonePattern.test(text)) {
    return 'Ingresa un telefono valido';
  }

  if (field.valueType === 'integer' && !/^\d+$/.test(text)) {
    return `${field.label} debe ser un numero entero`;
  }

  if (field.type === 'number' || field.valueType === 'number') {
    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
      return `${field.label} debe ser numerico`;
    }

    if (field.min !== undefined && numberValue < field.min) {
      return `${field.label} debe ser mayor o igual a ${field.min}`;
    }

    if (field.max !== undefined && numberValue > field.max) {
      return `${field.label} debe ser menor o igual a ${field.max}`;
    }
  }

  if (field.valueType === 'date' && Number.isNaN(new Date(value).getTime())) {
    return `${field.label} debe ser una fecha valida`;
  }

  return '';
};

export const validateForm = (fields, form, mode) => {
  const errors = {};

  fields.forEach((field) => {
    const error = validateField(field, form[field.name], mode);

    if (error) {
      errors[field.name] = error;
    }
  });

  return errors;
};

// El tipo se valida antes de comprimir y el peso despues: una foto de celular
// pasa los 5 MB en crudo y queda muy por debajo una vez reducida, asi que
// rechazarla por tamano antes de tiempo bloquearia subidas validas.
export const validateImageType = (file) => {
  if (!file) {
    return 'Selecciona una foto';
  }

  if (!imageRules.allowedTypes.includes(file.type)) {
    return 'La foto debe ser JPG, PNG o WebP';
  }

  return '';
};

export const validateImageSize = (file) => {
  if (file && file.size > imageRules.maxSizeBytes) {
    return 'La foto no debe superar 5 MB';
  }

  return '';
};
