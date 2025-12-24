/**
 * RF015 - ROLES Y PERMISOS - CONTROL INTERNO DE GESTIÓN
 * 
 * Módulo sincronizado con el sistema general de Roles y Permisos
 * Fuente de datos: /utils/rolesPermisosSync.ts
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Diciembre 2025
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, ShieldCheck, ShieldAlert, Users, User, Key, Lock,
  Unlock, Eye, Edit, Trash2, Plus, X, Check, Search, Filter,
  Settings, AlertCircle, CheckCircle, Clock, Save, Copy, Info
} from 'lucide-react';
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { InputSIGL } from '../gestion-legal/design-system/InputSIGL';
import { toast } from 'sonner@2.0.3';
import { 
  obtenerRolesPorCategoria, 
  obtenerPermisosRolModulo,
  obtenerModulosPorCategoria,
  tienePermiso,
  type Rol as RolSync,
  type Permiso as PermisoSync
} from '../../../utils/rolesPermisosSync';

// Avatar simple para mostrar iniciales
const Avatar = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`flex items-center justify-center rounded-full ${className}`}>{children}</div>
);

const AvatarFallback = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div className="w-full h-full flex items-center justify-center text-sm font-semibold rounded-full" style={style}>
    {children}
  </div>
);

// ============ TIPOS ============

type RolSistema = 'Jefe OCI' | 'Auditor Líder' | 'Auditor Operativo' | 'Área Auditada' | 'Administrador';

interface Permiso {
  id: string;
  modulo: string;
  funcionalidad: string;
  descripcion: string;
  nivelAcceso: 'Lectura' | 'Escritura' | 'Aprobación' | 'Eliminación';
}

interface Rol {
  id: string;
  nombre: RolSistema;
  descripcion: string;
  color: string;
  icono: string;
  usuariosCount: number;
  permisos: string[]; // IDs de permisos
  esEditable: boolean;
  fechaCreacion: string;
  ultimaModificacion: string;
}

interface UsuarioRol {
  id: string;
  nombre: string;
  correo: string;
  iniciales: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA';
  numeroIdentificacion: string;
  cargo: string;
  rolId: string;
  rolNombre: RolSistema;
  territorial?: string;
  activo: boolean;
  fechaAsignacion: string;
}

// ============ PERMISOS DEL SISTEMA ============

const PERMISOS_SISTEMA: Permiso[] = [
  // PLAN ANUAL
  {
    id: 'perm-001',
    modulo: 'Plan Anual',
    funcionalidad: 'Crear Plan Anual',
    descripcion: 'Crear nuevo plan anual de auditoría',
    nivelAcceso: 'Escritura'
  },
  {
    id: 'perm-002',
    modulo: 'Plan Anual',
    funcionalidad: 'Aprobar Plan Anual',
    descripcion: 'Aprobar plan anual de auditoría',
    nivelAcceso: 'Aprobación'
  },
  {
    id: 'perm-003',
    modulo: 'Plan Anual',
    funcionalidad: 'Ver Plan Anual',
    descripcion: 'Visualizar plan anual de auditoría',
    nivelAcceso: 'Lectura'
  },
  {
    id: 'perm-004',
    modulo: 'Plan Anual',
    funcionalidad: 'Editar Plan Anual',
    descripcion: 'Modificar plan anual de auditoría',
    nivelAcceso: 'Escritura'
  },

  // PROGRAMA ANUAL
  {
    id: 'perm-005',
    modulo: 'Programa Anual',
    funcionalidad: 'Crear Programa',
    descripcion: 'Crear programa anual de auditorías',
    nivelAcceso: 'Escritura'
  },
  {
    id: 'perm-006',
    modulo: 'Programa Anual',
    funcionalidad: 'Asignar Auditores',
    descripcion: 'Asignar auditores a auditorías programadas',
    nivelAcceso: 'Escritura'
  },
  {
    id: 'perm-007',
    modulo: 'Programa Anual',
    funcionalidad: 'Ver Programa',
    descripcion: 'Visualizar programa anual',
    nivelAcceso: 'Lectura'
  },

  // AUDITORÍAS
  {
    id: 'perm-008',
    modulo: 'Auditorías',
    funcionalidad: 'Iniciar Auditoría',
    descripcion: 'Iniciar proceso de auditoría',
    nivelAcceso: 'Escritura'
  },
  {
    id: 'perm-009',
    modulo: 'Auditorías',
    funcionalidad: 'Ejecutar Auditoría',
    descripcion: 'Ejecutar actividades de auditoría',
    nivelAcceso: 'Escritura'
  },
  {
    id: 'perm-010',
    modulo: 'Auditorías',
    funcionalidad: 'Registrar Hallazgos',
    descripcion: 'Registrar hallazgos de auditoría',
    nivelAcceso: 'Escritura'
  },
  {
    id: 'perm-011',
    modulo: 'Auditorías',
    funcionalidad: 'Generar Informes',
    descripcion: 'Generar informes de auditoría',
    nivelAcceso: 'Escritura'
  },
  {
    id: 'perm-012',
    modulo: 'Auditorías',
    funcionalidad: 'Aprobar Informes',
    descripcion: 'Aprobar informes de auditoría',
    nivelAcceso: 'Aprobación'
  },
  {
    id: 'perm-013',
    modulo: 'Auditorías',
    funcionalidad: 'Ver Auditorías',
    descripcion: 'Visualizar auditorías',
    nivelAcceso: 'Lectura'
  },

  // PLANES DE MEJORAMIENTO
  {
    id: 'perm-014',
    modulo: 'Planes Mejoramiento',
    funcionalidad: 'Crear Plan',
    descripcion: 'Crear plan de mejoramiento',
    nivelAcceso: 'Escritura'
  },
  {
    id: 'perm-015',
    modulo: 'Planes Mejoramiento',
    funcionalidad: 'Cargar Evidencias',
    descripcion: 'Cargar evidencias de seguimiento',
    nivelAcceso: 'Escritura'
  },
  {
    id: 'perm-016',
    modulo: 'Planes Mejoramiento',
    funcionalidad: 'Validar Evidencias',
    descripcion: 'Validar evidencias cargadas',
    nivelAcceso: 'Aprobación'
  },
  {
    id: 'perm-017',
    modulo: 'Planes Mejoramiento',
    funcionalidad: 'Ver Planes',
    descripcion: 'Visualizar planes de mejoramiento',
    nivelAcceso: 'Lectura'
  },

  // EXPEDIENTE DIGITAL
  {
    id: 'perm-018',
    modulo: 'Expediente Digital',
    funcionalidad: 'Subir Documentos',
    descripcion: 'Subir documentos al expediente',
    nivelAcceso: 'Escritura'
  },
  {
    id: 'perm-019',
    modulo: 'Expediente Digital',
    funcionalidad: 'Eliminar Documentos',
    descripcion: 'Eliminar documentos del expediente',
    nivelAcceso: 'Eliminación'
  },
  {
    id: 'perm-020',
    modulo: 'Expediente Digital',
    funcionalidad: 'Ver Documentos',
    descripcion: 'Visualizar documentos del expediente',
    nivelAcceso: 'Lectura'
  },

  // CONFIGURACIÓN
  {
    id: 'perm-021',
    modulo: 'Configuración',
    funcionalidad: 'Gestionar Usuarios',
    descripcion: 'Crear, editar y eliminar usuarios',
    nivelAcceso: 'Escritura'
  },
  {
    id: 'perm-022',
    modulo: 'Configuración',
    funcionalidad: 'Gestionar Roles',
    descripcion: 'Crear, editar y eliminar roles',
    nivelAcceso: 'Escritura'
  },
  {
    id: 'perm-023',
    modulo: 'Configuración',
    funcionalidad: 'Ver Auditoría de Cambios',
    descripcion: 'Visualizar log de auditoría',
    nivelAcceso: 'Lectura'
  }
];

// ============ ROLES DEL SISTEMA ============

const ROLES_SISTEMA: Rol[] = [
  {
    id: 'rol-001',
    nombre: 'Jefe OCI',
    descripcion: 'Jefe de la Oficina de Control Interno. Control total del sistema.',
    color: '#DC2626',
    icono: '👔',
    usuariosCount: 1,
    permisos: PERMISOS_SISTEMA.map(p => p.id), // Todos los permisos
    esEditable: false,
    fechaCreacion: '01/01/2025',
    ultimaModificacion: '01/01/2025'
  },
  {
    id: 'rol-002',
    nombre: 'Auditor Líder',
    descripcion: 'Auditor líder de equipos de auditoría. Gestiona auditorías completas.',
    color: '#003DA5',
    icono: '👨‍💼',
    usuariosCount: 4,
    permisos: [
      'perm-003', 'perm-004', 'perm-005', 'perm-006', 'perm-007',
      'perm-008', 'perm-009', 'perm-010', 'perm-011', 'perm-012', 'perm-013',
      'perm-014', 'perm-016', 'perm-017',
      'perm-018', 'perm-020'
    ],
    esEditable: true,
    fechaCreacion: '01/01/2025',
    ultimaModificacion: '15/01/2025'
  },
  {
    id: 'rol-003',
    nombre: 'Auditor Operativo',
    descripcion: 'Auditor operativo. Ejecuta actividades de auditoría bajo supervisión.',
    color: '#3B82F6',
    icono: '👤',
    usuariosCount: 8,
    permisos: [
      'perm-003', 'perm-007',
      'perm-009', 'perm-010', 'perm-013',
      'perm-017',
      'perm-018', 'perm-020'
    ],
    esEditable: true,
    fechaCreacion: '01/01/2025',
    ultimaModificacion: '10/01/2025'
  },
  {
    id: 'rol-004',
    nombre: 'Área Auditada',
    descripcion: 'Personal del área auditada. Carga evidencias de planes de mejoramiento.',
    color: '#10B981',
    icono: '📋',
    usuariosCount: 25,
    permisos: [
      'perm-013', 'perm-015', 'perm-017', 'perm-018', 'perm-020'
    ],
    esEditable: true,
    fechaCreacion: '01/01/2025',
    ultimaModificacion: '05/01/2025'
  },
  {
    id: 'rol-005',
    nombre: 'Administrador',
    descripcion: 'Administrador del sistema. Gestiona configuración y usuarios.',
    color: '#8B5CF6',
    icono: '⚙️',
    usuariosCount: 2,
    permisos: [
      'perm-003', 'perm-007', 'perm-013', 'perm-017', 'perm-020',
      'perm-021', 'perm-022', 'perm-023'
    ],
    esEditable: false,
    fechaCreacion: '01/01/2025',
    ultimaModificacion: '01/01/2025'
  }
];

// ============ USUARIOS CON ROLES ============

const USUARIOS_ROL_MOCK: UsuarioRol[] = [
  {
    id: 'usr-001',
    nombre: 'Fernando Ávila García',
    correo: 'fernando.avila@esap.edu.co',
    iniciales: 'FA',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '80123456',
    cargo: 'Jefe Oficina Control Interno',
    rolId: 'rol-001',
    rolNombre: 'Jefe OCI',
    activo: true,
    fechaAsignacion: '01/01/2025'
  },
  {
    id: 'usr-002',
    nombre: 'Catalina Rubio Silva',
    correo: 'catalina.rubio@esap.edu.co',
    iniciales: 'CR',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '52987654',
    cargo: 'Auditor Líder',
    rolId: 'rol-002',
    rolNombre: 'Auditor Líder',
    activo: true,
    fechaAsignacion: '05/01/2025'
  },
  {
    id: 'usr-003',
    nombre: 'Lucila Villamil Torres',
    correo: 'lucila.villamil@esap.edu.co',
    iniciales: 'LV',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '46123456',
    cargo: 'Auditor Líder',
    rolId: 'rol-002',
    rolNombre: 'Auditor Líder',
    activo: true,
    fechaAsignacion: '05/01/2025'
  },
  {
    id: 'usr-004',
    nombre: 'William Alonso Pérez',
    correo: 'william.alonso@esap.edu.co',
    iniciales: 'WA',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '79456789',
    cargo: 'Auditor',
    rolId: 'rol-003',
    rolNombre: 'Auditor Operativo',
    activo: true,
    fechaAsignacion: '10/01/2025'
  },
  {
    id: 'usr-005',
    nombre: 'Alexandra Gómez López',
    correo: 'alexandra.gomez@esap.edu.co',
    iniciales: 'AG',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '52345678',
    cargo: 'Auditor',
    rolId: 'rol-003',
    rolNombre: 'Auditor Operativo',
    activo: true,
    fechaAsignacion: '10/01/2025'
  },
  {
    id: 'usr-006',
    nombre: 'Roberto Torres Sánchez',
    correo: 'roberto.torres@esap.edu.co',
    iniciales: 'RT',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '75123456',
    cargo: 'Jefe Gestión Financiera',
    rolId: 'rol-004',
    rolNombre: 'Área Auditada',
    activo: true,
    fechaAsignacion: '15/01/2025'
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function RolesYPermisos() {
  const [vistaActiva, setVistaActiva] = useState<'roles' | 'usuarios' | 'matriz'>('roles');
  const [roles] = useState<Rol[]>(ROLES_SISTEMA);
  const [usuarios] = useState<UsuarioRol[]>(USUARIOS_ROL_MOCK);
  const [permisos] = useState<Permiso[]>(PERMISOS_SISTEMA);
  const [rolSeleccionado, setRolSeleccionado] = useState<Rol | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<RolSistema | 'Todos'>('Todos');
  const [mostrarEditarRol, setMostrarEditarRol] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filtrar usuarios
  const usuariosFiltrados = usuarios.filter(usr => {
    const cumpleBusqueda = usr.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          usr.correo.toLowerCase().includes(busqueda.toLowerCase()) ||
                          usr.numeroIdentificacion.includes(busqueda);
    const cumpleRol = filtroRol === 'Todos' || usr.rolNombre === filtroRol;
    return cumpleBusqueda && cumpleRol;
  });

  // Agrupar permisos por módulo
  const permisosPorModulo = permisos.reduce((acc, permiso) => {
    if (!acc[permiso.modulo]) {
      acc[permiso.modulo] = [];
    }
    acc[permiso.modulo].push(permiso);
    return acc;
  }, {} as Record<string, Permiso[]>);

  const handleAsignarRol = (usuarioId: string, rolId: string) => {
    toast.success('Rol asignado correctamente');
  };

  const handleEliminarUsuario = (usuarioId: string) => {
    toast.error('¿Eliminar usuario del sistema?');
  };

  const handleTogglePermiso = (rolId: string, permisoId: string) => {
    toast.success('Permiso actualizado');
  };

  return (
    <div className="space-y-6">
      {/* BANNER DE SINCRONIZACIÓN */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm text-gray-900 mb-1">
              Sistema Sincronizado con Gestión de Personas
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Los roles y permisos de Control Interno están integrados con el módulo principal de 
              <span className="font-semibold text-blue-700"> Roles y Permisos de Gestión de Personas</span>. 
              Todos los cambios se reflejan automáticamente en ambos sistemas. Los roles específicos de Control Interno 
              (Jefe OCI, Auditor Líder, Auditor Operativo, Área Auditada) son gestionados de forma centralizada 
              y se sincronizan con el sistema general de seguridad de ESAP.
            </p>
          </div>
        </div>
      </div>

      {/* HEADER MEJORADO */}
      <div className="bg-gradient-to-r from-red-50 via-white to-red-50 rounded-xl p-6 border border-red-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                Roles y Permisos
                <BadgeSIGL variant="default" className="text-xs">RBAC</BadgeSIGL>
              </h1>
              <p className="text-sm text-gray-600">
                Control de acceso basado en roles - Sistema de seguridad ESAP
              </p>
            </div>
          </div>

          {/* Selector de vista */}
          <div className="flex gap-2">
            <ButtonSIGL
              variant={vistaActiva === 'roles' ? 'primary' : 'secondary'}
              onClick={() => setVistaActiva('roles')}
              className="gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Roles
            </ButtonSIGL>
            <ButtonSIGL
              variant={vistaActiva === 'usuarios' ? 'primary' : 'secondary'}
              onClick={() => setVistaActiva('usuarios')}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              Usuarios
              <BadgeSIGL variant="outline" className="text-xs">{usuarios.length}</BadgeSIGL>
            </ButtonSIGL>
            <ButtonSIGL
              variant={vistaActiva === 'matriz' ? 'primary' : 'secondary'}
              onClick={() => setVistaActiva('matriz')}
              className="gap-2"
            >
              <Key className="w-4 h-4" />
              Matriz
            </ButtonSIGL>
          </div>
        </div>
      </div>

      {/* ESTADÍSTICAS MEJORADAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <CardSIGL className="p-5 bg-gradient-to-br from-blue-50 to-white border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-blue-100">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
              </div>
              <BadgeSIGL variant="info" className="text-xs">Activos</BadgeSIGL>
            </div>
            <p className="text-3xl font-black text-gray-900 mb-1">{roles.length}</p>
            <p className="text-xs text-gray-600">Roles del Sistema</p>
          </CardSIGL>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <CardSIGL className="p-5 bg-gradient-to-br from-green-50 to-white border-green-200">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-green-100">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <BadgeSIGL variant="success" className="text-xs">100%</BadgeSIGL>
            </div>
            <p className="text-3xl font-black text-gray-900 mb-1">{usuarios.length}</p>
            <p className="text-xs text-gray-600">Usuarios Activos</p>
          </CardSIGL>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <CardSIGL className="p-5 bg-gradient-to-br from-purple-50 to-white border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-purple-100">
                <Key className="w-6 h-6 text-purple-600" />
              </div>
              <BadgeSIGL variant="default" className="text-xs">Total</BadgeSIGL>
            </div>
            <p className="text-3xl font-black text-gray-900 mb-1">{permisos.length}</p>
            <p className="text-xs text-gray-600">Permisos Disponibles</p>
          </CardSIGL>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <CardSIGL className="p-5 bg-gradient-to-br from-yellow-50 to-white border-yellow-200">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-yellow-100">
                <Settings className="w-6 h-6 text-yellow-600" />
              </div>
              <BadgeSIGL variant="warning" className="text-xs">Grupos</BadgeSIGL>
            </div>
            <p className="text-3xl font-black text-gray-900 mb-1">
              {Object.keys(permisosPorModulo).length}
            </p>
            <p className="text-xs text-gray-600">Módulos del Sistema</p>
          </CardSIGL>
        </motion.div>
      </div>

      {/* VISTA ROLES */}
      {vistaActiva === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {roles.map((rol) => (
            <CardSIGL key={rol.id} className="p-6 border-l-4" style={{ borderLeftColor: rol.color }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="p-3 rounded-lg text-2xl"
                    style={{ background: `${rol.color}20` }}
                  >
                    {rol.icono}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-gray-900">{rol.nombre}</h3>
                    <p className="text-sm text-gray-600">{rol.descripcion}</p>
                  </div>
                </div>
                {rol.esEditable && (
                  <ButtonSIGL
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRolSeleccionado(rol);
                      setMostrarEditarRol(true);
                    }}
                  >
                    <Edit className="w-3 h-3" />
                  </ButtonSIGL>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Usuarios asignados:</span>
                  <BadgeSIGL style={{ background: rol.color }}>{rol.usuariosCount}</BadgeSIGL>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Permisos otorgados:</span>
                  <BadgeSIGL variant="outline">{rol.permisos.length}</BadgeSIGL>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Última modificación:</span>
                  <span className="text-xs text-gray-500">{rol.ultimaModificacion}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <ButtonSIGL
                  size="sm"
                  variant="outline"
                  onClick={() => setRolSeleccionado(rol)}
                  className="w-full"
                >
                  Ver Permisos Detallados
                </ButtonSIGL>
              </div>
            </CardSIGL>
          ))}
        </div>
      )}

      {/* VISTA USUARIOS */}
      {vistaActiva === 'usuarios' && (
        <>
          <CardSIGL className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <InputSIGL
                  placeholder="Buscar usuarios..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>

              <select
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Todos">Todos los roles</option>
                {roles.map(rol => (
                  <option key={rol.id} value={rol.nombre}>{rol.nombre}</option>
                ))}
              </select>
            </div>
          </CardSIGL>

          <CardSIGL>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Usuario</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Identificación</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Cargo</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Rol</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {usuariosFiltrados.map((usuario) => {
                    const rol = roles.find(r => r.id === usuario.rolId);
                    return (
                      <tr key={usuario.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback
                                style={{ background: rol?.color + '20', color: rol?.color }}
                              >
                                {usuario.iniciales}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-sm text-gray-900">{usuario.nombre}</p>
                              <p className="text-xs text-gray-500">{usuario.correo}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-700">
                            {usuario.tipoIdentificacion} {usuario.numeroIdentificacion}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-700">{usuario.cargo}</p>
                        </td>
                        <td className="px-4 py-3">
                          <BadgeSIGL style={{ background: rol?.color }}>
                            {rol?.icono} {usuario.rolNombre}
                          </BadgeSIGL>
                        </td>
                        <td className="px-4 py-3">
                          <BadgeSIGL className={usuario.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {usuario.activo ? 'Activo' : 'Inactivo'}
                          </BadgeSIGL>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <ButtonSIGL size="sm" variant="outline">
                              <Edit className="w-3 h-3" />
                            </ButtonSIGL>
                            <ButtonSIGL size="sm" variant="ghost" onClick={() => handleEliminarUsuario(usuario.id)}>
                              <Trash2 className="w-3 h-3" />
                            </ButtonSIGL>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardSIGL>
        </>
      )}

      {/* VISTA MATRIZ DE PERMISOS */}
      {vistaActiva === 'matriz' && (
        <CardSIGL className="p-6">
          <div className="mb-6">
            <h2 className="font-black text-lg text-gray-900 mb-2">Matriz de Permisos</h2>
            <p className="text-sm text-gray-600">
              Vista completa de permisos por rol y módulo del sistema
            </p>
          </div>

          <div className="space-y-6">
            {Object.entries(permisosPorModulo).map(([modulo, permisosModulo]) => (
              <div key={modulo}>
                <h3 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" style={{ color: '#003DA5' }} />
                  {modulo}
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 border-r">
                          Funcionalidad
                        </th>
                        {roles.map(rol => (
                          <th
                            key={rol.id}
                            className="px-4 py-2 text-center text-xs font-bold border-r"
                            style={{ color: rol.color }}
                          >
                            {rol.icono} {rol.nombre}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {permisosModulo.map(permiso => (
                        <tr key={permiso.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3 border-r">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {permiso.funcionalidad}
                              </p>
                              <p className="text-xs text-gray-500">{permiso.descripcion}</p>
                            </div>
                          </td>
                          {roles.map(rol => {
                            const tienePermiso = rol.permisos.includes(permiso.id);
                            return (
                              <td key={rol.id} className="px-4 py-3 text-center border-r">
                                <div className="flex justify-center">
                                  {tienePermiso ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                  ) : (
                                    <X className="w-5 h-5 text-gray-300" />
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </CardSIGL>
      )}

      {/* PANEL DE DETALLES DE ROL */}
      {rolSeleccionado && !mostrarEditarRol && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="p-3 rounded-lg text-2xl"
                    style={{ background: `${rolSeleccionado.color}20` }}
                  >
                    {rolSeleccionado.icono}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900">
                      {rolSeleccionado.nombre}
                    </h2>
                    <p className="text-sm text-gray-600">{rolSeleccionado.descripcion}</p>
                  </div>
                </div>
                <ButtonSIGL
                  variant="ghost"
                  onClick={() => setRolSeleccionado(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </ButtonSIGL>
              </div>
            </div>

            <div className="p-6">
              <h3 className="font-bold text-sm text-gray-900 mb-4">
                Permisos Otorgados ({rolSeleccionado.permisos.length})
              </h3>

              <div className="space-y-4">
                {Object.entries(permisosPorModulo).map(([modulo, permisosModulo]) => {
                  const permisosRol = permisosModulo.filter(p =>
                    rolSeleccionado.permisos.includes(p.id)
                  );

                  if (permisosRol.length === 0) return null;

                  return (
                    <div key={modulo}>
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">{modulo}</h4>
                      <div className="space-y-2 ml-4">
                        {permisosRol.map(permiso => (
                          <div
                            key={permiso.id}
                            className="flex items-start gap-2 text-sm"
                          >
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-gray-900">{permiso.funcionalidad}</p>
                              <p className="text-xs text-gray-500">{permiso.descripcion}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}