/**
 * ============================================
 * CONFIGURACIÓN DEL SISTEMA - REDISEÑADA
 * ============================================
 * 
 * Nueva arquitectura de navegación con sidebar
 * Agrupa configuraciones relacionadas lógicamente
 * Reduce carga visual y mejora usabilidad
 * 
 * ESTRUCTURA:
 * 1. General: Roles, Normatividad
 * 2. Auditorías: Tipos, Listas de Chequeo
 * 3. Informes: Informes Ley, Formatos
 * 4. Notificaciones: Alertas, Correos
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Diciembre 2025
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings, Users, Shield, FileText, Calendar, Bell,
  CheckSquare, AlertTriangle, Mail, Edit, Plus, Trash2,
  Save, X, Eye, Copy, Download, Upload, Search, Filter,
  ChevronRight, Clock, Target, Activity, Database, Code,
  Layers, BookOpen, Briefcase, Award, List, BarChart3, Scale,
  Home, Building2, Sliders, Zap, Globe, Lock, ChevronLeft
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';
import { NormatividadAplicable } from './NormatividadAplicable';

// ====================================
// TIPOS
// ====================================

type SeccionPrincipal = 'general' | 'auditorias' | 'informes' | 'notificaciones';
type SubseccionGeneral = 'roles' | 'normatividad';
type SubseccionAuditorias = 'tipos' | 'listas';
type SubseccionInformes = 'informes-ley' | 'formatos';
type SubseccionNotificaciones = 'alertas' | 'correos';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  description: string;
}

interface SeccionConfig {
  id: SeccionPrincipal;
  titulo: string;
  descripcion: string;
  icono: React.ElementType;
  color: string;
  subsecciones: MenuItem[];
}

// ====================================
// CONFIGURACIÓN DE NAVEGACIÓN
// ====================================

const SECCIONES_CONFIG: SeccionConfig[] = [
  {
    id: 'general',
    titulo: 'Configuración General',
    descripcion: 'Parámetros fundamentales del sistema',
    icono: Settings,
    color: '#3B82F6',
    subsecciones: [
      {
        id: 'roles',
        label: 'Roles Decreto 648',
        icon: Shield,
        badge: 5,
        description: 'Gestión de los 5 roles oficiales'
      },
      {
        id: 'normatividad',
        label: 'Normatividad',
        icon: Scale,
        badge: 17,
        description: 'Marco normativo aplicable'
      }
    ]
  },
  {
    id: 'auditorias',
    titulo: 'Configuración de Auditorías',
    descripcion: 'Tipos, listas y parámetros de auditoría',
    icono: Target,
    color: '#10B981',
    subsecciones: [
      {
        id: 'tipos',
        label: 'Tipos de Auditoría',
        icon: CheckSquare,
        badge: 5,
        description: 'Gestión, Financiera, Cumplimiento, TI, Territorial'
      },
      {
        id: 'listas',
        label: 'Listas de Chequeo',
        icon: List,
        badge: 8,
        description: 'Plantillas de verificación estándar'
      }
    ]
  },
  {
    id: 'informes',
    titulo: 'Informes y Documentos',
    descripcion: 'Configuración de reportes y formatos',
    icono: FileText,
    color: '#8B5CF6',
    subsecciones: [
      {
        id: 'informes-ley',
        label: 'Informes de Ley',
        icon: FileText,
        badge: 3,
        description: 'Periodicidades y destinatarios obligatorios'
      },
      {
        id: 'formatos',
        label: 'Formatos de Documentos',
        icon: Layers,
        badge: 12,
        description: 'Plantillas de planes, actas e informes'
      }
    ]
  },
  {
    id: 'notificaciones',
    titulo: 'Notificaciones y Alertas',
    descripcion: 'Sistema de notificaciones automáticas',
    icono: Bell,
    color: '#F59E0B',
    subsecciones: [
      {
        id: 'alertas',
        label: 'Umbrales de Alertas',
        icon: AlertTriangle,
        badge: 4,
        description: 'Límites para activación automática'
      },
      {
        id: 'correos',
        label: 'Plantillas de Email',
        icon: Mail,
        badge: 3,
        description: 'Notificaciones por correo electrónico'
      }
    ]
  }
];

// ====================================
// DATOS MOCK (mantener los mismos)
// ====================================

interface RolDecreto648 {
  id: string;
  codigo: string;
  nombreOriginal: string;
  nombrePersonalizado: string;
  descripcion: string;
  color: string;
  icono: string;
  actividadesAsignadas: number;
  usuariosAsignados: number;
}

const ROLES_DECRETO_648: RolDecreto648[] = [
  {
    id: 'rol-001',
    codigo: 'ROL-01',
    nombreOriginal: 'Jefe Oficina Control Interno',
    nombrePersonalizado: 'Jefe Oficina Control Interno',
    descripcion: 'Máxima autoridad de la Oficina de Control Interno de Gestión',
    color: '#DC2626',
    icono: '👑',
    actividadesAsignadas: 12,
    usuariosAsignados: 1
  },
  {
    id: 'rol-002',
    codigo: 'ROL-02',
    nombreOriginal: 'Profesional Especializado',
    nombrePersonalizado: 'Profesional Especializado OCI',
    descripcion: 'Profesional con conocimientos especializados en auditoría',
    color: '#3B82F6',
    icono: '🔍',
    actividadesAsignadas: 15,
    usuariosAsignados: 3
  },
  {
    id: 'rol-003',
    codigo: 'ROL-03',
    nombreOriginal: 'Profesional Universitario',
    nombrePersonalizado: 'Profesional Universitario OCI',
    descripcion: 'Profesional de apoyo en procesos de auditoría',
    color: '#10B981',
    icono: '📋',
    actividadesAsignadas: 10,
    usuariosAsignados: 5
  },
  {
    id: 'rol-004',
    codigo: 'ROL-04',
    nombreOriginal: 'Técnico Administrativo',
    nombrePersonalizado: 'Técnico Administrativo OCI',
    descripcion: 'Apoyo técnico y administrativo',
    color: '#F59E0B',
    icono: '📝',
    actividadesAsignadas: 8,
    usuariosAsignados: 2
  },
  {
    id: 'rol-005',
    codigo: 'ROL-05',
    nombreOriginal: 'Auxiliar Administrativo',
    nombrePersonalizado: 'Auxiliar Administrativo OCI',
    descripcion: 'Apoyo en gestión documental y administrativa',
    color: '#8B5CF6',
    icono: '📁',
    actividadesAsignadas: 6,
    usuariosAsignados: 1
  }
];

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

const TIPOS_AUDITORIA: TipoAuditoria[] = [
  {
    id: 'tipo-001',
    codigo: 'AUD-GEST',
    nombre: 'Auditoría de Gestión',
    descripcion: 'Evaluación de la eficiencia y eficacia de los procesos',
    alcance: 'Procesos administrativos, académicos y financieros',
    duracionPromedio: 30,
    equipoPromedio: 3,
    color: '#3B82F6',
    activa: true,
    auditoriasProgramadas: 8
  },
  {
    id: 'tipo-002',
    codigo: 'AUD-FIN',
    nombre: 'Auditoría Financiera',
    descripcion: 'Revisión de estados financieros y manejo de recursos',
    alcance: 'Presupuesto, contabilidad y tesorería',
    duracionPromedio: 45,
    equipoPromedio: 4,
    color: '#10B981',
    activa: true,
    auditoriasProgramadas: 4
  },
  {
    id: 'tipo-003',
    codigo: 'AUD-COMP',
    nombre: 'Auditoría de Cumplimiento',
    descripcion: 'Verificación del cumplimiento normativo',
    alcance: 'Normas legales, decretos y resoluciones',
    duracionPromedio: 20,
    equipoPromedio: 2,
    color: '#F59E0B',
    activa: true,
    auditoriasProgramadas: 12
  },
  {
    id: 'tipo-004',
    codigo: 'AUD-TI',
    nombre: 'Auditoría de Sistemas de Información',
    descripcion: 'Evaluación de controles en sistemas TI',
    alcance: 'Infraestructura tecnológica y seguridad',
    duracionPromedio: 25,
    equipoPromedio: 3,
    color: '#8B5CF6',
    activa: true,
    auditoriasProgramadas: 3
  },
  {
    id: 'tipo-005',
    codigo: 'AUD-TERR',
    nombre: 'Auditoría Territorial',
    descripcion: 'Auditoría a sedes territoriales',
    alcance: 'Procesos de territoriales',
    duracionPromedio: 19,
    equipoPromedio: 3,
    color: '#EC4899',
    activa: true,
    auditoriasProgramadas: 16
  }
];

interface InformeLey {
  id: string;
  codigo: string;
  nombre: string;
  normaLegal: string;
  entidadDestino: string;
  periodicidad: 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual';
  mesEntrega: number;
  diaEntrega: number;
  diasAnticipacion: number;
  responsable: string;
  plantillaAsociada: string;
  activo: boolean;
}

const INFORMES_LEY: InformeLey[] = [
  {
    id: 'inf-001',
    codigo: 'INF-PORMENORIZADO',
    nombre: 'Informe Pormenorizado del Estado del Control Interno',
    normaLegal: 'Ley 1474 de 2011 - Art. 9',
    entidadDestino: 'DAFP - Departamento Administrativo de la Función Pública',
    periodicidad: 'Semestral',
    mesEntrega: 7,
    diaEntrega: 31,
    diasAnticipacion: 15,
    responsable: 'Jefe OCI',
    plantillaAsociada: 'PLANTILLA-PORMENORIZADO',
    activo: true
  },
  {
    id: 'inf-002',
    codigo: 'INF-ANUAL',
    nombre: 'Informe Anual de Gestión OCI',
    normaLegal: 'Decreto 648 de 2017',
    entidadDestino: 'Dirección Nacional ESAP',
    periodicidad: 'Anual',
    mesEntrega: 2,
    diaEntrega: 28,
    diasAnticipacion: 20,
    responsable: 'Jefe OCI',
    plantillaAsociada: 'PLANTILLA-ANUAL',
    activo: true
  },
  {
    id: 'inf-003',
    codigo: 'INF-SEGUIMIENTO',
    nombre: 'Informe de Seguimiento a Planes de Mejoramiento',
    normaLegal: 'Decreto 1083 de 2015',
    entidadDestino: 'Dirección Nacional ESAP',
    periodicidad: 'Trimestral',
    mesEntrega: 3,
    diaEntrega: 15,
    diasAnticipacion: 10,
    responsable: 'Profesional Especializado',
    plantillaAsociada: 'PLANTILLA-SEGUIMIENTO',
    activo: true
  }
];

interface UmbralAlerta {
  id: string;
  concepto: string;
  tipoMetrica: 'Porcentaje' | 'Días' | 'Número' | 'Monto';
  valorMinimo: number;
  valorMaximo: number;
  nivelAlerta: 'Info' | 'Advertencia' | 'Crítico';
  accionAutomatica: string;
  notificarA: string[];
  activo: boolean;
}

const UMBRALES_ALERTAS: UmbralAlerta[] = [
  {
    id: 'umbral-001',
    concepto: 'Auditoría próxima a vencer',
    tipoMetrica: 'Días',
    valorMinimo: 0,
    valorMaximo: 5,
    nivelAlerta: 'Crítico',
    accionAutomatica: 'Enviar correo al equipo auditor y jefe OCI',
    notificarA: ['Líder Auditoría', 'Jefe OCI'],
    activo: true
  },
  {
    id: 'umbral-002',
    concepto: 'Cumplimiento del Plan Anual',
    tipoMetrica: 'Porcentaje',
    valorMinimo: 0,
    valorMaximo: 70,
    nivelAlerta: 'Advertencia',
    accionAutomatica: 'Generar reporte de cumplimiento',
    notificarA: ['Jefe OCI'],
    activo: true
  },
  {
    id: 'umbral-003',
    concepto: 'Hallazgos de alto riesgo sin plan',
    tipoMetrica: 'Número',
    valorMinimo: 3,
    valorMaximo: 999,
    nivelAlerta: 'Crítico',
    accionAutomatica: 'Notificar a dirección y área auditada',
    notificarA: ['Jefe OCI', 'Director Nacional', 'Área Auditada'],
    activo: true
  },
  {
    id: 'umbral-004',
    concepto: 'Presupuesto de auditoría excedido',
    tipoMetrica: 'Porcentaje',
    valorMinimo: 100,
    valorMaximo: 999,
    nivelAlerta: 'Advertencia',
    accionAutomatica: 'Solicitar justificación',
    notificarA: ['Líder Auditoría', 'Jefe OCI'],
    activo: true
  }
];

interface PlantillaCorreo {
  id: string;
  codigo: string;
  nombre: string;
  asunto: string;
  cuerpo: string;
  variablesDisponibles: string[];
  evento: string;
  destinatarios: 'Manual' | 'Automático';
  copiaA: string[];
  activa: boolean;
}

const PLANTILLAS_CORREO: PlantillaCorreo[] = [
  {
    id: 'correo-001',
    codigo: 'EMAIL-ASIGNACION',
    nombre: 'Asignación de Auditoría',
    asunto: 'Asignación a Auditoría {{CODIGO_AUDITORIA}} - {{NOMBRE_AUDITORIA}}',
    cuerpo: `Estimado/a {{NOMBRE_AUDITOR}},\n\nSe le ha asignado como {{ROL_AUDITORIA}} para la auditoría:\n\nCódigo: {{CODIGO_AUDITORIA}}\nNombre: {{NOMBRE_AUDITORIA}}\nPeríodo: {{FECHA_INICIO}} al {{FECHA_FIN}}\nÁrea a auditar: {{AREA_AUDITADA}}\n\nPor favor, revise el Plan Individual de Auditoría en el sistema.\n\nSaludos cordiales,\nOficina de Control Interno`,
    variablesDisponibles: ['NOMBRE_AUDITOR', 'CODIGO_AUDITORIA', 'NOMBRE_AUDITORIA', 'ROL_AUDITORIA', 'FECHA_INICIO', 'FECHA_FIN', 'AREA_AUDITADA'],
    evento: 'Asignación de auditoría',
    destinatarios: 'Automático',
    copiaA: ['jefe.oci@esap.edu.co'],
    activa: true
  },
  {
    id: 'correo-002',
    codigo: 'EMAIL-HALLAZGO',
    nombre: 'Notificación de Hallazgo',
    asunto: 'Hallazgo Identificado - {{TIPO_HALLAZGO}} - {{CODIGO_HALLAZGO}}',
    cuerpo: `Estimado/a {{NOMBRE_RESPONSABLE}},\n\nSe ha identificado un hallazgo en la auditoría {{CODIGO_AUDITORIA}}:\n\nTipo: {{TIPO_HALLAZGO}}\nNivel de Riesgo: {{NIVEL_RIESGO}}\nDescripción: {{DESCRIPCION_HALLAZGO}}\n\nSe requiere formular un plan de mejoramiento dentro de los próximos {{DIAS_PLAZO}} días.\n\nSaludos cordiales,\nOficina de Control Interno`,
    variablesDisponibles: ['NOMBRE_RESPONSABLE', 'CODIGO_AUDITORIA', 'TIPO_HALLAZGO', 'NIVEL_RIESGO', 'DESCRIPCION_HALLAZGO', 'CODIGO_HALLAZGO', 'DIAS_PLAZO'],
    evento: 'Comunicación de hallazgo',
    destinatarios: 'Automático',
    copiaA: ['jefe.oci@esap.edu.co'],
    activa: true
  },
  {
    id: 'correo-003',
    codigo: 'EMAIL-VENCIMIENTO',
    nombre: 'Recordatorio de Vencimiento',
    asunto: 'RECORDATORIO: Vencimiento de {{TIPO_ACTIVIDAD}} en {{DIAS_RESTANTES}} días',
    cuerpo: `Estimado/a {{NOMBRE_DESTINATARIO}},\n\nLe recordamos que tiene una actividad próxima a vencer:\n\nActividad: {{TIPO_ACTIVIDAD}}\nDescripción: {{DESCRIPCION_ACTIVIDAD}}\nFecha límite: {{FECHA_LIMITE}}\nDías restantes: {{DIAS_RESTANTES}}\n\nPor favor, gestione esta actividad a la brevedad.\n\nSaludos cordiales,\nOficina de Control Interno - Sistema Automatizado`,
    variablesDisponibles: ['NOMBRE_DESTINATARIO', 'TIPO_ACTIVIDAD', 'DESCRIPCION_ACTIVIDAD', 'FECHA_LIMITE', 'DIAS_RESTANTES'],
    evento: 'Recordatorio automático',
    destinatarios: 'Automático',
    copiaA: [],
    activa: true
  }
];

// ====================================
// COMPONENTE PRINCIPAL
// ====================================

export function ConfiguracionSistemaCompleto() {
  const [seccionActiva, setSeccionActiva] = useState<SeccionPrincipal>('general');
  const [subseccionActiva, setSubseccionActiva] = useState<string>('roles');
  const [sidebarColapsado, setSidebarColapsado] = useState(false);

  const seccionConfig = SECCIONES_CONFIG.find(s => s.id === seccionActiva);
  const IconoSeccion = seccionConfig?.icono || Settings;

  return (
    <div className="flex gap-6 min-h-screen">
      
      {/* SIDEBAR DE NAVEGACIÓN */}
      <motion.div
        initial={false}
        animate={{ width: sidebarColapsado ? 80 : 320 }}
        className="bg-white rounded-xl shadow-lg p-4 flex-shrink-0 h-fit sticky top-6"
      >
        {/* Header del Sidebar */}
        <div className="flex items-center justify-between mb-6">
          {!sidebarColapsado && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#003DA5] to-[#0052CC] rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Configuración</h2>
                <p className="text-xs text-gray-500">Sistema CIG</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarColapsado(!sidebarColapsado)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarColapsado ? (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>

        {/* Navegación Principal */}
        <div className="space-y-2">
          {SECCIONES_CONFIG.map((seccion) => {
            const Icono = seccion.icono;
            const isActive = seccionActiva === seccion.id;

            return (
              <div key={seccion.id}>
                <button
                  onClick={() => {
                    setSeccionActiva(seccion.id);
                    setSubseccionActiva(seccion.subsecciones[0].id);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all
                    ${isActive
                      ? 'bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white shadow-lg'
                      : 'hover:bg-gray-100 text-gray-700'
                    }
                  `}
                >
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                    ${isActive ? 'bg-white/20' : 'bg-gray-100'}
                  `}>
                    <Icono className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  
                  {!sidebarColapsado && (
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-900'}`}>
                        {seccion.titulo.replace('Configuración de ', '').replace('Configuración ', '')}
                      </p>
                    </div>
                  )}
                </button>

                {/* Subsecciones */}
                {isActive && !sidebarColapsado && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-3 mt-2 space-y-1 border-l-2 border-gray-200 pl-3"
                  >
                    {seccion.subsecciones.map((sub) => {
                      const SubIcono = sub.icon;
                      const isSubActive = subseccionActiva === sub.id;

                      return (
                        <button
                          key={sub.id}
                          onClick={() => setSubseccionActiva(sub.id)}
                          className={`
                            w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm
                            ${isSubActive
                              ? 'bg-blue-50 text-[#003DA5] font-semibold'
                              : 'hover:bg-gray-50 text-gray-600'
                            }
                          `}
                        >
                          <div className="flex items-center gap-2">
                            <SubIcono className="w-4 h-4" />
                            <span>{sub.label}</span>
                          </div>
                          {sub.badge && (
                            <Badge
                              variant={isSubActive ? 'default' : 'outline'}
                              className="text-xs"
                            >
                              {sub.badge}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer del Sidebar */}
        {!sidebarColapsado && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs font-semibold text-blue-900 mb-1">
                💡 Consejo
              </p>
              <p className="text-xs text-blue-700">
                Usa Cmd+S para guardar cambios rápidamente
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* ÁREA DE CONTENIDO */}
      <div className="flex-1 space-y-6">
        
        {/* Header del Contenido */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center shadow-md"
                style={{ background: `linear-gradient(135deg, ${seccionConfig?.color}20, ${seccionConfig?.color}10)` }}
              >
                <IconoSeccion className="w-7 h-7" style={{ color: seccionConfig?.color }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {seccionConfig?.titulo}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {seccionConfig?.descripcion}
                </p>
              </div>
            </div>

            <Button style={{ background: '#003DA5' }}>
              <Save className="w-4 h-4 mr-2" />
              Guardar Cambios
            </Button>
          </div>
        </motion.div>

        {/* Contenido Dinámico */}
        <AnimatePresence mode="wait">
          <motion.div
            key={subseccionActiva}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {subseccionActiva === 'roles' && <SeccionRoles />}
            {subseccionActiva === 'normatividad' && <NormatividadAplicable />}
            {subseccionActiva === 'tipos' && <SeccionTiposAuditoria />}
            {subseccionActiva === 'listas' && <SeccionListasChequeo />}
            {subseccionActiva === 'informes-ley' && <SeccionInformesLey />}
            {subseccionActiva === 'formatos' && <SeccionFormatos />}
            {subseccionActiva === 'alertas' && <SeccionUmbrales />}
            {subseccionActiva === 'correos' && <SeccionPlantillasCorreo />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ====================================
// SECCIONES DE CONTENIDO
// ====================================

function SeccionRoles() {
  const [roles, setRoles] = useState(ROLES_DECRETO_648);
  const [modalEditar, setModalEditar] = useState(false);
  const [rolSeleccionado, setRolSeleccionado] = useState<RolDecreto648 | null>(null);

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Roles del Decreto 648 de 2017
          </h3>
          <p className="text-sm text-gray-600">
            Personaliza los nombres de los cinco roles definidos por el Decreto 648
          </p>
        </div>

        <div className="space-y-3">
          {roles.map((rol) => (
            <div
              key={rol.id}
              className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: rol.color + '20' }}
                >
                  {rol.icono}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        {rol.codigo}
                      </Badge>
                      <h4 className="font-bold text-gray-900">{rol.nombrePersonalizado}</h4>
                      <p className="text-sm text-gray-500 italic">
                        Original: {rol.nombreOriginal}
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setRolSeleccionado(rol);
                        setModalEditar(true);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{rol.descripcion}</p>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <CheckSquare className="w-4 h-4" />
                      <span>{rol.actividadesAsignadas} actividades</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{rol.usuariosAsignados} usuarios</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Modal Editar */}
      <AnimatePresence>
        {modalEditar && rolSeleccionado && (
          <ModalEditarRol
            rol={rolSeleccionado}
            onGuardar={(rolActualizado) => {
              setRoles(roles.map(r => r.id === rolActualizado.id ? rolActualizado : r));
              setModalEditar(false);
              toast.success('Rol actualizado exitosamente');
            }}
            onCerrar={() => setModalEditar(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SeccionTiposAuditoria() {
  const [tipos, setTipos] = useState(TIPOS_AUDITORIA);

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Tipos de Auditoría
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Gestiona los tipos de auditoría disponibles en el sistema
            </p>
          </div>
          <Button style={{ background: '#003DA5' }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Tipo
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tipos.map((tipo) => (
            <div
              key={tipo.id}
              className="p-4 border-2 rounded-xl"
              style={{
                borderColor: tipo.activa ? tipo.color : '#E5E7EB',
                background: tipo.activa ? tipo.color + '10' : '#F9FAFB'
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Badge
                    variant="outline"
                    className="mb-2"
                    style={{ background: tipo.color + '20', color: tipo.color, border: 'none' }}
                  >
                    {tipo.codigo}
                  </Badge>
                  <h4 className="font-bold text-gray-900">{tipo.nombre}</h4>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm">
                    <Edit className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-3">{tipo.descripcion}</p>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <Clock className="w-3 h-3" />
                  <span>{tipo.duracionPromedio} días</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Users className="w-3 h-3" />
                  <span>{tipo.equipoPromedio} personas</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Target className="w-3 h-3" />
                  <span>{tipo.auditoriasProgramadas} programadas</span>
                </div>
                <div>
                  <Badge
                    style={{
                      background: tipo.activa ? '#D1FAE5' : '#FEE2E2',
                      color: tipo.activa ? '#065F46' : '#991B1B'
                    }}
                  >
                    {tipo.activa ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SeccionListasChequeo() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Listas de Chequeo Estándar
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Administra listas de verificación para cada tipo de auditoría
          </p>
        </div>
        <Button style={{ background: '#003DA5' }}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Lista
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
          <div
            key={idx}
            className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
          >
            <CheckSquare className="w-8 h-8 text-blue-600 mb-3" />
            <h4 className="font-bold text-gray-900 mb-1">Lista de Chequeo #{idx}</h4>
            <p className="text-sm text-gray-600 mb-3">
              Auditoría de Gestión
            </p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>15 ítems</span>
              <Button variant="outline" size="sm">
                <Eye className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SeccionInformesLey() {
  const [informes] = useState(INFORMES_LEY);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Informes de Ley
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Configura periodicidades y destinatarios de informes obligatorios
          </p>
        </div>
        <Button style={{ background: '#003DA5' }}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Informe
        </Button>
      </div>

      <div className="space-y-3">
        {informes.map((informe) => (
          <div
            key={informe.id}
            className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <Badge variant="outline" className="mb-2">
                  {informe.codigo}
                </Badge>
                <h4 className="font-bold text-gray-900">{informe.nombre}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Norma:</strong> {informe.normaLegal}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm">
                  <Edit className="w-3 h-3" />
                </Button>
                <Button variant="outline" size="sm">
                  <Eye className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-1">Periodicidad</p>
                <Badge style={{ background: '#DBEAFE', color: '#1E40AF' }}>
                  {informe.periodicidad}
                </Badge>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Fecha Entrega</p>
                <p className="font-bold text-gray-900">
                  {informe.diaEntrega}/{informe.mesEntrega}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Anticipación</p>
                <p className="font-bold text-gray-900">{informe.diasAnticipacion} días</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Responsable</p>
                <p className="font-bold text-gray-900">{informe.responsable}</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t">
              <p className="text-sm text-gray-600">
                <strong>Destino:</strong> {informe.entidadDestino}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SeccionFormatos() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Formatos de Documentos
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Personaliza plantillas y formatos de documentos oficiales
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Button style={{ background: '#003DA5' }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Formato
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {['Plan', 'Programa', 'Acta', 'Informe', 'Certificación', 'Memorando'].map((tipo) => (
          <div
            key={tipo}
            className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
          >
            <FileText className="w-8 h-8 text-blue-600 mb-3" />
            <h4 className="font-bold text-gray-900 mb-1">{tipo}</h4>
            <p className="text-sm text-gray-600 mb-3">
              2 plantillas disponibles
            </p>
            <Button variant="outline" size="sm" className="w-full">
              <Settings className="w-3 h-3 mr-1" />
              Configurar
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SeccionUmbrales() {
  const [umbrales] = useState(UMBRALES_ALERTAS);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Umbrales de Alertas
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Define límites para activación automática de alertas
          </p>
        </div>
        <Button style={{ background: '#003DA5' }}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Umbral
        </Button>
      </div>

      <div className="space-y-3">
        {umbrales.map((umbral) => (
          <div
            key={umbral.id}
            className="p-4 border-2 rounded-xl"
            style={{
              borderColor: 
                umbral.nivelAlerta === 'Crítico' ? '#EF4444' :
                umbral.nivelAlerta === 'Advertencia' ? '#F59E0B' : '#3B82F6',
              background:
                umbral.nivelAlerta === 'Crítico' ? '#FEE2E2' :
                umbral.nivelAlerta === 'Advertencia' ? '#FEF3C7' : '#DBEAFE'
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    style={{
                      background:
                        umbral.nivelAlerta === 'Crítico' ? '#DC2626' :
                        umbral.nivelAlerta === 'Advertencia' ? '#F59E0B' : '#3B82F6',
                      color: 'white'
                    }}
                  >
                    {umbral.nivelAlerta}
                  </Badge>
                  <h4 className="font-bold text-gray-900">{umbral.concepto}</h4>
                </div>
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Tipo:</strong> {umbral.tipoMetrica} • 
                  <strong> Rango:</strong> {umbral.valorMinimo} - {umbral.valorMaximo}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Acción:</strong> {umbral.accionAutomatica}
                </p>
              </div>
              <Button variant="outline" size="sm">
                <Edit className="w-3 h-3" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-1 mt-2">
              {umbral.notificarA.map((destinatario, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {destinatario}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SeccionPlantillasCorreo() {
  const [plantillas] = useState(PLANTILLAS_CORREO);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<PlantillaCorreo | null>(null);

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Plantillas de Correo Electrónico
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Personaliza las plantillas de notificaciones automáticas
            </p>
          </div>
          <Button style={{ background: '#003DA5' }}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Plantilla
          </Button>
        </div>

        <div className="space-y-3">
          {plantillas.map((plantilla) => (
            <div
              key={plantilla.id}
              className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition-colors cursor-pointer"
              onClick={() => setPlantillaSeleccionada(plantilla)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{plantilla.codigo}</Badge>
                    <h4 className="font-bold text-gray-900">{plantilla.nombre}</h4>
                    <Badge
                      style={{
                        background: plantilla.activa ? '#D1FAE5' : '#FEE2E2',
                        color: plantilla.activa ? '#065F46' : '#991B1B'
                      }}
                    >
                      {plantilla.activa ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Asunto:</strong> {plantilla.asunto}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Evento:</strong> {plantilla.evento}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm">
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {plantilla.variablesDisponibles.slice(0, 4).map((variable, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs font-mono">
                    {`{{${variable}}}`}
                  </Badge>
                ))}
                {plantilla.variablesDisponibles.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{plantilla.variablesDisponibles.length - 4} más
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Vista previa */}
      <AnimatePresence>
        {plantillaSeleccionada && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-900">Vista Previa</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPlantillaSeleccionada(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-bold text-gray-700 mb-1">Asunto:</p>
                <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                  {plantillaSeleccionada.asunto}
                </p>
              </div>

              <div>
                <p className="text-sm font-bold text-gray-700 mb-1">Cuerpo:</p>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap font-mono">
                  {plantillaSeleccionada.cuerpo}
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-gray-700 mb-1">Variables disponibles:</p>
                <div className="flex flex-wrap gap-1">
                  {plantillaSeleccionada.variablesDisponibles.map((variable, idx) => (
                    <Badge key={idx} className="font-mono">
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}
      </AnimatePresence>
    </div>
  );
}

// ====================================
// MODAL: EDITAR ROL
// ====================================

function ModalEditarRol({ rol, onGuardar, onCerrar }: any) {
  const [nombrePersonalizado, setNombrePersonalizado] = useState(rol.nombrePersonalizado);
  const [descripcion, setDescripcion] = useState(rol.descripcion);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full"
      >
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-gray-900">
            Editar Rol: {rol.codigo}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Nombre original: {rol.nombreOriginal}
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Nombre Personalizado
            </label>
            <input
              type="text"
              value={nombrePersonalizado}
              onChange={(e) => setNombrePersonalizado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900">
              <strong>Nota:</strong> El nombre original del Decreto 648 se mantiene para referencia legal. 
              Solo se personaliza el nombre de visualización.
            </p>
          </div>
        </div>

        <div className="p-6 border-t flex gap-3">
          <Button onClick={onCerrar} variant="outline" className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={() => onGuardar({ ...rol, nombrePersonalizado, descripcion })}
            className="flex-1"
            style={{ background: '#003DA5' }}
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar Cambios
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default ConfiguracionSistemaCompleto;
