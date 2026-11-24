export interface DetalleSinClasificar { fila?: number | string | null; nombre?: string | null; titulos: string[] }

interface Props {
  /** Títulos reconocidos en PERFIL_ACADEMICO (nuevos o ya presentes en las columnas de título). */
  reconocidos?: number;
  /** De esos, los que se registrarán como información adicional. */
  deducidos?: number;
  /** Textos del perfil que no se pudieron clasificar con certeza. */
  sinClasificar?: number;
  /** Filas válidas cuyo perfil no trae ningún título que reconocer. */
  filasSinTitulos?: number;
  /** Filas rechazadas por errores: no se analizaron. */
  filasConError?: number;
  /** Qué quedó sin clasificar y en qué fila, para que el usuario lo revise. */
  detalle?: DetalleSinClasificar[];
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const MAX_DETALLE = 8;

/**
 * RUND-003: la carga masiva reconoce los títulos de PERFIL_ACADEMICO. Siempre informa qué pasó con ellos (cuántos reconoció,
 * cuántos registrará, cuáles no pudo clasificar) y también cuando no hay nada que registrar, para que no parezca que la
 * función no corrió. Las filas con errores se avisan aparte porque no se analizan.
 */
export function AvisoTitulosDeducidos({ reconocidos, deducidos, sinClasificar, filasSinTitulos, filasConError, detalle }: Props) {
  const nuevos = Number(deducidos) || 0;
  const pendientes = Number(sinClasificar) || 0;
  const total = Math.max(Number(reconocidos) || 0, nuevos);
  const sinTitulos = Number(filasSinTitulos) || 0;
  const conError = Number(filasConError) || 0;
  if (!total && !pendientes && !sinTitulos && !conError) return null;
  const lineas = (detalle || []).filter(item => item.titulos?.length);
  const visibles = lineas.slice(0, MAX_DETALLE);
  return (
    <div role="note" className="px-8 py-3 text-xs text-gray-600 bg-violet-50/50 border-b border-gray-100 space-y-1">
      <p>
        <strong className="text-violet-700">Títulos del perfil académico:</strong>{' '}
        {total > 0 && <>{plural(total, 'título reconocido', 'títulos reconocidos')}. </>}
        {nuevos > 0 && <>{plural(nuevos, 'se registrará', 'se registrarán')} como información adicional (según el nivel que indica el texto). </>}
        {total > 0 && nuevos === 0 && <>No hay títulos adicionales nuevos por registrar: ya coinciden con las columnas de título o con lo registrado. </>}
        {pendientes > 0 && <>{pendientes} {pendientes === 1 ? 'no se pudo clasificar con certeza y queda' : 'no se pudieron clasificar con certeza y quedan'} solo en el perfil académico. </>}
        {sinTitulos > 0 && <>{plural(sinTitulos, 'fila trae', 'filas traen')} un perfil académico sin títulos reconocibles{total === 0 && pendientes === 0 ? ': no hay títulos que registrar' : ''}. </>}
      </p>
      {visibles.length > 0 && (
        <details>
          <summary className="cursor-pointer text-violet-700 font-semibold">Ver lo que no se pudo clasificar</summary>
          <ul className="mt-1 list-disc pl-5">
            {visibles.map((item, indice) => (
              <li key={`${item.fila ?? indice}-${indice}`}>
                {item.fila ? `Fila ${item.fila}` : 'Fila'}{item.nombre ? ` · ${item.nombre}` : ''}: {item.titulos.join(' · ')}
              </li>
            ))}
            {lineas.length > visibles.length && <li>… y {lineas.length - visibles.length} fila(s) más.</li>}
          </ul>
        </details>
      )}
      {conError > 0 && (
        <p className="text-amber-700">
          {plural(conError, 'fila con errores no se analizó', 'filas con errores no se analizaron')}: corrige el reporte de errores y vuelve a cargar para que se reconozcan sus títulos.
        </p>
      )}
    </div>
  );
}
