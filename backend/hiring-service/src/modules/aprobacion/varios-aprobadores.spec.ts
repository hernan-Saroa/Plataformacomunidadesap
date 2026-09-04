import { AprobacionService } from './aprobacion.service';

/**
 * Quién puede resolver una actividad con varios aprobadores (EFDS-1183).
 *
 * La configuración admite roles y personas a la vez, y lo que declara es un
 * conjunto de habilitados: cualquiera de ellos cierra el trámite. No es una
 * aprobación conjunta —varias firmas antes de dar por buena la actividad—,
 * que hoy no existe y no se puede expresar con esta lista.
 */
describe('AprobacionService · puedeAprobar con varios designados', () => {
  /** Sin base: lo que se comprueba es una decisión sobre datos en memoria. */
  const servicio = () => new AprobacionService({} as never);

  const conRoles = (...roles: string[]) => ({ roles, personas: [] });
  const conPersonas = (...personas: string[]) => ({ roles: [], personas });

  /** La sesión de quien mira: sus roles y su cuenta. */
  const quien = (roles: string[], userId = 'cuenta-1') =>
    ({ roles, userId, userName: 'quien.sea@esap.edu.co' }) as never;

  it('con dos roles, basta tener uno', () => {
    const aprobadores = conRoles('DIRECTOR_CONTRATACION', 'ORDENADOR_GASTO');

    expect(servicio().puedeAprobar(aprobadores, quien(['ORDENADOR_GASTO']))).toBe(true);
    expect(servicio().puedeAprobar(aprobadores, quien(['DIRECTOR_CONTRATACION']))).toBe(true);
  });

  it('quien no tiene ninguno de los dos no aprueba', () => {
    const aprobadores = conRoles('DIRECTOR_CONTRATACION', 'ORDENADOR_GASTO');

    expect(servicio().puedeAprobar(aprobadores, quien(['GESTOR_CONTRATACION']))).toBe(false);
  });

  it('reconoce a la persona designada por su id del directorio', () => {
    // El buscador guarda `id_person`, no `id_user`: compararlo con la cuenta
    // no coincidía nunca, así que designar a alguien no le daba la aprobación.
    const aprobadores = conPersonas('persona-9');

    expect(servicio().puedeAprobar(aprobadores, quien([]), 'persona-9')).toBe(true);
  });

  it('no la reconoce por el id de su cuenta, que es otro', () => {
    const aprobadores = conPersonas('cuenta-1');

    expect(servicio().puedeAprobar(aprobadores, quien([], 'cuenta-1'), 'persona-9')).toBe(false);
  });

  it('con dos roles y una persona, cualquiera de los tres resuelve', () => {
    const aprobadores = {
      roles: ['DIRECTOR_CONTRATACION', 'ORDENADOR_GASTO'],
      personas: ['persona-9'],
    };

    // Por rol, sin ser la persona designada.
    expect(servicio().puedeAprobar(aprobadores, quien(['ORDENADOR_GASTO']), 'otra')).toBe(true);
    // Por nombre, sin tener ninguno de los roles.
    expect(servicio().puedeAprobar(aprobadores, quien(['GESTOR_CONTRATACION']), 'persona-9')).toBe(
      true,
    );
    // Ni lo uno ni lo otro.
    expect(servicio().puedeAprobar(aprobadores, quien(['GESTOR_CONTRATACION']), 'otra')).toBe(false);
  });

  it('sin persona resuelta, los roles siguen decidiendo', () => {
    // Una cuenta sin ficha en el directorio no debe perder su rol.
    const aprobadores = { roles: ['DIRECTOR_CONTRATACION'], personas: ['persona-9'] };

    expect(servicio().puedeAprobar(aprobadores, quien(['DIRECTOR_CONTRATACION']), null)).toBe(true);
  });

  it('el superadministrador entra aunque no esté designado', () => {
    expect(servicio().puedeAprobar(conRoles('ORDENADOR_GASTO'), quien(['SUPER_ADMIN']))).toBe(true);
  });
});
