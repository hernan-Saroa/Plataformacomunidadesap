/**
 * ============================================
 * RF005: AUDITORÍA - FASE DE PLANEACIÓN
 * ============================================
 * 
 * Gestión completa de la fase de planeación de auditorías internas
 * Basado en: EM-PT-004 - Auditorías Internas V3
 * 
 * FUNCIONALIDADES:
 * - Dashboard de progreso de planeación
 * - 3 Actividades obligatorias:
 *   1. Estudios Preliminares (análisis previo del área)
 *   2. Solicitud de Información (requerimientos al área auditada)
 *   3. Reunión de Apertura (kick-off oficial)
 * - Gestión de cronograma (5-10 días SEDE, 3 días TERRITORIAL)
 * - Carga de documentos y evidencias por actividad
 * - Sistema de checklist por actividad
 * - Validación de completitud antes de avanzar a Ejecución
 * - Notificaciones automáticas al área auditada
 * - Registro de auditoría (compliance)
 * 
 * INTEGRACIÓN:
 * - RF004 (Inicio) → Recibe auditoría iniciada
 * - RF006 (Ejecución) → Habilita paso cuando planeación completa
 * - Expediente Digital → Almacena todos los documentos
 * - Control Interno Context → Estado global
 * 
 * WORKFLOW:
 * Inicio → Planeación → Ejecución → Comunicación → Seguimiento → Finalizada
 *           ^^^^^^^^^ (ESTA FASE)
 * 
 * DURACIÓN:
 * - Auditorías Sede: 5-10 días hábiles
 * - Auditorías Territoriales: 3 días hábiles (FIJO)
 * 
 * ÚLTIMA ACTUALIZACIÓN: 21 Diciembre 2025
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSearch, Send, Users, CheckCircle, AlertCircle, Clock, 
  Calendar, ChevronRight, Upload, Download, Eye, Edit2, Trash2,
  CheckSquare, Target, MessageSquare, FileText, ClipboardCheck,
  TrendingUp, Activity, Sparkles, Info, X, Save, PlayCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Design system
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { ModalSIGL } from '../gestion-legal/design-system/ModalSIGL';

// ============ TIPOS ============

type ActividadPlaneacion = 'estudios-preliminares' | 'solicitud-informacion' | 'reunion-apertura';
type EstadoActividad = 'pendiente' | 'en-progreso' | 'completada';

interface Auditoria {
  id: string;
  codigo: string;
  nombre: string;
  tipo: 'Sede' | 'Territorial';
  areaAuditable: string;
  procesoNombre: string;
  responsableArea: {
    id: string;
    nombre: string;
    cargo: string;
    email: string;
  };
  auditorLider: {
    id: string;
    nombre: string;
  };
  equipoAuditores: {
    id: string;
    nombre: string;
  }[];
  cronograma: {
    fechaInicio: Date;
    fechaFin: Date;
    duracionDias: number;
  };
  stage: string;
}

interface ItemChecklist {
  id: string;
  descripcion: string;
  completado: boolean;
  responsable?: string;
  fechaCompletado?: Date;
  observaciones?: string;
}

interface ActividadData {
  id: ActividadPlaneacion;
  titulo: string;
  descripcion: string;
  icono: React.ReactNode;
  color: string;
  estado: EstadoActividad;
  progreso: number; // 0-100
  checklist: ItemChecklist[];
  documentos: DocumentoActividad[];
  observaciones: string;
}

interface DocumentoActividad {
  id: string;
  nombre: string;
  tipo: string;
  size: string;
  fechaCarga: Date;
  cargadoPor: string;
  url?: string;
}

interface SolicitudInformacion {
  id: string;
  asunto: string;
  detalle: string;
  documentosSolicitados: string[];
  plazoRespuesta: Date;
  estadoRespuesta: 'pendiente' | 'parcial' | 'completa';
  respuestas: {
    id: string;
    fecha: Date;
    descripcion: string;
    documentos: string[];
  }[];
}

interface ReunionApertura {
  fecha?: Date;
  hora?: string;
  lugar: string;
  modalidad: 'presencial' | 'virtual' | 'hibrida';
  enlaceVirtual?: string;
  agenda: string[];
  participantes: {
    nombre: string;
    rol: string;
    confirmado: boolean;
  }[];
  actaReunion?: string;
  estadoActa: 'pendiente' | 'borrador' | 'aprobada';
}

// ============ DATOS DE EJEMPLO ============

const CHECKLIST_ESTUDIOS_PRELIMINARES: ItemChecklist[] = [
  {
    id: 'ep1',
    descripcion: 'Revisar informes de auditorías previas del área',
    completado: false,
  },
  {
    id: 'ep2',
    descripcion: 'Analizar normativa aplicable al proceso auditado',
    completado: false,
  },
  {
    id: 'ep3',
    descripcion: 'Identificar riesgos potenciales del área',
    completado: false,
  },
  {
    id: 'ep4',
    descripcion: 'Revisar matriz de riesgos institucional',
    completado: false,
  },
  {
    id: 'ep5',
    descripcion: 'Consultar planes de mejoramiento vigentes del área',
    completado: false,
  },
  {
    id: 'ep6',
    descripcion: 'Elaborar documento de estudios preliminares',
    completado: false,
  },
];

const CHECKLIST_SOLICITUD_INFORMACION: ItemChecklist[] = [
  {
    id: 'si1',
    descripcion: 'Elaborar oficio de solicitud de información',
    completado: false,
  },
  {
    id: 'si2',
    descripcion: 'Definir lista de documentos requeridos',
    completado: false,
  },
  {
    id: 'si3',
    descripcion: 'Establecer plazo de entrega (mínimo 5 días hábiles)',
    completado: false,
  },
  {
    id: 'si4',
    descripcion: 'Enviar oficio al responsable del área auditada',
    completado: false,
  },
  {
    id: 'si5',
    descripcion: 'Registrar solicitud en expediente digital',
    completado: false,
  },
  {
    id: 'si6',
    descripcion: 'Hacer seguimiento a entrega de información',
    completado: false,
  },
];

const CHECKLIST_REUNION_APERTURA: ItemChecklist[] = [
  {
    id: 'ra1',
    descripcion: 'Programar fecha y hora con el área auditada',
    completado: false,
  },
  {
    id: 'ra2',
    descripcion: 'Preparar presentación de la auditoría',
    completado: false,
  },
  {
    id: 'ra3',
    descripcion: 'Enviar convocatoria a participantes',
    completado: false,
  },
  {
    id: 'ra4',
    descripcion: 'Realizar reunión de apertura',
    completado: false,
  },
  {
    id: 'ra5',
    descripcion: 'Elaborar acta de reunión de apertura',
    completado: false,
  },
  {
    id: 'ra6',
    descripcion: 'Obtener firma del acta por responsable del área',
    completado: false,
  },
];

// ============ COMPONENTE PRINCIPAL ============

interface PlaneacionAuditoriaModuleProps {
  auditoria?: Auditoria;
  onClose?: () => void;
  onAvanzarEjecucion?: () => void;
}

// Datos de ejemplo por defecto
const AUDITORIA_EJEMPLO: Auditoria = {
  id: 'aud-001',
  codigo: 'AUD-2025-001',
  nombre: 'Auditoría de Gestión Financiera',
  tipo: 'Sede',
  areaAuditable: 'Dirección Financiera',
  procesoNombre: 'Gestión Presupuestal',
  responsableArea: {
    id: 'per-001',
    nombre: 'María González',
    cargo: 'Directora Financiera',
    email: 'maria.gonzalez@esap.edu.co',
  },
  auditorLider: {
    id: 'aud-001',
    nombre: 'Carlos Ramírez',
  },
  equipoAuditores: [
    { id: 'aud-002', nombre: 'Ana Martínez' },
    { id: 'aud-003', nombre: 'Pedro López' },
  ],
  cronograma: {
    fechaInicio: new Date(2025, 0, 15),
    fechaFin: new Date(2025, 0, 25),
    duracionDias: 10,
  },
  stage: 'planeacion',
};

export function PlaneacionAuditoriaModule({
  auditoria = AUDITORIA_EJEMPLO,
  onClose = () => {},
  onAvanzarEjecucion = () => {},
}: PlaneacionAuditoriaModuleProps = {}) {
  // ===== ESTADO =====
  const [actividadActiva, setActividadActiva] = useState<ActividadPlaneacion>('estudios-preliminares');
  const [actividades, setActividades] = useState<Record<ActividadPlaneacion, ActividadData>>({
    'estudios-preliminares': {
      id: 'estudios-preliminares',
      titulo: 'Estudios Preliminares',
      descripcion: 'Análisis previo del área auditada, revisión de informes anteriores, normativa y riesgos',
      icono: <FileSearch className="w-5 h-5" />,
      color: '#8B5CF6',
      estado: 'en-progreso',
      progreso: 0,
      checklist: CHECKLIST_ESTUDIOS_PRELIMINARES,
      documentos: [],
      observaciones: '',
    },
    'solicitud-informacion': {
      id: 'solicitud-informacion',
      titulo: 'Solicitud de Información',
      descripcion: 'Requerimiento formal de documentos e información al área auditada',
      icono: <Send className="w-5 h-5" />,
      color: '#F59E0B',
      estado: 'pendiente',
      progreso: 0,
      checklist: CHECKLIST_SOLICITUD_INFORMACION,
      documentos: [],
      observaciones: '',
    },
    'reunion-apertura': {
      id: 'reunion-apertura',
      titulo: 'Reunión de Apertura',
      descripcion: 'Kick-off oficial con el área auditada, presentación del alcance y cronograma',
      icono: <Users className="w-5 h-5" />,
      color: '#10B981',
      estado: 'pendiente',
      progreso: 0,
      checklist: CHECKLIST_REUNION_APERTURA,
      documentos: [],
      observaciones: '',
    },
  });

  const [solicitudInfo, setSolicitudInfo] = useState<SolicitudInformacion | null>(null);
  const [reunion, setReunion] = useState<ReunionApertura>({
    lugar: '',
    modalidad: 'virtual',
    agenda: [
      'Presentación del equipo auditor',
      'Explicación del alcance de la auditoría',
      'Cronograma de actividades',
      'Coordinación de entrevistas',
      'Preguntas y respuestas',
    ],
    participantes: [],
    estadoActa: 'pendiente',
  });

  const [modalSolicitud, setModalSolicitud] = useState(false);
  const [modalReunion, setModalReunion] = useState(false);
  const [modalConfirmacion, setModalConfirmacion] = useState(false);

  // ===== CÁLCULOS =====
  const progresoGeneral = useMemo(() => {
    const promedioActividades =
      (actividades['estudios-preliminares'].progreso +
        actividades['solicitud-informacion'].progreso +
        actividades['reunion-apertura'].progreso) / 3;
    return Math.round(promedioActividades);
  }, [actividades]);

  const actividadesCompletadas = useMemo(() => {
    return Object.values(actividades).filter((act) => act.estado === 'completada').length;
  }, [actividades]);

  const puedeAvanzarEjecucion = useMemo(() => {
    return actividadesCompletadas === 3 && progresoGeneral === 100;
  }, [actividadesCompletadas, progresoGeneral]);

  const diasRestantes = useMemo(() => {
    const hoy = new Date();
    const fin = new Date(auditoria.cronograma.fechaFin);
    const diff = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [auditoria.cronograma.fechaFin]);

  // ===== FUNCIONES =====
  const toggleChecklistItem = (actividadId: ActividadPlaneacion, itemId: string) => {
    setActividades((prev) => {
      const actividad = prev[actividadId];
      const nuevoChecklist = actividad.checklist.map((item) =>
        item.id === itemId
          ? {
              ...item,
              completado: !item.completado,
              fechaCompletado: !item.completado ? new Date() : undefined,
            }
          : item
      );

      const completados = nuevoChecklist.filter((item) => item.completado).length;
      const nuevoProgreso = Math.round((completados / nuevoChecklist.length) * 100);
      const nuevoEstado: EstadoActividad =
        nuevoProgreso === 100 ? 'completada' : nuevoProgreso > 0 ? 'en-progreso' : 'pendiente';

      return {
        ...prev,
        [actividadId]: {
          ...actividad,
          checklist: nuevoChecklist,
          progreso: nuevoProgreso,
          estado: nuevoEstado,
        },
      };
    });

    toast.success('Checklist actualizado');
  };

  const agregarDocumento = (actividadId: ActividadPlaneacion, archivo: File) => {
    const nuevoDoc: DocumentoActividad = {
      id: `doc-${Date.now()}`,
      nombre: archivo.name,
      tipo: archivo.type,
      size: `${(archivo.size / 1024).toFixed(0)} KB`,
      fechaCarga: new Date(),
      cargadoPor: auditoria.auditorLider.nombre,
    };

    setActividades((prev) => ({
      ...prev,
      [actividadId]: {
        ...prev[actividadId],
        documentos: [...prev[actividadId].documentos, nuevoDoc],
      },
    }));

    toast.success(`Documento "${archivo.name}" cargado exitosamente`);
  };

  const enviarSolicitudInformacion = (data: Partial<SolicitudInformacion>) => {
    const nuevaSolicitud: SolicitudInformacion = {
      id: `SOL-${Date.now()}`,
      asunto: data.asunto || '',
      detalle: data.detalle || '',
      documentosSolicitados: data.documentosSolicitados || [],
      plazoRespuesta: data.plazoRespuesta || new Date(),
      estadoRespuesta: 'pendiente',
      respuestas: [],
    };

    setSolicitudInfo(nuevaSolicitud);
    
    // Marcar el item del checklist como completado
    toggleChecklistItem('solicitud-informacion', 'si4');
    toggleChecklistItem('solicitud-informacion', 'si5');

    toast.success(`Solicitud enviada a ${auditoria.responsableArea.nombre}`, {
      description: 'El área auditada recibirá notificación por correo electrónico',
    });

    setModalSolicitud(false);
  };

  const programarReunion = (data: ReunionApertura) => {
    setReunion(data);
    
    // Marcar items del checklist
    toggleChecklistItem('reunion-apertura', 'ra1');
    toggleChecklistItem('reunion-apertura', 'ra3');

    toast.success('Reunión de apertura programada', {
      description: `${data.fecha?.toLocaleDateString()} a las ${data.hora}`,
    });

    setModalReunion(false);
  };

  const confirmarAvanceEjecucion = () => {
    if (!puedeAvanzarEjecucion) {
      toast.error('No se puede avanzar a Ejecución', {
        description: 'Debe completar todas las actividades de planeación',
      });
      return;
    }

    setModalConfirmacion(true);
  };

  const ejecutarAvanceEjecucion = () => {
    // Registrar en auditoría
    console.log('Avanzando a fase de Ejecución:', {
      auditoriaId: auditoria.id,
      fasePlaneacionCompletada: new Date(),
      progreso: progresoGeneral,
      actividades: Object.values(actividades).map((act) => ({
        id: act.id,
        estado: act.estado,
        progreso: act.progreso,
      })),
    });

    toast.success('¡Fase de Planeación completada!', {
      description: 'La auditoría avanzará a la fase de Ejecución',
    });

    setModalConfirmacion(false);
    onAvanzarEjecucion();
  };

  // ===== RENDER =====
  const actividadDatos = actividades[actividadActiva];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <FileSearch className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl text-gray-900">Fase de Planeación</h1>
                  <p className="text-sm text-gray-600">{auditoria.codigo} - {auditoria.nombre}</p>
                </div>
              </div>

              {/* Metadatos */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Target className="w-4 h-4" />
                  <span>{auditoria.areaAuditable}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(auditoria.cronograma.fechaInicio).toLocaleDateString()} -{' '}
                    {new Date(auditoria.cronograma.fechaFin).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-600">
                    {diasRestantes} {diasRestantes === 1 ? 'día restante' : 'días restantes'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Barra de progreso general */}
          <div className="mt-4 bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-gray-900">Progreso General de Planeación</span>
              </div>
              <span className="text-sm text-gray-900">{progresoGeneral}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-600"
                initial={{ width: 0 }}
                animate={{ width: `${progresoGeneral}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
              <span>
                {actividadesCompletadas} de 3 actividades completadas
              </span>
              {puedeAvanzarEjecucion && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Lista para Ejecución
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Navegación de actividades */}
          <div className="lg:col-span-1">
            <CardSIGL className="sticky top-32">
              <h3 className="text-sm text-gray-700 mb-4">Actividades de Planeación</h3>
              <div className="space-y-2">
                {Object.values(actividades).map((actividad) => (
                  <button
                    key={actividad.id}
                    onClick={() => setActividadActiva(actividad.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                      actividadActiva === actividad.id
                        ? 'bg-blue-50 border-2 border-blue-200'
                        : 'bg-white border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: `${actividad.color}15`,
                          color: actividad.color,
                        }}
                      >
                        {actividad.icono}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-gray-900 truncate">
                            {actividad.titulo}
                          </p>
                          {actividad.estado === 'completada' && (
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 ml-2" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${actividad.progreso}%`,
                                backgroundColor: actividad.color,
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">
                            {actividad.progreso}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Botón de avance */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <ButtonSIGL
                  variant={puedeAvanzarEjecucion ? 'primary' : 'secondary'}
                  onClick={confirmarAvanceEjecucion}
                  disabled={!puedeAvanzarEjecucion}
                  className="w-full"
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Avanzar a Ejecución
                </ButtonSIGL>
                {!puedeAvanzarEjecucion && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Complete todas las actividades primero
                  </p>
                )}
              </div>
            </CardSIGL>
          </div>

          {/* Área principal - Detalle de actividad */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={actividadActiva}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Header de actividad */}
                <CardSIGL className="mb-6">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: `${actividadDatos.color}15`,
                        color: actividadDatos.color,
                      }}
                    >
                      {actividadDatos.icono}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h2 className="text-xl text-gray-900">
                          {actividadDatos.titulo}
                        </h2>
                        <BadgeSIGL
                          variant={
                            actividadDatos.estado === 'completada'
                              ? 'success'
                              : actividadDatos.estado === 'en-progreso'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {actividadDatos.estado === 'completada'
                            ? 'Completada'
                            : actividadDatos.estado === 'en-progreso'
                            ? 'En Progreso'
                            : 'Pendiente'}
                        </BadgeSIGL>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        {actividadDatos.descripcion}
                      </p>

                      {/* Barra de progreso de actividad */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-700">
                            Progreso de la actividad
                          </span>
                          <span className="text-xs text-gray-900">
                            {actividadDatos.progreso}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${actividadDatos.progreso}%`,
                              backgroundColor: actividadDatos.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardSIGL>

                {/* Checklist */}
                <CardSIGL className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm text-gray-900 flex items-center gap-2">
                      <ClipboardCheck className="w-5 h-5 text-blue-600" />
                      Lista de Verificación
                    </h3>
                    <span className="text-xs text-gray-600">
                      {actividadDatos.checklist.filter((item) => item.completado).length} de{' '}
                      {actividadDatos.checklist.length} completados
                    </span>
                  </div>

                  <div className="space-y-2">
                    {actividadDatos.checklist.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:border-gray-300 ${
                          item.completado
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-gray-200'
                        }`}
                        onClick={() => toggleChecklistItem(actividadActiva, item.id)}
                      >
                        <div className="pt-0.5">
                          {item.completado ? (
                            <CheckSquare className="w-5 h-5 text-green-600" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-300 rounded" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p
                            className={`text-sm ${
                              item.completado
                                ? 'text-gray-500 line-through'
                                : 'text-gray-900'
                            }`}
                          >
                            {item.descripcion}
                          </p>
                          {item.fechaCompletado && (
                            <p className="text-xs text-gray-500 mt-1">
                              Completado el{' '}
                              {new Date(item.fechaCompletado).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardSIGL>

                {/* Acciones especiales por actividad */}
                {actividadActiva === 'solicitud-informacion' && (
                  <CardSIGL className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm text-gray-900 flex items-center gap-2">
                        <Send className="w-5 h-5 text-amber-600" />
                        Solicitud Formal de Información
                      </h3>
                    </div>

                    {!solicitudInfo ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FileText className="w-8 h-8 text-amber-600" />
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          Aún no se ha enviado la solicitud de información al área auditada
                        </p>
                        <ButtonSIGL
                          variant="primary"
                          onClick={() => setModalSolicitud(true)}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Elaborar y Enviar Solicitud
                        </ButtonSIGL>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm text-gray-900 mb-1">
                                <strong>Solicitud enviada:</strong> {solicitudInfo.asunto}
                              </p>
                              <p className="text-xs text-gray-600 mb-2">
                                Plazo de respuesta:{' '}
                                {new Date(solicitudInfo.plazoRespuesta).toLocaleDateString()}
                              </p>
                              <BadgeSIGL
                                variant={
                                  solicitudInfo.estadoRespuesta === 'completa'
                                    ? 'success'
                                    : solicitudInfo.estadoRespuesta === 'parcial'
                                    ? 'warning'
                                    : 'default'
                                }
                              >
                                {solicitudInfo.estadoRespuesta === 'completa'
                                  ? 'Respuesta completa'
                                  : solicitudInfo.estadoRespuesta === 'parcial'
                                  ? 'Respuesta parcial'
                                  : 'Pendiente de respuesta'}
                              </BadgeSIGL>
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-gray-700 mb-2">
                            Documentos solicitados:
                          </p>
                          <ul className="space-y-1">
                            {solicitudInfo.documentosSolicitados.map((doc, idx) => (
                              <li
                                key={idx}
                                className="text-sm text-gray-600 flex items-center gap-2"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                {doc}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </CardSIGL>
                )}

                {actividadActiva === 'reunion-apertura' && (
                  <CardSIGL className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm text-gray-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-green-600" />
                        Reunión de Apertura
                      </h3>
                    </div>

                    {!reunion.fecha ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Calendar className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          Programe la reunión de apertura con el área auditada
                        </p>
                        <ButtonSIGL
                          variant="primary"
                          onClick={() => setModalReunion(true)}
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Programar Reunión
                        </ButtonSIGL>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm text-gray-900 mb-1">
                                <strong>Reunión programada</strong>
                              </p>
                              <p className="text-sm text-gray-600">
                                Fecha: {reunion.fecha.toLocaleDateString()} a las{' '}
                                {reunion.hora}
                              </p>
                              <p className="text-sm text-gray-600">
                                Modalidad: {reunion.modalidad}
                              </p>
                              {reunion.enlaceVirtual && (
                                <p className="text-sm text-gray-600">
                                  Enlace:{' '}
                                  <a
                                    href={reunion.enlaceVirtual}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    {reunion.enlaceVirtual}
                                  </a>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-gray-700 mb-2">Agenda:</p>
                          <ul className="space-y-1">
                            {reunion.agenda.map((item, idx) => (
                              <li
                                key={idx}
                                className="text-sm text-gray-600 flex items-center gap-2"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {reunion.estadoActa === 'pendiente' && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <p className="text-sm text-amber-800 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              Pendiente: Elaborar acta de la reunión después de realizarla
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardSIGL>
                )}

                {/* Documentos */}
                <CardSIGL>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm text-gray-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Documentos de la Actividad
                    </h3>
                    <input
                      type="file"
                      id={`file-${actividadActiva}`}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          agregarDocumento(actividadActiva, file);
                        }
                      }}
                    />
                    <label htmlFor={`file-${actividadActiva}`}>
                      <ButtonSIGL variant="secondary" className="cursor-pointer" asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Cargar Documento
                        </span>
                      </ButtonSIGL>
                    </label>
                  </div>

                  {actividadDatos.documentos.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      No hay documentos cargados
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {actividadDatos.documentos.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                        >
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">
                              {doc.nombre}
                            </p>
                            <p className="text-xs text-gray-500">
                              {doc.size} • {new Date(doc.fechaCarga).toLocaleDateString()} •{' '}
                              {doc.cargadoPor}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                              <Eye className="w-4 h-4 text-gray-600" />
                            </button>
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                              <Download className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardSIGL>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* MODALES */}
      
      {/* Modal Solicitud de Información */}
      <ModalSIGL
        isOpen={modalSolicitud}
        onClose={() => setModalSolicitud(false)}
        title="Elaborar Solicitud de Información"
        size="large"
      >
        <FormularioSolicitudInformacion
          auditoria={auditoria}
          onEnviar={enviarSolicitudInformacion}
          onCancelar={() => setModalSolicitud(false)}
        />
      </ModalSIGL>

      {/* Modal Reunión de Apertura */}
      <ModalSIGL
        isOpen={modalReunion}
        onClose={() => setModalReunion(false)}
        title="Programar Reunión de Apertura"
        size="large"
      >
        <FormularioReunionApertura
          auditoria={auditoria}
          onProgramar={programarReunion}
          onCancelar={() => setModalReunion(false)}
        />
      </ModalSIGL>

      {/* Modal Confirmación Avance */}
      <ModalSIGL
        isOpen={modalConfirmacion}
        onClose={() => setModalConfirmacion(false)}
        title="Confirmar Avance a Ejecución"
      >
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-900 mb-1">
                  <strong>Fase de Planeación completada exitosamente</strong>
                </p>
                <p className="text-sm text-gray-600">
                  Todas las actividades han sido completadas. La auditoría está lista para
                  iniciar la fase de Ejecución.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-3">Resumen de actividades completadas:</p>
            <ul className="space-y-2">
              {Object.values(actividades).map((act) => (
                <li key={act.id} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  {act.titulo} ({act.progreso}%)
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3">
            <ButtonSIGL
              variant="secondary"
              onClick={() => setModalConfirmacion(false)}
              className="flex-1"
            >
              Cancelar
            </ButtonSIGL>
            <ButtonSIGL
              variant="primary"
              onClick={ejecutarAvanceEjecucion}
              className="flex-1"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Avanzar a Ejecución
            </ButtonSIGL>
          </div>
        </div>
      </ModalSIGL>
    </div>
  );
}

// ============ COMPONENTES AUXILIARES ============

interface FormularioSolicitudInformacionProps {
  auditoria: Auditoria;
  onEnviar: (data: Partial<SolicitudInformacion>) => void;
  onCancelar: () => void;
}

function FormularioSolicitudInformacion({
  auditoria,
  onEnviar,
  onCancelar,
}: FormularioSolicitudInformacionProps) {
  const [asunto, setAsunto] = useState('');
  const [detalle, setDetalle] = useState('');
  const [documentos, setDocumentos] = useState<string[]>(['']);
  const [plazoRespuesta, setPlazoRespuesta] = useState<Date>(
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 días por defecto
  );

  const agregarDocumento = () => {
    setDocumentos([...documentos, '']);
  };

  const actualizarDocumento = (index: number, valor: string) => {
    const nuevos = [...documentos];
    nuevos[index] = valor;
    setDocumentos(nuevos);
  };

  const eliminarDocumento = (index: number) => {
    setDocumentos(documentos.filter((_, i) => i !== index));
  };

  const handleEnviar = () => {
    if (!asunto || !detalle || documentos.filter((d) => d.trim()).length === 0) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }

    onEnviar({
      asunto,
      detalle,
      documentosSolicitados: documentos.filter((d) => d.trim()),
      plazoRespuesta,
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Destinatario:</strong> {auditoria.responsableArea.nombre} ({auditoria.responsableArea.cargo})
        </p>
        <p className="text-sm text-blue-800">
          <strong>Email:</strong> {auditoria.responsableArea.email}
        </p>
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-2">
          Asunto de la Solicitud <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={asunto}
          onChange={(e) => setAsunto(e.target.value)}
          placeholder="Ej: Solicitud de información para auditoría interna..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-2">
          Detalle de la Solicitud <span className="text-red-500">*</span>
        </label>
        <textarea
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          placeholder="Describa el contexto y propósito de la solicitud..."
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-gray-700">
            Documentos Solicitados <span className="text-red-500">*</span>
          </label>
          <button
            onClick={agregarDocumento}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            + Agregar documento
          </button>
        </div>
        <div className="space-y-2">
          {documentos.map((doc, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={doc}
                onChange={(e) => actualizarDocumento(idx, e.target.value)}
                placeholder="Nombre del documento solicitado"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {documentos.length > 1 && (
                <button
                  onClick={() => eliminarDocumento(idx)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-2">
          Plazo de Respuesta
        </label>
        <input
          type="date"
          value={plazoRespuesta.toISOString().split('T')[0]}
          onChange={(e) => setPlazoRespuesta(new Date(e.target.value))}
          min={new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Mínimo recomendado: 5 días hábiles
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <ButtonSIGL variant="secondary" onClick={onCancelar} className="flex-1">
          Cancelar
        </ButtonSIGL>
        <ButtonSIGL variant="primary" onClick={handleEnviar} className="flex-1">
          <Send className="w-4 h-4 mr-2" />
          Enviar Solicitud
        </ButtonSIGL>
      </div>
    </div>
  );
}

interface FormularioReunionAperturaProps {
  auditoria: Auditoria;
  onProgramar: (data: ReunionApertura) => void;
  onCancelar: () => void;
}

function FormularioReunionApertura({
  auditoria,
  onProgramar,
  onCancelar,
}: FormularioReunionAperturaProps) {
  const [fecha, setFecha] = useState<Date | undefined>(undefined);
  const [hora, setHora] = useState('09:00');
  const [lugar, setLugar] = useState('');
  const [modalidad, setModalidad] = useState<'presencial' | 'virtual' | 'hibrida'>('virtual');
  const [enlaceVirtual, setEnlaceVirtual] = useState('');

  const handleProgramar = () => {
    if (!fecha || !hora || !lugar) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }

    if (modalidad !== 'presencial' && !enlaceVirtual) {
      toast.error('Debe proporcionar un enlace para reuniones virtuales o híbridas');
      return;
    }

    onProgramar({
      fecha,
      hora,
      lugar,
      modalidad,
      enlaceVirtual: modalidad !== 'presencial' ? enlaceVirtual : undefined,
      agenda: [
        'Presentación del equipo auditor',
        'Explicación del alcance de la auditoría',
        'Cronograma de actividades',
        'Coordinación de entrevistas',
        'Preguntas y respuestas',
      ],
      participantes: [
        {
          nombre: auditoria.auditorLider.nombre,
          rol: 'Auditor Líder',
          confirmado: true,
        },
        {
          nombre: auditoria.responsableArea.nombre,
          rol: 'Responsable del Área',
          confirmado: false,
        },
        ...auditoria.equipoAuditores.map((a) => ({
          nombre: a.nombre,
          rol: 'Auditor',
          confirmado: true,
        })),
      ],
      estadoActa: 'pendiente',
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Fecha <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={fecha?.toISOString().split('T')[0] || ''}
            onChange={(e) => setFecha(new Date(e.target.value))}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Hora <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-2">
          Modalidad <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['presencial', 'virtual', 'hibrida'] as const).map((mod) => (
            <button
              key={mod}
              onClick={() => setModalidad(mod)}
              className={`px-4 py-2 rounded-lg border-2 text-sm transition-all ${
                modalidad === mod
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {mod.charAt(0).toUpperCase() + mod.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-2">
          Lugar <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={lugar}
          onChange={(e) => setLugar(e.target.value)}
          placeholder="Ej: Sala de Juntas - Piso 3"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {modalidad !== 'presencial' && (
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Enlace Virtual <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={enlaceVirtual}
            onChange={(e) => setEnlaceVirtual(e.target.value)}
            placeholder="https://teams.microsoft.com/..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-700 mb-2">Agenda predeterminada:</p>
        <ul className="space-y-1">
          {[
            'Presentación del equipo auditor',
            'Explicación del alcance de la auditoría',
            'Cronograma de actividades',
            'Coordinación de entrevistas',
            'Preguntas y respuestas',
          ].map((item, idx) => (
            <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-3 pt-4">
        <ButtonSIGL variant="secondary" onClick={onCancelar} className="flex-1">
          Cancelar
        </ButtonSIGL>
        <ButtonSIGL variant="primary" onClick={handleProgramar} className="flex-1">
          <Calendar className="w-4 h-4 mr-2" />
          Programar Reunión
        </ButtonSIGL>
      </div>
    </div>
  );
}