/**
 * RF010 - GESTIÓN DE HALLAZGOS COMPLETO
 * Integración Fase 2: Vincula hallazgos con auditorías y notifica automáticamente
 * Sistema integral de gestión de hallazgos con proceso de controversia
 * Oficina de Control Interno - ESAP
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// ============ INTEGRACIÓN FASE 2 ============
import { useIntegracionControlInterno } from '../../../hooks/useIntegracionControlInterno';
import {
  AlertTriangle, Plus, Search, Filter, Eye, Edit, Trash2, Download,
  FileText, Upload, MessageSquare, CheckCircle2, XCircle, Clock,
  Shield, BookOpen, Paperclip, History, Flag, User, Calendar,
  ArrowRight, ChevronDown, ChevronUp, Save, X, AlertCircle,
  FileCheck, Award, TrendingUp, BarChart3, Activity, Layers
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';

// ============ TIPOS ============

type TipoHallazgo = 'No Conformidad' | 'Observación' | 'Oportunidad de Mejora';
type GravedadHallazgo = 'Crítico' | 'Mayor' | 'Menor';
type EstadoHallazgo = 'Preliminar' | 'En Controversia' | 'Ratificado' | 'Modificado' | 'Cerrado';

interface Evidencia {
  id: string;
  nombre: string;
  tipo: string;
  tamano: string;
  fechaCarga: string;
  cargadoPor: string;
  url?: string;
}

interface ComentarioControversia {
  id: string;
  autor: string;
  rol: 'Auditor' | 'Área Auditada';
  comentario: string;
  fecha: string;
  hora: string;
}

interface CambioAuditoria {
  id: string;
  campo: string;
  valorAnterior: string;
  valorNuevo: string;
  modificadoPor: string;
  fecha: string;
  hora: string;
  motivo: string;
}

interface Hallazgo {
  id: string;
  numero: number;
  codigo: string;
  auditoriaId: string;
  codigoAuditoria: string;
  procesoAuditable: string;
  
  // Identificación
  tipo: TipoHallazgo;
  gravedad: GravedadHallazgo;
  titulo: string;
  descripcionDetallada: string;
  
  // Vinculación Normativa
  normativaViolada?: string;
  procedimientoIncumplido?: string;
  requisitosAfectados: string[];
  criterioAuditoria: string;
  
  // Estado y Fechas
  estado: EstadoHallazgo;
  fechaIdentificacion: string;
  fechaNotificacion?: string;
  fechaRespuestaControversia?: string;
  fechaRatificacion?: string;
  fechaCierre?: string;
  
  // Responsables
  auditorResponsable: string;
  areaResponsable: string;
  jefeAreaResponsable?: string;
  
  // Evidencias y Recomendaciones
  evidencias: Evidencia[];
  recomendaciones: string;
  
  // Proceso de Controversia
  controversia?: {
    iniciada: boolean;
    fechaInicio: string;
    comentarios: ComentarioControversia[];
    argumentosArea: string;
    respuestaOCI: string;
    decision: 'Ratificado' | 'Modificado' | 'Desestimado' | 'Pendiente';
    fechaDecision?: string;
  };
  
  // Modificación después de controversia
  modificaciones?: {
    tipoOriginal?: TipoHallazgo;
    gravedadOriginal?: GravedadHallazgo;
    descripcionOriginal?: string;
    recomendacionesOriginal?: string;
    motivoModificacion: string;
  };
  
  // Auditoría de cambios
  historialCambios: CambioAuditoria[];
  
  // Metadata
  creadoPor: string;
  fechaCreacion: string;
  modificadoPor?: string;
  fechaModificacion?: string;
}

// ============ DATOS MOCK ============

const MOCK_HALLAZGOS: Hallazgo[] = [
  {
    id: 'h-001',
    numero: 1,
    codigo: 'H-2025-001',
    auditoriaId: 'aud-001',
    codigoAuditoria: 'AUD-2025-001',
    procesoAuditable: 'Gestión Contractual',
    tipo: 'No Conformidad',
    gravedad: 'Mayor',
    titulo: 'Falta de análisis del sector en estudios previos',
    descripcionDetallada: 'Durante la revisión de los procesos contractuales de la vigencia 2024, se identificó que tres (3) procesos de selección (CT-2024-089, CT-2024-112 y CT-2024-145) no incluyen en sus estudios previos el análisis del sector requerido por la normativa vigente. Específicamente, no se encuentra evidencia de la evaluación de oferentes potenciales, condiciones del mercado, ni análisis de precios de referencia, incumpliendo lo establecido en el artículo 83 de la Ley 1474 de 2011.',
    normativaViolada: 'Ley 1474 de 2011 - Art. 83',
    procedimientoIncumplido: 'Procedimiento de Elaboración de Estudios Previos P-JUR-001',
    requisitosAfectados: ['Análisis del sector', 'Estudio de mercado', 'Evaluación de oferentes'],
    criterioAuditoria: 'Cumplimiento normativo en contratación pública',
    estado: 'En Controversia',
    fechaIdentificacion: '2025-02-10',
    fechaNotificacion: '2025-02-12',
    fechaRespuestaControversia: '2025-02-18',
    auditorResponsable: 'Carlos Martínez',
    areaResponsable: 'Oficina Jurídica',
    jefeAreaResponsable: 'María Pérez',
    evidencias: [
      {
        id: 'ev-001',
        nombre: 'CT-2024-089_EstudiosPrevios.pdf',
        tipo: 'PDF',
        tamano: '2.5 MB',
        fechaCarga: '2025-02-10',
        cargadoPor: 'Carlos Martínez'
      },
      {
        id: 'ev-002',
        nombre: 'Comparativo_Estudios_Previos.xlsx',
        tipo: 'Excel',
        tamano: '1.2 MB',
        fechaCarga: '2025-02-10',
        cargadoPor: 'Carlos Martínez'
      }
    ],
    recomendaciones: 'Se recomienda: 1) Implementar una lista de chequeo obligatoria para la elaboración de estudios previos que incluya verificación del análisis del sector. 2) Capacitar al equipo de contratación en los requisitos normativos vigentes. 3) Establecer un mecanismo de revisión previa por parte de un profesional especializado antes de la aprobación de los estudios previos.',
    controversia: {
      iniciada: true,
      fechaInicio: '2025-02-13',
      decision: 'Pendiente',
      argumentosArea: 'El área auditada manifiesta que si bien no se incluyó una sección específica denominada "Análisis del sector", la información requerida se encuentra dispersa en diferentes apartados de los estudios previos, específicamente en las secciones de "Justificación de la necesidad" y "Análisis económico". Adicionalmente, se anexa como soporte consultas realizadas al SECOP que evidencian la evaluación de precios de mercado.',
      respuestaOCI: '',
      comentarios: [
        {
          id: 'com-001',
          autor: 'María Pérez',
          rol: 'Área Auditada',
          comentario: 'Solicitamos respetuosamente revisar el hallazgo. La información del análisis del sector se encuentra en las secciones de justificación de la necesidad. Anexamos evidencias adicionales.',
          fecha: '2025-02-13',
          hora: '10:30'
        },
        {
          id: 'com-002',
          autor: 'Carlos Martínez',
          rol: 'Auditor',
          comentario: 'Se revisaron las evidencias aportadas. Si bien existe información parcial, no cumple con la estructura y contenido mínimo requerido por la normativa.',
          fecha: '2025-02-15',
          hora: '14:20'
        },
        {
          id: 'com-003',
          autor: 'María Pérez',
          rol: 'Área Auditada',
          comentario: 'Entendemos la observación. Proponemos que se modifique la clasificación de Mayor a Menor, considerando que la información sustancial existe aunque no con la estructura ideal.',
          fecha: '2025-02-18',
          hora: '09:15'
        }
      ]
    },
    historialCambios: [
      {
        id: 'cambio-001',
        campo: 'Estado',
        valorAnterior: 'Preliminar',
        valorNuevo: 'En Controversia',
        modificadoPor: 'Sistema',
        fecha: '2025-02-13',
        hora: '10:30',
        motivo: 'Área auditada inicia proceso de controversia'
      }
    ],
    creadoPor: 'Carlos Martínez',
    fechaCreacion: '2025-02-10'
  },
  {
    id: 'h-002',
    numero: 2,
    codigo: 'H-2025-002',
    auditoriaId: 'aud-001',
    codigoAuditoria: 'AUD-2025-001',
    procesoAuditable: 'Gestión Contractual',
    tipo: 'Observación',
    gravedad: 'Menor',
    titulo: 'Retrasos en publicación de actos administrativos',
    descripcionDetallada: 'Se observaron demoras promedio de 3 días calendario en la publicación de resoluciones de adjudicación en la plataforma SECOP II, excediendo el plazo interno establecido de 48 horas. Si bien no constituye incumplimiento normativo, afecta la eficiencia del proceso y puede generar reclamos por parte de proponentes.',
    criterioAuditoria: 'Eficiencia en procesos administrativos',
    estado: 'Ratificado',
    fechaIdentificacion: '2025-02-12',
    fechaNotificacion: '2025-02-13',
    fechaRatificacion: '2025-02-20',
    auditorResponsable: 'Carlos Martínez',
    areaResponsable: 'Oficina Jurídica',
    jefeAreaResponsable: 'María Pérez',
    evidencias: [
      {
        id: 'ev-003',
        nombre: 'Reporte_Tiempos_Publicacion.xlsx',
        tipo: 'Excel',
        tamano: '856 KB',
        fechaCarga: '2025-02-12',
        cargadoPor: 'Carlos Martínez'
      }
    ],
    recomendaciones: 'Se recomienda: 1) Revisar el flujo interno de aprobaciones previas a la publicación en SECOP II. 2) Considerar la automatización del proceso de carga de documentos. 3) Establecer alertas automáticas cuando se acerque el vencimiento del plazo.',
    controversia: {
      iniciada: true,
      fechaInicio: '2025-02-14',
      decision: 'Ratificado',
      fechaDecision: '2025-02-20',
      argumentosArea: 'El área reconoce la situación y manifiesta que los retrasos obedecen a la necesidad de múltiples aprobaciones internas. Acepta las recomendaciones.',
      respuestaOCI: 'Se acepta el reconocimiento del área. Se ratifica el hallazgo como Observación Menor y se solicita implementar las recomendaciones en el plan de mejoramiento.',
      comentarios: [
        {
          id: 'com-004',
          autor: 'María Pérez',
          rol: 'Área Auditada',
          comentario: 'Reconocemos la situación. Implementaremos las mejoras propuestas.',
          fecha: '2025-02-14',
          hora: '11:00'
        }
      ]
    },
    historialCambios: [
      {
        id: 'cambio-002',
        campo: 'Estado',
        valorAnterior: 'Preliminar',
        valorNuevo: 'En Controversia',
        modificadoPor: 'Sistema',
        fecha: '2025-02-14',
        hora: '11:00',
        motivo: 'Área auditada inicia proceso de controversia'
      },
      {
        id: 'cambio-003',
        campo: 'Estado',
        valorAnterior: 'En Controversia',
        valorNuevo: 'Ratificado',
        modificadoPor: 'Carlos Martínez',
        fecha: '2025-02-20',
        hora: '15:30',
        motivo: 'Área acepta hallazgo. Se ratifica.'
      }
    ],
    creadoPor: 'Carlos Martínez',
    fechaCreacion: '2025-02-12'
  },
  {
    id: 'h-003',
    numero: 3,
    codigo: 'H-2025-003',
    auditoriaId: 'aud-002',
    codigoAuditoria: 'AUD-2025-002',
    procesoAuditable: 'Gestión de Talento Humano',
    tipo: 'Oportunidad de Mejora',
    gravedad: 'Menor',
    titulo: 'Optimización del proceso de evaluación de desempeño',
    descripcionDetallada: 'Se identificó que el proceso actual de evaluación de desempeño se realiza de manera manual mediante formatos en Excel, lo cual genera reprocesos y dificulta la trazabilidad. Se evidencia una oportunidad de mejora mediante la implementación de una plataforma digital que automatice el proceso.',
    criterioAuditoria: 'Eficiencia y mejora continua',
    estado: 'Preliminar',
    fechaIdentificacion: '2025-02-15',
    auditorResponsable: 'Ana García',
    areaResponsable: 'Gestión Humana',
    jefeAreaResponsable: 'Pedro López',
    evidencias: [],
    recomendaciones: 'Se recomienda evaluar la implementación de un sistema de información para la gestión de evaluaciones de desempeño que permita: 1) Automatización del proceso. 2) Trazabilidad completa. 3) Generación automática de reportes. 4) Reducción de tiempos de procesamiento.',
    historialCambios: [],
    creadoPor: 'Ana García',
    fechaCreacion: '2025-02-15'
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function GestionHallazgosCompleto() {
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>(MOCK_HALLAZGOS);
  const [hallazgoSeleccionado, setHallazgoSeleccionado] = useState<Hallazgo | null>(null);
  const [vistaActual, setVistaActual] = useState<'lista' | 'detalle' | 'editor'>('lista');
  const [modoEditor, setModoEditor] = useState<'crear' | 'editar'>('crear');
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroGravedad, setFiltroGravedad] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  
  // Modales
  const [modalControversia, setModalControversia] = useState(false);
  const [modalRatificar, setModalRatificar] = useState(false);
  const [modalModificar, setModalModificar] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(false);

  // Filtrado
  const hallazgosFiltrados = hallazgos.filter(h => {
    const coincideBusqueda = h.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
                             h.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
                             h.procesoAuditable.toLowerCase().includes(busqueda.toLowerCase());
    const coincideTipo = filtroTipo === 'Todos' || h.tipo === filtroTipo;
    const coincideGravedad = filtroGravedad === 'Todos' || h.gravedad === filtroGravedad;
    const coincideEstado = filtroEstado === 'Todos' || h.estado === filtroEstado;
    
    return coincideBusqueda && coincideTipo && coincideGravedad && coincideEstado;
  });

  // Estadísticas
  const stats = {
    total: hallazgos.length,
    preliminares: hallazgos.filter(h => h.estado === 'Preliminar').length,
    enControversia: hallazgos.filter(h => h.estado === 'En Controversia').length,
    ratificados: hallazgos.filter(h => h.estado === 'Ratificado').length,
    criticos: hallazgos.filter(h => h.gravedad === 'Crítico').length,
    mayores: hallazgos.filter(h => h.gravedad === 'Mayor').length,
    menores: hallazgos.filter(h => h.gravedad === 'Menor').length
  };

  const handleCrearNuevo = () => {
    setModoEditor('crear');
    setHallazgoSeleccionado(null);
    setVistaActual('editor');
  };

  const handleVerDetalle = (hallazgo: Hallazgo) => {
    setHallazgoSeleccionado(hallazgo);
    setVistaActual('detalle');
  };

  const handleEditar = (hallazgo: Hallazgo) => {
    setModoEditor('editar');
    setHallazgoSeleccionado(hallazgo);
    setVistaActual('editor');
  };

  const handleIniciarControversia = (hallazgo: Hallazgo, comentario: string) => {
    const cambio: CambioAuditoria = {
      id: `cambio-${Date.now()}`,
      campo: 'Estado',
      valorAnterior: hallazgo.estado,
      valorNuevo: 'En Controversia',
      modificadoPor: 'Sistema',
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      motivo: 'Área auditada inicia proceso de controversia'
    };

    const nuevoComentario: ComentarioControversia = {
      id: `com-${Date.now()}`,
      autor: hallazgo.jefeAreaResponsable || 'Área Auditada',
      rol: 'Área Auditada',
      comentario: comentario,
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    };

    setHallazgos(hallazgos.map(h =>
      h.id === hallazgo.id
        ? {
            ...h,
            estado: 'En Controversia' as const,
            controversia: {
              iniciada: true,
              fechaInicio: new Date().toISOString().split('T')[0],
              comentarios: [nuevoComentario],
              argumentosArea: comentario,
              respuestaOCI: '',
              decision: 'Pendiente'
            },
            historialCambios: [...h.historialCambios, cambio]
          }
        : h
    ));

    setModalControversia(false);
  };

  const handleRatificar = (hallazgoId: string, respuesta: string) => {
    const hallazgo = hallazgos.find(h => h.id === hallazgoId);
    if (!hallazgo) return;

    const cambio: CambioAuditoria = {
      id: `cambio-${Date.now()}`,
      campo: 'Estado',
      valorAnterior: hallazgo.estado,
      valorNuevo: 'Ratificado',
      modificadoPor: 'Usuario Actual',
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      motivo: 'Hallazgo ratificado después de controversia'
    };

    setHallazgos(hallazgos.map(h =>
      h.id === hallazgoId
        ? {
            ...h,
            estado: 'Ratificado' as const,
            fechaRatificacion: new Date().toISOString().split('T')[0],
            controversia: h.controversia ? {
              ...h.controversia,
              decision: 'Ratificado',
              fechaDecision: new Date().toISOString().split('T')[0],
              respuestaOCI: respuesta
            } : undefined,
            historialCambios: [...h.historialCambios, cambio]
          }
        : h
    ));

    setModalRatificar(false);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Gestión de Hallazgos
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            RF008 - Sistema integral con proceso de controversia
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setVistaActual('lista')}
            variant={vistaActual === 'lista' ? 'default' : 'outline'}
            size="sm"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Lista
          </Button>
          <Button
            onClick={handleCrearNuevo}
            size="sm"
            style={{ background: '#F97316' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Hallazgo
          </Button>
        </div>
      </div>

      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <Card className="p-3">
          <p className="text-xs text-gray-600">Total</p>
          <p className="text-2xl font-black text-gray-900">{stats.total}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-600">Preliminares</p>
          <p className="text-2xl font-black text-blue-600">{stats.preliminares}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-600">Controversia</p>
          <p className="text-2xl font-black text-amber-600">{stats.enControversia}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-600">Ratificados</p>
          <p className="text-2xl font-black text-green-600">{stats.ratificados}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-600">Críticos</p>
          <p className="text-2xl font-black text-red-600">{stats.criticos}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-600">Mayores</p>
          <p className="text-2xl font-black text-orange-600">{stats.mayores}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-600">Menores</p>
          <p className="text-2xl font-black text-yellow-600">{stats.menores}</p>
        </Card>
      </div>

      {/* FILTROS */}
      <Card className="p-4">
        <div className="flex flex-col gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código, título o proceso..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="Todos">Todos los tipos</option>
              <option value="No Conformidad">No Conformidad</option>
              <option value="Observación">Observación</option>
              <option value="Oportunidad de Mejora">Oportunidad de Mejora</option>
            </select>

            <select
              value={filtroGravedad}
              onChange={(e) => setFiltroGravedad(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="Todos">Todas las gravedades</option>
              <option value="Crítico">Crítico</option>
              <option value="Mayor">Mayor</option>
              <option value="Menor">Menor</option>
            </select>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="Todos">Todos los estados</option>
              <option value="Preliminar">Preliminar</option>
              <option value="En Controversia">En Controversia</option>
              <option value="Ratificado">Ratificado</option>
              <option value="Modificado">Modificado</option>
              <option value="Cerrado">Cerrado</option>
            </select>
          </div>
        </div>
      </Card>

      {/* VISTAS */}
      <AnimatePresence mode="wait">
        {vistaActual === 'lista' && (
          <ListaHallazgosView
            key="lista"
            hallazgos={hallazgosFiltrados}
            onVerDetalle={handleVerDetalle}
            onEditar={handleEditar}
            onIniciarControversia={(h) => {
              setHallazgoSeleccionado(h);
              setModalControversia(true);
            }}
          />
        )}

        {vistaActual === 'detalle' && hallazgoSeleccionado && (
          <DetalleHallazgoView
            key="detalle"
            hallazgo={hallazgoSeleccionado}
            onVolver={() => setVistaActual('lista')}
            onEditar={() => handleEditar(hallazgoSeleccionado)}
            onRatificar={() => setModalRatificar(true)}
            onModificar={() => setModalModificar(true)}
            onVerHistorial={() => setModalHistorial(true)}
          />
        )}

        {vistaActual === 'editor' && (
          <EditorHallazgoView
            key="editor"
            hallazgo={hallazgoSeleccionado}
            modo={modoEditor}
            onGuardar={(hallazgo) => {
              if (modoEditor === 'crear') {
                setHallazgos([hallazgo, ...hallazgos]);
              } else {
                setHallazgos(hallazgos.map(h => h.id === hallazgo.id ? hallazgo : h));
              }
              setVistaActual('lista');
            }}
            onCancelar={() => setVistaActual('lista')}
          />
        )}
      </AnimatePresence>

      {/* MODAL: INICIAR CONTROVERSIA */}
      <AnimatePresence>
        {modalControversia && hallazgoSeleccionado && (
          <ModalIniciarControversia
            hallazgo={hallazgoSeleccionado}
            onConfirmar={(comentario) => handleIniciarControversia(hallazgoSeleccionado, comentario)}
            onCerrar={() => setModalControversia(false)}
          />
        )}
      </AnimatePresence>

      {/* MODAL: RATIFICAR HALLAZGO */}
      <AnimatePresence>
        {modalRatificar && hallazgoSeleccionado && (
          <ModalRatificarHallazgo
            hallazgo={hallazgoSeleccionado}
            onConfirmar={(respuesta) => handleRatificar(hallazgoSeleccionado.id, respuesta)}
            onCerrar={() => setModalRatificar(false)}
          />
        )}
      </AnimatePresence>

      {/* MODAL: HISTORIAL DE CAMBIOS */}
      <AnimatePresence>
        {modalHistorial && hallazgoSeleccionado && (
          <ModalHistorialCambios
            hallazgo={hallazgoSeleccionado}
            onCerrar={() => setModalHistorial(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ VISTA: LISTA DE HALLAZGOS ============

interface ListaHallazgosViewProps {
  hallazgos: Hallazgo[];
  onVerDetalle: (hallazgo: Hallazgo) => void;
  onEditar: (hallazgo: Hallazgo) => void;
  onIniciarControversia: (hallazgo: Hallazgo) => void;
}

function ListaHallazgosView({ hallazgos, onVerDetalle, onEditar, onIniciarControversia }: ListaHallazgosViewProps) {
  const getTipoColor = (tipo: TipoHallazgo) => {
    switch (tipo) {
      case 'No Conformidad': return '#EF4444';
      case 'Observación': return '#3B82F6';
      case 'Oportunidad de Mejora': return '#10B981';
    }
  };

  const getGravedadColor = (gravedad: GravedadHallazgo) => {
    switch (gravedad) {
      case 'Crítico': return '#EF4444';
      case 'Mayor': return '#F97316';
      case 'Menor': return '#F59E0B';
    }
  };

  const getEstadoColor = (estado: EstadoHallazgo) => {
    switch (estado) {
      case 'Preliminar': return '#3B82F6';
      case 'En Controversia': return '#F59E0B';
      case 'Ratificado': return '#10B981';
      case 'Modificado': return '#8B5CF6';
      case 'Cerrado': return '#6B7280';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {hallazgos.map((hallazgo) => (
        <Card key={hallazgo.id} className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {/* Header */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Badge className="font-black" style={{ background: '#6B7280', color: '#FFF' }}>
                  {hallazgo.codigo}
                </Badge>
                <Badge style={{ background: getTipoColor(hallazgo.tipo), color: '#FFF' }}>
                  {hallazgo.tipo}
                </Badge>
                <Badge style={{ background: getGravedadColor(hallazgo.gravedad), color: '#FFF' }}>
                  <Flag className="w-3 h-3 mr-1" />
                  {hallazgo.gravedad}
                </Badge>
                <Badge style={{ background: getEstadoColor(hallazgo.estado), color: '#FFF' }}>
                  {hallazgo.estado}
                </Badge>
                {hallazgo.controversia?.iniciada && (
                  <Badge style={{ background: '#F59E0B', color: '#FFF' }}>
                    <MessageSquare className="w-3 h-3 mr-1" />
                    {hallazgo.controversia.comentarios.length} comentarios
                  </Badge>
                )}
              </div>

              {/* Título y Descripción */}
              <h3 className="font-black text-gray-900 mb-2">{hallazgo.titulo}</h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {hallazgo.descripcionDetallada}
              </p>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <FileCheck className="w-3 h-3" />
                  {hallazgo.codigoAuditoria}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {hallazgo.auditorResponsable}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {hallazgo.fechaIdentificacion}
                </span>
                <span className="flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  {hallazgo.evidencias.length} evidencias
                </span>
                {hallazgo.historialCambios.length > 0 && (
                  <span className="flex items-center gap-1">
                    <History className="w-3 h-3" />
                    {hallazgo.historialCambios.length} cambios
                  </span>
                )}
              </div>

              {/* Normativa */}
              {hallazgo.normativaViolada && (
                <div className="mt-3 p-2 rounded-lg" style={{ background: '#FEF3C7' }}>
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-3 h-3 text-amber-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-amber-900 uppercase">Normativa:</span>
                      <p className="text-xs text-amber-800">{hallazgo.normativaViolada}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="flex flex-col gap-2">
              <Button onClick={() => onVerDetalle(hallazgo)} variant="outline" size="sm">
                <Eye className="w-3 h-3 mr-1" />
                Ver
              </Button>
              <Button onClick={() => onEditar(hallazgo)} variant="outline" size="sm">
                <Edit className="w-3 h-3 mr-1" />
                Editar
              </Button>
              {hallazgo.estado === 'Preliminar' && (
                <Button
                  onClick={() => onIniciarControversia(hallazgo)}
                  size="sm"
                  style={{ background: '#F59E0B' }}
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Controversia
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}

      {hallazgos.length === 0 && (
        <Card className="p-12 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No se encontraron hallazgos</p>
        </Card>
      )}
    </motion.div>
  );
}

// ============ VISTA: DETALLE HALLAZGO ============

interface DetalleHallazgoViewProps {
  hallazgo: Hallazgo;
  onVolver: () => void;
  onEditar: () => void;
  onRatificar: () => void;
  onModificar: () => void;
  onVerHistorial: () => void;
}

function DetalleHallazgoView({ hallazgo, onVolver, onEditar, onRatificar, onModificar, onVerHistorial }: DetalleHallazgoViewProps) {
  const [pestanaActiva, setPestanaActiva] = useState<'info' | 'evidencias' | 'controversia' | 'historial'>('info');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-orange-50 to-red-50">
        <Button onClick={onVolver} variant="ghost" size="sm" className="mb-4">
          <ChevronDown className="w-4 h-4 mr-2 rotate-90" />
          Volver a la lista
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge className="font-black" style={{ background: '#6B7280', color: '#FFF' }}>
                {hallazgo.codigo}
              </Badge>
              <Badge style={{ background: '#EF4444', color: '#FFF' }}>
                {hallazgo.tipo}
              </Badge>
              <Badge style={{ background: '#F97316', color: '#FFF' }}>
                {hallazgo.gravedad}
              </Badge>
              <Badge style={{ background: '#F59E0B', color: '#FFF' }}>
                {hallazgo.estado}
              </Badge>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">{hallazgo.titulo}</h2>
            <p className="text-gray-600">{hallazgo.procesoAuditable}</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={onEditar} variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
            {hallazgo.estado === 'En Controversia' && (
              <>
                <Button onClick={onRatificar} size="sm" style={{ background: '#10B981' }}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Ratificar
                </Button>
                <Button onClick={onModificar} size="sm" style={{ background: '#8B5CF6' }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Modificar
                </Button>
              </>
            )}
            <Button onClick={onVerHistorial} variant="outline" size="sm">
              <History className="w-4 h-4 mr-2" />
              Historial
            </Button>
          </div>
        </div>
      </Card>

      {/* Pestañas */}
      <Card className="p-2">
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setPestanaActiva('info')}
            variant={pestanaActiva === 'info' ? 'default' : 'ghost'}
            size="sm"
          >
            <FileText className="w-4 h-4 mr-2" />
            Información
          </Button>
          <Button
            onClick={() => setPestanaActiva('evidencias')}
            variant={pestanaActiva === 'evidencias' ? 'default' : 'ghost'}
            size="sm"
          >
            <Paperclip className="w-4 h-4 mr-2" />
            Evidencias ({hallazgo.evidencias.length})
          </Button>
          {hallazgo.controversia?.iniciada && (
            <Button
              onClick={() => setPestanaActiva('controversia')}
              variant={pestanaActiva === 'controversia' ? 'default' : 'ghost'}
              size="sm"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Controversia ({hallazgo.controversia.comentarios.length})
            </Button>
          )}
          <Button
            onClick={() => setPestanaActiva('historial')}
            variant={pestanaActiva === 'historial' ? 'default' : 'ghost'}
            size="sm"
          >
            <History className="w-4 h-4 mr-2" />
            Historial ({hallazgo.historialCambios.length})
          </Button>
        </div>
      </Card>

      {/* Contenido de Pestañas */}
      <AnimatePresence mode="wait">
        {pestanaActiva === 'info' && (
          <PestanaInformacion key="info" hallazgo={hallazgo} />
        )}
        {pestanaActiva === 'evidencias' && (
          <PestanaEvidencias key="evidencias" hallazgo={hallazgo} />
        )}
        {pestanaActiva === 'controversia' && hallazgo.controversia && (
          <PestanaControversia key="controversia" hallazgo={hallazgo} />
        )}
        {pestanaActiva === 'historial' && (
          <PestanaHistorial key="historial" hallazgo={hallazgo} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============ PESTAÑA: INFORMACIÓN ============

function PestanaInformacion({ hallazgo }: { hallazgo: Hallazgo }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Descripción */}
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-3">Descripción Detallada</h3>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
          {hallazgo.descripcionDetallada}
        </p>
      </Card>

      {/* Vinculación Normativa */}
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">Vinculación Normativa</h3>
        <div className="space-y-3">
          {hallazgo.normativaViolada && (
            <div className="p-3 rounded-lg" style={{ background: '#FEF3C7' }}>
              <p className="text-xs font-bold text-amber-900 uppercase mb-1">Normativa Violada</p>
              <p className="text-sm text-amber-800">{hallazgo.normativaViolada}</p>
            </div>
          )}

          {hallazgo.procedimientoIncumplido && (
            <div className="p-3 rounded-lg" style={{ background: '#DBEAFE' }}>
              <p className="text-xs font-bold text-blue-900 uppercase mb-1">Procedimiento Incumplido</p>
              <p className="text-sm text-blue-800">{hallazgo.procedimientoIncumplido}</p>
            </div>
          )}

          {hallazgo.requisitosAfectados.length > 0 && (
            <div className="p-3 rounded-lg" style={{ background: '#F3F4F6' }}>
              <p className="text-xs font-bold text-gray-900 uppercase mb-2">Requisitos Afectados</p>
              <ul className="list-disc list-inside space-y-1">
                {hallazgo.requisitosAfectados.map((req, i) => (
                  <li key={i} className="text-sm text-gray-700">{req}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-3 rounded-lg" style={{ background: '#F0FDF4' }}>
            <p className="text-xs font-bold text-green-900 uppercase mb-1">Criterio de Auditoría</p>
            <p className="text-sm text-green-800">{hallazgo.criterioAuditoria}</p>
          </div>
        </div>
      </Card>

      {/* Recomendaciones */}
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-3">Recomendaciones</h3>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
          {hallazgo.recomendaciones}
        </p>
      </Card>

      {/* Responsables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Equipo Auditor</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700">{hallazgo.auditorResponsable}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Área Auditada</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-orange-600" />
              <span className="text-gray-700">{hallazgo.areaResponsable}</span>
            </div>
            {hallazgo.jefeAreaResponsable && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-orange-600" />
                <span className="text-gray-700">{hallazgo.jefeAreaResponsable}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Fechas */}
      <Card className="p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Fechas Relevantes</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-600">Identificación</p>
            <p className="font-bold text-gray-900">{hallazgo.fechaIdentificacion}</p>
          </div>
          {hallazgo.fechaNotificacion && (
            <div>
              <p className="text-xs text-gray-600">Notificación</p>
              <p className="font-bold text-gray-900">{hallazgo.fechaNotificacion}</p>
            </div>
          )}
          {hallazgo.fechaRatificacion && (
            <div>
              <p className="text-xs text-gray-600">Ratificación</p>
              <p className="font-bold text-gray-900">{hallazgo.fechaRatificacion}</p>
            </div>
          )}
          {hallazgo.fechaCierre && (
            <div>
              <p className="text-xs text-gray-600">Cierre</p>
              <p className="font-bold text-gray-900">{hallazgo.fechaCierre}</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ============ PESTAÑA: EVIDENCIAS ============

function PestanaEvidencias({ hallazgo }: { hallazgo: Hallazgo }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-gray-900">
            Evidencias Documentales ({hallazgo.evidencias.length})
          </h3>
          <Button size="sm" style={{ background: '#F97316' }}>
            <Upload className="w-4 h-4 mr-2" />
            Cargar Evidencia
          </Button>
        </div>

        <div className="space-y-3">
          {hallazgo.evidencias.map((evidencia) => (
            <div
              key={evidencia.id}
              className="p-4 rounded-lg border flex items-center justify-between gap-4"
              style={{ background: '#F9FAFB' }}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#F97316' }}>
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{evidencia.nombre}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span>{evidencia.tipo}</span>
                    <span>{evidencia.tamano}</span>
                    <span>{evidencia.fechaCarga}</span>
                    <span>Por {evidencia.cargadoPor}</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {hallazgo.evidencias.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Paperclip className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No hay evidencias cargadas</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ============ PESTAÑA: CONTROVERSIA ============

function PestanaControversia({ hallazgo }: { hallazgo: Hallazgo }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Información de Controversia */}
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">Proceso de Controversia</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-600">Fecha Inicio</p>
            <p className="font-bold text-gray-900">{hallazgo.controversia?.fechaInicio}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Estado</p>
            <Badge style={{ background: '#F59E0B', color: '#FFF' }}>
              {hallazgo.controversia?.decision}
            </Badge>
          </div>
          {hallazgo.controversia?.fechaDecision && (
            <div>
              <p className="text-xs text-gray-600">Fecha Decisión</p>
              <p className="font-bold text-gray-900">{hallazgo.controversia.fechaDecision}</p>
            </div>
          )}
        </div>

        {/* Argumentos Área */}
        <div className="mb-4 p-4 rounded-lg" style={{ background: '#FEF3C7' }}>
          <p className="text-xs font-bold text-amber-900 uppercase mb-2">Argumentos del Área Auditada</p>
          <p className="text-sm text-amber-800">{hallazgo.controversia?.argumentosArea}</p>
        </div>

        {/* Respuesta OCI */}
        {hallazgo.controversia?.respuestaOCI && (
          <div className="p-4 rounded-lg" style={{ background: '#DBEAFE' }}>
            <p className="text-xs font-bold text-blue-900 uppercase mb-2">Respuesta de la OCI</p>
            <p className="text-sm text-blue-800">{hallazgo.controversia.respuestaOCI}</p>
          </div>
        )}
      </Card>

      {/* Timeline de Comentarios */}
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">Discusión</h3>
        <div className="space-y-3">
          {hallazgo.controversia?.comentarios.map((comentario, index) => (
            <div
              key={comentario.id}
              className="p-4 rounded-lg"
              style={{
                background: comentario.rol === 'Auditor' ? '#DBEAFE' : '#FEF3C7',
                marginLeft: comentario.rol === 'Auditor' ? '0' : 'auto',
                marginRight: comentario.rol === 'Auditor' ? 'auto' : '0',
                maxWidth: '85%'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="font-bold text-sm">{comentario.autor}</span>
                  <Badge variant="outline" className="text-xs">
                    {comentario.rol}
                  </Badge>
                </div>
                <span className="text-xs text-gray-600">
                  {comentario.fecha} {comentario.hora}
                </span>
              </div>
              <p className="text-sm text-gray-700">{comentario.comentario}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t">
          <textarea
            placeholder="Agregar comentario..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <div className="flex justify-end mt-2">
            <Button size="sm" style={{ background: '#F97316' }}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Enviar Comentario
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ============ PESTAÑA: HISTORIAL ============

function PestanaHistorial({ hallazgo }: { hallazgo: Hallazgo }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">
          Auditoría de Cambios ({hallazgo.historialCambios.length})
        </h3>

        <div className="space-y-3">
          {hallazgo.historialCambios.map((cambio, index) => (
            <div
              key={cambio.id}
              className="p-4 rounded-lg border-l-4"
              style={{
                background: '#F9FAFB',
                borderLeftColor: index === 0 ? '#F97316' : '#D1D5DB'
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <History className="w-4 h-4 text-gray-600" />
                    <span className="font-bold text-gray-900">{cambio.campo}</span>
                    {index === 0 && (
                      <Badge style={{ background: '#F97316', color: '#FFF' }}>Más reciente</Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>
                      <span className="text-red-600 line-through">{cambio.valorAnterior}</span>
                      {' → '}
                      <span className="text-green-600 font-bold">{cambio.valorNuevo}</span>
                    </p>
                    <p className="text-xs text-gray-600">{cambio.motivo}</p>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>{cambio.modificadoPor}</p>
                  <p>{cambio.fecha}</p>
                  <p>{cambio.hora}</p>
                </div>
              </div>
            </div>
          ))}

          {hallazgo.historialCambios.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No hay cambios registrados</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ============ VISTA: EDITOR (continuará en siguiente mensaje por límite de caracteres) ============

interface EditorHallazgoViewProps {
  hallazgo: Hallazgo | null;
  modo: 'crear' | 'editar';
  onGuardar: (hallazgo: Hallazgo) => void;
  onCancelar: () => void;
}

function EditorHallazgoView({ hallazgo, modo, onGuardar, onCancelar }: EditorHallazgoViewProps) {
  const [formData, setFormData] = useState<Partial<Hallazgo>>(
    hallazgo || {
      tipo: 'No Conformidad',
      gravedad: 'Mayor',
      titulo: '',
      descripcionDetallada: '',
      estado: 'Preliminar',
      evidencias: [],
      requisitosAfectados: [],
      recomendaciones: '',
      historialCambios: []
    }
  );

  const handleGuardar = () => {
    const hallazgoCompleto: Hallazgo = {
      id: hallazgo?.id || `h-${Date.now()}`,
      numero: hallazgo?.numero || 1,
      codigo: formData.codigo || `H-2025-${Date.now()}`,
      auditoriaId: formData.auditoriaId || 'aud-001',
      codigoAuditoria: formData.codigoAuditoria || 'AUD-2025-XXX',
      procesoAuditable: formData.procesoAuditable || '',
      tipo: formData.tipo as TipoHallazgo,
      gravedad: formData.gravedad as GravedadHallazgo,
      titulo: formData.titulo || '',
      descripcionDetallada: formData.descripcionDetallada || '',
      normativaViolada: formData.normativaViolada,
      procedimientoIncumplido: formData.procedimientoIncumplido,
      requisitosAfectados: formData.requisitosAfectados || [],
      criterioAuditoria: formData.criterioAuditoria || '',
      estado: formData.estado as EstadoHallazgo,
      fechaIdentificacion: formData.fechaIdentificacion || new Date().toISOString().split('T')[0],
      auditorResponsable: formData.auditorResponsable || 'Usuario Actual',
      areaResponsable: formData.areaResponsable || '',
      evidencias: formData.evidencias || [],
      recomendaciones: formData.recomendaciones || '',
      historialCambios: formData.historialCambios || [],
      creadoPor: formData.creadoPor || 'Usuario Actual',
      fechaCreacion: formData.fechaCreacion || new Date().toISOString().split('T')[0]
    };

    onGuardar(hallazgoCompleto);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <Card className="p-6 bg-gradient-to-r from-orange-50 to-red-50">
        <h2 className="text-2xl font-black text-gray-900">
          {modo === 'crear' ? 'Nuevo Hallazgo' : 'Editar Hallazgo'}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {modo === 'crear' 
            ? 'Registre un nuevo hallazgo identificado en la auditoría' 
            : 'Modifique la información del hallazgo'
          }
        </p>
      </Card>

      {/* Formulario Básico */}
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">Identificación del Hallazgo</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Tipo de Hallazgo <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoHallazgo })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="No Conformidad">No Conformidad</option>
                <option value="Observación">Observación</option>
                <option value="Oportunidad de Mejora">Oportunidad de Mejora</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Gravedad <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.gravedad}
                onChange={(e) => setFormData({ ...formData, gravedad: e.target.value as GravedadHallazgo })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="Crítico">Crítico</option>
                <option value="Mayor">Mayor</option>
                <option value="Menor">Menor</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Título del Hallazgo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Título breve y descriptivo"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Descripción Detallada <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.descripcionDetallada}
              onChange={(e) => setFormData({ ...formData, descripcionDetallada: e.target.value })}
              placeholder="Descripción completa de la situación identificada..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Normativa Violada
            </label>
            <input
              type="text"
              value={formData.normativaViolada || ''}
              onChange={(e) => setFormData({ ...formData, normativaViolada: e.target.value })}
              placeholder="Ley, Decreto, Artículo..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Recomendaciones <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.recomendaciones}
              onChange={(e) => setFormData({ ...formData, recomendaciones: e.target.value })}
              placeholder="Acciones recomendadas para subsanar el hallazgo..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </Card>

      {/* Acciones */}
      <Card className="p-4">
        <div className="flex gap-3">
          <Button onClick={onCancelar} variant="outline" className="flex-1">
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleGuardar} className="flex-1" style={{ background: '#F97316' }}>
            <Save className="w-4 h-4 mr-2" />
            {modo === 'crear' ? 'Crear Hallazgo' : 'Guardar Cambios'}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

// ============ MODALES ============

function ModalIniciarControversia({ hallazgo, onConfirmar, onCerrar }: any) {
  const [comentario, setComentario] = useState('');

  return (
    <Modal titulo="Iniciar Proceso de Controversia" onCerrar={onCerrar}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          El área auditada puede manifestar su desacuerdo con el hallazgo <strong>{hallazgo.codigo}</strong> presentando sus argumentos.
        </p>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Argumentos del Área Auditada <span className="text-red-500">*</span>
          </label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Presente los argumentos que sustentan su posición..."
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="p-3 rounded-lg" style={{ background: '#FEF3C7' }}>
          <p className="text-xs text-amber-900">
            Una vez iniciada la controversia, la Oficina de Control Interno evaluará los argumentos y emitirá una decisión.
          </p>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={onCerrar} variant="outline" className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirmar(comentario)}
            disabled={!comentario.trim()}
            className="flex-1"
            style={{ background: '#F59E0B' }}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Iniciar Controversia
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ModalRatificarHallazgo({ hallazgo, onConfirmar, onCerrar }: any) {
  const [respuesta, setRespuesta] = useState('');

  return (
    <Modal titulo="Ratificar Hallazgo" onCerrar={onCerrar}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Después de evaluar los argumentos presentados, proceda a ratificar el hallazgo <strong>{hallazgo.codigo}</strong>.
        </p>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Respuesta de la OCI <span className="text-red-500">*</span>
          </label>
          <textarea
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            placeholder="Argumente la decisión de ratificar el hallazgo..."
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={onCerrar} variant="outline" className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirmar(respuesta)}
            disabled={!respuesta.trim()}
            className="flex-1"
            style={{ background: '#10B981' }}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Ratificar Hallazgo
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ModalHistorialCambios({ hallazgo, onCerrar }: any) {
  return (
    <Modal titulo="Auditoría de Cambios" onCerrar={onCerrar}>
      <PestanaHistorial hallazgo={hallazgo} />
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
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
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
