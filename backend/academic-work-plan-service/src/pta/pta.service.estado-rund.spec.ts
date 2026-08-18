import { PtaService } from './pta.service';

describe('PtaService - estado RUND por periodo', () => {
  it('impide crear un PTA cuando el perfil RUND del mismo periodo esta inactivo', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.resolveDocenteIdCached = jest.fn().mockResolvedValue({
      personId: 'docente-1',
      email: 'docente@esap.edu.co',
      fullName: 'Docente ESAP',
    });
    service.docenteRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'docente-1',
        periodoCarga: '2026-2',
        estado: 'INACTIVO',
      }),
    };

    await expect(service.savePTA({
      docente_id: 'docente-1',
      periodo: '2026-2',
    })).rejects.toThrow(/inactivo.*2026-2/i);
  });
});
