/**
 * ModuloProcesosCoactivosV3 - MOD-07: Procesos Coactivos
 * VISTA DE LISTA/TABLA - Gestión de procesos de cobro coactivo
 * Los procesos son creados manualmente por la oficina de gestión legal
 */

import { useState, useEffect } from 'react';
import {
  Plus, FileText, AlertTriangle, Clock, Calendar,
  User, Eye, ChevronDown, DollarSign, TrendingUp, X,
  AlertCircle, CheckCircle, Search, Download, Upload,
  Edit, Trash2, Filter, MoreVertical, Phone, Mail as MailIcon,
  MapPin, Building, CreditCard, FileCheck, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { toast } from 'sonner@2.0.3';
import { CardSIGL } from '../design-system/CardSIGL';
import { BadgeSIGL } from '../design-system/BadgeSIGL';
import { ButtonSIGL } from '../design-system/ButtonSIGL';
import { ModalSIGL } from '../design-system/ModalSIGL';

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

// ============ DATOS MOCK ============
const procesosMock: ProcesoCoactivo[] = [
  {
    id: 'PC-2025-001',
    radicado: 'COA-2025-00001',
    deudor: {
      nombre: 'Juan Carlos Pérez Gómez',
      identificacion: '1.012.345.678',
      telefono: '+57 312 456 7890',
      email: 'juan.perez@email.com',
      direccion: 'Calle 45 #12-34, Bogotá'
    },
    obligacion: {
      concepto: 'Matrícula Semestre 2024-2',
      valor: 3250000,
      fechaVencimiento: new Date('2024-08-15'),
      diasVencidos: 152
    },
    estado: 'PERSUASIVO',
    fechaCreacion: new Date('2024-12-10'),
    ultimaActuacion: new Date('2025-01-08'),
    responsable: 'Dra. María Fernández López',
    documentosAdjuntos: 5,
    notificacionesEnviadas: 3,
    observaciones: 'Deudor contactado, solicitó plazo de pago'
  },
  {
    id: 'PC-2025-002',
    radicado: 'COA-2025-00002',
    deudor: {
      nombre: 'Ana María Rodríguez Silva',
      identificacion: '1.023.456.789',
      telefono: '+57 301 234 5678',
      email: 'ana.rodriguez@email.com',
      direccion: 'Carrera 7 #89-45, Bogotá'
    },
    obligacion: {
      concepto: 'Multa Administrativa - Certificado extemporáneo',
      valor: 850000,
      fechaVencimiento: new Date('2024-06-20'),
      diasVencidos: 208
    },
    estado: 'PREJURIDICO',
    fechaCreacion: new Date('2024-11-15'),
    ultimaActuacion: new Date('2025-01-10'),
    responsable: 'Dr. Carlos Mendoza García',
    documentosAdjuntos: 8,
    notificacionesEnviadas: 5,
    observaciones: 'Documentación lista para mandamiento de pago'
  },
  {
    id: 'PC-2025-003',
    radicado: 'COA-2025-00003',
    deudor: {
      nombre: 'Roberto Sánchez Castro',
      identificacion: '1.034.567.890',
      telefono: '+57 315 678 9012',
      email: 'roberto.sanchez@email.com',
      direccion: 'Avenida 68 #23-67, Bogotá'
    },
    obligacion: {
      concepto: 'Reintegro de Beca - Incumplimiento compromiso',
      valor: 12500000,
      fechaVencimiento: new Date('2024-09-30'),
      diasVencidos: 106
    },
    estado: 'MANDAMIENTO',
    fechaCreacion: new Date('2024-12-20'),
    ultimaActuacion: new Date('2025-01-12'),
    responsable: 'Dra. María Fernández López',
    documentosAdjuntos: 12,
    notificacionesEnviadas: 7,
    observaciones: 'Mandamiento de pago notificado personalmente'
  },
  {
    id: 'PC-2024-089',
    radicado: 'COA-2024-00089',
    deudor: {
      nombre: 'Laura Patricia Gómez Díaz',
      identificacion: '1.045.678.901',
      telefono: '+57 320 789 0123',
      email: 'laura.gomez@email.com',
      direccion: 'Calle 100 #15-20, Bogotá'
    },
    obligacion: {
      concepto: 'Devolución pago indebido - Curso cancelado',
      valor: 1800000,
      fechaVencimiento: new Date('2024-10-15'),
      diasVencidos: 91
    },
    estado: 'IDENTIFICADO',
    fechaCreacion: new Date('2025-01-05'),
    ultimaActuacion: new Date('2025-01-13'),
    responsable: 'Dr. Carlos Mendoza García',
    documentosAdjuntos: 3,
    notificacionesEnviadas: 1,
    observaciones: 'Proceso recién iniciado, pendiente primera notificación'
  },
  {
    id: 'PC-2024-076',
    radicado: 'COA-2024-00076',
    deudor: {
      nombre: 'Diego Fernando Martínez Ruiz',
      identificacion: '1.056.789.012',
      telefono: '+57 318 890 1234',
      email: 'diego.martinez@email.com',
      direccion: 'Transversal 45 #78-90, Bogotá'
    },
    obligacion: {
      concepto: 'Sanción Pecuniaria - Proceso disciplinario',
      valor: 5200000,
      fechaVencimiento: new Date('2024-07-10'),
      diasVencidos: 188
    },
    estado: 'EMBARGO',
    fechaCreacion: new Date('2024-10-05'),
    ultimaActuacion: new Date('2025-01-11'),
    responsable: 'Dra. María Fernández López',
    documentosAdjuntos: 15,
    notificacionesEnviadas: 9,
    observaciones: 'Medida cautelar de embargo decretada sobre cuenta bancaria'
  },
  {
    id: 'PC-2024-055',
    radicado: 'COA-2024-00055',
    deudor: {
      nombre: 'Camila Alejandra Torres Vega',
      identificacion: '1.067.890.123',
      telefono: '+57 310 901 2345',
      email: 'camila.torres@email.com',
      direccion: 'Calle 80 #34-56, Bogotá'
    },
    obligacion: {
      concepto: 'Matrícula Semestre 2024-1',
      valor: 2950000,
      fechaVencimiento: new Date('2024-03-20'),
      diasVencidos: 300
    },
    estado: 'FINALIZADO',
    fechaCreacion: new Date('2024-08-10'),
    ultimaActuacion: new Date('2024-12-28'),
    responsable: 'Dr. Carlos Mendoza García',
    documentosAdjuntos: 18,
    notificacionesEnviadas: 12,
    observaciones: 'Obligación cancelada en su totalidad con intereses'
  },
];

// ============ COMPONENTE PRINCIPAL ============
export function ModuloProcesosCoactivosV3() {
  const [procesos, setProcesos] = useState<ProcesoCoactivo[]>(procesosMock);
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [modalNuevoProceso, setModalNuevoProceso] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<ProcesoCoactivo | null>(null);
  const [ordenamiento, setOrdenamiento] = useState<'reciente' | 'antiguo' | 'monto-mayor' | 'monto-menor'>('reciente');

  // Detectar tamaño de pantalla
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < 768);
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
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

  // Calcular estadísticas
  const stats = {
    total: procesos.length,
    activos: procesos.filter(p => !['FINALIZADO'].includes(p.estado)).length,
    criticos: procesos.filter(p => p.obligacion.diasVencidos > 180).length,
    totalMonto: procesos.reduce((sum, p) => sum + p.obligacion.valor, 0)
  };

  const handleVerDetalle = (proceso: ProcesoCoactivo) => {
    setProcesoSeleccionado(proceso);
    setModalDetalle(true);
  };

  const handleEliminarProceso = (procesoId: string) => {
    const proceso = procesos.find(p => p.id === procesoId);
    if (!proceso) return;

    if (confirm(`¿Está seguro de eliminar el proceso "${proceso.radicado}"?\n\nEsta acción no se puede deshacer.`)) {
      setProcesos(procesos.filter(p => p.id !== procesoId));
      toast.success('Proceso eliminado', {
        description: `El proceso ${proceso.radicado} ha sido eliminado`,
        duration: 3000
      });
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
            onClick={() => setModalNuevoProceso(true)}
            className="flex-shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            {!isMobile && 'Nuevo Proceso'}
          </ButtonSIGL>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-blue-50 rounded-lg">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#003DA5]" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Procesos</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardSIGL>

          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-amber-50 rounded-lg">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Activos</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.activos}</p>
              </div>
            </div>
          </CardSIGL>

          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Críticos</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.criticos}</p>
              </div>
            </div>
          </CardSIGL>

          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-green-50 rounded-lg">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Monto Total</p>
                <p className="text-base sm:text-lg font-bold text-gray-900">
                  ${(stats.totalMonto / 1000000).toFixed(1)}M
                </p>
              </div>
            </div>
          </CardSIGL>
        </div>

        {/* Filtros y búsqueda */}
        <CardSIGL className="p-4">
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
        </CardSIGL>
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
        onClose={() => setModalNuevoProceso(false)}
        onCrear={(nuevoProceso) => {
          setProcesos([nuevoProceso, ...procesos]);
          setModalNuevoProceso(false);
          toast.success('Proceso creado exitosamente');
        }}
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
    </div>
  );
}

// ============ COMPONENTES AUXILIARES ============

// Tarjeta de Proceso
function TarjetaProceso({ 
  proceso, 
  onVerDetalle,
  onEliminar 
}: { 
  proceso: ProcesoCoactivo;
  onVerDetalle: (proceso: ProcesoCoactivo) => void;
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
          <ButtonSIGL
            variant="default"
            size="sm"
            onClick={() => onVerDetalle(proceso)}
            className="flex-1 sm:flex-none"
          >
            <Eye className="w-4 h-4 mr-2" />
            Ver Detalle
          </ButtonSIGL>
          <ButtonSIGL
            variant="outline"
            size="sm"
            onClick={() => toast.info('Función en desarrollo')}
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </ButtonSIGL>
          <button
            onClick={() => onEliminar(proceso.id)}
            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
          </button>
        </div>
      </div>
    </CardSIGL>
  );
}

// Modal Nuevo Proceso
function ModalNuevoProceso({
  isOpen,
  onClose,
  onCrear
}: {
  isOpen: boolean;
  onClose: () => void;
  onCrear: (proceso: ProcesoCoactivo) => void;
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
    observaciones: ''
  });

  const handleSubmit = () => {
    if (!formData.deudorNombre || !formData.deudorIdentificacion || !formData.concepto || !formData.valor) {
      toast.error('Campos requeridos', {
        description: 'Por favor complete todos los campos obligatorios'
      });
      return;
    }

    const fechaVencimiento = new Date(formData.fechaVencimiento);
    const hoy = new Date();
    const diasVencidos = Math.floor((hoy.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24));

    const nuevoProceso: ProcesoCoactivo = {
      id: `PC-2025-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      radicado: `COA-2025-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`,
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
        fechaVencimiento: fechaVencimiento,
        diasVencidos: diasVencidos
      },
      estado: 'IDENTIFICADO',
      fechaCreacion: new Date(),
      ultimaActuacion: new Date(),
      responsable: formData.responsable || 'Sin asignar',
      documentosAdjuntos: 0,
      notificacionesEnviadas: 0,
      observaciones: formData.observaciones
    };

    onCrear(nuevoProceso);
  };

  return (
    <ModalSIGL
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo Proceso Coactivo"
      size="large"
    >
      <div className="space-y-4">
        {/* Información del Deudor */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Información del Deudor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <ButtonSIGL variant="outline" onClick={onClose}>
            Cancelar
          </ButtonSIGL>
          <ButtonSIGL onClick={handleSubmit}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Proceso
          </ButtonSIGL>
        </div>
      </div>
    </ModalSIGL>
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

  return (
    <ModalSIGL
      isOpen={isOpen}
      onClose={onClose}
      title={`Proceso ${proceso.radicado}`}
      size="large"
    >
      <div className="space-y-4">
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

        {/* Botones de acción */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <ButtonSIGL variant="outline" onClick={onClose}>
            Cerrar
          </ButtonSIGL>
          <ButtonSIGL onClick={() => toast.info('Función en desarrollo')}>
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </ButtonSIGL>
        </div>
      </div>
    </ModalSIGL>
  );
}
