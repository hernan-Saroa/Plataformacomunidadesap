import { PtaService } from './pta.service';

describe('PtaService - contacto y territoriales de solicitudes', () => {
  it('completa una solicitud antigua desde el usuario y las asignaturas del PTA', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const solicitud = {
      id: 'solicitud-1',
      docenteId: 'docente-1',
      docenteNombre: 'Docente Prueba',
      docenteEmail: null,
      tipoSolicitud: 'edicion_componentes',
      ptaId: 'pta-1',
      estado: 'pendiente',
    };
    const qb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([solicitud]),
    };
    service.solicitudRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    service.ptaRepo = {
      find: jest.fn().mockResolvedValue([{
        id: 'pta-1',
        docenteId: 'docente-1',
        periodo: '2026-2',
        estado: 'Pendiente Jefatura',
        version: 1,
        dedicacion: 'Tiempo Completo',
        horasAsignables: 800,
        horasTotales: 797,
        datosEstructurados: {
          docente_nombre: 'Docente Completo Prueba',
          asignaturas: [
            { territorial_nombre: 'Norte de Santander' },
            { territorial_nombre: 'Meta' },
          ],
        },
      }]),
    };
    service.enrichPtaSummaries = jest.fn(async (dtos: any[]) => {
      dtos[0].territorialesAsignaturas = ['Norte de Santander', 'Meta'];
      dtos[0].territorial = 'Norte de Santander, Meta';
      return dtos;
    });
    service.ptaNotifications = {
      resolveUser: jest.fn().mockResolvedValue({
        idUser: 'usuario-1',
        email: 'docente@esap.edu.co',
        nombre: 'Docente Prueba Abreviado',
      }),
    };

    await expect(service.getSolicitudesPTA()).resolves.toEqual([
      expect.objectContaining({
        id: 'solicitud-1',
        docenteNombre: 'Docente Completo Prueba',
        docenteEmail: 'docente@esap.edu.co',
        territorial: 'Norte de Santander, Meta',
        territoriales: ['Norte de Santander', 'Meta'],
        ptaResumen: {
          periodo: '2026-2',
          estado: 'Pendiente Jefatura',
          dedicacion: 'Tiempo Completo',
          horasProgramadas: 797,
          horasRequeridas: 800,
        },
        docente: {
          nombreCompleto: 'Docente Completo Prueba',
          correoInstitucional: 'docente@esap.edu.co',
          territorial: { nombre: 'Norte de Santander, Meta' },
        },
      }),
    ]);
  });
});
