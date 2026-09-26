import SearchSelect from '../ui/SearchSelect';

function FormField({ field, mode, value, error, onChange, onCreate }) {
  const required = Boolean(field.required || (mode === 'create' && field.requiredOnCreate));
  const integerOnly = field.valueType === 'integer';
  const handleInputChange = (event) => {
    const integerPart = event.target.value.split(/[.,]/)[0];
    const nextValue = integerOnly
      ? integerPart.replace(/[^\d]/g, '')
      : event.target.value;

    onChange(nextValue);
  };

  if (field.type === 'textarea') {
    return (
      <label className="field field-wide">
        {field.label}
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          maxLength={field.maxLength}
          aria-invalid={Boolean(error)}
          rows={3}
        />
        {error ? <span className="field-error">{error}</span> : null}
      </label>
    );
  }

  if (field.type === 'select' && field.searchable) {
    const options = (field.options || []).map((option) => (
      typeof option === 'string' ? { value: option, label: option } : option
    ));

    return (
      <label className="field">
        {field.label}
        <SearchSelect
          value={value}
          onChange={onChange}
          options={options}
          placeholder={`Buscar ${String(field.label).toLowerCase()}`}
          emptyText={field.emptyText || 'Sin coincidencias'}
          onCreate={onCreate}
          createLabel={field.createLabel}
        />
        {error ? <span className="field-error">{error}</span> : null}
      </label>
    );
  }

  if (field.type === 'select') {
    const options = (field.options || []).map((option) => (
      typeof option === 'string' ? { value: option, label: option } : option
    ));

    return (
      <label className="field">
        {field.label}
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          aria-invalid={Boolean(error)}
        >
          <option value="">Sin seleccionar</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {error ? <span className="field-error">{error}</span> : null}
      </label>
    );
  }

  return (
    <label className="field">
      {field.label}
      <input
        type={field.type || 'text'}
        value={value}
        onChange={handleInputChange}
        onKeyDown={(event) => {
          if (integerOnly && ['.', ',', 'e', 'E', '+', '-'].includes(event.key)) {
            event.preventDefault();
          }
        }}
        required={required}
        min={field.min}
        max={field.max}
        step={integerOnly ? 1 : field.step}
        inputMode={integerOnly ? 'numeric' : undefined}
        pattern={integerOnly ? '[0-9]*' : undefined}
        minLength={field.minLength}
        maxLength={field.maxLength}
        aria-invalid={Boolean(error)}
      />
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}

export default FormField;
