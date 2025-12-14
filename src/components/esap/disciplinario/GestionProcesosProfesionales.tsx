/**
 * GESTIÓN DE PROCESOS POR PROFESIONALES - RF003
 * Sistema para que los profesionales gestionen integralmente sus procesos asignados
 * Incluye: Visualización, Etapas, Plantillas, Editor, Documentos, Borradores y Auditoría
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Search, Filter, Eye, Edit2, Upload, Download, Send, Clock,
  AlertTriangle, CheckCircle, X, Save, Paperclip, MessageSquare, History,
  FileSignature, Scale, FolderOpen, Calendar, User, Building2, ArrowRight,
  ChevronRight, Flag, Ban, Search as SearchIcon, Forward, AlertCircle,
  Plus, Trash2, Check
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';
import { EditorDocumentos } from './EditorDocumentos';
import { ModalSubirDocumento } from './ModalSubirDocumento';

// ==================== INTERFACES ====================
interface Proceso {
  id: string;
  numeroProceso: string;
  noticiaOrigen: string;
  denunciado: {
    nombre: string;
    cedula: string;
    cargo: string;
    dependencia: string;
  };
  estadoActual: string;
  etapaActual: 'Valoración' | 'Inhibitorio' | 'Indagación Preliminar' | 'Investigación' | 'Remisión' | 'Juzgamiento' | 'Fallo';
  fechaAsignacion: string;
  diasEnGestion: number;
  diasRestantes: number;
  diasTotales: number;
  semaforo: 'verde' | 'amarillo' | 'rojo';
  territorial: string;
  tipoConducta: string[];
  profesionalAsignado: string;
  documentos: Documento[];
  borradores: Borrador[];
  historialAuditoria: AccionAuditoria[];
  hechos: string;
}

interface Documento {
  id: string;
  nombre: string;
  tipo: string;
  tamano: string;
  fechaCarga: string;
  usuario: string;
  etapaAsociada: string;
  url?: string;
}

interface Borrador {
  id: string;
  titulo: string;
  plantilla: string;
  version: number;
  estado: 'borrador' | 'enviado' | 'aprobado' | 'rechazado';
  fechaCreacion: string;
  fechaEnvio?: string;
  observacionesProfesional?: string;
  observacionesJefe?: string;
  contenido: string;
}

interface AccionAuditoria {
  id: string;
  tipo: string;
  usuario: string;
  fecha: string;
  descripcion: string;
  detalles?: any;
}

interface Plantilla {
  id: string;
  nombre: string;
  descripcion: string;
  etapa: string;
  categoria: 'Inhibitorio' | 'Indagación' | 'Investigación' | 'Remisión' | 'Juzgamiento' | 'Fallo';
  contenido: string;
  camposParametricos: string[];
}

// ==================== MOCK DATA ====================
const PLANTILLAS_MOCK: Plantilla[] = [
  {
    id: 'p1',
    nombre: 'Auto de Inhibitorio',
    descripcion: 'Cuando la noticia no tiene mérito para abrir investigación',
    etapa: 'Inhibitorio',
    categoria: 'Inhibitorio',
    contenido: `AUTO DE INHIBITORIO

PROCESO No: {{numeroProceso}}
NOTICIA ORIGEN: {{noticiaOrigen}}
DENUNCIADO: {{denunciado}}
IDENTIFICACIÓN: {{cedula}}

CONSIDERANDO:

PRIMERO: Que mediante noticia disciplinaria No. {{noticiaOrigen}} de fecha {{fechaNoticia}}, se puso en conocimiento de esta Oficina presuntos hechos relacionados con {{conducta}}.

SEGUNDO: Que una vez analizada la noticia y los documentos allegados, se encuentra que los hechos descritos no constituyen falta disciplinaria por las siguientes razones:

{{motivacion}}

TERCERO: Que en aplicación del artículo 150 de la Ley 734 de 2002, cuando aparezca que la conducta no ha existido, que el investigado no la cometió, que la conducta no es típica, antijurídica o culpable, se ordenará el archivo definitivo de las diligencias.

Por lo anteriormente expuesto, la Oficina de Control Interno Disciplinario de la ESAP,

RESUELVE:

ARTÍCULO PRIMERO: INHIBIRSE de iniciar investigación disciplinaria en contra de {{denunciado}}, identificado con cédula de ciudadanía No. {{cedula}}.

ARTÍCULO SEGUNDO: ORDENAR el archivo definitivo de las diligencias de la noticia disciplinaria No. {{noticiaOrigen}}.

ARTÍCULO TERCERO: El presente auto será notificado al denunciante y al denunciado.

Dado en {{ciudad}}, a los {{dia}} días del mes de {{mes}} de {{año}}.

NOTIFÍQUESE Y CÚMPLASE

_________________________________
{{nombreJefe}}
Jefe Oficina de Control Interno Disciplinario
ESAP`,
    camposParametricos: ['numeroProceso', 'noticiaOrigen', 'denunciado', 'cedula', 'fechaNoticia', 'conducta', 'motivacion', 'ciudad', 'dia', 'mes', 'año', 'nombreJefe']
  },
  {
    id: 'p2',
    nombre: 'Auto de Indagación Preliminar',
    descripcion: 'Cuando hay indicios pero se necesita investigar preliminarmente',
    etapa: 'Indagación Preliminar',
    categoria: 'Indagación',
    contenido: `AUTO DE APERTURA DE INDAGACIÓN PRELIMINAR

PROCESO No: {{numeroProceso}}
NOTICIA ORIGEN: {{noticiaOrigen}}
DISCIPLINABLE: {{denunciado}}
IDENTIFICACIÓN: {{cedula}}

CONSIDERANDO:

PRIMERO: Que mediante noticia disciplinaria No. {{noticiaOrigen}} se reportaron presuntos hechos que podrían constituir falta disciplinaria.

SEGUNDO: Que es necesario adelantar actuaciones preliminares para establecer si existe mérito para iniciar investigación formal.

TERCERO: Que el artículo 150 de la Ley 734 de 2002 establece que cuando del conocimiento de la noticia se desprenda la necesidad de practicar pruebas urgentes, o que requieran alguna actuación previa, se abrirá indagación preliminar.

Por lo anteriormente expuesto,

RESUELVE:

ARTÍCULO PRIMERO: ABRIR INDAGACIÓN PRELIMINAR en contra de {{denunciado}}, identificado con cédula No. {{cedula}}, por los hechos relacionados con {{conducta}}.

ARTÍCULO SEGUNDO: VINCULAR como disciplinable a {{denunciado}}.

ARTÍCULO TERCERO: ORDENAR las siguientes diligencias:
{{diligencias}}

ARTÍCULO CUARTO: El término de la indagación preliminar será de {{diasTermino}} días hábiles.

Dado en {{ciudad}}, a los {{dia}} días del mes de {{mes}} de {{año}}.

NOTIFÍQUESE Y CÚMPLASE`,
    camposParametricos: ['numeroProceso', 'noticiaOrigen', 'denunciado', 'cedula', 'conducta', 'diligencias', 'diasTermino', 'ciudad', 'dia', 'mes', 'año']
  },
  {
    id: 'p3',
    nombre: 'Auto de Apertura de Investigación Disciplinaria',
    descripcion: 'Cuando hay pruebas suficientes para investigar formalmente',
    etapa: 'Investigación',
    categoria: 'Investigación',
    contenido: `AUTO DE APERTURA DE INVESTIGACIÓN DISCIPLINARIA

PROCESO No: {{numeroProceso}}
NOTICIA ORIGEN: {{noticiaOrigen}}
INVESTIGADO: {{denunciado}}
IDENTIFICACIÓN: {{cedula}}
CARGO: {{cargo}}

CONSIDERANDO:

PRIMERO: Que mediante noticia disciplinaria No. {{noticiaOrigen}} se conocieron hechos que constituyen presunta falta disciplinaria.

SEGUNDO: Que del análisis de los elementos probatorios se desprende la existencia de indicios de responsabilidad disciplinaria.

TERCERO: Que en aplicación del artículo 152 de la Ley 734 de 2002, procede la apertura de investigación disciplinaria.

Por lo anteriormente expuesto,

RESUELVE:

ARTÍCULO PRIMERO: ABRIR INVESTIGACIÓN DISCIPLINARIA en contra de {{denunciado}}, identificado con cédula No. {{cedula}}, quien se desempeña como {{cargo}}.

ARTÍCULO SEGUNDO: FORMULAR CARGOS por las siguientes conductas:
{{cargos}}

ARTÍCULO TERCERO: VINCULAR como investigado a {{denunciado}} y NOTIFICAR el presente auto personalmente.

ARTÍCULO CUARTO: CONCEDER un término de diez (10) días hábiles para que presente descargos y solicite pruebas.

ARTÍCULO QUINTO: El término de instrucción será de {{diasInstruccion}} días hábiles.

Dado en {{ciudad}}, a los {{dia}} días del mes de {{mes}} de {{año}}.

NOTIFÍQUESE PERSONALMENTE`,
    camposParametricos: ['numeroProceso', 'noticiaOrigen', 'denunciado', 'cedula', 'cargo', 'cargos', 'diasInstruccion', 'ciudad', 'dia', 'mes', 'año']
  },
  {
    id: 'p4',
    nombre: 'Auto de Remisión',
    descripcion: 'Cuando la OCID no es competente para investigar el caso',
    etapa: 'Remisión',
    categoria: 'Remisión',
    contenido: `AUTO DE REMISIÓN POR COMPETENCIA

PROCESO No: {{numeroProceso}}
NOTICIA ORIGEN: {{noticiaOrigen}}
DENUNCIADO: {{denunciado}}
IDENTIFICACIÓN: {{cedula}}

CONSIDERANDO:

PRIMERO: Que mediante noticia disciplinaria No. {{noticiaOrigen}} se reportaron hechos que involucran a {{denunciado}}.

SEGUNDO: Que del análisis de los hechos y de la calidad del denunciado se establece que {{motivoIncompetencia}}.

TERCERO: Que en aplicación del principio de competencia, corresponde a {{entidadCompetente}} el conocimiento de estos hechos.

CUARTO: Que el artículo 76 de la Ley 734 de 2002 establece que cuando el funcionario no sea competente, remitirá de inmediato las diligencias al funcionario que lo sea.

Por lo anteriormente expuesto,

RESUELVE:

ARTÍCULO PRIMERO: DECLARAR la incompetencia de esta Oficina para conocer de los hechos relacionados en la noticia disciplinaria No. {{noticiaOrigen}}.

ARTÍCULO SEGUNDO: REMITIR el expediente completo a {{entidadCompetente}}, por ser la entidad competente para adelantar la correspondiente actuación disciplinaria.

ARTÍCULO TERCERO: COMUNICAR la presente decisión al denunciante y al denunciado.

Dado en {{ciudad}}, a los {{dia}} días del mes de {{mes}} de {{año}}.

NOTIFÍQUESE Y CÚMPLASE`,
    camposParametricos: ['numeroProceso', 'noticiaOrigen', 'denunciado', 'cedula', 'motivoIncompetencia', 'entidadCompetente', 'ciudad', 'dia', 'mes', 'año']
  }
];

const PROCESOS_MOCK: Proceso[] = [
  {
    id: '1',
    numeroProceso: 'P-120-2025',
    noticiaOrigen: 'ND-260',
    denunciado: {
      nombre: 'Juan Pérez Gómez',
      cedula: '1234567890',
      cargo: 'Coordinador Académico',
      dependencia: 'Territorial Bogotá'
    },
    estadoActual: 'Valoración',
    etapaActual: 'Valoración',
    fechaAsignacion: '2025-01-03',
    diasEnGestion: 5,
    diasRestantes: 5,
    diasTotales: 10,
    semaforo: 'verde',
    territorial: 'Bogotá D.C.',
    tipoConducta: ['Acoso laboral'],
    profesionalAsignado: 'Juan Carlos Pérez',
    hechos: 'Presuntos actos de acoso laboral en contra de funcionarios del área académica',
    documentos: [
      {
        id: 'd1',
        nombre: 'Noticia_Original_ND-260.pdf',
        tipo: 'PDF',
        tamano: '2.4 MB',
        fechaCarga: '2025-01-03T10:00:00',
        usuario: 'Sistema',
        etapaAsociada: 'Radicación'
      }
    ],
    borradores: [],
    historialAuditoria: [
      {
        id: 'a1',
        tipo: 'asignacion',
        usuario: 'Jefe OCID',
        fecha: '2025-01-03T10:00:00',
        descripcion: 'Proceso asignado a Juan Carlos Pérez'
      }
    ]
  },
  {
    id: '2',
    numeroProceso: 'P-089-2024',
    noticiaOrigen: 'ND-178',
    denunciado: {
      nombre: 'María González Castro',
      cedula: '9876543210',
      cargo: 'Profesional Universitario',
      dependencia: 'Territorial Antioquia'
    },
    estadoActual: 'Investigación',
    etapaActual: 'Investigación',
    fechaAsignacion: '2024-11-15',
    diasEnGestion: 55,
    diasRestantes: 25,
    diasTotales: 80,
    semaforo: 'amarillo',
    territorial: 'Antioquia',
    tipoConducta: ['Incumplimiento de deberes', 'Negligencia'],
    profesionalAsignado: 'Juan Carlos Pérez',
    hechos: 'Presunto incumplimiento de deberes en la gestión de procesos contractuales',
    documentos: [
      {
        id: 'd2',
        nombre: 'Auto_Apertura_Investigacion.pdf',
        tipo: 'PDF',
        tamano: '1.8 MB',
        fechaCarga: '2024-11-20T14:30:00',
        usuario: 'Juan Carlos Pérez',
        etapaAsociada: 'Investigación'
      },
      {
        id: 'd3',
        nombre: 'Descargos_Investigado.pdf',
        tipo: 'PDF',
        tamano: '3.2 MB',
        fechaCarga: '2024-12-05T09:15:00',
        usuario: 'Juan Carlos Pérez',
        etapaAsociada: 'Investigación'
      }
    ],
    borradores: [
      {
        id: 'b1',
        titulo: 'Auto de Cierre de Investigación',
        plantilla: 'Auto de Cierre',
        version: 2,
        estado: 'enviado',
        fechaCreacion: '2025-01-05T16:00:00',
        fechaEnvio: '2025-01-08T10:00:00',
        observacionesProfesional: 'Solicito revisión urgente para continuar con el proceso',
        contenido: 'Contenido del auto...'
      }
    ],
    historialAuditoria: [
      {
        id: 'a2',
        tipo: 'cambio_etapa',
        usuario: 'Juan Carlos Pérez',
        fecha: '2024-11-20T14:30:00',
        descripcion: 'Cambio de etapa a Investigación Disciplinaria'
      }
    ]
  }
];

// ==================== MODAL VER PROCESO ====================
function ModalVerProceso({ proceso, onClose, onEditarEtapa, onSubirDocumento }: {
  proceso: Proceso;
  onClose: () => void;
  onEditarEtapa: () => void;
  onSubirDocumento: () => void;
}) {
  const [tabActual, setTabActual] = useState<'info' | 'documentos' | 'borradores' | 'historial'>('info');

  const calcularPorcentaje = () => {
    return ((proceso.diasEnGestion / proceso.diasTotales) * 100).toFixed(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[200]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Semáforo */}
              <div className="flex items-center justify-center">
                <div
                  className="w-16 h-16 rounded-full ring-4 flex items-center justify-center"
                  style={{
                    background: proceso.semaforo === 'verde' ? '#10B981' : proceso.semaforo === 'amarillo' ? '#F59E0B' : '#DC2626',
                    ringColor: proceso.semaforo === 'verde' ? '#D1FAE5' : proceso.semaforo === 'amarillo' ? '#FEF3C7' : '#FEE2E2'
                  }}
                >
                  <Scale className="w-8 h-8 text-white" />
                </div>
              </div>

              {/* Info básica */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold" style={{ color: '#003DA5' }}>
                    {proceso.numeroProceso}
                  </h2>
                  <Badge variant="outline">Noticia: {proceso.noticiaOrigen}</Badge>
                  <Badge
                    style={{
                      background: proceso.semaforo === 'verde' ? '#D1FAE5' : proceso.semaforo === 'amarillo' ? '#FEF3C7' : '#FEE2E2',
                      color: proceso.semaforo === 'verde' ? '#065F46' : proceso.semaforo === 'amarillo' ? '#92400E' : '#991B1B',
                      border: 'none'
                    }}
                  >
                    {proceso.semaforo === 'verde' ? '🟢 En término' : proceso.semaforo === 'amarillo' ? '🟡 Próximo a vencer' : '🔴 Vencido'}
                  </Badge>
                </div>
                <p className="font-semibold text-gray-900">{proceso.denunciado.nombre}</p>
                <p className="text-sm text-gray-600">CC {proceso.denunciado.cedula} • {proceso.denunciado.cargo}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex gap-1 px-6">
            {[
              { id: 'info', label: 'Información', icon: FileText },
              { id: 'documentos', label: 'Documentos', icon: FolderOpen, badge: proceso.documentos.length },
              { id: 'borradores', label: 'Borradores', icon: Edit2, badge: proceso.borradores.length },
              { id: 'historial', label: 'Historial', icon: History }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTabActual(tab.id as any)}
                  className={`
                    flex items-center gap-2 px-4 py-3 font-semibold transition-all relative
                    ${tabActual === tab.id
                      ? 'text-blue-700 bg-white border-b-2 border-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {tabActual === 'info' && (
            <div className="space-y-6">
              {/* Métricas principales */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="p-4">
                  <p className="text-xs text-gray-600 mb-1">Estado Actual</p>
                  <p className="text-lg font-bold" style={{ color: '#003DA5' }}>{proceso.estadoActual}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-600 mb-1">Días en Gestión</p>
                  <p className="text-lg font-bold text-blue-600">{proceso.diasEnGestion} días</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-600 mb-1">Días Restantes</p>
                  <p className="text-lg font-bold" style={{
                    color: proceso.diasRestantes < 0 ? '#DC2626' : proceso.diasRestantes <= 5 ? '#F59E0B' : '#10B981'
                  }}>
                    {proceso.diasRestantes} días
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-600 mb-1">Progreso</p>
                  <p className="text-lg font-bold text-purple-600">{calcularPorcentaje()}%</p>
                </Card>
              </div>

              {/* Barra de progreso */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900">Línea de Tiempo</p>
                  <p className="text-sm text-gray-600">{proceso.diasEnGestion} / {proceso.diasTotales} días</p>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${calcularPorcentaje()}%`,
                      background: proceso.semaforo === 'verde' ? '#10B981' : proceso.semaforo === 'amarillo' ? '#F59E0B' : '#DC2626'
                    }}
                  />
                </div>
              </Card>

              {/* Información del denunciado */}
              <Card className="p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" style={{ color: '#003DA5' }} />
                  Información del Denunciado
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Nombre Completo</p>
                    <p className="font-semibold text-gray-900">{proceso.denunciado.nombre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Cédula</p>
                    <p className="font-semibold text-gray-900">{proceso.denunciado.cedula}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Cargo</p>
                    <p className="font-semibold text-gray-900">{proceso.denunciado.cargo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Dependencia</p>
                    <p className="font-semibold text-gray-900">{proceso.denunciado.dependencia}</p>
                  </div>
                </div>
              </Card>

              {/* Detalles del proceso */}
              <Card className="p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileSignature className="w-5 h-5" style={{ color: '#003DA5' }} />
                  Detalles del Proceso
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Fecha de Asignación</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(proceso.fechaAsignacion).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Territorial</p>
                    <p className="font-semibold text-gray-900">{proceso.territorial}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-gray-600 mb-2">Tipo de Conducta</p>
                  <div className="flex flex-wrap gap-2">
                    {proceso.tipoConducta.map((conducta, idx) => (
                      <Badge key={idx} className="bg-red-50 text-red-700 border border-red-200">
                        {conducta}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-600 mb-2">Descripción de Hechos</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                    {proceso.hechos}
                  </p>
                </div>
              </Card>

              {/* Botón de acción principal */}
              <Button
                onClick={onEditarEtapa}
                className="w-full py-6 text-lg font-semibold"
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <FileSignature className="w-5 h-5 mr-2" />
                Seleccionar Siguiente Etapa Procesal
              </Button>
            </div>
          )}

          {tabActual === 'documentos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Expediente Electrónico</h3>
                <Button
                  onClick={onSubirDocumento}
                  style={{ background: '#10B981', color: '#FFFFFF' }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Adjuntar Documento
                </Button>
              </div>

              {proceso.documentos.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No hay documentos adjuntos</p>
                  <Button
                    onClick={onSubirDocumento}
                    variant="outline"
                    className="mt-4"
                  >
                    Subir primer documento
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {proceso.documentos.map((doc) => (
                    <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{doc.nombre}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <span>{doc.tipo} • {doc.tamano}</span>
                            <span>•</span>
                            <span>Etapa: {doc.etapaAsociada}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Cargado por {doc.usuario} el{' '}
                            {new Date(doc.fechaCarga).toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {tabActual === 'borradores' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Borradores de Autos</h3>
                <Button
                  onClick={onEditarEtapa}
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Borrador
                </Button>
              </div>

              {proceso.borradores.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <Edit2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No hay borradores creados</p>
                  <Button
                    onClick={onEditarEtapa}
                    variant="outline"
                    className="mt-4"
                  >
                    Crear primer borrador
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {proceso.borradores.map((borrador) => (
                    <Card key={borrador.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900">{borrador.titulo}</h4>
                            <Badge
                              style={{
                                background: borrador.estado === 'aprobado' ? '#D1FAE5' :
                                           borrador.estado === 'enviado' ? '#DBEAFE' :
                                           borrador.estado === 'rechazado' ? '#FEE2E2' :
                                           '#F3F4F6',
                                color: borrador.estado === 'aprobado' ? '#065F46' :
                                       borrador.estado === 'enviado' ? '#1E40AF' :
                                       borrador.estado === 'rechazado' ? '#991B1B' :
                                       '#6B7280'
                              }}
                            >
                              {borrador.estado === 'aprobado' && '✓ Aprobado'}
                              {borrador.estado === 'enviado' && '📤 Enviado'}
                              {borrador.estado === 'rechazado' && '✗ Rechazado'}
                              {borrador.estado === 'borrador' && '📝 Borrador'}
                            </Badge>
                            <span className="text-xs text-gray-500">v{borrador.version}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">Plantilla: {borrador.plantilla}</p>
                          <p className="text-xs text-gray-500">
                            Creado: {new Date(borrador.fechaCreacion).toLocaleDateString('es-CO')}
                            {borrador.fechaEnvio && ` • Enviado: ${new Date(borrador.fechaEnvio).toLocaleDateString('es-CO')}`}
                          </p>
                          {borrador.observacionesJefe && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-xs font-semibold text-blue-900 mb-1">Observaciones del Jefe:</p>
                              <p className="text-sm text-blue-700">{borrador.observacionesJefe}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          {borrador.estado === 'borrador' && (
                            <Button variant="outline" size="sm">
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {tabActual === 'historial' && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 mb-4">Historial de Auditoría</h3>
              <div className="space-y-3">
                {proceso.historialAuditoria.map((accion, index) => (
                  <div key={accion.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <History className="w-5 h-5 text-blue-600" />
                      </div>
                      {index < proceso.historialAuditoria.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 mt-2" />
                      )}
                    </div>
                    <Card className="flex-1 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{accion.descripcion}</h4>
                        <Badge variant="outline" className="text-xs">
                          {new Date(accion.fecha).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">Usuario: {accion.usuario}</p>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            Cerrar
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==================== MODAL SELECCIONAR ETAPA ====================
function ModalSeleccionarEtapa({ proceso, onClose, onSeleccionar }: {
  proceso: Proceso;
  onClose: () => void;
  onSeleccionar: (etapa: string, plantilla: Plantilla) => void;
}) {
  const [etapaSeleccionada, setEtapaSeleccionada] = useState<string>('');
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<Plantilla | null>(null);

  const etapas = [
    {
      id: 'inhibitorio',
      nombre: 'Inhibitorio',
      descripcion: 'Cuando la noticia no tiene mérito para abrir investigación',
      icon: Ban,
      color: '#DC2626'
    },
    {
      id: 'indagacion',
      nombre: 'Indagación Preliminar',
      descripcion: 'Cuando hay indicios pero se necesita investigar preliminarmente',
      icon: SearchIcon,
      color: '#F59E0B'
    },
    {
      id: 'investigacion',
      nombre: 'Investigación Disciplinaria',
      descripcion: 'Cuando hay pruebas suficientes para investigar formalmente desde el inicio',
      icon: Scale,
      color: '#3B82F6'
    },
    {
      id: 'remision',
      nombre: 'Remisión',
      descripcion: 'Cuando la OCID NO es competente para investigar el caso',
      icon: Forward,
      color: '#6B7280'
    }
  ];

  const plantillasFiltradas = PLANTILLAS_MOCK.filter(p => {
    if (etapaSeleccionada === 'inhibitorio') return p.categoria === 'Inhibitorio';
    if (etapaSeleccionada === 'indagacion') return p.categoria === 'Indagación';
    if (etapaSeleccionada === 'investigacion') return p.categoria === 'Investigación';
    if (etapaSeleccionada === 'remision') return p.categoria === 'Remisión';
    return false;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[250]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#003DA5' }}>
                Seleccionar Siguiente Etapa Procesal
              </h2>
              <p className="text-sm text-gray-600">
                Proceso: {proceso.numeroProceso} • {proceso.denunciado.nombre}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {!etapaSeleccionada ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900 mb-1">
                      Selecciona la siguiente etapa según tu análisis
                    </p>
                    <p className="text-sm text-blue-700">
                      Esta decisión determinará el curso del proceso disciplinario y las plantillas disponibles.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {etapas.map((etapa) => {
                  const Icon = etapa.icon;
                  return (
                    <Card
                      key={etapa.id}
                      onClick={() => setEtapaSeleccionada(etapa.id)}
                      className="p-6 cursor-pointer hover:shadow-xl transition-all border-2 hover:border-blue-500"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `${etapa.color}20` }}
                        >
                          <Icon className="w-6 h-6" style={{ color: etapa.color }} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-2">{etapa.nombre}</h3>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {etapa.descripcion}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => {
                  setEtapaSeleccionada('');
                  setPlantillaSeleccionada(null);
                }}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-4"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Volver a etapas
              </button>

              <h3 className="font-bold text-gray-900 mb-4">
                Plantillas Disponibles para {etapas.find(e => e.id === etapaSeleccionada)?.nombre}
              </h3>

              <div className="space-y-3">
                {plantillasFiltradas.map((plantilla) => (
                  <Card
                    key={plantilla.id}
                    onClick={() => setPlantillaSeleccionada(plantilla)}
                    className={`
                      p-5 cursor-pointer hover:shadow-lg transition-all border-2
                      ${plantillaSeleccionada?.id === plantilla.id ? 'border-blue-500 bg-blue-50' : 'hover:border-blue-300'}
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileSignature className="w-5 h-5" style={{ color: '#003DA5' }} />
                          <h4 className="font-bold text-gray-900">{plantilla.nombre}</h4>
                          {plantillaSeleccionada?.id === plantilla.id && (
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{plantilla.descripcion}</p>
                        <div className="flex flex-wrap gap-2">
                          {plantilla.camposParametricos.slice(0, 5).map((campo) => (
                            <Badge key={campo} variant="outline" className="text-xs">
                              {campo}
                            </Badge>
                          ))}
                          {plantilla.camposParametricos.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{plantilla.camposParametricos.length - 5} más
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {plantillaSeleccionada && (
                <div className="sticky bottom-0 pt-4 bg-white border-t border-gray-200 mt-6">
                  <Button
                    onClick={() => onSeleccionar(etapaSeleccionada, plantillaSeleccionada)}
                    className="w-full py-4 text-lg font-semibold"
                    style={{ background: '#10B981', color: '#FFFFFF' }}
                  >
                    <FileSignature className="w-5 h-5 mr-2" />
                    Continuar con {plantillaSeleccionada.nombre}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================
export function GestionProcesosProfesionales() {
  const [procesos] = useState<Proceso[]>(PROCESOS_MOCK);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSemaforo, setFilterSemaforo] = useState('all');
  const [filterEtapa, setFilterEtapa] = useState('all');
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<Proceso | null>(null);
  const [showModalVer, setShowModalVer] = useState(false);
  const [showModalEtapa, setShowModalEtapa] = useState(false);

  const handleVerProceso = (proceso: Proceso) => {
    setProcesoSeleccionado(proceso);
    setShowModalVer(true);
  };

  const handleEditarEtapa = () => {
    setShowModalVer(false);
    setShowModalEtapa(true);
  };

  const handleSeleccionarEtapa = (etapa: string, plantilla: Plantilla) => {
    toast.success('Editor de Documentos', {
      description: `Abriendo editor con plantilla: ${plantilla.nombre}`
    });
    setShowModalEtapa(false);
    // Aquí se abriría el editor de documentos
  };

  const filteredProcesos = procesos.filter((proceso) => {
    const matchesSearch =
      proceso.numeroProceso.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proceso.denunciado.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proceso.denunciado.cedula.includes(searchQuery);

    const matchesSemaforo = filterSemaforo === 'all' || proceso.semaforo === filterSemaforo;
    const matchesEtapa = filterEtapa === 'all' || proceso.etapaActual === filterEtapa;

    return matchesSearch && matchesSemaforo && matchesEtapa;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#003DA5' }}>
          Mis Procesos Asignados
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          RF003 - Gestión Integral de Procesos Disciplinarios
        </p>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-600 mb-1">Total Asignados</p>
          <p className="text-2xl font-bold" style={{ color: '#003DA5' }}>{procesos.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-600 mb-1">En Término</p>
          <p className="text-2xl font-bold text-green-600">
            {procesos.filter(p => p.semaforo === 'verde').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-600 mb-1">Próximos a Vencer</p>
          <p className="text-2xl font-bold text-yellow-600">
            {procesos.filter(p => p.semaforo === 'amarillo').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-600 mb-1">Vencidos</p>
          <p className="text-2xl font-bold text-red-600">
            {procesos.filter(p => p.semaforo === 'rojo').length}
          </p>
        </Card>
      </div>

      {/* Búsqueda y filtros */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número de proceso, nombre o cédula..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterSemaforo}
            onChange={(e) => setFilterSemaforo(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">Todos los semáforos</option>
            <option value="verde">🟢 En término</option>
            <option value="amarillo">🟡 Próximo a vencer</option>
            <option value="rojo">🔴 Vencido</option>
          </select>

          <select
            value={filterEtapa}
            onChange={(e) => setFilterEtapa(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">Todas las etapas</option>
            <option value="Valoración">Valoración</option>
            <option value="Indagación Preliminar">Indagación Preliminar</option>
            <option value="Investigación">Investigación</option>
            <option value="Juzgamiento">Juzgamiento</option>
            <option value="Fallo">Fallo</option>
          </select>
        </div>
      </Card>

      {/* Lista de procesos */}
      <div className="space-y-4">
        {filteredProcesos.map((proceso) => (
          <Card key={proceso.id} className="p-5 hover:shadow-lg transition-all">
            <div className="flex items-start gap-4">
              {/* Semáforo */}
              <div
                className="w-16 h-16 rounded-full ring-4 flex items-center justify-center flex-shrink-0"
                style={{
                  background: proceso.semaforo === 'verde' ? '#10B981' : proceso.semaforo === 'amarillo' ? '#F59E0B' : '#DC2626',
                  ringColor: proceso.semaforo === 'verde' ? '#D1FAE5' : proceso.semaforo === 'amarillo' ? '#FEF3C7' : '#FEE2E2'
                }}
              >
                <Scale className="w-8 h-8 text-white" />
              </div>

              {/* Información */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold" style={{ color: '#003DA5' }}>
                    {proceso.numeroProceso}
                  </h3>
                  <Badge variant="outline">Noticia: {proceso.noticiaOrigen}</Badge>
                  <Badge>{proceso.etapaActual}</Badge>
                </div>

                <p className="font-semibold text-gray-900 mb-1">{proceso.denunciado.nombre}</p>
                <p className="text-sm text-gray-600 mb-3">
                  CC {proceso.denunciado.cedula} • {proceso.denunciado.cargo} • {proceso.territorial}
                </p>

                {/* Métricas */}
                <div className="grid grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-600">Estado Actual</p>
                    <p className="font-semibold text-gray-900">{proceso.estadoActual}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Días en Gestión</p>
                    <p className="font-semibold text-blue-600">{proceso.diasEnGestion} días</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Días Restantes</p>
                    <p className="font-semibold" style={{
                      color: proceso.diasRestantes < 0 ? '#DC2626' : proceso.diasRestantes <= 5 ? '#F59E0B' : '#10B981'
                    }}>
                      {proceso.diasRestantes} días
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Progreso</p>
                    <p className="font-semibold text-purple-600">
                      {((proceso.diasEnGestion / proceso.diasTotales) * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(proceso.diasEnGestion / proceso.diasTotales) * 100}%`,
                      background: proceso.semaforo === 'verde' ? '#10B981' : proceso.semaforo === 'amarillo' ? '#F59E0B' : '#DC2626'
                    }}
                  />
                </div>

                {/* Conductas */}
                <div className="flex flex-wrap gap-2">
                  {proceso.tipoConducta.map((conducta, idx) => (
                    <Badge key={idx} className="bg-red-50 text-red-700 border border-red-200 text-xs">
                      {conducta}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleVerProceso(proceso)}
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalle
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Estado vacío */}
      {filteredProcesos.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-gray-200">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">No se encontraron procesos</h3>
          <p className="text-sm text-gray-600">
            {searchQuery ? 'Intenta con otros términos de búsqueda' : 'No tienes procesos asignados en este momento'}
          </p>
        </div>
      )}

      {/* Modales */}
      <AnimatePresence>
        {showModalVer && procesoSeleccionado && (
          <ModalVerProceso
            proceso={procesoSeleccionado}
            onClose={() => {
              setShowModalVer(false);
              setProcesoSeleccionado(null);
            }}
            onEditarEtapa={handleEditarEtapa}
            onSubirDocumento={() => {
              toast.success('Funcionalidad próximamente');
            }}
          />
        )}

        {showModalEtapa && procesoSeleccionado && (
          <ModalSeleccionarEtapa
            proceso={procesoSeleccionado}
            onClose={() => setShowModalEtapa(false)}
            onSeleccionar={handleSeleccionarEtapa}
          />
        )}
      </AnimatePresence>
    </div>
  );
}