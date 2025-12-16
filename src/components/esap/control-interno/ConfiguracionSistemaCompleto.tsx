/**
 * RF020 - CONFIGURACIÓN DEL SISTEMA
 * Control Interno de Gestión - ESAP
 * 
 * Funcionalidades:
 * 1. Edición de nombres de los cinco roles del Decreto 648
 * 2. Creación, edición y eliminación de actividades por rol
 * 3. Gestión de tipos de auditoría
 * 4. Configuración de periodicidades para informes de ley
 * 5. Personalización de formatos de documentos
 * 6. Gestión de listas de chequeo estándar
 * 7. Configuración de umbrales de alertas
 * 8. Gestión de plantillas de correo electrónico
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings, Users, Shield, FileText, Calendar, Bell,
  CheckSquare, AlertTriangle, Mail, Edit, Plus, Trash2,
  Save, X, Eye, Copy, Download, Upload, Search, Filter,
  ChevronRight, Clock, Target, Activity, Database, Code,
  Layers, BookOpen, Briefcase, Award, List, BarChart3
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

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

interface ActividadRol {
  id: string;
  rolId: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  obligatoria: boolean;
  frecuencia: 'Única' | 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual';
  duracionEstimada: number; // en días
  orden: number;
}

interface TipoAuditoria {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  alcance: string;
  duracionPromedio: number; // en días
  equipoPromedio: number; // número de personas
  color: string;
  activa: boolean;
  auditoriasProgramadas: number;
}

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

interface FormatoDocumento {
  id: string;
  codigo: string;
  nombre: string;
  tipo: 'Plan' | 'Programa' | 'Acta' | 'Informe' | 'Certificación' | 'Memorando';
  descripcion: string;
  version: string;
  fechaVersion: string;
  encabezado: {
    incluirLogo: boolean;
    incluirFecha: boolean;
    incluirCodigo: boolean;
  };
  piePagina: {
    incluirNumeracion: boolean;
    incluirFirmas: boolean;
    numeroFirmas: number;
  };
  formatoArchivo: 'DOCX' | 'PDF' | 'XLSX';
  activo: boolean;
}

interface ListaChequeo {
  id: string;
  codigo: string;
  nombre: string;
  tipoAuditoriaAsociada: string;
  categoria: string;
  numeroItems: number;
  version: string;
  fechaVersion: string;
  activa: boolean;
}

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

// ============ DATOS - ROLES DECRETO 648 ============

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

// ============ DATOS - TIPOS DE AUDITORÍA ============

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

// ============ DATOS - INFORMES DE LEY ============

const INFORMES_LEY: InformeLey[] = [
  {
    id: 'inf-001',
    codigo: 'INF-PORMENORIZADO',
    nombre: 'Informe Pormenorizado del Estado del Control Interno',
    normaLegal: 'Ley 1474 de 2011 - Art. 9',
    entidadDestino: 'DAFP - Departamento Administrativo de la Función Pública',
    periodicidad: 'Semestral',
    mesEntrega: 7, // Julio
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
    mesEntrega: 2, // Febrero
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
    mesEntrega: 3, // Marzo, Junio, Septiembre, Diciembre
    diaEntrega: 15,
    diasAnticipacion: 10,
    responsable: 'Profesional Especializado',
    plantillaAsociada: 'PLANTILLA-SEGUIMIENTO',
    activo: true
  }
];

// ============ DATOS - UMBRALES DE ALERTAS ============

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

// ============ DATOS - PLANTILLAS DE CORREO ============

const PLANTILLAS_CORREO: PlantillaCorreo[] = [
  {
    id: 'correo-001',
    codigo: 'EMAIL-ASIGNACION',
    nombre: 'Asignación de Auditoría',
    asunto: 'Asignación a Auditoría {{CODIGO_AUDITORIA}} - {{NOMBRE_AUDITORIA}}',
    cuerpo: `Estimado/a {{NOMBRE_AUDITOR}},

Se le ha asignado como {{ROL_AUDITORIA}} para la auditoría:

Código: {{CODIGO_AUDITORIA}}
Nombre: {{NOMBRE_AUDITORIA}}
Período: {{FECHA_INICIO}} al {{FECHA_FIN}}
Área a auditar: {{AREA_AUDITADA}}

Por favor, revise el Plan Individual de Auditoría en el sistema.

Saludos cordiales,
Oficina de Control Interno`,
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
    cuerpo: `Estimado/a {{NOMBRE_RESPONSABLE}},

Se ha identificado un hallazgo en la auditoría {{CODIGO_AUDITORIA}}:

Tipo: {{TIPO_HALLAZGO}}
Nivel de Riesgo: {{NIVEL_RIESGO}}
Descripción: {{DESCRIPCION_HALLAZGO}}

Se requiere formular un plan de mejoramiento dentro de los próximos {{DIAS_PLAZO}} días.

Saludos cordiales,
Oficina de Control Interno`,
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
    cuerpo: `Estimado/a {{NOMBRE_DESTINATARIO}},

Le recordamos que tiene una actividad próxima a vencer:

Actividad: {{TIPO_ACTIVIDAD}}
Descripción: {{DESCRIPCION_ACTIVIDAD}}
Fecha límite: {{FECHA_LIMITE}}
Días restantes: {{DIAS_RESTANTES}}

Por favor, gestione esta actividad a la brevedad.

Saludos cordiales,
Oficina de Control Interno - Sistema Automatizado`,
    variablesDisponibles: ['NOMBRE_DESTINATARIO', 'TIPO_ACTIVIDAD', 'DESCRIPCION_ACTIVIDAD', 'FECHA_LIMITE', 'DIAS_RESTANTES'],
    evento: 'Recordatorio automático',
    destinatarios: 'Automático',
    copiaA: [],
    activa: true
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function ConfiguracionSistemaCompleto() {
  const [seccionActiva, setSeccionActiva] = useState<
    'roles' | 'actividades' | 'auditorias' | 'informes' | 'formatos' | 'listas' | 'alertas' | 'correos'
  >('roles');

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Settings className="w-7 h-7" style={{ color: '#003DA5' }} />
            Configuración del Sistema
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            RF020 - Personalización completa del módulo de Control Interno
          </p>
        </div>

        <Button style={{ background: '#003DA5' }}>
          <Save className="w-4 h-4 mr-2" />
          Guardar Todos los Cambios
        </Button>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-2 border-b overflow-x-auto">
        <TabButton
          active={seccionActiva === 'roles'}
          onClick={() => setSeccionActiva('roles')}
          icon={<Shield className="w-4 h-4" />}
          label="Roles Decreto 648"
          badge={5}
        />
        <TabButton
          active={seccionActiva === 'actividades'}
          onClick={() => setSeccionActiva('actividades')}
          icon={<CheckSquare className="w-4 h-4" />}
          label="Actividades"
          badge={51}
        />
        <TabButton
          active={seccionActiva === 'auditorias'}
          onClick={() => setSeccionActiva('auditorias')}
          icon={<Target className="w-4 h-4" />}
          label="Tipos de Auditoría"
          badge={5}
        />
        <TabButton
          active={seccionActiva === 'informes'}
          onClick={() => setSeccionActiva('informes')}
          icon={<FileText className="w-4 h-4" />}
          label="Informes de Ley"
          badge={3}
        />
        <TabButton
          active={seccionActiva === 'formatos'}
          onClick={() => setSeccionActiva('formatos')}
          icon={<Layers className="w-4 h-4" />}
          label="Formatos"
          badge={12}
        />
        <TabButton
          active={seccionActiva === 'listas'}
          onClick={() => setSeccionActiva('listas')}
          icon={<List className="w-4 h-4" />}
          label="Listas Chequeo"
          badge={8}
        />
        <TabButton
          active={seccionActiva === 'alertas'}
          onClick={() => setSeccionActiva('alertas')}
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Umbrales Alertas"
          badge={4}
        />
        <TabButton
          active={seccionActiva === 'correos'}
          onClick={() => setSeccionActiva('correos')}
          icon={<Mail className="w-4 h-4" />}
          label="Plantillas Email"
          badge={3}
        />
      </div>

      {/* CONTENIDO */}
      <AnimatePresence mode="wait">
        {seccionActiva === 'roles' && <SeccionRoles />}
        {seccionActiva === 'actividades' && <SeccionActividades />}
        {seccionActiva === 'auditorias' && <SeccionTiposAuditoria />}
        {seccionActiva === 'informes' && <SeccionInformesLey />}
        {seccionActiva === 'formatos' && <SeccionFormatos />}
        {seccionActiva === 'listas' && <SeccionListasChequeo />}
        {seccionActiva === 'alertas' && <SeccionUmbrales />}
        {seccionActiva === 'correos' && <SeccionPlantillasCorreo />}
      </AnimatePresence>
    </div>
  );
}

// ============ COMPONENTE: TAB BUTTON ============

function TabButton({ active, onClick, icon, label, badge }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-600 hover:text-gray-900'
      }`}
    >
      {icon}
      {label}
      {badge && (
        <Badge
          style={{
            background: active ? '#3B82F6' : '#6B7280',
            color: 'white'
          }}
        >
          {badge}
        </Badge>
      )}
    </button>
  );
}

// ============ SECCIÓN: ROLES DECRETO 648 ============

function SeccionRoles() {
  const [roles, setRoles] = useState(ROLES_DECRETO_648);
  const [modalEditar, setModalEditar] = useState(false);
  const [rolSeleccionado, setRolSeleccionado] = useState<RolDecreto648 | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-black text-gray-900 mb-2">
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
    </motion.div>
  );
}

// ============ SECCIÓN: ACTIVIDADES ============

function SeccionActividades() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('Todos');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-gray-900">
              Actividades por Rol
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Crea, edita y elimina actividades asignadas a cada rol
            </p>
          </div>
          <Button style={{ background: '#003DA5' }}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Actividad
          </Button>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Buscar actividad
            </label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o código..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Filtrar por rol
            </label>
            <select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todos">Todos los roles</option>
              {ROLES_DECRETO_648.map(rol => (
                <option key={rol.id} value={rol.id}>{rol.nombrePersonalizado}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mensaje informativo */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Total de actividades:</strong> 51 actividades distribuidas en 5 roles
          </p>
        </div>
      </Card>
    </motion.div>
  );
}

// ============ SECCIÓN: TIPOS DE AUDITORÍA ============

function SeccionTiposAuditoria() {
  const [tipos, setTipos] = useState(TIPOS_AUDITORIA);
  const [modalCrear, setModalCrear] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-gray-900">
              Tipos de Auditoría
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Gestiona los tipos de auditoría disponibles en el sistema
            </p>
          </div>
          <Button onClick={() => setModalCrear(true)} style={{ background: '#003DA5' }}>
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
                  <Button variant="outline" size="sm">
                    <Trash2 className="w-3 h-3" />
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
    </motion.div>
  );
}

// ============ SECCIÓN: INFORMES DE LEY ============

function SeccionInformesLey() {
  const [informes, setInformes] = useState(INFORMES_LEY);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-gray-900">
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
    </motion.div>
  );
}

// ============ SECCIÓN: FORMATOS ============

function SeccionFormatos() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-gray-900">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['Plan', 'Programa', 'Acta', 'Informe', 'Certificación', 'Memorando'].map((tipo, idx) => (
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
    </motion.div>
  );
}

// ============ SECCIÓN: LISTAS DE CHEQUEO ============

function SeccionListasChequeo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-gray-900">
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

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>8 listas de chequeo estándar</strong> disponibles para diferentes tipos de auditoría
          </p>
        </div>
      </Card>
    </motion.div>
  );
}

// ============ SECCIÓN: UMBRALES DE ALERTAS ============

function SeccionUmbrales() {
  const [umbrales, setUmbrales] = useState(UMBRALES_ALERTAS);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-gray-900">
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
                <div className="flex gap-1">
                  <Button variant="outline" size="sm">
                    <Edit className="w-3 h-3" />
                  </Button>
                </div>
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
    </motion.div>
  );
}

// ============ SECCIÓN: PLANTILLAS DE CORREO ============

function SeccionPlantillasCorreo() {
  const [plantillas, setPlantillas] = useState(PLANTILLAS_CORREO);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<PlantillaCorreo | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-gray-900">
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
    </motion.div>
  );
}

// ============ MODAL: EDITAR ROL ============

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
          <h3 className="text-lg font-black text-gray-900">
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
