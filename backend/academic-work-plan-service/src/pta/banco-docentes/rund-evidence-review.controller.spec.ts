import { BancoDocentesController } from './banco-docentes.controller';

describe('Identidad del revisor documental', () => {
  const request = { user: { userId: 'REVISOR_AUTENTICADO', roles: ['GESTION_PROFESORAL'] }, ip: '127.0.0.1' };

  it('registra la sesión autenticada aunque el navegador envíe otro aprobador', async () => {
    const service = { revisarSoporte: jest.fn().mockResolvedValue({ estado: 'Aprobado' }) };
    const controller = new BancoDocentesController(service as any, {} as any);
    const body = { estado: 'Aprobado', documentoVersionId: 'version-1', blockVersion: 2, aprobadorId: 'ACTOR_FALSO' };
    await controller.revisarSoporte('docente', 'IDENTIDAD', 'soporte', body, request);
    expect(service.revisarSoporte).toHaveBeenCalledWith('docente', 'IDENTIDAD', 'soporte', body, 'REVISOR_AUTENTICADO', '127.0.0.1');
  });

  it('aplica el mismo actor autenticado a la aprobación y devolución del espacio', async () => {
    const service = { aprobarBloque: jest.fn(), devolverBloque: jest.fn() };
    const controller = new BancoDocentesController(service as any, {} as any);
    await controller.aprobarBloque('docente', 'CONTACTO', request);
    await controller.devolverBloque('docente', 'CONTACTO', request, 'Corrija el teléfono.');
    expect(service.aprobarBloque).toHaveBeenCalledWith('docente', 'CONTACTO', 'REVISOR_AUTENTICADO', '127.0.0.1');
    expect(service.devolverBloque).toHaveBeenCalledWith('docente', 'CONTACTO', 'REVISOR_AUTENTICADO', 'Corrija el teléfono.', '127.0.0.1');
  });

  it('rechaza una revisión sin acceso al archivo original', async () => {
    const service = { revisarSoporte: jest.fn() };
    const controller = new BancoDocentesController(service as any, {} as any);
    await expect(controller.revisarSoporte('docente', 'IDENTIDAD', 'soporte', {}, { user: { userId: 'DOCENTE', roles: ['DOCENTE'] } })).rejects.toThrow('acceso al contenido original');
    expect(service.revisarSoporte).not.toHaveBeenCalled();
  });
});
