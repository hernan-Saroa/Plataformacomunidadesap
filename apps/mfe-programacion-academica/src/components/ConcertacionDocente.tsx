import { useEffect, useState } from 'react';

import { useRevisionProgramacion } from '../services/actualizacionProgramacion';
import {
  enviarConcertacion, getConfiguracionConcertacion, getMiConcertacion,
  type ConcertacionDocente as Item, type ConfiguracionConcertacion,
} from '../services/api/concertacionApi';

const ESTADO: Record<Item['estado'], string> = {
  ENVIADA: 'Enviada: en revisión',
  REVISADA: 'Revisada: pendiente de aprobación',
  APROBADA: 'Aprobada',
  DEVUELTA: 'Devuelta: corrija y vuelva a enviar',
};

/**
 * EFDS-2315 — El docente envía su docencia del periodo a concertación y firma.
 *
 * Pensado para la vista del portal docente (archivo de Codex): se monta allí con
 * el periodo seleccionado. Si la concertación está apagada no muestra nada: el
 * flujo de hoy (aprobación de la jefatura) sigue igual.
 */
export function ConcertacionDocente({ idPeriodo }: { idPeriodo: string }) {
  const revision = useRevisionProgramacion('concertacion', 'portal-docente');
  const [config, setConfig] = useState<ConfiguracionConcertacion | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [codigo, setCodigo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    let vigente = true;
    getConfiguracionConcertacion().then((c) => { if (vigente) setConfig(c); }).catch(() => { if (vigente) setConfig(null); });
    return () => { vigente = false; };
  }, []);

  useEffect(() => {
    if (!config?.habilitada || !idPeriodo) return;
    let vigente = true;
    getMiConcertacion(idPeriodo).then((r) => { if (vigente) setItems(r); }).catch((e) => { if (vigente) setAviso(e?.message || ''); });
    return () => { vigente = false; };
  }, [config?.habilitada, idPeriodo, revision]);

  if (!config?.habilitada) return null;

  const puedeEnviar = items.length === 0 || items.some((i) => i.estado === 'DEVUELTA');
  const enviar = async () => {
    setAviso(''); setOcupado(true);
    try { setItems(await enviarConcertacion(idPeriodo, codigo)); setCodigo(''); }
    catch (e: any) { setAviso(e?.message || 'No se pudo enviar.'); }
    finally { setOcupado(false); }
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
      <h4 className="font-bold text-slate-800 text-sm">Concertación de mi docencia</h4>
      {items.map((i) => (
        <div key={i.idConcertacion} className="text-xs text-slate-600">
          <strong>{i.nivel === 'pregrado' ? 'Pregrado' : 'Posgrado'}</strong> · {i.horas} h · {ESTADO[i.estado]}
          {i.comentario && <p className="text-amber-700">Motivo: {i.comentario}</p>}
          <p className="text-slate-400">Firmas: {i.firmas.map((f) => f.rol).join(', ') || '—'}</p>
        </div>
      ))}
      {puedeEnviar && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-slate-600">
            Código de firma
            <input aria-label="Código de firma" inputMode="numeric" maxLength={6} value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
              className="w-24 border border-slate-200 rounded px-2 py-1 text-sm" />
          </label>
          <button type="button" disabled={!/^\d{6}$/.test(codigo) || ocupado} onClick={enviar}
            className="px-3 py-1.5 rounded-lg bg-[#003DA5] text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1">
            {ocupado ? 'Enviando…' : 'Enviar a concertación'}
          </button>
          {config.firmaSimulada && <span className="text-[11px] text-amber-700">Firma simulada (pruebas)</span>}
        </div>
      )}
      {aviso && <p role="alert" className="text-xs text-red-700">{aviso}</p>}
    </div>
  );
}
