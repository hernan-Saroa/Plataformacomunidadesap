import { useEffect, useRef, useState } from 'react';
import { getArbolProgramacion, type ArbolProgramacion as Arbol, type MisPermisos, type GrupoArbol } from '../services/api/vistaApi';
import { useRevisionProgramacion } from '../services/actualizacionProgramacion';
import { AsignacionAreaModal } from './AsignacionAreaModal';

const horas = (n: number | null) => n === null ? 'No disponibles' : `${n} h`;

export function ArbolProgramacion({ periodo, permisos, abrirGrupo, programable = false, jornada = 'TODAS' }: { periodo: string; permisos: MisPermisos; abrirGrupo?: (grupo: GrupoArbol, asignatura: string) => void; programable?: boolean; jornada?: string }) {
  const [asignacion, setAsignacion] = useState<{ grupo: GrupoArbol; asignatura: string; foco: HTMLElement } | null>(null);
  useEffect(() => { setAsignacion(null); }, [periodo, programable]);
  const [datos, setDatos] = useState<Arbol | null>(null);
  const [error, setError] = useState('');
  const [pendientes, setPendientes] = useState(false);
  const [nivel, setNivel] = useState<'' | 'pregrado' | 'posgrado'>('');
  const revision = useRevisionProgramacion('programacion');
  const consultaAnterior = useRef('');
  const niveles = permisos.ver.join(',');
  useEffect(() => {
    let vigente = true;
    const consulta = `${periodo}|${pendientes}|${nivel}|${niveles}`;
    if (consultaAnterior.current !== consulta) setDatos(null);
    consultaAnterior.current = consulta;
    setError('');
    if (!periodo || !niveles) return;
    getArbolProgramacion({ periodo, soloSinDocente: pendientes, nivel: nivel || undefined })
      .then(d => { if (vigente) setDatos(d); })
      .catch(e => { if (vigente) setError(e.message || 'No se pudo consultar la programación.'); });
    return () => { vigente = false; };
  }, [periodo, pendientes, nivel, niveles, revision]);
  const programasVisibles = datos?.programas.filter(p => permisos.ver.includes(p.nivel)).map(p => ({ ...p, asignaturas: p.asignaturas.map(a => ({ ...a, grupos: a.grupos.filter(g => jornada === 'TODAS' || g.franjas.some(f => f.jornada === jornada)) })).filter(a => a.grupos.length) })).filter(p => p.asignaturas.length) ?? [];
  if (!permisos.ver.length) return <p>No tienes permiso para consultar la programación.</p>;
  return <section aria-label="Programación por programa" className="space-y-4">
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-4">
      <h3 className="font-bold text-slate-800">Programación por programa</h3>
      <label>Nivel <select className="border rounded-lg p-2" value={nivel} onChange={e => setNivel(e.target.value as typeof nivel)}>
        <option value="">Todos los niveles permitidos</option>
        {permisos.ver.map(n => <option key={n} value={n}>{n === 'pregrado' ? 'Pregrado' : 'Posgrado'}</option>)}
      </select></label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={pendientes} onChange={e => setPendientes(e.target.checked)} />Solo grupos con franjas sin docente</label>
    </div>
    {error && <p role="alert" className="p-4 bg-amber-50 text-amber-900">{error}</p>}
    {!datos && !error && <p role="status">{periodo ? 'Consultando programación…' : 'Selecciona un periodo.'}</p>}
    {datos && <>
      <p role="status" className="text-sm text-slate-600">{jornada !== 'TODAS' ? 'Resumen antes del filtro de jornada: ' : ''}{datos.resumen.programas} programas · {datos.resumen.asignaturas} asignaturas · {datos.resumen.grupos} grupos · {datos.resumen.franjas} franjas · {datos.resumen.franjasSinDocente} sin docente</p>
      {!programasVisibles.length && <p className="p-6 bg-white rounded-xl border">No hay grupos para los filtros seleccionados en este periodo.</p>}
      {programasVisibles.map(p => <details key={p.idPrograma} open className="bg-white rounded-xl border border-slate-200 p-4">
        <summary className="cursor-pointer font-bold text-[#003DA5]">{p.nombre} · {p.nivel}</summary>
        {p.asignaturas.map(a => <details key={a.idAsignatura} className="mt-3 border rounded-lg p-3">
          <summary className="cursor-pointer font-semibold">{a.codigo} · {a.nombre} · Semestre {a.semestre ?? 'sin definir'}</summary>
          <p className="text-sm text-slate-500 mt-2">Área: {a.area?.nombre ?? 'Sin área'} · Créditos: {a.creditos ?? 'Sin definir'}</p>
          {a.grupos.map(g => <details key={g.idGrupo} className="mt-3 border rounded-lg p-3">
            <summary className="cursor-pointer font-semibold">Grupo {g.numeroGrupo} · {g.estado}
              {!g.oferta && <span className="ml-2 text-amber-800">Sin oferta CETAP</span>}
              {g.franjas.some(f => !f.idDocente) && <span className="ml-2 text-amber-800">Franjas sin docente</span>}
              {g.horas.excede && <span className="ml-2 text-red-700">Excede las horas requeridas</span>}
            </summary>
            <div className="mt-3 space-y-2 text-sm">
              <p>CETAP: {g.oferta?.cetap.nombre ?? 'Sin oferta'} · Territorial: {g.oferta?.territorial.nombre ?? 'Sin definir'}</p>
              <p>Programadas: {horas(g.horas.programadas)} · Requeridas: {horas(g.horas.requeridas)}</p>
              <p>Ciclo: {g.cicloInicio ?? 'Sin definir'} — {g.cicloFin ?? 'Sin definir'}</p>
              {abrirGrupo && permisos.programar.includes(p.nivel) && <button type="button" onClick={() => abrirGrupo(g, a.nombre)} className="border rounded-lg p-2 text-[#003DA5]">Ver horario del grupo</button>}
              {programable && permisos.asignar.includes(p.nivel) && <button type="button" className="border rounded-lg p-2 text-[#003DA5]" onClick={e => setAsignacion({ grupo: g, asignatura: a.nombre, foco: e.currentTarget })}>Asignar docente</button>}
              <p>{Object.entries(g.estadoFranjas).map(([estado, cantidad]) => `${estado}: ${cantidad}`).join(' · ')}</p>
              <h4 className="font-semibold">Docentes del grupo</h4>
              {!g.docentes.length && <p className="text-amber-800">Sin docentes asignados.</p>}
              <ul>{g.docentes.map(d => <li key={d.idDocente}>{d.nombre ?? 'Nombre no disponible'} · {d.documento ?? 'Sin documento'} · {d.vinculacion?.texto ?? 'Vinculación no disponible'} · {horas(d.horas)}</li>)}</ul>
              <div className="overflow-x-auto"><table className="w-full text-left"><caption className="text-left font-semibold">Franjas del grupo</caption>
                <thead><tr>{['Día', 'Horario', 'Aula', 'Docente', 'Estado'].map(c => <th key={c} className="p-2 border-b">{c}</th>)}</tr></thead>
                <tbody>{g.franjas.map(f => <tr key={f.idFranja} className={!f.idDocente ? 'bg-amber-50' : ''}>
                  <td className="p-2">{f.diaSemana}</td><td className="p-2">{f.horaInicio}–{f.horaFin}</td><td className="p-2">{f.aulaCodigo ?? 'Sin aula'}</td>
                  <td className="p-2">{f.idDocente ? g.docentes.find(d => d.idDocente === f.idDocente)?.nombre ?? 'Nombre no disponible' : 'Sin docente'}</td><td className="p-2">{f.estado}</td>
                </tr>)}</tbody>
              </table></div>
            </div>
          </details>)}
        </details>)}
      </details>)}
    </>}
    {asignacion && <AsignacionAreaModal grupo={asignacion.grupo} asignatura={asignacion.asignatura} retornarFoco={asignacion.foco} cerrar={() => setAsignacion(null)} />}
  </section>;
}
