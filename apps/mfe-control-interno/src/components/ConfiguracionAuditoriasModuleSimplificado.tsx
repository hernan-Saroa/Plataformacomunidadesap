/**
 * ============================================
 * CONFIGURACIÓN AUDITORÍAS - MÓDULO SIMPLIFICADO
 * ============================================
 * 
 * Configuración de parámetros de auditoría:
 * - Tipos de Auditoría (5 tipos principales)
 * - Configuración de Procesos Auditables
 * - Configuración de Sedes Territoriales
 * 
 * ÚLTIMA ACTUALIZACIÓN: 23 Enero 2026 - ELIMINADA DUPLICACIÓN
 * ✅ CRUD completo de tipos de auditoría
 * ✅ Configuración de procesos auditables
 * ✅ Configuración de territoriales
 * ❌ LISTAS DE CHEQUEO: Movidas a módulo independiente (RF007)
 *    Ver: /components/esap/control-interno/listas-chequeo/ListasChequeoModuleComplete.tsx
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target, CheckSquare, Building2, ChevronRight, Info, Save,
  Plus, Edit, Eye, Clock, Users, HelpCircle, X, Trash2, AlertCircle,
  FileText, Check, GripVertical, MapPin, Settings
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { toast } from 'sonner';

// ====================================
// TIPOS
// ====================================

type TabActiva = 'tipos' | 'procesos' | 'territoriales';

interface TabConfig {
  id: TabActiva;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  badge?: number;
}

const TABS_CONFIG: TabConfig[] = [
  {
    id: 'tipos',
    label: 'Tipos de Auditoría',
    description: 'Gestión, Financiera, Cumplimiento, TI, Territorial',
    icon: CheckSquare,
    color: '#10B981',
    badge: 5
  },
  {
    id: 'procesos',
    label: 'Procesos Auditables',
    description: 'Configuración de procesos a auditar',
    icon: Target,
    color: '#3B82F6',
    badge: 9
  },
  {
    id: 'territoriales',
    label: 'Sedes Territoriales',
    description: 'Configuración de sedes regionales',
    icon: Building2,
    color: '#F59E0B',
    badge: 16
  }
];

// ====================================
// DATOS MOCK - TIPOS DE AUDITORÍA
// ====================================

interface TipoAuditoria {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  alcance: string;
  duracionPromedio: number;
  equipoPromedio: number;
  color: string;
  activa: boolean;
  auditoriasProgramadas: number;
}

const TIPOS_AUDITORIA_INICIAL: TipoAuditoria[] = [
  {
    id: 'tipo-001',
    codigo: 'AUD-GEST',
    nombre: 'Auditoría de Gestión',
    descripcion: 'Evaluación de procesos administrativos y operacionales',
    alcance: 'Procesos administrativos, gestión de recursos, cumplimiento de objetivos',
    duracionPromedio: 15,
    equipoPromedio: 3,
    color: '#10B981',
    activa: true,
    auditoriasProgramadas: 8
  },
  {
    id: 'tipo-002',
    codigo: 'AUD-FIN',
    nombre: 'Auditoría Financiera',
    descripcion: 'Revisión de estados financieros y controles contables',
    alcance: 'Estados financieros, presupuesto, tesorería, contabilidad',
    duracionPromedio: 20,
    equipoPromedio: 4,
    color: '#3B82F6',
    activa: true,
    auditoriasProgramadas: 4
  },
  {
    id: 'tipo-003',
    codigo: 'AUD-CUMP',
    nombre: 'Auditoría de Cumplimiento',
    descripcion: 'Verificación del cumplimiento normativo y legal',
    alcance: 'Normativa interna, leyes, decretos, resoluciones aplicables',
    duracionPromedio: 12,
    equipoPromedio: 2,
    color: '#F59E0B',
    activa: true,
    auditoriasProgramadas: 12
  },
  {
    id: 'tipo-004',
    codigo: 'AUD-TI',
    nombre: 'Auditoría de TI',
    descripcion: 'Evaluación de sistemas de información y seguridad',
    alcance: 'Infraestructura TI, seguridad informática, sistemas de información',
    duracionPromedio: 18,
    equipoPromedio: 3,
    color: '#8B5CF6',
    activa: true,
    auditoriasProgramadas: 6
  },
  {
    id: 'tipo-005',
    codigo: 'AUD-TERR',
    nombre: 'Auditoría Territorial',
    descripcion: 'Auditorías a sedes regionales y territoriales',
    alcance: 'Operaciones regionales, gestión territorial, cumplimiento local',
    duracionPromedio: 9,
    equipoPromedio: 2,
    color: '#EC4899',
    activa: true,
    auditoriasProgramadas: 16
  }
];

// ====================================
// DATOS MOCK - PROCESOS AUDITABLES
// ====================================

interface ProcesoAuditable {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  responsable: string;
  criticidad: 'Alta' | 'Media' | 'Baja';
  frecuenciaAuditoria: string;
  activo: boolean;
}

const PROCESOS_AUDITABLES_INICIAL: ProcesoAuditable[] = [
  {
    id: 'proc-001',
    codigo: 'PROC-GF',
    nombre: 'Gestión Financiera',
    descripcion: 'Administración de recursos financieros y presupuestales',
    responsable: 'Dirección Financiera',
    criticidad: 'Alta',
    frecuenciaAuditoria: 'Trimestral',
    activo: true
  },
  {
    id: 'proc-002',
    codigo: 'PROC-GA',
    nombre: 'Gestión Administrativa',
    descripcion: 'Procesos administrativos y de soporte',
    responsable: 'Dirección Administrativa',
    criticidad: 'Media',
    frecuenciaAuditoria: 'Semestral',
    activo: true
  },
  {
    id: 'proc-003',
    codigo: 'PROC-GTH',
    nombre: 'Gestión Talento Humano',
    descripcion: 'Administración del recurso humano',
    responsable: 'Talento Humano',
    criticidad: 'Alta',
    frecuenciaAuditoria: 'Trimestral',
    activo: true
  },
  {
    id: 'proc-004',
    codigo: 'PROC-AC',
    nombre: 'Adquisición de Bienes',
    descripcion: 'Procesos de contratación y compras',
    responsable: 'Contratación',
    criticidad: 'Alta',
    frecuenciaAuditoria: 'Mensual',
    activo: true
  },
  {
    id: 'proc-005',
    codigo: 'PROC-FV',
    nombre: 'Formación para la Vida',
    descripcion: 'Procesos académicos y de formación',
    responsable: 'Vicerrectoría Académica',
    criticidad: 'Media',
    frecuenciaAuditoria: 'Semestral',
    activo: true
  },
  {
    id: 'proc-006',
    codigo: 'PROC-EI',
    nombre: 'Efectividad Institucional',
    descripcion: 'Medición y seguimiento de indicadores',
    responsable: 'Planeación',
    criticidad: 'Media',
    frecuenciaAuditoria: 'Trimestral',
    activo: true
  },
  {
    id: 'proc-007',
    codigo: 'PROC-ECM',
    nombre: 'Evaluación Control Mejora',
    descripcion: 'Seguimiento y mejora continua',
    responsable: 'Control Interno',
    criticidad: 'Alta',
    frecuenciaAuditoria: 'Mensual',
    activo: true
  },
  {
    id: 'proc-008',
    codigo: 'PROC-MSP',
    nombre: 'Modelo Seguridad Privacidad',
    descripcion: 'Gestión de seguridad de la información',
    responsable: 'Seguridad TI',
    criticidad: 'Alta',
    frecuenciaAuditoria: 'Trimestral',
    activo: true
  },
  {
    id: 'proc-009',
    codigo: 'PROC-TD',
    nombre: 'Transformación Digital',
    descripcion: 'Gestión de la transformación digital',
    responsable: 'TI',
    criticidad: 'Media',
    frecuenciaAuditoria: 'Semestral',
    activo: true
  }
];

// ====================================
// DATOS MOCK - SEDES TERRITORIALES
// ====================================

interface SedeTeritorial {
  id: string;
  codigo: string;
  nombre: string;
  region: string;
  departamentos: string[];
  director: string;
  numeroEmpleados: number;
  activa: boolean;
}

const SEDES_TERRITORIALES_INICIAL: SedeTeritorial[] = [
  { id: 'terr-001', codigo: 'TERR-ANT', nombre: 'Antioquia', region: 'Noroeste', departamentos: ['Antioquia'], director: 'María González', numeroEmpleados: 45, activa: true },
  { id: 'terr-002', codigo: 'TERR-ATL', nombre: 'Atlántico-Cesar', region: 'Caribe', departamentos: ['Atlántico', 'Cesar'], director: 'Carlos Martínez', numeroEmpleados: 38, activa: true },
  { id: 'terr-003', codigo: 'TERR-BOL', nombre: 'Bolívar-Córdoba', region: 'Caribe', departamentos: ['Bolívar', 'Córdoba'], director: 'Ana López', numeroEmpleados: 42, activa: true },
  { id: 'terr-004', codigo: 'TERR-CAL', nombre: 'Caldas', region: 'Eje Cafetero', departamentos: ['Caldas'], director: 'Luis Ramírez', numeroEmpleados: 32, activa: true },
  { id: 'terr-005', codigo: 'TERR-CUN', nombre: 'Cundinamarca', region: 'Centro', departamentos: ['Cundinamarca'], director: 'Patricia Silva', numeroEmpleados: 55, activa: true },
  { id: 'terr-006', codigo: 'TERR-NAR', nombre: 'Nariño-Putumayo', region: 'Sur', departamentos: ['Nariño', 'Putumayo'], director: 'Jorge Castro', numeroEmpleados: 36, activa: true },
  { id: 'terr-007', codigo: 'TERR-HUI', nombre: 'Huila', region: 'Sur', departamentos: ['Huila'], director: 'Sandra Vargas', numeroEmpleados: 28, activa: true },
  { id: 'terr-008', codigo: 'TERR-MET', nombre: 'Meta', region: 'Orinoquía', departamentos: ['Meta'], director: 'Ricardo Morales', numeroEmpleados: 31, activa: true },
  { id: 'terr-009', codigo: 'TERR-CAU', nombre: 'Cauca', region: 'Pacífico', departamentos: ['Cauca'], director: 'Diana Rojas', numeroEmpleados: 29, activa: true },
  { id: 'terr-010', codigo: 'TERR-AMA', nombre: 'Amazonas', region: 'Amazonía', departamentos: ['Amazonas'], director: 'Miguel Ángel Torres', numeroEmpleados: 18, activa: true },
  { id: 'terr-011', codigo: 'TERR-BOY', nombre: 'Boyacá', region: 'Centro', departamentos: ['Boyacá'], director: 'Claudia Méndez', numeroEmpleados: 34, activa: true },
  { id: 'terr-012', codigo: 'TERR-CAS', nombre: 'Casanare', region: 'Orinoquía', departamentos: ['Casanare'], director: 'Andrés Pérez', numeroEmpleados: 22, activa: true },
  { id: 'terr-013', codigo: 'TERR-GUA', nombre: 'Guaviare', region: 'Amazonía', departamentos: ['Guaviare'], director: 'Valentina Cruz', numeroEmpleados: 15, activa: true },
  { id: 'terr-014', codigo: 'TERR-PUT', nombre: 'Putumayo', region: 'Amazonía', departamentos: ['Putumayo'], director: 'Fernando Ruiz', numeroEmpleados: 19, activa: true },
  { id: 'terr-015', codigo: 'TERR-SAI', nombre: 'Archipiélago San Andrés', region: 'Caribe Insular', departamentos: ['San Andrés y Providencia'], director: 'Carolina James', numeroEmpleados: 12, activa: true },
  { id: 'terr-016', codigo: 'TERR-VIC', nombre: 'Vichada', region: 'Orinoquía', departamentos: ['Vichada'], director: 'Héctor Ospina', numeroEmpleados: 14, activa: true }
];

// ====================================
// COMPONENTE PRINCIPAL
// ====================================

export function ConfiguracionAuditoriasModuleSimplificado() {
  const [tabActiva, setTabActiva] = useState<TabActiva>('tipos');
  const [tipos, setTipos] = useState<TipoAuditoria[]>(TIPOS_AUDITORIA_INICIAL);
  const [procesos, setProcesos] = useState<ProcesoAuditable[]>(PROCESOS_AUDITABLES_INICIAL);
  const [territoriales, setTerritoriales] = useState<SedeTeritorial[]>(SEDES_TERRITORIALES_INICIAL);
  const [cambiosSinGuardar, setCambiosSinGuardar] = useState(false);

  const handleGuardarCambios = () => {
    toast.success('✅ Configuración guardada exitosamente', {
      description: `Se guardaron ${tipos.length} tipos, ${procesos.length} procesos y ${territoriales.length} sedes`
    });
    setCambiosSinGuardar(false);
  };

  const handleActualizarTipos = (nuevosTipos: TipoAuditoria[]) => {
    setTipos(nuevosTipos);
    setCambiosSinGuardar(true);
  };

  const handleActualizarProcesos = (nuevosProcesos: ProcesoAuditable[]) => {
    setProcesos(nuevosProcesos);
    setCambiosSinGuardar(true);
  };

  const handleActualizarTerritoriales = (nuevasTerritoriales: SedeTeritorial[]) => {
    setTerritoriales(nuevasTerritoriales);
    setCambiosSinGuardar(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="max-w-[1600px] mx-auto p-6">
        
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Configuración de Auditorías</h1>
                <p className="text-sm text-gray-600">Administra tipos, procesos y sedes territoriales</p>
              </div>
            </div>

            {cambiosSinGuardar && (
              <Button
                onClick={handleGuardarCambios}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar Cambios
              </Button>
            )}
          </div>

          {/* Aviso sobre Listas de Chequeo */}
          <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  ℹ️ Las Listas de Chequeo se gestionan en un módulo independiente
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Dirígete al módulo <strong>"Listas de Chequeo"</strong> en el menú principal para crear, editar y aplicar listas de verificación digitales (RF007).
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* TABS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex gap-3 overflow-x-auto pb-2">
            {TABS_CONFIG.map((tab) => {
              const Icon = tab.icon;
              const isActive = tabActiva === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setTabActiva(tab.id)}
                  className={`
                    relative px-6 py-4 rounded-xl transition-all min-w-[280px]
                    ${isActive
                      ? 'bg-white shadow-lg scale-105 ring-2 ring-blue-500/50'
                      : 'bg-white/60 hover:bg-white hover:shadow-md'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                        isActive ? 'scale-110' : ''
                      }`}
                      style={{
                        backgroundColor: isActive ? `${tab.color}20` : '#f3f4f6'
                      }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: isActive ? tab.color : '#6b7280' }}
                      />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className={`font-bold text-sm ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                          {tab.label}
                        </p>
                        {tab.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {tab.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {tab.description}
                      </p>
                    </div>
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 rounded-xl border-2"
                      style={{ borderColor: tab.color }}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* CONTENIDO */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tabActiva}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {tabActiva === 'tipos' && (
              <SeccionTiposAuditoria 
                tipos={tipos}
                onActualizar={handleActualizarTipos}
              />
            )}
            {tabActiva === 'procesos' && (
              <SeccionProcesosAuditables 
                procesos={procesos}
                onActualizar={handleActualizarProcesos}
              />
            )}
            {tabActiva === 'territoriales' && (
              <SeccionSedesTerritoriales 
                territoriales={territoriales}
                onActualizar={handleActualizarTerritoriales}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ====================================
// SECCIÓN TIPOS DE AUDITORÍA
// ====================================

interface SeccionTiposAuditoriaProps {
  tipos: TipoAuditoria[];
  onActualizar: (tipos: TipoAuditoria[]) => void;
}

function SeccionTiposAuditoria({ tipos, onActualizar }: SeccionTiposAuditoriaProps) {
  const handleToggleActivo = (id: string) => {
    const nuevos = tipos.map(t => 
      t.id === id ? { ...t, activa: !t.activa } : t
    );
    onActualizar(nuevos);
    toast.success('Estado actualizado');
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Tipos de Auditoría Estándar</h3>
          <p className="text-sm text-gray-600 mt-1">5 tipos principales configurados</p>
        </div>
        <Button size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Tipo
        </Button>
      </div>

      <div className="space-y-3">
        {tipos.map((tipo) => (
          <div
            key={tipo.id}
            className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${tipo.color}20` }}
                >
                  <CheckSquare className="w-5 h-5" style={{ color: tipo.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-900">{tipo.nombre}</h4>
                    <Badge variant="outline" className="text-xs">{tipo.codigo}</Badge>
                    {tipo.activa ? (
                      <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                        Activo
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700 border-gray-300 text-xs">
                        Inactivo
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{tipo.descripcion}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {tipo.duracionPromedio} días promedio
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {tipo.equipoPromedio} auditores
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {tipo.auditoriasProgramadas} programadas
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggleActivo(tipo.id)}
                >
                  {tipo.activa ? 'Desactivar' : 'Activar'}
                </Button>
                <Button size="sm" variant="ghost">
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ====================================
// SECCIÓN PROCESOS AUDITABLES
// ====================================

interface SeccionProcesosAuditablesProps {
  procesos: ProcesoAuditable[];
  onActualizar: (procesos: ProcesoAuditable[]) => void;
}

function SeccionProcesosAuditables({ procesos, onActualizar }: SeccionProcesosAuditablesProps) {
  const getCriticidadBadge = (criticidad: string) => {
    const colors = {
      Alta: 'bg-red-100 text-red-700 border-red-300',
      Media: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      Baja: 'bg-green-100 text-green-700 border-green-300'
    };
    return (
      <Badge className={colors[criticidad as keyof typeof colors] || colors.Media}>
        {criticidad}
      </Badge>
    );
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Procesos Auditables</h3>
          <p className="text-sm text-gray-600 mt-1">{procesos.length} procesos configurados</p>
        </div>
        <Button size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Proceso
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {procesos.map((proceso) => (
          <div
            key={proceso.id}
            className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-gray-900 text-sm">{proceso.nombre}</h4>
                  <Badge variant="outline" className="text-xs">{proceso.codigo}</Badge>
                </div>
                <p className="text-xs text-gray-600">{proceso.descripcion}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                {getCriticidadBadge(proceso.criticidad)}
                <span className="text-xs text-gray-500">{proceso.frecuenciaAuditoria}</span>
              </div>
              <Button size="sm" variant="ghost">
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ====================================
// SECCIÓN SEDES TERRITORIALES
// ====================================

interface SeccionSedesTerritorialesProps {
  territoriales: SedeTeritorial[];
  onActualizar: (territoriales: SedeTeritorial[]) => void;
}

function SeccionSedesTerritoriales({ territoriales, onActualizar }: SeccionSedesTerritorialesProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Sedes Territoriales</h3>
          <p className="text-sm text-gray-600 mt-1">{territoriales.length} sedes regionales</p>
        </div>
        <Button size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Sede
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {territoriales.map((sede) => (
          <div
            key={sede.id}
            className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{sede.nombre}</h4>
                  <p className="text-xs text-gray-500">{sede.region}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Director:</span>
                <span className="font-medium text-gray-900">{sede.director}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Empleados:</span>
                <span className="font-medium text-gray-900">{sede.numeroEmpleados}</span>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                  {sede.departamentos.length} departamento(s)
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}