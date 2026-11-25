import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileCheck2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { TramiteLiquidacionResumen } from '../../types';
import { ModuleHeader } from '../shared/ModuleHeader';
import { momento } from '../shared/fechas';
import { COLOR_ESTADO_LIQUIDACION, DetalleTramiteLiquidacion } from './DetalleTramiteLiquidacion';

type Filtro = 'mias' | 'abiertas' | 'todas';
const CERRADAS = ['PUBLICADA', 'CERRADA', 'DESISTIDA'];

/**
 * Bandeja de liquidaciones y cierres (151).
 *
 * El trámite se radica desde la 10.2 del proceso; aquí lo ven quienes lo
 * asignan, revisan y dan visto bueno, con lo que les toca primero.
 */
export function VistaLiquidaciones({ onVerProceso }: { onVerProceso?: (procesoId: string) => void }) {
  const [lista, setLista] = useState<TramiteLiquidacionResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('mias');

  useEffect(() => {
    if (abierta) return;
    setCargando(true);
    contratacionService
      .bandejaLiquidaciones()
      .then(setLista)
      .catch((err: any) => toast.error('No se pudo cargar la bandeja', { description: err.message }))
      .finally(() => setCargando(false));
  }, [abierta]);

  if (abierta) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setAbierta(null)}
          className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#003DA5] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a la bandeja
        </button>
        <DetalleTramiteLiquidacion id={abierta} onVerProceso={onVerProceso} />
      </div>
    );
  }

  const visibles = lista.filter((t) =>
    filtro === 'mias' ? t.meToca : filtro === 'abiertas' ? !CERRADAS.includes(t.estado) : true,
  );
  const pendientes = lista.filter((t) => t.meToca).length;

  return (
    <div className="space-y-3 md:space-y-4">
      <ModuleHeader
        title="Liquidaciones y cierres"
        subtitle="Se radican desde la 10.2 del proceso, cuando termina la etapa 9"
        icon={<FileCheck2 className="w-5 h-5" />}
        color="#7C3AED"
        buttons={[]}
      />

      <div className="flex gap-2 flex-wrap">
        {([
          ['mias', `Me tocan${pendientes ? ` (${pendientes})` : ''}`],
          ['abiertas', 'En curso'],
          ['todas', 'Todas'],
        ] as const).map(([clave, etiqueta]) => (
          <button
            key={clave}
            type="button"
            onClick={() => setFiltro(clave)}
            className={`px-3 py-1.5 text-[11.5px] font-bold rounded-md border ${
              filtro === clave ? 'bg-[#003DA5] text-white border-[#003DA5]' : 'bg-white text-slate-700 border-gray-300 hover:bg-slate-50'
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {cargando && <p className="text-[11.5px] text-slate-400 m-0 px-4 py-6">Cargando…</p>}
        {!cargando && visibles.length === 0 && (
          <p className="text-[12px] text-slate-500 m-0 px-4 py-8 text-center">
            {filtro === 'mias' ? 'No tienes liquidaciones ni cierres pendientes.' : 'No hay trámites.'}
          </p>
        )}
        {!cargando &&
          visibles.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setAbierta(t.id)}
              className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-start gap-3 flex-wrap"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-slate-800 m-0">
                  {t.radicado} · {t.claseNombre} · contrato {t.contratoNumero ?? '—'}
                </p>
                <p className="text-[11px] text-slate-500 m-0">
                  {t.contratistaNombre ? `${t.contratistaNombre} · ` : ''}
                  {t.radicadoProceso ? `${t.radicadoProceso} · ` : ''}
                  {t.radicadaPor} · {momento(t.radicadaAt)}
                </p>
              </div>
              {t.meToca && <span className="text-[10px] font-black text-[#003DA5]">TE TOCA</span>}
              <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${COLOR_ESTADO_LIQUIDACION[t.estado] ?? ''}`}>
                {t.estadoNombre}
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}
