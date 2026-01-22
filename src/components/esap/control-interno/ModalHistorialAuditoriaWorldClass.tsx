/**
 * ============================================
 * MODAL HISTORIAL AUDITORÍA - WORLD CLASS
 * ============================================
 * 
 * Timeline de eventos y cambios de estado de la auditoría
 * Usa ModalWorldClass como base
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Enero 2025
 */

import { useState, useEffect } from 'react';
import { History, Clock, User, CheckCircle, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import { ModalWorldClass } from './ModalWorldClass';
import { motion } from 'motion/react';

// ============ TIPOS ============

interface Auditoria {
  id: string;
  codigo: string;
  titulo: string;
}

type TipoEvento = 'estado' | 'asignacion' | 'documento' | 'hallazgo' | 'nota' | 'aprobacion';

interface EventoHistorial {
  id: string;
  tipo: TipoEvento;
  titulo: string;
  descripcion: string;
  usuario: string;
  cargo: string;
  fecha: string;
  hora: string;
  estadoAnterior?: string;
  estadoNuevo?: string;
  icono?: React.ReactNode;
}

interface ModalHistorialAuditoriaProps {
  auditoria: Auditoria | null;
  open: boolean;
  onClose: () => void;
}

// ============ DATOS DE EJEMPLO ============

const EVENTOS_EJEMPLO: EventoHistorial[] = [
  {
    id: 'evt-1',
    tipo: 'estado',
    titulo: 'Cambio de estado a Ejecución',
    descripcion: 'La auditoría pasó de Planeación a Ejecución. Se iniciaron las actividades de campo.',
    usuario: 'Juan Pérez López',
    cargo: 'Auditor Líder',
    fecha: '22/01/2025',
    hora: '14:30',
    estadoAnterior: 'Planeación',
    estadoNuevo: 'Ejecución'
  },
  {
    id: 'evt-2',
    tipo: 'documento',
    titulo: 'Documento cargado',
    descripcion: 'Se agregó el documento "Plan_de_Auditoria.pdf" al expediente.',
    usuario: 'Ana María López',
    cargo: 'Auditor Junior',
    fecha: '22/01/2025',
    hora: '10:15'
  },
  {
    id: 'evt-3',
    tipo: 'asignacion',
    titulo: 'Auditor asignado',
    descripcion: 'Se asignó Ana María López como Auditor Junior al equipo.',
    usuario: 'Sistema',
    cargo: 'Automático',
    fecha: '21/01/2025',
    hora: '16:45'
  },
  {
    id: 'evt-4',
    tipo: 'hallazgo',
    titulo: 'Hallazgo detectado',
    descripcion: 'Se registró hallazgo H-001: Falta de documentación en procesos administrativos.',
    usuario: 'Juan Pérez López',
    cargo: 'Auditor Líder',
    fecha: '20/01/2025',
    hora: '11:20'
  },
  {
    id: 'evt-5',
    tipo: 'aprobacion',
    titulo: 'Auditoría aprobada',
    descripcion: 'La auditoría fue aprobada para inicio de ejecución.',
    usuario: 'María González',
    cargo: 'Directora de Control Interno',
    fecha: '15/01/2025',
    hora: '09:00'
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function ModalHistorialAuditoriaWorldClass({
  auditoria,
  open,
  onClose
}: ModalHistorialAuditoriaProps) {
  const [historial, setHistorial] = useState<EventoHistorial[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<TipoEvento | 'todos'>('todos');

  useEffect(() => {
    if (open && auditoria) {
      // Simular carga de historial
      setHistorial(EVENTOS_EJEMPLO);
    }
  }, [open, auditoria]);

  if (!auditoria) return null;

  // Badges dinámicos
  const badges = [
    { label: `${historial.length} eventos`, variant: 'info' as const },
    { 
      label: 'Timeline completo', 
      icon: <Clock className="w-3.5 h-3.5" />,
      variant: 'primary' as const
    }
  ];

  // Filtrar eventos
  const eventosFiltrados = filtroTipo === 'todos' 
    ? historial 
    : historial.filter(e => e.tipo === filtroTipo);

  return (
    <ModalWorldClass
      isOpen={open}
      onClose={onClose}
      titulo="Historial de Cambios"
      codigo={auditoria.codigo}
      icono={<History className="w-6 h-6" />}
      badges={badges}
      size="lg"
      footer={
        <div className="flex items-center justify-between">
          {/* Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            <FilterButton
              label="Todos"
              active={filtroTipo === 'todos'}
              onClick={() => setFiltroTipo('todos')}
              count={historial.length}
            />
            <FilterButton
              label="Estados"
              active={filtroTipo === 'estado'}
              onClick={() => setFiltroTipo('estado')}
              count={historial.filter(e => e.tipo === 'estado').length}
            />
            <FilterButton
              label="Documentos"
              active={filtroTipo === 'documento'}
              onClick={() => setFiltroTipo('documento')}
              count={historial.filter(e => e.tipo === 'documento').length}
            />
            <FilterButton
              label="Hallazgos"
              active={filtroTipo === 'hallazgo'}
              onClick={() => setFiltroTipo('hallazgo')}
              count={historial.filter(e => e.tipo === 'hallazgo').length}
            />
          </div>

          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all"
          >
            Cerrar
          </button>
        </div>
      }
    >
      {/* Timeline */}
      <div className="relative">
        {/* Línea vertical */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

        {/* Eventos */}
        <div className="space-y-6">
          {eventosFiltrados.map((evento, index) => (
            <EventoTimelineCard
              key={evento.id}
              evento={evento}
              isLast={index === eventosFiltrados.length - 1}
            />
          ))}
        </div>

        {/* Empty state */}
        {eventosFiltrados.length === 0 && (
          <div className="text-center py-12">
            <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">
              No hay eventos con el filtro seleccionado
            </p>
          </div>
        )}
      </div>
    </ModalWorldClass>
  );
}

// ============ COMPONENTE AUXILIAR: EVENTO CARD ============

interface EventoTimelineCardProps {
  evento: EventoHistorial;
  isLast: boolean;
}

function EventoTimelineCard({ evento, isLast }: EventoTimelineCardProps) {
  const iconosPorTipo: Record<TipoEvento, { icon: React.ReactNode; color: string }> = {
    estado: { icon: <ArrowRight className="w-4 h-4" />, color: 'bg-blue-500' },
    asignacion: { icon: <User className="w-4 h-4" />, color: 'bg-purple-500' },
    documento: { icon: <FileText className="w-4 h-4" />, color: 'bg-green-500' },
    hallazgo: { icon: <AlertCircle className="w-4 h-4" />, color: 'bg-orange-500' },
    nota: { icon: <FileText className="w-4 h-4" />, color: 'bg-gray-500' },
    aprobacion: { icon: <CheckCircle className="w-4 h-4" />, color: 'bg-emerald-500' }
  };

  const { icon, color } = iconosPorTipo[evento.tipo];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative flex gap-4"
    >
      {/* Icono en timeline */}
      <div className={`flex-shrink-0 w-12 h-12 ${color} rounded-full flex items-center justify-center text-white shadow-md z-10`}>
        {icon}
      </div>

      {/* Contenido */}
      <div className="flex-1 pb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">
              {evento.titulo}
            </h4>
            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
              {evento.hora}
            </span>
          </div>

          {/* Descripción */}
          <p className="text-sm text-gray-700 mb-3">
            {evento.descripcion}
          </p>

          {/* Cambio de estado (si aplica) */}
          {evento.estadoAnterior && evento.estadoNuevo && (
            <div className="flex items-center gap-2 mb-3 text-xs">
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                {evento.estadoAnterior}
              </span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                {evento.estadoNuevo}
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 text-xs text-gray-600 border-t border-gray-100 pt-3">
            <User className="w-3 h-3" />
            <span className="font-medium">{evento.usuario}</span>
            <span className="text-gray-400">•</span>
            <span>{evento.cargo}</span>
            <span className="text-gray-400">•</span>
            <span>{evento.fecha}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============ COMPONENTE AUXILIAR: FILTER BUTTON ============

interface FilterButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  count: number;
}

function FilterButton({ label, active, onClick, count }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
        ${active 
          ? 'bg-blue-100 text-blue-800 border border-blue-200' 
          : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
        }
      `}
    >
      {label}
      <span className={`
        px-1.5 py-0.5 rounded text-xs
        ${active ? 'bg-blue-200' : 'bg-gray-200'}
      `}>
        {count}
      </span>
    </button>
  );
}
