/**
 * MODAL CONVERTIR NOTICIA A PROCESO
 * Vista única: resumen de noticia + selección de profesional con disponibilidad
 */

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, Check, PlusCircle, FileText, Search, AlertTriangle, CheckCircle, AlertCircle, Briefcase, MapPin, Users } from 'lucide-react';
import { disciplinaryService } from '../../../services/api/disciplinary.service';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface NoticiaParaConvertir {
  id: string;
  numero: string;
  hechos: string;
  fechaRecepcion: string;
  origen?: string;
  prioridad?: 'alta' | 'media' | 'baja';
  denunciado: {
    nombre: string;
    tipoIdentificacion: string;
    numeroIdentificacion: string;
    cargo?: string;
    dependencia?: string;
  };
  denunciante?: {
    nombre: string;
    tipoIdentificacion?: string;
    numeroIdentificacion?: string;
  };
}

export interface DatosConversion {
  tipoProceso: string;
  faltaPresunta: string;
  etapaInicial: string;
  descripcionAdicional: string;
  profesionalId: string;
  profesionalNombre: string;
  observaciones: string;
}

interface Props {
  noticia: NoticiaParaConvertir;
  onConfirmar: (datos: DatosConversion) => void;
  onCerrar: () => void;
}

// ─── Datos de profesionales (espejo del módulo Gestión Profesionales) ─────────

// Los profesionales se cargan desde Supabase al montar el componente.
// Ya no se usa array hardcodeado.

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSemaforo(p: any) {
  if (p.estado !== 'activo' && p.estado !== 'ACTIVO') return 'gris';
  const pct = (p.procesosAsignados / (p.capacidadMaxima || 10)) * 100;
  if (pct >= 100) return 'rojo';
  if (pct >= 80) return 'amarillo';
  return 'verde';
}

const SEM_CONFIG = {
  verde: { label: 'Disponible', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', dot: '#059669' },
  amarillo: { label: 'Carga media', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', dot: '#D97706' },
  rojo: { label: 'Sin cupo', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', dot: '#DC2626' },
  gris: { label: 'No disponible', color: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB', dot: '#9CA3AF' },
};

const ESTADO_LABEL: Record<string, string> = {
  activo: 'Activo', ACTIVO: 'Activo', inactivo: 'Inactivo', vacaciones: 'Vacaciones', comision: 'Comisión'
};

const CONTRATO_COLOR: Record<string, { bg: string; text: string }> = {
  Planta: { bg: '#EFF6FF', text: '#1E40AF' },
  Contratista: { bg: '#F5F3FF', text: '#5B21B6' },
  OPS: { bg: '#FFF7ED', text: '#C2410C' },
};

function iniciales(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(n => n[0] || '').join('').toUpperCase();
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function WizardConvertirProcesoWorldClass({ noticia, onConfirmar, onCerrar }: Props) {
  const [profesionalId, setProfesionalId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [profesionales, setProfesionales] = useState<any[]>([]);

  useEffect(() => {
    const fetchProfesionales = async () => {
      try {
        const data = await disciplinaryService.getProfesionales();
        setProfesionales(data.map(p => ({
          ...p,
          nombre: p.nombreCompleto || p.nombre || p.email,
          especialidad: p.especialidad || 'Derecho Disciplinario',
          territorial: p.territorial || 'Sede Central',
          procesosAsignados: p.procesosAsignados || 0,
          capacidadMaxima: p.capacidadMaxima || 10,
          tipoContrato: p.tipoContrato || 'Planta',
          estado: p.estado || 'ACTIVO'
        })));
      } catch (err) {
        console.error('Error al cargar profesionales:', err);
      }
    };
    fetchProfesionales();
  }, []);

  const lista = useMemo(() => {
    let r = profesionales;
    if (busqueda) {
      const t = busqueda.toLowerCase();
      r = r.filter(p =>
        p.nombre.toLowerCase().includes(t) ||
        p.especialidad.toLowerCase().includes(t) ||
        p.territorial.toLowerCase().includes(t)
      );
    }
    // Orden: verdes primero, luego amarillos, luego el resto
    return [...r].sort((a, b) => {
      const ord = { verde: 0, amarillo: 1, rojo: 2, gris: 3 };
      return ord[getSemaforo(a)] - ord[getSemaforo(b)];
    });
  }, [busqueda, profesionales]);

  const seleccionado = profesionales.find(p => p.id === profesionalId);
  const puedeConfirmar = !!profesionalId && !enviando;

  const handleConfirmar = async () => {
    if (!seleccionado) return;
    setEnviando(true);
    await new Promise(r => setTimeout(r, 600));
    onConfirmar({
      tipoProceso: 'Disciplinario Ordinario',
      faltaPresunta: 'Por determinar',
      etapaInicial: 'Indagación Preliminar',
      descripcionAdicional: '',
      profesionalId: seleccionado.id,
      profesionalNombre: seleccionado.nombre,
      observaciones: '',
    });
    setEnviando(false);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.60)', padding: '4vh 4vw' }}
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '92vw', height: '88vh', maxWidth: 720, maxHeight: '95vh', minHeight: 'min(480px, 80vh)' }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Cabecera ── */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #001A6E 0%, #003DA5 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10">
              <PlusCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-base leading-none">Convertir a Proceso</p>
              <p className="text-blue-200 text-xs mt-0.5">{noticia.numero}</p>
            </div>
          </div>
          <button onClick={onCerrar} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* ── Cuerpo scrolleable ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── Resumen de la noticia ── */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-orange-100 flex-shrink-0">
              <FileText className="w-4 h-4 text-orange-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">Noticia a convertir</p>
              <p className="font-bold text-gray-900 text-sm">{noticia.denunciado.nombre}</p>
              <p className="text-xs text-gray-500">
                {noticia.denunciado.tipoIdentificacion} {noticia.denunciado.numeroIdentificacion}
              </p>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{noticia.hechos}</p>
            </div>
          </div>

          {/* ── Selección de profesional ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Asignar profesional
              </p>
              {/* Leyenda semáforo */}
              <div className="flex items-center gap-3 text-[10px] text-gray-400 font-semibold">
                {(['verde', 'amarillo', 'rojo', 'gris'] as const).map(s => (
                  <span key={s} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: SEM_CONFIG[s].dot }} />
                    {SEM_CONFIG[s].label}
                  </span>
                ))}
              </div>
            </div>

            {/* Búsqueda */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, especialidad, territorial..."
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-white"
              />
            </div>

            {/* Lista de profesionales */}
            <div className="space-y-2 overflow-y-auto pr-0.5" style={{ maxHeight: 340 }}>
              {lista.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin resultados</p>
                </div>
              ) : (
                lista.map(prof => {
                  const sem = SEM_CONFIG[getSemaforo(prof)];
                  const sel = profesionalId === prof.id;
                  const noDisp = getSemaforo(prof) === 'gris' || getSemaforo(prof) === 'rojo';
                  const pct = Math.round((prof.procesosAsignados / prof.capacidadMaxima) * 100);
                  const cupos = Math.max(0, prof.capacidadMaxima - prof.procesosAsignados);
                  const cont = CONTRATO_COLOR[prof.tipoContrato];

                  return (
                    <div
                      key={prof.id}
                      onClick={() => !noDisp && setProfesionalId(prof.id)}
                      className={`
                        relative flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all
                        ${noDisp
                          ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50'
                          : sel
                            ? 'cursor-pointer shadow-sm'
                            : 'cursor-pointer border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/30'
                        }
                      `}
                      style={sel
                        ? { borderColor: '#003DA5', background: '#EEF4FF' }
                        : {}
                      }
                    >
                      {/* Banda lateral semáforo */}
                      <div
                        className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
                        style={{ background: sem.dot }}
                      />

                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-white flex-shrink-0"
                        style={{ background: noDisp ? '#D1D5DB' : sel ? '#003DA5' : '#6B7280' }}
                      >
                        {iniciales(prof.nombre)}
                      </div>

                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-gray-900 truncate">{prof.nombre}</p>
                            <p className="text-xs text-gray-500 truncate">{prof.cargo} · {prof.especialidad}</p>
                          </div>
                          {/* Semáforo pill */}
                          <span
                            className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border"
                            style={{ background: sem.bg, color: sem.color, borderColor: sem.border }}
                          >
                            {sem.label}
                          </span>
                        </div>

                        {/* Fila de metadatos */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={cont}
                          >
                            {prof.tipoContrato}
                          </span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" />{prof.territorial.replace('Territorial ', '').replace('Dirección ', 'Dir. ')}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {ESTADO_LABEL[prof.estado]}
                          </span>
                        </div>

                        {/* Barra de carga */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, pct)}%`,
                                background: sem.dot
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: sem.color }}>
                            {prof.procesosAsignados}/{prof.capacidadMaxima}
                            {cupos > 0 && <span className="text-gray-400 font-normal ml-1">({cupos} libres)</span>}
                          </span>
                          {/* Desglose mini */}
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                            <span className="text-emerald-600 flex items-center gap-0.5">
                              <CheckCircle className="w-3 h-3" />{prof.procesosAlDia}
                            </span>
                            <span className="text-amber-500 flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" />{prof.procesosEnRiesgo}
                            </span>
                            <span className="text-red-500 flex items-center gap-0.5">
                              <AlertCircle className="w-3 h-3" />{prof.procesosVencidos}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Check seleccionado */}
                      {sel && (
                        <div
                          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: '#003DA5' }}
                        >
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Pie ── */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t bg-gray-50 flex-shrink-0">
          <div className="text-xs text-gray-400">
            {seleccionado
              ? <span>Asignando a <strong className="text-gray-700">{seleccionado.nombre}</strong></span>
              : 'Selecciona un profesional para continuar'
            }
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCerrar}
              className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              disabled={!puedeConfirmar}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all"
              style={{
                background: puedeConfirmar
                  ? 'linear-gradient(135deg, #003DA5, #2962FF)'
                  : '#D1D5DB',
                cursor: puedeConfirmar ? 'pointer' : 'not-allowed'
              }}
            >
              {enviando ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                  Creando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Crear Proceso
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}