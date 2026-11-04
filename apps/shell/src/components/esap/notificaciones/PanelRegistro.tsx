/**
 * Registro general de las notificaciones (EFDS-2406): historial de cambios de la
 * configuración y avisos omitidos o desviados, de todos los módulos.
 */
import React, { useEffect, useState } from 'react';
import { Ban, History } from 'lucide-react';
import {
  MOTIVOS,
  notificacionesConfigService,
  type CambioConfiguracion,
  type EnvioOmitido,
} from '../../../services/api/notificacionesConfig.service';
import { Cargando, fecha, nombreCampo, valorLegible, Vacio } from './piezas';

type Pestana = 'historial' | 'omitidas';

function PanelHistorial({ cambios }: { cambios: CambioConfiguracion[] | null }) {
  if (cambios === null) return <Cargando />;
  if (cambios.length === 0) return <Vacio icono={<History className="h-6 w-6 text-slate-400" />} titulo="Sin cambios todavía" detalle="Cada cambio guardado desde esta consola queda aquí y en Auditoría." />;
  return (
    <ul className="space-y-2">
      {cambios.map((c) => (
        <li key={c.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-slate-900">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-600">{c.entidad}</span>{' '}
              <span className="font-mono text-xs">{c.clave}</span>
            </p>
            <p className="text-xs text-slate-500">{fecha(c.fecha)} · {c.usuario ?? '—'}</p>
          </div>
          <ul className="mt-2 space-y-0.5 text-xs">
            {Object.keys(c.nuevo ?? {}).map((k) => (
              <li key={k} className="text-slate-700">
                <span className="text-slate-500">{nombreCampo[k] ?? k}:</span>{' '}
                <span className="line-through text-slate-400">{valorLegible(k, c.anterior?.[k])}</span>{' → '}
                <span className="font-medium">{valorLegible(k, c.nuevo?.[k])}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function PanelOmitidas({ omitidas }: { omitidas: EnvioOmitido[] | null }) {
  if (omitidas === null) return <Cargando />;
  if (omitidas.length === 0) return <Vacio icono={<Ban className="h-6 w-6 text-slate-400" />} titulo="Nada omitido" detalle="Aquí queda cada aviso que un módulo intentó mandar y la configuración no dejó pasar, o que se desvió a un buzón." />;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
          <tr><th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Módulo</th><th className="px-3 py-2">Evento</th><th className="px-3 py-2">Canal</th><th className="px-3 py-2">Destinatario</th><th className="px-3 py-2">Motivo</th></tr>
        </thead>
        <tbody>
          {omitidas.map((o) => (
            <tr key={o.id} className="border-t border-slate-100 text-slate-700">
              <td className="whitespace-nowrap px-3 py-2">{fecha(o.fecha)}</td>
              <td className="px-3 py-2">{o.codigo_modulo}</td>
              <td className="px-3 py-2"><span className="font-mono">{o.clave_evento}</span>{o.titulo && <span className="block text-slate-500">{o.titulo}</span>}</td>
              <td className="px-3 py-2">{o.canal}</td>
              <td className="max-w-[14rem] truncate px-3 py-2" title={o.destinatario ?? ''}>{o.destinatario ?? '—'}</td>
              <td className="px-3 py-2">
                {MOTIVOS[o.motivo] ?? o.motivo}
                {o.motivo === 'desviado' && o.desviado_a && <span className="block text-slate-500">Llegó a {o.desviado_a}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PanelRegistro() {
  const [pestana, setPestana] = useState<Pestana>('omitidas');
  const [historial, setHistorial] = useState<CambioConfiguracion[] | null>(null);
  const [omitidas, setOmitidas] = useState<EnvioOmitido[] | null>(null);

  useEffect(() => {
    if (pestana === 'historial') { setHistorial(null); notificacionesConfigService.historial().then(setHistorial).catch(() => setHistorial([])); }
    if (pestana === 'omitidas') { setOmitidas(null); notificacionesConfigService.omitidas().then(setOmitidas).catch(() => setOmitidas([])); }
  }, [pestana]);

  const pestanas: [Pestana, string, React.ReactNode][] = [
    ['omitidas', 'Avisos omitidos', <Ban key="b" className="h-4 w-4" />],
    ['historial', 'Historial de cambios', <History key="h" className="h-4 w-4" />],
  ];

  return (
    <section className="space-y-3" aria-label="Registro de notificaciones">
      <div>
        <h2 className="text-sm font-bold text-gray-900">Registro de notificaciones</h2>
        <p className="text-xs text-gray-500">De todos los módulos: qué se omitió o se desvió y quién cambió la configuración.</p>
      </div>
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm" role="tablist">
        {pestanas.map(([id, nombre, icono]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={pestana === id}
            onClick={() => setPestana(id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pestana === id ? 'bg-blue-50 text-[#1e5da8]' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {icono}
            {nombre}
          </button>
        ))}
      </div>
      {pestana === 'historial' ? <PanelHistorial cambios={historial} /> : <PanelOmitidas omitidas={omitidas} />}
    </section>
  );
}
