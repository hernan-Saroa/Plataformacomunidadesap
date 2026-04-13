/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ASIGNACIÓN DE ROLES Y PERMISOS - MÓDULO CONTROL INTERNO
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * IMPORTANTE: Este módulo NO crea roles ni usuarios.
 * Los roles y usuarios se gestionan desde "Gestión de Personas".
 * 
 * Aquí solo se:
 * 1. Asignan personas existentes a roles del módulo Control Interno
 * 2. Gestionan permisos específicos del módulo
 * 3. Consultan el equipo de Control Interno
 * 
 * VERSIÓN: 4.0 - PREMIUM CORREGIDA
 * ÚLTIMA ACTUALIZACIÓN: 4 Enero 2026
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, Users, Key, UserPlus, Edit2, Trash2, Eye,
  Search, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { HeaderModuloCIG } from './HeaderModuloCIG';
import { TooltipGuia } from './TooltipGuia';
import { TOOLTIPS_CONTROL_INTERNO } from './tooltips-config';

// ✅ DÍA 4: Container4K para padding adaptativo
import { Container4K } from '../../ui/container-4k';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

interface RolControlInterno {
  id: string;
  nombre: string;
  descripcion: string;
  nivel: 'JEFE_OCI' | 'PROFESIONAL_AUDITOR' | 'AUXILIAR_AUDITORIA' | 'CONSULTA';
  permisos: PermisoModulo[];
  color: string;
}

interface PersonaAsignada {
  id: string;
  personaId: string; // ID de la persona en el módulo de Personas
  nombreCompleto: string;
  email: string;
  telefono: string;
  rolAsignado: string;
  permisos: string[];
  fechaAsignacion: string;
  estado: 'ACTIVO' | 'INACTIVO';
  ultimoAcceso: string;
}

interface PermisoModulo {
  id: string;
  modulo: string;
  accion: 'leer' | 'crear' | 'editar' | 'eliminar' | 'aprobar' | 'full';
  descripcion: string;
}

type VistaActual = 'equipo' | 'permisos';

// ════════════════════════════════════════════════════════════════════════════
// DATOS MOCK - ROLES PREDEFINIDOS DEL MÓDULO
// ════════════════════════════════════════════════════════════════════════════

const ROLES_CONTROL_INTERNO: RolControlInterno[] = [
  {
    id: 'rol-jefe-oci',
    nombre: 'Jefe de Control Interno',
    descripcion: 'Control total sobre todos los módulos de Control Interno',
    nivel: 'JEFE_OCI',
    color: 'red',
    permisos: [
      { id: 'p1', modulo: 'Plan de Mejoramiento', accion: 'full', descripcion: 'Control total' },
      { id: 'p2', modulo: 'Informes de Ley', accion: 'full', descripcion: 'Control total' },
      { id: 'p3', modulo: 'Expedientes', accion: 'full', descripcion: 'Control total' },
      { id: 'p4', modulo: 'Auditorías', accion: 'full', descripcion: 'Control total' },
      { id: 'p5', modulo: 'Configuraciones', accion: 'full', descripcion: 'Control total' }
    ]
  },
  {
    id: 'rol-profesional-auditor',
    nombre: 'Profesional Auditor',
    descripcion: 'Gestión completa de auditorías y seguimiento de planes',
    nivel: 'PROFESIONAL_AUDITOR',
    color: 'blue',
    permisos: [
      { id: 'p6', modulo: 'Plan de Mejoramiento', accion: 'editar', descripcion: 'Crear y editar planes' },
      { id: 'p7', modulo: 'Informes de Ley', accion: 'editar', descripcion: 'Crear y editar informes' },
      { id: 'p8', modulo: 'Expedientes', accion: 'editar', descripcion: 'Gestionar expedientes' },
      { id: 'p9', modulo: 'Auditorías', accion: 'editar', descripcion: 'Gestionar auditorías' },
      { id: 'p10', modulo: 'Configuraciones', accion: 'leer', descripcion: 'Solo lectura' }
    ]
  },
  {
    id: 'rol-auxiliar',
    nombre: 'Auxiliar de Auditoría',
    descripcion: 'Soporte en procesos de auditoría y documentación',
    nivel: 'AUXILIAR_AUDITORIA',
    color: 'green',
    permisos: [
      { id: 'p11', modulo: 'Plan de Mejoramiento', accion: 'leer', descripcion: 'Solo lectura' },
      { id: 'p12', modulo: 'Informes de Ley', accion: 'crear', descripcion: 'Crear informes' },
      { id: 'p13', modulo: 'Expedientes', accion: 'crear', descripcion: 'Cargar documentos' },
      { id: 'p14', modulo: 'Auditorías', accion: 'leer', descripción: 'Solo lectura' }
    ]
  },
  {
    id: 'rol-consulta',
    nombre: 'Consulta',
    descripcion: 'Solo lectura de información pública del módulo',
    nivel: 'CONSULTA',
    color: 'gray',
    permisos: [
      { id: 'p15', modulo: 'Plan de Mejoramiento', accion: 'leer', descripcion: 'Solo lectura' },
      { id: 'p16', modulo: 'Informes de Ley', accion: 'leer', descripcion: 'Solo lectura' },
      { id: 'p17', modulo: 'Expedientes', accion: 'leer', descripcion: 'Solo lectura' },
      { id: 'p18', modulo: 'Auditorías', accion: 'leer', descripcion: 'Solo lectura' }
    ]
  }
];

// ════════════════════════════════════════════════════════════════════════════
// DATOS MOCK - PERSONAS ASIGNADAS AL MÓDULO
// ════════════════════════════════════════════════════════════════════════════

const EQUIPO_MOCK: PersonaAsignada[] = [
  {
    id: 'eq-1',
    personaId: 'persona-001', // ID de la persona en módulo Personas
    nombreCompleto: 'Fernando Ávila Guevara',
    email: 'fernando.avila@esap.edu.co',
    telefono: '+57 310 555 1234',
    rolAsignado: 'Jefe de Control Interno',
    permisos: ['full:all'],
    fechaAsignacion: '2024-01-15',
    estado: 'ACTIVO',
    ultimoAcceso: '2026-01-04 09:30'
  },
  {
    id: 'eq-2',
    personaId: 'persona-045',
    nombreCompleto: 'María Camila Rodríguez Torres',
    email: 'maria.rodriguez@esap.edu.co',
    telefono: '+57 315 555 5678',
    rolAsignado: 'Profesional Auditor',
    permisos: ['auditorias:write', 'planes:write', 'informes:write'],
    fechaAsignacion: '2024-03-20',
    estado: 'ACTIVO',
    ultimoAcceso: '2026-01-04 08:15'
  },
  {
    id: 'eq-3',
    personaId: 'persona-078',
    nombreCompleto: 'Carlos Andrés Gómez Silva',
    email: 'carlos.gomez@esap.edu.co',
    telefono: '+57 320 555 9012',
    rolAsignado: 'Profesional Auditor',
    permisos: ['auditorias:write', 'planes:write', 'informes:write'],
    fechaAsignacion: '2024-06-10',
    estado: 'ACTIVO',
    ultimoAcceso: '2026-01-03 17:45'
  },
  {
    id: 'eq-4',
    personaId: 'persona-112',
    nombreCompleto: 'Ana Patricia Moreno Cruz',
    email: 'ana.moreno@esap.edu.co',
    telefono: '+57 311 555 3456',
    rolAsignado: 'Auxiliar de Auditoría',
    permisos: ['expedientes:create', 'informes:create'],
    fechaAsignacion: '2024-08-05',
    estado: 'ACTIVO',
    ultimoAcceso: '2026-01-04 10:20'
  },
  {
    id: 'eq-5',
    personaId: 'persona-234',
    nombreCompleto: 'Jorge Luis Peña Ramírez',
    email: 'jorge.pena@esap.edu.co',
    telefono: '+57 318 555 7890',
    rolAsignado: 'Consulta',
    permisos: ['read:all'],
    fechaAsignacion: '2025-11-12',
    estado: 'ACTIVO',
    ultimoAcceso: '2026-01-02 14:30'
  }
];

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function RolesYPermisosModulePremium() {
  const [vistaActiva, setVistaActiva] = useState<VistaActual>('equipo');

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderModuloCIG
        titulo="Asignación de Roles y Permisos"
        subtitulo="Control Interno de Gestión"
      />

      {/* Banner Informativo */}
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="w-full px-8 py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium mb-1">
                Gestión de Accesos al Módulo de Control Interno
              </p>
              <p className="text-xs text-blue-700">
                Los roles y usuarios se crean en <span className="font-semibold">Gestión de Personas → Administración de Personas → Roles y Permisos</span>. 
                Aquí solo se asignan personas existentes al equipo de Control Interno y se gestionan sus permisos específicos del módulo.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="w-full px-8">
          <div className="flex gap-1">
            <TabButton
              active={vistaActiva === 'equipo'}
              onClick={() => setVistaActiva('equipo')}
              icon={<Users className="w-4 h-4" />}
              label="Equipo Control Interno"
              badge={EQUIPO_MOCK.length.toString()}
            />
            <TabButton
              active={vistaActiva === 'permisos'}
              onClick={() => setVistaActiva('permisos')}
              icon={<Key className="w-4 h-4" />}
              label="Matriz de Permisos"
            />
          </div>
        </div>
      </div>

      {/* Contenido */}
      <AnimatePresence mode="wait">
        <motion.div
          key={vistaActiva}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {vistaActiva === 'equipo' && <VistaEquipo />}
          {vistaActiva === 'permisos' && <VistaPermisos />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB BUTTON
// ════════════════════════════════════════════════════════════════════════════

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative px-6 py-4 flex items-center gap-2 text-sm font-medium border-b-2 transition-all
        ${active 
          ? 'border-[#1e5da8] text-[#1e5da8] bg-blue-50/50' 
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }
      `}
    >
      {icon}
      {label}
      {badge && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
          active ? 'bg-[#1e5da8] text-white' : 'bg-gray-200 text-gray-700'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA: EQUIPO CONTROL INTERNO
// ════════════════════════════════════════════════════════════════════════════

function VistaEquipo() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('TODOS');
  const [modalAsignar, setModalAsignar] = useState(false);

  const equipoFiltrado = useMemo(() => {
    let resultado = EQUIPO_MOCK;

    if (busqueda) {
      const search = busqueda.toLowerCase();
      resultado = resultado.filter(p =>
        p.nombreCompleto.toLowerCase().includes(search) ||
        p.email.toLowerCase().includes(search)
      );
    }

    if (filtroRol !== 'TODOS') {
      resultado = resultado.filter(p => p.rolAsignado === filtroRol);
    }

    return resultado;
  }, [busqueda, filtroRol]);

  const estadisticas = useMemo(() => {
    const total = EQUIPO_MOCK.length;
    const activos = EQUIPO_MOCK.filter(p => p.estado === 'ACTIVO').length;
    const porRol = ROLES_CONTROL_INTERNO.map(rol => ({
      rol: rol.nombre,
      count: EQUIPO_MOCK.filter(p => p.rolAsignado === rol.nombre).length,
      color: rol.color
    }));

    return { total, activos, porRol };
  }, []);

  const handleAsignarPersona = () => {
    setModalAsignar(true);
    
    toast.info('Asignar persona al equipo', {
      description: 'Selecciona una persona del módulo de Personas',
      duration: 2000,
    });

    console.log('👥 Asignar persona al módulo Control Interno:', {
      accion: 'abrir_selector_personas',
      moduloOrigen: 'Gestión de Personas',
      moduloDestino: 'Control Interno',
      timestamp: new Date().toISOString()
    });
  };

  return (
    <Container4K className="py-6">
      {/* Header con Título y Botón */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl text-gray-900 font-medium mb-1">Equipo de Control Interno</h2>
            <p className="text-sm text-gray-600">
              Personas asignadas al módulo con sus roles y permisos específicos
            </p>
          </div>
          <div className="flex items-center gap-3">
            <TooltipGuia {...TOOLTIPS_CONTROL_INTERNO['equipo-control-interno']} />
            <button
              onClick={handleAsignarPersona}
              className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Asignar Persona
            </button>
          </div>
        </div>
      </div>

      {/* Búsqueda y Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-[#1e5da8] text-sm"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] text-sm"
          >
            <option value="TODOS">Todos los roles</option>
            {ROLES_CONTROL_INTERNO.map(rol => (
              <option key={rol.id} value={rol.nombre}>{rol.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Equipo */}
      <div className="space-y-4">
        {equipoFiltrado.map((persona) => (
          <CardPersonaEquipo key={persona.id} persona={persona} />
        ))}

        {equipoFiltrado.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base text-gray-900 mb-2">No se encontraron personas</h3>
            <p className="text-sm text-gray-600">
              Intenta con otros criterios de búsqueda
            </p>
          </div>
        )}
      </div>

      {/* Modal Asignar Persona */}
      {modalAsignar && (
        <ModalAsignarPersona
          onClose={() => setModalAsignar(false)}
          onAsignar={() => {
            setModalAsignar(false);
            toast.success('Persona asignada exitosamente');
          }}
        />
      )}
    </Container4K>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CARD PERSONA EQUIPO
// ════════════════════════════════════════════════════════════════════════════

interface CardPersonaEquipoProps {
  persona: PersonaAsignada;
}

function CardPersonaEquipo({ persona }: CardPersonaEquipoProps) {
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [mostrarModalDetalle, setMostrarModalDetalle] = useState(false);
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  
  const rol = ROLES_CONTROL_INTERNO.find(r => r.nombre === persona.rolAsignado);

  const colorClasses = {
    red: 'bg-red-100 text-red-700 border-red-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200'
  };

  const rolColor = colorClasses[rol?.color as keyof typeof colorClasses] || colorClasses.gray;

  const handleEditarPermisos = () => {
    setMostrarModalEditar(true);
    console.log('✏️ Abrir modal Editar permisos:', {
      personaId: persona.personaId,
      nombreCompleto: persona.nombreCompleto,
      rolActual: persona.rolAsignado,
      permisosActuales: persona.permisos,
    });
  };

  const handleRemoverEquipo = () => {
    setMostrarModalEliminar(true);
    console.log('🗑️ Abrir modal Remover:', {
      personaId: persona.personaId,
      nombreCompleto: persona.nombreCompleto,
    });
  };

  const confirmarRemover = () => {
    toast.success('Persona removida', {
      description: `${persona.nombreCompleto} ha sido removido del equipo de Control Interno`,
      duration: 3000,
    });
    setMostrarModalEliminar(false);
    
    console.log('✅ Persona removida exitosamente:', {
      personaId: persona.personaId,
      nombreCompleto: persona.nombreCompleto,
      timestamp: new Date().toISOString()
    });
  };

  const handleVerDetalle = () => {
    setMostrarModalDetalle(true);
    console.log('👁️ Abrir modal Ver detalle:', {
      personaId: persona.personaId,
      nombreCompleto: persona.nombreCompleto,
      rolAsignado: persona.rolAsignado,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
    >
      <div className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            {/* Avatar */}
            <div className="w-12 h-12 bg-gradient-to-br from-[#1e5da8] to-[#2a6dbd] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-lg">
                {persona.nombreCompleto.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <h3 className="text-base text-gray-900 font-medium">{persona.nombreCompleto}</h3>
                <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${rolColor} whitespace-nowrap`}>
                  {persona.rolAsignado}
                </span>
                {persona.estado === 'ACTIVO' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm mb-3">
                <div className="min-w-0">
                  <div className="text-gray-600 text-xs mb-1">Email</div>
                  <div className="text-gray-900 truncate">{persona.email}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-gray-600 text-xs mb-1">Teléfono</div>
                  <div className="text-gray-900">{persona.telefono}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-gray-600 text-xs mb-1">Asignado</div>
                  <div className="text-gray-900">{persona.fechaAsignacion}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-gray-600 text-xs mb-1">Último acceso</div>
                  <div className="text-gray-900">{persona.ultimoAcceso}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {persona.permisos.slice(0, 5).map((permiso, idx) => (
                  <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs whitespace-nowrap">
                    {permiso}
                  </span>
                ))}
                {persona.permisos.length > 5 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs whitespace-nowrap">
                    +{persona.permisos.length - 5} más
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:flex-nowrap lg:flex-shrink-0">
            <button
              onClick={handleEditarPermisos}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-2 whitespace-nowrap"
            >
              <Edit2 className="w-4 h-4" />
              <span className="hidden sm:inline">Editar Permisos</span>
              <span className="sm:hidden">Editar</span>
            </button>
            <button
              onClick={handleVerDetalle}
              className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2 whitespace-nowrap"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Ver Detalle</span>
              <span className="sm:hidden">Ver</span>
            </button>
            <button
              onClick={handleRemoverEquipo}
              className="px-3 py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm flex-shrink-0"
              title="Remover del equipo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Editar Permisos */}
      {mostrarModalEditar && (
        <ModalEditarPermisos
          onClose={() => setMostrarModalEditar(false)}
          persona={persona}
        />
      )}

      {/* Modal Ver Detalle */}
      {mostrarModalDetalle && (
        <ModalVerDetalle
          onClose={() => setMostrarModalDetalle(false)}
          persona={persona}
        />
      )}

      {/* Modal Remover */}
      {mostrarModalEliminar && (
        <ModalRemover
          onClose={() => setMostrarModalEliminar(false)}
          onConfirmar={confirmarRemover}
          persona={persona}
        />
      )}
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA: MATRIZ DE PERMISOS
// ════════════════════════════════════════════════════════════════════════════

function VistaPermisos() {
  const modulos = ['Plan de Mejoramiento', 'Informes de Ley', 'Expedientes', 'Auditorías', 'Configuraciones'];
  const acciones = ['Leer', 'Crear', 'Editar', 'Eliminar', 'Aprobar'];

  return (
    <Container4K className="py-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h2 className="text-xl text-gray-900 font-medium mb-2">Matriz de Permisos por Rol</h2>
            <p className="text-sm text-gray-600">
              Permisos específicos del módulo de Control Interno según el rol asignado
            </p>
          </div>
          <TooltipGuia {...TOOLTIPS_CONTROL_INTERNO['matriz-permisos']} />
        </div>

        {/* Tabla de Permisos */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Módulo</th>
                {ROLES_CONTROL_INTERNO.map(rol => (
                  <th key={rol.id} className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                    {rol.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modulos.map((modulo, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-900 font-medium">{modulo}</td>
                  {ROLES_CONTROL_INTERNO.map(rol => {
                    const permiso = rol.permisos.find(p => p.modulo === modulo);
                    return (
                      <td key={rol.id} className="py-3 px-4 text-center">
                        {permiso ? (
                          <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                            permiso.accion === 'full' ? 'bg-red-100 text-red-700' :
                            permiso.accion === 'editar' ? 'bg-blue-100 text-blue-700' :
                            permiso.accion === 'crear' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {permiso.accion === 'full' ? 'Control Total' : 
                             permiso.accion === 'editar' ? 'Editar' :
                             permiso.accion === 'crear' ? 'Crear' :
                             'Leer'}
                          </span>
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Descripción de Roles */}
      <div className="grid grid-cols-2 gap-6">
        {ROLES_CONTROL_INTERNO.map(rol => (
          <div key={rol.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Shield className={`w-5 h-5 text-${rol.color}-600`} />
              <h3 className="text-base text-gray-900 font-medium">{rol.nombre}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">{rol.descripcion}</p>
            <div className="space-y-2">
              {rol.permisos.map(permiso => (
                <div key={permiso.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700">{permiso.modulo}</span>
                  <span className="text-gray-900 font-medium">{permiso.descripcion}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Container4K>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: ASIGNAR PERSONA
// ════════════════════════════════════════════════════════════════════════════

interface ModalAsignarPersonaProps {
  onClose: () => void;
  onAsignar: () => void;
}

function ModalAsignarPersona({ onClose, onAsignar }: ModalAsignarPersonaProps) {
  const [rolSeleccionado, setRolSeleccionado] = useState<string>('');
  const [busquedaPersona, setBusquedaPersona] = useState('');

  const handleAsignar = () => {
    if (!rolSeleccionado) {
      toast.error('Debes seleccionar un rol');
      return;
    }

    toast.success('Persona asignada al equipo', {
      description: `Rol: ${ROLES_CONTROL_INTERNO.find(r => r.id === rolSeleccionado)?.nombre}`,
      duration: 4000,
    });

    console.log('👥 Asignar persona al módulo Control Interno:', {
      rolSeleccionado: rolSeleccionado,
      rolNombre: ROLES_CONTROL_INTERNO.find(r => r.id === rolSeleccionado)?.nombre,
      busquedaPersona,
      accion: 'asignar',
      timestamp: new Date().toISOString()
    });

    onAsignar();
  };

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl z-10">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
          <h3 className="text-xl font-medium">Asignar Persona al Equipo de Control Interno</h3>
          <p className="text-sm text-blue-100 mt-1">
            Selecciona una persona existente del módulo de Gestión de Personas
          </p>
        </div>

        {/* Contenido */}
        <div className="px-6 py-6">
          <div className="space-y-4">
            {/* Información */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Importante</p>
                  <p className="text-xs text-blue-700">
                    Solo puedes asignar personas que ya existan en el módulo de <strong>Gestión de Personas</strong>. 
                    Si la persona no existe, primero debes crearla desde Administración de Personas.
                  </p>
                </div>
              </div>
            </div>

            {/* Búsqueda de Persona */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar Persona <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={busquedaPersona}
                  onChange={(e) => setBusquedaPersona(e.target.value)}
                  placeholder="Nombre, email o documento..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Escribe para buscar en el módulo de Gestión de Personas
              </p>
            </div>

            {/* Selección de Rol */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rol en Control Interno <span className="text-red-500">*</span>
              </label>
              <select
                value={rolSeleccionado}
                onChange={(e) => setRolSeleccionado(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
              >
                <option value="">-- Selecciona un rol --</option>
                {ROLES_CONTROL_INTERNO.map(rol => (
                  <option key={rol.id} value={rol.id}>
                    {rol.nombre} - {rol.descripcion}
                  </option>
                ))}
              </select>
            </div>

            {/* Preview de Permisos */}
            {rolSeleccionado && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Permisos del rol seleccionado:</h4>
                <div className="space-y-2">
                  {ROLES_CONTROL_INTERNO.find(r => r.id === rolSeleccionado)?.permisos.map(permiso => (
                    <div key={permiso.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700">{permiso.modulo}</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {permiso.descripcion}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleAsignar}
              className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Asignar al Equipo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: EDITAR PERMISOS
// ════════════════════════════════════════════════════════════════════════════

interface ModalEditarPermisosProps {
  onClose: () => void;
  persona: PersonaAsignada;
}

function ModalEditarPermisos({ onClose, persona }: ModalEditarPermisosProps) {
  const [permisosSeleccionados, setPermisosSeleccionados] = useState<string[]>(persona.permisos);

  const handleGuardar = () => {
    toast.success('Permisos actualizados', {
      description: `Permisos de ${persona.nombreCompleto} han sido actualizados`,
      duration: 3000,
    });
    onClose();
    
    console.log('✅ Permisos actualizados exitosamente:', {
      personaId: persona.personaId,
      nombreCompleto: persona.nombreCompleto,
      permisosNuevos: permisosSeleccionados,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl z-10">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
          <h3 className="text-xl font-medium">Editar Permisos de {persona.nombreCompleto}</h3>
          <p className="text-sm text-blue-100 mt-1">
            Selecciona los permisos que deseas asignar a esta persona
          </p>
        </div>

        {/* Contenido */}
        <div className="px-6 py-6">
          <div className="space-y-4">
            {/* Información */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Importante</p>
                  <p className="text-xs text-blue-700">
                    Solo puedes asignar permisos que estén disponibles para el rol de {persona.rolAsignado}. 
                    Si necesitas cambiar el rol, primero debes hacerlo desde la asignación de roles.
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de Permisos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permisos <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {ROLES_CONTROL_INTERNO.find(r => r.nombre === persona.rolAsignado)?.permisos.map(permiso => (
                  <div key={permiso.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={permisosSeleccionados.includes(permiso.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPermisosSeleccionados([...permisosSeleccionados, permiso.id]);
                        } else {
                          setPermisosSeleccionados(permisosSeleccionados.filter(p => p !== permiso.id));
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-gray-700">{permiso.descripcion}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: VER DETALLE
// ════════════════════════════════════════════════════════════════════════════

interface ModalVerDetalleProps {
  onClose: () => void;
  persona: PersonaAsignada;
}

function ModalVerDetalle({ onClose, persona }: ModalVerDetalleProps) {
  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl z-10">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
          <h3 className="text-xl font-medium">Detalle de {persona.nombreCompleto}</h3>
          <p className="text-sm text-blue-100 mt-1">
            Información completa de la persona asignada al equipo de Control Interno
          </p>
        </div>

        {/* Contenido */}
        <div className="px-6 py-6">
          <div className="space-y-4">
            {/* Información */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Importante</p>
                  <p className="text-xs text-blue-700">
                    Esta información es solo de lectura. Para hacer cambios, utiliza las opciones de edición disponibles.
                  </p>
                </div>
              </div>
            </div>

            {/* Detalles de Persona */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Completo
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={persona.nombreCompleto}
                  readOnly
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={persona.email}
                  readOnly
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={persona.telefono}
                  readOnly
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rol Asignado
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={persona.rolAsignado}
                  readOnly
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permisos
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={persona.permisos.join(', ')}
                  readOnly
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Asignación
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={persona.fechaAsignacion}
                  readOnly
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Último Acceso
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={persona.ultimoAcceso}
                  readOnly
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: REMOVER
// ════════════════════════════════════════════════════════════════════════════

interface ModalRemoverProps {
  onClose: () => void;
  onConfirmar: () => void;
  persona: PersonaAsignada;
}

function ModalRemover({ onClose, onConfirmar, persona }: ModalRemoverProps) {
  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl z-10">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
          <h3 className="text-xl font-medium">Remover a {persona.nombreCompleto} del Equipo</h3>
          <p className="text-sm text-blue-100 mt-1">
            ¿Estás seguro de que deseas remover a esta persona del equipo de Control Interno?
          </p>
        </div>

        {/* Contenido */}
        <div className="px-6 py-6">
          <div className="space-y-4">
            {/* Información */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Importante</p>
                  <p className="text-xs text-blue-700">
                    Esta acción no se puede deshacer. La persona será removida del equipo de Control Interno.
                  </p>
                </div>
              </div>
            </div>

            {/* Detalles de Persona */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Completo
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={persona.nombreCompleto}
                  readOnly
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={persona.email}
                  readOnly
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={persona.telefono}
                  readOnly
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rol Asignado
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={persona.rolAsignado}
                  readOnly
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permisos
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={persona.permisos.join(', ')}
                  readOnly
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Asignación
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={persona.fechaAsignacion}
                  readOnly
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Último Acceso
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={persona.ultimoAcceso}
                  readOnly
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirmar}
              className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Remover
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}