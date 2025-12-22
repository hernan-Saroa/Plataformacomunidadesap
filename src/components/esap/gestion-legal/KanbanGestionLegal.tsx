/**
 * ============================================
 * KANBAN COLABORATIVO - GESTIÓN LEGAL
 * ============================================
 * 
 * Tablero Kanban donde toda la oficina jurídica trabaja en paralelo
 * - Drag & Drop entre etapas
 * - Asignación rápida de responsables
 * - Vista en tiempo real de quién hace qué
 * - Filtros y búsqueda
 * - Panel lateral con acciones rápidas
 */

import { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  MoreVertical,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Eye,
  Calendar,
  TrendingUp,
  Zap,
  Scale,
} from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { TarjetaCasoKanban } from './TarjetaCasoKanban';
import { PanelLateralKanban } from './PanelLateralKanban';
import { ModalVistaDetallada } from './ModalVistaDetallada';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

type EstadoCaso = 
  | 'inicial' 
  | 'en_revision' 
  | 'asignado' 
  | 'en_proceso' 
  | 'requiere_accion'
  | 'pendiente_aprobacion'
  | 'en_espera'
  | 'completado' 
  | 'archivado'
  | 'vencido';

interface Caso {
  id: string;
  moduloId: string;
  moduloNombre: string;
  radicado: string;
  asunto: string;
  estado: EstadoCaso;
  prioridad: string;
  responsable: {
    id: string;
    nombre: string;
    iniciales: string;
    color: string;
    rol: string;
  };
  colaboradores?: Array<{
    id: string;
    nombre: string;
    iniciales: string;
    color: string;
  }>;
  fechaCreacion: Date;
  fechaVencimiento: Date;
  diasRestantes: number;
  progreso: number;
  proximaAccion: string;
  etiquetas?: string[];
}

interface Columna {
  id: EstadoCaso;
  titulo: string;
  descripcion: string;
  color: string;
  icono: any;
  casos: Caso[];
}

interface KanbanGestionLegalProps {
  moduloId: string;
  moduloNombre: string;
  moduloColor: string;
  casos: Caso[];
  onVolverSelector: () => void;
  onActualizarCaso: (casoId: string, nuevoEstado: EstadoCaso, nuevoResponsable?: string) => void;
  onAbrirModuloCompleto?: () => void; // Prop opcional para abrir vista completa (solo MOD-01)
}

// ============================================
// CONFIGURACIÓN DE COLUMNAS POR MÓDULO
// ============================================

const COLUMNAS_POR_MODULO: Record<string, Columna[]> = {
  'mod-01': [ // Defensa Judicial
    {
      id: 'inicial',
      titulo: 'Por Asignar',
      descripcion: 'Nuevos casos recibidos',
      color: '#6B7280',
      icono: AlertTriangle,
      casos: [],
    },
    {
      id: 'asignado',
      titulo: 'Asignado',
      descripcion: 'Casos con responsable',
      color: '#3B82F6',
      icono: Users,
      casos: [],
    },
    {
      id: 'en_proceso',
      titulo: 'En Trabajo',
      descripcion: 'Caso en desarrollo',
      color: '#8B5CF6',
      icono: TrendingUp,
      casos: [],
    },
    {
      id: 'requiere_accion',
      titulo: 'Por Acordar',
      descripcion: 'Requiere revisión',
      color: '#F59E0B',
      icono: CheckCircle2,
      casos: [],
    },
    {
      id: 'completado',
      titulo: 'Completado',
      descripcion: 'Caso finalizado',
      color: '#10B981',
      icono: CheckCircle2,
      casos: [],
    },
  ],
  'mod-02': [ // Órganos de Control
    {
      id: 'inicial',
      titulo: 'Recibidos',
      descripcion: 'Requerimientos recibidos',
      color: '#6B7280',
      icono: AlertTriangle,
      casos: [],
    },
    {
      id: 'asignado',
      titulo: 'Asignados',
      descripcion: 'Con responsable asignado',
      color: '#3B82F6',
      icono: Users,
      casos: [],
    },
    {
      id: 'en_proceso',
      titulo: 'En Trabajo',
      descripcion: 'Recopilando información',
      color: '#8B5CF6',
      icono: TrendingUp,
      casos: [],
    },
    {
      id: 'requiere_accion',
      titulo: 'Por Acordar',
      descripcion: 'Requiere revisión',
      color: '#F59E0B',
      icono: CheckCircle2,
      casos: [],
    },
    {
      id: 'completado',
      titulo: 'Completado',
      descripcion: 'Respuesta enviada',
      color: '#10B981',
      icono: CheckCircle2,
      casos: [],
    },
  ],
};

// Columnas genéricas para módulos sin configuración específica
const COLUMNAS_GENERICAS: Columna[] = [
  {
    id: 'inicial',
    titulo: 'Por Asignar',
    descripcion: 'Casos nuevos',
    color: '#6B7280',
    icono: AlertTriangle,
    casos: [],
  },
  {
    id: 'asignado',
    titulo: 'Asignados',
    descripcion: 'Con responsable',
    color: '#3B82F6',
    icono: Users,
    casos: [],
  },
  {
    id: 'en_proceso',
    titulo: 'En Trabajo',
    descripcion: 'En desarrollo',
    color: '#8B5CF6',
    icono: TrendingUp,
    casos: [],
  },
  {
    id: 'requiere_accion',
    titulo: 'Por Acordar',
    descripción: 'Requiere revisión',
    color: '#F59E0B',
    icono: CheckCircle2,
    casos: [],
  },
  {
    id: 'completado',
    titulo: 'Completados',
    descripcion: 'Finalizados',
    color: '#10B981',
    icono: CheckCircle2,
    casos: [],
  },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function KanbanGestionLegal({
  moduloId,
  moduloNombre,
  moduloColor,
  casos: casosIniciales,
  onVolverSelector,
  onActualizarCaso,
  onAbrirModuloCompleto,
}: KanbanGestionLegalProps) {
  const [casos, setCasos] = useState<Caso[]>(casosIniciales);
  const [busqueda, setBusqueda] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string | null>(null);
  const [filtroResponsable, setFiltroResponsable] = useState<string | null>(null);
  const [casoSeleccionado, setCasoSeleccionado] = useState<Caso | null>(null);
  const [mostrarPanelLateral, setMostrarPanelLateral] = useState(true);
  const [casoArrastrado, setCasoArrastrado] = useState<string | null>(null);

  console.log('📊 DEBUG KanbanGestionLegal:', {
    moduloId,
    moduloNombre,
    casosRecibidos: casosIniciales.length,
    primeros3: casosIniciales.slice(0, 3).map(c => ({ id: c.id, estado: c.estado, asunto: c.asunto }))
  });

  // Obtener configuración de columnas para el módulo
  const columnasBase = COLUMNAS_POR_MODULO[moduloId] || COLUMNAS_GENERICAS;

  // Distribuir casos en columnas con filtros aplicados
  const columnas = useMemo(() => {
    // Filtrar casos
    let casosFiltrados = casos;

    if (busqueda) {
      const termino = busqueda.toLowerCase();
      casosFiltrados = casosFiltrados.filter(
        (caso) =>
          caso.radicado.toLowerCase().includes(termino) ||
          caso.asunto.toLowerCase().includes(termino) ||
          caso.responsable.nombre.toLowerCase().includes(termino)
      );
    }

    if (filtroPrioridad) {
      casosFiltrados = casosFiltrados.filter((caso) => caso.prioridad === filtroPrioridad);
    }

    if (filtroResponsable) {
      casosFiltrados = casosFiltrados.filter((caso) => caso.responsable.id === filtroResponsable);
    }

    // Distribuir en columnas
    return columnasBase.map((col) => ({
      ...col,
      casos: casosFiltrados.filter((caso) => caso.estado === col.id),
    }));
  }, [casos, busqueda, filtroPrioridad, filtroResponsable, columnasBase]);

  // Métricas
  const metricas = useMemo(() => {
    return {
      total: casos.length,
      vencidos: casos.filter((c) => c.diasRestantes < 0).length,
      criticos: casos.filter((c) => c.prioridad === 'critica').length,
      completados: casos.filter((c) => c.estado === 'completado').length,
    };
  }, [casos]);

  // Handlers de Drag & Drop
  const handleDragStart = (casoId: string) => {
    setCasoArrastrado(casoId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, nuevoEstado: EstadoCaso) => {
    e.preventDefault();
    
    if (!casoArrastrado) return;

    const caso = casos.find((c) => c.id === casoArrastrado);
    if (!caso) return;

    // No permitir mover a la misma columna
    if (caso.estado === nuevoEstado) {
      setCasoArrastrado(null);
      return;
    }

    // Actualizar estado del caso
    setCasos((prev) =>
      prev.map((c) =>
        c.id === casoArrastrado ? { ...c, estado: nuevoEstado } : c
      )
    );

    onActualizarCaso(casoArrastrado, nuevoEstado);
    
    toast.success(`Caso movido a "${columnasBase.find((c) => c.id === nuevoEstado)?.titulo}"`, {
      description: `${caso.radicado} - ${caso.asunto}`,
    });

    setCasoArrastrado(null);
  };

  const handleAsignarResponsable = (casoId: string, nuevoResponsableId: string) => {
    // Aquí iría la lógica real de asignación
    // Por ahora solo mostramos un toast
    toast.success('Responsable reasignado correctamente');
  };

  const handleVerDetalle = (caso: Caso) => {
    setCasoSeleccionado(caso);
  };

  // Obtener lista de responsables únicos
  const responsables = useMemo(() => {
    const uniqueResponsables = new Map();
    casos.forEach((caso) => {
      if (!uniqueResponsables.has(caso.responsable.id)) {
        uniqueResponsables.set(caso.responsable.id, caso.responsable);
      }
    });
    return Array.from(uniqueResponsables.values());
  }, [casos]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onVolverSelector}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cambiar Módulo
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            <div>
              <h1 className="text-xl font-bold">Tablero Kanban - {moduloNombre}</h1>
              <p className="text-sm text-gray-500">
                Vista colaborativa del equipo jurídico
              </p>
            </div>
          </div>

          {/* Métricas Rápidas */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{metricas.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{metricas.vencidos}</p>
              <p className="text-xs text-gray-500">Vencidos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{metricas.criticos}</p>
              <p className="text-xs text-gray-500">Críticos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{metricas.completados}</p>
              <p className="text-xs text-gray-500">Completados</p>
            </div>
          </div>
        </div>

        {/* Barra de Herramientas */}
        <div className="flex items-center gap-3">
          {/* Búsqueda */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por radicado, asunto o responsable..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtros Rápidos */}
          <div className="flex items-center gap-2">
            <Button
              variant={filtroPrioridad === 'critica' ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                setFiltroPrioridad(filtroPrioridad === 'critica' ? null : 'critica')
              }
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Críticos
            </Button>
            <Button
              variant={filtroPrioridad === 'alta' ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                setFiltroPrioridad(filtroPrioridad === 'alta' ? null : 'alta')
              }
            >
              <Zap className="w-4 h-4 mr-2" />
              Alta
            </Button>
          </div>

          {/* Toggle Panel Lateral */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarPanelLateral(!mostrarPanelLateral)}
          >
            <Users className="w-4 h-4 mr-2" />
            {mostrarPanelLateral ? 'Ocultar' : 'Mostrar'} Panel
          </Button>

          {/* Botón Vista Completa (solo MOD-01 y MOD-02) */}
          {onAbrirModuloCompleto && (
            <Button
              variant="default"
              size="sm"
              onClick={onAbrirModuloCompleto}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Eye className="w-4 h-4 mr-2" />
              Ver Módulo
            </Button>
          )}

          {/* Nuevo Caso */}
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Caso
          </Button>
        </div>
      </div>

      {/* Contenido Principal: Kanban + Panel Lateral */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tablero Kanban */}
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-4 h-full" style={{ minWidth: 'max-content' }}>
            {columnas.map((columna) => {
              const Icono = columna.icono;

              return (
                <div
                  key={columna.id}
                  className="flex-shrink-0 w-80 flex flex-col"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, columna.id)}
                >
                  {/* Header de Columna */}
                  <Card
                    className="mb-3"
                    style={{ borderTopColor: columna.color, borderTopWidth: 3 }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${columna.color}20` }}
                          >
                            <Icono className="w-4 h-4" style={{ color: columna.color }} />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm">{columna.titulo}</h3>
                            <p className="text-xs text-gray-500">{columna.descripcion}</p>
                          </div>
                        </div>
                        <Badge
                          className="text-xs"
                          style={{ backgroundColor: columna.color }}
                        >
                          {columna.casos.length}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lista de Casos */}
                  <div className="flex-1 overflow-y-auto space-y-3">
                    {columna.casos.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <p className="text-sm">No hay casos en esta etapa</p>
                      </div>
                    ) : (
                      columna.casos.map((caso) => (
                        <TarjetaCasoKanban
                          key={caso.id}
                          caso={caso}
                          onDragStart={handleDragStart}
                          onVerDetalle={handleVerDetalle}
                          onAsignarResponsable={handleAsignarResponsable}
                          estaArrastrando={casoArrastrado === caso.id}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel Lateral */}
        {mostrarPanelLateral && (
          <PanelLateralKanban
            casos={casos}
            responsables={responsables}
            filtroResponsable={filtroResponsable}
            onFiltrarResponsable={setFiltroResponsable}
            onCerrar={() => setMostrarPanelLateral(false)}
          />
        )}
      </div>

      {/* Modal de Detalle */}
      <ModalVistaDetallada
        isOpen={!!casoSeleccionado}
        caso={casoSeleccionado}
        onClose={() => setCasoSeleccionado(null)}
      />
    </div>
  );
}