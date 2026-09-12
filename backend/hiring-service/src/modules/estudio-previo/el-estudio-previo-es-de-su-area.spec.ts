import { esSuElEstudioPrevio } from './estudio-previo.service';

/**
 * Quién puede reescribir un estudio previo (EFDS-1183).
 *
 * `contratacion.actividad.edit` dice que alguien diligencia estudios previos,
 * no que diligencie el de cualquier expediente de la entidad. Hasta ahora era
 * lo segundo: un estructurador de un área podía abrir y reescribir el que otra
 * área había radicado, y nada lo impedía.
 */
describe('de quién es el estudio previo', () => {
  const LO_RADICO = true;
  const ESTA_EN_EL_PROCESO = true;

  it('es del área que radicó el proceso', () => {
    expect(esSuElEstudioPrevio(LO_RADICO, !ESTA_EN_EL_PROCESO)).toBe(true);
  });

  it('y de quien está en el proceso, que es la Dirección al recibirlo', () => {
    // Contratación tiene que poder completar algo antes de repartirlo, y el
    // abogado tiene que poder tocar lo que revisa.
    expect(esSuElEstudioPrevio(!LO_RADICO, ESTA_EN_EL_PROCESO)).toBe(true);
  });

  it('de nadie más, por mucho permiso de editar que tenga', () => {
    // Es el caso que motiva la regla: el permiso no basta para reescribir el
    // expediente de otra área.
    expect(esSuElEstudioPrevio(!LO_RADICO, !ESTA_EN_EL_PROCESO)).toBe(false);
  });
});
