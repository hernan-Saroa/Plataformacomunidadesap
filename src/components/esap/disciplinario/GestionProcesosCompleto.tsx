/**
 * GESTIÓN DE PROCESOS DISCIPLINARIOS - COMPLETO
 * Sistema integrado con todas las funcionalidades de Noticias adaptadas a Procesos
 * Incluye: Kanban, CRUD completo, Asignación, Expedientes, Términos
 * RF003 - Gestión Integral de Procesos Disciplinarios
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  FileText,
  Calendar,
  User,
  Building2,
  AlertCircle,
  Download,
  Filter,
  CheckCircle,
  X,
  Save,
  Upload,
  UserCheck,
  Clock,
  MessageSquare,
  Paperclip,
  History,
  Bell,
  HelpCircle,
  ChevronRight,
  MoreVertical,
  ArrowRight,
  FolderOpen,
  Gavel,
  Scale,
  Shield,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  Target,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { toast } from 'sonner@2.0.3';
import { ModalArchivarProceso } from './ModalArchivarProceso';

// ==================== INTERFACES ====================
interface Profesional {
  id: string;
  nombre: string;
  cargo: string;
  email: string;
  procesosAsignados: number;
  capacidadMaxima: number;
}

interface AccionAuditoria {
  id: string;
  tipo: 'creacion' | 'actuacion' | 'asignacion' | 'cambio-etapa' | 'documento' | 'termino';
  usuario: string;
  fecha: string;
  observaciones?: string;
  archivos?: string[];
}

interface Proceso {
  id: string;
  consecutivo: string;
  noticia: string;
  disciplinable: {
    nombre: string;
    identificacion: string;
    cargo: string;
    dependencia: string;
    email: string;
    telefono: string;
  };
  etapa: 'recepcion' | 'valoracion' | 'indagacion' | 'investigacion' | 'juzgamiento';
  etapaLabel: 'Recepción' | 'Valoración' | 'Indagación' | 'Investigación' | 'Juzgamiento';
  estado: 'activo' | 'archivado' | 'sancion' | 'archivo';
  semaforo: 'verde' | 'amarillo' | 'rojo';
  diasRestantes: number;
  porcentajeTiempo: number;
  profesionalAsignado?: string;
  fechaCreacion: string;
  fechaVencimiento: string;
  ultimaActuacion: string;
  hechos: string;
  documentos: number;
  territorial: string;
  historialAuditoria: AccionAuditoria[];
}

// ==================== MOCK DATA ====================
const PROFESIONALES_MOCK: Profesional[] = [
  { id: '1', nombre: 'Juan Carlos Pérez', cargo: 'Profesional Especializado', email: 'juan.perez@esap.edu.co', procesosAsignados: 8, capacidadMaxima: 12 },
  { id: '2', nombre: 'María Torres Silva', cargo: 'Profesional Universitario', email: 'maria.torres@esap.edu.co', procesosAsignados: 6, capacidadMaxima: 10 },
  { id: '3', nombre: 'Carlos Mendoza López', cargo: 'Profesional Senior', email: 'carlos.mendoza@esap.edu.co', procesosAsignados: 10, capacidadMaxima: 15 },
  { id: '4', nombre: 'Ana García Ruiz', cargo: 'Coordinador', email: 'ana.garcia@esap.edu.co', procesosAsignados: 5, capacidadMaxima: 8 }
];

const PROCESOS_MOCK: Proceso[] = [
  {
    id: '1',
    consecutivo: 'PD-2025-0020',
    noticia: 'ND-2025-0152',
    disciplinable: {
      nombre: 'Ana María López Martínez',
      identificacion: '52123456',
      cargo: 'Profesional Universitario',
      dependencia: 'Territorial Bogotá',
      email: 'ana.lopez@esap.edu.co',
      telefono: '3001234567'
    },
    etapa: 'recepcion',
    etapaLabel: 'Recepción',
    estado: 'activo',
    semaforo: 'verde',
    diasRestantes: 8,
    porcentajeTiempo: 20,
    profesionalAsignado: undefined,
    fechaCreacion: '2025-01-26',
    fechaVencimiento: '2025-02-26',
    ultimaActuacion: 'Auto de apertura emitido',
    hechos: 'Presunto incumplimiento de funciones en proceso de contratación del segundo semestre de 2024',
    documentos: 3,
    territorial: 'Bogotá D.C.',
    historialAuditoria: [
      {
        id: 'a1',
        tipo: 'creacion',
        usuario: 'Sistema OCID',
        fecha: '2025-01-26 10:30',
        observaciones: 'Proceso creado desde noticia ND-2025-0152'
      }
    ]
  },
  {
    id: '2',
    consecutivo: 'PD-2023-0019',
    noticia: 'ND-2023-0089',
    disciplinable: {
      nombre: 'Roberto Sánchez Cruz',
      identificacion: '77385960',
      cargo: 'Coordinador Académico',
      dependencia: 'Territorial Antioquia',
      email: 'roberto.sanchez@esap.edu.co',
      telefono: '3109876543'
    },
    etapa: 'valoracion',
    etapaLabel: 'Valoración',
    estado: 'activo',
    semaforo: 'amarillo',
    diasRestantes: 3,
    porcentajeTiempo: 75,
    profesionalAsignado: 'María Torres Silva',
    fechaCreacion: '2024-12-15',
    fechaVencimiento: '2025-02-02',
    ultimaActuacion: 'En valoración - Revisión de descargos',
    hechos: 'Irregularidades en manejo de calificaciones de estudiantes del programa de Administración Pública',
    documentos: 12,
    territorial: 'Antioquia',
    historialAuditoria: [
      {
        id: 'a2',
        tipo: 'creacion',
        usuario: 'Sistema OCID',
        fecha: '2024-12-15 14:00'
      },
      {
        id: 'a3',
        tipo: 'asignacion',
        usuario: 'Jefe OCID',
        fecha: '2024-12-16 09:00',
        observaciones: 'Asignado a María Torres para valoración'
      }
    ]
  },
  {
    id: '3',
    consecutivo: 'PD-2023-0015',
    noticia: 'ND-2023-0045',
    disciplinable: {
      nombre: 'Carlos Andrés Ramírez',
      identificacion: '80112233',
      cargo: 'Director Territorial',
      dependencia: 'Territorial Valle del Cauca',
      email: 'carlos.ramirez@esap.edu.co',
      telefono: '3151234567'
    },
    etapa: 'indagacion',
    etapaLabel: 'Indagación',
    estado: 'activo',
    semaforo: 'verde',
    diasRestantes: 45,
    porcentajeTiempo: 35,
    profesionalAsignado: 'Juan Carlos Pérez',
    fechaCreacion: '2024-11-10',
    fechaVencimiento: '2025-03-15',
    ultimaActuacion: 'Práctica de pruebas documentales',
    hechos: 'Presunto uso indebido de recursos institucionales para actividades personales',
    documentos: 18,
    territorial: 'Valle del Cauca',
    historialAuditoria: []
  },
  {
    id: '4',
    consecutivo: 'PD-2024-0008',
    noticia: 'ND-2024-0023',
    disciplinable: {
      nombre: 'Laura Marcela Gutiérrez',
      identificacion: '63998877',
      cargo: 'Profesional Especializado',
      dependencia: 'Dirección Nacional',
      email: 'laura.gutierrez@esap.edu.co',
      telefono: '3207654321'
    },
    etapa: 'investigacion',
    etapaLabel: 'Investigación',
    estado: 'activo',
    semaforo: 'rojo',
    diasRestantes: -5,
    porcentajeTiempo: 110,
    profesionalAsignado: 'Carlos Mendoza López',
    fechaCreacion: '2024-08-20',
    fechaVencimiento: '2025-01-09',
    ultimaActuacion: 'Formulación de cargos',
    hechos: 'Presunto conflicto de interés en proceso de selección de contratistas',
    documentos: 32,
    territorial: 'Dirección Nacional',
    historialAuditoria: []
  }
];

// ==================== COMPONENTE PRINCIPAL ====================
export function GestionProcesosCompleto() {
  const [procesos, setProcesos] = useState<Proceso[]>(PROCESOS_MOCK);
  const [profesionales] = useState<Profesional[]>(PROFESIONALES_MOCK);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEtapa, setFilterEtapa] = useState<string>('all');
  const [filterSemaforo, setFilterSemaforo] = useState<string>('all');
  const [vistaActual, setVistaActual] = useState<'kanban' | 'lista' | 'estadisticas'>('kanban');
  
  // Modales
  const [showModalNuevo, setShowModalNuevo] = useState(false);
  const [showModalDetalle, setShowModalDetalle] = useState(false);
  const [showModalAsignar, setShowModalAsignar] = useState(false);
  const [showModalArchivar, setShowModalArchivar] = useState(false);
  const [showModalExpediente, setShowModalExpediente] = useState(false);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<Proceso | null>(null);

  // Nuevo Proceso Form
  const [nuevoProceso, setNuevoProceso] = useState({
    noticia: '',
    nombre: '',
    identificacion: '',
    cargo: '',
    dependencia: '',
    territorial: '',
    hechos: '',
    email: '',
    telefono: ''
  });

  // Filtrado
  const procesosFiltrados = procesos.filter(p => {
    const matchesSearch =
      p.consecutivo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.disciplinable.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.noticia.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesEtapa = filterEtapa === 'all' || p.etapa === filterEtapa;
    const matchesSemaforo = filterSemaforo === 'all' || p.semaforo === filterSemaforo;

    return matchesSearch && matchesEtapa && matchesSemaforo;
  });

  // Agrupados por etapa para Kanban
  const procesosPorEtapa = {
    recepcion: procesosFiltrados.filter(p => p.etapa === 'recepcion'),
    valoracion: procesosFiltrados.filter(p => p.etapa === 'valoracion'),
    indagacion: procesosFiltrados.filter(p => p.etapa === 'indagacion'),
    investigacion: procesosFiltrados.filter(p => p.etapa === 'investigacion'),
    juzgamiento: procesosFiltrados.filter(p => p.etapa === 'juzgamiento')
  };

  // Estadísticas
  const stats = {
    total: procesos.length,
    activos: procesos.filter(p => p.estado === 'activo').length,
    vencidos: procesos.filter(p => p.diasRestantes < 0).length,
    sinAsignar: procesos.filter(p => !p.profesionalAsignado).length
  };

  // Handlers
  const handleCrearProceso = () => {
    if (!nuevoProceso.noticia || !nuevoProceso.nombre || !nuevoProceso.identificacion) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }

    const nuevoId = `${procesos.length + 1}`;
    const nuevoConsecutivo = `PD-2025-${String(procesos.length + 21).padStart(4, '0')}`;
    
    const proceso: Proceso = {
      id: nuevoId,
      consecutivo: nuevoConsecutivo,
      noticia: nuevoProceso.noticia,
      disciplinable: {
        nombre: nuevoProceso.nombre,
        identificacion: nuevoProceso.identificacion,
        cargo: nuevoProceso.cargo,
        dependencia: nuevoProceso.dependencia,
        email: nuevoProceso.email,
        telefono: nuevoProceso.telefono
      },
      etapa: 'recepcion',
      etapaLabel: 'Recepción',
      estado: 'activo',
      semaforo: 'verde',
      diasRestantes: 30,
      porcentajeTiempo: 0,
      fechaCreacion: new Date().toISOString().split('T')[0],
      fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ultimaActuacion: 'Proceso creado - Pendiente asignación',
      hechos: nuevoProceso.hechos,
      documentos: 0,
      territorial: nuevoProceso.territorial,
      historialAuditoria: [
        {
          id: `a${Date.now()}`,
          tipo: 'creacion',
          usuario: 'Usuario OCID',
          fecha: new Date().toLocaleString('es-CO'),
          observaciones: `Proceso creado desde noticia ${nuevoProceso.noticia}`
        }
      ]
    };

    setProcesos([proceso, ...procesos]);
    setShowModalNuevo(false);
    setNuevoProceso({
      noticia: '',
      nombre: '',
      identificacion: '',
      cargo: '',
      dependencia: '',
      territorial: '',
      hechos: '',
      email: '',
      telefono: ''
    });

    toast.success('Proceso creado exitosamente', {
      description: `${nuevoConsecutivo} - ${nuevoProceso.nombre}`
    });
  };

  const handleAsignarProfesional = (profesionalId: string) => {
    if (!procesoSeleccionado) return;

    const profesional = profesionales.find(p => p.id === profesionalId);
    if (!profesional) return;

    setProcesos(procesos.map(p =>
      p.id === procesoSeleccionado.id
        ? {
            ...p,
            profesionalAsignado: profesional.nombre,
            historialAuditoria: [
              ...p.historialAuditoria,
              {
                id: `a${Date.now()}`,
                tipo: 'asignacion',
                usuario: 'Jefe OCID',
                fecha: new Date().toLocaleString('es-CO'),
                observaciones: `Asignado a ${profesional.nombre}`
              }
            ]
          }
        : p
    ));

    setShowModalAsignar(false);
    toast.success('Profesional asignado', {
      description: `${profesional.nombre} - ${procesoSeleccionado.consecutivo}`
    });
  };

  const handleArchivarProceso = () => {
    if (!procesoSeleccionado) return;

    setProcesos(procesos.filter(p => p.id !== procesoSeleccionado.id));
    setShowModalArchivar(false);
    setProcesoSeleccionado(null);

    toast.success('Proceso archivado', {
      description: `${procesoSeleccionado.consecutivo} ha sido archivado exitosamente`
    });
  };

  return (
    <div className="w-full max-w-full">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
        <button className="hover:text-blue-600">Backoffice</button>
        <ChevronRight className="w-4 h-4" />
        <button className="hover:text-blue-600">Control Interno Disciplinario</button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">Procesos</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Scale className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tablero Kanban Operativo</h1>
              <p className="text-sm text-gray-600">Gestión visual de flujo disciplinario</p>
            </div>
          </div>

          <button
            onClick={() => setShowModalNuevo(true)}
            className="px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2 bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            Nuevo Proceso
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card className="p-4 border-l-4 border-blue-500">
            <p className="text-xs text-gray-600 mb-1">Total Procesos</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </Card>
          <Card className="p-4 border-l-4 border-green-500">
            <p className="text-xs text-gray-600 mb-1">Activos</p>
            <p className="text-2xl font-bold text-green-600">{stats.activos}</p>
          </Card>
          <Card className="p-4 border-l-4 border-red-500">
            <p className="text-xs text-gray-600 mb-1">Vencidos</p>
            <p className="text-2xl font-bold text-red-600">{stats.vencidos}</p>
          </Card>
          <Card className="p-4 border-l-4 border-orange-500">
            <p className="text-xs text-gray-600 mb-1">Sin Asignar</p>
            <p className="text-2xl font-bold text-orange-600">{stats.sinAsignar}</p>
          </Card>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por consecutivo, denunciado o noticia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterEtapa}
          onChange={(e) => setFilterEtapa(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todas las etapas</option>
          <option value="recepcion">Recepción</option>
          <option value="valoracion">Valoración</option>
          <option value="indagacion">Indagación</option>
          <option value="investigacion">Investigación</option>
          <option value="juzgamiento">Juzgamiento</option>
        </select>
        <select
          value={filterSemaforo}
          onChange={(e) => setFilterSemaforo(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todos los estados</option>
          <option value="verde">🟢 Verde</option>
          <option value="amarillo">🟡 Amarillo</option>
          <option value="rojo">🔴 Rojo</option>
        </select>
      </div>

      {/* Vista Kanban */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {/* Columna Recepción */}
          <KanbanColumn
            titulo="Recepción"
            count={procesosPorEtapa.recepcion.length}
            color="#10B981"
            procesos={procesosPorEtapa.recepcion}
            onVerDetalle={(p) => {
              setProcesoSeleccionado(p);
              setShowModalDetalle(true);
            }}
            onAsignar={(p) => {
              setProcesoSeleccionado(p);
              setShowModalAsignar(true);
            }}
            onExpediente={(p) => {
              setProcesoSeleccionado(p);
              setShowModalExpediente(true);
            }}
            onArchivar={(p) => {
              setProcesoSeleccionado(p);
              setShowModalArchivar(true);
            }}
          />

          {/* Columna Valoración */}
          <KanbanColumn
            titulo="Valoración"
            count={procesosPorEtapa.valoracion.length}
            color="#3B82F6"
            procesos={procesosPorEtapa.valoracion}
            onVerDetalle={(p) => {
              setProcesoSeleccionado(p);
              setShowModalDetalle(true);
            }}
            onAsignar={(p) => {
              setProcesoSeleccionado(p);
              setShowModalAsignar(true);
            }}
            onExpediente={(p) => {
              setProcesoSeleccionado(p);
              setShowModalExpediente(true);
            }}
            onArchivar={(p) => {
              setProcesoSeleccionado(p);
              setShowModalArchivar(true);
            }}
          />

          {/* Columna Indagación */}
          <KanbanColumn
            titulo="Indagación"
            count={procesosPorEtapa.indagacion.length}
            color="#8B5CF6"
            procesos={procesosPorEtapa.indagacion}
            onVerDetalle={(p) => {
              setProcesoSeleccionado(p);
              setShowModalDetalle(true);
            }}
            onAsignar={(p) => {
              setProcesoSeleccionado(p);
              setShowModalAsignar(true);
            }}
            onExpediente={(p) => {
              setProcesoSeleccionado(p);
              setShowModalExpediente(true);
            }}
            onArchivar={(p) => {
              setProcesoSeleccionado(p);
              setShowModalArchivar(true);
            }}
          />

          {/* Columna Investigación */}
          <KanbanColumn
            titulo="Investigación"
            count={procesosPorEtapa.investigacion.length}
            color="#F59E0B"
            procesos={procesosPorEtapa.investigacion}
            onVerDetalle={(p) => {
              setProcesoSeleccionado(p);
              setShowModalDetalle(true);
            }}
            onAsignar={(p) => {
              setProcesoSeleccionado(p);
              setShowModalAsignar(true);
            }}
            onExpediente={(p) => {
              setProcesoSeleccionado(p);
              setShowModalExpediente(true);
            }}
            onArchivar={(p) => {
              setProcesoSeleccionado(p);
              setShowModalArchivar(true);
            }}
          />

          {/* Columna Juzgamiento */}
          <KanbanColumn
            titulo="Juzgamiento"
            count={procesosPorEtapa.juzgamiento.length}
            color="#EF4444"
            procesos={procesosPorEtapa.juzgamiento}
            onVerDetalle={(p) => {
              setProcesoSeleccionado(p);
              setShowModalDetalle(true);
            }}
            onAsignar={(p) => {
              setProcesoSeleccionado(p);
              setShowModalAsignar(true);
            }}
            onExpediente={(p) => {
              setProcesoSeleccionado(p);
              setShowModalExpediente(true);
            }}
            onArchivar={(p) => {
              setProcesoSeleccionado(p);
              setShowModalArchivar(true);
            }}
          />
        </div>
      </div>

      {/* Modal Nuevo Proceso */}
      <AnimatePresence>
        {showModalNuevo && (
          <ModalNuevoProceso
            datos={nuevoProceso}
            onChange={setNuevoProceso}
            onCrear={handleCrearProceso}
            onCerrar={() => setShowModalNuevo(false)}
          />
        )}
      </AnimatePresence>

      {/* Modal Detalle */}
      <AnimatePresence>
        {showModalDetalle && procesoSeleccionado && (
          <ModalDetalleProceso
            proceso={procesoSeleccionado}
            onCerrar={() => setShowModalDetalle(false)}
            onAsignar={() => {
              setShowModalDetalle(false);
              setShowModalAsignar(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal Asignar */}
      <AnimatePresence>
        {showModalAsignar && procesoSeleccionado && (
          <ModalAsignarProfesional
            proceso={procesoSeleccionado}
            profesionales={profesionales}
            onAsignar={handleAsignarProfesional}
            onCerrar={() => setShowModalAsignar(false)}
          />
        )}
      </AnimatePresence>

      {/* Modal Expediente */}
      <AnimatePresence>
        {showModalExpediente && procesoSeleccionado && (
          <ModalExpediente
            proceso={procesoSeleccionado}
            onCerrar={() => setShowModalExpediente(false)}
          />
        )}
      </AnimatePresence>

      {/* Modal Archivar */}
      <AnimatePresence>
        {showModalArchivar && procesoSeleccionado && (
          <ModalArchivarProceso
            proceso={procesoSeleccionado}
            onClose={() => {
              setShowModalArchivar(false);
              setProcesoSeleccionado(null);
            }}
            onConfirm={handleArchivarProceso}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== COMPONENTE COLUMNA KANBAN ====================
interface KanbanColumnProps {
  titulo: string;
  count: number;
  color: string;
  procesos: Proceso[];
  onVerDetalle: (proceso: Proceso) => void;
  onAsignar: (proceso: Proceso) => void;
  onExpediente: (proceso: Proceso) => void;
  onArchivar: (proceso: Proceso) => void;
}

function KanbanColumn({ titulo, count, color, procesos, onVerDetalle, onAsignar, onExpediente, onArchivar }: KanbanColumnProps) {
  return (
    <div className="flex-shrink-0 w-80">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: color }} />
          <h3 className="font-bold text-gray-900">{titulo}</h3>
        </div>
        <Badge className="bg-gray-100 text-gray-700">{count}</Badge>
      </div>

      <div className="space-y-3">
        {procesos.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <FolderOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">Sin procesos</p>
          </Card>
        ) : (
          procesos.map((proceso) => (
            <TarjetaProceso
              key={proceso.id}
              proceso={proceso}
              onVerDetalle={() => onVerDetalle(proceso)}
              onAsignar={() => onAsignar(proceso)}
              onExpediente={() => onExpediente(proceso)}
              onArchivar={() => onArchivar(proceso)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ==================== COMPONENTE TARJETA PROCESO ====================
interface TarjetaProcesoProps {
  proceso: Proceso;
  onVerDetalle: () => void;
  onAsignar: () => void;
  onExpediente: () => void;
  onArchivar: () => void;
}

function TarjetaProceso({ proceso, onVerDetalle, onAsignar, onExpediente, onArchivar }: TarjetaProcesoProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
    >
      <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-l-4" style={{ borderLeftColor: proceso.semaforo === 'verde' ? '#10B981' : proceso.semaforo === 'amarillo' ? '#F59E0B' : '#EF4444' }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-bold text-sm text-blue-600">{proceso.consecutivo}</p>
            <p className="text-xs text-gray-500">{proceso.noticia}</p>
          </div>
          <div className={`w-2 h-2 rounded-full ${proceso.semaforo === 'verde' ? 'bg-green-500' : proceso.semaforo === 'amarillo' ? 'bg-yellow-500' : 'bg-red-500'}`} />
        </div>

        {/* Denunciado */}
        <div className="mb-3">
          <p className="font-semibold text-sm text-gray-900 mb-1">{proceso.disciplinable.nombre}</p>
          <p className="text-xs text-gray-600">{proceso.disciplinable.cargo}</p>
          <p className="text-xs text-gray-500">{proceso.disciplinable.dependencia}</p>
        </div>

        {/* Progreso */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-600">Avance</span>
            <span className={`font-semibold ${proceso.porcentajeTiempo > 100 ? 'text-red-600' : proceso.porcentajeTiempo > 75 ? 'text-yellow-600' : 'text-green-600'}`}>
              {proceso.porcentajeTiempo}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${Math.min(proceso.porcentajeTiempo, 100)}%`,
                background: proceso.porcentajeTiempo > 100 ? '#EF4444' : proceso.porcentajeTiempo > 75 ? '#F59E0B' : '#10B981'
              }}
            />
          </div>
        </div>

        {/* Asignado */}
        {proceso.profesionalAsignado ? (
          <div className="flex items-center gap-2 mb-3 p-2 bg-blue-50 rounded-lg">
            <UserCheck className="w-3 h-3 text-blue-600" />
            <span className="text-xs text-blue-900 font-medium">{proceso.profesionalAsignado}</span>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAsignar();
            }}
            className="w-full mb-3 p-2 bg-orange-50 border border-orange-200 rounded-lg text-xs font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
          >
            Asignar Profesional
          </button>
        )}

        {/* Días restantes */}
        <div className="flex items-center gap-2 mb-3 text-xs">
          <Clock className="w-3 h-3 text-gray-400" />
          <span className={`font-semibold ${proceso.diasRestantes < 0 ? 'text-red-600' : proceso.diasRestantes <= 3 ? 'text-yellow-600' : 'text-green-600'}`}>
            {proceso.diasRestantes < 0 ? `${Math.abs(proceso.diasRestantes)} días vencido` : `${proceso.diasRestantes} días restantes`}
          </span>
        </div>

        {/* Acciones */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onVerDetalle();
            }}
            className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
          >
            <Eye className="w-3 h-3" />
            Ver Expediente
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpediente();
            }}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
          >
            <FolderOpen className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArchivar();
            }}
            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </Card>
    </motion.div>
  );
}

// ==================== MODAL NUEVO PROCESO ====================
interface ModalNuevoProcesoProps {
  datos: any;
  onChange: (datos: any) => void;
  onCrear: () => void;
  onCerrar: () => void;
}

function ModalNuevoProceso({ datos, onChange, onCrear, onCerrar }: ModalNuevoProcesoProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-blue-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gavel className="w-6 h-6" />
              <h2 className="text-xl font-bold">Crear Nuevo Proceso Disciplinario</h2>
            </div>
            <button
              onClick={onCerrar}
              className="p-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Información de la Noticia */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3">Información de Origen</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Noticia Disciplinaria *
                </label>
                <input
                  type="text"
                  placeholder="ND-2025-XXXX"
                  value={datos.noticia}
                  onChange={(e) => onChange({...datos, noticia: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Territorial *
                </label>
                <select
                  value={datos.territorial}
                  onChange={(e) => onChange({...datos, territorial: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccione</option>
                  <option value="Bogotá D.C.">Bogotá D.C.</option>
                  <option value="Antioquia">Antioquia</option>
                  <option value="Valle del Cauca">Valle del Cauca</option>
                  <option value="Atlántico">Atlántico</option>
                  <option value="Santander">Santander</option>
                </select>
              </div>
            </div>
          </div>

          {/* Información del Disciplinable */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3">Información del Disciplinable</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  placeholder="Nombres y apellidos"
                  value={datos.nombre}
                  onChange={(e) => onChange({...datos, nombre: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Identificación *
                </label>
                <input
                  type="text"
                  placeholder="Número de cédula"
                  value={datos.identificacion}
                  onChange={(e) => onChange({...datos, identificacion: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cargo
                </label>
                <input
                  type="text"
                  placeholder="Cargo del funcionario"
                  value={datos.cargo}
                  onChange={(e) => onChange({...datos, cargo: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Dependencia
                </label>
                <input
                  type="text"
                  placeholder="Dependencia o área"
                  value={datos.dependencia}
                  onChange={(e) => onChange({...datos, dependencia: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="email@esap.edu.co"
                  value={datos.email}
                  onChange={(e) => onChange({...datos, email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  placeholder="3001234567"
                  value={datos.telefono}
                  onChange={(e) => onChange({...datos, telefono: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Hechos */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Hechos
            </label>
            <textarea
              rows={4}
              placeholder="Descripción de los hechos que originan el proceso..."
              value={datos.hechos}
              onChange={(e) => onChange({...datos, hechos: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onCerrar}
              className="flex-1 px-6 py-3 rounded-lg font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onCrear}
              className="flex-1 px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Crear Proceso
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==================== MODAL DETALLE PROCESO ====================
interface ModalDetalleProcesoProps {
  proceso: Proceso;
  onCerrar: () => void;
  onAsignar: () => void;
}

function ModalDetalleProceso({ proceso, onCerrar, onAsignar }: ModalDetalleProcesoProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold">{proceso.consecutivo}</h2>
                <p className="text-blue-100 text-sm">Expediente Completo</p>
              </div>
            </div>
            <button
              onClick={onCerrar}
              className="p-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Estado del Proceso */}
          <div className={`p-4 rounded-lg border-2 ${
            proceso.semaforo === 'rojo' ? 'bg-red-50 border-red-300' :
            proceso.semaforo === 'amarillo' ? 'bg-yellow-50 border-yellow-300' :
            'bg-green-50 border-green-300'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {proceso.diasRestantes < 0 ? (
                  <>
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    <div>
                      <p className="font-bold text-red-900">PROCESO VENCIDO</p>
                      <p className="text-sm text-red-700">
                        Vencido hace {Math.abs(proceso.diasRestantes)} días
                      </p>
                    </div>
                  </>
                ) : proceso.diasRestantes <= 3 ? (
                  <>
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                    <div>
                      <p className="font-bold text-yellow-900">PRÓXIMO A VENCER</p>
                      <p className="text-sm text-yellow-700">
                        Quedan {proceso.diasRestantes} días
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-bold text-green-900">PROCESO ACTIVO</p>
                      <p className="text-sm text-green-700">
                        {proceso.diasRestantes} días restantes
                      </p>
                    </div>
                  </>
                )}
              </div>
              <Badge className="text-xs font-bold">{proceso.etapaLabel}</Badge>
            </div>
          </div>

          {/* Información del Disciplinable */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Información del Disciplinable
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Nombre Completo</p>
                <p className="font-semibold text-gray-900">{proceso.disciplinable.nombre}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Identificación</p>
                <p className="font-semibold text-gray-900">{proceso.disciplinable.identificacion}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Cargo</p>
                <p className="font-semibold text-gray-900">{proceso.disciplinable.cargo}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Dependencia</p>
                <p className="font-semibold text-gray-900">{proceso.disciplinable.dependencia}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Email</p>
                <p className="font-semibold text-gray-900">{proceso.disciplinable.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Teléfono</p>
                <p className="font-semibold text-gray-900">{proceso.disciplinable.telefono}</p>
              </div>
            </div>
          </div>

          {/* Información del Proceso */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Información del Proceso
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Noticia Origen</p>
                <p className="font-semibold text-gray-900">{proceso.noticia}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Territorial</p>
                <p className="font-semibold text-gray-900">{proceso.territorial}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Fecha Creación</p>
                <p className="font-semibold text-gray-900">{proceso.fechaCreacion}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Fecha Vencimiento</p>
                <p className="font-semibold text-gray-900">{proceso.fechaVencimiento}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-600 mb-1">Última Actuación</p>
                <p className="font-semibold text-gray-900">{proceso.ultimaActuacion}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-600 mb-1">Hechos</p>
                <p className="text-sm text-gray-700">{proceso.hechos}</p>
              </div>
            </div>
          </div>

          {/* Profesional Asignado */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              Profesional Asignado
            </h3>
            {proceso.profesionalAsignado ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-blue-600 text-white">
                      {proceso.profesionalAsignado.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900">{proceso.profesionalAsignado}</p>
                    <p className="text-xs text-gray-600">Profesional OCID</p>
                  </div>
                </div>
                <button
                  onClick={onAsignar}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-colors"
                >
                  Reasignar
                </button>
              </div>
            ) : (
              <button
                onClick={onAsignar}
                className="w-full p-3 bg-orange-50 border-2 border-orange-200 rounded-lg text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                Asignar Profesional
              </button>
            )}
          </div>

          {/* Documentos */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
              <Paperclip className="w-5 h-5 text-blue-600" />
              Documentos ({proceso.documentos})
            </h3>
            <button className="w-full p-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Ver Expediente Electrónico
            </button>
          </div>

          {/* Historial */}
          {proceso.historialAuditoria.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
                <History className="w-5 h-5 text-blue-600" />
                Historial de Acciones
              </h3>
              <div className="space-y-2">
                {proceso.historialAuditoria.map((accion) => (
                  <div key={accion.id} className="flex gap-3 p-3 bg-white rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{accion.tipo}</p>
                      <p className="text-xs text-gray-600">{accion.usuario} - {accion.fecha}</p>
                      {accion.observaciones && (
                        <p className="text-xs text-gray-700 mt-1">{accion.observaciones}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3">
            <button
              onClick={onCerrar}
              className="flex-1 px-6 py-3 rounded-lg font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={() => toast.info('Exportar PDF')}
              className="flex-1 px-6 py-3 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Exportar PDF
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==================== MODAL ASIGNAR PROFESIONAL ====================
interface ModalAsignarProfesionalProps {
  proceso: Proceso;
  profesionales: Profesional[];
  onAsignar: (profesionalId: string) => void;
  onCerrar: () => void;
}

function ModalAsignarProfesional({ proceso, profesionales, onAsignar, onCerrar }: ModalAsignarProfesionalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-blue-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserCheck className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold">Asignar Profesional</h2>
                <p className="text-blue-100 text-sm">{proceso.consecutivo}</p>
              </div>
            </div>
            <button
              onClick={onCerrar}
              className="p-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Seleccione el profesional que se encargará de este proceso:
          </p>

          <div className="space-y-3">
            {profesionales.map((profesional) => {
              const cargaActual = (profesional.procesosAsignados / profesional.capacidadMaxima) * 100;
              const disponible = profesional.procesosAsignados < profesional.capacidadMaxima;

              return (
                <button
                  key={profesional.id}
                  onClick={() => disponible && onAsignar(profesional.id)}
                  disabled={!disponible}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    disponible
                      ? 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                      : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-blue-600 text-white">
                          {profesional.nombre.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-gray-900">{profesional.nombre}</p>
                        <p className="text-xs text-gray-600">{profesional.cargo}</p>
                      </div>
                    </div>
                    <Badge className={disponible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {disponible ? 'Disponible' : 'Saturado'}
                    </Badge>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">Carga de trabajo</span>
                      <span className="font-semibold text-gray-900">
                        {profesional.procesosAsignados}/{profesional.capacidadMaxima}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${cargaActual}%`,
                          background: cargaActual >= 100 ? '#EF4444' : cargaActual >= 75 ? '#F59E0B' : '#10B981'
                        }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={onCerrar}
            className="w-full px-6 py-3 rounded-lg font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==================== MODAL EXPEDIENTE ====================
interface ModalExpedienteProps {
  proceso: Proceso;
  onCerrar: () => void;
}

function ModalExpediente({ proceso, onCerrar }: ModalExpedienteProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold">Expediente Electrónico</h2>
                <p className="text-blue-100 text-sm">{proceso.consecutivo}</p>
              </div>
            </div>
            <button
              onClick={onCerrar}
              className="p-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Expediente en Desarrollo
            </h3>
            <p className="text-gray-600 mb-6">
              Esta funcionalidad permitirá acceder a todos los documentos del proceso
            </p>
            <button
              onClick={onCerrar}
              className="px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}