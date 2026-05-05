/**
 * VISTA KANBAN CON DRAG & DROP - Control Disciplinario
 * Permite reasignar procesos entre profesionales arrastrando tarjetas
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Grip, CheckCircle, Clock, AlertTriangle, User,
  Plus, Settings, Filter, TrendingUp, ArrowRightLeft, FileText
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { toast } from 'sonner@2.0.3';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// TIPOS
interface Proceso {
  id: string;
  consecutivo: string;
  disciplinable: string;
  estado: string;
  semaforo: 'verde' | 'amarillo' | 'rojo';
  diasRestantes: number;
  profesionalAsignado: string;
}

interface Profesional {
  id: string;
  nombre: string;
  cargo: string;
  avatar?: string;
  cargaTrabajo: number;
  maxCarga: number;
}

// MOCK DATA
const PROFESIONALES: Profesional[] = [
  {
    id: '1',
    nombre: 'Juan Pérez',
    cargo: 'Abogado Senior',
    cargaTrabajo: 8,
    maxCarga: 12
  },
  {
    id: '2',
    nombre: 'María Torres',
    cargo: 'Abogada',
    cargaTrabajo: 5,
    maxCarga: 12
  },
  {
    id: '3',
    nombre: 'Carlos Mendoza',
    cargo: 'Abogado Junior',
    cargaTrabajo: 3,
    maxCarga: 10
  },
  {
    id: '4',
    nombre: 'Sin Asignar',
    cargo: 'Pool de procesos',
    cargaTrabajo: 0,
    maxCarga: 999
  }
];

const PROCESOS_INICIALES: Proceso[] = [
  {
    id: '1',
    consecutivo: 'PD-2025-0025',
    disciplinable: 'Ana López',
    estado: 'Valoración',
    semaforo: 'amarillo',
    diasRestantes: 3,
    profesionalAsignado: '1'
  },
  {
    id: '2',
    consecutivo: 'PD-2025-0018',
    disciplinable: 'Roberto Sánchez',
    estado: 'Indagación',
    semaforo: 'verde',
    diasRestantes: 45,
    profesionalAsignado: '2'
  },
  {
    id: '3',
    consecutivo: 'PD-2024-0156',
    disciplinable: 'Patricia Herrera',
    estado: 'Investigación',
    semaforo: 'rojo',
    diasRestantes: -12,
    profesionalAsignado: '3'
  },
  {
    id: '4',
    consecutivo: 'PD-2025-0042',
    disciplinable: 'Jorge Ramírez',
    estado: 'Valoración',
    semaforo: 'verde',
    diasRestantes: 15,
    profesionalAsignado: '1'
  },
  {
    id: '5',
    consecutivo: 'PD-2025-0033',
    disciplinable: 'Laura Martínez',
    estado: 'Indagación',
    semaforo: 'amarillo',
    diasRestantes: 8,
    profesionalAsignado: '2'
  },
  {
    id: '6',
    consecutivo: 'PD-2025-0058',
    disciplinable: 'Miguel Ángel Castro',
    estado: 'Noticia',
    semaforo: 'verde',
    diasRestantes: 30,
    profesionalAsignado: '4'
  }
];

// ==================== TARJETA ARRASTRABLE ====================
function DraggableProcesoCard({ proceso }: { proceso: Proceso }) {
  const [{ isDragging }, drag, preview] = useDrag({
    type: 'PROCESO',
    item: proceso,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  return (
    <div ref={preview}>
      <motion.div
        ref={drag}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: isDragging ? 0.5 : 1, 
          scale: isDragging ? 0.95 : 1 
        }}
        whileHover={{ scale: 1.02 }}
        className="p-4 rounded-xl border-2 cursor-move transition-all"
        style={{
          background: '#FFFFFF',
          borderColor: isDragging ? '#003DA5' : '#E5E7EB',
          boxShadow: isDragging ? '0 8px 24px rgba(0, 61, 165, 0.2)' : '0 2px 4px rgba(0,0,0,0.05)'
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Grip className="w-4 h-4" style={{ color: '#9CA3AF' }} />
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: proceso.semaforo === 'verde' ? '#10B981' : proceso.semaforo === 'amarillo' ? '#FFC107' : '#DC3545'
              }}
            />
          </div>
          <Badge 
            className="text-xs"
            style={{
              background: proceso.semaforo === 'rojo' ? '#FEE2E2' : proceso.semaforo === 'amarillo' ? '#FEF3C7' : '#D1FAE5',
              color: proceso.semaforo === 'rojo' ? '#DC2626' : proceso.semaforo === 'amarillo' ? '#D97706' : '#059669'
            }}
          >
            {proceso.diasRestantes > 0 ? `${proceso.diasRestantes}d` : 'Vencido'}
          </Badge>
        </div>

        {/* Contenido */}
        <div>
          <p className="font-bold mb-1" style={{ color: '#003DA5', fontSize: '14px' }}>
            {proceso.consecutivo}
          </p>
          <p className="text-xs mb-2" style={{ color: '#6B7280' }}>
            {proceso.disciplinable}
          </p>
          <div className="flex items-center justify-between">
            <Badge className="text-xs" style={{ background: '#F3F4F6', color: '#4B5563' }}>
              {proceso.estado}
            </Badge>
            {proceso.semaforo === 'rojo' && (
              <AlertTriangle className="w-4 h-4" style={{ color: '#DC2626' }} />
            )}
          </div>
        </div>

        {/* Hover indicator */}
        {!isDragging && (
          <div 
            className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
            style={{ 
              background: 'linear-gradient(135deg, rgba(0, 61, 165, 0.05) 0%, rgba(0, 61, 165, 0.1) 100%)',
              border: '2px solid rgba(0, 61, 165, 0.2)'
            }}
          />
        )}
      </motion.div>
    </div>
  );
}

// ==================== COLUMNA DE PROFESIONAL ====================
function ProfesionalColumn({ 
  profesional, 
  procesos, 
  onDrop 
}: { 
  profesional: Profesional;
  procesos: Proceso[];
  onDrop: (proceso: Proceso, profesionalId: string) => void;
}) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'PROCESO',
    drop: (item: Proceso) => {
      if (item.profesionalAsignado !== profesional.id) {
        onDrop(item, profesional.id);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  });

  const cargaPorcentaje = (profesional.cargaTrabajo / profesional.maxCarga) * 100;
  const isOverloaded = cargaPorcentaje > 90;
  const isNearLimit = cargaPorcentaje > 70 && cargaPorcentaje <= 90;

  return (
    <div
      ref={drop}
      className="flex-1 min-w-[280px] max-w-[350px]"
    >
      <motion.div
        animate={{
          scale: isOver ? 1.02 : 1,
        }}
        className="h-full rounded-2xl border-2 transition-all"
        style={{
          background: isOver ? '#F0F7FF' : '#FFFFFF',
          borderColor: isOver ? '#003DA5' : '#E5E7EB',
          boxShadow: isOver ? '0 8px 24px rgba(0, 61, 165, 0.15)' : '0 2px 8px rgba(0,0,0,0.05)'
        }}
      >
        {/* Header del Profesional */}
        <div className="p-5 border-b" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5' }}>
                {profesional.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-bold text-sm" style={{ color: '#1F2937' }}>
                {profesional.nombre}
              </h3>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                {profesional.cargo}
              </p>
            </div>
            <Badge 
              className="text-xs font-bold"
              style={{
                background: isOverloaded ? '#FEE2E2' : isNearLimit ? '#FEF3C7' : '#D1FAE5',
                color: isOverloaded ? '#DC2626' : isNearLimit ? '#D97706' : '#059669'
              }}
            >
              {procesos.length}/{profesional.maxCarga}
            </Badge>
          </div>

          {/* Barra de Carga */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: '#6B7280' }}>Carga de trabajo</span>
              <span className="font-bold" style={{ 
                color: isOverloaded ? '#DC2626' : isNearLimit ? '#D97706' : '#059669' 
              }}>
                {Math.round(cargaPorcentaje)}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(cargaPorcentaje, 100)}%` }}
                transition={{ duration: 0.5 }}
                className="h-full rounded-full"
                style={{
                  background: isOverloaded 
                    ? 'linear-gradient(90deg, #DC2626 0%, #EF4444 100%)'
                    : isNearLimit
                    ? 'linear-gradient(90deg, #F59E0B 0%, #FFC107 100%)'
                    : 'linear-gradient(90deg, #10B981 0%, #34D399 100%)'
                }}
              />
            </div>
          </div>
        </div>

        {/* Lista de Procesos */}
        <div className="p-4 space-y-3 min-h-[400px] max-h-[600px] overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {procesos.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                  style={{ background: '#F3F4F6' }}
                >
                  <Users className="w-8 h-8" style={{ color: '#9CA3AF' }} />
                </div>
                <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>
                  Sin procesos asignados
                </p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  Arrastra un proceso aquí
                </p>
              </motion.div>
            ) : (
              procesos.map((proceso) => (
                <motion.div
                  key={proceso.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <DraggableProcesoCard proceso={proceso} />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Drop Zone Indicator */}
        <AnimatePresence>
          {isOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-2xl border-4 border-dashed pointer-events-none"
              style={{
                borderColor: '#003DA5',
                background: 'rgba(0, 61, 165, 0.05)'
              }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                <ArrowRightLeft 
                  className="w-12 h-12 animate-pulse" 
                  style={{ color: '#003DA5' }} 
                />
                <p className="font-bold text-sm" style={{ color: '#003DA5' }}>
                  Soltar para reasignar
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ==================== VISTA KANBAN PRINCIPAL ====================
export function ControlDisciplinarioKanban() {
  const [procesos, setProcesos] = useState<Proceso[]>(PROCESOS_INICIALES);
  const [showStats, setShowStats] = useState(true);

  const handleDrop = (proceso: Proceso, nuevoProfesionalId: string) => {
    const profesionalAnterior = PROFESIONALES.find(p => p.id === proceso.profesionalAsignado);
    const profesionalNuevo = PROFESIONALES.find(p => p.id === nuevoProfesionalId);

    setProcesos(prevProcesos =>
      prevProcesos.map(p =>
        p.id === proceso.id
          ? { ...p, profesionalAsignado: nuevoProfesionalId }
          : p
      )
    );

    toast.success(
      <div>
        <p className="font-bold">Proceso reasignado exitosamente</p>
        <p className="text-sm text-gray-600">
          {proceso.consecutivo} de {profesionalAnterior?.nombre} → {profesionalNuevo?.nombre}
        </p>
      </div>,
      { duration: 4000 }
    );
  };

  const getProcesosPorProfesional = (profesionalId: string) => {
    return procesos.filter(p => p.profesionalAsignado === profesionalId);
  };

  // Estadísticas globales
  const totalProcesos = procesos.length;
  const procesosVencidos = procesos.filter(p => p.diasRestantes < 0).length;
  const procesosRiesgo = procesos.filter(p => p.semaforo === 'amarillo').length;
  const procesosNormales = procesos.filter(p => p.semaforo === 'verde').length;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="w-full min-h-screen p-8" style={{ background: '#F9FAFB' }}>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-extrabold mb-2" style={{ color: '#003DA5' }}>
                Vista Kanban - Reasignación de Procesos
              </h1>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Arrastra las tarjetas para reasignar procesos entre profesionales
              </p>
            </div>
            <button
              onClick={() => setShowStats(!showStats)}
              className="px-4 py-2 rounded-xl font-semibold transition-all"
              style={{
                background: '#003DA5',
                color: '#FFFFFF'
              }}
            >
              {showStats ? 'Ocultar' : 'Mostrar'} Estadísticas
            </button>
          </div>

          {/* Estadísticas Globales */}
          <AnimatePresence>
            {showStats && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-4 gap-4 mb-6"
              >
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl" style={{ background: '#E0EDFF' }}>
                      <FileText className="w-6 h-6" style={{ color: '#003DA5' }} />
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold" style={{ color: '#003DA5' }}>
                        {totalProcesos}
                      </p>
                      <p className="text-xs" style={{ color: '#6B7280' }}>
                        Total Procesos
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl" style={{ background: '#D1FAE5' }}>
                      <CheckCircle className="w-6 h-6" style={{ color: '#10B981' }} />
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold" style={{ color: '#10B981' }}>
                        {procesosNormales}
                      </p>
                      <p className="text-xs" style={{ color: '#6B7280' }}>
                        En tiempo
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl" style={{ background: '#FEF3C7' }}>
                      <Clock className="w-6 h-6" style={{ color: '#F59E0B' }} />
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold" style={{ color: '#F59E0B' }}>
                        {procesosRiesgo}
                      </p>
                      <p className="text-xs" style={{ color: '#6B7280' }}>
                        En riesgo
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl" style={{ background: '#FEE2E2' }}>
                      <AlertTriangle className="w-6 h-6" style={{ color: '#DC2626' }} />
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold" style={{ color: '#DC2626' }}>
                        {procesosVencidos}
                      </p>
                      <p className="text-xs" style={{ color: '#6B7280' }}>
                        Vencidos
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Columnas Kanban */}
        <div className="flex gap-6 overflow-x-auto pb-6">
          {PROFESIONALES.map((profesional) => (
            <ProfesionalColumn
              key={profesional.id}
              profesional={profesional}
              procesos={getProcesosPorProfesional(profesional.id)}
              onDrop={handleDrop}
            />
          ))}
        </div>

        {/* Instrucciones */}
        <Card className="p-6 mt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl" style={{ background: '#E0EDFF' }}>
              <Grip className="w-6 h-6" style={{ color: '#003DA5' }} />
            </div>
            <div>
              <h3 className="font-bold mb-2" style={{ color: '#1F2937' }}>
                💡 Cómo usar el sistema de Drag & Drop
              </h3>
              <ul className="space-y-1 text-sm" style={{ color: '#6B7280' }}>
                <li>• <strong>Arrastra</strong> una tarjeta de proceso desde cualquier columna</li>
                <li>• <strong>Suelta</strong> sobre la columna del profesional al que deseas reasignar</li>
                <li>• La <strong>barra de carga</strong> se actualiza automáticamente</li>
                <li>• Los colores indican el nivel de carga: 🟢 Normal | 🟡 Alto | 🔴 Sobrecarga</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </DndProvider>
  );
}