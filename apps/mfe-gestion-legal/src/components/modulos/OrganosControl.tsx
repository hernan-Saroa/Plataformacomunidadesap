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
  ChevronDown,
  Calendar, User, FileText, Download, Filter,
  Upload, Paperclip, Save, MoreVertical, Loader2
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Avatar, AvatarFallback } from '@esap-mfe/shared-ui/avatar';
import { toast } from 'sonner';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { Input } from '@esap-mfe/shared-ui/input';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ModalHeaderClean } from './ModalHeaderClean';
import { ocService } from '../../../../services/api/legal.service';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';

// Modales
import { ModalNuevoRequerimiento } from './ModalNuevoRequerimiento';
import { ModalVerRequerimientoOrgano as ModalVerRequerimiento } from './ModalVerRequerimientoOrgano';
import { ModalGestionDocumentos as ModalDocumentos } from './ModalGestionDocumentos';
import { ModalRespuestaOrgano as ModalRespuesta } from './ModalRespuestaOrgano';
import { ModalComentariosOrgano as ModalComentarios } from './ModalComentariosOrgano';
import { ModalSolicitudInsumo } from './ModalSolicitudInsumo';
import { VistaArchivados, ItemArchivado, EstadoArchivado } from '../design-system/VistaArchivados';
import { usePermisos, PERMISOS } from '../config/PermisosContext';

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
  actuaciones?: number;
  descripcion?: string;
  areaResponsable?: string;
}

// MOCK_DATA Eliminado - Se usan datos reales del backend

// Función auxiliar para colores de semáforo
const getSemaforoColor = (dias: number) => {
  if (dias < 0) return '#DC2626';
  if (dias <= 5) return '#F59E0B';
  return '#10B981';
};

const ETAPAS_CONFIG = [
  { valor: 'RECIBIDO' as const, nombre: 'Recibido', color: '#6B7280', bg: '#F3F4F6' },
  { valor: 'EN_ANALISIS' as const, nombre: 'En análisis', color: '#F59E0B', bg: '#FFFBEB' },
  { valor: 'EN_RESPUESTA' as const, nombre: 'En respuesta', color: '#3B82F6', bg: '#EFF6FF' },
  { valor: 'ENVIADO' as const, nombre: 'Enviado', color: '#10B981', bg: '#ECFDF5' },
];

export function OrganosControl() {
  // ✅ Obtener permisos del usuario actual
  const { usuario } = usePermisos();

  const [tipoVista, setTipoVista] = useState<'lista' | 'archivados'>('lista');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroOrganismo, setFiltroOrganismo] = useState<string>('TODOS');
  const [filtroSemaforo, setFiltroSemaforo] = useState<string>('TODOS');
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
      const [data, abogadosData] = await Promise.all([
        ocService.getRequerimientosOC(),
        authService.getAbogadosRolResuelve().catch(() => [] as any[]),
      ]);

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
          descripcion: req.descripcion || '',
          areaResponsable: req.areaResponsable || 'Oficina Jurídica',
          etapa: req.estado as 'RECIBIDO' | 'EN_ANALISIS' | 'EN_RESPUESTA' | 'ENVIADO',
          ultimaActuacion: req.ultimaActuacion || 'Sin información reciente', // TODO: Traer última actuación real
          documentos: req.documentosCount || 0,
          // Map document categories
          docRequerimientos: req.docRequerimientos || 0,
          docRespuestas: req.docRespuestas || 0,
          docSoportes: req.docSoportes || 0,
          docInternos: req.docInternos || 0,
        };
      });

      // Si el usuario tiene rol RESUELVE_GESTION_LEGAL, solo mostrar sus requerimientos asignados
      const currentUser = authService.getCurrentUser() as any;
      const isResuelve = authService.hasRole('RESUELVE_GESTION_LEGAL');
      let requerimientosFiltrados = mappedData;
      if (isResuelve && currentUser) {
        const cuEmail: string = (
          currentUser.email ?? currentUser.person?.email ?? currentUser.mail ?? ''
        ).toLowerCase();
        const cuName: string = (
          currentUser.fullName ??
          currentUser.full_name ??
          currentUser.name ??
          (currentUser.firstName || currentUser.first_name
            ? `${currentUser.firstName ?? currentUser.first_name ?? ''} ${currentUser.lastName ?? currentUser.last_name ?? ''}`.trim()
            : null) ??
          (currentUser.person?.first_name
            ? `${currentUser.person.first_name ?? ''} ${currentUser.person.last_name ?? ''}`.trim()
            : null) ??
          ''
        ).toLowerCase();
        const cuIds = new Set<string>(
          [
            currentUser.id,
            currentUser.id_user,
            currentUser.user?.id,
            currentUser.user?.id_user,
            currentUser.person?.id,
          ].filter(Boolean)
        );

        const myAbogado = Array.isArray(abogadosData)
          ? abogadosData.find((a: any) => {
              if (a.id && cuIds.has(a.id)) return true;
              if (a.rawId && cuIds.has(a.rawId)) return true;
              if (a.authId && cuIds.has(a.authId)) return true;
              if (cuEmail && a.email && (a.email as string).toLowerCase() === cuEmail) return true;
              const aNombre = (a.nombre ?? a.nombreCompleto ?? '').toLowerCase();
              if (cuName && aNombre && aNombre === cuName) return true;
              return false;
            })
          : null;

        if (myAbogado) {
          requerimientosFiltrados = mappedData.filter(r => {
            if (myAbogado.id && r.responsable === myAbogado.id) return true;
            if (myAbogado.rawId && r.responsable === myAbogado.rawId) return true;
            if (myAbogado.nombre && r.responsable === myAbogado.nombre) return true;
            if (myAbogado.nombreCompleto && r.responsable === myAbogado.nombreCompleto) return true;
            return false;
          });
        } else {
          requerimientosFiltrados = mappedData.filter(r => cuIds.has(r.responsable));
        }
      }

      setRequerimientos(requerimientosFiltrados);

      // Cargar archivados
      const archivadosData = await ocService.getArchivados();

      const mappedArchivados: ItemArchivado[] = archivadosData.map((req: any) => ({
        id: req.id,
        codigo: req.radicadoExterno || req.radicadoInterno,
        nombre: req.asunto,
        tipo: 'Requerimiento Órgano Control',
        estado: req.estadoArchivo as EstadoArchivado,
        fechaArchivado: req.fechaArchivo ? new Date(req.fechaArchivo) : new Date(),
        usuarioArchivo: req.usuarioArchivo || 'Desconocido',
        motivoArchivo: req.motivoArchivo || 'Sin motivo',
        metadatos: {
          'Organismo': req.organismo?.nombre || 'Desconocido',
          'Número Oficio': req.radicadoExterno || 'S/N',
          'Tipo Requerimiento': req.tipoRequerimiento || 'General',
          'Fecha Radicación': req.fechaRecepcion ? new Date(req.fechaRecepcion).toLocaleDateString() : 'N/A'
        }
      }));

      setItemsArchivados(mappedArchivados);

    } catch (error) {
      console.error('Error cargando requerimientos:', error);
      toast.error('Error al cargar datos', {
        description: 'No se pudieron obtener los requerimientos del servidor.'
      });
    } finally {
      setLoading(false);
    }
  };
  // ✅ Estado para items archivados/eliminados
  const [itemsArchivados, setItemsArchivados] = useState<ItemArchivado[]>([]);

  // ✅ Función para restaurar un requerimiento archivado
  const handleRestaurar = async (itemId: string) => {
    try {
      await ocService.restaurarRequerimiento(itemId, usuario?.nombre || 'Usuario Sistema');
      toast.success('Requerimiento restaurado', {
        description: 'El requerimiento ha vuelto al tablero principal.'
      });
      fetchRequerimientos(); // Recargar ambas listas
    } catch (error) {
      console.error('Error restaurando:', error);
      toast.error('Error al restaurar', {
        description: 'No se pudo restaurar el requerimiento.'
      });
    }
  };

  // ✅ Función para eliminar permanentemente un requerimiento
  const handleEliminarPermanente = async (itemId: string) => {
    try {
      await ocService.eliminarRequerimientoPermanente(itemId, usuario?.nombre || 'Usuario Sistema');
      toast.success('Requerimiento eliminado', {
        description: 'El requerimiento ha sido eliminado permanentemente.'
      });
      fetchRequerimientos();
    } catch (error) {
      console.error('Error eliminando:', error);
      toast.error('Error al eliminar', {
        description: 'No se pudo eliminar el requerimiento.'
      });
    }
  };

  // Handler para mover requerimientos entre etapas
  // const handleMoverRequerimiento = (requerimientoId: string, nuevaEtapa: 'RECIBIDO' | 'ANALISIS' | 'RESPUESTA' | 'ENVIADO') => {
  //   setRequerimientos((prevRequerimientos) => 
  //     prevRequerimientos.map((req) => 
  //       req.id === requerimientoId 
  //         ? { ...req, etapa: nuevaEtapa }
  //         : req
  //     )
  //   );

  //   toast.success('Requerimiento movido exitosamente', {
  //     description: `Cambiado a etapa: ${nuevaEtapa}`
  //   });
  // };

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
        title="Órganos de Control"
        subtitle="Gestión integral de requerimientos de órganos de control"
        toggleView={{
          current: tipoVista,
          onChange: (view) => setTipoVista(view as 'lista' | 'archivados'),
          options: [
            { label: 'Lista', icon: <List className="w-4 h-4" />, value: 'lista' },
            { label: 'Archivados', icon: <Archive className="w-4 h-4" />, value: 'archivados' }
          ]
        }}
        buttons={addBtnsPermission()}
        infoTooltip={
          <ModuleInfoTooltip
            title="Guía de Órganos de Control"
            variant="icon"
            sections={[
              {
                label: "Propósito",
                content: "Gestión centralizada de requerimientos de Contraloría, Procuraduría, Fiscalía y demás órganos de control.",
                type: "info"
              },
              {
                label: "Flujo de trabajo",
                content: "Recibido → En análisis → En respuesta → Enviado. Puede actualizar la etapa desde la lista sin salir del módulo.",
                type: "premium"
              },
              {
                label: "Semáforo de términos",
                content: "Rojo: vencido. Amarillo: 0-5 días. Verde: más de 5 días.",
                type: "warning"
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
            label: 'Vencidos',
            value: vencidos,
            icon: <AlertTriangle className="w-5 h-5" />,
            color: 'red'
          },
          {
            label: 'Urgentes',
            value: urgentes,
            icon: <AlertCircle className="w-5 h-5" />,
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

      {/* Vista Lista */}
      {tipoVista === 'lista' && (
        <VistaLista
          requerimientos={requerimientos}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filtroOrganismo={filtroOrganismo}
          setFiltroOrganismo={setFiltroOrganismo}
          filtroSemaforo={filtroSemaforo}
          setFiltroSemaforo={setFiltroSemaforo}
          paginaActual={paginaActual}
          setPaginaActual={setPaginaActual}
          itemsPorPagina={itemsPorPagina}
          onCambiarEtapa={authService.hasPermission(Permissions.GESTION_LEGAL_ORGANOS_CONTROL_ELABORAR) ? handleMoverRequerimiento : undefined}
          onVerRequerimiento={handleVerRequerimiento}
          onDocumentos={handleDocumentos}
          onRespuesta={handleRespuesta}
          onComentarios={handleComentarios}
        />
      )}

      {/* Vista Archivados */}
      {tipoVista === 'archivados' && (
        <VistaArchivados
          items={itemsArchivados}
          moduloNombre="Órganos de Control"
          onRestaurar={authService.hasPermission(Permissions.GESTION_LEGAL_ORGANOS_CONTROL_DELETE) ? handleRestaurar : undefined}
          onEliminarPermanente={authService.hasPermission(Permissions.GESTION_LEGAL_ORGANOS_CONTROL_DELETE) ? handleEliminarPermanente : undefined}
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
          nombreRequerimiento={requerimientoSeleccionado.numeroOficio}
        />
      )}

      {modalRespuestaOpen && requerimientoSeleccionado && (
        <ModalRespuesta
          isOpen={modalRespuestaOpen}
          onClose={() => setModalRespuestaOpen(false)}
          requerimientoId={requerimientoSeleccionado.id}
          organismoNombre={requerimientoSeleccionado.organismo}
          onSuccess={fetchRequerimientos}
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
          <div className="mt-3 mb-2 p-2 rounded-lg" style={{ backgroundColor: '#F0F7FF', border: '1px solid #BFDBFE' }}>
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
              <Archive className="w-3 h-3 mr-1" />
              Ver Requerimiento
            </Button>

            <div className="grid grid-cols-2 gap-1">
              <Button
                onClick={() => onRespuesta(req)}
                size="sm"
                variant="outline"
                className="text-[11px] px-1 justify-center"
              >
                <Send className="w-3 h-3 mr-0.5" />
                Respuesta
              </Button>

              <Button
                onClick={() => onDocumentos(req)}
                size="sm"
                variant="outline"
                className="text-[11px] px-1 justify-center"
              >
                <FileCheck className="w-3 h-3 mr-0.5" />
                Docs
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
  filtroSemaforo,
  setFiltroSemaforo,
  paginaActual,
  setPaginaActual,
  itemsPorPagina,
  onCambiarEtapa,
  onVerRequerimiento,
  onDocumentos,
  onRespuesta,
  onComentarios
}: {
  requerimientos: Requerimiento[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filtroOrganismo: string;
  setFiltroOrganismo: (organismo: string) => void;
  filtroSemaforo: string;
  setFiltroSemaforo: (filtro: string) => void;
  paginaActual: number;
  setPaginaActual: (pagina: number) => void;
  itemsPorPagina: number;
  onCambiarEtapa?: (reqId: string, nuevaEtapa: 'RECIBIDO' | 'EN_ANALISIS' | 'EN_RESPUESTA' | 'ENVIADO') => void;
  onVerRequerimiento: (req: Requerimiento) => void;
  onDocumentos: (req: Requerimiento) => void;
  onRespuesta: (req: Requerimiento) => void;
  onComentarios: (req: Requerimiento) => void;
}) {
  const organos = Array.from(new Set(requerimientos.map((r) => r.organismo)));

  const requerimientosFiltrados = requerimientos
    .filter((req) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = !q ||
        req.asunto.toLowerCase().includes(q) ||
        req.id.toLowerCase().includes(q) ||
        req.numeroOficio.toLowerCase().includes(q) ||
        req.organismo.toLowerCase().includes(q) ||
        req.responsable.toLowerCase().includes(q);

      const matchesOrganismo = filtroOrganismo === 'TODOS' || req.organismo === filtroOrganismo;

      const matchesSemaforo =
        filtroSemaforo === 'TODOS' ||
        (filtroSemaforo === 'VENCIDO' && req.diasRestantes < 0) ||
        (filtroSemaforo === 'URGENTE' && req.diasRestantes >= 0 && req.diasRestantes <= 5) ||
        (filtroSemaforo === 'EN_TERMINO' && req.diasRestantes > 5);

      return matchesSearch && matchesOrganismo && matchesSemaforo;
    })
    .sort((a, b) => a.diasRestantes - b.diasRestantes);

  const requerimientosPaginados = requerimientosFiltrados.slice((paginaActual - 1) * itemsPorPagina, paginaActual * itemsPorPagina);

  const total = requerimientosFiltrados.length;
  const totalPaginas = Math.ceil(total / itemsPorPagina);

  return (
    <div className="space-y-4">
      <ModuleFilters
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por ID, oficio, asunto, organismo o responsable..."
        filters={[
          {
            type: 'select',
            value: filtroOrganismo,
            onChange: setFiltroOrganismo,
            options: [
              { value: 'TODOS', label: 'Todos los organismos' },
              ...organos.map((o) => ({ value: o, label: o }))
            ]
          },
          {
            type: 'select',
            value: filtroSemaforo,
            onChange: setFiltroSemaforo,
            options: [
              { value: 'TODOS', label: 'Todos los estados' },
              { value: 'VENCIDO', label: 'Vencidos' },
              { value: 'URGENTE', label: 'Urgentes (0-5 días)' },
              { value: 'EN_TERMINO', label: 'En término (>5 días)' }
            ]
          }
        ]}
        totalItems={requerimientos.length}
        filteredItems={requerimientosFiltrados.length}
        onClearFilters={() => {
          setSearchTerm('');
          setFiltroOrganismo('TODOS');
          setFiltroSemaforo('TODOS');
          setPaginaActual(1);
        }}
        counterText={`Mostrando ${requerimientosFiltrados.length} de ${requerimientos.length} requerimientos`}
      />

      <Card className="overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">ID / Oficio</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Organismo</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Asunto</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Responsable</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Término</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Etapa</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requerimientosPaginados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No se encontraron requerimientos</p>
                  </td>
                </tr>
              )}

              {requerimientosPaginados.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-sm" style={{ color: '#003DA5' }}>{req.numeroOficio}</p>
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
                      {req.diasRestantes < 0 ? `${Math.abs(req.diasRestantes)}d vencido` : `${req.diasRestantes}d restantes`}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {onCambiarEtapa ? (
                      <SelectorEtapa
                        etapaActual={req.etapa}
                        onChange={(nuevaEtapa) => onCambiarEtapa(req.id, nuevaEtapa)}
                      />
                    ) : (() => {
                      const cfg = ETAPAS_CONFIG.find(e => e.valor === req.etapa) || ETAPAS_CONFIG[0];
                      return (
                        <span className="text-xs font-semibold rounded-lg pl-3 pr-3 py-1.5 border" style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: `${cfg.color}40` }}>
                          {cfg.nombre}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-0.5">
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
                        onClick={() => onDocumentos(req)}
                        title="Documentos"
                      >
                        <FileCheck className="w-4 h-4 text-gray-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onComentarios(req)}
                        title="Comentarios"
                      >
                        <MessageSquare className="w-4 h-4 text-gray-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

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
    </div>
  );
}

function SelectorEtapa({
  etapaActual,
  onChange
}: {
  etapaActual: Requerimiento['etapa'];
  onChange: (etapa: Requerimiento['etapa']) => void;
}) {
  const config = ETAPAS_CONFIG.find((e) => e.valor === etapaActual) || ETAPAS_CONFIG[0];

  return (
    <div className="relative">
      <select
        value={etapaActual}
        onChange={(e) => onChange(e.target.value as Requerimiento['etapa'])}
        className="appearance-none text-xs font-semibold rounded-lg pl-3 pr-7 py-1.5 border cursor-pointer transition-all focus:ring-2 focus:ring-blue-300 focus:outline-none"
        style={{
          color: config.color,
          backgroundColor: config.bg,
          borderColor: `${config.color}40`
        }}
      >
        {ETAPAS_CONFIG.map((e) => (
          <option key={e.valor} value={e.valor}>{e.nombre}</option>
        ))}
      </select>
      <ChevronDown
        className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: config.color }}
      />
    </div>
  );
}
