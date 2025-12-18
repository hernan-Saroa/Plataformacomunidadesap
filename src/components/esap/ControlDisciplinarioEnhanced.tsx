/**
 * MÓDULO DE CONTROL INTERNO DISCIPLINARIO - ENHANCED
 * Con mejoras de usabilidad: Búsqueda Global, Timeline Visual y Quick Actions
 * + DRAG & DROP para reasignación de procesos
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Users, Clock, AlertCircle, CheckCircle, XCircle,
  FolderOpen, Edit, Send, Eye, Download, Upload, Filter, Search,
  Calendar, Award, Shield, TrendingUp, BarChart3, Bell, Settings,
  User, UserCheck, FileCheck, RefreshCw, Archive, Lock, Unlock,
  ChevronRight, MoreVertical, Plus, X, Check, AlertTriangle,
  Zap, Target, Activity, Inbox, GitBranch, ExternalLink, History,
  FileEdit, Mail, Trash2, ChevronDown, Command, Grip, List, LayoutGrid
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { toast } from 'sonner@2.0.3';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// TIPOS Y MODELOS
type ProcesoEstado = 
  | 'noticia_radicada'
  | 'valoracion'
  | 'inhibitorio'
  | 'indagacion_previa'
  | 'indagacion_ddhh'
  | 'investigacion'
  | 'investigacion_ddhh'
  | 'cierre_investigacion'
  | 'pliego_cargos'
  | 'archivo'
  | 'prescripcion';

type SemaforoEstado = 'verde' | 'amarillo' | 'rojo';

interface Proceso {
  id: string;
  consecutivo: string;
  noticia: string;
  estado: ProcesoEstado;
  profesionalAsignado: string;
  fechaAsignacion: string;
  fechaVencimiento: string;
  fechaPrescripcion: string;
  semaforo: SemaforoEstado;
  diasRestantes: number;
  porcentajeTiempo: number;
  disciplinables: { nombre: string; cedula: string }[];
  ultimaActuacion: string;
  tieneAutosPendientes: boolean;
}

// MOCK DATA
const MOCK_PROCESOS: Proceso[] = [
  {
    id: '1',
    consecutivo: 'PD-2025-0025',
    noticia: 'ND-2025-0152',
    estado: 'valoracion',
    profesionalAsignado: 'Juan Pérez',
    fechaAsignacion: '2025-01-10',
    fechaVencimiento: '2025-01-28',
    fechaPrescripcion: '2030-01-10',
    semaforo: 'amarillo',
    diasRestantes: 3,
    porcentajeTiempo: 70,
    disciplinables: [{ nombre: 'Ana López', cedula: '5551234567' }],
    ultimaActuacion: 'Asignado para valoración',
    tieneAutosPendientes: true
  },
  {
    id: '2',
    consecutivo: 'PD-2025-0018',
    noticia: 'ND-2025-0102',
    estado: 'indagacion_previa',
    profesionalAsignado: 'María Torres',
    fechaAsignacion: '2024-08-15',
    fechaVencimiento: '2025-02-15',
    fechaPrescripcion: '2029-08-15',
    semaforo: 'verde',
    diasRestantes: 45,
    porcentajeTiempo: 35,
    disciplinables: [{ nombre: 'Roberto Sánchez', cedula: '7778889990' }],
    ultimaActuacion: 'Auto de indagación previa notificado',
    tieneAutosPendientes: false
  },
  {
    id: '3',
    consecutivo: 'PD-2024-0156',
    noticia: 'ND-2024-0891',
    estado: 'investigacion',
    profesionalAsignado: 'Carlos Mendoza',
    fechaAsignacion: '2024-09-20',
    fechaVencimiento: '2025-01-20',
    fechaPrescripcion: '2029-09-20',
    semaforo: 'rojo',
    diasRestantes: -12,
    porcentajeTiempo: 110,
    disciplinables: [{ nombre: 'Patricia Herrera', cedula: '3334445556' }],
    ultimaActuacion: 'Investigación disciplinaria',
    tieneAutosPendientes: true
  }
];

// ==================== BÚSQUEDA GLOBAL ====================
function SearchGlobal() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const resultados = MOCK_PROCESOS.filter(p => 
    p.consecutivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.disciplinables[0]?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.disciplinables[0]?.cedula.includes(searchTerm)
  );

  return (
    <div className="relative">
      {/* Barra de Búsqueda */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
        <input
          type="text"
          placeholder="Buscar por proceso, nombre, cédula... (Ctrl+K)"
          className="w-full pl-12 pr-12 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-all"
          style={{ borderColor: '#E5E7EB', fontSize: '15px' }}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowResults(e.target.value.length > 0);
          }}
          onFocus={() => setShowResults(searchTerm.length > 0)}
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Filter className="w-4 h-4" style={{ color: '#6B7280' }} />
        </button>
        <div className="absolute right-14 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded" style={{ background: '#F3F4F6', color: '#6B7280' }}>
          <Command className="w-3 h-3 inline mr-1" />K
        </div>
      </div>

      {/* Panel de Filtros Avanzados */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-4 rounded-xl border overflow-hidden"
            style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>
                  Estado
                </label>
                <select className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#D1D5DB' }}>
                  <option>Todos los estados</option>
                  <option>Valoración</option>
                  <option>Indagación Previa</option>
                  <option>Investigación</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>
                  Semáforo
                </label>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-2 rounded-lg border text-sm hover:bg-green-50" style={{ borderColor: '#D1D5DB' }}>
                    🟢 Verde
                  </button>
                  <button className="px-3 py-2 rounded-lg border text-sm hover:bg-yellow-50" style={{ borderColor: '#D1D5DB' }}>
                    🟡 Amarillo
                  </button>
                  <button className="px-3 py-2 rounded-lg border text-sm hover:bg-red-50" style={{ borderColor: '#D1D5DB' }}>
                    🔴 Rojo
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: '#F3F4F6', color: '#4B5563' }}>
                Limpiar
              </button>
              <button className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: '#003DA5', color: '#FFFFFF' }}>
                Aplicar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resultados de Búsqueda */}
      <AnimatePresence>
        {showResults && resultados.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 p-3 rounded-xl border shadow-2xl z-50 max-h-96 overflow-y-auto"
            style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          >
            <div className="flex items-center justify-between mb-3 pb-3 border-b" style={{ borderColor: '#E5E7EB' }}>
              <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                {resultados.length} resultado{resultados.length !== 1 ? 's' : ''} encontrado{resultados.length !== 1 ? 's' : ''}
              </p>
              <button onClick={() => setShowResults(false)} className="text-xs font-semibold hover:underline" style={{ color: '#003DA5' }}>
                Cerrar
              </button>
            </div>
            <div className="space-y-2">
              {resultados.map((proceso) => (
                <motion.button
                  key={proceso.id}
                  whileHover={{ scale: 1.01 }}
                  className="w-full p-3 rounded-lg hover:bg-blue-50 transition-colors text-left"
                  onClick={() => {
                    toast.info(`Abriendo ${proceso.consecutivo}`);
                    setShowResults(false);
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: proceso.semaforo === 'verde' ? '#10B981' : proceso.semaforo === 'amarillo' ? '#FFC107' : '#DC3545' }}
                      />
                      <span className="font-bold text-sm" style={{ color: '#003DA5' }}>
                        {proceso.consecutivo}
                      </span>
                      <Badge className="text-xs">
                        {proceso.estado}
                      </Badge>
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                  </div>
                  <p className="text-sm" style={{ color: '#4B5563' }}>
                    {proceso.disciplinables[0]?.nombre} • {proceso.disciplinables[0]?.cedula}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                    {proceso.ultimaActuacion}
                  </p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== TIMELINE VISUAL ====================
function TimelineVisual({ proceso }: { proceso: Proceso }) {
  const etapas = [
    { id: 'noticia_radicada', label: 'Noticia', completo: true },
    { id: 'valoracion', label: 'Valoración', completo: true },
    { id: 'indagacion_previa', label: 'Indagación', completo: proceso.estado === 'indagacion_previa' || proceso.estado === 'investigacion' },
    { id: 'investigacion', label: 'Investigación', completo: proceso.estado === 'investigacion' },
    { id: 'cierre_investigacion', label: 'Cierre', completo: false },
    { id: 'pliego_cargos', label: 'Pliego', completo: false }
  ];

  const etapaActualIndex = etapas.findIndex(e => e.id === proceso.estado);

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>
          Progreso del Proceso
        </p>
        <p className="text-xs font-bold" style={{ color: '#003DA5' }}>
          {proceso.diasRestantes > 0 ? `${proceso.diasRestantes} días restantes` : 'Vencido'}
        </p>
      </div>

      {/* Stepper Horizontal */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {etapas.map((etapa, idx) => {
            const isActual = etapaActualIndex === idx;
            const isCompleto = idx < etapaActualIndex;
            const isPendiente = idx > etapaActualIndex;

            return (
              <div key={etapa.id} className="flex-1 flex flex-col items-center relative">
                {/* Línea conectora */}
                {idx < etapas.length - 1 && (
                  <div
                    className="absolute top-5 left-1/2 w-full h-0.5"
                    style={{
                      background: isCompleto ? '#003DA5' : '#E5E7EB',
                      zIndex: 0
                    }}
                  />
                )}

                {/* Círculo */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative z-10 mb-2"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm relative"
                    style={{
                      background: isActual ? '#003DA5' : isCompleto ? '#10B981' : '#E5E7EB',
                      color: isActual || isCompleto ? '#FFFFFF' : '#9CA3AF',
                      boxShadow: isActual ? '0 4px 12px rgba(0, 61, 165, 0.3)' : 'none'
                    }}
                  >
                    {isCompleto ? <Check className="w-5 h-5" /> : isActual ? <Clock className="w-5 h-5" /> : idx + 1}
                    
                    {/* Pulse animation para etapa actual */}
                    {isActual && (
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ background: '#003DA5', opacity: 0.3 }}
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.5, 0, 0.5]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut'
                        }}
                      />
                    )}
                  </div>
                </motion.div>

                {/* Label */}
                <p
                  className="text-xs font-medium text-center"
                  style={{
                    color: isActual ? '#003DA5' : isCompleto ? '#10B981' : '#9CA3AF'
                  }}
                >
                  {etapa.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Barra de progreso de tiempo */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs" style={{ color: '#6B7280' }}>
            Tiempo transcurrido
          </span>
          <span className="text-xs font-bold" style={{ color: proceso.semaforo === 'rojo' ? '#DC3545' : proceso.semaforo === 'amarillo' ? '#F59E0B' : '#10B981' }}>
            {proceso.porcentajeTiempo}%
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(proceso.porcentajeTiempo, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full relative"
            style={{
              background: proceso.semaforo === 'rojo' 
                ? 'linear-gradient(90deg, #DC3545 0%, #EF4444 100%)'
                : proceso.semaforo === 'amarillo'
                ? 'linear-gradient(90deg, #F59E0B 0%, #FFC107 100%)'
                : 'linear-gradient(90deg, #10B981 0%, #34D399 100%)'
            }}
          >
            {/* Efecto de brillo */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
                animation: 'shine 2s infinite'
              }}
            />
          </motion.div>
        </div>
      </div>

      <style>{`
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

// ==================== QUICK ACTIONS MENU ====================
function QuickActionsMenu({ proceso }: { proceso: Proceso }) {
  const [showMenu, setShowMenu] = useState(false);

  const actions = [
    { icon: Eye, label: 'Ver Detalle', color: '#003DA5', action: () => toast.info('Ver detalle del proceso') },
    { icon: FolderOpen, label: 'Abrir Expediente', color: '#10B981', action: () => toast.info('Abriendo expediente') },
    { icon: FileEdit, label: 'Editar Auto', color: '#F59E0B', action: () => toast.info('Editor de autos') },
    { icon: History, label: 'Ver Timeline', color: '#8B5CF6', action: () => toast.info('Historial completo') },
    { icon: Mail, label: 'Enviar Notificación', color: '#3B82F6', action: () => toast.info('Enviar notificación') },
    { icon: Download, label: 'Exportar PDF', color: '#6B7280', action: () => toast.success('Descargando PDF...') }
  ];

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <MoreVertical className="w-4 h-4" style={{ color: '#6B7280' }} />
      </motion.button>

      <AnimatePresence>
        {showMenu && (
          <>
            {/* Overlay invisible */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-full mt-2 w-56 rounded-xl border shadow-2xl z-50 overflow-hidden"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
            >
              <div className="p-2">
                {actions.map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <motion.button
                      key={idx}
                      whileHover={{ x: 4, backgroundColor: '#F9FAFB' }}
                      onClick={() => {
                        action.action();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                    >
                      <div
                        className="p-1.5 rounded-lg"
                        style={{ background: `${action.color}15` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: action.color }} />
                      </div>
                      <span className="text-sm font-medium" style={{ color: '#1F2937' }}>
                        {action.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <div className="px-4 py-2 border-t" style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}>
                <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
                  Proceso: {proceso.consecutivo}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== DRAG & DROP ====================
function DraggableProceso({ proceso }: { proceso: Proceso }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'proceso',
    item: proceso,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className="p-5 rounded-xl border hover:shadow-lg transition-all"
      style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
    >
      {/* Header con Quick Actions */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: proceso.semaforo === 'verde' ? '#10B981' : proceso.semaforo === 'amarillo' ? '#FFC107' : '#DC3545' }}
          />
          <div>
            <p className="font-bold text-lg" style={{ color: '#003DA5' }}>
              {proceso.consecutivo}
            </p>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {proceso.disciplinables[0]?.nombre} • {proceso.disciplinables[0]?.cedula}
            </p>
          </div>
        </div>
        <QuickActionsMenu proceso={proceso} />
      </div>

      {/* Timeline Visual */}
      <TimelineVisual proceso={proceso} />

      {/* Info Adicional */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
            Profesional
          </p>
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5', fontSize: '10px' }}>
                {proceso.profesionalAsignado.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium" style={{ color: '#1F2937' }}>
              {proceso.profesionalAsignado}
            </span>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
            Vencimiento
          </p>
          <p className="text-sm font-medium" style={{ color: '#1F2937' }}>
            {proceso.fechaVencimiento}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
            Última Actuación
          </p>
          <p className="text-sm font-medium" style={{ color: '#1F2937' }}>
            {proceso.ultimaActuacion}
          </p>
        </div>
      </div>
    </div>
  );
}

function DroppableArea({ onDrop }: { onDrop: (proceso: Proceso) => void }) {
  const [{ isOver }, drop] = useDrop({
    accept: 'proceso',
    drop: (item: Proceso) => onDrop(item),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  return (
    <div
      ref={drop}
      className="p-4 rounded-xl border-2 border-dashed transition-colors"
      style={{
        background: isOver ? '#F9FAFB' : '#FFFFFF',
        borderColor: isOver ? '#003DA5' : '#E5E7EB',
      }}
    >
      <div className="flex items-center justify-center gap-2">
        <Grip className="w-5 h-5" style={{ color: '#6B7280' }} />
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Arrastra y suelta un proceso aquí
        </p>
      </div>
    </div>
  );
}

// ==================== DEMO COMPONENT ====================
export function ControlDisciplinarioEnhanced() {
  return (
    <div className="w-full min-h-screen p-8" style={{ background: '#F9FAFB' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: '#003DA5' }}>
          Control Interno Disciplinario
        </h1>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Módulo mejorado con búsqueda global, timeline visual y acciones rápidas
        </p>
      </div>

      {/* Búsqueda Global */}
      <div className="mb-8">
        <SearchGlobal />
      </div>

      {/* Tabla con Mejoras */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4" style={{ color: '#1F2937' }}>
          Procesos Activos
        </h2>

        <div className="space-y-4">
          {MOCK_PROCESOS.map((proceso) => (
            <motion.div
              key={proceso.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-xl border hover:shadow-lg transition-all"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
            >
              {/* Header con Quick Actions */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: proceso.semaforo === 'verde' ? '#10B981' : proceso.semaforo === 'amarillo' ? '#FFC107' : '#DC3545' }}
                  />
                  <div>
                    <p className="font-bold text-lg" style={{ color: '#003DA5' }}>
                      {proceso.consecutivo}
                    </p>
                    <p className="text-sm" style={{ color: '#6B7280' }}>
                      {proceso.disciplinables[0]?.nombre} • {proceso.disciplinables[0]?.cedula}
                    </p>
                  </div>
                </div>
                <QuickActionsMenu proceso={proceso} />
              </div>

              {/* Timeline Visual */}
              <TimelineVisual proceso={proceso} />

              {/* Info Adicional */}
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                    Profesional
                  </p>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5', fontSize: '10px' }}>
                        {proceso.profesionalAsignado.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium" style={{ color: '#1F2937' }}>
                      {proceso.profesionalAsignado}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                    Vencimiento
                  </p>
                  <p className="text-sm font-medium" style={{ color: '#1F2937' }}>
                    {proceso.fechaVencimiento}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                    Última Actuación
                  </p>
                  <p className="text-sm font-medium" style={{ color: '#1F2937' }}>
                    {proceso.ultimaActuacion}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Atajos de Teclado */}
      <Card className="p-6 mt-8">
        <h3 className="text-lg font-bold mb-4" style={{ color: '#1F2937' }}>
          ⌨️ Atajos de Teclado
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <kbd className="px-3 py-2 rounded-lg font-mono text-sm" style={{ background: '#F3F4F6', color: '#4B5563' }}>
              Ctrl + K
            </kbd>
            <span className="text-sm" style={{ color: '#6B7280' }}>
              Búsqueda global
            </span>
          </div>
          <div className="flex items-center gap-3">
            <kbd className="px-3 py-2 rounded-lg font-mono text-sm" style={{ background: '#F3F4F6', color: '#4B5563' }}>
              Ctrl + N
            </kbd>
            <span className="text-sm" style={{ color: '#6B7280' }}>
              Nueva noticia
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}