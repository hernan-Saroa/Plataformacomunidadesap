import { ForbiddenException } from '@nestjs/common';
import { CentroAyudaActivoGuard } from '../centro-ayuda-activo.guard';

describe('CentroAyudaActivoGuard', () => {
  const guardCon = (filas: any[]) => {
    const dataSource = { query: jest.fn().mockResolvedValue(filas) };
    return { guard: new CentroAyudaActivoGuard(dataSource as any), dataSource };
  };

  it('deja pasar si el módulo está activo en Gestión de módulos', async () => {
    const { guard, dataSource } = guardCon([{ is_active: true }]);
    await expect(guard.canActivate()).resolves.toBe(true);
    expect(dataSource.query.mock.calls[0][1]).toEqual(['centro-ayuda']);
  });

  it('apaga el Centro de Ayuda si el módulo se desactivó', async () => {
    const { guard } = guardCon([{ is_active: false }]);
    await expect(guard.canActivate()).rejects.toThrow(
      new ForbiddenException('El Centro de Ayuda está desactivado en Gestión de módulos.'),
    );
  });

  it('si el módulo no está registrado no bloquea', async () => {
    const { guard } = guardCon([]);
    await expect(guard.canActivate()).resolves.toBe(true);
  });
});
