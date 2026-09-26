import { useEffect, useState } from 'react';
import { Pencil, Plus, Power, X } from 'lucide-react';
import { apiRequest } from '../../api/client';
import DataTable from '../ui/DataTable';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';

const columns = [
  ['placa', 'Placa'],
  ['vehiculo', 'Vehiculo', (_, row) => [row.marca, row.modelo, row.anio].filter(Boolean).join(' ') || 'Sin dato'],
  ['tipo_vehiculo', 'Tipo'],
  ['color', 'Color'],
  ['kilometraje_actual', 'Kilometraje'],
  ['estado', 'Estado']
];

// Vehiculos de un cliente, abierto desde la accion "Ver vehiculos" del modulo Clientes.
// Crear/editar/cambiar estado reutilizan los modales de App; al guardar, App cambia
// reloadKey y la lista se vuelve a cargar.
function ClienteVehiculosModal({
  cliente,
  token,
  reloadKey,
  canCreate,
  canEdit,
  canStatus,
  onClose,
  onCreate,
  onEdit,
  onToggleStatus,
  onRequestError
}) {
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    setLoading(true);
    setError('');
    apiRequest(`/clientes/${cliente.id}/vehiculos`, { token })
      .then((data) => {
        if (!ignore) setVehiculos(data.vehiculos || []);
      })
      .catch((err) => {
        if (!ignore) setError(onRequestError(err));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [cliente.id, onRequestError, reloadKey, retryKey, token]);

  const title = `Vehiculos de ${cliente.nombre}`;

  return (
    <div className="modal-layer" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h2>{title}</h2>
            {!loading && !error ? (
              <span className="modal-step-indicator">
                {vehiculos.length === 1 ? '1 vehiculo' : `${vehiculos.length} vehiculos`}
              </span>
            ) : null}
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar" title="Cerrar">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="cliente-vehiculos-body">
          {canCreate ? (
            <div className="cliente-vehiculos-toolbar">
              <button className="primary-button compact-button" type="button" onClick={() => onCreate(cliente)}>
                <Plus size={18} aria-hidden="true" />
                Nuevo vehiculo
              </button>
            </div>
          ) : null}

          {loading ? <EmptyState text="Cargando vehiculos..." /> : null}
          {error ? <ErrorState text={error} onRetry={() => setRetryKey((current) => current + 1)} /> : null}
          {!loading && !error ? (
            vehiculos.length ? (
              <DataTable
                rows={vehiculos}
                columns={columns}
                actions={canEdit || canStatus ? (row) => (
                  <div className="row-actions">
                    {canEdit ? (
                      <button className="icon-button table-action" type="button" onClick={() => onEdit(row)} aria-label="Editar y fotos" title="Editar y fotos">
                        <Pencil size={17} aria-hidden="true" />
                      </button>
                    ) : null}
                    {canStatus && row.estado ? (
                      <button className="icon-button table-action" type="button" onClick={() => onToggleStatus(row)} aria-label="Cambiar estado" title="Activar / desactivar">
                        <Power size={17} aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              />
            ) : (
              <EmptyState text="Este cliente aun no tiene vehiculos registrados" />
            )
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default ClienteVehiculosModal;
