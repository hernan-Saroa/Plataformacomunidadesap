import { useEffect, useState } from 'react';
import { asignarFranjas, getCandidatosArea, type CandidatosArea } from '../services/api/asignacionAreaApi';
import type { GrupoArbol } from '../services/api/vistaApi';
import { ModalConfirmacion } from './ModalConfirmacion';

export function AsignacionAreaModal({ grupo, asignatura, cerrar, retornarFoco }: { grupo: GrupoArbol; asignatura: string; cerrar: () => void; retornarFoco: HTMLElement | null }) {
  const [franjas, setFranjas] = useState(grupo.franjas.map(f => f.idFranja));
  const [datos, setDatos] = useState<CandidatosArea | null>(null);
  const [elegido, setElegido] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [vinculacion, setVinculacion] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    let vigente = true;
    setDatos(null); setElegido(''); setError('');
    if (franjas.length) getCandidatosArea(grupo.idGrupo, franjas).then(d => { if (vigente) setDatos(d); }).catch(e => { if (vigente) setError(e.message); });
    return () => { vigente = false; };
  }, [grupo.idGrupo, franjas]);
  const apto = datos?.candidatos.find(c => c.documento === elegido && c.asignable);
  const asignar = async () => {
    if (!apto || !franjas.length || datos?.mensaje || ocupado) return;
    setOcupado(true); setError('');
    try {
      const r = await asignarFranjas(grupo.idGrupo, apto.documento, franjas);
      if (r.asignado) cerrar();
      else setError(r.motivos?.map(m => m.mensaje).join('\n') || 'El servidor rechazó la asignación.');
    } catch (e: any) { setError(e.message); }
    finally { setOcupado(false); }
  };
  return <ModalConfirmacion titulo={`Asignar docente · ${asignatura} · Grupo ${grupo.numeroGrupo}`} onCancelar={cerrar} onConfirmar={asignar} ocupado={ocupado} confirmarDeshabilitado={!apto || !franjas.length || !!datos?.mensaje} retornarFoco={retornarFoco}
    advertencia="Solo se puede asignar un docente del área. Se cambiarán únicamente las franjas marcadas; el servidor vuelve a comprobar área, cruces y topes al confirmar.">
    <fieldset disabled={ocupado} className="space-y-2"><legend className="font-bold">Franjas a asignar (todas por defecto)</legend>
      {grupo.franjas.map(f => <label key={f.idFranja} className="block"><input type="checkbox" checked={franjas.includes(f.idFranja)} onChange={e => { setElegido(''); setDatos(null); setFranjas(ids => e.target.checked ? [...ids, f.idFranja] : ids.filter(id => id !== f.idFranja)); }} /> {f.diaSemana} {f.horaInicio}–{f.horaFin} · {grupo.docentes.find(d => d.idDocente === f.idDocente)?.nombre ?? 'Sin docente'}</label>)}
    </fieldset>
    {!franjas.length && <p>Selecciona al menos una franja.</p>}
    {franjas.length > 0 && !datos && !error && <p role="status">Consultando candidatos para estas franjas…</p>}
    {apto?.avisos?.length ? <p role="status" className="bg-amber-50 text-amber-900 p-3 rounded-lg">Al confirmar con {apto.nombre}: {apto.avisos.join('. ')}.</p> : null}
    {error && <p role="alert" className="whitespace-pre-wrap text-red-700">{error}</p>}
    {datos && <><p><strong>Área:</strong> {datos.area?.nombre ?? 'Sin área de formación'}</p>
      {datos.mensaje ? <p role="status" className="bg-amber-50 p-3 rounded-lg">{datos.mensaje}</p> : <>
        {datos.sugerido && <aside className="border border-blue-200 bg-blue-50 rounded-lg p-3"><strong>Sugerido: {datos.sugerido.nombre}</strong><ul>{datos.sugerido.razones.map(r => <li key={r}>{r}</li>)}</ul></aside>}
        <label className="block">Buscar por cédula o nombre<input value={busqueda} onChange={e => { setBusqueda(e.target.value); setElegido(''); }} className="block border rounded-lg p-2 w-full" /></label>
        <label className="block">Vinculación<select value={vinculacion} onChange={e => { setVinculacion(e.target.value); setElegido(''); }} className="block border rounded-lg p-2 w-full"><option value="">Todas</option>{[...new Set(datos.candidatos.map(c => c.vinculacion).filter(Boolean))].map(v => <option key={v!} value={v!}>{v}</option>)}</select></label>
        {datos.candidatos.filter(c => (!vinculacion || c.vinculacion === vinculacion) && `${c.documento} ${c.nombre}`.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase())).map(c => <article key={c.documento} className="border rounded-xl p-3 space-y-2">
          <label className="font-bold"><input type="radio" name="candidato-area" checked={elegido === c.documento} disabled={!c.asignable || ocupado} onChange={() => setElegido(c.documento)} /> {c.nombre} · {c.documento}</label>
          <p>{c.vinculacion ?? 'Vinculación no disponible'} · Núcleo: {c.origenArea === 'rund' ? 'RUND' : 'Puente'}</p>
          <p>Programadas sin este grupo: {c.horasProgramadas ?? 'No disponibles'} h · Impacto: {c.horasImpacto ?? 'No disponible'} h · Tope: {c.tope ?? 'No disponible'} h</p>
          <p>{c.cruce ? 'Tiene cruce de horario' : 'Sin cruce de horario'}</p>
          <p>Perfil: {c.perfil || 'No disponible'}</p><ul>{Object.entries(c.titulos).filter(([,v]) => v).map(([k,v]) => <li key={k}>{k}: {v}</li>)}</ul>
          <ul>{c.nucleos.map((n,i) => <li key={i}>{n.area} · {n.origen.toUpperCase()} · {n.texto}</li>)}</ul>
          {c.motivos.length > 0 && <ul className="text-red-700">{c.motivos.map((m,i) => <li key={i}>{m.mensaje}</li>)}</ul>}
          {c.avisos?.length ? <ul role="note" className="text-amber-800 bg-amber-50 rounded-lg p-2">{c.avisos.map((a,i) => <li key={i}>⚠ {a}</li>)}</ul> : null}
        </article>)}
      </>}
    </>}
  </ModalConfirmacion>;
}
