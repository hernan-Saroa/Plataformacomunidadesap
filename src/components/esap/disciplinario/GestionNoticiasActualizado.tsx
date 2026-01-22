/**
 * GESTIÓN DE NOTICIAS DISCIPLINARIAS - RF001 y RF002
 * Diseño actualizado alineado con el estándar ESAP (SIGL v5.0)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Plus, Eye, Edit, Trash2, FileText, Calendar, User,
  Building2, AlertCircle, Download, Filter, ArrowRight, CheckCircle,
  X, Save, Upload, CornerDownLeft, UserCheck, Clock, MessageSquare,
  Paperclip, History, Bell, HelpCircle, Send, Archive
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';

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
  tipo: 'creacion' | 'devolucion' | 'asignacion' | 'conversion' | 'edicion';
  usuario: string;
  fecha: string;
  observaciones?: string;
  archivos?: string[];
  profesionalAsignado?: string;
}

interface NoticiaDisciplinaria {
  id: string;
  numeroRadicado: string;
  origen: 'Anónimo' | 'Quejoso' | 'Informante' | 'De oficio' | 'Remisión por competencia';
  fechaQueja: string;
  territorial: string;
  denunciado: {
    nombre: string;
    identificacion: string;
    cargo: string;
    dependencia: string;
  };
  estado: 'pendiente' | 'en-valoracion' | 'devuelto' | 'asignado' | 'convertido-proceso';
  estadoLabel: 'Pendiente' | 'En Valoración' | 'Devuelto' | 'Asignado' | 'Convertido a Proceso';
  etapa: string;
  diasTranscurridos: number;
  radicador: string;
  fechaRegistro: string;
  conductas?: string[];
  descripcion?: string;
  profesionalAsignado?: string;
  procesoAsociado?: string;
  historialAuditoria: AccionAuditoria[];
}

// ==================== MOCK DATA ====================
const PROFESIONALES_MOCK: Profesional[] = [
  { id: '1', nombre: 'Juan Carlos Pérez', cargo: 'Profesional Especializado', email: 'juan.perez@esap.edu.co', procesosAsignados: 8, capacidadMaxima: 12 },
  { id: '2', nombre: 'María Torres Silva', cargo: 'Profesional Universitario', email: 'maria.torres@esap.edu.co', procesosAsignados: 6, capacidadMaxima: 10 },
  { id: '3', nombre: 'Carlos Mendoza López', cargo: 'Profesional Senior', email: 'carlos.mendoza@esap.edu.co', procesosAsignados: 10, capacidadMaxima: 15 },
];

const MOCK_NOTICIAS: NoticiaDisciplinaria[] = [
  {
    id: '1',
    numeroRadicado: 'ND-2025-0025',
    origen: 'Quejoso',
    fechaQueja: '2025-01-15',
    territorial: 'Territorial Bogotá',
    denunciado: {
      nombre: 'Ana María López Martínez',
      identificacion: '52.345.678',
      cargo: 'Profesional Universitario',
      dependencia: 'Territorial Bogotá'
    },
    estado: 'en-valoracion',
    estadoLabel: 'En Valoración',
    etapa: 'Valoración Inicial',
    diasTranscurridos: 3,
    radicador: 'María González',
    fechaRegistro: '2025-01-15T09:30:00',
    conductas: ['Incumplimiento de deberes', 'Negligencia en funciones'],
    descripcion: 'Presunto incumplimiento de funciones en proceso de contratación',
    historialAuditoria: [
      {
        id: '1',
        tipo: 'creacion',
        usuario: 'María González',
        fecha: '2025-01-15T09:30:00',
        observaciones: 'Noticia radicada inicialmente'
      }
    ]
  },
  {
    id: '2',
    numeroRadicado: 'ND-2025-0018',
    origen: 'De oficio',
    fechaQueja: '2024-12-20',
    territorial: 'Territorial Antioquia',
    denunciado: {
      nombre: 'Roberto Sánchez Cruz',
      identificacion: '71.234.567',
      cargo: 'Coordinador Académico',
      dependencia: 'Territorial Antioquia'
    },
    estado: 'convertido-proceso',
    estadoLabel: 'Convertido a Proceso',
    etapa: 'Convertido a PD-2025-0018',
    diasTranscurridos: 48,
    radicador: 'Carlos Ramírez',
    fechaRegistro: '2024-12-20T14:15:00',
    conductas: ['Irregularidades en contratación'],
    descripcion: 'Irregularidades en manejo de calificaciones de estudiantes',
    profesionalAsignado: 'Juan Carlos Pérez',
    procesoAsociado: 'PD-2025-0018',
    historialAuditoria: []
  },
  {
    id: '3',
    numeroRadicado: 'ND-2024-0156',
    origen: 'Informante',
    fechaQueja: '2024-11-10',
    territorial: 'Dirección Nacional',
    denunciado: {
      nombre: 'Patricia Herrera Gómez',
      identificacion: '39.876.543',
      cargo: 'Jefe de Talento Humano',
      dependencia: 'Dirección Nacional'
    },
    estado: 'pendiente',
    estadoLabel: 'Pendiente',
    etapa: 'Pendiente de Revisión',
    diasTranscurridos: 12,
    radicador: 'Ana Torres',
    fechaRegistro: '2024-11-10T11:00:00',
    conductas: ['Conflicto de intereses', 'Mal uso de recursos públicos'],
    descripcion: 'Presunto favorecimiento en procesos de selección',
    historialAuditoria: []
  }
];

// Función auxiliar para obtener iniciales
const getInitials = (nombre: string) => {
  const parts = nombre.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return nombre.substring(0, 2).toUpperCase();
};

// Función para obtener color del estado
const getEstadoColor = (estado: string) => {
  switch(estado) {
    case 'pendiente':
      return { bg: '#FEF3C7', color: '#D97706' };
    case 'en-valoracion':
      return { bg: '#DBEAFE', color: '#2563EB' };
    case 'asignado':
      return { bg: '#D1FAE5', color: '#059669' };
    case 'devuelto':
      return { bg: '#FEE2E2', color: '#DC2626' };
    case 'convertido-proceso':
      return { bg: '#E0E7FF', color: '#6366F1' };
    default:
      return { bg: '#F3F4F6', color: '#6B7280' };
  }
};

// ==================== COMPONENTE PRINCIPAL ====================
export function GestionNoticias() {
  const [noticias] = useState<NoticiaDisciplinaria[]>(MOCK_NOTICIAS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | string>('todos');
  const [vistaActual, setVistaActual] = useState<'lista' | 'estadisticas'>('lista');

  // Filtrar noticias
  const noticiasFiltradas = noticias.filter(noticia => {
    const matchesSearch = searchQuery === '' || 
      noticia.numeroRadicado.toLowerCase().includes(searchQuery.toLowerCase()) ||
      noticia.denunciado.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesEstado = filtroEstado === 'todos' || noticia.estado === filtroEstado;
    
    return matchesSearch && matchesEstado;
  });

  // Contadores
  const contadores = {
    todos: noticias.length,
    pendiente: noticias.filter(n => n.estado === 'pendiente').length,
    enValoracion: noticias.filter(n => n.estado === 'en-valoracion').length,
    asignado: noticias.filter(n => n.estado === 'asignado').length,
    convertido: noticias.filter(n => n.estado === 'convertido-proceso').length
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: '#1F2937' }}>
          Gestión de Noticias Disciplinarias
        </h1>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Sistema Integrado de Gestión Legal (SIGL v5.0)
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 mb-6 border-b" style={{ borderColor: '#E5E7EB' }}>
        <button
          onClick={() => setVistaActual('lista')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition-colors ${
            vistaActual === 'lista'
              ? 'border-[#003DA5] text-[#003DA5]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Noticias
          <Badge className="ml-2" style={{ background: '#003DA5', color: '#FFFFFF' }}>
            {noticias.length}
          </Badge>
        </button>
        <button
          onClick={() => setVistaActual('estadisticas')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition-colors ${
            vistaActual === 'estadisticas'
              ? 'border-[#003DA5] text-[#003DA5]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Estadísticas
        </button>
      </div>

      {vistaActual === 'lista' ? (
        <>
          {/* Barra de Búsqueda y Acciones */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                <input
                  type="text"
                  placeholder="Buscar por radicado o nombre del denunciado..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                  style={{ borderColor: '#E5E7EB' }}
                />
              </div>
              <button
                className="px-6 py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity flex items-center gap-2"
                style={{ background: '#003DA5' }}
              >
                <Plus className="w-4 h-4" />
                Nueva Noticia
              </button>
            </div>

            {/* Filtros por Estado */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              <button
                onClick={() => setFiltroEstado('todos')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  filtroEstado === 'todos'
                    ? 'text-white'
                    : 'bg-white text-gray-700 border-2'
                }`}
                style={
                  filtroEstado === 'todos'
                    ? { background: '#003DA5' }
                    : { borderColor: '#E5E7EB' }
                }
              >
                Todas ({contadores.todos})
              </button>
              <button
                onClick={() => setFiltroEstado('pendiente')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  filtroEstado === 'pendiente'
                    ? 'text-white'
                    : 'bg-white text-gray-700 border-2'
                }`}
                style={
                  filtroEstado === 'pendiente'
                    ? { background: '#003DA5' }
                    : { borderColor: '#E5E7EB' }
                }
              >
                Pendientes ({contadores.pendiente})
              </button>
              <button
                onClick={() => setFiltroEstado('en-valoracion')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  filtroEstado === 'en-valoracion'
                    ? 'text-white'
                    : 'bg-white text-gray-700 border-2'
                }`}
                style={
                  filtroEstado === 'en-valoracion'
                    ? { background: '#003DA5' }
                    : { borderColor: '#E5E7EB' }
                }
              >
                En Valoración ({contadores.enValoracion})
              </button>
              <button
                onClick={() => setFiltroEstado('asignado')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  filtroEstado === 'asignado'
                    ? 'text-white'
                    : 'bg-white text-gray-700 border-2'
                }`}
                style={
                  filtroEstado === 'asignado'
                    ? { background: '#003DA5' }
                    : { borderColor: '#E5E7EB' }
                }
              >
                Asignadas ({contadores.asignado})
              </button>
              <button
                onClick={() => setFiltroEstado('convertido-proceso')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  filtroEstado === 'convertido-proceso'
                    ? 'text-white'
                    : 'bg-white text-gray-700 border-2'
                }`}
                style={
                  filtroEstado === 'convertido-proceso'
                    ? { background: '#003DA5' }
                    : { borderColor: '#E5E7EB' }
                }
              >
                Convertidas ({contadores.convertido})
              </button>
            </div>
          </div>

          {/* Lista de Noticias */}
          <div className="space-y-4">
            {noticiasFiltradas.map((noticia) => {
              const estadoColor = getEstadoColor(noticia.estado);
              const initials = getInitials(noticia.denunciado.nombre);

              return (
                <div
                  key={noticia.id}
                  className="bg-white rounded-xl border-2 p-5 hover:shadow-lg transition-all"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                      style={{ background: '#E0EDFF', color: '#003DA5' }}
                    >
                      {initials}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-extrabold" style={{ color: '#1F2937' }}>
                              {noticia.numeroRadicado}
                            </h3>
                            <Badge
                              className="px-3 py-1 rounded-md text-xs font-bold"
                              style={{ background: estadoColor.bg, color: estadoColor.color }}
                            >
                              {noticia.estadoLabel}
                            </Badge>
                            {noticia.diasTranscurridos > 10 && (
                              <Badge style={{ background: '#FEE2E2', color: '#DC2626' }}>
                                ⚠️ {noticia.diasTranscurridos} días
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium mb-2" style={{ color: '#6B7280' }}>
                            {noticia.denunciado.nombre} • {noticia.denunciado.cargo}
                          </p>
                          <p className="text-sm" style={{ color: '#9CA3AF' }}>
                            {noticia.territorial}
                          </p>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" style={{ color: '#6B7280' }} />
                          </button>
                          <button
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" style={{ color: '#6B7280' }} />
                          </button>
                          <button
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Archivar"
                          >
                            <Archive className="w-4 h-4" style={{ color: '#F59E0B' }} />
                          </button>
                        </div>
                      </div>

                      {/* Metadatos */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" style={{ color: '#6B7280' }} />
                          <span className="text-xs" style={{ color: '#6B7280' }}>
                            {noticia.fechaQueja}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" style={{ color: '#6B7280' }} />
                          <span className="text-xs" style={{ color: '#6B7280' }}>
                            {noticia.origen}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" style={{ color: '#6B7280' }} />
                          <span className="text-xs" style={{ color: '#6B7280' }}>
                            {noticia.etapa}
                          </span>
                        </div>
                        {noticia.profesionalAsignado && (
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4" style={{ color: '#059669' }} />
                            <span className="text-xs font-semibold" style={{ color: '#059669' }}>
                              {noticia.profesionalAsignado}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Conductas */}
                      {noticia.conductas && noticia.conductas.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {noticia.conductas.map((conducta, index) => (
                            <Badge
                              key={index}
                              className="px-2 py-1 rounded-md text-xs"
                              style={{ background: '#FEF3C7', color: '#D97706' }}
                            >
                              {conducta}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {noticiasFiltradas.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: '#D1D5DB' }} />
                <p className="text-lg font-semibold mb-2" style={{ color: '#6B7280' }}>
                  No se encontraron noticias
                </p>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                  Intenta ajustar los filtros de búsqueda
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border-2 p-8 text-center" style={{ borderColor: '#E5E7EB' }}>
          <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#003DA5' }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#1F2937' }}>
            Estadísticas de Noticias
          </h2>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Sección en desarrollo
          </p>
        </div>
      )}
    </div>
  );
}
