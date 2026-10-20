import { useEffect, useState } from 'react';

import { useRevisionProgramacion } from '../services/actualizacionProgramacion';
import {
  enviarConcertacion, getConfiguracionConcertacion, getMiConcertacion,
  type ConcertacionDocente as Item, type ConfiguracionConcertacion,
} from '../services/api/concertacionApi';
import { FirmaOtpModal } from './FirmaOtpModal';
import { EtapasConcertacion, RegistroFirmas } from './EtapasConcertacion';

const ESTADO: Record<Item['estado'], string> = {
  ENVIADA: 'Enviada: en revisión académica',
  REVISADA: 'Revisada: pendiente de aprobación',
  APROBADA: 'Aprobada',
  DEVUELTA: 'Devuelta: corrija y vuelva a enviar',
};

/**
 * EFDS-2315 — El docente envía su docencia del periodo a concertación y firma.
 *
 * Se monta en el portal docente (`PortalDocenteProgramacion`), una vez por cada
 * periodo en que el docente tiene franjas. Si la concertación está apagada, o el
 * periodo es anterior al corte, no muestra nada: ahí el flujo de hoy (aprobación
 * de la jefatura) sigue igual.
 *
 * La firma se hace en el modal de firma digital (el mismo diseño del PTA), que se abre al pulsar «Enviar».
 */
export function ConcertacionDocente({ idPeriodo, codigoPeriodo, docenteNombre }: {
  idPeriodo: string; codigoPeriodo?: string | null; docenteNombre?: string;
}) {
  const revision = useRevisionProgramacion('concertacion', 'portal-docente');
  const [config, setConfig] = useState<ConfiguracionConcertacion | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [firmando, setFirmando] = useState(false);
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
  // Antes del corte (o en un periodo que no es AAAA-S) la Docencia la aprueba el PTA:
  // el servidor rechazaría el envío (409), así que ni se ofrece.
  if (codigoPeriodo && config.desdePeriodo
    && !(/^\d{4}-[12]$/.test(codigoPeriodo) && codigoPeriodo >= config.desdePeriodo)) return null;

  const devueltas = items.filter((i) => i.estado === 'DEVUELTA');
  const puedeEnviar = items.length === 0 || devueltas.length > 0;
  const horas = items.length ? items.reduce((s, i) => s + Number(i.horas || 0), 0) : null;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-bold text-slate-800 text-sm">
          Concertación de mi docencia{codigoPeriodo ? ` · Periodo ${codigoPeriodo}` : ''}
        </h4>
        {config.firmaSimulada && <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700">Firma simulada (pruebas)</span>}
      </div>

      {items.length === 0 && (
        <p className="text-xs text-slate-500">
          Cuando tenga sus franjas listas, envíelas a concertación. Primero las revisa el área académica y luego
          las aprueba la jefatura; cada paso queda firmado.
        </p>
      )}

      {items.map((i) => (
        <div key={i.idConcertacion} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 space-y-2">
          <p className="text-xs text-slate-700">
            <strong>{i.nivel === 'pregrado' ? 'Pregrado' : 'Posgrado'}</strong> · {i.horas} h · {ESTADO[i.estado]}
          </p>
          <EtapasConcertacion estado={i.estado} />
          {i.comentario && i.estado === 'DEVUELTA' && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1">Motivo de la devolución: {i.comentario}</p>
          )}
          <RegistroFirmas firmas={i.firmas} />
        </div>
      ))}

      {puedeEnviar && (
        <button type="button" onClick={() => { setAviso(''); setFirmando(true); }}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#003DA5] hover:bg-[#002d7a] text-white text-sm font-bold">
          {devueltas.length > 0 ? 'Reenviar a concertación' : 'Enviar a concertación'}
        </button>
      )}
      {aviso && <p role="alert" className="text-xs text-red-700">{aviso}</p>}

      {firmando && (
        <FirmaOtpModal
          etapaLabel={devueltas.length > 0 ? 'Reenvío a concertación' : 'Envío a concertación'}
          firmanteCargo="Docente"
          firmanteNombre={docenteNombre}
          docenteNombre={docenteNombre || 'Docente'}
          periodo={codigoPeriodo || ''}
          totalHoras={horas}
          referencia={idPeriodo}
          firmaSimulada={config.firmaSimulada}
          textoConfirmar="Firmar y enviar"
          onFirmar={async (codigo) => { setItems(await enviarConcertacion(idPeriodo, codigo)); }}
          onCerrar={() => setFirmando(false)}
        />
      )}
    </div>
  );
}
