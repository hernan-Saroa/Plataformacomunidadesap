import { useEffect, useRef, useState } from 'react';
import { buscarDocentes, getCalendarioDocente, getMiCalendario, type CalendarioDocente, type DocenteBuscado } from '../services/api/vistaApi';
import { CalendarioHorario } from './CalendarioHorario';
import { useRevisionProgramacion } from '../services/actualizacionProgramacion';
import { EnvioRevisionDocente } from './EnvioRevisionDocente';

export function DisponibilidadDocente({ periodo, nivelesAsignables = [], concertacionHabilitada = false, programable = false }: { periodo: string; nivelesAsignables?: ('pregrado' | 'posgrado')[]; concertacionHabilitada?: boolean; programable?: boolean }) {
  const [busqueda, setBusqueda] = useState('');
  const [docentes, setDocentes] = useState<DocenteBuscado[]>([]);
  const [elegido, setElegido] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  useEffect(() => { setElegido(''); }, [periodo]);
  useEffect(() => {
    let vigente = true;
    setDocentes([]); setError(''); setCargando(!!periodo);
    if (!periodo) return;
    const timer = setTimeout(() => {
      buscarDocentes(periodo, busqueda).then(d => { if (vigente) setDocentes(d); })
        .catch(e => { if (vigente) setError(e.message || 'No se pudieron buscar los docentes.'); })
        .finally(() => { if (vigente) setCargando(false); });
    }, 250);
    return () => { vigente = false; clearTimeout(timer); };
  }, [periodo, busqueda]);
  return <section className="space-y-4">
    <div className="bg-white border rounded-xl p-4 space-y-3">
      <h3 className="font-bold text-slate-800">Disponibilidad Docente</h3>
      <label className="block">Buscar por cédula o nombre<input className="block w-full border rounded-lg p-2 mt-1" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></label>
      {cargando && <p role="status">Buscando docentes…</p>}
      {error && <p role="alert">{error}</p>}
      {!cargando && !error && !docentes.length && <p>No hay docentes con franjas que coincidan en este periodo.</p>}
      <ul className="space-y-2">{docentes.map(d => <li key={d.idDocente}><button type="button" aria-pressed={elegido === d.idDocente} className="w-full text-left border rounded-lg p-3 text-[#003DA5]" onClick={() => setElegido(d.idDocente)}>
        <strong>{d.nombre ?? 'Sin nombre'}</strong> · {d.documento ?? 'Sin documento'} · {d.vinculacion?.texto ?? 'Vinculación no disponible'} · {d.horas === null ? 'Horas no disponibles' : `${d.horas} h`} · {d.franjas} franjas
      </button></li>)}</ul>
    </div>
    {elegido && <CalendarioDelDocente key={`${periodo}:${elegido}`} periodo={periodo} idDocente={elegido} envioRevision={concertacionHabilitada && nivelesAsignables.length ? { niveles: nivelesAsignables, programable } : undefined} />}
  </section>;
}

export function CalendarioDelDocente({ periodo, idDocente, envioRevision }: { periodo?: string; idDocente?: string; envioRevision?: { niveles: ('pregrado' | 'posgrado')[]; programable: boolean } }) {
  const [datos, setDatos] = useState<CalendarioDocente | null>(null);
  const [error, setError] = useState('');
  const revision = useRevisionProgramacion('programacion');
  const consultaAnterior = useRef('');
  useEffect(() => {
    let vigente = true;
    const consulta = `${periodo ?? ''}:${idDocente ?? ''}`;
    if (consulta !== consultaAnterior.current) setDatos(null);
    consultaAnterior.current = consulta;
    setError('');
    const solicitud = idDocente ? getCalendarioDocente(periodo!, { idDocente }) : getMiCalendario(periodo);
    solicitud.then(d => { if (vigente) setDatos(d); }).catch(e => { if (vigente) setError(e.message || 'No se pudo consultar el calendario.'); });
    return () => { vigente = false; };
  }, [periodo, idDocente, revision]);
  if (error) return <p role="alert" className="p-4 bg-amber-50 text-amber-900">{error}</p>;
  if (!datos) return <p role="status">Consultando calendario…</p>;
  return <>
    {envioRevision && <EnvioRevisionDocente calendario={datos} niveles={envioRevision.niveles} programable={envioRevision.programable} />}
    <CalendarioHorario soloLectura calendario={datos} />
  </>;
}
