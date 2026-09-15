/**
 * FLUJO DE APROBACIÓN DE AUTOS POR JEFE DE OCID
 * Diseño actualizado alineado con el estándar ESAP (SIGL v5.1)
 * REFACTORIZADO: Recibe borradores y callbacks desde ControlDisciplinarioFull (estado compartido)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Search, CheckCircle, Calendar, Filter, Clock, AlertTriangle, Shield, Eye, X as XIcon, ArrowRight, UserCheck, Send
} from 'lucide-react';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { ModalRevisionAuto, type BorradorPendiente } from './ModalRevisionAuto';
import { disciplinaryService } from '../../services/api/disciplinary.service';
import { authService } from '../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';
import { toast } from 'sonner';

// ==================== UTILIDADES ====================

const getInitials = (nombre: string) => {
  const parts = nombre.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return nombre.substring(0, 2).toUpperCase();
};

const ESTADO_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  pendiente_revision: { label: 'Pendiente', bg: '#FEF3C7', text: '#92400E', border: '#FCD34D', icon: <Clock className="w-3 h-3" /> },
  en_revision: { label: 'En Revisión', bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD', icon: <Eye className="w-3 h-3" /> },
  aprobado: { label: 'Aprobado', bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7', icon: <CheckCircle className="w-3 h-3" /> },
  devuelto: { label: 'Devuelto', bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5', icon: <AlertTriangle className="w-3 h-3" /> },
};

const PRIORIDAD_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  alta: { label: 'Alta', bg: '#FEE2E2', text: '#DC2626' },
  media: { label: 'Media', bg: '#FEF3C7', text: '#D97706' },
  baja: { label: 'Baja', bg: '#DBEAFE', text: '#2563EB' },
};

// ==================== PROPS ====================

interface SolicitudReasignacion {
  id: string;
  procesoNumero: string;
  procesoId: string;
  etapaActual: string;
  profesionalActual: {
    nombre: string;
    id: string;
  };
  profesionalNuevo: {
    nombre: string;
    id: string;
    cargo: string;
    especialidad: string;
    cargaActual: string;
  };
  solicitadoPor: string;
  fechaSolicitud: string;
  justificacion: string;
  prioridad: 'urgente' | 'normal';
  denunciado: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  fechaResolucion?: string;
  observacionesJefe?: string;
  motivoRechazo?: string;
}

interface RevisionAprobacionJefeProps {
  borradores: BorradorPendiente[];
  solicitudesReasignacion?: SolicitudReasignacion[];
  onAprobar: (borradorId: string, comentarios: string, radicadorAsignadoId?: string) => void | Promise<void>;
  onDevolver: (borradorId: string, motivo: string, comentarios: string, archivos: File[]) => void;
  onSendJuridica?: (borradorId: string) => void;
  onAprobarReasignacion?: (solicitudId: string, observaciones: string) => void;
  onRechazarReasignacion?: (solicitudId: string, motivoRechazo: string) => void;
  onRefresh?: () => void | Promise<void>;
  modoEnvioJuridica?: boolean;
}

// ==================== COMPONENTE PRINCIPAL ====================

export function RevisionAprobacionJefe({
  borradores,
  solicitudesReasignacion = [],
  onAprobar,
  onDevolver,
  onSendJuridica,
  onAprobarReasignacion,
  onRechazarReasignacion,
  onRefresh,
  modoEnvioJuridica
}: RevisionAprobacionJefeProps) {
  const [borradorSeleccionado, setBorradorSeleccionado] = useState<BorradorPendiente | null>(null);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudReasignacion | null>(null);
  const currentUser = authService.getCurrentUser();
  const userRolesList = currentUser?.roles || [];
  const isJefe = userRolesList.some((r: any) => (typeof r === 'string' ? r : r?.code) === 'JEFE_DE_LA_OCID');
  const isRadicador = userRolesList.some((r: any) => {
    const c = typeof r === 'string' ? r : r?.code;
    return c === 'SECRETARIA_RADICADOR' || c === 'RADICADOR_DISCIPLINARIO' || c === 'RADICADOR';
  });
  const canSendJuridica =
    authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_SEND_TO_JURIDICA) ||
    authService.isSuperAdmin() ||
    userRolesList.some((r: any) => {
      const c = typeof r === 'string' ? r : r?.code;
      return c === 'ADMIN' || c === 'SUPER_ADMIN' || c === 'SECRETARIA_RADICADOR' || c === 'RADICADOR_DISCIPLINARIO' || c === 'RADICADOR';
    });
  const esSoloEnvioJuridica = modoEnvioJuridica ?? (!isJefe && (isRadicador || canSendJuridica));

  const [borradorEnvioJuridica, setBorradorEnvioJuridica] = useState<BorradorPendiente | null>(null);
  const [enviandoJuridica, setEnviandoJuridica] = useState(false);

  // Solo mostrar los autos que requieren envío a jurídica si estamos en modo envío a jurídica
  const borradoresParaMostrar = esSoloEnvioJuridica
    ? borradores.filter(b => 
        b.estado === 'aprobado' && 
        (b.titulo?.toLowerCase().includes('pliego') || b.plantilla?.toLowerCase().includes('pliego') || b.titulo?.toLowerCase().includes('cargo') || b.plantilla?.toLowerCase().includes('cargo') || b.tipo === 'PLIEGO_CARGOS' || b.tipo === 'AUTO_FORMULACION_PLIEGO')
      )
    : borradores;
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente_revision' | 'en_revision' | 'aprobado' | 'devuelto'>('todos');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'autos' | 'reasignaciones'>('todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [mostrarFiltroFecha, setMostrarFiltroFecha] = useState(false);

  const pendientes = borradoresParaMostrar.filter(b => b.estado === 'pendiente_revision').length;
  const enRevision = borradoresParaMostrar.filter(b => b.estado === 'en_revision').length;
  const aprobados = borradoresParaMostrar.filter(b => b.estado === 'aprobado').length;
  const devueltos = borradoresParaMostrar.filter(b => b.estado === 'devuelto').length;
  const activos = pendientes + enRevision;

  // ✅ NUEVO: Estadísticas de reasignaciones
  const reasignacionesPendientes = solicitudesReasignacion.filter(s => s.estado === 'pendiente').length;
  const reasignacionesAprobadas = solicitudesReasignacion.filter(s => s.estado === 'aprobada').length;
  const reasignacionesRechazadas = solicitudesReasignacion.filter(s => s.estado === 'rechazada').length;

  const borradorsFiltrados = borradoresParaMostrar.filter(b => {
    const matchesSearch = searchQuery === '' || 
      b.numeroProceso.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.profesional.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.denunciado.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesEstado = esSoloEnvioJuridica || filtroEstado === 'todos' || b.estado === filtroEstado;

    // Filtro por fecha
    let matchesFecha = true;
    if (fechaDesde || fechaHasta) {
      const fechaEnvio = new Date(b.fechaEnvio);
      fechaEnvio.setHours(0, 0, 0, 0);
      if (fechaDesde) {
        const desde = new Date(fechaDesde + 'T00:00:00');
        if (fechaEnvio < desde) matchesFecha = false;
      }
      if (fechaHasta) {
        const hasta = new Date(fechaHasta + 'T23:59:59');
        if (fechaEnvio > hasta) matchesFecha = false;
      }
    }
    
    return matchesSearch && matchesEstado && matchesFecha;
  });

  // ✅ NUEVO: Filtrar reasignaciones
  const reasignacionesFiltradas = solicitudesReasignacion.filter(s => {
    const matchesSearch = searchQuery === '' || 
      s.procesoNumero.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.denunciado.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.profesionalActual.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.profesionalNuevo.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filtro por estado solo para reasignaciones
    let matchesEstado = true;
    if (filtroTipo === 'reasignaciones') {
      matchesEstado = filtroEstado === 'todos' ||
        (filtroEstado === 'pendiente_revision' && s.estado === 'pendiente') ||
        (filtroEstado === 'en_revision' && s.estado === 'pendiente') ||
        (filtroEstado === 'aprobado' && s.estado === 'aprobada') ||
        (filtroEstado === 'devuelto' && s.estado === 'rechazada');
    }

    // Filtro por fecha
    let matchesFecha = true;
    if (fechaDesde || fechaHasta) {
      const fechaSol = new Date(s.fechaSolicitud);
      fechaSol.setHours(0, 0, 0, 0);
      if (fechaDesde) {
        const desde = new Date(fechaDesde + 'T00:00:00');
        if (fechaSol < desde) matchesFecha = false;
      }
      if (fechaHasta) {
        const hasta = new Date(fechaHasta + 'T23:59:59');
        if (fechaSol > hasta) matchesFecha = false;
      }
    }
    
    return matchesSearch && matchesEstado && matchesFecha;
  });

  // Ordenar: pendientes primero, luego en_revision, luego devueltos, luego aprobados
  const orden: Record<string, number> = { pendiente_revision: 0, en_revision: 1, devuelto: 2, aprobado: 3 };
  const borradoresOrdenados = [...borradorsFiltrados].sort((a, b) => 
    (orden[a.estado] ?? 4) - (orden[b.estado] ?? 4)
  );

  // ✅ NUEVO: Ordenar reasignaciones - pendientes primero
  const reasignacionesOrdenadas = [...reasignacionesFiltradas].sort((a, b) => {
    const ordenReasignacion: Record<string, number> = { pendiente: 0, aprobada: 1, rechazada: 2 };
    return (ordenReasignacion[a.estado] ?? 3) - (ordenReasignacion[b.estado] ?? 3);
  });

  const handleAprobar = async (comentarios: string, radicadorAsignadoId?: string) => {
    if (borradorSeleccionado) {
      await onAprobar(borradorSeleccionado.id, comentarios, radicadorAsignadoId);
      setBorradorSeleccionado(null);
    }
  };

  const handleDevolver = (motivo: string, comentarios: string, archivos: File[]) => {
    if (borradorSeleccionado) {
      onDevolver(borradorSeleccionado.id, motivo, comentarios, archivos);
      setBorradorSeleccionado(null);
    }
  };

  const handleConfirmarEnvioJuridica = async () => {
    if (!borradorEnvioJuridica) return;
    try {
      setEnviandoJuridica(true);
      const currentUser = authService.getCurrentUser();
      const userId = currentUser?.id || '';
      await disciplinaryService.sendJuridica(
        borradorEnvioJuridica.id,
        userId,
        currentUser?.email,
        currentUser?.fullName || currentUser?.firstName
      );
      toast.success('Proceso enviado a Jurídica exitosamente', {
        description: `El proceso ${borradorEnvioJuridica.numeroProceso} ha sido remitido a la Oficina Jurídica.`,
      });
      if (onSendJuridica) {
        onSendJuridica(borradorEnvioJuridica.id);
      }
      setBorradorEnvioJuridica(null);
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err: any) {
      console.error('Error enviando a jurídica:', err);
      toast.error('Error al enviar a Jurídica', {
        description: err.message || 'No fue posible completar el envío a jurídica.',
      });
    } finally {
      setEnviandoJuridica(false);
    }
  };

  const FILTROS_AUTOS = [
    { id: 'todos' as const, label: 'Todos', count: borradores.length },
    { id: 'pendiente_revision' as const, label: 'Pendientes', count: pendientes },
    { id: 'en_revision' as const, label: 'En Revisión', count: enRevision },
    { id: 'aprobado' as const, label: 'Aprobados', count: aprobados },
    { id: 'devuelto' as const, label: 'Devueltos', count: devueltos },
  ];

  const FILTROS_REASIGNACIONES = [
    { id: 'todos' as const, label: 'Todos', count: solicitudesReasignacion.length },
    { id: 'pendiente_revision' as const, label: 'Pendientes', count: reasignacionesPendientes },
    { id: 'en_revision' as const, label: 'En Revisión', count: reasignacionesPendientes },
    { id: 'aprobado' as const, label: 'Aprobadas', count: reasignacionesAprobadas },
    { id: 'devuelto' as const, label: 'Rechazadas', count: reasignacionesRechazadas },
  ];

  const FILTROS = filtroTipo === 'reasignaciones' ? FILTROS_REASIGNACIONES : FILTROS_AUTOS;

  const hayFiltroFechaActivo = fechaDesde !== '' || fechaHasta !== '';

  const limpiarFiltroFecha = () => {
    setFechaDesde('');
    setFechaHasta('');
  };

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#f0f2f5' }}>
      {/* Header - Estándar Corporativo ESAP */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: esSoloEnvioJuridica ? '#ECFDF5' : '#D1FAE5' }}>
              {esSoloEnvioJuridica ? (
                <Send style={{ width: 20, height: 20, color: '#059669' }} />
              ) : (
                <Shield style={{ width: 20, height: 20, color: '#10B981' }} />
              )}
            </div>
            <div>
              <h1 className="text-lg font-black" style={{ color: '#003DA5' }}>
                {esSoloEnvioJuridica ? 'Envío a Jurídica' : 'Revisión y Aprobación de Autos'}
              </h1>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {esSoloEnvioJuridica 
                  ? 'Bandeja de Radicación · Autos Aprobados para Remisión Legal · SIGL v5.1'
                  : 'Bandeja del Jefe OCID · SIGL v5.1'}
              </p>
            </div>
          </div>

          {/* Stats rápidas */}
          <div className="flex items-center gap-2">
            {esSoloEnvioJuridica ? (
              <div className="px-3.5 py-1.5 rounded-lg border flex items-center gap-2.5" style={{ background: '#ECFDF5', borderColor: '#A7F3D0' }}>
                <Send style={{ width: 14, height: 14, color: '#059669' }} />
                <div>
                  <p className="text-[10px] text-gray-600 font-medium">Pendientes de Envío a Jurídica</p>
                  <p className="text-lg font-black text-emerald-700">{borradoresParaMostrar.length}</p>
                </div>
              </div>
            ) : (
              /* Tabs para cambiar entre Autos y Reasignaciones */
              <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100">
                <button
                  onClick={() => setFiltroTipo('autos')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    filtroTipo === 'autos' 
                      ? 'bg-white shadow-sm text-[#003DA5]' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Autos ({borradores.length})
                </button>
                <button
                  onClick={() => setFiltroTipo('reasignaciones')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                    filtroTipo === 'reasignaciones' 
                      ? 'bg-white shadow-sm text-[#003DA5]' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Reasignaciones ({solicitudesReasignacion.length})
                  {reasignacionesPendientes > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                      {reasignacionesPendientes}
                    </span>
                  )}
                </button>
              </div>
            )}
            
            {filtroTipo === 'autos' && (
              <>
                <div className="px-3 py-1.5 rounded-lg border" style={{ background: '#FEF3C7', borderColor: '#FCD34D' }}>
                  <p className="text-[10px] text-gray-600 font-medium">Pendientes</p>
                  <p className="text-lg font-black text-amber-700">{pendientes}</p>
                </div>
                <div className="px-3 py-1.5 rounded-lg border" style={{ background: '#DBEAFE', borderColor: '#93C5FD' }}>
                  <p className="text-[10px] text-gray-600 font-medium">En Revisión</p>
                  <p className="text-lg font-black" style={{ color: '#003DA5' }}>{enRevision}</p>
                </div>
                <div className="px-3 py-1.5 rounded-lg border" style={{ background: '#D1FAE5', borderColor: '#6EE7B7' }}>
                  <p className="text-[10px] text-gray-600 font-medium">Aprobados</p>
                  <p className="text-lg font-black text-green-700">{aprobados}</p>
                </div>
                {devueltos > 0 && (
                  <div className="px-3 py-1.5 rounded-lg border" style={{ background: '#FEE2E2', borderColor: '#FCA5A5' }}>
                    <p className="text-[10px] text-gray-600 font-medium">Devueltos</p>
                    <p className="text-lg font-black text-red-700">{devueltos}</p>
                  </div>
                )}
              </>
            )}
            
            {filtroTipo === 'reasignaciones' && (
              <>
                <div className="px-3 py-1.5 rounded-lg border" style={{ background: '#FEF3C7', borderColor: '#FCD34D' }}>
                  <p className="text-[10px] text-gray-600 font-medium">Pendientes</p>
                  <p className="text-lg font-black text-amber-700">{reasignacionesPendientes}</p>
                </div>
                <div className="px-3 py-1.5 rounded-lg border" style={{ background: '#D1FAE5', borderColor: '#6EE7B7' }}>
                  <p className="text-[10px] text-gray-600 font-medium">Aprobadas</p>
                  <p className="text-lg font-black text-green-700">{reasignacionesAprobadas}</p>
                </div>
                {reasignacionesRechazadas > 0 && (
                  <div className="px-3 py-1.5 rounded-lg border" style={{ background: '#FEE2E2', borderColor: '#FCA5A5' }}>
                    <p className="text-[10px] text-gray-600 font-medium">Rechazadas</p>
                    <p className="text-lg font-black text-red-700">{reasignacionesRechazadas}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Buscador y Filtros */}
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ width: 16, height: 16, color: '#9CA3AF' }} />
            <input
              type="text"
              placeholder="Buscar por proceso, título, profesional o denunciado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 text-sm focus:outline-none bg-white"
              style={{ borderColor: searchQuery ? '#003DA5' : '#E5E7EB' }}
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {esSoloEnvioJuridica ? (
              <button
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm flex items-center gap-1.5"
                style={{ background: '#003DA5' }}
              >
                <Send style={{ width: 12, height: 12 }} />
                Pendientes de Envío ({borradorsFiltrados.length})
              </button>
            ) : (
              FILTROS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFiltroEstado(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filtroEstado === f.id ? 'text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                  style={filtroEstado === f.id ? { background: '#003DA5' } : undefined}
                >
                  {f.label} ({f.count})
                </button>
              ))
            )}

            {/* Separador visual */}
            <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

            {/* Botón filtro de fecha */}
            <button
              onClick={() => {
                if (hayFiltroFechaActivo && mostrarFiltroFecha) {
                  limpiarFiltroFecha();
                } else {
                  setMostrarFiltroFecha(!mostrarFiltroFecha);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                hayFiltroFechaActivo
                  ? 'text-white shadow-sm'
                  : mostrarFiltroFecha
                    ? 'bg-blue-50 border border-blue-300'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
              style={hayFiltroFechaActivo ? { background: '#003DA5' } : mostrarFiltroFecha ? { color: '#003DA5' } : undefined}
            >
              <Calendar style={{ width: 12, height: 12 }} />
              {hayFiltroFechaActivo
                ? `${fechaDesde || '...'} — ${fechaHasta || '...'}`
                : 'Filtrar por Fecha'}
            </button>

            {/* Limpiar filtro de fecha (si activo) */}
            {hayFiltroFechaActivo && (
              <button
                onClick={() => { limpiarFiltroFecha(); setMostrarFiltroFecha(false); }}
                className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-all"
                style={{ width: 28, height: 28, minWidth: 28, minHeight: 28 }}
                title="Limpiar filtro de fecha"
              >
                <XIcon style={{ width: 12, height: 12, color: '#DC2626' }} />
              </button>
            )}
          </div>

          {/* Panel de fecha expandible */}
          <AnimatePresence>
            {mostrarFiltroFecha && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <Calendar style={{ width: 14, height: 14, color: '#003DA5' }} />
                    <span className="text-[11px] font-bold text-gray-600">Rango de fecha de envío:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <label className="text-[9px] font-bold text-gray-400 mb-0.5 uppercase tracking-wider">Desde</label>
                      <input
                        type="date"
                        value={fechaDesde}
                        onChange={(e) => setFechaDesde(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none bg-white"
                        style={{ borderColor: fechaDesde ? '#003DA5' : '#E5E7EB', minWidth: 140 }}
                      />
                    </div>
                    <span className="text-gray-300 text-sm font-bold mt-4">—</span>
                    <div className="flex flex-col">
                      <label className="text-[9px] font-bold text-gray-400 mb-0.5 uppercase tracking-wider">Hasta</label>
                      <input
                        type="date"
                        value={fechaHasta}
                        onChange={(e) => setFechaHasta(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none bg-white"
                        style={{ borderColor: fechaHasta ? '#003DA5' : '#E5E7EB', minWidth: 140 }}
                      />
                    </div>
                  </div>
                  {hayFiltroFechaActivo && (
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#EFF6FF', color: '#003DA5' }}>
                        {borradorsFiltrados.length} resultado{borradorsFiltrados.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={() => { limpiarFiltroFecha(); }}
                        className="text-[10px] font-bold text-red-500 hover:text-red-700 underline transition-colors"
                      >
                        Limpiar
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Lista de Borradores */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {/* ✅ MOSTRAR AUTOS SEGÚN TAB SELECCIONADO */}
            {(filtroTipo === 'autos' || filtroTipo === 'todos') && borradoresOrdenados.map((borrador) => {
              const initials = getInitials(borrador.profesional.nombre);
              const estadoCfg = ESTADO_CONFIG[borrador.estado] || ESTADO_CONFIG.pendiente_revision;
              const prioridadCfg = PRIORIDAD_CONFIG[borrador.prioridad] || PRIORIDAD_CONFIG.media;
              const esActivo = borrador.estado === 'pendiente_revision' || borrador.estado === 'en_revision';
              const esListoParaJuridica = (borrador.titulo?.toLowerCase().includes('pliego') || borrador.plantilla?.toLowerCase().includes('pliego')) && borrador.estado === 'aprobado';
              
              return (
                <motion.div
                  key={borrador.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className={`bg-white rounded-xl border-2 px-4 py-3.5 transition-all ${
                    esSoloEnvioJuridica
                      ? 'hover:shadow-lg cursor-pointer hover:border-emerald-400'
                      : esActivo
                        ? 'hover:shadow-lg cursor-pointer hover:border-blue-300'
                        : 'opacity-75'
                  }`}
                  style={{ borderColor: esSoloEnvioJuridica ? '#A7F3D0' : esActivo ? '#E5E7EB' : '#F3F4F6' }}
                  onClick={() => {
                    if (esSoloEnvioJuridica) {
                      setBorradorSeleccionado(borrador);
                    } else if (esActivo && authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_REVISION_APROBACION_MANAGE)) {
                      setBorradorSeleccionado(borrador);
                    } else if (esActivo) {
                      toast.error('No tiene permisos para revisar borradores');
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                      style={{ background: '#E0EDFF', color: '#003DA5' }}
                    >
                      {initials}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="min-w-0">
                          <h3 className="text-sm font-black text-gray-900 truncate">{borrador.titulo}</h3>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {borrador.numeroProceso} · {borrador.profesional.nombre}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Estado */}
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                            style={{ background: estadoCfg.bg, color: estadoCfg.text, borderColor: estadoCfg.border }}
                          >
                            {estadoCfg.icon}
                            {estadoCfg.label}
                          </span>
                          {borrador.estado === 'aprobado' && borrador.radicadorAsignadoNombre && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-purple-50 text-purple-700 border-purple-200">
                              <UserCheck style={{ width: 10, height: 10 }} />
                              {borrador.radicadorAsignadoNombre}
                            </span>
                          )}
                          {/* Prioridad */}
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: prioridadCfg.bg, color: prioridadCfg.text }}
                          >
                            {prioridadCfg.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar style={{ width: 11, height: 11 }} />
                          {new Date(borrador.fechaEnvio).toLocaleDateString('es-CO')}
                        </span>
                        <span>Versión {borrador.version}</span>
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">{borrador.etapa}</span>
                        {borrador.tiempoEspera && esActivo && (
                          <span className="flex items-center gap-1 font-medium" style={{ color: '#D97706' }}>
                            <Clock style={{ width: 11, height: 11 }} />
                            {borrador.tiempoEspera}
                          </span>
                        )}
                        <span className="text-gray-400">· {borrador.denunciado}</span>
                      </div>

                      {/* Observaciones de devolución si devuelto */}
                      {borrador.estado === 'devuelto' && borrador.historial.filter(h => h.tipo === 'devuelto').length > 0 && (
                        <div className="mt-2 p-2 rounded-lg border" style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
                          <div className="flex items-start gap-1.5">
                            <AlertTriangle style={{ width: 12, height: 12, color: '#DC2626', marginTop: 1, flexShrink: 0 }} />
                            <p className="text-[10px] text-red-800 leading-relaxed">
                              <strong>Motivo de devolución:</strong>{' '}
                              {borrador.historial.filter(h => h.tipo === 'devuelto').pop()?.descripcion}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Advertencia para auto pliego de cargos */}
                      {(borrador.titulo?.toLowerCase().includes('pliego') || borrador.plantilla?.toLowerCase().includes('pliego')) && esActivo && (
<div className="mt-2 p-2 rounded-lg border-2" style={{ background: '#FFFBEB', borderColor: '#F59E0B' }}>
                          <div className="flex items-start gap-1.5">
                            <AlertTriangle style={{ width: 12, height: 12, color: '#D97706', marginTop: 1, flexShrink: 0 }} />
                            <p className="text-[10px] leading-relaxed" style={{ color: '#92400E' }}>
                              <strong>Auto Pliego de Cargos:</strong> Al aprobar este auto, aparecerá la opción para <strong>enviar a la Oficina Jurídica</strong> y cerrar el proceso permanentemente.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Botón Envío a jurídica para autos aprobados de pliego de cargos */}
                      {borrador.estado === 'aprobado' && canSendJuridica && (esSoloEnvioJuridica || (borrador.titulo?.toLowerCase().includes('pliego') || borrador.plantilla?.toLowerCase().includes('pliego') || borrador.titulo?.toLowerCase().includes('cargo') || borrador.plantilla?.toLowerCase().includes('cargo') || borrador.tipo === 'PLIEGO_CARGOS' || borrador.tipo === 'AUTO_FORMULACION_PLIEGO')) && (
                        <div className="mt-2.5 flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBorradorEnvioJuridica(borrador);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition-all hover:shadow hover:brightness-110"
                            style={{ backgroundColor: '#2563EB' }}
                          >
                            <Send className="w-3.5 h-3.5" />
                            Enviar a Jurídica
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* ✅ NUEVO: Mostrar reasignaciones cuando está seleccionado el tab */}
          {filtroTipo === 'reasignaciones' && (
            <AnimatePresence mode="popLayout">
              {reasignacionesOrdenadas.map((solicitud) => {
                const initialsActual = getInitials(solicitud.profesionalActual.nombre);
                const initialsNuevo = getInitials(solicitud.profesionalNuevo.nombre);
                const esActiva = solicitud.estado === 'pendiente';
                
                const estadoReasignacionCfg = {
                  pendiente: { label: 'Pendiente', bg: '#FEF3C7', text: '#92400E', border: '#FCD34D', icon: <Clock className="w-3 h-3" /> },
                  aprobada: { label: 'Aprobada', bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7', icon: <CheckCircle className="w-3 h-3" /> },
                  rechazada: { label: 'Rechazada', bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5', icon: <AlertTriangle className="w-3 h-3" /> },
                };
                const estadoCfg = estadoReasignacionCfg[solicitud.estado] || estadoReasignacionCfg.pendiente;
                
                return (
                  <motion.div
                    key={solicitud.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    className={`bg-white rounded-xl border-2 px-4 py-3.5 transition-all ${
                      esActiva ? 'hover:shadow-lg cursor-pointer hover:border-blue-300' : 'opacity-75'
                    }`}
                    style={{ borderColor: esActiva ? '#E5E7EB' : '#F3F4F6' }}
                    onClick={() => {
                      if (esActiva && authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_REASIGNACION_APPROVE)) {
                        setSolicitudSeleccionada(solicitud);
                      } else if (esActiva) {
                        toast.error('No tiene permisos para revisar solicitudes de reasignación');
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar del profesional actual */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                        style={{ background: '#FEE2E2', color: '#DC2626' }}
                      >
                        {initialsActual}
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <div className="min-w-0">
                            <h3 className="text-sm font-black text-gray-900 truncate">
                              Reasignación: {solicitud.procesoNumero}
                            </h3>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {solicitud.etapaActual} · {solicitud.denunciado}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {/* Estado */}
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                              style={{ background: estadoCfg.bg, color: estadoCfg.text, borderColor: estadoCfg.border }}
                            >
                              {estadoCfg.icon}
                              {estadoCfg.label}
                            </span>
                            {/* Prioridad */}
                            {solicitud.prioridad === 'urgente' && (
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                style={{ background: '#FEE2E2', color: '#DC2626' }}
                              >
                                URGENTE
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Flujo de profesionales */}
                        <div className="flex items-center gap-2 my-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400 font-medium">De:</span>
                            <span className="text-xs font-bold text-gray-700">{solicitud.profesionalActual.nombre}</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400 font-medium">A:</span>
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[8px] text-white flex-shrink-0"
                              style={{ background: '#10B981' }}
                            >
                              {initialsNuevo}
                            </div>
                            <span className="text-xs font-bold text-green-700">{solicitud.profesionalNuevo.nombre}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar style={{ width: 11, height: 11 }} />
                            {new Date(solicitud.fechaSolicitud).toLocaleDateString('es-CO')}
                          </span>
                          <span className="text-gray-400">·</span>
                          <span className="text-gray-400">Solicitado por: {solicitud.solicitadoPor}</span>
                        </div>

                        {/* Justificación */}
                        <div className="mt-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                          <p className="text-[10px] text-gray-500 font-medium mb-0.5">Justificación:</p>
                          <p className="text-xs text-gray-700 line-clamp-2">{solicitud.justificacion}</p>
                        </div>

                        {/* Observaciones de rechazo si rechazada */}
                        {solicitud.estado === 'rechazada' && solicitud.motivoRechazo && (
                          <div className="mt-2 p-2 rounded-lg border" style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
                            <div className="flex items-start gap-1.5">
                              <AlertTriangle style={{ width: 12, height: 12, color: '#DC2626', marginTop: 1, flexShrink: 0 }} />
                              <p className="text-[10px] text-red-800 leading-relaxed">
                                <strong>Motivo de rechazo:</strong> {solicitud.motivoRechazo}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          {borradoresOrdenados.length === 0 && filtroTipo === 'autos' && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
              {esSoloEnvioJuridica ? (
                <>
                  <Send className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                  <p className="text-sm font-bold mb-1 text-gray-800">
                    {searchQuery ? 'No se encontraron autos con los filtros aplicados' : 'No hay autos pendientes de envío a Jurídica'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {searchQuery
                      ? 'Intenta ajustar los términos de búsqueda'
                      : 'Los autos de pliego de cargos aprobados por el Jefe OCID aparecerán aquí para su remisión a Jurídica.'}
                  </p>
                </>
              ) : (
                <>
                  <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: '#9CA3AF' }} />
                  <p className="text-sm font-bold mb-1 text-gray-500">No se encontraron borradores</p>
                  <p className="text-xs text-gray-400">
                    {searchQuery || filtroEstado !== 'todos' || hayFiltroFechaActivo
                      ? 'Intenta cambiar los filtros de búsqueda'
                      : 'Cuando un profesional envíe un auto a revisión, aparecerá aquí'}
                  </p>
                </>
              )}
            </div>
          )}

          {/* ✅ NUEVO: Empty state para reasignaciones */}
          {reasignacionesOrdenadas.length === 0 && filtroTipo === 'reasignaciones' && (
            <div className="text-center py-12">
              <UserCheck className="w-12 h-12 mx-auto mb-3" style={{ color: '#9CA3AF' }} />
              <p className="text-sm font-bold mb-1 text-gray-500">No se encontraron solicitudes</p>
              <p className="text-xs text-gray-400">
                {searchQuery || hayFiltroFechaActivo
                  ? 'Intenta cambiar los filtros de búsqueda'
                  : 'Cuando un profesional solicite una reasignación, aparecerá aquí'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Revisión - Componente Central Unificado */}
      <AnimatePresence>
        {borradorSeleccionado && (
          <ModalRevisionAuto
            borrador={borradorSeleccionado}
            onClose={() => setBorradorSeleccionado(null)}
            onAprobar={handleAprobar}
            onDevolver={handleDevolver}
            onRefresh={onRefresh}
            mostrarBotonDevolver={!esSoloEnvioJuridica}
            tituloModal={esSoloEnvioJuridica ? "Detalle de Auto - Listo para Envío a Jurídica" : "Revisión de Auto"}
            descripcionModal={`Sistema Integrado de Gestión Legal (SIGL v5.1) - ${borradorSeleccionado.numeroProceso}`}
          />
        )}
      </AnimatePresence>

      {/* Modal de confirmación para envío a jurídica */}
      {borradorEnvioJuridica && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Confirmar Envío a Jurídica</h3>
                <p className="text-xs text-gray-500">Proceso {borradorEnvioJuridica.numeroProceso}</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              ¿Está seguro de enviar este proceso a la Oficina Jurídica? Esta acción registrará la remisión en el expediente disciplinario.
            </p>

            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setBorradorEnvioJuridica(null)}
                disabled={enviandoJuridica}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmarEnvioJuridica}
                disabled={enviandoJuridica}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {enviandoJuridica ? 'Enviando...' : 'Confirmar Envío'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NUEVO: Modal para aprobar/rechazar reasignaciones */}
      {solicitudSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                {solicitudSeleccionada.estado === 'pendiente' 
                  ? 'Revisar Solicitud de Reasignación' 
                  : `Solicitud ${solicitudSeleccionada.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'}`}
              </h3>
              <button onClick={() => setSolicitudSeleccionada(null)} className="text-gray-500 hover:text-gray-700">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Información de la solicitud */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Proceso</p>
                    <p className="text-sm font-medium">{solicitudSeleccionada.procesoNumero}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Prioridad</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      solicitudSeleccionada.prioridad === 'urgente' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {solicitudSeleccionada.prioridad === 'urgente' ? 'Urgente' : 'Normal'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Profesional Actual</p>
                    <p className="text-sm font-medium">{solicitudSeleccionada.profesionalActual?.nombre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Profesional Solicitado</p>
                    <p className="text-sm font-medium text-green-600">{solicitudSeleccionada.profesionalNuevo?.nombre}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Etapa Actual</p>
                    <p className="text-sm font-medium">{solicitudSeleccionada.etapaActual}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Denunciado</p>
                    <p className="text-sm font-medium">{solicitudSeleccionada.denunciado}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500">Fecha de Solicitud</p>
                  <p className="text-sm font-medium">{new Date(solicitudSeleccionada.fechaSolicitud).toLocaleString('es-CO')}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500">Solicitado por</p>
                  <p className="text-sm font-medium">{solicitudSeleccionada.solicitadoPor}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500">Justificación</p>
                  <p className="text-sm text-gray-700 bg-white p-2 rounded border">{solicitudSeleccionada.justificacion}</p>
                </div>
              </div>
              
              {/* Solo mostrar botones de acción si está pendiente */}
              {solicitudSeleccionada.estado === 'pendiente' && (
                <div className="flex gap-3 pt-4 border-t">
                  {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_REASIGNACION_APPROVE) && (
                    <button
                      onClick={() => {
                        onAprobarReasignacion?.(solicitudSeleccionada.id, '');
                        setSolicitudSeleccionada(null);
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Aprobar Reasignación
                    </button>
                  )}
                  {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_REASIGNACION_APPROVE) && (
                    <button
                      onClick={() => {
                        onRechazarReasignacion?.(solicitudSeleccionada.id, 'Rechazado por el jefe');
                        setSolicitudSeleccionada(null);
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <XIcon className="w-4 h-4" />
                      Rechazar Reasignación
                    </button>
                  )}
                </div>
              )}
              
              {/* Mostrar estado si ya fue procesada */}
              {solicitudSeleccionada.estado !== 'pendiente' && (
                <div className={`p-4 rounded-lg text-center ${
                  solicitudSeleccionada.estado === 'aprobada' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  <p className="font-medium">
                    {solicitudSeleccionada.estado === 'aprobada' 
                      ? '✓ Solicitud aprobada' 
                      : '✗ Solicitud rechazada'}
                  </p>
                  {solicitudSeleccionada.fechaResolucion && (
                    <p className="text-sm mt-1">
                      {new Date(solicitudSeleccionada.fechaResolucion).toLocaleString('es-CO')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
