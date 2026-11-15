import { useRef, useState, type ChangeEvent } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, UploadCloud, X } from 'lucide-react';

import {
  cargarProgramacion, ErrorConReporte, getReferenciaPlantilla, validarCarga, type FilaCarga, type ResultadoCarga,
} from '../services/api/cargaProgramacionApi';
import { ErrorArchivo, generarPlantilla, leerPlantilla } from '../services/plantillaProgramacion';

interface Props {
  idPeriodo: string;
  codigoPeriodo: string;
  onCerrar: () => void;
}

const descargar = (blob: Blob, nombre: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Carga de la programación del periodo desde la plantilla de Excel: grupos, sesiones y
 * docentes. Tres pasos: descargar la plantilla, subirla (se valida TODO en el servidor sin
 * escribir) y confirmar. La carga es todo o nada.
 */
export function CargaProgramacionExcel({ idPeriodo, codigoPeriodo, onCerrar }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [filas, setFilas] = useState<FilaCarga[] | null>(null);
  const [reporte, setReporte] = useState<ResultadoCarga | null>(null);
  const [cargado, setCargado] = useState<ResultadoCarga | null>(null);
  const [ocupado, setOcupado] = useState<null | 'plantilla' | 'validando' | 'cargando'>(null);
  const [error, setError] = useState('');

  const bajarPlantilla = async () => {
    setOcupado('plantilla'); setError('');
    try {
      const ref = await getReferenciaPlantilla(idPeriodo);
      descargar(await generarPlantilla(ref), `plantilla-programacion-${codigoPeriodo}.xlsx`);
    } catch (e: any) {
      setError(e?.message || 'No se pudo generar la plantilla.');
    } finally { setOcupado(null); }
  };

  const elegir = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (input.current) input.current.value = '';
    setArchivo(f); setFilas(null); setReporte(null); setCargado(null); setError('');
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) { setError('Suba el archivo en formato .xlsx (la plantilla descargada).'); return; }
    setOcupado('validando');
    try {
      const leidas = await leerPlantilla(await f.arrayBuffer());
      setFilas(leidas);
      setReporte(await validarCarga(idPeriodo, leidas));
    } catch (err: any) {
      setError(err instanceof ErrorArchivo ? err.message : err?.message || 'No se pudo validar el archivo.');
    } finally { setOcupado(null); }
  };

  const confirmar = async () => {
    if (!filas || !reporte?.valido) return;
    setOcupado('cargando'); setError('');
    try {
      setCargado(await cargarProgramacion(idPeriodo, filas));
      setReporte(null);
    } catch (err: any) {
      // 409: algo cambió entre la validación y la carga; el servidor manda el reporte nuevo.
      if (err instanceof ErrorConReporte && err.reporte) setReporte(err.reporte as ResultadoCarga);
      setError(err?.message || 'No se pudo cargar la programación.');
    } finally { setOcupado(null); }
  };

  const r = cargado ?? reporte;
  return (
    <section aria-labelledby="carga-excel-titulo" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="carga-excel-titulo" className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#003DA5]" /> Cargar programación de {codigoPeriodo} desde Excel
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Grupos, horarios y docentes en un solo archivo: una fila por sesión. Se valida todo antes de escribir y
            la carga es <strong>todo o nada</strong>. Aplican las mismas reglas que en pantalla.
          </p>
        </div>
        <button type="button" aria-label="Cerrar la carga desde Excel" onClick={onCerrar} disabled={ocupado === 'cargando'}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={bajarPlantilla} disabled={!!ocupado}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
          {ocupado === 'plantilla' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          1. Descargar plantilla
        </button>
        <label className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer ${ocupado ? 'opacity-40 pointer-events-none' : ''} bg-[#003DA5] text-white hover:bg-blue-800`}>
          {ocupado === 'validando' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
          2. Subir y validar
          <input ref={input} type="file" accept=".xlsx" className="sr-only" aria-label="Archivo de programación (.xlsx)" onChange={elegir} disabled={!!ocupado} />
        </label>
        <button type="button" onClick={confirmar} disabled={!!ocupado || !reporte?.valido}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-40">
          {ocupado === 'cargando' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          3. Cargar programación
        </button>
        {archivo && <span className="text-[11px] text-slate-500">{archivo.name}{filas ? ` · ${filas.length} fila(s)` : ''}</span>}
      </div>

      {error && <p role="alert" className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</p>}

      {r && (
        <div role="status" className={`rounded-lg border p-3 text-xs space-y-2 ${cargado ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : r.valido ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
          <p className="font-bold">
            {cargado ? 'Programación cargada.' : r.valido ? 'El archivo es válido: revise el resumen y cargue.' : `El archivo tiene ${r.errores.length} error(es): corríjalos y vuelva a subirlo. No se escribió nada.`}
          </p>
          <p>
            {!cargado && !r.valido ? 'Lo que sí pasó la validación (no se escribió): ' : ''}{r.resumen.filas} fila(s) · {r.resumen.gruposNuevos} grupo(s) nuevo(s) · {r.resumen.gruposExistentes} existente(s) ·{' '}
            {r.resumen.sesiones} sesión(es) · {r.resumen.asignaciones} docente(s) asignado(s)
          </p>
          {r.errores.length > 0 && (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-left">
                <caption className="sr-only">Errores por fila</caption>
                <thead><tr><th className="pr-3 py-1">Fila</th><th className="py-1">Error</th></tr></thead>
                <tbody>
                  {r.errores.map((e, i) => (
                    <tr key={i} className="border-t border-amber-200 align-top"><td className="pr-3 py-1 font-bold">{e.fila ?? '—'}</td><td className="py-1">{e.mensaje}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {r.avisos.length > 0 && (
            <ul className="list-disc pl-5 space-y-0.5 text-slate-700" aria-label="Avisos">
              {r.avisos.map((a, i) => <li key={i}>{a.fila ? `Fila ${a.fila}: ` : ''}{a.mensaje}</li>)}
            </ul>
          )}
          {r.valido && r.grupos.length > 0 && (
            <details>
              <summary className="cursor-pointer font-bold">Grupos ({r.grupos.length})</summary>
              <ul className="mt-1 space-y-0.5">
                {r.grupos.map((g, i) => (
                  <li key={i}>{g.codigoAsignatura} · grupo {g.grupo}{g.tipoOferta !== 'periodo_regular' ? ` (${g.tipoOferta})` : ''} — {g.nuevo ? 'nuevo' : 'existente'}, {g.sesiones} sesión(es){g.docentes.length ? `, docentes ${g.docentes.join(', ')}` : ''}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
