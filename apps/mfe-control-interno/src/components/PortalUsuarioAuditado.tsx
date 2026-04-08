/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PORTAL DEL USUARIO AUDITADO - CONTROL INTERNO DE GESTIÓN
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Vista del Portal Transaccional para usuarios que están siendo auditados.
 * Permite a administrativos y docentes:
 * - Ver sus procesos/auditorías activas
 * - Consultar el estado de cada auditoría
 * - Adjuntar documentos, pruebas y evidencias
 * - Responder a hallazgos
 * - Ver notificaciones y requerimientos
 * - Interactuar con el equipo auditor
 * 
 * USUARIO ASIGNADO: funcionario@esap.edu.co
 * 
 * VERSIÓN: 1.0
 * FECHA: 4 Enero 2026
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderOpen, Clock, AlertCircle, CheckCircle2, FileText,
  Upload, Eye, MessageSquare, Calendar, User, Download,
  Bell, Search, Filter, ChevronRight, Paperclip, Send,
  Info, TrendingUp, Shield, ClipboardList
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { TooltipGuia } from './TooltipGuia';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

interface AuditoriaUsuario {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  estado: 'Notificada' | 'En Respuesta' | 'Revisión' | 'Finalizada';
  fechaNotificacion: string;
  fechaLimiteRespuesta: string;
  diasRestantes: number;
  auditorLider: string;
  area: string;
  hallazgos: number;
  documentosSolicitados: number;
  documentosSubidos: number;
  descripcion: string;
  urgencia: 'alta' | 'media' | 'baja';
}

interface Documento {
  id: string;
  nombre: string;
  tipo: string;
  fechaSubida: string;
  tamano: string;
  estado: 'Aprobado' | 'Pendiente' | 'Rechazado';
}

interface Mensaje {
  id: string;
  remitente: string;
  rol: 'auditor' | 'auditado';
  mensaje: string;
  fecha: string;
  leido: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// DATOS MOCK
// ════════════════════════════════════════════════════════════════════════════

const AUDITORIAS_MOCK: AuditoriaUsuario[] = [
  {
    id: 'aud-001',
    codigo: 'AUD-2025-004',
    titulo: 'Auditoría de Gestión Administrativa - Territorial Antioquia',
    tipo: 'Gestión',
    estado: 'En Respuesta',
    fechaNotificacion: '15/12/2024',
    fechaLimiteRespuesta: '15/01/2025',
    diasRestantes: 11,
    auditorLider: 'Carlos Méndez Rivera',
    area: 'Gestión Administrativa',
    hallazgos: 3,
    documentosSolicitados: 8,
    documentosSubidos: 5,
    descripcion: 'Evaluación de procesos administrativos y de gestión documental en la territorial.',
    urgencia: 'alta'
  },
  {
    id: 'aud-002',
    codigo: 'AUD-2024-018',
    titulo: 'Auditoría de Cumplimiento Normativo - Contratación',
    tipo: 'Cumplimiento',
    estado: 'Revisión',
    fechaNotificacion: '01/11/2024',
    fechaLimiteRespuesta: '01/12/2024',
    diasRestantes: 0,
    auditorLider: 'María González Torres',
    area: 'Contratación',
    hallazgos: 2,
    documentosSolicitados: 12,
    documentosSubidos: 12,
    descripcion: 'Verificación del cumplimiento de normas en procesos de contratación.',
    urgencia: 'media'
  },
  {
    id: 'aud-003',
    codigo: 'AUD-2024-012',
    titulo: 'Auditoría de Control Interno - Gestión Financiera',
    tipo: 'Control Interno',
    estado: 'Finalizada',
    fechaNotificacion: '15/09/2024',
    fechaLimiteRespuesta: '15/10/2024',
    diasRestantes: -81,
    auditorLider: 'Pedro Ruiz Vargas',
    area: 'Gestión Financiera',
    hallazgos: 1,
    documentosSolicitados: 15,
    documentosSubidos: 15,
    descripcion: 'Evaluación de controles internos en procesos financieros y presupuestales.',
    urgencia: 'baja'
  }
];

const DOCUMENTOS_MOCK: Record<string, Documento[]> = {
  'aud-001': [
    {
      id: 'doc-001',
      nombre: 'Manual de Procedimientos Actualizado.pdf',
      tipo: 'PDF',
      fechaSubida: '18/12/2024',
      tamano: '2.3 MB',
      estado: 'Aprobado'
    },
    {
      id: 'doc-002',
      nombre: 'Acta Comité de Gestión - Nov 2024.pdf',
      tipo: 'PDF',
      fechaSubida: '20/12/2024',
      tamano: '850 KB',
      estado: 'Pendiente'
    },
    {
      id: 'doc-003',
      nombre: 'Registro de Capacitaciones.xlsx',
      tipo: 'Excel',
      fechaSubida: '22/12/2024',
      tamano: '1.1 MB',
      estado: 'Aprobado'
    }
  ]
};

const MENSAJES_MOCK: Record<string, Mensaje[]> = {
  'aud-001': [
    {
      id: 'msg-001',
      remitente: 'Carlos Méndez Rivera',
      rol: 'auditor',
      mensaje: 'Buenos días, se requiere adjuntar el manual de procedimientos actualizado con las firmas de aprobación.',
      fecha: '17/12/2024 09:30',
      leido: true
    },
    {
      id: 'msg-002',
      remitente: 'Yo',
      rol: 'auditado',
      mensaje: 'Adjunto el manual solicitado. Las firmas están en la última página.',
      fecha: '18/12/2024 14:15',
      leido: true
    },
    {
      id: 'msg-003',
      remitente: 'Carlos Méndez Rivera',
      rol: 'auditor',
      mensaje: 'Recibido. Por favor incluir también las actas del comité de gestión de los últimos 3 meses.',
      fecha: '19/12/2024 11:20',
      leido: false
    }
  ]
};

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE TOOLTIPS
// ════════════════════════════════════════════════════════════════════════════

const TOOLTIP_PORTAL_AUDITADO = {
  titulo: 'Portal del Usuario Auditado',
  descripcion: 'Gestiona tus auditorías y responde a los requerimientos del equipo de Control Interno',
  pasos: [
    'Consulta las auditorías en las que estás involucrado y su estado actual',
    'Revisa los hallazgos identificados y las observaciones del auditor',
    'Adjunta los documentos, pruebas y evidencias solicitadas',
    'Responde a los mensajes y aclaraciones del equipo auditor',
    'Monitorea las fechas límite para evitar retrasos en el proceso'
  ],
  tips: [
    'Responde antes de la fecha límite para evitar sanciones o observaciones',
    'Adjunta evidencias claras y organizadas para facilitar la revisión',
    'Usa la sección de mensajes para aclarar dudas con el auditor',
    'Descarga el informe final cuando la auditoría esté cerrada'
  ]
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

interface PortalUsuarioAuditadoProps {
  onVolver: () => void; // Función para volver al portal principal
}

export function PortalUsuarioAuditado({ onVolver }: PortalUsuarioAuditadoProps) {
  const [auditorias] = useState<AuditoriaUsuario[]>(AUDITORIAS_MOCK);
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState<AuditoriaUsuario | null>(null);
  const [vistaActual, setVistaActual] = useState<'lista' | 'detalle'>('lista');
  const [filtroEstado, setFiltroEstado] = useState<string>('Todas');
  const [busqueda, setBusqueda] = useState('');

  const auditoriasFiltradas = auditorias.filter(aud => {
    const matchEstado = filtroEstado === 'Todas' || aud.estado === filtroEstado;
    const matchBusqueda = aud.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
                          aud.titulo.toLowerCase().includes(busqueda.toLowerCase());
    return matchEstado && matchBusqueda;
  });

  const handleVerDetalle = (auditoria: AuditoriaUsuario) => {
    setAuditoriaSeleccionada(auditoria);
    setVistaActual('detalle');
  };

  const handleVolverLista = () => {
    setVistaActual('lista');
    setAuditoriaSeleccionada(null);
  };

  if (vistaActual === 'detalle' && auditoriaSeleccionada) {
    return (
      <DetalleAuditoria 
        auditoria={auditoriaSeleccionada}
        onVolver={handleVolverLista}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Botón Volver - Si viene del portal principal */}
          {onVolver && (
            <motion.button
              onClick={onVolver}
              className="inline-flex items-center gap-2 px-4 py-2.5 mb-4 bg-white border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-[#2962FF] hover:text-[#2962FF] font-semibold transition-all shadow-sm hover:shadow-md group"
              whileHover={{ scale: 1.02, x: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg 
                className="w-5 h-5 group-hover:-translate-x-1 transition-transform" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al Dashboard
            </motion.button>
          )}
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #1e5da8 0%, #2a6dbd 100%)' }}
                >
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Mis Auditorías
                  </h1>
                  <p className="text-sm text-gray-600">
                    Portal del Usuario Auditado - Control Interno de Gestión
                  </p>
                </div>
              </div>
            </div>
            <TooltipGuia {...TOOLTIP_PORTAL_AUDITADO} />
          </div>

          {/* ESTADÍSTICAS RÁPIDAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <Card className="p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Auditorías Activas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {auditorias.filter(a => a.estado !== 'Finalizada').length}
                  </p>
                </div>
                <FolderOpen className="w-8 h-8 text-blue-500" />
              </div>
            </Card>

            <Card className="p-4 border-l-4 border-amber-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Pendientes de Respuesta</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {auditorias.filter(a => a.estado === 'En Respuesta').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
            </Card>

            <Card className="p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Finalizadas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {auditorias.filter(a => a.estado === 'Finalizada').length}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por código o título de auditoría..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todas">Todas las auditorías</option>
              <option value="Notificada">Notificadas</option>
              <option value="En Respuesta">En Respuesta</option>
              <option value="Revisión">En Revisión</option>
              <option value="Finalizada">Finalizadas</option>
            </select>
          </div>
        </Card>

        {/* LISTADO DE AUDITORÍAS */}
        <div className="space-y-4">
          {auditoriasFiltradas.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No se encontraron auditorías
                </h3>
                <p className="text-sm text-gray-600">
                  No hay auditorías que coincidan con los filtros seleccionados
                </p>
              </div>
            </Card>
          ) : (
            auditoriasFiltradas.map((auditoria) => (
              <TarjetaAuditoria
                key={auditoria.id}
                auditoria={auditoria}
                onVerDetalle={handleVerDetalle}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: TARJETA DE AUDITORÍA
// ════════════════════════════════════════════════════════════════════════════

interface TarjetaAuditoriaProps {
  auditoria: AuditoriaUsuario;
  onVerDetalle: (auditoria: AuditoriaUsuario) => void;
}

function TarjetaAuditoria({ auditoria, onVerDetalle }: TarjetaAuditoriaProps) {
  const estadoBadge = {
    'Notificada': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    'En Respuesta': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
    'Revisión': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
    'Finalizada': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' }
  };

  const urgenciaColor = {
    'alta': '#EF4444',
    'media': '#F59E0B',
    'baja': '#10B981'
  };

  const esUrgente = auditoria.diasRestantes > 0 && auditoria.diasRestantes <= 5;
  const esVencida = auditoria.diasRestantes < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="p-6 hover:shadow-lg transition-all cursor-pointer border-l-4"
        style={{ borderLeftColor: urgenciaColor[auditoria.urgencia] }}
        onClick={() => onVerDetalle(auditoria)}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* INFO PRINCIPAL */}
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-mono text-gray-600">{auditoria.codigo}</span>
                  <Badge className={`${estadoBadge[auditoria.estado].bg} ${estadoBadge[auditoria.estado].text} border ${estadoBadge[auditoria.estado].border}`}>
                    {auditoria.estado}
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {auditoria.titulo}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {auditoria.descripcion}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4" />
                <span>Auditor: {auditoria.auditorLider}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <ClipboardList className="w-4 h-4" />
                <span>Área: {auditoria.area}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Notificación: {auditoria.fechaNotificacion}</span>
              </div>
            </div>

            {/* PROGRESO DE DOCUMENTOS */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Documentos: {auditoria.documentosSubidos}/{auditoria.documentosSolicitados}
                </span>
              </div>
              <div className="flex-1 max-w-xs">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(auditoria.documentosSubidos / auditoria.documentosSolicitados) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* FECHA LÍMITE Y ACCIONES */}
          <div className="flex flex-col items-end gap-3 lg:w-64">
            {auditoria.estado !== 'Finalizada' && (
              <div className={`text-center p-3 rounded-lg ${
                esVencida ? 'bg-red-50 border border-red-200' :
                esUrgente ? 'bg-amber-50 border border-amber-200' :
                'bg-gray-50 border border-gray-200'
              }`}>
                <p className="text-xs text-gray-600 mb-1">Fecha límite</p>
                <p className="font-bold text-sm text-gray-900">{auditoria.fechaLimiteRespuesta}</p>
                {!esVencida && (
                  <p className={`text-xs mt-1 ${
                    esUrgente ? 'text-amber-700 font-semibold' : 'text-gray-600'
                  }`}>
                    {auditoria.diasRestantes} días restantes
                  </p>
                )}
                {esVencida && (
                  <p className="text-xs text-red-700 font-semibold mt-1">
                    Vencida hace {Math.abs(auditoria.diasRestantes)} días
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() => onVerDetalle(auditoria)}
              className="w-full px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>Ver Detalle</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: DETALLE DE AUDITORÍA
// ════════════════════════════════════════════════════════════════════════════

interface DetalleAuditoriaProps {
  auditoria: AuditoriaUsuario;
  onVolver: () => void;
}

function DetalleAuditoria({ auditoria, onVolver }: DetalleAuditoriaProps) {
  const [tabActiva, setTabActiva] = useState<'documentos' | 'hallazgos'>('documentos');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);

  const documentos = DOCUMENTOS_MOCK[auditoria.id] || [];

  const handleSubirDocumento = () => {
    if (!archivoSeleccionado) {
      toast.error('Selecciona un archivo primero');
      return;
    }

    toast.success('Documento subido correctamente', {
      description: `${archivoSeleccionado.name} se ha cargado exitosamente`
    });
    setArchivoSeleccionado(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={onVolver}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span className="text-sm font-medium">Volver a Mis Auditorías</span>
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-mono text-gray-600">{auditoria.codigo}</span>
                <Badge className={
                  auditoria.estado === 'Notificada' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                  auditoria.estado === 'En Respuesta' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                  auditoria.estado === 'Revisión' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                  'bg-green-100 text-green-800 border border-green-200'
                }>
                  {auditoria.estado}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {auditoria.titulo}
              </h1>
              <p className="text-sm text-gray-600">
                {auditoria.descripcion}
              </p>
            </div>
          </div>

          {/* INFO RÁPIDA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-600">Auditor Líder</p>
                <p className="text-sm font-medium text-gray-900">{auditoria.auditorLider}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-600">Fecha Límite</p>
                <p className="text-sm font-medium text-gray-900">{auditoria.fechaLimiteRespuesta}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-600">Hallazgos</p>
                <p className="text-sm font-medium text-gray-900">{auditoria.hallazgos}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-600">Documentos</p>
                <p className="text-sm font-medium text-gray-900">
                  {auditoria.documentosSubidos}/{auditoria.documentosSolicitados}
                </p>
              </div>
            </div>
          </div>

          {/* TABS */}
          <div className="flex gap-1 mt-6 border-b border-gray-200">
            <button
              onClick={() => setTabActiva('documentos')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tabActiva === 'documentos'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Documentos ({documentos.length})
            </button>
            <button
              onClick={() => setTabActiva('hallazgos')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tabActiva === 'hallazgos'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Hallazgos ({auditoria.hallazgos})
            </button>
          </div>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {tabActiva === 'documentos' && (
          <TabDocumentos 
            documentos={documentos}
            archivoSeleccionado={archivoSeleccionado}
            setArchivoSeleccionado={setArchivoSeleccionado}
            onSubir={handleSubirDocumento}
          />
        )}

        {tabActiva === 'hallazgos' && (
          <TabHallazgos auditoria={auditoria} />
        )}
      </div>
    </div>
  );
}

// TABS COMPONENTS

function TabDocumentos({ 
  documentos, 
  archivoSeleccionado, 
  setArchivoSeleccionado, 
  onSubir 
}: {
  documentos: Documento[];
  archivoSeleccionado: File | null;
  setArchivoSeleccionado: (file: File | null) => void;
  onSubir: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* SUBIR DOCUMENTO */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subir Nuevo Documento</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block w-full">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">
                  {archivoSeleccionado ? archivoSeleccionado.name : 'Arrastra o haz clic para seleccionar archivo'}
                </p>
                <p className="text-xs text-gray-500">PDF, Word, Excel, Imagen (máx. 10MB)</p>
              </div>
              <input
                type="file"
                className="hidden"
                onChange={(e) => setArchivoSeleccionado(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              />
            </label>
          </div>
          <button
            onClick={onSubir}
            disabled={!archivoSeleccionado}
            className="px-6 py-3 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
          >
            <Upload className="w-4 h-4" />
            Subir Documento
          </button>
        </div>
      </Card>

      {/* LISTA DE DOCUMENTOS */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Documentos Subidos</h3>
        <div className="space-y-3">
          {documentos.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">{doc.nombre}</p>
                  <p className="text-xs text-gray-600">
                    {doc.tipo} • {doc.tamano} • Subido el {doc.fechaSubida}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={
                  doc.estado === 'Aprobado' ? 'bg-green-100 text-green-800 border border-green-200' :
                  doc.estado === 'Rechazado' ? 'bg-red-100 text-red-800 border border-red-200' :
                  'bg-gray-100 text-gray-800 border border-gray-200'
                }>
                  {doc.estado}
                </Badge>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TabHallazgos({ auditoria }: { auditoria: AuditoriaUsuario }) {
  const hallazgosMock = [
    {
      id: 'h-001',
      titulo: 'Falta de documentación del proceso de archivo',
      gravedad: 'MODERADO',
      descripcion: 'No se encontró evidencia de procedimiento documentado para el manejo de archivo de gestión.',
      accionSugerida: 'Elaborar y socializar manual de procedimientos de archivo.'
    },
    {
      id: 'h-002',
      titulo: 'Desactualización del inventario documental',
      gravedad: 'LEVE',
      descripcion: 'El inventario documental tiene fecha de actualización superior a 12 meses.',
      accionSugerida: 'Actualizar inventario documental y establecer periodicidad de actualización.'
    }
  ];

  return (
    <div className="space-y-4">
      {hallazgosMock.map((hallazgo) => (
        <Card key={hallazgo.id} className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge className={
                  hallazgo.gravedad === 'GRAVE' ? 'bg-red-100 text-red-800 border border-red-200' :
                  hallazgo.gravedad === 'MODERADO' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                  'bg-yellow-100 text-yellow-800 border border-yellow-200'
                }>
                  {hallazgo.gravedad}
                </Badge>
                <span className="text-xs text-gray-600">{hallazgo.id}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{hallazgo.titulo}</h3>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Descripción:</p>
              <p className="text-sm text-gray-700">{hallazgo.descripcion}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Acción Sugerida:</p>
              <p className="text-sm text-blue-700">{hallazgo.accionSugerida}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}