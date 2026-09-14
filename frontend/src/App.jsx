import { useCallback, useEffect, useMemo, useState } from 'react';
import { Menu, RefreshCcw } from 'lucide-react';
import { apiRequest, crudRequest, isForbiddenError, isSessionError } from './api/client';
import logoImage from './assets/logo.svg';
import LoginScreen from './components/auth/LoginScreen';
import ConfirmModal from './components/forms/ConfirmModal';
import CrudModal from './components/forms/CrudModal';
import VehiculoModal from './components/forms/VehiculoModal';
import StatusModal from './components/forms/StatusModal';
import StockMovementModal from './components/forms/StockMovementModal';
import Sidebar from './components/layout/Sidebar';
import NotificationCenter from './components/ui/NotificationCenter';
import Toast from './components/ui/Toast';
import { estadosGenerales } from './constants/app';
import { hasRole, moduleConfig } from './config/moduleConfig';
import { useCatalogs } from './hooks/useCatalogs';
import { useModuleData } from './hooks/useModuleData';
import AppRoutes from './routes/AppRoutes';
import { modules, moduleTitles } from './routes/modules';
import { normalizeVisitStatus } from './utils/formatters';
import { clearSession, getSessionExpirationMs, readSession } from './utils/session';

const getVisibleModules = (session) => {
  const role = session?.user?.rol;
  return modules.filter((module) => module.roles.includes(role));
};

const getDefaultModuleKey = (session) => {
  const visible = getVisibleModules(session);

  if (session?.user?.rol === 'Mecanico') {
    return visible.find((module) => module.key === 'mecanico')?.key || visible[0]?.key || '';
  }

  return visible[0]?.key || '';
};

const initialSession = readSession();

function App() {
  const [session, setSession] = useState(initialSession);
  const [activeModule, setActiveModule] = useState(() => getDefaultModuleKey(initialSession));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [modal, setModal] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [stockModal, setStockModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [authNotice, setAuthNotice] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const visibleModules = useMemo(() => getVisibleModules(session), [session]);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    setModal(null);
    setStatusModal(null);
    setConfirmModal(null);
    setNotificationsOpen(false);
    setNotifications([]);
    setUnreadNotifications(0);
    setActiveModule('');
    setAuthNotice('');
  }, []);

  const handleSessionExpired = useCallback((notice = 'Tu sesion expiro. Ingresa nuevamente para continuar.') => {
    clearSession();
    setSession(null);
    setModal(null);
    setStatusModal(null);
    setConfirmModal(null);
    setNotificationsOpen(false);
    setNotifications([]);
    setUnreadNotifications(0);
    setActiveModule('');
    setAuthNotice(notice);
  }, []);

  const handleRequestError = useCallback((error) => {
    if (isSessionError(error)) {
      handleSessionExpired();
      return 'Sesion expirada. Ingresa nuevamente.';
    }

    if (isForbiddenError(error)) {
      return 'No tienes permiso para realizar esta accion.';
    }

    return error?.message || 'No se pudo completar la accion.';
  }, [handleSessionExpired]);

  const { catalogs, catalogLoading } = useCatalogs(session, reloadKey, handleSessionExpired);
  const {
    moduleData,
    setModuleData,
    loading,
    error
  } = useModuleData(activeModule, session, reloadKey, handleSessionExpired);

  const loadNotificationSummary = useCallback(async () => {
    if (!session?.token) return;

    try {
      const payload = await apiRequest('/notificaciones/resumen', { token: session.token });
      setUnreadNotifications(payload.no_leidas || 0);
    } catch (err) {
      const message = handleRequestError(err);
      if (!isForbiddenError(err)) {
        setToast({ text: message, tone: 'danger' });
        window.setTimeout(() => setToast(null), 2800);
      }
    }
  }, [handleRequestError, session?.token]);

  const loadNotifications = useCallback(async () => {
    if (!session?.token) return;

    setNotificationsLoading(true);
    try {
      const payload = await apiRequest('/notificaciones?limit=30', { token: session.token });
      setNotifications(payload.notificaciones || []);
      setUnreadNotifications(payload.no_leidas || 0);
    } catch (err) {
      const message = handleRequestError(err);
      if (!isForbiddenError(err)) {
        setToast({ text: message, tone: 'danger' });
        window.setTimeout(() => setToast(null), 2800);
      }
    } finally {
      setNotificationsLoading(false);
    }
  }, [handleRequestError, session?.token]);

  useEffect(() => {
    if (!session) return;

    const expirationMs = getSessionExpirationMs(session);

    if (!expirationMs) return undefined;

    const delay = expirationMs - Date.now();

    if (delay <= 0) {
      handleSessionExpired();
      return undefined;
    }

    const timer = window.setTimeout(() => handleSessionExpired(), delay);

    return () => window.clearTimeout(timer);
  }, [handleSessionExpired, session]);

  useEffect(() => {
    if (!session) return;

    const fallback = getDefaultModuleKey(session);

    if (!fallback) {
      handleSessionExpired('Tu usuario no tiene un rol permitido para esta aplicacion.');
      return;
    }

    if (fallback && !visibleModules.some((module) => module.key === activeModule)) {
      setActiveModule(fallback);
    }
  }, [activeModule, handleSessionExpired, session, visibleModules]);

  useEffect(() => {
    if (!session) return undefined;

    loadNotificationSummary();
    const timer = window.setInterval(loadNotificationSummary, 60000);

    return () => window.clearInterval(timer);
  }, [loadNotificationSummary, session]);

  if (!session) {
    return (
      <LoginScreen
        notice={authNotice}
        onLogin={(nextSession) => {
          setAuthNotice('');
          setSession(nextSession);
          setActiveModule(getDefaultModuleKey(nextSession));
        }}
      />
    );
  }

  if (!activeModule || !visibleModules.some((module) => module.key === activeModule)) {
    return <EmptyShell onLogout={logout} />;
  }

  const refresh = () => {
    if (!visibleModules.some((module) => module.key === activeModule)) {
      setActiveModule(getDefaultModuleKey(session));
      return;
    }

    setModuleData((current) => {
      const next = { ...current };
      delete next[activeModule];
      return next;
    });
    setReloadKey((current) => current + 1);
    loadNotificationSummary();
  };

  const showToast = (text, tone = 'success') => {
    setToast({ text, tone });
    window.setTimeout(() => setToast(null), 2800);
  };

  const markNotificationRead = async (notificationId) => {
    try {
      const payload = await apiRequest(`/notificaciones/${notificationId}/leida`, {
        token: session.token,
        method: 'PATCH'
      });
      setNotifications((current) => current.map((item) => (
        item.id === notificationId ? { ...item, leida: true, fecha_leida: new Date().toISOString() } : item
      )));
      setUnreadNotifications(payload.no_leidas || 0);
    } catch (err) {
      showToast(handleRequestError(err), 'danger');
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      const payload = await apiRequest('/notificaciones/leer-todas', {
        token: session.token,
        method: 'PATCH'
      });
      setNotifications((current) => current.map((item) => ({
        ...item,
        leida: true,
        fecha_leida: item.fecha_leida || new Date().toISOString()
      })));
      setUnreadNotifications(payload.no_leidas || 0);
    } catch (err) {
      showToast(handleRequestError(err), 'danger');
    }
  };

  const openCreate = (moduleKey) => {
    const config = moduleConfig[moduleKey];

    if (!visibleModules.some((module) => module.key === moduleKey) || !hasRole(session, config?.createRoles)) {
      showToast('No tienes permiso para crear registros en este modulo', 'danger');
      return;
    }

    setFormError('');
    setModal({ mode: 'create', moduleKey, row: {} });
  };

  const openEdit = (moduleKey, row) => {
    const config = moduleConfig[moduleKey];

    if (!visibleModules.some((module) => module.key === moduleKey) || !hasRole(session, config?.editRoles)) {
      showToast('No tienes permiso para editar este registro', 'danger');
      return;
    }

    setFormError('');
    setModal({ mode: 'edit', moduleKey, row });
  };

  const openStockMovement = (row) => {
    if (!hasRole(session, moduleConfig.inventario?.stockRoles)) {
      showToast('No tienes permiso para mover el stock', 'danger');
      return;
    }
    setStockModal(row);
  };

  const submitCrud = async (payload) => {
    if (!modal) return;

    const config = moduleConfig[modal.moduleKey];

    if (!visibleModules.some((module) => module.key === modal.moduleKey)) {
      setFormError('No tienes permiso para este modulo');
      return;
    }

    if (!hasRole(session, modal.mode === 'create' ? config?.createRoles : config?.editRoles)) {
      setFormError('No tienes permiso para guardar este registro');
      return;
    }

    const method = modal.mode === 'create' ? 'POST' : 'PUT';
    const path = modal.mode === 'create' ? config.path : `${config.path}/${modal.row.id}`;

    setSaving(true);
    setFormError('');
    try {
      await crudRequest({ path, token: session.token, method, body: payload });
      setModal(null);
      showToast('Registro guardado correctamente');
      refresh();
    } catch (err) {
      setFormError(handleRequestError(err));
    } finally {
      setSaving(false);
    }
  };

  const executeStatusToggle = async (moduleKey, row, nextEstado) => {
    const config = moduleConfig[moduleKey];

    if (!visibleModules.some((module) => module.key === moduleKey) || !hasRole(session, config?.statusRoles)) {
      showToast('No tienes permiso para cambiar este estado', 'danger');
      setConfirmModal(null);
      return;
    }

    setSaving(true);
    try {
      await crudRequest({
        path: `${config.path}/${row.id}/estado`,
        token: session.token,
        method: 'PATCH',
        body: { estado: normalizeVisitStatus(nextEstado) }
      });
      showToast('Estado actualizado');
      refresh();
    } catch (err) {
      showToast(handleRequestError(err), 'danger');
    } finally {
      setSaving(false);
      setConfirmModal(null);
    }
  };

  const toggleStatus = async (moduleKey, row) => {
    const config = moduleConfig[moduleKey];

    if (!visibleModules.some((module) => module.key === moduleKey) || !hasRole(session, config?.statusRoles)) {
      showToast('No tienes permiso para cambiar este estado', 'danger');
      return;
    }

    const options = config.statusOptions || estadosGenerales;

    if (!options.includes('Activo')) {
      setStatusModal({ moduleKey, row, estado: row.estado || options[0], observaciones: '' });
      return;
    }

    const nextEstado = row.estado === 'Activo' ? 'Inactivo' : 'Activo';
    setConfirmModal({
      title: 'Confirmar cambio',
      message: `Se cambiara el estado de este registro a ${nextEstado}.`,
      action: () => executeStatusToggle(moduleKey, row, nextEstado)
    });
  };

  const submitStatus = async (event) => {
    event.preventDefault();
    if (!statusModal) return;

    const config = moduleConfig[statusModal.moduleKey];

    if (!visibleModules.some((module) => module.key === statusModal.moduleKey) || !hasRole(session, config?.statusRoles)) {
      showToast('No tienes permiso para cambiar este estado', 'danger');
      setStatusModal(null);
      return;
    }

    setSaving(true);
    try {
      await crudRequest({
        path: `${config.path}/${statusModal.row.id}/estado`,
        token: session.token,
        method: 'PATCH',
        body: {
          estado: normalizeVisitStatus(statusModal.estado),
          observaciones: statusModal.observaciones || undefined
        }
      });
      setStatusModal(null);
      showToast('Estado actualizado');
      refresh();
    } catch (err) {
      showToast(handleRequestError(err), 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        items={visibleModules}
        activeModule={activeModule}
        onSelect={(moduleKey) => {
          if (!visibleModules.some((module) => module.key === moduleKey)) {
            showToast('No tienes permiso para abrir este modulo', 'danger');
            return;
          }

          setActiveModule(moduleKey);
          setSearch('');
        }}
        user={session.user}
        onLogout={() => setConfirmModal({
          title: 'Cerrar sesion',
          message: 'Se cerrara la sesion en este equipo.',
          action: logout
        })}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-only" type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu" title="Abrir menu">
            <Menu size={20} aria-hidden="true" />
          </button>
          <div className="topbar-brand">
            <span className="topbar-logo">
              <img src={logoImage} alt="Miguel Expert Collision" />
            </span>
            <div className="topbar-title">
              <h1>{moduleTitles[activeModule] || 'AutoGestion'}</h1>
              <p>
                {session.user?.rol === 'Mecanico'
                  ? 'Trabajo asignado'
                  : catalogLoading ? 'Cargando catalogos' : 'Operacion del taller'}
              </p>
            </div>
          </div>
          <button className="secondary-button" type="button" onClick={refresh}>
            <RefreshCcw size={17} aria-hidden="true" />
            Actualizar
          </button>
          <NotificationCenter
            open={notificationsOpen}
            loading={notificationsLoading}
            count={unreadNotifications}
            notifications={notifications}
            onToggle={() => {
              const nextOpen = !notificationsOpen;
              setNotificationsOpen(nextOpen);
              if (nextOpen) loadNotifications();
            }}
            onClose={() => setNotificationsOpen(false)}
            onRefresh={loadNotifications}
            onRead={markNotificationRead}
            onReadAll={markAllNotificationsRead}
          />
        </header>

        <AppRoutes
          activeModule={activeModule}
          session={session}
          data={moduleData[activeModule]}
          loading={loading}
          error={error}
          search={search}
          onSearch={setSearch}
          onCreate={openCreate}
          onEdit={openEdit}
          onToggleStatus={toggleStatus}
          onStockMovement={openStockMovement}
          onRefresh={refresh}
          showToast={showToast}
          onRequestError={handleRequestError}
        />
      </main>

      {modal && modal.moduleKey === 'vehiculos' ? (
        <VehiculoModal
          modal={modal}
          catalogs={catalogs}
          token={session.token}
          onClose={() => setModal(null)}
          onSaved={refresh}
          onRequestError={handleRequestError}
          showToast={showToast}
        />
      ) : null}
      {modal && modal.moduleKey !== 'vehiculos' ? (
        <CrudModal
          modal={modal}
          catalogs={catalogs}
          saving={saving}
          error={formError}
          onClose={() => setModal(null)}
          onSubmit={submitCrud}
        />
      ) : null}
      {statusModal ? (
        <StatusModal
          statusModal={statusModal}
          saving={saving}
          onChange={setStatusModal}
          onClose={() => setStatusModal(null)}
          onSubmit={submitStatus}
        />
      ) : null}
      {stockModal ? (
        <StockMovementModal
          producto={stockModal}
          token={session.token}
          onClose={() => setStockModal(null)}
          onSaved={refresh}
          showToast={showToast}
          onRequestError={handleRequestError}
        />
      ) : null}
      <ConfirmModal
        confirm={confirmModal}
        saving={saving}
        onCancel={() => setConfirmModal(null)}
        onConfirm={() => confirmModal?.action?.()}
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

function EmptyShell({ onLogout }) {
  return (
    <main className="login-shell">
      <section className="login-panel" aria-label="Sesion sin modulo disponible">
        <h1>MIGUEL EXPERT COLLISION</h1>
        <p>No hay un modulo disponible para este usuario.</p>
        <button className="primary-button" type="button" onClick={onLogout}>
          Cerrar sesion
        </button>
      </section>
    </main>
  );
}

export default App;
