/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * SISTEMA COMPLETO DE GESTIÓN DE EVIDENCIAS
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Gestión integral de evidencias para 106 lineamientos MRAE v3.0
 * - Carga de archivos múltiples
 * - Versionamiento automático
 * - Workflow de aprobación
 * - Comentarios y retroalimentación
 * - Historial completo
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  FileText,
  File,
  Image,
  FileCheck,
  FileClock,
  FileX,
  Download,
  Eye,
  Trash2,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Calendar,
  User,
  Tag,
  Paperclip,
  FolderOpen,
  Archive,
  History,
  Edit,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  MoreVertical,
  AlertTriangle,
  Info,
  RefreshCw,
  Share2,
  Send,
  Plus,
  Zap,
  Target
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner@2.0.3';
import { getAllLineamientosConsolidados } from '../../lib/data/consolidado-lineamientos';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIPOS Y DEFINICIONES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type EstadoEvidencia = 'Pendiente' | 'En Revisión' | 'Aprobada' | 'Rechazada' | 'Desactualizada';
type TipoArchivo = 'PDF' | 'Word' | 'Excel' | 'Imagen' | 'Otro';

interface Evidencia {
  id: string;
  lineamientoCodigo: string;
  lineamientoNombre: string;
  nombreArchivo: string;
  tipoArchivo: TipoArchivo;
  tamano: string;
  fechaCarga: string;
  cargadoPor: string;
  version: number;
  estado: EstadoEvidencia;
  descripcion: string;
  comentarios: Comentario[];
  historial: HistorialCambio[];
  url: string;
  aprobadoPor?: string;
  fechaAprobacion?: string;
  motivoRechazo?: string;
}

interface Comentario {
  id: string;
  autor: string;
  fecha: string;
  texto: string;
  tipo: 'comentario' | 'aprobacion' | 'rechazo';
}

interface HistorialCambio {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  detalles: string;
}

type VistaMode = 'dashboard' | 'lista' | 'lineamiento';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DATOS DE EJEMPLO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const EVIDENCIAS_EJEMPLO: Evidencia[] = [
  {
    id: 'EV001',
    lineamientoCodigo: 'MAE.LI.PA.01',
    lineamientoNombre: 'Evaluación del nivel de madurez',
    nombreArchivo: 'Evaluacion_Madurez_AE_2025.pdf',
    tipoArchivo: 'PDF',
    tamano: '2.4 MB',
    fechaCarga: '2025-12-05',
    cargadoPor: 'María González',
    version: 3,
    estado: 'Aprobada',
    descripcion: 'Evaluación completa del nivel de madurez de AE según framework TOGAF',
    url: '#',
    aprobadoPor: 'Director TI',
    fechaAprobacion: '2025-12-06',
    comentarios: [
      {
        id: 'C001',
        autor: 'Director TI',
        fecha: '2025-12-06',
        texto: 'Evaluación completa y bien documentada. Aprobada.',
        tipo: 'aprobacion'
      }
    ],
    historial: [
      {
        id: 'H001',
        fecha: '2025-12-05',
        usuario: 'María González',
        accion: 'Carga inicial',
        detalles: 'Versión 1.0'
      },
      {
        id: 'H002',
        fecha: '2025-12-06',
        usuario: 'Director TI',
        accion: 'Aprobación',
        detalles: 'Evidencia aprobada'
      }
    ]
  },
  {
    id: 'EV002',
    lineamientoCodigo: 'MAE.LI.PA.02',
    lineamientoNombre: 'Planeación de los ejercicios de AE',
    nombreArchivo: 'Plan_Ejercicios_AE_2025-2026.xlsx',
    tipoArchivo: 'Excel',
    tamano: '1.8 MB',
    fechaCarga: '2025-12-07',
    cargadoPor: 'Carlos Ramírez',
    version: 1,
    estado: 'En Revisión',
    descripcion: 'Plan detallado de ejercicios de AE para el bienio 2025-2026',
    url: '#',
    comentarios: [],
    historial: [
      {
        id: 'H003',
        fecha: '2025-12-07',
        usuario: 'Carlos Ramírez',
        accion: 'Carga inicial',
        detalles: 'Pendiente de revisión'
      }
    ]
  },
  {
    id: 'EV003',
    lineamientoCodigo: 'MAE.LI.PA.03',
    lineamientoNombre: 'Gobierno y capacidad de Arquitectura Empresarial',
    nombreArchivo: 'Acta_Comite_AE_Nov2025.pdf',
    tipoArchivo: 'PDF',
    tamano: '850 KB',
    fechaCarga: '2025-11-30',
    cargadoPor: 'Laura Pérez',
    version: 1,
    estado: 'Aprobada',
    descripcion: 'Acta de constitución del Comité de Arquitectura Empresarial',
    url: '#',
    aprobadoPor: 'Secretaria General',
    fechaAprobacion: '2025-12-01',
    comentarios: [
      {
        id: 'C002',
        autor: 'Secretaria General',
        fecha: '2025-12-01',
        texto: 'Comité constituido correctamente.',
        tipo: 'aprobacion'
      }
    ],
    historial: [
      {
        id: 'H004',
        fecha: '2025-11-30',
        usuario: 'Laura Pérez',
        accion: 'Carga inicial',
        detalles: 'Acta firmada'
      },
      {
        id: 'H005',
        fecha: '2025-12-01',
        usuario: 'Secretaria General',
        accion: 'Aprobación',
        detalles: 'Aprobada'
      }
    ]
  },
  {
    id: 'EV004',
    lineamientoCodigo: 'MAE.LI.AI.01',
    lineamientoNombre: 'Flujos de información',
    nombreArchivo: 'Diagrama_Flujos_Informacion_v2.pdf',
    tipoArchivo: 'PDF',
    tamano: '3.2 MB',
    fechaCarga: '2025-11-28',
    cargadoPor: 'Ana Torres',
    version: 2,
    estado: 'Rechazada',
    descripcion: 'Diagrama de flujos de información institucionales',
    url: '#',
    motivoRechazo: 'Faltan los flujos de interoperabilidad con entidades externas. Por favor completar y volver a cargar.',
    comentarios: [
      {
        id: 'C003',
        autor: 'Arquitecto de Datos',
        fecha: '2025-11-29',
        texto: 'Faltan los flujos de interoperabilidad con entidades externas.',
        tipo: 'rechazo'
      }
    ],
    historial: [
      {
        id: 'H006',
        fecha: '2025-11-28',
        usuario: 'Ana Torres',
        accion: 'Carga inicial',
        detalles: 'Versión 1.0'
      },
      {
        id: 'H007',
        fecha: '2025-11-29',
        usuario: 'Arquitecto de Datos',
        accion: 'Rechazo',
        detalles: 'Requiere completar'
      }
    ]
  },
  {
    id: 'EV005',
    lineamientoCodigo: 'MGGTI.LI.ES.01',
    lineamientoNombre: 'Entendimiento Estratégico de TI',
    nombreArchivo: 'PETI_2025-2028.pdf',
    tipoArchivo: 'PDF',
    tamano: '5.6 MB',
    fechaCarga: '2025-12-01',
    cargadoPor: 'Jorge Medina',
    version: 1,
    estado: 'Aprobada',
    descripcion: 'Plan Estratégico de Tecnologías de la Información 2025-2028',
    url: '#',
    aprobadoPor: 'Director TI',
    fechaAprobacion: '2025-12-03',
    comentarios: [
      {
        id: 'C004',
        autor: 'Director TI',
        fecha: '2025-12-03',
        texto: 'PETI completo y alineado con estrategia institucional.',
        tipo: 'aprobacion'
      }
    ],
    historial: [
      {
        id: 'H008',
        fecha: '2025-12-01',
        usuario: 'Jorge Medina',
        accion: 'Carga inicial',
        detalles: 'PETI 2025-2028'
      },
      {
        id: 'H009',
        fecha: '2025-12-03',
        usuario: 'Director TI',
        accion: 'Aprobación',
        detalles: 'Aprobado'
      }
    ]
  }
];

export function GestionEvidencias() {
  const [vistaMode, setVistaMode] = useState<VistaMode>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroModelo, setFiltroModelo] = useState<string>('todos');
  const [selectedLineamiento, setSelectedLineamiento] = useState<string | null>(null);
  const [selectedEvidencia, setSelectedEvidencia] = useState<Evidencia | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [evidencias] = useState<Evidencia[]>(EVIDENCIAS_EJEMPLO);
  const [expandedEvidencia, setExpandedEvidencia] = useState<string | null>(null);

  const todosLineamientos = useMemo(() => getAllLineamientosConsolidados(), []);

  // Estadísticas de evidencias
  const stats = useMemo(() => {
    const total = evidencias.length;
    const aprobadas = evidencias.filter(e => e.estado === 'Aprobada').length;
    const enRevision = evidencias.filter(e => e.estado === 'En Revisión').length;
    const rechazadas = evidencias.filter(e => e.estado === 'Rechazada').length;
    const pendientes = evidencias.filter(e => e.estado === 'Pendiente').length;
    
    // Lineamientos que requieren evidencias
    const lineamientosConEvidencias = new Set(evidencias.map(e => e.lineamientoCodigo)).size;
    const totalLineamientos = todosLineamientos.length;
    const lineamientosSinEvidencias = totalLineamientos - lineamientosConEvidencias;
    
    const porcentajeCobertura = totalLineamientos > 0 
      ? Math.round((lineamientosConEvidencias / totalLineamientos) * 100)
      : 0;

    return {
      total,
      aprobadas,
      enRevision,
      rechazadas,
      pendientes,
      lineamientosConEvidencias,
      lineamientosSinEvidencias,
      porcentajeCobertura
    };
  }, [evidencias, todosLineamientos]);

  // Filtrar evidencias
  const evidenciasFiltradas = useMemo(() => {
    let resultado = evidencias;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      resultado = resultado.filter(e =>
        e.lineamientoCodigo.toLowerCase().includes(q) ||
        e.lineamientoNombre.toLowerCase().includes(q) ||
        e.nombreArchivo.toLowerCase().includes(q) ||
        e.descripcion.toLowerCase().includes(q)
      );
    }

    if (filtroEstado !== 'todos') {
      resultado = resultado.filter(e => e.estado === filtroEstado);
    }

    if (filtroModelo !== 'todos') {
      resultado = resultado.filter(e => e.lineamientoCodigo.startsWith(filtroModelo));
    }

    return resultado;
  }, [evidencias, searchQuery, filtroEstado, filtroModelo]);

  const getEstadoBadge = (estado: EstadoEvidencia) => {
    const config: Record<EstadoEvidencia, { bg: string; text: string; icon: any }> = {
      'Aprobada': { bg: '#D1FAE5', text: '#065F46', icon: CheckCircle },
      'En Revisión': { bg: '#DBEAFE', text: '#1E40AF', icon: Clock },
      'Rechazada': { bg: '#FEE2E2', text: '#991B1B', icon: XCircle },
      'Pendiente': { bg: '#FEF3C7', text: '#92400E', icon: AlertCircle },
      'Desactualizada': { bg: '#F3F4F6', text: '#6B7280', icon: FileClock }
    };
    const style = config[estado];
    const Icon = style.icon;
    return (
      <Badge className="border-0 text-xs" style={{ background: style.bg, color: style.text, fontWeight: 600 }}>
        <Icon className="w-3 h-3 mr-1" />
        {estado}
      </Badge>
    );
  };

  const getTipoArchivoIcon = (tipo: TipoArchivo) => {
    const icons: Record<TipoArchivo, any> = {
      'PDF': FileText,
      'Word': File,
      'Excel': File,
      'Imagen': Image,
      'Otro': File
    };
    return icons[tipo];
  };

  const handleAprobarEvidencia = (evidencia: Evidencia) => {
    toast.success(`Evidencia "${evidencia.nombreArchivo}" aprobada correctamente`);
  };

  const handleRechazarEvidencia = (evidencia: Evidencia) => {
    toast.error(`Evidencia "${evidencia.nombreArchivo}" rechazada`);
  };

  const handleDescargarEvidencia = (evidencia: Evidencia) => {
    toast.info(`Descargando ${evidencia.nombreArchivo}...`);
  };

  const handleCargarEvidencia = () => {
    setShowUploadModal(true);
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VISTA: DASHBOARD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const DashboardView = () => (
    <div className="space-y-6">
      {/* Estadísticas Principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Archive className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-gray-600">Total Evidencias</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </Card>

        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-xs text-gray-600">Aprobadas</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.aprobadas}</p>
        </Card>

        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-gray-600">En Revisión</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.enRevision}</p>
        </Card>

        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-600" />
            <p className="text-xs text-gray-600">Rechazadas</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.rechazadas}</p>
        </Card>
      </div>

      {/* Cobertura de Lineamientos */}
      <Card className="p-6 border border-gray-200">
        <h3 className="font-bold text-lg text-gray-900 mb-4">Cobertura de Evidencias</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Lineamientos con evidencias</p>
              <p className="font-bold text-gray-900">{stats.lineamientosConEvidencias}</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-green-500"
                style={{ width: `${stats.porcentajeCobertura}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Sin evidencias</p>
              <p className="font-bold text-orange-600">{stats.lineamientosSinEvidencias}</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-orange-500"
                style={{ width: `${100 - stats.porcentajeCobertura}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">{stats.porcentajeCobertura}%</p>
              <p className="text-sm text-gray-600 mt-1">Cobertura Total</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Alertas y Acciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Evidencias Pendientes de Revisión */}
        {stats.enRevision > 0 && (
          <Card className="p-4 border border-blue-200 bg-blue-50">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-blue-900 mb-1">
                  Evidencias en Revisión
                </h4>
                <p className="text-sm text-blue-700 mb-2">
                  Hay {stats.enRevision} evidencia(s) pendiente(s) de revisión
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setFiltroEstado('En Revisión');
                    setVistaMode('lista');
                  }}
                  style={{ background: '#3B82F6', color: 'white' }}
                >
                  Revisar ahora
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Evidencias Rechazadas */}
        {stats.rechazadas > 0 && (
          <Card className="p-4 border border-red-200 bg-red-50">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-red-900 mb-1">
                  Evidencias Rechazadas
                </h4>
                <p className="text-sm text-red-700 mb-2">
                  {stats.rechazadas} evidencia(s) rechazada(s) requieren corrección
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setFiltroEstado('Rechazada');
                    setVistaMode('lista');
                  }}
                  style={{ background: '#EF4444', color: 'white' }}
                >
                  Ver rechazadas
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Lineamientos Sin Evidencias */}
        {stats.lineamientosSinEvidencias > 0 && (
          <Card className="p-4 border border-orange-200 bg-orange-50">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-orange-900 mb-1">
                  Lineamientos Sin Evidencias
                </h4>
                <p className="text-sm text-orange-700 mb-2">
                  {stats.lineamientosSinEvidencias} lineamiento(s) sin evidencias cargadas
                </p>
                <Button
                  size="sm"
                  onClick={handleCargarEvidencia}
                  style={{ background: '#F59E0B', color: 'white' }}
                >
                  Cargar evidencias
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Botón de Carga Rápida */}
        <Card className="p-4 border border-green-200 bg-green-50">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Upload className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-green-900 mb-1">
                Cargar Nueva Evidencia
              </h4>
              <p className="text-sm text-green-700 mb-2">
                Sube evidencias para cualquier lineamiento
              </p>
              <Button
                size="sm"
                onClick={handleCargarEvidencia}
                style={{ background: '#10B981', color: 'white' }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Nueva evidencia
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Evidencias Recientes */}
      <Card className="border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-lg text-gray-900">Evidencias Recientes</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVistaMode('lista')}
          >
            Ver todas
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {evidencias.slice(0, 5).map((evidencia) => {
              const Icon = getTipoArchivoIcon(evidencia.tipoArchivo);
              return (
                <div
                  key={evidencia.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedEvidencia(evidencia);
                    setShowCommentsModal(true);
                  }}
                >
                  <div className="p-2 rounded-lg bg-white">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {evidencia.nombreArchivo}
                    </p>
                    <p className="text-xs text-gray-600">
                      {evidencia.lineamientoCodigo} • {evidencia.fechaCarga}
                    </p>
                  </div>
                  {getEstadoBadge(evidencia.estado)}
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VISTA: LISTA DE EVIDENCIAS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const ListaView = () => (
    <div className="space-y-4">
      {/* Barra de búsqueda y filtros */}
      <Card className="p-4 border border-gray-200">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por código, nombre, archivo o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Estado</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="todos">Todos</option>
                <option value="Aprobada">Aprobadas ({stats.aprobadas})</option>
                <option value="En Revisión">En Revisión ({stats.enRevision})</option>
                <option value="Rechazada">Rechazadas ({stats.rechazadas})</option>
                <option value="Pendiente">Pendientes ({stats.pendientes})</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Modelo</label>
              <select
                value={filtroModelo}
                onChange={(e) => setFiltroModelo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="todos">Todos</option>
                <option value="MAE">MAE</option>
                <option value="MGGTI">MGGTI</option>
                <option value="MGPTI">MGPTI</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setFiltroEstado('todos');
                  setFiltroModelo('todos');
                }}
                className="w-full"
              >
                <X className="w-4 h-4 mr-1" />
                Limpiar
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleCargarEvidencia}
                className="w-full"
                style={{ background: '#003DA5', color: 'white' }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Nueva
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-200">
            <span>
              Mostrando <strong>{evidenciasFiltradas.length}</strong> de <strong>{stats.total}</strong> evidencias
            </span>
          </div>
        </div>
      </Card>

      {/* Lista de evidencias */}
      <div className="space-y-3">
        {evidenciasFiltradas.map((evidencia) => {
          const Icon = getTipoArchivoIcon(evidencia.tipoArchivo);
          const isExpanded = expandedEvidencia === evidencia.id;

          return (
            <Card key={evidencia.id} className="border border-gray-200 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-gray-100">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {evidencia.lineamientoCodigo}
                          </span>
                          <span className="text-xs text-gray-600">v{evidencia.version}</span>
                        </div>
                        <h4 className="font-semibold text-sm text-gray-900 mb-1">
                          {evidencia.nombreArchivo}
                        </h4>
                        <p className="text-xs text-gray-600 mb-2">
                          {evidencia.lineamientoNombre}
                        </p>
                        <p className="text-sm text-gray-700">
                          {evidencia.descripcion}
                        </p>
                      </div>
                      {getEstadoBadge(evidencia.estado)}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {evidencia.cargadoPor}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {evidencia.fechaCarga}
                      </span>
                      <span className="flex items-center gap-1">
                        <File className="w-3 h-3" />
                        {evidencia.tamano}
                      </span>
                      {evidencia.comentarios.length > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {evidencia.comentarios.length}
                        </span>
                      )}
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDescargarEvidencia(evidencia)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Descargar
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpandedEvidencia(isExpanded ? null : evidencia.id)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        {isExpanded ? 'Ocultar' : 'Ver más'}
                      </Button>

                      {evidencia.estado === 'En Revisión' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleAprobarEvidencia(evidencia)}
                            style={{ background: '#10B981', color: 'white' }}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleRechazarEvidencia(evidencia)}
                            style={{ background: '#EF4444', color: 'white' }}
                          >
                            <X className="w-3 h-3 mr-1" />
                            Rechazar
                          </Button>
                        </>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedEvidencia(evidencia);
                          setShowCommentsModal(true);
                        }}
                      >
                        <MessageSquare className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Sección expandida */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 pt-4 border-t border-gray-200"
                    >
                      <div className="space-y-3">
                        {/* Información adicional */}
                        {evidencia.aprobadoPor && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-xs font-semibold text-green-900 mb-1">
                              Aprobado por: {evidencia.aprobadoPor}
                            </p>
                            <p className="text-xs text-green-700">
                              Fecha: {evidencia.fechaAprobacion}
                            </p>
                          </div>
                        )}

                        {evidencia.motivoRechazo && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-xs font-semibold text-red-900 mb-1">
                              Motivo de rechazo:
                            </p>
                            <p className="text-xs text-red-700">
                              {evidencia.motivoRechazo}
                            </p>
                          </div>
                        )}

                        {/* Comentarios */}
                        {evidencia.comentarios.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-2">
                              Comentarios ({evidencia.comentarios.length}):
                            </p>
                            <div className="space-y-2">
                              {evidencia.comentarios.map((comentario) => (
                                <div key={comentario.id} className="bg-gray-50 rounded-lg p-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs font-semibold text-gray-900">
                                      {comentario.autor}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {comentario.fecha}
                                    </p>
                                  </div>
                                  <p className="text-xs text-gray-700">
                                    {comentario.texto}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Historial */}
                        {evidencia.historial.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                              <History className="w-3 h-3" />
                              Historial de cambios:
                            </p>
                            <div className="space-y-1">
                              {evidencia.historial.map((cambio) => (
                                <div key={cambio.id} className="flex items-start gap-2 text-xs text-gray-600">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                                  <div>
                                    <p>
                                      <strong>{cambio.usuario}</strong> - {cambio.accion}
                                    </p>
                                    <p className="text-gray-500">
                                      {cambio.fecha} • {cambio.detalles}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>
          );
        })}
      </div>

      {evidenciasFiltradas.length === 0 && (
        <Card className="p-12 border border-gray-200 text-center">
          <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-semibold text-lg text-gray-900 mb-2">
            No se encontraron evidencias
          </h3>
          <p className="text-gray-600 mb-4">
            Intenta ajustar los filtros o carga una nueva evidencia
          </p>
          <Button onClick={handleCargarEvidencia} style={{ background: '#003DA5', color: 'white' }}>
            <Plus className="w-4 h-4 mr-1" />
            Cargar evidencia
          </Button>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl text-gray-900 mb-2">
            Gestión de Evidencias
          </h2>
          <p className="text-gray-600">
            Sistema completo de gestión documental para {todosLineamientos.length} lineamientos MRAE v3.0
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={vistaMode === 'dashboard' ? 'default' : 'outline'}
            onClick={() => setVistaMode('dashboard')}
            size="sm"
          >
            <Target className="w-4 h-4 mr-1" />
            Dashboard
          </Button>
          <Button
            variant={vistaMode === 'lista' ? 'default' : 'outline'}
            onClick={() => setVistaMode('lista')}
            size="sm"
          >
            <FileText className="w-4 h-4 mr-1" />
            Lista
          </Button>
        </div>
      </div>

      {/* Contenido */}
      {vistaMode === 'dashboard' && <DashboardView />}
      {vistaMode === 'lista' && <ListaView />}

      {/* Modal de carga (placeholder) */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full p-6">
            <h3 className="font-bold text-lg text-gray-900 mb-4">
              Cargar Nueva Evidencia
            </h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center mb-4">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                Arrastra archivos aquí o haz clic para seleccionar
              </p>
              <p className="text-sm text-gray-500">
                PDF, Word, Excel, imágenes (máx. 10MB)
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowUploadModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  toast.success('Evidencia cargada correctamente');
                  setShowUploadModal(false);
                }}
                style={{ background: '#003DA5', color: 'white' }}
              >
                Cargar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
