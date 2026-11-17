import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, Loader2, X } from 'lucide-react';

import {
  ErrorConReporte, reutilizarPeriodo, validarReutilizacion, type AlcanceReutilizacion, type ResultadoReutilizacion,
} from '../services/api/cargaProgramacionApi';
import type { PeriodoPlataforma } from '../services/api/periodosApi';

export const OPCIONES_ALCANCE: Array<{ valor: AlcanceReutilizacion; titulo: string; detalle: string }> = [
  { valor: 'catalogo', titulo: 'Solo el catálogo',
    detalle: 'Qué programa se ofrece en qué CETAP (la oferta del periodo). Sin grupos ni horarios.' },
  { valor: 'catalogo_grupos', titulo: 'Catálogo + grupos',
    detalle: 'Además, los grupos con su número, CETAP, modalidad, cupo y horario (días, horas y aula). Las fechas se corren semanas completas. Sin docentes.' },
  { valor: 'catalogo_grupos_docentes', titulo: 'Catálogo + grupos + docentes',
    detalle: 'Además, el mismo docente en cada sesión. Cada docente pasa por las reglas de siempre (área, vinculación, situación, tope, cruces): si ya no cumple, el grupo queda sin docente y se explica por qué.' },
];

interface Props {
  destino: PeriodoPlataforma;
  periodos: PeriodoPlataforma[];
  origenInicial?: string;
  alcanceInicial?: AlcanceReutilizacion;
  /** Revisar apenas se abre (cuando viene de «crear periodo» con la opción elegida). */
  revisarAlAbrir?: boolean;
  onCerrar: () => void;
  alTerminar?: (r: ResultadoReutilizacion) => void;
}

/**
 * Reutilizar los datos de un periodo anterior en este: primero se REVISA (el servidor recorre
 * la copia completa y la revierte) y se ve qué se copiaría; luego se confirma.
 */
export function ReutilizarPeriodo({ destino, periodos, origenInicial, alcanceInicial, revisarAlAbrir, onCerrar, alTerminar }: Props) {
  const candidatos = periodos.filter((p) => p.idPeriodo !== destino.idPeriodo);
  const [origen, setOrigen] = useState(origenInicial ?? candidatos[0]?.idPeriodo ?? '');
  const [alcance, setAlcance] = useState<AlcanceReutilizacion>(alcanceInicial ?? 'catalogo');
  const [revision, setRevision] = useState<ResultadoReutilizacion | null>(null);
  const [hecho, setHecho] = useState<ResultadoReutilizacion | null>(null);
  const [ocupado, setOcupado] = useState<null | 'revisando' | 'copiando'>(null);
  const [error, setError] = useState('');

  const revisar = async (o = origen, a = alcance) => {
    if (!o) return;
    setOcupado('revisando'); setError(''); setRevision(null); setHecho(null);
    try { setRevision(await validarReutilizacion(destino.idPeriodo, o, a)); }
    catch (e: any) { setError(e?.message || 'No se pudo revisar la copia.'); }
    finally { setOcupado(null); }
  };
  useEffect(() => { if (revisarAlAbrir && origen) void revisar(origen, alcance); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const copiar = async () => {
    if (!revision?.valido) return;
    setOcupado('copiando'); setError('');
    try {
      const r = await reutilizarPeriodo(destino.idPeriodo, origen, alcance);
      setHecho(r); setRevision(null); alTerminar?.(r);
    } catch (e: any) {
      if (e instanceof ErrorConReporte && e.reporte) setRevision(e.reporte as ResultadoReutilizacion);
      setError(e?.message || 'No se pudo copiar.');
    } finally { setOcupado(null); }
  };

  const r = hecho ?? revision;
  const nombreOrigen = candidatos.find((p) => p.idPeriodo === origen)?.codigo ?? '';
  return (
    <section aria-labelledby={`reutilizar-${destino.idPeriodo}`} className="mt-2 border border-blue-200 bg-blue-50 rounded-lg p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h4 id={`reutilizar-${destino.idPeriodo}`} className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
          <Copy className="w-3.5 h-3.5 text-[#003DA5]" /> Reutilizar datos en {destino.codigo}
        </h4>
        <button type="button" aria-label="Cerrar reutilizar" onClick={onCerrar} disabled={ocupado === 'copiando'} className="p-1 rounded hover:bg-white text-slate-400"><X className="w-3.5 h-3.5" /></button>
      </div>
      {candidatos.length === 0 ? <p className="text-xs text-slate-500">No hay otro periodo del cual copiar.</p> : <>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Copiar desde</span>
          <select value={origen} onChange={(e) => { setOrigen(e.target.value); setRevision(null); setHecho(null); }}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white">
            {candidatos.map((p) => <option key={p.idPeriodo} value={p.idPeriodo}>{p.codigo} ({p.estadoPlataforma.replace('_', ' ')})</option>)}
          </select>
        </label>
        <fieldset className="space-y-1.5">
          <legend className="text-[11px] font-bold text-slate-500 uppercase mb-1">Qué copiar</legend>
          {OPCIONES_ALCANCE.map((o) => (
            <label key={o.valor} className="flex items-start gap-2 text-xs cursor-pointer">
              <input type="radio" name={`alcance-${destino.idPeriodo}`} value={o.valor} checked={alcance === o.valor}
                onChange={() => { setAlcance(o.valor); setRevision(null); setHecho(null); }} className="mt-0.5" />
              <span><strong>{o.titulo}.</strong> <span className="text-slate-600">{o.detalle}</span></span>
            </label>
          ))}
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => revisar()} disabled={!!ocupado || !origen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 disabled:opacity-40">
            {ocupado === 'revisando' && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Revisar qué se copiaría
          </button>
          <button type="button" onClick={copiar} disabled={!!ocupado || !revision?.valido}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#003DA5] text-white text-xs font-bold disabled:opacity-40">
            {ocupado === 'copiando' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Copiar de {nombreOrigen || '…'}
          </button>
        </div>
      </>}
      {error && <p role="alert" className="flex items-start gap-1.5 text-xs text-red-700"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />{error}</p>}
      {r && (
        <div role="status" className={`rounded-lg border p-2.5 text-xs space-y-1 ${hecho ? 'border-emerald-200 bg-emerald-50' : r.valido ? 'border-slate-200 bg-white' : 'border-amber-200 bg-amber-50'}`}>
          <p className="font-bold">{hecho ? `Copiado de ${r.origen.codigo}.` : r.valido ? `Esto se copiaría de ${r.origen.codigo} (todavía no se ha copiado nada):` : 'No se puede copiar (no se copió nada):'}</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>Catálogo: {r.catalogo.ofertasCopiadas} oferta(s) CETAP × programa{r.catalogo.ofertasYaExistentes ? `; ${r.catalogo.ofertasYaExistentes} ya estaban` : ''}.</li>
            {r.alcance !== 'catalogo' && <li>Grupos: {r.grupos.copiados} con {r.grupos.sesiones} sesión(es){r.grupos.yaExistentes ? `; ${r.grupos.yaExistentes} ya existían (no se tocan)` : ''}. Fechas corridas {Math.round(r.corrimientoDias / 7)} semana(s){r.grupos.fechasAjustadas ? `; ${r.grupos.fechasAjustadas} recortadas al periodo` : ''}.</li>}
            {r.alcance === 'catalogo_grupos_docentes' && <li>Docentes: {r.docentes.asignados} asignado(s); {r.docentes.noAsignados.length} sin asignar.</li>}
          </ul>
          {r.docentes.noAsignados.length > 0 && (
            <details open={r.docentes.noAsignados.length <= 5}>
              <summary className="cursor-pointer font-bold">Docentes que no se asignaron (el grupo queda sin docente)</summary>
              <ul className="mt-1 space-y-0.5">
                {r.docentes.noAsignados.map((d, i) => <li key={i}><strong>{d.grupo}</strong> · {d.nombre ?? d.documento}: {d.motivos.join(' · ')}</li>)}
              </ul>
            </details>
          )}
          {r.errores.length > 0 && <ul className="list-disc pl-4 text-amber-900">{r.errores.map((e, i) => <li key={i}>{e.grupo ? `${e.grupo}: ` : ''}{e.mensaje}</li>)}</ul>}
          {r.avisos.length > 0 && <ul className="list-disc pl-4 text-slate-600">{r.avisos.map((a, i) => <li key={i}>{a}</li>)}</ul>}
        </div>
      )}
    </section>
  );
}
