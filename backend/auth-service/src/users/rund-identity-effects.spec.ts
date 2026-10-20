import { IdentityImage, imageValues, restoredValues } from './rund-identity-effects';

const image = (stamp: string, name = 'NOMBRE'): IdentityImage => ({
  version: 1,
  persona: { id: '11111111-1111-4111-8111-111111111111', revision: '10', datos: { tip_identificacion: 'CC', nom_largo: name, nom_tercero: null, pri_apellido: null,
    seg_apellido: null, gen_tercero: 'F', fec_nacimiento: '1980-01-17', dir_email: 'a@esap.edu.co', tel_celular: null, id_seccional: null, fec_modificacion: stamp } },
  usuarios: [{ id: '22222222-2222-4222-8222-222222222222', revision: '11', datos: { username: 'a@esap.edu.co', updated_at: stamp } }],
  roles: [{ usuarioId: '22222222-2222-4222-8222-222222222222', rolId: '33333333-3333-4333-8333-333333333333', revision: '12',
    datos: { is_active: true, created_at: '2026-01-01T00:00:00.000000Z', updated_at: '2026-01-01T00:00:00.000000Z' } }],
});

describe('Comparación de la identidad restaurada', () => {
  it('ignora solo las marcas que Auth reescribe con triggers (fec_modificacion de la persona y updated_at de la cuenta)', () => {
    const before = image('2026-10-19T00:00:00.000000Z'), after = image('2026-10-19T23:18:03.785437Z');
    expect(imageValues(before)).not.toEqual(imageValues(after));
    expect(restoredValues(after)).toEqual(restoredValues(before));
  });

  it('sigue detectando cualquier otra diferencia de persona, cuenta o roles', () => {
    const before = image('2026-10-19T00:00:00.000000Z');
    expect(restoredValues(image('2026-10-19T00:00:00.000000Z', 'OTRO NOMBRE'))).not.toEqual(restoredValues(before));
    const user = image('2026-10-19T00:00:00.000000Z'); user.usuarios[0].datos.username = 'otro@esap.edu.co';
    expect(restoredValues(user)).not.toEqual(restoredValues(before));
    const role = image('2026-10-19T00:00:00.000000Z'); role.roles[0].datos.is_active = false;
    expect(restoredValues(role)).not.toEqual(restoredValues(before));
    const extra = image('2026-10-19T00:00:00.000000Z'); extra.roles = [];
    expect(restoredValues(extra)).not.toEqual(restoredValues(before));
  });

  it('no muta la imagen original y tolera una persona inexistente', () => {
    const before = image('2026-10-19T00:00:00.000000Z'), copy = structuredClone(before);
    restoredValues(before); expect(before).toEqual(copy);
    expect(restoredValues({ version: 1, persona: null, usuarios: [], roles: [] })).toEqual({ version: 1, persona: null, usuarios: [], roles: [] });
  });
});
