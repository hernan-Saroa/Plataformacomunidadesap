import React, { useEffect, useState } from 'react';
import { BellRing, FileCheck2, Landmark, ShieldAlert, Timer } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { AlertaVencimiento } from '../../types';
import { fechaLarga } from '../shared/fechas';

/** Cuántos días antes se avisa. Los cortes que un gestor usa de verdad. */
const ANTICIPACIONES = [15, 30, 60, 90];

const RASGOS: Record<
  AlertaVencimiento['tipo'],
  { etiqueta: string; icono: typeof ShieldAlert; color: string }
> = {
  AMPARO: { etiqueta: 'Póliza', icono: ShieldAlert, color: '#7C3AED' },
  CDP: { etiqueta: 'CDP', icono: Landmark, color: '#0891B2' },
  REGISTRO_PRESUPUESTAL: { etiqueta: 'RP', icono: Landmark, color: '#0891B2' },
  LIQUIDACION: { etiqueta: 'Liquidación', icono: FileCheck2, color: '#D97706' },
};

/**
 * Alertas de vencimiento — tab propio (EFDS-1185, RF-SIS-03).
 *
 * Va en el menú y no dentro de un proceso porque quien vigila vencimientos los
 * mira todos juntos: una póliza que vence no se descubre entrando proceso por
 * proceso.
 */
export function VistaAlertas() {
  const [alertas, setAlertas] = useState<AlertaVencimiento[]>([]);
  const [dias, setDias] = useState(30);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCargando(true);
    contratacionService
      .alertas(dias)
      .then((a) => {
        setAlertas(a);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [dias]);

  const vencidas = alertas.filter((a) => a.estado === 'VENCIDO');
  const porVencer = alertas.filter((a) => a.estado === 'POR_VENCER');

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-start gap-3">
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#DC262615' }}
          >
            <BellRing className="w-5 h-5" style={{ color: '#DC2626' }} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold m-0" style={{ color: '#DC2626' }}>
              Alertas de vencimiento
            </h2>
            <p className="text-[12.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">
              Pólizas, CDP, registros presupuestales y plazos de liquidación que están por
              vencer o ya vencieron. Lo más urgente arriba.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500">Avisar con</span>
          {ANTICIPACIONES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDias(d)}
              aria-pressed={dias === d}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626]/40 ${
                  dias === d
                    ? 'bg-[#DC2626]/10 border-[#DC2626]/30 text-[#DC2626]'
                    : 'bg-white border-gray-200 text-slate-600 hover:border-slate-300'
                }`}
            >
              {d} días
            </button>
          ))}
        </div>
      </div>

      {/* Lo vencido primero y aparte: no es lo mismo «se acerca» que «se pasó». */}
      {!cargando && !error && (
        <div className="grid grid-cols-2 gap-3">
          <Resumen
            etiqueta="Ya vencieron"
            cuantas={vencidas.length}
            color="#DC2626"
            icono={ShieldAlert}
          />
          <Resumen
            etiqueta={`Vencen en ${dias} días o menos`}
            cuantas={porVencer.length}
            color="#D97706"
            icono={Timer}
          />
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {cargando ? (
          <p className="text-xs text-slate-500 m-0 px-4 py-6 text-center">Consultando…</p>
        ) : error ? (
          <p className="text-xs text-red-600 m-0 px-4 py-6 text-center">{error}</p>
        ) : alertas.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <FileCheck2 className="w-8 h-8 mx-auto text-emerald-300 mb-2" aria-hidden="true" />
            <p className="text-[12.5px] font-bold text-slate-700 m-0">Nada por vencer</p>
            <p className="text-[11.5px] text-slate-500 m-0 mt-0.5">
              Ninguna póliza, CDP ni plazo vence en los próximos {dias} días.
            </p>
          </div>
        ) : (
          <ul className="m-0 p-0 list-none divide-y divide-gray-100">
            {alertas.map((a, i) => (
              <Fila key={`${a.procesoId}-${a.tipo}-${i}`} a={a} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const Resumen = ({
  etiqueta,
  cuantas,
  color,
  icono: Icono,
}: {
  etiqueta: string;
  cuantas: number;
  color: string;
  icono: typeof ShieldAlert;
}) => (
  <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
    <span
      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: `${color}15` }}
    >
      <Icono className="w-4 h-4" style={{ color }} aria-hidden="true" />
    </span>
    <div className="min-w-0">
      <span className="block text-xl font-bold leading-none" style={{ color }}>
        {cuantas}
      </span>
      <span className="block text-[11px] text-slate-500 mt-0.5">{etiqueta}</span>
    </div>
  </div>
);

function Fila({ a }: { a: AlertaVencimiento }) {
  const rasgo = RASGOS[a.tipo];
  const vencido = a.estado === 'VENCIDO';

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${rasgo.color}12` }}
      >
        <rasgo.icono className="w-4 h-4" style={{ color: rasgo.color }} aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[12.5px] font-bold text-slate-800">{a.descripcion}</span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
            style={{
              color: rasgo.color,
              borderColor: `${rasgo.color}40`,
              backgroundColor: `${rasgo.color}0D`,
            }}
          >
            {rasgo.etiqueta}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 m-0 mt-0.5">
          {a.contrato ?? a.radicado ?? '—'}
          {a.responsable ? ` · ${a.responsable}` : ' · sin responsable asignado'}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <span
          className={`block text-[12px] font-bold ${vencido ? 'text-red-600' : 'text-amber-600'}`}
        >
          {vencido
            ? `Venció hace ${Math.abs(a.diasRestantes)} días`
            : a.diasRestantes === 0
              ? 'Vence hoy'
              : `En ${a.diasRestantes} días`}
        </span>
        <span className="block text-[10.5px] text-slate-400 tabular-nums">
          {fechaLarga(a.vence.slice(0, 10))}
        </span>
      </div>
    </li>
  );
}
