import { PtaService } from './pta.service';

describe('PtaService - límites de solicitudes PTA', () => {
  const diezMb = 10 * 1024 * 1024;

  const soporte = (indice: number, tamanio = diezMb) => ({
    url: `/uploads/pta-solicitudes/soporte-${indice}.pdf`,
    nombre: `soporte-${indice}.pdf`,
    tipo: 'pdf',
    tamanio,
  });

  it('acepta exactamente 3.000 caracteres, 5 PDF y 10 MB por archivo', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.resolveDocenteId = jest.fn().mockResolvedValue('docente-1');
    service.solicitudRepo = {
      create: jest.fn((value: any) => ({ id: 'solicitud-1', ...value })),
      save: jest.fn((value: any) => Promise.resolve(value)),
    };

    await expect(service.crearSolicitudPTA({
      docenteId: 'docente-1',
      justificacion: 'a'.repeat(3000),
      archivos: Array.from({ length: 5 }, (_, indice) => soporte(indice)),
    })).resolves.toMatchObject({
      docenteId: 'docente-1',
      justificacion: 'a'.repeat(3000),
      estado: 'pendiente',
    });
  });

  it('rechaza una descripción con más de 3.000 caracteres', async () => {
    const service = Object.create(PtaService.prototype) as any;

    await expect(service.crearSolicitudPTA({
      justificacion: 'a'.repeat(3001),
    })).rejects.toThrow(/3\.000 caracteres/i);
  });

  it('rechaza más de 5 documentos de soporte', async () => {
    const service = Object.create(PtaService.prototype) as any;

    await expect(service.crearSolicitudPTA({
      justificacion: 'Solicitud de prueba',
      archivos: Array.from({ length: 6 }, (_, indice) => soporte(indice)),
    })).rejects.toThrow(/máximo 5 archivos/i);
  });

  it('rechaza un PDF que supere 10 MB', async () => {
    const service = Object.create(PtaService.prototype) as any;

    await expect(service.crearSolicitudPTA({
      justificacion: 'Solicitud de prueba',
      archivos: [soporte(1, diezMb + 1)],
    })).rejects.toThrow(/máximo 10 MB/i);
  });
});
