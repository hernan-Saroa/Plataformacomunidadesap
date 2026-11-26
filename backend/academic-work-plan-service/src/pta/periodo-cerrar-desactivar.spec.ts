import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { PeriodoAcademicoController } from './periodo-academico.controller';

const rolesDe = (metodo: string): string[] =>
  Reflect.getMetadata('roles', (PeriodoAcademicoController.prototype as any)[metodo]) ?? [];

describe('periodos: cerrar, desactivar y eliminar', () => {
  const guardar = jest.fn(async (p: any) => p);
  const crear = (p: any) => new PeriodoAcademicoController(
    { findOne: async () => p, save: guardar, count: async () => 0, find: async () => [] } as any, {} as any, {} as any);

  // Bug QA 18-nov («no deja eliminar periodos»): eliminar ya no es solo del superusuario. Pasa los
  // mismos roles que crear, cerrar y desactivar, y además el servidor exige el permiso de gestionar
  // periodos (ver periodo-eliminacion.agregado.spec.ts para lo que se borra y lo que no).
  it('eliminar, cerrar y desactivar: de quienes crean periodos', () => {
    for (const m of ['remove', 'cerrar', 'desactivar']) {
      expect(rolesDe(m)).toEqual(expect.arrayContaining(['ADMIN_PROGRAMACION', 'GESTION_PROFESORAL', 'SUPER_ADMIN']));
    }
  });

  it('eliminar exige el permiso de gestionar periodos aunque el rol pase (403)', async () => {
    const ctrl = new PeriodoAcademicoController(
      { findOne: async () => ({ id: '9', codigo: '2091-1', estado: 'planeacion' }) } as any, {} as any,
      { userHasAnyPermission: async () => false } as any);
    await expect(ctrl.remove('9', { user: { userId: 'x' } })).rejects.toThrow(/permiso/);
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
