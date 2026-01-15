/**
 * ModuloProcesosCoactivosV3 - MOD-07: Procesos Coactivos
 * VERSIÓN COMPLETA CON TODAS LAS FUNCIONALIDADES REALES + DRAG AND DROP
 */

import { useState, useEffect } from 'react';
import {
  Plus, FileText, FolderOpen, AlertTriangle, Clock, Calendar,
  User, Eye, ChevronDown, DollarSign, TrendingUp, X,
  AlertCircle, CheckCircle, List, Columns3, ThumbsUp,
  Scale, Filter, Search, Download, Upload, RefreshCw, Paperclip,
  MessageSquare, FileCheck, Send, Archive, Mail, Edit, Star, AlertOctagon,
  Move
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { toast } from 'sonner';
import { CardSIGL } from '../design-system/CardSIGL';
import { BadgeSIGL } from '../design-system/BadgeSIGL';
import { ButtonSIGL } from '../design-system/ButtonSIGL';
import { ModalSIGL } from '../design-system/ModalSIGL';
import {
  procesosCoactivosService,
  ProcesoCoactivo as ProcesoCoactivoAPI,
  ProcesoCoactivoStats,
  ProcesoCoactivoAdjunto
} from '../../../../services/api/legal.service';

// ============ TIPOS ============
interface ProcesoCoactivo {
  id: string;
  radicado: string;
  deudor: {
    nombre: string;
    identificacion: string;
    telefono: string;
    email: string;
    direccion: string;
  };
  obligacion: {
    concepto: string;
    valor: number;
    fechaVencimiento: Date;
    diasVencidos: number;
  };
  estado: 'IDENTIFICADO' | 'PERSUASIVO' | 'PREJURIDICO' | 'MANDAMIENTO' | 'EMBARGO' | 'FINALIZADO';
  fechaCreacion: Date;
  ultimaActuacion: Date;
  responsable: string;
  documentosAdjuntos: number;
  notificacionesEnviadas: number;
  observaciones?: string;
}

// Función helper para mapear datos del API al formato del componente
const mapApiToLocal = (apiProceso: ProcesoCoactivoAPI): ProcesoCoactivo => {
  const hoy = new Date();
  const fechaVencimiento = new Date(apiProceso.obligacion.fechaVencimiento);
  const diasVencidos = Math.max(0, Math.floor((hoy.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24)));

  return {
    id: apiProceso.id,
    radicado: apiProceso.radicado,
    deudor: {
      nombre: apiProceso.deudor.nombre || '',
      identificacion: apiProceso.deudor.identificacion || '',
      telefono: apiProceso.deudor.telefono || '',
      email: apiProceso.deudor.email || '',
      direccion: apiProceso.deudor.direccion || ''
    },
    obligacion: {
      concepto: apiProceso.obligacion.concepto || '',
      valor: apiProceso.obligacion.valor || 0,
      fechaVencimiento: fechaVencimiento,
      diasVencidos: diasVencidos
    },
    estado: apiProceso.estado,
    fechaCreacion: new Date(apiProceso.fechaCreacion),
    ultimaActuacion: apiProceso.ultimaActuacion ? new Date(apiProceso.ultimaActuacion) : new Date(),
    responsable: apiProceso.responsable || 'Sin asignar',
    documentosAdjuntos: apiProceso.documentosAdjuntos || 0,
    notificacionesEnviadas: apiProceso.notificacionesEnviadas || 0,
    observaciones: apiProceso.observaciones
  };
};

// ============ COMPONENTE PRINCIPAL ============
export function ModuloProcesosCoactivosV3() {
  const [procesos, setProcesos] = useState<ProcesoCoactivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProcesoCoactivoStats>({ total: 0, activos: 0, criticos: 0, totalMonto: 0, porEstado: {} });
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [modalNuevoProceso, setModalNuevoProceso] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<ProcesoCoactivo | null>(null);
  const [procesoEditar, setProcesoEditar] = useState<ProcesoCoactivo | null>(null);
  const [ordenamiento, setOrdenamiento] = useState<'reciente' | 'antiguo' | 'monto-mayor' | 'monto-menor'>('reciente');

  // Detectar tamaño de pantalla
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

  // Cargar datos desde la API
  const loadProcesos = async () => {
    try {
      setLoading(true);
      const [procesosData, statsData] = await Promise.all([
        procesosCoactivosService.getAll().catch(() => []),
        procesosCoactivosService.getStats().catch(() => ({ total: 0, activos: 0, criticos: 0, totalMonto: 0, porEstado: {} }))
      ]);
      // Asegurar que procesosData sea un array
      const procesosArray = Array.isArray(procesosData) ? procesosData : [];
      setProcesos(procesosArray.map(mapApiToLocal));
      setStats(statsData);
    } catch (error) {
      console.error('Error cargando procesos coactivos:', error);
      setProcesos([]);
      setStats({ total: 0, activos: 0, criticos: 0, totalMonto: 0, porEstado: {} });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProcesos();
  }, []);

  // Filtrar y ordenar procesos
  const procesosFiltrados = procesos
    .filter(p => {
      const cumpleFiltro = filtroEstado === 'TODOS' || p.estado === filtroEstado;
      const cumpleBusqueda = busqueda === '' ||
        p.deudor.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.deudor.identificacion.includes(busqueda) ||
        p.radicado.toLowerCase().includes(busqueda.toLowerCase());
      return cumpleFiltro && cumpleBusqueda;
    })
    .sort((a, b) => {
      switch (ordenamiento) {
        case 'reciente':
          return b.fechaCreacion.getTime() - a.fechaCreacion.getTime();
        case 'antiguo':
          return a.fechaCreacion.getTime() - b.fechaCreacion.getTime();
        case 'monto-mayor':
          return b.obligacion.valor - a.obligacion.valor;
        case 'monto-menor':
          return a.obligacion.valor - b.obligacion.valor;
        default:
          return 0;
      }
    });

  const handleVerDetalle = (proceso: ProcesoCoactivo) => {
    setProcesoSeleccionado(proceso);
    setModalExpediente(true);
  };

  const handleEditarProceso = (proceso: ProcesoCoactivo) => {
    setProcesoEditar(proceso);
    setModalNuevoProceso(true);
  };

  const handleEliminarProceso = async (procesoId: string) => {
    const proceso = procesos.find(p => p.id === procesoId);
    if (!proceso) return;

    if (confirm(`¿Está seguro de eliminar el proceso "${proceso.radicado}"?\n\nEsta acción no se puede deshacer.`)) {
      try {
        await procesosCoactivosService.delete(procesoId);
        toast.success('Proceso eliminado', {
          description: `El proceso ${proceso.radicado} ha sido eliminado`,
          duration: 3000
        });
        loadProcesos(); // Recargar lista y stats
      } catch (error) {
        console.error('Error eliminando proceso:', error);
        toast.error('Error al eliminar el proceso');
      }
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Procesos Coactivos</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              Gestión de cobro coactivo de obligaciones
            </p>
          </div>
          <ButtonSIGL
            onClick={() => {
              setProcesoEditar(null);
              setModalNuevoProceso(true);
            }}
            className="flex-shrink-0"
            icon={<Plus className="w-4 h-4" />}
          >
            {!isMobile && 'Nuevo Proceso'}
          </ButtonSIGL>
        </div>

      {/* Métricas */}
      <ModuleMetrics
        metrics={[
          {
            label: 'Total Procesos',
            value: totalProcesos,
            icon: <FileText className="w-4 h-4 text-orange-600" />,
            color: 'orange'
          },
          {
            label: 'Criticos',
            value: procesosCriticos,
            icon: <AlertCircle className="w-4 h-4 text-red-600" />,
            color: 'red'
          },
          {
            label: 'En Término',
            value: procesosEnTermino,
            icon: <CheckCircle className="w-4 h-4 text-green-600" />,
            color: 'green'
          }
        ]}
      />

      {/* Filtros */}
      <ModuleFilters
        filters={[
          {
            label: 'Etapa',
            value: filtroEtapa,
            onChange: (value) => setFiltroEtapa(value as string),
            options: [
              { label: 'Todas', value: 'TODAS' },
              { label: 'Identificado', value: 'IDENTIFICADO' },
              { label: 'Persuasivo', value: 'PERSUASIVO' },
              { label: 'Prejurídico', value: 'PREJURIDICO' },
              { label: 'Mandamiento', value: 'MANDAMIENTO' }
            ]
          },
          {
            label: 'Monto',
            value: filtroMonto,
            onChange: (value) => setFiltroMonto(value as string),
            options: [
              { label: 'Todos', value: 'TODOS' },
              { label: 'Menos de $100M', value: 'MENOS_100M' },
              { label: 'Entre $100M y $500M', value: 'ENTRE_100M_500M' },
              { label: 'Más de $500M', value: 'MAS_500M' }
            ]
          }
        ]}
      />

      {/* Tablero Kanban */}
      {tipoVista === 'kanban' && (
        <DndProvider backend={HTML5Backend}>
          <div className="relative">
            {/* Indicador de scroll en mobile/tablet */}
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
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#CBD5E0 #F7FAFC',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {etapas.map((etapa) => (
                <ColumnaKanban
                  key={etapa.nombre}
                  etapa={etapa}
                  isMobile={isMobile}
                  isTablet={isTablet}
                  onComunicaciones={handleComunicaciones}
                  onExpediente={handleExpediente}
                  onDocumentos={handleDocumentos}
                  onPagos={handlePagos}
                  onMoverProceso={handleMoverProceso}
                />
              ))}
            </div>
          </div>
        </DndProvider>
      )}

      {/* Vista de Lista */}
      {tipoVista === 'lista' && (
        <VistaListaProcesosCoactivos
          procesos={procesosCoactivosMock}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      )}

      {/* Modal Crear Proceso */}
      <ModalCrearProcesoCoactivo
        isOpen={modalCrear}
        onClose={() => setModalCrear(false)}
        onCrear={(nuevoProceso) => {
          toast.success(`✅ Proceso Coactivo creado: ${nuevoProceso.id}`, {
            description: `Deudor: ${nuevoProceso.deudor.nombre}`
          });
          setModalCrear(false);
        }}
      />

      {/* Modal Comunicaciones */}
      {modalComunicaciones && procesoSeleccionado && (
        <ModalComunicaciones
          proceso={procesoSeleccionado}
          onClose={() => setModalComunicaciones(false)}
        />
      )}

      {/* Modal Expediente */}
      {modalExpediente && procesoSeleccionado && (
        <ModalExpediente
          proceso={procesoSeleccionado}
          onClose={() => setModalExpediente(false)}
        />
      )}

      {/* Modal Documentos */}
      {modalDocumentos && procesoSeleccionado && (
        <ModalDocumentos
          proceso={procesoSeleccionado}
          onClose={() => setModalDocumentos(false)}
        />
      )}

      {/* Modal Pagos */}
      {modalPagos && procesoSeleccionado && (
        <ModalPagos
          proceso={procesoSeleccionado}
          onClose={() => setModalPagos(false)}
        />
      )}
    </div>
  );
}

// ==================== COMPONENTE COLUMNA KANBAN ====================
interface ColumnaKanbanProps {
  etapa: {
    nombre: string;
    valor: 'IDENTIFICADO' | 'PERSUASIVO' | 'PREJURIDICO' | 'MANDAMIENTO';
    color: string;
    icono: React.ReactNode;
    diasEstimados: number;
    procesos: ProcesoCoactivo[];
  };
  isMobile: boolean;
  isTablet: boolean;
  onComunicaciones: (proceso: ProcesoCoactivo) => void;
  onExpediente: (proceso: ProcesoCoactivo) => void;
  onDocumentos: (proceso: ProcesoCoactivo) => void;
  onPagos: (proceso: ProcesoCoactivo) => void;
  onMoverProceso: (procesoId: string, nuevaEtapa: 'IDENTIFICADO' | 'PERSUASIVO' | 'PREJURIDICO' | 'MANDAMIENTO') => void;
}

function ColumnaKanban({ etapa, isMobile, isTablet, onComunicaciones, onExpediente, onDocumentos, onPagos, onMoverProceso }: ColumnaKanbanProps) {
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.PROCESO,
    drop: (item: { id: string }) => onMoverProceso(item.id, etapa.valor),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  const backgroundColor = isOver ? '#F0F7FF' : '#FFFFFF';
  const borderColor = isOver ? '#2962FF' : 'transparent';

  return (
    <div
      className="flex-shrink-0"
      style={{ width: 320 }}
    >
      <Card className="h-full border border-gray-200 bg-white">
        {/* Header de Columna */}
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
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {etapa.diasEstimados} días
                </p>
              </div>
            </div>
            <Badge className={`font-semibold ${isMobile ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'} bg-white border border-gray-200 text-gray-700`}>
              {etapa.procesos.length}
            </Badge>
          </div>
        </div>

      {/* Lista de Procesos */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {procesosFiltrados.map((proceso, index) => (
            <motion.div
              key={proceso.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
            >
              <TarjetaProceso
                proceso={proceso}
                onVerDetalle={handleVerDetalle}
                onEditar={handleEditarProceso}
                onEliminar={handleEliminarProceso}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {procesosFiltrados.length === 0 && (
          <CardSIGL className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              No se encontraron procesos con los filtros seleccionados
            </p>
          </CardSIGL>
        )}
      </div>

      {/* Modal Nuevo Proceso */}
      <ModalNuevoProceso
        isOpen={modalNuevoProceso}
        onClose={() => {
          setModalNuevoProceso(false);
          setProcesoEditar(null);
        }}
        onCrear={() => {
          setModalNuevoProceso(false);
          setProcesoEditar(null);
          loadProcesos(); // Recargar lista y stats desde la API
        }}
        procesoEditar={procesoEditar}
      />

      {/* Modal Detalle */}
      {procesoSeleccionado && (
        <ModalDetalleProceso
          proceso={procesoSeleccionado}
          isOpen={modalDetalle}
          onClose={() => {
            setModalDetalle(false);
            setProcesoSeleccionado(null);
          }}
          onUpdate={loadProcesos}
        />
      )}
    </div>
  );
}

// ============ COMPONENTES AUXILIARES ============

// Tarjeta de Proceso
function TarjetaProceso({
  proceso,
  onVerDetalle,
  onEditar,
  onEliminar
}: {
  proceso: ProcesoCoactivo;
  onVerDetalle: (proceso: ProcesoCoactivo) => void;
  onEditar: (proceso: ProcesoCoactivo) => void;
  onEliminar: (id: string) => void;
}) {
  const getEstadoConfig = (estado: ProcesoCoactivo['estado']) => {
    const configs = {
      IDENTIFICADO: { label: 'Identificado', color: 'bg-gray-100 text-gray-700 border-gray-300' },
      PERSUASIVO: { label: 'Persuasivo', color: 'bg-amber-100 text-amber-700 border-amber-300' },
      PREJURIDICO: { label: 'Prejurídico', color: 'bg-blue-100 text-blue-700 border-blue-300' },
      MANDAMIENTO: { label: 'Mandamiento', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
      EMBARGO: { label: 'Embargo', color: 'bg-purple-100 text-purple-700 border-purple-300' },
      FINALIZADO: { label: 'Finalizado', color: 'bg-green-100 text-green-700 border-green-300' }
    };
    return configs[estado];
  };

  const estadoConfig = getEstadoConfig(proceso.estado);
  const esCritico = proceso.obligacion.diasVencidos > 180;

  return (
    <CardSIGL className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                {proceso.radicado}
              </h3>
              {esCritico && (
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-gray-600 mb-1">{proceso.deudor.nombre}</p>
            <p className="text-xs text-gray-500">CC: {proceso.deudor.identificacion}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${estadoConfig.color}`}>
              {estadoConfig.label}
            </span>
          </div>
        </div>

          {/* Deudor */}
          <div className="mb-2 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">👤 Deudor:</p>
            <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
              {proceso.deudor}
            </p>
          </div>

          {/* Profesional Asignado */}
          <div className="mb-2 pb-2 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Avatar className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} flex-shrink-0`}>
                <AvatarFallback 
                  className="text-xs"
                  style={{ background: '#E0EDFF', color: '#003DA5' }}
                >
                  {proceso.responsable.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">👨‍💼 Responsable:</p>
                <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
                  {proceso.responsable}
                </p>
              </div>
            </div>
          </div>

          {/* Semáforo */}
          <div className="flex items-center gap-1.5 mb-2">
            <Badge 
              className="text-xs flex items-center gap-1 font-semibold bg-gray-50 border border-gray-200"
              style={{ color: semaforo.color }}
            >
              <div 
                className="w-2 h-2 rounded-full"
                style={{ background: semaforo.color }}
              />
              {proceso.diasHastaPrescripcion} días prescripción
            </Badge>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
              <p className="text-xs font-bold text-gray-700">{proceso.montoCapital.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p>
              <p className="text-xs text-gray-500">Capital</p>
            </div>
            <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
              <p className="text-xs font-bold text-gray-700">{proceso.montoIntereses.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p>
              <p className="text-xs text-gray-500">Intereses</p>
            </div>
          </div>

          {/* Última Actuación - BLOQUE AZUL */}
          <div className="mb-2 p-2 rounded-lg" style={{ backgroundColor: '#F0F7FF', border: '1px solid #BFDBFE' }}>
            <p className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: '#003DA5' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#003DA5' }}></span>
              ÚLTIMA ACTUACIÓN
            </p>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-700 line-clamp-2 mb-1`}>
              {ultimaActuacion}
            </p>
            <p className="text-xs text-gray-500">
              📅 {proceso.fechaActualizacion.toLocaleDateString('es-CO')}
            </p>
          </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-2">
          <ButtonSIGL
            variant="primary"
            size="md"
            onClick={() => onVerDetalle(proceso)}
            className="flex-none min-w-[110px]"
            icon={<Eye className="w-4 h-4" />}
          >
            Ver Detalle
          </ButtonSIGL>
          <ButtonSIGL
            variant="secondary"
            size="md"
            onClick={() => onEditar(proceso)}
            className="flex-none min-w-[110px]"
            icon={<Edit className="w-4 h-4" />}
          >
            Editar
          </ButtonSIGL>
          <ButtonSIGL
            variant="danger"
            size="md"
            onClick={() => onEliminar(proceso.id)}
            className="flex-none min-w-[110px]"
            icon={<Trash2 className="w-4 h-4" />}
          >
            Eliminar
          </ButtonSIGL>
        </div>
      </div>
    </CardSIGL>
  );
}

// Modal Nuevo Proceso (y Edición)
function ModalNuevoProceso({
  isOpen,
  onClose,
  onCrear,
  procesoEditar
}: {
  isOpen: boolean;
  onClose: () => void;
  onCrear: () => void;
  procesoEditar?: ProcesoCoactivo | null;
}) {
  const [formData, setFormData] = useState({
    deudorNombre: '',
    deudorIdentificacion: '',
    deudorTelefono: '',
    deudorEmail: '',
    deudorDireccion: '',
    concepto: '',
    valor: '',
    fechaVencimiento: '',
    responsable: '',
    observaciones: '',
    estado: 'IDENTIFICADO'
  });
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Limpiar archivos al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      setSelectedFiles([]);
      setDragActive(false);
    }
  }, [isOpen]);

  // Cargar datos si estamos editando
  useEffect(() => {
    if (procesoEditar) {
      setFormData({
        deudorNombre: procesoEditar.deudor.nombre,
        deudorIdentificacion: procesoEditar.deudor.identificacion,
        deudorTelefono: procesoEditar.deudor.telefono,
        deudorEmail: procesoEditar.deudor.email,
        deudorDireccion: procesoEditar.deudor.direccion,
        concepto: procesoEditar.obligacion.concepto,
        valor: procesoEditar.obligacion.valor.toString(),
        fechaVencimiento: new Date(procesoEditar.obligacion.fechaVencimiento).toISOString().split('T')[0],
        responsable: procesoEditar.responsable,
        observaciones: procesoEditar.observaciones || '',
        estado: procesoEditar.estado
      });
    } else {
      setFormData({
        deudorNombre: '',
        deudorIdentificacion: '',
        deudorTelefono: '',
        deudorEmail: '',
        deudorDireccion: '',
        concepto: '',
        valor: '',
        fechaVencimiento: '',
        responsable: '',
        observaciones: '',
        estado: 'IDENTIFICADO'
      });
    }
  }, [procesoEditar, isOpen]);

  const handleSubmit = async () => {
    if (!formData.deudorNombre || !formData.deudorIdentificacion || !formData.concepto || !formData.valor || !formData.fechaVencimiento) {
      toast.error('Campos requeridos', {
        description: 'Por favor complete todos los campos obligatorios'
      });
      return;
    }

    try {
      setLoading(true);
      const data = {
        deudor: {
          nombre: formData.deudorNombre,
          identificacion: formData.deudorIdentificacion,
          telefono: formData.deudorTelefono,
          email: formData.deudorEmail,
          direccion: formData.deudorDireccion
        },
        obligacion: {
          concepto: formData.concepto,
          valor: parseFloat(formData.valor),
          fechaVencimiento: formData.fechaVencimiento
        },
        responsable: formData.responsable || undefined,
        observaciones: formData.observaciones || undefined,
        estado: formData.estado as any
      };

      let procesoId = '';
      if (procesoEditar) {
        await procesosCoactivosService.update(procesoEditar.id, data);
        procesoId = procesoEditar.id;
        toast.success('Proceso actualizado exitosamente');
      } else {
        const newProceso = await procesosCoactivosService.create(data);
        procesoId = newProceso.id;
        toast.success('Proceso creado exitosamente');
      }

      // Subir archivos si existen
      if (selectedFiles.length > 0 && procesoId) {
        try {
          // Toast de progreso
          toast.loading('Subiendo documentos...', { id: 'upload-toast' });

          await Promise.all(selectedFiles.map(file =>
            procesosCoactivosService.uploadAdjunto(procesoId, file)
          ));

          toast.dismiss('upload-toast');
          toast.success(`${selectedFiles.length} documento(s) adjuntado(s) correctamente`);
        } catch (uploadError) {
          console.error('Error subiendo archivos:', uploadError);
          toast.dismiss('upload-toast');
          toast.error('El proceso se guardó, pero hubo un error al subir algunos documentos');
        }
      }

      onCrear();
    } catch (error) {
      console.error('Error guardando proceso:', error);
      toast.error(procesoEditar ? 'Error al actualizar el proceso' : 'Error al crear el proceso');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <ModalSIGL
      isOpen={isOpen}
      onClose={onClose}
      title={procesoEditar ? `Editar Proceso ${procesoEditar.radicado}` : "Nuevo Proceso Coactivo"}
      size="large"
    >
      <div className="space-y-6">
        {/* Información del Deudor */}
        <section>
          <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
            <div className="p-1.5 bg-blue-50 rounded-md text-blue-600">
              <User className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">Información del Deudor</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Nombre Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.deudorNombre}
                onChange={(e) => setFormData({ ...formData, deudorNombre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                placeholder="Ej: Juan Carlos Pérez"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Identificación <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.deudorIdentificacion}
                onChange={(e) => setFormData({ ...formData, deudorIdentificacion: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                placeholder="Ej: 1.012.345.678"
                disabled={!!procesoEditar}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Teléfono</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.deudorTelefono}
                  onChange={(e) => setFormData({ ...formData, deudorTelefono: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  placeholder="+57 300 123 4567"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Email</label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.deudorEmail}
                  onChange={(e) => setFormData({ ...formData, deudorEmail: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-700">Dirección</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.deudorDireccion}
                  onChange={(e) => setFormData({ ...formData, deudorDireccion: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  placeholder="Dirección de residencia o notificaciones"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Información de la Obligación */}
        <section>
          <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
            <div className="p-1.5 bg-green-50 rounded-md text-green-600">
              <DollarSign className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">Detalle de la Obligación</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Concepto de Cobro <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.concepto}
                onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-shadow"
                placeholder="Ej: Impuesto Predial 2024"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Valor Total (COP) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-shadow"
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Fecha Vencimiento <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.fechaVencimiento}
                onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-shadow"
              />
            </div>
          </div>
        </section>

        {/* Documentos y Adicionales */}
        <section>
          <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
            <div className="p-1.5 bg-purple-50 rounded-md text-purple-600">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">Soportes y Anexos</h3>
          </div>

          <div className="space-y-4">
            {/* Aréa de Carga de Archivos */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className={`w-8 h-8 mb-2 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
              <p className="text-sm font-medium text-gray-700">
                Arrastra y suelta archivos aquí, o{' '}
                <label className="text-blue-600 hover:text-blue-700 cursor-pointer hover:underline">
                  examina
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                      }
                    }}
                  />
                </label>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Soporta PDF, imágenes y documentos de Office
              </p>
            </div>

            {/* Lista de archivos seleccionados */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="p-1.5 bg-gray-100 rounded text-gray-500">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(idx)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Quitar archivo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Responsable Asignado</label>
                <input
                  type="text"
                  value={formData.responsable}
                  onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow"
                  placeholder="Ej: Dra. María Fernández"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Observaciones Iniciales</label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  rows={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow resize-none"
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>
          </div>
        </section>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <ButtonSIGL variant="secondary" onClick={onClose}>
            Cancelar
          </ButtonSIGL>
          <ButtonSIGL onClick={handleSubmit} disabled={loading} className="min-w-[120px]">
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </span>
            ) : (
              procesoEditar ? 'Actualizar' : 'Crear Proceso'
            )}
          </ButtonSIGL>
        </div>
      </Card>
    </div>
  );
}

// Modal Detalle del Proceso
function ModalDetalleProceso({
  proceso,
  isOpen,
  onClose,
  onUpdate
}: {
  proceso: ProcesoCoactivo;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}) {
  const estadoConfig = {
    IDENTIFICADO: { label: 'Identificado', color: 'bg-gray-100 text-gray-700' },
    PERSUASIVO: { label: 'Persuasivo', color: 'bg-amber-100 text-amber-700' },
    PREJURIDICO: { label: 'Prejurídico', color: 'bg-blue-100 text-blue-700' },
    MANDAMIENTO: { label: 'Mandamiento', color: 'bg-indigo-100 text-indigo-700' },
    EMBARGO: { label: 'Embargo', color: 'bg-purple-100 text-purple-700' },
    FINALIZADO: { label: 'Finalizado', color: 'bg-green-100 text-green-700' }
  }[proceso.estado];

  const [adjuntos, setAdjuntos] = useState<ProcesoCoactivoAdjunto[]>([]);
  const [loadingAdjuntos, setLoadingAdjuntos] = useState(false);

  // Cargar adjuntos al abrir
  useEffect(() => {
    if (isOpen && proceso.id) {
      loadAdjuntos();
    }
  }, [isOpen, proceso.id]);

  const loadAdjuntos = async () => {
    try {
      setLoadingAdjuntos(true);
      const docs = await procesosCoactivosService.getAdjuntos(proceso.id);
      setAdjuntos(docs);
    } catch (error) {
      console.error('Error cargando adjuntos:', error);
      toast.error('Error cargando documentos adjuntos');
    } finally {
      setLoadingAdjuntos(false);
    }
  };

  const handleDownload = (adjunto: ProcesoCoactivoAdjunto) => {
    const url = procesosCoactivosService.getAdjuntoDownloadUrl(adjunto.nombreArchivo, adjunto.nombreOriginal);
    window.open(url, '_blank');
  };

  const handleDeleteAdjunto = async (id: string) => {
    if (confirm('¿Está seguro de eliminar este documento?')) {
      try {
        await procesosCoactivosService.deleteAdjunto(id);
        toast.success('Documento eliminado');
        loadAdjuntos();
        // Notificar al padre para actualizar stats
        if (onUpdate) onUpdate();
      } catch (error) {
        console.error('Error eliminando adjunto:', error);
        toast.error('Error al eliminar documento');
      }
    }
  };

  return (
    <ModalSIGL
      isOpen={isOpen}
      onClose={onClose}
      title={`Proceso ${proceso.radicado}`}
      size="large"
    >
      <div className="space-y-4">
        {/* Header con Estado */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Estado Actual</p>
            <span className={`px-3 py-1 mt-1 inline-flex text-sm font-bold rounded-full ${estadoConfig.color}`}>
              {estadoConfig.label}
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Fecha creación</p>
            <p className="text-sm font-medium text-gray-900">
              {proceso.fechaCreacion.toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <Button onClick={onClose} size="sm" variant="ghost">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Información del Deudor */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
              <User className="w-4 h-4 text-blue-600" />
              Datos del Deudor
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500">Nombre</p>
                <p className="text-sm font-medium text-gray-900">{proceso.deudor.nombre}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Identificación</p>
                <p className="text-sm font-medium text-gray-900">{proceso.deudor.identificacion}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Contacto</p>
                <p className="text-sm text-gray-900">{proceso.deudor.telefono || 'N/A'} • {proceso.deudor.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Dirección</p>
                <p className="text-sm text-gray-900">{proceso.deudor.direccion || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Información de la Obligación */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              Detalle de la Obligación
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Concepto</p>
                <p className="text-sm font-medium text-gray-900">{proceso.obligacion.concepto}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-500">Valor Capital</p>
                  <p className="text-lg font-bold text-green-700">
                    ${proceso.obligacion.valor.toLocaleString('es-CO')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Días en Mora</p>
                  <p className={`text-lg font-bold ${proceso.obligacion.diasVencidos > 180 ? 'text-red-600' : 'text-orange-600'}`}>
                    {proceso.obligacion.diasVencidos}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Fecha de Vencimiento</p>
                <p className="text-sm text-gray-900">
                  {proceso.obligacion.fechaVencimiento.toLocaleDateString('es-CO')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Gestión del Proceso */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <FileCheck className="w-4 h-4" />
            Gestión y Seguimiento
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-blue-700">Responsable Asignado</p>
              <p className="text-sm font-medium text-gray-900">{proceso.responsable || 'Sin asignar'}</p>
            </div>
            <div>
              <p className="text-xs text-blue-700">Última actuación</p>
              <p className="text-sm font-medium text-gray-900">
                {proceso.ultimaActuacion.toLocaleDateString('es-CO')}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-700">Documentos</p>
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                <FileText className="w-3 h-3" /> {proceso.documentosAdjuntos}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-700">Notificaciones</p>
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                <Send className="w-3 h-3" /> {proceso.notificacionesEnviadas}
              </p>
            </div>
          </div>
        </div>

        {/* Observaciones */}
        {proceso.observaciones && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-semibold text-amber-900 mb-2 text-sm">Observaciones</h3>
            <p className="text-sm text-gray-800 italic">"{proceso.observaciones}"</p>
          </div>
        )}

        {/* Sección de Documentos Adjuntos */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-blue-600" />
            Documentos Adjuntos ({adjuntos.length})
          </h3>

          {loadingAdjuntos ? (
            <p className="text-sm text-gray-500">Cargando documentos...</p>
          ) : adjuntos.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No hay documentos adjuntos a este proceso.</p>
          ) : (
            <div className="space-y-2">
              {adjuntos.map((adjunto) => (
                <div key={adjunto.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 hover:bg-gray-50">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="p-1.5 bg-blue-100 rounded text-blue-600">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[200px] sm:max-w-[300px]">
                        {adjunto.nombreOriginal}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {(adjunto.tamano / 1024).toFixed(1)} KB • {new Date(adjunto.fechaCreacion).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDownload(adjunto)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      title="Descargar"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAdjunto(adjunto.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* Botones de acción */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <ButtonSIGL variant="secondary" onClick={onClose}>
            Cerrar
          </ButtonSIGL>
          <ButtonSIGL onClick={() => {
            const url = procesosCoactivosService.getFichaDownloadUrl(proceso.id);
            window.open(url, '_blank');
          }}>
            <Download className="w-4 h-4 mr-2" />
            Descargar Ficha
          </ButtonSIGL>
        </div>
      </Card>
    </div>
  );
}
