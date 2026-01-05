/**
 * MOD-06: Órganos de Control
 * DISEÑO 100% COHERENTE CON DEFENSA JUDICIAL
 * Gestión de requerimientos de entidades de control
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Plus, FileText, FolderOpen, Clock, ChevronDown, Scale,
  AlertCircle, CheckCircle, List, Columns3, User, Trash2,
  Building2, Filter, Search, Download, Users,
  MessageSquare, FileCheck, Send, Archive, Calendar,
  Eye, AlertTriangle, TrendingUp, Target, Mail, X
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Label } from '../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { toast } from 'sonner@2.0.3';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import { Input } from '../../../ui/input';
import { Textarea } from '../../../ui/textarea';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ModalHeaderClean } from './ModalHeaderClean';

// Tipo para drag and drop
const ItemTypes = {
  REQUERIMIENTO: 'requerimiento_organo'
};

// Types
interface RequerimientoOC {
  id: string;
  radicadoExterno: string;
  radicadoInterno: string;
  organismo?: { id: number; sigla: string; nombre: string };
  tipoRequerimiento: string;
  asunto: string;
  descripcion?: string;
  fechaRecepcion: string;
  unidadTiempo: string;
  plazoOtorgado: number;
  fechaVencimiento: string;
  funcionarioResponsable?: string;
  areaResponsable?: string;
  abogadoAsignado?: { id: string; nombre: string };
  estado: string;
  prioridad: string;
  documentosCount?: number;
  archivoAdjuntoUrl?: string;
  oficioRespuestaUrl?: string;
  acuseReciboUrl?: string;
  fechaRespuesta?: string;
  observaciones?: string;
  diasRestantes?: number;
  createdAt: string;
}

interface OrganismoControl {
  id: number;
  sigla: string;
  nombre: string;
}

export function OrganosControl() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [tipoVista, setTipoVista] = useState<'kanban' | 'lista'>('kanban');

  // Data from API
  const [requerimientos, setRequerimientos] = useState<RequerimientoOC[]>([]);
  const [organismos, setOrganismos] = useState<OrganismoControl[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<RequerimientoOC | null>(null);
  const [isExpedienteOpen, setIsExpedienteOpen] = useState(false);

  // Comentarios y Documentos Modal
  const [isComentariosOpen, setIsComentariosOpen] = useState(false);
  const [isDocumentosOpen, setIsDocumentosOpen] = useState(false);
  const [comentariosReq, setComentariosReq] = useState<RequerimientoOC | null>(null);
  const [comentarios, setComentarios] = useState<ComentarioOC[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoOC[]>([]);
  const [loadingComentarios, setLoadingComentarios] = useState(false);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [nuevoComentario, setNuevoComentario] = useState({ contenido: '', tipo: 'general' });
  const [nuevoDocumento, setNuevoDocumento] = useState<{ nombre: string; descripcion: string; archivo?: File }>({ nombre: '', descripcion: '' });

  // Filters
  const [filtroOrganismo, setFiltroOrganismo] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');

  // New requerimiento form
  const [newReqData, setNewReqData] = useState({
    radicadoExterno: '',
    organismoId: '',
    tipoRequerimiento: 'SOLICITUD_INFORMACION',
    asunto: '',
    descripcion: '',
    unidadTiempo: 'DIAS_HABILES',
    plazoOtorgado: 15,
    areaResponsable: '',
    funcionarioResponsable: '',
    prioridad: 'NORMAL'
  });

  // Screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqs, orgs] = await Promise.all([
        legalService.getRequerimientosOC(),
        legalService.getOrganismosControl()
      ]);
      setRequerimientos(reqs);
      setOrganismos(orgs);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar requerimientos');
    } finally {
      setLoading(false);
    }
  };

  // Create requerimiento
  const handleCreateRequerimiento = async () => {
    if (!newReqData.radicadoExterno || !newReqData.asunto || !newReqData.organismoId) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    const toastId = toast.loading('Creando requerimiento...');
    try {
      const fechaRecepcion = new Date();
      await legalService.createRequerimientoOC({
        ...newReqData,
        organismoId: parseInt(newReqData.organismoId),
        fechaRecepcion: fechaRecepcion.toISOString()
      });
      toast.success('Requerimiento creado exitosamente', { id: toastId });
      setIsCreateOpen(false);
      setNewReqData({
        radicadoExterno: '',
        organismoId: '',
        tipoRequerimiento: 'SOLICITUD_INFORMACION',
        asunto: '',
        descripcion: '',
        unidadTiempo: 'DIAS_HABILES',
        plazoOtorgado: 15,
        areaResponsable: '',
        funcionarioResponsable: '',
        prioridad: 'NORMAL'
      });
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Error al crear requerimiento', { id: toastId });
    }
  };

  // Delete requerimiento
  const handleDeleteRequerimiento = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este requerimiento?')) return;
    const toastId = toast.loading('Eliminando...');
    try {
      await legalService.deleteRequerimientoOC(id);
      toast.success('Requerimiento eliminado', { id: toastId });
      setIsExpedienteOpen(false);
      setSelectedReq(null);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar', { id: toastId });
    }
  };

  // Open expediente
  const handleOpenExpediente = (req: RequerimientoOC) => {
    setSelectedReq(req);
    setIsExpedienteOpen(true);
  };

  // ==== COMENTARIOS ====
  const handleOpenComentarios = async (req: RequerimientoOC) => {
    setComentariosReq(req);
    setIsComentariosOpen(true);
    setLoadingComentarios(true);
    try {
      const data = await ocService.getComentariosByRequerimiento(req.id);
      setComentarios(data);
    } catch (error) {
      console.error('Error cargando comentarios:', error);
      toast.error('Error al cargar comentarios');
      setComentarios([]);
    } finally {
      setLoadingComentarios(false);
    }
  };

  const handleCrearComentario = async () => {
    if (!comentariosReq || !nuevoComentario.contenido.trim()) {
      toast.error('El contenido es requerido');
      return;
    }
    try {
      await ocService.createComentario(comentariosReq.id, {
        contenido: nuevoComentario.contenido,
        tipo: nuevoComentario.tipo,
        autorNombre: 'Usuario'
      });
      toast.success('Comentario agregado');
      setNuevoComentario({ contenido: '', tipo: 'general' });
      const data = await ocService.getComentariosByRequerimiento(comentariosReq.id);
      setComentarios(data);
    } catch (error) {
      toast.error('Error al crear comentario');
    }
  };

  const handleEliminarComentario = async (id: string) => {
    if (!comentariosReq) return;
    try {
      await ocService.deleteComentario(id);
      toast.success('Comentario eliminado');
      const data = await ocService.getComentariosByRequerimiento(comentariosReq.id);
      setComentarios(data);
    } catch (error) {
      toast.error('Error al eliminar comentario');
    }
  };

  // ==== DOCUMENTOS ====
  const handleOpenDocumentos = async (req: RequerimientoOC) => {
    setComentariosReq(req); // reuse for docs context
    setIsDocumentosOpen(true);
    setLoadingDocumentos(true);
    try {
      const data = await ocService.getDocumentosByRequerimiento(req.id);
      setDocumentos(data);
    } catch (error) {
      console.error('Error cargando documentos:', error);
      toast.error('Error al cargar documentos');
      setDocumentos([]);
    } finally {
      setLoadingDocumentos(false);
    }
  };

  const handleCrearDocumento = async () => {
    if (!comentariosReq || !nuevoDocumento.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    try {
      await ocService.createDocumento(comentariosReq.id, {
        nombre: nuevoDocumento.nombre,
        tipoDocumento: 'otro',
        descripcion: nuevoDocumento.descripcion,
        archivo: nuevoDocumento.archivo, // Pass the file here
        subidoPor: 'Usuario' // TODO: Get from auth context
      });
      toast.success('Documento agregado');
      setNuevoDocumento({ nombre: '', descripcion: '', archivo: undefined }); // Reset file
      const data = await ocService.getDocumentosByRequerimiento(comentariosReq.id);
      setDocumentos(data);

      // Actualizar contador en la lista principal
      setRequerimientos(prev => prev.map(r =>
        r.id === comentariosReq.id ? { ...r, documentosCount: (r.documentosCount || 0) + 1 } : r
      ));
    } catch (error) {
      toast.error('Error al subir documento');
      console.error('Error al subir documento:', error);
    }
  };

  const handleEliminarDocumento = async (id: string) => {
    if (!comentariosReq) return;
    try {
      await ocService.deleteDocumento(id);
      setDocumentos(documentos.filter(d => d.id !== id));
      toast.success('Documento eliminado');

      // Actualizar contador en la lista principal
      if (comentariosReq) {
        setRequerimientos(prev => prev.map(r =>
          r.id === comentariosReq.id ? { ...r, documentosCount: Math.max(0, (r.documentosCount || 0) - 1) } : r
        ));
      }
    } catch (error) {
      toast.error('Error al eliminar documento');
    }
  };

  // Filtered data
  const requerimientosFiltrados = useMemo(() => {
    let resultado = [...requerimientos];

    if (filtroOrganismo !== 'TODOS') {
      resultado = resultado.filter(r => r.organismo?.sigla === filtroOrganismo);
    }
    if (filtroEstado !== 'TODOS') {
      resultado = resultado.filter(r => r.estado === filtroEstado);
    }
    if (busqueda) {
      const search = busqueda.toLowerCase();
      resultado = resultado.filter(r =>
        r.radicadoInterno?.toLowerCase().includes(search) ||
        r.radicadoExterno?.toLowerCase().includes(search) ||
        r.asunto?.toLowerCase().includes(search) ||
        r.funcionarioResponsable?.toLowerCase().includes(search)
      );
    }

    return resultado;
  }, [requerimientos, filtroOrganismo, filtroEstado, busqueda]);

  // Group by estado for Kanban
  const requerimientosPorEtapa = useMemo(() => ({
    RECIBIDO: requerimientosFiltrados.filter(r => r.estado === 'RECIBIDO'),
    EN_ANALISIS: requerimientosFiltrados.filter(r => r.estado === 'EN_ANALISIS'),
    EN_RESPUESTA: requerimientosFiltrados.filter(r => r.estado === 'EN_RESPUESTA'),
    ENVIADO: requerimientosFiltrados.filter(r => r.estado === 'ENVIADO' || r.estado === 'CERRADO'),
  }), [requerimientosFiltrados]);

  // Statistics - considerando horas también
  const totalRequerimientos = requerimientos.length;

  // Críticos: ≤3 días o ≤72 horas
  const criticos = requerimientos.filter(r => {
    const valor = r.diasRestantes ?? 0;
    if (valor < 0) return false; // Los vencidos se cuentan aparte
    if (r.unidadTiempo === 'HORAS') return valor <= 72;
    return valor <= 3;
  }).length;

  // Urgentes: 4-5 días o 73-120 horas
  const urgentes = requerimientos.filter(r => {
    const valor = r.diasRestantes ?? 0;
    if (r.unidadTiempo === 'HORAS') return valor > 72 && valor <= 120;
    return valor > 3 && valor <= 5;
  }).length;

  const vencidos = requerimientos.filter(r => (r.diasRestantes ?? 0) < 0).length;
  const enTermino = requerimientos.filter(r => {
    const valor = r.diasRestantes ?? 0;
    if (r.unidadTiempo === 'HORAS') return valor > 120;
    return valor > 5;
  }).length;

  // Etapas config
  const etapas = [
    {
      nombre: 'Recibido',
      estado: 'RECIBIDO',
      color: '#6B7280',
      icono: <Mail className="w-4 h-4 text-gray-600" />,
      diasEstimados: 2,
      requerimientos: requerimientosPorEtapa.RECIBIDO
    },
    {
      nombre: 'En Análisis',
      estado: 'EN_ANALISIS',
      color: '#F59E0B',
      icono: <Search className="w-4 h-4 text-amber-600" />,
      diasEstimados: 10,
      requerimientos: requerimientosPorEtapa.EN_ANALISIS
    },
    {
      nombre: 'En Respuesta',
      estado: 'EN_RESPUESTA',
      color: '#3B82F6',
      icono: <FileCheck className="w-4 h-4 text-blue-600" />,
      diasEstimados: 5,
      requerimientos: requerimientosPorEtapa.EN_RESPUESTA
    },
    {
      nombre: 'Enviado',
      estado: 'ENVIADO',
      color: '#10B981',
      icono: <CheckCircle className="w-4 h-4 text-green-600" />,
      diasEstimados: 0,
      requerimientos: requerimientosPorEtapa.ENVIADO
    },
  ];

  // Helper functions
  const getOrganoIcon = (sigla?: string) => {
    // No icons/emojis for professional look
    return '';
  };

  // Helper function - Semáforo que considera horas vs días
  const getSemaforoColor = (diasRestantes?: number, unidadTiempo?: string) => {
    const valor = diasRestantes ?? 0;

    // Si es HORAS, convertir a días equivalentes para el semáforo
    if (unidadTiempo === 'HORAS') {
      const diasEquivalentes = valor / 24;
      if (diasEquivalentes < 0) return { color: '#DC2626', label: 'Vencido', bg: '#FEE2E2' };
      if (diasEquivalentes <= 1) return { color: '#DC2626', label: 'Crítico', bg: '#FEE2E2' }; // 24 hrs o menos = crítico
      if (diasEquivalentes <= 2) return { color: '#D97706', label: 'Urgente', bg: '#FEF3C7' }; // 48 hrs o menos = urgente
      return { color: '#059669', label: 'En término', bg: '#D1FAE5' };
    }

    // Para días (calendario o hábiles)
    if (valor < 0) return { color: '#DC2626', label: 'Vencido', bg: '#FEE2E2' };
    if (valor <= 3) return { color: '#DC2626', label: 'Crítico', bg: '#FEE2E2' };
    if (valor <= 5) return { color: '#D97706', label: 'Urgente', bg: '#FEF3C7' };
    return { color: '#059669', label: 'En término', bg: '#D1FAE5' };
  };

  const formatTipoRequerimiento = (tipo: string) => {
    const map: Record<string, string> = {
      'SOLICITUD_INFORMACION': 'Solicitud de Información',
      'APERTURA_AUDITORIA': 'Apertura de Auditoría',
      'NOTIFICACION_HALLAZGO': 'Notificación de Hallazgo',
      'PLAN_MEJORAMIENTO': 'Plan de Mejoramiento',
      'OTRO': 'Otro'
    };
    return map[tipo] || tipo;
  };

  const formatUnidadTiempo = (unidad: string) => {
    const map: Record<string, string> = {
      'HORAS': 'Horas',
      'DIAS_CALENDARIO': 'Días Calendario',
      'DIAS_HABILES': 'Días Hábiles'
    };
    return map[unidad] || unidad;
  };

  const formatPrioridad = (prioridad: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      'CRITICA': { label: 'Crítica', color: '#DC2626', bg: '#FEE2E2' },
      'ALTA': { label: 'Alta', color: '#D97706', bg: '#FEF3C7' },
      'NORMAL': { label: 'Normal', color: '#059669', bg: '#D1FAE5' },
      'BAJA': { label: 'Baja', color: '#6B7280', bg: '#F3F4F6' }
    };
    return map[prioridad] || { label: prioridad, color: '#6B7280', bg: '#F3F4F6' };
  };

  // Handler para drag and drop
  const handleDrop = async (item: RequerimientoOC, nuevoEstado: string) => {
    if (!nuevoEstado) {
      console.error('❌ Intento de mover requerimiento a estado indefinido');
      return;
    }

    // Guard to prevent unnecessary updates
    if (item.estado === nuevoEstado) return;

    // Optimistic Update
    const previousRequerimientos = [...requerimientos];
    setRequerimientos(prevReqs =>
      prevReqs.map(req =>
        req.id === item.id ? { ...req, estado: nuevoEstado } : req
      )
    );

    try {
      // Call Backend to update
      await legalService.updateRequerimientoOC(item.id, {
        estado: nuevoEstado
      });
      toast.success(`Requerimiento ${item.radicadoInterno} movido a ${nuevoEstado.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating estado:', error);
      toast.error('Error al actualizar estado');
      setRequerimientos(previousRequerimientos);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header */}
      <ModuleHeader
        title={isMobile ? 'Órganos Control' : 'Órganos de Control'}
        subtitle="Gestión de requerimientos de entidades de control"
        toggleView={{
          current: tipoVista,
          onChange: (view) => setTipoVista(view as 'kanban' | 'lista'),
          options: [
            { label: 'Kanban', icon: <Columns3 className="w-4 h-4" />, value: 'kanban' },
            { label: 'Lista', icon: <List className="w-4 h-4" />, value: 'lista' }
          ]
        }}
        buttons={[
          {
            label: 'Nuevo Requerimiento',
            labelMobile: 'Nuevo',
            icon: <Plus className="w-4 h-4" />,
            onClick: () => setIsCreateOpen(true),
            variant: 'primary'
          }
        ]}
        infoTooltip={
          <ModuleInfoTooltip
            title="Guía de Órganos de Control"
            variant="icon"
            sections={[
              {
                label: "⚖️ Propósito",
                content: "Gestión de requerimientos de Contraloría, Procuraduría, Fiscalía y otros órganos. Plazos perentorios que NO son prorrogables.",
                type: "warning"
              },
              {
                label: "🔄 Flujo",
                content: "1️⃣ RECIBIDO → 2️⃣ EN ANÁLISIS → 3️⃣ EN RESPUESTA → 4️⃣ ENVIADO",
                type: "premium"
              }
            ]}
          />
        }
      />

      {/* Métricas */}
      <ModuleMetrics
        metrics={[
          { label: 'Total', value: totalRequerimientos, icon: <Building2 className="w-5 h-5" />, color: 'blue' },
          { label: 'Críticos', value: criticos, icon: <AlertCircle className="w-5 h-5" />, color: 'red' },
          { label: 'Urgentes', value: urgentes, icon: <AlertTriangle className="w-5 h-5" />, color: 'orange' },
          { label: 'Vencidos', value: vencidos, icon: <Clock className="w-5 h-5" />, color: 'gray' },
          { label: 'En término', value: enTermino, icon: <CheckCircle className="w-5 h-5" />, color: 'green' }
        ]}
      />

      {/* Filtros */}
      <ModuleFilters
        searchValue={busqueda}
        onSearchChange={setBusqueda}
        searchPlaceholder="Buscar por radicado, asunto..."
        filters={[
          {
            type: 'select',
            value: filtroOrganismo,
            onChange: setFiltroOrganismo,
            options: [
              { value: 'TODOS', label: 'Todos los organismos' },
              ...organismos.map(o => ({ value: o.sigla, label: `${getOrganoIcon(o.sigla)} ${o.nombre}` }))
            ]
          },
          {
            type: 'select',
            value: filtroEstado,
            onChange: setFiltroEstado,
            options: [
              { value: 'TODOS', label: 'Todos los estados' },
              { value: 'RECIBIDO', label: 'Recibido' },
              { value: 'EN_ANALISIS', label: 'En Análisis' },
              { value: 'EN_RESPUESTA', label: 'En Respuesta' },
              { value: 'ENVIADO', label: 'Enviado' }
            ]
          }
        ]}
        totalItems={requerimientos.length}
        filteredItems={requerimientosFiltrados.length}
        onClearFilters={() => { setBusqueda(''); setFiltroOrganismo('TODOS'); setFiltroEstado('TODOS'); }}
      />

      {/* Tablero Kanban */}
      {tipoVista === 'kanban' && (
        <DndProvider backend={HTML5Backend}>
          <div className="relative">
            {(isMobile || isTablet) && (
              <div className="absolute top-2 right-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md border border-gray-200">
                <p className="text-xs font-bold text-gray-600 flex items-center gap-1">
                  <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                  Desliza
                </p>
              </div>
            )}

            <div
              className={`flex gap-3 md:gap-4 overflow-x-auto pb-4 ${isMobile ? '-mx-4 px-4' : ''} scroll-smooth`}
              style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}
            >
              {etapas.map((etapa) => (
                <ColumnaKanban
                  key={etapa.nombre}
                  etapa={etapa}
                  isMobile={isMobile}
                  isTablet={isTablet}
                  onOpenExpediente={handleOpenExpediente}
                  onOpenComentarios={handleOpenComentarios}
                  onOpenDocumentos={handleOpenDocumentos}
                  getOrganoIcon={getOrganoIcon}
                  getSemaforoColor={getSemaforoColor}
                  onDrop={handleDrop}
                />
              ))}
            </div>
          </div>
        </DndProvider>
      )}

      {/* Vista Lista */}
      {tipoVista === 'lista' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Radicado</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Organismo</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Asunto</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tiempo</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Responsable</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requerimientosFiltrados.map((req) => {
                  const semaforo = getSemaforoColor(req.diasRestantes, req.unidadTiempo);
                  return (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-8 rounded-full" style={{ background: '#7C3AED' }} />
                          <div>
                            <p className="text-sm font-bold text-gray-900">{req.radicadoInterno}</p>
                            <p className="text-xs text-gray-500">{req.radicadoExterno}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {req.organismo?.sigla || 'N/A'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900 line-clamp-2 max-w-md">{req.asunto}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className="text-xs font-semibold"
                          style={{
                            background: req.estado === 'RECIBIDO' ? '#F3F4F6' :
                              req.estado === 'EN_ANALISIS' ? '#FEF3C7' :
                                req.estado === 'EN_RESPUESTA' ? '#DBEAFE' : '#D1FAE5',
                            color: req.estado === 'RECIBIDO' ? '#374151' :
                              req.estado === 'EN_ANALISIS' ? '#92400E' :
                                req.estado === 'EN_RESPUESTA' ? '#1E40AF' : '#065F46',
                            border: 'none'
                          }}
                        >
                          {req.estado.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            className="text-xs font-semibold flex items-center gap-1"
                            style={{ background: semaforo.bg, color: semaforo.color, border: 'none' }}
                          >
                            <div className="w-2 h-2 rounded-full" style={{ background: semaforo.color }} />
                            {Math.abs(req.diasRestantes ?? 0)} {req.unidadTiempo === 'HORAS' ? 'hrs' : 'días'}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {req.funcionarioResponsable && (
                            <>
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-xs" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                                  {req.funcionarioResponsable.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-gray-700">{req.funcionarioResponsable}</span>
                            </>
                          )}
                          {!req.funcionarioResponsable && <span className="text-xs text-gray-400">Sin asignar</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenExpediente(req)}
                            className="h-8 px-2 text-purple-600 hover:bg-purple-50"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDocumentos(req)}
                            className="h-8 px-2 text-blue-600 hover:bg-blue-50"
                          >
                            <FileCheck className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenComentarios(req)}
                            className="h-8 px-2 text-amber-600 hover:bg-amber-50"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {requerimientosFiltrados.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">No hay requerimientos para mostrar</p>
              <p className="text-xs text-gray-400">Ajusta los filtros o crea un nuevo requerimiento</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Expediente */}
      <Dialog open={isExpedienteOpen} onOpenChange={setIsExpedienteOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" aria-describedby="expediente-description">
          <DialogHeader className="sr-only">
            <DialogTitle>Detalle del Requerimiento</DialogTitle>
            <DialogDescription id="expediente-description">
              Información detallada del requerimiento de órgano de control
            </DialogDescription>
          </DialogHeader>
          {selectedReq && (
            <>
              {/* Header con gradiente */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-6 rounded-t-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedReq.radicadoInterno}</h2>
                    <p className="text-indigo-100 text-sm">{selectedReq.organismo?.nombre || 'Órgano de Control'}</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-4 flex-wrap">
                  <Badge className="bg-white/20 text-white border-white/30">
                    {getOrganoIcon(selectedReq.organismo?.sigla)} {selectedReq.organismo?.sigla}
                  </Badge>
                  <Badge className="bg-white/20 text-white border-white/30">
                    📅 {new Date(selectedReq.fechaRecepcion).toLocaleDateString('es-CO')}
                  </Badge>
                  <Badge style={{ background: formatPrioridad(selectedReq.prioridad).bg, color: formatPrioridad(selectedReq.prioridad).color, border: 'none' }}>
                    {formatPrioridad(selectedReq.prioridad).label}
                  </Badge>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Semáforo de días */}
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: getSemaforoColor(selectedReq.diasRestantes, selectedReq.unidadTiempo).bg }}>
                  <div className="flex items-center gap-3">
                    <Clock className="w-8 h-8" style={{ color: getSemaforoColor(selectedReq.diasRestantes, selectedReq.unidadTiempo).color }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: getSemaforoColor(selectedReq.diasRestantes, selectedReq.unidadTiempo).color }}>
                        {selectedReq.unidadTiempo === 'HORAS' ? 'Horas Restantes' : 'Tiempo Restante'}
                      </p>
                      <p className="text-2xl font-bold" style={{ color: getSemaforoColor(selectedReq.diasRestantes, selectedReq.unidadTiempo).color }}>
                        {Math.abs(selectedReq.diasRestantes ?? 0)} {selectedReq.unidadTiempo === 'HORAS' ? 'horas' : 'días'}
                        {(selectedReq.diasRestantes ?? 0) < 0 ? ' (vencido)' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Plazo: {selectedReq.plazoOtorgado} {formatUnidadTiempo(selectedReq.unidadTiempo)}</p>
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">📋 Tipo de Requerimiento</p>
                    <p className="font-bold text-gray-900">{formatTipoRequerimiento(selectedReq.tipoRequerimiento)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">📑 Radicado Externo</p>
                    <p className="font-bold text-gray-900">{selectedReq.radicadoExterno}</p>
                  </div>
                </div>

                {/* Asunto */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <h4 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Asunto
                  </h4>
                  <p className="text-gray-800">{selectedReq.asunto}</p>
                  {selectedReq.descripcion && (
                    <p className="text-gray-600 text-sm mt-2 bg-gray-50 p-3 rounded-lg">{selectedReq.descripcion}</p>
                  )}
                </div>

                {/* Responsables */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <h4 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Responsables
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Área</p>
                      <p className="font-semibold text-gray-800">{selectedReq.areaResponsable || 'Sin asignar'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Funcionario</p>
                      <p className="font-semibold text-gray-800">{selectedReq.funcionarioResponsable || 'Sin asignar'}</p>
                    </div>
                  </div>
                </div>

                {/* Botón delegación */}
                <Button className="w-full gap-2" style={{ background: '#7C3AED', color: '#fff' }}>
                  <Send className="w-4 h-4" />
                  Solicitar Insumos a Otra Área
                </Button>

                {/* Info legal */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h4 className="font-bold text-sm text-amber-800 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" /> ⚠️ Plazo Perentorio
                  </h4>
                  <p className="text-sm text-amber-700">
                    Los plazos de órganos de control <strong>NO son prorrogables</strong>. El incumplimiento puede generar sanciones fiscales o disciplinarias.
                  </p>
                </div>

                {/* Acciones */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <Button variant="destructive" onClick={() => handleDeleteRequerimiento(selectedReq.id)} className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </Button>
                  <Button variant="outline" onClick={() => setIsExpedienteOpen(false)}>
                    Cerrar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Crear Requerimiento */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5" style={{ color: '#7C3AED' }} />
              Nuevo Requerimiento de Órgano de Control
            </DialogTitle>
            <DialogDescription>Registra un nuevo requerimiento de entidad de control.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Organismo y Radicado Externo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Ente de Control *</Label>
                <Select
                  value={newReqData.organismoId}
                  onValueChange={(v) => setNewReqData({ ...newReqData, organismoId: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {organismos.map(org => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        {org.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Radicado Externo *</Label>
                <Input
                  placeholder="Ej: CGR-2025-00123"
                  value={newReqData.radicadoExterno}
                  onChange={e => setNewReqData({ ...newReqData, radicadoExterno: e.target.value })}
                />
              </div>
            </div>

            {/* Tipo de Requerimiento */}
            <div className="grid gap-2">
              <Label>Tipo de Requerimiento *</Label>
              <Select
                value={newReqData.tipoRequerimiento}
                onValueChange={(v) => setNewReqData({ ...newReqData, tipoRequerimiento: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="SOLICITUD_INFORMACION">Solicitud de Información</SelectItem>
                  <SelectItem value="APERTURA_AUDITORIA">Apertura de Auditoría</SelectItem>
                  <SelectItem value="NOTIFICACION_HALLAZGO">Notificación de Hallazgo</SelectItem>
                  <SelectItem value="PLAN_MEJORAMIENTO">Plan de Mejoramiento</SelectItem>
                  <SelectItem value="OTRO">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Plazo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Unidad de Tiempo</Label>
                <Select
                  value={newReqData.unidadTiempo}
                  onValueChange={(v) => setNewReqData({ ...newReqData, unidadTiempo: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="HORAS">Horas</SelectItem>
                    <SelectItem value="DIAS_CALENDARIO">Días Calendario</SelectItem>
                    <SelectItem value="DIAS_HABILES">Días Hábiles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Plazo Otorgado</Label>
                <Input
                  type="number"
                  value={newReqData.plazoOtorgado}
                  onChange={e => setNewReqData({ ...newReqData, plazoOtorgado: parseInt(e.target.value) || 15 })}
                />
              </div>
            </div>

            {/* Asunto */}
            <div className="grid gap-2">
              <Label>Asunto *</Label>
              <Input
                placeholder="Describe brevemente el asunto del requerimiento"
                value={newReqData.asunto}
                onChange={e => setNewReqData({ ...newReqData, asunto: e.target.value })}
              />
            </div>

            {/* Descripción */}
            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Textarea
                placeholder="Detalles adicionales del requerimiento..."
                value={newReqData.descripcion}
                onChange={e => setNewReqData({ ...newReqData, descripcion: e.target.value })}
                className="min-h-[80px]"
              />
            </div>

            {/* Responsables */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Área Responsable</Label>
                <Input
                  placeholder="Ej: Oficina Jurídica"
                  value={newReqData.areaResponsable}
                  onChange={e => setNewReqData({ ...newReqData, areaResponsable: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Funcionario Responsable</Label>
                <Input
                  placeholder="Nombre del funcionario"
                  value={newReqData.funcionarioResponsable}
                  onChange={e => setNewReqData({ ...newReqData, funcionarioResponsable: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateRequerimiento} style={{ background: '#7C3AED' }}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Requerimiento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Comentarios */}
      <Dialog open={isComentariosOpen} onOpenChange={setIsComentariosOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0" aria-describedby="comentarios-description">
          <DialogHeader className="sr-only">
            <DialogTitle>Comentarios del Requerimiento</DialogTitle>
            <DialogDescription id="comentarios-description">Gestionar comentarios</DialogDescription>
          </DialogHeader>

          {/* Header con gradiente */}
          <div className="p-4 border-b" style={{ background: 'linear-gradient(135deg, #EDE9FE 0%, #F3E8FF 100%)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#7C3AED' }}>
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Comentarios</h2>
                  <p className="text-sm text-gray-600">{comentariosReq?.radicadoInterno} - {comentariosReq?.asunto?.substring(0, 40)}...</p>
                </div>
              </div>

            </div>
            <p className="text-xs text-gray-500 mt-2">
              Los comentarios son visibles para todo el equipo asignado al requerimiento
            </p>
          </div>

          <div className="p-4 space-y-4">
            {/* Formulario nuevo comentario */}
            <Card className="p-4 border-2 border-purple-300 bg-purple-50">
              <h5 className="text-sm font-bold mb-3 text-purple-700">Nuevo Comentario</h5>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Contenido *</label>
                  <textarea
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Escribe tu comentario aquí..."
                    rows={3}
                    value={nuevoComentario.contenido}
                    onChange={(e) => setNuevoComentario({ ...nuevoComentario, contenido: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Tipo</label>
                  <select
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                    value={nuevoComentario.tipo}
                    onChange={(e) => setNuevoComentario({ ...nuevoComentario, tipo: e.target.value })}
                  >
                    <option value="general">General</option>
                    <option value="importante">Importante</option>
                    <option value="seguimiento">Seguimiento</option>
                    <option value="interno">Interno</option>
                    <option value="alerta">Alerta</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setNuevoComentario({ contenido: '', tipo: 'general' })}>
                    Limpiar
                  </Button>
                  <Button size="sm" className="text-white" style={{ background: '#7C3AED' }} onClick={handleCrearComentario}>
                    Guardar Comentario
                  </Button>
                </div>
              </div>
            </Card>

            {/* Lista de comentarios */}
            {loadingComentarios ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 animate-pulse text-purple-400" />
                <p className="text-sm">Cargando comentarios...</p>
              </div>
            ) : comentarios.length === 0 ? (
              <Card className="p-6 text-center text-gray-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No hay comentarios registrados para este requerimiento</p>
                <p className="text-xs text-gray-400">Utiliza el formulario de arriba para agregar uno</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {comentarios.map((com) => (
                  <Card
                    key={com.id}
                    className="p-4 border-l-4"
                    style={{
                      borderLeftColor: com.tipo === 'importante' ? '#DC2626' :
                        com.tipo === 'seguimiento' ? '#3B82F6' :
                          com.tipo === 'alerta' ? '#F59E0B' :
                            com.tipo === 'interno' ? '#6366F1' : '#10B981'
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge
                        className="text-xs font-bold"
                        style={{
                          background: com.tipo === 'importante' ? '#FEE2E2' :
                            com.tipo === 'seguimiento' ? '#DBEAFE' :
                              com.tipo === 'alerta' ? '#FEF3C7' :
                                com.tipo === 'interno' ? '#E0E7FF' : '#D1FAE5',
                          color: com.tipo === 'importante' ? '#DC2626' :
                            com.tipo === 'seguimiento' ? '#1E40AF' :
                              com.tipo === 'alerta' ? '#92400E' :
                                com.tipo === 'interno' ? '#4338CA' : '#065F46'
                        }}
                      >
                        {com.tipo}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(com.createdAt).toLocaleDateString()}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                          onClick={() => handleEliminarComentario(com.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-800 mb-2">{com.contenido}</p>
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {com.autorNombre || 'Usuario'}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>


      {/* Modal Documentos */}
      <Dialog open={isDocumentosOpen} onOpenChange={setIsDocumentosOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0" aria-describedby="documentos-description">
          <DialogHeader className="sr-only">
            <DialogTitle>Documentos del Requerimiento</DialogTitle>
            <DialogDescription id="documentos-description">Gestionar documentos</DialogDescription>
          </DialogHeader>

          {/* Header con gradiente */}
          <div className="p-4 border-b" style={{ background: 'linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 100%)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#2563EB' }}>
                  <FileCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Documentos</h2>
                  <p className="text-sm text-gray-600">{comentariosReq?.radicadoInterno} - {comentariosReq?.asunto?.substring(0, 40)}...</p>
                </div>
              </div>

            </div>
            <p className="text-xs text-gray-500 mt-2">
              Gestión de documentos asociados al requerimiento
            </p>
          </div>

          <div className="p-4 space-y-4">
            {/* Formulario nuevo documento */}
            <Card className="p-4 border-2 border-blue-200 bg-blue-50">
              <h5 className="text-sm font-bold mb-3 text-blue-700">Nuevo Documento</h5>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Nombre *</label>
                  <Input
                    className="w-full mt-1 border-blue-200 focus:ring-blue-500"
                    placeholder="Nombre del documento..."
                    value={nuevoDocumento.nombre}
                    onChange={(e) => setNuevoDocumento({ ...nuevoDocumento, nombre: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700">Archivo</label>
                  <Input
                    type="file"
                    className="w-full mt-1 border-blue-200 focus:ring-blue-500 text-xs"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setNuevoDocumento({ ...nuevoDocumento, archivo: file });
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Descripción (Opcional)</label>
                  <Textarea
                    className="w-full mt-1 border-blue-200 focus:ring-blue-500"
                    placeholder="Breve descripción..."
                    rows={2}
                    value={nuevoDocumento.descripcion}
                    onChange={(e) => setNuevoDocumento({ ...nuevoDocumento, descripcion: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setNuevoDocumento({ nombre: '', descripcion: '' })}>
                    Limpiar
                  </Button>
                  <Button size="sm" className="text-white" style={{ background: '#2563EB' }} onClick={handleCrearDocumento}>
                    Guardar Documento
                  </Button>
                </div>
              </div>
            </Card>

            {/* Lista de documentos */}
            {loadingDocumentos ? (
              <div className="text-center py-8 text-gray-500">
                <FileCheck className="w-8 h-8 mx-auto mb-2 animate-pulse text-blue-400" />
                <p className="text-sm">Cargando documentos...</p>
              </div>
            ) : documentos.length === 0 ? (
              <Card className="p-6 text-center text-gray-500">
                <FileCheck className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No hay documentos registrados</p>
                <p className="text-xs text-gray-400">Utiliza el formulario de arriba para agregar uno</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {documentos.map((doc) => (
                  <Card key={doc.id} className="p-4 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 p-2 bg-blue-50 rounded-lg">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{doc.nombre}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
                              {doc.tipoDocumento}
                            </Badge>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {doc.descripcion && (
                            <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                              {doc.descripcion}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {doc.subidoPor || 'Usuario'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {doc.archivoUrl && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-blue-600 hover:bg-blue-50"
                            onClick={() => {
                              const filename = doc.archivoUrl?.split('/').pop();
                              if (filename) {
                                const baseUrl = 'http://localhost:3008/api/legal/files';
                                window.open(`${baseUrl}/${filename}`, '_blank');
                              }
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => handleEliminarDocumento(doc.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente Columna Kanban
interface ColumnaKanbanProps {
  etapa: {
    nombre: string;
    estado: string;
    color: string;
    icono: React.ReactNode;
    diasEstimados: number;
    requerimientos: RequerimientoOC[];
  };
  isMobile: boolean;
  isTablet: boolean;
  onOpenExpediente: (req: RequerimientoOC) => void;
  onOpenComentarios: (req: RequerimientoOC) => void;
  onOpenDocumentos: (req: RequerimientoOC) => void;
  getOrganoIcon: (sigla?: string) => string;
  getSemaforoColor: (dias?: number, unidad?: string) => { color: string; label: string; bg: string };
  onDrop: (item: RequerimientoOC, nuevoEstado: string) => void;
}

function ColumnaKanban({ etapa, isMobile, isTablet, onOpenExpediente, onOpenComentarios, onOpenDocumentos, getOrganoIcon, getSemaforoColor, onDrop }: ColumnaKanbanProps) {
  const [{ isOver }, drop] = useDrop({
    accept: 'REQUERIMIENTO',
    drop: (item: RequerimientoOC) => onDrop(item, etapa.estado),
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  return (
    <motion.div ref={drop} className={`flex-shrink-0 transition-all ${isOver ? 'opacity-70' : 'opacity-100'}`} initial={{ width: 320 }} animate={{ width: 320 }}>
      <Card className="h-full border border-gray-200 bg-white">
        <div className={`${isMobile ? 'p-3' : 'p-4'} border-b bg-gray-50`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-1">
              <div className={`${isMobile ? 'p-1.5' : 'p-2'} rounded-lg bg-white border border-gray-200`}>
                {etapa.icono}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-black ${isMobile ? 'text-xs' : 'text-sm'} text-gray-800`}>
                  {etapa.nombre}
                </h3>
                {etapa.diasEstimados > 0 && (
                  <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {etapa.diasEstimados} días
                  </p>
                )}
              </div>
            </div>
            <Badge className={`font-semibold ${isMobile ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'} bg-white border border-gray-200 text-gray-700`}>
              {etapa.requerimientos.length}
            </Badge>
          </div>
        </div>

        <div
          className={`${isMobile ? 'p-2' : 'p-3'} space-y-3 overflow-y-auto`}
          style={{ maxHeight: isMobile ? 'calc(100vh - 400px)' : 'calc(100vh - 300px)' }}
        >
          {etapa.requerimientos.map((req) => (
            <TarjetaRequerimiento
              key={req.id}
              requerimiento={req}
              isMobile={isMobile}
              onOpenExpediente={onOpenExpediente}
              onOpenComentarios={onOpenComentarios}
              onOpenDocumentos={onOpenDocumentos}
              getOrganoIcon={getOrganoIcon}
              getSemaforoColor={getSemaforoColor}
            />
          ))}

          {etapa.requerimientos.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-xs font-semibold">Sin requerimientos en {etapa.nombre}</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// Componente Tarjeta Requerimiento
interface TarjetaRequerimientoProps {
  requerimiento: RequerimientoOC;
  isMobile: boolean;
  onOpenExpediente: (req: RequerimientoOC) => void;
  onOpenComentarios: (req: RequerimientoOC) => void;
  onOpenDocumentos: (req: RequerimientoOC) => void;
  getOrganoIcon: (sigla?: string) => string;
  getSemaforoColor: (dias?: number, unidad?: string) => { color: string; label: string; bg: string };
}

function TarjetaRequerimiento({ requerimiento, isMobile, onOpenExpediente, onOpenComentarios, onOpenDocumentos, getOrganoIcon, getSemaforoColor }: TarjetaRequerimientoProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'REQUERIMIENTO',
    item: requerimiento,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });
  const semaforo = getSemaforoColor(requerimiento.diasRestantes, requerimiento.unidadTiempo);

  // Calcular porcentaje de tiempo transcurrido
  const diasTranscurridos = requerimiento.plazoOtorgado - Math.abs(requerimiento.diasRestantes ?? 0);
  const porcentajeTiempo = Math.min(100, Math.round((diasTranscurridos / requerimiento.plazoOtorgado) * 100));

  return (
    <motion.div
      ref={drag}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: isDragging ? 0.95 : 1 }}
      className="cursor-move"
    >
      <Card className="bg-white border border-gray-200 hover:shadow-md transition-all">
        <div className="h-1" style={{ background: '#7C3AED' }} />

        <div className={`${isMobile ? 'p-2.5' : 'p-3'}`}>
          {/* Header con radicado y organismo */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={`${isMobile ? 'p-1' : 'p-1.5'} rounded-lg flex-shrink-0`} style={{ background: '#EDE9FE' }}>
                <Building2 className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} style={{ color: '#7C3AED' }} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} truncate`} style={{ color: '#7C3AED' }}>
                  {requerimiento.radicadoInterno}
                </h4>
                <p className="text-xs text-gray-600 truncate">
                  {requerimiento.organismo?.sigla || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Asunto */}
          <div className="mb-2 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">Asunto:</p>
            <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-2`}>
              {requerimiento.asunto}
            </p>
          </div>

          {/* Responsable con avatar */}
          {requerimiento.funcionarioResponsable && (
            <div className="mb-2 pb-2 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Avatar className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} flex-shrink-0`}>
                  <AvatarFallback className="text-xs" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                    {requerimiento.funcionarioResponsable.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Responsable:</p>
                  <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
                    {requerimiento.funcionarioResponsable}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Semáforo de tiempo */}
          <div className="flex items-center gap-1.5 mb-2">
            <Badge className="text-xs flex items-center gap-1 font-semibold" style={{ background: semaforo.bg, color: semaforo.color, border: 'none' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: semaforo.color }} />
              {Math.abs(requerimiento.diasRestantes ?? 0)} {requerimiento.unidadTiempo === 'HORAS' ? 'hrs' : 'días'} {(requerimiento.diasRestantes ?? 0) < 0 ? 'vencido' : 'restantes'}
            </Badge>
          </div>

          {/* Grid con métricas: Docs / Transcurrido / % Tiempo */}
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
              <p className="text-xs font-bold text-gray-700">{requerimiento.documentosCount || 0}</p>
              <p className="text-xs text-gray-500">Docs</p>
            </div>
            <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
              <p className="text-xs font-bold text-gray-700">{diasTranscurridos > 0 ? diasTranscurridos : 0}</p>
              <p className="text-xs text-gray-500">{requerimiento.unidadTiempo === 'HORAS' ? 'Hrs' : 'Días'}</p>
            </div>
            <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
              <p className="text-xs font-bold text-gray-700">{porcentajeTiempo > 0 ? porcentajeTiempo : 0}%</p>
              <p className="text-xs text-gray-500">Tiempo</p>
            </div>
          </div>

          {/* Última actuación */}
          <div className="mb-2 p-2 rounded-lg" style={{ backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE' }}>
            <p className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: '#7C3AED' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#7C3AED' }}></span>
              ÚLTIMA ACTUACIÓN
            </p>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-700 line-clamp-2 mb-1`}>
              {requerimiento.observaciones || 'Sin actuaciones registradas'}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(requerimiento.fechaRecepcion).toLocaleDateString('es-CO')}
            </p>
          </div>

          {/* Botones de acción */}
          <div className="space-y-1 pt-2 border-t border-gray-200">
            <Button
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onOpenExpediente(requerimiento); }}
              size="sm"
              className={`w-full ${isMobile ? 'text-xs py-1.5' : 'text-xs'} font-bold`}
              style={{ background: '#7C3AED', color: '#FFFFFF' }}
            >
              <Archive className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1`} />
              Ver Requerimiento
            </Button>

            <div className="grid grid-cols-2 gap-1">
              <Button
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onOpenDocumentos(requerimiento); }}
                size="sm"
                variant="outline"
                className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start`}
              >
                <FileCheck className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5`} />
                Docs
              </Button>

              <Button
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); toast.info('Preparar respuesta'); }}
                size="sm"
                variant="outline"
                className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start`}
              >
                <Send className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5`} />
                Respuesta
              </Button>
            </div>

            <Button
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onOpenComentarios(requerimiento); }}
              size="sm"
              className={`w-full ${isMobile ? 'text-xs py-1.5' : 'text-xs'} font-bold`}
              style={{ background: '#7C3AED', color: '#FFFFFF' }}
            >
              <MessageSquare className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1`} />
              Comentarios
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}