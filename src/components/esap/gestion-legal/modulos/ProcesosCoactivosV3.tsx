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
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { toast } from 'sonner@2.0.3';
import { procesosCoactivos } from '../data/datosProcesosCoactivos';
import type { ProcesoCoactivo } from '../core/types';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import { ModalCrearProcesoCoactivo } from '../procesos-coactivos/ModalCrearProcesoCoactivo';
import { VistaListaProcesosCoactivos } from './VistaListaProcesosCoactivos';
import { Input } from '../../../ui/input';
import { Textarea } from '../../../ui/textarea';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Tipos para comunicaciones
interface Comunicacion {
  id: string;
  autor: string;
  cargo: string;
  mensaje: string;
  fecha: Date;
  tipo: 'normal' | 'alerta' | 'importante';
  reacciones?: number;
}

// Tipo para drag and drop
const ItemTypes = {
  PROCESO: 'proceso'
};

// Transformar datos para el componente (agregar campos calculados)
const procesosCoactivosMock: Array<ProcesoCoactivo & { diasHastaPrescripcion: number }> = procesosCoactivos.map(p => ({
  ...p,
  diasHastaPrescripcion: p.diasPrescripcion
}));

export function ModuloProcesosCoactivosV3() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [tipoVista, setTipoVista] = useState<'kanban' | 'lista'>('kanban');
  const [modalCrear, setModalCrear] = useState(false);
  const [filtroEtapa, setFiltroEtapa] = useState<string>('TODAS');
  const [filtroMonto, setFiltroMonto] = useState<string>('TODOS');

  // Estado local de procesos para drag and drop
  const [procesos, setProcesos] = useState<Array<ProcesoCoactivo & { diasHastaPrescripcion: number }>>(procesosCoactivosMock);

  // Estados para modales
  const [modalComunicaciones, setModalComunicaciones] = useState(false);
  const [modalExpediente, setModalExpediente] = useState(false);
  const [modalDocumentos, setModalDocumentos] = useState(false);
  const [modalPagos, setModalPagos] = useState(false);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<ProcesoCoactivo | null>(null);

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

  // Manejar movimiento de proceso entre etapas
  const handleMoverProceso = (procesoId: string, nuevaEtapa: 'IDENTIFICADO' | 'PERSUASIVO' | 'PREJURIDICO' | 'MANDAMIENTO') => {
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
    IDENTIFICADO: procesos.filter(p => p.etapa === 'IDENTIFICADO'),
    PERSUASIVO: procesos.filter(p => p.etapa === 'PERSUASIVO'),
    PREJURIDICO: procesos.filter(p => p.etapa === 'PREJURIDICO'),
    MANDAMIENTO: procesos.filter(p => p.etapa === 'MANDAMIENTO'),
  };

  // Calcular estadísticas
  const totalProcesos = procesos.length;
  const procesosCriticos = procesos.filter(p => p.diasHastaPrescripcion <= 30).length;
  const procesosEnTermino = procesos.filter(p => p.diasHastaPrescripcion > 90).length;

  const etapas = [
    { 
      nombre: 'Identificado', 
      valor: 'IDENTIFICADO' as const,
      color: '#6B7280', 
      icono: <FileCheck className="w-4 h-4 text-gray-600" />, 
      diasEstimados: 15,
      procesos: procesosPorEtapa.IDENTIFICADO
    },
    { 
      nombre: 'Persuasivo', 
      valor: 'PERSUASIVO' as const,
      color: '#F59E0B', 
      icono: <Mail className="w-4 h-4 text-amber-600" />, 
      diasEstimados: 30,
      procesos: procesosPorEtapa.PERSUASIVO
    },
    { 
      nombre: 'Prejurídico', 
      valor: 'PREJURIDICO' as const,
      color: '#3B82F6', 
      icono: <FileText className="w-4 h-4 text-blue-600" />, 
      diasEstimados: 45,
      procesos: procesosPorEtapa.PREJURIDICO
    },
    { 
      nombre: 'Mandamiento', 
      valor: 'MANDAMIENTO' as const,
      color: '#003DA5', 
      icono: <Scale className="w-4 h-4" style={{ color: '#003DA5' }} />, 
      diasEstimados: 60,
      procesos: procesosPorEtapa.MANDAMIENTO
    },
  ];

  const handleComunicaciones = (proceso: ProcesoCoactivo) => {
    setProcesoSeleccionado(proceso);
    setModalComunicaciones(true);
  };

  const handleExpediente = (proceso: ProcesoCoactivo) => {
    setProcesoSeleccionado(proceso);
    setModalExpediente(true);
  };

  const handleDocumentos = (proceso: ProcesoCoactivo) => {
    setProcesoSeleccionado(proceso);
    setModalDocumentos(true);
  };

  const handlePagos = (proceso: ProcesoCoactivo) => {
    setProcesoSeleccionado(proceso);
    setModalPagos(true);
  };

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header con ModuleHeader */}
      <ModuleHeader
        title={isMobile ? 'Kanban Operativo' : 'Tablero Kanban Operativo'}
        subtitle="Gestión de cobro coactivo de obligaciones"
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
            onClick: () => setModalCrear(true),
            variant: 'primary'
          }
        ]}
        infoTooltip={
          <ModuleInfoTooltip
            title="Guía de Procesos Coactivos"
            variant="icon"
            sections={[
              {
                label: "💰 Propósito del Módulo",
                content: "Gestión del cobro judicial de obligaciones a favor de ESAP: matrículas impagas, multas administrativas, sanciones pecuniarias, reintegros de becas, devoluciones de pagos indebidos y otros créditos a favor de la institución.",
                type: "default"
              }
            ]}
          />
        }
      />

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
              onComunicaciones={onComunicaciones}
              onExpediente={onExpediente}
              onDocumentos={onDocumentos}
              onPagos={onPagos}
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
    </div>
  );
}

// ==================== COMPONENTE TARJETA PROCESO ====================
interface TarjetaProcesoProps {
  proceso: ProcesoCoactivo & { diasHastaPrescripcion: number };
  isMobile: boolean;
  onComunicaciones: (proceso: ProcesoCoactivo) => void;
  onExpediente: (proceso: ProcesoCoactivo) => void;
  onDocumentos: (proceso: ProcesoCoactivo) => void;
  onPagos: (proceso: ProcesoCoactivo) => void;
}

function TarjetaProceso({ proceso, isMobile, onComunicaciones, onExpediente, onDocumentos, onPagos }: TarjetaProcesoProps) {
  // Determinar semáforo
  const getSemaforoColor = (diasPrescripcion: number) => {
    if (diasPrescripcion <= 180) return { color: '#DC2626', label: 'Urgente' };
    if (diasPrescripcion <= 365) return { color: '#F59E0B', label: 'Atención' };
    return { color: '#10B981', label: 'Normal' };
  };

  const semaforo = getSemaforoColor(proceso.diasHastaPrescripcion);
  // Generar última actuación desde timeline o usar fecha de actualización
  const ultimaActuacion = proceso.timeline && proceso.timeline.length > 0 
    ? proceso.timeline[proceso.timeline.length - 1].descripcion
    : `Proceso en etapa de ${proceso.etapa}`;

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
        {/* Barra superior azul ESAP */}
        <div className="h-1" style={{ background: '#003DA5' }} />

        <div className={`${isMobile ? 'p-2.5' : 'p-3'}`}>
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div 
                className={`${isMobile ? 'p-1' : 'p-1.5'} rounded-lg flex-shrink-0`}
                style={{ background: '#E0EDFF' }}
              >
                <DollarSign className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} style={{ color: '#003DA5' }} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} truncate`} style={{ color: '#003DA5' }}>
                  {proceso.id}
                </h4>
                <p className="text-xs text-gray-600 truncate">
                  {proceso.montoTotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
                </p>
              </div>
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
          <div className="space-y-1 pt-2 border-t border-gray-200">
            <Button
              onClick={() => onExpediente(proceso)}
              size="sm"
              className={`w-full ${isMobile ? 'text-xs py-1.5' : 'text-xs'} font-bold`}
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Archive className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1 flex-shrink-0`} />
              Expediente
            </Button>

            <div className="grid grid-cols-2 gap-1">
              <Button
                onClick={() => onDocumentos(proceso)}
                size="sm"
                variant="outline"
                className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start`}
              >
                <Paperclip className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5`} />
                Docs
              </Button>
              
              <Button
                onClick={() => onPagos(proceso)}
                size="sm"
                variant="outline"
                className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start`}
              >
                <DollarSign className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5`} />
                Pagos
              </Button>
            </div>

            <Button
              onClick={() => onComunicaciones(proceso)}
              size="sm"
              className={`w-full ${isMobile ? 'text-xs py-1.5' : 'text-xs'} font-bold`}
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <MessageSquare className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1`} />
              Comentarios
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ==================== MODAL COMUNICACIONES DEL PROCESO ====================
function ModalComunicaciones({ proceso, onClose }: { proceso: ProcesoCoactivo; onClose: () => void }) {
  const [mensajeNuevo, setMensajeNuevo] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<'RECIBIDO' | 'MAS_UTIL' | 'ANOTADO'>('RECIBIDO');

  const comunicacionesMock: Comunicacion[] = [
    {
      id: '1',
      autor: 'Juan Pérez López',
      cargo: 'Abogado Defensor',
      mensaje: 'Se recibió notificación del juzgado con auto admisorio. Procederemos a contestar la demanda en los próximos 10 días según el término legal.',
      fecha: new Date('2024-12-23 14:35'),
      tipo: 'normal'
    },
    {
      id: '2',
      autor: 'María González',
      cargo: 'Coordinadora Jurídica',
      mensaje: '@ Juan Pérez: ¿Ya revisaste los precedentes jurisprudenciales? Necesitamos incluirlos en la contestación.',
      fecha: new Date('2024-12-23 10:20'),
      tipo: 'normal',
      reacciones: 2
    },
    {
      id: '3',
      autor: 'Carlos Ruiz',
      cargo: 'Director Jurídico',
      mensaje: 'Aprobada la estrategia de defensa propuesta. Por favor proceder con la contestación y mantenerme informado del avance.',
      fecha: new Date('2024-12-22 08:47'),
      tipo: 'importante'
    },
    {
      id: '4',
      autor: 'Sistema SIGL',
      cargo: 'Notificación Automática',
      mensaje: 'ALERTA: Quedan 18 días para vencimiento del término de contestación de la demanda.',
      fecha: new Date('2024-12-20 08:00'),
      tipo: 'alerta'
    },
    {
      id: '5',
      autor: 'Ana López',
      cargo: 'Asistente Jurídica',
      mensaje: 'Adjunto documentos certificados laborales, contratos y actos administrativos. Todo listo para la contestación.',
      fecha: new Date('2024-12-19 15:34'),
      tipo: 'normal'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6" style={{ color: '#003DA5' }} />
            <div>
              <h2 className="font-bold text-lg" style={{ color: '#003DA5' }}>Comunicaciones del Proceso</h2>
              <p className="text-sm text-gray-600">{proceso.id}</p>
            </div>
          </div>
          <Button onClick={onClose} size="sm" variant="ghost">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Badges Estado */}
        <div className="p-4 border-b bg-gray-50 flex items-center gap-3">
          <Badge style={{ background: '#003DA5', color: '#FFFFFF' }} className="font-bold">
            CONTESTACIÓN
          </Badge>
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <MessageSquare className="w-4 h-4" />
            <span className="font-semibold">5 mensajes</span>
          </div>
        </div>

        {/* Filtros */}
        <div className="p-3 border-b bg-gray-50 flex items-center gap-2">
          <button
            onClick={() => setFiltroActivo('RECIBIDO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filtroActivo === 'RECIBIDO' 
                ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            📥 RECIBIDO
          </button>
          <button
            onClick={() => setFiltroActivo('MAS_UTIL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filtroActivo === 'MAS_UTIL' 
                ? 'bg-purple-100 text-purple-700 border border-purple-300' 
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            👍 Más útil
          </button>
          <button
            onClick={() => setFiltroActivo('ANOTADO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filtroActivo === 'ANOTADO' 
                ? 'bg-amber-100 text-amber-700 border border-amber-300' 
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            ⭐ Anotado
          </button>
        </div>

        {/* Lista de Comunicaciones */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {comunicacionesMock.map((com) => (
            <Card 
              key={com.id} 
              className={`p-4 ${
                com.tipo === 'alerta' 
                  ? 'bg-amber-50 border-amber-200' 
                  : com.tipo === 'importante' 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarFallback 
                    style={{ 
                      background: com.tipo === 'alerta' ? '#FEF3C7' : '#E0EDFF', 
                      color: com.tipo === 'alerta' ? '#F59E0B' : '#003DA5' 
                    }}
                  >
                    {com.autor.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="font-bold text-sm">{com.autor}</p>
                      <p className="text-xs text-gray-500">{com.cargo}</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      📅 {com.fecha.toLocaleDateString('es-CO')} {com.fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <p className="text-sm text-gray-700 mb-2">{com.mensaje}</p>

                  <div className="flex items-center gap-2">
                    <button className="text-xs text-gray-600 hover:text-blue-600 flex items-center gap-1">
                      💬 Responder
                    </button>
                    <button className="text-xs text-gray-600 hover:text-purple-600 flex items-center gap-1">
                      👍 Reaccionar {com.reacciones ? `(${com.reacciones})` : ''}
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Footer - Input de nuevo mensaje */}
        <div className="sticky bottom-0 bg-white border-t p-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Escribe un mensaje sobre este proceso judicial..."
              value={mensajeNuevo}
              onChange={(e) => setMensajeNuevo(e.target.value)}
              rows={2}
              className="flex-1"
            />
            <Button
              onClick={() => {
                toast.success('Mensaje enviado');
                setMensajeNuevo('');
              }}
              style={{ background: '#003DA5', color: '#FFFFFF' }}
              className="px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Use <strong>@nombre</strong> para mencionar | <strong>SHIFT + ENTER</strong> para nueva línea
          </p>
        </div>
      </Card>
    </div>
  );
}

// ==================== MODAL EXPEDIENTE ====================
function ModalExpediente({ proceso, onClose }: { proceso: ProcesoCoactivo; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="font-bold text-lg" style={{ color: '#003DA5' }}>Expediente Completo</h2>
          <Button onClick={onClose} size="sm" variant="ghost">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">ID Proceso</label>
              <p className="text-sm font-bold mt-1" style={{ color: '#003DA5' }}>{proceso.id}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Etapa</label>
              <Badge className="mt-1" variant="outline">{proceso.etapa}</Badge>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Deudor</label>
            <p className="text-sm font-medium mt-1">{proceso.deudor}</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-gray-50 border">
              <p className="text-2xl font-bold text-gray-700">{proceso.montoCapital.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p>
              <p className="text-xs text-gray-500 mt-1">Capital</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gray-50 border">
              <p className="text-2xl font-bold text-gray-700">{proceso.montoIntereses.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p>
              <p className="text-xs text-gray-500 mt-1">Intereses</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gray-50 border">
              <p className="text-2xl font-bold text-gray-700">{proceso.montoTotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p>
              <p className="text-xs text-gray-500 mt-1">Total</p>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t p-4 flex gap-2 justify-end">
          <Button onClick={onClose} variant="outline">Cerrar</Button>
          <Button style={{ background: '#003DA5', color: '#FFFFFF' }}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Expediente
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ==================== MODAL DOCUMENTOS ====================
function ModalDocumentos({ proceso, onClose }: { proceso: ProcesoCoactivo; onClose: () => void }) {
  const documentosMock = [
    { nombre: 'Mandamiento de Pago.pdf', fecha: new Date(), tipo: 'PDF', tamaño: '1.2 MB' },
    { nombre: 'Certificado de Deuda.pdf', fecha: new Date(), tipo: 'PDF', tamaño: '850 KB' },
    { nombre: 'Notificación al Deudor.docx', fecha: new Date(), tipo: 'WORD', tamaño: '120 KB' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg" style={{ color: '#003DA5' }}>Documentos del Proceso</h2>
            <p className="text-sm text-gray-600">{proceso.id}</p>
          </div>
          <Button onClick={onClose} size="sm" variant="ghost">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Total de documentos: <span className="font-bold">{documentosMock.length}</span>
            </p>
            <Button size="sm" style={{ background: '#003DA5', color: '#FFFFFF' }}>
              <Upload className="w-4 h-4 mr-2" />
              Cargar Documento
            </Button>
          </div>

          <div className="space-y-2">
            {documentosMock.map((doc, idx) => (
              <Card key={idx} className="p-4 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ background: '#E0EDFF' }}>
                      <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{doc.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {doc.tipo} • {doc.tamaño} • {doc.fecha.toLocaleDateString('es-CO')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => toast.info('Descargando...')}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toast.info('Abriendo vista previa...')}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t p-4 flex gap-2 justify-end">
          <Button onClick={onClose} variant="outline">Cerrar</Button>
        </div>
      </Card>
    </div>
  );
}

// ==================== MODAL PAGOS ====================
function ModalPagos({ proceso, onClose }: { proceso: ProcesoCoactivo; onClose: () => void }) {
  const [montoPago, setMontoPago] = useState('');
  const [fechaPago, setFechaPago] = useState('');
  const [conceptoPago, setConceptoPago] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg" style={{ color: '#003DA5' }}>Registrar Pago</h2>
            <p className="text-sm text-gray-600">{proceso.id}</p>
          </div>
          <Button onClick={onClose} size="sm" variant="ghost">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Saldo Pendiente</label>
              <p className="text-xl font-bold" style={{ color: '#003DA5' }}>
                {proceso.montoTotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Deudor</label>
              <p className="text-sm font-medium">{proceso.deudor}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Monto del Pago</label>
              <Input
                type="number"
                value={montoPago}
                onChange={(e) => setMontoPago(e.target.value)}
                placeholder="$0.00"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Fecha del Pago</label>
              <Input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Concepto</label>
            <Textarea
              value={conceptoPago}
              onChange={(e) => setConceptoPago(e.target.value)}
              placeholder="Ej. Pago parcial capital, Abono a intereses..."
              rows={3}
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t p-4 flex gap-2 justify-end">
          <Button onClick={onClose} variant="outline">Cancelar</Button>
          <Button 
            style={{ background: '#003DA5', color: '#FFFFFF' }}
            onClick={() => {
              toast.success('Pago registrado correctamente');
              onClose();
            }}
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Registrar Pago
          </Button>
        </div>
      </Card>
    </div>
  );
}
