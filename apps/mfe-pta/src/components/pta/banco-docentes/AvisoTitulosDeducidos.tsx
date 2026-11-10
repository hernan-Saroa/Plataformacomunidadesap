/** RUND-003: la carga masiva deduce los títulos adicionales de PERFIL_ACADEMICO; informa cuántos y cuáles no pudo clasificar. */
export function AvisoTitulosDeducidos({ deducidos, sinClasificar }: { deducidos?: number; sinClasificar?: number }) {
  const total = Number(deducidos) || 0;
  const pendientes = Number(sinClasificar) || 0;
  if (!total && !pendientes) return null;
  return (
    <div role="note" className="px-8 py-3 text-xs text-gray-600 bg-violet-50/50 border-b border-gray-100">
      <strong className="text-violet-700">Títulos del perfil académico:</strong>{' '}
      {total} {total === 1 ? 'título se registrará' : 'títulos se registrarán'} como información adicional (según el nivel que indica el texto).
      {pendientes > 0 && <> {pendientes} {pendientes === 1 ? 'no se pudo clasificar con certeza y queda' : 'no se pudieron clasificar con certeza y quedan'} solo en el perfil académico.</>}
    </div>
  );
}
