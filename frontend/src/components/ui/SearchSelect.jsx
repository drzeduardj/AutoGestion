import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus, Search, X } from 'lucide-react';

function SearchSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar',
  emptyText = 'Sin coincidencias',
  disabled = false,
  onCreate,
  createLabel = 'Crear nuevo'
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(
    () => options.find((option) => String(option.value) === String(value)) || null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => String(option.label).toLowerCase().includes(needle));
  }, [options, query]);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  const openMenu = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
  };

  const selectOption = (option) => {
    onChange(option.value);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  // Accion opcional para registrar un elemento que no existe (ej. cliente nuevo),
  // se le pasa el texto buscado para prellenar el formulario.
  const createOption = () => {
    const text = query.trim();
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
    onCreate(text);
  };

  const clearSelection = (event) => {
    event.stopPropagation();
    onChange('');
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) openMenu();
      else setHighlight((current) => Math.min(current + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter') {
      if (open && filtered[highlight]) {
        event.preventDefault();
        selectOption(filtered[highlight]);
      } else if (open && onCreate && !filtered.length) {
        event.preventDefault();
        createOption();
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  const inputValue = open ? query : (selected?.label || '');

  return (
    <div className={`search-select${disabled ? ' search-select-disabled' : ''}`} ref={containerRef}>
      <div className="search-select-control" onClick={openMenu}>
        <Search size={16} aria-hidden="true" className="search-select-icon" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={openMenu}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {selected && !disabled ? (
          <button type="button" className="search-select-clear" onClick={clearSelection} aria-label="Limpiar seleccion" title="Limpiar seleccion">
            <X size={15} aria-hidden="true" />
          </button>
        ) : (
          <ChevronDown size={16} aria-hidden="true" className="search-select-chevron" />
        )}
      </div>

      {open ? (
        <ul className="search-select-menu" role="listbox">
          {filtered.length ? filtered.map((option, index) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={String(option.value) === String(value)}
                className={[
                  'search-select-option',
                  index === highlight ? 'search-select-option-active' : '',
                  String(option.value) === String(value) ? 'search-select-option-selected' : ''
                ].filter(Boolean).join(' ')}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => selectOption(option)}
              >
                {option.label}
              </button>
            </li>
          )) : (
            <li className="search-select-empty">{emptyText}</li>
          )}
          {onCreate ? (
            <li className="search-select-create-item">
              <button type="button" className="search-select-option search-select-create" onClick={createOption}>
                <Plus size={15} aria-hidden="true" />
                {query.trim() ? `${createLabel}: "${query.trim()}"` : createLabel}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

export default SearchSelect;
