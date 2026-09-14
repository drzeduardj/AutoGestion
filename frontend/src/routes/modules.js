import {
  Boxes,
  BriefcaseBusiness,
  Car,
  ClipboardCheck,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Receipt,
  Users,
  UserRoundCog,
  Wrench
} from 'lucide-react';

export const modules = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Cajero'] },
  { key: 'usuarios', label: 'Usuarios', icon: UserRoundCog, roles: ['Admin'] },
  { key: 'clientes', label: 'Clientes', icon: Users, roles: ['Admin', 'Cajero'] },
  { key: 'vehiculos', label: 'Vehiculos', icon: Car, roles: ['Admin', 'Cajero'] },
  { key: 'visitas', label: 'Visitas', icon: ClipboardList, roles: ['Admin', 'Cajero'] },
  { key: 'recepcion', label: 'Recepcion', icon: ClipboardCheck, roles: ['Admin', 'Cajero'] },
  { key: 'servicios', label: 'Servicios', icon: BriefcaseBusiness, roles: ['Admin', 'Cajero'] },
  { key: 'inventario', label: 'Inventario', icon: Boxes, roles: ['Admin', 'Cajero', 'Mecanico'] },
  { key: 'facturacion', label: 'Facturacion', icon: Receipt, roles: ['Admin', 'Cajero'] },
  { key: 'reportes', label: 'Reportes', icon: FileText, roles: ['Admin', 'Cajero'] },
  { key: 'mecanico', label: 'Panel mecanico', icon: Wrench, roles: ['Mecanico'] }
];

export const moduleTitles = Object.fromEntries(modules.map((module) => [module.key, module.label]));

// Ayuda breve por modulo: se muestra bajo la barra para orientar a usuarios nuevos.
export const moduleHints = {
  usuarios: 'Personal del taller y su rol. Solo el Admin puede crear o editar usuarios.',
  clientes: 'Datos de contacto del cliente. Registra primero al cliente antes que su vehiculo.',
  vehiculos: 'Vehiculos de cada cliente. Al registrarlo puedes adjuntar hasta 6 fotos.',
  visitas: 'Cada ingreso al taller (orden de trabajo). Elige cliente, su vehiculo y el motivo.',
  servicios: 'Catalogo de servicios que ofrece el taller y su precio sugerido.',
  inventario: 'Productos y materiales en stock. El sistema avisa cuando el stock esta bajo.'
};
