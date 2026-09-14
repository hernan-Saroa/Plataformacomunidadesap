import { ForbiddenException } from '@nestjs/common';
import { BancoDocentesController } from './banco-docentes.controller';
import { RUND_PERMISSIONS } from './rund-permissions';
import { buildRundPerfilCabezote } from './rund-perfil-cabezote';

const PERFIL = {
  docente_id: '11111111-1111-4111-8111-111111111111',
  persona_id: 'persona-1',
  nombre_completo: 'MARIA LOPEZ RUIZ',
  documento_identidad: '1020304050',
  vinculacion: 'Planta',
  categoria: 'Asociado',
  territorial: 'Antioquia',
  estado: 'ACTIVO',
  puntaje_salarial: 145.5,
  ultima_evaluacion: 'Sobresaliente 2025-2',
  canal_origen: 'MASIVO',
};

function buildController(overrides: Record<string, any> = {}) {
  const service = {
    getPerfilCabezote: jest.fn().mockResolvedValue(buildRundPerfilCabezote(PERFIL)),
    getById: jest.fn().mockResolvedValue(PERFIL),
    logSensitiveDataAccess: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return { service, controller: new BancoDocentesController(service as any, {} as any) };
}

describe('GET /banco-docentes/:id/cabezote', () => {
  it.each(['ADMIN', 'ADMIN_TERRITORIAL', 'DOCENTE', 'CONSULTOR'])(
    'oculta el puntaje salarial del cabezote para %s aunque tenga todos los permisos RUND',
    async (role) => {
      const { service, controller } = buildController();

      const response: any = await controller.getPerfilCabezote(PERFIL.docente_id, undefined, {
        user: { userId: 'lector-1', roles: [role] },
        rundPermissions: new Set(Object.values(RUND_PERMISSIONS)),
      });

      expect(response.data.puntaje_salarial).toBeNull();
      expect(response.data.proteccion_datos.acceso_completo).toBe(false);
      expect(JSON.stringify(response.data)).not.toContain('145.5');
      expect(service.logSensitiveDataAccess).toHaveBeenCalledWith([
        expect.objectContaining({ actorId: 'lector-1', endpoint: 'CABEZOTE_PERFIL_RUND', fullAccess: false }),
      ]);
    },
  );

  it.each(['GESTION_PROFESORAL', 'SUPER_ADMIN'])('entrega el puntaje completo a %s', async (role) => {
    const { controller } = buildController();

    const response: any = await controller.getPerfilCabezote(PERFIL.docente_id, undefined, {
      user: { userId: 'autorizado-1', roles: ['DOCENTE', role] },
    });

    expect(response.data.puntaje_salarial).toBe(145.5);
    expect(response.data.proteccion_datos.acceso_completo).toBe(true);
  });

  it('devuelve los siete campos del cabezote y no la cedula del docente', async () => {
    const { controller } = buildController();

    const response: any = await controller.getPerfilCabezote(PERFIL.docente_id, undefined, {
      user: { userId: 'ggp-1', roles: ['GESTION_PROFESORAL'] },
    });

    expect(response.data).toMatchObject({
      nombre_completo: 'MARIA LOPEZ RUIZ',
      tipo_vinculacion: 'Planta',
      categoria: 'Asociado',
      territorial: 'Antioquia',
      estado_vinculacion: 'ACTIVO',
      ultima_evaluacion: 'Sobresaliente 2025-2',
      ultima_evaluacion_origen: 'CARGA_MASIVA_RUND',
      solo_lectura: true,
    });
    expect(response.data.documento_identidad).toBeUndefined();
    expect(JSON.stringify(response.data)).not.toContain('1020304050');
  });

  it('impide que un docente consulte el cabezote de otro perfil', async () => {
    const { controller, service } = buildController({
      getById: jest.fn().mockResolvedValue({ ...PERFIL, persona_id: 'persona-otra' }),
    });

    await expect(controller.getPerfilCabezote(PERFIL.docente_id, undefined, {
      user: { userId: 'docente-2', roles: ['DOCENTE'] },
    })).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.logSensitiveDataAccess).not.toHaveBeenCalled();
  });

  it('permite que el docente consulte su propio cabezote en modo restringido', async () => {
    const { controller } = buildController();

    const response: any = await controller.getPerfilCabezote(PERFIL.docente_id, undefined, {
      user: { userId: 'docente-1', roles: ['DOCENTE'] },
    });

    expect(response.success).toBe(true);
    expect(response.data.nombre_completo).toBe('MARIA LOPEZ RUIZ');
    expect(response.data.puntaje_salarial).toBeNull();
    expect(response.data.solo_lectura).toBe(true);
  });

  it('no aplica la validacion de propiedad a los roles de gestion', async () => {
    const { controller, service } = buildController({
      getById: jest.fn().mockRejectedValue(new Error('no debe consultarse el perfil propio')),
    });

    const response: any = await controller.getPerfilCabezote(PERFIL.docente_id, '2026-1', {
      user: { userId: 'ggp-1', roles: ['GESTION_PROFESORAL'] },
    });

    expect(response.success).toBe(true);
    expect(service.getPerfilCabezote).toHaveBeenCalledWith(PERFIL.docente_id, '2026-1');
  });
});
