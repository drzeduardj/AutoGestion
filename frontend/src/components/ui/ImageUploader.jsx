import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, LoaderCircle, X } from 'lucide-react';
import { validateImageSize, validateImageType } from '../../utils/validation';
import { compressImage } from '../../utils/image';

// value: array de { file, descripcion }
function ImageUploader({ value = [], onChange, max = 6 }) {
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const previews = useMemo(
    () => value.map((item) => ({ ...item, url: URL.createObjectURL(item.file) })),
    [value]
  );

  useEffect(() => () => {
    previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [previews]);

  const handleSelect = async (event) => {
    const incoming = Array.from(event.target.files || []);
    event.target.value = '';

    if (!incoming.length) return;

    const room = max - value.length;

    if (room <= 0) {
      setError(`Solo puedes agregar ${max} imagen(es) en total`);
      return;
    }

    setProcessing(true);
    setError('');

    let nextError = '';
    const accepted = [];

    for (const original of incoming) {
      const typeError = validateImageType(original);

      if (typeError) {
        nextError = typeError;
        continue;
      }

      // Se reduce antes de medir el peso: en crudo casi cualquier foto de
      // celular superaria el limite.
      const file = await compressImage(original);
      const sizeError = validateImageSize(file);

      if (sizeError) {
        nextError = sizeError;
        continue;
      }

      accepted.push({ file, descripcion: '' });
    }

    if (accepted.length > room) {
      nextError = `Solo puedes agregar ${max} imagen(es) en total`;
    }

    setProcessing(false);
    setError(nextError);

    if (!accepted.length) return;

    onChange([...value, ...accepted.slice(0, room)]);
  };

  const updateDescripcion = (index, descripcion) => {
    onChange(value.map((item, position) => (position === index ? { ...item, descripcion } : item)));
  };

  const removeAt = (index) => {
    setError('');
    onChange(value.filter((_, position) => position !== index));
  };

  const full = value.length >= max;

  return (
    <div className="image-uploader">
      <div className="image-uploader-items">
        {previews.map((preview, index) => (
          <div className="image-uploader-item" key={preview.url}>
            <div className="image-uploader-thumb">
              <img src={preview.url} alt={preview.file.name} />
              <button type="button" onClick={() => removeAt(index)} aria-label="Quitar imagen" title="Quitar imagen">
                <X size={14} aria-hidden="true" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Descripcion (opcional)"
              maxLength={255}
              value={preview.descripcion}
              onChange={(event) => updateDescripcion(index, event.target.value)}
            />
          </div>
        ))}

        {!full ? (
          <label className={processing ? 'image-uploader-add is-busy' : 'image-uploader-add'}>
            {processing ? (
              <LoaderCircle className="spin" size={24} aria-hidden="true" />
            ) : (
              <ImagePlus size={24} aria-hidden="true" />
            )}
            <span>{processing ? 'Optimizando...' : 'Agregar'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={processing}
              onChange={handleSelect}
            />
          </label>
        ) : null}
      </div>

      {full ? <small className="image-uploader-hint">Maximo de imagenes alcanzado.</small> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}

export default ImageUploader;
