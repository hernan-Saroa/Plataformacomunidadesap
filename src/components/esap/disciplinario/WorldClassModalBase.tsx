/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║         WORLD CLASS MODAL — ESTÁNDAR OFICIAL ESAP SIGL v5.0                ║
 * ║         Control Interno Disciplinario · Backoffice Administrativo           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  REFERENCIA CANÓNICA DE DISEÑO — Aprobado 24 Feb 2026                       ║
 * ║  Modelo visual: screenshot "Editar Noticia Disciplinaria"                   ║
 * ║                                                                              ║
 * ║  REGLAS DE ORO                                                               ║
 * ║  ─────────────────────────────────────────────────────────────────────────  ║
 * ║  1. Overlay: fixed inset-0, rgba(0,0,0,0.55). SIN backdrop-blur.           ║
 * ║  2. Animación: opacity+scale 0.97→1 + y 12→0, duration 200ms. SIN spring.  ║
 * ║  3. Contenedor: rounded-2xl, shadow-2xl, 680-860px, maxHeight 90vh.        ║
 * ║  4. Header: gradiente #001A6E→#003DA5, ícono + título font-black + X.      ║
 * ║  5. Step bar: dentro del contenedor (fondo blanco), justo bajo header.     ║
 * ║  6. Body: overflow-y-auto, p-5/p-6, space-y-4. Fondo blanco puro.         ║
 * ║  7. Footer: flex-shrink-0, bg-gray-50, border-t, Cancelar+Acción.         ║
 * ║  8. SIN: glassmorphism, decoradores circulares, gradientes en body.        ║
 * ║  9. Responsive: p-4 en mobile, width 100% con max-w.                      ║
 * ║ 10. Labels: text-xs font-semibold text-gray-500 uppercase tracking-wide.   ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, AlertTriangle, AlertCircle } from 'lucide-react';

// ─── Design Tokens Oficiales ────────────────────────────────────────────────

export const WC_TOKENS = {
  // Gradientes
  headerGradient: 'linear-gradient(135deg, #001A6E 0%, #003DA5 100%)',
  buttonGradient: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)',

  // Colores
  primary:      '#003DA5',
  primaryLight: '#2962FF',
  primaryBg:    '#EEF4FF',

  // Semáforo
  verde:    { label: 'Disponible',    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', dot: '#059669' },
  amarillo: { label: 'Carga media',   color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', dot: '#D97706' },
  rojo:     { label: 'Sin cupo',      color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', dot: '#DC2626' },
  gris:     { label: 'No disponible', color: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB', dot: '#9CA3AF' },

  // Contrato
  contrato: {
    Planta:      { bg: '#EFF6FF', text: '#1E40AF' },
    Contratista: { bg: '#F5F3FF', text: '#5B21B6' },
    OPS:         { bg: '#FFF7ED', text: '#C2410C' },
  },

  // Dimensiones
  widthDefault: 680,
  widthWide:    860,
  maxHeight:    '90vh',

  // Animación estándar (NO spring)
  motionInitial:    { opacity: 0, scale: 0.97, y: 12 } as const,
  motionAnimate:    { opacity: 1, scale: 1,    y: 0  } as const,
  motionExit:       { opacity: 0, scale: 0.97, y: 12 } as const,
  motionTransition: { duration: 0.2 } as const,
} as const;

// ─── Tipos base ──────────────────────────────────────────────────────────────

export interface WCPaso {
  numero: number;
  label: string;
}

export interface WorldClassModalProps {
  titulo: string;
  subtitulo?: string;
  icono: ReactNode;
  ancho?: number;
  children: ReactNode;
  pie: ReactNode;
  onCerrar: () => void;
}

export interface WorldClassWizardProps {
  titulo: string;
  subtitulo?: string;
  icono: ReactNode;
  ancho?: number;
  pasos: WCPaso[];
  pasoActual: number;
  children: ReactNode;
  pie: ReactNode;
  onCerrar: () => void;
}

// ─── Step Indicator ─────────────────────────────────────────────────────────

export function WCStepIndicator({ pasos, pasoActual }: { pasos: WCPaso[]; pasoActual: number }) {
  return (
    <div className="flex items-center justify-center px-5 py-3 border-b border-gray-100 bg-white">
      {pasos.map((paso, idx) => {
        const completado = pasoActual > paso.numero;
        const activo     = pasoActual === paso.numero;
        return (
          <div key={paso.numero} className="flex items-center">
            {/* Círculo */}
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs transition-all"
                style={{
                  background: completado
                    ? '#059669'
                    : activo
                      ? WC_TOKENS.primary
                      : '#F3F4F6',
                  color: (completado || activo) ? '#FFF' : '#9CA3AF',
                  border: activo ? `2px solid ${WC_TOKENS.primary}` : '2px solid transparent',
                  boxShadow: activo ? `0 0 0 3px ${WC_TOKENS.primaryBg}` : 'none',
                }}
              >
                {completado ? <Check className="w-3.5 h-3.5" /> : paso.numero}
              </div>
              <span
                className="text-[10px] font-semibold whitespace-nowrap"
                style={{ color: activo ? WC_TOKENS.primary : completado ? '#059669' : '#9CA3AF' }}
              >
                {paso.label}
              </span>
            </div>
            {/* Conector */}
            {idx < pasos.length - 1 && (
              <div className="w-10 sm:w-16 h-px mx-1.5 mb-4 flex-shrink-0" style={{ background: completado ? '#059669' : '#E5E7EB' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Modal base (sin pasos) ───────────────────────────────────────────────────

export function WorldClassModal({
  titulo, subtitulo, icono, ancho = WC_TOKENS.widthDefault,
  children, pie, onCerrar,
}: WorldClassModalProps) {
  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0,0,0,0.60)',
        padding: '4vh 4vw',
        zIndex: 9998
      }}
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <motion.div
        initial={WC_TOKENS.motionInitial}
        animate={WC_TOKENS.motionAnimate}
        exit={WC_TOKENS.motionExit}
        transition={WC_TOKENS.motionTransition}
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full"
        style={{ maxWidth: ancho, maxHeight: '88vh' }}
      >
        <WCHeader titulo={titulo} subtitulo={subtitulo} icono={icono} onCerrar={onCerrar} />
        <div className="flex-1 overflow-y-auto p-5 space-y-4">{children}</div>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t bg-gray-50 flex-shrink-0">{pie}</div>
      </motion.div>
    </div>,
    document.body
  );
}

// ─── Wizard shell (con barra de pasos) ───────────────────────────────────────

export function WorldClassWizard({
  titulo, subtitulo, icono, ancho = WC_TOKENS.widthWide,
  pasos, pasoActual, children, pie, onCerrar,
}: WorldClassWizardProps) {
  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0,0,0,0.60)',
        padding: '4vh 4vw',
        zIndex: 9998
      }}
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <motion.div
        initial={WC_TOKENS.motionInitial}
        animate={WC_TOKENS.motionAnimate}
        exit={WC_TOKENS.motionExit}
        transition={WC_TOKENS.motionTransition}
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full"
        style={{ maxWidth: ancho, maxHeight: '88vh' }}
      >
        <WCHeader titulo={titulo} subtitulo={subtitulo} icono={icono} onCerrar={onCerrar} />
        <WCStepIndicator pasos={pasos} pasoActual={pasoActual} />
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={pasoActual}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t bg-gray-50 flex-shrink-0">{pie}</div>
      </motion.div>
    </div>,
    document.body
  );
}

// ─── Shared Header ───────────────────────────────────────────────────────────

function WCHeader({ titulo, subtitulo, icono, onCerrar }: {
  titulo: string; subtitulo?: string; icono: ReactNode; onCerrar: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between px-5 py-4 flex-shrink-0"
      style={{ background: WC_TOKENS.headerGradient }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-xl bg-white/10 flex-shrink-0">{icono}</div>
        <div className="min-w-0">
          <p className="text-white font-black text-base leading-none truncate">{titulo}</p>
          {subtitulo && <p className="text-blue-200 text-xs mt-0.5 truncate">{subtitulo}</p>}
        </div>
      </div>
      <button onClick={onCerrar} className="p-2 rounded-xl hover:bg-white/10 transition-colors flex-shrink-0 ml-3">
        <X className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}

// ─── Sub-componentes UI ──────────────────────────────────────────────────────

/** Bloque de resumen/contexto en la parte superior del cuerpo. */
export function WCResumenBloque({ icono, etiqueta, titulo, subtitulo, descripcion }: {
  icono: ReactNode; etiqueta: string; titulo: string; subtitulo?: string; descripcion?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-start gap-3">
      <div className="p-2 rounded-lg bg-orange-100 flex-shrink-0">{icono}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{etiqueta}</p>
        <p className="font-bold text-gray-900 text-sm">{titulo}</p>
        {subtitulo   && <p className="text-xs text-gray-500">{subtitulo}</p>}
        {descripcion && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{descripcion}</p>}
      </div>
    </div>
  );
}

/** Label estándar para campo de formulario */
export function WCLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

/** Input estándar */
export function WCInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white ${props.className ?? ''}`}
    />
  );
}

/** Select estándar */
export function WCSelect(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white ${props.className ?? ''}`}
    />
  );
}

/** Textarea estándar */
export function WCTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white resize-none ${props.className ?? ''}`}
    />
  );
}

/** Info box azul */
export function WCInfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700">
      {children}
    </div>
  );
}

/** Warning box amarillo */
export function WCWarningBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700">
      {children}
    </div>
  );
}

/** Cabecera de sección */
export function WCSectionHeader({ icono, titulo, trailing }: {
  icono: ReactNode; titulo: string; trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm font-bold text-gray-800 flex items-center gap-2">{icono}{titulo}</p>
      {trailing && <div>{trailing}</div>}
    </div>
  );
}

/** Badge semáforo */
export function WCBadgeSemaforo({ estado }: { estado: 'verde' | 'amarillo' | 'rojo' | 'gris' }) {
  const s = WC_TOKENS[estado];
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}>
      {s.label}
    </span>
  );
}

/** Barra de carga con desglose */
export function WCBarraCarga({
  asignados,
  capacidad,
  semaforo,
  alDia = 0,
  enRiesgo = 0,
  vencidos = 0
}: {
  asignados: number;
  capacidad: number;
  semaforo: 'verde' | 'amarillo' | 'rojo' | 'gris';
  alDia?: number;
  enRiesgo?: number;
  vencidos?: number;
}) {
  const pct   = Math.min(100, Math.round((asignados / capacidad) * 100));
  const s     = WC_TOKENS[semaforo];
  const cupos = Math.max(0, capacidad - asignados);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: s.dot }} />
        </div>
        <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: s.color }}>
          {asignados}/{capacidad}
          {cupos > 0 && <span className="text-gray-400 font-normal ml-1">({cupos} libres)</span>}
        </span>
      </div>
      {/* Desglose de procesos */}
      <div className="flex items-center gap-1.5 text-[10px] font-semibold">
        <span className="text-emerald-600 flex items-center gap-0.5">
          <Check className="w-3 h-3" />{alDia}
        </span>
        <span className="text-amber-500 flex items-center gap-0.5">
          <AlertTriangle className="w-3 h-3" />{enRiesgo}
        </span>
        <span className="text-red-500 flex items-center gap-0.5">
          <AlertCircle className="w-3 h-3" />{vencidos}
        </span>
      </div>
    </div>
  );
}

/** Botón primario */
export function WCBotonPrimario({ onClick, disabled, children, cargando = false }: {
  onClick: () => void; disabled?: boolean; children: ReactNode; cargando?: boolean;
}) {
  const activo = !disabled && !cargando;
  return (
    <button
      onClick={onClick}
      disabled={!activo}
      className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all"
      style={{ background: activo ? WC_TOKENS.buttonGradient : '#D1D5DB', cursor: activo ? 'pointer' : 'not-allowed' }}
    >
      {cargando && (
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
      )}
      {children}
    </button>
  );
}

/** Botón secundario */
export function WCBotonSecundario({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick}
      className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
      {children}
    </button>
  );
}

/** Badge tipo contrato */
export function WCBadgeContrato({ tipo }: { tipo: 'Planta' | 'Contratista' | 'OPS' }) {
  const c = WC_TOKENS.contrato[tipo as keyof typeof WC_TOKENS.contrato] ?? { bg: '#F3F4F6', text: '#4B5563' };
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={c}>{tipo}</span>;
}

/** Avatar con iniciales */
export function WCAvatar({ nombre, seleccionado = false, inactivo = false, size = 'md' }: {
  nombre: string; seleccionado?: boolean; inactivo?: boolean; size?: 'sm' | 'md';
}) {
  const iniciales = nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  const bg  = inactivo ? '#D1D5DB' : seleccionado ? WC_TOKENS.primary : '#6B7280';
  return (
    <div className={`${dim} rounded-full flex items-center justify-center font-black text-white flex-shrink-0`}
      style={{ background: bg }}>
      {iniciales}
    </div>
  );
}

/** Leyenda semáforo */
export function WCLeyendaSemaforo() {
  return (
    <div className="flex items-center gap-3 text-[10px] text-gray-400 font-semibold">
      {(['verde', 'amarillo', 'rojo', 'gris'] as const).map(s => (
        <span key={s} className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: WC_TOKENS[s].dot }} />
          {WC_TOKENS[s].label}
        </span>
      ))}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function wcIniciales(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function wcSemaforo(asignados: number, capacidad: number, estado: string): 'verde' | 'amarillo' | 'rojo' | 'gris' {
  if (estado !== 'activo') return 'gris';
  const pct = (asignados / capacidad) * 100;
  if (pct >= 100) return 'rojo';
  if (pct >= 80)  return 'amarillo';
  return 'verde';
}