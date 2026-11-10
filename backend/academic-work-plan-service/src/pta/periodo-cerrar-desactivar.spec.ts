import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { PeriodoAcademicoController } from './periodo-academico.controller';

const rolesDe = (metodo: string): string[] =>
  Reflect.getMetadata('roles', (PeriodoAcademicoController.prototype as any)[metodo]) ?? [];

describe('periodos: cerrar, desactivar y eliminar', () => {
  const guardar = jest.fn(async (p: any) => p);
  const crear = (p: any) => new PeriodoAcademicoController(
    { findOne: async () => p, save: guardar, count: async () => 0, find: async () => [] } as any, {} as any, {} as any);

  it('eliminar es solo del superusuario; cerrar y desactivar, de quienes crean periodos', () => {
    expect(rolesDe('remove').map((r) => r.toLowerCase())).toEqual(['super_admin', 'super_admin']);
    for (const m of ['cerrar', 'desactivar']) {
      expect(rolesDe(m)).toEqual(expect.arrayContaining(['ADMIN_PROGRAMACION', 'GESTION_PROFESORAL', 'SUPER_ADMIN']));
    }
  });

  it('cerrar deja el periodo en cerrado, incluso el principal en curso', async () => {
    const p: any = { codigo: '2026-2', estado: 'en_curso', extraordinario: false };
    expect((await crear(p).cerrar('1') as any).estado).toBe('cerrado');
  });

  it('desactivar devuelve a planeación solo un periodo en curso', async () => {
    const p: any = { codigo: '2026-2', estado: 'en_curso', extraordinario: true };
    const r: any = await crear(p).desactivar('1');
    expect(r.estado).toBe('planeacion');
    expect(r.extraordinario).toBe(false);
    await expect(crear({ codigo: 'x', estado: 'cerrado' }).desactivar('1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
