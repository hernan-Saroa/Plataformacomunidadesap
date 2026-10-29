import { describe, expect, it } from 'vitest';
import { rundActorName } from './rundActorName';

describe('Nombres visibles de actores RUND', () => {
  it('presenta el nombre recibido del directorio', () => {
    expect(rundActorName('  María   Pérez  ', '770e8400-e29b-41d4-a716-446655440001')).toBe('María Pérez');
  });
  it.each([undefined, '770e8400-e29b-41d4-a716-446655440001', 'usuario-123', 'usuario@example.test'])('evita referencias visibles aunque el backend anterior envíe %s', name => {
    expect(rundActorName(name, '770e8400-e29b-41d4-a716-446655440001')).toBe('Usuario no disponible');
  });
  it('identifica acciones del sistema y autogestión sin imprimir sus claves', () => {
    expect(rundActorName(null, 'SISTEMA')).toBe('Sistema');
    expect(rundActorName(null, 'AUTOGESTION:770e8400-e29b-41d4-a716-446655440001')).toBe('Docente (autogestión)');
    expect(rundActorName('Docente (autogestión)')).toBe('Docente (autogestión)');
  });
});
