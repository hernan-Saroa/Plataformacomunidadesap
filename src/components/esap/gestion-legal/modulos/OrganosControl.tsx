/**
 * MOD-06: Órganos de Control
 * VERSIÓN COMPLETA CON INTEGRACIÓN BACKEND
 */

import { useState, useEffect } from 'react';
import {
  Plus, Building2, List, Columns3,
  CheckCircle, AlertCircle, AlertTriangle,
  Mail, Search, FileCheck, Send, X,
  Clock, FolderOpen, MessageSquare, Archive,
  Eye, ArrowUpDown, ChevronLeft, ChevronRight,
  Calendar, User, FileText, Download, Filter,
  Upload, Paperclip, Save, MoreVertical, Loader2
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { toast } from 'sonner';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import { Input } from '../../../ui/input';
import { Textarea } from '../../../ui/textarea';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ModalHeaderClean } from './ModalHeaderClean';
import { ocService } from '../../../../services/api/legal.service';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '../../../../enums/permissions';

// Modales
import { ModalNuevoRequerimiento } from './ModalNuevoRequerimiento';
import { ModalVerRequerimientoOrgano as ModalVerRequerimiento } from './ModalVerRequerimientoOrgano';
import { ModalGestionDocumentos as ModalDocumentos } from './ModalGestionDocumentos';
import { ModalRespuestaOrgano as ModalRespuesta } from './ModalRespuestaOrgano';
import { ModalComentariosOrgano as ModalComentarios } from './ModalComentariosOrgano';
import { ModalSolicitudInsumo } from './ModalSolicitudInsumo';

// Tipo para drag and drop
const ItemTypes = {
  REQUERIMIENTO: 'requerimiento_organo'
};

// Interface alineada con backend
// Se usa 'any' en mappedData temporalmente porque la respuesta del backend puede variar, 
// pero definimos la interfaz estricta para el frontend.
export interface Requerimiento {
  id: string;
  numeroOficio: string; // Mapped from radicadoExterno
  organismo: string; // Mapped from organismo.nombre
  asunto: string;
  responsable: string; // Mapped from funcionarioResponsable
  fechaRadicacion: Date; // Mapped from fechaRecepcion
  fechaVencimiento: Date; // Mapped from fechaVencimiento
  diasRestantes: number; // Mapped from diasRestantes
  diasTotales: number; // Mapped from plazoOtorgado
  etapa: 'RECIBIDO' | 'EN_ANALISIS' | 'EN_RESPUESTA' | 'ENVIADO'; // Mapped from estado
  ultimaActuacion?: string;
  documentos?: number; // Mapped from documentosCount
  // Document category counts
  docRequerimientos?: number;
  docRespuestas?: number;
  docSoportes?: number;
  docInternos?: number;
}

// Datos mock - REDUCIDO
const MOCK_DATA: Requerimiento[] = [
  {
    id: 'REQ-CGR-2024-001',
    numeroOficio: 'CGR-OF-2024-00125',
    organismo: 'CGR',
    asunto: 'Solicitud de información sobre contratación 2024',
    responsable: 'Dra. María Fernández',
    fechaRadicacion: new Date('2024-12-10'),
    fechaVencimiento: new Date('2024-12-30'),
    diasRestantes: 5,
    diasTotales: 20,
    etapa: 'RESPUESTA',
    ultimaActuacion: 'Proyecto de respuesta en revisión',
    documentos: 8
  }
];

// Función auxiliar para colores de semáforo
const getSemaforoColor = (dias: number) => {
  if (dias < 0) return '#DC2626';
  if (dias <= 5) return '#F59E0B';
  return '#10B981';
};

export function OrganosControl() {
  const [tipoVista, setTipoVista] = useState<'kanban' | 'lista'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroOrganismo, setFiltroOrganismo] = useState<string>('');
  const [filtroEtapa, setFiltroEtapa] = useState<string>('');
  const [ordenamiento, setOrdenamiento] = useState<{ campo: string; direccion: 'asc' | 'desc' }>({
    campo: 'diasRestantes',
    direccion: 'asc'
  });
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 10;

  // Estado de datos y carga
  const [requerimientos, setRequerimientos] = useState<Requerimiento[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para modales
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [modalVerOpen, setModalVerOpen] = useState(false);
  const [modalDocsOpen, setModalDocsOpen] = useState(false);
  const [modalRespuestaOpen, setModalRespuestaOpen] = useState(false);
  const [modalComentariosOpen, setModalComentariosOpen] = useState(false);
  const [modalInsumoOpen, setModalInsumoOpen] = useState(false);
  const [requerimientoSeleccionado, setRequerimientoSeleccionado] = useState<Requerimiento | null>(null);

  // Cargar datos del backend
  const fetchRequerimientos = async () => {
    try {
      setLoading(true);
      const data = await ocService.getRequerimientosOC();

      // Cargar configuración local de organismos como fallback
      let organismosConfig: any[] = [];
      try {
        const stored = localStorage.getItem('sigl-organismos-control');
        if (stored) organismosConfig = JSON.parse(stored);
      } catch (e) { console.error('Error parseando config organismos', e); }

      // Mapear respuesta del backend al formato del componente
      const mappedData: Requerimiento[] = data.map((req: any) => {
        // Resolver nombre de organismo: Backend Relation -> LocalStorage Config -> ID -> 'Desconocido'
        const rawId = req.organismoId || req.organismo_id;
        let nombreOrganismo = 'Desconocido';

        if (req.organismo?.nombre) {
          nombreOrganismo = req.organismo.nombre;
        } else if (rawId) {
          const match = organismosConfig.find((o: any) => String(o.id).trim() === String(rawId).trim());
          if (match) nombreOrganismo = match.nombre;
          else nombreOrganismo = String(rawId);
        } else {
          nombreOrganismo = 'Desconocido';
        }

        return {
          id: req.id, // O req.radicadoInterno si se prefiere mostrar ese
          numeroOficio: req.radicadoExterno || 'S/N',
          organismo: nombreOrganismo,
          asunto: req.asunto || 'Sin asunto',
          responsable: req.funcionarioResponsable || 'Sin asignar',
          fechaRadicacion: req.fechaRecepcion ? new Date(req.fechaRecepcion) : new Date(),
          fechaVencimiento: req.fechaVencimiento ? new Date(req.fechaVencimiento) : new Date(),
          diasRestantes: req.diasRestantes !== undefined ? req.diasRestantes : 0,
          diasTotales: req.plazoOtorgado || 0,
          etapa: req.estado as 'RECIBIDO' | 'EN_ANALISIS' | 'EN_RESPUESTA' | 'ENVIADO',
          ultimaActuacion: 'Sin información reciente', // TODO: Traer última actuación real
          documentos: req.documentosCount || 0,
          // Map document categories
          docRequerimientos: req.docRequerimientos || 0,
          docRespuestas: req.docRespuestas || 0,
          docSoportes: req.docSoportes || 0,
          docInternos: req.docInternos || 0,
        };
      });

      setRequerimientos(mappedData);
    } catch (error) {
      console.error('Error cargando requerimientos:', error);
      toast.error('Error al cargar datos', {
        description: 'No se pudieron obtener los requerimientos del servidor.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequerimientos();
  }, []);

  // Handler para mover requerimientos entre etapas
  const handleMoverRequerimiento = async (requerimientoId: string, nuevaEtapa: 'RECIBIDO' | 'EN_ANALISIS' | 'EN_RESPUESTA' | 'ENVIADO') => {
    try {
      // Actualización optimista
      setRequerimientos((prev) =>
        prev.map((req) =>
          req.id === requerimientoId ? { ...req, etapa: nuevaEtapa } : req
        )
      );

      await ocService.cambiarEstadoRequerimientoOC(requerimientoId, nuevaEtapa);

      toast.success('Estado actualizado', {
        description: `Requerimiento movido a ${nuevaEtapa}`
      });
    } catch (error) {
      console.error('Error actualizando estado:', error);
      toast.error('Error al mover', {
        description: 'No se pudo actualizar el estado en el servidor. Revertiendo cambios.'
      });
      fetchRequerimientos(); // Revertir cambios recargando
    }
  };

  // Agrupar por etapa
  const porEtapa = {
    RECIBIDO: requerimientos.filter(r => r.etapa === 'RECIBIDO'),
    EN_ANALISIS: requerimientos.filter(r => r.etapa === 'EN_ANALISIS'),
    EN_RESPUESTA: requerimientos.filter(r => r.etapa === 'EN_RESPUESTA'),
    ENVIADO: requerimientos.filter(r => r.etapa === 'ENVIADO'),
  };

  // Estadísticas
  const total = requerimientos.length;
  const urgentes = requerimientos.filter(r => r.diasRestantes <= 5 && r.diasRestantes > 0).length;
  const vencidos = requerimientos.filter(r => r.diasRestantes < 0).length;
  const enTermino = requerimientos.filter(r => r.diasRestantes > 5).length;

  const etapas = [
    {
      nombre: 'Recibido',
      valor: 'RECIBIDO' as const,
      color: '#6B7280',
      requerimientos: porEtapa.RECIBIDO
    },
    {
      nombre: 'Análisis',
      valor: 'EN_ANALISIS' as const,
      color: '#F59E0B',
      requerimientos: porEtapa.EN_ANALISIS
    },
    {
      nombre: 'Respuesta',
      valor: 'EN_RESPUESTA' as const,
      color: '#3B82F6',
      requerimientos: porEtapa.EN_RESPUESTA
    },
    {
      nombre: 'Enviado',
      valor: 'ENVIADO' as const,
      color: '#10B981',
      requerimientos: porEtapa.ENVIADO
    },
  ];

  const handleVerRequerimiento = (req: Requerimiento) => {
    setRequerimientoSeleccionado(req);
    setModalVerOpen(true);
  };

  const handleDocumentos = (req: Requerimiento) => {
    setRequerimientoSeleccionado(req);
    setModalDocsOpen(true);
  };

  const handleRespuesta = (req: Requerimiento) => {
    setRequerimientoSeleccionado(req);
    setModalRespuestaOpen(true);
  };

  const handleComentarios = (req: Requerimiento) => {
    setRequerimientoSeleccionado(req);
    setModalComentariosOpen(true);
  };

  const handleInsumo = (req: Requerimiento) => {
    setRequerimientoSeleccionado(req);
    setModalInsumoOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Cargando requerimientos...</span>
      </div>
    );
  }

  const addBtnsPermission = () => {
    if (authService.hasPermission(Permissions.GESTION_LEGAL_ORGANOS_CONTROL_CREATE)) {
      return [{
        label: 'Nuevo Requerimiento',
        labelMobile: 'Nuevo',
        icon: <Plus className="w-4 h-4" />,
        onClick: () => setModalNuevoOpen(true),
        variant: 'primary' as const
      }]
    }
    return []
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <ModuleHeader
        title="Tablero Kanban Operativo"
        subtitle="Gestión de requerimientos de órganos de control"
        toggleView={{
          current: tipoVista,
          onChange: (view) => setTipoVista(view as 'kanban' | 'lista'),
          options: [
            { label: 'Kanban', icon: <Columns3 className="w-4 h-4" />, value: 'kanban' },
            { label: 'Lista', icon: <List className="w-4 h-4" />, value: 'lista' }
          ]
        }}
        buttons={addBtnsPermission()}
        infoTooltip={
          <ModuleInfoTooltip
            title="Guía de Órganos de Control"
            variant="icon"
            sections={[
              {
                label: "📋 Propósito",
                content: "Gestión de requerimientos de Contraloría, Procuraduría, Fiscalía y otros órganos de control.",
                type: "default"
              }
            ]}
          />
        }
      />

      {/* Métricas */}
      <ModuleMetrics
        metrics={[
          {
            label: 'Total',
            value: total,
            icon: <Building2 className="w-5 h-5" />,
            color: 'blue'
          },
          {
            label: 'Urgentes',
            value: urgentes,
            icon: <AlertCircle className="w-5 h-5" />,
            color: 'red'
          },
          {
            label: 'Vencidos',
            value: vencidos,
            icon: <AlertTriangle className="w-5 h-5" />,
            color: 'orange'
          },
          {
            label: 'En término',
            value: enTermino,
            icon: <CheckCircle className="w-5 h-5" />,
            color: 'green'
          }
        ]}
      />

      {/* Tablero Kanban */}
      {tipoVista === 'kanban' && (
        <DndProvider backend={HTML5Backend}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {etapas.map((etapa) => (
              <ColumnaKanban
                key={etapa.nombre}
                etapa={etapa}
                onVerRequerimiento={handleVerRequerimiento}
                onDocumentos={handleDocumentos}
                onRespuesta={handleRespuesta}
                onComentarios={handleComentarios}
                onInsumo={handleInsumo}
                onMoverRequerimiento={handleMoverRequerimiento}
              />
            ))}
          </div>
        </DndProvider>
      )}

      {/* Vista Lista */}
      {tipoVista === 'lista' && (
        <VistaLista
          requerimientos={requerimientos}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filtroOrganismo={filtroOrganismo}
          setFiltroOrganismo={setFiltroOrganismo}
          filtroEtapa={filtroEtapa}
          setFiltroEtapa={setFiltroEtapa}
          ordenamiento={ordenamiento}
          setOrdenamiento={setOrdenamiento}
          paginaActual={paginaActual}
          setPaginaActual={setPaginaActual}
          itemsPorPagina={itemsPorPagina}
          onVerRequerimiento={handleVerRequerimiento}
          onDocumentos={handleDocumentos}
          onRespuesta={handleRespuesta}
          onComentarios={handleComentarios}
          onInsumo={handleInsumo}
        />
      )}

      {/* Modales */}
      {modalNuevoOpen && (
        <ModalNuevoRequerimiento
          isOpen={modalNuevoOpen}
          onClose={() => setModalNuevoOpen(false)}
          onSuccess={fetchRequerimientos}
        />
      )}

      {modalVerOpen && requerimientoSeleccionado && (
        <ModalVerRequerimiento
          isOpen={modalVerOpen}
          requerimiento={requerimientoSeleccionado}
          onClose={() => setModalVerOpen(false)}
          onUpdate={fetchRequerimientos}
        />
      )}

      {/* TODO: Implementar integración en estos modales si es necesario */}
      {modalDocsOpen && requerimientoSeleccionado && (
        <ModalDocumentos
          isOpen={modalDocsOpen}
          onClose={() => setModalDocsOpen(false)}
          requerimientoId={requerimientoSeleccionado.id}
          tituloContexto="Gestión de Documentos"
          nombreRequerimiento={`Requerimiento ${requerimientoSeleccionado.numeroOficio}`}
        />
      )}

      {modalRespuestaOpen && requerimientoSeleccionado && (
        <ModalRespuesta
          isOpen={modalRespuestaOpen}
          onClose={() => setModalRespuestaOpen(false)}
          requerimientoId={requerimientoSeleccionado.id}
          organismoNombre={requerimientoSeleccionado.organismo}
          onSuccess={() => {
            fetchRequerimientos();
            setModalRespuestaOpen(false);
          }}
        />
      )}

      {modalComentariosOpen && requerimientoSeleccionado && (
        <ModalComentarios
          isOpen={modalComentariosOpen}
          onClose={() => setModalComentariosOpen(false)}
          requerimientoId={requerimientoSeleccionado.id}
          radicado={requerimientoSeleccionado.numeroOficio}
        />
      )}

      {modalInsumoOpen && requerimientoSeleccionado && (
        <ModalSolicitudInsumo
          isOpen={modalInsumoOpen}
          onClose={() => setModalInsumoOpen(false)}
          requerimientoId={requerimientoSeleccionado.id}
          fechaVencimientoPrincipal={requerimientoSeleccionado.fechaVencimiento}
          onSuccess={() => {
            fetchRequerimientos();
            setModalInsumoOpen(false);
          }}
        />
      )}
    </div>
  );
}

// Componente Columna
function ColumnaKanban({
  etapa,
  onVerRequerimiento,
  onDocumentos,
  onRespuesta,
  onComentarios,
  onInsumo,
  onMoverRequerimiento
}: {
  etapa: { nombre: string; valor: 'RECIBIDO' | 'EN_ANALISIS' | 'EN_RESPUESTA' | 'ENVIADO'; color: string; requerimientos: Requerimiento[] };
  onVerRequerimiento: (req: Requerimiento) => void;
  onDocumentos: (req: Requerimiento) => void;
  onRespuesta: (req: Requerimiento) => void;
  onComentarios: (req: Requerimiento) => void;
  onInsumo: (req: Requerimiento) => void;
  onMoverRequerimiento: (reqId: string, nuevaEtapa: 'RECIBIDO' | 'EN_ANALISIS' | 'EN_RESPUESTA' | 'ENVIADO') => void;
}) {
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.REQUERIMIENTO,
    drop: (item: Requerimiento) => onMoverRequerimiento(item.id, etapa.valor),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  const backgroundColor = isOver ? '#F0F7FF' : 'transparent';
  const borderColor = isOver ? '#2962FF' : 'transparent';

  return (
    <div className="flex-shrink-0" style={{ width: 320 }}>
      <Card className="h-full border border-gray-200">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-800">{etapa.nombre}</h3>
            <Badge className="font-semibold text-sm px-2 py-1 bg-white border">
              {etapa.requerimientos.length}
            </Badge>
          </div>
        </div>

        <div
          ref={drop}
          className="p-3 space-y-3"
          style={{
            minHeight: '500px',
            maxHeight: 'calc(100vh - 300px)',
            overflowY: 'auto',
            backgroundColor: backgroundColor,
            borderLeft: `3px solid ${borderColor}`,
            borderRight: `3px solid ${borderColor}`,
            transition: 'all 0.2s ease'
          }}
        >
          {etapa.requerimientos.map((req) => (
            <TarjetaRequerimiento
              key={req.id}
              req={req}
              onVerRequerimiento={onVerRequerimiento}
              onDocumentos={onDocumentos}
              onRespuesta={onRespuesta}
              onComentarios={onComentarios}
              onInsumo={onInsumo}
              onMoverRequerimiento={onMoverRequerimiento}
            />
          ))}

          {etapa.requerimientos.length === 0 && (
            <div className="text-center py-12 text-gray-400" style={{ pointerEvents: 'none' }}>
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-xs font-semibold">
                {isOver ? '✅ Suelte aquí' : 'Sin requerimientos'}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// Componente Tarjeta
function TarjetaRequerimiento({
  req,
  onVerRequerimiento,
  onDocumentos,
  onRespuesta,
  onComentarios,
  onInsumo,
  onMoverRequerimiento
}: {
  req: Requerimiento;
  onVerRequerimiento: (req: Requerimiento) => void;
  onDocumentos: (req: Requerimiento) => void;
  onRespuesta: (req: Requerimiento) => void;
  onComentarios: (req: Requerimiento) => void;
  onInsumo: (req: Requerimiento) => void;
  onMoverRequerimiento: (reqId: string, nuevaEtapa: 'RECIBIDO' | 'EN_ANALISIS' | 'EN_RESPUESTA' | 'ENVIADO') => void;
}) {
  const semaforo = getSemaforoColor(req.diasRestantes);

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.REQUERIMIENTO,
    item: req,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  return (
    <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1, cursor: 'move' }}>
      <Card className="bg-white border border-gray-200 hover:shadow-md transition-all">
        <div className="h-1" style={{ background: '#003DA5' }} />

        <div className="p-3">
          {/* ID y Organismo */}
          <div className="flex items-start gap-2 mb-2">
            <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: '#E0EDFF' }}>
              <Building2 className="w-4 h-4" style={{ color: '#003DA5' }} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm truncate" style={{ color: '#003DA5' }}>
                {req.numeroOficio}
              </h4>
              <p className="text-xs text-gray-600 truncate">
                🏛️ {req.organismo}
              </p>
            </div>
          </div>

          {/* Asunto */}
          <div className="mb-2 pb-2 border-b">
            <p className="text-xs text-gray-500 mb-0.5">📄 Asunto:</p>
            <p className="font-bold text-sm text-gray-900 line-clamp-2">
              {req.asunto}
            </p>
          </div>

          {/* Responsable */}
          <div className="mb-2 pb-2 border-b">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs" style={{ background: '#E0EDFF', color: '#003DA5' }}>
                  {req.responsable.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">👨‍💼 Responsable:</p>
                <p className="font-bold text-sm text-gray-900 line-clamp-1">
                  {req.responsable}
                </p>
              </div>
            </div>
          </div>

          {/* Días restantes */}
          <div className="mb-2">
            <Badge className="text-xs flex items-center gap-1 font-semibold bg-gray-50 border" style={{ color: semaforo }}>
              <div className="w-2 h-2 rounded-full" style={{ background: semaforo }} />
              {Math.abs(req.diasRestantes)} días {req.diasRestantes < 0 ? 'vencido' : 'restantes'}
            </Badge>
          </div>

          {/* Documentos por Categoría */}
          <div className="grid grid-cols-4 gap-1 mb-2">
            <div className="text-center p-1.5 rounded-lg bg-green-50 border border-green-200">
              <p className="text-xs font-bold text-green-700">{req.docRequerimientos || 0}</p>
              <p className="text-[10px] text-green-600">Requerimientos</p>
            </div>
            <div className="text-center p-1.5 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-xs font-bold text-yellow-700">{req.docRespuestas || 0}</p>
              <p className="text-[10px] text-yellow-600">Respuestas</p>
            </div>
            <div className="text-center p-1.5 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-xs font-bold text-blue-700">{req.docSoportes || 0}</p>
              <p className="text-[10px] text-blue-600">Soportes</p>
            </div>
            <div className="text-center p-1.5 rounded-lg bg-purple-50 border border-purple-200">
              <p className="text-xs font-bold text-purple-700">{req.docInternos || 0}</p>
              <p className="text-[10px] text-purple-600">Internos</p>
            </div>
          </div>

          {/* Última actuación */}
          <div className="mb-2 p-2 rounded-lg" style={{ backgroundColor: '#F0F7FF', border: '1px solid #BFDBFE' }}>
            <p className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: '#003DA5' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#003DA5' }}></span>
              ÚLTIMA ACTUACIÓN
            </p>
            <p className="text-sm text-gray-700 line-clamp-2 mb-1">
              {req.ultimaActuacion || 'Sin actuaciones'}
            </p>
            <p className="text-xs text-gray-500">
              📅 {(req.fechaRadicacion instanceof Date && !isNaN(req.fechaRadicacion.getTime())) ? req.fechaRadicacion.toLocaleDateString('es-CO') : 'Sin fecha'}
            </p>
          </div>

          {/* Botones */}
          <div className="space-y-1 pt-2 border-t">
            <Button
              onClick={() => onVerRequerimiento(req)}
              size="sm"
              className="w-full text-xs font-bold"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Eye className="w-3 h-3 mr-1" />
              Ver Requerimiento
            </Button>

            <div className="grid grid-cols-2 gap-1">
              <Button
                onClick={() => onDocumentos(req)}
                size="sm"
                variant="outline"
                className="text-[11px] px-1 justify-center"
              >
                <FileCheck className="w-3 h-3" />
              </Button>

              <Button
                onClick={() => onRespuesta(req)}
                size="sm"
                variant="outline"
                className="text-[11px] px-1 justify-center"
              >
                <Send className="w-3 h-3" />
              </Button>
            </div>

            <Button
              onClick={() => onComentarios(req)}
              size="sm"
              className="w-full text-xs font-bold"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              Comentarios
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Componente Vista Lista
function VistaLista({
  requerimientos,
  searchTerm,
  setSearchTerm,
  filtroOrganismo,
  setFiltroOrganismo,
  filtroEtapa,
  setFiltroEtapa,
  ordenamiento,
  setOrdenamiento,
  paginaActual,
  setPaginaActual,
  itemsPorPagina,
  onVerRequerimiento,
  onDocumentos,
  onRespuesta,
  onComentarios,
  onInsumo
}: {
  requerimientos: Requerimiento[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filtroOrganismo: string;
  setFiltroOrganismo: (organismo: string) => void;
  filtroEtapa: string;
  setFiltroEtapa: (etapa: string) => void;
  ordenamiento: { campo: string; direccion: 'asc' | 'desc' };
  setOrdenamiento: (ordenamiento: { campo: string; direccion: 'asc' | 'desc' }) => void;
  paginaActual: number;
  setPaginaActual: (pagina: number) => void;
  itemsPorPagina: number;
  onVerRequerimiento: (req: Requerimiento) => void;
  onDocumentos: (req: Requerimiento) => void;
  onRespuesta: (req: Requerimiento) => void;
  onComentarios: (req: Requerimiento) => void;
  onInsumo: (req: Requerimiento) => void;
}) {
  const organos = Array.from(new Set(requerimientos.map(r => r.organismo)));
  const etapas = Array.from(new Set(requerimientos.map(r => r.etapa)));

  const filtrarRequerimientos = (req: Requerimiento) => {
    const matchesSearch = req.asunto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.responsable.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOrganismo = filtroOrganismo ? req.organismo === filtroOrganismo : true;
    const matchesEtapa = filtroEtapa ? req.etapa === filtroEtapa : true;
    return matchesSearch && matchesOrganismo && matchesEtapa;
  };

  const requerimientosFiltrados = requerimientos.filter(filtrarRequerimientos);

  const ordenarRequerimientos = (req1: Requerimiento, req2: Requerimiento) => {
    if (ordenamiento.campo === 'diasRestantes') {
      return ordenamiento.direccion === 'asc' ? req1.diasRestantes - req2.diasRestantes : req2.diasRestantes - req1.diasRestantes;
    }
    if (ordenamiento.campo === 'asunto') {
      return ordenamiento.direccion === 'asc' ? req1.asunto.localeCompare(req2.asunto) : req2.asunto.localeCompare(req1.asunto);
    }
    return 0;
  };

  const requerimientosOrdenados = [...requerimientosFiltrados].sort(ordenarRequerimientos);

  const requerimientosPaginados = requerimientosOrdenados.slice((paginaActual - 1) * itemsPorPagina, paginaActual * itemsPorPagina);

  const total = requerimientosFiltrados.length;
  const totalPaginas = Math.ceil(total / itemsPorPagina);

  return (
    <Card className="p-4">
      {/* Filtros y búsqueda */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-10 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="relative">
          <Building2 className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <select
            value={filtroOrganismo}
            onChange={(e) => setFiltroOrganismo(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-10 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos los órganos</option>
            {organos.map(org => (
              <option key={org} value={org}>{org}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <select
            value={filtroEtapa}
            onChange={(e) => setFiltroEtapa(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-10 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todas las etapas</option>
            {etapas.map(etapa => (
              <option key={etapa} value={etapa}>{etapa}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <select
            value={ordenamiento.campo}
            onChange={(e) => setOrdenamiento({ ...ordenamiento, campo: e.target.value })}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="diasRestantes">Días restantes</option>
            <option value="asunto">Asunto</option>
          </select>
          <Button
            onClick={() => setOrdenamiento({ ...ordenamiento, direccion: ordenamiento.direccion === 'asc' ? 'desc' : 'asc' })}
            size="sm"
            variant="outline"
            className="px-3"
          >
            {ordenamiento.direccion === 'asc' ? '↑' : '↓'}
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Organismo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Asunto</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Responsable</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Días restantes</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Docs</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Etapa</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Última actuación</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requerimientosPaginados.map(req => (
              <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-bold text-sm" style={{ color: '#003DA5' }}>{req.id}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                    {req.organismo}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-900 font-medium line-clamp-2 max-w-xs">
                    {req.asunto}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="text-xs" style={{ background: '#E0EDFF', color: '#003DA5' }}>
                        {req.responsable.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-700">{req.responsable}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge className="text-xs flex items-center gap-1 font-semibold w-fit" style={{
                    color: getSemaforoColor(req.diasRestantes),
                    backgroundColor: `${getSemaforoColor(req.diasRestantes)}20`,
                    border: `1px solid ${getSemaforoColor(req.diasRestantes)}`
                  }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: getSemaforoColor(req.diasRestantes) }} />
                    {Math.abs(req.diasRestantes)} días
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold text-gray-700">{req.documentos || 0}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-xs">
                    {req.etapa}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs text-gray-600 line-clamp-2 max-w-xs">
                    {req.ultimaActuacion || 'Sin actuaciones'}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onVerRequerimiento(req)}
                      title="Ver Detalle"
                    >
                      <Eye className="w-4 h-4 text-gray-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRespuesta(req)}
                      title="Responder"
                    >
                      <Send className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onInsumo(req)}
                      title="Solicitar Insumo"
                    >
                      <User className="w-4 h-4 text-orange-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-600">
            Mostrando {Math.min((paginaActual - 1) * itemsPorPagina + 1, total)} a {Math.min(paginaActual * itemsPorPagina, total)} de {total} requerimientos
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))}
              disabled={paginaActual === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="flex items-center px-4 text-sm font-semibold text-gray-700">
              Página {paginaActual} de {totalPaginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaActual(Math.min(totalPaginas, paginaActual + 1))}
              disabled={paginaActual === totalPaginas}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// Modal Nuevo Requerimiento
function ModalNuevoRequerimiento({ onClose }: { onClose: () => void }) {
  const [numeroOficio, setNumeroOficio] = useState('');
  const [organismo, setOrganismo] = useState('');
  const [asunto, setAsunto] = useState('');
  const [responsable, setResponsable] = useState('');
  const [fechaRadicacion, setFechaRadicacion] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [etapa, setEtapa] = useState('RECIBIDO');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-[95vw] max-w-[900px] max-h-[90vh] overflow-y-auto">
        <ModalHeaderClean
          titulo="Nuevo Requerimiento"
          subtitulo="Registro de requerimiento de órgano de control"
          icono={Building2}
          colorIcono="blue"
          onClose={onClose}
        />

        <div className="p-6 lg:p-8 space-y-5 lg:space-y-6">
          {/* Grid de 2 columnas en pantallas grandes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-2">Número de Oficio</label>
              <Input
                value={numeroOficio}
                onChange={(e) => setNumeroOficio(e.target.value)}
                placeholder="Ej. CGR-OF-2024-00125"
                className="text-base"
              />
            </div>
            
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-2">Organismo</label>
              <Input
                value={organismo}
                onChange={(e) => setOrganismo(e.target.value)}
                placeholder="Ej. CGR"
                className="text-base"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700 block mb-2">Asunto</label>
            <Textarea
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              placeholder="Ej. Solicitud de información sobre contratación 2024"
              rows={4}
              className="w-full text-base"
            />
          </div>
          
          <div>
            <label className="text-sm font-bold text-gray-700 block mb-2">Responsable</label>
            <Input
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              placeholder="Ej. Dra. María Fernández"
              className="text-base"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-2">Fecha Radicación</label>
              <Input
                type="date"
                value={fechaRadicacion}
                onChange={(e) => setFechaRadicacion(e.target.value)}
                className="text-base"
              />
            </div>
            
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-2">Fecha Vencimiento</label>
              <Input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className="text-base"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700 block mb-2">Etapa</label>
            <select
              value={etapa}
              onChange={(e) => setEtapa(e.target.value as 'RECIBIDO' | 'ANALISIS' | 'RESPUESTA' | 'ENVIADO')}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="RECIBIDO">Recibido</option>
              <option value="ANALISIS">Análisis</option>
              <option value="RESPUESTA">Respuesta</option>
              <option value="ENVIADO">Enviado</option>
            </select>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t p-4 lg:p-6 flex gap-3 justify-end">
          <Button onClick={onClose} variant="outline" className="px-6 py-3 text-base">
            Cancelar
          </Button>
          <Button 
            style={{ background: '#003DA5', color: '#FFFFFF' }}
            className="px-6 py-3 text-base"
            onClick={() => {
              toast.success('Requerimiento creado correctamente');
              onClose();
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear Requerimiento
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Modal Ver Requerimiento
function ModalVerRequerimiento({ requerimiento, onClose }: { requerimiento: Requerimiento; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <ModalHeaderClean
          titulo={requerimiento.id}
          subtitulo={`${requerimiento.organismo} • ${requerimiento.numeroOficio}`}
          icono={Eye}
          colorIcono="blue"
          badgePrincipal={requerimiento.etapa}
          onClose={onClose}
        />

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">ID Requerimiento</label>
              <p className="text-sm font-bold mt-1" style={{ color: '#003DA5' }}>{requerimiento.id}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Número de Oficio</label>
              <p className="text-sm font-bold mt-1">{requerimiento.numeroOficio}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Organismo</label>
              <Badge className="mt-1 bg-blue-50 text-blue-700 border-blue-200">
                {requerimiento.organismo}
              </Badge>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Etapa</label>
              <Badge className="mt-1" variant="outline">
                {requerimiento.etapa}
              </Badge>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Asunto</label>
            <p className="text-sm mt-1 font-medium">{requerimiento.asunto}</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Responsable</label>
            <div className="flex items-center gap-2 mt-1">
              <Avatar className="w-8 h-8">
                <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5' }}>
                  {requerimiento.responsable.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{requerimiento.responsable}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Fecha Radicación</label>
              <p className="text-sm mt-1">{requerimiento.fechaRadicacion.toLocaleDateString('es-CO')}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Fecha Vencimiento</label>
              <p className="text-sm mt-1">{requerimiento.fechaVencimiento.toLocaleDateString('es-CO')}</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Días Restantes</label>
            <Badge className="mt-1 text-sm flex items-center gap-2 w-fit" style={{ 
              color: getSemaforoColor(requerimiento.diasRestantes),
              backgroundColor: `${getSemaforoColor(requerimiento.diasRestantes)}20`,
              border: `1px solid ${getSemaforoColor(requerimiento.diasRestantes)}`
            }}>
              <div className="w-3 h-3 rounded-full" style={{ background: getSemaforoColor(requerimiento.diasRestantes) }} />
              {Math.abs(requerimiento.diasRestantes)} días {requerimiento.diasRestantes < 0 ? 'vencido' : 'restantes'}
            </Badge>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Última Actuación</label>
            <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: '#F0F7FF', border: '1px solid #BFDBFE' }}>
              <p className="text-sm">{requerimiento.ultimaActuacion || 'Sin actuaciones'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-gray-50 border">
              <p className="text-2xl font-bold text-gray-700">{requerimiento.documentos || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Documentos</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gray-50 border">
              <p className="text-2xl font-bold text-gray-700">{requerimiento.diasTotales - requerimiento.diasRestantes}</p>
              <p className="text-xs text-gray-500 mt-1">Días transcurridos</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gray-50 border">
              <p className="text-2xl font-bold text-gray-700">
                {Math.round(((requerimiento.diasTotales - requerimiento.diasRestantes) / requerimiento.diasTotales) * 100)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Progreso</p>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t p-4 flex gap-2 justify-end">
          <Button onClick={onClose} variant="outline">Cerrar</Button>
          <Button style={{ background: '#003DA5', color: '#FFFFFF' }}>
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Modal Documentos
function ModalDocumentos({ requerimiento, onClose }: { requerimiento: Requerimiento; onClose: () => void }) {
  const documentosMock = [
    { nombre: 'Oficio Original CGR-OF-2024-00125.pdf', fecha: new Date(), tipo: 'PDF', tamaño: '2.4 MB' },
    { nombre: 'Anexo 1 - Contratos 2024.xlsx', fecha: new Date(), tipo: 'EXCEL', tamaño: '1.1 MB' },
    { nombre: 'Respuesta Preliminar.docx', fecha: new Date(), tipo: 'WORD', tamaño: '850 KB' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <ModalHeaderClean
          titulo="Documentos del Requerimiento"
          subtitulo={`${requerimiento.id} • ${requerimiento.documentos || 0} archivos`}
          icono={FileText}
          colorIcono="blue"
          onClose={onClose}
        />

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Total de documentos: <span className="font-bold">{requerimiento.documentos || 0}</span>
            </p>
            <Button size="sm" style={{ background: '#003DA5', color: '#FFFFFF' }}>
              <Upload className="w-4 h-4 mr-2" />
              Cargar Documento
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}