import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Receipt,
  FileCheck2,
  Calendar,
  DollarSign,
  Tag,
  AlertCircle,
  CheckCircle2,
  UploadCloud,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { SolicitudViatico } from '../types/viaticos';
import { viaticosService } from '../services/api/viaticosService';
import { useFestivos } from '../hooks/useFestivos';
import { calcularDiasHabilesPrevios, DIAS_HABILES_UMBRAL_AVANCE_RP } from '../utils/diasHabilesUtils';

export interface RegistrarRPModalProps {
  solicitud: SolicitudViatico | null;
  abierto: boolean;
  onCerrar: () => void;
  onExito: (solicitudActualizada: any) => void;
}

export const REGEX_NOMENCLATURA_PDF = /^(\d{4}-?\d{2}-?\d{2})_RP_([A-Za-z0-9\-_]+)\.pdf$/i;

export default function RegistrarRPModal({
  solicitud,
  abierto,
  onCerrar,
  onExito,
}: RegistrarRPModalProps) {
  const hoy = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { festivos } = useFestivos();

  const [numeroRp, setNumeroRp] = useState('');
  const [fechaRp, setFechaRp] = useState(hoy);
  const [valorComprometido, setValorComprometido] = useState<number>(0);
  const [rubroPresupuestal, setRubroPresupuestal] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Archivo Soporte PDF
  const [archivoPdf, setArchivoPdf] = useState<File | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string>('');
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
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
          : Number(
              solicitud.montoTotal ||
                solicitud.montoTotalEstimado ||
                (Number(solicitud.montoSolicitadoViaticos) || 0) +
                  (Number(solicitud.montoSolicitadoGastosViaje) || 0) ||
                0,
            );
      setValorComprometido(totalSugerido);
      setRubroPresupuestal(
        solicitud.rubroRp ||
          (solicitud as any).rubroPresupuestal ||
          (solicitud as any).rubro ||
          '',
      );
      setObservaciones('');
      setArchivoPdf(null);
      setNombreArchivo('');
      setErrorArchivo(null);
      setError(null);
    }
  }, [solicitud, abierto, hoy]);

  // Patrón esperado de ejemplo: YYYYMMDD_RP_Numero.pdf
  const nombreEsperadoEjemplo = useMemo(() => {
    const f = (fechaRp || hoy).replace(/-/g, '');
    const n = numeroRp.trim() || '12345';
    return `${f}_RP_${n}.pdf`;
  }, [fechaRp, hoy, numeroRp]);

  // Validación en tiempo real del archivo PDF adjunto
  const validacionArchivo = useMemo(() => {
    if (!nombreArchivo) {
      return { esValido: false, mensaje: 'Adjuntar el soporte oficial del RP en formato PDF.' };
    }
    if (!nombreArchivo.toLowerCase().endsWith('.pdf')) {
      return { esValido: false, mensaje: 'El archivo debe ser un documento en formato PDF (.pdf).' };
    }
    if (!REGEX_NOMENCLATURA_PDF.test(nombreArchivo)) {
      return {
        esValido: false,
        mensaje: `La nomenclatura del soporte es inválida. Debe cumplir el patrón 'YYYYMMDD_RP_Numero.pdf' (ej: ${nombreEsperadoEjemplo}).`,
      };
    }
    return { esValido: true, mensaje: 'Nomenclatura oficial válida según estándar SIIF Nación.' };
  }, [nombreArchivo, nombreEsperadoEjemplo]);

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

  const handleSeleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivoPdf(file);
    setNombreArchivo(file.name);

    if (!REGEX_NOMENCLATURA_PDF.test(file.name)) {
      setErrorArchivo(
        `El soporte '${file.name}' no cumple con la regla Fecha_RP_Número (ejemplo: ${nombreEsperadoEjemplo}).`,
      );
    } else {
      setErrorArchivo(null);
    }
  };

  const puedeEnviar =
    Boolean(numeroRp.trim()) &&
    Boolean(fechaRp) &&
    valorComprometido > 0 &&
    Boolean(rubroPresupuestal.trim()) &&
    (!nombreArchivo || validacionArchivo.esValido) &&
    !guardando;

  if (!abierto || !solicitud) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!puedeEnviar) return;

    if (nombreArchivo && !validacionArchivo.esValido) {
      setError(`La nomenclatura del archivo soporte '${nombreArchivo}' es inválida.`);
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const codigoRpCalculado = `${fechaRp.replace(/-/g, '')}_RP_${numeroRp.trim()}`;

      const payload = {
        numeroRp: numeroRp.trim(),
        fechaRp,
        valorComprometido: Number(valorComprometido),
        rubroPresupuestal: rubroPresupuestal.trim(),
        rubro: rubroPresupuestal.trim(),
        codigoRp: codigoRpCalculado,
        soporteRpPath: nombreArchivo || undefined,
        observaciones: observaciones.trim() || undefined,
      };

      const resp = await viaticosService.expedirRp(solicitud.id, payload);
      onExito(resp?.data || { ...solicitud, estado: 'COMPROMETIDA', codigoRp: codigoRpCalculado });
      onCerrar();
    } catch (err: any) {
      console.error('Error al registrar RP:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Ocurrió un error al registrar el Registro Presupuestal en SIIF Nación.',
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Encabezado */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm">
              <Receipt className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Etapa 7 · RF-PRE-001
                </span>
                <span className="text-xs text-indigo-300">SIIF Nación</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Registrar Registro Presupuestal (RP)
              </h3>
              <p className="text-xs text-indigo-200/80">
                Comisión {solicitud.codigo} · Comisionado: {solicitud.nombreComisionado}
              </p>
            </div>
          </div>

          <button
            onClick={onCerrar}
            disabled={guardando}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error en el registro del RP</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Fila 1: Número de RP y Fecha */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <Receipt className="w-3.5 h-3.5 text-indigo-700" />
                <span>Número de RP en SIIF *</span>
              </label>
              <input
                type="text"
                required
                value={numeroRp}
                onChange={(e) => setNumeroRp(e.target.value)}
                placeholder="Ej. 12345"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-700" />
                <span>Fecha de Expedición RP *</span>
              </label>
              <input
                type="date"
                required
                value={fechaRp}
                onChange={(e) => setFechaRp(e.target.value)}
                max={hoy}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono transition-all"
              />
            </div>
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
                    Modalidad proyectada según días hábiles (RF-PRE-003)
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

          {/* Fila 2: Valor Comprometido y Rubro */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                <span>Valor Comprometido ($ COP) *</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">
                  $
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={valorComprometido ? new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(valorComprometido) : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setValorComprometido(raw ? parseInt(raw, 10) : 0);
                  }}
                  placeholder="0"
                  className="w-full pl-8 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono font-bold text-slate-900 transition-all placeholder:text-slate-400"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {valorComprometido > 0
                  ? `Monto oficial: $ ${new Intl.NumberFormat('es-CO').format(valorComprometido)} COP`
                  : 'Ingrese el valor monetario oficial amparado en el Registro Presupuestal.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-700" />
                <span>Rubro Presupuestal *</span>
              </label>
              <input
                type="text"
                required
                value={rubroPresupuestal}
                onChange={(e) => setRubroPresupuestal(e.target.value)}
                placeholder="Ej. C-2101-0100-0-2101010-02-00-00"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Uploader de Soporte PDF con Validación en Tiempo Real */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <FileCheck2 className="w-4 h-4 text-indigo-700" />
                <span>Soporte Oficial RP (PDF)</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                Regla: YYYYMMDD_RP_Numero.pdf
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleSeleccionarArchivo}
              accept=".pdf"
              className="hidden"
            />

            {!nombreArchivo ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-white p-5 rounded-xl text-center cursor-pointer transition-all hover:bg-indigo-50/20 group"
              >
                <UploadCloud className="w-7 h-7 text-slate-400 group-hover:text-indigo-600 mx-auto transition-colors" />
                <p className="text-xs font-bold text-slate-700 mt-2">
                  Haz clic para adjuntar el PDF de soporte expedido en SIIF
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  El archivo debe llamarse <span className="font-mono text-indigo-700 font-bold">{nombreEsperadoEjemplo}</span>
                </p>
              </div>
            ) : (
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-2 rounded-lg ${validacionArchivo.esValido ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-mono font-bold text-slate-800">{nombreArchivo}</p>
                    <p className={`text-[11px] ${validacionArchivo.esValido ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}`}>
                      {validacionArchivo.mensaje}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setArchivoPdf(null);
                    setNombreArchivo('');
                    setErrorArchivo(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {errorArchivo && (
              <p className="text-[11px] text-rose-600 font-semibold flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorArchivo}</span>
              </p>
            )}
          </div>

          {/* Observaciones opcionales */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Observaciones de Expedición (Opcional)
            </label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas aclaratorias sobre el registro del RP..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>
        </form>

        {/* Footer con Acciones */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Al registrar el RP, la comisión pasará a estado{' '}
            <span className="font-bold text-indigo-800">COMPROMETIDA</span>.
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!puedeEnviar}
              style={
                !puedeEnviar
                  ? { backgroundColor: '#94a3b8', color: '#ffffff' }
                  : { backgroundColor: '#003DA5', color: '#ffffff' }
              }
              className="px-5 py-2.5 font-bold text-xs rounded-xl shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span className="text-white">{guardando ? 'Registrando RP...' : 'Confirmar y Comprometer'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
