import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronRight, Layers, Loader2, Lock, Search } from 'lucide-react';

import {
  getCatalogoPorSemestre,
  getProgramas,
  type NivelAcademico,
  type ProgramaCatalogo,
  type SemestreCatalogo,
} from '../services/api/catalogoApi';

/**
 * EFDS-1368 — Selección en cascada nivel → programa y catálogo por semestre.
 *
 * La visibilidad por nivel (RN-08) la resuelve el BACKEND con los permisos
 * reales del usuario. Aquí solo se ofrecen los niveles para los que el servicio
 * devolvió programas: no se decide nada de autorización en el cliente, y por eso
 * un 403 se muestra tal cual en vez de ocultarse.
 */

const NIVELES: Array<{ valor: NivelAcademico; etiqueta: string }> = [
  { valor: 'pregrado', etiqueta: 'Pregrado' },
  { valor: 'posgrado', etiqueta: 'Posgrado' },
];

export function SelectorCatalogo() {
  const [programas, setProgramas] = useState<ProgramaCatalogo[]>([]);
  const [cargandoProgramas, setCargandoProgramas] = useState(true);
  const [errorProgramas, setErrorProgramas] = useState('');

  const [nivel, setNivel] = useState<NivelAcademico | ''>('');
  const [programaId, setProgramaId] = useState('');

  const [semestres, setSemestres] = useState<SemestreCatalogo[] | null>(null);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
  const [errorCatalogo, setErrorCatalogo] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Un solo llamado sin `nivel`: el backend ya devuelve únicamente los programas
  // de los niveles autorizados, y de ahí se derivan las opciones del selector.
  useEffect(() => {
    let cancelado = false;
    setCargandoProgramas(true);
    setErrorProgramas('');
    getProgramas()
      .then((data) => { if (!cancelado) setProgramas(data); })
      .catch((err) => { if (!cancelado) setErrorProgramas(err?.message || 'No se pudo cargar el catálogo.'); })
      .finally(() => { if (!cancelado) setCargandoProgramas(false); });
    return () => { cancelado = true; };
  }, []);

  /** Solo los niveles con programas visibles: si no hay, el nivel no se ofrece. */
  const nivelesDisponibles = useMemo(
    () => NIVELES.filter((n) => programas.some((p) => p.nivel === n.valor)),
    [programas],
  );

  const programasDelNivel = useMemo(
    () => (nivel ? programas.filter((p) => p.nivel === nivel) : []),
    [programas, nivel],
  );

  useEffect(() => {
    if (!programaId) { setSemestres(null); setErrorCatalogo(''); return; }
    let cancelado = false;
    setCargandoCatalogo(true);
    setErrorCatalogo('');
    setSemestres(null);
    getCatalogoPorSemestre(programaId)
      .then((data) => { if (!cancelado) setSemestres(data.semestres); })
      .catch((err) => { if (!cancelado) setErrorCatalogo(err?.message || 'No se pudo cargar el catálogo.'); })
      .finally(() => { if (!cancelado) setCargandoCatalogo(false); });
    return () => { cancelado = true; };
  }, [programaId]);

  const semestresFiltrados = useMemo(() => {
    if (!semestres) return null;
    const q = busqueda.trim().toLowerCase();
    if (!q) return semestres;
    return semestres
      .map((s) => ({
        ...s,
        asignaturas: s.asignaturas.filter((a) =>
          a.nombre.toLowerCase().includes(q) || (a.codigo || '').toLowerCase().includes(q)),
      }))
      .filter((s) => s.asignaturas.length > 0);
  }, [semestres, busqueda]);

  if (cargandoProgramas) {
    return (
      <div className="flex items-center gap-2 p-6 text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando programas…
      </div>
    );
  }

  if (errorProgramas) {
    return (
      <div className="p-6 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 flex items-start gap-3">
        <Lock className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm">No se pudo cargar el catálogo</p>
          <p className="text-sm mt-1">{errorProgramas}</p>
        </div>
      </div>
    );
  }

  if (nivelesDisponibles.length === 0) {
    return (
      <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 flex items-start gap-3">
        <Lock className="w-5 h-5 shrink-0 mt-0.5 text-slate-400" />
        <div>
          <p className="font-bold text-sm">Sin niveles habilitados</p>
          <p className="text-sm mt-1">
            Su perfil no tiene permisos de programación sobre ningún nivel académico.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Cascada: nivel → programa */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-[#003DA5]" />
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            Selección de catálogo
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Nivel académico
            </span>
            <select
              value={nivel}
              onChange={(e) => { setNivel(e.target.value as NivelAcademico | ''); setProgramaId(''); }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Seleccione un nivel…</option>
              {nivelesDisponibles.map((n) => (
                <option key={n.valor} value={n.valor}>{n.etiqueta}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Programa
            </span>
            <select
              value={programaId}
              onChange={(e) => setProgramaId(e.target.value)}
              disabled={!nivel}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">
                {nivel ? 'Seleccione un programa…' : 'Seleccione primero el nivel'}
              </option>
              {programasDelNivel.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {cargandoCatalogo && (
        <div className="flex items-center gap-2 p-5 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando asignaturas…
        </div>
      )}

      {errorCatalogo && (
        <div className="p-5 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          {errorCatalogo}
        </div>
      )}

      {/* Catálogo agrupado por semestre (AC-01) */}
      {semestresFiltrados && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#003DA5]" />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Plan de estudios
              </h3>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar asignatura o código…"
                className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {semestresFiltrados.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">
              El programa no tiene asignaturas que coincidan.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {semestresFiltrados.map((s) => (
                <div key={s.semestreId} className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#003DA5] text-xs font-black">
                      {s.etiqueta}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {s.asignaturas.length} asignatura{s.asignaturas.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {s.asignaturas.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{a.nombre}</p>
                          <p className="text-xs text-slate-400 font-mono">
                            {a.codigo || 'sin código'} · {a.creditos} créd.
                            {a.pensum ? ` · pensum ${a.pensum}` : ''}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
