import { useEffect, useState } from 'react';
import { apiRequest, isSessionError } from '../api/client';
import { stripAccents } from '../utils/formatters';

const initialCatalogs = {
  clientes: [],
  vehiculos: [],
  usuarios: [],
  mecanicos: [],
  categoriasServicio: [],
  categoriasProducto: [],
  flujosTrabajo: [],
  tiposVehiculo: []
};

const catalogRequests = [
  ['clientes', '/clientes', ['Admin', 'Cajero']],
  ['vehiculos', '/vehiculos', ['Admin', 'Cajero']],
  ['tiposVehiculo', '/tipos-vehiculo', ['Admin', 'Cajero']],
  ['usuarios', '/usuarios', ['Admin']],
  ['categoriasServicio', '/categorias-servicio', ['Admin', 'Cajero']],
  ['categoriasProducto', '/categorias-producto', ['Admin', 'Cajero', 'Mecanico']],
  ['flujosTrabajo', '/flujos-trabajo', ['Admin', 'Cajero', 'Mecanico']]
];

const resourceKeys = {
  clientes: 'clientes',
  vehiculos: 'vehiculos',
  tiposVehiculo: 'tipos',
  usuarios: 'usuarios',
  categoriasServicio: 'categorias',
  categoriasProducto: 'categorias',
  flujosTrabajo: 'flujos'
};

export const useCatalogs = (session, reloadKey, onSessionExpired) => {
  const [catalogs, setCatalogs] = useState(initialCatalogs);
  const [catalogLoading, setCatalogLoading] = useState(false);

  useEffect(() => {
    if (!session) return;

    let ignore = false;
    const token = session.token;
    const role = session.user?.rol;
    const allowedRequests = catalogRequests.filter(([, , roles]) => roles.includes(role));

    setCatalogLoading(true);
    Promise.allSettled(allowedRequests.map(([key, path]) => (
      apiRequest(path, { token }).then((data) => [key, data])
    )))
      .then((results) => {
        if (ignore) return;

        const next = { ...initialCatalogs };
        results.forEach((result) => {
          if (result.status !== 'fulfilled') {
            if (isSessionError(result.reason)) {
              onSessionExpired?.();
            }

            return;
          }

          const [key, data] = result.value;
          next[key] = data[resourceKeys[key]] || [];
        });
        next.mecanicos = next.usuarios.filter((user) => stripAccents(user.rol).toLowerCase() === 'mecanico');
        setCatalogs(next);
      })
      .finally(() => {
        if (!ignore) setCatalogLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [onSessionExpired, reloadKey, session]);

  return {
    catalogs,
    catalogLoading
  };
};
