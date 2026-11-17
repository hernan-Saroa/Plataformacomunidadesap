import { useEffect, useRef, useState } from 'react';
import { useImportAsignaturas } from '../hooks/useImportAsignaturas';

interface GestionPeriodosProps {
  onBack: () => void;
  onNavigateToImport: (periodoCodigo: string) => void;
  onPeriodosChanged?: () => void;
}

/** EFDS-2427: consulta del catálogo; la administración pertenece a Programación. */
export function GestionPeriodos({ onBack }: GestionPeriodosProps) {
  const { getPeriodos, getPeriodoDetalle } = useImportAsignaturas();
  const [periodos, setPeriodos] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [detalle, setDetalle] = useState<{ id: string; programs: any[]; cetaps: any[] } | null>(null);
  const [consultando, setConsultando] = useState<string | null>(null);
  const [errorDetalle, setErrorDetalle] = useState('');
  const consulta = useRef(0);
  useEffect(() => {
    let vigente = true;
    getPeriodos().then(p => { if (vigente) setPeriodos(p); })
      .catch(e => { if (vigente) setError(e.message || 'No se pudieron consultar los periodos.'); });
    return () => { vigente = false; consulta.current++; };
  }, [getPeriodos]);
  const verDetalle = async (id: string) => {
    const turno = ++consulta.current;
    if (detalle?.id === id) { setDetalle(null); setConsultando(null); return; }
    setDetalle(null); setConsultando(id); setErrorDetalle('');
    try {
      const r = await getPeriodoDetalle(id);
      if (turno === consulta.current) setDetalle({ id, programs: r.programs ?? [], cetaps: r.cetaps ?? [] });
    } catch (e: any) { if (turno === consulta.current) setErrorDetalle(e.message || 'No se pudo consultar el detalle.'); }
    finally { if (turno === consulta.current) setConsultando(null); }
  };
  // El shell ya resuelve ?module= con sus permisos y configuración de remotos.
  const destino = new URL(window.location.href);
  destino.searchParams.set('module', 'programacion-academica');
  const estados: Record<string, string> = { planeacion: 'Planeación', concertacion: 'Concertación', en_curso: 'En curso', cerrado: 'Cerrado' };
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><button type="button" onClick={onBack} className="mb-2 text-sm font-bold text-[#003DA5]">← Volver</button><h1 className="text-xl font-bold">Periodos académicos</h1></div>
      <a href={destino.pathname + destino.search + destino.hash} className="rounded-lg bg-[#003DA5] px-4 py-2 text-sm font-bold text-white">Ir a Programación Académica</a>
    </header>
    <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">Vista de consulta. La creación y gestión de periodos se realiza en Programación Académica → Periodos, incluidos los periodos personalizados.</p>
    {error ? <p role="alert" className="text-red-700">{error}</p> : periodos === null ? <p role="status">Cargando periodos…</p> : !periodos.length ? <p>No hay periodos registrados. Un administrador puede crearlos desde Programación Académica.</p> : periodos.map(p => <article key={p.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
      <h2 className="font-bold text-[#003DA5]">{p.codigo}{p.nombre ? ` · ${p.nombre}` : ''}</h2>
      <p className="text-sm">{p.tipo === 'personalizado' ? 'Personalizado' : `Semestre ${p.semestre ?? 'sin definir'}`} · {p.estado === 'en_curso' ? (p.extraordinario ? 'Extraordinario en curso' : 'Principal en curso') : estados[p.estado] ?? p.estado}</p>
      <p className="text-sm">Inicio: {String(p.fechaInicio ?? '').slice(0, 10) || 'Sin definir'} · Fin: {String(p.fechaFin ?? '').slice(0, 10) || 'Sin definir'}</p>
      {p.motivoExtraordinario && <p className="text-sm">Motivo del extraordinario: {p.motivoExtraordinario}</p>}
      <button type="button" disabled={consultando === p.id} onClick={() => verDetalle(p.id)} className="rounded-lg border px-3 py-2 text-sm text-[#003DA5]">{consultando === p.id ? 'Consultando…' : detalle?.id === p.id ? 'Ocultar detalle' : 'Consultar detalle'}</button>
      {detalle?.id === p.id && <div className="grid gap-3 md:grid-cols-2">
        <div><h3 className="font-bold">Programas</h3>{!detalle.programs.length ? <p>Sin programas en este periodo.</p> : <ul>{detalle.programs.map(p => <li key={p.id}>{p.codigo} · {p.nombre} · {p.subjectsCount ?? 0} asignaturas · {p.activeCetaps ?? 0} CETAP</li>)}</ul>}</div>
        <div><h3 className="font-bold">Oferta CETAP</h3>{!detalle.cetaps.length ? <p>Sin oferta CETAP en este periodo.</p> : <ul>{detalle.cetaps.map(c => <li key={c.id}>{c.codigo} · {c.nombre}</li>)}</ul>}</div>
      </div>}
    </article>)}
    {errorDetalle && <p role="alert" className="text-red-700">{errorDetalle}</p>}
  </section>;
}
