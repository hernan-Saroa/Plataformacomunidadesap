/**
 * ModuloJuzgamientoDisciplinarioV3 - MOD-02: Juzgamiento Disciplinario
 * DISEÑO 100% IDÉNTICO A CONTROL INTERNO DISCIPLINARIO
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
import { ProcesoDisciplinario } from '../core/types';
import { procesoDisciplinariosMock, estadisticasJuzgamiento } from '../data/datosProcesoDisciplinarios';
import { toast } from 'sonner@2.0.3';

type VistaModulo = 'kanban' | 'lista';

export function ModuloJuzgamientoDisciplinarioV3() {
  const [tipoVista, setTipoVista] = useState<VistaModulo>('kanban');
  const [vistaCompacta] = useState(false);

  // Agrupar por etapa
  const procesosPorEtapa = {
    E1_AVOCAMIENTO: procesoDisciplinariosMock.filter(p => p.etapa === 'E1_AVOCAMIENTO'),
    E2_DESCARGOS: procesoDisciplinariosMock.filter(p => p.etapa === 'E2_DESCARGOS'),
    E3_PRUEBAS: procesoDisciplinariosMock.filter(p => p.etapa === 'E3_PRUEBAS'),
    E4_ALEGATOS: procesoDisciplinariosMock.filter(p => p.etapa === 'E4_ALEGATOS'),
  };

  const handleVerProceso = (proc: ProcesoDisciplinario) => {
    toast.success('Expediente Disciplinario', { description: `Abriendo ${proc.id}` });
  };

  const handleGestionAutos = (proc: ProcesoDisciplinario) => {
    toast.info('Autos y Providencias', { description: proc.id });
  };

  const handleGestionEvidencias = (proc: ProcesoDisciplinario) => {
    toast.info('Evidencias', { description: proc.id });
  };

  const handleGestionOficios = (proc: ProcesoDisciplinario) => {
    toast.info('Oficios', { description: proc.id });
  };

  const handleGestionActas = (proc: ProcesoDisciplinario) => {
    toast.info('Actas', { description: proc.id });
  };

  const handleComentarios = (proc: ProcesoDisciplinario) => {
    toast.info('Comentarios del Proceso', { description: proc.id });
  };

  const etapas = [
    { nombre: 'Avocamiento', color: '#6B7280', icono: <FileCheck className="w-4 h-4 text-gray-600" />, diasEstimados: 5 },
    { nombre: 'Descargos', color: '#6B7280', icono: <Eye className="w-4 h-4 text-gray-600" />, diasEstimados: 10 },
    { nombre: 'Pruebas', color: '#6B7280', icono: <Search className="w-4 h-4 text-gray-600" />, diasEstimados: 30 },
    { nombre: 'Alegatos', color: '#003DA5', icono: <Scale className="w-4 h-4" style={{ color: '#003DA5' }} />, diasEstimados: 10 },
  ];

  const procesosCriticos = procesoDisciplinariosMock.filter(p => p.diasRestantes <= 3).length;
  const procesosEnTermino = procesoDisciplinariosMock.filter(p => p.diasRestantes > 5).length;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        {/* Header - ESTILO DISCIPLINARIO */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1">
            <h2 
              className="font-black leading-tight"
              style={{ color: '#003DA5', fontSize: '1.5rem' }}
            >
              Tablero Kanban Operativo
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">
              Gestión visual de procesos disciplinarios en juzgamiento
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: '#F3F4F6' }}>
              <button
                onClick={() => setTipoVista('kanban')}
                className={`px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-all ${
                  tipoVista === 'kanban' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                }`}
                style={{ color: tipoVista === 'kanban' ? '#003DA5' : '#6B7280' }}
              >
                <Columns3 className="w-4 h-4" />
                Kanban
              </button>
              <button
                onClick={() => setTipoVista('lista')}
                className={`px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-all ${
                  tipoVista === 'lista' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                }`}
                style={{ color: tipoVista === 'lista' ? '#003DA5' : '#6B7280' }}
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
              Nuevo Proceso
            </button>
          </div>
        </div>

        {/* Métricas - ESTILO DISCIPLINARIO */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 p-3">
              <div className="p-2.5 rounded-lg bg-orange-50 flex-shrink-0">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="font-black text-gray-900 leading-none" style={{ fontSize: '1.75rem' }}>
                  {procesoDisciplinariosMock.length}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Procesos</p>
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
                  {procesosCriticos}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Críticos</p>
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
                  {procesosEnTermino}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">En Término</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tablero Kanban */}
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
                const etapasKeys = ['E1_AVOCAMIENTO', 'E2_DESCARGOS', 'E3_PRUEBAS', 'E4_ALEGATOS'] as const;
                const procesos = procesosPorEtapa[etapasKeys[index]];
                
                return (
                  <ColumnaKanban
                    key={etapa.nombre}
                    etapa={etapa.nombre}
                    items={procesos}
                    color={etapa.color}
                    icono={etapa.icono}
                    diasEstimados={etapa.diasEstimados}
                    vistaCompacta={vistaCompacta}
                    onVerProceso={handleVerProceso}
                    onGestionAutos={handleGestionAutos}
                    onGestionEvidencias={handleGestionEvidencias}
                    onGestionOficios={handleGestionOficios}
                    onGestionActas={handleGestionActas}
                    onComentarios={handleComentarios}
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

// ==================== COLUMNA KANBAN ====================
interface ColumnaKanbanProps {
  etapa: string;
  items: ProcesoDisciplinario[];
  color: string;
  icono: React.ReactNode;
  diasEstimados?: number;
  vistaCompacta: boolean;
  onVerProceso: (proc: ProcesoDisciplinario) => void;
  onGestionAutos?: (proc: ProcesoDisciplinario) => void;
  onGestionEvidencias?: (proc: ProcesoDisciplinario) => void;
  onGestionOficios?: (proc: ProcesoDisciplinario) => void;
  onGestionActas?: (proc: ProcesoDisciplinario) => void;
  onComentarios?: (proc: ProcesoDisciplinario) => void;
}

function ColumnaKanban({ 
  etapa, items, color, icono, diasEstimados, vistaCompacta,
  onVerProceso, onGestionAutos, onGestionEvidencias, onGestionOficios, onGestionActas, onComentarios
}: ColumnaKanbanProps) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'PROCESO',
    collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() })
  });

  return (
    <motion.div ref={drop} className="flex-shrink-0" initial={{ width: 320 }} animate={{ width: 320 }}>
      <Card 
        className="h-full border transition-all"
        style={{
          borderColor: isOver && canDrop ? color : '#E5E7EB',
          background: isOver && canDrop ? '#F9FAFB' : '#FFFFFF'
        }}
      >
        <div className="p-4 border-b sticky top-0 z-10 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="p-2 rounded-lg bg-white border border-gray-200">{icono}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-sm text-gray-800">{etapa}</h3>
                {diasEstimados && (
                  <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />{diasEstimados} días
                  </p>
                )}
              </div>
            </div>
            <Badge className="font-semibold text-sm px-2 py-1 bg-white border border-gray-200 text-gray-700">
              {items.length}
            </Badge>
          </div>
        </div>

        <div className="p-3 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {items.map((proceso) => (
            <TarjetaProceso
              key={proceso.id}
              proceso={proceso}
              onVerProceso={onVerProceso}
              onGestionAutos={onGestionAutos}
              onGestionEvidencias={onGestionEvidencias}
              onGestionOficios={onGestionOficios}
              onGestionActas={onGestionActas}
              onComentarios={onComentarios}
              vistaCompacta={vistaCompacta}
            />
          ))}

          {items.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-xs font-semibold">Sin procesos</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ==================== TARJETA PROCESO ====================
interface TarjetaProcesoProps {
  proceso: ProcesoDisciplinario;
  onVerProceso: (proc: ProcesoDisciplinario) => void;
  onGestionAutos?: (proc: ProcesoDisciplinario) => void;
  onGestionEvidencias?: (proc: ProcesoDisciplinario) => void;
  onGestionOficios?: (proc: ProcesoDisciplinario) => void;
  onGestionActas?: (proc: ProcesoDisciplinario) => void;
  onComentarios?: (proc: ProcesoDisciplinario) => void;
  vistaCompacta: boolean;
}

function TarjetaProceso({ 
  proceso, onVerProceso, onGestionAutos, onGestionEvidencias, onGestionOficios, onGestionActas, onComentarios, vistaCompacta
}: TarjetaProcesoProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'PROCESO',
    item: { ...proceso },
    collect: (monitor) => ({ isDragging: monitor.isDragging() })
  });

  let semaforoKey: 'verde' | 'amarillo' | 'rojo' = 'verde';
  if (proceso.diasRestantes <= 3) semaforoKey = 'rojo';
  else if (proceso.diasRestantes <= 5) semaforoKey = 'amarillo';

  const semaforo = {
    verde: { color: '#10B981' },
    amarillo: { color: '#F59E0B' },
    rojo: { color: '#DC2626' }
  }[semaforoKey];

  return (
    <motion.div
      ref={drag}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: isDragging ? 0.95 : 1 }}
      className="cursor-move touch-none w-full"
    >
      <Card 
        className="bg-white border border-gray-200 hover:shadow-md transition-all flex flex-col w-full"
        style={{ height: vistaCompacta ? '560px' : '680px', minHeight: vistaCompacta ? '560px' : '680px', maxHeight: vistaCompacta ? '560px' : '680px' }}
      >
        <div className="h-1 flex-shrink-0" style={{ background: '#003DA5' }} />

        <div className="p-2.5 flex-1 flex flex-col overflow-y-auto min-h-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-1.5">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: '#E0EDFF' }}>
                <Scale className="w-4 h-4" style={{ color: '#003DA5' }} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm truncate" style={{ color: '#003DA5' }}>{proceso.id}</h4>
                <p className="text-xs text-gray-600 truncate">{proceso.leyAplicable}</p>
              </div>
            </div>
          </div>

          {/* Investigado */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">⚠️ Investigado:</p>
            <p className="font-bold text-sm text-gray-900 line-clamp-1">{proceso.investigado}</p>
            <p className="text-xs text-gray-600">CC 1023456789</p>
          </div>

          {/* Cargo */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">💼 Cargo:</p>
            <p className="font-bold text-sm text-gray-900 line-clamp-1">{proceso.cargo}</p>
          </div>

          {/* Abogado */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6 flex-shrink-0">
                <AvatarFallback className="text-xs" style={{ background: '#E0EDFF', color: '#003DA5' }}>
                  {proceso.abogadoAsignado.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">👨‍💼 Profesional:</p>
                <p className="font-bold text-sm text-gray-900 line-clamp-1">{proceso.abogadoAsignado}</p>
                <p className="text-xs text-gray-600">CC 80123456</p>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <Badge className="text-xs flex items-center gap-1 font-semibold bg-gray-50 border border-gray-200" style={{ color: semaforo.color }}>
              <div className="w-2 h-2 rounded-full" style={{ background: semaforo.color }} />
              {proceso.diasRestantes} días
            </Badge>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-3 gap-1.5 mb-1.5">
            <div className="text-center p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs font-bold text-gray-700">{proceso.documentos?.length || 0}</p>
              <p className="text-xs text-gray-500">Docs</p>
            </div>
            <div className="text-center p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs font-bold text-gray-700">{proceso.actuaciones?.length || 0}</p>
              <p className="text-xs text-gray-500">Actos</p>
            </div>
            <div className="text-center p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs font-bold text-gray-700">
                {Math.round(((proceso.diasDescargos - proceso.diasRestantes) / proceso.diasDescargos) * 100)}%
              </p>
              <p className="text-xs text-gray-500">Tiempo</p>
            </div>
          </div>

          {/* Última actuación */}
          <div className="mb-1.5">
            <p className="text-xs text-gray-500 mb-0.5">Hechos:</p>
            <p className="text-xs text-gray-700 line-clamp-1">{proceso.hechos.substring(0, 80)}...</p>
          </div>

          {/* Acciones */}
          <div className="space-y-1 pt-2 border-t border-gray-200 mt-auto flex-shrink-0">
            <Button
              onClick={(e) => { e.stopPropagation(); onVerProceso(proceso); }}
              size="sm"
              className="w-full text-xs font-bold truncate"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Archive className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">Expediente</span>
            </Button>

            <div className="space-y-1">
              <div className="grid grid-cols-2 gap-1">
                <Button onClick={(e) => { e.stopPropagation(); onGestionAutos?.(proceso); }} size="sm" variant="outline" className="text-[11px] px-2 justify-start truncate min-w-0">
                  <Scale className="w-3 h-3 mr-0.5 flex-shrink-0" /><span className="truncate">Autos</span>
                </Button>
                <Button onClick={(e) => { e.stopPropagation(); onGestionEvidencias?.(proceso); }} size="sm" variant="outline" className="text-[11px] px-2 justify-start truncate min-w-0">
                  <Archive className="w-3 h-3 mr-0.5 flex-shrink-0" /><span className="truncate">Evidencias</span>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-1">
                <Button onClick={(e) => { e.stopPropagation(); onGestionOficios?.(proceso); }} size="sm" variant="outline" className="text-[11px] px-2 justify-start truncate min-w-0">
                  <Mail className="w-3 h-3 mr-0.5 flex-shrink-0" /><span className="truncate">Oficios</span>
                </Button>
                <Button onClick={(e) => { e.stopPropagation(); onGestionActas?.(proceso); }} size="sm" variant="outline" className="text-[11px] px-2 justify-start truncate min-w-0">
                  <FileCheck className="w-3 h-3 mr-0.5 flex-shrink-0" /><span className="truncate">Actas</span>
                </Button>
              </div>

              <Button onClick={(e) => { e.stopPropagation(); onComentarios?.(proceso); }} size="sm" className="w-full text-[11px] py-2 font-bold" style={{ background: '#003DA5', color: '#FFFFFF' }}>
                <MessageSquare className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                <span className="truncate">💬 Comentarios del Proceso</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}