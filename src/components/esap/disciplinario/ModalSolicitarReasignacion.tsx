/**
 * MODAL SOLICITAR REASIGNACIÓN — WORLD CLASS ESAP SIGL v5.0
 * Vista única: selección de profesional destino + justificación
 */

import { useState, useMemo } from 'react';
import { UserCheck, Users, Search, Check, AlertTriangle, CheckCircle, AlertCircle, MapPin } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  WorldClassModal, WCLabel, WCTextarea, WCBotonPrimario, WCBotonSecundario,
  WCBadgeSemaforo, WCBarraCarga, WCAvatar, WCBadgeContrato, WCLeyendaSemaforo,
  WCWarningBox, wcSemaforo, WC_TOKENS
} from './WorldClassModalBase';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Persona  { nombre: string; tipoIdentificacion: string; numeroIdentificacion: string; }
interface Proceso  {
  id: string; numeroProceso: string; denunciado: Persona;
  etapaActual: string; profesionalAsignado: Persona | string | null; profesionalAsignadoId?: string;
}

interface Profesional {
  id: string; nombre: string; cargo: string; especialidad: string;
  procesosAsignados: number; capacidadMaxima: number;
  procesosVencidos: number; procesosEnRiesgo: number; procesosAlDia: number;
  estado: 'activo' | 'inactivo' | 'vacaciones';
  tipoContrato: 'Planta' | 'Contratista';
  territorial: string;
}

interface ModalSolicitarReasignacionProps {
  proceso: Proceso;
  onClose: () => void;
  onSolicitar: (profesionalId: string, profesionalNombre: string, justificacion: string, prioridad: 'urgente' | 'normal') => void;
}

// ─── Mock ────────────────────────────────────────────────────────────────────

const PROFESIONALES: Profesional[] = [
  { id: '1', nombre: 'Juan Pérez Rodríguez',  cargo: 'Prof. Especializado', especialidad: 'Derecho Disciplinario',   procesosAsignados: 8,  capacidadMaxima: 12, procesosVencidos: 1, procesosEnRiesgo: 2, procesosAlDia: 5, estado: 'activo',    tipoContrato: 'Planta',      territorial: 'Dirección Nacional'    },
  { id: '2', nombre: 'María Torres Gómez',    cargo: 'Prof. Universitario', especialidad: 'Derecho Administrativo', procesosAsignados: 6,  capacidadMaxima: 10, procesosVencidos: 0, procesosEnRiesgo: 1, procesosAlDia: 5, estado: 'activo',    tipoContrato: 'Contratista', territorial: 'Territorial Bogotá'    },
  { id: '3', nombre: 'Carlos Mendoza Silva',  cargo: 'Prof. Especializado', especialidad: 'Derecho Disciplinario',   procesosAsignados: 11, capacidadMaxima: 12, procesosVencidos: 2, procesosEnRiesgo: 3, procesosAlDia: 6, estado: 'activo',    tipoContrato: 'Planta',      territorial: 'Dirección Nacional'    },
  { id: '4', nombre: 'Ana González López',    cargo: 'Prof. Universitario', especialidad: 'Derecho Público',         procesosAsignados: 5,  capacidadMaxima: 10, procesosVencidos: 0, procesosEnRiesgo: 0, procesosAlDia: 5, estado: 'activo',    tipoContrato: 'Contratista', territorial: 'Territorial Antioquia' },
  { id: '5', nombre: 'Roberto Herrera Mora',  cargo: 'Prof. Especializado', especialidad: 'Derecho Disciplinario',   procesosAsignados: 2,  capacidadMaxima: 12, procesosVencidos: 0, procesosEnRiesgo: 0, procesosAlDia: 2, estado: 'activo',    tipoContrato: 'Planta',      territorial: 'Territorial Cundinamarca' },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export function ModalSolicitarReasignacion({ proceso, onClose, onSolicitar }: ModalSolicitarReasignacionProps) {
  const [seleccionado, setSeleccionado] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [prioridad, setPrioridad]       = useState<'urgente' | 'normal'>('normal');
  const [busqueda, setBusqueda]         = useState('');

  const lista = useMemo(() => {
    const t = busqueda.toLowerCase();
    const r = PROFESIONALES
      .filter(p => p.estado === 'activo')
      .filter(p => p.id !== proceso.profesionalAsignadoId)
      .filter(p => !t || p.nombre.toLowerCase().includes(t) || p.especialidad.toLowerCase().includes(t));
    return [...r].sort((a, b) => {
      const ord = { verde: 0, amarillo: 1, rojo: 2, gris: 3 };
      return ord[wcSemaforo(a.procesosAsignados, a.capacidadMaxima, a.estado)] -
             ord[wcSemaforo(b.procesosAsignados, b.capacidadMaxima, b.estado)];
    });
  }, [busqueda, proceso.profesionalAsignadoId]);

  const prof = PROFESIONALES.find(p => p.id === seleccionado);
  const nombreProfesionalActual =
    typeof proceso.profesionalAsignado === 'string'
      ? proceso.profesionalAsignado
      : proceso.profesionalAsignado?.nombre || '';
  const inicialesProfesionalActual = nombreProfesionalActual
    ? nombreProfesionalActual.split(' ').slice(0, 2).map(n => n[0]).join('')
    : '?';

  const handleSolicitar = () => {
    if (!seleccionado)           { toast.error('Selecciona el profesional destino'); return; }
    if (justificacion.length < 50) { toast.error('Justificación mínima: 50 caracteres'); return; }
    onSolicitar(prof!.id, prof!.nombre, justificacion, prioridad);
  };

  const pie = (
    <>
      <WCBotonSecundario onClick={onClose}>Cancelar</WCBotonSecundario>
      <WCBotonPrimario onClick={handleSolicitar} disabled={!seleccionado || justificacion.length < 50}>
        Solicitar Reasignación
      </WCBotonPrimario>
    </>
  );

  return (
    <WorldClassModal
      titulo="Solicitar Reasignación"
      subtitulo={`${proceso.numeroProceso} · ${proceso.denunciado.nombre}`}
      icono={<UserCheck className="w-5 h-5 text-white" />}
      pie={pie}
      onCerrar={onClose}
    >
      {/* Profesional actual */}
      {nombreProfesionalActual ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs text-white bg-gray-400 flex-shrink-0">
            {inicialesProfesionalActual}
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Profesional actual</p>
            <p className="text-sm font-bold text-gray-800">{nombreProfesionalActual}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs text-white bg-gray-300 flex-shrink-0">
            ?
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Profesional actual</p>
            <p className="text-sm text-gray-400 italic">Sin asignar</p>
          </div>
        </div>
      )}

      {/* Prioridad */}
      <div>
        <WCLabel>Prioridad de la solicitud</WCLabel>
        <div className="flex gap-2">
          {(['normal', 'urgente'] as const).map(p => (
            <button key={p} onClick={() => setPrioridad(p)}
              className="flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all"
              style={{
                borderColor: prioridad === p ? (p === 'urgente' ? '#DC2626' : WC_TOKENS.primary) : '#E5E7EB',
                background:  prioridad === p ? (p === 'urgente' ? '#FEF2F2' : WC_TOKENS.primaryBg) : '#FFF',
                color:       prioridad === p ? (p === 'urgente' ? '#DC2626' : WC_TOKENS.primary)   : '#6B7280',
              }}>
              {p === 'urgente' ? '🔴 Urgente' : '⚪ Normal'}
            </button>
          ))}
        </div>
      </div>

      {/* Búsqueda */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <WCLabel>Profesional destino</WCLabel>
          <WCLeyendaSemaforo />
        </div>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar profesional..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto">
          {lista.map(p => {
            const sem    = wcSemaforo(p.procesosAsignados, p.capacidadMaxima, p.estado);
            const noDisp = sem === 'rojo';
            const sel    = seleccionado === p.id;
            const cfg    = WC_TOKENS[sem];
            return (
              <div key={p.id}
                onClick={() => !noDisp && setSeleccionado(p.id)}
                className="relative flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all"
                style={{
                  borderColor: sel ? WC_TOKENS.primary : '#E5E7EB',
                  background:  sel ? WC_TOKENS.primaryBg : noDisp ? '#F9FAFB' : '#FFF',
                  opacity: noDisp ? 0.5 : 1,
                  cursor: noDisp ? 'not-allowed' : 'pointer',
                }}
              >
                <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full" style={{ background: cfg.dot }} />
                <WCAvatar nombre={p.nombre} seleccionado={sel} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm text-gray-900 truncate">{p.nombre}</p>
                    <WCBadgeSemaforo estado={sem} />
                  </div>
                  <p className="text-xs text-gray-500">{p.cargo} · {p.especialidad}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <WCBadgeContrato tipo={p.tipoContrato} />
                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" />{p.territorial.replace('Territorial ', '').replace('Dirección ', 'Dir. ')}
                    </span>
                  </div>
                  <WCBarraCarga asignados={p.procesosAsignados} capacidad={p.capacidadMaxima} semaforo={sem} />
                </div>
                {sel && (
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: WC_TOKENS.primary }}>
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Justificación */}
      <div>
        <WCLabel required>Justificación de la reasignación</WCLabel>
        <WCTextarea rows={4} value={justificacion} onChange={e => setJustificacion(e.target.value)}
          placeholder="Explica el motivo de la solicitud de reasignación (mínimo 50 caracteres)..." />
        <p className={`text-xs mt-1 ${justificacion.length < 50 ? 'text-gray-400' : 'text-green-600 font-semibold'}`}>
          {justificacion.length} caracteres {justificacion.length < 50 && `· faltan ${50 - justificacion.length}`}
        </p>
      </div>
    </WorldClassModal>
  );
}
