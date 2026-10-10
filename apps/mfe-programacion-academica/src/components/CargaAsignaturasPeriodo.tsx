import { useState } from 'react';
import { importarAsignaturas, type PeriodoPlataforma, type ResultadoImportacion } from '../services/api/periodosApi';

/** Pantalla nueva; reutiliza el servicio de importación existente del PTA. */
export function CargaAsignaturasPeriodo({ periodo, alTerminar }: {
  periodo: PeriodoPlataforma;
  alTerminar?: () => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [validacion, setValidacion] = useState<ResultadoImportacion | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');

  const ejecutar = async (dryRun: boolean) => {
    if (!archivo || ocupado || !periodo.programable) return;
    setOcupado(true); setError('');
    try {
      const data = await importarAsignaturas(periodo.codigo, archivo, dryRun);
      if (dryRun) { setValidacion(data); setResultado(null); }
      else {
        setResultado(data);
        if (data.success) alTerminar?.();
      }
    } catch (e: any) {
      setError(e?.message || 'No se pudo procesar el archivo.');
      if (dryRun) setValidacion(null);
    } finally { setOcupado(false); }
  };

  const resumen = (r: ResultadoImportacion) => {
    const c = r.carga?.asignaturas;
    const noIngresadas = c?.omitidos ?? 0;
    return (
      <div className="space-y-2 text-xs text-slate-700" role="status">
        <p><strong>Asignaturas: {c?.creados ?? 0} nuevas, {c?.actualizados ?? 0} actualizadas; {noIngresadas} no ingresadas.</strong></p>
        <p>Programas: {r.carga?.programas?.creados ?? 0} nuevos, {r.carga?.programas?.actualizados ?? 0} actualizados.</p>
        {(r.errores ?? []).length > 0 && (
          <ul className="list-disc pl-5">{r.errores!.map((x, i) => <li key={i}>{x}</li>)}</ul>
        )}
        {(r.advertencias ?? []).length > 0 && (
          <ul className="list-disc pl-5">{r.advertencias!.map((x, i) => <li key={i}>{x}</li>)}</ul>
        )}
        {(r.relaciones_cruzadas ?? []).flatMap((p) => p.errores.map((x) => `${p.codigo_programa}: ${x}`)).length > 0 && (
          <ul className="list-disc pl-5">
            {r.relaciones_cruzadas!.flatMap((p) => p.errores.map((x) => `${p.codigo_programa}: ${x}`))
              .map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        )}
      </div>
    );
  };

  return (
    <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3" aria-label={`Carga masiva ${periodo.codigo}`}>
      <h4 className="text-sm font-bold text-slate-800">Cargar asignaturas para {periodo.codigo}</h4>
      <p className="text-xs text-slate-600">Use el Excel de Programas Académicos con hojas ASIGNATURAS y PROGRAMAS. La carga usa el mismo servicio del PTA.</p>
      <input type="file" accept=".xlsx,.xls" aria-label="Archivo Excel de asignaturas"
        disabled={ocupado || !periodo.programable}
        onChange={(e) => {
          const siguiente = e.target.files?.[0] ?? null;
          setArchivo(siguiente); setValidacion(null); setResultado(null); setError('');
        }} />
      {archivo && !['xlsx', 'xls'].includes(archivo.name.split('.').pop()?.toLowerCase() ?? '') && (
        <p className="text-xs text-red-700">El archivo debe ser .xlsx o .xls.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => ejecutar(true)} disabled={!archivo || ocupado || !periodo.programable || !/\.(xlsx|xls)$/i.test(archivo.name)}
          className="rounded-lg bg-[#003DA5] px-3 py-2 text-xs font-bold text-white disabled:opacity-40">
          {ocupado ? 'Procesando…' : 'Validar archivo'}
        </button>
        {validacion && (
          <button type="button" onClick={() => ejecutar(false)}
            disabled={ocupado || !periodo.programable || !validacion.success || (validacion.errores?.length ?? 0) > 0}
            className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">
            Confirmar importación
          </button>
        )}
      </div>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      {validacion && <div><p className="font-bold text-xs text-slate-800 mb-1">Validación previa</p>{resumen(validacion)}</div>}
      {resultado && <div><p className="font-bold text-xs text-emerald-800 mb-1">{resultado.success ? 'Importación terminada' : 'Importación rechazada'}</p>{resumen(resultado)}</div>}
      <p className="text-xs text-slate-600">Si aparece una materia nueva, puede agregarla manualmente en Programas Académicos → plan de estudios del programa. Esa opción permanece disponible.</p>
    </section>
  );
}
