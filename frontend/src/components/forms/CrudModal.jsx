import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Save, X } from 'lucide-react';
import { getFields, getInitialForm, moduleConfig, normalizePayload } from '../../config/moduleConfig';
import { moduleTitles } from '../../routes/modules';
import { validateField, validateForm } from '../../utils/validation';
import FormField from './FormField';

function CrudModal({ modal, catalogs, saving, error, onClose, onSubmit, canCreateRelated, onCreateRelated }) {
  const config = moduleConfig[modal.moduleKey];
  const [form, setForm] = useState(() => getInitialForm(config, catalogs, modal.mode, modal.row));
  const [fieldErrors, setFieldErrors] = useState({});
  // Registros creados desde este modal (ej. cliente nuevo) que aun no estan en los catalogos.
  const [createdRows, setCreatedRows] = useState({});
  // Modal anidado para crear el registro relacionado: { field, modal }
  const [related, setRelated] = useState(null);
  const [relatedSaving, setRelatedSaving] = useState(false);
  const [relatedError, setRelatedError] = useState('');

  const mergedCatalogs = useMemo(() => Object.entries(createdRows).reduce((acc, [key, rows]) => {
    const existing = acc[key] || [];
    const missing = rows.filter((row) => !existing.some((item) => String(item.id) === String(row.id)));
    return { ...acc, [key]: [...existing, ...missing] };
  }, catalogs), [catalogs, createdRows]);

  // Los campos se recalculan con el form actual para soportar opciones dependientes
  // (ej. los vehiculos se filtran por el cliente seleccionado).
  const fields = getFields(config, mergedCatalogs, modal.mode, form);

  useEffect(() => {
    setForm(getInitialForm(config, catalogs, modal.mode, modal.row));
    setFieldErrors({});
  }, [catalogs, config, modal.mode, modal.row]);

  const updateField = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field.name]: value };
      if (field.resets) {
        field.resets.forEach((name) => { next[name] = ''; });
      }
      return next;
    });
    setFieldErrors((current) => {
      const next = { ...current, [field.name]: validateField(field, value, modal.mode) };
      if (field.resets) {
        field.resets.forEach((name) => { delete next[name]; });
      }
      return next;
    });
  };

  // Prellena el registro relacionado con el texto buscado y con valores del form actual
  // (ej. el vehiculo nuevo queda asignado al cliente elegido en la visita).
  const openRelated = (field, text) => {
    const { moduleKey, prefill, fromForm = [] } = field.creatable;
    const row = prefill && text ? { [prefill]: text } : {};
    fromForm.forEach((name) => { row[name] = form[name]; });
    setRelatedError('');
    setRelated({ field, modal: { mode: 'create', moduleKey, row } });
  };

  const canOpenRelated = (field) => Boolean(
    field.creatable
    && onCreateRelated
    && canCreateRelated?.(field.creatable.moduleKey)
    && (!field.creatable.requires || form[field.creatable.requires])
  );

  const submitRelated = async (payload) => {
    if (!related) return;

    setRelatedSaving(true);
    setRelatedError('');
    try {
      const { moduleKey } = related.modal;
      const created = await onCreateRelated(moduleKey, payload);
      const catalogKey = moduleConfig[moduleKey].resourceKey;
      setCreatedRows((current) => ({ ...current, [catalogKey]: [...(current[catalogKey] || []), created] }));
      updateField(related.field, created.id);
      setRelated(null);
    } catch (err) {
      setRelatedError(err?.message || 'No se pudo crear el registro.');
    } finally {
      setRelatedSaving(false);
    }
  };

  const title = modal.mode === 'create'
    ? `Nuevo ${moduleTitles[modal.moduleKey].toLowerCase()}`
    : `Editar ${moduleTitles[modal.moduleKey].toLowerCase()}`;

  const submit = (event) => {
    event.preventDefault();
    const errors = validateForm(fields, form, modal.mode);

    setFieldErrors(errors);

    if (Object.keys(errors).length) {
      return;
    }

    onSubmit(normalizePayload(form, fields, modal.mode));
  };

  return (
    <>
      <div className="modal-layer" role="presentation">
        <section className="modal-panel" role="dialog" aria-modal="true" aria-label={title}>
          <div className="modal-header">
            <h2>{title}</h2>
            <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar" title="Cerrar">
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <form className="crud-form" onSubmit={submit} noValidate>
            {fields.map((field) => (
              <FormField
                key={field.name}
                field={field}
                mode={modal.mode}
                value={form[field.name] ?? ''}
                error={fieldErrors[field.name]}
                onChange={(value) => updateField(field, value)}
                onCreate={canOpenRelated(field) ? (text) => openRelated(field, text) : undefined}
              />
            ))}

            {error ? <div className="form-error full-row">{error}</div> : null}

            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={onClose}>Cancelar</button>
              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
                Guardar
              </button>
            </div>
          </form>
        </section>
      </div>

      {related ? (
        <CrudModal
          modal={related.modal}
          catalogs={mergedCatalogs}
          saving={relatedSaving}
          error={relatedError}
          onClose={() => setRelated(null)}
          onSubmit={submitRelated}
        />
      ) : null}
    </>
  );
}

export default CrudModal;
