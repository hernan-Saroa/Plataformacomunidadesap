import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { CheckCircle2, FileSpreadsheet, Loader2, UploadCloud, X } from 'lucide-react';
import { ErrorImportacion, importarAsignaturas, type PeriodoPlataforma, type ResultadoImportacion } from '../services/api/periodosApi';

const esExcel = (file: File) => /\.(xlsx|xls)$/i.test(file.name);
const tamano = (bytes: number) => bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

export function CargaAsignaturasPeriodo({ periodo, alTerminar }: { periodo: PeriodoPlataforma; alTerminar?: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const importarBoton = useRef<HTMLButtonElement>(null);
  const resultadoPanel = useRef<HTMLDivElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [validacion, setValidacion] = useState<ResultadoImportacion | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState<'validando' | 'confirmando' | null>(null);
  const [error, setError] = useState('');
  const [filtroOfertas, setFiltroOfertas] = useState('');

  useEffect(() => {
    if (validacion?.success && !(validacion.errores?.length) && validacion.blocked_reason !== 'ALL_IDENTICAL') importarBoton.current?.focus();
  }, [validacion]);
  useEffect(() => { if (resultado) resultadoPanel.current?.focus(); }, [resultado]);

  const elegir = (file: File | null) => {
    setArchivo(file); setValidacion(null); setResultado(null); setErrores([]); setError(''); setFiltroOfertas('');
    if (input.current) input.current.value = '';
  };
  const alElegir = (e: ChangeEvent<HTMLInputElement>) => elegir(e.target.files?.[0] ?? null);
  const alSoltar = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault(); setArrastrando(false);
    if (!ocupado && periodo.programable) elegir(e.dataTransfer.files?.[0] ?? null);
  };
  const ejecutar = async (dryRun: boolean) => {
    if (!archivo || ocupado || !periodo.programable || !esExcel(archivo)) return;
    setOcupado(dryRun ? 'validando' : 'confirmando'); setError(''); setErrores([]);
    try {
      const data = await importarAsignaturas(periodo.codigo, archivo, dryRun);
      if (dryRun) { setValidacion(data); setResultado(null); setErrores(data.errores ?? []); }
      else { setResultado(data); setErrores(data.errores ?? []); if (data.success) alTerminar?.(); }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo procesar el archivo.');
      setErrores(e instanceof ErrorImportacion ? e.errores : []);
      if (dryRun) setValidacion(null);
    } finally { setOcupado(null); }
  };

  const resumen = (r: ResultadoImportacion) => <div className="grid gap-3 sm:grid-cols-2" role="status">
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h5 className="mb-3 text-sm font-extrabold text-slate-800">Catálogo de asignaturas</h5>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div><dt className="text-xs text-slate-500">Nuevas</dt><dd className="text-xl font-black text-[#003DA5]">{r.carga?.asignaturas?.creados ?? '—'}</dd></div>
        <div><dt className="text-xs text-slate-500">Actualizadas</dt><dd className="text-xl font-black text-[#003DA5]">{r.carga?.asignaturas?.actualizados ?? '—'}</dd></div>
        <div><dt className="text-xs text-slate-500">Sin cambios</dt><dd className="text-xl font-black text-slate-700">{r.carga?.asignaturas?.sin_cambios ?? r.carga?.asignaturas?.omitidos ?? '—'}</dd></div>
      </dl>
      {(r.carga?.asignaturas?.rechazadas ?? 0) > 0 && <p className="mt-2 text-xs font-bold text-red-700">{r.carga!.asignaturas!.rechazadas} asignaturas rechazadas</p>}
    </div>
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h5 className="mb-3 text-sm font-extrabold text-slate-800">Oferta para {r.periodo}</h5>
      <dl className="grid grid-cols-2 gap-2 text-center">
        <div><dt className="text-xs text-slate-500">Ofertas por crear</dt><dd className="text-xl font-black text-emerald-700">{r.ofertas?.por_crear ?? '—'}</dd></div>
        <div><dt className="text-xs text-slate-500">Ya existentes</dt><dd className="text-xl font-black text-slate-700">{r.ofertas?.ya_existentes ?? '—'}</dd></div>
      </dl>
      {(r.ofertas?.rechazadas ?? 0) > 0 && <p className="mt-2 text-xs font-bold text-red-700">{r.ofertas!.rechazadas} ofertas rechazadas</p>}
    </div>
  </div>;
  const detalleOfertas = (r: ResultadoImportacion) => {
    if (!r.ofertas?.detalle?.length) return null;
    const filtro = filtroOfertas.trim().toLocaleLowerCase('es');
    const visibles = r.ofertas.detalle.filter((o) => !filtro || `${o.codigo_cetap} ${o.nombre_cetap} ${o.codigo_programa} ${o.nombre_programa} ${o.estado}`.toLocaleLowerCase('es').includes(filtro));
    return <details className="rounded-xl border border-slate-200 bg-white" open={r.ofertas.rechazadas > 0}>
      <summary className="cursor-pointer p-4 text-sm font-bold text-[#003DA5]">Ver detalle de ofertas ({r.ofertas.detalle.length})</summary>
      <div className="space-y-3 px-4 pb-4">
        <label className="block text-xs font-bold text-slate-600">Buscar por programa o CETAP
          <input type="search" value={filtroOfertas} onChange={(e) => setFiltroOfertas(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
        <div className="max-h-80 overflow-auto rounded-lg border border-slate-200"><table className="w-full min-w-[620px] text-left text-xs">
          <thead className="sticky top-0 bg-slate-50 text-slate-700"><tr><th className="px-3 py-2">CETAP</th><th className="px-3 py-2">Programa</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2">Motivo</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{visibles.map((o, i) => <tr key={`${o.codigo_cetap}-${o.codigo_programa}-${i}`}>
            <td className="px-3 py-2">{o.nombre_cetap} ({o.codigo_cetap})</td><td className="px-3 py-2">{o.nombre_programa} ({o.codigo_programa})</td>
            <td className="px-3 py-2 font-bold">{o.estado === 'por_crear' ? 'Por crear' : o.estado === 'ya_existente' ? 'Ya existente' : 'Rechazada'}</td><td className="px-3 py-2">{o.motivo ?? '—'}</td>
          </tr>)}</tbody>
        </table></div>
        <p className="text-xs text-slate-500">{visibles.length} de {r.ofertas.detalle.length} ofertas</p>
      </div>
    </details>;
  };
  const paso = resultado?.success ? 4 : validacion?.success && errores.length === 0 ? 3 : archivo ? 2 : 1;
  return <section className="space-y-5 rounded-xl border border-blue-200 bg-blue-50/40 p-4 sm:p-5" aria-label={`Carga masiva ${periodo.codigo}`}>
    <div><h4 className="text-base font-extrabold text-slate-800">Cargar asignaturas y oferta para {periodo.codigo}</h4>
      <p className="mt-1 text-xs text-slate-600">Usa el Excel de Programas Académicos con las hojas ASIGNATURAS y PROGRAMAS.</p></div>
    <ol className="grid grid-cols-3 gap-2" aria-label="Pasos de la carga">
      {['Elegir archivo', 'Validar', 'Confirmar'].map((nombre, i) => <li key={nombre} aria-current={paso === i + 1 ? 'step' : undefined}
        className={`rounded-lg border px-2 py-2 text-center text-xs font-bold ${paso === i + 1 ? 'border-[#003DA5] bg-blue-100 text-[#003DA5]' : paso > i + 1 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-500'}`}>{i + 1}. {nombre}</li>)}
    </ol>
    <input ref={input} type="file" accept=".xlsx,.xls" aria-label="Archivo Excel de asignaturas" className="sr-only" onChange={alElegir} disabled={!!ocupado || !periodo.programable} />
    <button type="button" onClick={() => input.current?.click()} onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }} onDragLeave={() => setArrastrando(false)} onDrop={alSoltar}
      disabled={!!ocupado || !periodo.programable}
      className={`flex min-h-44 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-center transition-colors focus-visible:outline-2 focus-visible:outline-[#003DA5] disabled:opacity-50 ${arrastrando ? 'border-[#003DA5] bg-blue-100' : 'border-blue-300 bg-white hover:bg-blue-50'}`}>
      <UploadCloud className="h-9 w-9 text-[#003DA5]" aria-hidden="true" />
      <strong className="text-sm text-slate-800">Arrastra aquí el Excel o haz clic para buscarlo</strong>
      <span className="text-xs text-slate-500">Formatos .xlsx y .xls</span>
    </button>
    {archivo && <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
      <FileSpreadsheet className="h-6 w-6 shrink-0 text-emerald-700" aria-hidden="true" />
      <div className="min-w-0 flex-1"><p className="truncate font-bold text-slate-800">{archivo.name}</p><p className="text-xs text-slate-500">{tamano(archivo.size)}</p></div>
      <button type="button" onClick={() => elegir(null)} disabled={!!ocupado} aria-label={`Quitar ${archivo.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
    </div>}
    {archivo && !esExcel(archivo) && <p role="alert" className="text-sm text-red-700">El archivo debe ser .xlsx o .xls.</p>}
    <button type="button" onClick={() => ejecutar(true)} disabled={!archivo || !!ocupado || !periodo.programable || !esExcel(archivo)} className="rounded-lg bg-[#003DA5] px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{ocupado === 'validando' ? <><Loader2 className="mr-1 inline h-4 w-4 animate-spin" />Validando…</> : 'Validar archivo'}</button>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {errores.length > 0 && <div className="overflow-x-auto rounded-xl border border-red-200 bg-white"><table className="w-full text-left text-sm">
      <caption className="p-3 text-left font-bold text-red-800">Errores de validación ({errores.length})</caption>
      <thead className="bg-red-50 text-red-900"><tr><th scope="col" className="w-24 px-3 py-2">Fila</th><th scope="col" className="px-3 py-2">Detalle</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{errores.map((mensaje, i) => <tr key={`${i}-${mensaje}`}><td className="px-3 py-2 font-semibold">{mensaje.match(/\bfila\s+(\d+)/i)?.[1] ?? 'General'}</td><td className="px-3 py-2">{mensaje}</td></tr>)}</tbody>
    </table></div>}
    {validacion && !resultado?.success && <div className="space-y-3">
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4" role="status">
        <h5 className="text-sm font-extrabold text-slate-900">Vista previa: el Excel todavía no se ha importado</h5>
        <p className="mt-1 text-sm text-slate-700">{validacion.blocked_reason === 'ALL_IDENTICAL' ? 'Todo el contenido ya existe en este periodo. No hay cambios por importar.' : validacion.success && errores.length === 0 ? 'Estos son los cambios previstos. Para guardarlos en el periodo, pulsa «Importar ahora».' : 'Corrige los errores del archivo y vuelve a validarlo. No se ha guardado nada.'}</p>
      </div>
      {resumen(validacion)}
      {detalleOfertas(validacion)}
      {validacion.success && errores.length === 0 && (validacion.ofertas?.rechazadas ?? 0) === 0 && validacion.blocked_reason !== 'ALL_IDENTICAL' && <div className="flex flex-col gap-3 rounded-xl border-2 border-emerald-400 bg-emerald-50 p-4">
        <div><h5 className="text-base font-extrabold text-emerald-950">3. Confirmar la carga</h5><p className="text-sm text-emerald-900">La validación solo revisó el archivo. Al importar se guardarán las asignaturas y ofertas para {periodo.codigo}.</p></div>
        <button ref={importarBoton} type="button" onClick={() => ejecutar(false)} disabled={!!ocupado || !periodo.programable}
          style={{ backgroundColor: '#047857', color: '#ffffff' }}
          className="w-full rounded-lg px-6 py-3 text-base font-extrabold shadow-md hover:brightness-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-40">
          {ocupado === 'confirmando' ? <><Loader2 className="mr-2 inline h-5 w-5 animate-spin" />Importando…</> : 'Importar ahora'}
        </button>
      </div>}
    </div>}
    {resultado && <div ref={resultadoPanel} tabIndex={-1} className={`space-y-3 rounded-xl border p-4 ${resultado.success ? 'border-emerald-300 bg-emerald-50' : 'border-red-200 bg-red-50'}`} role="status">
      <h5 className="flex items-center gap-2 text-sm font-extrabold text-slate-800">{resultado.success && <CheckCircle2 className="h-5 w-5 text-emerald-700" />} {resultado.success ? `Importación terminada: los datos ya se guardaron para ${resultado.periodo}` : 'Importación rechazada: no se guardaron cambios'}</h5>{resumen(resultado)}
      {resultado.success && resultado.resumen_periodo && <p className="text-sm font-bold text-emerald-950">Quedaron en el periodo: {resultado.resumen_periodo.programas} programas, {resultado.resumen_periodo.asignaturas} asignaturas, {resultado.resumen_periodo.cetaps} CETAP y {resultado.resumen_periodo.ofertas} ofertas.</p>}
      {detalleOfertas(resultado)}
    </div>}
    {(validacion?.advertencias?.length ?? 0) > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><strong>Advertencias</strong><ul className="mt-1 list-disc pl-5">{validacion!.advertencias!.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
    <p className="text-xs text-slate-600">También puedes agregar una asignatura manualmente en Programas Académicos → plan de estudios del programa.</p>
  </section>;
}
