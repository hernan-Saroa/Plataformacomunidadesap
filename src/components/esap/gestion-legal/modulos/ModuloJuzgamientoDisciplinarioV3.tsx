/**
 * ModuloJuzgamientoDisciplinarioV3 - MOD-02: Juzgamiento Disciplinario
 * DISEÑO 100% IDÉNTICO A DEFENSA JUDICIAL
 * ✅ Responsive mobile-first FUNCIONAL
 * ✅ Drag & Drop FUNCIONAL
 * ✅ Tarjetas 320px con bloque "Última Actuación"
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Plus, FileText, FolderOpen, AlertTriangle, Clock, Calendar,
  User, Eye, ChevronDown, Users, Settings,
  AlertCircle, CheckCircle,
  List, Columns3, ChevronsDown, ChevronsUp,
  Scale, Filter, Search,
  Download, Upload, RefreshCw, Paperclip,
  MessageSquare, FileCheck, Send, Archive, Mail, Edit, Gavel
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { toast } from 'sonner@2.0.3';
import type { ProcesoDisciplinario } from '../core/types';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import { ModalProcesoDisciplinario } from './ModalProcesoDisciplinario';
import { ModalComunicaciones } from './ModalComunicaciones';
import { ModalAutos } from './ModalAutos';
import { ModalEvidencias } from './ModalEvidencias';
import { ModalOficios } from './ModalOficios';
import { ModalActas } from './ModalActas';
import { ModalNuevoProcesoDisciplinario } from './ModalNuevoProcesoDisciplinario';
import { VistaListaJuzgamiento } from './VistaListaJuzgamiento';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Tipo para drag and drop
const ItemTypes = {
  PROCESO: 'proceso_disciplinario'
};

import { legalService } from '../../../../services/api/legal.service';

// ... (previous imports)

export function ModuloJuzgamientoDisciplinarioV3() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [tipoVista, setTipoVista] = useState<'kanban' | 'lista'>('kanban');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<string>('TODAS');
  const [filtroGravedad, setFiltroGravedad] = useState<string>('TODAS');
  const [modalNuevoProcesoOpen, setModalNuevoProcesoOpen] = useState(false);

  // Estado local para manejar drag and drop
  const [procesos, setProcesos] = useState<ProcesoDisciplinario[]>([]);

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

  // Fetch Data from API
  useEffect(() => {
    const fetchProcesos = async () => {
      try {
        const data = await legalService.getJuzgamientoProcesos();
        const mappedData = data.map((p: any) => ({
          ...p,
          fechaHechos: new Date(), // Mock/Default
          fechaUltimaActuacion: new Date(),
          fechaActualizacion: new Date(),
          diasTotales: 90, // Default constant
          disciplinado: p.investigado, // Map backend 'investigado' to frontend 'disciplinado'
          ultimaActuacion: p.actuaciones && p.actuaciones.length > 0 ? p.actuaciones[0].descripcion : 'Inicio del proceso',
          documentosAdjuntos: p.documentos ? p.documentos.length : 0,
        }));
        setProcesos(mappedData);
      } catch (error) {
        console.error('Error fetching procesos:', error);
        toast.error('Error al cargar expedientes disciplinarios');
      }
    };
    fetchProcesos();
  }, []);
  // Manejar movimiento de proceso entre etapas
  const handleMoverProceso = (procesoId: string, nuevaEtapa: 'E1_AVOCAMIENTO' | 'E2_DESCARGOS' | 'E3_PRUEBAS' | 'E4_ALEGATOS') => {
    setProcesos((prevProcesos) =>
      prevProcesos.map((p) =>
        p.id === procesoId
          ? { ...p, etapa: nuevaEtapa }
          : p
      )
    );

    toast.success('Proceso movido exitosamente', {
      description: `Cambiado a etapa: ${nuevaEtapa}`
    });
  };

  // Agrupar procesos por etapa
  const procesosPorEtapa = {
    E1_AVOCAMIENTO: procesos.filter(p => p.etapa === 'E1_AVOCAMIENTO'),
    E2_DESCARGOS: procesos.filter(p => p.etapa === 'E2_DESCARGOS'),
    E3_PRUEBAS: procesos.filter(p => p.etapa === 'E3_PRUEBAS'),
    E4_ALEGATOS: procesos.filter(p => p.etapa === 'E4_ALEGATOS'),
  };

  // Calcular estadísticas
  const totalProcesos = procesos.length;
  const procesosCriticos = procesos.filter(p => p.diasRestantes <= 3).length;
  const procesosEnTermino = procesos.filter(p => p.diasRestantes > 5).length;

  const etapas = [
    {
      nombre: 'Avocamiento',
      valor: 'E1_AVOCAMIENTO' as const,
      color: '#6B7280',
      icono: <FileCheck className="w-4 h-4 text-gray-600" />,
      diasEstimados: 5,
      procesos: procesosPorEtapa.E1_AVOCAMIENTO
    },
    {
      nombre: 'Descargos',
      valor: 'E2_DESCARGOS' as const,
      color: '#F59E0B',
      icono: <Edit className="w-4 h-4 text-amber-600" />,
      diasEstimados: 10,
      procesos: procesosPorEtapa.E2_DESCARGOS
    },
    {
      nombre: 'Pruebas',
      valor: 'E3_PRUEBAS' as const,
      color: '#3B82F6',
      icono: <Search className="w-4 h-4 text-blue-600" />,
      diasEstimados: 30,
      procesos: procesosPorEtapa.E3_PRUEBAS
    },
    {
      nombre: 'Alegatos',
      valor: 'E4_ALEGATOS' as const,
      color: '#003DA5',
      icono: <Gavel className="w-4 h-4" style={{ color: '#003DA5' }} />,
      diasEstimados: 10,
      procesos: procesosPorEtapa.E4_ALEGATOS
    },
  ];

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header con ModuleHeader */}
      <ModuleHeader
        title={isMobile ? 'Kanban Operativo' : 'Tablero Kanban Operativo'}
        subtitle="Gestión visual de procesos disciplinarios"
        toggleView={{
          current: tipoVista,
          onChange: (view) => setTipoVista(view as 'kanban' | 'lista'),
          options: [
            { label: 'Kanban', icon: <Columns3 className="w-4 h-4" />, value: 'kanban' },
            { label: 'Lista', icon: <List className="w-4 h-4" />, value: 'lista' }
          ]
        }}
        buttons={[
          {
            label: 'Nuevo Proceso',
            labelMobile: 'Nuevo',
            icon: <Plus className="w-4 h-4" />,
            onClick: () => setModalNuevoProcesoOpen(true),
            variant: 'primary'
          }
        ]}
        infoTooltip={
          <ModuleInfoTooltip
            title="Guía de Juzgamiento Disciplinario"
            variant="icon"
            sections={[
              {
                label: "🔗 Procedencia del Flujo",
                content: "Este módulo recibe casos de dos fuentes: 1) Derivados desde Defensa Judicial cuando un proceso judicial involucra conductas de funcionarios internos, 2) Quejas o denuncias directas contra empleados de ESAP.",
                type: "info"
              },
              {
                label: "⚖️ Propósito del Módulo",
                content: "Control y seguimiento de procesos disciplinarios internos contra funcionarios de ESAP, garantizando cumplimiento de términos legales y debido proceso según la Ley 734 de 2002 (Código Disciplinario Único).",
                type: "default"
              },
              {
                label: "🔄 Flujo de Trabajo (4 Etapas)",
                content: "1️⃣ AVOCAMIENTO: Apertura de investigación y vinculación del disciplinado (10 días) → 2️⃣ DESCARGOS: Funcionario presenta su defensa (15 días) → 3️⃣ PRUEBAS: Recolección y práctica de pruebas (30 días) → 4️⃣ ALEGATOS: Argumentos finales antes del fallo (10 días).",
                type: "premium"
              },
              {
                label: "🚦 Semáforo de Términos",
                content: "🟢 Verde (>5 días): En término | 🟡 Amarillo (3-5 días): Próximo a vencer | 🔴 Rojo (≤3 días): CRÍTICO. Los términos disciplinarios son PERENTORIOS e improrrogables.",
                type: "warning"
              },
              {
                label: "👤 Disciplinado y Cargo",
                content: "Cada tarjeta muestra el nombre del funcionario investigado y su cargo, respetando la confidencialidad del proceso según la ley.",
                type: "default"
              },
              {
                label: "📋 Última Actuación (Bloque Azul)",
                content: "Destacado en fondo azul (#F0F7FF), muestra la actuación administrativa más reciente: auto de apertura, citación a descargos, resolución, etc.",
                type: "default"
              },
              {
                label: "🔗 Integración con Otros Módulos",
                content: "Se conecta con: • Defensa Judicial (casos derivados) • Términos e Informes (control de plazos perentorios) • Asesoría Jurídica (conceptos sobre calificación de faltas).",
                type: "success"
              },
              {
                label: "💡 Cómo Usar",
                content: "1️⃣ Click 'Nuevo Proceso' para abrir investigación → 2️⃣ Arrastra tarjetas entre columnas al cambiar etapa → 3️⃣ Click 'Expediente' para gestión documental completa → 4️⃣ Revisa 'Última Actuación' sin abrir expediente → 5️⃣ Monitorea semáforo para acción oportuna.",
                type: "default"
              },
              {
                label: "⏭️ Siguiente Paso",
                content: "Al culminar el proceso: Si hay fallo sancionatorio → Se actualiza hoja de vida del funcionario. Si hay destitución → Se vincula con módulo de Talento Humano para trámites de desvinculación.",
                type: "info"
              }
            ]}
          />
        }
      />

      {/* Métricas - IGUAL A DEFENSA JUDICIAL */}
      <ModuleMetrics
        metrics={[
          {
            value: totalProcesos,
            label: 'Procesos',
            icon: <FileText className="w-5 h-5" />,
            color: 'orange'
          },
          {
            value: procesosCriticos,
            label: 'Críticos',
            icon: <AlertCircle className="w-5 h-5" />,
            color: 'red'
          },
          {
            value: procesosEnTermino,
            label: 'En Término',
            labelMobile: 'En término',
            icon: <CheckCircle className="w-5 h-5" />,
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
            onChange: (value) => setFiltroEtapa(value),
            options: [
              { label: 'Todas', value: 'TODAS' },
              { label: 'Avocamiento', value: 'E1_AVOCAMIENTO' },
              { label: 'Descargos', value: 'E2_DESCARGOS' },
              { label: 'Pruebas', value: 'E3_PRUEBAS' },
              { label: 'Alegatos', value: 'E4_ALEGATOS' }
            ]
          },
          {
            label: 'Gravedad',
            value: filtroGravedad,
            onChange: (value) => setFiltroGravedad(value),
            options: [
              { label: 'Todas', value: 'TODAS' },
              { label: 'Leve', value: 'LEVE' },
              { label: 'Moderada', value: 'MODERADA' },
              { label: 'Grave', value: 'GRAVE' }
            ]
          }
        ]}
      />

      {/* Tablero Kanban - IGUAL A DEFENSA JUDICIAL */}
      {tipoVista === 'kanban' && (
        <DndProvider backend={HTML5Backend}>
          <div className="relative">
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
                  handleMoverProceso={handleMoverProceso}
                />
              ))}
            </div>
          </div>
        </DndProvider>
      )}

      {/* Vista Lista */}

      {/* Vista Lista */}
      {tipoVista === 'lista' && (
        <VistaListaJuzgamiento
          procesos={procesosDisciplinariosMock}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      )}

      {/* Modal Nuevo Proceso */}
      <ModalNuevoProcesoDisciplinario
        isOpen={modalNuevoProcesoOpen}
        onClose={() => setModalNuevoProcesoOpen(false)}
      />
    </div>
  );
}

// ==================== COMPONENTE COLUMNA KANBAN ====================
interface ColumnaKanbanProps {
  etapa: {
    nombre: string;
    valor: 'E1_AVOCAMIENTO' | 'E2_DESCARGOS' | 'E3_PRUEBAS' | 'E4_ALEGATOS';
    color: string;
    icono: React.ReactNode;
    diasEstimados: number;
    procesos: ProcesoDisciplinario[];
  };
  isMobile: boolean;
  isTablet: boolean;
  handleMoverProceso: (procesoId: string, nuevaEtapa: 'E1_AVOCAMIENTO' | 'E2_DESCARGOS' | 'E3_PRUEBAS' | 'E4_ALEGATOS') => void;
}

function ColumnaKanban({ etapa, isMobile, isTablet, handleMoverProceso }: ColumnaKanbanProps) {
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.PROCESO,
    drop: (item: { id: string }) => handleMoverProceso(item.id, etapa.valor),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  const backgroundColor = isOver ? '#F0F7FF' : 'transparent';
  const borderColor = isOver ? '#2962FF' : 'transparent';

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
              {etapa.procesos.length}
            </Badge>
          </div>
        </div>

        {/* Lista de Procesos */}
        <div
          ref={drop}
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
          {etapa.procesos.map((proceso) => (
            <TarjetaProceso
              key={proceso.id}
              proceso={proceso}
              isMobile={isMobile}
              handleMoverProceso={handleMoverProceso}
              nuevaEtapa={etapa.valor}
            />
          ))}

          {etapa.procesos.length === 0 && (
            <div className="text-center py-12 text-gray-400" style={{ pointerEvents: 'none' }}>
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-xs font-semibold">
                {isOver ? '✅ Suelte aquí' : `Sin procesos en ${etapa.nombre}`}
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ==================== COMPONENTE TARJETA PROCESO ====================
interface TarjetaProcesoProps {
  proceso: ProcesoDisciplinario;
  isMobile: boolean;
  handleMoverProceso: (procesoId: string, nuevaEtapa: 'E1_AVOCAMIENTO' | 'E2_DESCARGOS' | 'E3_PRUEBAS' | 'E4_ALEGATOS') => void;
  nuevaEtapa: 'E1_AVOCAMIENTO' | 'E2_DESCARGOS' | 'E3_PRUEBAS' | 'E4_ALEGATOS';
}

function TarjetaProceso({ proceso, isMobile, handleMoverProceso, nuevaEtapa }: TarjetaProcesoProps) {
  // Estados para modales
  const [modalProcesoOpen, setModalProcesoOpen] = useState(false);
  const [modalComunicacionesOpen, setModalComunicacionesOpen] = useState(false);
  const [modalAutosOpen, setModalAutosOpen] = useState(false);
  const [modalEvidenciasOpen, setModalEvidenciasOpen] = useState(false);
  const [modalOficiosOpen, setModalOficiosOpen] = useState(false);
  const [modalActasOpen, setModalActasOpen] = useState(false);

  // Drag and Drop
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.PROCESO,
    item: { id: proceso.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0.5 : 1;

  return (
    <div ref={drag} style={{ opacity, cursor: 'move' }}>
      <Card className="bg-white border border-gray-200 hover:shadow-md transition-all">
        <div className="h-1" style={{ background: '#003DA5' }} />

        <div className={`${isMobile ? 'p-2.5' : 'p-3'}`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className={`${isMobile ? 'p-1' : 'p-1.5'} rounded-lg flex-shrink-0`}
                style={{ background: '#E0EDFF' }}
              >
                <Gavel className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} style={{ color: '#003DA5' }} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} truncate`} style={{ color: '#003DA5' }}>
                  {proceso.id}
                </h4>
                <p className="text-xs text-gray-600 truncate">{proceso.tipoFalta}</p>
              </div>
            </div>
          </div>

          <div className="mb-2 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">👤 Disciplinado:</p>
            <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
              {proceso.disciplinado}
            </p>
          </div>

          <div className="mb-2 pb-2 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Avatar className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} flex-shrink-0`}>
                <AvatarFallback
                  className="text-xs"
                  style={{ background: '#E0EDFF', color: '#003DA5' }}
                >
                  {(proceso.abogadoAsignado || 'ESAP')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">👨‍💼 Profesional:</p>
                <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
                  {proceso.abogadoAsignado || 'Sin asignar'}
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
              {proceso.diasRestantes} días
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-1.5 mb-2">
            <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
              <p className="text-xs font-bold text-gray-700">{proceso.documentos?.length || 0}</p>
              <p className="text-xs text-gray-500">Docs</p>
            </div>
            <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
              <p className="text-xs font-bold text-gray-700">{proceso.diasTotales - proceso.diasRestantes}</p>
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
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-700 line-clamp-2 mb-1`}>
              {ultimaActuacion}
            </p>
            <p className="text-xs text-gray-500">📅 {proceso.fechaActualizacion.toLocaleDateString('es-CO')}</p>
          </div>

          <div className="space-y-1 pt-2 border-t border-gray-200">
            <Button
              onClick={() => setModalProcesoOpen(true)}
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
                <Gavel className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5`} />
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
              Comentarios del Proceso
            </Button>
          </div>
        </div>

        <ModalProcesoDisciplinario
          isOpen={modalProcesoOpen}
          onClose={() => setModalProcesoOpen(false)}
          proceso={proceso}
        />
        <ModalComunicaciones
          isOpen={modalComunicacionesOpen}
          onClose={() => setModalComunicacionesOpen(false)}
          expediente={expedienteParaModales as any}
        />
        <ModalAutos
          isOpen={modalAutosOpen}
          onClose={() => setModalAutosOpen(false)}
          expediente={expedienteParaModales as any}
        />
        <ModalEvidencias
          isOpen={modalEvidenciasOpen}
          onClose={() => setModalEvidenciasOpen(false)}
          expediente={expedienteParaModales as any}
        />
        <ModalOficios
          isOpen={modalOficiosOpen}
          onClose={() => setModalOficiosOpen(false)}
          expediente={expedienteParaModales as any}
        />
        <ModalActas
          isOpen={modalActasOpen}
          onClose={() => setModalActasOpen(false)}
          expediente={expedienteParaModales as any}
        />
      </Card>
    </div>
  );
}
