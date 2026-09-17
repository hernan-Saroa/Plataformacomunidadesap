import React, { useState, useEffect } from 'react';
import {
  X,
  FileCheck2,
  AlertCircle,
  Calendar,
  DollarSign,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Receipt,
  Landmark,
  Clock,
  ExternalLink,
  Building2,
  User,
  Lock,
} from 'lucide-react';
import { SolicitudListaResponse, CrearObligacionDto } from '../types/viaticos';
import { viaticosService } from '../services/api/viaticosService';
import { formatearMoneda } from '../utils/viaticosUtils';

interface CrearObligacionModalProps {
  abierta: boolean;
  solicitud: SolicitudListaResponse | null;
  onCerrar: () => void;
  onExito: (solicitudActualizada: any) => void;
}

export default function CrearObligacionModal({
  abierta,
  solicitud,
  onCerrar,
  onExito,
}: CrearObligacionModalProps) {
  const [numeroObligacion, setNumeroObligacion] = useState('');
  const [fechaObligacion, setFechaObligacion] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [valorObligacion, setValorObligacion] = useState<number>(0);
  const [modalidadPago, setModalidadPago] = useState<'AVANCE' | 'RECONOCIMIENTO_POSTERIOR'>('AVANCE');
  const [observaciones, setObservaciones] = useState('');
  const [soportePath, setSoportePath] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (solicitud) {
      const valorBase =
        solicitud.valorObligacion != null && solicitud.valorObligacion > 0
          ? Number(solicitud.valorObligacion)
          : solicitud.valorComprometido != null && solicitud.valorComprometido > 0
            ? Number(solicitud.valorComprometido)
            : Number(solicitud.montoViaticos || 0) + Number(solicitud.montoGastosViaje || 0);

      setValorObligacion(valorBase);

      const mod =
        solicitud.modalidadPago === 'RECONOCIMIENTO_POSTERIOR'
          ? 'RECONOCIMIENTO_POSTERIOR'
          : 'AVANCE';
      setModalidadPago(mod);

      setNumeroObligacion(solicitud.numeroObligacion || '');
      setFechaObligacion(
        solicitud.fechaObligacion
          ? String(solicitud.fechaObligacion).split('T')[0]
          : new Date().toISOString().split('T')[0],
      );
      setObservaciones(solicitud.observacionesObligacion || '');
      setSoportePath(solicitud.soporteObligacionPath || '');
      setError(null);
    }
  }, [solicitud, abierta]);

  if (!abierta || !solicitud) return null;

  const codigoRp = solicitud.codigoRp || solicitud.numeroRp || 'RP-N/A';
  const rubro = solicitud.rubroRp || solicitud.rubroPresupuestal || 'N/A';
  const nombreComisionado = solicitud.comisionado
    ? `${solicitud.comisionado.primerNombre || ''} ${solicitud.comisionado.primerApellido || ''}`.trim()
    : 'Funcionario comisionado';

  const tieneModalidadPrevia = Boolean(
    solicitud.modalidadPago &&
      (solicitud.modalidadPago === 'AVANCE' || solicitud.modalidadPago === 'RECONOCIMIENTO_POSTERIOR'),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!numeroObligacion.trim()) {
      setError('Por favor ingrese el número oficial de la obligación expedida en SIIF Nación.');
      return;
    }

    if (!fechaObligacion) {
      setError('Por favor seleccione la fecha de expedición de la obligación en SIIF.');
      return;
    }

    if (valorObligacion <= 0) {
      setError('El valor de la obligación debe ser un monto positivo mayor a cero.');
      return;
    }

    setGuardando(true);
    try {
      const payload: CrearObligacionDto = {
        numeroObligacion: numeroObligacion.trim(),
        fechaObligacion,
        valorObligacion: Number(valorObligacion),
        modalidadPago,
        observacionesObligacion: observaciones.trim() || undefined,
        soporteObligacionPath: soportePath.trim() || undefined,
      };

      const resp = await viaticosService.crearObligacion(solicitud.id, payload);
      const resultado = resp?.data || resp || {
        ...solicitud,
        estadoSolicitud: 'OBLIGADA',
        ...payload,
      };

      onExito(resultado);
      onCerrar();
    } catch (err: any) {
      console.error('Error al crear obligación SIIF:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Error al registrar la obligación en el sistema. Intente nuevamente.',
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-3xl my-8 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-obligacion-titulo"
      >
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
              <Landmark className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  Etapa 8 — Tesorería y Desembolso
                </span>
                <span className="text-xs text-white/70">RF-PAG-001</span>
              </div>
              <h2 id="modal-obligacion-titulo" className="text-lg font-bold text-white leading-tight">
                Crear Obligación en SIIF Nación
              </h2>
            </div>
          </div>
          <button
            onClick={onCerrar}
            disabled={guardando}
            aria-label="Cerrar ventana"
            className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Alerta de Integración Comparativa */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-semibold">
                Gestión de Control Comparativo (SIIF Nación)
              </p>
              <p className="text-amber-800/90 dark:text-amber-300/80">
                La integración con SIIF Nación es de forma comparativa. El analista crea la obligación directamente en la plataforma SIIF Nación según la modalidad calculada y digita aquí los datos generados para formalizar el registro y avanzar la comisión al desembolso de Tesorería.
              </p>
            </div>
          </div>

          {/* Tarjeta de Datos Base de la Comisión Comprometida (Entrada) */}
          <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                Datos de la Comisión Comprometida
              </h3>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/50">
                Estado: COMPROMETIDA
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Radicado / Comisión</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1 mt-0.5">
                  <Receipt className="w-3.5 h-3.5 text-slate-400" />
                  {solicitud.consecutivoUnico || solicitud.id}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Comisionado</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1 mt-0.5 truncate">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {nombreComisionado}
                </span>
                {solicitud.comisionado?.numeroDocumento && (
                  <span className="text-xs text-slate-500">C.C. {solicitud.comisionado.numeroDocumento}</span>
                )}
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Destino</span>
                <span className="text-slate-700 dark:text-slate-300 block mt-0.5">
                  {solicitud.destinoCiudad || 'Destino oficial'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-200/80 dark:border-slate-700/60 text-sm">
              {/* Registro Presupuestal RP */}
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">RP Expedido</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 block text-xs mt-1 truncate" title={codigoRp}>
                  {codigoRp}
                </span>
                <span className="text-[11px] text-slate-500 block truncate mt-0.5">Rubro: {rubro}</span>
              </div>

              {/* Modalidad de Pago de RF-PRE-003 */}
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Modalidad de Pago</span>
                <div className="mt-1">
                  {modalidadPago === 'AVANCE' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                      <Clock className="w-3 h-3" />
                      AVANCE (Anticipado)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                      <Clock className="w-3 h-3" />
                      RECONOCIMIENTO POSTERIOR
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {tieneModalidadPrevia
                    ? (solicitud.diasHabilesPrevios != null ? `${solicitud.diasHabilesPrevios} días hábiles previos` : 'Traída del proceso anterior')
                    : 'Por definir en formulario'}
                </span>
              </div>

              {/* Valor Comprometido */}
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Valor Comprometido RP</span>
                <span className="text-base font-bold text-emerald-700 dark:text-emerald-400 block mt-0.5">
                  {formatearMoneda(solicitud.valorComprometido || valorObligacion)}
                </span>
                <span className="text-[11px] text-slate-500 block">Recursos amparados en SIIF</span>
              </div>
            </div>
          </div>

          {/* Formulario de la Obligación en SIIF Nación */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-600" />
              Registro de la Obligación en SIIF Nación
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Número de Obligación */}
              <div>
                <label
                  htmlFor="numero-obligacion-input"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1"
                >
                  Número de Obligación SIIF <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="numero-obligacion-input"
                    type="text"
                    required
                    value={numeroObligacion}
                    onChange={(e) => setNumeroObligacion(e.target.value)}
                    placeholder="Ej: OBL-2026-00481 o 481920"
                    className="w-full px-3.5 py-2.5 pl-10 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900 dark:text-white"
                  />
                  <FileCheck2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Número identificador emitido por SIIF Nación al crear la obligación.
                </p>
              </div>

              {/* Fecha de la Obligación */}
              <div>
                <label
                  htmlFor="fecha-obligacion-input"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1"
                >
                  Fecha de la Obligación <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="fecha-obligacion-input"
                    type="date"
                    required
                    value={fechaObligacion}
                    onChange={(e) => setFechaObligacion(e.target.value)}
                    className="w-full px-3.5 py-2.5 pl-10 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900 dark:text-white"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Fecha de expedición formal de la obligación en SIIF.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Valor de la Obligación */}
              <div>
                <label
                  htmlFor="valor-obligacion-input"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1"
                >
                  Valor de la Obligación ($ COP) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">
                    $
                  </span>
                  <input
                    id="valor-obligacion-input"
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="0"
                    disabled={guardando}
                    value={
                      valorObligacion
                        ? new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(valorObligacion)
                        : ''
                    }
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setValorObligacion(raw ? parseInt(raw, 10) : 0);
                    }}
                    className="w-full px-3.5 py-2.5 pl-8 text-sm font-semibold font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900 dark:text-white transition-all placeholder:text-slate-400"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {valorObligacion > 0
                    ? `Monto oficial: $ ${new Intl.NumberFormat('es-CO').format(valorObligacion)} COP`
                    : 'Monto total por el cual se formaliza la obligación en SIIF Nación.'}
                </p>
              </div>

              {/* Modalidad de Pago de la Obligación */}
              <div>
                <label
                  htmlFor={tieneModalidadPrevia ? undefined : 'modalidad-pago-select'}
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1"
                >
                  Modalidad de Pago <span className="text-rose-500">*</span>
                </label>
                {tieneModalidadPrevia ? (
                  <div
                    id="modalidad-pago-previa"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {modalidadPago === 'AVANCE'
                          ? 'AVANCE (Desembolso previo al viaje)'
                          : 'RECONOCIMIENTO POSTERIOR (Reembolso tras cumplimiento)'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 shrink-0">
                      Traída del proceso anterior
                    </span>
                  </div>
                ) : (
                  <select
                    id="modalidad-pago-select"
                    value={modalidadPago}
                    onChange={(e) => setModalidadPago(e.target.value as 'AVANCE' | 'RECONOCIMIENTO_POSTERIOR')}
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900 dark:text-white font-medium"
                  >
                    <option value="AVANCE">AVANCE (Desembolso previo al viaje)</option>
                    <option value="RECONOCIMIENTO_POSTERIOR">RECONOCIMIENTO POSTERIOR (Reembolso tras cumplimiento)</option>
                  </select>
                )}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {tieneModalidadPrevia
                    ? 'Modalidad traída automáticamente de la expedición del RP (RF-PRE-003).'
                    : 'No se definió modalidad previa. Seleccione la modalidad de pago para la obligación en SIIF Nación.'}
                </p>
              </div>
            </div>

            {/* Observaciones de la Obligación */}
            <div>
              <label
                htmlFor="observaciones-obligacion-input"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1"
              >
                Observaciones / Concepto de la Obligación (Opcional)
              </label>
              <textarea
                id="observaciones-obligacion-input"
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones adicionales, código de afectación o notas para Tesorería..."
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900 dark:text-white"
              />
            </div>

            {/* Soporte PDF opcional */}
            <div>
              <label
                htmlFor="soporte-obligacion-input"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1"
              >
                Ruta o Identificador de Comprobante PDF (Opcional)
              </label>
              <input
                id="soporte-obligacion-input"
                type="text"
                value={soportePath}
                onChange={(e) => setSoportePath(e.target.value)}
                placeholder="Ej: SIIF_OBL_481920.pdf"
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Pie del Modal / Acciones */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Al registrar, la comisión pasa a <strong className="text-emerald-600 dark:text-emerald-400">OBLIGADA (Lista para pago)</strong>.
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={guardando}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {guardando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Registrando Obligación...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Crear Obligación en SIIF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
