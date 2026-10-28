import { PtaService } from './pta.service';

describe('referencia de sincronización del flujo PTA', () => {
  it('distingue una revisión parcial sin cambiar la fecha de envío ni la versión del PTA', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const envio = new Date('2026-10-20T10:00:00Z');
    const revision = new Date('2026-10-28T10:00:00Z');
    service.historialRepo = { find: jest.fn().mockResolvedValue([
      { ptaId: 'pta-1', estadoAnterior: 'Pendiente Jefatura', estadoNuevo: 'Pendiente Jefatura', createdAt: revision },
      { ptaId: 'pta-1', estadoAnterior: 'Borrador', estadoNuevo: 'Pendiente Jefatura', createdAt: envio },
    ]) };
    const dto = { id: 'pta-1', estado: 'Pendiente Jefatura', version: 1, updatedAt: envio } as any;
    await service.attachPtaReferenceDates([dto]);
    expect(dto.flujo_actualizado_en).toEqual(revision);
    expect(dto.fecha_envio_revision).toEqual(envio);
    expect(dto.version).toBe(1);
  });

  it('mantiene una referencia válida cuando un PTA histórico no tiene historial', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.historialRepo = { find: jest.fn().mockResolvedValue([]) };
    const dto = { id: 'pta-1', estado: 'Borrador', updatedAt: '2026-10-28T10:00:00Z' } as any;
    await service.attachPtaReferenceDates([dto]);
    expect(dto.flujo_actualizado_en).toBe(dto.updatedAt);
    expect(dto.fecha_envio_revision).toBeNull();
  });

  it('incluye la referencia en la confirmación individual y en los lotes antes de aplicar el alcance personal', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const fecha = new Date('2026-10-28T10:00:00Z');
    service.ptaRepo = { find: jest.fn().mockResolvedValue([{ id: 'pta-1' }]) };
    service.getExtMultiplicadores = jest.fn().mockResolvedValue({});
    service.toPtaDto = jest.fn().mockReturnValue({ id: 'pta-1', estado: 'Pendiente Jefatura' });
    service.attachComponentApprovalProgress = jest.fn();
    service.historialRepo = { find: jest.fn().mockResolvedValue([{ ptaId: 'pta-1', createdAt: fecha }]) };
    service.filterGestionPtas = jest.fn(async (dtos: any[]) => dtos);
    const auth = { userId: 'revisor' };
    const actual = await service.getUpdatedGestionPta('pta-1', auth);
    expect(actual.flujo_actualizado_en).toEqual(fecha);
    expect(service.filterGestionPtas).toHaveBeenCalledWith(
      [expect.objectContaining({ flujo_actualizado_en: fecha })], [{ id: 'pta-1' }], auth,
    );
  });
});
