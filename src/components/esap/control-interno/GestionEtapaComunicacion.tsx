/**
 * RF007 - GESTIÓN DE ETAPA DE COMUNICACIÓN
 * Integración Fase 2 COMPLETA: Vinculación con RF006, RF010, RF012, generación automática de informes
 * Tercera etapa del proceso de auditoría - Comunicación de resultados
 * Oficina de Control Interno - ESAP
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send, FileText, MessageSquare, CheckCircle2, Download, Eye,
  AlertTriangle, Clock, Calendar, User, Building2, Mail, Bell,
  Archive, Share2, Printer, ChevronDown, ChevronUp, Plus, X,
  FileCheck, Users, Award, TrendingUp, BarChart3, ClipboardList,
  Search, Filter, Edit, History, Shield, Sparkles, Flag
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';
import { useControlInterno } from './ControlInternoContext';
import { useIntegracionControlInterno } from '../../../hooks/useIntegracionControlInterno';
import { toast } from 'sonner';

// ============ TIPOS ============

type EstadoComunicacion = 
  | 'No Iniciada'
  | 'Informe Preliminar Generado'
  | 'En Controversia'
  | 'Controversia Resuelta'
  | 'Informe Final Generado'
  | 'Plan Mejoramiento Recibido'
  | 'Informe Ejecutivo Generado'
  | 'Completada';

type TipoInforme = 'Preliminar' | 'Final' | 'Ejecutivo';

interface Documento {
  id: string;
  tipo: TipoInforme | 'Plan de Mejoramiento';
  nombre: string;
  version: string;
  fechaGeneracion: string;
  generadoPor: string;
  estado: 'Borrador' | 'Aprobado' | 'Enviado';
  tamano: string;
  url?: string;
}

interface Notificacion {
  id: string;
  tipo: 'Informe Preliminar' | 'Solicitud Controversia' | 'Respuesta Controversia' | 'Informe Final' | 'Solicitud Plan';
  destinatario: string;
  cargo: string;
  fechaEnvio: string;
  horaEnvio: string;
  estado: 'Enviada' | 'Leída' | 'Respondida';
  asunto: string;
}

interface Hallazgo {
  id: string;
  codigo: string;
  tipo: 'No Conformidad' | 'Observación' | 'Oportunidad de Mejora';
  gravedad: 'Crítico' | 'Mayor' | 'Menor';
  titulo: string;
  estado: 'Preliminar' | 'En Controversia' | 'Ratificado' | 'Modificado';
  tieneControversia: boolean;
  controvertido: boolean;
}

interface EtapaComunicacion {
  id: string;
  planIndividualId: string;
  codigoAuditoria: string;
  procesoAuditable: string;
  estado: EstadoComunicacion;
  
  // Fechas clave
  fechaInicio?: string;
  fechaInformePreliminar?: string;
  fechaInicioControversia?: string;
  fechaCierreControversia?: string;
  fechaInformeFinal?: string;
  fechaPlanMejoramiento?: string;
  fechaInformeEjecutivo?: string;
  fechaCompletado?: string;
  
  // Responsables
  responsableAuditoria: string;
  equipoAuditor: string[];
  jefeAreaAuditada: string;
  areaAuditada: string;
  
  // Hallazgos
  totalHallazgos: number;
  hallazgosPreliminares: number;
  hallazgosRatificados: number;
  hallazgosModificados: number;
  hallazgosControvertidos: number;
  
  // Documentos
  documentos: Documento[];
  
  // Notificaciones
  notificaciones: Notificacion[];
  
  // Control
  diasTranscurridos: number;
  progreso: number;
  observaciones: string;
}

// ============ DATOS MOCK ============

const MOCK_HALLAZGOS: Hallazgo[] = [
  {
    id: 'h-001',
    codigo: 'H-2025-001',
    tipo: 'No Conformidad',
    gravedad: 'Mayor',
    titulo: 'Falta de análisis del sector en estudios previos',
    estado: 'En Controversia',
    tieneControversia: true,
    controvertido: true
  },
  {
    id: 'h-002',
    codigo: 'H-2025-002',
    tipo: 'Observación',
    gravedad: 'Menor',
    titulo: 'Retrasos en publicación de actos administrativos',
    estado: 'Ratificado',
    tieneControversia: true,
    controvertido: false
  },
  {
    id: 'h-003',
    codigo: 'H-2025-003',
    tipo: 'No Conformidad',
    gravedad: 'Mayor',
    titulo: 'Ausencia de verificación de inhabilidades',
    estado: 'Preliminar',
    tieneControversia: false,
    controvertido: false
  },
  {
    id: 'h-004',
    codigo: 'H-2025-004',
    tipo: 'Oportunidad de Mejora',
    gravedad: 'Menor',
    titulo: 'Optimización del proceso de selección',
    estado: 'Preliminar',
    tieneControversia: false,
    controvertido: false
  }
];

const MOCK_ETAPAS: EtapaComunicacion[] = [
  {
    id: 'ec-001',
    planIndividualId: 'plan-001',
    codigoAuditoria: 'AUD-2025-001',
    procesoAuditable: 'Gestión Contractual - Sede Principal',
    estado: 'En Controversia',
    fechaInicio: '2025-03-01',
    fechaInformePreliminar: '2025-03-05',
    fechaInicioControversia: '2025-03-08',
    responsableAuditoria: 'Carlos Martínez',
    equipoAuditor: ['Carlos Martínez', 'Ana García', 'Luis Rodríguez'],
    jefeAreaAuditada: 'María Pérez',
    areaAuditada: 'Oficina Jurídica',
    totalHallazgos: 4,
    hallazgosPreliminares: 2,
    hallazgosRatificados: 1,
    hallazgosModificados: 0,
    hallazgosControvertidos: 1,
    documentos: [
      {
        id: 'doc-001',
        tipo: 'Preliminar',
        nombre: 'Informe Preliminar AUD-2025-001.pdf',
        version: 'v1.0',
        fechaGeneracion: '2025-03-05',
        generadoPor: 'Carlos Martínez',
        estado: 'Enviado',
        tamano: '3.2 MB'
      }
    ],
    notificaciones: [
      {
        id: 'not-001',
        tipo: 'Informe Preliminar',
        destinatario: 'María Pérez',
        cargo: 'Jefe Oficina Jurídica',
        fechaEnvio: '2025-03-05',
        horaEnvio: '14:30',
        estado: 'Leída',
        asunto: 'Remisión Informe Preliminar de Auditoría AUD-2025-001'
      },
      {
        id: 'not-002',
        tipo: 'Solicitud Controversia',
        destinatario: 'Carlos Martínez',
        cargo: 'Jefe Oficina Control Interno',
        fechaEnvio: '2025-03-08',
        horaEnvio: '10:15',
        estado: 'Respondida',
        asunto: 'Solicitud de Controversia - Hallazgo H-2025-001'
      }
    ],
    diasTranscurridos: 12,
    progreso: 45,
    observaciones: 'En espera de cierre de controversia'
  },
  {
    id: 'ec-002',
    planIndividualId: 'plan-002',
    codigoAuditoria: 'AUD-2025-002',
    procesoAuditable: 'Gestión de Talento Humano',
    estado: 'Informe Final Generado',
    fechaInicio: '2025-02-15',
    fechaInformePreliminar: '2025-02-20',
    fechaInicioControversia: '2025-02-22',
    fechaCierreControversia: '2025-02-28',
    fechaInformeFinal: '2025-03-02',
    responsableAuditoria: 'Ana García',
    equipoAuditor: ['Ana García', 'Pedro López'],
    jefeAreaAuditada: 'Sandra Gómez',
    areaAuditada: 'Gestión Humana',
    totalHallazgos: 3,
    hallazgosPreliminares: 0,
    hallazgosRatificados: 2,
    hallazgosModificados: 1,
    hallazgosControvertidos: 0,
    documentos: [
      {
        id: 'doc-002',
        tipo: 'Preliminar',
        nombre: 'Informe Preliminar AUD-2025-002.pdf',
        version: 'v1.0',
        fechaGeneracion: '2025-02-20',
        generadoPor: 'Ana García',
        estado: 'Aprobado',
        tamano: '2.8 MB'
      },
      {
        id: 'doc-003',
        tipo: 'Final',
        nombre: 'Informe Final AUD-2025-002.pdf',
        version: 'v1.0',
        fechaGeneracion: '2025-03-02',
        generadoPor: 'Ana García',
        estado: 'Enviado',
        tamano: '3.5 MB'
      }
    ],
    notificaciones: [
      {
        id: 'not-003',
        tipo: 'Informe Final',
        destinatario: 'Sandra Gómez',
        cargo: 'Jefe Gestión Humana',
        fechaEnvio: '2025-03-02',
        horaEnvio: '16:00',
        estado: 'Leída',
        asunto: 'Remisión Informe Final de Auditoría AUD-2025-002'
      }
    ],
    diasTranscurridos: 16,
    progreso: 75,
    observaciones: 'En espera de plan de mejoramiento'
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function GestionEtapaComunicacion() {
  const [etapas, setEtapas] = useState<EtapaComunicacion[]>(MOCK_ETAPAS);
  const [etapaSeleccionada, setEtapaSeleccionada] = useState<EtapaComunicacion | null>(null);
  const [vistaActual, setVistaActual] = useState<'lista' | 'detalle'>('lista');
  const [subvistaDetalle, setSubvistaDetalle] = useState<'general' | 'hallazgos' | 'documentos' | 'notificaciones'>('general');
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  
  // Modales
  const [modalGenerarInforme, setModalGenerarInforme] = useState(false);
  const [modalEnviarNotificacion, setModalEnviarNotificacion] = useState(false);
  const [modalVisualizarDocumento, setModalVisualizarDocumento] = useState(false);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<Documento | null>(null);

  // Filtrado
  const etapasFiltradas = etapas.filter(etapa => {
    const coincideBusqueda = etapa.codigoAuditoria.toLowerCase().includes(busqueda.toLowerCase()) ||
                             etapa.procesoAuditable.toLowerCase().includes(busqueda.toLowerCase());
    const coincideEstado = filtroEstado === 'Todos' || etapa.estado === filtroEstado;
    return coincideBusqueda && coincideEstado;
  });

  const handleVerDetalle = (etapa: EtapaComunicacion) => {
    setEtapaSeleccionada(etapa);
    setVistaActual('detalle');
    setSubvistaDetalle('general');
  };

  const handleGenerarInforme = (etapaId: string, tipoInforme: TipoInforme) => {
    const fecha = new Date().toISOString().split('T')[0];
    const nuevoDocumento: Documento = {
      id: `doc-${Date.now()}`,
      tipo: tipoInforme,
      nombre: `Informe ${tipoInforme} ${etapaSeleccionada?.codigoAuditoria}.pdf`,
      version: 'v1.0',
      fechaGeneracion: fecha,
      generadoPor: 'Usuario Actual',
      estado: 'Borrador',
      tamano: '3.0 MB'
    };

    setEtapas(etapas.map(e =>
      e.id === etapaId
        ? {
            ...e,
            documentos: [...e.documentos, nuevoDocumento],
            estado: tipoInforme === 'Preliminar' 
              ? 'Informe Preliminar Generado' as const
              : tipoInforme === 'Final'
              ? 'Informe Final Generado' as const
              : 'Informe Ejecutivo Generado' as const,
            ...(tipoInforme === 'Preliminar' && { fechaInformePreliminar: fecha }),
            ...(tipoInforme === 'Final' && { fechaInformeFinal: fecha }),
            ...(tipoInforme === 'Ejecutivo' && { fechaInformeEjecutivo: fecha })
          }
        : e
    ));

    setModalGenerarInforme(false);
  };

  const handleEnviarNotificacion = (destinatario: string, tipo: any) => {
    if (!etapaSeleccionada) return;

    const nuevaNotificacion: Notificacion = {
      id: `not-${Date.now()}`,
      tipo: tipo,
      destinatario: destinatario,
      cargo: 'Responsable Área',
      fechaEnvio: new Date().toISOString().split('T')[0],
      horaEnvio: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      estado: 'Enviada',
      asunto: `Notificación - ${tipo}`
    };

    setEtapas(etapas.map(e =>
      e.id === etapaSeleccionada.id
        ? { ...e, notificaciones: [...e.notificaciones, nuevaNotificacion] }
        : e
    ));

    setModalEnviarNotificacion(false);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Gestión de Etapa de Comunicación
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            RF009 - Tercera etapa: Comunicación de resultados
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4 border-l-4" style={{ borderLeftColor: '#10B981' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Etapas</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{etapas.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#10B98115' }}>
              <Send className="w-6 h-6" style={{ color: '#10B981' }} />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4" style={{ borderLeftColor: '#3B82F6' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Informes Preliminares</p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {etapas.filter(e => e.documentos.some(d => d.tipo === 'Preliminar')).length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#3B82F615' }}>
              <FileText className="w-6 h-6" style={{ color: '#3B82F6' }} />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4" style={{ borderLeftColor: '#F59E0B' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">En Controversia</p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {etapas.filter(e => e.estado === 'En Controversia').length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#F59E0B15' }}>
              <MessageSquare className="w-6 h-6" style={{ color: '#F59E0B' }} />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4" style={{ borderLeftColor: '#10B981' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Informes Finales</p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {etapas.filter(e => e.documentos.some(d => d.tipo === 'Final')).length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#10B98115' }}>
              <FileCheck className="w-6 h-6" style={{ color: '#10B981' }} />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4" style={{ borderLeftColor: '#8B5CF6' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Notificaciones</p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {etapas.reduce((sum, e) => sum + e.notificaciones.length, 0)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#8B5CF615' }}>
              <Bell className="w-6 h-6" style={{ color: '#8B5CF6' }} />
            </div>
          </div>
        </Card>
      </div>

      {/* FILTROS */}
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="Todos">Todos los estados</option>
            <option value="No Iniciada">No Iniciada</option>
            <option value="Informe Preliminar Generado">Informe Preliminar</option>
            <option value="En Controversia">En Controversia</option>
            <option value="Informe Final Generado">Informe Final</option>
            <option value="Completada">Completada</option>
          </select>
        </div>
      </Card>

      {/* VISTAS */}
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
              <EtapaComunicacionCard
                key={etapa.id}
                etapa={etapa}
                onVerDetalle={handleVerDetalle}
                onGenerarInforme={(tipo) => {
                  setEtapaSeleccionada(etapa);
                  setModalGenerarInforme(true);
                }}
              />
            ))}

            {etapasFiltradas.length === 0 && (
              <Card className="p-12 text-center">
                <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No se encontraron etapas de comunicación</p>
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
              <EtapaComunicacionDetalleView
                etapa={etapaSeleccionada}
                subvista={subvistaDetalle}
                onCambiarSubvista={setSubvistaDetalle}
                onVolver={() => setVistaActual('lista')}
                onGenerarInforme={(tipo) => setModalGenerarInforme(true)}
                onEnviarNotificacion={() => setModalEnviarNotificacion(true)}
                onVisualizarDocumento={(doc) => {
                  setDocumentoSeleccionado(doc);
                  setModalVisualizarDocumento(true);
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: GENERAR INFORME */}
      <AnimatePresence>
        {modalGenerarInforme && etapaSeleccionada && (
          <ModalGenerarInforme
            etapa={etapaSeleccionada}
            onGenerar={(tipo) => handleGenerarInforme(etapaSeleccionada.id, tipo)}
            onCerrar={() => setModalGenerarInforme(false)}
          />
        )}
      </AnimatePresence>

      {/* MODAL: ENVIAR NOTIFICACIÓN */}
      <AnimatePresence>
        {modalEnviarNotificacion && etapaSeleccionada && (
          <ModalEnviarNotificacion
            etapa={etapaSeleccionada}
            onEnviar={handleEnviarNotificacion}
            onCerrar={() => setModalEnviarNotificacion(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ COMPONENTE: CARD DE ETAPA ============

interface EtapaComunicacionCardProps {
  etapa: EtapaComunicacion;
  onVerDetalle: (etapa: EtapaComunicacion) => void;
  onGenerarInforme: (tipo: TipoInforme) => void;
}

function EtapaComunicacionCard({ etapa, onVerDetalle, onGenerarInforme }: EtapaComunicacionCardProps) {
  const [expandida, setExpandida] = useState(false);

  const getEstadoColor = (estado: EstadoComunicacion) => {
    switch (estado) {
      case 'No Iniciada': return '#6B7280';
      case 'Informe Preliminar Generado': return '#3B82F6';
      case 'En Controversia': return '#F59E0B';
      case 'Controversia Resuelta': return '#8B5CF6';
      case 'Informe Final Generado': return '#10B981';
      case 'Plan Mejoramiento Recibido': return '#10B981';
      case 'Informe Ejecutivo Generado': return '#8B5CF6';
      case 'Completada': return '#10B981';
      default: return '#6B7280';
    }
  };

  const tieneInformePreliminar = etapa.documentos.some(d => d.tipo === 'Preliminar');
  const tieneInformeFinal = etapa.documentos.some(d => d.tipo === 'Final');
  const tieneInformeEjecutivo = etapa.documentos.some(d => d.tipo === 'Ejecutivo');

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-black text-gray-900">{etapa.codigoAuditoria}</h3>
              <Badge style={{ background: getEstadoColor(etapa.estado), color: '#FFFFFF' }}>
                {etapa.estado}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mt-1">{etapa.procesoAuditable}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {etapa.responsableAuditoria}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {etapa.areaAuditada}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {etapa.diasTranscurridos} días
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-600">Progreso de comunicación</span>
            <span className="font-bold text-gray-900">{etapa.progreso}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${etapa.progreso}%` }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full"
              style={{ background: etapa.progreso === 100 ? '#10B981' : '#3B82F6' }}
            />
          </div>
        </div>
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
              {/* Hallazgos */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 rounded-lg" style={{ background: '#F3F4F6' }}>
                  <p className="text-xs text-gray-600">Total</p>
                  <p className="text-lg font-black text-gray-900">{etapa.totalHallazgos}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: '#DBEAFE' }}>
                  <p className="text-xs text-gray-600">Preliminares</p>
                  <p className="text-lg font-black text-blue-900">{etapa.hallazgosPreliminares}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: '#FEF3C7' }}>
                  <p className="text-xs text-gray-600">Controversia</p>
                  <p className="text-lg font-black text-amber-900">{etapa.hallazgosControvertidos}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: '#D1FAE5' }}>
                  <p className="text-xs text-gray-600">Ratificados</p>
                  <p className="text-lg font-black text-green-900">{etapa.hallazgosRatificados}</p>
                </div>
              </div>

              {/* Documentos e Informes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={`p-3 rounded-lg border-2 ${tieneInformePreliminar ? 'border-blue-500 bg-blue-50' : 'border-dashed border-gray-300'}`}>
                  <div className="flex items-center gap-2">
                    <FileText className={`w-4 h-4 ${tieneInformePreliminar ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-xs font-bold text-gray-900">Inf. Preliminar</p>
                      <p className="text-xs text-gray-600">
                        {tieneInformePreliminar ? etapa.fechaInformePreliminar : 'Pendiente'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-3 rounded-lg border-2 ${tieneInformeFinal ? 'border-green-500 bg-green-50' : 'border-dashed border-gray-300'}`}>
                  <div className="flex items-center gap-2">
                    <FileCheck className={`w-4 h-4 ${tieneInformeFinal ? 'text-green-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-xs font-bold text-gray-900">Inf. Final</p>
                      <p className="text-xs text-gray-600">
                        {tieneInformeFinal ? etapa.fechaInformeFinal : 'Pendiente'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-3 rounded-lg border-2 ${tieneInformeEjecutivo ? 'border-purple-500 bg-purple-50' : 'border-dashed border-gray-300'}`}>
                  <div className="flex items-center gap-2">
                    <Award className={`w-4 h-4 ${tieneInformeEjecutivo ? 'text-purple-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-xs font-bold text-gray-900">Inf. Ejecutivo</p>
                      <p className="text-xs text-gray-600">
                        {tieneInformeEjecutivo ? etapa.fechaInformeEjecutivo : 'Pendiente'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button onClick={() => onVerDetalle(etapa)} variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalle
                </Button>
                {!tieneInformePreliminar && (
                  <Button
                    onClick={() => onGenerarInforme('Preliminar')}
                    size="sm"
                    style={{ background: '#3B82F6' }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Generar Preliminar
                  </Button>
                )}
                {tieneInformePreliminar && !tieneInformeFinal && etapa.hallazgosControvertidos === 0 && (
                  <Button
                    onClick={() => onGenerarInforme('Final')}
                    size="sm"
                    style={{ background: '#10B981' }}
                  >
                    <FileCheck className="w-4 h-4 mr-2" />
                    Generar Final
                  </Button>
                )}
                {tieneInformeFinal && !tieneInformeEjecutivo && (
                  <Button
                    onClick={() => onGenerarInforme('Ejecutivo')}
                    size="sm"
                    style={{ background: '#8B5CF6' }}
                  >
                    <Award className="w-4 h-4 mr-2" />
                    Generar Ejecutivo
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ============ VISTA: DETALLE (continuará en siguiente mensaje) ============

interface EtapaComunicacionDetalleViewProps {
  etapa: EtapaComunicacion;
  subvista: 'general' | 'hallazgos' | 'documentos' | 'notificaciones';
  onCambiarSubvista: (subvista: 'general' | 'hallazgos' | 'documentos' | 'notificaciones') => void;
  onVolver: () => void;
  onGenerarInforme: (tipo: TipoInforme) => void;
  onEnviarNotificacion: () => void;
  onVisualizarDocumento: (doc: Documento) => void;
}

function EtapaComunicacionDetalleView({
  etapa,
  subvista,
  onCambiarSubvista,
  onVolver,
  onGenerarInforme,
  onEnviarNotificacion,
  onVisualizarDocumento
}: EtapaComunicacionDetalleViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50">
        <Button onClick={onVolver} variant="ghost" size="sm" className="mb-4">
          <ChevronDown className="w-4 h-4 mr-2 rotate-90" />
          Volver a la lista
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-gray-900">{etapa.codigoAuditoria}</h2>
            <p className="text-gray-600 mt-1">{etapa.procesoAuditable}</p>
            <div className="flex items-center gap-3 mt-3">
              <Badge style={{ background: '#10B981', color: '#FFFFFF' }}>
                {etapa.estado}
              </Badge>
              <span className="text-sm text-gray-600">
                Responsable: {etapa.responsableAuditoria}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline de Fechas */}
        {etapa.fechaInicio && (
          <div className="mt-6 p-4 bg-white rounded-lg">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Timeline de la Etapa</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              {etapa.fechaInicio && (
                <div>
                  <p className="text-gray-600">Inicio</p>
                  <p className="font-bold text-gray-900">{etapa.fechaInicio}</p>
                </div>
              )}
              {etapa.fechaInformePreliminar && (
                <div>
                  <p className="text-gray-600">Inf. Preliminar</p>
                  <p className="font-bold text-gray-900">{etapa.fechaInformePreliminar}</p>
                </div>
              )}
              {etapa.fechaInformeFinal && (
                <div>
                  <p className="text-gray-600">Inf. Final</p>
                  <p className="font-bold text-gray-900">{etapa.fechaInformeFinal}</p>
                </div>
              )}
              {etapa.fechaInformeEjecutivo && (
                <div>
                  <p className="text-gray-600">Inf. Ejecutivo</p>
                  <p className="font-bold text-gray-900">{etapa.fechaInformeEjecutivo}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Pestañas */}
      <Card className="p-2">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => onCambiarSubvista('general')}
            variant={subvista === 'general' ? 'default' : 'ghost'}
            size="sm"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            General
          </Button>
          <Button
            onClick={() => onCambiarSubvista('hallazgos')}
            variant={subvista === 'hallazgos' ? 'default' : 'ghost'}
            size="sm"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Hallazgos ({etapa.totalHallazgos})
          </Button>
          <Button
            onClick={() => onCambiarSubvista('documentos')}
            variant={subvista === 'documentos' ? 'default' : 'ghost'}
            size="sm"
          >
            <FileText className="w-4 h-4 mr-2" />
            Documentos ({etapa.documentos.length})
          </Button>
          <Button
            onClick={() => onCambiarSubvista('notificaciones')}
            variant={subvista === 'notificaciones' ? 'default' : 'ghost'}
            size="sm"
          >
            <Bell className="w-4 h-4 mr-2" />
            Notificaciones ({etapa.notificaciones.length})
          </Button>
        </div>
      </Card>

      {/* Contenido */}
      <AnimatePresence mode="wait">
        {subvista === 'general' && (
          <ResumenGeneralView
            key="general"
            etapa={etapa}
            onGenerarInforme={onGenerarInforme}
          />
        )}
        {subvista === 'hallazgos' && (
          <HallazgosView key="hallazgos" etapa={etapa} />
        )}
        {subvista === 'documentos' && (
          <DocumentosView
            key="documentos"
            etapa={etapa}
            onVisualizar={onVisualizarDocumento}
            onGenerar={onGenerarInforme}
          />
        )}
        {subvista === 'notificaciones' && (
          <NotificacionesView
            key="notificaciones"
            etapa={etapa}
            onEnviar={onEnviarNotificacion}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ SUBVISTA: RESUMEN GENERAL ============

function ResumenGeneralView({ etapa, onGenerarInforme }: any) {
  const checklistItems = [
    {
      completado: etapa.documentos.some((d: Documento) => d.tipo === 'Preliminar'),
      titulo: 'Informe Preliminar Generado',
      descripcion: 'Generación automática con hallazgos preliminares',
      color: '#3B82F6'
    },
    {
      completado: etapa.hallazgosControvertidos === 0 && etapa.hallazgosPreliminares === 0,
      titulo: 'Controversias Resueltas',
      descripcion: 'Proceso de controversia completado',
      color: '#F59E0B'
    },
    {
      completado: etapa.documentos.some((d: Documento) => d.tipo === 'Final'),
      titulo: 'Informe Final Generado',
      descripcion: 'Informe con hallazgos definitivos',
      color: '#10B981'
    },
    {
      completado: etapa.fechaPlanMejoramiento !== undefined,
      titulo: 'Plan de Mejoramiento Recibido',
      descripcion: 'Área auditada remite plan de acción',
      color: '#8B5CF6'
    },
    {
      completado: etapa.documentos.some((d: Documento) => d.tipo === 'Ejecutivo'),
      titulo: 'Informe Ejecutivo Generado',
      descripcion: 'Resumen para Dirección ESAP',
      color: '#8B5CF6'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Checklist de Progreso */}
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">
          Progreso de la Etapa de Comunicación
        </h3>

        <div className="space-y-3">
          {checklistItems.map((item, index) => (
            <ActivityCheckItem
              key={index}
              completada={item.completado}
              titulo={item.titulo}
              descripcion={item.descripcion}
              color={item.color}
            />
          ))}
        </div>

        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-900">Progreso Global</span>
            <span className="text-sm font-bold text-gray-900">{etapa.progreso}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${etapa.progreso}%` }}
              className="h-full rounded-full bg-gradient-to-r from-green-500 to-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* Estadísticas de Hallazgos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-600">Total Hallazgos</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{etapa.totalHallazgos}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-600">Preliminares</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{etapa.hallazgosPreliminares}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-600">Controversia</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{etapa.hallazgosControvertidos}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-600">Ratificados</p>
          <p className="text-2xl font-black text-green-600 mt-1">{etapa.hallazgosRatificados}</p>
        </Card>
      </div>

      {/* Equipo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Equipo Auditor</h3>
          <div className="space-y-2">
            {etapa.equipoAuditor.map((miembro: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700">{miembro}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Área Auditada</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-orange-600" />
              <span className="text-gray-700">{etapa.areaAuditada}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-orange-600" />
              <span className="text-gray-700">{etapa.jefeAreaAuditada}</span>
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

// ============ SUBVISTA: HALLAZGOS ============

function HallazgosView({ etapa }: { etapa: EtapaComunicacion }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">
          Hallazgos de la Auditoría ({MOCK_HALLAZGOS.length})
        </h3>

        <div className="space-y-3">
          {MOCK_HALLAZGOS.map((hallazgo) => (
            <div
              key={hallazgo.id}
              className="p-4 rounded-lg border"
              style={{ background: '#F9FAFB' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="font-black">{hallazgo.codigo}</Badge>
                    <Badge style={{
                      background: hallazgo.tipo === 'No Conformidad' ? '#EF4444' :
                                 hallazgo.tipo === 'Observación' ? '#3B82F6' : '#10B981',
                      color: '#FFF'
                    }}>
                      {hallazgo.tipo}
                    </Badge>
                    <Badge style={{
                      background: hallazgo.gravedad === 'Crítico' ? '#EF4444' :
                                 hallazgo.gravedad === 'Mayor' ? '#F97316' : '#F59E0B',
                      color: '#FFF'
                    }}>
                      {hallazgo.gravedad}
                    </Badge>
                    <Badge style={{
                      background: hallazgo.estado === 'Preliminar' ? '#3B82F6' :
                                 hallazgo.estado === 'En Controversia' ? '#F59E0B' :
                                 hallazgo.estado === 'Ratificado' ? '#10B981' : '#8B5CF6',
                      color: '#FFF'
                    }}>
                      {hallazgo.estado}
                    </Badge>
                  </div>
                  <p className="font-bold text-gray-900">{hallazgo.titulo}</p>
                  {hallazgo.tieneControversia && (
                    <div className="mt-2 p-2 rounded" style={{ background: '#FEF3C7' }}>
                      <p className="text-xs text-amber-900">
                        <MessageSquare className="w-3 h-3 inline mr-1" />
                        Este hallazgo tiene proceso de controversia activo
                      </p>
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm">
                  <Eye className="w-3 h-3 mr-1" />
                  Ver
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

// ============ SUBVISTA: DOCUMENTOS ============

function DocumentosView({ etapa, onVisualizar, onGenerar }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-gray-900">
            Documentos e Informes ({etapa.documentos.length})
          </h3>
          <Button size="sm" style={{ background: '#10B981' }}>
            <Plus className="w-4 h-4 mr-2" />
            Generar Informe
          </Button>
        </div>

        <div className="space-y-3">
          {etapa.documentos.map((doc: Documento) => (
            <div
              key={doc.id}
              className="p-4 rounded-lg border flex items-center justify-between gap-4"
              style={{ background: '#F9FAFB' }}
            >
              <div className="flex items-center gap-3 flex-1">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{
                    background: doc.tipo === 'Preliminar' ? '#3B82F6' :
                               doc.tipo === 'Final' ? '#10B981' : '#8B5CF6'
                  }}
                >
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-gray-900">{doc.nombre}</p>
                    <Badge variant="outline">{doc.version}</Badge>
                    <Badge style={{
                      background: doc.estado === 'Enviado' ? '#10B981' :
                                 doc.estado === 'Aprobado' ? '#3B82F6' : '#6B7280',
                      color: '#FFF'
                    }}>
                      {doc.estado}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{doc.tamano}</span>
                    <span>Generado: {doc.fechaGeneracion}</span>
                    <span>Por {doc.generadoPor}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onVisualizar(doc)}>
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {etapa.documentos.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No hay documentos generados</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ============ SUBVISTA: NOTIFICACIONES ============

function NotificacionesView({ etapa, onEnviar }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-gray-900">
            Notificaciones Enviadas ({etapa.notificaciones.length})
          </h3>
          <Button onClick={onEnviar} size="sm" style={{ background: '#8B5CF6' }}>
            <Bell className="w-4 h-4 mr-2" />
            Nueva Notificación
          </Button>
        </div>

        <div className="space-y-3">
          {etapa.notificaciones.map((not: Notificacion) => (
            <div
              key={not.id}
              className="p-4 rounded-lg border"
              style={{ background: '#F9FAFB' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{not.tipo}</Badge>
                    <Badge style={{
                      background: not.estado === 'Enviada' ? '#3B82F6' :
                                 not.estado === 'Leída' ? '#F59E0B' : '#10B981',
                      color: '#FFF'
                    }}>
                      {not.estado}
                    </Badge>
                  </div>
                  <p className="font-bold text-gray-900 mb-1">{not.asunto}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {not.destinatario}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {not.fechaEnvio}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {not.horaEnvio}
                    </span>
                  </div>
                </div>
                <Mail className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          ))}

          {etapa.notificaciones.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No hay notificaciones enviadas</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ============ COMPONENTE AUXILIAR ============

function ActivityCheckItem({ completada, titulo, descripcion, color }: any) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${completada ? 'bg-green-50' : 'bg-gray-50'}`}>
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: completada ? '#10B981' : color + '15' }}
      >
        {completada ? (
          <CheckCircle2 className="w-5 h-5 text-white" />
        ) : (
          <Clock className="w-5 h-5" style={{ color }} />
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-gray-900">{titulo}</p>
        <p className="text-xs text-gray-600">{descripcion}</p>
      </div>
      {completada && <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />}
    </div>
  );
}

// ============ MODALES ============

function ModalGenerarInforme({ etapa, onGenerar, onCerrar }: any) {
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoInforme>('Preliminar');

  return (
    <Modal titulo="Generar Informe de Auditoría" onCerrar={onCerrar}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Seleccione el tipo de informe a generar para la auditoría <strong>{etapa.codigoAuditoria}</strong>.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => setTipoSeleccionado('Preliminar')}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
              tipoSeleccionado === 'Preliminar' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-bold text-gray-900">Informe Preliminar</p>
                <p className="text-xs text-gray-600">Incluye hallazgos preliminares para controversia</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setTipoSeleccionado('Final')}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
              tipoSeleccionado === 'Final' 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-200 hover:border-green-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileCheck className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-bold text-gray-900">Informe Final</p>
                <p className="text-xs text-gray-600">Hallazgos definitivos después de controversia</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setTipoSeleccionado('Ejecutivo')}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
              tipoSeleccionado === 'Ejecutivo' 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-gray-200 hover:border-purple-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Award className="w-6 h-6 text-purple-600" />
              <div>
                <p className="font-bold text-gray-900">Informe Ejecutivo</p>
                <p className="text-xs text-gray-600">Resumen para Dirección ESAP</p>
              </div>
            </div>
          </button>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={onCerrar} variant="outline" className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={() => onGenerar(tipoSeleccionado)}
            className="flex-1"
            style={{ background: '#10B981' }}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generar Informe
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ModalEnviarNotificacion({ etapa, onEnviar, onCerrar }: any) {
  const [destinatario, setDestinatario] = useState(etapa.jefeAreaAuditada);
  const [tipo, setTipo] = useState<any>('Informe Preliminar');

  return (
    <Modal titulo="Enviar Notificación" onCerrar={onCerrar}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Destinatario
          </label>
          <input
            type="text"
            value={destinatario}
            onChange={(e) => setDestinatario(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Tipo de Notificación
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="Informe Preliminar">Informe Preliminar</option>
            <option value="Informe Final">Informe Final</option>
            <option value="Solicitud Plan">Solicitud Plan de Mejoramiento</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={onCerrar} variant="outline" className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={() => onEnviar(destinatario, tipo)}
            className="flex-1"
            style={{ background: '#8B5CF6' }}
          >
            <Send className="w-4 h-4 mr-2" />
            Enviar Notificación
          </Button>
        </div>
      </div>
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
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
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