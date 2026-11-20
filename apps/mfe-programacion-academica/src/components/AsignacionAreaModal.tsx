import { useEffect, useState } from 'react';
import { asignarFranjas, asignarMultiple, getCandidatosArea, type CandidatosArea } from '../services/api/asignacionAreaApi';
import type { GrupoArbol } from '../services/api/vistaApi';
import { ModalConfirmacion } from './ModalConfirmacion';

export function AsignacionAreaModal({ grupo, asignatura, cerrar, retornarFoco }: { grupo: GrupoArbol; asignatura: string; cerrar: () => void; retornarFoco: HTMLElement | null }) {
  const [franjas, setFranjas] = useState(grupo.franjas.map(f => f.idFranja));
  const [datos, setDatos] = useState<CandidatosArea | null>(null);
  const [elegido, setElegido] = useState('');
  const [reparto, setReparto] = useState<{ documento: string; nombre: string; franjas: string[]; avisos: string[] }[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [vinculacion, setVinculacion] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  // Grupo virtual sin horario (063): se asigna sin franjas; el docente define el horario después.
  const sinHorario = !!grupo.horarioPorDefinir;
  const hayQueAsignar = franjas.length > 0 || sinHorario;
  useEffect(() => {
    let vigente = true;
    setDatos(null); setElegido(''); setError('');
    if (franjas.length || sinHorario) getCandidatosArea(grupo.idGrupo, franjas).then(d => { if (vigente) setDatos(d); }).catch(e => { if (vigente) setError(e.message); });
    return () => { vigente = false; };
  }, [grupo.idGrupo, franjas, sinHorario]);
  const apto = datos?.candidatos.find(c => c.documento === elegido && c.asignable);
  const ocupadas = new Set(reparto.flatMap(r => r.franjas));
  const agregarAlReparto = () => {
    if (!apto || !franjas.length) return;
    const nuevo = [...reparto, { documento: apto.documento, nombre: apto.nombre, franjas: [...franjas], avisos: apto.avisos ?? [] }];
    setReparto(nuevo); setElegido('');
    const ids = new Set(nuevo.flatMap(r => r.franjas));
    setFranjas(grupo.franjas.map(f => f.idFranja).filter(id => !ids.has(id)));
  };
  const asignar = async () => {
    if (ocupado || (!reparto.length && (!apto || !hayQueAsignar || datos?.mensaje))) return;
    setOcupado(true); setError('');
    try {
      const pares = [...reparto.map(r => ({ documento: r.documento, franjas: r.franjas })), ...(apto && franjas.length ? [{ documento: apto.documento, franjas }] : [])];
      const unidos = [...new Set(pares.map(p => p.documento))].map(documento => ({ documento, franjas: pares.filter(p => p.documento === documento).flatMap(p => p.franjas) }));
      const r = sinHorario ? await asignarFranjas(grupo.idGrupo, apto!.documento, []) : await asignarMultiple(grupo.idGrupo, unidos);
      if (r.asignado) cerrar();
      else setError(('errores' in r ? r.errores?.map(e => `${e.documento}: ${e.motivos.map(m => m.mensaje).join('; ')}`).join('\n') : 'motivos' in r ? r.motivos?.map(m => m.mensaje).join('\n') : '') || 'El servidor rechazó la asignación; no se guardó ninguna franja.');
    } catch (e: any) { setError(e.message); }
    finally { setOcupado(false); }
  };
  return <ModalConfirmacion titulo={`Asignar docente · ${asignatura} · Grupo ${grupo.numeroGrupo}`} onCancelar={cerrar} onConfirmar={asignar} ocupado={ocupado} confirmarDeshabilitado={!reparto.length && (!apto || !hayQueAsignar || !!datos?.mensaje)} retornarFoco={retornarFoco}
    advertencia={sinHorario
      ? 'Grupo virtual o a distancia sin horario: se asigna el docente al grupo y él define el horario en «Mi programación», con la validación de cruces, horas y tope. Se le reservan las horas del plan.'
      : 'Cada franja admite un docente del área. Puedes repartir las franjas entre varios docentes y usar el mismo docente en otros grupos si no hay cruces ni se supera su tope. El reparto se guarda completo o no se guarda.'}>
    {reparto.length > 0 && <section className="rounded-lg border border-blue-200 bg-blue-50 p-3"><h3 className="font-bold">Reparto por confirmar</h3><ul>{reparto.map((r,i) => <li key={i} className="mt-2">{r.nombre} · {r.franjas.map(id => { const f = grupo.franjas.find(f => f.idFranja === id); return f ? `${f.diaSemana} ${f.horaInicio}–${f.horaFin}` : id; }).join(', ')}{r.avisos.map(a => <p key={a} className="text-amber-800">{a}</p>)} <button type="button" disabled={ocupado} onClick={() => { setReparto(reparto.filter((_,j) => j !== i)); setFranjas(r.franjas); }} className="underline">Quitar del reparto</button></li>)}</ul></section>}
    <fieldset disabled={ocupado} className="space-y-2"><legend className="font-bold">Franjas a asignar (todas por defecto)</legend>
      {grupo.franjas.map(f => <label key={f.idFranja} className="block"><input type="checkbox" disabled={ocupadas.has(f.idFranja)} checked={ocupadas.has(f.idFranja) || franjas.includes(f.idFranja)} onChange={e => { setElegido(''); setDatos(null); setFranjas(ids => e.target.checked ? [...ids, f.idFranja] : ids.filter(id => id !== f.idFranja)); }} /> {f.diaSemana} {f.horaInicio}–{f.horaFin} · {grupo.docentes.find(d => d.idDocente === f.idDocente)?.nombre ?? 'Sin docente'}</label>)}
    </fieldset>
    {!sinHorario && apto && franjas.length > 0 && <button type="button" disabled={ocupado} onClick={agregarAlReparto} className="rounded-lg border border-blue-300 p-2 font-bold text-[#003DA5]">Añadir al reparto y elegir otro docente</button>}
    {sinHorario && <p role="note" className="bg-violet-50 text-violet-900 p-3 rounded-lg">Horario por definir: lo define el docente asignado.</p>}
    {!hayQueAsignar && <p>{grupo.franjas.length === 0 ? 'Este grupo aún no tiene franjas de horario: no hay nada que asignar. Programe primero su horario (o, si es virtual o a distancia, créelo con esa modalidad) y luego asigne el docente.' : 'Selecciona al menos una franja.'}</p>}
    {hayQueAsignar && !datos && !error && <p role="status">{sinHorario ? 'Consultando candidatos…' : 'Consultando candidatos para estas franjas…'}</p>}
    {apto?.avisos?.length ? <p role="status" className="bg-amber-50 text-amber-900 p-3 rounded-lg">Al confirmar con {apto.nombre}: {apto.avisos.join('. ')}.</p> : null}
    {error && <p role="alert" className="whitespace-pre-wrap text-red-700">{error}</p>}
    {datos && <><p><strong>Área:</strong> {datos.area?.nombre ?? 'Sin área de formación'}</p>
      {datos.aviso && <p role="status" className="rounded-lg bg-amber-50 p-3">{datos.aviso}</p>}
      {datos.mensaje ? <p role="status" className="bg-amber-50 p-3 rounded-lg">{datos.mensaje}</p> : <>
        {datos.sugerido && <aside className="border border-blue-200 bg-blue-50 rounded-lg p-3"><strong>Sugerido: {datos.sugerido.nombre}</strong><ul>{datos.sugerido.razones.map(r => <li key={r}>{r}</li>)}</ul></aside>}
        <label className="block">Buscar por cédula o nombre<input value={busqueda} onChange={e => { setBusqueda(e.target.value); setElegido(''); }} className="block border rounded-lg p-2 w-full" /></label>
        <label className="block">Vinculación<select value={vinculacion} onChange={e => { setVinculacion(e.target.value); setElegido(''); }} className="block border rounded-lg p-2 w-full"><option value="">Todas</option>{[...new Set(datos.candidatos.map(c => c.vinculacion).filter(Boolean))].map(v => <option key={v!} value={v!}>{v}</option>)}</select></label>
        {datos.candidatos.filter(c => (!vinculacion || c.vinculacion === vinculacion) && `${c.documento} ${c.nombre}`.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase())).map(c => <article key={c.documento} className="border rounded-xl p-3 space-y-2">
          <label className="font-bold"><input type="radio" name="candidato-area" checked={elegido === c.documento} disabled={!c.asignable || ocupado} onChange={() => setElegido(c.documento)} /> {c.nombre} · {c.documento}</label>
          <p className={c.asignable ? 'text-emerald-800 font-bold' : 'text-red-700 font-bold'}>{c.asignable ? 'Disponible' : 'Bloqueado'}</p>
          <p>{c.vinculacion ?? 'Vinculación no disponible'} · Núcleo: {c.origenArea === 'rund' ? 'RUND' : 'Puente'}</p>
          <p>Programadas sin este grupo: {c.horasProgramadas ?? 'No disponibles'} h · Impacto: {c.horasImpacto ?? 'No disponible'} h · Tope: {c.tope ?? 'No disponible'} h</p>
          <p>{c.cruce ? 'Tiene cruce de horario' : 'Sin cruce de horario'}</p>
          <p>Perfil: {c.perfil || 'No disponible'}</p><ul>{Object.entries(c.titulos).filter(([,v]) => v).map(([k,v]) => <li key={k}>{k}: {v}</li>)}</ul>
          <ul>{c.nucleos.map((n,i) => <li key={i}>{n.area} · {n.origen.toUpperCase()} · {n.texto}</li>)}</ul>
          {c.motivos.length > 0 && <ul className="text-red-700">{c.motivos.map((m,i) => <li key={i}>{m.tipo ? `${m.tipo}: ` : ''}{m.mensaje}{m.detalle && ` · ${m.detalle.diaSemana} ${m.detalle.horaInicio}–${m.detalle.horaFin}`}</li>)}</ul>}
          {c.avisos?.length ? <ul role="note" className="text-amber-800 bg-amber-50 rounded-lg p-2">{c.avisos.map((a,i) => <li key={i}>⚠ {a}</li>)}</ul> : null}
        </article>)}
      </>}
    </>}
  </ModalConfirmacion>;
}
