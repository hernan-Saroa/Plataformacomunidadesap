/**
 * RF005 - GESTIÓN DE ETAPA DE PLANEACIÓN
 * Integración Fase 2 COMPLETA: Vinculación con auditorías activas, generación y guardado automático
 * Primera etapa del proceso de auditoría
 * Oficina de Control Interno - ESAP
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Send, CheckCircle2, Clock, AlertTriangle, Calendar,
  FileCheck, Upload, Download, Eye, Edit, Trash2, Plus,
  Mail, User, Building2, ClipboardList, FileSignature, 
  Search, Filter, ChevronDown, ChevronUp, PlayCircle,
  CheckSquare, XCircle, Archive
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';
import { useControlInterno } from './ControlInternoContext';
import { useIntegracionControlInterno } from '../../../hooks/useIntegracionControlInterno';
import { toast } from 'sonner';

// ============ TIPOS ============

interface DocumentoPlaneacion {
  id: string;
  tipo: 'oficio-anuncio' | 'carta-representacion' | 'carta-compromiso' | 'programa-individual' | 'solicitud-informacion' | 'presentacion-proceso';
  nombre: string;
  fechaGeneracion: string;
  estado: 'Borrador' | 'Generado' | 'Enviado' | 'Respondido';
  generadoPor: string;
  archivo?: string;
  fechaEnvio?: string;
  fechaRespuesta?: string;
  observaciones?: string;
}

interface EtapaPlaneacion {
  id: string;
  planIndividualId: string;
  codigoAuditoria: string;
  procesoAuditable: string;
  estado: 'No Iniciada' | 'En Proceso' | 'Completada' | 'Vencida';
  fechaInicio?: string;
  fechaFin?: string;
  diasRestantes?: number;
  documentos: DocumentoPlaneacion[];
  progreso: number; // 0-100
  responsable: string;
  observaciones: string;
}

// ============ DATOS MOCK ============

const MOCK_ETAPAS: EtapaPlaneacion[] = [
  {
    id: 'ep-001',
    planIndividualId: 'plan-001',
    codigoAuditoria: 'AUD-2025-001',
    procesoAuditable: 'Gestión Contractual - Sede Principal',
    estado: 'En Proceso',
    fechaInicio: '2025-01-15',
    fechaFin: '2025-02-15',
    diasRestantes: 25,
    progreso: 60,
    responsable: 'Carlos Martínez',
    observaciones: 'Se han generado los documentos iniciales',
    documentos: [
      {
        id: 'doc-001',
        tipo: 'oficio-anuncio',
        nombre: 'Oficio de Anuncio de Auditoría',
        fechaGeneracion: '2025-01-15',
        estado: 'Enviado',
        generadoPor: 'Carlos Martínez',
        fechaEnvio: '2025-01-15'
      },
      {
        id: 'doc-002',
        tipo: 'carta-representacion',
        nombre: 'Carta de Representación',
        fechaGeneracion: '2025-01-16',
        estado: 'Enviado',
        generadoPor: 'Carlos Martínez',
        fechaEnvio: '2025-01-16'
      },
      {
        id: 'doc-003',
        tipo: 'carta-compromiso',
        nombre: 'Carta de Compromiso',
        fechaGeneracion: '2025-01-18',
        estado: 'Respondido',
        generadoPor: 'Carlos Martínez',
        fechaEnvio: '2025-01-18',
        fechaRespuesta: '2025-01-20'
      }
    ]
  },
  {
    id: 'ep-002',
    planIndividualId: 'plan-002',
    codigoAuditoria: 'AUD-2025-002',
    procesoAuditable: 'Gestión de Talento Humano',
    estado: 'No Iniciada',
    progreso: 0,
    responsable: 'Ana García',
    observaciones: '',
    documentos: []
  }
];

const TIPOS_DOCUMENTO = [
  {
    tipo: 'oficio-anuncio',
    nombre: 'Oficio de Anuncio',
    descripcion: 'Notificación formal del inicio de la auditoría',
    icono: Mail,
    color: '#3B82F6',
    obligatorio: true
  },
  {
    tipo: 'carta-representacion',
    nombre: 'Carta de Representación',
    descripcion: 'Solicitud de información al área auditada',
    icono: FileSignature,
    color: '#F97316',
    obligatorio: true
  },
  {
    tipo: 'carta-compromiso',
    nombre: 'Carta de Compromiso',
    descripcion: 'Compromiso del área auditada con el proceso',
    icono: FileCheck,
    color: '#10B981',
    obligatorio: true
  },
  {
    tipo: 'programa-individual',
    nombre: 'Programa Individual',
    descripcion: 'Detalle del programa de trabajo de la auditoría',
    icono: ClipboardList,
    color: '#8B5CF6',
    obligatorio: true
  },
  {
    tipo: 'solicitud-informacion',
    nombre: 'Solicitud de Información',
    descripcion: 'Requerimiento específico de información',
    icono: FileText,
    color: '#F59E0B',
    obligatorio: false
  },
  {
    tipo: 'presentacion-proceso',
    nombre: 'Presentación del Proceso',
    descripcion: 'Material de presentación de la auditoría',
    icono: Upload,
    color: '#EC4899',
    obligatorio: false
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function GestionEtapaPlaneacion() {
  const [etapasPlaneacion, setEtapasPlaneacion] = useState<EtapaPlaneacion[]>(MOCK_ETAPAS);
  const [etapaSeleccionada, setEtapaSeleccionada] = useState<EtapaPlaneacion | null>(null);
  const [vistaActual, setVistaActual] = useState<'lista' | 'detalle'>('lista');
  const [filtroEstado, setFiltroEstado] = useState<string>('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [modalGenerarDocumento, setModalGenerarDocumento] = useState(false);
  const [documentoAGenerar, setDocumentoAGenerar] = useState<any>(null);

  // Filtros
  const etapasFiltradas = etapasPlaneacion.filter(etapa => {
    const coincideBusqueda = etapa.codigoAuditoria.toLowerCase().includes(busqueda.toLowerCase()) ||
                             etapa.procesoAuditable.toLowerCase().includes(busqueda.toLowerCase());
    const coincideEstado = filtroEstado === 'Todos' || etapa.estado === filtroEstado;
    return coincideBusqueda && coincideEstado;
  });

  // Handlers
  const handleIniciarEtapa = (etapa: EtapaPlaneacion) => {
    const fechaInicio = new Date().toISOString().split('T')[0];
    const fechaFin = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    setEtapasPlaneacion(etapas =>
      etapas.map(e =>
        e.id === etapa.id
          ? { ...e, estado: 'En Proceso' as const, fechaInicio, fechaFin, diasRestantes: 30 }
          : e
      )
    );
  };

  const handleGenerarDocumento = (etapa: EtapaPlaneacion, tipoDoc: any) => {
    setEtapaSeleccionada(etapa);
    setDocumentoAGenerar(tipoDoc);
    setModalGenerarDocumento(true);
  };

  const confirmarGenerarDocumento = () => {
    if (!etapaSeleccionada || !documentoAGenerar) return;

    const nuevoDocumento: DocumentoPlaneacion = {
      id: `doc-${Date.now()}`,
      tipo: documentoAGenerar.tipo,
      nombre: documentoAGenerar.nombre,
      fechaGeneracion: new Date().toISOString().split('T')[0],
      estado: 'Generado',
      generadoPor: 'Usuario Actual'
    };

    setEtapasPlaneacion(etapas =>
      etapas.map(e =>
        e.id === etapaSeleccionada.id
          ? {
              ...e,
              documentos: [...e.documentos, nuevoDocumento],
              progreso: Math.min(100, e.progreso + 15)
            }
          : e
      )
    );

    setModalGenerarDocumento(false);
    setDocumentoAGenerar(null);
  };

  const handleEnviarDocumento = (etapaId: string, docId: string) => {
    setEtapasPlaneacion(etapas =>
      etapas.map(e =>
        e.id === etapaId
          ? {
              ...e,
              documentos: e.documentos.map(d =>
                d.id === docId
                  ? { ...d, estado: 'Enviado' as const, fechaEnvio: new Date().toISOString().split('T')[0] }
                  : d
              )
            }
          : e
      )
    );
  };

  const handleVerDetalle = (etapa: EtapaPlaneacion) => {
    setEtapaSeleccionada(etapa);
    setVistaActual('detalle');
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Gestión de Etapa de Planeación
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            RF005 - Primera etapa del proceso de auditoría
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
              <p className="text-2xl font-black text-gray-900 mt-1">
                {etapasPlaneacion.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#3B82F615' }}>
              <ClipboardList className="w-6 h-6" style={{ color: '#3B82F6' }} />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4" style={{ borderLeftColor: '#10B981' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">En Proceso</p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {etapasPlaneacion.filter(e => e.estado === 'En Proceso').length}
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
              <p className="text-xs text-gray-600">Completadas</p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {etapasPlaneacion.filter(e => e.estado === 'Completada').length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#F9731615' }}>
              <CheckCircle2 className="w-6 h-6" style={{ color: '#F97316' }} />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4" style={{ borderLeftColor: '#EF4444' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Con Alertas</p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {etapasPlaneacion.filter(e => e.diasRestantes && e.diasRestantes < 7).length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#EF444415' }}>
              <AlertTriangle className="w-6 h-6" style={{ color: '#EF4444' }} />
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

          <div className="flex gap-2">
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
              <EtapaCard
                key={etapa.id}
                etapa={etapa}
                onIniciar={handleIniciarEtapa}
                onVerDetalle={handleVerDetalle}
                onGenerarDocumento={handleGenerarDocumento}
                onEnviarDocumento={handleEnviarDocumento}
              />
            ))}

            {etapasFiltradas.length === 0 && (
              <Card className="p-12 text-center">
                <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No se encontraron etapas de planeación</p>
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
              <EtapaDetalleView
                etapa={etapaSeleccionada}
                onVolver={() => setVistaActual('lista')}
                onGenerarDocumento={handleGenerarDocumento}
                onEnviarDocumento={handleEnviarDocumento}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL GENERAR DOCUMENTO */}
      <AnimatePresence>
        {modalGenerarDocumento && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setModalGenerarDocumento(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6"
            >
              <h3 className="text-lg font-black text-gray-900 mb-4">
                Generar Documento
              </h3>

              {documentoAGenerar && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg" style={{ background: `${documentoAGenerar.color}15` }}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: documentoAGenerar.color }}>
                        <documentoAGenerar.icono className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900">{documentoAGenerar.nombre}</h4>
                        <p className="text-sm text-gray-600 mt-1">{documentoAGenerar.descripcion}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Auditoría
                      </label>
                      <p className="text-sm text-gray-900">
                        {etapaSeleccionada?.codigoAuditoria} - {etapaSeleccionada?.procesoAuditable}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Fecha de Generación
                      </label>
                      <p className="text-sm text-gray-900">
                        {new Date().toLocaleDateString('es-CO', { dateStyle: 'long' })}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Observaciones
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="Observaciones adicionales (opcional)"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={() => setModalGenerarDocumento(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={confirmarGenerarDocumento}
                      className="flex-1"
                      style={{ background: '#F97316' }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Generar Documento
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ COMPONENTE: CARD DE ETAPA ============

interface EtapaCardProps {
  etapa: EtapaPlaneacion;
  onIniciar: (etapa: EtapaPlaneacion) => void;
  onVerDetalle: (etapa: EtapaPlaneacion) => void;
  onGenerarDocumento: (etapa: EtapaPlaneacion, tipoDoc: any) => void;
  onEnviarDocumento: (etapaId: string, docId: string) => void;
}

function EtapaCard({ etapa, onIniciar, onVerDetalle, onGenerarDocumento, onEnviarDocumento }: EtapaCardProps) {
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

  const documentosObligatoriosPendientes = TIPOS_DOCUMENTO
    .filter(td => td.obligatorio)
    .filter(td => !etapa.documentos.find(d => d.tipo === td.tipo));

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-orange-50 to-blue-50 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-black text-gray-900">{etapa.codigoAuditoria}</h3>
              <Badge style={{ background: getEstadoColor(etapa.estado), color: '#FFFFFF' }}>
                {etapa.estado}
              </Badge>
              {etapa.diasRestantes && etapa.diasRestantes < 7 && (
                <Badge style={{ background: '#EF4444', color: '#FFFFFF' }}>
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {etapa.diasRestantes} días restantes
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">{etapa.procesoAuditable}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
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
                Iniciar Etapa
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
                style={{ background: etapa.progreso === 100 ? '#10B981' : '#F97316' }}
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
              {/* Documentos Obligatorios Pendientes */}
              {documentosObligatoriosPendientes.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-2">
                    Documentos Obligatorios Pendientes ({documentosObligatoriosPendientes.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {documentosObligatoriosPendientes.map((tipoDoc) => {
                      const Icono = tipoDoc.icono;
                      return (
                        <button
                          key={tipoDoc.tipo}
                          onClick={() => onGenerarDocumento(etapa, tipoDoc)}
                          className="p-3 rounded-lg border-2 border-dashed hover:border-solid transition-all text-left"
                          style={{ borderColor: tipoDoc.color, background: `${tipoDoc.color}05` }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: tipoDoc.color }}>
                              <Icono className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900 truncate">{tipoDoc.nombre}</p>
                              <p className="text-xs text-gray-500">Pendiente</p>
                            </div>
                            <Plus className="w-4 h-4 flex-shrink-0" style={{ color: tipoDoc.color }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Documentos Generados */}
              {etapa.documentos.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-2">
                    Documentos Generados ({etapa.documentos.length})
                  </h4>
                  <div className="space-y-2">
                    {etapa.documentos.map((doc) => {
                      const tipoDoc = TIPOS_DOCUMENTO.find(td => td.tipo === doc.tipo);
                      const Icono = tipoDoc?.icono || FileText;
                      
                      return (
                        <div
                          key={doc.id}
                          className="p-3 rounded-lg border"
                          style={{ background: '#F9FAFB' }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: tipoDoc?.color || '#6B7280' }}>
                              <Icono className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">{doc.nombre}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge
                                  style={{
                                    background: doc.estado === 'Respondido' ? '#10B981' : doc.estado === 'Enviado' ? '#3B82F6' : '#F97316',
                                    color: '#FFFFFF'
                                  }}
                                >
                                  {doc.estado}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  Generado: {doc.fechaGeneracion}
                                </span>
                                {doc.fechaEnvio && (
                                  <span className="text-xs text-gray-500">
                                    Enviado: {doc.fechaEnvio}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" title="Ver documento">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" title="Descargar">
                                <Download className="w-4 h-4" />
                              </Button>
                              {doc.estado === 'Generado' && (
                                <Button
                                  onClick={() => onEnviarDocumento(etapa.id, doc.id)}
                                  size="sm"
                                  style={{ background: '#3B82F6' }}
                                  title="Enviar documento"
                                >
                                  <Send className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  onClick={() => onVerDetalle(etapa)}
                  variant="outline"
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalle Completo
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ============ COMPONENTE: VISTA DETALLE ============

interface EtapaDetalleViewProps {
  etapa: EtapaPlaneacion;
  onVolver: () => void;
  onGenerarDocumento: (etapa: EtapaPlaneacion, tipoDoc: any) => void;
  onEnviarDocumento: (etapaId: string, docId: string) => void;
}

function EtapaDetalleView({ etapa, onVolver, onGenerarDocumento, onEnviarDocumento }: EtapaDetalleViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-orange-50 to-blue-50">
        <Button onClick={onVolver} variant="ghost" size="sm" className="mb-4">
          <ChevronDown className="w-4 h-4 mr-2 rotate-90" />
          Volver a la lista
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-gray-900">{etapa.codigoAuditoria}</h2>
            <p className="text-gray-600 mt-1">{etapa.procesoAuditable}</p>
            <div className="flex items-center gap-3 mt-3">
              <Badge style={{ background: '#F97316', color: '#FFFFFF' }}>
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
            <h3 className="text-sm font-bold text-gray-900 mb-3">Cronograma de la Etapa</h3>
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
                  {etapa.diasRestantes && etapa.diasRestantes < 7 && (
                    <AlertTriangle className="w-4 h-4 inline-block ml-2 text-red-500" />
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Generador de Documentos */}
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">
          Gestión de Documentos de Planeación
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TIPOS_DOCUMENTO.map((tipoDoc) => {
            const Icono = tipoDoc.icono;
            const docExistente = etapa.documentos.find(d => d.tipo === tipoDoc.tipo);
            
            return (
              <button
                key={tipoDoc.tipo}
                onClick={() => !docExistente && onGenerarDocumento(etapa, tipoDoc)}
                disabled={!!docExistente}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  docExistente
                    ? 'border-solid bg-gray-50 cursor-default'
                    : 'border-dashed hover:border-solid cursor-pointer'
                }`}
                style={{
                  borderColor: tipoDoc.color,
                  background: docExistente ? '#F9FAFB' : `${tipoDoc.color}05`
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: tipoDoc.color }}>
                    <Icono className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-gray-900">{tipoDoc.nombre}</p>
                      {tipoDoc.obligatorio && (
                        <Badge variant="outline" className="text-xs">Obligatorio</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{tipoDoc.descripcion}</p>
                    {docExistente && (
                      <div className="mt-2">
                        <Badge style={{ background: '#10B981', color: '#FFFFFF' }}>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Generado
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Lista de Documentos Generados */}
      {etapa.documentos.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-black text-gray-900 mb-4">
            Documentos Generados ({etapa.documentos.length})
          </h3>

          <div className="space-y-3">
            {etapa.documentos.map((doc) => {
              const tipoDoc = TIPOS_DOCUMENTO.find(td => td.tipo === doc.tipo);
              const Icono = tipoDoc?.icono || FileText;

              return (
                <div
                  key={doc.id}
                  className="p-4 rounded-lg border hover:shadow-md transition-shadow"
                  style={{ background: '#FFFFFF' }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: tipoDoc?.color || '#6B7280' }}>
                      <Icono className="w-6 h-6 text-white" />
                    </div>

                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">{doc.nombre}</h4>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <Badge
                          style={{
                            background: doc.estado === 'Respondido' ? '#10B981' : doc.estado === 'Enviado' ? '#3B82F6' : '#F97316',
                            color: '#FFFFFF'
                          }}
                        >
                          {doc.estado}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Generado por {doc.generadoPor} el {doc.fechaGeneracion}
                        </span>
                      </div>
                      {doc.fechaEnvio && (
                        <p className="text-xs text-gray-600 mt-1">
                          Enviado el {doc.fechaEnvio}
                          {doc.fechaRespuesta && ` - Respondido el ${doc.fechaRespuesta}`}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" title="Ver">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" title="Descargar">
                        <Download className="w-4 h-4" />
                      </Button>
                      {doc.estado === 'Generado' && (
                        <Button
                          onClick={() => onEnviarDocumento(etapa.id, doc.id)}
                          size="sm"
                          style={{ background: '#3B82F6' }}
                          title="Enviar"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}