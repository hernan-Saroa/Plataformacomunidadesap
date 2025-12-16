/**
 * RF015 - ROLES Y PERMISOS
 * Sistema de control de acceso con SSO, permisos granulares y auditoría completa
 * Módulo de Gestión de Personas - ESAP
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, Users, Lock, Key, Eye, Edit, Trash2, Plus, Search,
  Settings, CheckCircle, XCircle, AlertTriangle, MoreVertical,
  ChevronDown, ChevronRight, Copy, Download, Upload, Activity,
  Clock, UserCheck, UserX, Filter, Star, Database, FileText,
  Calendar, Mail, Phone, Building2, Globe, LogIn, LogOut,
  History, Award, Ban, CheckSquare, X, Save, RefreshCw
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

type TipoRol = 'Sistema' | 'Personalizado';
type EstadoRol = 'Activo' | 'Inactivo';

type PermisoAccion = 'crear' | 'leer' | 'actualizar' | 'eliminar' | 'aprobar' | 'exportar';

interface Permiso {
  id: string;
  modulo: string;
  acciones: PermisoAccion[];
  descripcion: string;
}

interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: TipoRol;
  estado: EstadoRol;
  usuariosAsignados: number;
  permisos: Permiso[];
  color: string;
  icono: string;
  creadoPor?: string;
  fechaCreacion?: string;
  modificadoPor?: string;
  fechaModificacion?: string;
}

interface Usuario {
  id: string;
  nombreCompleto: string;
  email: string;
  documento: string;
  cargo: string;
  area: string;
  roles: string[]; // IDs de roles
  estado: 'Activo' | 'Inactivo';
  ultimoAcceso?: string;
  autenticacionSSO: boolean;
  requiere2FA: boolean;
}

interface EventoAuditoria {
  id: string;
  timestamp: string;
  usuario: string;
  accion: string;
  modulo: string;
  detalles: string;
  ipAddress: string;
  exito: boolean;
}

// ============ DATOS MOCK ============

const MODULOS_SISTEMA = [
  'Dashboard Ejecutivo',
  'Gestión de Personas',
  'Roles y Permisos',
  'Control Interno - Plan Anual',
  'Control Interno - Auditorías',
  'Control Interno - Hallazgos',
  'Control Interno - Planes de Mejoramiento',
  'Control Interno - Seguimiento',
  'Control Interno - Informes de Ley',
  'Control Interno - Gestión Documental',
  'Reportes y Análisis',
  'Configuración del Sistema'
];

const ROLES_CONTROL_INTERNO: Rol[] = [
  {
    id: 'rol-admin-oci',
    nombre: 'Administrador',
    descripcion: 'Acceso total al sistema, gestión de usuarios y configuración',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 5,
    color: '#EF4444',
    icono: '👑',
    permisos: MODULOS_SISTEMA.map(modulo => ({
      id: `perm-${modulo}`,
      modulo,
      acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'],
      descripcion: 'Acceso total al módulo'
    })),
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },
  {
    id: 'rol-auditor',
    nombre: 'Auditor',
    descripcion: 'Gestión de auditorías asignadas, creación de hallazgos e informes',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 2,
    color: '#3B82F6',
    icono: '🔍',
    permisos: [
      {
        id: 'perm-dashboard',
        modulo: 'Dashboard Ejecutivo',
        acciones: ['leer'],
        descripcion: 'Visualización de dashboard'
      },
      {
        id: 'perm-plan-anual',
        modulo: 'Control Interno - Plan Anual',
        acciones: ['leer', 'exportar'],
        descripcion: 'Solo visualización del plan anual'
      },
      {
        id: 'perm-auditorias',
        modulo: 'Control Interno - Auditorías',
        acciones: ['crear', 'leer', 'actualizar', 'exportar'],
        descripcion: 'Gestión completa de auditorías asignadas'
      },
      {
        id: 'perm-hallazgos',
        modulo: 'Control Interno - Hallazgos',
        acciones: ['crear', 'leer', 'actualizar', 'exportar'],
        descripcion: 'Gestión de hallazgos'
      },
      {
        id: 'perm-planes',
        modulo: 'Control Interno - Planes de Mejoramiento',
        acciones: ['leer', 'exportar'],
        descripcion: 'Visualización de planes de mejoramiento'
      },
      {
        id: 'perm-informes',
        modulo: 'Control Interno - Informes de Ley',
        acciones: ['crear', 'leer', 'exportar'],
        descripcion: 'Generación de informes'
      },
      {
        id: 'perm-documental',
        modulo: 'Control Interno - Gestión Documental',
        acciones: ['crear', 'leer', 'actualizar', 'exportar'],
        descripcion: 'Gestión de documentación'
      },
      {
        id: 'perm-reportes',
        modulo: 'Reportes y Análisis',
        acciones: ['leer', 'exportar'],
        descripcion: 'Acceso a reportes'
      }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },
  {
    id: 'rol-consulta',
    nombre: 'Consulta',
    descripcion: 'Visualización de reportes y dashboards, sin capacidad de edición',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 1,
    color: '#10B981',
    icono: '📖',
    permisos: [
      {
        id: 'perm-dashboard',
        modulo: 'Dashboard Ejecutivo',
        acciones: ['leer'],
        descripcion: 'Visualización de reportes y dashboards'
      },
      {
        id: 'perm-plan-anual',
        modulo: 'Control Interno - Plan Anual',
        acciones: ['leer'],
        descripcion: 'Solo visualización'
      },
      {
        id: 'perm-auditorias',
        modulo: 'Control Interno - Auditorías',
        acciones: ['leer'],
        descripcion: 'Solo visualización'
      },
      {
        id: 'perm-hallazgos',
        modulo: 'Control Interno - Hallazgos',
        acciones: ['leer'],
        descripcion: 'Solo visualización'
      },
      {
        id: 'perm-planes',
        modulo: 'Control Interno - Planes de Mejoramiento',
        acciones: ['leer'],
        descripcion: 'Solo visualización'
      },
      {
        id: 'perm-informes',
        modulo: 'Control Interno - Informes de Ley',
        acciones: ['leer'],
        descripcion: 'Solo visualización'
      },
      {
        id: 'perm-documental',
        modulo: 'Control Interno - Gestión Documental',
        acciones: ['leer'],
        descripcion: 'Solo visualización de documentos'
      },
      {
        id: 'perm-reportes',
        modulo: 'Reportes y Análisis',
        acciones: ['leer'],
        descripcion: 'Acceso a reportes generales'
      }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },
  {
    id: 'rol-area-auditada',
    nombre: 'Área Auditada',
    descripcion: 'Acceso solo a planes de mejoramiento propios y carga de evidencias',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 1,
    color: '#F59E0B',
    icono: '📋',
    permisos: [
      {
        id: 'perm-hallazgos',
        modulo: 'Control Interno - Hallazgos',
        acciones: ['leer'],
        descripcion: 'Solo visualización de hallazgos de su área'
      },
      {
        id: 'perm-planes',
        modulo: 'Control Interno - Planes de Mejoramiento',
        acciones: ['crear', 'leer', 'actualizar'],
        descripcion: 'Acceso solo a planes de su área'
      },
      {
        id: 'perm-documental',
        modulo: 'Control Interno - Gestión Documental',
        acciones: ['crear', 'leer', 'actualizar'],
        descripcion: 'Cargue de evidencias de implementación'
      }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  }
];

const MOCK_USUARIOS: Usuario[] = [
  {
    id: 'user-001',
    nombreCompleto: 'Mario Osvaldo Bernal Rodríguez',
    email: 'mario.bernal@esap.edu.co',
    documento: '52123456',
    cargo: 'Jefe Oficina de Control Interno',
    area: 'Control Interno',
    roles: ['rol-admin-oci'],
    estado: 'Activo',
    ultimoAcceso: '2025-12-15 08:30',
    autenticacionSSO: true,
    requiere2FA: true
  },
  {
    id: 'user-002',
    nombreCompleto: 'Sandra Montero',
    email: 'sandra.montero@esap.edu.co',
    documento: '63987654',
    cargo: 'Profesional Especializado OCI',
    area: 'Control Interno',
    roles: ['rol-auditor'],
    estado: 'Activo',
    ultimoAcceso: '2025-12-15 07:45',
    autenticacionSSO: true,
    requiere2FA: true
  },
  {
    id: 'user-003',
    nombreCompleto: 'María Pérez González',
    email: 'maria.perez@esap.edu.co',
    documento: '41234567',
    cargo: 'Jefe Oficina Jurídica',
    area: 'Oficina Jurídica',
    roles: ['rol-area-auditada'],
    estado: 'Activo',
    ultimoAcceso: '2025-12-14 16:20',
    autenticacionSSO: true,
    requiere2FA: false
  }
];

const MOCK_EVENTOS_AUDITORIA: EventoAuditoria[] = [
  {
    id: 'evt-001',
    timestamp: '2025-12-15 08:30:15',
    usuario: 'Mario Osvaldo Bernal Rodríguez',
    accion: 'Inicio de sesión (SSO)',
    modulo: 'Autenticación',
    detalles: 'Autenticación exitosa vía Active Directory',
    ipAddress: '192.168.1.10',
    exito: true
  },
  {
    id: 'evt-002',
    timestamp: '2025-12-15 08:25:42',
    usuario: 'Sandra Montero',
    accion: 'Modificación de permisos',
    modulo: 'Roles y Permisos',
    detalles: 'Agregado permiso "exportar" al rol Auditor',
    ipAddress: '192.168.1.11',
    exito: true
  },
  {
    id: 'evt-003',
    timestamp: '2025-12-14 17:05:30',
    usuario: 'María Pérez González',
    accion: 'Intento de acceso denegado',
    modulo: 'Control Interno - Auditorías',
    detalles: 'Usuario sin permisos suficientes',
    ipAddress: '192.168.1.25',
    exito: false
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function RolesYPermisos() {
  const [vistaActual, setVistaActual] = useState<'roles' | 'usuarios' | 'auditoria'>('roles');
  const [roles, setRoles] = useState<Rol[]>(ROLES_CONTROL_INTERNO);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | TipoRol>('Todos');
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | EstadoRol>('Todos');
  
  // Modales
  const [modalCrearRol, setModalCrearRol] = useState(false);
  const [modalEditarRol, setModalEditarRol] = useState(false);
  const [modalVerPermisos, setModalVerPermisos] = useState(false);
  const [modalAsignarUsuarios, setModalAsignarUsuarios] = useState(false);
  const [rolSeleccionado, setRolSeleccionado] = useState<Rol | null>(null);

  // Filtrar roles
  const rolesFiltrados = roles.filter(rol => {
    const cumpleBusqueda = rol.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          rol.descripcion.toLowerCase().includes(busqueda.toLowerCase());
    const cumpleTipo = filtroTipo === 'Todos' || rol.tipo === filtroTipo;
    const cumpleEstado = filtroEstado === 'Todos' || rol.estado === filtroEstado;
    return cumpleBusqueda && cumpleTipo && cumpleEstado;
  });

  // Estadísticas
  const stats = {
    totalRoles: roles.length,
    rolesSistema: roles.filter(r => r.tipo === 'Sistema').length,
    rolesPersonalizados: roles.filter(r => r.tipo === 'Personalizado').length,
    rolesActivos: roles.filter(r => r.estado === 'Activo').length,
    totalUsuarios: roles.reduce((sum, r) => sum + r.usuariosAsignados, 0)
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Roles y Permisos
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Administra roles de sistema y asigna permisos granulares
          </p>
        </div>

        <Button onClick={() => setModalCrearRol(true)} style={{ background: '#003DA5' }}>
          <Plus className="w-4 h-4 mr-2" />
          Crear Rol
        </Button>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-2 border-b">
        <button
          onClick={() => setVistaActual('roles')}
          className={`px-4 py-2 font-bold border-b-2 transition-colors ${
            vistaActual === 'roles'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Shield className="w-4 h-4 inline mr-2" />
          Lista de Roles
        </button>
        <button
          onClick={() => setVistaActual('usuarios')}
          className={`px-4 py-2 font-bold border-b-2 transition-colors ${
            vistaActual === 'usuarios'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Usuarios Asignados
        </button>
        <button
          onClick={() => setVistaActual('auditoria')}
          className={`px-4 py-2 font-bold border-b-2 transition-colors ${
            vistaActual === 'auditoria'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Activity className="w-4 h-4 inline mr-2" />
          Auditoría de Accesos
        </button>
      </div>

      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#3B82F6' }}>
          <p className="text-xs text-gray-600">Total Roles</p>
          <p className="text-2xl font-black text-gray-900">{stats.totalRoles}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#10B981' }}>
          <p className="text-xs text-gray-600">Roles Sistema</p>
          <p className="text-2xl font-black text-green-600">{stats.rolesSistema}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#8B5CF6' }}>
          <p className="text-xs text-gray-600">Personalizados</p>
          <p className="text-2xl font-black text-purple-600">{stats.rolesPersonalizados}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#F59E0B' }}>
          <p className="text-xs text-gray-600">Activos</p>
          <p className="text-2xl font-black text-amber-600">{stats.rolesActivos}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#6B7280' }}>
          <p className="text-xs text-gray-600">Total Usuarios</p>
          <p className="text-2xl font-black text-gray-900">{stats.totalUsuarios}</p>
        </Card>
      </div>

      {/* CONTENIDO */}
      <AnimatePresence mode="wait">
        {vistaActual === 'roles' && (
          <VistaListaRoles
            key="roles"
            roles={rolesFiltrados}
            busqueda={busqueda}
            onBusquedaChange={setBusqueda}
            filtroTipo={filtroTipo}
            onFiltroTipoChange={setFiltroTipo}
            filtroEstado={filtroEstado}
            onFiltroEstadoChange={setFiltroEstado}
            onVerPermisos={(rol) => {
              setRolSeleccionado(rol);
              setModalVerPermisos(true);
            }}
            onEditarRol={(rol) => {
              setRolSeleccionado(rol);
              setModalEditarRol(true);
            }}
            onAsignarUsuarios={(rol) => {
              setRolSeleccionado(rol);
              setModalAsignarUsuarios(true);
            }}
          />
        )}

        {vistaActual === 'usuarios' && (
          <VistaUsuariosAsignados
            key="usuarios"
            usuarios={MOCK_USUARIOS}
            roles={roles}
          />
        )}

        {vistaActual === 'auditoria' && (
          <VistaAuditoriaAccesos
            key="auditoria"
            eventos={MOCK_EVENTOS_AUDITORIA}
          />
        )}
      </AnimatePresence>

      {/* MODALES */}
      <AnimatePresence>
        {modalCrearRol && (
          <ModalCrearRol
            onCrear={(nuevoRol) => {
              setRoles([...roles, nuevoRol]);
              setModalCrearRol(false);
              toast.success('Rol creado exitosamente');
            }}
            onCerrar={() => setModalCrearRol(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalVerPermisos && rolSeleccionado && (
          <ModalVerPermisos
            rol={rolSeleccionado}
            onCerrar={() => setModalVerPermisos(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ VISTA: LISTA DE ROLES ============

function VistaListaRoles({ roles, busqueda, onBusquedaChange, filtroTipo, onFiltroTipoChange, filtroEstado, onFiltroEstadoChange, onVerPermisos, onEditarRol, onAsignarUsuarios }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* FILTROS */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Buscar por nombre o descripción
            </label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => onBusquedaChange(e.target.value)}
              placeholder="Buscar..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Todos los tipos
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => onFiltroTipoChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todos">Todos los tipos</option>
              <option value="Sistema">Sistema</option>
              <option value="Personalizado">Personalizado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Todos los estados
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => onFiltroEstadoChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todos">Todos los estados</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>
      </Card>

      {/* LISTA DE ROLES */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b" style={{ background: '#F9FAFB' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900">
              Lista de Roles
            </h3>
            <p className="text-sm text-gray-600">
              Mostrando {roles.length} de {roles.length} resultados
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: '#F3F4F6' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">ROL</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">TIPO</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">USUARIOS</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">PERMISOS</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">ESTADO</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {roles.map((rol: Rol) => (
                <RolRow
                  key={rol.id}
                  rol={rol}
                  onVerPermisos={onVerPermisos}
                  onEditarRol={onEditarRol}
                  onAsignarUsuarios={onAsignarUsuarios}
                />
              ))}
            </tbody>
          </table>
        </div>

        {roles.length === 0 && (
          <div className="p-12 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No se encontraron roles</p>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

// ============ COMPONENTE: FILA DE ROL ============

function RolRow({ rol, onVerPermisos, onEditarRol, onAsignarUsuarios }: any) {
  const [expandido, setExpandido] = useState(false);

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
              style={{ background: rol.color + '20' }}
            >
              {rol.icono}
            </div>
            <div>
              <p className="font-bold text-gray-900">{rol.nombre}</p>
              <p className="text-sm text-gray-500">{rol.descripcion}</p>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <Badge
            style={{
              background: rol.tipo === 'Sistema' ? '#DBEAFE' : '#F3E8FF',
              color: rol.tipo === 'Sistema' ? '#1E40AF' : '#6B21A8'
            }}
          >
            {rol.tipo}
          </Badge>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="font-bold text-gray-900">{rol.usuariosAsignados}</span>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-400" />
            <span className="font-bold text-gray-900">{rol.permisos.length}</span>
          </div>
        </td>
        <td className="px-6 py-4">
          <Badge
            style={{
              background: rol.estado === 'Activo' ? '#D1FAE5' : '#FEE2E2',
              color: rol.estado === 'Activo' ? '#065F46' : '#991B1B'
            }}
          >
            <div className="flex items-center gap-1">
              {rol.estado === 'Activo' ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <XCircle className="w-3 h-3" />
              )}
              {rol.estado}
            </div>
          </Badge>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpandido(!expandido)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Ver detalles"
            >
              {expandido ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
            <button
              onClick={() => onVerPermisos(rol)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Ver permisos"
            >
              <Eye className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => onEditarRol(rol)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Editar rol"
            >
              <Edit className="w-4 h-4 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Más opciones">
              <MoreVertical className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </td>
      </tr>

      {/* DETALLES EXPANDIDOS */}
      <AnimatePresence>
        {expandido && (
          <tr>
            <td colSpan={6} className="px-6 py-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="py-4 border-t" style={{ background: '#F9FAFB' }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-bold text-gray-700 mb-2">Información del Rol</p>
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-600">
                          <strong>Creado por:</strong> {rol.creadoPor || 'Sistema'}
                        </p>
                        <p className="text-gray-600">
                          <strong>Fecha creación:</strong> {rol.fechaCreacion}
                        </p>
                        {rol.modificadoPor && (
                          <>
                            <p className="text-gray-600">
                              <strong>Modificado por:</strong> {rol.modificadoPor}
                            </p>
                            <p className="text-gray-600">
                              <strong>Fecha modificación:</strong> {rol.fechaModificacion}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-gray-700 mb-2">Acciones Rápidas</p>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => onAsignarUsuarios(rol)} variant="outline" size="sm">
                          <UserCheck className="w-4 h-4 mr-2" />
                          Asignar Usuarios
                        </Button>
                        <Button variant="outline" size="sm">
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicar Rol
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Exportar
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* LISTA DE PERMISOS */}
                  <div className="mt-4">
                    <p className="text-sm font-bold text-gray-700 mb-2">
                      Permisos Asignados ({rol.permisos.length})
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {rol.permisos.slice(0, 6).map((permiso: Permiso) => (
                        <div key={permiso.id} className="p-2 bg-white rounded border text-sm">
                          <p className="font-bold text-gray-900 truncate">{permiso.modulo}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {permiso.acciones.map(accion => (
                              <Badge key={accion} variant="outline" className="text-xs">
                                {accion}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {rol.permisos.length > 6 && (
                      <Button
                        onClick={() => onVerPermisos(rol)}
                        variant="link"
                        size="sm"
                        className="mt-2 p-0 h-auto"
                      >
                        Ver todos los {rol.permisos.length} permisos →
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

// ============ VISTA: USUARIOS ASIGNADOS ============

function VistaUsuariosAsignados({ usuarios, roles }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="overflow-hidden">
        <div className="p-6 border-b" style={{ background: '#F9FAFB' }}>
          <h3 className="text-lg font-black text-gray-900">
            Usuarios con Roles Asignados
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {usuarios.length} usuarios activos en el sistema
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: '#F3F4F6' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">USUARIO</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">ROLES</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">SSO</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">2FA</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">ÚLTIMO ACCESO</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">ESTADO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {usuarios.map((usuario: Usuario) => (
                <tr key={usuario.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-gray-900">{usuario.nombreCompleto}</p>
                      <p className="text-sm text-gray-500">{usuario.email}</p>
                      <p className="text-sm text-gray-500">{usuario.cargo} - {usuario.area}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {usuario.roles.map(rolId => {
                        const rol = roles.find((r: Rol) => r.id === rolId);
                        return rol ? (
                          <Badge
                            key={rolId}
                            style={{ background: rol.color + '20', color: rol.color }}
                          >
                            {rol.nombre}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {usuario.autenticacionSSO ? (
                      <Badge style={{ background: '#D1FAE5', color: '#065F46' }}>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Activo
                      </Badge>
                    ) : (
                      <Badge style={{ background: '#FEE2E2', color: '#991B1B' }}>
                        <XCircle className="w-3 h-3 mr-1" />
                        No
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {usuario.requiere2FA ? (
                      <Badge style={{ background: '#DBEAFE', color: '#1E40AF' }}>
                        <Shield className="w-3 h-3 mr-1" />
                        Requerido
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        No
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      {usuario.ultimoAcceso || 'Nunca'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      style={{
                        background: usuario.estado === 'Activo' ? '#D1FAE5' : '#FEE2E2',
                        color: usuario.estado === 'Activo' ? '#065F46' : '#991B1B'
                      }}
                    >
                      {usuario.estado}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
}

// ============ VISTA: AUDITORÍA DE ACCESOS ============

function VistaAuditoriaAccesos({ eventos }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="overflow-hidden">
        <div className="p-6 border-b" style={{ background: '#F9FAFB' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-gray-900">
                Registro de Auditoría de Accesos
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Historial completo de accesos y acciones por usuario
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar Log
            </Button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-3">
            {eventos.map((evento: EventoAuditoria) => (
              <div
                key={evento.id}
                className="p-4 rounded-lg border"
                style={{ background: evento.exito ? '#F0FDF4' : '#FEF2F2' }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: evento.exito ? '#10B981' : '#EF4444' }}
                  >
                    {evento.exito ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      <XCircle className="w-5 h-5 text-white" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-bold text-gray-900">{evento.accion}</p>
                        <p className="text-sm text-gray-600">
                          {evento.usuario} • {evento.modulo}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{evento.timestamp}</p>
                        <p className="text-xs text-gray-500">{evento.ipAddress}</p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 italic">
                      {evento.detalles}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ============ MODALES ============

function ModalCrearRol({ onCrear, onCerrar }: any) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  return (
    <Modal titulo="Crear Nuevo Rol" onCerrar={onCerrar}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del Rol</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Auditor Senior"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Descripción</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Describe las responsabilidades de este rol..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={onCerrar} variant="outline" className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={() => {
              const nuevoRol: Rol = {
                id: `rol-${Date.now()}`,
                nombre,
                descripcion,
                tipo: 'Personalizado',
                estado: 'Activo',
                usuariosAsignados: 0,
                color: '#6B7280',
                icono: '📋',
                permisos: [],
                creadoPor: 'Admin Sistema',
                fechaCreacion: new Date().toISOString().split('T')[0]
              };
              onCrear(nuevoRol);
            }}
            disabled={!nombre || !descripcion}
            className="flex-1"
            style={{ background: '#003DA5' }}
          >
            <Save className="w-4 h-4 mr-2" />
            Crear Rol
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ModalVerPermisos({ rol, onCerrar }: any) {
  return (
    <Modal titulo={`Permisos del Rol: ${rol.nombre}`} onCerrar={onCerrar}>
      <div className="space-y-4">
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900">
            Este rol tiene acceso a <strong>{rol.permisos.length} módulos</strong> del sistema
          </p>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {rol.permisos.map((permiso: Permiso) => (
            <div key={permiso.id} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-gray-900">{permiso.modulo}</p>
                  <p className="text-sm text-gray-600">{permiso.descripcion}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {permiso.acciones.map(accion => (
                  <Badge
                    key={accion}
                    style={{
                      background: accion === 'eliminar' ? '#FEE2E2' : '#DBEAFE',
                      color: accion === 'eliminar' ? '#991B1B' : '#1E40AF'
                    }}
                  >
                    {accion}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={onCerrar} variant="outline" className="flex-1">
            Cerrar
          </Button>
          <Button className="flex-1" style={{ background: '#003DA5' }}>
            <Edit className="w-4 h-4 mr-2" />
            Editar Permisos
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ titulo, children, onCerrar }: { titulo: string; children: React.ReactNode; onCerrar: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onCerrar}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900">{titulo}</h3>
            <button
              onClick={onCerrar}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}