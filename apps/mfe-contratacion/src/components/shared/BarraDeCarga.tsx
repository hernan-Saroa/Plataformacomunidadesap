import React from 'react';

import { Carga } from './useCargaPorPartes';

/** «1,5 MB», «120 MB»: lo que se lee en una barra de carga. */
export function megas(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toLocaleString('es-CO', { maximumFractionDigits: mb < 10 ? 1 : 0 })} MB`;
}

/** «quedan unos 40 s», «quedan unos 3 min». */
export function tiempoRestante(segundos: number | null): string | null {
  if (segundos === null || !Number.isFinite(segundos)) return null;
  if (segundos < 60) return `quedan unos ${Math.max(1, Math.round(segundos))} s`;
  return `quedan unos ${Math.round(segundos / 60)} min`;
}

const COLOR = {
  subiendo: '#003DA5',
  verificando: '#003DA5',
  lista: '#047857',
  fallo: '#B91C1C',
  inactiva: '#94A3B8',
} as const;

/**
 * La barra de una carga por partes (BUG-004): cuánto lleva, cuánto falta y en qué va.
 *
 * El ancho va en `style` y no en clases: Tailwind solo genera las del shell, y
 * un ancho calculado no existe entre ellas.
 */
export function BarraDeCarga({
  carga,
  onReintentar,
  onCancelar,
}: {
  carga: Carga;
  onReintentar: () => void;
  onCancelar: () => void;
}) {
  if (carga.estado === 'inactiva' || !carga.archivo) return null;
  const total = carga.archivo.size;
  const restante = tiempoRestante(carga.segundosRestantes);

  const texto =
    carga.estado === 'subiendo'
      ? `Subiendo ${megas(carga.enviados)} de ${megas(total)} · ${carga.porcentaje} %${restante ? ` · ${restante}` : ''}`
      : carga.estado === 'verificando'
        ? 'Verificando el archivo…'
        : carga.estado === 'lista'
          ? `Archivo cargado · ${megas(total)}${
              carga.archivosEnZip ? ` · ${carga.archivosEnZip} documento${carga.archivosEnZip === 1 ? '' : 's'} en el .zip` : ''
            }`
          : carga.error ?? 'No se pudo subir el archivo';

  return (
    <div className="space-y-1.5">
      <div
        role="progressbar"
        aria-label={`Carga de ${carga.archivo.name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={carga.porcentaje}
        aria-valuetext={texto}
        style={{ height: 8, borderRadius: 9999, background: '#E2E8F0', overflow: 'hidden' }}
      >
        <div
          style={{
            height: '100%',
            width: `${carga.estado === 'fallo' ? Math.max(carga.porcentaje, 2) : carga.porcentaje}%`,
            background: COLOR[carga.estado],
            transition: 'width 200ms ease-out',
          }}
        />
      </div>
      <div className="flex items-start gap-2 flex-wrap">
        <p
          role={carga.estado === 'fallo' ? 'alert' : 'status'}
          className={`text-[11px] m-0 leading-relaxed flex-1 tabular-nums ${
            carga.estado === 'fallo' ? 'text-red-700 font-bold' : carga.estado === 'lista' ? 'text-emerald-800' : 'text-slate-600'
          }`}
        >
          {texto}
        </p>
        {carga.estado === 'fallo' && (
          <button
            type="button"
            onClick={onReintentar}
            className="text-[11px] font-bold text-[#003DA5] hover:underline"
          >
            Reintentar
          </button>
        )}
        {(carga.estado === 'subiendo' || carga.estado === 'fallo') && (
          <button
            type="button"
            onClick={onCancelar}
            className="text-[11px] font-bold text-slate-500 hover:underline"
          >
            Cancelar la carga
          </button>
        )}
      </div>
    </div>
  );
}
