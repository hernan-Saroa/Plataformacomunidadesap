/**
 * DASHBOARD KANBAN - Control Disciplinario
 * Vista Kanban con Drag & Drop de procesos MEJORADO
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GripVertical, Clock, User, AlertTriangle, CheckCircle,
  MoreVertical, Eye, Calendar, FolderOpen
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { toast } from 'sonner@2.0.3';

interface Proceso {
  id: string;
  consecutivo: string;
  noticia: string;
  disciplinable: string;
  cedula: string;
  etapaActual: string;
  semaforo: 'verde' | 'amarillo' | 'rojo';
  diasRestantes: number;
  porcentajeTiempo: number;
  profesionalAsignado: string;
  fechaCreacion: string;
  ultimaActuacion: string;
  documentos: number;
  fechaVencimiento: string;
}

const PROCESOS_KANBAN: Proceso[] = [
  {
    id: '1',
    consecutivo: 'PD-2025-0025',
    noticia: 'ND-2025-0152',
    disciplinable: 'Ana María López Martínez',
    cedula: '52123456',
    etapaActual: 'Valoración',
    semaforo: 'amarillo',
    diasRestantes: 3,
    porcentajeTiempo: 70,
    profesionalAsignado: 'Juan Pérez',
    fechaCreacion: '2025-01-26',
    ultimaActuacion: 'Asignado para valoración',
    documentos: 5,
    fechaVencimiento: '2025-02-02'
  },
  {
    id: '2',
    consecutivo: 'PD-2025-0018',
    noticia: 'ND-2025-0089',
    disciplinable: 'Roberto Sánchez Cruz',
    cedula: '77385960',
    etapaActual: 'Indagación',
    semaforo: 'verde',
    diasRestantes: 45,
    porcentajeTiempo: 35,
    profesionalAsignado: 'María Torres',
    fechaCreacion: '2024-12-15',
    ultimaActuacion: 'Auto de indagación previa notificado',
    documentos: 12,
    fechaVencimiento: '2025-03-15'
  },
  {
    id: '3',
    consecutivo: 'PD-2024-0156',
    noticia: 'ND-2024-0891',
    disciplinable: 'Patricia Herrera Gómez',
    cedula: '33445556',
    etapaActual: 'Investigación',
    semaforo: 'rojo',
    diasRestantes: -12,
    porcentajeTiempo: 115,
    profesionalAsignado: 'Carlos Mendoza',
    fechaCreacion: '2024-09-20',
    ultimaActuacion: 'Investigación disciplinaria en curso',
    documentos: 28,
    fechaVencimiento: '2025-01-18'
  },
  {
    id: '4',
    consecutivo: 'PD-2025-0042',
    noticia: 'ND-2025-0201',
    disciplinable: 'Jorge Ramírez Silva',
    cedula: '11223334',
    etapaActual: 'Valoración',
    semaforo: 'verde',
    diasRestantes: 15,
    porcentajeTiempo: 20,
    profesionalAsignado: 'Juan Pérez',
    fechaCreacion: '2025-01-20',
    ultimaActuacion: 'Documentos allegados',
    documentos: 3,
    fechaVencimiento: '2025-02-15'
  },
  {
    id: '5',
    consecutivo: 'PD-2025-0008',
    noticia: 'ND-2025-0045',
    disciplinable: 'Luis Fernando Castro',
    cedula: '44556677',
    etapaActual: 'Juzgamiento',
    semaforo: 'verde',
    diasRestantes: 30,
    porcentajeTiempo: 75,
    profesionalAsignado: 'Ana González',
    fechaCreacion: '2024-11-10',
    ultimaActuacion: 'Audiencia programada',
    documentos: 45,
    fechaVencimiento: '2025-03-01'
  },
  {
    id: '6',
    consecutivo: 'PD-2025-0001',
    noticia: 'ND-2025-0001',
    disciplinable: 'Sandra Milena Díaz',
    cedula: '22334455',
    etapaActual: 'Recepción',
    semaforo: 'verde',
    diasRestantes: 2,
    porcentajeTiempo: 30,
    profesionalAsignado: 'Juan Pérez',
    fechaCreacion: '2025-01-29',
    ultimaActuacion: 'Noticia recibida',
    documentos: 1,
    fechaVencimiento: '2025-02-01'
  }
];

const ETAPAS = [
  { id: 'Recepción', label: 'Recepción', color: '#9CA3AF' },
  { id: 'Valoración', label: 'Valoración', color: '#6366F1' },
  { id: 'Indagación', label: 'Indagación', color: '#8B5CF6' },
  { id: 'Investigación', label: 'Investigación', color: '#F59E0B' },
  { id: 'Juzgamiento', label: 'Juzgamiento', color: '#10B981' },
  { id: 'Fallo', label: 'Fallo', color: '#003DA5' }
];

export function DashboardKanban() {
  const [procesos, setProcesos] = useState(PROCESOS_KANBAN);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);

  // Inicio del drag
  const handleDragStart = (procesoId: string) => {
    setDraggedItem(procesoId);
  };

  // Movimiento sobre una columna
  const handleDragEnter = (etapa: string) => {
    setDraggedOverColumn(etapa);
  };

  // Salir de una columna
  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  // Soltar en una columna - OPTIMIZADO
  const handleDrop = (nuevaEtapa: string) => {
    if (draggedItem) {
      const proceso = procesos.find(p => p.id === draggedItem);
      
      if (proceso && proceso.etapaActual !== nuevaEtapa) {
        // Actualización inmediata sin delay
        setProcesos(prev => prev.map(p => 
          p.id === draggedItem 
            ? { ...p, etapaActual: nuevaEtapa }
            : p
        ));
        
        toast.success(`${proceso.consecutivo} movido a ${nuevaEtapa}`, {
          description: 'Etapa actualizada',
          duration: 2000
        });
      }
    }
    
    // Limpiar estados inmediatamente
    setDraggedItem(null);
    setDraggedOverColumn(null);
  };

  const getProcesosEtapa = (etapa: string) => {
    return procesos.filter(p => p.etapaActual === etapa);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold mb-2" style={{ color: '#003DA5' }}>
          Vista Kanban
        </h2>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Arrastra los procesos entre etapas para actualizar su estado
        </p>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {ETAPAS.map((etapa) => {
          const procesosEtapa = getProcesosEtapa(etapa.id);
          const isOver = draggedOverColumn === etapa.id;
          
          return (
            <div
              key={etapa.id}
              className="flex-shrink-0 w-80"
              onDragOver={(e) => {
                e.preventDefault();
                handleDragEnter(etapa.id);
              }}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(etapa.id);
              }}
            >
              {/* Columna Header */}
              <div 
                className="p-4 rounded-t-xl border-2 border-b-0 transition-all duration-150"
                style={{ 
                  background: isOver ? `${etapa.color}20` : `${etapa.color}10`,
                  borderColor: isOver ? etapa.color : '#E5E7EB'
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ background: etapa.color }}
                    />
                    <h3 className="font-bold text-sm" style={{ color: '#1F2937' }}>
                      {etapa.label}
                    </h3>
                  </div>
                  <Badge 
                    className="text-xs font-bold"
                    style={{ 
                      background: `${etapa.color}20`,
                      color: etapa.color
                    }}
                  >
                    {procesosEtapa.length}
                  </Badge>
                </div>
              </div>

              {/* Columna Body */}
              <div 
                className="min-h-[600px] p-3 rounded-b-xl space-y-3 transition-all duration-150"
                style={{ 
                  background: isOver ? `${etapa.color}05` : '#FFFFFF',
                  borderColor: isOver ? etapa.color : '#E5E7EB',
                  borderTop: 'none',
                  borderLeft: isOver ? '3px solid' : '2px solid',
                  borderRight: isOver ? '3px solid' : '2px solid',
                  borderBottom: isOver ? '3px solid' : '2px solid'
                }}
              >
                <AnimatePresence mode="popLayout">
                  {procesosEtapa.map((proceso) => (
                    <motion.div
                      key={proceso.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ 
                        opacity: draggedItem === proceso.id ? 0.4 : 1, 
                        scale: 1 
                      }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ 
                        duration: 0.15,
                        ease: "easeOut",
                        layout: { duration: 0.2 }
                      }}
                      className="cursor-grab active:cursor-grabbing"
                      draggable
                      onDragStart={() => handleDragStart(proceso.id)}
                      onDragEnd={() => setDraggedItem(null)}
                    >
                      <Card 
                        className="p-4 border-2 hover:shadow-lg transition-shadow duration-150 select-none"
                        style={{ 
                          borderColor: '#E5E7EB'
                        }}
                      >
                        {/* Card Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <GripVertical className="w-4 h-4 flex-shrink-0" style={{ color: '#9CA3AF' }} />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm mb-1 truncate" style={{ color: '#003DA5' }}>
                                {proceso.consecutivo}
                              </p>
                              <Badge className="text-xs" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                                {proceso.noticia}
                              </Badge>
                            </div>
                          </div>
                          <button 
                            className="p-1 hover:bg-gray-100 rounded flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              toast.info('Opciones del proceso');
                            }}
                          >
                            <MoreVertical className="w-4 h-4" style={{ color: '#6B7280' }} />
                          </button>
                        </div>

                        {/* Semáforo */}
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className="w-3 h-3 rounded-full ring-2"
                            style={{
                              background: proceso.semaforo === 'verde' ? '#10B981' : proceso.semaforo === 'amarillo' ? '#F59E0B' : '#DC2626',
                              ringColor: proceso.semaforo === 'verde' ? '#D1FAE5' : proceso.semaforo === 'amarillo' ? '#FEF3C7' : '#FEE2E2'
                            }}
                          />
                          <span 
                            className="text-xs font-bold"
                            style={{ 
                              color: proceso.diasRestantes > 0 ? '#10B981' : '#DC2626' 
                            }}
                          >
                            {proceso.diasRestantes > 0 
                              ? `${proceso.diasRestantes}d restantes` 
                              : `Vencido ${Math.abs(proceso.diasRestantes)}d`
                            }
                          </span>
                        </div>

                        {/* Disciplinable */}
                        <p className="text-sm font-medium mb-3 line-clamp-2" style={{ color: '#1F2937' }}>
                          {proceso.disciplinable}
                        </p>

                        {/* Barra de progreso */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                              PROGRESO
                            </span>
                            <span className="text-xs font-bold" style={{ color: '#003DA5' }}>
                              {proceso.porcentajeTiempo}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(proceso.porcentajeTiempo, 100)}%`,
                                background: proceso.semaforo === 'rojo'
                                  ? '#DC2626'
                                  : proceso.semaforo === 'amarillo'
                                  ? '#F59E0B'
                                  : '#10B981'
                              }}
                            />
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: '#E5E7EB' }}>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5', fontSize: '9px' }}>
                                {proceso.profesionalAsignado.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium truncate max-w-[100px]" style={{ color: '#6B7280' }}>
                              {proceso.profesionalAsignado.split(' ')[0]}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <FolderOpen className="w-3 h-3" style={{ color: '#9CA3AF' }} />
                            <span className="text-xs font-bold" style={{ color: '#6B7280' }}>
                              {proceso.documentos}
                            </span>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Empty State */}
                {procesosEtapa.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                      style={{ background: `${etapa.color}10` }}
                    >
                      <CheckCircle className="w-6 h-6" style={{ color: etapa.color }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: '#9CA3AF' }}>
                      Sin procesos
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>
                      Arrastra aquí
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ayuda */}
      <Card className="p-4 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg" style={{ background: '#E0EDFF' }}>
            <GripVertical className="w-5 h-5" style={{ color: '#003DA5' }} />
          </div>
          <div>
            <p className="text-sm font-bold mb-1" style={{ color: '#1F2937' }}>
              💡 Cómo usar el Kanban
            </p>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              <strong>Click y arrastra</strong> las tarjetas entre columnas para cambiar la etapa del proceso. Los cambios se guardan automáticamente y verás una notificación de confirmación.
            </p>
          </div>
        </div>
      </Card>

      {/* Indicador de Drag */}
      {draggedItem && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed bottom-8 right-8 px-6 py-3 rounded-xl shadow-2xl z-50"
          style={{ background: '#003DA5', color: '#FFFFFF' }}
        >
          <p className="text-sm font-bold flex items-center gap-2">
            <GripVertical className="w-4 h-4" />
            Arrastrando proceso...
          </p>
        </motion.div>
      )}
    </div>
  );
}