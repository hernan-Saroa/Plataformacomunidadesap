import { useEffect, useState } from 'react';
import { enviarDocenciaARevision, getRevisionProgramador, type RevisionProgramador } from '../services/api/concertacionApi';
import type { CalendarioDocente } from '../services/api/vistaApi';
import { useRevisionProgramacion } from '../services/actualizacionProgramacion';

const ESTADOS: Record<string, string> = { ENVIADA: 'En revisión', REVISADA: 'Pendiente de aprobación', POR_ACEPTAR: 'Por aceptar', ACEPTADA: 'Aceptada', APROBADA: 'Aprobada', NOVEDAD: 'Novedad reportada', DEVUELTA: 'Devuelta al programador' };
type Nivel = 'pregrado' | 'posgrado';

export function EnvioRevisionDocente({ calendario, niveles, programable }: { calendario: CalendarioDocente; niveles: Nivel[]; programable: boolean }) {
  const [revisiones, setRevisiones] = useState<RevisionProgramador[] | null>(null);
  const [errorConsulta, setErrorConsulta] = useState('');
  const [errorEnvio, setErrorEnvio] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState('');
  const revision = useRevisionProgramacion('concertacion');
  const periodo = calendario.periodo.id;
  const documento = calendario.docente.documento;
  useEffect(() => {
    let vigente = true;
    setErrorConsulta('');
    getRevisionProgramador(periodo).then(r => { if (vigente) setRevisiones(r); })
      .catch(e => { if (vigente) setErrorConsulta(e.message || 'No se pudo consultar la revisión interna.'); });
    return () => { vigente = false; };
  }, [periodo, revision]);
  const propias = (revisiones ?? []).filter(r => r.documento === documento && niveles.includes(r.nivel));
  const franjas = calendario.franjas.filter(f => !f.reservada && f.nivel && niveles.includes(f.nivel));
  const grupos = [...new Set(franjas.map(f => f.idGrupo).filter((g): g is string => !!g))];
  const nivelesPendientes = new Set(franjas.filter(f => f.estado === 'TOMADA').map(f => f.nivel));
  const bloqueada = propias.find(r => nivelesPendientes.has(r.nivel) && !['DEVUELTA', 'NOVEDAD'].includes(r.estado));
  const puedeEnviar = !!documento && programable && nivelesPendientes.size > 0 && !bloqueada && !enviando;
  const enviar = async () => {
    if (!puedeEnviar || !documento) return;
    setEnviando(true); setErrorEnvio(''); setAviso('');
    try {
      setRevisiones(await enviarDocenciaARevision(periodo, documento));
      setAviso(`Docencia de ${calendario.docente.nombre || documento} enviada a revisión.`);
    } catch (e: any) { setErrorEnvio(e.message || 'No se pudo enviar la docencia a revisión.'); }
    finally { setEnviando(false); }
  };
  return <section aria-label="Envío a revisión por docente" className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
    <h3 className="font-bold text-slate-800">Docencia asignada · {calendario.docente.nombre || documento} · {calendario.periodo.codigo}</h3>
    <p className="text-sm text-slate-600">Asignaturas y horas de los niveles que puedes gestionar. La carga asignada incluye la docencia que ya está aprobada; al enviar, entra a revisión la docencia pendiente de este periodo.</p>
    {!grupos.length ? <p>No tiene docencia asignada en los niveles que puedes gestionar.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <caption className="text-left font-semibold">Carga asignada en este periodo</caption>
      <thead><tr>{['Asignatura / grupo', 'Nivel', 'Horario', 'Horas asignadas'].map(c => <th key={c} className="p-2 border-b">{c}</th>)}</tr></thead>
      <tbody>{grupos.map(id => {
        const delGrupo = franjas.filter(f => f.idGrupo === id), f = delGrupo[0];
        const horas = calendario.horasPorGrupo[id];
        return <tr key={id}><td className="p-2">{f.codigoAsignatura} · {f.asignatura} · Grupo {f.numeroGrupo}</td><td className="p-2">{f.nivel}</td><td className="p-2"><ul>{delGrupo.map(s => <li key={s.idFranja}>{s.diaSemana} {s.horaInicio}–{s.horaFin} · {s.estado === 'TOMADA' ? 'Asignada' : s.estado}</li>)}</ul></td><td className="p-2">{horas == null ? 'No disponibles' : `${horas} h`}</td></tr>;
      })}</tbody>
    </table></div>}
    {propias.map(r => <div key={r.idConcertacion} className="border rounded-lg p-3 text-sm space-y-1">
      <p><strong>{r.nivel === 'pregrado' ? 'Pregrado' : 'Posgrado'}</strong> · {ESTADOS[r.estado] ?? r.estado} · {r.horas} h en la foto de revisión</p>
      {r.comentario && <p className="text-amber-800">Devolución: {r.comentario}</p>}
      {r.novedad && <p className="text-amber-800">Novedad ({r.novedad.tipo}): {r.novedad.justificacion}</p>}
    </div>)}
    {errorConsulta && <p role="status" className="text-amber-800">{errorConsulta} El servidor comprobará el estado al enviar.</p>}
    {errorEnvio && <p role="alert" className="text-red-700">{errorEnvio}</p>}
    {aviso && <p role="status" className="text-emerald-800">{aviso}</p>}
    {bloqueada && <p className="text-sm text-slate-600">La docencia de {bloqueada.nivel} ya fue enviada: {ESTADOS[bloqueada.estado] ?? bloqueada.estado}.</p>}
    {!programable && <p className="text-sm text-slate-600">Este periodo no permite enviar la programación.</p>}
    {programable && !nivelesPendientes.size && <p className="text-sm text-slate-600">No hay franjas asignadas pendientes de enviar en tus niveles.</p>}
    <button type="button" disabled={!puedeEnviar} onClick={enviar} className="rounded-lg px-4 py-2 font-bold text-sm text-white disabled:opacity-50" style={{ backgroundColor: '#003DA5' }}>{enviando ? 'Enviando…' : 'Enviar a revisión'}</button>
  </section>;
}
