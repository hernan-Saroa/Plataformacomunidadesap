/**
 * ModuloProcesosCoactivosV3 - MOD-07: Procesos Coactivos
 * VISTA DE LISTA/TABLA - Gestión de procesos de cobro coactivo
 * Los procesos son creados manualmente por la oficina de gestión legal
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Plus, FileText, AlertTriangle, Clock, Calendar,
  User, Eye, ChevronDown, DollarSign, TrendingUp, X,
  AlertCircle, CheckCircle, Search, Download, Upload,
  Edit, Trash2, Filter, MoreVertical, Phone, Mail as MailIcon,
  MapPin, Building, CreditCard, FileCheck, Send, History, Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { toast } from 'sonner';
import { CardSIGL } from '../design-system/CardSIGL';
import { BadgeSIGL } from '../design-system/BadgeSIGL';
import { ButtonSIGL } from '../design-system/ButtonSIGL';
import { ModalSIGL } from '../design-system/ModalSIGL';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '../../../../enums/permissions';
import {
  procesosCoactivosService,
  ProcesoCoactivo as ProcesoCoactivoAPI,
  ProcesoCoactivoStats,
  ProcesoCoactivoAdjunto
} from '../../../../services/api/legal.service';
import { ModalGestionarPagos } from '../procesos-coactivos/ModalGestionarPagos';
import { ModalHistorialCoactivo } from '../procesos-coactivos/ModalHistorialCoactivo';
import { VistaArchivados, ItemArchivado, EstadoArchivado } from '../design-system/VistaArchivados';
import { usePermisos, PERMISOS } from '../config/PermisosContext'

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
    valorPagado: number;
    saldoPendiente: number;
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
      valorPagado: apiProceso.valorPagado || 0,
      saldoPendiente: apiProceso.saldoPendiente ?? apiProceso.obligacion.valor ?? 0,
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
  // ✅ Obtener permisos del usuario actual
  const { usuario } = usePermisos();
  
  // ✅ Estado para cambiar entre vista normal y archivados
  const [vistaActual, setVistaActual] = useState<'activos' | 'archivados'>('activos');
  
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [modalNuevoProceso, setModalNuevoProceso] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<ProcesoCoactivo | null>(null);
  const [procesoEditar, setProcesoEditar] = useState<ProcesoCoactivo | null>(null);
  const [ordenamiento, setOrdenamiento] = useState<'reciente' | 'antiguo' | 'monto-mayor' | 'monto-menor'>('reciente');

  // Estados para modales de Pagos e Historial desde las tarjetas
  const [modalPagos, setModalPagos] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(false);
  const [procesoParaPago, setProcesoParaPago] = useState<ProcesoCoactivo | null>(null);
  const [procesoParaHistorial, setProcesoParaHistorial] = useState<ProcesoCoactivo | null>(null);
  // ✅ Estado para items archivados/eliminados
  const [itemsArchivados, setItemsArchivados] = useState<ItemArchivado[]>([
    {
      id: 'PC-2024-999',
      codigo: 'COA-2024-00099',
      nombre: 'Cobro matrícula semestre 2023-2 - José Martínez (CC 1.001.001.001) - $2.800.000',
      tipo: 'Proceso Coactivo',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-12-20T14:30:00'),
      usuarioArchivo: 'Dr. Carlos Mendoza',
      motivoArchivo: 'Obligación cancelada en su totalidad con intereses moratorios. Proceso finalizado exitosamente mediante acuerdo de pago',
      metadatos: {
        'Deudor': 'José Martínez López',
        'Identificación': '1.001.001.001',
        'Concepto': 'Matrícula Semestre 2023-2',
        'Valor': '$2.800.000',
        'Estado Final': 'Finalizado - Pago completo',
        'Responsable': 'Dr. Carlos Mendoza García',
        'Fecha Finalización': '20/12/2024'
      }
    },
    {
      id: 'PC-2024-888',
      codigo: 'COA-2024-00088',
      nombre: 'Reintegro beca - María González (CC 1.002.002.002) - $8.500.000',
      tipo: 'Proceso Coactivo',
      estado: 'ELIMINADO',
      fechaArchivado: new Date('2024-11-10T09:15:00'),
      usuarioArchivo: 'Admin Sistema',
      motivoArchivo: 'Proceso duplicado por error del sistema. El proceso oficial es COA-2024-00089',
      metadatos: {
        'Deudor': 'María González Pérez',
        'Motivo Eliminación': 'Registro duplicado',
        'Proceso Oficial': 'COA-2024-00089',
        'Fecha Detección': '10/11/2024'
      }
    }
  ]);

  // ✅ Función para restaurar un proceso archivado
  const handleRestaurar = async (itemId: string) => {
    console.log('Restaurando proceso coactivo:', itemId);
    setItemsArchivados(prev => prev.filter(item => item.id !== itemId));
    toast.success('Proceso restaurado exitosamente');
  };

  // ✅ Función para eliminar permanentemente un proceso
  const handleEliminarPermanente = async (itemId: string) => {
    console.log('Eliminando permanentemente proceso:', itemId);
    setItemsArchivados(prev => prev.filter(item => item.id !== itemId));
    toast.success('Proceso eliminado permanentemente');
  };

  // Detectar tamaño de pantalla
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < 768);
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
    setModalDetalle(true);
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
      {/* ✅ SI ESTÁ EN VISTA DE ARCHIVADOS, MOSTRAR COMPONENTE */}
      {vistaActual === 'archivados' ? (
        <VistaArchivados
          items={itemsArchivados}
          onRestaurar={handleRestaurar}
          onEliminarPermanente={handleEliminarPermanente}
          onVolver={() => setVistaActual('activos')}
        />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Procesos Coactivos</h1>
                <p className="text-sm sm:text-base text-gray-500 mt-1">
                  Gestión de cobro coactivo de obligaciones
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* ✅ BOTÓN PARA IR A ARCHIVADOS */}
                <button
                  onClick={() => setVistaActual('archivados')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all flex-shrink-0"
                  title="Ver archivados y eliminados"
                >
                  <Archive className="w-4 h-4" />
                  {!isMobile && 'Archivados'}
                  {itemsArchivados.length > 0 && (
                    <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-bold">
                      {itemsArchivados.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setModalNuevoProceso(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                  style={{ 
                    background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                    boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                  }}
                >
                  <Plus className="w-4 h-4" />
                  {!isMobile && 'Nuevo Proceso'}
                </button>
              </div>
            </div>

            {/* Filtros y búsqueda */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {/* Búsqueda */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, identificación o radicado..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Filtro Estado */}
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="TODOS">Todos los estados</option>
                  <option value="IDENTIFICADO">Identificado</option>
                  <option value="PERSUASIVO">Persuasivo</option>
                  <option value="PREJURIDICO">Prejurídico</option>
                  <option value="MANDAMIENTO">Mandamiento</option>
                  <option value="EMBARGO">Embargo</option>
                  <option value="FINALIZADO">Finalizado</option>
                </select>

                {/* Ordenamiento */}
                <select
                  value={ordenamiento}
                  onChange={(e) => setOrdenamiento(e.target.value as any)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="reciente">Más recientes</option>
                  <option value="antiguo">Más antiguos</option>
                  <option value="monto-mayor">Monto mayor</option>
                  <option value="monto-menor">Monto menor</option>
                </select>
              </div>
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
                    onEliminar={handleEliminarProceso}
                    onEditar={handleEditarProceso}
                  />
                </motion.div>
              ))}\n        </AnimatePresence>

            {procesosFiltrados.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  No se encontraron procesos con los filtros seleccionados
                </p>
              </div>
            )}
          </div>

          {/* Modal Nuevo Proceso */}
          <ModalNuevoProceso
            isOpen={modalNuevoProceso}
            onClose={() => setModalNuevoProceso(false)}
            onCrear={() => {
              loadProcesos();
              setModalNuevoProceso(false);
              toast.success('Proceso creado exitosamente');
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
            />
          )}
        </>
      )}
    </div>
  );
}

// ============ COMPONENTES AUXILIARES ============

// Tarjeta de Proceso
function TarjetaProceso({ 
  proceso, 
  onVerDetalle,
  onEliminar,
  onEditar 
}: { 
  proceso: ProcesoCoactivo;
  onVerDetalle: (proceso: ProcesoCoactivo) => void;
  onEliminar: (id: string) => void;
  onEditar: (proceso: ProcesoCoactivo) => void;
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
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

        {/* Información Principal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 pb-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-500 mb-1">Concepto</p>
            <p className="text-sm font-medium text-gray-900">{proceso.obligacion.concepto}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Valor</p>
            <p className="text-lg font-bold text-[#003DA5]">
              ${proceso.obligacion.valor.toLocaleString('es-CO')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Días Vencidos</p>
            <p className={`text-sm font-semibold ${esCritico ? 'text-red-600' : 'text-gray-900'}`}>
              {proceso.obligacion.diasVencidos} días
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Responsable</p>
            <p className="text-sm text-gray-900">{proceso.responsable}</p>
          </div>
        </div>

        {/* Métricas Secundarias */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Documentos</p>
            <div className="flex items-center justify-center gap-1">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">{proceso.documentosAdjuntos}</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Notificaciones</p>
            <div className="flex items-center justify-center gap-1">
              <Send className="w-3.5 h-3.5 text-green-600" />
              <span className="text-sm font-semibold text-gray-900">{proceso.notificacionesEnviadas}</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Última actuación</p>
            <div className="flex items-center justify-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-xs font-semibold text-gray-900">
                {proceso.ultimaActuacion.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
              </span>
            </div>
          </div>
        </div>

        {/* Observaciones */}
        {proceso.observaciones && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-900">
              <span className="font-semibold">Observación: </span>
              {proceso.observaciones}
            </p>
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onVerDetalle(proceso)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
            style={{ 
              background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
              boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
            }}
          >
            <Eye className="w-4 h-4" />
            Ver Detalle
          </button>
          <button
            onClick={() => onEditar(proceso)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
          >
            <Edit className="w-4 h-4" />
            Editar
          </button>
          <button
            onClick={() => onEliminar(proceso.id)}
            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
          </button>
        </div>
      </div>
    </div>
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

  // ✅ Helpers de validación de formato
  const onlyLetters = (value: string): string => value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
  const onlyNumbers = (value: string): string => value.replace(/[^0-9]/g, '');
  const phoneFormat = (value: string): string => value.replace(/[^0-9+\s-]/g, '');
  const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  // ✅ Handler con filtros de formato
  const handleInputChange = (field: string, value: string) => {
    let filteredValue = value;

    switch (field) {
      case 'deudorNombre':
        filteredValue = onlyLetters(value);
        break;
      case 'deudorIdentificacion':
        filteredValue = onlyNumbers(value);
        break;
      case 'deudorTelefono':
        filteredValue = phoneFormat(value);
        break;
      case 'valor':
        // Eliminar caracteres no numéricos
        filteredValue = value.replace(/[^0-9]/g, '');

        // Regla: Si empieza con 0, solo puede ser "0" (no "00", "01", etc)
        if (filteredValue.startsWith('0') && filteredValue.length > 1) {
          filteredValue = filteredValue.replace(/^0+/, '');
          // Si quedó vacío es porque eran solo ceros, lo dejamos en "0" si el usuario solo escribió ceros
          // Pero la lógica de replace(/^0+/, '') convierte "05" en "5", correcto.
          // Si escribe "00", replace devuelve "", así que evitamos que escriba múltiples ceros
          if (filteredValue === '') filteredValue = '0';
        }

        // Máximo 12 dígitos
        if (filteredValue.length > 12) {
          filteredValue = filteredValue.slice(0, 12);
        }
        break;
      default:
        filteredValue = value;
    }

    setFormData(prev => ({ ...prev, [field]: filteredValue }));
  };

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
    // ✅ Validación de formato de email
    if (formData.deudorEmail && !isValidEmail(formData.deudorEmail)) {
      toast.error('El correo debe contener @ y un dominio válido (.com, .co, etc.)');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header - 100% Estándar del Proyecto */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">Nuevo Proceso Coactivo</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Contenido del Formulario */}
        <div className="p-6 space-y-6">
          {/* Información del Deudor */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Información del Deudor</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.deudorNombre}
                  onChange={(e) => setFormData({ ...formData, deudorNombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Juan Carlos Pérez Gómez"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Identificación <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.deudorIdentificacion}
                  onChange={(e) => setFormData({ ...formData, deudorIdentificacion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: 1.012.345.678"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={formData.deudorTelefono}
                  onChange={(e) => setFormData({ ...formData, deudorTelefono: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: +57 312 456 7890"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.deudorEmail}
                  onChange={(e) => setFormData({ ...formData, deudorEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: correo@ejemplo.com"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={formData.deudorDireccion}
                  onChange={(e) => setFormData({ ...formData, deudorDireccion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Calle 45 #12-34, Bogotá"
                />
              </div>
            </div>
          </div>

          {/* Información de la Obligación */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Información de la Obligación</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Concepto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.concepto}
                  onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Matrícula Semestre 2024-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Valor (COP) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: 3250000"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Fecha Vencimiento <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.fechaVencimiento}
                  onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Información Adicional */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Información Adicional</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Responsable</label>
                <input
                  type="text"
                  value={formData.responsable}
                  onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Dra. María Fernández López"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="Observaciones adicionales sobre el proceso..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
            style={{ 
              background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
              boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
            }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              procesoEditar ? 'Actualizar' : (<><Plus className="w-4 h-4" />Crear Proceso</>)
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal Detalle del Proceso
function ModalDetalleProceso({
  proceso,
  isOpen,
  onClose
}: {
  proceso: ProcesoCoactivo;
  isOpen: boolean;
  onClose: () => void;
}) {
  const estadoConfig = {
    IDENTIFICADO: { label: 'Identificado', color: 'bg-gray-100 text-gray-700' },
    PERSUASIVO: { label: 'Persuasivo', color: 'bg-amber-100 text-amber-700' },
    PREJURIDICO: { label: 'Prejurídico', color: 'bg-blue-100 text-blue-700' },
    MANDAMIENTO: { label: 'Mandamiento', color: 'bg-indigo-100 text-indigo-700' },
    EMBARGO: { label: 'Embargo', color: 'bg-purple-100 text-purple-700' },
    FINALIZADO: { label: 'Finalizado', color: 'bg-green-100 text-green-700' }
  }[proceso.estado];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" style={{zIndex: 101}}>
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Proceso {proceso.radicado}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Estado */}
          <div className="flex items-center justify-between pb-3 border-b">
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${estadoConfig.color}`}>
              {estadoConfig.label}
            </span>
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
          </div>

          {/* Información del Deudor */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-[#003DA5]" />
              Información del Deudor
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Nombre</p>
                  <p className="text-sm font-medium text-gray-900">{proceso.deudor.nombre}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Identificación</p>
                  <p className="text-sm font-medium text-gray-900">{proceso.deudor.identificacion}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Teléfono</p>
                  <p className="text-sm text-gray-900">{proceso.deudor.telefono}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{proceso.deudor.email}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Dirección</p>
                  <p className="text-sm text-gray-900">{proceso.deudor.direccion}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Información de la Obligación */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              Obligación
            </h3>
            <div className="bg-green-50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-green-700 mb-1">Concepto</p>
                <p className="text-sm font-medium text-gray-900">{proceso.obligacion.concepto}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-green-700">Valor</p>
                  <p className="text-lg font-bold text-green-900">
                    ${proceso.obligacion.valor.toLocaleString('es-CO')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-green-700">Vencimiento</p>
                  <p className="text-sm font-medium text-gray-900">
                    {proceso.obligacion.fechaVencimiento.toLocaleDateString('es-CO')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-green-700">Días vencidos</p>
                  <p className="text-sm font-bold text-red-600">
                    {proceso.obligacion.diasVencidos} días
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Gestión del Proceso */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-600" />
              Gestión del Proceso
            </h3>
            <div className="bg-blue-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-blue-700">Responsable</p>
                  <p className="text-sm font-medium text-gray-900">{proceso.responsable}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700">Última actuación</p>
                  <p className="text-sm font-medium text-gray-900">
                    {proceso.ultimaActuacion.toLocaleDateString('es-CO')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-700">Documentos adjuntos</p>
                  <p className="text-sm font-semibold text-gray-900">{proceso.documentosAdjuntos}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700">Notificaciones enviadas</p>
                  <p className="text-sm font-semibold text-gray-900">{proceso.notificacionesEnviadas}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          {proceso.observaciones && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Observaciones</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-gray-900">{proceso.observaciones}</p>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
          >
            Cerrar
          </button>
          <button
            onClick={() => toast.info('Función en desarrollo')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
            style={{ 
              background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
              boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
            }}
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
