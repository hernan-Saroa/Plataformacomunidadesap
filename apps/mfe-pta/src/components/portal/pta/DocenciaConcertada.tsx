import { BookOpen, CheckCircle2, LockKeyhole } from 'lucide-react';

export interface AsignaturaConcertadaVista {
  id?: number;
  origen?: string;
  editable?: boolean;
  asignatura_codigo?: string;
  asignatura_nombre?: string;
  total_horas?: number;
  nivel_concertacion?: 'pregrado' | 'posgrado';
}

export interface AprobacionDocenciaVista {
  componente?: string;
  estado?: string;
  scope?: string;
}

export function DocenciaConcertada({
  asignaturas,
  aprobaciones,
  aprobacionesCargadas,
  vistaPrevia = false,
  ptaVigente = null,
  onIrAMisPtas,
}: {
  asignaturas: AsignaturaConcertadaVista[];
  aprobaciones: AprobacionDocenciaVista[];
  aprobacionesCargadas: boolean;
  /** PTA nuevo (aún sin guardar): lo concertado ya está aprobado y se incorpora al guardar. */
  vistaPrevia?: boolean;
  /** PTA del docente ya existente en este periodo: se continúa ese, no se crea otro. */
  ptaVigente?: { id: string; estado: string } | null;
  onIrAMisPtas?: () => void;
}) {
  const concertadas = asignaturas.filter((asignatura) => asignatura.origen === 'programacion');
  const totalHoras = concertadas.reduce((total, asignatura) => total + Number(asignatura.total_horas || 0), 0);
  // En la vista previa de un PTA nuevo, que haya docencia concertada significa que YA se aprobó (el
  // servidor solo entrega lo aprobado); la aprobación del componente se registra al guardar.
  const aprobada = (vistaPrevia && concertadas.length > 0) || aprobaciones.some((aprobacion) =>
    aprobacion.scope === 'programacion'
    && aprobacion.estado === 'aprobado'
    && (aprobacion.componente === 'academica_pregrado' || aprobacion.componente === 'academica_posgrado'),
  );

  return (
    <section className="rounded-2xl border border-blue-200 bg-white overflow-hidden" aria-label="Docencia concertada">
      <div className="p-5 border-b border-blue-100 bg-blue-50/60">
        <h2 className="flex items-center gap-2 font-black text-slate-800">
          <BookOpen className="w-5 h-5 text-[#003DA5]" /> Docencia Directa
        </h2>
        {aprobada ? (
          <p className="mt-2 flex items-center gap-2 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> Aprobada en la concertación
            {vistaPrevia && <span className="font-normal text-emerald-800">· se incorpora a este PTA al guardarlo</span>}
          </p>
        ) : aprobacionesCargadas && concertadas.length > 0 ? (
          <p className="mt-2 text-sm text-amber-800">La aprobación de la concertación aún no figura en el PTA.</p>
        ) : !aprobacionesCargadas && concertadas.length > 0 ? (
          <p className="mt-2 text-sm text-slate-500">Consultando aprobación de la concertación…</p>
        ) : null}
        <p className="mt-2 flex items-start gap-2 text-sm text-slate-600">
          <LockKeyhole className="w-4 h-4 shrink-0 mt-0.5" />
          Las asignaturas y sus horas vienen de Programación Académica. La concertación las aprueba; por eso no se pueden editar ni agregar asignaturas a mano en el PTA.
        </p>
        {ptaVigente && (
          <div role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Ya tiene un PTA de este periodo ({ptaVigente.estado}) con su docencia. Continúe ese PTA en lugar de crear otro.
            {onIrAMisPtas && (
              <button type="button" onClick={onIrAMisPtas} className="ml-2 font-bold underline">Ir a mis PTAs</button>
            )}
          </div>
        )}
      </div>

      {concertadas.length === 0 ? (
        <p className="p-5 text-sm text-slate-600">
          La Docencia llegará al PTA cuando se apruebe la concertación en Programación Académica. Mientras tanto, puede guardar el PTA como borrador.
        </p>
      ) : (
        <div className="p-5 space-y-3">
          <ul className="divide-y divide-slate-100" aria-label="Asignaturas concertadas">
            {concertadas.map((asignatura, indice) => (
              <li key={`${asignatura.asignatura_codigo || asignatura.asignatura_nombre || 'asignatura'}-${indice}`}
                className="flex items-start justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-800">{asignatura.asignatura_nombre || asignatura.asignatura_codigo || 'Asignatura'}</p>
                  {asignatura.asignatura_codigo && <p className="text-xs text-slate-500">{asignatura.asignatura_codigo}</p>}
                </div>
                <span className="shrink-0 font-bold text-[#003DA5]">{Number(asignatura.total_horas || 0)} h</span>
              </li>
            ))}
          </ul>
          <p className="flex justify-between border-t border-slate-200 pt-3 text-sm font-black text-slate-800">
            <span>Total Docencia</span><span>{totalHoras} h</span>
          </p>
        </div>
      )}
    </section>
  );
}
