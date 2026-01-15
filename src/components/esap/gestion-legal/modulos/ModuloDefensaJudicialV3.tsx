/**
 * ModuloDefensaJudicialV3 - MOD-01: Defensa Judicial
 * VERSIÓN WORLD-CLASS - COPIADO EXACTO DE CONTROL DISCIPLINARIO
 * ✅ Responsive mobile-first FUNCIONAL
 * ✅ Colores corporativos ESAP (#003DA5)
 * ✅ Diseño mandatorio 100% igual a Control Disciplinario
 * ✅ CONECTADO CON CONFIGURACIONES CENTRALIZADAS
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Plus, FileText, FolderOpen, AlertTriangle, Clock, Calendar,
  User, MoreVertical, Eye, ChevronDown, Users, Settings,
  Maximize2, Minimize2, AlertCircle, CheckCircle,
  List, Columns3, ChevronsDown, ChevronsUp,
  Scale, DollarSign, Filter, Search,
  ExternalLink, Download, Upload, RefreshCw, Paperclip,
  MessageSquare, FileCheck, Send, Archive, Mail, Edit
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { toast } from 'sonner';

import { legalService } from '../../../../services/api/legal.service';
import type { ExpedienteJudicial, EtapaDefensaJudicial } from '../core/types';
import { ModalNuevaDemanda, NuevaDemandaData } from './ModalNuevaDemanda';
import { ModalExpediente } from './ModalExpediente';
import { ModalComunicaciones } from './ModalComunicaciones';
import { ModalAutos } from './ModalAutos';
import { ModalEvidencias } from './ModalEvidencias';
import { ModalOficios } from './ModalOficios';
import { ModalActas } from './ModalActas';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import { VistaListaDefensaJudicial } from './VistaListaDefensaJudicial';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// ✅ Importar configuraciones centralizadas
import { useConfiguracionModulo } from '../config/ConfiguracionesSIGLContext';

type VistaModulo = 'kanban' | 'lista';

// Tipo para drag and drop
const ItemTypes = {
  EXPEDIENTE: 'expediente'
};

export function ModuloDefensaJudicialV3() {
  // ✅ Obtener configuraciones desde el Context API
  const { estadosActivos, tiposProcesosActivos } = useConfiguracionModulo('defensa-judicial');

  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [tipoVista, setTipoVista] = useState<VistaModulo>('kanban');
  const [modalNuevaDemandaOpen, setModalNuevaDemandaOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<string>('TODAS');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [expedientes, setExpedientes] = useState<ExpedienteJudicial[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Log de configuraciones cargadas
  useEffect(() => {
    console.log('🎯 DEFENSA JUDICIAL - Configuraciones centralizadas cargadas:');
    console.log('   📊 Estados activos:', estadosActivos.length);
    console.log('   ⚖️ Tipos de procesos activos:', tiposProcesosActivos.length);
    console.log('   ✅ Conexión con ConfiguracionesSIGL establecida');
  }, [estadosActivos, tiposProcesosActivos]);

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

  // Cargar expedientes desde el backend
  const loadExpedientes = async () => {
    try {
      setLoading(true);
      const data = await legalService.getExpedientes();
      // Mapear datos del backend al tipo ExpedienteJudicial del frontend
      const mapped: ExpedienteJudicial[] = data.map((exp: any) => ({
        uuid: exp.id, // Guardar UUID real para operaciones de API
        id: exp.radicado || exp.id, // Usar radicado como ID visible, fallback al UUID
        tipo: exp.tipoProceso || 'declarativo',
        tipoProceso: exp.tipoProceso || '', // ✅ Agregar explícitamente para filtros
        medioControl: exp.medioControl || 'NRD Art.138',
        jurisdiccion: exp.jurisdiccion || 'Contencioso Administrativo',
        etapa: (exp.etapaProcesal as EtapaDefensaJudicial) || 'NOTIFICADA',
        demandante: exp.demandante || 'Sin demandante',
        demandado: exp.demandado || 'ESAP - Escuela Superior de Administración Pública',
        tipoIdDemandante: exp.tipoIdDemandante,
        numeroIdDemandante: exp.numeroIdDemandante,
        tipoIdDemandado: exp.tipoIdDemandado,
        numeroIdDemandado: exp.numeroIdDemandado,
        // Campos de contacto del demandante
        demandanteDireccion: exp.demandanteDireccion,
        demandanteTelefono: exp.demandanteTelefono,
        demandanteEmail: exp.demandanteEmail,
        demandanteApoderado: exp.demandanteApoderado,
        apoderado: exp.demandanteApoderado || '',
        juzgado: exp.juzgadoConocimiento || '',
        radicado: exp.radicado,
        cuantia: exp.cuantia || 0,
        fechaNotificacion: new Date(exp.fechaNotificacion || exp.fechaRadicacion),
        diasTotales: calcularDiasTotales(
          new Date(exp.fechaNotificacion || exp.fechaRadicacion),
          new Date(exp.fechaVencimientoTermino || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000))
        ),
        diasRestantes: calcularDiasRestantes(new Date(exp.fechaVencimientoTermino || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000))),
        // Para abogado, buscar el nombre en la relación o usar valor directo si es string
        abogadoAsignado: exp.abogado?.nombreCompleto || exp.abogadoNombre || (
          typeof exp.abogadoSustanciador === 'string' && exp.abogadoSustanciador.length < 50
            ? exp.abogadoSustanciador
            : 'Sin asignar'
        ),
        hechos: '',
        pretensiones: exp.pretensionDemandante || '',
        documentos: new Array(Number(exp.documentosCount || 0) + (exp.documentosInicialesUrls?.length || 0)).fill({}),
        actuaciones: [],
        timeline: [],
        fechaCreacion: new Date(exp.createdAt),
        fechaActualizacion: new Date(exp.updatedAt),
        estado: exp.estado || 'ACTIVO',
        ultimaActuacion: exp.ultimaActuacion || `Expediente en etapa de ${exp.etapaProcesal || 'NOTIFICADA'}`,
        // Campos de contacto del demandado
        demandadoDireccion: exp.demandadoDireccion,
        demandadoTelefono: exp.demandadoTelefono,
        demandadoEmail: exp.demandadoEmail,
      }));
      setExpedientes(mapped);
    } catch (error) {
      console.error('Error cargando expedientes:', error);
      toast.error('Error al cargar expedientes');
    } finally {
      setLoading(false);
    }
  };

  const handleMoverExpediente = async (expedienteId: string, nuevaEtapa: string) => {
    if (!nuevaEtapa) {
      console.error('❌ Intento de mover expediente a etapa indefinida');
      return;
    }

    // Encuentra el expediente real usando el ID (puede ser el visible o el UUID)
    const expediente = expedientes.find(e => e.id === expedienteId);
    if (!expediente) return;

    // Si la etapa es la misma, no hacer nada
    if (expediente.etapa === nuevaEtapa) return;

    // Optimistic Update
    const previousExpedientes = [...expedientes];
    setExpedientes((prevExpedientes) =>
      prevExpedientes.map((exp) =>
        exp.id === expedienteId
          ? { ...exp, etapa: nuevaEtapa as any } // Cast as any because ExpedienteJudicial might still have rigid type
          : exp
      )
    );

    try {
      // Usar uuid si existe, sino id
      const idToUpdate = expediente.uuid || expediente.id;
      await legalService.updateExpediente(idToUpdate, {
        etapaProcesal: nuevaEtapa
      });

      toast.success('Expediente movido exitosamente', {
        description: `Cambiado a etapa: ${nuevaEtapa}`
      });
    } catch (error) {
      console.error('Error al actualizar etapa:', error);
      toast.error('Error al mover expediente', {
        description: 'Se han revertido los cambios'
      });
      setExpedientes(previousExpedientes);
    }
  };

  // Calcular días totales entre dos fechas
  const calcularDiasTotales = (fechaInicio: Date, fechaFin: Date): number => {
    const diff = fechaFin.getTime() - fechaInicio.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  // Calcular días restantes hasta vencimiento
  const calcularDiasRestantes = (fechaVencimiento: Date): number => {
    const hoy = new Date();
    const diff = fechaVencimiento.getTime() - hoy.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  useEffect(() => {
    loadExpedientes();
  }, []);

  // ✅ Primero aplicar filtros globales (búsqueda, tipo de proceso)
  const expedientesFiltrados = expedientes.filter(exp => {
    // Filtro por búsqueda
    const matchBusqueda = busqueda === '' ||
      exp.id?.toLowerCase().includes(busqueda.toLowerCase()) ||
      exp.demandante?.toLowerCase().includes(busqueda.toLowerCase()) ||
      exp.demandado?.toLowerCase().includes(busqueda.toLowerCase()) ||
      exp.juzgado?.toLowerCase().includes(busqueda.toLowerCase());

    // Filtro por tipo de proceso
    const tipoProceso = (exp as any).tipoProceso || exp.tipo || '';
    const matchTipo = filtroTipo === 'TODOS' || tipoProceso === filtroTipo;

    return matchBusqueda && matchTipo;
  });

  // Agrupar expedientes filtrados por etapa de forma dinámica
  const expedientesPorEtapa = estadosActivos.reduce((acc, estado) => {
    // Si hay filtro de etapa, solo incluir esa etapa
    if (filtroEtapa !== 'TODAS' && estado.nombre !== filtroEtapa) {
      acc[estado.id] = [];
      return acc;
    }

    acc[estado.id] = expedientesFiltrados.filter(exp => {
      const stage = exp.etapa ? exp.etapa.toString().toLowerCase().replace(/_/g, ' ') : '';
      const stateId = estado.id.toLowerCase().replace(/-/g, ' ');
      const stateName = estado.nombre.toLowerCase();

      return stage === stateId || stage === stateName || exp.etapa === estado.id;
    });
    return acc;
  }, {} as Record<string, ExpedienteJudicial[]>);

  // Calcular estadísticas - solo expedientes en las etapas activas
  const expedientesVisibles = Object.values(expedientesPorEtapa).flat();
  const totalExpedientes = expedientesVisibles.length;
  const expedientesCriticos = expedientesVisibles.filter(e => e.diasRestantes <= 5).length;
  const expedientesEnTermino = expedientesVisibles.filter(e => e.diasRestantes > 15).length;

  const etapas = estadosActivos.map(estado => ({
    nombre: estado.nombre,
    valor: estado.id, // Usamos el ID del estado como valor para mover
    color: estado.color,
    icono: <FileText className="w-4 h-4" style={{ color: estado.color }} />, // Icono genérico o mapeado si es posible
    diasEstimados: 15, // TODO: Mapear desde 'tiempos' si hay relación, o default
    expedientes: expedientesPorEtapa[estado.id] || []
  }));

  // Handler para guardar nueva demanda
  const handleSaveNuevaDemanda = async (demandaData: NuevaDemandaData) => {
    try {
      // Mapear datos del formulario al formato del backend
      const expedienteData = {
        radicado: demandaData.numeroRadicado,
        tipoProceso: demandaData.tipoProceso, // ✅ Usar el campo correcto del formulario
        jurisdiccion: 'Contencioso Administrativo',
        demandante: demandaData.demandante,
        demandado: demandaData.demandado || 'ESAP',
        estado: 'ACTIVO',
        fechaRadicacion: new Date().toISOString(),
        cuantia: parseFloat(demandaData.cuantia.replace(/[^0-9]/g, '')) || 0,
        abogadoSustanciador: demandaData.abogadoAsignado,
        medioControl: demandaData.medioControl,
        juzgadoConocimiento: `${demandaData.juzgado} - ${demandaData.ciudad}, ${demandaData.departamento}`,
        ubicacionFisica: demandaData.ciudad,
        pretensionDemandante: demandaData.pretensiones,
        fechaNotificacion: demandaData.fechaNotificacion,
        fechaVencimientoTermino: demandaData.fechaVencimiento,
        etapaProcesal: demandaData.etapa,
        ultimaActuacion: demandaData.observaciones || 'Demanda registrada',
        // Datos del Demandante
        tipoIdDemandante: demandaData.tipoPersona === 'natural' ? 'CC' : 'NIT',
        numeroIdDemandante: demandaData.identificacionDemandante,
        demandanteDireccion: demandaData.demandanteDireccion,
        demandanteTelefono: demandaData.demandanteTelefono,
        demandanteEmail: demandaData.demandanteEmail,
        demandanteApoderado: demandaData.demandanteApoderado,
        // Datos del Demandado
        tipoIdDemandado: demandaData.tipoIdDemandado,
        numeroIdDemandado: demandaData.numeroIdDemandado,
        demandadoDireccion: demandaData.demandadoDireccion,
        demandadoTelefono: demandaData.demandadoTelefono,
        demandadoEmail: demandaData.demandadoEmail,
      };

      await legalService.crearExpediente(expedienteData);
      toast.success('Demanda registrada exitosamente', {
        description: `Radicado: ${demandaData.numeroRadicado}`
      });
      // Recargar expedientes
      loadExpedientes();
      setModalNuevaDemandaOpen(false);
    } catch (error) {
      console.error('Error guardando demanda:', error);
      toast.error('Error al guardar la demanda');
    }
  };

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header con Info Tooltip */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <ModuleHeader
            title="Tablero Kanban Operativo"
            subtitle="Gestión visual de demandas judiciales contra ESAP"
            buttons={[
              {
                label: 'Nueva Demanda',
                icon: <Plus className="w-4 h-4 mr-1" />,
                onClick: () => setModalNuevaDemandaOpen(true),
                className: 'bg-orange-600 hover:bg-orange-700 text-white font-bold'
              }
            ]}
            toggleView={{
              current: tipoVista,
              onChange: setTipoVista,
              options: [
                { label: 'Kanban', icon: <Columns3 className="w-4 h-4" /> },
                { label: 'Lista', icon: <List className="w-4 h-4" /> }
              ]
            }}
          />
        </div>

        {/* Info Tooltip - Guía de flujo */}
        <div className="flex-shrink-0 pt-1">
          <ModuleInfoTooltip
            title="Guía de Defensa Judicial"
            variant="icon"
            sections={[
              {
                label: "📍 Punto de Inicio del Sistema",
                content: "La Defensa Judicial es donde INICIA todo el flujo cuando ESAP es demandada. Aquí llegan las notificaciones de demandas desde juzgados y se registran en el sistema.",
                type: "info"
              },
              {
                label: "⚖️ Propósito del Módulo",
                content: "Gestión centralizada de procesos judiciales activos contra ESAP: demandas laborales, nulidades y restablecimiento del derecho, acciones populares, tutelas y otros medios de control.",
                type: "default"
              },
              {
                label: "🔄 Flujo de Trabajo (4 Etapas)",
                content: "1️⃣ NOTIFICADA: Demanda recibida del juzgado → 2️⃣ CONTESTACIÓN: Redactar y presentar respuesta (30 días) → 3️⃣ PROBATORIA: Recolectar y aportar pruebas (60 días) → 4️⃣ ALEGATOS: Argumentos finales antes del fallo (20 días).",
                type: "premium"
              },
              {
                label: "🚦 Semáforo de Términos",
                content: "🟢 Verde (>15 días): En término | 🟡 Amarillo (5-15 días): Próximo a vencer | 🔴 Rojo (≤5 días): CRÍTICO - Acción inmediata requerida. El sistema alerta automáticamente.",
                type: "warning"
              },
              {
                label: "📋 Última Actuación (Bloque Azul)",
                content: "El bloque azul destacado en cada tarjeta muestra la actuación procesal más reciente del juzgado, facilitando seguimiento rápido sin abrir el expediente completo.",
                type: "default"
              },
              {
                label: "🔗 Integración con Otros Módulos",
                content: "Este módulo se conecta con: • Centro Comunicaciones (notificaciones del juzgado) • Términos e Informes (control de plazos) • Asesoría Jurídica (conceptos técnicos necesarios).",
                type: "success"
              },
              {
                label: "💡 Cómo Usar",
                content: "1️⃣ Click 'Nueva Demanda' cuando llega notificación → 2️⃣ Arrastra tarjetas entre columnas al cambiar etapa → 3️⃣ Click 'Expediente' para ver documentos completos → 4️⃣ Usa botones rápidos (Autos, Evidencias, Oficios) para gestión documental.",
                type: "default"
              },
              {
                label: "⏭️ Siguiente Paso",
                content: "Cuando el proceso judicial relaciona funcionarios internos, se deriva al módulo 'Juzgamiento Disciplinario' (MOD-02) para investigación interna paralela.",
                type: "info"
              }
            ]}
          />
        </div>
      </div>

      {/* Métricas - IGUAL A DISCIPLINARIO */}
      <ModuleMetrics
        metrics={[
          {
            value: totalExpedientes,
            label: 'Expedientes',
            icon: <FileText className="w-5 h-5" />,
            color: 'orange'
          },
          {
            value: expedientesCriticos,
            label: 'Críticos',
            icon: <AlertCircle className="w-5 h-5" />,
            color: 'red'
          },
          {
            value: expedientesEnTermino,
            label: 'En Término',
            labelMobile: 'En término',
            icon: <CheckCircle className="w-5 h-5" />,
            color: 'green'
          }
        ]}
      />

      {/* Filtros */}
      <ModuleFilters
        searchValue={busqueda}
        onSearchChange={setBusqueda}
        filters={[
          {
            type: 'select',
            label: 'Etapa Procesal',
            value: filtroEtapa,
            onChange: setFiltroEtapa,
            options: [
              { value: 'TODAS', label: 'Todas las etapas' },
              ...etapas.map(e => ({ value: e.nombre, label: e.nombre }))
            ]
          },
          {
            type: 'select',
            label: 'Tipo de Proceso',
            value: filtroTipo,
            onChange: setFiltroTipo,
            options: [
              { value: 'TODOS', label: 'Todos los tipos' },
              ...tiposProcesosActivos.map(t => ({ value: t.id, label: t.nombre }))
            ]
          }
        ]}
        totalItems={totalExpedientes}
        filteredItems={expedientesVisibles.length}
        onClearFilters={() => {
          setBusqueda('');
          setFiltroEtapa('TODAS');
          setFiltroTipo('TODOS');
        }}
      />

      {/* Tablero Kanban - IGUAL A DISCIPLINARIO */}
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
                  onRefresh={loadExpedientes}
                  onMoverExpediente={handleMoverExpediente}
                />
              ))}
            </div>
          </div>
        </DndProvider>
      )}

      {/* Vista de Lista - NUEVA IMPLEMENTACIÓN */}
      {tipoVista === 'lista' && (
        <VistaListaDefensaJudicial
          expedientes={etapas.flatMap(e => e.expedientes)}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      )}

      {/* Modal Nueva Demanda */}
      <ModalNuevaDemanda
        isOpen={modalNuevaDemandaOpen}
        onClose={() => setModalNuevaDemandaOpen(false)}
        onSave={handleSaveNuevaDemanda}
      />
    </div>
  );
}

// ==================== COMPONENTE COLUMNA KANBAN ====================
interface ColumnaKanbanProps {
  etapa: {
    nombre: string;
    valor: string;
    color: string;
    icono: React.ReactNode;
    diasEstimados: number;
    expedientes: ExpedienteJudicial[];
  };
  isMobile: boolean;
  isTablet: boolean;
  onMoverExpediente: (expedienteId: string, nuevaEtapa: string) => void;
  onRefresh?: () => void;
}

function ColumnaKanban({ etapa, isMobile, isTablet, onMoverExpediente, onRefresh }: ColumnaKanbanProps) {
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.EXPEDIENTE,
    drop: (item: { id: string }) => onMoverExpediente(item.id, etapa.valor),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  const backgroundColor = isOver ? '#F0F7FF' : 'transparent';
  const borderColor = isOver ? '#2962FF' : 'transparent';

  // Cast drop ref to any to avoid React 18 type conflict with React DnD
  const dropRef = drop as unknown as React.LegacyRef<HTMLDivElement>;

  return (
    <motion.div
      className="flex-shrink-0"
      initial={{ width: 320 }}
      animate={{ width: 320 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
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
              {etapa.expedientes.length}
            </Badge>
          </div>
        </div>

        {/* Lista de Expedientes */}
        <div
          ref={dropRef}
          className={`${isMobile ? 'p-2' : 'p-3'} space-y-3 overflow-y-auto`}
          style={{
            minHeight: isMobile ? '400px' : '500px',
            maxHeight: isMobile ? 'calc(100vh - 380px)' : 'calc(100vh - 280px)',
            backgroundColor: backgroundColor,
            borderLeft: `3px solid ${borderColor}`,
            borderRight: `3px solid ${borderColor}`,
            transition: 'all 0.2s ease'
          }}
        >
          {etapa.expedientes.map((expediente) => (
            <TarjetaExpediente
              key={expediente.id}
              expediente={expediente}
              isMobile={isMobile}
              onRefresh={onRefresh}
              onMoverExpediente={onMoverExpediente}
              etapaActual={etapa.valor}
            />
          ))}

          {etapa.expedientes.length === 0 && (
            <div className="text-center py-12 text-gray-400" style={{ pointerEvents: 'none' }}>
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-xs font-semibold">
                {isOver ? '✅ Suelte aquí' : `Sin expedientes en ${etapa.nombre}`}
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ==================== COMPONENTE TARJETA EXPEDIENTE ====================
interface TarjetaExpedienteProps {
  expediente: ExpedienteJudicial;
  isMobile: boolean;
  onRefresh?: () => void;
  onMoverExpediente: (expedienteId: string, nuevaEtapa: string) => void;
  etapaActual: string;
}

function TarjetaExpediente({ expediente, isMobile, onRefresh, onMoverExpediente, etapaActual }: TarjetaExpedienteProps) {
  // Estados para modales
  const [modalExpedienteOpen, setModalExpedienteOpen] = useState(false);
  const [modalComunicacionesOpen, setModalComunicacionesOpen] = useState(false);
  const [modalAutosOpen, setModalAutosOpen] = useState(false);
  const [modalEvidenciasOpen, setModalEvidenciasOpen] = useState(false);
  const [modalOficiosOpen, setModalOficiosOpen] = useState(false);
  const [modalActasOpen, setModalActasOpen] = useState(false);

  // Handler para abrir modal de expediente
  const handleAbrirExpediente = () => {
    setModalExpedienteOpen(true);
  };

  // Determinar semáforo
  const getSemaforoColor = (diasRestantes: number) => {
    if (diasRestantes <= 5) return { color: '#DC2626', label: 'Vencido' };
    if (diasRestantes <= 15) return { color: '#F59E0B', label: 'Próximo' };
    return { color: '#10B981', label: 'En término' };
  };

  const semaforo = getSemaforoColor(expediente.diasRestantes);
  const porcentajeTiempo = Math.round(((expediente.diasTotales - expediente.diasRestantes) / expediente.diasTotales) * 100);
  const ultimaActuacion = expediente.ultimaActuacion || `Expediente en etapa de ${expediente.etapa}`;

  // Drag and Drop
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.EXPEDIENTE,
    item: { id: expediente.id, etapa: etapaActual },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  // Cast drag ref
  const dragRef = drag as unknown as React.LegacyRef<HTMLDivElement>;

  const opacity = isDragging ? 0.5 : 1;

  return (
    <div ref={dragRef} style={{ opacity, cursor: 'move' }}>
      <Card className="bg-white border border-gray-200 hover:shadow-md transition-all">
        <div className="h-1" style={{ background: '#003DA5' }} />

        <div className={`${isMobile ? 'p-2.5' : 'p-3'}`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className={`${isMobile ? 'p-1' : 'p-1.5'} rounded-lg flex-shrink-0`}
                style={{ background: '#E0EDFF' }}
              >
                <Scale className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} style={{ color: '#003DA5' }} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} truncate`} style={{ color: '#003DA5' }}>
                  {expediente.id}
                </h4>
                <p className="text-xs text-gray-600 truncate">{expediente.medioControl}</p>
              </div>
            </div>
          </div>

          <div className="mb-2 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">👤 Demandante:</p>
            <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
              {expediente.demandante}
            </p>
          </div>

          <div className="mb-2 pb-2 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Avatar className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} flex-shrink-0`}>
                <AvatarFallback
                  className="text-xs"
                  style={{ background: '#E0EDFF', color: '#003DA5' }}
                >
                  {(expediente.abogadoAsignado || 'ESAP')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">👨‍💼 Profesional:</p>
                <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
                  {expediente.abogadoAsignado || 'Sin asignar'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mb-2">
            <Badge
              className="text-xs flex items-center gap-1 font-semibold bg-gray-50 border border-gray-200"
              style={{ color: semaforo.color }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: semaforo.color }} />
              {expediente.diasRestantes} días
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-1.5 mb-2">
            <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
              <p className="text-xs font-bold text-gray-700">{expediente.documentos?.length || 0}</p>
              <p className="text-xs text-gray-500">Docs</p>
            </div>
            <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
              <p className="text-xs font-bold text-gray-700">{expediente.diasTotales - expediente.diasRestantes}</p>
              <p className="text-xs text-gray-500">Días</p>
            </div>
            <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
              <p className="text-xs font-bold text-gray-700">{porcentajeTiempo}%</p>
              <p className="text-xs text-gray-500">Tiempo</p>
            </div>
          </div>

          <div className="mb-2 p-2 rounded-lg" style={{ backgroundColor: '#F0F7FF', border: '1px solid #BFDBFE' }}>
            <p className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: '#003DA5' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#003DA5' }}></span>
              ÚLTIMA ACTUACIÓN
            </p>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-700 line-clamp-2 mb-1`}>{ultimaActuacion}</p>
            <p className="text-xs text-gray-500">📅 {expediente.fechaActualizacion.toLocaleDateString('es-CO')}</p>
          </div>

          <div className="space-y-1 pt-2 border-t border-gray-200">
            <Button
              onClick={handleAbrirExpediente}
              size="sm"
              className={`w-full ${isMobile ? 'text-xs py-1.5' : 'text-xs'} font-bold`}
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Archive className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1 flex-shrink-0`} />
              Expediente
            </Button>

            <div className="grid grid-cols-2 gap-1">
              <Button
                onClick={() => setModalAutosOpen(true)}
                size="sm"
                variant="outline"
                className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start`}
              >
                <Scale className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5`} />
                Autos
              </Button>

              <Button
                onClick={() => setModalEvidenciasOpen(true)}
                size="sm"
                variant="outline"
                className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start`}
              >
                <Paperclip className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5`} />
                Evidencias
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-1">
              <Button
                onClick={() => setModalOficiosOpen(true)}
                size="sm"
                variant="outline"
                className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start`}
              >
                <Send className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5`} />
                Oficios
              </Button>

              <Button
                onClick={() => setModalActasOpen(true)}
                size="sm"
                variant="outline"
                className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start`}
              >
                <FileCheck className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5`} />
                Actas
              </Button>
            </div>

            <Button
              onClick={() => setModalComunicacionesOpen(true)}
              size="sm"
              className={`w-full ${isMobile ? 'text-xs py-1.5' : 'text-xs'} font-bold`}
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <MessageSquare className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1`} />
              Comunicaciones del Proceso
            </Button>
          </div>
        </div>

        <ModalExpediente
          isOpen={modalExpedienteOpen}
          onClose={() => setModalExpedienteOpen(false)}
          expediente={expediente}
          onUpdate={onRefresh}
        />

        <ModalComunicaciones
          isOpen={modalComunicacionesOpen}
          onClose={() => setModalComunicacionesOpen(false)}
          expediente={expediente}
        />

        <ModalAutos
          isOpen={modalAutosOpen}
          onClose={() => setModalAutosOpen(false)}
          expediente={expediente}
        />

        <ModalEvidencias
          isOpen={modalEvidenciasOpen}
          onClose={() => setModalEvidenciasOpen(false)}
          expediente={expediente}
        />

        <ModalOficios
          isOpen={modalOficiosOpen}
          onClose={() => setModalOficiosOpen(false)}
          expediente={expediente}
        />

        <ModalActas
          isOpen={modalActasOpen}
          onClose={() => setModalActasOpen(false)}
          expediente={expediente}
        />
      </Card>
    </div>
  );
}
