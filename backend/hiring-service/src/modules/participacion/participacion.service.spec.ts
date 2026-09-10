import { esSuya } from './participacion.service';

/**
 * `esSuya` es la pieza de la que cuelga todo el reparto: decide si un abogado
 * ve el proceso que le asignaron, si puede revisarlo, y si quien intenta
 * repartir es el que tomó el expediente. La usan el filtro del listado y los
 * rótulos de la pantalla, así que tenerla una sola vez es lo que impide que un
 * proceso salga en la lista y la ficha no lo reconozca como propio.
 *
 * Acepta los dos identificadores porque el token trae `sub` —el `id_user`— y
 * `username`, y ninguno está garantizado: las sesiones de servicio pueden
 * llegar sin `sub`, y el username es lo que escribió quien inició sesión.
 */
describe('esSuya', () => {
  const participacion = {
    usuarioId: '11111111-1111-4111-8111-111111111111',
    usuarioNombre: 'laura.pineda@esap.edu.co',
  };

  it('reconoce a la persona por el id de su cuenta', () => {
    expect(
      esSuya(participacion, { userId: participacion.usuarioId, userName: 'otro.nombre' }),
    ).toBe(true);
  });

  it('y también por el username, que es lo que comparan los listados', () => {
    expect(esSuya(participacion, { userId: '', userName: 'laura.pineda@esap.edu.co' })).toBe(
      true,
    );
  });

  it('sin distinguir mayúsculas ni espacios sobrantes', () => {
    // `procesos.created_by` ya arrastra la misma cuenta escrita de dos formas,
    // según cómo la tecleara cada quien al entrar.
    expect(esSuya(participacion, { userId: '', userName: '  LAURA.Pineda@esap.edu.co ' })).toBe(
      true,
    );
  });

  it('no es de quien no aparece en la participación', () => {
    expect(
      esSuya(participacion, {
        userId: '22222222-2222-4222-8222-222222222222',
        userName: 'carlos.mendoza@esap.edu.co',
      }),
    ).toBe(false);
  });

  it('un identificador vacío no coincide con una participación sin ese dato', () => {
    // Las filas viejas pueden no tener `usuario_id`, y una sesión de servicio
    // puede llegar sin `sub`. Sin esta guarda, vacío contra vacío daría «es
    // tuyo» y cualquiera podría repartir el abogado de un proceso ajeno.
    expect(
      esSuya(
        { usuarioId: null, usuarioNombre: 'laura.pineda@esap.edu.co' },
        { userId: '', userName: 'carlos.mendoza@esap.edu.co' },
      ),
    ).toBe(false);

    expect(esSuya({ usuarioId: null, usuarioNombre: '' }, { userId: '', userName: '' })).toBe(
      false,
    );
  });
});
