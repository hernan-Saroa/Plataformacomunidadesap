import React, { useEffect, useState } from 'react';
import { FilePen, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { TramiteModificacionResumen } from '../../types';
import { ModuleHeader } from '../shared/ModuleHeader';
import { momento } from '../shared/fechas';
import { useAlcance } from '../../auth/alcance';
import { COLOR_ESTADO, DetalleModificacion } from './DetalleModificacion';
import { RadicarModificacion } from './RadicarModificacion';

type Filtro = 'mias' | 'abiertas' | 'todas';
const CERRADAS = ['RECIBIDA', 'PUBLICADA', 'DESISTIDA', 'NEGADA'];

/**
 * Módulo de Modificaciones (150): se radican aquí, fuera del proceso.
 *
 * Sirve también para contratos que nunca se cargaron en la plataforma: esos
 * llegan como notificación y el trámite sigue por fuera.
 */
export function VistaModificaciones({ onVerProceso }: { onVerProceso?: (procesoId: string) => void }) {
  const { puede } = useAlcance();
  const [lista, setLista] = useState<TramiteModificacionResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [radicando, setRadicando] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('mias');

  const leer = () => {
    setCargando(true);
    return contratacionService
      .bandejaModificaciones()
      .then(setLista)
      .catch((err: any) => toast.error('No se pudo cargar la bandeja', { description: err.message }))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    if (!abierta && !radicando) leer();
  }, [abierta, radicando]);

  if (radicando) {
    return (
      <RadicarModificacion
        onVolver={() => setRadicando(false)}
        onRadicada={(t) => {
          setRadicando(false);
          setAbierta(t.id);
        }}
      />
    );
  }

  if (abierta) return <DetalleModificacion id={abierta} onVolver={() => setAbierta(null)} onVerProceso={onVerProceso} />;

  const visibles = lista.filter((t) =>
    filtro === 'mias' ? t.meToca : filtro === 'abiertas' ? !CERRADAS.includes(t.estado) : true,
  );
  const pendientes = lista.filter((t) => t.meToca).length;

  return (
    <div className="space-y-3 md:space-y-4">
      <ModuleHeader
        title="Modificaciones"
        subtitle="Adiciones, prórrogas, cesiones y demás cambios a los contratos, también los que no están en la plataforma"
        icon={<FilePen className="w-5 h-5" />}
        color="#0F766E"
        buttons={
          puede('editar', 'MOD')
            ? [{ label: 'Radicar una modificación', icon: <Plus className="w-4 h-4" />, onClick: () => setRadicando(true) }]
            : []
        }
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
            {filtro === 'mias' ? 'No tienes modificaciones pendientes.' : 'No hay modificaciones.'}
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
                  {t.radicado} · contrato {t.contratoNumero}
                  {!t.vinculada && <span className="ml-2 text-[10px] font-bold text-slate-500">notificación</span>}
                </p>
                <p className="text-[11px] text-slate-500 m-0">
                  {t.tipos.map((x) => x.nombre).join(' + ')} · {t.radicadaPor} · {momento(t.radicadaAt)}
                </p>
              </div>
              {t.meToca && <span className="text-[10px] font-black text-[#003DA5]">TE TOCA</span>}
              <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${COLOR_ESTADO[t.estado] ?? ''}`}>
                {t.estadoNombre}
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}
