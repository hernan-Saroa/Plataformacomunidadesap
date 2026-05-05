/**
 * MÓDULO DE CONTROL DISCIPLINARIO - ULTIMATE (MEJORADO)
 * Sistema completo con TODAS las mejoras de usabilidad
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Filter, Bell, Plus, List, LayoutGrid, Save, X, Check,
  Clock, AlertTriangle, CheckCircle, Eye, FolderOpen, FileEdit,
  MoreVertical, User, Command, Star, Upload
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { toast } from 'sonner@2.0.3';

// TIPOS
interface Proceso {
  id: string;
  consecutivo: string;
  noticia: string;
  disciplinable: string;
  cedula: string;
  estado: string;
  semaforo: 'verde' | 'amarillo' | 'rojo';
  diasRestantes: number;
  profesional: string;
  ultimaActuacion: string;
  fechaCreacion: string;
  documentos: number;
  porcentajeTiempo: number;
}

interface Notificacion {
  id: string;
  tipo: 'vencimiento' | 'aprobacion' | 'asignacion' | 'info';
  titulo: string;
  mensaje: string;
  proceso?: string;
  fecha: string;
  leida: boolean;
  urgencia: 'critico' | 'urgente' | 'info';
}

interface FiltroGuardado {
  id: string;
  nombre: string;
  filtros: {
    estado?: string;
    semaforo?: string;
    profesional?: string;
  };
}

// MOCK DATA
const PROCESOS_MOCK: Proceso[] = [
  {
    id: '1',
    consecutivo: 'PD-2025-0025',
    noticia: 'ND-2025-0152',
    disciplinable: 'Ana López Martínez',
    cedula: '5551234567',
    estado: 'Valoración',
    semaforo: 'amarillo',
    diasRestantes: 3,
    profesional: 'Juan Pérez',
    ultimaActuacion: 'Asignado para valoración inicial',
    fechaCreacion: '2025-01-15',
    documentos: 5,
    porcentajeTiempo: 70
  },
  {
    id: '2',
    consecutivo: 'PD-2025-0018',
    noticia: 'ND-2025-0102',
    disciplinable: 'Roberto Sánchez Cruz',
    cedula: '7778889990',
    estado: 'Indagación Previa',
    semaforo: 'verde',
    diasRestantes: 45,
    profesional: 'María Torres',
    ultimaActuacion: 'Auto de indagación previa notificado',
    fechaCreacion: '2024-12-10',
    documentos: 12,
    porcentajeTiempo: 35
  },
  {
    id: '3',
    consecutivo: 'PD-2024-0156',
    noticia: 'ND-2024-0891',
    disciplinable: 'Patricia Herrera Gómez',
    cedula: '3334445556',
    estado: 'Investigación',
    semaforo: 'rojo',
    diasRestantes: -12,
    profesional: 'Carlos Mendoza',
    ultimaActuacion: 'Investigación disciplinaria en curso',
    fechaCreacion: '2024-09-20',
    documentos: 28,
    porcentajeTiempo: 110
  },
  {
    id: '4',
    consecutivo: 'PD-2025-0042',
    noticia: 'ND-2025-0201',
    disciplinable: 'Jorge Ramírez Silva',
    cedula: '1112223334',
    estado: 'Valoración',
    semaforo: 'verde',
    diasRestantes: 15,
    profesional: 'Juan Pérez',
    ultimaActuacion: 'Documentos allegados',
    fechaCreacion: '2025-01-20',
    documentos: 3,
    porcentajeTiempo: 15
  }
];

const NOTIFICACIONES_MOCK: Notificacion[] = [
  {
    id: '1',
    tipo: 'vencimiento',
    titulo: 'Proceso próximo a vencer',
    mensaje: 'PD-2025-0025 vence en 3 días',
    proceso: 'PD-2025-0025',
    fecha: '2025-01-28 09:30',
    leida: false,
    urgencia: 'urgente'
  },
  {
    id: '2',
    tipo: 'aprobacion',
    titulo: 'Auto pendiente de aprobación',
    mensaje: 'Auto de investigación requiere su aprobación',
    proceso: 'PD-2024-0156',
    fecha: '2025-01-27 14:15',
    leida: false,
    urgencia: 'urgente'
  },
  {
    id: '3',
    tipo: 'asignacion',
    titulo: 'Nuevo proceso asignado',
    mensaje: 'Se le ha asignado el proceso PD-2025-0058',
    proceso: 'PD-2025-0058',
    fecha: '2025-01-27 11:00',
    leida: true,
    urgencia: 'info'
  },
  {
    id: '4',
    tipo: 'vencimiento',
    titulo: 'Proceso VENCIDO',
    mensaje: 'PD-2024-0156 lleva 12 días vencido',
    proceso: 'PD-2024-0156',
    fecha: '2025-01-25 08:00',
    leida: false,
    urgencia: 'critico'
  }
];

// ==================== PREVIEW CARD (HOVER) ====================
function PreviewCard({ proceso, onClose }: { proceso: Proceso; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="absolute z-50 w-96 rounded-2xl border-2 shadow-2xl"
      style={{
        background: '#FFFFFF',
        borderColor: '#003DA5',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: '8px'
      }}
    >
      {/* Header */}
      <div className="p-5 border-b" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  background: proceso.semaforo === 'verde' ? '#10B981' : proceso.semaforo === 'amarillo' ? '#FFC107' : '#DC3545'
                }}
              />
              <h3 className="font-bold text-lg" style={{ color: '#003DA5' }}>
                {proceso.consecutivo}
              </h3>
            </div>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {proceso.noticia}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-lg">
            <X className="w-4 h-4" style={{ color: '#6B7280' }} />
          </button>
        </div>
        <Badge className="text-xs" style={{
          background: proceso.semaforo === 'rojo' ? '#FEE2E2' : proceso.semaforo === 'amarillo' ? '#FEF3C7' : '#D1FAE5',
          color: proceso.semaforo === 'rojo' ? '#DC2626' : proceso.semaforo === 'amarillo' ? '#D97706' : '#059669'
        }}>
          {proceso.estado}
        </Badge>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
            DISCIPLINABLE
          </p>
          <p className="font-medium" style={{ color: '#1F2937' }}>
            {proceso.disciplinable}
          </p>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            CC: {proceso.cedula}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
              PROFESIONAL
            </p>
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5', fontSize: '10px' }}>
                  {proceso.profesional.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium" style={{ color: '#1F2937' }}>
                {proceso.profesional}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
              DOCUMENTOS
            </p>
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" style={{ color: '#003DA5' }} />
              <span className="text-sm font-medium" style={{ color: '#1F2937' }}>
                {proceso.documentos} archivos
              </span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
            ÚLTIMA ACTUACIÓN
          </p>
          <p className="text-sm" style={{ color: '#4B5563' }}>
            {proceso.ultimaActuacion}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: '#9CA3AF' }}>
            PROGRESO DE TIEMPO
          </p>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(proceso.porcentajeTiempo, 100)}%`,
                background: proceso.semaforo === 'rojo'
                  ? 'linear-gradient(90deg, #DC3545 0%, #EF4444 100%)'
                  : proceso.semaforo === 'amarillo'
                  ? 'linear-gradient(90deg, #F59E0B 0%, #FFC107 100%)'
                  : 'linear-gradient(90deg, #10B981 0%, #34D399 100%)'
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs" style={{ color: '#6B7280' }}>
              {proceso.fechaCreacion}
            </span>
            <span className="text-xs font-bold" style={{
              color: proceso.diasRestantes > 0 ? '#10B981' : '#DC2626'
            }}>
              {proceso.diasRestantes > 0 ? `${proceso.diasRestantes} días restantes` : 'VENCIDO'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t flex items-center gap-2" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
        <button
          onClick={() => toast.info('Ver expediente completo')}
          className="flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-all"
          style={{ background: '#003DA5', color: '#FFFFFF' }}
        >
          Ver Expediente
        </button>
        <button
          onClick={() => toast.info('Editar proceso')}
          className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <FileEdit className="w-4 h-4" style={{ color: '#6B7280' }} />
        </button>
      </div>

      {/* Arrow */}
      <div
        className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45"
        style={{ background: '#003DA5' }}
      />
    </motion.div>
  );
}

// ==================== PANEL DE NOTIFICACIONES ====================
function NotificationPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [notificaciones, setNotificaciones] = useState(NOTIFICACIONES_MOCK);
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'vencimiento' | 'aprobacion' | 'asignacion'>('todos');

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  const notificacionesFiltradas = filtroTipo === 'todos'
    ? notificaciones
    : notificaciones.filter(n => n.tipo === filtroTipo);

  const marcarComoLeida = (id: string) => {
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
    toast.success('Notificación marcada como leída');
  };

  const marcarTodasLeidas = () => {
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
    toast.success('Todas las notificaciones marcadas como leídas');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md shadow-2xl z-50"
            style={{ background: '#FFFFFF' }}
          >
            <div className="p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl" style={{ background: '#E0EDFF' }}>
                    <Bell className="w-5 h-5" style={{ color: '#003DA5' }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: '#1F2937' }}>
                      Notificaciones
                    </h2>
                    <p className="text-xs" style={{ color: '#6B7280' }}>
                      {noLeidas} sin leer
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" style={{ color: '#6B7280' }} />
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {[
                  { value: 'todos', label: 'Todas' },
                  { value: 'vencimiento', label: 'Vencimientos' },
                  { value: 'aprobacion', label: 'Aprobaciones' },
                  { value: 'asignacion', label: 'Asignaciones' }
                ].map((filtro) => (
                  <button
                    key={filtro.value}
                    onClick={() => setFiltroTipo(filtro.value as any)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                    style={{
                      background: filtroTipo === filtro.value ? '#003DA5' : '#F3F4F6',
                      color: filtroTipo === filtro.value ? '#FFFFFF' : '#6B7280'
                    }}
                  >
                    {filtro.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-y-auto" style={{ height: 'calc(100vh - 200px)' }}>
              {notificacionesFiltradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <CheckCircle className="w-16 h-16 mb-3" style={{ color: '#10B981' }} />
                  <p className="font-bold mb-1" style={{ color: '#1F2937' }}>
                    ¡Todo al día!
                  </p>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    No tienes notificaciones en esta categoría
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {notificacionesFiltradas.map((notif) => (
                    <motion.div
                      key={notif.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-xl border-2 cursor-pointer hover:shadow-md transition-all"
                      style={{
                        background: notif.leida ? '#FFFFFF' : '#F0F7FF',
                        borderColor: notif.leida ? '#E5E7EB' : '#003DA5'
                      }}
                      onClick={() => {
                        if (!notif.leida) marcarComoLeida(notif.id);
                        if (notif.proceso) toast.info(`Abriendo ${notif.proceso}`);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="p-2 rounded-lg flex-shrink-0"
                          style={{
                            background: notif.urgencia === 'critico' ? '#FEE2E2' : notif.urgencia === 'urgente' ? '#FEF3C7' : '#E0EDFF'
                          }}
                        >
                          {notif.tipo === 'vencimiento' ? (
                            <Clock className="w-4 h-4" style={{
                              color: notif.urgencia === 'critico' ? '#DC2626' : '#F59E0B'
                            }} />
                          ) : notif.tipo === 'aprobacion' ? (
                            <CheckCircle className="w-4 h-4" style={{ color: '#003DA5' }} />
                          ) : (
                            <User className="w-4 h-4" style={{ color: '#003DA5' }} />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-bold text-sm" style={{ color: '#1F2937' }}>
                              {notif.titulo}
                            </p>
                            {notif.urgencia === 'critico' && (
                              <Badge className="text-xs flex-shrink-0" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                                CRÍTICO
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm mb-2" style={{ color: '#6B7280' }}>
                            {notif.mensaje}
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs" style={{ color: '#9CA3AF' }}>
                              {notif.fecha}
                            </p>
                            {notif.proceso && (
                              <Badge className="text-xs" style={{ background: '#E0EDFF', color: '#003DA5' }}>
                                {notif.proceso}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <button
                onClick={marcarTodasLeidas}
                className="w-full px-4 py-2.5 rounded-xl font-semibold text-sm"
                style={{ background: '#F3F4F6', color: '#4B5563' }}
              >
                Marcar todas como leídas
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ==================== FORMULARIO SIMPLIFICADO ====================
function FormWithProgress({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-2xl rounded-2xl shadow-2xl"
        style={{ background: '#FFFFFF' }}
      >
        <div className="p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-extrabold" style={{ color: '#003DA5' }}>
              Nueva Noticia Disciplinaria
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" style={{ color: '#6B7280' }} />
            </button>
          </div>

          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>
              Paso {step} de 4
            </p>
            <p className="text-sm font-semibold" style={{ color: '#003DA5' }}>
              {(step / 4 * 100)}% completado
            </p>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${(step / 4) * 100}%` }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #003DA5 0%, #0052E0 100%)' }}
            />
          </div>
        </div>

        <div className="p-6">
          <p className="text-center" style={{ color: '#6B7280' }}>
            Formulario de nueva noticia (Paso {step}/4)
          </p>
        </div>

        <div className="p-6 border-t flex items-center justify-between" style={{ borderColor: '#E5E7EB' }}>
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="px-6 py-2.5 rounded-xl font-semibold disabled:opacity-50"
            style={{ background: '#F3F4F6', color: '#4B5563' }}
          >
            Anterior
          </button>

          {step < 4 ? (
            <button
              onClick={() => setStep(Math.min(4, step + 1))}
              className="px-6 py-2.5 rounded-xl font-semibold"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={() => {
                toast.success('Noticia radicada exitosamente');
                onClose();
              }}
              className="px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2"
              style={{ background: '#10B981', color: '#FFFFFF' }}
            >
              <CheckCircle className="w-4 h-4" />
              Radicar
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================
export function ControlDisciplinarioUltimate() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [hoveredProceso, setHoveredProceso] = useState<string | null>(null);
  const [filtrosGuardados] = useState<FiltroGuardado[]>([
    { id: '1', nombre: 'Mis vencidos esta semana', filtros: { semaforo: 'rojo' } },
    { id: '2', nombre: 'En valoración', filtros: { estado: 'Valoración' } }
  ]);

  const procesos = PROCESOS_MOCK.filter(p =>
    p.consecutivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.disciplinable.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.cedula.includes(searchTerm)
  );

  const noLeidas = NOTIFICACIONES_MOCK.filter(n => !n.leida).length;

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'k':
            e.preventDefault();
            document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
            break;
          case 'n':
            e.preventDefault();
            setShowForm(true);
            toast.info('Nueva noticia (Ctrl+N)');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);

  return (
    <div className="w-full min-h-screen" style={{ background: '#F9FAFB' }}>
      {/* Header */}
      <div className="border-b" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-extrabold mb-1" style={{ color: '#003DA5' }}>
                Control Interno Disciplinario
              </h1>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Vista Ultimate - Sistema completo con mejoras de usabilidad
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowNotifications(true)}
                className="relative p-3 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <Bell className="w-5 h-5" style={{ color: '#6B7280' }} />
                {noLeidas > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: '#DC2626', color: '#FFFFFF' }}
                  >
                    {noLeidas}
                  </motion.div>
                )}
              </button>

              <button
                onClick={() => setShowForm(true)}
                className="px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:opacity-90"
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <Plus className="w-4 h-4" />
                Nueva Noticia
              </button>

              <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#F3F4F6' }}>
                <button
                  onClick={() => setViewMode('table')}
                  className="p-2 rounded-lg"
                  style={{
                    background: viewMode === 'table' ? '#003DA5' : 'transparent',
                    color: viewMode === 'table' ? '#FFFFFF' : '#6B7280'
                  }}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className="p-2 rounded-lg"
                  style={{
                    background: viewMode === 'cards' ? '#003DA5' : 'transparent',
                    color: viewMode === 'cards' ? '#FFFFFF' : '#6B7280'
                  }}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
              <input
                type="text"
                placeholder="Buscar por proceso, nombre, cédula... (Ctrl+K)"
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                style={{ borderColor: '#E5E7EB' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              className="px-4 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-gray-200"
              style={{ background: '#F3F4F6', color: '#4B5563' }}
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
          </div>

          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            <span className="text-xs font-semibold whitespace-nowrap" style={{ color: '#9CA3AF' }}>
              FILTROS GUARDADOS:
            </span>
            {filtrosGuardados.map((filtro) => (
              <button
                key={filtro.id}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-blue-100 whitespace-nowrap"
                style={{ background: '#E0EDFF', color: '#003DA5' }}
                onClick={() => toast.info(`Aplicando: ${filtro.nombre}`)}
              >
                <Star className="w-3 h-3" />
                {filtro.nombre}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-6">
        {viewMode === 'table' ? (
          <div className="space-y-3">
            {procesos.map((proceso) => (
              <div key={proceso.id} className="relative">
                <motion.div
                  whileHover={{ scale: 1.005, y: -2 }}
                  onHoverStart={() => setHoveredProceso(proceso.id)}
                  onHoverEnd={() => setHoveredProceso(null)}
                  className="p-5 rounded-xl border-2 hover:border-[#003DA5] hover:shadow-lg cursor-pointer"
                  style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 ring-4"
                        style={{
                          background: proceso.semaforo === 'verde' ? '#10B981' : proceso.semaforo === 'amarillo' ? '#FFC107' : '#DC3545',
                          ringColor: proceso.semaforo === 'verde' ? '#D1FAE5' : proceso.semaforo === 'amarillo' ? '#FEF3C7' : '#FEE2E2'
                        }}
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-extrabold text-lg" style={{ color: '#003DA5' }}>
                            {proceso.consecutivo}
                          </p>
                          <Badge 
                            className="text-xs font-semibold"
                            style={{
                              background: proceso.semaforo === 'rojo' ? '#FEE2E2' : proceso.semaforo === 'amarillo' ? '#FEF3C7' : '#D1FAE5',
                              color: proceso.semaforo === 'rojo' ? '#DC2626' : proceso.semaforo === 'amarillo' ? '#D97706' : '#059669'
                            }}
                          >
                            {proceso.estado}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium" style={{ color: '#1F2937' }}>
                          {proceso.disciplinable}
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                          {proceso.ultimaActuacion}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5', fontSize: '11px' }}>
                            {proceso.profesional.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                            Profesional
                          </p>
                          <p className="text-sm font-medium" style={{ color: '#1F2937' }}>
                            {proceso.profesional}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5" style={{ color: proceso.diasRestantes > 0 ? '#10B981' : '#DC2626' }} />
                        <div>
                          <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                            {proceso.diasRestantes > 0 ? 'Quedan' : 'Vencido'}
                          </p>
                          <p className="text-sm font-bold" style={{ color: proceso.diasRestantes > 0 ? '#10B981' : '#DC2626' }}>
                            {proceso.diasRestantes > 0 ? `${proceso.diasRestantes} días` : `${Math.abs(proceso.diasRestantes)} días`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-5 h-5" style={{ color: '#003DA5' }} />
                        <div>
                          <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                            Documentos
                          </p>
                          <p className="text-sm font-bold" style={{ color: '#1F2937' }}>
                            {proceso.documentos}
                          </p>
                        </div>
                      </div>

                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <MoreVertical className="w-5 h-5" style={{ color: '#6B7280' }} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                        PROGRESO DE TIEMPO
                      </span>
                      <span className="text-xs font-bold" style={{ color: '#003DA5' }}>
                        {proceso.porcentajeTiempo}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(proceso.porcentajeTiempo, 100)}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full rounded-full"
                        style={{
                          background: proceso.semaforo === 'rojo'
                            ? 'linear-gradient(90deg, #DC3545 0%, #EF4444 100%)'
                            : proceso.semaforo === 'amarillo'
                            ? 'linear-gradient(90deg, #F59E0B 0%, #FFC107 100%)'
                            : 'linear-gradient(90deg, #10B981 0%, #34D399 100%)'
                        }}
                      />
                    </div>
                  </div>
                </motion.div>

                <AnimatePresence>
                  {hoveredProceso === proceso.id && (
                    <PreviewCard
                      proceso={proceso}
                      onClose={() => setHoveredProceso(null)}
                    />
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {procesos.map((proceso) => (
              <motion.div
                key={proceso.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.03, y: -4 }}
              >
                <Card className="p-5 h-full hover:shadow-2xl cursor-pointer border-2" style={{ borderColor: '#E5E7EB' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full ring-4"
                        style={{
                          background: proceso.semaforo === 'verde' ? '#10B981' : proceso.semaforo === 'amarillo' ? '#FFC107' : '#DC3545',
                          ringColor: proceso.semaforo === 'verde' ? '#D1FAE5' : proceso.semaforo === 'amarillo' ? '#FEF3C7' : '#FEE2E2'
                        }}
                      />
                      <p className="font-extrabold text-lg" style={{ color: '#003DA5' }}>
                        {proceso.consecutivo}
                      </p>
                    </div>
                    <Badge className="text-xs font-semibold" style={{
                      background: proceso.semaforo === 'rojo' ? '#FEE2E2' : proceso.semaforo === 'amarillo' ? '#FEF3C7' : '#D1FAE5',
                      color: proceso.semaforo === 'rojo' ? '#DC2626' : proceso.semaforo === 'amarillo' ? '#D97706' : '#059669'
                    }}>
                      {proceso.diasRestantes > 0 ? `${proceso.diasRestantes}d` : 'Vencido'}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="font-bold mb-1" style={{ color: '#1F2937' }}>
                        {proceso.disciplinable}
                      </p>
                      <p className="text-sm" style={{ color: '#6B7280' }}>
                        CC: {proceso.cedula}
                      </p>
                    </div>

                    <div>
                      <Badge className="text-xs mb-2 font-semibold" style={{ background: '#F3F4F6', color: '#4B5563' }}>
                        {proceso.estado}
                      </Badge>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>
                        {proceso.ultimaActuacion}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                          Progreso
                        </span>
                        <span className="text-xs font-bold" style={{ color: '#003DA5' }}>
                          {proceso.porcentajeTiempo}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(proceso.porcentajeTiempo, 100)}%`,
                            background: proceso.semaforo === 'rojo'
                              ? 'linear-gradient(90deg, #DC3545 0%, #EF4444 100%)'
                              : proceso.semaforo === 'amarillo'
                              ? 'linear-gradient(90deg, #F59E0B 0%, #FFC107 100%)'
                              : 'linear-gradient(90deg, #10B981 0%, #34D399 100%)'
                          }}
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: '#E5E7EB' }}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5', fontSize: '10px' }}>
                            {proceso.profesional.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium" style={{ color: '#6B7280' }}>
                          {proceso.profesional}
                        </span>
                      </div>
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <Eye className="w-4 h-4" style={{ color: '#003DA5' }} />
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <Card className="p-5 mt-6 border-2" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: '#E0EDFF' }}>
              <Command className="w-6 h-6" style={{ color: '#003DA5' }} />
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <kbd className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold" style={{ background: '#F3F4F6', color: '#4B5563' }}>
                  Ctrl+K
                </kbd>
                <span className="text-sm font-medium" style={{ color: '#6B7280' }}>Buscar</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold" style={{ background: '#F3F4F6', color: '#4B5563' }}>
                  Ctrl+N
                </kbd>
                <span className="text-sm font-medium" style={{ color: '#6B7280' }}>Nueva noticia</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold" style={{ background: '#F3F4F6', color: '#4B5563' }}>
                  Esc
                </kbd>
                <span className="text-sm font-medium" style={{ color: '#6B7280' }}>Cerrar modal</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      <AnimatePresence>
        {showForm && (
          <FormWithProgress onClose={() => setShowForm(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
