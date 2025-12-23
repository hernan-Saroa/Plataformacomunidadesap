/**
 * ModuloDefensaJudicialV3 - MOD-01: Defensa Judicial
 * DISEÑO 100% IDÉNTICO A CONTROL INTERNO DISCIPLINARIO
 * Replicación exacta de estructura, espaciados y estilos
 */

import { useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { motion, AnimatePresence } from 'motion/react';
import {
  Scale, FileText, Clock, AlertTriangle, CheckCircle, User, Building,
  Eye, Edit, Plus, Download, Filter, Search, Calendar, TrendingUp,
  Archive, MessageSquare, History, Send, FileCheck, Mail, Columns3, List,
  AlertCircle, FolderOpen
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { ExpedienteJudicial } from '../core/types';
import { expedientesJudicialesMock, estadisticasDefensaJudicial } from '../data/datosExpedientesJudiciales';
import { toast } from 'sonner@2.0.3';

type VistaModulo = 'kanban' | 'lista';

export function ModuloDefensaJudicialV3() {
  const [tipoVista, setTipoVista] = useState<VistaModulo>('kanban');
  const [filtroTerritorial, setFiltroTerritorial] = useState<string>('');
  const [vistaCompacta] = useState(false); // Simula la lógica de compacto
  
  // Estados para modales
  const [modalExpediente, setModalExpediente] = useState<{ open: boolean; expediente: ExpedienteJudicial | null }>({ open: false, expediente: null });
  const [modalOficios, setModalOficios] = useState<{ open: boolean; expediente: ExpedienteJudicial | null }>({ open: false, expediente: null });
  const [modalActas, setModalActas] = useState<{ open: boolean; expediente: ExpedienteJudicial | null }>({ open: false, expediente: null });
  const [modalSeguimiento, setModalSeguimiento] = useState<{ open: boolean; expediente: ExpedienteJudicial | null }>({ open: false, expediente: null });

  // Agrupar expedientes por etapa
  const expedientesPorEtapa = {
    NOTIFICADA: expedientesJudicialesMock.filter(exp => exp.etapa === 'NOTIFICADA'),
    CONTESTACIÓN: expedientesJudicialesMock.filter(exp => exp.etapa === 'CONTESTACIÓN'),
    PROBATORIA: expedientesJudicialesMock.filter(exp => exp.etapa === 'PROBATORIA'),
    ALEGATOS: expedientesJudicialesMock.filter(exp => exp.etapa === 'ALEGATOS'),
  };

  const handleVerExpediente = (exp: ExpedienteJudicial) => {
    setModalExpediente({ open: true, expediente: exp });
  };

  const handleContactarAsesor = (exp: ExpedienteJudicial) => {
    toast.success('Asesoría Jurídica', { 
      description: `Consulta sobre ${exp.id} enviada al equipo jurídico` 
    });
  };

  const handleGestionarOficios = (exp: ExpedienteJudicial) => {
    setModalOficios({ open: true, expediente: exp });
  };

  const handleGestionarActas = (exp: ExpedienteJudicial) => {
    setModalActas({ open: true, expediente: exp });
  };

  const handleVerSeguimiento = (exp: ExpedienteJudicial) => {
    setModalSeguimiento({ open: true, expediente: exp });
  };

  // Definir etapas IGUAL que disciplinario
  const etapas = [
    { nombre: 'Notificada', color: '#6B7280', icono: <FileCheck className="w-4 h-4 text-gray-600" />, diasEstimados: 10 },
    { nombre: 'Contestación', color: '#6B7280', icono: <Eye className="w-4 h-4 text-gray-600" />, diasEstimados: 30 },
    { nombre: 'Probatoria', color: '#6B7280', icono: <Search className="w-4 h-4 text-gray-600" />, diasEstimados: 60 },
    { nombre: 'Alegatos', color: '#003DA5', icono: <Scale className="w-4 h-4" style={{ color: '#003DA5' }} />, diasEstimados: 20 },
  ];

  // Calcular estadísticas
  const expedientesPendientes = expedientesJudicialesMock.filter(e => e.diasRestantes <= 5).length;
  const expedientesEnTermino = expedientesJudicialesMock.filter(e => e.diasRestantes > 15).length;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        {/* Header Responsive - IGUAL A DISCIPLINARIO */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1">
            <h2 
              className="font-black leading-tight"
              style={{ 
                color: '#003DA5',
                fontSize: '1.5rem'
              }}
            >
              Tablero Kanban Operativo
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">
              Gestión visual de demandas judiciales contra ESAP
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle de Vista - ESTILO DISCIPLINARIO */}
            <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: '#F3F4F6' }}>
              <button
                onClick={() => setTipoVista('kanban')}
                className={`px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-all ${
                  tipoVista === 'kanban'
                    ? 'bg-white shadow-sm' 
                    : 'hover:bg-gray-200'
                }`}
                style={{ 
                  color: tipoVista === 'kanban' ? '#003DA5' : '#6B7280'
                }}
              >
                <Columns3 className="w-4 h-4" />
                Kanban
              </button>
              <button
                onClick={() => setTipoVista('lista')}
                className={`px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-all ${
                  tipoVista === 'lista'
                    ? 'bg-white shadow-sm' 
                    : 'hover:bg-gray-200'
                }`}
                style={{ 
                  color: tipoVista === 'lista' ? '#003DA5' : '#6B7280'
                }}
              >
                <List className="w-4 h-4" />
                Lista
              </button>
            </div>

            <button
              className="px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-400 transition-all"
              style={{ color: '#003DA5' }}
            >
              <Plus className="w-4 h-4" />
              Nueva Demanda
            </button>
          </div>
        </div>

        {/* Métricas Compactas - ESTILO DISCIPLINARIO */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 p-3">
              <div className="p-2.5 rounded-lg bg-orange-50 flex-shrink-0">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="font-black text-gray-900 leading-none" style={{ fontSize: '1.75rem' }}>
                  {expedientesJudicialesMock.length}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Expedientes
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 p-3">
              <div className="p-2.5 rounded-lg bg-red-50 flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="font-black text-gray-900 leading-none" style={{ fontSize: '1.75rem' }}>
                  {expedientesPendientes}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Críticos
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 p-3">
              <div className="p-2.5 rounded-lg bg-green-50 flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="font-black text-gray-900 leading-none" style={{ fontSize: '1.75rem' }}>
                  {expedientesEnTermino}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  En Término
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tablero Kanban - ESTRUCTURA EXACTA DISCIPLINARIO */}
        {tipoVista === 'kanban' && (
          <div className="relative">
            <div 
              className="flex gap-4 overflow-x-auto pb-4 scroll-smooth"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#CBD5E0 #F7FAFC',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {etapas.map((etapa, index) => {
                const expedientesKey = ['NOTIFICADA', 'CONTESTACIÓN', 'PROBATORIA', 'ALEGATOS'][index] as keyof typeof expedientesPorEtapa;
                const expedientes = expedientesPorEtapa[expedientesKey];
                
                return (
                  <ColumnaKanban
                    key={etapa.nombre}
                    etapa={etapa.nombre}
                    items={expedientes}
                    color={etapa.color}
                    icono={etapa.icono}
                    diasEstimados={etapa.diasEstimados}
                    vistaCompacta={vistaCompacta}
                    onVerExpediente={handleVerExpediente}
                    onContactarAsesor={handleContactarAsesor}
                    onGestionOficios={handleGestionarOficios}
                    onGestionActas={handleGestionarActas}
                    onVerSeguimiento={handleVerSeguimiento}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}

// ==================== COMPONENTE COLUMNA KANBAN ====================
interface ColumnaKanbanProps {
  etapa: string;
  items: ExpedienteJudicial[];
  color: string;
  icono: React.ReactNode;
  diasEstimados?: number;
  vistaCompacta: boolean;
  onVerExpediente: (exp: ExpedienteJudicial) => void;
  onContactarAsesor?: (exp: ExpedienteJudicial) => void;
  onGestionOficios?: (exp: ExpedienteJudicial) => void;
  onGestionActas?: (exp: ExpedienteJudicial) => void;
  onVerSeguimiento?: (exp: ExpedienteJudicial) => void;
}

function ColumnaKanban({ 
  etapa, 
  items, 
  color, 
  icono, 
  diasEstimados,
  vistaCompacta,
  onVerExpediente,
  onContactarAsesor,
  onGestionOficios,
  onGestionActas,
  onVerSeguimiento
}: ColumnaKanbanProps) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'EXPEDIENTE',
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  });

  return (
    <motion.div
      ref={drop}
      className="flex-shrink-0"
      initial={{ width: 320 }}
      animate={{ width: 320 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <Card 
        className="h-full border transition-all"
        style={{
          borderColor: isOver && canDrop ? color : '#E5E7EB',
          background: isOver && canDrop ? '#F9FAFB' : '#FFFFFF',
          opacity: isOver && !canDrop ? 0.5 : 1
        }}
      >
        {/* Header de Columna - ESTILO EXACTO DISCIPLINARIO */}
        <div className="p-4 border-b sticky top-0 z-10 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="p-2 rounded-lg bg-white border border-gray-200">
                {icono}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-sm text-gray-800">
                  {etapa}
                </h3>
                {diasEstimados && (
                  <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {diasEstimados} días
                  </p>
                )}
              </div>
            </div>
            <Badge className="font-semibold text-sm px-2 py-1 bg-white border border-gray-200 text-gray-700">
              {items.length}
            </Badge>
          </div>
        </div>

        {/* Lista de Items */}
        <div 
          className="p-3 space-y-3 overflow-y-auto" 
          style={{ maxHeight: 'calc(100vh - 280px)' }}
        >
          {items.map((expediente) => (
            <TarjetaExpediente
              key={expediente.id}
              expediente={expediente}
              onVerExpediente={onVerExpediente}
              onContactarAsesor={onContactarAsesor}
              onGestionOficios={onGestionOficios}
              onGestionActas={onGestionActas}
              onVerSeguimiento={onVerSeguimiento}
              vistaCompacta={vistaCompacta}
            />
          ))}

          {/* Empty State */}
          {items.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-xs font-semibold">
                Sin expedientes
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
  onVerExpediente: (exp: ExpedienteJudicial) => void;
  onContactarAsesor?: (exp: ExpedienteJudicial) => void;
  onGestionOficios?: (exp: ExpedienteJudicial) => void;
  onGestionActas?: (exp: ExpedienteJudicial) => void;
  onVerSeguimiento?: (exp: ExpedienteJudicial) => void;
  vistaCompacta: boolean;
}

function TarjetaExpediente({ 
  expediente, 
  onVerExpediente,
  onContactarAsesor,
  onGestionOficios,
  onGestionActas,
  onVerSeguimiento,
  vistaCompacta
}: TarjetaExpedienteProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'EXPEDIENTE',
    item: { ...expediente },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  // Determinar semáforo
  const semaforoIndicator = {
    verde: { color: '#10B981', label: 'En término' },
    amarillo: { color: '#F59E0B', label: 'Próximo a vencer' },
    rojo: { color: '#DC2626', label: 'Vencido' }
  };

  let semaforoKey: 'verde' | 'amarillo' | 'rojo' = 'verde';
  if (expediente.diasRestantes <= 5) {
    semaforoKey = 'rojo';
  } else if (expediente.diasRestantes <= 15) {
    semaforoKey = 'amarillo';
  }

  const semaforo = semaforoIndicator[semaforoKey];
  const porcentajeTiempo = Math.round(((expediente.diasTotales - expediente.diasRestantes) / expediente.diasTotales) * 100);

  return (
    <motion.div
      ref={drag}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: isDragging ? 0.95 : 1 }}
      className="cursor-move touch-none w-full"
    >
      <Card 
        className="bg-white border border-gray-200 hover:shadow-md transition-all flex flex-col w-full"
        style={{ 
          height: vistaCompacta ? '560px' : '680px',
          minHeight: vistaCompacta ? '560px' : '680px',
          maxHeight: vistaCompacta ? '560px' : '680px'
        }}
      >
        {/* Barra superior azul ESAP */}
        <div 
          className="h-1 flex-shrink-0"
          style={{ background: '#003DA5' }}
        />

        <div className="p-2.5 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-1.5">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div 
                className="p-1.5 rounded-lg flex-shrink-0"
                style={{ background: '#E0EDFF' }}
              >
                <Scale className="w-4 h-4" style={{ color: '#003DA5' }} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm truncate" style={{ color: '#003DA5' }}>
                  {expediente.id}
                </h4>
                <p className="text-xs text-gray-600 truncate">
                  {expediente.medioControl}
                </p>
              </div>
            </div>
          </div>

          {/* Demandante */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">👤 Demandante:</p>
            <p className="font-bold text-sm text-gray-900 line-clamp-1">
              {expediente.demandante}
            </p>
            <p className="text-xs text-gray-600">
              CC {expediente.demandante.includes('Ana') ? '52987654' : '1023456789'}
            </p>
          </div>

          {/* Jurisdicción */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">⚖️ Jurisdicción:</p>
            <p className="font-bold text-sm text-gray-900 line-clamp-1">
              {expediente.jurisdiccion}
            </p>
          </div>

          {/* Profesional Asignado */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6 flex-shrink-0">
                <AvatarFallback 
                  className="text-xs"
                  style={{ background: '#E0EDFF', color: '#003DA5' }}
                >
                  {expediente.abogadoAsignado.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">👨‍💼 Profesional:</p>
                <p className="font-bold text-sm text-gray-900 line-clamp-1">
                  {expediente.abogadoAsignado}
                </p>
                <p className="text-xs text-gray-600">
                  CC {expediente.abogadoAsignado.includes('Martínez') ? '80123456' : '79987654'}
                </p>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <Badge 
              className="text-xs flex items-center gap-1 font-semibold bg-gray-50 border border-gray-200"
              style={{ color: semaforo.color }}
            >
              <div 
                className="w-2 h-2 rounded-full"
                style={{ background: semaforo.color }}
              />
              {expediente.diasRestantes} días
            </Badge>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-3 gap-1.5 mb-1.5">
            <div className="text-center p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs font-bold text-gray-700">{expediente.documentos?.length || 0}</p>
              <p className="text-xs text-gray-500">Docs</p>
            </div>
            <div className="text-center p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs font-bold text-gray-700">{expediente.diasTotales - expediente.diasRestantes}</p>
              <p className="text-xs text-gray-500">Días</p>
            </div>
            <div className="text-center p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs font-bold text-gray-700">
                {porcentajeTiempo}%
              </p>
              <p className="text-xs text-gray-500">Tiempo</p>
            </div>
          </div>

          {/* Última actuación */}
          <div className="mb-1.5">
            <p className="text-xs text-gray-500 mb-0.5">Última actuación:</p>
            <p className="text-xs text-gray-700 line-clamp-1">{expediente.hechos.substring(0, 80)}...</p>
          </div>

          {/* Acciones Principales - Siempre Visibles */}
          <div className="space-y-1 pt-2 border-t border-gray-200 mt-auto flex-shrink-0">
            {/* Acción Principal: Ver Expediente */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onVerExpediente(expediente);
              }}
              size="sm"
              className="w-full text-xs font-bold truncate"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Archive className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">Expediente</span>
            </Button>

            {/* Botones de Acción - INTEGRACIÓN ENTRE MÓDULOS SIGL */}
            <div className="space-y-1">
              {/* Primera fila: Contactar Asesor y Ver Expediente */}
              <div className="grid grid-cols-2 gap-1">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onContactarAsesor) {
                      onContactarAsesor(expediente);
                    }
                  }}
                  size="sm"
                  variant="outline"
                  className="text-[10px] px-1.5 py-1 justify-start truncate min-w-0 h-7"
                >
                  <User className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">Asesor</span>
                </Button>
                
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onVerExpediente(expediente);
                  }}
                  size="sm"
                  variant="outline"
                  className="text-[10px] px-1.5 py-1 justify-start truncate min-w-0 h-7"
                >
                  <FolderOpen className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">Expediente</span>
                </Button>
              </div>

              {/* Segunda fila: Oficios y Actas */}
              <div className="grid grid-cols-2 gap-1">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onGestionOficios) {
                      onGestionOficios(expediente);
                    }
                  }}
                  size="sm"
                  variant="outline"
                  className="text-[10px] px-1.5 py-1 justify-start truncate min-w-0 h-7"
                >
                  <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">Oficios</span>
                </Button>
                
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onGestionActas) {
                      onGestionActas(expediente);
                    }
                  }}
                  size="sm"
                  variant="outline"
                  className="text-[10px] px-1.5 py-1 justify-start truncate min-w-0 h-7"
                >
                  <FileCheck className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">Actas</span>
                </Button>
              </div>

              {/* Tercera fila: Seguimiento (ancho completo y destacado) */}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onVerSeguimiento) {
                    onVerSeguimiento(expediente);
                  }
                }}
                size="sm"
                className="w-full text-[10px] py-1.5 font-bold h-8"
                style={{ 
                  background: '#003DA5',
                  color: '#FFFFFF'
                }}
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                <span className="truncate">💬 Seguimiento del Proceso</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}