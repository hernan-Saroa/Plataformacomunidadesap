import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  AlertCircle,
  Calendar,
  DollarSign,
  RotateCcw,
  UploadCloud,
  Paperclip,
  Trash2,
} from 'lucide-react';
import { ReintegroComision, RegistrarReintegroDto } from '../types/viaticos';
import { viaticosService } from '../services/api/viaticosService';
import { formatearMoneda } from '../utils/viaticosUtils';

interface RegistrarReintegroModalProps {
  abierta: boolean;
  reintegro: ReintegroComision | null;
  onCerrar: () => void;
  onExito: (reintegroActualizado: ReintegroComision) => void;
}

const TAMANO_MAXIMO_SOPORTE = 25 * 1024 * 1024;

const fechaHoyColombia = (): string =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

export default function RegistrarReintegroModal({
  abierta,
  reintegro,
  onCerrar,
  onExito,
}: RegistrarReintegroModalProps) {
  const [valorReintegrado, setValorReintegrado] = useState<number>(0);
  const [fechaReintegro, setFechaReintegro] = useState(fechaHoyColombia());
  const [observaciones, setObservaciones] = useState('');
  const [archivoSoporte, setArchivoSoporte] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (abierta && reintegro) {
      setValorReintegrado(Number(reintegro.valorAReintegrar) || 0);
      setFechaReintegro(fechaHoyColombia());
      setObservaciones('');
      setArchivoSoporte(null);
      setError(null);
    }
  }, [abierta, reintegro]);

  if (!abierta || !reintegro) return null;

  const validarYEstablecerArchivo = (file: File) => {
    const nombre = file.name.toLowerCase();
    const esValido =
      file.type === 'application/pdf' ||
      file.type.startsWith('image/') ||
      ['.pdf', '.png', '.jpg', '.jpeg', '.webp'].some((ext) => nombre.endsWith(ext));
    if (!esValido) {
      setError('El soporte de la consignación debe ser un documento PDF o una imagen (PNG, JPG, JPEG).');
      return;
    }
    if (file.size > TAMANO_MAXIMO_SOPORTE) {
      setError('El soporte de la consignación no puede superar los 25 MB.');
      return;
    }
    setError(null);
    setArchivoSoporte(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!(valorReintegrado > 0)) {
      setError('El valor reintegrado debe ser un monto positivo mayor a cero.');
      return;
    }

    if (Math.round(valorReintegrado * 100) !== Math.round(Number(reintegro.valorAReintegrar) * 100)) {
      setError(
        `El valor reintegrado debe ser igual al valor a reintegrar (${formatearMoneda(reintegro.valorAReintegrar)}).`,
      );
      return;
    }

    if (!fechaReintegro) {
      setError('Por favor seleccione la fecha de la consignación del reintegro.');
      return;
    }

    if (fechaReintegro > fechaHoyColombia()) {
      setError('La fecha del reintegro no puede ser posterior a la fecha actual.');
      return;
    }

    if (!archivoSoporte) {
      setError('Debe adjuntar el soporte de la consignación del reintegro.');
      return;
    }

    setGuardando(true);
    try {
      const uploadRes = await viaticosService.subirSoporteReintegro(reintegro.id, archivoSoporte);
      const soportePath = uploadRes?.urlRepositorio;
      if (!soportePath) {
        setError('No fue posible cargar el soporte de la consignación. Intente nuevamente.');
        return;
      }

      const payload: RegistrarReintegroDto = {
        valorReintegrado: Number(valorReintegrado),
        fechaReintegro,
        soportePath,
        observaciones: observaciones.trim() || undefined,
      };

      const resultado = await viaticosService.registrarReintegro(reintegro.id, payload);
      onExito(resultado);
      onCerrar();
    } catch (err: any) {
      console.error('Error al registrar el reintegro:', err);
      const mensaje = err?.response?.data?.message || err?.message;
      setError(
        (Array.isArray(mensaje) ? mensaje.join(' ') : mensaje) ||
          'Error al registrar el reintegro en el sistema. Intente nuevamente.',
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-reintegro-title"
    >
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div
          style={{
            background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
            color: '#ffffff',
          }}
          className="bg-emerald-900 px-6 py-5 text-white flex items-start justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl border border-white/30">
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-black/30 text-emerald-100 border border-emerald-300/40">
                Etapa 8 — Reintegros (RF-PAG-004)
              </span>
              <h3 id="modal-reintegro-title" className="text-lg font-bold text-white mt-1">
                Registrar reintegro
              </h3>
              <p className="text-xs text-emerald-100 mt-0.5">
                {reintegro.consecutivoUnico} — {reintegro.comisionado?.nombre || 'Comisionado'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Valor pagado</p>
              <p className="text-sm font-black text-slate-800 mt-0.5">
                {formatearMoneda(reintegro.valorPagado)}
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Valor a reintegrar</p>
              <p className="text-sm font-black text-amber-800 mt-0.5">
                {formatearMoneda(reintegro.valorAReintegrar)}
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="reintegro-valor" className="block text-xs font-bold text-slate-700 mb-1">
                Valor reintegrado <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="reintegro-valor"
                  type="number"
                  min={1}
                  max={Number(reintegro.valorAReintegrar)}
                  step="any"
                  value={valorReintegrado || ''}
                  onChange={(e) => setValorReintegrado(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label htmlFor="reintegro-fecha" className="block text-xs font-bold text-slate-700 mb-1">
                Fecha de la consignación <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="reintegro-fecha"
                  type="date"
                  max={fechaHoyColombia()}
                  value={fechaReintegro}
                  onChange={(e) => setFechaReintegro(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="reintegro-soporte" className="block text-xs font-bold text-slate-700 mb-1">
              Soporte de la consignación <span className="text-red-500">*</span>
            </label>
            <input
              id="reintegro-soporte"
              ref={inputArchivoRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) validarYEstablecerArchivo(file);
                e.target.value = '';
              }}
            />
            {archivoSoporte ? (
              <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                <span className="flex items-center gap-2 text-xs font-semibold text-emerald-800 min-w-0">
                  <Paperclip className="w-4 h-4 shrink-0" />
                  <span className="truncate">{archivoSoporte.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setArchivoSoporte(null)}
                  aria-label="Quitar soporte"
                  className="text-rose-600 hover:text-rose-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputArchivoRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl px-4 py-4 text-xs font-semibold text-slate-500 hover:text-emerald-700"
              >
                <UploadCloud className="w-4 h-4" />
                Adjuntar comprobante (PDF o imagen, máx. 25 MB)
              </button>
            )}
          </div>

          <div>
            <label htmlFor="reintegro-observaciones" className="block text-xs font-bold text-slate-700 mb-1">
              Observaciones
            </label>
            <textarea
              id="reintegro-observaciones"
              rows={2}
              maxLength={1000}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              style={{ backgroundColor: '#047857', color: '#ffffff' }}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl disabled:opacity-60"
            >
              {guardando ? 'Registrando...' : 'Registrar reintegro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
