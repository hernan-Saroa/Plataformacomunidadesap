import type { EstadoConcertacion, FirmaConcertacion } from '../services/api/concertacionApi';

/**
 * Dónde va la concertación: Enviada → Revisión académica → Aprobación. Lo usan el docente y la bandeja,
 * para que los dos lean el mismo orden (la aprobación solo llega después de la revisión).
 */
const PASOS = [
  { clave: 'envio', etiqueta: 'Enviada por el docente' },
  { clave: 'revision', etiqueta: 'Revisión académica' },
  { clave: 'aprobacion', etiqueta: 'Aprobación' },
] as const;

function completados(estado: EstadoConcertacion): number {
  switch (estado) {
    case 'ENVIADA': return 1;
    case 'REVISADA': return 2;
    case 'APROBADA': return 3;
    default: return 0; // DEVUELTA: vuelve al docente
  }
}

export function EtapasConcertacion({ estado }: { estado: EstadoConcertacion }) {
  const hechos = completados(estado);
  if (estado === 'DEVUELTA') {
    return <p className="text-[11px] font-bold text-amber-700">Devuelta al docente: debe corregir y reenviar.</p>;
  }
  return (
    <ol className="flex items-center gap-1 text-[11px]" aria-label="Etapas de la concertación">
      {PASOS.map((p, i) => {
        const hecho = i < hechos;
        const actual = i === hechos;
        return (
          <li key={p.clave} className="flex items-center gap-1">
            <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full font-bold ${
              hecho ? 'bg-emerald-600 text-white' : actual ? 'bg-[#003DA5] text-white' : 'bg-slate-200 text-slate-500'}`}>
              {hecho ? '✓' : i + 1}
            </span>
            <span className={hecho ? 'text-emerald-700 font-semibold' : actual ? 'text-[#003DA5] font-bold' : 'text-slate-400'}>
              {p.etiqueta}{actual ? ' (pendiente)' : ''}
            </span>
            {i < PASOS.length - 1 && <span className="mx-1 text-slate-300">→</span>}
          </li>
        );
      })}
    </ol>
  );
}

const ROL: Record<FirmaConcertacion['rol'], string> = { docente: 'Docente', revisor: 'Revisor académico', aprobador: 'Aprobador' };

/** Registro de firmas: quién (rol), cuándo y con qué modo de código. */
export function RegistroFirmas({ firmas }: { firmas?: FirmaConcertacion[] }) {
  if (!firmas?.length) return null;
  return (
    <div className="text-[11px] text-slate-600">
      <p className="font-bold text-slate-500 uppercase tracking-wider mb-1">Registro de firmas</p>
      <ul className="space-y-0.5">
        {firmas.map((f, i) => (
          <li key={`${f.rol}-${f.firmadoEn}-${i}`}>
            <strong>{ROL[f.rol] ?? f.rol}</strong> · {new Date(f.firmadoEn).toLocaleString('es-CO')}
            {f.modoOtp === 'simulado' && <span className="text-amber-700"> · código simulado</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
