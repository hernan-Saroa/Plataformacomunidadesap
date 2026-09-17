import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Receipt,
  FileCheck2,
  Calendar,
  DollarSign,
  Tag,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { SolicitudViatico, ExpedirRpPayload } from '../types/viaticos';
import { viaticosService } from '../services/api/viaticosService';
import { useFestivos } from '../hooks/useFestivos';
import { calcularDiasHabilesPrevios, DIAS_HABILES_UMBRAL_AVANCE_RP } from '../utils/diasHabilesUtils';

interface ExpedirRpModalProps {
  solicitud: SolicitudViatico | null;
  abierto: boolean;
  onCerrar: () => void;
  onExito: (solicitudActualizada: any) => void;
}

export default function ExpedirRpModal({
  solicitud,
  abierto,
  onCerrar,
  onExito,
}: ExpedirRpModalProps) {
  const hoy = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { festivos } = useFestivos();

  const [numeroRp, setNumeroRp] = useState('');
  const [fechaRp, setFechaRp] = useState(hoy);
  const [valorComprometido, setValorComprometido] = useState<number>(0);
  const [rubro, setRubro] = useState('');
  const [usarNomenclaturaPersonalizada, setUsarNomenclaturaPersonalizada] = useState(false);
  const [codigoRpPersonalizado, setCodigoRpPersonalizado] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializar campos con datos de la comisión
  useEffect(() => {
    if (solicitud && abierto) {
      setNumeroRp(solicitud.numeroRp || '');
      setFechaRp(solicitud.fechaRp ? solicitud.fechaRp.slice(0, 10) : hoy);
      const totalSugerido =
        solicitud.valorComprometido != null && Number(solicitud.valorComprometido) > 0
          ? Number(solicitud.valorComprometido)
          : Number(solicitud.montoTotal || solicitud.montoTotalEstimado || ((Number(solicitud.montoSolicitadoViaticos) || 0) + (Number(solicitud.montoSolicitadoGastosViaje) || 0)) || 0);
      setValorComprometido(totalSugerido);
      setRubro(solicitud.rubroRp || (solicitud as any).rubroPresupuestal || (solicitud as any).rubro || '');
      setUsarNomenclaturaPersonalizada(false);
      setCodigoRpPersonalizado('');
      setObservaciones('');
      setError(null);
    }
  }, [solicitud, abierto, hoy]);

  // Nomenclatura sugerida en tiempo real: Fecha_RP_Número
  const codigoRpCalculado = useMemo(() => {
    const f = (fechaRp || '').trim();
    const n = (numeroRp || '').trim();
    if (!f || !n) return '';
    return `${f}_RP_${n}`;
  }, [fechaRp, numeroRp]);

  const codigoRpFinal = usarNomenclaturaPersonalizada
    ? codigoRpPersonalizado.trim()
    : codigoRpCalculado;

  // Validación de regex de nomenclatura Fecha_RP_Número
  const esNomenclaturaValida = useMemo(() => {
    if (!codigoRpFinal) return false;
    const regex = /^\d{4}-?\d{2}-?\d{2}_RP_[A-Za-z0-9\-_]+$/i;
    return regex.test(codigoRpFinal);
  }, [codigoRpFinal]);

  // Proyección de modalidad de pago (RF-PRE-003) con días hábiles y festivos de Auth
  const proyeccionModalidad = useMemo(() => {
    if (!solicitud?.fechaInicio || !fechaRp) {
      return null;
    }
    const habiles = calcularDiasHabilesPrevios(fechaRp, solicitud.fechaInicio, festivos);
    return {
      diasHabiles: habiles,
      modalidad: habiles >= DIAS_HABILES_UMBRAL_AVANCE_RP ? 'AVANCE' : 'RECONOCIMIENTO_POSTERIOR',
    };
  }, [solicitud?.fechaInicio, fechaRp, festivos]);

  const puedeEnviar =
    Boolean(numeroRp.trim()) &&
    Boolean(fechaRp) &&
    valorComprometido > 0 &&
    Boolean(rubro.trim()) &&
    esNomenclaturaValida &&
    !guardando;

  if (!abierto || !solicitud) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!puedeEnviar) return;

    setGuardando(true);
    setError(null);

    try {
      const payload: ExpedirRpPayload = {
        numeroRp: numeroRp.trim(),
        fechaRp,
        valorComprometido: Number(valorComprometido),
        rubro: rubro.trim(),
        codigoRp: codigoRpFinal,
        observaciones: observaciones.trim() || undefined,
      };

      const resp = await viaticosService.expedirRp(solicitud.id, payload);
      onExito(resp?.data || resp);
      onCerrar();
    } catch (err: any) {
      console.error('Error expidiendo RP:', err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Ocurrió un error al expedir el RP en SIIF Nación.';
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 backdrop-blur rounded-xl">
              <Receipt className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold">Expedir Registro Presupuestal (RP)</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-100 border border-emerald-400/30">
                  Etapa 7 · SIIF Nación
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                Comprometer recursos presupuestales para la comisión {solicitud.codigo}
              </p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            disabled={guardando}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen de la Comisión */}
        <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            <span className="font-semibold text-slate-700">Comisionado:</span>{' '}
            {solicitud.nombreComisionado} (C.C. {solicitud.cedulaComisionado})
          </div>
          <div>
            <span className="font-semibold text-slate-700">Destino:</span> {solicitud.ciudadDestino}
          </div>
          <div>
            <span className="font-semibold text-slate-700">Fechas:</span> {solicitud.fechaInicio} a{' '}
            {solicitud.fechaFin}
          </div>
          <div>
            <span className="font-semibold text-slate-700">Estado Actual:</span>{' '}
            <span className="font-bold text-slate-800">{solicitud.estado}</span>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start space-x-2.5 animate-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Número de RP */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Número de RP SIIF <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ej: 24567"
                  value={numeroRp}
                  onChange={(e) => setNumeroRp(e.target.value)}
                  disabled={guardando}
                  className="w-full px-3.5 py-2 pl-9 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                />
                <FileCheck2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Número consecutivo expedido en SIIF Nación.
              </p>
            </div>

            {/* Fecha de Expedición RP */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Fecha del RP <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={fechaRp}
                  onChange={(e) => setFechaRp(e.target.value)}
                  disabled={guardando}
                  className="w-full px-3.5 py-2 pl-9 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Fecha de expedición formal en SIIF.
              </p>
            </div>

            {/* Proyección Modalidad de Pago (RF-PRE-003) */}
            {proyeccionModalidad && (
              <div
                className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between transition-all ${
                  proyeccionModalidad.modalidad === 'AVANCE'
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50/80 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      proyeccionModalidad.modalidad === 'AVANCE' ? 'bg-emerald-600' : 'bg-amber-600'
                    }`}
                  />
                  <div>
                    <span className="font-bold uppercase tracking-wider text-[10px] block text-slate-500">
                      Modalidad proyectada (RF-PRE-003)
                    </span>
                    <span className="font-bold text-xs">
                      {proyeccionModalidad.modalidad === 'AVANCE'
                        ? 'AVANCE (Pago Anticipado)'
                        : 'RECONOCIMIENTO POSTERIOR (Liquidación Posterior)'}
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono text-[11px] shrink-0 pl-2">
                  <span className="font-bold">~{proyeccionModalidad.diasHabiles}</span>{' '}
                  {proyeccionModalidad.diasHabiles === 1 ? 'día hábil previo' : 'días hábiles previos'}
                  <div className="text-[10px] opacity-75">
                    {proyeccionModalidad.modalidad === 'AVANCE' ? '≥ 5 días hábiles' : '< 5 días hábiles'}
                  </div>
                </div>
              </div>
            )}

            {/* Valor Comprometido */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Valor Comprometido ($ COP) <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">
                  $
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="0"
                  value={valorComprometido ? new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(valorComprometido) : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setValorComprometido(raw ? parseInt(raw, 10) : 0);
                  }}
                  disabled={guardando}
                  className="w-full px-3.5 py-2 pl-8 rounded-xl border border-slate-300 text-sm font-semibold font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {valorComprometido > 0
                  ? `Monto oficial: $ ${new Intl.NumberFormat('es-CO').format(valorComprometido)} COP`
                  : 'Monto oficial amparado en el Registro Presupuestal.'}
              </p>
            </div>

            {/* Rubro Presupuestal */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Rubro Presupuestal <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ej: C-2101-0100-0-2101010-02"
                  value={rubro}
                  onChange={(e) => setRubro(e.target.value)}
                  disabled={guardando}
                  className="w-full px-3.5 py-2 pl-9 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Rubro de afectación del gasto.
              </p>
            </div>
          </div>

          {/* Caja de Nomenclatura del RP (Fecha_RP_Número) */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-900">
                <Receipt className="w-4 h-4 text-emerald-700" />
                <span>Nomenclatura Institucional (Fecha_RP_Número)</span>
                <span title="Nomenclatura estándar obligatoria para la trazabilidad entre el Sistema de Viáticos y SIIF Nación">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-600 inline" />
                </span>
              </div>
              <button
                type="button"
                onClick={() => setUsarNomenclaturaPersonalizada(!usarNomenclaturaPersonalizada)}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold underline"
              >
                {usarNomenclaturaPersonalizada ? 'Usar automática' : 'Modificar formato'}
              </button>
            </div>

            {usarNomenclaturaPersonalizada ? (
              <div>
                <input
                  type="text"
                  value={codigoRpPersonalizado}
                  onChange={(e) => setCodigoRpPersonalizado(e.target.value)}
                  placeholder="Ej: 2026-09-16_RP_24567"
                  className="w-full px-3 py-1.5 rounded-lg border border-emerald-300 text-xs font-mono font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-emerald-700 mt-1">
                  Debe cumplir la estructura: <code>YYYY-MM-DD_RP_NUMERO</code> o <code>YYYYMMDD_RP_NUMERO</code>.
                </p>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-emerald-900 flex-1 truncate">
                  {codigoRpCalculado || '— Ingrese número y fecha de RP —'}
                </div>
                {esNomenclaturaValida ? (
                  <span className="flex items-center text-xs font-bold text-emerald-700 space-x-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Válido</span>
                  </span>
                ) : (
                  <span className="text-xs text-amber-700">Incompleto</span>
                )}
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Observaciones de Expedición (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Notas de trazabilidad presupuestal o constancia en SIIF..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              disabled={guardando}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
            />
          </div>

          {/* Estado Resultante */}
          <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600 flex items-center justify-between">
            <span>Al expedir el RP, la comisión pasará automáticamente al estado:</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-200 text-emerald-900 border border-emerald-300">
              COMPROMETIDA
            </span>
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!puedeEnviar}
              style={
                !puedeEnviar
                  ? { backgroundColor: '#94a3b8', color: '#ffffff' }
                  : { backgroundColor: '#047857', color: '#ffffff' }
              }
              className="px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2 cursor-pointer"
            >
              {guardando ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-white">Expidiendo en SIIF...</span>
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4 text-white" />
                  <span className="text-white">Expedir RP (COMPROMETIDA)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
