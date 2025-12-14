/**
 * DASHBOARD KANBAN JUZGAMIENTO - Gestión Legal
 * Vista Kanban con Drag & Drop de expedientes en 11 estados
 * Optimizado para rapidez y fluidez
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GripVertical, AlertTriangle, CheckCircle, MoreVertical, 
  Calendar, FolderOpen, Clock, Scale, User, FileText
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { toast } from 'sonner@2.0.3';

interface Expediente {
  id: string;
  numero: string;
  investigado: string;
  cedula: string;
  cargo: string;
  etapaActual: string;
  abogadoAsignado: string;
  fechaHechos: string;
  fechaPrescripcion: string;
  diasParaPrescripcion: number;
  terminoActual: string;
  diasRestantesTermino: number;
  totalDiasTermino: number;
  tipoFalta: 'Leve' | 'Grave' | 'Gravísima';
  sancionProyectada: string;
  documentos: number;
  fechaCreacion: string;
  ultimaActuacion: string;
  normatividad: 'Ley 1952/2019' | 'Ley 734/2002';
}

const EXPEDIENTES_KANBAN: Expediente[] = [
  {
    id: '1',
    numero: 'PD-2025-0125',
    investigado: 'Ana María López Martínez',
    cedula: '52123456',
    cargo: 'Profesional Universitario',
    etapaActual: 'Traslado Descargos',
    abogadoAsignado: 'Dr. Carlos Mendoza',
    fechaHechos: '2020-03-20',
    fechaPrescripcion: '2025-03-20',
    diasParaPrescripcion: 45,
    terminoActual: 'Descargos (10 días)',
    diasRestantesTermino: 7,
    totalDiasTermino: 10,
    tipoFalta: 'Grave',
    sancionProyectada: 'Destitución',
    documentos: 15,
    fechaCreacion: '2025-01-02',
    ultimaActuacion: 'Auto avocamiento notificado',
    normatividad: 'Ley 1952/2019'
  },
  {
    id: '2',
    numero: 'PD-2025-0098',
    investigado: 'Roberto Sánchez Cruz',
    cedula: '77385960',
    cargo: 'Técnico Administrativo',
    etapaActual: 'Recibido',
    abogadoAsignado: 'Dra. María Torres',
    fechaHechos: '2021-06-15',
    fechaPrescripcion: '2026-06-15',
    diasParaPrescripcion: 520,
    terminoActual: 'Asignar abogado',
    diasRestantesTermino: 2,
    totalDiasTermino: 3,
    tipoFalta: 'Gravísima',
    sancionProyectada: 'Destitución + Inhabilidad',
    documentos: 8,
    fechaCreacion: '2025-01-28',
    ultimaActuacion: 'Expediente recibido de OCID',
    normatividad: 'Ley 1952/2019'
  },
  {
    id: '3',
    numero: 'PD-2024-0234',
    investigado: 'Patricia Herrera Gómez',
    cedula: '33445556',
    cargo: 'Secretaria Ejecutiva',
    etapaActual: 'Práctica Pruebas',
    abogadoAsignado: 'Dr. Luis Ramírez',
    fechaHechos: '2020-11-10',
    fechaPrescripcion: '2025-11-10',
    diasParaPrescripcion: 280,
    terminoActual: 'Práctica de pruebas (30 días)',
    diasRestantesTermino: 18,
    totalDiasTermino: 30,
    tipoFalta: 'Grave',
    sancionProyectada: 'Suspensión 6 meses',
    documentos: 28,
    fechaCreacion: '2024-08-15',
    ultimaActuacion: 'Auto decreto de pruebas',
    normatividad: 'Ley 1952/2019'
  },
  {
    id: '4',
    numero: 'PD-2025-0156',
    investigado: 'Jorge Ramírez Silva',
    cedula: '11223334',
    cargo: 'Conductor',
    etapaActual: 'Descargos Presentados',
    abogadoAsignado: 'Dr. Carlos Mendoza',
    fechaHechos: '2022-02-20',
    fechaPrescripcion: '2027-02-20',
    diasParaPrescripcion: 745,
    terminoActual: 'Análisis de descargos',
    diasRestantesTermino: 15,
    totalDiasTermino: 20,
    tipoFalta: 'Leve',
    sancionProyectada: 'Amonestación',
    documentos: 12,
    fechaCreacion: '2025-01-15',
    ultimaActuacion: 'Descargos presentados',
    normatividad: 'Ley 1952/2019'
  },
  {
    id: '5',
    numero: 'PD-2024-0189',
    investigado: 'Sandra Milena Díaz',
    cedula: '22334455',
    cargo: 'Profesional Especializado',
    etapaActual: 'Proyecto Fallo',
    abogadoAsignado: 'Dra. María Torres',
    fechaHechos: '2021-09-05',
    fechaPrescripcion: '2026-09-05',
    diasParaPrescripcion: 605,
    terminoActual: 'Firma del Jefe',
    diasRestantesTermino: 5,
    totalDiasTermino: 5,
    tipoFalta: 'Gravísima',
    sancionProyectada: 'Destitución + Inhabilidad 15 años',
    documentos: 45,
    fechaCreacion: '2024-05-20',
    ultimaActuacion: 'Fallo proyectado',
    normatividad: 'Ley 1952/2019'
  },
  {
    id: '6',
    numero: 'PD-2025-0042',
    investigado: 'Luis Fernando Castro',
    cedula: '44556677',
    cargo: 'Auxiliar Administrativo',
    etapaActual: 'Auto Inicial',
    abogadoAsignado: 'Dr. Luis Ramírez',
    fechaHechos: '2022-08-30',
    fechaPrescripcion: '2027-08-30',
    diasParaPrescripcion: 935,
    terminoActual: 'Firma auto avocamiento',
    diasRestantesTermino: 3,
    totalDiasTermino: 5,
    tipoFalta: 'Leve',
    sancionProyectada: 'Multa 30 días',
    documentos: 6,
    fechaCreacion: '2025-01-20',
    ultimaActuacion: 'Auto proyectado',
    normatividad: 'Ley 1952/2019'
  },
  {
    id: '7',
    numero: 'PD-2024-0312',
    investigado: 'Gloria Patricia Ruiz',
    cedula: '55667788',
    cargo: 'Profesional Universitario',
    etapaActual: 'Fallo Notificado',
    abogadoAsignado: 'Dra. María Torres',
    fechaHechos: '2020-05-15',
    fechaPrescripcion: '2025-05-15',
    diasParaPrescripcion: 130,
    terminoActual: 'Recurso de apelación (10 días)',
    diasRestantesTermino: 8,
    totalDiasTermino: 10,
    tipoFalta: 'Grave',
    sancionProyectada: 'Suspensión 3 meses',
    documentos: 38,
    fechaCreacion: '2024-02-10',
    ultimaActuacion: 'Fallo notificado',
    normatividad: 'Ley 1952/2019'
  }
];

const ETAPAS = [
  { id: 'Recibido', label: 'Recibido', color: '#17A2B8', icono: '📥' },
  { id: 'Auto Inicial', label: 'Auto Inicial', color: '#6366F1', icono: '📝' },
  { id: 'Traslado Descargos', label: 'Traslado Descargos', color: '#F59E0B', icono: '⏰' },
  { id: 'Descargos Presentados', label: 'Descargos', color: '#10B981', icono: '📋' },
  { id: 'Silencio', label: 'Silencio', color: '#6C757D', icono: '🔇' },
  { id: 'Práctica Pruebas', label: 'Pruebas', color: '#8B5CF6', icono: '🔍' },
  { id: 'Alegatos', label: 'Alegatos', color: '#EC4899', icono: '💬' },
  { id: 'Proyecto Fallo', label: 'Proyecto Fallo', color: '#6F42C1', icono: '⚖️' },
  { id: 'Fallo Notificado', label: 'Fallo Notificado', color: '#20C997', icono: '📬' },
  { id: 'En Apelación', label: 'Apelación', color: '#FD7E14', icono: '⬆️' },
  { id: 'Ejecutoriado', label: 'Ejecutoriado', color: '#28A745', icono: '✅' }
];

export function DashboardKanbanJuzgamiento() {
  const [expedientes, setExpedientes] = useState(EXPEDIENTES_KANBAN);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);

  const handleDragStart = (expedienteId: string) => {
    setDraggedItem(expedienteId);
  };

  const handleDragEnter = (etapa: string) => {
    setDraggedOverColumn(etapa);
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = (nuevaEtapa: string) => {
    if (draggedItem) {
      const expediente = expedientes.find(e => e.id === draggedItem);
      
      if (expediente && expediente.etapaActual !== nuevaEtapa) {
        setExpedientes(prev => prev.map(e => 
          e.id === draggedItem 
            ? { ...e, etapaActual: nuevaEtapa }
            : e
        ));
        
        toast.success(`${expediente.numero} movido a ${nuevaEtapa}`, {
          description: 'Estado actualizado correctamente',
          duration: 2000
        });
      }
    }
    
    setDraggedItem(null);
    setDraggedOverColumn(null);
  };

  const getExpedientesEtapa = (etapa: string) => {
    return expedientes.filter(e => e.etapaActual === etapa);
  };

  const getSemaforoPrescripcion = (dias: number) => {
    if (dias < 90) return { color: '#DC2626', label: '🚨 Crítico', ring: '#FEE2E2' };
    if (dias < 180) return { color: '#F59E0B', label: '⚠️ Atención', ring: '#FEF3C7' };
    return { color: '#10B981', label: '✓ Normal', ring: '#D1FAE5' };
  };

  const getSemaforoTermino = (restante: number, total: number) => {
    const porcentaje = (restante / total) * 100;
    if (porcentaje < 25) return '#DC2626';
    if (porcentaje < 50) return '#F59E0B';
    return '#10B981';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold mb-2" style={{ color: '#6F42C1' }}>
          Vista Kanban - Juzgamiento Disciplinario
        </h2>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Arrastra los expedientes entre etapas procesales para actualizar su estado
        </p>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {ETAPAS.map((etapa) => {
          const expedientesEtapa = getExpedientesEtapa(etapa.id);
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
                    <span className="text-xl">{etapa.icono}</span>
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
                    {expedientesEtapa.length}
                  </Badge>
                </div>
              </div>

              {/* Columna Body */}
              <div 
                className="min-h-[600px] p-3 rounded-b-xl border-2 space-y-3 transition-all duration-150"
                style={{ 
                  background: isOver ? `${etapa.color}05` : '#FFFFFF',
                  borderLeft: isOver ? `3px solid ${etapa.color}` : '2px solid #E5E7EB',
                  borderRight: isOver ? `3px solid ${etapa.color}` : '2px solid #E5E7EB',
                  borderBottom: isOver ? `3px solid ${etapa.color}` : '2px solid #E5E7EB',
                  borderTop: 'none'
                }}
              >
                <AnimatePresence mode="popLayout">
                  {expedientesEtapa.map((expediente) => {
                    const semaforoPrescripcion = getSemaforoPrescripcion(expediente.diasParaPrescripcion);
                    const colorTermino = getSemaforoTermino(expediente.diasRestantesTermino, expediente.totalDiasTermino);
                    const porcentajeTermino = (expediente.diasRestantesTermino / expediente.totalDiasTermino) * 100;

                    return (
                      <motion.div
                        key={expediente.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ 
                          opacity: draggedItem === expediente.id ? 0.4 : 1, 
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
                        onDragStart={() => handleDragStart(expediente.id)}
                        onDragEnd={() => setDraggedItem(null)}
                      >
                        <Card 
                          className="p-4 border-2 hover:shadow-lg transition-shadow duration-150 select-none"
                          style={{ borderColor: '#E5E7EB' }}
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <GripVertical className="w-4 h-4 flex-shrink-0" style={{ color: '#9CA3AF' }} />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm mb-1 truncate" style={{ color: '#6F42C1' }}>
                                  {expediente.numero}
                                </p>
                                <Badge 
                                  className="text-xs"
                                  style={{ 
                                    background: expediente.tipoFalta === 'Gravísima' ? '#FEE2E2' : 
                                               expediente.tipoFalta === 'Grave' ? '#FEF3C7' : '#DBEAFE',
                                    color: expediente.tipoFalta === 'Gravísima' ? '#991B1B' : 
                                           expediente.tipoFalta === 'Grave' ? '#92400E' : '#1E40AF'
                                  }}
                                >
                                  {expediente.tipoFalta}
                                </Badge>
                              </div>
                            </div>
                            <button 
                              className="p-1 hover:bg-gray-100 rounded flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toast.info('Ver detalles del expediente');
                              }}
                            >
                              <MoreVertical className="w-4 h-4" style={{ color: '#6B7280' }} />
                            </button>
                          </div>

                          {/* Investigado */}
                          <p className="font-bold text-sm mb-1" style={{ color: '#1F2937' }}>
                            {expediente.investigado}
                          </p>
                          <p className="text-xs mb-3" style={{ color: '#6B7280' }}>
                            CC {expediente.cedula} • {expediente.cargo}
                          </p>

                          {/* Alerta Prescripción */}
                          <div className="mb-3 p-2 rounded-lg" style={{ background: `${semaforoPrescripcion.color}10` }}>
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className="w-2 h-2 rounded-full ring-2"
                                style={{
                                  background: semaforoPrescripcion.color,
                                  ringColor: semaforoPrescripcion.ring
                                }}
                              />
                              <span className="text-xs font-bold" style={{ color: semaforoPrescripcion.color }}>
                                {semaforoPrescripcion.label}
                              </span>
                            </div>
                            <p className="text-xs" style={{ color: '#6B7280' }}>
                              Prescribe en {expediente.diasParaPrescripcion} días
                            </p>
                          </div>

                          {/* Término Actual */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                                {expediente.terminoActual}
                              </span>
                              <span className="text-xs font-bold" style={{ color: colorTermino }}>
                                {expediente.diasRestantesTermino}/{expediente.totalDiasTermino}d
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(porcentajeTermino, 100)}%`,
                                  background: colorTermino
                                }}
                              />
                            </div>
                          </div>

                          {/* Sanción Proyectada */}
                          <div className="mb-3 p-2 rounded-lg" style={{ background: '#F9FAFB' }}>
                            <div className="flex items-center gap-2">
                              <Scale className="w-3 h-3" style={{ color: '#6F42C1' }} />
                              <span className="text-xs font-medium" style={{ color: '#4B5563' }}>
                                {expediente.sancionProyectada}
                              </span>
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: '#E5E7EB' }}>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarFallback style={{ background: '#F3E8FF', color: '#6F42C1', fontSize: '9px' }}>
                                  {expediente.abogadoAsignado.split(' ').slice(1, 3).map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium truncate max-w-[100px]" style={{ color: '#6B7280' }}>
                                {expediente.abogadoAsignado.split(' ').slice(1).join(' ')}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <FolderOpen className="w-3 h-3" style={{ color: '#9CA3AF' }} />
                              <span className="text-xs font-bold" style={{ color: '#6B7280' }}>
                                {expediente.documentos}
                              </span>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Empty State */}
                {expedientesEtapa.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                      style={{ background: `${etapa.color}10` }}
                    >
                      <CheckCircle className="w-6 h-6" style={{ color: etapa.color }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: '#9CA3AF' }}>
                      Sin expedientes
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
          <div className="p-2 rounded-lg" style={{ background: '#F3E8FF' }}>
            <GripVertical className="w-5 h-5" style={{ color: '#6F42C1' }} />
          </div>
          <div>
            <p className="text-sm font-bold mb-1" style={{ color: '#1F2937' }}>
              💡 Cómo usar el Kanban de Juzgamiento
            </p>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              <strong>Click y arrastra</strong> las tarjetas entre las 11 etapas procesales para actualizar el estado del expediente. 
              Presta especial atención a las alertas de prescripción (🚨) y términos críticos (⏰).
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
          style={{ background: '#6F42C1', color: '#FFFFFF' }}
        >
          <p className="text-sm font-bold flex items-center gap-2">
            <GripVertical className="w-4 h-4" />
            Arrastrando expediente...
          </p>
        </motion.div>
      )}
    </div>
  );
}