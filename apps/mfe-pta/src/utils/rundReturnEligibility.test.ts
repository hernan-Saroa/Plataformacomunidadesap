import { expect, it } from 'vitest';
import { canReturnRundBlock } from './rundReturnEligibility';

it.each([['IDENTIDAD','documento_identidad'], ['FORMACION','diploma_pregrado'], ['VINCULACION','contrato'],
  ['ACADEMICO','acto_asignacion_nucleo'], ['TRANSVERSAL','autorizacion_habeas_data']])('habilita %s solo con un soporte propio disponible', (bloque, tipo_soporte) => {
  const soporte = { tipo_soporte, documento_perfil_id: 'v1', estado_documento: 'ACTIVO' };
  expect(canReturnRundBlock({ bloque, soportes: [] })).toBe(false);
  expect(canReturnRundBlock({ bloque, soportes: [soporte] })).toBe(true);
  expect(canReturnRundBlock({ bloque, soportes: [soporte], puedeDevolver: false })).toBe(false);
  for (const changes of [{ estado_documento: 'ELIMINADO' }, { estado_documento: 'REEMPLAZADO' }, { estado_documento: null },
    { documento_perfil_id: null }, { tipo_soporte: 'soporte_edicion_perfil' }, { tipo_soporte: 'soporte_cambio_estado_perfil' }, { tipo_soporte: null }, { bloque: 'CONTACTO' }]) {
    expect(canReturnRundBlock({ bloque, soportes: [{ ...soporte, ...changes }] })).toBe(false);
  }
});
it('Contacto no requiere soportes; un bloque desconocido no permite devoluciones', () => {
  expect(canReturnRundBlock({ bloque: 'CONTACTO', soportes: [] })).toBe(true);
  expect(canReturnRundBlock()).toBe(false);
  expect(canReturnRundBlock({ bloque: 'OTRO', soportes: [{ tipo_soporte: 'documento_identidad', documento_carpeta_id: '/documento' }] })).toBe(false);
});
