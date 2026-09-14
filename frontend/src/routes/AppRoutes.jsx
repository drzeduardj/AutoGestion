import DashboardPage from '../pages/DashboardPage';
import FacturacionPage from '../pages/FacturacionPage';
import MecanicoPage from '../pages/MecanicoPage';
import ModulePage from '../pages/ModulePage';
import RecepcionPage from '../pages/RecepcionPage';
import ReportesPage from '../pages/ReportesPage';

function AppRoutes({ activeModule, ...props }) {
  if (activeModule === 'dashboard') {
    return <DashboardPage {...props} />;
  }

  if (activeModule === 'mecanico') {
    return <MecanicoPage {...props} />;
  }

  if (activeModule === 'facturacion') {
    return <FacturacionPage {...props} />;
  }

  if (activeModule === 'reportes') {
    return <ReportesPage {...props} />;
  }

  if (activeModule === 'recepcion') {
    return <RecepcionPage {...props} />;
  }

  return <ModulePage moduleKey={activeModule} {...props} />;
}

export default AppRoutes;
