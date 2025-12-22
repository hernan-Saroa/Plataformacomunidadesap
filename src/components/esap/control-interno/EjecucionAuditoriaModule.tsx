/**
 * ============================================
 * RF006: AUDITORÍA - FASE DE EJECUCIÓN
 * ============================================
 * 
 * Gestión integral de la fase de ejecución de auditorías internas
 * Basado en: EM-PT-004 - Auditorías Internas V3
 * 
 * FUNCIONALIDADES PRINCIPALES:
 * - Dashboard de progreso de ejecución en tiempo real
 * - Aplicación de listas de chequeo digitales (RF007)
 * - Registro estructurado de hallazgos (RF008)
 * - Gestión de evidencias multimedia
 * - Cronograma de actividades de campo
 * - Coordinación del equipo auditor
 * - Reunión de cierre con el área auditada
 * - Validación antes de avanzar a Comunicación
 * 
 * DURACIÓN:
 * - Auditorías Sede: 10-30 días hábiles
 * - Auditorías Territoriales: 4 días hábiles (FIJO)
 * 
 * WORKFLOW:
 * Inicio → Planeación → EJECUCIÓN (ESTA FASE) → Comunicación → Seguimiento
 * 
 * INTEGRACIÓN:
 * - RF005 (Planeación) → Recibe planeación completada
 * - RF009 (Comunicación) → Envía hallazgos y evidencias
 * - Expediente Digital → Almacena toda la documentación
 * - Sistema de Notificaciones → Alertas al equipo y área
 * 
 * ÚLTIMA ACTUALIZACIÓN: 21 Diciembre 2025
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardCheck, AlertTriangle, FileText, Camera, Users, 
  Calendar, CheckCircle, X, Save, Eye, Download, Upload,
  Target, TrendingUp, Clock, MapPin, Edit2, Trash2, Plus,
  Search, Filter, MessageSquare, ChevronRight, PlayCircle,
  AlertCircle, Shield, FileCheck, Sparkles, Info, Send
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Design system
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/Button';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { ModalSIGL } from '../gestion-legal/design-system/ModalSIGL';

// ============ TIPOS ============

type SeccionEjecucion = 'dashboard' | 'listas-chequeo' | 'hallazgos' | 'evidencias' | 'cronograma' | 'reunion-cierre';
type GravedadHallazgo = 'leve' | 'moderado' | 'grave';
type EstadoHallazgo = 'identificado' | 'validado' | 'en-analisis' | 'cerrado';
type RespuestaChequeo = 'cumple' | 'no-cumple' | 'parcial' | 'no-aplica';

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

interface ListaChequeo {
  id: string;
  nombre: string;
  proceso: string;
  version: string;
  totalItems: number;
  itemsCompletados: number;
  items: ItemChequeo[];
  aplicadaPor?: string;
  fechaAplicacion?: Date;
}

interface ItemChequeo {
  id: string;
  numero: string;
  criterio: string;
  descripcion: string;
  normaReferencia?: string;
  respuesta?: RespuestaChequeo;
  observaciones?: string;
  evidenciaId?: string;
  fechaRespuesta?: Date;
  responsable?: string;
}

interface Hallazgo {
  id: string;
  numero: string;
  titulo: string;
  descripcion: string;
  gravedad: GravedadHallazgo;
  estado: EstadoHallazgo;
  proceso: string;
  criterioIncumplido: string;
  causas: string[];
  efectos: string[];
  recomendaciones: string[];
  evidencias: string[]; // IDs de evidencias
  identificadoPor: string;
  fechaIdentificacion: Date;
  validadoPor?: string;
  fechaValidacion?: Date;
  observacionesArea?: string;
}

interface Evidencia {
  id: string;
  tipo: 'documento' | 'fotografia' | 'video' | 'captura' | 'otro';
  nombre: string;
  descripcion: string;
  archivo?: File;
  url?: string;
  size?: string;
  relacionadoCon: 'hallazgo' | 'chequeo' | 'general';
  relacionadoId?: string;
  cargadoPor: string;
  fechaCarga: Date;
  tags: string[];
}

interface ActividadEjecucion {
  id: string;
  titulo: string;
  descripcion: string;
  responsable: string;
  fechaProgramada: Date;
  fechaRealizada?: Date;
  estado: 'pendiente' | 'en-proceso' | 'completada';
  observaciones?: string;
}

interface ReunionCierre {
  programada: boolean;
  fecha?: Date;
  hora?: string;
  lugar: string;
  modalidad: 'presencial' | 'virtual' | 'hibrida';
  enlaceVirtual?: string;
  participantes: {
    nombre: string;
    rol: string;
    confirmado: boolean;
  }[];
  temasPresentados: string[];
  hallazgosPresentados: string[]; // IDs de hallazgos
  actaElaborada: boolean;
  actaFirmada: boolean;
  observacionesArea?: string;
}

// ============ DATOS DE EJEMPLO ============

const LISTAS_CHEQUEO_DISPONIBLES: ListaChequeo[] = [
  {
    id: 'lc-001',
    nombre: 'Lista de Chequeo - Gestión Financiera',
    proceso: 'Gestión Financiera',
    version: 'V2.0',
    totalItems: 15,
    itemsCompletados: 0,
    items: [
      {
        id: 'item-001',
        numero: '1.1',
        criterio: 'Control de Presupuesto',
        descripcion: '¿Se realiza seguimiento mensual a la ejecución presupuestal?',
        normaReferencia: 'Decreto 1068/2015',
      },
      {
        id: 'item-002',
        numero: '1.2',
        criterio: 'Registro Contable',
        descripcion: '¿Los registros contables se realizan con soporte documental adecuado?',
        normaReferencia: 'Resolución 357/2008',
      },
      {
        id: 'item-003',
        numero: '1.3',
        criterio: 'Conciliación Bancaria',
        descripcion: '¿Se realizan conciliaciones bancarias mensuales?',
        normaReferencia: 'Circular 003/2016',
      },
      {
        id: 'item-004',
        numero: '2.1',
        criterio: 'Control de Pagos',
        descripcion: '¿Existe segregación de funciones en el proceso de pagos?',
        normaReferencia: 'MECI - Componente Control',
      },
      {
        id: 'item-005',
        numero: '2.2',
        criterio: 'Documentación de Pagos',
        descripcion: '¿Todos los pagos cuentan con documentación de soporte completa?',
        normaReferencia: 'Ley 1474/2011',
      },
    ],
  },
  {
    id: 'lc-002',
    nombre: 'Lista de Chequeo - Gestión Administrativa',
    proceso: 'Gestión Administrativa',
    version: 'V1.5',
    totalItems: 12,
    itemsCompletados: 0,
    items: [
      {
        id: 'item-101',
        numero: '1.1',
        criterio: 'Gestión Documental',
        descripcion: '¿Se cumple con la Tabla de Retención Documental aprobada?',
        normaReferencia: 'Ley 594/2000',
      },
      {
        id: 'item-102',
        numero: '1.2',
        criterio: 'Archivo de Gestión',
        descripcion: '¿Los documentos se organizan según el Sistema de Gestión Documental?',
        normaReferencia: 'Acuerdo 060/2001',
      },
      {
        id: 'item-103',
        numero: '2.1',
        criterio: 'Control de Inventarios',
        descripcion: '¿Se realiza inventario físico de los activos fijos anualmente?',
        normaReferencia: 'Resolución 354/2007',
      },
    ],
  },
];

// ============ COMPONENTE PRINCIPAL ============

interface EjecucionAuditoriaModuleProps {
  auditoria?: Auditoria;
  onClose?: () => void;
  onAvanzarComunicacion?: () => void;
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
    fechaInicio: new Date(2025, 0, 26),
    fechaFin: new Date(2025, 1, 15),
    duracionDias: 20,
  },
  stage: 'ejecucion',
};

export function EjecucionAuditoriaModule({
  auditoria = AUDITORIA_EJEMPLO,
  onClose = () => {},
  onAvanzarComunicacion = () => {},
}: EjecucionAuditoriaModuleProps = {}) {
  // ===== ESTADO =====
  const [seccionActiva, setSeccionActiva] = useState<SeccionEjecucion>('dashboard');
  
  // Listas de chequeo
  const [listasAplicadas, setListasAplicadas] = useState<ListaChequeo[]>([]);
  const [listaActual, setListaActual] = useState<ListaChequeo | null>(null);
  
  // Hallazgos
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([]);
  const [hallazgoSeleccionado, setHallazgoSeleccionado] = useState<Hallazgo | null>(null);
  
  // Evidencias
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  
  // Cronograma
  const [actividades, setActividades] = useState<ActividadEjecucion[]>([
    {
      id: 'act-001',
      titulo: 'Aplicar listas de chequeo',
      descripcion: 'Aplicar todas las listas de chequeo definidas para el proceso',
      responsable: auditoria.auditorLider.nombre,
      fechaProgramada: new Date(auditoria.cronograma.fechaInicio),
      estado: 'en-proceso',
    },
    {
      id: 'act-002',
      titulo: 'Entrevista con responsable del área',
      descripcion: 'Realizar entrevista con el responsable del área auditada',
      responsable: auditoria.auditorLider.nombre,
      fechaProgramada: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      estado: 'pendiente',
    },
    {
      id: 'act-003',
      titulo: 'Revisión de documentación',
      descripcion: 'Revisar documentación solicitada en la fase de planeación',
      responsable: auditoria.equipoAuditores[0]?.nombre || '',
      fechaProgramada: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      estado: 'pendiente',
    },
  ]);
  
  // Reunión de cierre
  const [reunionCierre, setReunionCierre] = useState<ReunionCierre>({
    programada: false,
    lugar: '',
    modalidad: 'virtual',
    participantes: [],
    temasPresentados: [
      'Presentación de hallazgos identificados',
      'Explicación de evidencias recopiladas',
      'Recomendaciones preliminares',
      'Solicitud de aclaraciones al área',
      'Próximos pasos: Informe preliminar',
    ],
    hallazgosPresentados: [],
    actaElaborada: false,
    actaFirmada: false,
  });
  
  // Modales
  const [modalNuevaLista, setModalNuevaLista] = useState(false);
  const [modalNuevoHallazgo, setModalNuevoHallazgo] = useState(false);
  const [modalNuevaEvidencia, setModalNuevaEvidencia] = useState(false);
  const [modalReunionCierre, setModalReunionCierre] = useState(false);
  const [modalConfirmacion, setModalConfirmacion] = useState(false);

  // ===== CÁLCULOS =====
  const progresoGeneral = useMemo(() => {
    const totalTareas = 5; // Listas, Hallazgos, Evidencias, Actividades, Reunión
    let completadas = 0;

    // Listas de chequeo aplicadas
    if (listasAplicadas.length > 0 && listasAplicadas.every(l => l.itemsCompletados === l.totalItems)) {
      completadas++;
    }

    // Hallazgos identificados y validados
    if (hallazgos.length > 0 && hallazgos.every(h => h.estado === 'validado')) {
      completadas++;
    }

    // Evidencias cargadas
    if (evidencias.length >= 3) {
      completadas++;
    }

    // Actividades completadas
    if (actividades.every(a => a.estado === 'completada')) {
      completadas++;
    }

    // Reunión de cierre
    if (reunionCierre.programada && reunionCierre.actaFirmada) {
      completadas++;
    }

    return Math.round((completadas / totalTareas) * 100);
  }, [listasAplicadas, hallazgos, evidencias, actividades, reunionCierre]);

  const diasTranscurridos = useMemo(() => {
    const inicio = new Date(auditoria.cronograma.fechaInicio);
    const hoy = new Date();
    const diff = Math.ceil((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [auditoria.cronograma.fechaInicio]);

  const diasRestantes = useMemo(() => {
    const hoy = new Date();
    const fin = new Date(auditoria.cronograma.fechaFin);
    const diff = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [auditoria.cronograma.fechaFin]);

  const puedeAvanzarComunicacion = useMemo(() => {
    return (
      listasAplicadas.length > 0 &&
      hallazgos.length > 0 &&
      hallazgos.every(h => h.estado === 'validado') &&
      evidencias.length > 0 &&
      reunionCierre.programada &&
      reunionCierre.actaFirmada
    );
  }, [listasAplicadas, hallazgos, evidencias, reunionCierre]);

  const estadisticasHallazgos = useMemo(() => {
    const leves = hallazgos.filter(h => h.gravedad === 'leve').length;
    const moderados = hallazgos.filter(h => h.gravedad === 'moderado').length;
    const graves = hallazgos.filter(h => h.gravedad === 'grave').length;

    return { leves, moderados, graves, total: hallazgos.length };
  }, [hallazgos]);

  // ===== FUNCIONES =====
  const aplicarLista = (listaId: string) => {
    const listaBase = LISTAS_CHEQUEO_DISPONIBLES.find(l => l.id === listaId);
    if (!listaBase) return;

    const nuevaLista: ListaChequeo = {
      ...listaBase,
      id: `aplicada-${Date.now()}`,
      aplicadaPor: auditoria.auditorLider.nombre,
      fechaAplicacion: new Date(),
    };

    setListasAplicadas([...listasAplicadas, nuevaLista]);
    setListaActual(nuevaLista);
    setModalNuevaLista(false);
    setSeccionActiva('listas-chequeo');

    toast.success(`Lista de chequeo "${listaBase.nombre}" aplicada`, {
      description: 'Puede comenzar a responder los items',
    });
  };

  const responderItemChequeo = (
    listaId: string,
    itemId: string,
    respuesta: RespuestaChequeo,
    observaciones?: string
  ) => {
    setListasAplicadas(prevListas =>
      prevListas.map(lista => {
        if (lista.id !== listaId) return lista;

        const itemsActualizados = lista.items.map(item => {
          if (item.id !== itemId) return item;

          return {
            ...item,
            respuesta,
            observaciones,
            fechaRespuesta: new Date(),
            responsable: auditoria.auditorLider.nombre,
          };
        });

        const completados = itemsActualizados.filter(i => i.respuesta).length;

        return {
          ...lista,
          items: itemsActualizados,
          itemsCompletados: completados,
        };
      })
    );

    // Actualizar lista actual si es la que se está editando
    if (listaActual?.id === listaId) {
      const listaActualizada = listasAplicadas.find(l => l.id === listaId);
      if (listaActualizada) {
        setListaActual({
          ...listaActualizada,
          items: listaActualizada.items.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                respuesta,
                observaciones,
                fechaRespuesta: new Date(),
                responsable: auditoria.auditorLider.nombre,
              };
            }
            return item;
          }),
        });
      }
    }

    toast.success('Respuesta registrada');
  };

  const crearHallazgo = (datos: Partial<Hallazgo>) => {
    const nuevoHallazgo: Hallazgo = {
      id: `hall-${Date.now()}`,
      numero: `H-${hallazgos.length + 1}`,
      titulo: datos.titulo || '',
      descripcion: datos.descripcion || '',
      gravedad: datos.gravedad || 'moderado',
      estado: 'identificado',
      proceso: auditoria.procesoNombre,
      criterioIncumplido: datos.criterioIncumplido || '',
      causas: datos.causas || [],
      efectos: datos.efectos || [],
      recomendaciones: datos.recomendaciones || [],
      evidencias: datos.evidencias || [],
      identificadoPor: auditoria.auditorLider.nombre,
      fechaIdentificacion: new Date(),
    };

    setHallazgos([...hallazgos, nuevoHallazgo]);
    setModalNuevoHallazgo(false);

    toast.success('Hallazgo registrado exitosamente', {
      description: `${nuevoHallazgo.numero} - Gravedad: ${nuevoHallazgo.gravedad}`,
    });
  };

  const validarHallazgo = (hallazgoId: string) => {
    setHallazgos(prevHallazgos =>
      prevHallazgos.map(h => {
        if (h.id !== hallazgoId) return h;

        return {
          ...h,
          estado: 'validado',
          validadoPor: auditoria.auditorLider.nombre,
          fechaValidacion: new Date(),
        };
      })
    );

    toast.success('Hallazgo validado');
  };

  const cargarEvidencia = (datos: Partial<Evidencia>) => {
    const nuevaEvidencia: Evidencia = {
      id: `ev-${Date.now()}`,
      tipo: datos.tipo || 'documento',
      nombre: datos.nombre || '',
      descripcion: datos.descripcion || '',
      archivo: datos.archivo,
      size: datos.archivo ? `${(datos.archivo.size / 1024).toFixed(0)} KB` : undefined,
      relacionadoCon: datos.relacionadoCon || 'general',
      relacionadoId: datos.relacionadoId,
      cargadoPor: auditoria.auditorLider.nombre,
      fechaCarga: new Date(),
      tags: datos.tags || [],
    };

    setEvidencias([...evidencias, nuevaEvidencia]);
    setModalNuevaEvidencia(false);

    toast.success('Evidencia cargada exitosamente');
  };

  const programarReunionCierre = (datos: ReunionCierre) => {
    setReunionCierre({
      ...datos,
      programada: true,
      hallazgosPresentados: hallazgos.map(h => h.id),
    });

    setModalReunionCierre(false);

    toast.success('Reunión de cierre programada', {
      description: `${datos.fecha?.toLocaleDateString()} a las ${datos.hora}`,
    });
  };

  const confirmarAvanceComunicacion = () => {
    if (!puedeAvanzarComunicacion) {
      toast.error('No se puede avanzar a Comunicación', {
        description: 'Complete todos los requisitos de la fase de ejecución',
      });
      return;
    }

    setModalConfirmacion(true);
  };

  const ejecutarAvanceComunicacion = () => {
    console.log('Avanzando a fase de Comunicación:', {
      auditoriaId: auditoria.id,
      faseEjecucionCompletada: new Date(),
      progreso: progresoGeneral,
      hallazgos: hallazgos.length,
      evidencias: evidencias.length,
      listasAplicadas: listasAplicadas.length,
    });

    toast.success('¡Fase de Ejecución completada!', {
      description: 'La auditoría avanzará a la fase de Comunicación',
    });

    setModalConfirmacion(false);
    onAvanzarComunicacion();
  };

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <ClipboardCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl text-gray-900">Fase de Ejecución</h1>
                  <p className="text-sm text-gray-600">
                    {auditoria.codigo} - {auditoria.nombre}
                  </p>
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
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="text-orange-600">
                    Día {diasTranscurridos} de {auditoria.cronograma.duracionDias} ({diasRestantes} días restantes)
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
                <TrendingUp className="w-5 h-5 text-orange-600" />
                <span className="text-sm text-gray-900">
                  Progreso General de Ejecución
                </span>
              </div>
              <span className="text-sm text-gray-900">{progresoGeneral}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-orange-500 to-orange-600"
                initial={{ width: 0 }}
                animate={{ width: `${progresoGeneral}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-4">
                <span>Listas: {listasAplicadas.length}</span>
                <span>Hallazgos: {hallazgos.length}</span>
                <span>Evidencias: {evidencias.length}</span>
              </div>
              {puedeAvanzarComunicacion && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Lista para Comunicación
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Navegación de secciones */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6 overflow-x-auto">
          <div className="flex">
            {[
              { id: 'dashboard' as const, label: 'Dashboard', icon: TrendingUp },
              { id: 'listas-chequeo' as const, label: 'Listas de Chequeo', icon: ClipboardCheck },
              { id: 'hallazgos' as const, label: 'Hallazgos', icon: AlertTriangle },
              { id: 'evidencias' as const, label: 'Evidencias', icon: Camera },
              { id: 'cronograma' as const, label: 'Cronograma', icon: Calendar },
              { id: 'reunion-cierre' as const, label: 'Reunión de Cierre', icon: Users },
            ].map(seccion => {
              const Icon = seccion.icon;
              return (
                <button
                  key={seccion.id}
                  onClick={() => setSeccionActiva(seccion.id)}
                  className={`flex-1 px-4 py-3 text-sm transition-all border-b-2 whitespace-nowrap ${
                    seccionActiva === seccion.id
                      ? 'border-orange-500 text-orange-600 bg-orange-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4 inline-block mr-2" />
                  {seccion.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenido de la sección activa */}
        <AnimatePresence mode="wait">
          <motion.div
            key={seccionActiva}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {seccionActiva === 'dashboard' && (
              <DashboardEjecucion
                auditoria={auditoria}
                listasAplicadas={listasAplicadas}
                hallazgos={hallazgos}
                evidencias={evidencias}
                actividades={actividades}
                reunionCierre={reunionCierre}
                progresoGeneral={progresoGeneral}
                puedeAvanzar={puedeAvanzarComunicacion}
                onAvanzar={confirmarAvanceComunicacion}
              />
            )}

            {seccionActiva === 'listas-chequeo' && (
              <SeccionListasChequeo
                listasAplicadas={listasAplicadas}
                listaActual={listaActual}
                onSeleccionarLista={setListaActual}
                onAplicarNuevaLista={() => setModalNuevaLista(true)}
                onResponderItem={responderItemChequeo}
              />
            )}

            {seccionActiva === 'hallazgos' && (
              <SeccionHallazgos
                hallazgos={hallazgos}
                evidencias={evidencias}
                onNuevoHallazgo={() => setModalNuevoHallazgo(true)}
                onSeleccionarHallazgo={setHallazgoSeleccionado}
                onValidarHallazgo={validarHallazgo}
              />
            )}

            {seccionActiva === 'evidencias' && (
              <SeccionEvidencias
                evidencias={evidencias}
                onNuevaEvidencia={() => setModalNuevaEvidencia(true)}
              />
            )}

            {seccionActiva === 'cronograma' && (
              <SeccionCronograma
                actividades={actividades}
                onActualizarActividad={(id, datos) => {
                  setActividades(prev =>
                    prev.map(act => (act.id === id ? { ...act, ...datos } : act))
                  );
                }}
              />
            )}

            {seccionActiva === 'reunion-cierre' && (
              <SeccionReunionCierre
                reunion={reunionCierre}
                hallazgos={hallazgos}
                onProgramar={() => setModalReunionCierre(true)}
                onActualizarReunion={setReunionCierre}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* MODALES */}
      
      {/* Modal Nueva Lista de Chequeo */}
      <ModalSIGL
        isOpen={modalNuevaLista}
        onClose={() => setModalNuevaLista(false)}
        title="Aplicar Lista de Chequeo"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Seleccione una lista de chequeo estándar para aplicar en esta auditoría:
          </p>

          <div className="space-y-3">
            {LISTAS_CHEQUEO_DISPONIBLES.map(lista => (
              <div
                key={lista.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors cursor-pointer"
                onClick={() => aplicarLista(lista.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm text-gray-900 mb-1">{lista.nombre}</h3>
                    <p className="text-xs text-gray-600">
                      Proceso: {lista.proceso} | Versión: {lista.version}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {lista.totalItems} items de verificación
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>

          <ButtonSIGL variant="secondary" onClick={() => setModalNuevaLista(false)} className="w-full">
            Cancelar
          </ButtonSIGL>
        </div>
      </ModalSIGL>

      {/* Modal Nuevo Hallazgo */}
      <ModalSIGL
        isOpen={modalNuevoHallazgo}
        onClose={() => setModalNuevoHallazgo(false)}
        title="Registrar Nuevo Hallazgo"
        size="large"
      >
        <FormularioHallazgo
          onCrear={crearHallazgo}
          onCancelar={() => setModalNuevoHallazgo(false)}
          evidenciasDisponibles={evidencias}
        />
      </ModalSIGL>

      {/* Modal Nueva Evidencia */}
      <ModalSIGL
        isOpen={modalNuevaEvidencia}
        onClose={() => setModalNuevaEvidencia(false)}
        title="Cargar Nueva Evidencia"
      >
        <FormularioEvidencia
          onCargar={cargarEvidencia}
          onCancelar={() => setModalNuevaEvidencia(false)}
        />
      </ModalSIGL>

      {/* Modal Reunión de Cierre */}
      <ModalSIGL
        isOpen={modalReunionCierre}
        onClose={() => setModalReunionCierre(false)}
        title="Programar Reunión de Cierre"
        size="large"
      >
        <FormularioReunionCierre
          auditoria={auditoria}
          onProgramar={programarReunionCierre}
          onCancelar={() => setModalReunionCierre(false)}
        />
      </ModalSIGL>

      {/* Modal Confirmación Avance */}
      <ModalSIGL
        isOpen={modalConfirmacion}
        onClose={() => setModalConfirmacion(false)}
        title="Confirmar Avance a Comunicación"
      >
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-900 mb-1">
                  <strong>Fase de Ejecución completada exitosamente</strong>
                </p>
                <p className="text-sm text-gray-600">
                  Se han completado todas las actividades de ejecución. La auditoría está
                  lista para la fase de Comunicación.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-3">Resumen de la ejecución:</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Listas de chequeo aplicadas: {listasAplicadas.length}
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Hallazgos identificados y validados: {hallazgos.length}
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Evidencias recopiladas: {evidencias.length}
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Reunión de cierre realizada y acta firmada
              </li>
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
              onClick={ejecutarAvanceComunicacion}
              className="flex-1"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Avanzar a Comunicación
            </ButtonSIGL>
          </div>
        </div>
      </ModalSIGL>
    </div>
  );
}

// ============ COMPONENTES DE SECCIONES ============

// [CONTINÚA EN EL SIGUIENTE MENSAJE DEBIDO AL LÍMITE DE CARACTERES]