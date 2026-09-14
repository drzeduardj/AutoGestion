import { Info, PackagePlus, Pencil, Plus, Power, Search } from 'lucide-react';
import { getListForModule, hasRole, moduleConfig } from '../config/moduleConfig';
import { moduleHints, moduleTitles } from '../routes/modules';
import { filterRows } from '../utils/formatters';
import DataTable from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';

function ModulePage({
  moduleKey,
  session,
  data,
  loading,
  error,
  search,
  onSearch,
  onCreate,
  onEdit,
  onToggleStatus,
  onStockMovement,
  onRefresh
}) {
  const config = moduleConfig[moduleKey];
  const rows = filterRows(getListForModule(moduleKey, data), search);
  const canCreate = hasRole(session, config?.createRoles);
  const canEdit = hasRole(session, config?.editRoles);
  const canStatus = hasRole(session, config?.statusRoles);
  const canStock = Boolean(config?.stockMovements) && hasRole(session, config?.stockRoles);

  return (
    <section className="panel">
      <div className="toolbar">
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <input
            placeholder={`Buscar en ${moduleTitles[moduleKey].toLowerCase()}`}
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
        </label>

        {canCreate ? (
          <button className="primary-button compact-button" type="button" onClick={() => onCreate(moduleKey)}>
            <Plus size={18} aria-hidden="true" />
            Nuevo
          </button>
        ) : null}
      </div>

      {moduleHints[moduleKey] ? (
        <p className="module-hint">
          <Info size={15} aria-hidden="true" />
          {moduleHints[moduleKey]}
        </p>
      ) : null}

      {loading ? <EmptyState text="Cargando datos..." /> : null}
      {error ? <ErrorState text={error} onRetry={onRefresh} /> : null}
      {!loading && !error ? (
        <DataTable
          rows={rows}
          columns={config?.columns || []}
          actions={canEdit || canStatus || canStock ? (row) => (
            <div className="row-actions">
              {canEdit ? (
                <button className="icon-button table-action" type="button" onClick={() => onEdit(moduleKey, row)} aria-label="Editar" title="Editar">
                  <Pencil size={17} aria-hidden="true" />
                </button>
              ) : null}
              {canStock ? (
                <button className="icon-button table-action" type="button" onClick={() => onStockMovement(row)} aria-label="Entrada / ajuste de stock" title="Entrada / ajuste de stock">
                  <PackagePlus size={17} aria-hidden="true" />
                </button>
              ) : null}
              {canStatus && row.estado ? (
                <button className="icon-button table-action" type="button" onClick={() => onToggleStatus(moduleKey, row)} aria-label="Cambiar estado" title="Activar / desactivar">
                  <Power size={17} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ) : null}
        />
      ) : null}
    </section>
  );
}

export default ModulePage;
