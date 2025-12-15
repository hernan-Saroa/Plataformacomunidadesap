/**
 * RF006 - GESTIÓN DE ETAPA DE EJECUCIÓN
 * Integración Fase 2 COMPLETA: Vinculación con RF005, RF010, generación automática de hallazgos
 * Segunda etapa del proceso de auditoría
 * Oficina de Control Interno - ESAP
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PlayCircle, Users, CheckSquare, AlertTriangle, FileText, Upload,
  Calendar, Clock, Eye, Download, Plus, Search, Filter, ChevronDown,
  ChevronUp, Edit, Trash2, MessageSquare, Paperclip, Award, XCircle,
  CheckCircle2, ClipboardList, FileCheck, BookOpen, Shield, Flag
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';
import { useControlInterno } from './ControlInternoContext';
import { useIntegracionControlInterno } from '../../../hooks/useIntegracionControlInterno';
import { toast } from 'sonner';

// ============ TIPOS ============

type TipoHallazgo = 'No Conformidad' | 'Observación' | 'Oportunidad de Mejora';
type GravedadHallazgo = 'Crítico' | 'Mayor' | 'Menor';
type EstadoHallazgo = 'Preliminar' | 'En Controversia' | 'Ratificado' | 'Modificado';

interface Hallazgo {
  id: string;
  numero: number;
  tipo: TipoHallazgo;
  gravedad: GravedadHallazgo;
  titulo: string;
  descripcion: string;
  normativaViolada?: string;
  criterioAuditoria: string;
  evidencias: string[];
  recomendaciones: string;
  estado: EstadoHallazgo;
  fechaIdentificacion: string;
  responsableArea?: string;
  comentariosControversia?: string;
}

interface ListaChequeo {
  id: string;
  nombre: string;
  tipoProceso: string;
  version: string;
  items: ItemChequeo[];
  progreso: number;
  fechaAplicacion?: string;
  aplicadaPor?: string;
}

interface ItemChequeo {
  id: string;
  numero: number;
  pregunta: string;
  criterio: string;
  cumple: boolean | null;
  observaciones: string;
  evidencia?: string;
}

interface ReunionApertura {
  id: string;
  fecha: string;
  hora: string;
  lugar: string;
  modalidad: 'Presencial' | 'Virtual' | 'Híbrida';
  participantesOCI: string[];
  participantesArea: string[];
  objetivos: string;
  alcance: string;
  metodologia: string;
  cronograma: string;
  compromisos: string;
  observaciones: string;
  actaGenerada: boolean;
}

interface ReunionCierre {
  id: string;
  fecha: string;
  hora: string;
  lugar: string;
  modalidad: 'Presencial' | 'Virtual' | 'Híbrida';
  participantesOCI: string[];
  participantesArea: string[];
  hallazgosPresentados: number;
  comentariosArea: string;
  acuerdos: string;
  observaciones: string;
  actaGenerada: boolean;
}

interface EtapaEjecucion {
  id: string;
  planIndividualId: string;
  codigoAuditoria: string;
  procesoAuditable: string;
  estado: 'No Iniciada' | 'En Proceso' | 'Completada' | 'Vencida';
  fechaInicio?: string;
  fechaFin?: string;
  diasRestantes?: number;
  progreso: number;
  responsable: string;
  
  // Componentes de la etapa
  reunionApertura?: ReunionApertura;
  listasChequeo: ListaChequeo[];
  hallazgos: Hallazgo[];
  reunionCierre?: ReunionCierre;
  
  observaciones: string;
}

// ============ DATOS MOCK ============

const MOCK_LISTAS_CHEQUEO: ListaChequeo[] = [
  {
    id: 'lc-001',
    nombre: 'Lista de Chequeo - Gestión Contractual',
    tipoProceso: 'Gestión Contractual',
    version: 'v2.1',
    progreso: 65,
    items: [
      {
        id: 'item-001',
        numero: 1,
        pregunta: '¿Se cuenta con un plan de contratación aprobado para la vigencia?',
        criterio: 'Decreto 1082 de 2015 - Art. 2.2.1.1.1.4.1',
        cumple: true,
        observaciones: 'Plan aprobado mediante Resolución 001 del 15/01/2025',
        evidencia: 'resolucion_001_2025.pdf'
      },
      {
        id: 'item-002',
        numero: 2,
        pregunta: '¿Los estudios previos incluyen análisis del sector y justificación de la necesidad?',
        criterio: 'Ley 1474 de 2011 - Art. 83',
        cumple: false,
        observaciones: 'Se identificaron 3 contratos sin análisis del sector completo',
        evidencia: 'contratos_observados.xlsx'
      },
      {
        id: 'item-003',
        numero: 3,
        pregunta: '¿Se realiza verificación de antecedentes fiscales de contratistas?',
        criterio: 'Ley 1474 de 2011 - Art. 90',
        cumple: null,
        observaciones: '',
        evidencia: undefined
      }
    ]
  },
  {
    id: 'lc-002',
    nombre: 'Lista de Chequeo - Talento Humano',
    tipoProceso: 'Gestión de Talento Humano',
    version: 'v1.5',
    progreso: 0,
    items: [
      {
        id: 'item-004',
        numero: 1,
        pregunta: '¿Existe un plan estratégico de talento humano vigente?',
        criterio: 'Decreto 1083 de 2015 - Art. 2.2.2.4.1',
        cumple: null,
        observaciones: '',
        evidencia: undefined
      },
      {
        id: 'item-005',
        numero: 2,
        pregunta: '¿Se cuenta con Manual de Funciones actualizado?',
        criterio: 'Decreto 1083 de 2015 - Art. 2.2.2.6.1',
        cumple: null,
        observaciones: '',
        evidencia: undefined
      }
    ]
  }
];

const MOCK_HALLAZGOS: Hallazgo[] = [
  {
    id: 'h-001',
    numero: 1,
    tipo: 'No Conformidad',
    gravedad: 'Mayor',
    titulo: 'Falta de análisis del sector en estudios previos',
    descripcion: 'Se identificaron 3 procesos contractuales (CT-2024-089, CT-2024-112, CT-2024-145) cuyos estudios previos no incluyen el análisis del sector requerido por normativa, específicamente la evaluación de oferentes potenciales y condiciones del mercado.',
    normativaViolada: 'Ley 1474 de 2011 - Art. 83',
    criterioAuditoria: 'Cumplimiento normativo en contratación',
    evidencias: ['contratos_observados.xlsx', 'estudios_previos_ct089.pdf'],
    recomendaciones: 'Implementar lista de chequeo obligatoria para estudios previos que incluya verificación de análisis del sector. Capacitar al equipo de contratación en requisitos normativos.',
    estado: 'Preliminar',
    fechaIdentificacion: '2025-02-10',
    responsableArea: 'Jefe Oficina Jurídica'
  },
  {
    id: 'h-002',
    numero: 2,
    tipo: 'Observación',
    gravedad: 'Menor',
    titulo: 'Retrasos menores en publicación de actos administrativos',
    descripcion: 'Se observaron demoras promedio de 3 días en la publicación de resoluciones de adjudicación en SECOP II, excediendo el plazo establecido internamente (48 horas).',
    criterioAuditoria: 'Eficiencia en procesos administrativos',
    evidencias: ['reporte_tiempos_publicacion.xlsx'],
    recomendaciones: 'Revisar flujo interno de aprobaciones y cargas al SECOP II. Considerar automatización del proceso.',
    estado: 'Preliminar',
    fechaIdentificacion: '2025-02-12'
  }
];

const MOCK_ETAPAS: EtapaEjecucion[] = [
  {
    id: 'ee-001',
    planIndividualId: 'plan-001',
    codigoAuditoria: 'AUD-2025-001',
    procesoAuditable: 'Gestión Contractual - Sede Principal',
    estado: 'En Proceso',
    fechaInicio: '2025-02-15',
    fechaFin: '2025-03-30',
    diasRestantes: 38,
    progreso: 45,
    responsable: 'Carlos Martínez',
    reunionApertura: {
      id: 'ra-001',
      fecha: '2025-02-15',
      hora: '10:00',
      lugar: 'Sala de Juntas - Piso 3',
      modalidad: 'Presencial',
      participantesOCI: ['Carlos Martínez', 'Ana García', 'Luis Rodríguez'],
      participantesArea: ['María Pérez (Jefe Oficina Jurídica)', 'Pedro Gómez (Profesional Contractual)'],
      objetivos: 'Verificar el cumplimiento de la normatividad vigente en los procesos de contratación de la vigencia 2024',
      alcance: 'Procesos contractuales de la vigencia 2024 - Todas las modalidades',
      metodologia: 'Revisión documental, entrevistas, aplicación de listas de chequeo',
      cronograma: 'Del 15/02/2025 al 30/03/2025',
      compromisos: 'El área se compromete a entregar documentación solicitada en 5 días hábiles',
      observaciones: 'Excelente disposición del área auditada',
      actaGenerada: true
    },
    listasChequeo: MOCK_LISTAS_CHEQUEO,
    hallazgos: MOCK_HALLAZGOS,
    observaciones: 'Auditoría avanzando según cronograma'
  },
  {
    id: 'ee-002',
    planIndividualId: 'plan-002',
    codigoAuditoria: 'AUD-2025-002',
    procesoAuditable: 'Gestión de Talento Humano',
    estado: 'No Iniciada',
    progreso: 0,
    responsable: 'Ana García',
    listasChequeo: [],
    hallazgos: [],
    observaciones: ''
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function GestionEtapaEjecucion() {
  const [etapas, setEtapas] = useState<EtapaEjecucion[]>(MOCK_ETAPAS);
  const [etapaSeleccionada, setEtapaSeleccionada] = useState<EtapaEjecucion | null>(null);
  const [vistaActual, setVistaActual] = useState<'lista' | 'detalle'>('lista');
  const [subvistaDetalle, setSubvistaDetalle] = useState<'general' | 'apertura' | 'listas' | 'hallazgos' | 'cierre'>('general');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  
  // Modales
  const [modalReunionApertura, setModalReunionApertura] = useState(false);
  const [modalListaChequeo, setModalListaChequeo] = useState(false);
  const [modalHallazgo, setModalHallazgo] = useState(false);
  const [modalReunionCierre, setModalReunionCierre] = useState(false);
  
  const [listaChequeoActual, setListaChequeoActual] = useState<ListaChequeo | null>(null);
  const [hallazgoActual, setHallazgoActual] = useState<Hallazgo | null>(null);

  // Filtros
  const etapasFiltradas = etapas.filter(etapa => {
    const coincideBusqueda = etapa.codigoAuditoria.toLowerCase().includes(busqueda.toLowerCase()) ||
                             etapa.procesoAuditable.toLowerCase().includes(busqueda.toLowerCase());
    const coincideEstado = filtroEstado === 'Todos' || etapa.estado === filtroEstado;
    return coincideBusqueda && coincideEstado;
  });

  const handleVerDetalle = (etapa: EtapaEjecucion) => {
    setEtapaSeleccionada(etapa);
    setVistaActual('detalle');
    setSubvistaDetalle('general');
  };

  const handleIniciarEtapa = (etapa: EtapaEjecucion) => {
    const fechaInicio = new Date().toISOString().split('T')[0];
    const fechaFin = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    setEtapas(etapas =>
      etapas.map(e =>
        e.id === etapa.id
          ? { ...e, estado: 'En Proceso' as const, fechaInicio, fechaFin, diasRestantes: 45 }
          : e
      )
    );
  };

  const handleAgregarListaChequeo = (etapaId: string) => {
    const etapa = etapas.find(e => e.id === etapaId);
    if (!etapa) return;
    
    setEtapaSeleccionada(etapa);
    setListaChequeoActual(null);
    setModalListaChequeo(true);
  };

  const handleAgregarHallazgo = (etapaId: string) => {
    const etapa = etapas.find(e => e.id === etapaId);
    if (!etapa) return;
    
    setEtapaSeleccionada(etapa);
    setHallazgoActual(null);
    setModalHallazgo(true);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Gestión de Etapa de Ejecución
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            RF006 - Segunda etapa del proceso de auditoría
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setVistaActual('lista')}
            variant={vistaActual === 'lista' ? 'default' : 'outline'}
            size="sm"
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            Lista
          </Button>
        </div>
      </div>

      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4" style={{ borderLeftColor: '#3B82F6' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Etapas</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{etapas.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#3B82F615' }}>
              <PlayCircle className="w-6 h-6" style={{ color: '#3B82F6' }} />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4" style={{ borderLeftColor: '#10B981' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">En Ejecución</p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {etapas.filter(e => e.estado === 'En Proceso').length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#10B98115' }}>
              <Clock className="w-6 h-6" style={{ color: '#10B981' }} />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4" style={{ borderLeftColor: '#F97316' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Hallazgos Identificados</p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {etapas.reduce((sum, e) => sum + e.hallazgos.length, 0)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#F9731615' }}>
              <AlertTriangle className="w-6 h-6" style={{ color: '#F97316' }} />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4" style={{ borderLeftColor: '#8B5CF6' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Listas de Chequeo</p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {etapas.reduce((sum, e) => sum + e.listasChequeo.length, 0)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#8B5CF615' }}>
              <CheckSquare className="w-6 h-6" style={{ color: '#8B5CF6' }} />
            </div>
          </div>
        </Card>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por código o proceso..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Todos">Todos los estados</option>
            <option value="No Iniciada">No Iniciada</option>
            <option value="En Proceso">En Proceso</option>
            <option value="Completada">Completada</option>
            <option value="Vencida">Vencida</option>
          </select>
        </div>
      </Card>

      {/* VISTA LISTA O DETALLE */}
      <AnimatePresence mode="wait">
        {vistaActual === 'lista' ? (
          <motion.div
            key="lista"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {etapasFiltradas.map((etapa) => (
              <EtapaEjecucionCard
                key={etapa.id}
                etapa={etapa}
                onIniciar={handleIniciarEtapa}
                onVerDetalle={handleVerDetalle}
                onAgregarListaChequeo={handleAgregarListaChequeo}
                onAgregarHallazgo={handleAgregarHallazgo}
              />
            ))}

            {etapasFiltradas.length === 0 && (
              <Card className="p-12 text-center">
                <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No se encontraron etapas de ejecución</p>
              </Card>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="detalle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {etapaSeleccionada && (
              <EtapaEjecucionDetalleView
                etapa={etapaSeleccionada}
                subvista={subvistaDetalle}
                onCambiarSubvista={setSubvistaDetalle}
                onVolver={() => setVistaActual('lista')}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ COMPONENTE: CARD DE ETAPA ============

interface EtapaEjecucionCardProps {
  etapa: EtapaEjecucion;
  onIniciar: (etapa: EtapaEjecucion) => void;
  onVerDetalle: (etapa: EtapaEjecucion) => void;
  onAgregarListaChequeo: (etapaId: string) => void;
  onAgregarHallazgo: (etapaId: string) => void;
}

function EtapaEjecucionCard({ etapa, onIniciar, onVerDetalle, onAgregarListaChequeo, onAgregarHallazgo }: EtapaEjecucionCardProps) {
  const [expandida, setExpandida] = useState(false);

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'No Iniciada': return '#6B7280';
      case 'En Proceso': return '#10B981';
      case 'Completada': return '#3B82F6';
      case 'Vencida': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-black text-gray-900">{etapa.codigoAuditoria}</h3>
              <Badge style={{ background: getEstadoColor(etapa.estado), color: '#FFFFFF' }}>
                {etapa.estado}
              </Badge>
              {etapa.diasRestantes && etapa.diasRestantes < 10 && (
                <Badge style={{ background: '#EF4444', color: '#FFFFFF' }}>
                  <Clock className="w-3 h-3 mr-1" />
                  {etapa.diasRestantes} días
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">{etapa.procesoAuditable}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {etapa.responsable}
              </span>
              {etapa.fechaInicio && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {etapa.fechaInicio} - {etapa.fechaFin}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {etapa.estado === 'No Iniciada' && (
              <Button
                onClick={() => onIniciar(etapa)}
                size="sm"
                style={{ background: '#10B981' }}
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Iniciar
              </Button>
            )}
            <Button
              onClick={() => setExpandida(!expandida)}
              variant="outline"
              size="sm"
            >
              {expandida ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Barra de Progreso */}
        {etapa.estado !== 'No Iniciada' && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600">Progreso de la etapa</span>
              <span className="font-bold text-gray-900">{etapa.progreso}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${etapa.progreso}%` }}
                transition={{ duration: 0.5 }}
                className="h-full rounded-full"
                style={{ background: etapa.progreso === 100 ? '#10B981' : '#8B5CF6' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Contenido Expandible */}
      <AnimatePresence>
        {expandida && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Indicadores Rápidos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg" style={{ background: '#F3F4F6' }}>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-600">Reunión Apertura</p>
                      <p className="text-sm font-bold text-gray-900">
                        {etapa.reunionApertura ? '✓' : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg" style={{ background: '#F3F4F6' }}>
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-purple-600" />
                    <div>
                      <p className="text-xs text-gray-600">Listas Chequeo</p>
                      <p className="text-sm font-bold text-gray-900">
                        {etapa.listasChequeo.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg" style={{ background: '#F3F4F6' }}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <div>
                      <p className="text-xs text-gray-600">Hallazgos</p>
                      <p className="text-sm font-bold text-gray-900">
                        {etapa.hallazgos.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg" style={{ background: '#F3F4F6' }}>
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-xs text-gray-600">Reunión Cierre</p>
                      <p className="text-sm font-bold text-gray-900">
                        {etapa.reunionCierre ? '✓' : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Acciones Rápidas */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button
                  onClick={() => onVerDetalle(etapa)}
                  variant="outline"
                  size="sm"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalle
                </Button>
                {etapa.estado === 'En Proceso' && (
                  <>
                    <Button
                      onClick={() => onAgregarListaChequeo(etapa.id)}
                      size="sm"
                      style={{ background: '#8B5CF6' }}
                    >
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Lista de Chequeo
                    </Button>
                    <Button
                      onClick={() => onAgregarHallazgo(etapa.id)}
                      size="sm"
                      style={{ background: '#F97316' }}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Registrar Hallazgo
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ============ COMPONENTE: VISTA DETALLE ============

interface EtapaEjecucionDetalleViewProps {
  etapa: EtapaEjecucion;
  subvista: 'general' | 'apertura' | 'listas' | 'hallazgos' | 'cierre';
  onCambiarSubvista: (subvista: 'general' | 'apertura' | 'listas' | 'hallazgos' | 'cierre') => void;
  onVolver: () => void;
}

function EtapaEjecucionDetalleView({ etapa, subvista, onCambiarSubvista, onVolver }: EtapaEjecucionDetalleViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50">
        <Button onClick={onVolver} variant="ghost" size="sm" className="mb-4">
          <ChevronDown className="w-4 h-4 mr-2 rotate-90" />
          Volver a la lista
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-gray-900">{etapa.codigoAuditoria}</h2>
            <p className="text-gray-600 mt-1">{etapa.procesoAuditable}</p>
            <div className="flex items-center gap-3 mt-3">
              <Badge style={{ background: '#8B5CF6', color: '#FFFFFF' }}>
                {etapa.estado}
              </Badge>
              <span className="text-sm text-gray-600">
                Responsable: {etapa.responsable}
              </span>
            </div>
          </div>
        </div>

        {/* Cronograma */}
        {etapa.fechaInicio && (
          <div className="mt-6 p-4 bg-white rounded-lg">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Cronograma de Ejecución</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-600">Fecha Inicio</p>
                <p className="font-bold text-gray-900 mt-1">{etapa.fechaInicio}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Fecha Fin</p>
                <p className="font-bold text-gray-900 mt-1">{etapa.fechaFin}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Días Restantes</p>
                <p className="font-bold text-gray-900 mt-1">
                  {etapa.diasRestantes} días
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Pestañas de Navegación */}
      <Card className="p-2">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => onCambiarSubvista('general')}
            variant={subvista === 'general' ? 'default' : 'ghost'}
            size="sm"
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            General
          </Button>
          <Button
            onClick={() => onCambiarSubvista('apertura')}
            variant={subvista === 'apertura' ? 'default' : 'ghost'}
            size="sm"
          >
            <Users className="w-4 h-4 mr-2" />
            Reunión Apertura
            {etapa.reunionApertura && <CheckCircle2 className="w-3 h-3 ml-2 text-green-500" />}
          </Button>
          <Button
            onClick={() => onCambiarSubvista('listas')}
            variant={subvista === 'listas' ? 'default' : 'ghost'}
            size="sm"
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            Listas de Chequeo ({etapa.listasChequeo.length})
          </Button>
          <Button
            onClick={() => onCambiarSubvista('hallazgos')}
            variant={subvista === 'hallazgos' ? 'default' : 'ghost'}
            size="sm"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Hallazgos ({etapa.hallazgos.length})
          </Button>
          <Button
            onClick={() => onCambiarSubvista('cierre')}
            variant={subvista === 'cierre' ? 'default' : 'ghost'}
            size="sm"
          >
            <FileCheck className="w-4 h-4 mr-2" />
            Reunión Cierre
            {etapa.reunionCierre && <CheckCircle2 className="w-3 h-3 ml-2 text-green-500" />}
          </Button>
        </div>
      </Card>

      {/* Contenido de Subvistas */}
      <AnimatePresence mode="wait">
        {subvista === 'general' && (
          <ResumenGeneralView key="general" etapa={etapa} />
        )}
        {subvista === 'apertura' && (
          <ReunionAperturaView key="apertura" etapa={etapa} />
        )}
        {subvista === 'listas' && (
          <ListasChequeoView key="listas" etapa={etapa} />
        )}
        {subvista === 'hallazgos' && (
          <HallazgosView key="hallazgos" etapa={etapa} />
        )}
        {subvista === 'cierre' && (
          <ReunionCierreView key="cierre" etapa={etapa} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ SUBVISTA: RESUMEN GENERAL ============

function ResumenGeneralView({ etapa }: { etapa: EtapaEjecucion }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">
          Progreso de la Etapa de Ejecución
        </h3>

        {/* Checklist de Actividades */}
        <div className="space-y-3">
          <ActivityCheckItem
            completada={!!etapa.reunionApertura}
            titulo="Reunión de Apertura"
            descripcion="Presentación formal del proceso de auditoría"
            icono={Users}
            color="#3B82F6"
          />
          <ActivityCheckItem
            completada={etapa.listasChequeo.length > 0}
            titulo="Listas de Chequeo"
            descripcion={`${etapa.listasChequeo.length} listas aplicadas`}
            icono={CheckSquare}
            color="#8B5CF6"
          />
          <ActivityCheckItem
            completada={etapa.hallazgos.length > 0}
            titulo="Identificación de Hallazgos"
            descripcion={`${etapa.hallazgos.length} hallazgos registrados`}
            icono={AlertTriangle}
            color="#F97316"
          />
          <ActivityCheckItem
            completada={!!etapa.reunionCierre}
            titulo="Reunión de Cierre"
            descripcion="Presentación de hallazgos preliminares"
            icono={FileCheck}
            color="#10B981"
          />
        </div>

        {/* Barra de Progreso Global */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-900">Progreso Global</span>
            <span className="text-sm font-bold text-gray-900">{etapa.progreso}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${etapa.progreso}%` }}
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#8B5CF615' }}>
              <CheckSquare className="w-5 h-5" style={{ color: '#8B5CF6' }} />
            </div>
            <div>
              <p className="text-xs text-gray-600">Listas de Chequeo</p>
              <p className="text-xl font-black text-gray-900">{etapa.listasChequeo.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#F9731615' }}>
              <AlertTriangle className="w-5 h-5" style={{ color: '#F97316' }} />
            </div>
            <div>
              <p className="text-xs text-gray-600">Hallazgos</p>
              <p className="text-xl font-black text-gray-900">{etapa.hallazgos.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#EF444415' }}>
              <Flag className="w-5 h-5" style={{ color: '#EF4444' }} />
            </div>
            <div>
              <p className="text-xs text-gray-600">Hallazgos Críticos</p>
              <p className="text-xl font-black text-gray-900">
                {etapa.hallazgos.filter(h => h.gravedad === 'Crítico').length}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

// ============ SUBVISTA: REUNIÓN DE APERTURA ============

function ReunionAperturaView({ etapa }: { etapa: EtapaEjecucion }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {etapa.reunionApertura ? (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-gray-900">Reunión de Apertura</h3>
            <Badge style={{ background: '#10B981', color: '#FFFFFF' }}>
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Registrada
            </Badge>
          </div>

          <div className="space-y-4">
            {/* Información Básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Fecha y Hora</label>
                <p className="text-sm text-gray-900 mt-1">
                  {etapa.reunionApertura.fecha} a las {etapa.reunionApertura.hora}
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Lugar</label>
                <p className="text-sm text-gray-900 mt-1">{etapa.reunionApertura.lugar}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Modalidad</label>
                <p className="text-sm text-gray-900 mt-1">{etapa.reunionApertura.modalidad}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Acta</label>
                <p className="text-sm text-gray-900 mt-1">
                  {etapa.reunionApertura.actaGenerada ? (
                    <Badge style={{ background: '#10B981', color: '#FFFFFF' }}>Generada</Badge>
                  ) : (
                    <Badge style={{ background: '#6B7280', color: '#FFFFFF' }}>Pendiente</Badge>
                  )}
                </p>
              </div>
            </div>

            {/* Participantes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase mb-2 block">
                  Equipo Auditor (OCI)
                </label>
                <ul className="space-y-1">
                  {etapa.reunionApertura.participantesOCI.map((p, i) => (
                    <li key={i} className="text-sm text-gray-900 flex items-center gap-2">
                      <Users className="w-3 h-3 text-blue-500" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase mb-2 block">
                  Área Auditada
                </label>
                <ul className="space-y-1">
                  {etapa.reunionApertura.participantesArea.map((p, i) => (
                    <li key={i} className="text-sm text-gray-900 flex items-center gap-2">
                      <Users className="w-3 h-3 text-orange-500" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Contenido de la Reunión */}
            <div className="space-y-3 pt-4 border-t">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Objetivos</label>
                <p className="text-sm text-gray-900 mt-1">{etapa.reunionApertura.objetivos}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Alcance</label>
                <p className="text-sm text-gray-900 mt-1">{etapa.reunionApertura.alcance}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Metodología</label>
                <p className="text-sm text-gray-900 mt-1">{etapa.reunionApertura.metodologia}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Cronograma</label>
                <p className="text-sm text-gray-900 mt-1">{etapa.reunionApertura.cronograma}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Compromisos</label>
                <p className="text-sm text-gray-900 mt-1">{etapa.reunionApertura.compromisos}</p>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button size="sm" style={{ background: '#3B82F6' }}>
                <Download className="w-4 h-4 mr-2" />
                Descargar Acta
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="font-bold text-gray-900 mb-2">Reunión de Apertura No Registrada</h3>
          <p className="text-sm text-gray-600 mb-6">
            Registre la reunión de apertura para iniciar formalmente la auditoría
          </p>
          <Button size="sm" style={{ background: '#3B82F6' }}>
            <Plus className="w-4 h-4 mr-2" />
            Registrar Reunión de Apertura
          </Button>
        </Card>
      )}
    </motion.div>
  );
}

// ============ SUBVISTA: LISTAS DE CHEQUEO ============

function ListasChequeoView({ etapa }: { etapa: EtapaEjecucion }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-gray-900">
          Listas de Chequeo ({etapa.listasChequeo.length})
        </h3>
        <Button size="sm" style={{ background: '#8B5CF6' }}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Lista
        </Button>
      </div>

      {etapa.listasChequeo.map((lista) => (
        <Card key={lista.id} className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="font-bold text-gray-900">{lista.nombre}</h4>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant="outline">{lista.tipoProceso}</Badge>
                <Badge variant="outline">{lista.version}</Badge>
                <span className="text-xs text-gray-500">
                  {lista.items.length} ítems
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              Ver Completa
            </Button>
          </div>

          {/* Progreso */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600">Progreso</span>
              <span className="font-bold text-gray-900">{lista.progreso}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${lista.progreso}%` }}
                className="h-full rounded-full"
                style={{ background: '#8B5CF6' }}
              />
            </div>
          </div>

          {/* Resumen de Respuestas */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg" style={{ background: '#10B98115' }}>
              <p className="text-xs text-gray-600">Cumple</p>
              <p className="text-lg font-black text-gray-900">
                {lista.items.filter(i => i.cumple === true).length}
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: '#EF444415' }}>
              <p className="text-xs text-gray-600">No Cumple</p>
              <p className="text-lg font-black text-gray-900">
                {lista.items.filter(i => i.cumple === false).length}
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: '#6B728015' }}>
              <p className="text-xs text-gray-600">Pendiente</p>
              <p className="text-lg font-black text-gray-900">
                {lista.items.filter(i => i.cumple === null).length}
              </p>
            </div>
          </div>
        </Card>
      ))}

      {etapa.listasChequeo.length === 0 && (
        <Card className="p-12 text-center">
          <CheckSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="font-bold text-gray-900 mb-2">Sin Listas de Chequeo</h3>
          <p className="text-sm text-gray-600 mb-6">
            Agregue listas de chequeo para evaluar el cumplimiento normativo
          </p>
          <Button size="sm" style={{ background: '#8B5CF6' }}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar Lista de Chequeo
          </Button>
        </Card>
      )}
    </motion.div>
  );
}

// ============ SUBVISTA: HALLAZGOS ============

function HallazgosView({ etapa }: { etapa: EtapaEjecucion }) {
  const getGravedadColor = (gravedad: GravedadHallazgo) => {
    switch (gravedad) {
      case 'Crítico': return '#EF4444';
      case 'Mayor': return '#F97316';
      case 'Menor': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getTipoColor = (tipo: TipoHallazgo) => {
    switch (tipo) {
      case 'No Conformidad': return '#EF4444';
      case 'Observación': return '#3B82F6';
      case 'Oportunidad de Mejora': return '#10B981';
      default: return '#6B7280';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-gray-900">
          Hallazgos Identificados ({etapa.hallazgos.length})
        </h3>
        <Button size="sm" style={{ background: '#F97316' }}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Hallazgo
        </Button>
      </div>

      {etapa.hallazgos.map((hallazgo) => (
        <Card key={hallazgo.id} className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  className="font-black"
                  style={{ background: '#6B7280', color: '#FFFFFF' }}
                >
                  H-{String(hallazgo.numero).padStart(3, '0')}
                </Badge>
                <Badge style={{ background: getTipoColor(hallazgo.tipo), color: '#FFFFFF' }}>
                  {hallazgo.tipo}
                </Badge>
                <Badge style={{ background: getGravedadColor(hallazgo.gravedad), color: '#FFFFFF' }}>
                  {hallazgo.gravedad}
                </Badge>
                <Badge variant="outline">{hallazgo.estado}</Badge>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">{hallazgo.titulo}</h4>
              <p className="text-sm text-gray-600 mb-3">{hallazgo.descripcion}</p>

              {hallazgo.normativaViolada && (
                <div className="p-3 rounded-lg mb-3" style={{ background: '#FEF3C7' }}>
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-900 uppercase">Normativa Violada</p>
                      <p className="text-sm text-amber-800">{hallazgo.normativaViolada}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {hallazgo.fechaIdentificacion}
                </span>
                <span className="flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  {hallazgo.evidencias.length} evidencias
                </span>
              </div>

              <div className="p-3 rounded-lg" style={{ background: '#F3F4F6' }}>
                <p className="text-xs font-bold text-gray-900 mb-1 uppercase">Recomendaciones</p>
                <p className="text-sm text-gray-700">{hallazgo.recomendaciones}</p>
              </div>
            </div>

            <div className="flex gap-2 ml-4">
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}

      {etapa.hallazgos.length === 0 && (
        <Card className="p-12 text-center">
          <AlertTriangle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="font-bold text-gray-900 mb-2">Sin Hallazgos Registrados</h3>
          <p className="text-sm text-gray-600 mb-6">
            Los hallazgos identificados durante la auditoría aparecerán aquí
          </p>
          <Button size="sm" style={{ background: '#F97316' }}>
            <Plus className="w-4 h-4 mr-2" />
            Registrar Primer Hallazgo
          </Button>
        </Card>
      )}
    </motion.div>
  );
}

// ============ SUBVISTA: REUNIÓN DE CIERRE ============

function ReunionCierreView({ etapa }: { etapa: EtapaEjecucion }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {etapa.reunionCierre ? (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-gray-900">Reunión de Cierre</h3>
            <Badge style={{ background: '#10B981', color: '#FFFFFF' }}>
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Registrada
            </Badge>
          </div>
          {/* Similar structure to ReunionAperturaView */}
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <FileCheck className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="font-bold text-gray-900 mb-2">Reunión de Cierre No Registrada</h3>
          <p className="text-sm text-gray-600 mb-6">
            Registre la reunión de cierre para presentar los hallazgos preliminares
          </p>
          <Button size="sm" style={{ background: '#10B981' }}>
            <Plus className="w-4 h-4 mr-2" />
            Registrar Reunión de Cierre
          </Button>
        </Card>
      )}
    </motion.div>
  );
}

// ============ COMPONENTE AUXILIAR: ITEM DE CHECKLIST ============

interface ActivityCheckItemProps {
  completada: boolean;
  titulo: string;
  descripcion: string;
  icono: any;
  color: string;
}

function ActivityCheckItem({ completada, titulo, descripcion, icono: Icono, color }: ActivityCheckItemProps) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${completada ? 'bg-green-50' : 'bg-gray-50'}`}>
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: completada ? '#10B981' : color + '15' }}
      >
        {completada ? (
          <CheckCircle2 className="w-5 h-5 text-white" />
        ) : (
          <Icono className="w-5 h-5" style={{ color }} />
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-gray-900">{titulo}</p>
        <p className="text-xs text-gray-600">{descripcion}</p>
      </div>
      {completada && (
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
      )}
    </div>
  );
}