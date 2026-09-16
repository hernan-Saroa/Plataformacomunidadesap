import { RegistroActividadService } from './registro-actividad.service';

/**
 * Asignar un formato a la actividad exige su documento (EFDS-1183).
 *
 * Antes había que hacer dos cosas —asignar la plantilla y además crear una
 * regla DOCUMENTO_REQUERIDO— y el resultado fue el previsible: cuatro formatos
 * asignados, una sola regla, y treinta y siete actividades sin ninguna de las
 * dos. Estas pruebas fijan que basta con la asignación.
 */
describe('RegistroActividadService · el formato asignado exige el documento', () => {
  /** Lo mínimo del EntityManager: un repositorio de plantillas que responde. */
  const conFormatos = (formatos: { modalidades: string[] }[]) =>
    ({
      getRepository: () => ({ find: async () => formatos }),
    }) as never;

  /** El helper es privado: se llega por el nombre, que es lo que se prueba. */
  const preguntar = (em: unknown, numeral: string, modalidad: string | null) =>
    (new RegistroActividadService({} as never, {} as never) as never as {
      tieneFormatoAsignado(em: unknown, n: string, m: string | null): Promise<boolean>;
    }).tieneFormatoAsignado(em, numeral, modalidad);

  it('exige el documento cuando hay un formato para todas las modalidades', async () => {
    // Alcance vacío significa todas: es lo habitual en la biblioteca.
    await expect(preguntar(conFormatos([{ modalidades: [] }]), '5.9', 'LICITACION')).resolves.toBe(
      true,
    );
  });

  it('exige el documento cuando el formato alcanza a la modalidad del proceso', async () => {
    await expect(
      preguntar(conFormatos([{ modalidades: ['LICITACION'] }]), '5.9', 'LICITACION'),
    ).resolves.toBe(true);
  });

  it('no lo exige si el formato es de otra modalidad', async () => {
    // Pedir el formato del pliego de licitación en una contratación directa
    // bloquearía la actividad con un documento que no existe para ese caso.
    await expect(
      preguntar(conFormatos([{ modalidades: ['LICITACION'] }]), '5.9', 'CONTRATACION_DIRECTA'),
    ).resolves.toBe(false);
  });

  it('no lo exige donde no hay ningún formato asignado', async () => {
    // Es el caso de treinta y siete de las treinta y ocho actividades: la
    // pantalla tiene que seguir viéndose como hoy hasta que el área asigne.
    await expect(preguntar(conFormatos([]), '5.9', 'LICITACION')).resolves.toBe(false);
  });

  it('lo exige aunque Contratación no haya subido todavía el archivo', async () => {
    // Lo que obliga es entregar el documento, no que la plantilla esté
    // publicada: hoy las cuatro que existen tienen archivo_url en NULL.
    await expect(
      preguntar(conFormatos([{ modalidades: [] }]), '3.1', 'LICITACION'),
    ).resolves.toBe(true);
  });

  it('no lo exige si el proceso no tiene modalidad y el formato sí la acota', async () => {
    // Sin modalidad no se puede afirmar que el formato aplique, y exigir un
    // documento «por si acaso» bloquearía la actividad sin fundamento.
    await expect(
      preguntar(conFormatos([{ modalidades: ['LICITACION'] }]), '5.9', null),
    ).resolves.toBe(false);
  });
});
