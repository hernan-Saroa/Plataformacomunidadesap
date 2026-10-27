/**
 * Vinculación del docente para las vistas — EFDS-2344 / EFDS-2343.
 *
 * Sale del banco de docentes (`academic_work_plan."Docente"."tipoVinculacion"`),
 * que es texto: «Carrera1», «Carrera2», «Cátedra», «Ocasional», «Periodo de
 * Prueba», «Especial»… Se normaliza a un tipo cerrado para que el cliente filtre
 * y pinte sin comparar texto; `texto` conserva el valor crudo.
 */
export type TipoVinculacion = 'carrera' | 'ocasional' | 'especial' | 'catedra' | 'periodo_prueba' | 'otra';

export interface Vinculacion {
  tipo: TipoVinculacion;
  texto: string;
}

export function normalizarVinculacion(texto: string | null | undefined): Vinculacion | null {
  const crudo = String(texto ?? '').trim();
  if (!crudo) return null;
  const n = crudo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ');
  const tipo: TipoVinculacion =
    n.includes('catedra') || n === 'hc' ? 'catedra'
      : n.includes('carrera') ? 'carrera'
      : n.includes('prueba') ? 'periodo_prueba'
      : n.includes('ocasional') ? 'ocasional'
      : n.includes('especial') ? 'especial'
      : 'otra';
  return { tipo, texto: crudo };
}
