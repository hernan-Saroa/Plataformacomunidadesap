import { useEffect, useState } from 'react';
import { useRevisionProgramacion } from '../services/actualizacionProgramacion';
import { aceptarProgramacion, reportarNovedad, getConfiguracionConcertacion, getMiConcertacion, type ConcertacionDocente as Item, type ConfiguracionConcertacion, type TipoNovedad } from '../services/api/concertacionApi';
import { FirmaOtpModal } from './FirmaOtpModal';
import { RegistroFirmas } from './EtapasConcertacion';
import { ModalConfirmacion } from './ModalConfirmacion';

const ESTADO: Record<Item['estado'], string> = {
  ENVIADA: 'En revisión interna', REVISADA: 'Pendiente de aprobación interna',
  APROBADA: 'Aprobada (flujo anterior)', DEVUELTA: 'Devuelta al programador',
  POR_ACEPTAR: 'Aprobada internamente · pendiente de tu aceptación', ACEPTADA: 'Aceptada · docencia enviada al PTA', NOVEDAD: 'Novedad reportada · pendiente del programador',
};
export function ConcertacionDocente({ idPeriodo, codigoPeriodo, docenteNombre }: { idPeriodo: string; codigoPeriodo?: string | null; docenteNombre?: string }) {
  const revision = useRevisionProgramacion('concertacion', 'portal-docente');
  const [config, setConfig] = useState<ConfiguracionConcertacion | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [firmando, setFirmando] = useState<Item | null>(null);
  const [novedad, setNovedad] = useState<{ item: Item; foco: HTMLElement } | null>(null);
  const [tipo, setTipo] = useState<TipoNovedad | ''>('');
  const [justificacion, setJustificacion] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');
  const [errorNovedad, setErrorNovedad] = useState('');
  useEffect(() => {
    let vigente = true;
    getConfiguracionConcertacion().then(c => { if (vigente) setConfig(c); }).catch(() => { if (vigente) setConfig(null); });
    return () => { vigente = false; };
  }, []);
  useEffect(() => {
    let vigente = true;
    setItems(null); setAviso('');
    if (config?.habilitada && idPeriodo) getMiConcertacion(idPeriodo).then(r => { if (vigente) setItems(r); }).catch(e => { if (vigente) setAviso(e.message || 'No se pudo consultar tu programación aprobada.'); });
    return () => { vigente = false; };
  }, [config?.habilitada, idPeriodo, revision]);
  if (!config?.habilitada) return null;
  // La API aplica el corte y la identidad; no se comparan códigos personalizados como texto.
  const guardarNovedad = async () => {
    if (!novedad || !tipo || justificacion.trim().length < 10 || ocupado) return;
    setOcupado(true); setErrorNovedad('');
    try { await reportarNovedad(novedad.item.idConcertacion, tipo, justificacion.trim()); setNovedad(null); }
    catch (e: any) { setErrorNovedad(e.message); }
    finally { setOcupado(false); }
  };
  return <section className="bg-white p-4 rounded-xl border border-slate-200 space-y-3" aria-label="Aceptación de mi programación">
    <h4 className="font-bold">Mi programación aprobada · Periodo {codigoPeriodo || idPeriodo}</h4>
    {aviso && <p role="alert" className="text-red-700">{aviso}</p>}
    {!items && !aviso && <p role="status">Consultando programación aprobada…</p>}
    {items?.length === 0 && <p>No tienes programación pendiente de aceptación en este periodo. Aparecerá aquí cuando termine la aprobación interna.</p>}
    {items?.map(i => <article key={i.idConcertacion} className="rounded-xl border p-3 space-y-2">
      <h5 className="font-bold">{i.nivel === 'pregrado' ? 'Pregrado' : 'Posgrado'} · {i.horas} h · {ESTADO[i.estado]}</h5>
      <ul>{i.franjas?.map(f => <li key={f.idFranja}>{f.codigoAsignatura} · {f.asignatura} · {f.horas} h</li>)}</ul>
      {i.comentario && <p>{i.comentario}</p>}
      {i.novedad && <p className="bg-amber-50 p-3">Novedad: {i.novedad.tipo} · {i.novedad.justificacion}</p>}
      <RegistroFirmas firmas={i.firmas} />
      {i.estado === 'POR_ACEPTAR' && <div className="flex gap-2"><button className="rounded-lg bg-[#003DA5] text-white p-2" onClick={() => setFirmando(i)}>Aceptar y firmar</button><button className="rounded-lg border p-2" onClick={e => { setTipo(''); setJustificacion(''); setErrorNovedad(''); setNovedad({ item: i, foco: e.currentTarget }); }}>Reportar novedad</button></div>}
    </article>)}
    {firmando && <FirmaOtpModal etapaLabel="Aceptación de mi programación" firmanteCargo="Docente" firmanteNombre={docenteNombre} docenteNombre={docenteNombre || 'Docente'} periodo={codigoPeriodo || idPeriodo} totalHoras={firmando.horas} referencia={firmando.idConcertacion} firmaSimulada={config.firmaSimulada} textoConfirmar="Firmar y aceptar" onFirmar={async codigo => { await aceptarProgramacion(firmando.idConcertacion, codigo); }} onCerrar={() => setFirmando(null)} />}
    {novedad && <ModalConfirmacion titulo="Reportar novedad" advertencia="La programación vuelve al programador para su revisión. No modificarás asignaturas, franjas ni horas desde aquí." onCancelar={() => setNovedad(null)} onConfirmar={guardarNovedad} ocupado={ocupado} confirmarDeshabilitado={!tipo || justificacion.trim().length < 10} retornarFoco={novedad.foco}>
      <label className="block">Tipo de novedad<select disabled={ocupado} value={tipo} onChange={e => setTipo(e.target.value as TipoNovedad)} className="block border rounded-lg p-2 w-full"><option value="">Selecciona el tipo</option><option value="investigacion">Investigación</option><option value="movilidad">Movilidad</option><option value="perfil">Perfil</option><option value="otra">Otra</option></select></label>
      <label className="block">Justificación (mínimo 10 caracteres)<textarea disabled={ocupado} value={justificacion} onChange={e => setJustificacion(e.target.value)} className="block border rounded-lg p-2 w-full" rows={4} /></label>
      {errorNovedad && <p role="alert" className="text-red-700">{errorNovedad}</p>}
    </ModalConfirmacion>}
  </section>;
}
