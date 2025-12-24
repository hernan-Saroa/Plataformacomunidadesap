/**
 * ModuloProcesosCoactivosV3 - MOD-07: Procesos Coactivos
 * DISEÑO 100% IDÉNTICO A DEFENSA JUDICIAL (World Class)
 * Replicación exacta de estructura, espaciados y estilos
 */

import { useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { motion, AnimatePresence } from 'motion/react';
import {
  DollarSign, AlertTriangle, TrendingUp, Clock, Scale, FileWarning,
  CheckCircle, Wallet, Eye, Edit, Plus, Download, Filter, Search,
  Calendar, Columns3, List, AlertCircle, FolderOpen, User, Building
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import type { ProcesoCoactivo } from '../core/types';
import { procesosCoactivos } from '../data/datosProcesosCoactivos';
import { toast } from 'sonner@2.0.3';

type VistaModulo = 'kanban' | 'lista';

export function ModuloProcesosCoactivosV3() {
  const [tipoVista, setTipoVista] = useState<VistaModulo>('kanban');
  const [filtroTerritorial, setFiltroTerritorial] = useState<string>('');
  const [vistaCompacta] = useState(false);

  // Agrupar procesos por etapa
  const procesosPorEtapa = {
    IDENTIFICADO: procesosCoactivos.filter(p => p.etapa === 'IDENTIFICADO'),
    PERSUASIVO: procesosCoactivos.filter(p => p.etapa === 'PERSUASIVO'),
    PREJURIDICO: procesosCoactivos.filter(p => p.etapa === 'PREJURIDICO'),
    MANDAMIENTO: procesosCoactivos.filter(p => p.etapa === 'MANDAMIENTO'),
  };

  const handleVerProceso = (proc: ProcesoCoactivo) => {
    console.log('Ver proceso:', proc.id);
    toast.success('Proceso Coactivo', { description: `Abriendo ${proc.id}` });
  };

  const handleGestionarDocumentos = (proc: ProcesoCoactivo) => {
    toast.info('Documentos del Proceso', { description: proc.id });
  };

  const handleGestionarPagos = (proc: ProcesoCoactivo) => {
    toast.info('Gestión de Pagos', { description: proc.id });
  };

  const handleGestionarActuaciones = (proc: ProcesoCoactivo) => {
    toast.info('Actuaciones', { description: proc.id });
  };

  // Definir etapas IGUAL que Defensa Judicial
  const etapas = [
    { nombre: 'Identificado', color: '#6B7280', icono: <FileWarning className="w-4 h-4 text-gray-600" />, diasEstimados: 5 },
    { nombre: 'Persuasivo', color: '#6B7280', icono: <AlertTriangle className="w-4 h-4 text-gray-600" />, diasEstimados: 15 },
    { nombre: 'Prejurídico', color: '#6B7280', icono: <Clock className="w-4 h-4 text-gray-600" />, diasEstimados: 20 },
    { nombre: 'Mandamiento', color: '#003DA5', icono: <Scale className="w-4 h-4" style={{ color: '#003DA5' }} />, diasEstimados: 30 },
  ];

  // Calcular estadísticas
  const totalActivos = procesosCoactivos.filter(p => p.estado === 'ACTIVO').length;
  const montoTotal = procesosCoactivos.reduce((sum, p) => sum + p.montoTotal, 0);
  const conPrescripcionProxima = procesosCoactivos.filter(p => p.diasPrescripcion < 180).length;

  const formatMonto = (monto: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(monto);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        {/* Header Responsive - IGUAL A DEFENSA JUDICIAL */}
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
              Gestión visual de cobro coactivo a favor de ESAP
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle de Vista - ESTILO DEFENSA JUDICIAL */}
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
              Nuevo Proceso Coactivo
            </button>
          </div>
        </div>

        {/* Métricas Compactas - ESTILO DEFENSA JUDICIAL (3 COLUMNAS) */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 p-3">
              <div className="p-2.5 rounded-lg bg-orange-50 flex-shrink-0">
                <Scale className="w-5 h-5 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="font-black text-gray-900 leading-none" style={{ fontSize: '1.75rem' }}>
                  {totalActivos}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Procesos Activos
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
                  {conPrescripcionProxima}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Prescripción Próxima
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 p-3">
              <div className="p-2.5 rounded-lg bg-green-50 flex-shrink-0">
                <Wallet className="w-5 h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="font-black text-gray-900 leading-none" style={{ fontSize: '1.75rem' }}>
                  {formatMonto(montoTotal)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Total Cartera
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tablero Kanban - ESTRUCTURA EXACTA DEFENSA JUDICIAL */}
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
                const etapasKeys = ['IDENTIFICADO', 'PERSUASIVO', 'PREJURIDICO', 'MANDAMIENTO'] as const;
                const procesosKey = etapasKeys[index];
                const procesos = procesosPorEtapa[procesosKey];
                
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
                    onGestionDocumentos={handleGestionarDocumentos}
                    onGestionPagos={handleGestionarPagos}
                    onGestionActuaciones={handleGestionarActuaciones}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Vista Lista */}
        {tipoVista === 'lista' && (
          <VistaLista procesos={procesosCoactivos} onVerProceso={handleVerProceso} />
        )}
      </div>
    </DndProvider>
  );
}

// ==================== COMPONENTE COLUMNA KANBAN ====================
interface ColumnaKanbanProps {
  etapa: string;
  items: ProcesoCoactivo[];
  color: string;
  icono: React.ReactNode;
  diasEstimados?: number;
  vistaCompacta: boolean;
  onVerProceso: (proc: ProcesoCoactivo) => void;
  onGestionDocumentos?: (proc: ProcesoCoactivo) => void;
  onGestionPagos?: (proc: ProcesoCoactivo) => void;
  onGestionActuaciones?: (proc: ProcesoCoactivo) => void;
}

function ColumnaKanban({ 
  etapa, 
  items, 
  color, 
  icono, 
  diasEstimados,
  vistaCompacta,
  onVerProceso,
  onGestionDocumentos,
  onGestionPagos,
  onGestionActuaciones
}: ColumnaKanbanProps) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'PROCESO_COACTIVO',
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
        {/* Header de Columna - ESTILO EXACTO DEFENSA JUDICIAL */}
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
          {items.map((proceso) => (
            <TarjetaProceso
              key={proceso.id}
              proceso={proceso}
              onVerProceso={onVerProceso}
              onGestionDocumentos={onGestionDocumentos}
              onGestionPagos={onGestionPagos}
              onGestionActuaciones={onGestionActuaciones}
              vistaCompacta={vistaCompacta}
            />
          ))}

          {/* Empty State */}
          {items.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-xs font-semibold">
                Sin procesos
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
  proceso: ProcesoCoactivo;
  onVerProceso: (proc: ProcesoCoactivo) => void;
  onGestionDocumentos?: (proc: ProcesoCoactivo) => void;
  onGestionPagos?: (proc: ProcesoCoactivo) => void;
  onGestionActuaciones?: (proc: ProcesoCoactivo) => void;
  vistaCompacta: boolean;
}

function TarjetaProceso({ 
  proceso, 
  onVerProceso,
  onGestionDocumentos,
  onGestionPagos,
  onGestionActuaciones,
  vistaCompacta
}: TarjetaProcesoProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'PROCESO_COACTIVO',
    item: { ...proceso },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const formatMonto = (monto: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(monto);
  };

  // Determinar semáforo de prescripción
  const semaforoIndicator = {
    verde: { color: '#10B981', label: 'Normal' },
    amarillo: { color: '#F59E0B', label: 'Atención' },
    rojo: { color: '#DC2626', label: 'Crítico' }
  };

  let semaforoKey: 'verde' | 'amarillo' | 'rojo' = 'verde';
  if (proceso.diasPrescripcion < 90) {
    semaforoKey = 'rojo';
  } else if (proceso.diasPrescripcion < 180) {
    semaforoKey = 'amarillo';
  }

  const semaforo = semaforoIndicator[semaforoKey];
  const porcentajePrescripcion = Math.min(100, Math.round((proceso.diasPrescripcion / 1825) * 100)); // 5 años = 1825 días

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

        <div className="p-2.5 flex-1 flex flex-col overflow-y-auto min-h-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-1.5">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div 
                className="p-1.5 rounded-lg flex-shrink-0"
                style={{ background: '#E0EDFF' }}
              >
                <DollarSign className="w-4 h-4" style={{ color: '#003DA5' }} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm truncate" style={{ color: '#003DA5' }}>
                  {proceso.id}
                </h4>
                <p className="text-xs text-gray-600 truncate">
                  {proceso.concepto === 'MATRICULA' ? '🎓 Matrícula' :
                   proceso.concepto === 'SANCION' ? '⚠️ Sanción' :
                   proceso.concepto === 'MULTA' ? '📋 Multa' :
                   proceso.concepto === 'RECUPERACION_RECURSOS' ? '💰 Recuperación' : '📄 Otro'}
                </p>
              </div>
            </div>
          </div>

          {/* Deudor */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">👤 Deudor:</p>
            <p className="font-bold text-sm text-gray-900 line-clamp-1">
              {proceso.deudor}
            </p>
            <p className="text-xs text-gray-600">
              CC {proceso.identificacion}
            </p>
          </div>

          {/* Monto Total */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">💰 Monto Total:</p>
            <p className="font-bold text-lg text-green-700">
              {formatMonto(proceso.montoTotal)}
            </p>
          </div>

          {/* Profesional Asignado con Avatar */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6 flex-shrink-0">
                <AvatarFallback 
                  className="text-xs"
                  style={{ background: '#E0EDFF', color: '#003DA5' }}
                >
                  {proceso.responsable?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'NA'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">👨‍💼 Abogado:</p>
                <p className="font-bold text-sm text-gray-900 line-clamp-1">
                  {proceso.responsable || 'No asignado'}
                </p>
                <p className="text-xs text-gray-600">
                  Responsable del proceso
                </p>
              </div>
            </div>
          </div>

          {/* Semáforo de Prescripción */}
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <Badge 
              className="text-xs flex items-center gap-1 font-semibold bg-gray-50 border border-gray-200"
              style={{ color: semaforo.color }}
            >
              <div 
                className="w-2 h-2 rounded-full"
                style={{ background: semaforo.color }}
              />
              {proceso.diasPrescripcion < 365 
                ? `${proceso.diasPrescripcion} días`
                : `${Math.floor(proceso.diasPrescripcion / 365)} años`
              }
            </Badge>
          </div>

          {/* Acuerdo de Pago */}
          {proceso.acuerdoPago && (
            <div className="mb-1.5 pb-1.5 border-b border-gray-200">
              <p className="text-xs text-gray-500 mb-0.5">📋 Acuerdo de Pago:</p>
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <CheckCircle className="w-3 w-3" />
                <span>Cuotas: {proceso.acuerdoPago.cuotasPagadas}/{proceso.acuerdoPago.cuotas}</span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Monto cuota: {formatMonto(proceso.acuerdoPago.montoCuota)}
              </p>
            </div>
          )}

          {/* Métricas */}
          <div className="grid grid-cols-3 gap-1.5 mb-1.5">
            <div className="text-center p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs font-bold text-gray-700">{proceso.documentos?.length || 0}</p>
              <p className="text-xs text-gray-500">Docs</p>
            </div>
            <div className="text-center p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs font-bold text-gray-700">{proceso.timeline?.length || 0}</p>
              <p className="text-xs text-gray-500">Eventos</p>
            </div>
            <div className="text-center p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs font-bold text-gray-700">{proceso.acuerdoPago?.cuotasPagadas || 0}</p>
              <p className="text-xs text-gray-500">Cuotas</p>
            </div>
          </div>

          {/* Barra de progreso prescripción */}
          <div className="mb-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500">Tiempo de prescripción</span>
              <span className="text-[10px] font-bold text-gray-700">{porcentajePrescripcion}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${porcentajePrescripcion}%`,
                  background: semaforo.color
                }}
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="grid grid-cols-2 gap-1.5 mt-auto pt-2 border-t border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 justify-start gap-1.5 hover:bg-gray-50"
              onClick={() => onVerProceso(proceso)}
            >
              <Eye className="w-3.5 h-3.5" />
              Ver Detalle
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 justify-start gap-1.5 hover:bg-gray-50"
              onClick={() => onGestionDocumentos?.(proceso)}
            >
              <Edit className="w-3.5 h-3.5" />
              Documentos
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ==================== VISTA LISTA ====================
interface VistaListaProps {
  procesos: ProcesoCoactivo[];
  onVerProceso: (proc: ProcesoCoactivo) => void;
}

function VistaLista({ procesos, onVerProceso }: VistaListaProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const formatMonto = (monto: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(monto);
  };

  const getSemaforoColor = (dias: number) => {
    if (dias < 90) return '#DC2626';
    if (dias < 180) return '#F59E0B';
    return '#10B981';
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'NA';
  };

  const filteredProcesos = procesos.filter(p => 
    p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.deudor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por ID o deudor..."
            className="flex-1 bg-transparent border-none outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar
        </Button>
      </div>

      {/* Tabla */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Deudor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Etapa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Monto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Prescripción</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Abogado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProcesos.map((proceso) => (
                <tr 
                  key={proceso.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-bold" style={{ color: '#003DA5' }}>
                    {proceso.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {proceso.deudor}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">
                      {proceso.etapa}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-700">
                    {formatMonto(proceso.montoTotal)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge 
                      className="text-xs flex items-center gap-1 w-fit"
                      style={{ color: getSemaforoColor(proceso.diasPrescripcion) }}
                    >
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ background: getSemaforoColor(proceso.diasPrescripcion) }}
                      />
                      {proceso.diasPrescripcion < 365 
                        ? `${proceso.diasPrescripcion} días`
                        : `${Math.floor(proceso.diasPrescripcion / 365)} años`
                      }
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback 
                          className="text-xs"
                          style={{ background: '#E0EDFF', color: '#003DA5' }}
                        >
                          {getInitials(proceso.responsable || '')}
                        </AvatarFallback>
                      </Avatar>
                      {proceso.responsable || 'No asignado'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onVerProceso(proceso)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}